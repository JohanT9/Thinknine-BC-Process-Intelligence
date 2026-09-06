const assert = require("assert");
const engine = require("../src/engine/bc-process-recognition-engine");
const canonical = require("../src/engine/canonical-recording");

function recording(id, evidence) {
  return {
    schemaVersion: 1,
    id,
    events: evidence.map((item, index) => ({
      id: `${id}:event:${index + 1}`,
      sequence: index + 1,
      businessDocument: item.startsWith("document:") ? { id: item } : undefined,
      identification: item.startsWith("action:") ? {
        actionIdentity: { actionType: item.slice(7), caption: item.slice(7),
          source: "technical-action-id" }
      } : undefined
    }))
  };
}

const cases = [
  { id: "sales-order", domain: "domain:order-to-cash",
    process: "bc-process:order-to-cash:standard-sales-order",
    evidence: ["document:sales-order", "action:ReleaseDocument"] },
  { id: "warehouse-outbound", domain: "domain:warehouse-management",
    process: "bc-process:warehouse:outbound-pick-shipment",
    evidence: ["document:warehouse-shipment", "action:CreatePick",
      "document:warehouse-pick", "action:RegisterPick", "action:PostShipment",
      "document:posted-sales-shipment"] },
  { id: "purchase-order", domain: "domain:source-to-pay",
    process: "bc-process:source-to-pay:standard-purchase-order",
    evidence: ["document:purchase-order", "action:ReleaseDocument"] },
  { id: "warehouse-inbound", domain: "domain:warehouse-management",
    process: "bc-process:warehouse:inbound-receipt-put-away",
    evidence: ["document:warehouse-receipt", "action:PostReceipt",
      "document:warehouse-put-away", "action:RegisterPutAway"] },
  { id: "transfer", domain: "domain:transfers",
    process: "bc-process:transfers:standard-transfer-order",
    evidence: ["document:transfer-order", "action:PostTransferShipment",
      "document:transfer-shipment", "action:PostTransferReceipt",
      "document:transfer-receipt"] },
  { id: "production", domain: "domain:plan-to-produce",
    process: "bc-process:production:released-production-order",
    evidence: ["document:production-order", "document:production-journal",
      "action:PostConsumption", "action:PostOutput"] },
  { id: "assembly", domain: "domain:assembly",
    process: "bc-process:assembly:assemble-to-stock",
    evidence: ["document:assembly-order", "action:PostAssembly"] },
  { id: "planning", domain: "domain:forecast-to-plan",
    process: "bc-process:planning:planning-worksheet",
    evidence: ["document:planning-worksheet", "action:CalculateRegenerativePlan",
      "action:CarryOutActionMessage"] }
];

cases.forEach(testCase => {
  const result = engine.recognize(recording(testCase.id, testCase.evidence));
  assert(result.classification, `${testCase.id} should produce a classification`);
  assert.strictEqual(result.classification.taxonomyReferences.domain.id, testCase.domain,
    `${testCase.id} should stay in its Business Central domain`);
  assert.strictEqual(result.classification.taxonomyReferences.bcProcess.id, testCase.process,
    `${testCase.id} should select its canonical BC process`);
});

const partialPurchase = engine.recognize(recording("partial-purchase", [
  "document:purchase-order", "action:ReleaseDocument", "action:PostShipment"
]));
assert.strictEqual(partialPurchase.classification.taxonomyReferences.domain.id,
  "domain:source-to-pay", "a generic shipment verb must not override purchase metadata");
assert(!partialPurchase.classification.processEvidence.matchedActions.some(item =>
  item.name === "Post"),
"Post Shipment must not count as a purchase receipt or purchase invoice posting action");
const outboundPost = engine.recognize(recording("qualified-outbound", [
  "document:warehouse-shipment", "action:PostShipment"
])).classification.processEvidence.matchedActions.find(item => item.name === "Post");
assert.deepStrictEqual(outboundPost.qualifiers, ["shipment"],
  "matched actions must retain their Business Central context for explainability");

const migratedLegacyPurchase = canonical.fromLegacy({ id: "legacy-purchase",
  startedAt: "2026-09-04T11:00:00.000Z" }, [{ eventNo: 1, type: "click",
  identification: { pageIdentity: { pageObjectId: "50", tableId: "38",
    documentType: "purchase-order", entity: "PurchaseOrder" } } },
{ eventNo: 2, type: "click", identification: { actionIdentity: {
  actionType: "ReleaseDocument", caption: "Frisläpp" } } }]);
const migratedLegacyResult = engine.recognize(migratedLegacyPurchase);
assert.strictEqual(migratedLegacyResult.classification.taxonomyReferences.domain.id,
  "domain:source-to-pay",
"legacy exports must feed their stored Business Central identity into process recognition");
assert(migratedLegacyResult.classification.processEvidence.matchedActions.some(item =>
  item.name === "Release"));
const storedBeforeLegacyFix = JSON.parse(JSON.stringify(migratedLegacyPurchase));
storedBeforeLegacyFix.events.forEach(event => { delete event.identification; });
const repairedStoredResult = engine.recognize(canonical.normalize(storedBeforeLegacyFix));
assert.strictEqual(repairedStoredResult.classification.taxonomyReferences.domain.id,
  "domain:source-to-pay",
"already stored canonical recordings must recover legacy identity during normalization");
assert.strictEqual(partialPurchase.assessment.status, "review-required",
  "strong document and action identity should make a partial process reviewable");
assert.notStrictEqual(partialPurchase.assessment.status, "auto-classifiable",
  "an incomplete process must not be presented as automatically recognized");
assert(!partialPurchase.alternatives.some(candidate =>
  candidate.taxonomyReferences.domain.id === "domain:transfers"),
"strong purchase evidence must exclude transfer alternatives");

console.log(`Process recognition corpus tests passed (${cases.length} domains).`);
