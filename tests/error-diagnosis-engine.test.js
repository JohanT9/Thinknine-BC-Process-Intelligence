const assert = require("assert");
const evidenceModel = require("../src/bug-report/error-evidence-model");
const diagnosis = require("../src/bug-report/error-diagnosis-engine");

const evidence = evidenceModel.normalize({ kind: "error-evidence", schemaVersion: 1,
  evidenceId: "diagnosis:validation", recordingId: "diagnosis:recording",
  timestamp: "2026-09-22T14:00:00.000Z", sourceType: "business-central",
  category: "validation", message: { raw: "Quantity must have a value." } });
const validation = diagnosis.diagnose(evidence, {
  type: "data-validation", ruleId: "captured-validation-category",
  errorCode: "BCPS-VALIDATION-001"
});
assert.strictEqual(validation.status, "hypothesis");
assert.strictEqual(validation.hypotheses[0].code, "required-or-invalid-value");
assert.strictEqual(validation.hypotheses[0].confidence, "medium");
assert.strictEqual(validation.hypotheses[0].epistemicStatus, "hypothesis");
assert(validation.hypotheses[0].strengtheningEvidence.includes("affected-field"));
assert.strictEqual(validation.provenance.authorship, "derived");
assert.strictEqual(validation.provenance.classificationRuleId,
  "captured-validation-category");
assert.strictEqual(validation.limitationCode,
  "derived-diagnosis-is-not-observed-fact");

const al = diagnosis.diagnose(evidence, {
  type: "al-runtime", ruleId: "al-call-stack-present"
});
assert.strictEqual(al.hypotheses[0].code, "al-code-path-failure");
assert.strictEqual(al.hypotheses[0].confidence, "low",
  "a call stack must not be presented as a proven root cause");
assert(al.hypotheses[0].assumptions.includes(
  "call-stack-does-not-prove-root-cause"));

const unknown = diagnosis.diagnose(evidence, {
  type: "unclassified-error", ruleId: "insufficient-evidence"
});
assert.strictEqual(unknown.status, "insufficient-evidence");
assert.deepStrictEqual(unknown.hypotheses, []);
assert(Object.isFrozen(unknown.hypotheses));

for (const [type, code] of [
  ["permission", "missing-effective-permission"],
  ["integration-network", "network-or-upstream-unavailable"],
  ["client-technical", "client-runtime-exception"],
  ["business-central-posting", "business-central-operation-failure"],
  ["business-central-runtime", "business-central-operation-failure"]
]) {
  assert.strictEqual(diagnosis.diagnose(evidence, { type,
    ruleId: `test:${type}` }).hypotheses[0].code, code);
}

console.log("Observation-safe diagnosis layer tests passed.");
