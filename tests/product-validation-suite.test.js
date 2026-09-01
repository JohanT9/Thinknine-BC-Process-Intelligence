const assert = require("assert");
const suite = require("../scripts/product-validation-suite");

function entry(index) {
  return {
    fixtureId: `PILOT-${String(index + 1).padStart(2, "0")}`,
    date: "2026-09-01",
    testerAlias: "T01",
    browserVersion: "Edge-140",
    bcVersion: "27",
    coverage: index === 0 ? [...suite.REQUIRED_COVERAGE] : ["standard-bc"],
    counts: {
      expectedObservableInteractions: 10,
      capturedExpectedInteractions: 9,
      normalizedInteractionsSampled: 9,
      correctlyNormalizedInteractions: 8,
      stepGroupsSampled: 8,
      correctlyBoundedStepGroups: 8,
      generatedSteps: 8,
      stepsAcceptedWithoutTextEdit: 7,
      eligibleScreenshotSteps: 6,
      screenshotsAcceptedWithoutReplacement: 5,
      manualTextEdits: 1,
      manualScreenshotReplacements: 1,
      hiddenOperations: 0,
      mergeOperations: 0,
      splitOperations: 0,
      exportedDocuments: 1,
      wordPostExportCorrections: 0
    },
    defects: index === 0 ? [{ category: "capture", reference: "BUG-001" }] : []
  };
}

const dataset = { schemaVersion: "1.0.0",
  entries: Array.from({ length: 24 }, (_, index) => entry(index)) };
const before = JSON.stringify(dataset);
const report = suite.assertValid(dataset);
assert.strictEqual(report.valid, true);
assert.strictEqual(report.recordingCount, 24);
assert.deepStrictEqual(report.missingCoverage, []);
assert.deepStrictEqual(report.kpis.generatedStepAcceptance,
  { numerator: 168, denominator: 192, value: 0.875 });
assert.deepStrictEqual(report.kpis.captureCompleteness,
  { numerator: 216, denominator: 240, value: 0.9 });
assert.strictEqual(report.kpis.manualEditsPerTenSteps.value, 1.25);
assert.strictEqual(report.defectCounts.capture, 1);
assert(Object.isFrozen(report));
assert.strictEqual(JSON.stringify(dataset), before, "evaluation must be immutable");

const incomplete = suite.evaluate({ schemaVersion: "1.0.0",
  entries: dataset.entries.slice(0, 3).map(value => ({ ...value,
    coverage: ["standard-bc"] })) });
assert.strictEqual(incomplete.valid, false);
assert(incomplete.issues.some(value => value.code === "insufficient-recordings"));
assert(incomplete.issues.some(value => value.code === "missing-coverage-categories"));

const invalid = suite.evaluate({ schemaVersion: "1.0.0", entries: [{
  ...entry(0), companyName: "Must not be stored", notes: "free text is not allowed",
  counts: { ...entry(0).counts, capturedExpectedInteractions: 11 },
  defects: [{ category: "capture", reference: "contains spaces" }]
}] }, { minimumRecordings: 1, requiredCoverage: ["standard-bc"] });
assert(invalid.issues.some(value => value.code === "forbidden-customer-data"));
assert(invalid.issues.some(value => value.code === "unexpected-entry-fields"));
assert(invalid.issues.some(value => value.code === "count-exceeds-denominator"));
assert(invalid.issues.some(value => value.code === "unsafe-defect-reference"));

const zero = suite.evaluate({ schemaVersion: "1.0.0", entries: [{
  ...entry(0), counts: Object.fromEntries(suite.COUNT_FIELDS.map(field => [field, 0]))
}] }, { minimumRecordings: 1, requiredCoverage: ["standard-bc"] });
assert.strictEqual(zero.kpis.generatedStepAcceptance.value, null,
  "empty denominators must stay unknown instead of becoming a misleading zero");
console.log("Product pilot validation suite tests passed.");
