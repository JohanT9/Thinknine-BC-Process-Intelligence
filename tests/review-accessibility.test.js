const assert = require("assert");
const accessibility = require("../src/review/review-accessibility");

function element(hidden = false, hiddenAncestor = false, cssHidden = false) {
  return {
    focused: false,
    focus() { this.focused = true; },
    getAttribute(name) {
      return name === "aria-hidden" && hidden ? "true" : null;
    },
    closest(selector) {
      return selector === "[hidden]" && hiddenAncestor ? {} : null;
    },
    getClientRects() {
      return cssHidden ? [] : [{}];
    }
  };
}

const first = element();
const middle = element();
const last = element();
const hidden = element(true);
const insideHiddenSection = element(false, true);
const cssHidden = element(false, false, true);
const listeners = {};
const removed = {};
const dialog = {
  focused: false,
  querySelectorAll(selector) {
    assert.strictEqual(selector, accessibility.FOCUSABLE);
    return [first, hidden, insideHiddenSection, cssHidden, middle, last];
  },
  focus() { this.focused = true; },
  addEventListener(type, listener) { listeners[type] = listener; },
  removeEventListener(type, listener) { removed[type] = listener; }
};
assert.deepStrictEqual(accessibility.focusableElements(dialog), [first, middle, last]);

let prevented = false;
assert.strictEqual(accessibility.handleKeydown({
  key: "Tab", shiftKey: false, target: last, defaultPrevented: false,
  preventDefault() { prevented = true; }
}, dialog, () => {}), true);
assert.strictEqual(prevented, true);
assert.strictEqual(first.focused, true);

first.focused = false;
prevented = false;
accessibility.handleKeydown({
  key: "Tab", shiftKey: true, target: first, defaultPrevented: false,
  preventDefault() { prevented = true; }
}, dialog, () => {});
assert.strictEqual(prevented, true);
assert.strictEqual(last.focused, true);

let closed = false;
accessibility.handleKeydown({
  key: "Escape", defaultPrevented: false, preventDefault() {}
}, dialog, () => { closed = true; });
assert.strictEqual(closed, true);
closed = false;
accessibility.handleKeydown({
  key: "Escape", defaultPrevented: true, preventDefault() {}
}, dialog, () => { closed = true; });
assert.strictEqual(closed, false);

const unbind = accessibility.bindDialog(dialog, () => {});
assert.strictEqual(typeof listeners.keydown, "function");
unbind();
assert.strictEqual(removed.keydown, listeners.keydown);

console.log("Review accessibility behaviour tests passed.");
