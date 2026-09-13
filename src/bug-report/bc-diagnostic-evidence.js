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
  function supportUrl(value) {
    try {
      const raw = String(value || "");
      const source = new URL(raw);
      if (source.protocol !== "https:" ||
          source.hostname.toLowerCase() !== "businesscentral.dynamics.com") return "";
      const allowed = new Set(["company", "page", "bookmark", "dc"]);
      const rawQuery = (raw.split("?")[1] || "").split("#")[0];
      const query = rawQuery.split("&").filter(Boolean).filter(part => {
        try {
          return allowed.has(decodeURIComponent(part.split("=")[0]).toLowerCase());
        } catch {
          return false;
        }
      });
      return `${source.origin}${source.pathname}${query.length
        ? `?${query.join("&")}` : ""}`;
    } catch { return ""; }
  }

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
      else if (match[2].trim() !== "") structured[field] = match[2].trim();
      else {
        const following = lines.slice(index + 1).find(value => value.trim());
        // BC's Copy details format puts scalar values on the next line.
        // Never consume another field header as a value.
        const nextHeader = following?.match(/^\s*([^:=]{2,80})\s*[:=]\s*(.*)$/u);
        if (following && !(nextHeader && (LOOKUP.has(cleanLabel(nextHeader[1])) || !nextHeader[2].trim())))
          structured[field] = following.trim();
      }
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
    result.supportUrl = supportUrl(result.supportUrl || result.frameContext.topUrl);
    return result;
  }

  const ERROR_TEXT = /(?:spill inträffade|ett fel uppstod|something went wrong|an error occurred|exception|stack overflow|måste ha ett värde|must have a value|du har inte följande behörigheter|you do not have the following permissions|kunde inte (?:bokföras|registreras|slutföras)|could not be (?:posted|registered|completed))/iu;
  function recoverFromRecording(recording = {}) {
    const events = Array.isArray(recording.events) ? recording.events : [];
    return events.flatMap((event, index) => {
      if (event.raw?.type !== "dialog-open") return [];
      const message = String(event.raw?.label || event.raw?.accessibleName || "")
        .replace(/\s+OK\s*$/iu, "").trim();
      if (!message || !ERROR_TEXT.test(message)) return [];
      const preceding = events.slice(0, index).reverse().find(candidate =>
        !["focus", "page-state", "dialog-open", "dialog-close",
          "status-message", "bc-error"].includes(candidate.raw?.type));
      return [normalize({ errorEvidenceId: `bc-error:${recording.id}:recovered:${
        event.raw?.eventNo || index + 1}`, recordingId: recording.id,
      capturedAt: event.timestamp || event.raw?.timestamp || new Date(0).toISOString(),
      rawMessage: message, rawDiagnostics: "", diagnosticsAvailable: false,
      diagnosticsStatus: "diagnostics-unavailable",
      precedingActionEventId: preceding?.id || null,
      triggerRelationship: preceding ? "preceding-interaction-recovered" : "none",
      supportUrl: event.raw?.topUrl || event.raw?.frameUrl || "",
      errorScreenshotAssetId: event.screenshotAssetId || null,
      screenshotStatus: event.screenshotAssetId ? "screenshot-captured" : "screenshot-unavailable",
      source: { kind: "canonical-dialog-recovery", confidence: 0.7 } })];
    });
  }

  return { LABELS, normalize, parseRawDiagnostics, recoverFromRecording, supportUrl };
});
