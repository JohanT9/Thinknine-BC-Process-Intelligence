const assert = require("assert");
const fs = require("fs");
const path = require("path");
const processModel = require("../src/document/process-model");
const hierarchy = require("../src/review/documentation-hierarchy");
const intelligence = require("../src/document/documentation-intelligence");
const profiles = require("../src/document/document-profile");

const steps = ["Select customer", "Add item", "Enter quantity", "Release order",
  "Create shipment", "Create pick", "Register pick", "Post shipment"]
  .map((instruction, index) => ({ taskId: `step-${index + 1}`, instruction,
    sourceEventIds: [`event-${index + 1}`],
    sourceSemanticActionIds: [`action-${index + 1}`] }));

let state = hierarchy.createSection(hierarchy.empty("recording-1"), "Sales Order",
  steps.slice(0, 4).map(step => step.taskId), { sectionId: "sales",
    now: "2026-08-11T08:00:00.000Z" }).state;
state = hierarchy.createSection(state, "Warehouse",
  steps.slice(4).map(step => step.taskId), { sectionId: "warehouse",
    now: "2026-08-11T08:00:00.000Z" }).state;
state = hierarchy.createSubtask(state, "warehouse", "Picking",
  ["step-6", "step-7"], { subtaskId: "picking",
    now: "2026-08-11T08:00:00.000Z" }).state;
const resolved = hierarchy.resolve(steps, state);
const input = { recordingId: "recording-1", title: "Order to shipment",
  resolvedHierarchy: resolved, createdAt: "2026-08-11T08:00:00.000Z",
  futureFields: { extension: true } };
const before = JSON.stringify(input);
const model = processModel.project(input);

assert.equal(model.schemaVersion, "1.0.0");
assert.equal(model.modelVersion, processModel.MODEL_VERSION);
assert.ok(model.processModelId.startsWith("process-model:"));
assert.ok(Object.isFrozen(model));
assert.deepEqual(model.futureFields, { extension: true });
assert.deepEqual(processModel.NODE_TYPES,
  ["start", "activity", "decision", "end", "subprocess", "information"]);
assert.deepEqual(processModel.TRANSITION_TYPES,
  ["sequence", "conditional", "alternate", "return", "unknown"]);
assert.equal(model.nodes[0].nodeType, "start");
assert.equal(model.nodes.at(-1).nodeType, "end");
assert.equal(model.nodes.filter(node => node.nodeType === "activity").length, 8);
assert.equal(model.transitions.length, 9);
assert(model.transitions.every(value => value.transitionType === "sequence"));
assert.equal(model.subprocesses.filter(value =>
  value.metadata.containerType === "phase").length, 2);
assert.equal(model.subprocesses.find(value => value.sourceSubtaskId === "picking")
  .nodeIds.length, 2);
assert(!model.nodes.some(node => node.title === "Sales Order"),
  "Sections must not become fake activities.");
assert.deepEqual(model.nodes.find(node => node.title === "Create pick").sourceEventIds,
  ["event-6"]);
assert.equal(JSON.stringify(input), before, "Projection must not mutate inputs.");
assert.deepEqual(processModel.project(input), model, "Projection must be deterministic.");
assert.equal(processModel.validate(model).valid, true);
assert.equal(processModel.outline(model).length, 10);

const manualSteps = [{ taskId: "pre", manualStepId: "pre", manuallyAdded: true,
  provenance: "manual", stepType: "prerequisite", instruction: "Setup complete" },
{ taskId: "warn", manualStepId: "warn", manuallyAdded: true,
  provenance: "manual", stepType: "warning", instruction: "Check carefully" },
{ taskId: "verify", manualStepId: "verify", manuallyAdded: true,
  provenance: "manual", stepType: "verification", instruction: "Verify result",
  metadata: { processActivity: true } },
{ taskId: "hidden", instruction: "Hidden", visibility: "hidden",
  sourceEventIds: ["event-hidden"] }];
const manualModel = processModel.project({ recordingId: "manual", steps: manualSteps });
assert.equal(manualModel.nodes.find(node => node.title === "Setup complete").nodeType,
  "information");
assert(!manualModel.nodes.some(node => node.title === "Check carefully"));
assert.equal(manualModel.nodes.find(node => node.title === "Verify result").nodeType,
  "activity");
assert(!manualModel.nodes.some(node => node.title === "Hidden"));

const merged = processModel.project({ recordingId: "merge", steps: [{
  taskId: "merged", instruction: "Combined action",
  sourceEventIds: ["event-a", "event-b"], sourceStepIds: ["a", "b"]
}] });
assert.equal(merged.nodes.filter(node => node.nodeType === "activity").length, 1);
assert.deepEqual(merged.nodes.find(node => node.nodeType === "activity").sourceEventIds,
  ["event-a", "event-b"]);
assert.deepEqual(merged.nodes.find(node => node.nodeType === "activity").sourceStepIds,
  ["a", "b"]);
const split = processModel.project({ recordingId: "split", steps: [{ taskId: "split-a",
  instruction: "First" }, { taskId: "split-b", instruction: "Second" }] });
assert.equal(split.nodes.filter(node => node.nodeType === "activity").length, 2);

const activityId = model.nodes.find(node => node.nodeType === "activity").nodeId;
const renamed = processModel.project({ ...input, steps: undefined,
  resolvedHierarchy: hierarchy.resolve([{ ...steps[0], instruction: "Improved title" },
    ...steps.slice(1)], state), overrides: [{ type: "rename-node",
    targetNodeId: activityId, title: "Consultant title" }] });
assert.equal(renamed.nodes.find(node => node.nodeId === activityId).title,
  "Consultant title");
assert.equal(renamed.nodes.find(node => node.nodeId === activityId).provenance,
  "user-adjusted");

const decisionOverride = processModel.normalizeOverride({ type: "create-decision",
  processOverrideId: "decision-stock", manualNodeId: "stock", title: "Stock available?",
  processOrder: 1 });
const decisionId = processModel.stableId("manual-process-node",
  ["decision-recording", "stock"]);
const shipId = processModel.stableId("process-node",
  [processModel.MODEL_VERSION, "decision-recording", "step", "ship"]);
const replenishId = processModel.stableId("process-node",
  [processModel.MODEL_VERSION, "decision-recording", "step", "replenish"]);
const decision = processModel.project({ recordingId: "decision-recording",
  steps: [{ taskId: "ship", instruction: "Ship" },
    { taskId: "replenish", instruction: "Replenish" }], overrides: [decisionOverride,
    { type: "create-transition", fromNodeId: decisionId, toNodeId: shipId,
      transitionType: "conditional", label: "Yes", condition: "stock-available" },
    { type: "create-transition", fromNodeId: decisionId, toNodeId: replenishId,
      transitionType: "conditional", label: "No", condition: "stock-unavailable" }] });
assert.equal(decision.nodes.find(node => node.nodeId === decisionId).provenance, "manual");
assert.equal(decision.transitions.filter(value =>
  value.transitionType === "conditional").length, 2);
assert.equal(decision.transitions.filter(value => value.fromNodeId === decisionId).length, 2,
  "An explicit decision must not gain a fabricated default branch.");
assert(!processModel.project({ recordingId: "revisit", steps: [{ taskId: "one",
  instruction: "Open page" }, { taskId: "two", instruction: "Open page" }] })
  .transitions.some(value => value.transitionType === "return"));

const orphan = processModel.project({ ...input, overrides: [{ type: "rename-node",
  targetNodeId: "missing", title: "Preserved" }] });
assert.equal(orphan.orphanedOverrides.length, 1);
assert(processModel.validate(orphan).diagnostics.some(value =>
  value.code === "orphaned-process-override"));

const differentOrder = processModel.project({ ...input, overrides: [{
  type: "set-process-order", nodeIds: model.nodes.filter(node =>
    node.nodeType === "activity").map(node => node.nodeId).reverse()
}] });
const firstActivity = differentOrder.nodes.find(node => node.nodeType === "activity");
assert.notEqual(firstActivity.recordedOrder, firstActivity.processOrder);

const broken = processModel.validate({ ...model,
  transitions: [...model.transitions, { transitionId: "bad", fromNodeId: "missing",
    toNodeId: model.endNodeIds[0], transitionType: "unknown", provenance: "manual" }] });
assert.equal(broken.valid, false);
assert(broken.diagnostics.some(value => value.code === "orphan-transition"));

const profile = profiles.get(profiles.BUILT_IN_REGISTRY, "business-process");
assert.equal(profile.processExpectations.relevance, "high");
const guidance = intelligence.create({ document: { documentId: "doc", sections: [] },
  plan: { planId: "plan" }, qualityDiagnostics: { findings: [] }, profile,
  processDiagnostics: { diagnostics: [{ code: "unreachable-node",
    severity: "warning", nodeId: "node" }] } });
assert(guidance.items.some(item => item.diagnosticId.startsWith("process:")));

const largeSteps = Array.from({ length: 5000 }, (_, index) => ({
  taskId: `large-${index}`, instruction: `Activity ${index}`,
  sourceEventIds: [`event-${index}`] }));
const started = Date.now();
const large = processModel.project({ recordingId: "large", steps: largeSteps });
assert.equal(large.nodes.length, 5002);
assert(Date.now() - started < 5000, "Projection should remain near-linear.");

const source = fs.readFileSync(path.join(__dirname,
  "../src/document/process-model.js"), "utf8");
for (const forbidden of ["word", "docx", "draw.io", "bpmn", "document.",
  "fetch(", "XML", "svg"]) {
  assert(!source.toLowerCase().includes(forbidden.toLowerCase()),
    `Process Model must remain renderer and DOM neutral: ${forbidden}`);
}

console.log("Process Model and validation tests passed.");
