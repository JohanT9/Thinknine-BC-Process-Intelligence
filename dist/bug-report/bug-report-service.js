(function (root, factory) {
  const model = typeof module === "object" && module.exports
    ? require("./bug-report-model") : root.T9BugReportModel;
  const technical = typeof module === "object" && module.exports
    ? require("./technical-diagnostics") : root.T9TechnicalDiagnostics;
  const languages = typeof module === "object" && module.exports
    ? require("../engine/language-registry") : root.T9LanguageRegistry;
  const api = factory(model, technical, languages);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportService = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (model, technical,
  languages) {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];

  function stableId(recordingId) {
    return `bug-report:${String(recordingId)}`;
  }

  function reproductionStep(step, index, recordingId) {
    const canonicalIds = unique(step.sourceEventIds ||
      step.sourceCanonicalEventIds);
    const screenshots = unique(step.screenshotAssetIds || [
      step.screenshotAssetId, step.canonicalScreenshotAssetId
    ]);
    return { reproductionStepId: `bug-step:${step.taskId || step.stepId || index + 1}`,
      order: index + 1, instruction: step.instruction || step.displayText || "",
      ...(step.stepOverride ? { stepOverride: clone(step.stepOverride) } : {}),
      ...(step.visibility ? { visibility: step.visibility } : {}),
      authorship: "derived", source: { recordingId,
        sourceCanonicalEventIds: canonicalIds,
        sourceStepId: step.taskId || step.stepId || undefined,
        screenshotAssetIds: screenshots } };
  }

  function environment(recording, context = {}) {
    const metadata = recording.metadata || {};
    return { ...clone(context.environment || {}),
      businessCentral: clone(metadata.businessCentral || {}),
      sourceApplication: metadata.sourceApplication,
      sourceUrlRef: context.sourceUrlRef,
      browser: clone(context.browser || {}),
      extensionVersion: context.extensionVersion,
      productVersion: context.productVersion,
      recordingSchemaVersion: recording.schemaVersion };
  }

  function failureStepIds(recording, steps, errorEvidence) {
    const eventIndexes = new Map((recording.events || []).map((event, index) =>
      [String(event.id), index]));
    const stepEvents = steps.map(step => ({
      reproductionStepId: step.reproductionStepId,
      sourceCanonicalEventIds: step.source.sourceCanonicalEventIds,
      indexes: step.source.sourceCanonicalEventIds.map(id => eventIndexes.get(id))
        .filter(index => Number.isInteger(index))
    }));
    const result = new Set();
    for (const evidence of errorEvidence) {
      const referenceIds = unique([evidence.precedingActionEventId,
        evidence.canonicalEventId]);
      const exact = stepEvents.find(step => referenceIds.some(id =>
        step.sourceCanonicalEventIds.includes(id)));
      if (exact) {
        result.add(exact.reproductionStepId);
        continue;
      }
      const referenceIndexes = referenceIds.map(id => eventIndexes.get(id))
        .filter(index => Number.isInteger(index));
      if (!referenceIndexes.length) continue;
      const boundary = Math.min(...referenceIndexes);
      const preceding = stepEvents.map(step => ({ ...step,
        nearestIndex: Math.max(-1, ...step.indexes.filter(index => index < boundary)) }))
        .filter(step => step.nearestIndex >= 0)
        .sort((left, right) => right.nearestIndex - left.nearestIndex)[0];
      if (preceding) result.add(preceding.reproductionStepId);
    }
    return result;
  }

  function draftTitle(derivedSteps, reproductionSteps, errorEvidence, language) {
    const swedish = /^sv(?:-|$)/i.test(String(language || ""));
    const failed = reproductionSteps.find(step => step.failurePoint);
    const source = derivedSteps.find(step => String(step.taskId || step.stepId) ===
      String(failed?.source?.sourceStepId)) || [...derivedSteps].reverse().find(step =>
        String(step.instruction || step.displayText || "").trim());
    const action = String(source?.actionCaption || "").trim();
    const field = String(source?.fieldCaption || "").trim();
    const page = String(source?.pageCaption || "").trim();
    if (errorEvidence.length && action) return swedish
      ? `Fel vid \u201d${action}\u201d` : `Error when selecting \u201c${action}\u201d`;
    if (errorEvidence.length && field) return swedish
      ? `Valideringsfel i \u201d${field}\u201d` : `Validation error in \u201c${field}\u201d`;
    if (errorEvidence.length && page) return swedish
      ? `Business Central-fel i \u201d${page}\u201d` : `Business Central error in \u201c${page}\u201d`;
    if (errorEvidence.length) return swedish
      ? "Business Central-fel i inspelad process"
      : "Business Central error during recorded process";
    return swedish ? "Rapporterat problem i Business Central"
      : "Reported Business Central problem";
  }

  function createBugReportFromRecording(recording, derivedSteps = [], context = {}) {
    if (!recording?.id) throw new TypeError("A Canonical Recording is required.");
    if (recording.metadata?.recordingPurpose !== "bug-report") {
      throw new Error("Bug Reports require a bug-report recording.");
    }
    if (!recording.metadata?.finishedAt) {
      throw new Error("Bug Reports require a completed recording.");
    }
    const now = context.now || recording.updatedAt || new Date().toISOString();
    let steps = derivedSteps.map((step, index) =>
      reproductionStep(step, index, recording.id));
    const canonicalEventIds = unique(steps.flatMap(step =>
      step.source.sourceCanonicalEventIds));
    const screenshotAssetIds = unique(steps.flatMap(step =>
      step.source.screenshotAssetIds));
    const errorEvidence = Array.isArray(context.errorEvidence)
      ? context.errorEvidence : [];
    const failedSteps = failureStepIds(recording, steps, errorEvidence);
    steps = steps.map(step => failedSteps.has(step.reproductionStepId)
      ? { ...step, outcome: "error", failurePoint: true } : step);
    const errorEvidenceIds = unique(errorEvidence.map(item =>
      item.errorEvidenceId));
    const errorScreenshotIds = unique(errorEvidence.map(item =>
      item.errorScreenshotAssetId));
    const callStackEvidence = errorEvidence.find(item => item.callStackAvailable);
    const technicalDiagnostics = errorEvidence.map(item =>
      technical.safelyDerive(item));
    const primaryCallStack = technicalDiagnostics.find(item =>
      item.summary.callStackAvailable)?.callStack;
    const documentLanguage = context.documentLanguage
      ? languages.normalize(context.documentLanguage, "document") : "en-US";
    return model.normalize({ bugReportId: context.bugReportId || stableId(recording.id),
      schemaVersion: model.SCHEMA_VERSION, recordingId: recording.id,
      documentLanguage,
      createdAt: now, updatedAt: now, status: "draft",
      summary: { title: String(context.title || "").trim() ||
          draftTitle(derivedSteps, steps, errorEvidence, documentLanguage),
        summary: "", severity: "", category: "", authorship: "human" },
      environment: environment(recording, context),
      reproduction: { authorship: "derived", steps },
      expectedResult: { text: "", authorship: "human" },
      actualResult: { human: { text: "", authorship: "human" },
        capturedErrorRef: null, capturedErrorRefs: errorEvidenceIds },
      businessCentralError: errorEvidenceIds.length ? {
        primaryErrorEvidenceId: null, errorEvidenceIds
      } : null,
      diagnostics: { rawEvidenceRefs: errorEvidenceIds, parsed: null },
      callStack: { rawEvidenceRef: callStackEvidence?.errorEvidenceId || null,
        frames: clone(primaryCallStack?.frames || []),
        parsed: ["parsed", "partially-parsed"].includes(primaryCallStack?.status),
        parserVersion: primaryCallStack?.parserVersion,
        parseStatus: primaryCallStack?.status },
      technicalDiagnostics,
      evidence: { screenshots: [...screenshotAssetIds.map(assetId => ({
        assetId, role: "reproduction"
      })), ...errorScreenshotIds.map(assetId => ({ assetId, role: "error" }))],
      diagnosticRefs: errorEvidenceIds, attachmentRefs: [] }, notes: [], annotations: [],
      traceability: { canonicalEventIds,
        sourceStepIds: unique(derivedSteps.map(step => step.taskId || step.stepId)),
        screenshotAssetIds: unique([...screenshotAssetIds, ...errorScreenshotIds]),
        recordingRevisionRefs:
          unique(context.recordingRevisionRefs) },
      enrichment: { telemetry: null, analysis: null } });
  }

  function regenerate(report, recording, derivedSteps = [], context = {}) {
    const current = model.normalize(report);
    const regenerated = createBugReportFromRecording(recording, derivedSteps, {
      ...context, bugReportId: current.bugReportId, now: current.createdAt,
      title: current.summary.title
    });
    return model.normalize({ ...clone(current), ...regenerated,
      status: current.status,
      createdAt: current.createdAt,
      updatedAt: context.updatedAt || regenerated.updatedAt,
      summary: clone(current.summary), expectedResult: clone(current.expectedResult),
      actualResult: { ...regenerated.actualResult,
        human: clone(current.actualResult.human),
        capturedErrorRef: current.actualResult.capturedErrorRef,
        capturedErrorRefs: clone(current.actualResult.capturedErrorRefs) },
      businessCentralError: clone(current.businessCentralError),
      diagnostics: clone(current.diagnostics),
      callStack: context.errorEvidence ? clone(regenerated.callStack) :
        clone(current.callStack),
      technicalDiagnostics: context.errorEvidence
        ? clone(regenerated.technicalDiagnostics) :
        clone(current.technicalDiagnostics),
      notes: clone(current.notes), annotations: clone(current.annotations),
      evidence: { ...regenerated.evidence,
        screenshots: unique([
          ...regenerated.evidence.screenshots.map(item => JSON.stringify(item)),
          ...current.evidence.screenshots.map(item => JSON.stringify(item))
        ]).map(item => JSON.parse(item)),
        diagnosticRefs: clone(current.evidence.diagnosticRefs),
        attachmentRefs: clone(current.evidence.attachmentRefs) },
      enrichment: clone(current.enrichment) });
  }

  function reparseTechnicalDiagnostics(report, errorEvidence = []) {
    const current = model.normalize(report);
    const derived = errorEvidence.map(item => technical.safelyDerive(item));
    const primary = derived.find(item => item.summary.callStackAvailable)?.callStack;
    return model.normalize({ ...clone(current), technicalDiagnostics: derived,
      callStack: { ...clone(current.callStack),
        frames: clone(primary?.frames || []), parserVersion: primary?.parserVersion,
        parseStatus: primary?.status,
        parsed: ["parsed", "partially-parsed"].includes(primary?.status) } });
  }

  function attachRecoveredErrorEvidence(report, errorEvidence = [], updatedAt) {
    const current = model.normalize(report);
    if (!errorEvidence.length || current.businessCentralError?.errorEvidenceIds?.length) {
      return current;
    }
    const ids = unique(errorEvidence.map(item => item.errorEvidenceId));
    const diagnostics = errorEvidence.map(item => technical.safelyDerive(item));
    const stackEvidence = errorEvidence.find(item => item.callStackAvailable);
    const stack = diagnostics.find(item =>
      item.errorEvidenceId === stackEvidence?.errorEvidenceId)?.callStack;
    const screenshots = errorEvidence.filter(item => item.errorScreenshotAssetId)
      .map(item => ({ assetId: item.errorScreenshotAssetId, role: "error",
        errorEvidenceId: item.errorEvidenceId, visibility: "visible" }));
    return model.normalize({ ...clone(current), updatedAt: updatedAt || current.updatedAt,
      actualResult: { ...clone(current.actualResult), capturedErrorRefs: ids },
      businessCentralError: { primaryErrorEvidenceId: ids.length === 1 ? ids[0] : null,
        errorEvidenceIds: ids },
      diagnostics: { ...clone(current.diagnostics), rawEvidenceRefs: ids },
      callStack: { ...clone(current.callStack),
        rawEvidenceRef: stackEvidence?.errorEvidenceId || null,
        frames: clone(stack?.frames || []), parserVersion: stack?.parserVersion,
        parseStatus: stack?.status, parsed: ["parsed", "partially-parsed"].includes(
          stack?.status) },
      technicalDiagnostics: diagnostics,
      evidence: { ...clone(current.evidence),
        screenshots: unique([...(current.evidence?.screenshots || []).map(item =>
          JSON.stringify(item)), ...screenshots.map(item => JSON.stringify(item))])
          .map(item => JSON.parse(item)), diagnosticRefs: ids } });
  }

  return { createBugReportFromRecording, regenerate,
    reparseTechnicalDiagnostics, attachRecoveredErrorEvidence, stableId };
});
