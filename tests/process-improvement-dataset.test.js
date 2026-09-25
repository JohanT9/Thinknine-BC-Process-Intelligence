const assert = require("assert");
const dataset = require("../src/review/process-improvement-dataset");
const studio = require("../src/review/review-studio");

function correctedReview(id, code, instruction) {
  const review = studio.createReview({ id, name: `Private ${id}` }, [{
    taskId: `task:${id}`, instruction,
    processValidation: { status: "blocked", findingCount: 1, codes: [code] }
  }]);
  studio.editTask(review, 0, { instruction: `Corrected ${instruction}` }, {
    now: "2026-09-01T12:00:00.000Z", commandHistoryId: `history:${id}`
  });
  return review;
}

const fieldReview = correctedReview("customer-905",
  "BCPS-PROCESS-CONFLICT-FIELD-001", "Customer Feldts 905");
const repeatedFieldReview = correctedReview("customer-906",
  "BCPS-PROCESS-CONFLICT-FIELD-001", "Customer Contoso 906");
const screenshotReview = correctedReview("image-secret",
  "BCPS-PROCESS-CONFLICT-SCREENSHOT-001", "Private screenshot");
studio.undo(screenshotReview);
const ordinaryReview = studio.createReview({ id: "ordinary", name: "Private" },
  [{ taskId: "ordinary-task", instruction: "Original private content" }]);
studio.editTask(ordinaryReview, 0, { instruction: "Changed private content" }, {
  now: "2026-09-01T12:01:00.000Z", commandHistoryId: "ordinary-history"
});

const result = dataset.create([fieldReview, repeatedFieldReview,
  screenshotReview, ordinaryReview]);
assert.strictEqual(result.schemaVersion, 1);
assert.strictEqual(result.datasetVersion, "1.0.0");
assert.strictEqual(result.correctionCount, 3);
assert.strictEqual(result.engineAttributedCorrectionCount, 2);
assert.strictEqual(result.unattributedCorrectionCount, 1);
assert.deepStrictEqual(result.byProcessCode,
  { "BCPS-PROCESS-CONFLICT-FIELD-001": 2 });
assert.deepStrictEqual(result.prioritizedCodes,
  [{ code: "BCPS-PROCESS-CONFLICT-FIELD-001", corrections: 2 }]);
assert.strictEqual(result.contentIncluded, false);
assert.strictEqual(result.identityIncluded, false);
assert(Object.isFrozen(result));
for (const secret of ["Feldts", "Contoso", "905", "906", "customer",
  "image-secret", "ordinary", "Private"]) {
  assert(!JSON.stringify(result).includes(secret),
    `improvement dataset must exclude ${secret}`);
}
assert.deepStrictEqual(studio.processImprovementDataset([fieldReview]),
  dataset.create([fieldReview]));

console.log("Privacy-safe process improvement dataset tests passed.");
