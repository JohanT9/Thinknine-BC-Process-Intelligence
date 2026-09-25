const assert = require("assert");
const registry = require("../src/engine/process-decision-code-registry");

assert.strictEqual(registry.REGISTRY_VERSION, "1.0.0");
assert.strictEqual(new Set(registry.ENTRIES.map(item => item.code)).size,
  registry.ENTRIES.length);
assert.strictEqual(registry.resolve("process-action-hidden", "excluded").code,
  "BCPS-PROCESS-FILTER-002");
assert.strictEqual(registry.resolve("non-step-mechanic", "supporting").code,
  "BCPS-PROCESS-SUPPORT-001");
assert.deepStrictEqual(registry.assign("process-group-produced-task", "included", {
  subjectType: "step-group", normalizedEventCount: 3 }).map(item => item.code),
["BCPS-PROCESS-INCLUDE-001", "BCPS-PROCESS-MERGE-001"]);
assert.throws(() => registry.validate([{ id: "invalid", code: "X" }]),
  /Invalid process decision code/u);
assert.throws(() => registry.validate([
  { id: "same", code: "BCPS-PROCESS-X-001", domain: "x", outcome: "included" },
  { id: "same", code: "BCPS-PROCESS-X-002", domain: "x", outcome: "included" }
]), /Duplicate process decision id/u);

console.log("Stable process decision code registry tests passed.");
