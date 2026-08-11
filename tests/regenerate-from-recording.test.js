const assert = require("assert");
const regeneration = require("../src/document/regenerate-from-recording");
const processModel = require("../src/document/process-model");
const processVersioning = require("../src/document/process-versioning");
const library = require("../src/document/document-library");
const intelligence = require("../src/document/documentation-intelligence");

const NOW = "2026-08-11T12:00:00.000Z";
const VERSIONS = Object.fromEntries(regeneration.PIPELINE_COMPONENTS.map(key =>
  [key, key === "processModelVersion" ? processModel.MODEL_VERSION : "2.0.0"]));
const canonical = { recordingId: "recording-1", schemaVersion: "1.0.0",
  events: [{ eventId: "event-1", raw: { value: "1033" } },
    { eventId: "event-2", raw: { value: "136" } },
    { eventId: "event-3", raw: { value: "[quantity]" } }],
  futureFields: { retained: true } };

const previousSteps = [{ taskId: "old-customer", stepGroupId: "group-customer",
  instruction: "Technical customer selection", sourceEventIds: ["event-1"],
  sourceScreenshotAssetIds: ["shot-old"] },
{ taskId: "old-item", stepGroupId: "group-item", instruction: "Technical item event",
  sourceEventIds: ["event-2"], sourceScreenshotAssetIds: ["shot-item"] },
{ taskId: "old-quantity", stepGroupId: "group-quantity", instruction: "Enter quantity",
  sourceEventIds: ["event-3"] }];
const nextSteps = [{ taskId: "new-customer", stepGroupId: "group-customer",
  instruction: "Select Customer 1033.", sourceEventIds: ["event-1"],
  sourceScreenshotAssetIds: ["shot-new"], selectedScreenshotAssetId: "shot-new" },
{ taskId: "new-item", stepGroupId: "group-item", instruction: "Select No. 136.",
  sourceEventIds: ["event-2"], sourceScreenshotAssetIds: ["shot-item"] },
{ taskId: "new-quantity", stepGroupId: "group-quantity",
  instruction: "Enter [quantity] in Quantity.", sourceEventIds: ["event-3"] }];
const previousProcess = processModel.project({ recordingId: "recording-1",
  steps: previousSteps });
const nextProcess = processModel.project({ recordingId: "recording-1", steps: nextSteps });
const oldCustomerNode = previousProcess.nodes.find(node =>
  node.sourceStepIds.includes("old-customer"));

const historical = processVersioning.createVersion(previousProcess, {
  versionNumber: "1.0", baseline: true, createdAt: NOW }).version;
const historyBefore = JSON.stringify([historical]);
const previousRevision = regeneration.revision({ steps: previousSteps,
  processModel: previousProcess }, { recordingId: "recording-1", completedAt: NOW,
  pipelineVersions: Object.fromEntries(regeneration.PIPELINE_COMPONENTS.map(key =>
    [key, "1.0.0"])) });

const userState = {
  stepOverrides: [{ overrideId: "comment", stepId: "old-customer",
    fields: { comment: "Consultant comment" }, sourceEventIds: ["event-1"] },
  { overrideId: "instruction", stepId: "old-item",
    fields: { instruction: "Consultant item wording" }, sourceEventIds: ["event-2"],
    screenshotOverride: { selectedScreenshotAssetId: "shot-item" } }],
  structureOverrides: [{ structureOverrideId: "hide", type: "hide",
    sourceStepIds: ["old-quantity"], sourceEventIds: ["event-3"] },
  { structureOverrideId: "merge", type: "merge",
    sourceStepIds: ["old-customer", "old-item"],
    sourceEventIds: ["event-1", "event-2"] }],
  manualSteps: [{ manualStepId: "manual-1", instruction: "Verify setup",
    positionAnchor: { relation: "after", targetStepId: "old-item" } }],
  notes: [{ noteId: "note-1", ownerType: "step", ownerId: "old-customer",
    content: "Customer workshop note" }],
  annotations: { screenshotSets: [{ screenshotRef: "shot-item", items: [{
    annotationId: "annotation-1", geometry: { x: 0.1, y: 0.1 } }] }] },
  hierarchy: { sections: [{ sectionId: "manual-sales", title: "Sales" }],
    subtasks: [{ subtaskId: "manual-lines", sectionId: "manual-sales",
      title: "Lines" }], assignments: [{ stepId: "old-item",
      sectionId: "manual-sales", subtaskId: "manual-lines" }],
    overrides: [{ type: "create-section", targetId: "manual-sales" }] },
  processOverrides: [{ processOverrideId: "rename-customer", type: "rename-node",
    targetNodeId: oldCustomerNode.nodeId, title: "Choose customer" }],
  customFutureState: { preserved: true }
};

let generatorCalls = 0;
const canonicalBefore = JSON.stringify(canonical);
const preview = regeneration.prepare({ recordingId: "recording-1", canonicalRecording: canonical,
  sourceCanonicalRevision: 7, previousGeneratedState: { steps: previousSteps,
    processModel: previousProcess }, previousDerivedRevision: previousRevision,
  pipelineVersions: VERSIONS, processVersions: [historical], userState,
  availableScreenshotAssetIds: ["shot-item", "shot-new"], dryRun: true,
  startedAt: NOW, completedAt: "2026-08-11T12:01:00.000Z",
  workspaceContext: { selectedStepId: "old-customer", selectedSectionId: "workflow" },
  futureFields: { future: true }, generate(recording) {
    generatorCalls += 1;
    recording.events[0].raw.value = "changed only in detached input";
    return { steps: nextSteps, processModel: nextProcess,
      screenshotAssets: [{ screenshotAssetId: "shot-item" },
        { screenshotAssetId: "shot-new" }] };
  } });

assert.equal(generatorCalls, 1);
assert.equal(JSON.stringify(canonical), canonicalBefore,
  "Canonical Recording must remain structurally identical.");
assert.equal(JSON.stringify([historical]), historyBefore,
  "Historical Process Versions must remain unchanged.");
assert.equal(preview.result.schemaVersion, "1.0.0");
assert.equal(preview.result.regenerationVersion, "1.0.0");
assert.equal(preview.result.status, "preview");
assert.equal(preview.result.sourceCanonicalRevision, 7);
assert.equal(preview.result.previousDerivedRevision, previousRevision.derivedRevisionId);
assert.equal(preview.result.newDerivedRevision, preview.derivedRevision.derivedRevisionId);
assert.deepEqual(preview.result.futureFields, { future: true });
assert(Object.isFrozen(preview) && Object.isFrozen(preview.derivedRevision));
assert.equal(preview.derivedRevision.pipelineVersions.normalizationVersion, "2.0.0");
assert.ok(preview.derivedRevision.semanticFingerprint);
assert.ok(preview.derivedRevision.stepFingerprint);
assert.ok(preview.derivedRevision.processFingerprint);
assert.equal(preview.validation.valid, true);

assert.equal(preview.changeSet.changedGeneratedSteps.length, 3,
  "Untouched generated content may improve.");
assert.equal(preview.changeSet.screenshotChanges.length, 1);
assert.equal(preview.changeSet.hierarchyChanges.length, 1);
assert.equal(preview.reconciledUserState.stepOverrides[0].stepId, "new-customer");
assert.equal(preview.reconciledUserState.stepOverrides[0].fields.comment,
  "Consultant comment");
assert.equal(preview.reconciledUserState.stepOverrides[1].fields.instruction,
  "Consultant item wording");
assert.equal(preview.reconciledUserState.stepOverrides[1].screenshotOverride
  .selectedScreenshotAssetId, "shot-item");
assert.equal(preview.freshGeneratedState.steps[0].instruction, "Select Customer 1033.");
assert.equal(preview.freshGeneratedState.steps[0].selectedScreenshotAssetId, "shot-new",
  "New automatic selection remains available separately.");
assert.equal(preview.reconciledUserState.structureOverrides.length, 2);
assert.equal(preview.reconciledUserState.structureOverrides[0].sourceStepIds[0],
  "new-quantity");
assert.equal(preview.reconciledUserState.manualSteps[0].manualStepId, "manual-1");
assert.equal(preview.reconciledUserState.manualSteps[0].positionAnchor.targetStepId,
  "new-item");
assert.equal(preview.reconciledUserState.notes[0].ownerId, "new-customer");
assert.deepEqual(preview.reconciledUserState.annotations, userState.annotations,
  "Screenshot-owned annotation state must not move or disappear.");
assert.equal(preview.reconciledUserState.hierarchy.sections[0].sectionId,
  "manual-sales");
assert.equal(preview.reconciledUserState.hierarchy.subtasks[0].subtaskId,
  "manual-lines");
assert.equal(preview.reconciledUserState.hierarchy.assignments[0].stepId, "new-item");
assert.equal(preview.reconciledUserState.processOverrides[0].type, "rename-node");
assert.notEqual(preview.reconciledUserState.processOverrides[0].targetNodeId,
  oldCustomerNode.nodeId);
assert.deepEqual(preview.reconciledUserState.customFutureState, { preserved: true });
assert.equal(preview.resolvedRegeneratedProject.workspaceContext.selectedStepId,
  "new-customer");
assert(preview.resolvedRegeneratedProject.workspaceContext.announcement);
assert.equal(preview.changeSet.processChanges.summary.changed, false,
  "Generated wording improvements are not semantic process changes.");

const repeat = regeneration.prepare({ recordingId: "recording-1",
  canonicalRecording: canonical, previousGeneratedState: { steps: previousSteps,
    processModel: previousProcess }, previousDerivedRevision: previousRevision,
  pipelineVersions: VERSIONS, processVersions: [historical], userState,
  availableScreenshotAssetIds: ["shot-item", "shot-new"], dryRun: true,
  startedAt: NOW, completedAt: "2026-08-11T12:01:00.000Z",
  generate: () => ({ steps: nextSteps, processModel: nextProcess }) });
assert.equal(repeat.derivedRevision.derivedRevisionId,
  preview.derivedRevision.derivedRevisionId, "Derived revision identity is deterministic.");

let commits = 0;
const applied = regeneration.apply(preview, { commit(payload) {
  commits += 1;
  assert.equal(payload.expectedActiveRevisionId, previousRevision.derivedRevisionId);
  assert.strictEqual(payload.resolvedProject.generatedState,
    payload.resolvedProject.generatedState,
    "Workspace and export receive the same active resolved project payload.");
  return { transactionId: "tx-1" };
} });
assert.equal(applied.applied, true);
assert.equal(commits, 1);
assert.equal(applied.previousDerivedRevisionId, previousRevision.derivedRevisionId);
assert.equal(regeneration.apply(preview, { commit() {
  throw new Error("storage unavailable");
} }).activeDerivedRevisionId, previousRevision.derivedRevisionId,
"Failed apply must preserve the previous active revision.");

const splitMap = regeneration.mapSteps([{ taskId: "old", sourceEventIds: ["1", "2"] }],
  [{ taskId: "new-1", sourceEventIds: ["1"] },
    { taskId: "new-2", sourceEventIds: ["2"] }]);
assert.equal(splitMap.mappings[0].mappingType, "one-to-many");
const preservedSplit = regeneration.prepare({ canonicalRecording: { id: "split",
  events: [{ eventId: "1" }, { eventId: "2" }] }, previousGeneratedState: {
  steps: [{ taskId: "old", sourceEventIds: ["1", "2"] }] }, pipelineVersions: VERSIONS,
userState: { structureOverrides: [{ type: "split", sourceStepIds: ["old"],
  partitions: [{ partitionId: "p1", sourceEventIds: ["1"] },
    { partitionId: "p2", sourceEventIds: ["2"] }] }] }, dryRun: true,
generate: () => ({ steps: [{ taskId: "new-1", sourceEventIds: ["1"] },
  { taskId: "new-2", sourceEventIds: ["2"] }] }) });
assert.deepEqual(preservedSplit.reconciledUserState.structureOverrides[0].sourceStepIds,
  ["new-1", "new-2"]);
const mergeMap = regeneration.mapSteps([{ taskId: "old-1", sourceEventIds: ["1"] },
  { taskId: "old-2", sourceEventIds: ["2"] }],
[{ taskId: "new", sourceEventIds: ["1", "2"] }]);
assert.equal(mergeMap.mappings[0].mappingType, "many-to-one");
const ambiguousMap = regeneration.mapSteps([{ taskId: "old", sourceEventIds: ["1", "2"] }],
  [{ taskId: "new", sourceEventIds: ["2", "3"] }]);
assert.equal(ambiguousMap.mappings.length, 0);
assert.deepEqual(ambiguousMap.ambiguous[0].possibleTargets, ["new"]);

const splitPreview = regeneration.prepare({ canonicalRecording: canonical,
  previousGeneratedState: { steps: [{ taskId: "old", sourceEventIds: ["1", "2"] }] },
  userState: { stepOverrides: [{ stepId: "old",
    fields: { instruction: "Do not duplicate" } }], manualSteps: [{
      manualStepId: "manual-always", positionAnchor: { relation: "after",
        targetStepId: "old" } }], notes: [{ noteId: "orphan-note",
          ownerType: "step", ownerId: "old", content: "Preserve me" }] },
  pipelineVersions: VERSIONS, dryRun: true, generate: () => ({ steps: [{
    taskId: "new-1", sourceEventIds: ["1"] }, { taskId: "new-2",
      sourceEventIds: ["2"] }] }) });
assert.equal(splitPreview.reconciledUserState.stepOverrides.length, 0);
assert(splitPreview.result.unresolvedOverrides.some(item =>
  item.reason === "non-one-to-one-step-mapping"));
assert.equal(splitPreview.reconciledUserState.manualSteps.length, 1);
assert(splitPreview.result.diagnostics.some(item =>
  item.code === "unresolved-manual-anchor"));
assert.equal(splitPreview.reconciledUserState.notes[0].orphaned, true);

const missingScreenshot = regeneration.prepare({ canonicalRecording: canonical,
  previousGeneratedState: { steps: previousSteps }, pipelineVersions: VERSIONS,
  userState: { stepOverrides: [{ stepId: "old-item", screenshotOverride: {
    selectedScreenshotAssetId: "deleted-shot" } }] }, dryRun: true,
  availableScreenshotAssetIds: ["shot-new"], generate: () => ({ steps: nextSteps }) });
assert(missingScreenshot.result.unresolvedOverrides.some(item =>
  item.overrideType === "manual-screenshot"));
assert.equal(canonical.events[2].raw.value, "[quantity]",
  "Masked or missing evidence must never be fabricated.");

const legacy = regeneration.prepare({ canonicalRecording: { id: "legacy",
  events: [{ eventNo: 1 }] }, previousGeneratedState: { steps: [] },
  pipelineVersions: VERSIONS, dryRun: true,
  generate: recording => ({ steps: [{ taskId: "legacy-step",
    sourceEventIds: [String(recording.events[0].eventNo)] }] }) });
assert.equal(legacy.freshGeneratedState.steps.length, 1);

const invalidSource = regeneration.prepare({ canonicalRecording: canonical,
  previousGeneratedState: { steps: [] }, pipelineVersions: VERSIONS, dryRun: true,
  generate: () => ({ steps: [{ taskId: "invalid", sourceEventIds: ["fabricated"] }] }) });
assert.equal(invalidSource.validation.valid, false);
assert.equal(regeneration.apply(invalidSource, { commit() {
  throw new Error("must not run");
} }).status, "validation-failed");

const availability = regeneration.regenerationAvailable(previousRevision, VERSIONS);
assert.equal(availability.available, true);
assert(availability.changedComponents.includes("normalizationVersion"));
assert.equal(regeneration.regenerationAvailable(preview.derivedRevision, VERSIONS)
  .available, false);

const libraryValues = regeneration.libraryMetadata(preview,
  "2026-08-11T12:02:00.000Z");
const record = library.normalize({ projectId: "recording-1", regeneration: {
  ...libraryValues, pipelineVersion: "2.0.0" }, generatedState: { steps: nextSteps },
  derivedRevisions: [preview.derivedRevision], regenerationResult: preview.result });
assert.equal(record.regeneration.derivedRevisionId,
  preview.derivedRevision.derivedRevisionId);
assert.equal(record.generatedState, undefined);
assert.equal(record.derivedRevisions, undefined);
assert.equal(record.regenerationResult, undefined);

const guidance = intelligence.create({ document: { documentId: "doc", sections: [] },
  plan: { planId: "plan" }, qualityDiagnostics: { findings: [] },
  regenerationState: { unresolvedOverrideCount: 2 } });
assert(guidance.items.some(item => item.guidanceId ===
  "regeneration:unresolved-overrides"));

const largeOld = Array.from({ length: 5000 }, (_, index) => ({
  taskId: `old-${index}`, stepGroupId: `group-${index}`,
  sourceEventIds: [`event-${index}`] }));
const largeNew = largeOld.map((step, index) => ({ ...step,
  taskId: `new-${index}` }));
const started = Date.now();
assert.equal(regeneration.mapSteps(largeOld, largeNew).mappings.length, 5000);
assert(Date.now() - started < 5000, "Identity-first matching must remain practical.");

console.log("Regenerate From Recording and reconciliation tests passed.");
