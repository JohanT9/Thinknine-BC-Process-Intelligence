const assert = require("assert");
const guard = require("../src/engine/process-quality-guard");

const result = guard.evaluate({ normalizedEvents: [
  { normalizedEventId: "normalized:1", sourceEventIds: ["event:1"] }
], stepGroups: [
  { stepGroupId: "group:result", sourceEventIds: ["event:result"],
    normalizedEvents: [{ kind: "status-message" }], interactionIds: ["i:1"] },
  { stepGroupId: "group:merge", sourceEventIds: ["event:2", "event:3"],
    normalizedEvents: [{ kind: "activation" }, { kind: "value-change" }],
    interactionIds: ["i:2", "i:3"], groupingReason: ["same-control"] }
], businessTasks: [
  { taskId: "task:missing-trace", stepGroupIds: [] },
  { taskId: "task:mismatch", sourceEventIds: ["event:1"],
    stepGroupIds: [], fieldCaption: "Customer", selectedCaption: "C001",
    semanticActionModel: { targetField: "Customer Name", selectedValue: "C002" } },
  { taskId: "task:result", sourceEventIds: ["event:result"],
    stepGroupIds: ["group:result"] },
  { taskId: "task:merge", sourceEventIds: ["event:2", "event:3"],
    stepGroupIds: ["group:merge"] }
] });

assert.strictEqual(result.guardVersion, "1.0.0");
assert.strictEqual(result.status, "blocked");
assert.deepStrictEqual(new Set(result.findings.map(item => item.code)), new Set([
  "BCPS-PROCESS-GUARD-TRACE-001", "BCPS-PROCESS-GUARD-FIELD-001",
  "BCPS-PROCESS-GUARD-VALUE-001", "BCPS-PROCESS-GUARD-RESULT-001",
  "BCPS-PROCESS-GUARD-MERGE-001"
]));
assert.strictEqual(result.counts.blocked, 4);
assert.strictEqual(result.counts.review, 1);
assert(!JSON.stringify(result).includes("Customer Name"),
  "guard findings must not copy captured business values");

const allowed = guard.evaluate({ normalizedEvents: [{ normalizedEventId: "n" }],
  stepGroups: [{ stepGroupId: "g", interactionIds: ["a", "b"],
    groupingReason: ["confirmation-dialog"], normalizedEvents: [{ kind: "activation" }] }],
  businessTasks: [{ taskId: "t", sourceEventIds: ["e"], stepGroupIds: ["g"],
    fieldCaption: "Quantity", selectedCaption: "500",
    semanticActionModel: { targetField: "Quantity", selectedValue: "500" } }] });
assert.strictEqual(allowed.status, "passed");

console.log("Process quality guard tests passed.");
