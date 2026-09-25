const assert = require("assert");
const model = require("../src/engine/process-analysis-model");

const analysis = model.build({ recordingId: "recording:analysis",
  pipelineVersion: "1.3.0", normalizedEvents: [
    { normalizedEventId: "normalized:included", sourceEventIds: ["event:included"] },
    { normalizedEventId: "normalized:included-2", sourceEventIds: ["event:included-2"] },
    { normalizedEventId: "normalized:noise", sourceEventIds: ["event:noise"] },
    { normalizedEventId: "normalized:ignored", sourceEventIds: ["event:ignored"] },
    { normalizedEventId: "normalized:unknown", sourceEventIds: ["event:unknown"] }
  ], stepGroups: [
    { stepGroupId: "group:included", normalizedEventIds: ["normalized:included", "normalized:included-2"],
      sourceEventIds: ["event:included", "event:included-2"] },
    { stepGroupId: "group:ignored", normalizedEventIds: ["normalized:ignored"],
      sourceEventIds: ["event:ignored"], guidance: { ignored: true } }
  ], semanticActions: [
    { actionId: "action:included", stepGroupIds: ["group:included"] },
    { actionId: "action:ignored", stepGroupIds: ["group:ignored"] }
  ], businessTasks: [{ taskId: "task:included", stepGroupIds: ["group:included"],
    sourceEventIds: ["event:included", "event:included-2"] }],
  consolidationDecisions: [{ decisionId: "consolidation:1", outcome: "merged",
    decisionCode: "BCPS-PROCESS-MERGE-001", ruleId: "lookup-selection",
    confidence: "high", inputTaskIds: ["task:a", "task:b"],
    outputTaskId: "task:included", sourceEventIds: ["event:included"] }],
  supportingEvents: [{ normalizedEventId: "normalized:noise",
    classification: "noise", reason: "non-step-mechanic" }],
  groupingDiagnostics: { unassignedMeaningfulEventIds: ["normalized:unknown"] } });

assert.strictEqual(analysis.schemaVersion, 1);
assert.strictEqual(analysis.modelVersion, "1.4.0");
assert.strictEqual(analysis.decisionCodeRegistryVersion, "1.0.0");
assert.strictEqual(analysis.qualityGuardVersion, "1.0.0");
assert.strictEqual(analysis.contradictionEngineVersion, "1.0.0");
assert.strictEqual(analysis.qualityGate.status, "passed");
assert.strictEqual(analysis.contradictionAnalysis.status, "passed");
assert.strictEqual(analysis.contradictionAnalysis.languageAssessment,
  "insufficient-evidence");
assert.strictEqual(analysis.releaseGate.status, "passed");
assert.strictEqual(analysis.decisions.consolidations[0].decisionCode,
  "BCPS-PROCESS-MERGE-001");
assert.deepStrictEqual(analysis.decisions.consolidations[0].inputTaskIds,
  ["task:a", "task:b"]);
assert.deepStrictEqual(analysis.counts,
  { included: 3, supporting: 1, excluded: 2, unresolved: 1 });
assert.strictEqual(analysis.decisions.stepGroups[0].reasonCode,
  "process-group-produced-task");
assert.deepStrictEqual(analysis.decisions.stepGroups[0].decisionCodes.map(item => item.code),
  ["BCPS-PROCESS-INCLUDE-001", "BCPS-PROCESS-MERGE-001"]);
assert.strictEqual(analysis.decisions.stepGroups[1].reasonCode,
  "process-group-explicitly-ignored");
assert.strictEqual(analysis.decisions.stepGroups[1].decisionCode,
  "BCPS-PROCESS-FILTER-001");
assert.strictEqual(analysis.decisions.events[2].reasonCode, "non-step-mechanic");
assert.strictEqual(analysis.decisions.events[2].decisionCode,
  "BCPS-PROCESS-SUPPORT-001");
assert.strictEqual(analysis.decisions.events[4].reasonCode,
  "process-event-unassigned");
assert.strictEqual(analysis.decisions.events[4].decisionCode,
  "BCPS-PROCESS-TRACE-001");
assert(Object.isFrozen(analysis));
assert(Object.isFrozen(analysis.decisions.events));
assert.throws(() => model.normalize({ schemaVersion: 2 }),
  /Unsupported ProcessAnalysis schema/u);

console.log("Canonical ProcessAnalysis model tests passed.");
