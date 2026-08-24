(function (root, factory) {
  const completeness = typeof module === "object" && module.exports
    ? require("./bug-report-completeness") : root.T9BugReportCompleteness;
  const api = factory(completeness);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportGenerator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (completeness) {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => typeof value === "string" ? value : "";
  const SECTION_ORDER = Object.freeze(["summary", "environment", "reproduction",
    "expected-result", "actual-result", "bc-errors", "technical-diagnostics",
    "al-call-stack", "affected-objects", "evidence", "notes", "traceability"]);
  const LABELS = Object.freeze({ timestamp: "Timestamp",
    internalSessionId: "Internal Session ID",
    applicationInsightsSessionId: "Application Insights Session ID",
    clientActivityId: "Client Activity ID", userTelemetryId: "User Telemetry ID",
    serverInstanceId: "Server Instance", environment: "Environment",
    company: "Company" });

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
    const errors = evidenceFor(report, context.errorEvidence);
    const onlyError = errors.length === 1 ? errors[0].errorEvidenceId : null;
    const primaryId = report.businessCentralError?.primaryErrorEvidenceId || onlyError;
    const primary = errors.find(item => item.errorEvidenceId === primaryId) || null;
    const title = text(report.summary?.title).trim() ||
      "Business Central error during recorded process";
    const summaryText = text(report.summary?.summary).trim() ||
      text(primary?.rawMessage || errors[0]?.rawMessage);
    const reproduction = (report.reproduction?.steps || []).filter(step =>
      step.visibility !== "hidden").map((step, index) => ({ ...clone(step),
      number: index + 1, instruction: resolvedInstruction(step),
      screenshotAssetIds: [...(step.source?.screenshotAssetIds || [])] }));
    const diagnostics = report.technicalDiagnostics || [];
    const diagnosticRows = errors.flatMap(item => Object.entries(
      item.structuredDiagnostics || {}).filter(([key, value]) => LABELS[key] && value)
      .map(([key, value]) => ({ errorEvidenceId: item.errorEvidenceId,
        label: LABELS[key], value: String(value), provenance: "captured" })));
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
    const checks = completeness.evaluate(report, errors);
    const sections = [
      { id: "summary", title: "Summary", kind: "summary", provenance: "manual",
        content: { title, summary: summaryText, summaryFallback: !report.summary?.summary,
          status: report.status, severity: text(report.summary?.severity),
          category: text(report.summary?.category) } },
      { id: "environment", title: "Environment", kind: "metadata",
        provenance: "captured", content: clone(report.environment || {}) },
      { id: "reproduction", title: "Steps to Reproduce", kind: "reproduction",
        provenance: "derived", content: reproduction },
      { id: "expected-result", title: "Expected Result", kind: "text",
        provenance: "manual", content: text(report.expectedResult?.text) },
      { id: "actual-result", title: "Actual Result", kind: "actual-result",
        provenance: "mixed", content: { userDescription:
          text(report.actualResult?.human?.text), capturedErrors: errors.map(item => ({
          errorEvidenceId: item.errorEvidenceId, rawMessage: item.rawMessage })) } },
      { id: "bc-errors", title: "Business Central Error", kind: "errors",
        provenance: "captured", content: { primaryErrorEvidenceId: primaryId,
          primary, additional: errors.filter(item => item.errorEvidenceId !== primaryId) } },
      { id: "technical-diagnostics", title: "Technical Diagnostics",
        kind: "diagnostics", provenance: "mixed", content: { rows: diagnosticRows,
          captureStatuses: errors.map(item => ({ errorEvidenceId: item.errorEvidenceId,
            diagnosticsStatus: item.diagnosticsStatus })) } },
      { id: "al-call-stack", title: "AL Call Stack", kind: "call-stack",
        provenance: "derived", content: callStacks },
      { id: "affected-objects", title: "Referenced AL Objects",
        kind: "objects", provenance: "derived",
        content: { objects: affectedObjects, apps: referencedApps } },
      { id: "evidence", title: "Screenshots and Evidence", kind: "evidence",
        provenance: "mixed", content: { screenshots: clone(
          report.evidence?.screenshots || []), annotations: clone(report.annotations || []) } },
      { id: "notes", title: "Additional Notes", kind: "notes",
        provenance: "manual", content: clone(report.notes || []) },
      { id: "traceability", title: "Technical Traceability", kind: "traceability",
        provenance: "mixed", content: { bugReportId: report.bugReportId,
          recordingId: report.recordingId, errorEvidenceIds:
          errors.map(item => item.errorEvidenceId), parserVersions:
          [...new Set(callStacks.map(item => item.parserVersion).filter(Boolean))],
          canonicalEventIds: clone(report.traceability?.canonicalEventIds || []) } }
    ];
    return Object.freeze({ schemaVersion: 1, reportDocumentId:
      `technical-report:${report.bugReportId}`, bugReportId: report.bugReportId,
    title, sections, sectionOrder: [...SECTION_ORDER], completeness: checks,
    exportPolicy: "full-technical-report-local", generatedFromUpdatedAt:
      report.updatedAt || null });
  }
  return { LABELS, SECTION_ORDER, project };
});
