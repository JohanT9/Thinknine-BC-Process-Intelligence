(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ErrorDiagnosisEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DIAGNOSIS_ENGINE_VERSION = "1.1.0";
  const deepFreeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };
  const hypothesis = (code, confidence, basis, strengtheningEvidence,
    assumptions = []) => ({ code, confidence, basis, strengtheningEvidence,
      assumptions, epistemicStatus: "hypothesis" });

  function diagnose(evidence = {}, classification = {}) {
    const evidenceId = String(evidence.evidenceId || "");
    if (!evidenceId) throw new TypeError("Diagnosis requires ErrorEvidence identity.");
    const message = String(evidence.message?.raw || "");
    const type = String(classification.type || "unclassified-error");
    let candidate = null;
    if (type === "data-validation") {
      candidate = hypothesis("required-or-invalid-value",
        /(?:must have a value|måste ha ett värde|required|cannot be empty|får inte vara tom)/iu
          .test(message) ? "medium" : "low",
        ["observation.message", "classification.data-validation"],
        ["affected-field", "submitted-value", "business-rule"]);
    } else if (type === "permission") {
      candidate = hypothesis("missing-effective-permission", "medium",
        ["observation.message", "classification.permission"],
        ["user-permission-set", "required-object-permission", "company-context"]);
    } else if (type === "integration-network") {
      candidate = hypothesis("network-or-upstream-unavailable", "medium",
        ["observation.source", "classification.integration-network"],
        ["http-status", "request-url", "response-body", "correlation-id"],
        ["network-or-upstream-origin-uncertain"]);
    } else if (type === "client-technical") {
      candidate = hypothesis("client-runtime-exception", "medium",
        ["observation.message", "classification.client-technical"],
        ["client-stack", "page-url", "browser-version"]);
    } else if (type === "al-runtime") {
      candidate = hypothesis("al-code-path-failure", "low",
        ["observation.call-stack", "classification.al-runtime"],
        ["first-failing-frame", "exception-type", "telemetry-event"],
        ["call-stack-does-not-prove-root-cause"]);
    } else if (["business-central-posting", "business-central-runtime"].includes(type)) {
      candidate = hypothesis("business-central-operation-failure", "low",
        ["observation.message", `classification.${type}`],
        ["al-call-stack", "client-activity-id", "server-telemetry"]);
    }
    const result = { schemaVersion: 1,
      diagnosisEngineVersion: DIAGNOSIS_ENGINE_VERSION,
      evidenceId,
      status: candidate ? "hypothesis" : "insufficient-evidence",
      hypotheses: candidate ? [candidate] : [],
      provenance: { authorship: "derived",
        sourceRefs: [evidenceId],
        classificationRuleId: classification.ruleId || null,
        errorCode: classification.errorCode || null },
      limitationCode: "derived-diagnosis-is-not-observed-fact" };
    return deepFreeze(result);
  }

  return { DIAGNOSIS_ENGINE_VERSION, diagnose };
});
