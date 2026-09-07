const assert = require("assert");
const canonical = require("../src/engine/canonical-recording");
const service = require("../src/engine/reference-process-library");
const seed = require("../src/engine/business-central-reference-process-seed").library;

const validation = service.validate(seed);
assert.strictEqual(validation.valid, true, JSON.stringify(validation.diagnostics, null, 2));
const registry = service.create(seed);
assert.strictEqual(registry.library.references.length, 35);
const required = ["Simple Sales Order", "Advanced Warehouse Outbound", "Purchase Return",
  "Physical Inventory", "Production with Warehouse Picking", "Demand Forecast",
  "Assembly to Order", "Expiration Date Handling"];
assert.deepStrictEqual(required.filter(name => !registry.library.references.some(item =>
  item.name === name)), []);
assert.strictEqual(registry.list("domain:order-to-cash").length, 5);
assert.strictEqual(registry.get("reference:bc:otc-advanced-outbound").startingDocument,
  "document:sales-order");
assert(registry.context("reference:bc:production-mto").configurationRequirements.length >= 0);
const serialized = JSON.stringify(seed);
assert(!/screenshot|coordinates|pixel|svg|canvas|html|css/i.test(serialized),
  "Reference semantics must not contain screenshots or rendering details.");

const aptean = registry.extend({ schemaVersion: "1.0.0",
  libraryId: "aptean-food-beverage-references", namespace: "aptean",
  references: [{ id: "reference:aptean:catch-weight-receipt",
    name: "Catch Weight Receipt", domain: "domain:aptean-food-beverage",
    description: "Receive catch-weight inventory.",
    startingDocument: "document:purchase-order",
    endingDocument: "document:warehouse-receipt",
    expectedDocuments: ["document:purchase-order", "document:warehouse-receipt"],
    optionalDocuments: [], expectedActions: ["Enter Catch Weight", "Receive"],
    optionalActions: [], expectedTransitions: [{ from: "document:purchase-order",
      to: "document:warehouse-receipt", relationshipType: "fulfilledBy" }],
    variants: ["catch-weight"], configurationRequirements: ["Aptean Catch Weight"] }]
});
assert(aptean.get("reference:aptean:catch-weight-receipt"));
assert.strictEqual(registry.get("reference:aptean:catch-weight-receipt"), null,
  "Extension must not mutate the core library.");

function classifiedRecording(id, stages) {
  let recording = canonical.create({ id, startedAt: "2026-09-02T08:00:00Z" });
  stages.forEach((stage, index) => { recording = canonical.addEvent(recording, {
    eventNo: index + 1, type: "click", label: stage.action,
    timestamp: `2026-09-02T08:00:${String(index).padStart(2, "0")}Z` });
  recording = canonical.setSemanticClassification(recording, {
    classificationId: `${id}:classification:${index}`,
    sourceEventIds: [recording.events[index].id],
    businessDocument: stage.document ? { id: stage.document, name: stage.document } : null,
    businessAction: stage.action ? { id: `action:${index}`, name: stage.action } : null,
    classificationSource: "manual", confidence: 1 }); });
  return recording;
}
const advanced = classifiedRecording("advanced-reference", [
  { document: "document:sales-order", action: "Release" },
  { document: "document:warehouse-shipment", action: "Create Pick" },
  { document: "document:warehouse-pick", action: "Register Pick" },
  { document: "document:posted-warehouse-shipment", action: "Post Shipment" },
  { document: "document:sales-invoice", action: "Post Invoice" },
  { document: "document:posted-sales-invoice", action: "Post" }
]);
const match = service.matchRecordingToReference(advanced, registry);
assert.strictEqual(match.bestMatch.referenceId, "reference:bc:otc-advanced-outbound");
assert(match.confidence >= 0.9);
assert.strictEqual(match.missingSteps.length, 0);
assert.strictEqual(match.bestMatch.deviationIsError, false);
assert.strictEqual(match.customizedProcessMayBeValid, true);
assert(match.matchedSteps.some(item => item.type === "transition" &&
  item.from === "document:warehouse-shipment" && item.to === "document:warehouse-pick"));
assert(match.alternativeMatches.some(item => item.referenceId === "reference:bc:otc-warehouse-pick"));

const partial = classifiedRecording("partial-reference", [
  { document: "document:sales-order", action: "Release" },
  { document: "document:warehouse-shipment", action: "Create Pick" },
  { document: "document:customer-extension-document", action: "Customer Approval" }
]);
const partialMatch = service.matchRecordingToReference(partial, registry);
assert(partialMatch.bestMatch);
assert(partialMatch.missingSteps.length > 0);
assert(partialMatch.unexpectedSteps.some(item =>
  item.id === "document:customer-extension-document" || item.name === "Customer Approval"));
assert.strictEqual(partialMatch.bestMatch.interpretation, "advisory");

const purchaseOpening = classifiedRecording("purchase-opening-reference", [
  { document: "document:purchase-order", action: "Create" },
  { document: "document:purchase-order", action: "Release" }
]);
const purchaseOpeningMatch = service.matchRecordingToReference(purchaseOpening, registry);
assert.strictEqual(purchaseOpeningMatch.bestMatch.referenceId,
  "reference:bc:stp-simple-purchase",
  "An ordinary purchase-order opening must prefer the simple reference process.");
assert.strictEqual(purchaseOpeningMatch.anchoredDomain, "domain:source-to-pay");
assert.strictEqual(purchaseOpeningMatch.bestMatch.matchDetails.observedPrecision, 1);
assert(purchaseOpeningMatch.bestMatch.matchDetails.referenceCoverage < 0.5);
assert(purchaseOpeningMatch.bestMatch.confidence >= 0.7,
  "a partial recording with no contradictory evidence should be confidently identifiable");
const conflictingPlanning = [purchaseOpeningMatch.bestMatch,
  ...purchaseOpeningMatch.alternativeMatches].find(item =>
  item.referenceId === "reference:bc:planning-create-purchase");
assert.strictEqual(conflictingPlanning, undefined,
  "Conflicting planning references must not be presented as useful alternatives.");
assert(purchaseOpeningMatch.alternativeMatches.every(item =>
  item.domain === "domain:source-to-pay" && item.confidence >= 0.12));
assert(purchaseOpeningMatch.suppressedAlternativeCount > 0);
const inventoryMovementOpening = classifiedRecording("inventory-movement-reference", [
  { document: "document:inventory-movement", action: "Create Movement" },
  { document: "document:inventory-movement", action: "Register Movement" }
]);
const inventoryMovementMatch = service.matchRecordingToReference(
  inventoryMovementOpening, registry);
assert.strictEqual(inventoryMovementMatch.anchoredDomain, "domain:inventory-to-deliver");
assert.strictEqual(inventoryMovementMatch.bestMatch.referenceId,
  "reference:bc:inventory-movement");
assert(inventoryMovementMatch.alternativeMatches.every(item =>
  item.domain === "domain:inventory-to-deliver"));
const unsupportedAdvancedInbound = service.compare(
  registry.get("reference:bc:stp-advanced-inbound"), purchaseOpeningMatch.observed,
  { anchoredDomain: purchaseOpeningMatch.anchoredDomain });
assert.strictEqual(unsupportedAdvancedInbound.configurationEvidence, false);
assert(unsupportedAdvancedInbound.specificityPenalty > 0,
  "Configuration-heavy references require observed configuration-specific evidence.");
const genericWarehouseActions = service.compare(
  registry.get("reference:bc:stp-advanced-inbound"), {
    documents: ["document:purchase-order"], actions: ["Create", "Post", "Register"]
  }, { anchoredDomain: "domain:source-to-pay" });
assert(!genericWarehouseActions.matchedSteps.some(item => item.type === "action"),
  "Generic verbs must not match specific warehouse actions.");
const specificWarehouseActions = service.compare(
  registry.get("reference:bc:stp-advanced-inbound"), {
    documents: ["document:purchase-order"], actions: ["Post Receipt", "Register Put-away"]
  }, { anchoredDomain: "domain:source-to-pay" });
assert(specificWarehouseActions.matchedSteps.some(item =>
  item.type === "action" && item.name === "Post Receipt"));
assert(specificWarehouseActions.matchedSteps.some(item =>
  item.type === "action" && item.name === "Register Put-away"));
const reversedWarehouseActions = service.compare(
  registry.get("reference:bc:stp-advanced-inbound"), {
    documents: ["document:purchase-order"], actions: ["Register Put-away", "Post Receipt"]
  }, { anchoredDomain: "domain:source-to-pay" });
assert.strictEqual(reversedWarehouseActions.actionOrderConflicts, 1);
assert(reversedWarehouseActions.confidence < specificWarehouseActions.confidence,
  "Specific actions in the wrong order must reduce the reference-process match.");
assert(!reversedWarehouseActions.matchedSteps.some(item =>
  item.type === "action" && item.name === "Register Put-away"));

const warehouseInbound = classifiedRecording("warehouse-inbound-reference", [
  { document: "document:purchase-order", action: "Release" },
  { document: "document:warehouse-receipt", action: "Receive" },
  { document: "document:warehouse-put-away", action: "Register Put-away" }
]);
const warehouseInboundMatch = service.matchRecordingToReference(warehouseInbound, registry);
const evidencedAdvancedInbound = service.compare(
  registry.get("reference:bc:stp-advanced-inbound"), warehouseInboundMatch.observed,
  { anchoredDomain: warehouseInboundMatch.anchoredDomain });
assert.strictEqual(evidencedAdvancedInbound.configurationEvidence, true);
assert.strictEqual(evidencedAdvancedInbound.specificityPenalty, 0);

const before = JSON.stringify(advanced);
service.matchRecordingToReference(advanced, registry);
assert.strictEqual(JSON.stringify(advanced), before, "Reference comparison must be read-only.");
assert.throws(() => service.create({ ...seed,
  references: [...seed.references, seed.references[0]] }), /Invalid reference process library/);

console.log("Reference Process Library tests passed.");
