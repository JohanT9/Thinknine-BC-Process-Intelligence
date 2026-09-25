(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ErrorEvidenceModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const SOURCE_TYPES = Object.freeze([
    "business-central", "al-runtime", "network", "client", "unknown"
  ]);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => typeof value === "string" ? value : "";
  const deepFreeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  function sourceType(input = {}) {
    const explicit = text(input.sourceType || input.source?.type).toLowerCase();
    if (SOURCE_TYPES.includes(explicit)) return explicit;
    const kind = text(input.source?.kind).toLowerCase();
    if (/network|http|fetch/u.test(kind) || input.networkContext) return "network";
    if (/client|javascript|console/u.test(kind) || input.clientError) return "client";
    if (input.callStackAvailable || text(input.rawCallStack).trim()) return "al-runtime";
    if (input.errorEvidenceId || /business-central|bc-error/u.test(kind)) {
      return "business-central";
    }
    return "unknown";
  }

  function normalize(input = {}, defaults = {}) {
    if (input.schemaVersion && input.kind === "error-evidence") {
      if (Number(input.schemaVersion) !== SCHEMA_VERSION) {
        throw new Error(`Unsupported ErrorEvidence schema: ${input.schemaVersion}`);
      }
    }
    const evidenceId = String(input.evidenceId || input.errorEvidenceId || "");
    const recordingId = String(input.recordingId || defaults.recordingId || "");
    const timestamp = text(input.timestamp || input.capturedAt || defaults.timestamp);
    if (!evidenceId || !recordingId) {
      throw new TypeError("ErrorEvidence identity and recording are required.");
    }
    const rawMessage = text(input.message?.raw ?? input.rawMessage ?? input.message);
    const displayMessage = text(input.message?.display || input.displayMessage) ||
      rawMessage.replace(/\s+/gu, " ").trim();
    const diagnostics = clone(input.diagnostics || {});
    const structuredDiagnostics = clone(input.technicalIdentifiers ||
      input.structuredDiagnostics || diagnostics.technicalIdentifiers || {});
    const rawCallStack = text(input.callStack?.raw || input.rawCallStack);
    const screenshotAssetId = input.screenshot?.assetId ||
      input.errorScreenshotAssetId || null;
    const precedingActionEventId = input.precedingAction?.eventId ||
      input.precedingActionEventId || null;
    const normalized = {
      schemaVersion: SCHEMA_VERSION,
      kind: "error-evidence",
      evidenceId,
      recordingId,
      timestamp,
      source: {
        type: sourceType(input),
        captureKind: text(input.source?.kind || input.captureKind) || "unspecified",
        originalEvidenceRef: String(input.errorEvidenceId || evidenceId)
      },
      message: { raw: rawMessage, display: displayMessage },
      category: text(input.category || input.errorCategory).toLowerCase() || "unknown",
      technicalIdentifiers: structuredDiagnostics,
      diagnostics: {
        status: text(diagnostics.status || input.diagnosticsStatus) || "unknown",
        available: Boolean(input.diagnosticsAvailable || input.rawDiagnostics ||
          Object.keys(structuredDiagnostics).length),
        raw: text(diagnostics.raw || input.rawDiagnostics)
      },
      precedingAction: {
        eventId: precedingActionEventId ? String(precedingActionEventId) : null,
        relationship: text(input.precedingAction?.relationship ||
          input.triggerRelationship) || "unknown"
      },
      screenshot: {
        assetId: screenshotAssetId ? String(screenshotAssetId) : null,
        status: text(input.screenshot?.status || input.screenshotStatus) || "unknown"
      },
      callStack: {
        raw: rawCallStack,
        available: Boolean(input.callStack?.available || input.callStackAvailable ||
          rawCallStack.trim())
      },
      networkContext: clone(input.networkContext || {}),
      clientContext: clone(input.clientContext || input.frameContext || {}),
      provenance: {
        authorship: "captured",
        adapter: input.kind === "error-evidence"
          ? "canonical-error-evidence" : "legacy-error-evidence-adapter",
        sourceKind: text(input.source?.kind) || null,
        missingFields: [...(!timestamp ? ["timestamp"] : [])]
      },
      rawEvidence: clone(input.rawEvidence || input)
    };
    return deepFreeze(normalized);
  }

  function normalizeMany(values = [], defaults = {}) {
    if (!Array.isArray(values)) throw new TypeError("ErrorEvidence list is required.");
    const seen = new Set();
    return Object.freeze(values.map(item => normalize(item, defaults)).map(item => {
      if (seen.has(item.evidenceId)) {
        throw new TypeError(`Duplicate ErrorEvidence identity: ${item.evidenceId}`);
      }
      seen.add(item.evidenceId);
      return item;
    }));
  }

  return { SCHEMA_VERSION, SOURCE_TYPES, normalize, normalizeMany, sourceType };
});
