(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RecoveringQueue = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Keep a serialized queue usable even when both a queued operation and its
  // best-effort error reporter fail. Return the original operation separately
  // so callers that need its result still observe the original failure.
  function recover(operation, reportError = () => {}) {
    return Promise.resolve(operation).catch(async error => {
      try {
        await reportError(error);
      } catch {}
    });
  }

  return { recover };
});
