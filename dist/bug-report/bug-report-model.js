(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const STATUSES = Object.freeze(["draft", "ready", "resolved", "archived"]);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const text = value => typeof value === "string" ? value : "";

  function humanText(value = {}) {
    return { text: text(value.text), authorship: "human",
      ...(value.updatedAt ? { updatedAt: value.updatedAt } : {}) };
  }

  function normalizeStep(value = {}, index = 0) {
    const source = value.source || {};
    return { ...clone(value), reproductionStepId: String(
      value.reproductionStepId || value.stepId || `reproduction-step-${index + 1}`
    ), order: index + 1, instruction: text(value.instruction),
    authorship: "derived", source: { ...clone(source),
      recordingId: source.recordingId ? String(source.recordingId) : undefined,
      sourceCanonicalEventIds: unique(source.sourceCanonicalEventIds),
      sourceStepId: source.sourceStepId ? String(source.sourceStepId) : undefined,
      screenshotAssetIds: unique(source.screenshotAssetIds) } };
  }

  function normalize(input = {}) {
    const result = clone(input);
    result.schemaVersion = Number(result.schemaVersion || SCHEMA_VERSION);
    if (result.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Unsupported Bug Report schema: ${result.schemaVersion}`);
    }
    result.bugReportId = String(result.bugReportId || "");
    result.recordingId = String(result.recordingId || "");
    if (!result.bugReportId || !result.recordingId) {
      throw new TypeError("Bug Report identity and recording reference are required.");
    }
    result.status = STATUSES.includes(result.status) ? result.status : "draft";
    result.summary = { ...(result.summary || {}),
      title: text(result.summary?.title), summary: text(result.summary?.summary),
      severity: text(result.summary?.severity),
      category: text(result.summary?.category), authorship: "human" };
    result.environment = { ...clone(result.environment || {}),
      authorship: "captured" };
    result.reproduction = { ...(result.reproduction || {}),
      authorship: "derived", steps: (result.reproduction?.steps || [])
        .map(normalizeStep) };
    result.expectedResult = humanText(result.expectedResult);
    result.actualResult = { ...(result.actualResult || {}),
      human: humanText(result.actualResult?.human),
      capturedErrorRef: result.actualResult?.capturedErrorRef || null,
      capturedErrorRefs: unique(result.actualResult?.capturedErrorRefs) };
    result.businessCentralError = result.businessCentralError ? {
      ...clone(result.businessCentralError),
      primaryErrorEvidenceId:
        result.businessCentralError.primaryErrorEvidenceId || null,
      errorEvidenceIds: unique(result.businessCentralError.errorEvidenceIds)
    } : null;
    result.diagnostics = { ...clone(result.diagnostics || {}),
      rawEvidenceRefs: unique(result.diagnostics?.rawEvidenceRefs),
      parsed: clone(result.diagnostics?.parsed || null),
      rawAuthorship: "captured", parsedAuthorship: "derived" };
    result.callStack = { ...clone(result.callStack || {}),
      rawEvidenceRef: result.callStack?.rawEvidenceRef || null,
      frames: clone(result.callStack?.frames || []),
      parsed: Boolean(result.callStack?.parsed),
      rawAuthorship: "captured", framesAuthorship: "derived" };
    result.technicalDiagnostics = (result.technicalDiagnostics || []).map(item =>
      ({ ...clone(item), authorship: "derived" }));
    result.evidence = { ...(result.evidence || {}),
      screenshots: (result.evidence?.screenshots || []).map(item => ({
        ...clone(item), assetId: String(item.assetId),
        role: item.role || "supporting"
      })), diagnosticRefs: unique(result.evidence?.diagnosticRefs),
      attachmentRefs: unique(result.evidence?.attachmentRefs),
      authorship: "captured" };
    result.notes = (result.notes || []).map(item => ({ ...clone(item),
      authorship: "human" }));
    result.annotations = (result.annotations || []).map(item => ({
      ...clone(item), authorship: "human" }));
    result.traceability = { ...(result.traceability || {}),
      canonicalEventIds: unique(result.traceability?.canonicalEventIds),
      sourceStepIds: unique(result.traceability?.sourceStepIds),
      screenshotAssetIds: unique(result.traceability?.screenshotAssetIds),
      recordingRevisionRefs: unique(
        result.traceability?.recordingRevisionRefs
      ) };
    result.enrichment = clone(result.enrichment || {
      telemetry: null, analysis: null
    });
    return result;
  }

  function updateHumanContent(report, patch = {}, updatedAt) {
    const result = normalize(report);
    if (patch.summary) result.summary = { ...result.summary, ...clone(patch.summary),
      authorship: "human" };
    if (patch.expectedResult !== undefined) result.expectedResult = humanText({
      text: patch.expectedResult, updatedAt });
    if (patch.actualResult !== undefined) result.actualResult.human = humanText({
      text: patch.actualResult, updatedAt });
    if (patch.notes) result.notes = clone(patch.notes).map(item => ({ ...item,
      authorship: "human" }));
    if (patch.annotations) result.annotations = clone(patch.annotations)
      .map(item => ({ ...item, authorship: "human" }));
    if (patch.status && STATUSES.includes(patch.status)) result.status = patch.status;
    result.updatedAt = updatedAt || result.updatedAt;
    return normalize(result);
  }

  return { SCHEMA_VERSION, STATUSES, normalize, normalizeStep,
    updateHumanContent };
});
