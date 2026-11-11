const assert = require("assert");
const fs = require("fs");
const workflow = require("../src/document/process-version-workflow");

function model(nodes) {
  return {
    processModelId: "process:order",
    modelVersion: "1.0.0",
    recordingId: "order-recording",
    nodes,
    transitions: [],
    stateTransitions: [],
    subprocesses: [],
    startNodeIds: nodes.length ? [nodes[0].nodeId] : [],
    endNodeIds: nodes.length ? [nodes.at(-1).nodeId] : []
  };
}

const firstModel = model([{ nodeId: "open", nodeType: "activity",
  title: "Open order", provenance: "generated", processOrder: 0,
  sourceStepIds: ["step-open"] }]);
const first = workflow.save(firstModel, [], {
  createdAt: "2026-09-01T08:00:00.000Z"
});
assert.strictEqual(first.created, true);
assert.strictEqual(first.version.versionNumber, "1.0");
assert.strictEqual(first.version.baseline, true);
assert(Object.isFrozen(first.version));

const duplicate = workflow.save(firstModel, [first.version]);
assert.strictEqual(duplicate.created, false,
  "an identical semantic snapshot must not create noise in history");

const secondModel = model([...firstModel.nodes, {
  nodeId: "release", nodeType: "activity", title: "Release order",
  provenance: "generated", processOrder: 1, sourceStepIds: ["step-release"]
}]);
const second = workflow.save(secondModel, [first.version], {
  createdAt: "2026-09-01T09:00:00.000Z"
});
assert.strictEqual(second.version.versionNumber, "1.1");
assert.strictEqual(second.version.parentVersionId, first.version.processVersionId);
assert.strictEqual(workflow.nextVersionNumber([second.version, first.version]), "1.2");

const versions = [first.version, second.version];
const choices = workflow.choices(versions, secondModel);
assert.strictEqual(choices.length, 3);
assert.strictEqual(choices.at(-1).id, workflow.CURRENT_ID);
assert(choices[0].label.includes("baseline"));

const comparison = workflow.compare(versions, first.version.processVersionId,
  second.version.processVersionId, secondModel);
assert.strictEqual(comparison.diff.summary.addedNodes, 1);
assert.strictEqual(comparison.diff.summary.changed, true);
assert(Object.isFrozen(comparison));
const currentComparison = workflow.compare(versions,
  second.version.processVersionId, workflow.CURRENT_ID, secondModel);
assert.strictEqual(currentComparison.diff.summary.changed, false);
assert.throws(() => workflow.compare(versions, "missing",
  workflow.CURRENT_ID, secondModel), /selected/);

// The model versions remain for regenerating a document from its recording; the process map
// that showed and compared them is removed from the interface.
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
assert(html.includes('src="document/process-version-workflow.js"'));
for (const id of ["saveProcessVersion", "compareProcessVersions", "processVersionDialog"]) {
  assert(!html.includes(`id="${id}"`), `${id} is not shown`);
}
console.log("Process version workflow tests passed.");
