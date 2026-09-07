const assert = require("assert");
const model = require("../src/engine/document-lifecycle");
const catalog = require("../src/engine/business-central-document-lifecycle-seed").catalog;
const taxonomy = require("../src/engine/process-taxonomy-schema").normalize(
  require("../src/engine/business-central-process-taxonomy-seed").seed);
const recognition = require("../src/engine/bc-process-recognition-engine");
const canonical = require("../src/engine/canonical-recording");

const validation = model.validate(catalog, taxonomy);
assert.strictEqual(validation.valid, true, JSON.stringify(validation.diagnostics, null, 2));
assert.deepStrictEqual(model.RELATIONSHIP_TYPES, ["creates", "derivedFrom", "postedAs",
  "fulfilledBy", "consumedBy", "produces", "reverses", "returns"]);
assert.deepStrictEqual(model.STAGE_TYPES, ["document", "action", "state"]);

function best(documents, processId) {
  return model.match(catalog, documents, { bcProcessId: processId })[0];
}
const salesProcess = "bc-process:order-to-cash:standard-sales-order";
const noWarehouse = best(["document:sales-order", "document:sales-invoice",
  "document:posted-sales-invoice"], salesProcess);
assert.strictEqual(noWarehouse.variantId, "variant:no-warehouse");
assert(noWarehouse.matchedTransitions.some(item => item.relationshipType === "creates"));
assert(noWarehouse.matchedTransitions.some(item => item.relationshipType === "postedAs"));

const basicWarehouse = best(["document:sales-order", "document:warehouse-shipment",
  "document:posted-warehouse-shipment", "document:posted-sales-shipment",
  "document:sales-invoice"], salesProcess);
assert.strictEqual(basicWarehouse.variantId, "variant:basic-warehouse");
assert(!basicWarehouse.matchedStageIds.includes("sales:pick"),
  "Basic Warehouse must not require a pick.");

const advancedWarehouse = best(["document:sales-order", "document:warehouse-shipment",
  "document:warehouse-pick", "document:posted-warehouse-shipment",
  "document:posted-sales-shipment"], salesProcess);
assert.strictEqual(advancedWarehouse.variantId, "variant:advanced-warehouse");
assert(advancedWarehouse.matchedStageIds.includes("sales:pick"));
assert(advancedWarehouse.matchedTransitions.some(item => item.fromStageId === "sales:shipment" &&
  item.toStageId === "sales:pick"));

const partialAdvanced = best(["document:sales-order", "document:warehouse-shipment",
  "document:warehouse-pick"], salesProcess);
assert.strictEqual(partialAdvanced.variantId, "variant:advanced-warehouse");
assert.strictEqual(partialAdvanced.partial, true,
  "A lifecycle can be recognized before later optional/posting stages appear.");

const purchaseNoWarehouse = best(["document:purchase-order", "document:purchase-invoice",
  "document:posted-purchase-invoice"], "bc-process:source-to-pay:standard-purchase-order");
assert.strictEqual(purchaseNoWarehouse.variantId, "variant:no-warehouse");
const purchaseOpeningOnly = best(["document:purchase-order"],
  "bc-process:source-to-pay:standard-purchase-order");
assert.strictEqual(purchaseOpeningOnly.variantId, "variant:no-warehouse",
  "A purchase order alone must not imply configured warehouse handling.");
assert(purchaseOpeningOnly.specificityPenalty < model.match(catalog,
  ["document:purchase-order"], {
    bcProcessId: "bc-process:source-to-pay:standard-purchase-order"
  }).find(item => item.variantId === "variant:advanced-warehouse").specificityPenalty);
const purchaseAdvanced = best(["document:purchase-order", "document:warehouse-receipt",
  "document:warehouse-put-away", "document:posted-warehouse-receipt"],
"bc-process:warehouse:inbound-receipt-put-away");
assert.strictEqual(purchaseAdvanced.variantId, "variant:advanced-warehouse");

const productionMto = model.match(catalog, ["document:production-order",
  "document:production-journal", "document:finished-production-order"], {
  bcProcessId: "bc-process:production:released-production-order",
  observedActions: ["Consume", "Output"] })[0];
assert.strictEqual(productionMto.variantId, "variant:make-to-order");
assert(productionMto.matchedStageIds.includes("production:consumption"));
assert(productionMto.matchedStageIds.includes("production:output"));
assert(productionMto.matchedTransitions.some(item => item.relationshipType === "consumedBy"));
assert(productionMto.matchedTransitions.some(item => item.relationshipType === "produces"));
const transferNoWarehouse = best(["document:transfer-order", "document:transfer-shipment",
  "document:transfer-receipt"], "bc-process:transfers:standard-transfer-order");
assert.strictEqual(transferNoWarehouse.variantId, "variant:no-warehouse");

const salesReturn = best(["document:sales-return-order", "document:return-receipt",
  "document:sales-credit-memo", "document:posted-sales-credit-memo"],
"bc-process:returns:sales-return-order");
assert.strictEqual(salesReturn.lifecycleId, "lifecycle:sales-return");
assert(salesReturn.matchedTransitions.some(item => item.relationshipType === "returns"));
assert(salesReturn.matchedTransitions.some(item => item.relationshipType === "postedAs"));
const purchaseReturn = best(["document:purchase-return-order", "document:return-shipment"],
  "bc-process:returns:purchase-return-order");
assert.strictEqual(purchaseReturn.lifecycleId, "lifecycle:purchase-return");
assert.strictEqual(purchaseReturn.partial, true);

const inventoryPick = best(["document:inventory-pick", "document:posted-inventory-pick"],
  "bc-process:warehouse:inventory-pick");
assert.strictEqual(inventoryPick.lifecycleId, "lifecycle:inventory-pick");
assert(inventoryPick.matchedTransitions.some(item => item.relationshipType === "postedAs"));
const inventoryPutAway = best(["document:inventory-put-away",
  "document:posted-inventory-put-away"], "bc-process:warehouse:inventory-put-away");
assert.strictEqual(inventoryPutAway.lifecycleId, "lifecycle:inventory-put-away");

const states = model.stateTransitions(catalog, "document:sales-order")[0];
assert.deepStrictEqual(states.transitions, [["Open", "Released"],
  ["Released", "Reopened"], ["Reopened", "Released"], ["Released", "Posted"]]);

const extension = model.normalize({ ...catalog, lifecycles: [...catalog.lifecycles, {
  id: "lifecycle:partner-return", name: "Partner Return", bcProcessIds: [],
  stages: [{ id: "return:a", name: "Return", stageType: "document",
    documentId: "document:sales-order" }, { id: "return:b", name: "Reversal",
    stageType: "document", documentId: "document:posted-sales-invoice" }],
  transitions: [{ id: "return:reverse", fromStageId: "return:a", toStageId: "return:b",
    relationshipType: "reverses" }, { id: "return:returns", fromStageId: "return:b",
    toStageId: "return:a", relationshipType: "returns" }], variants: [] }] });
assert.strictEqual(model.validate(extension, taxonomy).valid, true,
  "Partner lifecycle extensions must not require core-code changes.");

function recordingFromPages() {
  let recording = canonical.create({ id: "lifecycle-recognition",
    startedAt: "2026-09-02T08:00:00Z" });
  [[42, 36], [7335, 7320], [7345, 5766], [130, 110]].forEach(([pageObjectId, tableId], index) => {
    recording = canonical.addEvent(recording, { eventNo: index + 1, type: "page-state",
      timestamp: `2026-09-02T08:00:0${index}Z` }, { pageIdentity: {
        pageObjectId: String(pageObjectId), tableId: String(tableId),
        source: "page-object-id", confidence: 1 } });
  });
  return recording;
}
const recognized = recognition.recognize(recordingFromPages());
assert(recognized.classification.signals.matchedLifecycleTransitions >= 2);
assert.strictEqual(recognized.classification.signals.lifecycle.variantId,
  "variant:advanced-warehouse");
assert(recognized.classification.explanation.some(item =>
  item.includes("lifecycle transition Warehouse Shipment fulfilledBy Warehouse Pick")));

console.log("Business Central document lifecycle tests passed.");
