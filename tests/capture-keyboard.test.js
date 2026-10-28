const assert = require("assert");
const keyboard = require("../src/recorder/capture-keyboard");

// A key press is a shortcut only when it cannot be typing, editing or moving the caret.
const press = (key, modifiers = {}, code = "") => keyboard.shortcutOf({ key, code, ...modifiers });
assert.strictEqual(press("F9"), "F9");
assert.strictEqual(press("F9", { shiftKey: true }), "Shift+F9");
assert.strictEqual(press("Delete", { ctrlKey: true }), "Ctrl+Delete");
assert.strictEqual(press("q", { altKey: true }, "KeyQ"), "Alt+Q");
// The physical key names a letter shortcut whatever the keyboard layout produces.
assert.strictEqual(press("œ", { altKey: true }, "KeyQ"), "Alt+Q");
assert.strictEqual(press("n", { ctrlKey: true, shiftKey: true }, "KeyN"), "Ctrl+Shift+N");
for (const [key, modifiers, code] of [["a", {}, "KeyA"], ["Enter", {}], ["Delete", {}],
  ["ArrowDown", {}], ["Control", { ctrlKey: true }], ["Shift", { shiftKey: true }],
  ["c", { ctrlKey: true }, "KeyC"], ["v", { ctrlKey: true }, "KeyV"], ["z", { ctrlKey: true }, "KeyZ"],
  // AltGr typing on a Nordic layout reports Ctrl+Alt with a character.
  ["@", { ctrlKey: true, altKey: true }, "Digit2"]]) {
  assert.strictEqual(press(key, modifiers, code), "", `${key} is not a shortcut`);
}
assert.strictEqual(keyboard.shortcutOf({ key: "F9", isComposing: true }), "");

// Declared shortcuts use aria-keyshortcuts spelling; tooltips end with the shortcut.
assert.deepStrictEqual(keyboard.declaredShortcuts("Control+Delete Alt+q  F9"),
  ["Ctrl+Delete", "Alt+Q", "F9"]);
assert.strictEqual(keyboard.tooltipShortcut("Post... (F9)"), "F9");
assert.strictEqual(keyboard.tooltipShortcut("Search (Alt+Q)"), "Alt+Q");
assert.strictEqual(keyboard.tooltipShortcut("Bogfør (Shift+F9)"), "Shift+F9");
// A caption that only ends with parentheses is not a shortcut.
assert.strictEqual(keyboard.tooltipShortcut("Balance (LCY)"), "");
assert.strictEqual(keyboard.tooltipShortcut("Sales Order (2 of 5)"), "");
assert.strictEqual(keyboard.tooltipShortcut("Post"), "");

const element = attributes => ({ getAttribute: name => attributes[name] ?? null });
assert(keyboard.matches(element({ "aria-keyshortcuts": "Control+Delete" }), "Ctrl+Delete"));
assert(keyboard.matches(element({ title: "Post... (F9)" }), "F9"));
assert(keyboard.matches(element({ "aria-label": "Search (Alt+Q)" }), "Alt+Q"));
assert(!keyboard.matches(element({ title: "Post... (F9)" }), "Shift+F9"));
assert(!keyboard.matches(element({ title: "Balance (LCY)" }), "LCY"));
assert(!keyboard.matches(null, "F9"));

console.log("Capture keyboard tests passed.");
