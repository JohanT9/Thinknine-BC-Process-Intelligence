const assert = require("assert");
const fs = require("fs");
const path = require("path");
const modelApi = require("../src/document/process-model");
const versions = require("../src/document/process-versioning");
const library = require("../src/document/document-library");
const intelligence = require("../src/document/documentation-intelligence");

const NOW = "2026-08-11T10:00:00.000Z";
function model(recordingId, values) {
  return modelApi.project({ recordingId, title: "Order process",
    steps: values.map(value => typeof value === "string"
      ? { taskId: value.toLowerCase(), instruction: value,
        sourceEventIds: [`event-${value.toLowerCase()}`] }
      : value) });
}

const firstModel = model("order", ["A", "B"]);
const created = versions.createVersion(firstModel, { versionNumber: "1.0",
  baseline: true, status: "approved", createdAt: NOW, createdBy: "consultant",
  creationReason: "Approved baseline", versionNotes: "Initial customer approval.",
  sourceRecordingRevision: 1, sourceHierarchyRevision: 1,
  sourceOverrideRevision: 0, futureFields: { future: true } });
assert.equal(created.created, true);
const v1 = created.version;
assert.equal(v1.schemaVersion, versions.VERSION_SCHEMA_VERSION);
assert.equal(v1.versionNumber, "1.0");
assert.equal(v1.status, "approved");
assert.equal(v1.baseline, true);
assert.equal(v1.provenance, "generated-baseline");
assert.deepEqual(v1.futureFields, { future: true });
assert(Object.isFrozen(v1) && Object.isFrozen(v1.processSnapshot.nodes));
assert.equal(v1.parentVersionId, null);
assert.throws(() => versions.createVersion(firstModel, { versionNumber: "v2" }),
  /major.minor/);

const duplicate = versions.createVersion(firstModel, { versionNumber: "1.1" }, [v1]);
assert.equal(duplicate.created, false);
assert.equal(duplicate.reason, "identical-semantic-snapshot");
assert(duplicate.message.includes("1.0"));

const secondModel = model("order", ["A", "C", "B"]);
const second = versions.createVersion(secondModel, { versionNumber: "1.1",
  status: "review", createdAt: "2026-08-11T11:00:00.000Z" }, [v1]);
assert.equal(second.version.parentVersionId, v1.processVersionId);
assert.equal(second.version.versionSequence, 1);
assert.notEqual(second.version.processVersionId, v1.processVersionId);
const v2 = second.version;
const diff = versions.compareProcessVersions(v1, v2);
assert.equal(diff.schemaVersion, versions.DIFF_SCHEMA_VERSION);
assert.equal(diff.diffVersion, versions.DIFF_VERSION);
assert.equal(diff.summary.addedNodes, 1);
assert.equal(diff.summary.removedNodes, 0);
assert.equal(diff.summary.addedTransitions, 2);
assert.equal(diff.summary.removedTransitions, 1);
assert(diff.nodeChanges.find(change => change.changeType === "added")
  .after.sourceEventIds.includes("event-c"));
assert.deepEqual(versions.compareProcessVersions(v1, v2), diff);

const removedDiff = versions.compareProcessVersions(v2, v1);
assert.equal(removedDiff.summary.removedNodes, 1);
assert.equal(removedDiff.summary.addedNodes, 0);

const aId = firstModel.nodes.find(node => node.title === "A").nodeId;
const renamedModel = modelApi.project({ recordingId: "order",
  steps: [{ taskId: "a", instruction: "Generated wording changed",
    sourceEventIds: ["event-a"] }, { taskId: "b", instruction: "B",
    sourceEventIds: ["event-b"] }], overrides: [{ type: "rename-node",
    targetNodeId: aId, title: "Consultant activity name" }] });
const renameDiff = versions.compareProcessVersions(firstModel, renamedModel);
assert.equal(renameDiff.summary.modifiedNodes, 1);
assert.equal(renameDiff.summary.addedNodes, 0);
assert.equal(renameDiff.summary.removedNodes, 0);

const wordingOnly = JSON.parse(JSON.stringify(firstModel));
wordingOnly.nodes.find(node => node.nodeId === aId).title = "Select A clearly";
assert.equal(versions.semanticFingerprint(wordingOnly),
  versions.semanticFingerprint(firstModel));
assert.equal(versions.compareProcessVersions(firstModel, wordingOnly).summary.changed, false);
const cosmetic = JSON.parse(JSON.stringify(firstModel));
cosmetic.metadata = { screenshotId: "new-shot", annotation: { x: 0.5 }, theme: "dark" };
cosmetic.nodes[1].screenshotIds = ["shot"];
assert.equal(versions.compareProcessVersions(firstModel, cosmetic).summary.changed, false);

const moved = JSON.parse(JSON.stringify(firstModel));
moved.nodes.find(node => node.nodeId === aId).containerId = "warehouse";
moved.nodes.find(node => node.nodeId === aId).processOrder = 2;
const movedDiff = versions.compareProcessVersions(firstModel, moved);
assert.equal(movedDiff.summary.movedNodes, 1);
assert.equal(movedDiff.summary.addedNodes, 0);
assert.equal(movedDiff.summary.removedNodes, 0);

const modifiedTransition = JSON.parse(JSON.stringify(firstModel));
const middle = modifiedTransition.transitions[1];
middle.transitionType = "conditional";
middle.label = "Approved";
middle.condition = "approved";
const transitionDiff = versions.compareProcessVersions(firstModel,
  modifiedTransition);
assert.equal(transitionDiff.summary.modifiedTransitions, 1);

const boundaryChanged = JSON.parse(JSON.stringify(firstModel));
boundaryChanged.startNodeIds = [aId];
assert.equal(versions.compareProcessVersions(firstModel, boundaryChanged)
  .summary.modifiedMetadata, 1);

const manualDecisionId = modelApi.stableId("manual-process-node", ["manual", "decision"]);
const manual = modelApi.project({ recordingId: "manual", steps: [{ taskId: "ship",
  instruction: "Ship" }], overrides: [{ type: "create-decision",
  processOverrideId: "decision", manualNodeId: "decision", title: "Approved?",
  processOrder: 0 }, { type: "create-transition", fromNodeId: manualDecisionId,
  toNodeId: modelApi.stableId("process-node", [modelApi.MODEL_VERSION, "manual",
    "step", "ship"]), transitionType: "conditional", label: "Yes" }] });
const manualDiff = versions.compareProcessVersions(model("manual", ["Ship"]), manual);
assert(manualDiff.nodeChanges.some(change => change.changeType === "added" &&
  change.provenance === "manual"));

const oldIds = JSON.parse(JSON.stringify(firstModel));
oldIds.nodes.find(node => node.nodeId === aId).nodeId = "new-projector-node-a";
oldIds.transitions = [];
const fallback = versions.compareProcessVersions(firstModel, oldIds);
assert(fallback.nodeChanges.some(change => change.previousNodeId === aId &&
  change.matchStrategy.endsWith("traceability")));

const historical = JSON.stringify(v1);
firstModel.nodes[0].title = "Cannot mutate frozen model";
assert.equal(JSON.stringify(v1), historical,
  "Historical snapshots cannot depend on current mutable state.");
const normalizedFuture = versions.normalizeVersion({ ...v1,
  futureTopLevel: { retained: true } });
assert.deepEqual(normalizedFuture.futureTopLevel, { retained: true });

assert.deepEqual(versions.history([v2, v1]).map(value => value.versionNumber),
  ["1.0", "1.1"]);
assert.equal(versions.baseline([v2, v1]).processVersionId, v1.processVersionId);
const baselineDiff = versions.compareCurrentToBaseline(secondModel, [v1, v2]);
assert.equal(baselineDiff.summary.addedNodes, 1);
assert.deepEqual(versions.compareProcessVersions(v1, secondModel), baselineDiff);

const metadata = versions.libraryMetadata([v1, v2]);
assert.deepEqual(metadata, {
  currentVersion: "1.1", currentVersionId: v2.processVersionId, versionCount: 2,
  baselineVersion: "1.0", baselineVersionId: v1.processVersionId,
  approvedVersion: "1.0", lastProcessChangeAt: "2026-08-11T11:00:00.000Z"
});
const record = library.normalize({ projectId: "order", processVersion: metadata,
  processVersions: [v1, v2], processDiffCache: { secret: true } });
assert.equal(record.processVersion.versionCount, 2);
assert.equal(record.processVersions, undefined);
assert.equal(record.processDiffCache, undefined);

const guidance = intelligence.create({ document: { documentId: "doc", sections: [] },
  plan: { planId: "plan" }, qualityDiagnostics: { findings: [] },
  processVersionState: { baselineVersion: v1, currentDiff: diff } });
assert(guidance.items.some(item => item.guidanceId.startsWith("process-version:")));

const largeA = model("large", Array.from({ length: 5000 }, (_, index) => `A${index}`));
const largeB = JSON.parse(JSON.stringify(largeA));
largeB.nodes[2500].containerId = "changed";
const started = Date.now();
assert.equal(versions.compareProcessVersions(largeA, largeB).summary.movedNodes, 1);
assert(Date.now() - started < 5000, "Stable-identity diff should remain near-linear.");

const source = fs.readFileSync(path.join(__dirname,
  "../src/document/process-versioning.js"), "utf8").toLowerCase();
for (const forbidden of ["document.", "fetch(", "levenshtein", "wordprocessing",
  "drawio", "bpmn", "svg geometry"]) {
  assert(!source.includes(forbidden), `Versioning must remain renderer neutral: ${forbidden}`);
}

console.log("Process Versioning and Process Diff tests passed.");
