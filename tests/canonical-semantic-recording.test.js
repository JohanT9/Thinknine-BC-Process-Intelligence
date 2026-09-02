const assert = require("assert");
const canonical = require("../src/engine/canonical-recording");

function recordingWithEvents() {
  let value = canonical.create({ id: "semantic-recording", title: "Create sales order",
    startedAt: "2026-09-02T08:00:00.000Z" });
  [["pageOpened", "Open Sales Orders"], ["click", "New"],
    ["fieldChanged", "Customer 10000"], ["fieldChanged", "Item 1896-S"],
    ["fieldChanged", "Quantity 10"], ["click", "Release"]]
    .forEach(([type, label], index) => { value = canonical.addEvent(value, {
      eventNo: index + 1, type, label,
      timestamp: `2026-09-02T08:00:0${index}.000Z` }); });
  return value;
}

const unclassified = recordingWithEvents();
assert.deepStrictEqual(unclassified.semanticInterpretation.classifications, []);
assert.strictEqual(canonical.integrityDiagnostics(unclassified).length, 0);
const rawSnapshot = JSON.stringify(unclassified.events);
const classified = canonical.setSemanticClassification(unclassified, {
  classificationId: "create-release-sales-order",
  sourceEventIds: unclassified.events.map(event => event.id),
  businessDomain: { id: "bc.domain.order-to-cash", name: "Order to Cash" },
  businessProcess: { id: "bc.business-process.sales-order-processing", name: "Sales Order Processing" },
  bcProcess: { id: "bc.process.order-to-cash.sales-order", name: "Sales Order" },
  processStep: { id: "bc.step.sales-order.create-release", name: "Create and Release Sales Order" },
  businessDocument: { id: "bc.document.sales-order", name: "Sales Order" },
  businessAction: { id: "bc.action.release", name: "Release" },
  businessEntity: { id: "sales-order:1001", name: "Sales Order 1001" },
  processRole: { id: "role.sales-order-processor", name: "Sales Order Processor" },
  confidence: 0.94, classificationSource: "rule"
});
const full = classified.semanticInterpretation.classifications[0];
assert.strictEqual(full.businessDomain.name, "Order to Cash");
assert.strictEqual(full.processStep.name, "Create and Release Sales Order");
assert.strictEqual(full.sourceEventIds.length, 6);
assert.strictEqual(JSON.stringify(classified.events), rawSnapshot);
assert.strictEqual(canonical.semanticForEvent(classified, classified.events[1].id)
  .classifications[0].classificationId, "create-release-sales-order");

const withTransition = canonical.setDocumentStateTransition(classified, {
  transitionId: "sales-order-release", sourceEventIds: [classified.events[5].id],
  businessDocument: { id: "bc.document.sales-order", name: "Sales Order" },
  businessEntity: { id: "sales-order:1001", name: "Sales Order 1001" },
  fromState: { id: "open", name: "Open" },
  toState: { id: "released", name: "Released" },
  classificationSource: "metadata", confidence: 1
});
const transition = withTransition.semanticInterpretation.documentStateTransitions[0];
assert.strictEqual(transition.fromState.name, "Open");
assert.strictEqual(transition.toState.name, "Released");
assert.strictEqual(canonical.semanticForEvent(withTransition, classified.events[5].id)
  .documentStateTransitions.length, 1);

const aiClassified = canonical.setSemanticClassification(unclassified, {
  classificationId: "sales-order-step",
  sourceEventIds: unclassified.events.slice(0, 5).map(event => event.id),
  processStep: "bc.step.sales-order.create", classificationSource: "AI",
  confidence: 0.82, classificationMetadata: { provider: "OpenAI",
    model: "classification-model-v1", promptVersion: "bc-semantic-v1" }
});
assert.strictEqual(aiClassified.semanticInterpretation.classifications[0]
  .classificationSource, "AI");
assert.strictEqual(aiClassified.semanticInterpretation.classifications[0]
  .classificationMetadata.model, "classification-model-v1");
const manuallyOverridden = canonical.setSemanticClassification(aiClassified, {
  classificationId: "sales-order-step",
  sourceEventIds: aiClassified.events.slice(0, 5).map(event => event.id),
  processStep: { id: "bc.step.sales-order.create", name: "Create Sales Order" },
  classificationSource: "manual", confidence: 1,
  metadata: { classifiedAt: "2026-09-02T09:00:00.000Z" }
});
assert.strictEqual(manuallyOverridden.semanticInterpretation.classifications[0]
  .classificationSource, "manual");
assert.strictEqual(manuallyOverridden.semanticInterpretation.classificationHistory[0]
  .classification.classificationSource, "AI");
assert.strictEqual(JSON.stringify(manuallyOverridden.events), rawSnapshot);

const finished = canonical.finish(unclassified, "2026-09-02T10:00:00.000Z");
const evidenceSnapshot = JSON.stringify({ events: finished.events, assets: finished.assets,
  metadata: finished.metadata, compatibility: finished.compatibility });
const classifiedFinished = canonical.setSemanticClassification(finished, {
  sourceEventIds: [finished.events[5].id], processStep: "bc.step.sales-order.release",
  classificationSource: "manual", confidence: 1
});
assert.strictEqual(JSON.stringify({ events: classifiedFinished.events,
  assets: classifiedFinished.assets, metadata: classifiedFinished.metadata,
  compatibility: classifiedFinished.compatibility }), evidenceSnapshot);

const existing = JSON.parse(JSON.stringify(unclassified));
delete existing.semanticInterpretation;
assert.deepStrictEqual(canonical.normalize(existing).semanticInterpretation.classifications, []);
assert.throws(() => canonical.setSemanticClassification(unclassified, {
  sourceEventIds: ["missing-event"], processStep: "step",
  classificationSource: "manual" }), /source event not found/);
const corrupt = JSON.parse(JSON.stringify(classified));
corrupt.semanticInterpretation.classifications[0].sourceEventIds = ["missing-event"];
assert(canonical.integrityDiagnostics(corrupt).some(item =>
  item.code === "missing-semantic-source-event"));
assert.throws(() => canonical.setSemanticClassification(unclassified, {
  sourceEventIds: [unclassified.events[0].id], classificationSource: "guess"
}), /Unsupported classification source/);

console.log("Canonical semantic recording tests passed.");
