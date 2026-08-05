const assert = require("assert");
const edit = require("../src/review/review-edit");

let session = edit.createSession("task-1", "instruction", "Original");
session = edit.update(session, "Changed");
assert.deepStrictEqual(edit.result(session), {
  taskId: "task-1", field: "instruction", value: "Changed", changed: true
});
assert.strictEqual(edit.result(edit.createSession("a", "instruction", "A")).changed, false);
assert.strictEqual(edit.commandFromKey({ key: "Enter" }, false), "start");
assert.strictEqual(edit.commandFromKey({ key: "Enter", shiftKey: false }, true), "commit");
assert.strictEqual(edit.commandFromKey({ key: "Enter", shiftKey: true }, true), null);
assert.strictEqual(edit.commandFromKey({ key: "Escape" }, true), "cancel");

const listeners = {};
const removed = {};
const calls = [];
const container = {
  addEventListener(type, listener) { listeners[type] = listener; },
  removeEventListener(type, listener) { removed[type] = listener; }
};
const control = {
  dataset: { editField: "instruction" }, value: "A",
  closest(selector) {
    if (selector === "[data-review-task-id]") return card;
    if (selector === "[data-edit-field]") return this;
    return null;
  }
};
const card = {
  dataset: { reviewTaskId: "a" },
  closest(selector) {
    return selector === "[data-review-task-id]" ? this : null;
  },
  querySelector() { return control; }
};
const unbind = edit.bind(container, {
  start(details) { calls.push(["start", details.field]); },
  update(details) { calls.push(["update", details.value]); },
  commit() { calls.push(["commit"]); },
  cancel() { calls.push(["cancel"]); }
});

listeners.dblclick({ target: control });
assert.deepStrictEqual(calls.at(-1), ["start", "instruction"]);
let prevented = false;
control.dataset.editing = "true";
listeners.keydown({
  target: control, key: "Enter", shiftKey: false,
  preventDefault() { prevented = true; }
});
assert.strictEqual(prevented, true);
assert.deepStrictEqual(calls.at(-1), ["commit"]);
listeners.keydown({ target: control, key: "Escape", preventDefault() {} });
assert.deepStrictEqual(calls.at(-1), ["cancel"]);
control.value = "Draft";
listeners.input({ target: control });
assert.deepStrictEqual(calls.at(-1), ["update", "Draft"]);
listeners.focusout({ target: control });
assert.deepStrictEqual(calls.at(-1), ["commit"]);
delete control.dataset.editing;
listeners.keydown({ target: card, key: "Enter", preventDefault() {} });
assert.deepStrictEqual(calls.at(-1), ["start", "instruction"]);
unbind();
assert.strictEqual(removed.dblclick, listeners.dblclick);
assert.strictEqual(removed.keydown, listeners.keydown);
assert.strictEqual(removed.input, listeners.input);
assert.strictEqual(removed.focusout, listeners.focusout);

(async () => {
  let timerId = 0;
  const timers = new Map();
  const cleared = [];
  let saves = 0;
  const autoSave = edit.createAutoSave(async () => { saves += 1; }, {
    delay: 25,
    setTimer(callback, delay) {
      timerId += 1;
      timers.set(timerId, { callback, delay });
      return timerId;
    },
    clearTimer(id) {
      cleared.push(id);
      timers.delete(id);
    }
  });
  autoSave.schedule();
  autoSave.schedule();
  assert.deepStrictEqual(cleared, [1]);
  assert.strictEqual(timers.get(2).delay, 25);
  assert.strictEqual(autoSave.pending(), true);
  await timers.get(2).callback();
  assert.strictEqual(saves, 1);
  assert.strictEqual(autoSave.pending(), false);
  autoSave.schedule();
  await autoSave.flush();
  assert.strictEqual(saves, 2);
  assert.strictEqual(autoSave.pending(), false);
  console.log("Review editing behaviour tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
