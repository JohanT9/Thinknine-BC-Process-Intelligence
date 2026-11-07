(function (root, factory) {
  const languages = typeof module === "object" && module.exports
    ? require("../engine/language-registry") : root.T9LanguageRegistry;
  const api = factory(languages);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (languages) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const STATUSES = Object.freeze(["draft", "ready", "resolved", "archived"]);
  const CATEGORIES = Object.freeze(["", "functional", "technical", "integration",
    "performance", "permission", "data", "unknown"]);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const text = value => typeof value === "string" ? value : "";
  const stable = value => JSON.stringify(value, (_, child) => child &&
    typeof child === "object" && !Array.isArray(child) ? Object.keys(child).sort()
      .reduce((out, key) => { out[key] = child[key]; return out; }, {}) : child);
  function hash(value) {
    let result = 2166136261;
    for (const character of stable(value)) {
      result ^= character.charCodeAt(0); result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(16).padStart(8, "0");
  }
  const MAX_DELIVERIES = 100;
  const addressList = value => (Array.isArray(value) ? value : String(value || "").split(/[;,]/u))
    .map(item => String(item || "").trim()).filter(Boolean);
  // A record of an email made from the report: sent directly, possibly sent, an Outlook
  // draft or a saved email file. Fields from later versions are kept.
  function normalizeDelivery(value) {
    if (!value || typeof value !== "object" || !value.deliveryId || !value.at) return null;
    return { ...clone(value), deliveryId: String(value.deliveryId), at: String(value.at),
      method: text(value.method), outcome: text(value.outcome),
      to: addressList(value.to), cc: addressList(value.cc),
      reportRevision: value.reportRevision ? String(value.reportRevision) : null };
  }

  function humanText(value = {}) {
    return { text: text(value.text), authorship: "human",
      ...(value.updatedAt ? { updatedAt: value.updatedAt } : {}) };
  }

  function normalizeStep(value = {}, index = 0) {
    const source = value.source || {};
    return { ...clone(value), reproductionStepId: String(
      value.reproductionStepId || value.stepId || `reproduction-step-${index + 1}`
    ), order: index + 1, instruction: text(value.instruction),
    // A step the user added to the report is theirs; recorded steps are derived.
    authorship: value.origin === "manual" ? "human" : "derived", source: { ...clone(source),
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
    result.documentLanguage = result.documentLanguage
      ? languages.normalize(result.documentLanguage, "document") : "en-US";
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
    result.errorAnalysis = result.errorAnalysis ? clone(result.errorAnalysis) : null;
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
    result.deliveries = (Array.isArray(result.deliveries) ? result.deliveries : [])
      .map(normalizeDelivery).filter(Boolean);
    return result;
  }

  // Identifies what the report says, so a delivery can tell whether the report has changed
  // since. The delivery history, save times, status and telemetry do not count.
  function contentRevision(report) {
    const { deliveries, updatedAt, status, enrichment, ...content } = normalize(report);
    return `content:${hash(content)}`;
  }

  // Adds a delivery without changing when the report was last edited. The same delivery is
  // recorded once.
  function recordDelivery(report, delivery) {
    const result = normalize(report);
    const entry = normalizeDelivery(delivery);
    if (!entry) throw new TypeError("A delivery needs an id and a time.");
    if (result.deliveries.some(item => item.deliveryId === entry.deliveryId)) return result;
    result.deliveries = [...result.deliveries, entry].slice(-MAX_DELIVERIES);
    return normalize(result);
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
    if (patch.privacy && typeof patch.privacy.maskValues === "boolean") {
      result.privacy = { ...(result.privacy || {}), maskValues: patch.privacy.maskValues };
    }
    result.updatedAt = updatedAt || result.updatedAt;
    return normalize(result);
  }

  function selectPrimaryError(report, errorEvidenceId, updatedAt) {
    const result = normalize(report);
    const ids = result.businessCentralError?.errorEvidenceIds || [];
    if (!ids.includes(String(errorEvidenceId))) {
      throw new TypeError("Primary error must reference captured report evidence.");
    }
    result.businessCentralError.primaryErrorEvidenceId = String(errorEvidenceId);
    result.updatedAt = updatedAt || result.updatedAt;
    return normalize(result);
  }

  function updateReproductionStep(report, reproductionStepId, patch = {}, updatedAt) {
    const result = normalize(report);
    const id = String(reproductionStepId || "");
    const index = result.reproduction.steps.findIndex(step =>
      step.reproductionStepId === id);
    if (index < 0) throw new TypeError("Reproduction step was not found.");
    const current = result.reproduction.steps[index];
    if (current.origin === "manual") {
      // The user's own steps are edited and removed directly; there is no generated text.
      if (patch.remove) result.reproduction.steps.splice(index, 1);
      else {
        const instruction = Object.prototype.hasOwnProperty.call(patch, "instruction")
          ? text(patch.instruction).trim() : current.instruction;
        if (!instruction) throw new TypeError("Reproduction step text is required.");
        result.reproduction.steps[index] = { ...current, instruction,
          visibility: patch.visibility === "hidden" || patch.visibility === "visible"
            ? patch.visibility : current.visibility, updatedAt: updatedAt || current.updatedAt };
      }
      result.updatedAt = updatedAt || result.updatedAt;
      return normalize(result);
    }
    const fields = { ...(current.stepOverride?.fields || {}) };
    if (Object.prototype.hasOwnProperty.call(patch, "instruction")) {
      const instruction = text(patch.instruction).trim();
      if (!instruction) throw new TypeError("Reproduction step text is required.");
      fields.instruction = instruction;
    }
    if (patch.resetInstruction) delete fields.instruction;
    const previousOverride = current.stepOverride || {};
    const { fields: ignoredFields, authorship: ignoredAuthorship,
      updatedAt: ignoredUpdatedAt, ...otherOverride } = previousOverride;
    const hasOverride = Object.keys(fields).length || Object.keys(otherOverride).length;
    result.reproduction.steps[index] = { ...current,
      visibility: patch.visibility === "hidden" || patch.visibility === "visible"
        ? patch.visibility : current.visibility,
      stepOverride: hasOverride ? { ...otherOverride, fields,
        authorship: "human", updatedAt: updatedAt || previousOverride.updatedAt } : null };
    result.updatedAt = updatedAt || result.updatedAt;
    return normalize(result);
  }

  // Adds a step written by the user after the recorded steps, for example when the report
  // was created from an error that was already shown and no steps were recorded.
  function addReproductionStep(report, instruction, updatedAt) {
    const result = normalize(report);
    const value = text(instruction).trim();
    if (!value) throw new TypeError("Reproduction step text is required.");
    const ids = new Set(result.reproduction.steps.map(step => step.reproductionStepId));
    let number = result.reproduction.steps.length + 1;
    while (ids.has(`manual-step-${number}`)) number += 1;
    result.reproduction.steps.push({ reproductionStepId: `manual-step-${number}`,
      origin: "manual", instruction: value, visibility: "visible", source: {},
      ...(updatedAt ? { createdAt: updatedAt, updatedAt } : {}) });
    result.updatedAt = updatedAt || result.updatedAt;
    return normalize(result);
  }

  function updateScreenshotVisibility(report, assetId, visibility, updatedAt) {
    const result = normalize(report);
    const id = String(assetId || "");
    const index = result.evidence.screenshots.findIndex(item => item.assetId === id);
    if (index < 0) throw new TypeError("Screenshot was not found.");
    if (visibility !== "visible" && visibility !== "hidden") {
      throw new TypeError("Screenshot visibility must be visible or hidden.");
    }
    result.evidence.screenshots[index] = {
      ...result.evidence.screenshots[index], visibility
    };
    result.updatedAt = updatedAt || result.updatedAt;
    return normalize(result);
  }

  // The user's changes to the regions covered in a screenshot when the report masks values.
  function updateScreenshotRedactions(report, assetId, redactions, updatedAt) {
    const result = normalize(report);
    const index = result.evidence.screenshots.findIndex(item => item.assetId === String(assetId || ""));
    if (index < 0) throw new TypeError("Screenshot was not found.");
    const added = (Array.isArray(redactions?.added) ? redactions.added : []).flatMap(region => {
      const value = key => Math.min(1, Math.max(0, Number(region?.[key])));
      const box = { x: value("x"), y: value("y"), width: value("width"), height: value("height") };
      return region?.id && Object.values(box).every(Number.isFinite) && box.width > 0 && box.height > 0
        ? [{ id: String(region.id).slice(0, 80), ...box }] : [];
    }).slice(0, 200);
    const removed = [...new Set((redactions?.removed || []).map(String)
      .filter(id => /^auto:\d+$/u.test(id)))];
    result.evidence.screenshots[index] = { ...result.evidence.screenshots[index],
      redactions: { removed, added } };
    result.updatedAt = updatedAt || result.updatedAt;
    return normalize(result);
  }

  function attachTelemetry(report, errorEvidenceId, enrichment, updatedAt) {
    const result = normalize(report);
    const current = result.enrichment.telemetry?.byErrorEvidenceId || {};
    result.enrichment.telemetry = { schemaVersion: 1,
      byErrorEvidenceId: { ...clone(current), [String(errorEvidenceId)]:
        clone(enrichment) } };
    result.updatedAt = updatedAt || result.updatedAt;
    return normalize(result);
  }

  return { CATEGORIES, SCHEMA_VERSION, STATUSES, normalize, normalizeStep,
    addReproductionStep, contentRevision, recordDelivery, attachTelemetry, selectPrimaryError,
    updateHumanContent, updateReproductionStep, updateScreenshotVisibility,
    updateScreenshotRedactions };
});
