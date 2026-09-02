const assert = require("assert");
const canonical = require("../src/engine/canonical-recording");
const engine = require("../src/engine/bc-process-recognition-engine");

function synthetic(id, events, transitions = []) {
  let value = canonical.create({ id, startedAt: "2026-09-02T08:00:00.000Z" });
  events.forEach((source, index) => {
    value = canonical.addEvent(value, { eventNo: index + 1,
      timestamp: `2026-09-02T08:00:${String(index).padStart(2, "0")}.000Z`,
      type: source.type || "click", label: source.label,
      automationId: source.automationId }, source.identification || null);
  });
  transitions.forEach(item => { value = canonical.setDocumentStateTransition(value, {
    ...item, sourceEventIds: item.sourceIndexes.map(index => value.events[index].id),
    classificationSource: "metadata", confidence: 1 }); });
  return value;
}
const page = (pageObjectId, tableId, documentType, entity) => ({ pageIdentity: {
  pageObjectId: String(pageObjectId), tableId: String(tableId), documentType, entity,
  pageType: "document", source: "page-object-id", confidence: 1 } });
const action = (actionType, caption) => ({ actionIdentity: { actionType, caption,
  source: "technical-action-id" } });

const outbound = synthetic("outbound", [
  { identification: page(7335, 7320, "warehouse-document", "WarehouseShipment") },
  { label: "Create Pick", automationId: "CreatePick", identification: action("CreatePick", "Create Pick") },
  { identification: page(7345, 5766, "warehouse-activity", "WarehousePick") },
  { label: "Register Pick", automationId: "RegisterPick", identification: action("RegisterPick", "Register Pick") },
  { label: "Post Shipment", automationId: "PostShipment", identification: action("PostDocument", "Post Shipment") },
  { identification: page(130, 110, "posted-document", "PostedSalesShipment") }
]);
const recognizedOutbound = engine.recognize(outbound);
assert.strictEqual(recognizedOutbound.classification.process, "WarehouseOutbound");
assert.strictEqual(recognizedOutbound.classification.variant, "AdvancedWarehouse");
assert(recognizedOutbound.classification.confidence >= 0.8);
assert(recognizedOutbound.classification.explanation.some(reason => reason.includes("Warehouse Shipment")));
assert(recognizedOutbound.classification.explanation.some(reason =>
  reason.includes("Detected Pick") || reason.includes("Detected Register")));
const persistedInterpretation = canonical.setSemanticClassification(outbound,
  engine.toSemanticClassification(recognizedOutbound));
assert.strictEqual(persistedInterpretation.semanticInterpretation.classifications[0]
  .bcProcess.id, "bc-process:warehouse:outbound-pick-shipment");
assert(persistedInterpretation.semanticInterpretation.classifications[0]
  .classificationMetadata.explanation.length > 0);

const partialOutbound = synthetic("partial-outbound", [
  { identification: page(7335, 7320, "warehouse-document", "WarehouseShipment") },
  { label: "Create Pick", automationId: "CreatePick", identification: action("CreatePick", "Create Pick") },
  { identification: page(7345, 5766, "warehouse-activity", "WarehousePick") }
]);
const partial = engine.recognize(partialOutbound);
assert.strictEqual(partial.classification.process, "WarehouseOutbound");
assert.strictEqual(partial.partial, true);
assert(partial.classification.confidence > 0.5);
assert(partial.classification.explanation.some(reason => reason.includes("Partial")));

const purchase = synthetic("purchase", [
  { identification: page(50, 38, "purchase-order", "PurchaseOrder") },
  { label: "Release", automationId: "Release", identification: action("ReleaseDocument", "Release") },
  { identification: page(7332, 7316, "warehouse-document", "WarehouseReceipt") },
  { label: "Post Receipt", automationId: "PostReceipt", identification: action("PostDocument", "Post Receipt") },
  { identification: page(7340, 5766, "warehouse-activity", "WarehousePutAway") },
  { label: "Register Put-away", automationId: "RegisterPutAway", identification: action("RegisterPutAway", "Register Put-away") },
  { identification: page(136, 120, "posted-document", "PostedPurchaseReceipt") }
]);
const recognizedPurchase = engine.recognize(purchase);
assert.strictEqual(recognizedPurchase.classification.domain, "SourceToPay");
assert.strictEqual(recognizedPurchase.classification.process, "PurchaseToPay");
assert(recognizedPurchase.alternatives.some(item => item.process === "WarehouseInbound"));

const transfer = synthetic("transfer", [
  { identification: page(5740, 5740, "order", "TransferOrder") },
  { label: "Post Shipment", automationId: "PostTransferShipment", identification: action("PostDocument", "Post Transfer Shipment") },
  { identification: page(5742, 5744, "posted-document", "TransferShipment") },
  { label: "Post Receipt", automationId: "PostTransferReceipt", identification: action("PostDocument", "Post Transfer Receipt") },
  { identification: page(5746, 5746, "posted-document", "TransferReceipt") }
]);
assert.strictEqual(engine.recognize(transfer).classification.process, "TransferOrder");

const production = synthetic("production", [
  { identification: page(99000831, 5405, "manufacturing-order", "ProductionOrder") },
  { identification: page(99000832, 83, "journal", "ProductionJournal") },
  { label: "Post Consumption", automationId: "PostConsumption", identification: action("PostDocument", "Post Consumption") },
  { label: "Post Output", automationId: "PostOutput", identification: action("PostDocument", "Post Output") }
], [{ sourceIndexes: [3], businessDocument: { id: "document:production-order",
  name: "Production Order" }, fromState: { name: "Released" },
toState: { name: "Finished" } }]);
const recognizedProduction = engine.recognize(production);
assert.strictEqual(recognizedProduction.classification.process, "Production");
assert(recognizedProduction.classification.signals.matchedTransitions >= 1);
assert(recognizedProduction.classification.explanation.some(reason => reason.includes("Released → Finished")));

const captionOnly = synthetic("caption-only", [
  { label: "Sales Order" }, { label: "Release" }, { label: "Warehouse Shipment" }
]);
const weak = engine.recognize(captionOnly);
assert(weak.classification);
assert(weak.classification.confidence <= 0.54);
assert.strictEqual(weak.classification.signals.strongMetadata, false);

const visualOnly = synthetic("visual-only", [{ label: "Unidentified page" }]);
const visual = engine.recognize(visualOnly, { screenshotEvidence: {
  [visualOnly.events[0].id]: { possibleDocument: "Sales Order", confidence: 0.99 }
} });
assert.strictEqual(visual.classification, null);
assert.strictEqual(visual.aiComplement.authoritativeMetadataPrecedence, true);
const before = JSON.stringify(outbound);
engine.recognize(outbound);
assert.strictEqual(JSON.stringify(outbound), before, "Recognition must be read-only.");

console.log("Business Central Process Recognition Engine tests passed.");
