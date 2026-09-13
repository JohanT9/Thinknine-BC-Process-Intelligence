(function (root, factory) {
  const completeness = typeof module === "object" && module.exports
    ? require("./bug-report-completeness") : root.T9BugReportCompleteness;
  const aiInput = typeof module === "object" && module.exports
    ? require("./ai-analysis-input") : root.T9AiAnalysisInput;
  const aiModel = typeof module === "object" && module.exports
    ? require("./ai-analysis-model") : root.T9AiAnalysisModel;
  const api = factory(completeness, aiInput, aiModel);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportGenerator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  completeness, aiInput, aiModel
) {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => typeof value === "string" ? value : "";
  const SECTION_ORDER = Object.freeze(["summary", "environment", "reproduction",
    "expected-result", "actual-result", "bc-errors", "technical-diagnostics",
    "al-call-stack", "affected-objects", "telemetry", "correlated-timeline", "ai-analysis",
    "evidence", "notes", "traceability"]);
  const LABELS = Object.freeze({ timestamp: "Timestamp",
    internalSessionId: "Internal Session ID",
    applicationInsightsSessionId: "Application Insights Session ID",
    clientActivityId: "Client Activity ID", userTelemetryId: "User Telemetry ID",
    serverInstanceId: "Server Instance", environment: "Environment",
    company: "Company" });
  const SWEDISH_LABELS = Object.freeze({ timestamp: "Tidpunkt",
    internalSessionId: "BC:s interna sessions-ID",
    applicationInsightsSessionId: "Application Insights sessions-ID",
    clientActivityId: "Klientaktivitets-ID",
    userTelemetryId: "Telemetri-ID för användare",
    serverInstanceId: "Serverinstans", environment: "Miljö",
    company: "Företag" });
  const TITLES = Object.freeze({
    "sv-SE": Object.freeze({ summary: "Sammanfattning", environment: "Miljö",
      reproduction: "Steg för att återskapa", expected: "Förväntat resultat",
      actual: "Faktiskt resultat", errors: "Business Central-fel",
      diagnostics: "Teknisk diagnostik", objects: "Refererade AL-objekt",
      telemetry: "Application Insights-telemetri", timeline: "Korrelerad tidslinje",
      analysis: "AI-assisterad teknisk analys", evidence: "Skärmbilder och bevis",
      notes: "Ytterligare anteckningar", traceability: "Teknisk spårbarhet" }),
    "en-US": Object.freeze({ summary: "Summary", environment: "Environment",
      reproduction: "Steps to Reproduce", expected: "Expected Result",
      actual: "Actual Result", errors: "Business Central Error",
      diagnostics: "Technical Diagnostics", objects: "Referenced AL Objects",
      telemetry: "Application Insights Telemetry", timeline: "Correlated Timeline",
      analysis: "AI-assisted Technical Analysis", evidence: "Screenshots and Evidence",
      notes: "Additional Notes", traceability: "Technical Traceability" })
  });

  function evidenceFor(report, evidence) {
    const wanted = new Set(report.businessCentralError?.errorEvidenceIds || []);
    return (evidence || []).filter(item => !wanted.size || wanted.has(
      item.errorEvidenceId)).map(clone);
  }
  function resolvedInstruction(step) {
    return Object.prototype.hasOwnProperty.call(step.stepOverride?.fields || {},
      "instruction") ? text(step.stepOverride.fields.instruction) :
      text(step.instruction);
  }
  function project(report, context = {}) {
    const documentLanguage = report.documentLanguage === "en-US" ? "en-US" : "sv-SE";
    const titles = TITLES[documentLanguage];
    const labels = documentLanguage === "sv-SE" ? SWEDISH_LABELS : LABELS;
    const errors = evidenceFor(report, context.errorEvidence);
    const onlyError = errors.length === 1 ? errors[0].errorEvidenceId : null;
    const primaryId = report.businessCentralError?.primaryErrorEvidenceId || onlyError;
    const primary = errors.find(item => item.errorEvidenceId === primaryId) || null;
    const title = text(report.summary?.title).trim() || (documentLanguage === "sv-SE"
      ? "Business Central-fel under inspelad process"
      : "Business Central error during recorded process");
    const summaryText = text(report.summary?.summary).trim() ||
      text(primary?.rawMessage || errors[0]?.rawMessage);
    const reproduction = (report.reproduction?.steps || []).filter(step =>
      step.visibility !== "hidden").map((step, index) => ({ ...clone(step),
      number: index + 1, instruction: resolvedInstruction(step),
      screenshotAssetIds: [...(step.source?.screenshotAssetIds || [])] }));
    const diagnostics = report.technicalDiagnostics || [];
    const diagnosticRows = errors.flatMap(item => Object.entries(
      item.structuredDiagnostics || {}).filter(([key, value]) => labels[key] && value)
      .map(([key, value]) => ({ errorEvidenceId: item.errorEvidenceId,
        label: labels[key], value: String(value), provenance: "captured" })));
    const callStacks = diagnostics.map(item => ({
      errorEvidenceId: item.errorEvidenceId,
      parseStatus: item.summary?.parseStatus || "not-available",
      parserVersion: item.callStack?.parserVersion,
      frames: clone(item.callStack?.frames || []),
      unparsedSegments: clone(item.callStack?.unparsedSegments || []),
      rawCallStack: text(errors.find(error =>
        error.errorEvidenceId === item.errorEvidenceId)?.rawCallStack)
    }));
    const affectedObjects = [...new Map(diagnostics.flatMap(item =>
      item.identifiedObjects || []).map(item => [
      `${item.objectType}|${item.objectId}|${item.objectName}`, clone(item)
    ])).values()];
    const referencedApps = [...new Map(diagnostics.flatMap(item =>
      item.explicitExtensions || []).map(item => [JSON.stringify(item), clone(item)]
    )).values()];
    const telemetryByError = clone(report.enrichment?.telemetry?.byErrorEvidenceId || {});
    const telemetryContexts = Object.entries(telemetryByError).map(([errorEvidenceId, value]) => ({
      errorEvidenceId, status: value.status || "not-configured",
      queriedAt: value.queriedAt || "", connectionContext: clone(value.connectionContext || {}),
      correlationContext: clone(value.correlationContext || {}),
      eventCount: (value.events || []).length,
      events: clone((value.events || []).filter(event =>
        event.category !== "other-context").slice(0, 100)),
      queries: clone(value.queries || []),
      warnings: clone(value.warnings || []) }));
    const timeline = [...errors.map(item => ({ timestamp: item.capturedAt,
      source: "captured-error", label: documentLanguage === "sv-SE"
        ? "Business Central-fel registrerat" : "Business Central error captured",
      referenceId: item.errorEvidenceId, provenance: "captured-local-evidence" })),
    ...telemetryContexts.flatMap(context => context.events.map(event => ({
      timestamp: event.timestamp, source: "telemetry",
      label: event.eventName || event.message || (documentLanguage === "sv-SE"
        ? "Telemetrihändelse observerad" : "Telemetry event observed"),
      referenceId: event.telemetryEventId,
      correlationReasons: clone(event.correlationReasons || []),
      provenance: "external-telemetry-evidence" })))]
      .filter(item => item.timestamp).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const currentAiInput = aiInput.build(report, errors,
      report.enrichment?.analysis?.inputPolicy || {});
    const analysis = aiModel.withStaleness(report.enrichment?.analysis,
      currentAiInput.sourceEvidenceFingerprint);
    const checks = completeness.evaluate(report, errors);
    const sections = [
      { id: "summary", title: titles.summary, kind: "summary", provenance: "manual",
        content: { title, summary: summaryText, summaryFallback: !report.summary?.summary,
          status: report.status, severity: text(report.summary?.severity),
          category: text(report.summary?.category) } },
      { id: "environment", title: titles.environment, kind: "metadata",
        provenance: "captured", content: clone(report.environment || {}) },
      { id: "reproduction", title: titles.reproduction, kind: "reproduction",
        provenance: "derived", content: reproduction },
      { id: "expected-result", title: titles.expected, kind: "text",
        provenance: "manual", content: text(report.expectedResult?.text) },
      { id: "actual-result", title: titles.actual, kind: "actual-result",
        provenance: "mixed", content: { userDescription:
          text(report.actualResult?.human?.text), capturedErrors: errors.map(item => ({
          errorEvidenceId: item.errorEvidenceId, rawMessage: item.rawMessage })) } },
      { id: "bc-errors", title: titles.errors, kind: "errors",
        provenance: "captured", content: { primaryErrorEvidenceId: primaryId,
          primary, additional: errors.filter(item => item.errorEvidenceId !== primaryId) } },
      { id: "technical-diagnostics", title: titles.diagnostics,
        kind: "diagnostics", provenance: "mixed", content: { rows: diagnosticRows,
          captureStatuses: errors.map(item => ({ errorEvidenceId: item.errorEvidenceId,
            diagnosticsStatus: item.diagnosticsStatus })) } },
      { id: "al-call-stack", title: documentLanguage === "sv-SE" ? "AL-anropsstack (AL Call Stack)" : "AL Call Stack", kind: "call-stack",
        provenance: "derived", content: callStacks },
      { id: "affected-objects", title: titles.objects,
        kind: "objects", provenance: "derived",
        content: { objects: affectedObjects, apps: referencedApps } },
      { id: "telemetry", title: titles.telemetry,
        kind: "telemetry", provenance: "external-telemetry",
        content: { configured: telemetryContexts.length > 0,
          contexts: telemetryContexts } },
      { id: "correlated-timeline", title: titles.timeline,
        kind: "timeline", provenance: "derived-correlation", content: timeline },
      { id: "ai-analysis", title: titles.analysis,
        kind: "ai-analysis", provenance: "ai-analysis", content: {
          available: Boolean(analysis), analysis,
          currentFingerprint: currentAiInput.sourceEvidenceFingerprint,
          disclosure: currentAiInput.disclosure } },
      { id: "evidence", title: titles.evidence, kind: "evidence",
        provenance: "mixed", content: { screenshots: clone(
          (report.evidence?.screenshots || []).filter(item =>
            item.visibility !== "hidden")), annotations: clone(report.annotations || []) } },
      { id: "notes", title: titles.notes, kind: "notes",
        provenance: "manual", content: clone(report.notes || []) },
      { id: "traceability", title: titles.traceability, kind: "traceability",
        provenance: "mixed", content: { bugReportId: report.bugReportId,
          recordingId: report.recordingId, errorEvidenceIds:
          errors.map(item => item.errorEvidenceId), parserVersions:
          [...new Set(callStacks.map(item => item.parserVersion).filter(Boolean))],
          canonicalEventIds: clone(report.traceability?.canonicalEventIds || []) } }
    ];
    return Object.freeze({ schemaVersion: 1, reportDocumentId:
      `technical-report:${report.bugReportId}`, bugReportId: report.bugReportId,
    title, documentLanguage, sections, sectionOrder: [...SECTION_ORDER], completeness: checks,
    exportPolicy: "full-technical-report-local", generatedFromUpdatedAt:
      report.updatedAt || null });
  }
  return { LABELS, SECTION_ORDER, TITLES, project };
});
