const assert = require("assert");
const fs = require("fs");
const path = require("path");
const view = require("../src/ui/process-analysis-view");

const result = {
  bestMatch: { referenceProcessId: "reference:advanced", referenceProcess:
    "Advanced Warehouse Outbound", domain: "Order to Cash", confidence: 0.91,
  matchedSteps: [{ type: "action", name: "Release" }, { type: "action", name: "Create Pick" }],
  missingSteps: [{ type: "action", name: "Post Shipment" }],
  additionalSteps: [{ type: "action", name: "Customer Approval" }] },
  matches: [{ referenceDiagramId: "diagram:basic", referenceProcess: "Basic Warehouse Outbound",
    confidence: 0.68, matchedSteps: [{ title: "Release" }], missingSteps: [], additionalSteps: [] }],
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
assert.strictEqual(normalized.advisory, true);
assert.strictEqual(normalized.assessmentStatus, "auto-classifiable");

const selected = view.normalize(result, { confirmedReferenceId: "diagram:basic",
  confirmedAt: "2026-09-02T15:00:00Z", status: "confirmed" });
assert.strictEqual(selected.referenceId, "diagram:basic");
assert.strictEqual(selected.name, "Basic Warehouse Outbound");
assert.strictEqual(selected.confirmed, true);

const container = { innerHTML: "", querySelector() { return null; } };
view.render(container, { result }, { detected: "Identifierad referensprocess",
  match: "matchning", matched: "Matchade", missing: "Möjligen saknade",
  additional: "Kundunika" });
assert(container.innerHTML.includes("Advanced Warehouse Outbound"));
assert(container.innerHTML.includes("91%"));
assert(container.innerHTML.includes("Customer Approval"));
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

const selectedContainer = { querySelector() { return { value: "diagram:basic",
  dataset: { referenceName: "Basic Warehouse Outbound" } }; } };
assert.deepStrictEqual(view.selectedReference(selectedContainer, normalized), {
  id: "diagram:basic", name: "Basic Warehouse Outbound" });

const empty = view.render(container, { result: {} }, { noMatchTitle: "Ingen säker matchning",
  noMatchText: "Klassificera senare." });
assert.strictEqual(empty.available, false);
assert(container.innerHTML.includes('role="status"'));

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "src/ui/dashboard.html"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "src/ui/dashboard.js"), "utf8");
const background = fs.readFileSync(path.join(root, "src/recorder/background.js"), "utf8");
assert(html.includes('id="openProcessAnalysis"'));
assert(html.includes('id="processAnalysisDialog"'));
assert(html.includes('src="process-analysis-view.js"'));
assert(dashboard.includes('type: "T9_MATCH_REFERENCE_PROCESS"'));
assert(dashboard.includes("reviewAutoSave.schedule()"));
assert(background.includes('case "T9_MATCH_REFERENCE_PROCESS"'));
console.log("Process Analysis view tests passed.");
