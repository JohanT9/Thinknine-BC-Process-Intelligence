(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AiEvidencePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.0.0";
  const DEFAULTS = Object.freeze({ includeHumanNotes: false,
    includeTelemetry: false, includeTelemetryMessages: false,
    includeEnvironment: false, includeRawCallStackFragments: false,
    includeScreenshots: false });
  function policy(overrides = {}) {
    return { ...DEFAULTS, ...Object.fromEntries(Object.entries(overrides)
      .filter(([key]) => Object.hasOwn(DEFAULTS, key)).map(([key, value]) =>
        [key, Boolean(value)])), version: VERSION };
  }
  function redact(value) {
    return String(value || "").replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu,
      "[redacted-email]").replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/giu,
      "[redacted-guid]").replace(/(https?:\/\/[^\s?]+)\?\S+/giu, "$1?[redacted-query]");
  }
  function disclosure(selected = {}) {
    const value = policy(selected);
    return { sent: ["visible reproduction wording", "expected and actual result",
      "redacted exact BC error", "structured AL frames and explicit app ownership",
      ...(value.includeTelemetry ? ["filtered normalized telemetry events"] : []),
      ...(value.includeHumanNotes ? ["human notes"] : []),
      ...(value.includeEnvironment ? ["non-identifier environment metadata"] : [])],
    excluded: ["raw event stream", "screenshots", "raw diagnostics",
      "tenant/company/user/session identifiers", "telemetry raw records",
      ...(!value.includeTelemetry ? ["telemetry events"] : []),
      ...(!value.includeHumanNotes ? ["human notes"] : [])] };
  }
  return { DEFAULTS, VERSION, disclosure, policy, redact };
});
