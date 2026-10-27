(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9IssueHttpTransport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create({ fetcher = (...args) => fetch(...args), timeoutMs = 30000 } = {}) {
    async function request(url, options = {}, metadata = {}) {
      try {
        return await fetcher(url, { ...options,
          signal: options.signal || AbortSignal.timeout(timeoutMs) });
      } catch (cause) {
        if (cause?.name !== "TimeoutError" && cause?.name !== "AbortError") throw cause;
        const service = String(metadata.service || "Issue destination");
        throw Object.assign(new Error(`${service} request timed out.`), {
          category: "timeout", uncertain: metadata.mayHaveCommitted === true, cause
        });
      }
    }
    return Object.freeze({ request });
  }
  return Object.freeze({ create });
});
