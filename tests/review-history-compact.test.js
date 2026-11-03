// History entries store the step order and only the steps a command changed. Full copies of
// every step in every entry made a review grow by megabytes per edit, which slowed opening,
// saving and closing the image editor. Undo and redo must still restore exactly.
const assert = require("assert");
const history = require("../src/review/review-history");
const studio = require("../src/review/review-studio");

const padding = "x".repeat(20000);
const tasks = Array.from({ length: 40 }, (_, index) => ({ taskId: `t${index + 1}`,
  stepId: `s${index + 1}`, instruction: `Välj **Steg ${index + 1}**.`, padding }));
const review = studio.createReview({ id: "compact", name: "Compact", settings: {} },
  JSON.parse(JSON.stringify(tasks)));
const states = [JSON.stringify(review.tasks)];
const size = () => JSON.stringify(review.commandHistory).length;

// An edit stores the edited step only; an annotation stores no step content.
studio.editTask(review, 2, { instruction: "Ange **5** i **Antal**." }, { now: "2099-01-01T00:00:01.000Z" });
states.push(JSON.stringify(review.tasks));
const edit = review.commandHistory.at(-1);
assert.strictEqual(edit.taskStorage, "task-delta");
assert.deepStrictEqual([edit.beforeTasks.map(task => task.taskId), edit.afterTasks.map(task => task.taskId)],
  [["t3"], ["t3"]]);
assert.strictEqual(edit.beforeTaskOrder.length, 40);
studio.setScreenshotFocus(review, "screenshots/1.png", { mode: "whole" });
assert.deepStrictEqual([review.commandHistory.at(-1).beforeTasks, review.commandHistory.at(-1).afterTasks], [[], []]);
studio.approveTask(review, 0, true);
states.push(JSON.stringify(review.tasks));
assert.ok(size() < 5 * padding.length, `three commands take ${size()} characters`);
// A move or delete renumbers the steps after it, which are stored; still far below full copies.
studio.move(review, 5, -2);
states.push(JSON.stringify(review.tasks));
studio.remove(review, 10);
states.push(JSON.stringify(review.tasks));
assert.ok(size() < 5 * 2 * 40 * padding.length / 4, `history is ${size()} characters`);

// Undo and redo through every entry restore the exact steps.
const taskStates = [states[4], states[3], states[2], states[1], states[1], states[0]];
for (const expected of taskStates.slice(1)) {
  assert.ok(studio.undo(review));
  assert.strictEqual(JSON.stringify(review.tasks), expected);
}
assert.strictEqual(studio.undo(review), null);
for (const expected of taskStates.slice(0, -1).reverse()) {
  assert.ok(studio.redo(review));
  assert.strictEqual(JSON.stringify(review.tasks), expected);
}

// Grouped edits keep the steps from before the group.
const grouped = { tasks: [{ taskId: "a", text: "A" }, { taskId: "b", text: "B" }] };
for (const [before, after] of [["A", "AB"], ["AB", "ABC"]]) {
  history.record(grouped, { historyId: after, type: "edit", groupKey: "edit:a", createdAt: after,
    beforeTasks: [{ taskId: "a", text: before }, { taskId: "b", text: "B" }],
    afterTasks: [{ taskId: "a", text: after }, { taskId: "b", text: "B" }] });
  grouped.tasks = [{ taskId: "a", text: after }, { taskId: "b", text: "B" }];
}
assert.strictEqual(grouped.commandHistory.length, 1);
assert.deepStrictEqual([grouped.commandHistory[0].beforeTasks, grouped.commandHistory[0].afterTasks],
  [[{ taskId: "a", text: "A" }], [{ taskId: "a", text: "ABC" }]]);
history.undo(grouped);
assert.deepStrictEqual(grouped.tasks, [{ taskId: "a", text: "A" }, { taskId: "b", text: "B" }]);

// Entries saved with full copies are converted when the next command is recorded, and undo
// through them restores the same steps as before.
const legacyTasks = [[{ taskId: "a", v: 1 }, { taskId: "b", v: 1 }], [{ taskId: "a", v: 2 }, { taskId: "b", v: 1 }],
  [{ taskId: "a", v: 2 }, { taskId: "b", v: 2 }]];
const legacy = { tasks: legacyTasks[2], historyIndex: 2, commandHistory: [
  { historyId: "1", type: "edit", beforeTasks: legacyTasks[0], afterTasks: legacyTasks[1] },
  { historyId: "2", type: "edit", beforeTasks: legacyTasks[1], afterTasks: legacyTasks[2] }] };
history.record(legacy, { historyId: "3", type: "edit", createdAt: "3",
  beforeTasks: legacyTasks[2], afterTasks: [{ taskId: "a", v: 3 }, { taskId: "b", v: 2 }] });
legacy.tasks = [{ taskId: "a", v: 3 }, { taskId: "b", v: 2 }];
assert.ok(legacy.commandHistory.every(entry => entry.taskStorage === "task-delta"));
assert.deepStrictEqual(legacy.commandHistory[0].afterTasks, [{ taskId: "a", v: 2 }]);
for (const expected of [legacyTasks[2], legacyTasks[1], legacyTasks[0]]) {
  history.undo(legacy);
  assert.deepStrictEqual(legacy.tasks, expected);
}
// A legacy entry whose unchanged steps are missing where undo would take them keeps its copies.
const drifted = { tasks: [{ taskId: "z" }], historyIndex: 1, commandHistory: [
  { historyId: "1", type: "edit", beforeTasks: [{ taskId: "a", v: 1 }, { taskId: "b" }],
    afterTasks: [{ taskId: "a", v: 2 }, { taskId: "b" }] }] };
history.compact(drifted);
assert.strictEqual(drifted.commandHistory[0].taskStorage, undefined);
assert.strictEqual(drifted.commandHistory[0].beforeTasks.length, 2);

// Steps without unique IDs keep full copies.
const unnamed = { tasks: [{ text: "A" }] };
history.record(unnamed, { historyId: "u", type: "edit", createdAt: "u",
  beforeTasks: [{ text: "A" }], afterTasks: [{ text: "B" }] });
assert.deepStrictEqual(unnamed.commandHistory[0].beforeTasks, [{ text: "A" }]);
unnamed.tasks = [{ text: "B" }];
history.undo(unnamed);
assert.deepStrictEqual(unnamed.tasks, [{ text: "A" }]);

console.log("Review history compaction tests passed.");
