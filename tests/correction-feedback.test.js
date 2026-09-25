const assert = require("assert");
const feedback = require("../src/review/correction-feedback");
const studio = require("../src/review/review-studio");

const before = [{ taskId: "customer-Feldts-905", instruction: "Select 905.",
  screenshots: ["secret-image.png"] }];
const after = [{ ...before[0], instruction: "Select customer 905.",
  stepOverride: { screenshotOverride: {
    selectedScreenshotAssetId: "secret-new-image.png" } } }];
const entry = feedback.create("edit", before, after);
assert.deepStrictEqual(entry.affectedFields, ["instruction", "screenshot"]);
assert.strictEqual(entry.affectedStepCount, 1);
assert.strictEqual(entry.contentIncluded, false);
assert.strictEqual(entry.engineAttributed, false);
assert.deepStrictEqual(entry.processFindingCodes, []);
const serialized = JSON.stringify(entry);
for (const secret of ["Feldts", "905", "secret-image", "secret-new-image"]) {
  assert(!serialized.includes(secret), `feedback must exclude ${secret}`);
}
assert.strictEqual(feedback.create("approve", before, after), null,
  "approval is not a correction signal");
assert(feedback.create("step-visibility", before,
  [{ ...before[0], deleted: true }]).affectedFields.includes("visibility"));

const review = studio.createReview({ id: "session-secret", name: "Secret" },
  [{ taskId: "step-secret", instruction: "Original secret" }]);
studio.editTask(review, 0, { instruction: "Changed secret" }, {
  now: "2026-09-01T10:00:00.000Z", commandHistoryId: "edit-secret"
});
const stored = review.commandHistory[0].metadata.correctionFeedback;
assert.strictEqual(stored.scope, "local-review");
assert.deepStrictEqual(stored.affectedFields, ["instruction"]);
assert(!JSON.stringify(stored).includes("secret"));
assert.deepStrictEqual(studio.correctionFeedbackSummary(review), {
  version: "1.1.0", scope: "local-review", contentIncluded: false,
  correctionCount: 1, engineAttributedCorrectionCount: 0,
  byField: { instruction: 1 }, byProcessCode: {}
});
studio.undo(review);
assert.strictEqual(studio.correctionFeedbackSummary(review).correctionCount, 0,
  "undone corrections must not count as active feedback");
studio.redo(review);
assert.strictEqual(studio.correctionFeedbackSummary(review).correctionCount, 1);

const grouped = studio.createReview({ id: "group", name: "Group" },
  [{ taskId: "step", instruction: "Original" }]);
studio.editTask(grouped, 0, { instruction: "Changed" }, {
  now: "2026-09-01T11:00:00.000Z", groupKey: "edit:step"
});
studio.editTask(grouped, 0, { userComment: "Private comment" }, {
  now: "2026-09-01T11:00:01.000Z", groupKey: "edit:step"
});
assert.deepStrictEqual(
  grouped.commandHistory[0].metadata.correctionFeedback.affectedFields,
  ["instruction", "userComment"]
);
assert(!JSON.stringify(grouped.commandHistory[0].metadata.correctionFeedback)
  .includes("Private"));

const flaggedReview = studio.createReview({ id: "flagged", name: "Flagged" }, [{
  taskId: "flagged-step", instruction: "Select private customer 905.",
  processValidation: { status: "blocked", findingCount: 2,
    codes: ["BCPS-PROCESS-CONFLICT-FIELD-001",
      "BCPS-PROCESS-CONFLICT-INSTRUCTION-001"] }
}]);
studio.editTask(flaggedReview, 0, { instruction: "Corrected private content." }, {
  now: "2026-09-01T12:00:00.000Z", commandHistoryId: "engine-correction"
});
const attributed = flaggedReview.commandHistory[0].metadata.correctionFeedback;
assert.strictEqual(attributed.engineAttributed, true);
assert.deepStrictEqual(attributed.processFindingCodes, [
  "BCPS-PROCESS-CONFLICT-FIELD-001",
  "BCPS-PROCESS-CONFLICT-INSTRUCTION-001"
]);
assert(!JSON.stringify(attributed).includes("private"));
assert.deepStrictEqual(studio.correctionFeedbackSummary(flaggedReview), {
  version: "1.1.0", scope: "local-review", contentIncluded: false,
  correctionCount: 1, engineAttributedCorrectionCount: 1,
  byField: { instruction: 1 }, byProcessCode: {
    "BCPS-PROCESS-CONFLICT-FIELD-001": 1,
    "BCPS-PROCESS-CONFLICT-INSTRUCTION-001": 1
  }
});

const dashboard = require("fs").readFileSync(
  require("path").join(__dirname, "../src/ui/dashboard.js"), "utf8"
);
const html = require("fs").readFileSync(
  require("path").join(__dirname, "../src/ui/dashboard.html"), "utf8"
);
assert(html.includes('data-review-stat="corrections"'));
assert(dashboard.includes("correctionFeedbackSummary(activeReview)"));

console.log("Privacy-safe correction feedback tests passed.");
