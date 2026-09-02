const assert = require("assert");
const model = require("../src/engine/reference-diagram-dataset");
const seed = require("../src/engine/business-central-reference-diagram-seed").dataset;
const graph = require("../src/document/process-graph");

const checked = model.validate(seed);
assert.strictEqual(checked.valid, true, JSON.stringify(checked.diagnostics));
assert.strictEqual(checked.dataset.diagrams.length, 10);
assert(checked.dataset.diagrams.every(item => item.sourceId && item.abstractionLevel === "BC_PROCESS"));
assert(checked.dataset.diagrams.every(item => !item.originalImageAssetId));
assert(checked.dataset.diagrams.every(item => item.facts.every(fact => fact.sourceId)));
assert.deepStrictEqual(model.PARTITIONS, ["Training", "Validation", "Evaluation", "GeneralReference"]);
assert.strictEqual(seed.diagrams.find(item => item.name === "Advanced Warehouse Outbound")
  .datasetPartition, "Evaluation");

const registry = model.create(seed);
assert.strictEqual(registry.findCanonicalConcept("Generate Pick").canonicalName, "Create Warehouse Pick");
assert.strictEqual(registry.findCanonicalDocument("Försäljningsorder").id, "document:sales-order");
assert.strictEqual(registry.findProcessByDocuments(["document:warehouse-pick"])[0].name,
  "Advanced Warehouse Outbound");
assert(registry.findProcessByActions(["register pick"]).some(item =>
  item.name === "Advanced Warehouse Outbound"));
assert(registry.findProcessBySequence(["Sales Order", "Release"]).length >= 2);

const manual = model.pipeline().ingest({ inputType: "ManualProcess", source: seed.sources[0],
  payload: { steps: ["Sales Order", "Release", "Generate Pick"] }, diagram: {
    id: "reference-diagram:test:manual", name: "Manual outbound", sourceId: seed.sources[0].id,
    domain: "domain:order-to-cash", businessProcess: "Warehouse Outbound",
    bcProcess: "Manual outbound", abstractionLevel: "BC_PROCESS",
    product: "Microsoft Dynamics 365 Business Central", language: "en",
    verificationStatus: "Unreviewed", datasetPartition: "Validation" } }, seed);
assert.strictEqual(manual.publishable, true);
assert.strictEqual(manual.normalized.labels[2].sourceLabel, "Generate Pick");
assert.strictEqual(manual.normalized.labels[2].canonicalConceptId, "concept:create-warehouse-pick");
const published = model.pipeline().publish(manual);
assert.strictEqual(published.diagrams.length, 11);
const externalSource = { id: "source:partner:one", sourceType: "PartnerDocumentation",
  title: "Partner process", publisher: "Partner" };
const sourced = model.pipeline().ingest({ inputType: "ManualProcess", source: externalSource,
  payload: { steps: ["Create Pick"] }, diagram: { id: "reference-diagram:test:partner",
    name: "Partner process", sourceId: externalSource.id, abstractionLevel: "PROCEDURE",
    verificationStatus: "Imported" } }, seed);
assert.strictEqual(sourced.publishable, true);
assert(sourced.candidate.sources.some(item => item.id === externalSource.id),
  "Ingestion stores new source metadata separately from the diagram.");

const aiPipeline = model.pipeline({ classifier: () => [{ proposalId: "ai-1",
  classification: { process: "Wrong Guess" }, confidence: 0.9, reasoningSummary: "Visual guess",
  classificationSource: "AI" }, { proposalId: "metadata-1", classification: {
    process: "Warehouse Outbound" }, confidence: 0.8, reasoningSummary: "Known page metadata",
  classificationSource: "metadata" }] });
const classified = aiPipeline.ingest({ inputType: "StructuredDiagram", payload: {
  nodes: [{ nodeId: "start", nodeType: "start", title: "Start" },
    { nodeId: "end", nodeType: "end", title: "End" }], relationships: [{ relationshipId: "edge",
      fromNodeId: "start", toNodeId: "end", relationshipType: "sequence" }],
  startNodeIds: ["start"], endNodeIds: ["end"] }, diagram: {
    id: "reference-diagram:test:classified", name: "Classified", sourceId: seed.sources[0].id,
    abstractionLevel: "BC_PROCESS", verificationStatus: "AIClassified" } }, seed);
assert.strictEqual(classified.candidate.diagrams.at(-1).confidence, 0.8,
  "Reliable metadata must outrank a more confident visual AI guess.");
assert.strictEqual(classified.candidate.diagrams.at(-1).proposals.length, 2,
  "The original AI proposal remains auditable.");

const corrected = model.decide(classified.candidate, "reference-diagram:test:classified", {
  decisionId: "decision-1", action: "correct", status: "Verified",
  decidedAt: "2026-09-02T12:00:00Z", decidedBy: "Reviewer",
  replacement: { bcProcess: "Warehouse Outbound", confidence: 1 }, notes: "Confirmed manually." });
const correctedDiagram = corrected.diagrams.at(-1);
assert.strictEqual(correctedDiagram.bcProcess, "Warehouse Outbound");
assert.strictEqual(correctedDiagram.manualDecisions.length, 1);
assert.strictEqual(correctedDiagram.manualDecisions[0].originalProposal.proposalId, "metadata-1");
assert.deepStrictEqual(correctedDiagram.verificationHistory.map(item => item.status), ["Verified"]);

const differentLayout = JSON.parse(JSON.stringify(seed));
const first = differentLayout.diagrams[0];
differentLayout.diagrams.push({ ...first, id: "reference-diagram:test:different-layout",
  name: "Same process, different visual layout", processGraph: { ...first.processGraph,
    graphId: "different-layout-graph", metadata: { layout: "horizontal" } } });
assert(model.detectDuplicates(differentLayout).some(item => item.rightId ===
  "reference-diagram:test:different-layout" && item.classification === "ExactDuplicate"),
"Different visual layouts can be the same semantic process.");
const sameLabelsDifferentMeaning = JSON.parse(JSON.stringify(seed));
const sales = sameLabelsDifferentMeaning.diagrams[0];
const purchase = sameLabelsDifferentMeaning.diagrams[3];
assert(model.detectDuplicates({ ...sameLabelsDifferentMeaning, diagrams: [sales, purchase] })[0]
  .classification !== "ExactDuplicate", "Similar-looking diagrams may describe different processes.");

const exported = model.exportDataset(seed, { partitions: ["Training", "GeneralReference"],
  exportedAt: "2026-09-02T13:00:00Z" });
assert.strictEqual(exported.schemaVersion, 1);
assert(exported.dataset.diagrams.every(item => item.datasetPartition !== "Evaluation"));
assert.strictEqual(exported.exportPolicy.includesSourceAssets, false);
assert.strictEqual(exported.exportPolicy.evaluationExcludedFromTraining, true);
assert.deepStrictEqual(model.exportDataset(seed, { exportedAt: "fixed" }),
  model.exportDataset(seed, { exportedAt: "fixed" }), "Exports must be deterministic.");

const advanced = seed.diagrams.find(item => item.name === "Advanced Warehouse Outbound");
const customizedGraph = JSON.parse(JSON.stringify(advanced.processGraph));
customizedGraph.nodes.splice(3, 0, { nodeId: "custom-approval", nodeType: "manualAction",
  title: "Customer Approval", sequence: 2.5 });
const comparison = model.compareGraphs(graph.normalize(customizedGraph), advanced.processGraph);
assert.strictEqual(comparison.missingSteps.length, 0);
assert(comparison.additionalSteps.some(item => item.title === "Customer Approval"));
assert.strictEqual(comparison.deviationsAreErrors, false);
const recordingMatch = model.matchRecordingToReferences({ schemaVersion: 1, id: "synthetic",
  events: [] }, seed, { graphProjector: { generate() { return advanced.processGraph; } } });
assert.strictEqual(recordingMatch.bestMatch.referenceProcess, "Advanced Warehouse Outbound");
assert.strictEqual(recordingMatch.observedGraph.graphId, advanced.processGraph.graphId);
assert.strictEqual(recordingMatch.bestReferenceGraph.graphId, advanced.processGraph.graphId);
assert(recordingMatch.referenceGraphs[advanced.id]);

const extended = JSON.parse(JSON.stringify(seed));
extended.concepts.push({ id: "concept:aptean-quality-check", canonicalName: "Quality Check",
  aliases: [], domain: "Quality", entityType: "ProcessStep", namespace: "Aptean.FoodAndBeverage" });
extended.metadata.productNamespaces.push("Aptean.FoodAndBeverage");
assert.strictEqual(model.validate(extended).valid, true);
assert.strictEqual(model.create(extended).findCanonicalConcept("Quality Check").namespace,
  "Aptean.FoodAndBeverage");

const invalid = JSON.parse(JSON.stringify(seed));
invalid.diagrams[0].sourceId = "missing";
invalid.diagrams[0].abstractionLevel = null;
invalid.diagrams[0].processGraph.relationships.push({ relationshipId: "orphan", fromNodeId: "missing",
  toNodeId: "also-missing", relationshipType: "sequence" });
const invalidResult = model.validate(invalid);
assert.strictEqual(invalidResult.valid, false);
assert(invalidResult.errors.some(item => item.code === "missing-source"));
assert(invalidResult.errors.some(item => item.code === "missing-abstraction-level"));
assert(invalidResult.errors.some(item => item.code === "invalid-graph"));

assert(model.SOURCE_TYPES.includes("MicrosoftLearn"));
assert(model.VERIFICATION.includes("Deprecated"));
assert(model.DUPLICATE_CLASSES.includes("ProcessVariant"));
assert(graph.NODE_TYPES.includes("postedDocument"));
assert(graph.RELATIONSHIP_TYPES.includes("transfersTo"));
console.log("Reference diagram dataset tests passed.");
