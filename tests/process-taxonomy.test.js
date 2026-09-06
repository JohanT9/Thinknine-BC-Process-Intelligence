const assert = require("assert");
const schema = require("../src/engine/process-taxonomy-schema");
const registry = require("../src/engine/process-taxonomy");
const seed = require("../src/engine/business-central-process-taxonomy-seed").seed;
const canonical = require("../src/engine/canonical-recording");

const validation = schema.validate(seed);
assert.strictEqual(validation.valid, true, JSON.stringify(validation.errors, null, 2));
const taxonomy = registry.create(seed);
assert(seed.documents.find(item => item.id === "document:purchase-order")
  .pageIds.includes("9307"), "the standard Purchase Orders list page must be recognized");
assert.strictEqual(schema.PAGE_VIEW_TYPES.includes("list"), true);
const transferListOwner = seed.documents.find(item => item.pageIds.includes("5742"));
assert.strictEqual(transferListOwner.id, "document:transfer-order",
  "Transfer Orders list page 5742 must not be treated as a posted shipment");
const normalizedPurchaseOrder = validation.taxonomy.documents.find(item =>
  item.id === "document:purchase-order");
assert.deepStrictEqual(normalizedPurchaseOrder.pageViews.map(item => item.viewType),
  ["document", "list"]);
assert(normalizedPurchaseOrder.pageIds.includes("9307"),
  "normalized pageIds must remain backward compatible");
assert.strictEqual(schema.validate({ ...seed, documents: seed.documents.map(document =>
  document.id === "document:sales-order" ? { ...document, pageViews: [
    ...document.pageViews, { pageObjectId: "9307", viewType: "list" }] } : document)
}).errors.some(error => error.code === "duplicate-page-document"), true,
"one BC page must not silently identify two canonical documents");

const requiredDomains = ["Order to Cash", "Source to Pay", "Forecast to Plan",
  "Plan to Produce", "Inventory to Deliver", "Record to Report", "Returns",
  "Transfers", "Assembly", "Item Tracking", "Quality Management",
  "Warehouse Management"];
assert.deepStrictEqual(requiredDomains.filter(name =>
  !taxonomy.exactName(name, "ProcessDomain").length), []);
assert.strictEqual(taxonomy.exactName("Sales Returns", "BusinessProcess").length, 1);
assert.strictEqual(taxonomy.exactName("Inventory Movement", "BusinessProcess").length, 1);
assert.strictEqual(taxonomy.exactName("Item Tracking", "BusinessProcess").length, 1);
assert.strictEqual(taxonomy.exactName("General Journal Posting", "BusinessProcess").length, 1);
assert.strictEqual(taxonomy.exactName("Physical Inventory", "BusinessProcess").length, 1);

const actionId = "action:order-to-cash:standard-sales-order:select-customer";
const hierarchy = taxonomy.hierarchy(actionId);
assert.deepStrictEqual(hierarchy.map(item => item.entityType), ["ProcessDomain",
  "BusinessProcess", "BCProcess", "ProcessStep", "ProcessAction"]);
assert.strictEqual(hierarchy[0].name, "Order to Cash");
assert.strictEqual(hierarchy[1].name, "Sales Order Processing");
assert.strictEqual(hierarchy[3].name, "Create Sales Order");

const orderToCash = taxonomy.get("bc-process:order-to-cash:standard-sales-order",
  "BCProcess");
assert(orderToCash);
assert.strictEqual(taxonomy.find("Warehouse Pick", "BCProcess")[0].id,
  orderToCash.id);
assert.strictEqual(taxonomy.exactName("Purchase to Pay", "BusinessProcess")[0]
  .domainId, "domain:source-to-pay");
assert.strictEqual(taxonomy.children(orderToCash.id)[0].name, "Create Sales Order");

const mapped = taxonomy.mapAction(actionId);
assert.strictEqual(mapped.domain.id, "domain:order-to-cash");
assert.strictEqual(mapped.bcProcess.id, orderToCash.id);
assert.strictEqual(mapped.processStep.id,
  "step:order-to-cash:standard-sales-order:create-sales-order");
assert.strictEqual(mapped.action.id, actionId);

const releaseRelations = taxonomy.relationships(
  "step:order-to-cash:standard-sales-order:release-sales-order",
  { direction: "outgoing", type: "releases" });
assert.strictEqual(releaseRelations.length, 1);
assert.strictEqual(releaseRelations[0].toEntityId, "document:sales-order");
assert(schema.RELATIONSHIP_TYPES.every(type =>
  seed.relationships.some(relationship => relationship.relationshipType === type)),
"representative seed data should exercise every canonical relationship type");

const productionVariants = taxonomy.variants(
  "bc-process:production:released-production-order");
assert.strictEqual(productionVariants[0].name, "Make-to-Order");
assert.strictEqual(productionVariants[0].conditions.manufacturingPolicy,
  "make-to-order");

const aptean = taxonomy.extend({
  domains: [{ id: "domain:aptean-food-beverage", name: "Aptean Food & Beverage",
    namespace: "aptean" }],
  businessProcesses: [{ id: "business-process:aptean:catch-weight",
    name: "Catch Weight Management", domainId: "domain:aptean-food-beverage" }],
  bcProcesses: [{ id: "bc-process:aptean:catch-weight-receipt",
    name: "Catch Weight Purchase Receipt",
    businessProcessId: "business-process:aptean:catch-weight",
    processStepIds: ["step:aptean:record-catch-weight"], documentIds: [],
    variantIds: [] }],
  processSteps: [{ id: "step:aptean:record-catch-weight",
    name: "Record Catch Weight", bcProcessId: "bc-process:aptean:catch-weight-receipt",
    sequence: 0, actionIds: ["action:aptean:enter-catch-weight"], documentIds: [] }],
  actions: [{ id: "action:aptean:enter-catch-weight", name: "Enter Catch Weight",
    processStepId: "step:aptean:record-catch-weight", actionType: "enter" }]
});
assert.strictEqual(aptean.hierarchy("action:aptean:enter-catch-weight")[0].name,
  "Aptean Food & Beverage");
assert.strictEqual(taxonomy.get("domain:aptean-food-beverage"), null,
  "extension must not mutate the canonical base taxonomy");

const references = {
  taxonomyId: seed.taxonomyId, domainId: "domain:order-to-cash",
  businessProcessId: "business-process:sales-order-processing",
  bcProcessId: orderToCash.id, variantId: "variant:otc:ship-and-invoice",
  processStepIds: [mapped.processStep.id], classifiedBy: "analysis-engine",
  confidence: 0.96, actionMappings: [{ recordedActionId: "recording:event:17",
    processActionId: mapped.action.id, processStepId: mapped.processStep.id }]
};
assert.strictEqual(taxonomy.validateRecordingReferences(references).valid, true);
assert.strictEqual(taxonomy.validateRecordingReferences({ ...references,
  domainId: "domain:source-to-pay" }).valid, false);
const unclassifiedRecording = canonical.create({ id: "recording:taxonomy-test",
  startedAt: "2026-09-02T09:00:00.000Z" });
const original = JSON.stringify(unclassifiedRecording);
let recording = canonical.setTaxonomyReferences(unclassifiedRecording, references);
assert.strictEqual(recording.metadata.taxonomyReferences.bcProcessId, orderToCash.id);
assert.strictEqual(recording.metadata.taxonomyReferences.actionMappings[0]
  .recordedActionId, "recording:event:17");
assert.strictEqual(canonical.legacyView(recording).session.taxonomyReferences
  .variantId, "variant:otc:ship-and-invoice");
assert.strictEqual(JSON.stringify(unclassifiedRecording), original,
  "recording taxonomy references must not mutate their input");
assert.throws(() => canonical.setTaxonomyReferences(canonical.finish(recording,
  "2026-09-02T10:00:00.000Z"), references), /immutable/);

assert.throws(() => registry.create({ ...seed,
  actions: [...seed.actions, { id: actionId, name: "Duplicate",
    processStepId: mapped.processStep.id }] }), error =>
  error.diagnostics.some(item => item.code === "duplicate-id"));

console.log("Business Central process taxonomy behaviour tests passed.");
