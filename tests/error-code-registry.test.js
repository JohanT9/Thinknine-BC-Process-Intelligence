const assert = require("assert");
const codes = require("../src/bug-report/error-code-registry");
const rules = require("../src/bug-report/error-analysis-rules");

const expected = {
  "data-validation": "BCPS-VALIDATION-001",
  permission: "BCPS-PERMISSION-001",
  "al-runtime": "BCPS-AL-RUNTIME-001",
  "business-central-runtime": "BCPS-BC-RUNTIME-001",
  "business-central-posting": "BCPS-POSTING-001",
  "integration-network": "BCPS-NETWORK-001",
  "client-technical": "BCPS-CLIENT-001",
  "unclassified-error": "BCPS-UNKNOWN-001"
};
assert.strictEqual(codes.REGISTRY_VERSION, "1.0.0");
for (const [classification, code] of Object.entries(expected)) {
  const entry = codes.resolve(classification);
  assert.strictEqual(entry.code, code);
  assert.strictEqual(entry.classification, classification);
  assert(codes.CODE_PATTERN.test(entry.code));
  assert.strictEqual(codes.find(code), entry);
  assert(Object.isFrozen(entry));
}
assert.strictEqual(codes.resolve("unknown").code, "BCPS-UNKNOWN-001");
assert.strictEqual(codes.resolve("future-classification").code,
  "BCPS-UNKNOWN-001", "future classifications must fail safely to a stable code");
assert.strictEqual(codes.find("BCPS-NOT-REGISTERED-999"), null);

const ruleClassifications = new Set(rules.BUILT_IN_RULES.map(item =>
  item.classification));
for (const classification of ruleClassifications) {
  assert(codes.resolve(classification).code,
    `classification ${classification} must have a stable code`);
}
assert.strictEqual(new Set(codes.ENTRIES.map(item => item.code)).size,
  codes.ENTRIES.length);
assert.throws(() => codes.createRegistry([
  { code: "BCPS-TEST-001", classification: "first", domain: "test",
    status: "active" },
  { code: "BCPS-TEST-001", classification: "second", domain: "test",
    status: "active" }
]), /Duplicate error code/u);
assert.throws(() => codes.createRegistry([
  { code: "unstable", classification: "invalid", domain: "test",
    status: "active" }
]), /Invalid error-code registry entry/u);

console.log("Stable error-code registry tests passed.");
