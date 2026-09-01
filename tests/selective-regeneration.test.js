const assert = require("assert");
const reviewStudio = require("../src/review/review-studio");
const regeneration = require("../src/review/review-regeneration");

const session = { id: "recording-selective", name: "Selective" };
const review = reviewStudio.createReview(session, [
  { taskId: "customer", instruction: "Select customer.",
    screenshot: "customer-old.png", sourceEventIds: ["event-1"] },
  { taskId: "quantity", instruction: "Enter quantity.",
    screenshot: "quantity-old.png", sourceEventIds: ["event-2"] }
]);
reviewStudio.editTask(review, 0, {
  instruction: "Select the customer account.",
  userComment: "Consultant note"
}, { now: "2026-09-01T12:00:00.000Z" });
const untouchedBefore = JSON.stringify(review.tasks[1]);
const generatedUntouchedBefore = JSON.stringify(review.generatedTasks[1]);
const preview = regeneration.selectivePreview(review, session, [
  { taskId: "customer-next", instruction: "Choose customer.",
    screenshot: "customer-new.png", sourceEventIds: ["event-1"] },
  { taskId: "quantity-next", instruction: "Specify quantity.",
    screenshot: "quantity-new.png", sourceEventIds: ["event-2"] }
], ["customer"]);

assert.strictEqual(preview.scope, "selected-steps");
assert.strictEqual(preview.blocked, false);
assert.strictEqual(preview.previousStepCount, 1);
assert.strictEqual(preview.nextStepCount, 1);
assert.strictEqual(preview.changedStepCount, 0,
  "the consultant's wording must remain visible after regeneration");
assert.strictEqual(preview.generatedBaselineChangeCount, 1);
assert.strictEqual(preview.changeSet.generatedChanges[0].after.instruction,
  "Choose customer.");
assert.strictEqual(preview.screenshotChangeCount, 1);
assert.strictEqual(preview.preservedStepEditCount, 1);
assert.strictEqual(preview.replacements[0].task.taskId, "customer");
assert.strictEqual(preview.replacements[0].task.instruction,
  "Select the customer account.");
assert.strictEqual(preview.replacements[0].task.userComment, "Consultant note");
assert.strictEqual(preview.replacements[0].generatedTask.instruction,
  "Choose customer.");

const applied = regeneration.applySelective(review, preview, {
  now: "2026-09-01T12:05:00.000Z", commandHistoryId: "selective-1"
});
assert.strictEqual(applied.tasks.length, 2);
assert.strictEqual(applied.tasks[0].taskId, "customer");
assert.deepStrictEqual(applied.tasks[0].screenshots, ["customer-new.png"]);
assert.strictEqual(JSON.stringify(applied.tasks[1]), untouchedBefore,
  "unselected Review Steps must remain byte-for-byte equivalent");
assert.strictEqual(JSON.stringify(applied.generatedTasks[1]),
  generatedUntouchedBefore,
  "unselected generated Steps must remain byte-for-byte equivalent");
assert.strictEqual(applied.commandHistory.at(-1).type,
  "selective-regeneration");
reviewStudio.undo(applied);
assert.deepStrictEqual(applied.tasks[0].screenshots, ["customer-old.png"]);
assert.strictEqual(applied.generatedTasks[0].instruction, "Select customer.");
reviewStudio.redo(applied);
assert.deepStrictEqual(applied.tasks[0].screenshots, ["customer-new.png"]);
assert.strictEqual(applied.generatedTasks[0].instruction, "Choose customer.");

const stale = regeneration.selectivePreview(review, session, [
  { taskId: "customer-next", instruction: "Choose customer.",
    sourceEventIds: ["event-1"] }, review.generatedTasks[1]
], ["customer"]);
const changed = JSON.parse(JSON.stringify(review));
changed.notes = "Changed after preview";
assert.throws(() => regeneration.applySelective(changed, stale), error =>
  error.code === "STALE_REGENERATION_PREVIEW");

const structural = regeneration.selectivePreview(review, session, [{
  taskId: "combined", instruction: "Choose customer and quantity.",
  sourceEventIds: ["event-1", "event-2"]
}], ["customer"]);
assert.strictEqual(structural.blocked, true);
assert(structural.blockingReasons.includes("selection-structure-change"));

const approved = JSON.parse(JSON.stringify(review));
approved.tasks[0].approved = true;
const approvedPreview = regeneration.selectivePreview(approved, session, [
  { taskId: "customer-next", instruction: "Choose customer.",
    sourceEventIds: ["event-1"] }, approved.generatedTasks[1]
], ["customer"]);
assert(approvedPreview.blockingReasons.includes("selection-approved"));

console.log("Selective regeneration behaviour tests passed.");
