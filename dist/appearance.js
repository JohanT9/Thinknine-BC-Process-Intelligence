// Applies the interface appearance before the page is painted: dark (default), light or system.
// The choice is stored per browser profile and shared by every extension page.
(function (root) {
  "use strict";
  const KEY = "t9.appearance";
  const CHOICES = Object.freeze(["dark", "system", "light"]);
  function read() {
    try {
      const value = root.localStorage?.getItem(KEY);
      return CHOICES.includes(value) ? value : "dark";
    } catch {
      return "dark";
    }
  }
  function apply(choice) {
    const element = root.document?.documentElement;
    if (!element) return;
    if (choice === "system") element.removeAttribute("data-theme");
    else element.setAttribute("data-theme", choice === "light" ? "light" : "dark");
  }
  function set(choice) {
    const value = CHOICES.includes(choice) ? choice : "dark";
    try { root.localStorage?.setItem(KEY, value); } catch { /* Applies to this page only. */ }
    apply(value);
    return value;
  }
  apply(read());
  root.addEventListener?.("storage", event => {
    if (event.key === KEY) apply(CHOICES.includes(event.newValue) ? event.newValue : "dark");
  });
  root.T9Appearance = Object.freeze({ KEY, CHOICES, read, set, apply });
})(globalThis);
