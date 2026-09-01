const assert = require("assert");
const fs = require("fs");
const workflow = require("../src/document/process-version-workflow");
const view = require("../src/ui/process-version-comparison-view");

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

const container = { innerHTML: "" };
assert.deepStrictEqual(view.render(container, comparison, { locale: "sv-SE" }), {
  changed: true, nodeCount: 2
});
assert(container.innerHTML.includes("Tillagda"));
assert(container.innerHTML.includes('class="process-version-node added"'));
assert(container.innerHTML.includes("Release order"));
const unsafe = { ...comparison, to: { ...comparison.to,
  processSnapshot: { ...comparison.to.processSnapshot, nodes: [{
    ...comparison.to.processSnapshot.nodes[0], title: "<script>unsafe</script>"
  }] } } };
view.render(container, unsafe, { locale: "en-US" });
assert(!container.innerHTML.includes("<script>"));
assert(container.innerHTML.includes("&lt;script&gt;"));

const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const build = fs.readFileSync("scripts/build.js", "utf8");
assert(html.includes('id="saveProcessVersion"'));
assert(html.includes('id="compareProcessVersions"'));
assert(html.includes('id="processVersionDialog"'));
assert(html.includes('src="document/process-version-workflow.js"'));
assert(html.includes('src="process-version-comparison-view.js"'));
assert(dashboard.includes("function saveCurrentProcessVersion()"));
assert(dashboard.includes("function renderProcessVersionComparison()"));
assert(dashboard.includes("T9ProcessVersioning.libraryMetadata"));
assert(build.includes('"process-version-comparison-view.js"'));
console.log("Process version workflow tests passed.");
