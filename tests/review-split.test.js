const assert = require("assert");
const split = require("../src/review/review-split");

const source = {
  taskId: "step",
  taskType: "Merged",
  instruction: "Öppna ordern. Bokför ordern.",
  screenshot: "one.png",
  screenshots: ["one.png", "two.png"],
  pageCaption: "Order",
  sourceEventNos: [1, 2, 3],
  sourceMetadata: [{ taskId: "a" }, { taskId: "b" }],
  confidenceScore: 80,
  approved: true
};
const tasks = [
  { taskId: "before", instruction: "Före" },
  source,
  { taskId: "after", instruction: "Efter" }
];
const splitAt = source.instruction.indexOf(" Bokför");
const result = split.split(tasks, "step", { splitAt }, {
  now: "2026-08-04T11:00:00.000Z",
  historyId: "split-history"
});
assert.deepStrictEqual(result.tasks.map(task => task.taskId), [
  "before", "step", "step-Split-2", "after"
]);
assert.deepStrictEqual(result.splitTasks.map(task => task.instruction), [
  "Öppna ordern.", "Bokför ordern."
]);
for (const task of result.splitTasks) {
  assert.deepStrictEqual(task.screenshots, ["one.png", "two.png"]);
  assert.deepStrictEqual(task.sourceEventNos, [1, 2, 3]);
  assert.deepStrictEqual(task.sourceMetadata, [{ taskId: "a" }, { taskId: "b" }]);
  assert.strictEqual(task.approved, false);
}
assert.strictEqual(result.historyEntry.sourceIndex, 1);
assert.deepStrictEqual(result.historyEntry.sourceTask, source);
assert.deepStrictEqual(result.historyEntry.createdTaskIds, ["step", "step-Split-2"]);
assert.strictEqual(result.historyEntry.historyId, "split-history");
assert.deepStrictEqual(tasks.map(task => task.taskId), ["before", "step", "after"]);

const suggested = split.split(tasks, "step", {
  suggestionSource: "ai",
  segments: [
    {
      text: "Kontrollera ordern",
      metadata: { semanticAction: "Validate", sourceEventNos: [999] }
    },
    { text: "Bokför ordern", metadata: { semanticAction: "Post" } },
    "Kontrollera resultatet"
  ]
});
assert.deepStrictEqual(suggested.splitTasks.map(task => task.instruction), [
  "Kontrollera ordern", "Bokför ordern", "Kontrollera resultatet"
]);
assert.strictEqual(suggested.splitTasks[0].semanticAction, "Validate");
assert.strictEqual(suggested.splitTasks[1].semanticAction, "Post");
assert.deepStrictEqual(suggested.splitTasks[0].sourceEventNos, [1, 2, 3]);
assert.ok(suggested.splitTasks.every(task => task.suggestionSource === "ai"));

assert.strictEqual(split.split(tasks, "step", { splitAt: 0 }).splitTasks.length, 0);
assert.strictEqual(
  split.split(tasks, "missing", { segments: ["A", "B"] }).splitTasks.length,
  0
);

const collision = split.split(
  [source, { taskId: "step-Split-2", instruction: "Existerar" }],
  "step",
  { segments: ["A", "B"] }
);
assert.strictEqual(collision.splitTasks[1].taskId, "step-Split-2-2");

console.log("Review split behaviour tests passed.");
