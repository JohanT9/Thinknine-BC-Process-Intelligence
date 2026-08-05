const assert = require("assert");
const history = require("../src/review/review-history");

const review = { tasks: [{ taskId: "a", instruction: "A" }] };
history.ensure(review);
assert.strictEqual(history.canUndo(review), false);
assert.strictEqual(history.canRedo(review), false);

history.record(review, {
  historyId: "edit-1",
  type: "edit",
  groupKey: "edit:a:instruction",
  createdAt: "2026-08-04T10:00:00.000Z",
  beforeTasks: [{ taskId: "a", instruction: "A" }],
  afterTasks: [{ taskId: "a", instruction: "AB" }],
  beforeSelection: { selectedIds: ["a"], activeId: "a", anchorId: "a" },
  afterSelection: { selectedIds: ["a"], activeId: "a", anchorId: "a" }
});
history.record(review, {
  historyId: "edit-2",
  type: "edit",
  groupKey: "edit:a:instruction",
  createdAt: "2026-08-04T10:00:01.000Z",
  beforeTasks: [{ taskId: "a", instruction: "AB" }],
  afterTasks: [{ taskId: "a", instruction: "ABC" }]
});
assert.strictEqual(review.commandHistory.length, 1);
assert.strictEqual(review.commandHistory[0].beforeTasks[0].instruction, "A");
assert.strictEqual(review.commandHistory[0].afterTasks[0].instruction, "ABC");

review.tasks = [{ taskId: "a", instruction: "ABC" }];
const undone = history.undo(review);
assert.strictEqual(review.tasks[0].instruction, "A");
assert.strictEqual(undone.selection.activeId, "a");
assert.strictEqual(history.canRedo(review), true);

history.redo(review);
assert.strictEqual(review.tasks[0].instruction, "ABC");

history.undo(review);
history.record(review, {
  historyId: "delete-1",
  type: "delete",
  createdAt: "2026-08-04T10:00:02.000Z",
  beforeTasks: [{ taskId: "a", instruction: "A" }],
  afterTasks: []
});
assert.strictEqual(history.canRedo(review), false);
assert.strictEqual(review.commandHistory.length, 1);
assert.strictEqual(review.commandHistory[0].type, "delete");

const noOpLength = review.commandHistory.length;
history.record(review, {
  historyId: "move-no-op",
  type: "move",
  createdAt: "2026-08-04T10:00:03.000Z",
  beforeTasks: [],
  afterTasks: [],
  beforeStatus: "in-progress",
  afterStatus: "in-progress"
});
assert.strictEqual(review.commandHistory.length, noOpLength);
assert.strictEqual(history.directionFromKey({ ctrlKey: true, metaKey: false, key: "z", shiftKey: false }), "undo");
assert.strictEqual(history.directionFromKey({ ctrlKey: true, metaKey: false, key: "y", shiftKey: false }), "redo");
assert.strictEqual(history.directionFromKey({ ctrlKey: true, metaKey: false, key: "Z", shiftKey: true }), "redo");
assert.strictEqual(history.directionFromKey({ ctrlKey: false, metaKey: false, key: "z", shiftKey: false }), null);

console.log("Review history behaviour tests passed.");
