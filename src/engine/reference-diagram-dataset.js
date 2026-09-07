(function (root, factory) {
  const graph = typeof module === "object" && module.exports
    ? require("../document/process-graph") : root.T9ProcessGraph;
  const referenceLibrary = typeof module === "object" && module.exports
    ? require("./reference-process-library") : root.T9ReferenceProcessLibrary;
  const recognition = typeof module === "object" && module.exports
    ? require("./bc-process-recognition-engine") : root.T9BCProcessRecognitionEngine;
  const api = factory(graph, referenceLibrary, recognition);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReferenceDiagramDataset = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (graph, referenceLibrary, recognition) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const SOURCE_TYPES = Object.freeze(["MicrosoftDocumentation", "MicrosoftBusinessProcessCatalog",
    "MicrosoftDiagram", "MicrosoftLearn", "VerifiedBCRecording", "InternalReference",
    "PartnerDocumentation", "ApteanDocumentation", "ManuallyCurated", "Other"]);
  const LEVELS = Object.freeze(["BUSINESS_DOMAIN", "BUSINESS_PROCESS", "BC_PROCESS",
    "PROCEDURE", "UI_ACTION"]);
  const VERIFICATION = Object.freeze(["Imported", "Unreviewed", "AIClassified",
    "PartiallyVerified", "Verified", "Rejected", "Deprecated"]);
  const PARTITIONS = Object.freeze(["Training", "Validation", "Evaluation", "GeneralReference"]);
  const CLASSIFICATION_SOURCES = Object.freeze(["deterministic", "metadata", "AI", "manual"]);
  const DUPLICATE_CLASSES = Object.freeze(["ExactDuplicate", "SemanticDuplicate",
    "ProcessVariant", "RelatedProcess", "DifferentProcess"]);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const array = value => Array.isArray(value) ? value : [];
  const text = value => value == null ? "" : String(value).trim();
  const unique = value => [...new Set(array(value).map(text).filter(Boolean))];
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value); }
  function confidence(value, fallback = null) { const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback; }
  function stableId(prefix, values) { return graph.stableId(prefix, values); }
  function fact(input = {}) { const value = object(input); return freeze({ factId: text(value.factId) ||
    stableId("reference-fact", [value.subjectId, value.predicate, value.objectId, value.sourceId]),
  subjectId: text(value.subjectId), predicate: text(value.predicate), objectId: text(value.objectId),
  sourceId: text(value.sourceId), extraction: CLASSIFICATION_SOURCES.includes(value.extraction)
    ? value.extraction : "metadata", confidence: confidence(value.confidence),
  reasoningSummary: text(value.reasoningSummary), verifiedBy: text(value.verifiedBy) || null,
  verifiedAt: value.verifiedAt || null, notes: text(value.notes) }); }
  function source(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    id: text(value.id), sourceType: SOURCE_TYPES.includes(value.sourceType) ? value.sourceType : "Other",
    title: text(value.title), description: text(value.description), url: text(value.url) || null,
    publisher: text(value.publisher), product: text(value.product), productVersion:
      text(value.productVersion), retrievedAt: value.retrievedAt || null, verifiedAt:
      value.verifiedAt || null, verifiedBy: text(value.verifiedBy) || null,
    licenseNotes: text(value.licenseNotes), notes: text(value.notes) }); }
  function asset(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    id: text(value.id), sourceId: text(value.sourceId), assetType: text(value.assetType) || "SourceDocument",
    location: text(value.location) || null, redistributionAllowed: value.redistributionAllowed === true,
    checksum: text(value.checksum) || null, metadata: clone(object(value.metadata)) }); }
  function concept(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    id: text(value.id), canonicalName: text(value.canonicalName), aliases: unique(value.aliases),
    domain: text(value.domain), entityType: text(value.entityType), description: text(value.description),
    namespace: text(value.namespace) || "Microsoft.BusinessCentral",
    localizedCaptions: clone(object(value.localizedCaptions)) }); }
  function document(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    id: text(value.id), canonicalName: text(value.canonicalName), aliases: unique(value.aliases),
    namespace: text(value.namespace) || "Microsoft.BusinessCentral", objectType:
      text(value.objectType) || null, objectId: value.objectId ?? null, tableId: value.tableId ?? null,
    pageId: value.pageId ?? null, pageType: text(value.pageType) || null,
    documentType: text(value.documentType) || null, entityType: text(value.entityType) || "Document",
    localizedCaptions: clone(object(value.localizedCaptions)) }); }
  function proposal(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    proposalId: text(value.proposalId), classification: clone(object(value.classification)),
    confidence: confidence(value.confidence), reasoningSummary: text(value.reasoningSummary),
    classificationSource: CLASSIFICATION_SOURCES.includes(value.classificationSource)
      ? value.classificationSource : "deterministic", createdAt: value.createdAt || null,
    supersededByManualDecisionId: text(value.supersededByManualDecisionId) || null }); }
  function diagram(input = {}) { const value = clone(object(input)); const processGraph = graph.normalize({
    ...object(value.processGraph), graphId: value.processGraph?.graphId || `${value.id}:graph`,
    level: value.processGraph?.level || "businessCentralProcess" });
    return freeze({ ...value, id: text(value.id), name: text(value.name), description: text(value.description),
      sourceId: text(value.sourceId), domain: text(value.domain), businessProcess: text(value.businessProcess),
      bcProcess: text(value.bcProcess), processVariant: text(value.processVariant) || null,
      abstractionLevel: LEVELS.includes(value.abstractionLevel) ? value.abstractionLevel : null,
      product: text(value.product), productVersion: text(value.productVersion), language:
      text(value.language) || "en", namespace: text(value.namespace) || "Microsoft.BusinessCentral",
      verificationStatus: VERIFICATION.includes(value.verificationStatus)
        ? value.verificationStatus : "Imported", datasetPartition: PARTITIONS.includes(value.datasetPartition)
        ? value.datasetPartition : "GeneralReference", confidence: confidence(value.confidence),
      confidenceDetails: clone(object(value.confidenceDetails)), createdAt: value.createdAt || null,
      updatedAt: value.updatedAt || null, originalImageAssetId: text(value.originalImageAssetId) || null,
      normalizedImageAssetId: text(value.normalizedImageAssetId) || null,
      thumbnailAssetId: text(value.thumbnailAssetId) || null,
      sourceDocumentAssetId: text(value.sourceDocumentAssetId) || null, processGraph,
      sourceLabels: clone(object(value.sourceLabels)), canonicalMappings: clone(object(value.canonicalMappings)),
      variants: array(value.variants).map(item => clone(object(item))), facts: array(value.facts).map(fact),
      proposals: array(value.proposals).map(proposal), verificationHistory:
      array(value.verificationHistory).map(item => freeze({ ...clone(object(item)),
        verificationId: text(item.verificationId), status: VERIFICATION.includes(item.status)
          ? item.status : "Unreviewed", decidedAt: item.decidedAt || null,
        decidedBy: text(item.decidedBy), notes: text(item.notes), source: text(item.source) || "manual" })),
      manualDecisions: array(value.manualDecisions).map(item => freeze(clone(object(item)))),
      metadata: clone(object(value.metadata)) }); }
  function normalize(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    schemaVersion: SCHEMA_VERSION, datasetId: text(value.datasetId) || "bc-reference-diagram-dataset",
    taxonomyVersion: text(value.taxonomyVersion) || "1.0.0", createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null, sources: array(value.sources).map(source),
    assets: array(value.assets).map(asset), concepts: array(value.concepts).map(concept),
    documents: array(value.documents).map(document), diagrams: array(value.diagrams).map(diagram),
    metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) }); }
  function diagnostic(severity, code, details = {}) { return freeze({ severity, code, ...details }); }
  function validate(input = {}) { const dataset = normalize(input); const diagnostics = [];
    const validateIds = (items, entityType) => { const ids = new Set(); items.forEach(item => {
      if (!item.id) diagnostics.push(diagnostic("ERROR", "missing-id", { entityType }));
      else if (ids.has(item.id)) diagnostics.push(diagnostic("ERROR", "duplicate-id", { entityType, id: item.id }));
      ids.add(item.id); }); return ids; };
    const sourceIds = validateIds(dataset.sources, "ReferenceSource");
    const assetIds = validateIds(dataset.assets, "SourceAsset");
    const conceptIds = validateIds(dataset.concepts, "CanonicalProcessConcept");
    const documentIds = validateIds(dataset.documents, "CanonicalDocument");
    validateIds(dataset.diagrams, "ReferenceDiagram");
    dataset.assets.forEach(item => { if (!sourceIds.has(item.sourceId)) diagnostics.push(
      diagnostic("ERROR", "missing-asset-source", { assetId: item.id, sourceId: item.sourceId })); });
    dataset.diagrams.forEach(item => { if (!sourceIds.has(item.sourceId)) diagnostics.push(
      diagnostic("ERROR", "missing-source", { diagramId: item.id, sourceId: item.sourceId }));
    if (!item.abstractionLevel) diagnostics.push(diagnostic("ERROR", "missing-abstraction-level",
      { diagramId: item.id })); const checked = graph.validate(item.processGraph);
    checked.diagnostics.forEach(entry => diagnostics.push(diagnostic("ERROR", "invalid-graph",
      { diagramId: item.id, graphDiagnostic: clone(entry) })));
    [item.originalImageAssetId, item.normalizedImageAssetId, item.thumbnailAssetId,
      item.sourceDocumentAssetId].filter(Boolean).forEach(id => { if (!assetIds.has(id)) diagnostics.push(
        diagnostic("WARNING", "unknown-source-asset", { diagramId: item.id, assetId: id })); });
    Object.values(item.canonicalMappings).forEach(id => { if (!conceptIds.has(id) && !documentIds.has(id))
      diagnostics.push(diagnostic("WARNING", "unknown-canonical-concept", { diagramId: item.id,
        canonicalId: id })); }); const nodeIds = new Set(item.processGraph.nodes.map(node => node.nodeId));
    item.processGraph.groups.forEach(group => group.nodeIds.filter(id => !nodeIds.has(id)).forEach(id =>
      diagnostics.push(diagnostic("ERROR", "orphan-group-node", { diagramId: item.id, nodeId: id }))));
    const sequence = item.processGraph.relationships.filter(edge => edge.relationshipType === "sequence");
    const adjacency = new Map(); sequence.forEach(edge => adjacency.set(edge.fromNodeId,
      [...(adjacency.get(edge.fromNodeId) || []), edge.toNodeId]));
    const visit = (id, path = new Set()) => { if (path.has(id)) return true; const next = new Set(path); next.add(id);
      return (adjacency.get(id) || []).some(child => visit(child, next)); };
    if (item.processGraph.nodes.some(node => visit(node.nodeId))) diagnostics.push(diagnostic("ERROR",
      "circular-sequence", { diagramId: item.id }));
    if (!item.processGraph.startNodeIds.length || !item.processGraph.endNodeIds.length) diagnostics.push(
      diagnostic("WARNING", "missing-graph-boundary", { diagramId: item.id }));
    item.facts.forEach(itemFact => { if (!sourceIds.has(itemFact.sourceId)) diagnostics.push(
      diagnostic("ERROR", "missing-fact-source", { diagramId: item.id, factId: itemFact.factId })); }); });
    dataset.documents.forEach(item => [["objectId", item.objectId], ["tableId", item.tableId],
      ["pageId", item.pageId]].forEach(([field, value]) => { if (value != null &&
        (!Number.isInteger(Number(value)) || Number(value) <= 0)) diagnostics.push(diagnostic("ERROR",
        "invalid-bc-object-reference", { documentId: item.id, field, value })); }));
    return freeze({ valid: !diagnostics.some(item => item.severity === "ERROR"), diagnostics,
      errors: diagnostics.filter(item => item.severity === "ERROR"),
      warnings: diagnostics.filter(item => item.severity === "WARNING"), dataset }); }
  function lookup(values) { const result = new Map(); values.forEach(item => {
    [item.id, item.canonicalName, ...item.aliases, ...Object.values(item.localizedCaptions || {})]
      .map(value => text(value).toLocaleLowerCase()).filter(Boolean).forEach(key => result.set(key, item.id)); });
    return result; }
  function normalizeLabels(extracted, dataset) { const conceptLookup = lookup(dataset.concepts);
    const documentLookup = lookup(dataset.documents); const labels = array(extracted.labels).map(item => {
      const sourceLabel = text(item.sourceLabel || item.label); const key = sourceLabel.toLocaleLowerCase();
      return freeze({ ...clone(object(item)), sourceLabel, canonicalConceptId:
        item.canonicalConceptId || conceptLookup.get(key) || documentLookup.get(key) || null,
        mappingSource: item.canonicalConceptId ? "metadata" :
          (conceptLookup.has(key) || documentLookup.has(key) ? "deterministic" : null) }); });
    return freeze({ ...clone(object(extracted)), labels }); }
  const extractors = Object.freeze({
    JSON(input) { return clone(typeof input.payload === "string" ? JSON.parse(input.payload) : input.payload); },
    StructuredDiagram(input) { return clone(object(input.payload)); },
    ManualProcess(input) { const steps = array(input.payload?.steps).map(text).filter(Boolean);
      return { labels: steps.map(label => ({ sourceLabel: label })), nodes: steps.map((title, index) => ({
        nodeId: `manual:${index + 1}`, nodeType: "processStep", title, sequence: index + 1 })),
      relationships: steps.slice(1).map((_, index) => ({ relationshipId: `manual-edge:${index + 1}`,
        fromNodeId: `manual:${index + 1}`, toNodeId: `manual:${index + 2}`, relationshipType: "sequence" })) }; },
    CanonicalRecording(input) { const recording = input.payload; return { recording,
      labels: array(recording?.semanticInterpretation?.classifications).flatMap(item => [
        item.processStep?.name, item.businessDocument?.name, item.businessAction?.name].filter(Boolean)
        .map(sourceLabel => ({ sourceLabel }))) }; },
    Image(input) { return { assetId: input.assetId || null, labels: [], nodes: [], relationships: [],
      extractionRequired: true, diagnostics: [{ severity: "INFO", code: "image-extractor-not-configured" }] }; }
  });
  function buildGraph(intermediate, context = {}) { if (intermediate.processGraph)
    return graph.normalize(intermediate.processGraph); const nodes = array(intermediate.nodes).map(graph.node);
    const relationships = array(intermediate.relationships || intermediate.edges).map(graph.relationship);
    return graph.normalize({ graphId: context.graphId || stableId("reference-graph", [context.diagramId]),
      level: "businessCentralProcess", title: context.title || "Reference process", nodes, relationships,
      groups: intermediate.groups || [], startNodeIds: intermediate.startNodeIds ||
        nodes.filter(node => node.nodeType === "start").map(node => node.nodeId),
      endNodeIds: intermediate.endNodeIds || nodes.filter(node => node.nodeType === "end")
        .map(node => node.nodeId), metadata: { semanticReference: true } }); }
  function pipeline(options = {}) { const customExtractors = { ...extractors, ...object(options.extractors) };
    return freeze({ stages: Object.freeze(["SOURCE", "EXTRACT", "NORMALIZE", "CLASSIFY",
      "MAP_ENTITIES", "BUILD_PROCESS_GRAPH", "VALIDATE", "REVIEW", "PUBLISH"]),
    ingest(input, currentDataset) { const initial = normalize(currentDataset); const incomingSource =
      input.source ? source(input.source) : null; const base = incomingSource &&
      !initial.sources.some(item => item.id === incomingSource.id) ? normalize({ ...initial,
        sources: [...initial.sources, incomingSource] }) : initial; const extractor =
      customExtractors[input.inputType]; if (!extractor) throw new Error(`Unsupported reference input: ${input.inputType}`);
      const extracted = extractor(clone(input), { dataset: base }); const normalized = normalizeLabels(extracted, base);
      const proposals = options.classifier ? array(options.classifier(clone(normalized), { dataset: base })) : [];
      const preferred = proposals.slice().sort((left, right) => { const priority = { manual: 7,
        metadata: 6, deterministic: 5, AI: 2 }; return (priority[right.classificationSource] || 0) -
        (priority[left.classificationSource] || 0) || (right.confidence || 0) - (left.confidence || 0); })[0];
      const definition = { ...clone(object(input.diagram)), processGraph: buildGraph(normalized, {
        diagramId: input.diagram?.id, title: input.diagram?.name }), proposals,
      confidence: input.diagram?.confidence ?? preferred?.confidence ?? null };
      const candidate = normalize({ ...base, diagrams: [...base.diagrams, definition] });
      const checked = validate(candidate); return freeze({ source: incomingSource,
        extracted: clone(extracted), normalized, proposals: proposals.map(proposal), candidate: checked.dataset,
        validation: checked, publishable: checked.valid && definition.verificationStatus !== "Rejected" }); },
    publish(result) { if (!result?.publishable) throw new Error("Reference candidate is not publishable.");
      return result.candidate; } }); }
  function decide(input, diagramId, decision) { const dataset = normalize(input); const index =
    dataset.diagrams.findIndex(item => item.id === diagramId); if (index < 0) throw new Error("Unknown diagram.");
    const current = dataset.diagrams[index]; const entry = { decisionId: decision.decisionId || stableId(
      "manual-decision", [diagramId, decision.decidedAt, decision.action]), action: text(decision.action),
    decidedAt: decision.decidedAt || null, decidedBy: text(decision.decidedBy), notes: text(decision.notes),
    originalProposal: clone(decision.originalProposal || current.proposals.at(-1) || null),
    replacement: clone(decision.replacement || null) }; const status = decision.status ||
      (decision.action === "reject" ? "Rejected" : current.verificationStatus);
    const updated = diagram({ ...current, ...(decision.replacement || {}), verificationStatus: status,
      manualDecisions: [...current.manualDecisions, entry], verificationHistory:
      [...current.verificationHistory, { verificationId: `${entry.decisionId}:verification`, status,
        decidedAt: entry.decidedAt, decidedBy: entry.decidedBy, notes: entry.notes, source: "manual" }] });
    const diagrams = dataset.diagrams.slice(); diagrams[index] = updated; return normalize({ ...dataset, diagrams }); }
  function nodeIdentityKeys(node) { if (["start", "end"].includes(node.nodeType))
    return [`node-type:${node.nodeType}`]; const taxonomyIds = unique(array(node.taxonomyEntityIds)
    .map(id => text(id).toLocaleLowerCase())).sort(); return taxonomyIds.length
      ? taxonomyIds.map(id => `entity:${id}`)
      : [`${node.nodeType}:${text(node.title).toLocaleLowerCase()}`]; }
  function semanticEdgeTokens(value) { const nodes = new Map(value.nodes.map(node => [node.nodeId, node]));
    return value.relationships.map(edge => { const from = nodes.get(edge.fromNodeId);
      const to = nodes.get(edge.toNodeId); return `edge:${from ? nodeIdentityKeys(from)[0] : edge.fromNodeId}:` +
        `${edge.relationshipType}:${to ? nodeIdentityKeys(to)[0] : edge.toNodeId}`; }); }
  function graphSignature(value) { const nodes = value.nodes.flatMap(nodeIdentityKeys).sort();
    const edges = semanticEdgeTokens(value).sort(); return JSON.stringify({ nodes, edges }); }
  function semanticTokens(value) { return new Set([...value.nodes.flatMap(node =>
    nodeIdentityKeys(node)), ...semanticEdgeTokens(value)]); }
  function conditionalNodeIds(value) { return new Set(value.relationships.filter(edge =>
    edge.relationshipType === "conditionalBranch").map(edge => edge.toNodeId)); }
  function comparableReference(value, observedKeys) { const conditional = conditionalNodeIds(value);
    const omitted = new Set(value.nodes.filter(node => conditional.has(node.nodeId) &&
      !nodeIdentityKeys(node).some(item => observedKeys.has(item))).map(node => node.nodeId));
    if (!omitted.size) return value; return { ...value,
      nodes: value.nodes.filter(node => !omitted.has(node.nodeId)),
      relationships: value.relationships.filter(edge => !omitted.has(edge.fromNodeId) &&
        !omitted.has(edge.toNodeId)) }; }
  function similarityDetails(left, right) { const a = semanticTokens(left);
    const comparable = comparableReference(right, a); const b = semanticTokens(comparable);
    const intersection = [...a].filter(item => b.has(item)).length; const union = new Set([...a, ...b]).size;
    const precision = a.size ? intersection / a.size : b.size ? 0 : 1;
    const coverage = b.size ? intersection / b.size : a.size ? 0 : 1;
    const confidence = union ? precision * 0.65 + coverage * 0.35 : 1;
    return freeze({ confidence: Number(confidence.toFixed(3)),
      observedPrecision: Number(precision.toFixed(3)),
      referenceCoverage: Number(coverage.toFixed(3)), matchedSignals: intersection,
      observedSignals: a.size, referenceSignals: b.size }); }
  function similarity(left, right) { return similarityDetails(left, right).confidence; }
  function compareGraphs(observedGraph, referenceGraph) { const observed = observedGraph.nodes
    .filter(node => !["start", "end"].includes(node.nodeType)); const expected = referenceGraph.nodes
    .filter(node => !["start", "end"].includes(node.nodeType)); const observedKeys = new Set(
      observed.flatMap(nodeIdentityKeys)); const expectedKeys = new Set(expected.flatMap(nodeIdentityKeys));
    const conditional = conditionalNodeIds(referenceGraph);
    const matchesKeys = (node, keys) => nodeIdentityKeys(node).some(value => keys.has(value));
    const primaryKey = node => nodeIdentityKeys(node)[0];
    const matchedSteps = expected.filter(node => matchesKeys(node, observedKeys))
      .map(node => ({ nodeId: node.nodeId, title: node.title, nodeType: node.nodeType }));
    const conditionalSteps = expected.filter(node => conditional.has(node.nodeId) &&
      !matchesKeys(node, observedKeys)).map(node => ({ nodeId: node.nodeId, title: node.title,
        nodeType: node.nodeType, applicability: "conditional" }));
    const missingSteps = expected.filter(node => !conditional.has(node.nodeId) &&
      !matchesKeys(node, observedKeys))
      .map(node => ({ nodeId: node.nodeId, title: node.title, nodeType: node.nodeType }));
    const additionalSteps = observed.filter(node => !matchesKeys(node, expectedKeys))
      .map(node => ({ nodeId: node.nodeId, title: node.title, nodeType: node.nodeType }));
    const unknownActions = additionalSteps.filter(node => /unknown/i.test(node.title));
    const expectedMatchedSequence = expected.filter(node => matchesKeys(node, observedKeys)).map(primaryKey);
    const observedMatchedSequence = observed.filter(node => matchesKeys(node, expectedKeys)).map(primaryKey);
    return freeze({ matchedSteps, missingSteps, conditionalSteps, additionalSteps, unknownActions,
      alternativeSequence: expectedMatchedSequence.some((item, index) =>
        item !== observedMatchedSequence[index]), customizedBehaviorMayBeValid: true,
      deviationsAreErrors: false }); }
  function detectDuplicates(input, diagramId = null) { const dataset = normalize(input); const pairs = [];
    dataset.diagrams.forEach((left, index) => dataset.diagrams.slice(index + 1).forEach(right => {
      if (diagramId && ![left.id, right.id].includes(diagramId)) return; const score = similarity(
        left.processGraph, right.processGraph); const exact = graphSignature(left.processGraph) ===
        graphSignature(right.processGraph); const classification = exact ? "ExactDuplicate" : score >= 0.9
        ? "SemanticDuplicate" : score >= 0.65 && left.bcProcess === right.bcProcess ? "ProcessVariant"
          : score >= 0.35 ? "RelatedProcess" : "DifferentProcess";
      pairs.push(freeze({ leftId: left.id, rightId: right.id, classification,
        confidence: Number(score.toFixed(3)), automaticDeletionAllowed: false })); }));
    return freeze(pairs.sort((left, right) => right.confidence - left.confidence)); }
  function create(input = {}) { const checked = validate(input); if (!checked.valid) { const error = new Error(
    `Invalid reference diagram dataset (${checked.errors.length} errors).`); error.diagnostics = checked.diagnostics;
    throw error; } const dataset = checked.dataset; const concepts = lookup(dataset.concepts);
    const documents = lookup(dataset.documents); const byId = new Map(dataset.diagrams.map(item => [item.id, item]));
    const matches = filters => dataset.diagrams.filter(item => Object.entries(filters || {}).every(([key, value]) =>
      !value || item[key] === value)); const byTokens = (tokens, selector) => dataset.diagrams.map(item => ({ item,
        score: array(selector(item)).filter(value => tokens.includes(value)).length }))
      .filter(item => item.score).sort((a, b) => b.score - a.score).map(item => item.item);
    return freeze({ dataset, getDiagram(id) { return byId.get(text(id)) || null; },
      findReferenceDiagrams(filters = {}) { return matches(filters); },
      findCanonicalConcept(value) { const id = concepts.get(text(value).toLocaleLowerCase());
        return dataset.concepts.find(item => item.id === id) || null; },
      findCanonicalDocument(value) { const id = documents.get(text(value).toLocaleLowerCase());
        return dataset.documents.find(item => item.id === id) || null; },
      findProcessByDocuments(ids) { return byTokens(unique(ids), item => item.processGraph.nodes
        .flatMap(node => node.taxonomyEntityIds)); },
      findProcessByActions(actions) { const wanted = unique(actions).map(item => item.toLocaleLowerCase());
        return byTokens(wanted, item => item.processGraph.nodes.map(node => node.title.toLocaleLowerCase())); },
      findProcessBySequence(sequence) { const wanted = unique(sequence).join("|").toLocaleLowerCase();
        return dataset.diagrams.map(item => ({ item, value: item.processGraph.nodes.filter(node =>
          !["start", "end"].includes(node.nodeType)).sort((a, b) => a.sequence - b.sequence)
          .map(node => node.title).join("|").toLocaleLowerCase() })).filter(item => item.value.includes(wanted))
          .map(item => item.item); },
      findSimilarProcessGraphs(processGraph, limit = 5) { return dataset.diagrams.map(item => { const details =
        similarityDetails(processGraph, item.processGraph); return { diagram: item,
        confidence: details.confidence, matchDetails: details,
        comparison: compareGraphs(processGraph, item.processGraph) }; })
        .sort((a, b) => b.confidence - a.confidence).slice(0, limit); },
      detectDuplicates(id = null) { return detectDuplicates(dataset, id); },
      export(options = {}) { return exportDataset(dataset, options); } }); }
  function matchRecordingToReferences(recording, input, options = {}) { const registry = create(input);
    const legacy = options.referenceLibrary; let processMatch = null;
    if (legacy) processMatch = referenceLibrary.matchRecordingToReference(recording, legacy, options);
    const recognitionResult = recognition?.recognize ? recognition.recognize(recording, options) : null;
    const generated = options.processGraph || options.graphProjector?.generate(recording,
      "businessCentralProcess", options); const graphMatches = generated
      ? registry.findSimilarProcessGraphs(generated, options.limit || 5) : [];
    const recognized = recognitionResult?.classification;
    const deterministicEntityMatch = Boolean(recognized?.signals?.strongMetadata &&
      recognized.signals.matchedDocuments > 0);
    const recognizedDomain = text(recognized?.taxonomyReferences?.domain?.id).toLocaleLowerCase();
    const eligibleGraphMatches = deterministicEntityMatch && recognizedDomain
      ? graphMatches.filter(item => text(item.diagram.domain).toLocaleLowerCase() === recognizedDomain)
      : graphMatches;
    const matches = eligibleGraphMatches.map(item => freeze({ referenceDiagramId: item.diagram.id,
      referenceProcess: item.diagram.bcProcess || item.diagram.name, confidence: item.confidence,
      domain: item.diagram.domain, businessProcess: item.diagram.businessProcess,
      matchDetails: clone(item.matchDetails),
      matchedNodes: item.comparison.matchedSteps.length,
      missingNodes: item.comparison.missingSteps.length,
      unexpectedNodes: item.comparison.additionalSteps.length, ...clone(item.comparison) }))
      .filter(item => item.matchedNodes > 0);
    const graphBest = matches[0] || null; const libraryBest = processMatch?.bestMatch || null;
    let selectedBest = libraryBest && (!graphBest || libraryBest.confidence > graphBest.confidence)
      ? freeze({ referenceProcess: libraryBest.name, referenceProcessId: libraryBest.referenceId,
        domain: libraryBest.domain, confidence: libraryBest.confidence,
        matchDetails: clone(libraryBest.matchDetails),
        matchedSteps: clone(libraryBest.matchedSteps), missingSteps: clone(libraryBest.missingSteps),
        additionalSteps: clone(libraryBest.unexpectedSteps), source: "ReferenceProcessLibrary",
        customizedBehaviorMayBeValid: true, deviationsAreErrors: false }) : graphBest;
    const selectedDomain = text(selectedBest?.domain).toLocaleLowerCase();
    const conflictsWithRecognizedDomain = selectedDomain && recognizedDomain &&
      selectedDomain !== recognizedDomain && !selectedDomain.endsWith(recognizedDomain.split(":").at(-1));
    if (deterministicEntityMatch && (!selectedBest || conflictsWithRecognizedDomain ||
      recognized.confidence >= selectedBest.confidence)) {
      const observedDocumentIds = new Set(array(recognized.processEvidence?.matchedDocuments)
        .map(item => item.id));
      const observedNodes = [
        ...array(recognized.processEvidence?.matchedDocuments).map(item => ({
          type: "document", nodeType: "document", id: item.id, name: item.name,
          sequence: item.sequence })),
        ...array(recognized.processEvidence?.matchedActions).map((item, index) => ({
          type: "action", nodeType: item.nodeType || "processStep",
          id: `recognized-action:${item.name}:${index}`, name: item.name,
          sequence: item.sequence }))
      ].sort((left, right) => left.sequence - right.sequence || left.name.localeCompare(right.name));
      selectedBest = freeze({ referenceProcess:
        recognized.taxonomyReferences.bcProcess.name,
      referenceProcessId: recognized.taxonomyReferences.bcProcess.id,
      businessProcess: recognized.taxonomyReferences.businessProcess?.name || null,
      domain: recognized.taxonomyReferences.domain.name, confidence: recognized.confidence,
      matchedSteps: observedNodes,
      missingSteps: (array(recognized.processEvidence?.lifecycleDocuments).length
        ? array(recognized.processEvidence.lifecycleDocuments)
        : array(recognized.processEvidence?.expectedDocuments))
        .filter(item => !observedDocumentIds.has(item.id)).map(item => ({
          type: "document", nodeType: "document", id: item.id, name: item.name, suggested: true,
          applicability: item.applicability || "expected", variantIds: item.variantIds || [] })),
      additionalSteps: [], source: "BCProcessRecognitionEngine",
      variantAssessment: clone(recognized.processEvidence?.variantAssessment),
      evidence: { documents: clone(recognized.processEvidence?.matchedDocuments || []),
        actions: clone(recognized.processEvidence?.matchedActions || []),
        explanation: clone(recognized.explanation || []), signals: clone(recognized.signals || {}) },
      customizedBehaviorMayBeValid: true, deviationsAreErrors: false });
    }
    const runnerUp = matches.find(item => item.referenceDiagramId !== selectedBest?.referenceDiagramId) || null;
    const candidateMargin = selectedBest?.source === "BCProcessRecognitionEngine"
      ? Number(recognitionResult.assessment?.candidateMargin || 0)
      : selectedBest ? Number(Math.max(0, selectedBest.confidence -
        (runnerUp?.confidence || 0)).toFixed(3)) : 0;
    const graphEvidenceIsStrong = Boolean(graphBest && graphBest.matchedNodes >= 3 &&
      graphBest.confidence >= 0.8 && candidateMargin >= 0.1);
    const recognitionAssessment = recognitionResult?.assessment || null;
    let status = recognitionAssessment?.status || "insufficient-evidence";
    if (graphEvidenceIsStrong && status !== "auto-classifiable") status = "review-required";
    const maximum = status === "insufficient-evidence" ? 0.34 :
      status === "review-required" && !graphEvidenceIsStrong ? 0.69 : 1;
    const bestMatch = selectedBest ? freeze({ ...clone(selectedBest), confidence:
      Number(Math.min(selectedBest.confidence, maximum).toFixed(3)), assessmentStatus: status,
      evidenceQuality: recognitionAssessment?.evidenceQuality || (graphEvidenceIsStrong ? "strong" : "weak"),
      candidateMargin, manualConfirmationRecommended: status !== "auto-classifiable" }) : null;
    const referenceGraphs = Object.fromEntries(eligibleGraphMatches.map(item => [
      item.diagram.id, clone(item.diagram.processGraph)
    ]));
    const matchingBestDiagram = registry.dataset.diagrams.find(item =>
      item.id === bestMatch?.referenceDiagramId || item.name === bestMatch?.referenceProcess);
    return freeze({ matches, bestMatch, recognition: recognitionResult,
      assessment: { status, evidenceQuality: bestMatch?.evidenceQuality || "weak", candidateMargin,
        manualConfirmationRecommended: status !== "auto-classifiable", graphEvidenceIsStrong },
      processLibraryMatch: processMatch, observedGraph: generated ? clone(generated) : null,
      bestReferenceGraph: matchingBestDiagram ? clone(matchingBestDiagram.processGraph) : null,
      referenceGraphs, deviationsAreErrors: false }); }
  function exportDataset(input, options = {}) { const dataset = normalize(input); const includePartitions =
    options.partitions ? new Set(options.partitions) : null; return freeze({ schemaVersion: SCHEMA_VERSION,
      exportedAt: options.exportedAt || null, dataset: { ...clone(dataset), diagrams: dataset.diagrams
        .filter(item => !includePartitions || includePartitions.has(item.datasetPartition)) },
      exportPolicy: { machineReadable: true, includesSourceAssets: false,
        evaluationExcludedFromTraining: true } }); }
  return { CLASSIFICATION_SOURCES, DUPLICATE_CLASSES, LEVELS, PARTITIONS, SCHEMA_VERSION,
    SOURCE_TYPES, VERIFICATION, asset, concept, create, decide, detectDuplicates, diagram, document,
    compareGraphs, exportDataset, extractors, fact, matchRecordingToReferences, normalize, normalizeLabels,
    pipeline, proposal, source, validate };
});
