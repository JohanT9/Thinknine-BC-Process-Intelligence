(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AiAnalysisModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => typeof value === "string" ? value : "";
  const list = value => Array.isArray(value) ? value : [];
  function validate(output = {}, input = {}) {
    const evidenceIds = new Set([
      ...(input.facts || []).map(item => item.evidenceId),
      ...(input.reproduction || []).map(item => item.evidenceId),
      ...(input.notes || []).map(item => item.evidenceId),
      ...(input.facts || []).map(item => item.telemetryEventId).filter(Boolean)]);
    const objects = new Set((input.facts || []).filter(item => item.type ===
      "call-stack-frame").map(item => `${item.objectType || ""}:${item.objectId || ""}`));
    const diagnostics = [];
    const sections = ["observations", "hypotheses", "recommendedNextChecks",
      "missingEvidence"];
    if (!text(output.summary)) diagnostics.push({ code: "missing-summary" });
    for (const section of sections) for (const item of list(output[section])) {
      for (const citation of list(item.citations || item.supportingEvidence)) {
        if (!evidenceIds.has(citation)) diagnostics.push({
          code: "unsupported-citation", section, citation });
      }
      for (const reference of list(item.objectReferences)) {
        const key = `${reference.objectType || ""}:${reference.objectId || ""}`;
        if (!objects.has(key)) diagnostics.push({ code: "unsupported-object",
          section, objectReference: clone(reference) });
      }
    }
    const preciseConfidence = /\b\d{1,3}\s*%\s*(confidence|certain)/iu.test(
      JSON.stringify(output));
    if (preciseConfidence) diagnostics.push({ code: "fake-precision" });
    return { valid: !diagnostics.some(item => ["unsupported-citation",
      "unsupported-object", "missing-summary"].includes(item.code)), diagnostics };
  }
  function normalize(output = {}, metadata = {}, input = {}) {
    const validation = validate(output, input);
    if (!validation.valid) throw Object.assign(new Error(
      "AI analysis failed evidence validation."), { code: "invalid-ai-output",
      diagnostics: validation.diagnostics });
    return { ...clone(output), schemaVersion: 1, analysisVersion: "1.0.0",
      analysisId: metadata.analysisId, bugReportId: input.bugReportId,
      sourceEvidenceFingerprint: input.sourceEvidenceFingerprint,
      createdAt: metadata.createdAt, provider: metadata.provider,
      model: metadata.model, status: "current", authorship: "ai-analysis",
      summary: text(output.summary), observations: list(output.observations).map(clone),
      hypotheses: list(output.hypotheses).map(item => ({ ...clone(item),
        label: "Possible root-cause hypothesis", verified: false })),
      likelyInvestigationArea: clone(output.likelyInvestigationArea || null),
      recommendedNextChecks: list(output.recommendedNextChecks).map(clone),
      missingEvidence: list(output.missingEvidence).map(clone),
      riskFlags: list(output.riskFlags).map(clone), warnings: [
        ...list(output.warnings).map(clone), ...validation.diagnostics],
      usage: clone(metadata.usage || {}) };
  }
  function withStaleness(analysis, fingerprint) {
    if (!analysis) return null;
    return { ...clone(analysis), status: analysis.sourceEvidenceFingerprint === fingerprint
      ? "current" : "stale" };
  }
  return { normalize, validate, withStaleness };
});
