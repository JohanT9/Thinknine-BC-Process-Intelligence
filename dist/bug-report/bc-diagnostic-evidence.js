(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BcDiagnosticEvidence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const cleanLabel = value => String(value || "").normalize("NFKC")
    .toLocaleLowerCase().replace(/[.:：]+$/u, "").replace(/\s+/gu, " ").trim();
  const LABELS = Object.freeze({
    timestamp: ["timestamp", "date and time", "datum och tid", "dato og klokkeslæt"],
    internalSessionId: ["internal session id", "internt sessions-id", "internt sessions-id"],
    applicationInsightsSessionId: ["application insights session id", "application insights-sessions-id"],
    clientActivityId: ["client activity id", "klientaktivitets-id", "klientaktivitets-id"],
    userTelemetryId: ["user telemetry id", "användartelemetri-id", "brugertelemetri-id"],
    serverInstanceId: ["server instance id", "serverinstans-id"],
    environment: ["environment", "miljö", "miljø"],
    company: ["company", "företag", "virksomhed"],
    rawCallStack: ["al call stack", "al-anropsstack", "al-kaldestak"]
  });
  const LOOKUP = new Map(Object.entries(LABELS).flatMap(([field, labels]) =>
    labels.map(label => [cleanLabel(label), field])));

  function parseRawDiagnostics(rawDiagnostics) {
    const raw = typeof rawDiagnostics === "string" ? rawDiagnostics : "";
    const structured = {};
    const unknownFields = [];
    const lines = raw.split(/\r?\n/u);
    let callStackStart = -1;
    lines.forEach((line, index) => {
      const match = line.match(/^\s*([^:=]{2,80})\s*[:=]\s*(.*)$/u);
      if (!match) return;
      const field = LOOKUP.get(cleanLabel(match[1]));
      if (!field) {
        unknownFields.push({ label: match[1].trim(), value: match[2] });
        return;
      }
      if (field === "rawCallStack") callStackStart = index;
      else if (match[2] !== "") structured[field] = match[2];
    });
    const rawCallStack = callStackStart >= 0
      ? lines.slice(callStackStart).join("\n").replace(/^.*?[:=]\s*/u, "") : "";
    return { structuredDiagnostics: structured, unknownFields,
      rawCallStack, callStackAvailable: Boolean(rawCallStack.trim()) };
  }

  function normalize(input = {}) {
    const result = clone(input);
    if (!result.errorEvidenceId || !result.recordingId || !result.capturedAt) {
      throw new TypeError("BC error evidence identity, recording and capture time are required.");
    }
    result.schemaVersion = 1;
    result.rawMessage = typeof result.rawMessage === "string" ? result.rawMessage : "";
    result.displayMessage = result.rawMessage.replace(/\s+/gu, " ").trim();
    result.rawDiagnostics = typeof result.rawDiagnostics === "string"
      ? result.rawDiagnostics : "";
    const parsed = parseRawDiagnostics(result.rawDiagnostics);
    result.structuredDiagnostics = { ...parsed.structuredDiagnostics,
      ...clone(result.structuredDiagnostics || {}) };
    result.unknownDiagnosticFields = parsed.unknownFields;
    result.rawCallStack = result.rawCallStack || parsed.rawCallStack || "";
    result.callStackAvailable = Boolean(result.rawCallStack);
    result.callStackParsed = false;
    result.errorCategory = ["validation", "runtime", "permission", "posting"]
      .includes(result.errorCategory) ? result.errorCategory : "unknown";
    result.diagnosticsStatus = result.diagnosticsStatus ||
      (result.rawDiagnostics ? "diagnostics-captured" :
        result.diagnosticsAvailable ? "diagnostics-unavailable" : "diagnostics-unavailable");
    result.screenshotStatus = result.screenshotStatus || "not-attempted";
    result.captureStatus = Array.from(new Set([
      "detected", result.rawMessage ? "message-captured" : "message-unavailable",
      result.diagnosticsStatus, result.screenshotStatus
    ]));
    result.frameContext = clone(result.frameContext || {});
    return result;
  }

  return { LABELS, normalize, parseRawDiagnostics };
});
