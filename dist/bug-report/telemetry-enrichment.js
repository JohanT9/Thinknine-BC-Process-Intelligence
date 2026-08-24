(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TelemetryEnrichment = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => value == null ? "" : String(value);
  const STATUSES = ["not-configured", "connected", "unauthorized", "unavailable",
    "configuration-error", "query-failed", "partial", "complete", "no-matches"];
  const CATEGORY = new Map([[4, "error"], [3, "error"], [2, "warning"]]);
  function normalizeEvent(value = {}) {
    const timestamp = new Date(value.timestamp);
    const correlationReasons = [...new Set((value.correlationReasons || []).map(String))];
    return { ...clone(value), telemetryEventId: text(value.telemetryEventId),
      timestamp: Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : "",
      eventName: text(value.eventName), category: value.category ||
        CATEGORY.get(Number(value.severity)) || "other-context",
      severity: value.severity == null ? undefined : Number(value.severity),
      message: text(value.message), correlationReasons,
      provenance: { type: "external-telemetry", provider: "application-insights",
        ...clone(value.provenance || {}) }, dimensions: clone(value.dimensions || {}) };
  }
  function normalize(input = {}) {
    const value = clone(input);
    value.schemaVersion = 1;
    value.provider = "application-insights";
    value.status = STATUSES.includes(value.status) ? value.status : "query-failed";
    value.connectionContext = clone(value.connectionContext || {});
    value.correlationContext = clone(value.correlationContext || {});
    value.queries = (value.queries || []).map(item => ({ ...clone(item),
      rawRecords: (item.rawRecords || []).slice(0, 500) }));
    value.events = deduplicate((value.events || []).map(normalizeEvent));
    value.warnings = (value.warnings || []).map(item => ({ ...clone(item) }));
    return value;
  }
  function deduplicate(events) {
    const result = new Map();
    events.forEach(event => {
      const key = event.telemetryEventId || "";
      if (!key || !result.has(key)) result.set(key || `anonymous:${result.size}`, event);
      else result.set(key, { ...result.get(key), correlationReasons: [...new Set([
        ...result.get(key).correlationReasons, ...event.correlationReasons])] });
    });
    return [...result.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  function statusFor(queries) {
    const success = queries.filter(item => item.status === "succeeded").length;
    if (success === queries.length) return "complete";
    if (success) return "partial";
    return "query-failed";
  }
  function attach(report, errorEvidenceId, enrichment, updatedAt) {
    const result = clone(report);
    result.enrichment = result.enrichment || { telemetry: null, analysis: null };
    const current = result.enrichment.telemetry?.byErrorEvidenceId || {};
    result.enrichment.telemetry = { schemaVersion: 1,
      byErrorEvidenceId: { ...current, [String(errorEvidenceId)]: normalize(enrichment) } };
    result.updatedAt = updatedAt || result.updatedAt;
    return result;
  }
  return { STATUSES, attach, deduplicate, normalize, normalizeEvent, statusFor };
});
