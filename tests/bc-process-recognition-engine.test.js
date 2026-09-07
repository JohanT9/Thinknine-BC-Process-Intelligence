const assert = require("assert");
const canonical = require("../src/engine/canonical-recording");
const engine = require("../src/engine/bc-process-recognition-engine");
const taxonomySeed = require("../src/engine/business-central-process-taxonomy-seed").seed;

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
  { identification: page(7337, 7322, "posted-document", "PostedWarehouseShipment") }
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
  { identification: page(5770, 5766, "warehouse-activity", "WarehousePutAway") },
  { label: "Register Put-away", automationId: "RegisterPutAway", identification: action("RegisterPutAway", "Register Put-away") },
  { identification: page(136, 120, "posted-document", "PostedPurchaseReceipt") }
]);
const recognizedPurchase = engine.recognize(purchase);
assert.strictEqual(recognizedPurchase.classification.domain, "SourceToPay");
assert.strictEqual(recognizedPurchase.classification.process, "PurchaseToPay");
assert.deepStrictEqual(recognizedPurchase.classification.processEvidence.matchedDocuments
  .map(item => item.id), ["document:purchase-order", "document:warehouse-receipt",
  "document:warehouse-put-away", "document:posted-purchase-receipt"]);
assert(recognizedPurchase.classification.processEvidence.expectedDocuments.length >= 5);
assert(recognizedPurchase.alternatives.some(item => item.process === "WarehouseInbound"));
assert(!recognizedPurchase.alternatives.some(item => ["TransferOrder", "Assembly", "Planning"]
  .includes(item.process)), "strong purchase metadata must exclude incompatible domains");
const purchaseCandidates = [recognizedPurchase.classification, ...recognizedPurchase.alternatives];
assert(purchaseCandidates.every(item => item.taxonomyReferences.domain.id ===
  "domain:source-to-pay" || item.taxonomyReferences.domain.id === "domain:warehouse-management"));
assert(recognizedPurchase.classification.processEvidence.variantAssessment,
  "Lifecycle variant evidence should be available to downstream process maps.");

const standardPageViews = [
  [9300, "document:sales-quote", "list"],
  [9305, "document:sales-order", "list"],
  [7339, "document:warehouse-shipment", "list"],
  [5779, "document:warehouse-pick", "document"],
  [9313, "document:warehouse-pick", "list"],
  [142, "document:posted-sales-shipment", "posted-list"],
  [5768, "document:warehouse-receipt", "document"],
  [5770, "document:warehouse-put-away", "document"],
  [9312, "document:warehouse-put-away", "list"],
  [7352, "document:warehouse-put-away", "worksheet"],
  [7330, "document:posted-warehouse-receipt", "posted-card"],
  [7333, "document:posted-warehouse-receipt", "posted-list"],
  [7337, "document:posted-warehouse-shipment", "posted-card"],
  [7340, "document:posted-warehouse-shipment", "posted-list"],
  [9324, "document:planned-production-order", "list"],
  [9325, "document:firm-planned-production-order", "list"],
  [99000867, "document:finished-production-order", "posted-card"],
  [6660, "document:return-receipt", "posted-card"],
  [6662, "document:return-receipt", "posted-list"],
  [6650, "document:return-shipment", "posted-card"],
  [6652, "document:return-shipment", "posted-list"],
  [44, "document:sales-credit-memo", "document"],
  [9302, "document:sales-credit-memo", "list"],
  [134, "document:posted-sales-credit-memo", "posted-card"],
  [144, "document:posted-sales-credit-memo", "posted-list"],
  [52, "document:purchase-credit-memo", "document"],
  [9309, "document:purchase-credit-memo", "list"],
  [140, "document:posted-purchase-credit-memo", "posted-card"],
  [147, "document:posted-purchase-credit-memo", "posted-list"],
  [9301, "document:sales-invoice", "list"],
  [143, "document:posted-sales-invoice", "posted-list"],
  [9307, "document:purchase-order", "list"],
  [145, "document:posted-purchase-receipt", "posted-list"],
  [9308, "document:purchase-invoice", "list"],
  [146, "document:posted-purchase-invoice", "posted-list"],
  [5742, "document:transfer-order", "list"],
  [5752, "document:transfer-shipment", "posted-list"],
  [5753, "document:transfer-receipt", "posted-list"],
  [9326, "document:production-order", "list"],
  [9327, "document:finished-production-order", "posted-list"],
  [902, "document:assembly-order", "list"],
  [9304, "document:sales-return-order", "list"],
  [9311, "document:purchase-return-order", "list"],
  [9330, "document:inventory-movement", "list"],
  [9314, "document:warehouse-movement", "list"],
  [6510, "document:item-tracking-lines", "worksheet"],
  [39, "document:general-journal", "worksheet"],
  [40, "document:item-journal", "worksheet"],
  [393, "document:item-reclassification-journal", "worksheet"],
  [392, "document:physical-inventory-journal", "worksheet"]
];
standardPageViews.forEach(([pageObjectId, documentId, viewType]) => {
  const evidence = engine.extractEvidence(synthetic(`page-view-${pageObjectId}`, [
    { identification: page(pageObjectId, "", "", "") }
  ]));
  assert.strictEqual(evidence.observations[0].document.id, documentId,
    `BC page ${pageObjectId} should resolve to ${documentId}`);
  assert.strictEqual(evidence.observations[0].document.view.viewType, viewType);
});

[
  ["sales-return-list", 9304, "SalesReturns", "domain:returns"],
  ["purchase-return-list", 9311, "PurchaseReturns", "domain:returns"],
  ["inventory-movement-list", 9330, "InventoryMovement", "domain:inventory-to-deliver"],
  ["warehouse-movement-list", 9314, "WarehouseMovement", "domain:warehouse-management"],
  ["item-tracking-lines", 6510, "ItemTracking", "domain:item-tracking"],
  ["general-journal", 39, "GeneralJournalPosting", "domain:record-to-report"],
  ["item-journal", 40, "ItemAdjustment", "domain:inventory-to-deliver"],
  ["item-reclassification", 393, "ItemReclassification", "domain:inventory-to-deliver"],
  ["physical-inventory", 392, "PhysicalInventory", "domain:inventory-to-deliver"]
].forEach(([id, pageObjectId, process, domainId]) => {
  const result = engine.recognize(synthetic(id, [
    { identification: page(pageObjectId, "", "", "") }
  ]));
  assert.strictEqual(result.classification.process, process);
  assert.strictEqual(result.classification.taxonomyReferences.domain.id, domainId);
  assert(engine.extractEvidence(synthetic(`${id}-evidence`, [
    { identification: page(pageObjectId, "", "", "") }
  ])).observations[0].explanations.some(item => item.includes(String(pageObjectId))),
    `recognition for page ${pageObjectId} should explain its page evidence`);
});

const purchaseOrderOnly = engine.recognize(synthetic("purchase-order-only", [
  { identification: page(50, 38, "purchase-order", "PurchaseOrder") },
  { identification: page(7332, 7316, "warehouse-document", "WarehouseReceipt") }
]));
assert.strictEqual(purchaseOrderOnly.classification.processEvidence.variantAssessment.ambiguous, true);
assert.strictEqual(purchaseOrderOnly.classification.processEvidence.lifecycleDocuments.find(item =>
  item.id === "document:warehouse-put-away").applicability, "conditional",
"Warehouse put-away must not be presented as mandatory before the warehouse variant is known.");

const purchaseHeaderOnly = engine.recognize(synthetic("purchase-header-only", [
  { identification: page(50, 38, "purchase-order", "PurchaseOrder") },
  { label: "Release", automationId: "Release", identification: action("ReleaseDocument", "Release") }
]));
assert.strictEqual(purchaseHeaderOnly.classification.processEvidence.variantAssessment.selectedVariantId,
  "variant:no-warehouse",
  "Generic purchase-order activity must not select an advanced warehouse variant.");
assert(purchaseHeaderOnly.classification.explanation.some(item =>
  item.includes("Variant-specific stages were not observed")));

const swedishPurchase = synthetic("swedish-purchase", [
  { label: "Ny - Inköpsorder (UAT)" },
  { label: "Distributionslagerinleverans - DIR100224 (UAT)" }
]);
assert.deepStrictEqual(swedishPurchase.events.length, 2);
const swedishEvidence = engine.extractEvidence(swedishPurchase);
assert.deepStrictEqual(swedishEvidence.documentSequence.map(item => item.id),
  ["document:purchase-order", "document:warehouse-receipt"]);

const transfer = synthetic("transfer", [
  { identification: page(5740, 5740, "order", "TransferOrder") },
  { label: "Post Shipment", automationId: "PostTransferShipment", identification: action("PostDocument", "Post Transfer Shipment") },
  { identification: page(5744, 5744, "posted-document", "TransferShipment") },
  { label: "Post Receipt", automationId: "PostTransferReceipt", identification: action("PostDocument", "Post Transfer Receipt") },
  { identification: page(5746, 5746, "posted-document", "TransferReceipt") }
]);
assert.strictEqual(engine.recognize(transfer).classification.process, "TransferOrder");
const purchaseAgainstTransfer = engine.recognize(synthetic("purchase-not-transfer", [
  { identification: page(50, 38, "purchase-order", "PurchaseOrder") },
  { label: "Release", automationId: "Release", identification: action("ReleaseDocument", "Release") },
  { label: "Post Receipt", automationId: "PostReceipt",
    identification: action("PostDocument", "Post Receipt") }
]), { minimumConfidence: 0, taxonomy: { ...taxonomySeed,
  bcProcesses: taxonomySeed.bcProcesses.filter(item => [
    "bc-process:source-to-pay:standard-purchase-order",
    "bc-process:transfers:standard-transfer-order"
  ].includes(item.id)) } });
const incompatibleTransfer = [purchaseAgainstTransfer.classification,
  ...purchaseAgainstTransfer.alternatives].filter(Boolean).find(item =>
  item.taxonomyReferences.bcProcess.id === "bc-process:transfers:standard-transfer-order");
assert(incompatibleTransfer && incompatibleTransfer.confidence <= 0.11);
assert.strictEqual(incompatibleTransfer.signals.domainAnchorConflict, true);
assert(incompatibleTransfer.explanation.some(item => item.includes("anchors the recording")));

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
assert(weak.evidence.observations.every(item => item.actions.length === 0),
  "page and document captions must not be interpreted as business actions");
const unrelatedRegister = synthetic("unrelated-register", [{ label: "Registrera vikt",
  identification: { actionIdentity: { caption: "Registrera vikt", source: "caption-fallback" } } }]);
assert(!engine.extractEvidence(unrelatedRegister).observations[0].actions.some(item =>
  item.name === "Register"), "A weight registration is not a warehouse Register action.");

const repeatedRelease = synthetic("repeated-release", [
  { identification: page(42, 36, "order", "SalesOrder") },
  { label: "Release", automationId: "Release", identification: action("ReleaseDocument", "Release") },
  { label: "Release", automationId: "Release", identification: action("ReleaseDocument", "Release") },
  { label: "Release", automationId: "Release", identification: action("ReleaseDocument", "Release") }
]);
const repeatedResult = engine.recognize(repeatedRelease);
assert.strictEqual(repeatedResult.classification.signals.distinctMatchedActions, 1,
  "repeated UI events must not inflate action evidence");
assert.strictEqual(repeatedResult.classification.signals.evidenceQuality, "strong");

const singleReceipt = synthetic("single-receipt", [
  { identification: page(7332, 7316, "warehouse-document", "WarehouseReceipt") }
]);
const ambiguousReceipt = engine.recognize(singleReceipt);
assert.strictEqual(ambiguousReceipt.assessment.status, "insufficient-evidence");
assert.strictEqual(ambiguousReceipt.assessment.manualConfirmationRecommended, true);
assert.strictEqual(ambiguousReceipt.classification.signals.ambiguous, true);
assert(ambiguousReceipt.diagnostics.some(item => item.code === "ambiguous-process"));

const reverseOutbound = synthetic("reverse-outbound", [
  { identification: page(7345, 5766, "warehouse-activity", "WarehousePick") },
  { identification: page(7335, 7320, "warehouse-document", "WarehouseShipment") }
]);
const reverseResult = engine.recognize(reverseOutbound, { minimumConfidence: 0.01 });
const outboundCandidate = [reverseResult.classification, ...reverseResult.alternatives]
  .filter(Boolean).find(item => item.taxonomyReferences.bcProcess.id ===
    "bc-process:warehouse:outbound-pick-shipment");
assert(outboundCandidate.signals.orderConflicts >= 1);
assert(outboundCandidate.explanation.some(item => item.includes("order conflict")));

const visualOnly = synthetic("visual-only", [{ label: "Unidentified page" }]);
const visual = engine.recognize(visualOnly, { screenshotEvidence: {
  [visualOnly.events[0].id]: { possibleDocument: "Sales Order", confidence: 0.99 }
} });
assert.strictEqual(visual.classification, null);
assert.strictEqual(visual.assessment.status, "insufficient-evidence");
assert.strictEqual(visual.aiComplement.authoritativeMetadataPrecedence, true);
const before = JSON.stringify(outbound);
engine.recognize(outbound);
assert.strictEqual(JSON.stringify(outbound), before, "Recognition must be read-only.");

console.log("Business Central Process Recognition Engine tests passed.");
