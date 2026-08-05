const assert = require("assert");
const studio = require("../src/review/review-studio");

function create(instructions = ["A", "B", "C"]) {
  return studio.createReview(
    { id: "session", name: "History" },
    instructions.map((instruction, index) => ({
      taskId: String.fromCharCode(97 + index),
      instruction
    }))
  );
}

const moved = create();
studio.move(moved, 1, -1);
assert.deepStrictEqual(moved.tasks.map(task => task.taskId), ["b", "a", "c"]);
studio.undo(moved);
assert.deepStrictEqual(moved.tasks.map(task => task.taskId), ["a", "b", "c"]);
studio.redo(moved);
assert.deepStrictEqual(moved.tasks.map(task => task.taskId), ["b", "a", "c"]);

const merged = create();
studio.merge(merged, ["a", "b"], { now: "2026-08-04T12:00:00.000Z" });
assert.deepStrictEqual(merged.tasks.map(task => task.taskId), ["a", "c"]);
studio.undo(merged);
assert.deepStrictEqual(merged.tasks.map(task => task.taskId), ["a", "b", "c"]);
studio.redo(merged);
assert.deepStrictEqual(merged.tasks.map(task => task.taskId), ["a", "c"]);

const split = create(["First. Second.", "Third."]);
studio.split(split, "a", { segments: ["First.", "Second."] }, {
  now: "2026-08-04T12:01:00.000Z"
});
assert.strictEqual(split.tasks.length, 3);
studio.undo(split);
assert.deepStrictEqual(split.tasks.map(task => task.instruction), ["First. Second.", "Third."]);
studio.redo(split);
assert.deepStrictEqual(split.tasks.map(task => task.instruction), ["First.", "Second.", "Third."]);

const removed = create();
studio.remove(removed, 1);
assert.deepStrictEqual(removed.tasks.map(task => task.taskId), ["a", "c"]);
studio.undo(removed);
assert.deepStrictEqual(removed.tasks.map(task => task.taskId), ["a", "b", "c"]);
studio.redo(removed);
assert.deepStrictEqual(removed.tasks.map(task => task.taskId), ["a", "c"]);

const bulkRemoved = create();
studio.removeTasks(bulkRemoved, ["a", "c"]);
assert.deepStrictEqual(bulkRemoved.tasks.map(task => task.taskId), ["b"]);
assert.strictEqual(bulkRemoved.commandHistory.length, 1);
studio.undo(bulkRemoved);
assert.deepStrictEqual(bulkRemoved.tasks.map(task => task.taskId), ["a", "b", "c"]);

const edited = create();
studio.editTask(edited, 0, { instruction: "AB" }, {
  groupKey: "edit:a:instruction"
});
studio.editTask(edited, 0, { instruction: "ABC" }, {
  groupKey: "edit:a:instruction"
});
assert.strictEqual(edited.commandHistory.length, 1);
studio.undo(edited);
assert.strictEqual(edited.tasks[0].instruction, "A");
studio.redo(edited);
assert.strictEqual(edited.tasks[0].instruction, "ABC");

const separateEdits = create();
studio.editTask(separateEdits, 0, { instruction: "First edit" });
studio.editTask(separateEdits, 0, { instruction: "Second edit" });
assert.strictEqual(separateEdits.commandHistory.length, 2);
studio.undo(separateEdits);
assert.strictEqual(separateEdits.tasks[0].instruction, "First edit");

console.log("Review command history behaviour tests passed.");
