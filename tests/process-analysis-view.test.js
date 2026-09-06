const assert = require("assert");
const fs = require("fs");
const path = require("path");
const view = require("../src/ui/process-analysis-view");

const result = {
  bestMatch: { referenceProcessId: "reference:advanced", referenceProcess:
    "Advanced Warehouse Outbound", domain: "Order to Cash", confidence: 0.91,
  matchedSteps: [{ type: "action", name: "Release" }, { type: "action", name: "Create Pick" }],
  missingSteps: [{ type: "action", name: "Post Shipment" }],
  additionalSteps: [{ type: "action", name: "Customer Approval" }],
  matchDetails: { observedPrecision: 0.96, referenceCoverage: 0.74 }, evidence: {
    documents: [{ name: "Sales Order" }, { name: "Warehouse Shipment" }],
    actions: [{ name: "Release" }, { name: "Create Pick" }], signals: {} } },
  matches: [{ referenceDiagramId: "diagram:basic", referenceProcess: "Basic Warehouse Outbound",
    domain: "domain:order-to-cash", confidence: 0.68, matchedSteps: [{ title: "Release" }],
    missingSteps: [], additionalSteps: [] }, { referenceDiagramId: "diagram:transfer",
    referenceProcess: "Transfer Order", domain: "domain:transfers", confidence: 0.8,
    matchedSteps: [], missingSteps: [], additionalSteps: [] }],
  processLibraryMatch: { alternativeMatches: [{ referenceId: "reference:simple", name:
    "Simple Sales Order", domain: "Order to Cash", confidence: 0.42 }] }
};

const snapshot = JSON.stringify(result);
const normalized = view.normalize(result);
assert.strictEqual(JSON.stringify(result), snapshot, "The view must not mutate analysis results.");
assert.strictEqual(normalized.name, "Advanced Warehouse Outbound");
assert.strictEqual(normalized.confidence, 0.91);
assert.strictEqual(normalized.matched.length, 2);
assert.strictEqual(normalized.missing.length, 1);
assert.strictEqual(normalized.additional.length, 1);
assert.strictEqual(normalized.alternatives.length, 2);
assert(!normalized.alternatives.some(item => item.id === "diagram:transfer"));
assert.strictEqual(normalized.advisory, true);
assert.strictEqual(normalized.assessmentStatus, "auto-classifiable");
assert.strictEqual(normalized.evidence.documents.length, 2);
assert.strictEqual(normalized.matchDetails.observedPrecision, 0.96);
assert.strictEqual(normalized.matchDetails.referenceCoverage, 0.74);

const selected = view.normalize(result, { confirmedReferenceId: "diagram:basic",
  confirmedAt: "2026-09-02T15:00:00Z", status: "confirmed" });
assert.strictEqual(selected.referenceId, "diagram:basic");
assert.strictEqual(selected.name, "Basic Warehouse Outbound");
assert.strictEqual(selected.confirmed, true);
assert.strictEqual(selected.assessmentStatus, "manual-confirmed");
assert.strictEqual(selected.manualConfirmationRecommended, false);
assert.strictEqual(selected.confidence, 1);
assert.strictEqual(selected.matchConfidence, 0.68);

const container = { innerHTML: "", querySelector() { return null; } };
view.render(container, { result }, { detected: "Identifierad referensprocess",
  match: "matchning", matched: "Matchade", missing: "Möjligen saknade",
  additional: "Kundunika" });
assert(container.innerHTML.includes("Advanced Warehouse Outbound"));
assert(container.innerHTML.includes("91%"));
assert(container.innerHTML.includes("Customer Approval"));
assert(container.innerHTML.includes("Why this assessment?"));
assert(container.innerHTML.includes("Warehouse Shipment"));
assert(container.innerHTML.includes("Release, Create Pick"));
assert(container.innerHTML.includes("Observed steps fit"));
assert(container.innerHTML.includes("96%"));
assert(container.innerHTML.includes("Reference process covered"));
assert(container.innerHTML.includes("74%"));
assert(container.innerHTML.includes('role="progressbar"'));
assert(container.innerHTML.includes('name="processAnalysisReference"'));
assert(container.innerHTML.includes("auto-classifiable"));
assert(!container.innerHTML.includes("undefined"));

const malicious = { bestMatch: { referenceProcessId: "unsafe", referenceProcess:
  "<img src=x onerror=alert(1)>", confidence: 1, matchedSteps: [], missingSteps: [],
  additionalSteps: [] } };
view.render(container, { result: malicious });
assert(!container.innerHTML.includes("<img"), "Reference labels must be escaped.");
assert(container.innerHTML.includes("&lt;img"));

const uncertain = { ...result, assessment: { status: "review-required", evidenceQuality: "weak",
  candidateMargin: 0.03, manualConfirmationRecommended: true } };
const uncertainModel = view.render(container, { result: uncertain }, {
  "review-required": "Needs confirmation", confirmationRecommended: "Confirm first." });
assert.strictEqual(uncertainModel.manualConfirmationRecommended, true);
assert(container.innerHTML.includes("Needs confirmation"));

view.render(container, { result: { bestMatch: { referenceProcessId: "transfer",
  referenceProcess: "Transfer Order", domain: "Inventory Transfer", confidence: 0.8,
  matchedSteps: [], missingSteps: [], additionalSteps: [] } } }, { processNames: {
    "Transfer Order": "Överföringsorder", "Inventory Transfer": "Lageröverföring" } });
assert(container.innerHTML.includes("Överföringsorder"));
assert(container.innerHTML.includes("Lageröverföring"));

const selectedContainer = { querySelector() { return { value: "diagram:basic",
  dataset: { referenceName: "Basic Warehouse Outbound" } }; } };
assert.deepStrictEqual(view.selectedReference(selectedContainer, normalized), {
  id: "diagram:basic", name: "Basic Warehouse Outbound" });
const confirmedContainer = { innerHTML: "", querySelector() { return null; } };
view.render(confirmedContainer, { result, decision: {
  confirmedReferenceId: "diagram:basic", status: "confirmed" } });
assert(confirmedContainer.innerHTML.includes("Basic Warehouse Outbound"));
assert(confirmedContainer.innerHTML.includes("manual-confirmed"));
assert(confirmedContainer.innerHTML.includes("100%"));
assert(confirmedContainer.innerHTML.includes("manually confirmed"));
const localizedPurchaseContainer = { innerHTML: "", querySelector() { return null; } };
view.render(localizedPurchaseContainer, { result: { bestMatch: {
  referenceProcessId: "simple-purchase", referenceProcess: "Simple Purchase Order",
  confidence: 0.29, matchedSteps: [{ id: "document:purchase-order" },
    { name: "Release" }], missingSteps: [{ id: "document:purchase-invoice" },
    { name: "Post" }, { name: "Unknown step" }], additionalSteps: [] } } }, {
  processNames: { "Simple Purchase Order": "Enkel inköpsorder",
    "document:purchase-order": "Inköpsorder", "Release": "Frisläpp",
    "document:purchase-invoice": "Inköpsfaktura", "Post": "Bokför",
    "Unknown step": "Okänt steg" } });
for (const label of ["Enkel inköpsorder", "Inköpsorder", "Frisläpp",
  "Inköpsfaktura", "Bokför", "Okänt steg"]) {
  assert(localizedPurchaseContainer.innerHTML.includes(label));
}

const empty = view.render(container, { result: {} }, { noMatchTitle: "Ingen säker matchning",
  noMatchText: "Klassificera senare." });
assert.strictEqual(empty.available, false);
assert(container.innerHTML.includes('role="status"'));

const variantResult = { bestMatch: { referenceProcessId: "purchase", referenceProcess:
  "Purchase to Pay", confidence: 0.63, matchedSteps: [], missingSteps: [{
    name: "Warehouse Put-away", applicability: "conditional",
    variantIds: ["variant:advanced-warehouse"] }, {
    name: "Purchase Invoice", applicability: "optional", variantIds: ["variant:basic-warehouse",
      "variant:advanced-warehouse"] }], additionalSteps: [],
  variantAssessment: { selectedVariantId: "variant:basic-warehouse",
    selectedVariantName: "Basic Warehouse", ambiguous: true, alternativeVariants: [{
      id: "variant:advanced-warehouse", name: "Advanced Warehouse", confidence: 0.63 }] } } };
const variantModel = view.render(container, { result: variantResult }, {
  configurationVariant: "Business Central-konfiguration",
  variantUncertain: "Variantberoende steg visas som villkorliga.",
  variantAlternatives: "Andra möjliga konfigurationer", variantNames: {
    "variant:basic-warehouse": "Grundläggande lagerhantering",
    "variant:advanced-warehouse": "Avancerad lagerhantering" } });
assert.strictEqual(variantModel.variantAssessment.ambiguous, true);
assert.strictEqual(variantModel.missing.length, 0);
assert.strictEqual(variantModel.conditional.length, 2);
assert(container.innerHTML.includes("Grundläggande lagerhantering"));
assert(container.innerHTML.includes("Avancerad lagerhantering"));
assert(container.innerHTML.includes("Variantberoende steg visas som villkorliga."));
assert(container.innerHTML.includes('name="processAnalysisVariant"'));
assert(!container.innerHTML.includes("process-analysis-metric conditional"));
assert(container.innerHTML.includes("process-analysis-reference-comparison"));
assert(container.innerHTML.includes("Configuration-dependent reference steps"));
assert(container.innerHTML.includes("Mest sannolik") === false,
  "The optional localized badge is only shown when supplied.");
const variantContainer = { querySelector(selector) { return selector.includes(
  "processAnalysisVariant") ? { value: "variant:advanced-warehouse",
    dataset: { variantName: "Advanced Warehouse" } } : null; } };
assert.deepStrictEqual(view.selectedVariant(variantContainer, variantModel), {
  id: "variant:advanced-warehouse", name: "Advanced Warehouse" });
const confirmedBasic = view.render(container, { result: variantResult, decision: {
  confirmedVariantId: "variant:basic-warehouse", confirmedVariantName: "Basic Warehouse" } }, {
  variantConfirmed: "Konfigurationen valdes manuellt och styr nu processkartan.",
  variantNames: { "variant:basic-warehouse": "Grundläggande lagerhantering",
    "variant:advanced-warehouse": "Avancerad lagerhantering" } });
assert.strictEqual(confirmedBasic.missing.length, 1);
assert.strictEqual(confirmedBasic.conditional.length, 0);
assert.strictEqual(confirmedBasic.missing[0].name, "Purchase Invoice");
assert.strictEqual(confirmedBasic.variantAssessment.selectedVariantId,
  "variant:basic-warehouse");
assert(container.innerHTML.includes("Konfigurationen valdes manuellt och styr nu processkartan."));
assert(container.innerHTML.includes('value="variant:basic-warehouse"'));
assert(container.innerHTML.includes('value="variant:advanced-warehouse"'));

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "src/ui/dashboard.html"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "src/ui/dashboard.js"), "utf8");
const background = fs.readFileSync(path.join(root, "src/recorder/background.js"), "utf8");
assert(html.includes('id="openProcessAnalysis"'));
assert(html.includes('id="processAnalysisDialog"'));
assert(html.includes('src="process-analysis-view.js"'));
assert(dashboard.includes('type: "T9_MATCH_REFERENCE_PROCESS"'));
assert(dashboard.includes("persistProcessAnalysisDecision(reference, \"confirmed\", variant)"));
assert(dashboard.includes("reference.id === model.referenceId"));
assert(dashboard.includes("T9Review.replaceGeneratedReview"));
assert(dashboard.includes("reviewAutoSave.schedule()"));
assert(background.includes('case "T9_MATCH_REFERENCE_PROCESS"'));
console.log("Process Analysis view tests passed.");
