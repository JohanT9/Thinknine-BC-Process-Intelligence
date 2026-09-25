(function (root, factory) {
  const evidenceModel = typeof module === "object" && module.exports
    ? require("./error-evidence-model") : root.T9ErrorEvidenceModel;
  const rules = typeof module === "object" && module.exports
    ? require("./error-analysis-rules") : root.T9ErrorAnalysisRules;
  const errorCodes = typeof module === "object" && module.exports
    ? require("./error-code-registry") : root.T9ErrorCodeRegistry;
  const diagnosis = typeof module === "object" && module.exports
    ? require("./error-diagnosis-engine") : root.T9ErrorDiagnosisEngine;
  const correlator = typeof module === "object" && module.exports
    ? require("./error-incident-correlator") : root.T9ErrorIncidentCorrelator;
  const privacy = typeof module === "object" && module.exports
    ? require("./error-privacy-classifier") : root.T9ErrorPrivacyClassifier;
  const api = factory(evidenceModel, rules, errorCodes, diagnosis, correlator, privacy);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ErrorAnalysisEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (evidenceModel, rules, errorCodes, diagnosis, correlator, privacy) {
  "use strict";

  const SCHEMA_VERSION = 1;
  const ENGINE_VERSION = "1.6.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => typeof value === "string" ? value : "";
  const confidenceRank = Object.freeze({ low: 1, medium: 2, high: 3 });

  function capturedFact(kind, value, evidenceId) {
    if (value == null || value === "") return null;
    return { kind, value: clone(value), provenance: "captured",
      sourceRef: String(evidenceId), confidence: "high" };
  }

  function derivedFact(kind, value, evidenceId, confidence, ruleId) {
    return { kind, value: clone(value), provenance: "derived",
      sourceRef: String(evidenceId), confidence, ruleId };
  }

  function classify(evidence = {}, diagnostic = {}) {
    return rules.evaluate(evidence, diagnostic);
  }

  function analyzeOne(value = {}, diagnosticsById = new Map()) {
    const evidence = evidenceModel.normalize(value);
    const id = evidence.evidenceId;
    const diagnostic = diagnosticsById.get(id) || {};
    const evaluatedClassification = classify(evidence, diagnostic);
    const assignedCode = errorCodes.resolve(evaluatedClassification.type);
    const classification = Object.freeze({ ...evaluatedClassification,
      errorCode: assignedCode.code, errorCodeDomain: assignedCode.domain,
      errorCodeRegistryVersion: errorCodes.REGISTRY_VERSION,
      provenance: { authorship: "derived", sourceRefs: [id],
        rulesetVersion: rules.RULESET_VERSION } });
    const diagnosisResult = diagnosis.diagnose(evidence, classification);
    const observation = { schemaVersion: 1, evidenceId: id,
      capturedAt: evidence.timestamp || null,
      sourceType: evidence.source.type,
      message: { raw: evidence.message.raw, display: evidence.message.display },
      category: evidence.category,
      technicalIdentifiers: clone(evidence.technicalIdentifiers),
      precedingAction: clone(evidence.precedingAction),
      screenshot: clone(evidence.screenshot),
      callStackAvailable: evidence.callStack.available,
      provenance: { authorship: "captured", sourceRef: id } };
    const facts = [
      capturedFact("error-message", evidence.message.raw, id),
      capturedFact("captured-at", evidence.timestamp, id),
      capturedFact("source-type", evidence.source.type, id),
      capturedFact("preceding-action-event", evidence.precedingAction.eventId, id),
      capturedFact("error-category", evidence.category, id),
      capturedFact("screenshot", evidence.screenshot.assetId, id),
      capturedFact("technical-identifiers", evidence.technicalIdentifiers, id),
      derivedFact("classification", classification.type, id,
        classification.confidence, classification.ruleId)
    ].filter(Boolean);
    const missingInformation = [];
    if (!evidence.message.raw.trim()) missingInformation.push("error-message");
    if (!evidence.screenshot.assetId) missingInformation.push("error-screenshot");
    if (!evidence.diagnostics.available) missingInformation.push("technical-diagnostics");
    if (["business-central-runtime", "al-runtime"].includes(classification.type) &&
        !evidence.callStack.available && !diagnostic.summary?.callStackAvailable) {
      missingInformation.push("al-call-stack");
    }
    return { errorEvidenceId: id, evidenceId: id, observation,
      classification, diagnosis: diagnosisResult, facts,
      missingInformation: [...new Set(missingInformation)],
      provenance: { source: "canonical-error-evidence",
        derivedBy: `error-analysis-engine@${ENGINE_VERSION}` } };
  }

  function primaryScore(item, index) {
    const confidence = confidenceRank[item.classification.confidence] || 0;
    const evidenceCompleteness = item.facts.filter(fact =>
      fact.provenance === "captured").length;
    return confidence * 10000 + index * 100 + evidenceCompleteness;
  }

  function analyze(errorEvidence = [], technicalDiagnostics = [], context = {}) {
    const normalizedEvidence = evidenceModel.normalizeMany(errorEvidence,
      { recordingId: context.recordingId });
    const diagnosticsById = new Map((technicalDiagnostics || []).map(item =>
      [String(item.errorEvidenceId || item.evidenceId || ""), item]));
    const observedErrors = normalizedEvidence.map(item =>
      analyzeOne(item, diagnosticsById));
    let primaryErrorEvidenceId = null;
    let bestScore = -1;
    observedErrors.forEach((item, index) => {
      const score = primaryScore(item, index);
      if (score >= bestScore) {
        bestScore = score;
        primaryErrorEvidenceId = item.evidenceId;
      }
    });
    const classifications = [...new Set(observedErrors.map(item =>
      item.classification.type))];
    const correlated = correlator.correlate(normalizedEvidence, observedErrors,
      { recordingId: context.recordingId });
    const privacyAssessments = normalizedEvidence.map(item => privacy.assess(item));
    return Object.freeze({ schemaVersion: SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      evidenceSchemaVersion: evidenceModel.SCHEMA_VERSION,
      rulesetVersion: rules.RULESET_VERSION,
      correlatorVersion: correlator.CORRELATOR_VERSION,
      diagnosisEngineVersion: diagnosis.DIAGNOSIS_ENGINE_VERSION,
      errorCodeRegistryVersion: errorCodes.REGISTRY_VERSION,
      privacyClassifierVersion: privacy.CLASSIFIER_VERSION,
      recordingId: String(context.recordingId || ""),
      primaryErrorEvidenceId, classifications,
      errorCodes: [...new Set(observedErrors.map(item =>
        item.classification.errorCode))], observedErrors,
      observations: observedErrors.map(item => item.observation),
      classificationResults: observedErrors.map(item => ({
        evidenceId: item.evidenceId, ...item.classification })),
      diagnosisResults: observedErrors.map(item => item.diagnosis),
      incidents: correlated.incidents,
      privacyAssessments,
      privacySummary: privacy.summarize(privacyAssessments),
      uncorrelatedEvidenceIds: correlated.uncorrelatedEvidenceIds,
      provenance: { sourceRefs: observedErrors.map(item => item.evidenceId),
        derivedBy: `error-analysis-engine@${ENGINE_VERSION}` } });
  }

  return { ENGINE_VERSION, SCHEMA_VERSION, analyze, analyzeOne, classify };
});
