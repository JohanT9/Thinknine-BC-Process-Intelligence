const assert = require("assert");
const merge = require("../src/review/review-merge");

const tasks = [
  {
    taskId: "a",
    taskType: "Open",
    instruction: "Öppna ordern.",
    originalInstruction: "Öppna.",
    userComment: "Kommentar A",
    screenshot: "a.png",
    sourceEventNos: [1, 2],
    pageCaption: "Order",
    confidenceScore: 95,
    approved: true
  },
  { taskId: "x", instruction: "Behåll detta steg." },
  {
    taskId: "b",
    taskType: "Post",
    instruction: "Bokför ordern.",
    originalInstruction: "Bokför.",
    userComment: "Kommentar B",
    screenshots: ["b.png", "a.png"],
    sourceEventNos: [2, 3],
    pageCaption: "Bokför",
    confidenceScore: 80,
    approved: false
  }
];

const result = merge.merge(tasks, ["b", "a"], {
  now: "2026-08-04T10:00:00.000Z",
  historyId: "history-1"
});
assert.deepStrictEqual(result.tasks.map(task => task.taskId), ["a", "x"]);
assert.strictEqual(result.mergedTask.instruction, "Öppna ordern.\n\nBokför ordern.");
assert.strictEqual(result.mergedTask.userComment, "Kommentar A\n\nKommentar B");
assert.deepStrictEqual(result.mergedTask.screenshots, ["a.png", "b.png"]);
assert.deepStrictEqual(result.mergedTask.sourceEventNos, [1, 2, 3]);
assert.deepStrictEqual(result.mergedTask.sourceTaskIds, ["a", "b"]);
assert.strictEqual(result.mergedTask.sourceMetadata.length, 2);
assert.strictEqual(result.mergedTask.confidenceScore, 80);
assert.strictEqual(result.mergedTask.approved, false);
assert.deepStrictEqual(result.historyEntry.sourceTasks.map(item => item.index), [0, 2]);
assert.strictEqual(result.historyEntry.historyId, "history-1");
assert.deepStrictEqual(tasks.map(task => task.taskId), ["a", "x", "b"]);

const unchanged = merge.merge(tasks, ["a"]);
assert.strictEqual(unchanged.mergedTask, null);
assert.deepStrictEqual(unchanged.tasks, tasks);

console.log("Review merge behaviour tests passed.");
