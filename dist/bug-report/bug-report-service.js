(function (root, factory) {
  const model = typeof module === "object" && module.exports
    ? require("./bug-report-model") : root.T9BugReportModel;
  const technical = typeof module === "object" && module.exports
    ? require("./technical-diagnostics") : root.T9TechnicalDiagnostics;
  const api = factory(model, technical);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportService = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (model, technical) {
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

  function createBugReportFromRecording(recording, derivedSteps = [], context = {}) {
    if (!recording?.id) throw new TypeError("A Canonical Recording is required.");
    if (recording.metadata?.recordingPurpose !== "bug-report") {
      throw new Error("Bug Reports require a bug-report recording.");
    }
    if (!recording.metadata?.finishedAt) {
      throw new Error("Bug Reports require a completed recording.");
    }
    const now = context.now || recording.updatedAt || new Date().toISOString();
    const steps = derivedSteps.map((step, index) =>
      reproductionStep(step, index, recording.id));
    const canonicalEventIds = unique(steps.flatMap(step =>
      step.source.sourceCanonicalEventIds));
    const screenshotAssetIds = unique(steps.flatMap(step =>
      step.source.screenshotAssetIds));
    const errorEvidence = Array.isArray(context.errorEvidence)
      ? context.errorEvidence : [];
    const errorEvidenceIds = unique(errorEvidence.map(item =>
      item.errorEvidenceId));
    const errorScreenshotIds = unique(errorEvidence.map(item =>
      item.errorScreenshotAssetId));
    const callStackEvidence = errorEvidence.find(item => item.callStackAvailable);
    const technicalDiagnostics = errorEvidence.map(item =>
      technical.safelyDerive(item));
    const primaryCallStack = technicalDiagnostics.find(item =>
      item.summary.callStackAvailable)?.callStack;
    return model.normalize({ bugReportId: context.bugReportId || stableId(recording.id),
      schemaVersion: model.SCHEMA_VERSION, recordingId: recording.id,
      createdAt: now, updatedAt: now, status: "draft",
      summary: { title: context.title || "",
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

  return { createBugReportFromRecording, regenerate,
    reparseTechnicalDiagnostics, stableId };
});
