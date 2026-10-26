(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ExternalIssueUrl = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function safe(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && !url.username && !url.password
        ? url.href : "";
    } catch { return ""; }
  }
  return Object.freeze({ safe });
});
