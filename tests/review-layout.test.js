const assert = require("assert");
const layout = require("../src/review/review-layout");

let state = layout.create();
assert.strictEqual(layout.isCompact(state, "a"), false);
assert.strictEqual(layout.allAreCompact(state, ["a", "b"]), false);

state = layout.toggleTask(state, "a");
assert.strictEqual(layout.isCompact(state, "a"), true);
assert.strictEqual(layout.isCompact(state, "b"), false);
assert.strictEqual(layout.allAreCompact(state, ["a", "b"]), false);

state = layout.toggleAll(state, ["a", "b"]);
assert.strictEqual(layout.isCompact(state, "a"), true);
assert.strictEqual(layout.isCompact(state, "b"), true);
assert.deepStrictEqual(state.overrides, {});

function card(taskId) {
  const classes = new Set();
  const attributes = {};
  const button = {
    textContent: "",
    setAttribute(name, value) { attributes[name] = value; }
  };
  return {
    dataset: { reviewTaskId: taskId },
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      }
    },
    querySelector() { return button; },
    button,
    classes,
    attributes
  };
}

const cards = [card("a"), card("b")];
const list = { querySelectorAll() { return cards; } };
const globalAttributes = {};
const globalButton = {
  textContent: "",
  setAttribute(name, value) { globalAttributes[name] = value; }
};
layout.apply(list, globalButton, state);
assert.ok(cards.every(item => item.classes.has("compact")));
assert.ok(cards.every(item => item.button.textContent === "Expandera"));
assert.strictEqual(globalButton.textContent, "Expandera alla");
assert.strictEqual(globalAttributes["aria-pressed"], "true");

state = layout.toggleTask(state, "a");
layout.apply(list, globalButton, state);
assert.strictEqual(cards[0].button.textContent, "Komprimera");
assert.strictEqual(cards[1].button.textContent, "Expandera");
assert.strictEqual(globalButton.textContent, "Komprimera alla");
assert.strictEqual(globalAttributes["aria-pressed"], "false");

console.log("Review layout behaviour tests passed.");
