const assert = require("assert");
const refs = require("../src/engine/source-reference");
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const semantic = require("../src/document/semantic-interaction-engine");
const projector = require("../src/document/review-document-projector");
const planner = require("../src/document/document-planner");
const themes = require("../src/document/document-theme-registry");
const merge = require("../src/review/review-merge");
const split = require("../src/review/review-split");
const workspace = require("../src/document/document-workspace");

const recordingId = "trace-recording";
const raw = { sourceEventId: "frame:quantity:1", type: "field-change",
  timestamp: "2026-08-12T08:00:00.000Z", fieldName: "Quantity", value: "500",
  previousValue: "", inputSource: "change", automationId: "Quantity" };
const eventId = `${recordingId}:event:${raw.sourceEventId}`;
const identified = identify.identify({ ...raw, pageId: "42", role: "textbox",
  controlType: "input" }, { eventId });
const recorded = canonical.addEvent(canonical.create({ id: recordingId }), raw,
  identified);
const normalized = normalization.normalizeRecording(recorded);
const grouped = grouping.group(normalized);
const action = semantic.processStepGroups(grouped.groups)[0];

assert.deepStrictEqual(normalized.events[0].sourceEventIds, [eventId]);
assert.deepStrictEqual(grouped.groups[0].sourceEventIds, [eventId]);
assert.deepStrictEqual(action.sourceEventIds, [eventId]);
assert.deepStrictEqual(action.normalizedEventIds,
  [normalized.events[0].normalizedEventId]);
assert.deepStrictEqual(action.stepGroupIds, [grouped.groups[0].stepGroupId]);
assert.ok(action.actionId.includes("stepGroupIds"));

const task = { taskId: action.actionId, recordingId, instruction: action.displayText,
  sourceEventIds: action.sourceEventIds,
  normalizedEventIds: action.normalizedEventIds,
  stepGroupIds: action.stepGroupIds, semanticActionIds: [action.actionId],
  screenshots: ["trace.png"] };
const review = { sessionId: recordingId, sessionName: "Trace", tasks: [task],
  annotations: { screenshotSets: [{ annotationSetId: "trace-set",
    screenshotRef: "trace.png", items: [{ annotationId: "trace-annotation",
      type: "rectangle" }] }] } };
const projected = projector.project(review, { session: { id: recordingId,
  name: "Trace", settings: {} } }).document;
const step = projected.sections.find(section => section.kind === "workflow")
  .blocks.find(block => block.kind === "step");
assert.deepStrictEqual(step.sourceRef.sourceEventIds, [eventId]);
assert.deepStrictEqual(step.sourceRef.normalizedEventIds,
  [normalized.events[0].normalizedEventId]);
assert.deepStrictEqual(step.sourceRef.stepGroupIds, [grouped.groups[0].stepGroupId]);
assert.deepStrictEqual(step.sourceRef.semanticActionIds, [action.actionId]);
const image = step.blocks.find(block => block.kind === "image");
assert.deepStrictEqual(image.sourceRef.sourceEventIds, [eventId]);
assert.strictEqual(image.annotationRefs[0].annotationId, "trace-annotation");

const plan = planner.plan(projected, themes.resolve(
  themes.BUILT_IN_REGISTRY, "thinknine"));
function flattenComponents(components) {
  return (components || []).flatMap(component => [component,
    ...flattenComponents(component.components)]);
}
const plannedStep = flattenComponents([
  ...plan.components,
  ...plan.sections.flatMap(section => section.components || [])
]).find(component => component.sourceRef?.blockId === step.blockId);
assert.deepStrictEqual(plannedStep.sourceRef.sourceEventIds, [eventId]);
assert.deepStrictEqual(plannedStep.sourceRef.semanticActionIds, [action.actionId]);
const workspaceModel = workspace.render(plan);
const workspaceStep = workspaceModel.sections.flatMap(section => section.items)
  .find(item => item.sourceRef?.blockId === step.blockId);
assert.deepStrictEqual(workspaceStep.sourceRef.sourceEventIds, [eventId]);

const legacy = projector.project({ sessionId: "legacy", sessionName: "Legacy",
  tasks: [{ taskId: "legacy-step", instruction: "Legacy", sourceEventNos: [7] }] },
{ session: { id: "legacy", name: "Legacy", settings: {} } }).document;
const legacyStep = legacy.sections.find(section => section.kind === "workflow")
  .blocks.find(block => block.kind === "step");
assert.deepStrictEqual(legacyStep.sourceRef.legacyEventNos, ["7"]);
assert.strictEqual(legacyStep.sourceRef.sourceEventIds, undefined);

const second = { ...task, taskId: `${action.actionId}:second`,
  sourceEventIds: [`${recordingId}:event:second`] };
const merged = merge.merge([task, second], [task.taskId, second.taskId]).mergedTask;
assert.deepStrictEqual(merged.sourceEventIds,
  [eventId, `${recordingId}:event:second`]);
const parts = split.split([merged], merged.taskId, { segments: ["A", "B"] })
  .splitTasks;
assert(parts.every(part => part.sourceEventIds.includes(eventId)));

assert.deepStrictEqual(refs.normalize({ sourceEventNos: [1, 2] }),
  { legacyEventNos: ["1", "2"] });
assert.strictEqual(refs.normalize({ sourceEventNos: [1] }).sourceEventIds,
  undefined);

console.log("Canonical traceability tests passed.");
