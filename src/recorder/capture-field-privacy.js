(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CaptureFieldPrivacy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SENSITIVE_AUTOCOMPLETE = new Set([
    "current-password", "new-password", "cc-number", "cc-csc",
    "cc-exp", "cc-exp-month", "cc-exp-year", "one-time-code"
  ]);

  function marked(element, attribute) {
    if (!element?.hasAttribute?.(attribute)) return false;
    const value = String(element.getAttribute(attribute) || "").trim().toLowerCase();
    return value !== "false" && value !== "0";
  }

  function isSensitive(element) {
    const type = String(element?.getAttribute?.("type") || element?.type || "")
      .trim().toLowerCase();
    if (type === "password") return true;
    const autocomplete = String(element?.getAttribute?.("autocomplete") || "")
      .toLowerCase().split(/\s+/u);
    if (autocomplete.some(value => SENSITIVE_AUTOCOMPLETE.has(value))) return true;
    const visited = new Set();
    for (let current = element; current && !visited.has(current);) {
      visited.add(current);
      if (marked(current, "data-private") || marked(current, "data-sensitive")) {
        return true;
      }
      current = current.parentElement || current.getRootNode?.().host || null;
    }
    return false;
  }

  function mask(element, value) {
    return isSensitive(element) ? "[maskerat]" : value;
  }

  return Object.freeze({ isSensitive, mask });
});
