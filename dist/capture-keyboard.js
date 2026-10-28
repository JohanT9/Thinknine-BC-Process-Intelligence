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
  // Keyed in lower case. The localized modifier names are the web client's own
  // (Keyboard_ControlKey, Keyboard_ShiftKey, Keyboard_CommandKey in its language resources);
  // Entf, Suppr and Supr are the German, French and Spanish labels of Delete.
  const KEY_NAMES = { " ": "Space", spacebar: "Space", esc: "Escape", "échap": "Escape",
    echap: "Escape", del: "Delete", entf: "Delete", suppr: "Delete", supr: "Delete",
    ins: "Insert", einfg: "Insert", control: "Ctrl", ctrl: "Ctrl", strg: "Ctrl",
    alt: "Alt", option: "Alt", shift: "Shift", skift: "Shift", umschalt: "Shift", maj: "Shift",
    "mayúsculas": "Shift", vaihto: "Shift", meta: "Meta", command: "Meta", cmd: "Meta",
    kommando: "Meta", befehl: "Meta", komento: "Meta", commande: "Meta", comando: "Meta",
    win: "Meta" };

  function keyName(key) {
    const text = String(key || "").trim();
    const known = KEY_NAMES[text.toLowerCase()];
    if (known) return known;
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

  const NAMED_KEYS = /^(?:Delete|Insert|Enter|Escape|Home|End|PageUp|PageDown|Tab|Space|Backspace|Arrow(?:Up|Down|Left|Right))$/u;
  const isModifierName = part => ["Ctrl", "Alt", "Shift", "Meta"].includes(keyName(part));

  // A tooltip or name that ends with the shortcut in parentheses, such as "Post... (F9)".
  // A caption such as "Balance (LCY)" is not one: the key must be a function key, or a
  // character or named key held with a modifier.
  function tooltipShortcut(text) {
    const match = /\(([^()]+)\)\s*$/u.exec(String(text || ""));
    if (!match) return "";
    const parts = match[1].split("+").map(part => part.trim());
    const key = parts.at(-1);
    const modifiers = parts.slice(0, -1);
    if (!modifiers.every(isModifierName)) return "";
    const functionKey = /^F(?:[1-9]|1[0-2])$/u.test(key);
    const heldKey = modifiers.length && (/^[\p{L}\p{N}]$/u.test(key) ||
      NAMED_KEYS.test(keyName(key)));
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
