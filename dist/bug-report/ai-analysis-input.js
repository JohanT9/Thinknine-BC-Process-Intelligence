(function (root, factory) {
  const policy = typeof module === "object" && module.exports
    ? require("./ai-evidence-policy") : root.T9AiEvidencePolicy;
  const api = factory(policy);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AiAnalysisInput = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (evidencePolicy) {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const stable = value => value && typeof value === "object" ? Array.isArray(value)
    ? `[${value.map(stable).join(",")}]` : `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}` : JSON.stringify(value);
  function fingerprint(value) {
    const input = stable(value); let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index); hash = Math.imul(hash, 16777619);
    }
    return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }
  function build(report, evidence = [], selectedPolicy = {}) {
    const appliedPolicy = evidencePolicy.policy(selectedPolicy);
    const errors = evidence.filter(item => (report.businessCentralError?.errorEvidenceIds || [])
      .includes(item.errorEvidenceId)).map(item => ({ type: "captured-error",
        evidenceId: item.errorEvidenceId, text: evidencePolicy.redact(item.rawMessage) }));
    const frames = (report.technicalDiagnostics || []).flatMap(item =>
      (item.callStack?.frames || []).slice(0, 80).map(frame => ({ type: "call-stack-frame",
        evidenceId: item.errorEvidenceId, frameIndex: frame.frameIndex,
        objectType: frame.objectType, objectId: frame.objectId,
        objectName: frame.objectName, method: frame.methodName || frame.triggerName,
        app: frame.extensionName, publisher: frame.publisherName,
        sourceLocation: frame.sourceLocation, lineNumber: frame.lineNumber })));
    const telemetry = appliedPolicy.includeTelemetry ? Object.entries(
      report.enrichment?.telemetry?.byErrorEvidenceId || {}).flatMap(([evidenceId, value]) =>
      (value.events || []).filter(event => event.category !== "other-context").slice(0, 40)
        .map(event => ({ type: "telemetry-event", evidenceId,
          telemetryEventId: event.telemetryEventId, timestamp: event.timestamp,
          eventName: event.eventName, category: event.category,
          ...(appliedPolicy.includeTelemetryMessages ? {
            message: evidencePolicy.redact(event.message) } : {}),
          correlationReasons: clone(event.correlationReasons || []) }))) : [];
    const facts = [...errors, ...frames, ...telemetry];
    const input = { schemaVersion: 1, inputVersion: "1.0.0",
      bugReportId: report.bugReportId, policy: appliedPolicy,
      reproduction: (report.reproduction?.steps || []).filter(step =>
        step.visibility !== "hidden").slice(0, 100).map(step => ({
        type: "reproduction-step", evidenceId: step.reproductionStepId,
        instruction: evidencePolicy.redact(step.stepOverride?.fields?.instruction ||
          step.instruction) })), expectedResult: evidencePolicy.redact(
        report.expectedResult?.text), actualResult: evidencePolicy.redact(
        report.actualResult?.human?.text), facts,
      notes: appliedPolicy.includeHumanNotes ? (report.notes || []).slice(0, 20)
        .map(note => ({ type: "human-note", evidenceId: note.noteId,
          text: evidencePolicy.redact(note.text || note.content) })) : [],
      environment: appliedPolicy.includeEnvironment ? {
        productVersion: report.environment?.productVersion || "",
        browser: clone(report.environment?.browser || {}) } : {},
      missingEvidence: [...(!frames.length ? ["no-call-stack"] : []),
        ...(!telemetry.length ? ["no-telemetry-in-analysis"] : []),
        ...(!report.expectedResult?.text ? ["missing-expected-result"] : [])] };
    const sourceEvidenceFingerprint = fingerprint(input);
    const serialized = stable(input);
    return { ...input, sourceEvidenceFingerprint,
      size: { characters: serialized.length,
        estimatedTokens: Math.ceil(serialized.length / 4) },
      disclosure: evidencePolicy.disclosure(appliedPolicy) };
  }
  return { build, fingerprint, stableStringify: stable };
});
