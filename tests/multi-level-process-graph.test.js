const assert = require("assert");
const canonical = require("../src/engine/canonical-recording");
const graph = require("../src/document/process-graph");
const projector = require("../src/document/multi-level-process-graph");

let recording = canonical.create({ id: "multi-level-sales", title: "Outbound sales",
  startedAt: "2026-09-02T08:00:00.000Z" });
const actions = ["Open Sales Orders", "New", "Select Customer", "Add Item",
  "Enter Quantity", "Release", "Open Warehouse Shipments", "Create Pick",
  "Open Warehouse Pick", "Register Pick", "Post Shipment"];
actions.forEach((label, index) => { recording = canonical.addEvent(recording, {
  eventNo: index + 1, type: /Enter|Select/.test(label) ? "field-change" : "click",
  label, timestamp: `2026-09-02T08:00:${String(index).padStart(2, "0")}.000Z`,
  automationId: label.replace(/\s/g, "") }); });

function classify(input) { recording = canonical.setSemanticClassification(recording, input); }
classify({ classificationId: "create-order", sourceEventIds: recording.events.slice(0, 5)
  .map(event => event.id), businessDomain: { id: "domain:order-to-cash", name: "Order to Cash" },
businessProcess: { id: "business-process:sales-order-processing", name: "Sales Order Processing" },
bcProcess: { id: "bc-process:order-to-cash:standard-sales-order", name: "Sales order flow" },
processStep: { id: "step:order-to-cash:standard-sales-order:create-sales-order",
  name: "Create Sales Order" }, businessDocument: { id: "document:sales-order", name: "Sales Order" },
classificationSource: "rule", confidence: 0.98 });
classify({ classificationId: "release-order", sourceEventIds: [recording.events[5].id],
  businessProcess: { id: "business-process:sales-order-processing", name: "Sales Order Processing" },
  bcProcess: { id: "bc-process:order-to-cash:standard-sales-order", name: "Sales order flow" },
  processStep: { id: "step:order-to-cash:standard-sales-order:release-sales-order",
    name: "Release Sales Order" }, businessAction: { id: "action:release", name: "Release" },
  classificationSource: "metadata", confidence: 1 });
classify({ classificationId: "create-pick", sourceEventIds: recording.events.slice(6, 8)
  .map(event => event.id), businessProcess: { id: "business-process:warehouse-outbound",
  name: "Warehouse Outbound" }, bcProcess: { id: "bc-process:warehouse:outbound-pick-shipment",
  name: "Warehouse outbound" }, processStep: { id: "step:warehouse:outbound-pick-shipment:create-warehouse-pick",
  name: "Create Pick" }, businessDocument: { id: "document:warehouse-shipment",
  name: "Warehouse Shipment" }, classificationSource: "rule", confidence: 0.97,
metadata: { createsDocument: true } });
classify({ classificationId: "register-pick", sourceEventIds: recording.events.slice(8, 10)
  .map(event => event.id), businessProcess: { id: "business-process:warehouse-outbound",
  name: "Warehouse Outbound" }, bcProcess: { id: "bc-process:warehouse:outbound-pick-shipment",
  name: "Warehouse outbound" }, processStep: { id: "step:warehouse:outbound-pick-shipment:register-warehouse-pick",
  name: "Register Pick" }, businessDocument: { id: "document:warehouse-pick", name: "Warehouse Pick" },
classificationSource: "rule", confidence: 0.99 });
classify({ classificationId: "post-shipment", sourceEventIds: [recording.events[10].id],
  businessProcess: { id: "business-process:warehouse-outbound", name: "Warehouse Outbound" },
  bcProcess: { id: "bc-process:warehouse:outbound-pick-shipment", name: "Warehouse outbound" },
  processStep: { id: "step:warehouse:outbound-pick-shipment:post-warehouse-shipment",
    name: "Post Shipment" }, businessAction: { id: "action:post-shipment", name: "Post Shipment" },
  classificationSource: "metadata", confidence: 1 });

const snapshot = JSON.stringify(recording);
const bundle = projector.generateAll(recording);
assert.strictEqual(JSON.stringify(recording), snapshot, "Projection must not mutate its sources.");
assert.deepStrictEqual(Object.keys(bundle).sort(), ["businessCentralProcess", "businessProcess",
  "expansionIndex", "userProcedure"].sort());
for (const level of graph.LEVELS) {
  const current = bundle[level];
  assert.strictEqual(current.level, level);
  assert.strictEqual(graph.validate(current).valid, true, JSON.stringify(graph.validate(current).diagnostics));
  assert.strictEqual(current.nodes[0].nodeType, "start");
  assert.strictEqual(current.nodes.at(-1).nodeType, "end");
}

const level1 = bundle.businessProcess;
assert.deepStrictEqual(level1.nodes.filter(node => node.nodeType === "businessProcess")
  .map(node => node.title), ["Sales Order Processing", "Warehouse Outbound"]);
const level2 = bundle.businessCentralProcess;
assert(level2.nodes.some(node => node.nodeType === "document" && node.title === "Sales Order"));
assert(level2.nodes.some(node => node.nodeType === "processStep" && node.title === "Create Sales Order"));
assert(level2.nodes.some(node => node.nodeType === "posting" && node.title === "Post Shipment"));
assert(level2.relationships.some(edge => edge.relationshipType === "documentCreation"));
assert(level2.relationships.some(edge => edge.relationshipType === "documentPosting"));
const level3 = bundle.userProcedure;
assert.deepStrictEqual(level3.nodes.filter(node => !["start", "end"].includes(node.nodeType))
  .map(node => node.title), actions);
assert.strictEqual(level3.nodes.filter(node => node.sourceEventIds.length).length, actions.length);

const salesProcess = level1.nodes.find(node => node.title === "Sales Order Processing");
const salesChildren = projector.expand(bundle, salesProcess.nodeId);
assert(salesChildren.some(node => node.title === "Create Sales Order"));
const createOrder = level2.nodes.find(node => node.title === "Create Sales Order");
assert.deepStrictEqual(projector.expand(bundle, createOrder.nodeId).map(node => node.title),
  actions.slice(0, 5));
assert.deepStrictEqual(createOrder.sourceEventIds, recording.events.slice(0, 5).map(event => event.id),
  "Collapsed semantic steps retain every underlying raw action.");

assert.deepStrictEqual(projector.generateAll(recording), bundle,
  "Identical source models must generate deterministic graphs.");
assert.deepStrictEqual(projector.generate(recording, "userProcedure"), level3);
assert.throws(() => projector.generate(recording, "pixels"), /Unsupported process graph level/);
assert(["start", "end", "businessProcess", "subprocess", "processStep", "document",
  "postedDocument", "action", "decision", "systemAction", "posting", "manualAction",
  "status", "dataEntity", "externalSystem"].every(type => graph.NODE_TYPES.includes(type)));
assert(["sequence", "branch", "conditionalBranch", "loop", "subprocess", "documentCreation",
  "documentPosting", "creates", "posts", "releases", "consumes", "produces", "references",
  "derivedFrom", "triggers", "branchesTo", "returnsTo", "updates", "transfersTo"]
  .every(type => graph.RELATIONSHIP_TYPES.includes(type)));
const relationshipCoverage = graph.RELATIONSHIP_TYPES.map((type, index) => graph.relationship({
  relationshipId: `relationship-${type}`, fromNodeId: "a", toNodeId: "b",
  relationshipType: type, sequence: index }));
assert.deepStrictEqual(relationshipCoverage.map(item => item.relationshipType),
  graph.RELATIONSHIP_TYPES);

const withoutSemantics = canonical.create({ id: "unclassified", startedAt: "2026-09-02T09:00:00Z" });
const emptyBundle = projector.generateAll(withoutSemantics);
assert.strictEqual(graph.validate(emptyBundle.businessProcess).valid, true);
let observedOnly = canonical.create({ id: "observed-purchase",
  startedAt: "2026-09-02T09:00:00Z" });
observedOnly = canonical.addEvent(observedOnly, { eventNo: 1, type: "click" }, {
  pageIdentity: { pageObjectId: "50", tableId: "38", documentType: "purchase-order",
    entity: "PurchaseOrder" }
});
observedOnly = canonical.addEvent(observedOnly, { eventNo: 2, type: "click" }, {
  actionIdentity: { actionType: "ReleaseDocument", caption: "Release" }
});
const observedBundle = projector.generateAll(observedOnly);
assert(observedBundle.businessProcess.nodes.some(node =>
  node.title === "Purchase to Pay"),
"strong observed BC metadata should create a useful business map without manual classification");
assert(observedBundle.businessCentralProcess.nodes.some(node =>
  node.title === "Purchase Order" && node.metadata.relationshipType === "sequence"));
assert(observedBundle.businessCentralProcess.nodes.some(node => node.title === "Release"));
assert(observedBundle.businessCentralProcess.nodes.filter(node =>
  !["start", "end"].includes(node.nodeType)).every(node =>
  node.metadata.semanticStatus === "observed"));
assert(observedBundle.businessProcess.nodes.find(node =>
  node.nodeType === "businessProcess").metadata.semanticStatus === "observed");
assert(!observedBundle.businessCentralProcess.nodes.some(node =>
  /invoice|receipt|put-away/i.test(node.title)),
"the observed map must not add unrecorded reference-process steps");
assert.strictEqual(emptyBundle.businessProcess.nodes.length, 2,
  "Unclassified recordings remain valid and contain neutral boundaries.");

let postedReturn = canonical.create({ id: "posted-return",
  startedAt: "2026-09-02T10:00:00Z" });
postedReturn = canonical.addEvent(postedReturn, { eventNo: 1, type: "navigation" }, {
  pageIdentity: { pageObjectId: "6660", tableId: "6660", documentType: "posted-document",
    entity: "PostedReturnReceipt" }
});
const postedReturnBundle = projector.generateAll(postedReturn);
assert(postedReturnBundle.businessCentralProcess.nodes.some(node =>
  node.taxonomyEntityIds.includes("document:return-receipt") &&
  node.nodeType === "postedDocument"),
"Observed posted Business Central documents retain their posted-document shape and color.");
assert.strictEqual(projector.semanticStepNodeType({ metadata: { nodeType: "manualAction" } },
  "Review"), "manualAction");
assert.strictEqual(projector.semanticStepNodeType({ metadata: { nodeType: "systemAction" } },
  "Calculate"), "systemAction");
assert.strictEqual(projector.semanticStepNodeType({ metadata: { nodeType: "decision" } },
  "Approved?"), "decision");

console.log("Multi-level ProcessGraph tests passed.");
