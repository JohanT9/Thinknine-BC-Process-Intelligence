const assert = require("assert");
const selection = require("../src/review/review-selection");

const ids = ["a", "b", "c", "d"];
let state = selection.create();
assert.deepStrictEqual(state, {
  selectedIds: [], activeId: null, anchorId: null
});

state = selection.reduce(state, { type: "select", id: "b" }, ids);
assert.deepStrictEqual(state.selectedIds, ["b"]);
assert.strictEqual(state.activeId, "b");

state = selection.reduce(
  state,
  { type: "select", id: "d", additive: true },
  ids
);
assert.deepStrictEqual(state.selectedIds, ["b", "d"]);

state = selection.reduce(
  state,
  { type: "select", id: "a", additive: true },
  ids
);
assert.deepStrictEqual(state.selectedIds, ["a", "b", "d"]);
state = selection.reduce(state, { type: "select", id: "d" }, ids);

state = selection.reduce(
  state,
  { type: "select", id: "b", additive: true },
  ids
);
assert.deepStrictEqual(state.selectedIds, ["b", "d"]);

state = selection.reduce(state, { type: "select", id: "b" }, ids);
state = selection.reduce(
  state,
  { type: "select", id: "d", range: true },
  ids
);
assert.deepStrictEqual(state.selectedIds, ["b", "c", "d"]);
assert.strictEqual(state.anchorId, "b");

state = selection.reduce(
  state,
  { type: "move", target: "previous", extend: true },
  ids
);
assert.deepStrictEqual(state.selectedIds, ["b", "c"]);
assert.strictEqual(state.activeId, "c");

state = selection.reduce(state, { type: "move", target: "first" }, ids);
assert.deepStrictEqual(state.selectedIds, ["a"]);
state = selection.reduce(state, { type: "move", target: "previous" }, ids);
assert.strictEqual(state.activeId, "a");
state = selection.reduce(state, { type: "move", target: "last" }, ids);
assert.strictEqual(state.activeId, "d");

state = selection.reduce(state, { type: "select-all" }, ids);
assert.deepStrictEqual(state.selectedIds, ids);
state = selection.reconcile(state, ["a", "c"]);
assert.deepStrictEqual(state.selectedIds, ["a", "c"]);
assert.strictEqual(state.activeId, null);

assert.deepStrictEqual(
  selection.commandFromKey({ key: "ArrowDown", shiftKey: true }),
  { type: "move", target: "next", extend: true }
);
assert.deepStrictEqual(
  selection.commandFromKey({ key: "a", ctrlKey: true }),
  { type: "select-all" }
);
assert.strictEqual(selection.commandFromKey({ key: "Escape" }), null);

const listeners = {};
const removedListeners = {};
const dispatched = [];
const moved = [];
const container = {
  addEventListener(type, listener) {
    listeners[type] = listener;
  },
  removeEventListener(type, listener) {
    removedListeners[type] = listener;
  }
};
const card = {
  dataset: { reviewTaskId: "c" },
  closest(selector) {
    return selector === "[data-review-task-id]" ? this : null;
  }
};
const unbind = selection.bind(container, {
  dispatch(command, focus) {
    dispatched.push({ command, focus });
  },
  move(delta, taskId) {
    moved.push({ delta, taskId });
  }
});
listeners.click({ target: card, ctrlKey: true, metaKey: false, shiftKey: false });
assert.deepStrictEqual(dispatched.at(-1), {
  command: {
    type: "select",
    id: "c",
    additive: true,
    range: false
  },
  focus: true
});

const inputTarget = {
  closest(selector) {
    return selector === "[data-review-task-id]" ? card : this;
  }
};
listeners.click({
  target: inputTarget,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false
});
assert.strictEqual(dispatched.at(-1).focus, false);

let prevented = false;
listeners.keydown({
  target: card,
  key: "ArrowUp",
  shiftKey: false,
  preventDefault() {
    prevented = true;
  }
});
assert.strictEqual(prevented, true);
assert.deepStrictEqual(dispatched.at(-1), {
  command: { type: "move", target: "previous", extend: false, id: "c" },
  focus: true
});
listeners.keydown({
  target: card,
  key: "ArrowDown",
  altKey: true,
  preventDefault() {}
});
assert.deepStrictEqual(moved, [{ delta: 1, taskId: "c" }]);
const dragHandle = {
  closest(selector) {
    if (selector === "[data-review-task-id]") return card;
    if (selector === "[data-drag-handle]") return this;
    return null;
  }
};
listeners.keydown({
  target: dragHandle,
  key: "ArrowUp",
  altKey: true,
  preventDefault() {}
});
assert.deepStrictEqual(moved.at(-1), { delta: -1, taskId: "c" });
unbind();
assert.strictEqual(removedListeners.click, listeners.click);
assert.strictEqual(removedListeners.keydown, listeners.keydown);

console.log("Review selection behaviour tests passed.");
