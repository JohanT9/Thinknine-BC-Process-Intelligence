const assert = require("assert");
const toolbar = require("../src/review/review-toolbar");

const empty = toolbar.derive({ taskIds: [], selection: {} });
assert.ok(toolbar.COMMANDS.every(command => empty[command] === false));

const middle = toolbar.derive({
  taskIds: ["a", "b", "c"],
  selection: { selectedIds: ["b"] },
  canUndo: true,
  canRedo: false,
  canExport: true
});
assert.deepStrictEqual(middle, {
  undo: true,
  redo: false,
  merge: false,
  split: true,
  "move-up": true,
  "move-down": true,
  export: true
});

const firstPair = toolbar.derive({
  taskIds: ["a", "b", "c"],
  selection: { selectedIds: ["a", "b"] },
  canRedo: true,
  canExport: true
});
assert.strictEqual(firstPair.merge, true);
assert.strictEqual(firstPair.split, false);
assert.strictEqual(firstPair["move-up"], false);
assert.strictEqual(firstPair["move-down"], true);

const lastPair = toolbar.derive({
  taskIds: ["a", "b", "c"],
  selection: { selectedIds: ["b", "c"] },
  canExport: true
});
assert.strictEqual(lastPair["move-up"], true);
assert.strictEqual(lastPair["move-down"], false);

const buttons = new Map(toolbar.COMMANDS.map(command => [command, {
  disabled: false,
  dataset: { reviewCommand: command },
  focus() { this.focused = true; }
}]));
const listeners = {};
const removed = {};
const container = {
  querySelector(selector) {
    return buttons.get(selector.match(/"(.+)"/)[1]);
  },
  querySelectorAll() {
    return [...buttons.values()].filter(button => !button.disabled);
  },
  contains(button) { return buttons.has(button.dataset.reviewCommand); },
  addEventListener(type, listener) { listeners[type] = listener; },
  removeEventListener(type, listener) { removed[type] = listener; }
};
toolbar.apply(container, middle);
assert.strictEqual(buttons.get("undo").disabled, false);
assert.strictEqual(buttons.get("redo").disabled, true);
assert.strictEqual(buttons.get("merge").disabled, true);

const executed = [];
const unbind = toolbar.bind(container, command => executed.push(command));
const undoButton = buttons.get("undo");
undoButton.closest = () => undoButton;
listeners.click({ target: undoButton });
assert.deepStrictEqual(executed, ["undo"]);
const disabledButton = buttons.get("redo");
disabledButton.closest = () => disabledButton;
listeners.click({ target: disabledButton });
assert.deepStrictEqual(executed, ["undo"]);
let arrowPrevented = false;
listeners.keydown({
  target: undoButton,
  key: "ArrowRight",
  preventDefault() { arrowPrevented = true; }
});
assert.strictEqual(arrowPrevented, true);
assert.strictEqual(buttons.get("split").focused, true);
const summary = { focused: false, focus() { this.focused = true; } };
const disclosure = {
  open: true,
  querySelector(selector) {
    assert.strictEqual(selector, "summary");
    return summary;
  }
};
let escapePrevented = false;
listeners.keydown({
  target: { closest(selector) {
    return selector === "details[open]" ? disclosure : null;
  } },
  key: "Escape",
  preventDefault() { escapePrevented = true; }
});
assert.strictEqual(escapePrevented, true);
assert.strictEqual(disclosure.open, false);
assert.strictEqual(summary.focused, true);
unbind();
assert.strictEqual(removed.click, listeners.click);
assert.strictEqual(removed.keydown, listeners.keydown);

console.log("Review toolbar behaviour tests passed.");
