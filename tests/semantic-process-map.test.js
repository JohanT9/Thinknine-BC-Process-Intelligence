const assert = require("assert");
const semanticMap = require("../src/document/semantic-process-map");

const referenceGraph = { schemaVersion: "1.0.0", graphId: "advanced", level:
  "businessCentralProcess", nodes: [
    { nodeId: "start", nodeType: "start", title: "Start" },
    { nodeId: "sales", nodeType: "document", title: "Sales Order",
      taxonomyEntityIds: ["document:sales-order"] },
    { nodeId: "release", nodeType: "processStep", title: "Release" },
    { nodeId: "pick", nodeType: "processStep", title: "Create Pick" },
    { nodeId: "post", nodeType: "posting", title: "Post Shipment" },
    { nodeId: "invoice", nodeType: "document", title: "Sales Invoice" },
    { nodeId: "end", nodeType: "end", title: "End" }
  ], relationships: [
    { fromNodeId: "sales", toNodeId: "release", relationshipType: "sequence" },
    { fromNodeId: "release", toNodeId: "pick", relationshipType: "creates" },
    { fromNodeId: "pick", toNodeId: "post", relationshipType: "posts" },
    { fromNodeId: "post", toNodeId: "invoice", relationshipType: "creates" }
  ], groups: [], startNodeIds: ["start"], endNodeIds: ["end"] };
const analysis = { bestMatch: { referenceDiagramId: "advanced", referenceProcess:
  "Advanced Warehouse Outbound", domain: "domain:order-to-cash", confidence: 0.9,
  matchedSteps: [{ title: "Sales Order" }, { title: "Release" }, { title: "Create Pick" }],
  missingSteps: [{ title: "Post Shipment" }, { title: "Sales Invoice",
    applicability: "optional" }], additionalSteps: [{ title: "Customer Approval" }] },
observedGraph: { nodes: [{ nodeId: "observed-release", title: "Release",
  sourceEventIds: ["event-release"] }, { nodeId: "approval", title: "Customer Approval",
  nodeType: "manualAction", sourceEventIds: ["event-approval"] }] },
bestReferenceGraph: referenceGraph, referenceGraphs: { advanced: referenceGraph } };
const reviewTasks = [{ taskId: "task-release", sourceEventIds: ["event-release"] },
  { taskId: "task-approval", sourceEventIds: ["event-approval"] }];
const procedureModel = { recordingId: "recording", nodes: [{ nodeId: "raw", nodeType: "activity",
  title: "Click Release", sourceStepIds: ["task-release"] }], transitions: [], subprocesses: [],
stateTransitions: [] };
const input = { recordingId: "recording", title: "Outbound", analysis, reviewTasks, procedureModel };
const snapshot = JSON.stringify(input);

const bc = semanticMap.project(input, "businessCentral");
assert.strictEqual(JSON.stringify(input), snapshot, "Projection must not mutate its inputs.");
assert.deepStrictEqual(bc.nodes.map(node => node.title), ["Sales Order", "Release", "Create Pick",
  "Customer Approval"]);
assert(!bc.nodes.some(node => node.title === "Sales Invoice"),
  "optional reference nodes must not be shown as recorded process steps");
assert.strictEqual(bc.nodes.find(node => node.title === "Release").metadata.semanticStatus, "observed");
assert.strictEqual(bc.nodes.find(node => node.title === "Release").metadata.processRole.id, "sales",
  "generic actions must inherit the surrounding Business Central responsibility");
assert.strictEqual(bc.nodes.find(node => node.title === "Create Pick").metadata.processRole.id,
  "warehouse");
const salesToWarehouse = bc.transitions.find(item =>
  item.metadata?.responsibilityHandoff?.to?.id === "warehouse");
assert.strictEqual(salesToWarehouse.metadata.responsibilityHandoff.from.id, "sales");
assert.deepStrictEqual(bc.nodes.find(node => node.title === "Release").sourceStepIds, ["task-release"]);
assert.strictEqual(bc.nodes.find(node => node.title === "Customer Approval").metadata.semanticStatus,
  "customerSpecific");
assert.deepStrictEqual(bc.nodes.find(node => node.title === "Customer Approval").sourceStepIds,
  ["task-approval"]);
assert.strictEqual(bc.transitions.length, 3);
assert.strictEqual(bc.transitions.find(item => item.toNodeId === bc.nodes.find(node =>
  node.title === "Create Pick").nodeId).transitionType, "creates");
const bcWithReferences = semanticMap.project(input, "businessCentral", {
  includeReferences: true
});
assert.strictEqual(bcWithReferences.nodes.find(node => node.title === "Post Shipment")
  .metadata.semanticStatus, "suggested");
assert.strictEqual(bcWithReferences.transitions.length, 4);
assert.strictEqual(bcWithReferences.transitions.find(item => item.toNodeId ===
  bcWithReferences.nodes.find(node => node.title === "Post Shipment").nodeId).transitionType,
"posts");

const business = semanticMap.project(input, "business");
assert.deepStrictEqual(business.nodes.map(node => node.title), ["Order To Cash",
  "Advanced Warehouse Outbound"]);
assert.strictEqual(business.nodes.at(-1).metadata.semanticStatus, "observed");
assert.strictEqual(semanticMap.project(input, "procedure"), procedureModel);
assert.strictEqual(semanticMap.project({ recordingId: "empty", analysis: {} },
  "businessCentral").nodes.length, 0);
const legacyAnalysis = { bestMatch: { referenceProcessId: "purchase", referenceProcess:
  "Purchase Order Flow", domain: "Source to Pay", businessProcess: "Purchase to Pay",
  confidence: 0.49, matchedSteps: [{ type: "document", id: "document:purchase-order", name: "Purchase Order" }],
  missingSteps: [{ type: "document", id: "document:warehouse-receipt", name: "Warehouse Receipt",
    suggested: true }], additionalSteps: [] } };
const legacyBusiness = semanticMap.project({ recordingId: "legacy", title: "Legacy",
  analysis: legacyAnalysis }, "business");
assert.deepStrictEqual(legacyBusiness.nodes.map(node => node.title),
  ["Source to Pay", "Purchase to Pay", "Purchase Order Flow"]);
const legacyBc = semanticMap.project({ recordingId: "legacy", title: "Legacy",
  analysis: legacyAnalysis }, "businessCentral", { includeReferences: true });
assert.deepStrictEqual(legacyBc.nodes.map(node => node.title),
  ["Purchase Order", "Warehouse Receipt"]);
assert.strictEqual(legacyBc.nodes[1].metadata.semanticStatus, "suggested");
assert.strictEqual(legacyBc.nodes[0].metadata.originalNodeType, "document");
assert.strictEqual(legacyBc.nodes[0].metadata.processRole.id, "purchasing");
assert.strictEqual(legacyBc.nodes[1].metadata.processRole.id, "warehouse");
const inheritedPurchaseRoles = semanticMap.inheritProcessRoles([
  { title: "Purchase Order", metadata: { processRole: { id: "purchasing", name: "Purchasing" } } },
  { title: "Create", metadata: {} }, { title: "Release", metadata: {} }
]);
assert.deepStrictEqual(inheritedPurchaseRoles.map(node => node.metadata.processRole.id),
  ["purchasing", "purchasing", "purchasing"]);
const legacyObservedOnly = semanticMap.project({ recordingId: "legacy", title: "Legacy",
  analysis: legacyAnalysis }, "businessCentral");
assert.deepStrictEqual(legacyObservedOnly.nodes.map(node => node.title),
  ["Purchase Order"]);
const conditionalBc = semanticMap.project({ recordingId: "conditional", analysis: {
  bestMatch: { referenceProcess: "Purchase Order Flow", matchedSteps: [], additionalSteps: [],
    missingSteps: [{ type: "document", id: "document:warehouse-receipt",
      name: "Warehouse Receipt", applicability: "conditional",
      variantIds: ["variant:basic-warehouse", "variant:advanced-warehouse"] }] }
} }, "businessCentral");
assert.strictEqual(conditionalBc.nodes.length, 0,
  "configuration-dependent reference steps must not become process-map nodes");
const variantAnalysis = { bestMatch: { referenceProcess: "Purchase Order Flow",
  matchedSteps: [{ type: "document", id: "document:purchase-order", name: "Purchase Order" }],
  additionalSteps: [], missingSteps: [{ type: "document", id: "document:warehouse-put-away",
    name: "Warehouse Put-away", applicability: "conditional",
    variantIds: ["variant:advanced-warehouse"] }, { type: "document",
    id: "document:purchase-invoice", name: "Purchase Invoice", applicability: "optional",
    variantIds: ["variant:basic-warehouse", "variant:advanced-warehouse"] }] } };
const basicVariant = semanticMap.project({ recordingId: "basic", analysis: variantAnalysis,
  decision: { confirmedVariantId: "variant:basic-warehouse" } }, "businessCentral");
assert(!basicVariant.nodes.some(node => node.title === "Warehouse Put-away"));
assert(!basicVariant.nodes.some(node => node.title === "Purchase Invoice"));
const advancedVariant = semanticMap.project({ recordingId: "advanced", analysis: variantAnalysis,
  decision: { confirmedVariantId: "variant:advanced-warehouse" } }, "businessCentral");
assert(!advancedVariant.nodes.some(node => node.title === "Warehouse Put-away"));
assert.throws(() => semanticMap.project(input, "pixels"), /Unsupported semantic process-map level/);
const bounded = semanticMap.project(input, "businessCentral", { includeBoundaries: true,
  locale: "sv-SE" });
assert.deepStrictEqual(bounded.nodes.map(node => node.nodeType),
  ["start", "activity", "activity", "activity", "activity", "end"]);
assert.strictEqual(bounded.nodes[0].title, "Start");
assert.strictEqual(bounded.nodes.at(-1).title, "Slut");
assert.strictEqual(bounded.nodes[0].metadata.structuralBoundary, true);
assert.strictEqual(bounded.transitions.length, bounded.nodes.length - 1);

const selectedAnalysis = { ...analysis, referenceGraphs: { alternative: { ...referenceGraph,
  graphId: "alternative", nodes: referenceGraph.nodes.map(node => node.nodeId === "pick"
    ? { ...node, title: "Warehouse Pick" } : node) } } };
const selected = semanticMap.project({ ...input, analysis: selectedAnalysis,
  decision: { confirmedReferenceId: "alternative", status: "selected" } },
"businessCentral", { includeReferences: true });
assert(selected.nodes.some(node => node.title === "Warehouse Pick"));

console.log("Semantic process map tests passed.");
