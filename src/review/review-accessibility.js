(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAccessibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FOCUSABLE = [
    "button:not(:disabled)",
    "input:not(:disabled)",
    "textarea:not(:disabled)",
    "select:not(:disabled)",
    "a[href]",
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");

  function focusableElements(dialog) {
    return [...dialog.querySelectorAll(FOCUSABLE)].filter(element =>
      element.getAttribute?.("aria-hidden") !== "true"
    );
  }

  function handleKeydown(event, dialog, close) {
    if (event.defaultPrevented) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return true;
    }
    if (event.key !== "Tab") return false;
    const focusable = focusableElements(dialog);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return true;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  function bindDialog(dialog, close) {
    const listener = event => handleKeydown(event, dialog, close);
    dialog.addEventListener("keydown", listener);
    return () => dialog.removeEventListener("keydown", listener);
  }

  return { FOCUSABLE, bindDialog, focusableElements, handleKeydown };
});
