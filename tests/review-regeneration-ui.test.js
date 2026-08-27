const assert = require("assert");
const review = require("../src/review/review-studio");
const regeneration = require("../src/review/review-regeneration");

const session = { id: "recording-1", name: "Manual price" };
const oldReview = review.createReview(session, [
  { taskId: "menu-actions", instruction: "VÃ¤lj Ã…tgÃ¤rder.",
    sourceEventIds: ["event-1"] },
  { taskId: "menu-function", instruction: "VÃ¤lj Funktion.",
    sourceEventIds: ["event-2"] },
  { taskId: "manual-price", instruction: "VÃ¤lj Manuellt pris.",
    sourceEventIds: ["event-3"] },
  { taskId: "manual-price-copy", instruction: "VÃ¤lj Manuellt pris.",
    sourceEventIds: ["event-4"] }
]);
oldReview.documentFields.expectedResult = "Priset har Ã¤ndrats.";

const freshTasks = [{ taskId: "manual-price-path",
  instruction: "VÃ¤lj Ã…tgÃ¤rder â†’ Funktion â†’ Manuellt pris.",
  sourceEventIds: ["event-1", "event-2", "event-3", "event-4"] }];
const preview = regeneration.preview(oldReview, session, freshTasks);
assert.strictEqual(preview.blocked, false);
assert.strictEqual(preview.previousStepCount, 4);
assert.strictEqual(preview.nextStepCount, 1);
assert.strictEqual(preview.consolidatedStepCount, 3);

const updated = regeneration.apply(oldReview, preview, {
  now: "2026-08-27T10:00:00.000Z"
});
assert.strictEqual(updated.tasks.length, 1);
assert.strictEqual(updated.tasks[0].taskId, "manual-price-path");
assert.deepStrictEqual(updated.tasks[0].sourceEventIds,
  ["event-1", "event-2", "event-3", "event-4"]);
assert.strictEqual(updated.documentFields.expectedResult, "Priset har Ã¤ndrats.");
assert.strictEqual(oldReview.tasks.length, 4, "Apply must not mutate input.");

const edited = review.createReview(session, oldReview.tasks);
edited.tasks[0].userComment = "BehÃ¥ll min kommentar";
const blocked = regeneration.preview(edited, session, freshTasks);
assert.strictEqual(blocked.blocked, true);
assert(blocked.blockingReasons.includes("step-edits"));
assert.throws(() => regeneration.apply(edited, blocked), /consultant-owned state/);

const empty = regeneration.preview(oldReview, session, []);
assert.strictEqual(empty.blocked, true,
  "A non-empty stored Review must never be replaced by an empty interpretation.");
assert(empty.blockingReasons.includes("empty-generated-result"));

console.log("Review regeneration UI adapter tests passed.");
