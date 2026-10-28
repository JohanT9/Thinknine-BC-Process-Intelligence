(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CaptureKeyboard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta", "AltGraph", "OS"]);
  // Clipboard, undo and select-all edit text; they are not commands of the page.
  const EDITING = new Set(["Ctrl+A", "Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+Y", "Ctrl+Z",
    "Ctrl+Shift+Z", "Meta+A", "Meta+C", "Meta+V", "Meta+X", "Meta+Z", "Meta+Shift+Z"]);
  const KEY_NAMES = { " ": "Space", Spacebar: "Space", Esc: "Escape", Del: "Delete",
    Control: "Ctrl", Ctrl: "Ctrl", Option: "Alt", Command: "Meta", Cmd: "Meta", Win: "Meta" };

  function keyName(key) {
    const text = String(key || "").trim();
    if (KEY_NAMES[text]) return KEY_NAMES[text];
    return text.length === 1 ? text.toUpperCase() : text;
  }

  function combo(parts) {
    const names = parts.map(keyName).filter(Boolean);
    const modifiers = ["Ctrl", "Alt", "Shift", "Meta"].filter(name => names.includes(name));
    const keys = names.filter(name => !["Ctrl", "Alt", "Shift", "Meta"].includes(name));
    return keys.length === 1 ? [...modifiers, keys[0]].join("+") : "";
  }

  // The shortcut a key press stands for, or "" when it types, edits or moves the caret.
  // Function keys always count; other keys only with Ctrl, Alt or Meta. Ctrl+Alt with a
  // character is AltGr typing on many keyboards (for example @ on a Nordic layout).
  function shortcutOf(event) {
    const key = String(event?.key || "");
    if (!key || MODIFIER_KEYS.has(key) || event.isComposing) return "";
    const functionKey = /^F(?:[1-9]|1[0-2])$/u.test(key);
    if (!functionKey && !event.ctrlKey && !event.altKey && !event.metaKey) return "";
    if (event.ctrlKey && event.altKey && key.length === 1) return "";
    const pressed = combo([event.ctrlKey && "Ctrl", event.altKey && "Alt",
      event.shiftKey && "Shift", event.metaKey && "Meta",
      key.length === 1 && event.code?.startsWith("Key") ? event.code.slice(3) : key]);
    return EDITING.has(pressed) ? "" : pressed;
  }

  // aria-keyshortcuts lists alternatives separated by spaces, keys joined by "+".
  function declaredShortcuts(value) {
    return String(value || "").split(/\s+/u).filter(Boolean)
      .map(item => combo(item.split("+")));
  }

  const NAMED_KEYS = /^(?:Delete|Del|Insert|Enter|Escape|Esc|Home|End|PageUp|PageDown|Tab|Space|Backspace|Arrow(?:Up|Down|Left|Right))$/iu;
  const MODIFIER_NAMES = /^(?:Ctrl|Control|Alt|Shift|Meta|Cmd|Command|Option)$/iu;

  // A tooltip or name that ends with the shortcut in parentheses, such as "Post... (F9)".
  // A caption such as "Balance (LCY)" is not one: the key must be a function key, or a
  // character or named key held with a modifier.
  function tooltipShortcut(text) {
    const match = /\(([^()]+)\)\s*$/u.exec(String(text || ""));
    if (!match) return "";
    const parts = match[1].split("+").map(part => part.trim());
    const key = parts.at(-1);
    const modifiers = parts.slice(0, -1);
    if (!modifiers.every(part => MODIFIER_NAMES.test(part))) return "";
    const functionKey = /^F(?:[1-9]|1[0-2])$/u.test(key);
    const heldKey = modifiers.length && (/^[\p{L}\p{N}]$/u.test(key) || NAMED_KEYS.test(key));
    return functionKey || heldKey ? combo(parts) : "";
  }

  function matches(element, shortcut) {
    if (!shortcut || !element?.getAttribute) return false;
    if (declaredShortcuts(element.getAttribute("aria-keyshortcuts")).includes(shortcut)) {
      return true;
    }
    return ["title", "aria-label", "aria-description"].some(name =>
      tooltipShortcut(element.getAttribute(name)) === shortcut);
  }

  return { declaredShortcuts, matches, shortcutOf, tooltipShortcut };
});
