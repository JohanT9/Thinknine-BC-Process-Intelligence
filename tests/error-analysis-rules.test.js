const assert = require("assert");
const evidenceModel = require("../src/bug-report/error-evidence-model");
const rules = require("../src/bug-report/error-analysis-rules");

const base = {
  kind: "error-evidence", schemaVersion: 1,
  evidenceId: "rule:evidence", recordingId: "rule:recording",
  timestamp: "2026-09-22T10:00:00.000Z",
  message: { raw: "Quantity must have a value." },
  category: "validation"
};
const validation = evidenceModel.normalize(base);
const validationResult = rules.evaluate(validation);
assert.deepStrictEqual({ type: validationResult.type,
  confidence: validationResult.confidence, ruleId: validationResult.ruleId }, {
  type: "data-validation", confidence: "high",
  ruleId: "captured-validation-category"
});
assert.strictEqual(validationResult.priority, 900);
assert.strictEqual(validationResult.reasonCode, "captured-error-category");
assert(validationResult.requiredEvidence.includes("category=validation"));
assert(validationResult.strengtheningEvidence.includes("screenshot.assetId"));
assert.strictEqual(validationResult.rulesetVersion, rules.RULESET_VERSION);

const stackWins = rules.evaluate(validation, {
  summary: { callStackAvailable: true }
});
assert.strictEqual(stackWins.ruleId, "al-call-stack-present",
  "higher-priority call-stack evidence must win over a validation category");

const canonicalNetwork = evidenceModel.normalize({ ...base,
  evidenceId: "rule:network", sourceType: "network",
  category: "unknown", message: { raw: "Gateway unavailable" }
});
const networkResult = rules.evaluate(canonicalNetwork);
assert.strictEqual(networkResult.ruleId, "captured-network-source");
assert.strictEqual(networkResult.confidence, "high");

const fallback = rules.evaluate(evidenceModel.normalize({ ...base,
  evidenceId: "rule:unknown", category: "unknown",
  message: { raw: "Unexpected result" }
}));
assert.strictEqual(fallback.ruleId, "insufficient-evidence");
assert(fallback.strengtheningEvidence.includes("technicalIdentifiers"));

const customRegistry = rules.createRegistry([
  { id: "fallback", priority: 0, classification: "fallback",
    confidence: "low", reasonCode: "fallback", matches: () => true },
  { id: "specific", priority: 10, classification: "specific",
    confidence: "high", reasonCode: "specific", matches: () => true }
]);
assert.strictEqual(customRegistry.evaluate(validation).ruleId, "specific",
  "registry order must be derived from priority, not input order");
assert.throws(() => rules.createRegistry([
  { id: "duplicate", priority: 1, classification: "a", confidence: "low",
    reasonCode: "a", matches: () => true },
  { id: "duplicate", priority: 2, classification: "b", confidence: "high",
    reasonCode: "b", matches: () => true }
]), /Duplicate error-analysis rule/u);
assert(Object.isFrozen(rules.BUILT_IN_RULES));

console.log("Prioritized error-analysis rule registry tests passed.");
