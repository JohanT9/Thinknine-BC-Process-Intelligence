const assert = require("assert");
const lanes = require("../src/document/process-lane-model");

const model = { nodes: [{ nodeId: "a", nodeType: "activity", sequence: 0 },
  { nodeId: "b", nodeType: "activity", sequence: 1 },
  { nodeId: "c", nodeType: "activity", sequence: 2 }], subprocesses: [{
  subprocessId: "sales", title: "Sales", nodeIds: ["a", "b"],
  metadata: { containerType: "phase" }
}] };
const result = lanes.create(model, { unassignedTitle: "Övriga steg" });
assert.strictEqual(result.visible, true);
assert.deepStrictEqual(result.lanes.map(lane => lane.title), ["Sales", "Övriga steg"]);
assert.deepStrictEqual(result.lanes[0].nodeIds, ["a", "b"]);
assert.strictEqual(result.assignments.c, "lane:unassigned");
assert.deepStrictEqual(result.segments.map(segment => segment.nodeIds), [["a", "b"], ["c"]]);
assert(Object.isFrozen(result));
const implicit = lanes.create({ nodes: model.nodes, subprocesses: [] });
assert.strictEqual(implicit.visible, false);
assert.strictEqual(implicit.lanes.length, 1);
const roleBased = lanes.create({ nodes: [{ nodeId: "role", nodeType: "activity",
  metadata: { processRole: { id: "warehouse", name: "Warehouse" } } }] });
assert.strictEqual(roleBased.visible, true);
assert.strictEqual(roleBased.lanes[0].source, "processRole");
console.log("Process lane model tests passed.");
