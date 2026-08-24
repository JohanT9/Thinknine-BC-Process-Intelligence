(function (root, factory) {
  const generator = typeof module === "object" && module.exports
    ? require("./bug-report-generator") : root.T9BugReportGenerator;
  const api = factory(generator);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9IssuePackage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generator) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const stable = value => JSON.stringify(value, (_, child) => child &&
    typeof child === "object" && !Array.isArray(child) ? Object.keys(child).sort()
      .reduce((out, key) => { out[key] = child[key]; return out; }, {}) : child);
  function hash(value) { let result = 2166136261;
    for (const character of stable(value)) { result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619); }
    return (result >>> 0).toString(16).padStart(8, "0"); }
  const section = (document, id) => document.sections.find(item => item.id === id)?.content;
  function safeName(value, fallback) { const result = String(value || "").trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 48);
    return result || fallback; }
  function attachments(document) {
    const reproduction = section(document, "reproduction") || [];
    const evidence = section(document, "evidence") || {};
    const byId = new Map((evidence.screenshots || []).map(item => [item.assetId, item]));
    const result = []; const used = new Set();
    const add = (assetId, role, name, sourceRef) => { if (!assetId || used.has(assetId)) return;
      used.add(assetId); result.push({ attachmentId: `attachment:${assetId}`, assetId,
        role, fileName: name, mediaType: byId.get(assetId)?.mediaType || "image/png",
        sourceRef, provenance: "referenced-local-evidence" }); };
    for (const item of evidence.screenshots || []) if (item.role === "error") {
      add(item.assetId, "error-evidence", "error.png", item.errorEvidenceId || null);
    }
    reproduction.forEach(step => (step.screenshotAssetIds || []).slice(0, 1)
      .forEach(assetId => add(assetId, "reproduction-evidence",
        `step-${String(step.number).padStart(2, "0")}-${safeName(step.instruction,
          "evidence")}.png`, step.reproductionStepId)));
    return result;
  }
  function revision(report, document) { return `bug-report:${hash({
    bugReportId: report.bugReportId, updatedAt: report.updatedAt || null,
    generatedFromUpdatedAt: document.generatedFromUpdatedAt,
    sections: document.sections })}`; }
  function build(report, context = {}, options = {}) {
    const document = generator.project(report, { errorEvidence: context.errorEvidence || [] });
    const sourceRevision = revision(report, document);
    const ai = section(document, "ai-analysis")?.analysis;
    const telemetry = section(document, "telemetry");
    const includeAi = options.includeAiAnalysis !== false && ai?.status === "current";
    const includeTelemetry = Boolean(options.includeTelemetry && telemetry?.configured);
    const result = { schemaVersion: SCHEMA_VERSION,
      packageId: `issue-package:${report.bugReportId}:${sourceRevision.split(":").pop()}`,
      bugReportId: report.bugReportId, recordingId: report.recordingId,
      generatedAt: options.generatedAt || new Date().toISOString(), sourceRevision,
      sourceUpdatedAt: report.updatedAt || null, title: document.title,
      summary: clone(section(document, "summary")),
      reproduction: clone(section(document, "reproduction") || []),
      expectedResult: section(document, "expected-result") || "",
      actualResult: clone(section(document, "actual-result")),
      errorEvidence: clone(section(document, "bc-errors")),
      environment: clone(section(document, "environment")),
      diagnostics: clone(section(document, "technical-diagnostics")),
      callStack: clone(section(document, "al-call-stack") || []),
      affectedObjects: clone(section(document, "affected-objects")),
      notes: clone(section(document, "notes") || []), attachments: attachments(document),
      telemetry: includeTelemetry ? clone(telemetry) : null,
      aiAnalysis: includeAi ? clone(ai) : null,
      inclusion: { telemetry: includeTelemetry, aiAnalysis: includeAi,
        rawTelemetry: false, rawCanonicalEvents: false, rawDiagnostics: false,
        screenshots: attachments(document).length > 0 },
      privacy: { requiresReview: true, categories: ["business-central-error",
        "environment", "technical-identifiers", "human-notes",
        ...(attachments(document).length ? ["screenshots"] : []),
        ...(includeTelemetry ? ["telemetry-summary"] : []),
        ...(includeAi ? ["ai-analysis"] : [])] },
      provenance: { type: "derived-issue-package",
        technicalReportId: document.reportDocumentId } };
    return Object.freeze(result);
  }
  function currentRevision(report, context = {}) { const document = generator.project(report,
    { errorEvidence: context.errorEvidence || [] }); return revision(report, document); }
  function isStale(issuePackage, report, context = {}) {
    return !issuePackage || issuePackage.sourceRevision !== currentRevision(report, context);
  }
  return { SCHEMA_VERSION, build, currentRevision, hash, isStale };
});

