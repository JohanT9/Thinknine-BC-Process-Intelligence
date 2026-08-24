(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TelemetryQueryDefinitions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.0.0";
  const MAX_WINDOW_MINUTES = 30;
  const DEFAULT_WINDOW_MINUTES = 5;
  const literal = value => `'${String(value || "").replace(/'/gu, "''")}'`;
  const utc = value => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new TypeError("A valid error timestamp is required.");
    return date.toISOString();
  };
  function windowFor(timestamp, minutes = DEFAULT_WINDOW_MINUTES, now = Date.now()) {
    const size = Number(minutes);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_WINDOW_MINUTES) {
      throw new RangeError(`Telemetry window must be 1-${MAX_WINDOW_MINUTES} minutes.`);
    }
    const center = new Date(utc(timestamp)).getTime();
    if (center > Number(now) + 60000) throw new RangeError("Telemetry window cannot be in the future.");
    return { originalTimestamp: String(timestamp), normalizedUtc: new Date(center).toISOString(),
      fromUtc: new Date(center - size * 60000).toISOString(),
      toUtc: new Date(center + size * 60000).toISOString(), minutes: size };
  }
  const baseProjection = `| project timestamp, itemId, eventName=name, message, severityLevel, duration,
      operation_Id, session_Id, user_Id, clientType=tostring(customDimensions.clientType),
      clientActivityId=tostring(customDimensions.clientActivityId),
      result=tostring(customDimensions.result), customDimensions`;
  function definitions(context, options = {}) {
    const window = windowFor(context.timestamp, options.windowMinutes, options.now);
    const time = `timestamp between (datetime(${window.fromUtc}) .. datetime(${window.toUtc}))`;
    const result = [];
    if (context.applicationInsightsSessionId) result.push({ queryId: "bc-session-context",
      queryVersion: VERSION, purpose: "Business Central traces and page views for the captured session",
      requiredEvidence: ["applicationInsightsSessionId", "timestamp"], correlationType: "exact-session",
      kql: `union traces, pageViews\n| where ${time}\n| where session_Id == ${literal(context.applicationInsightsSessionId)}\n${baseProjection}\n| order by timestamp asc\n| take 500`, window });
    if (context.clientActivityId) result.push({ queryId: "bc-client-activity",
      queryVersion: VERSION, purpose: "Business Central traces matching the captured client activity",
      requiredEvidence: ["clientActivityId", "timestamp"], correlationType: "exact-activity",
      kql: `traces\n| where ${time}\n| where tostring(customDimensions.clientActivityId) == ${literal(context.clientActivityId)}\n${baseProjection}\n| order by timestamp asc\n| take 250`, window });
    result.push({ queryId: "bc-error-window", queryVersion: VERSION,
      purpose: "Errors and warnings close to the captured error timestamp",
      requiredEvidence: ["timestamp"], correlationType: "time-window",
      kql: `traces\n| where ${time}\n| where severityLevel >= 2\n${baseProjection}\n| order by timestamp asc\n| take 250`, window });
    return result;
  }
  return { DEFAULT_WINDOW_MINUTES, MAX_WINDOW_MINUTES, VERSION, definitions,
    escapeKqlLiteral: literal, windowFor };
});
