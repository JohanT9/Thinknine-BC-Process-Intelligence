const assert = require("assert");
const layout = require("../src/document/process-graph-layout");

const model = {
  nodes: Array.from({ length: 10 }, (_, index) => ({
    nodeId: `node-${index + 1}`, nodeType: "action", sequence: index
  })),
  transitions: Array.from({ length: 9 }, (_, index) => ({
    transitionId: `edge-${index + 1}`, fromNodeId: `node-${index + 1}`,
    toNodeId: `node-${index + 2}`, transitionType: "sequence"
  }))
};
const before = JSON.stringify(model);
const wide = layout.create(model, { availableWidth: 1000 });
assert.strictEqual(wide.columnCount, 4);
assert.strictEqual(wide.strategy, "serpentine");
assert.strictEqual(wide.rowCount, 3);
assert.deepStrictEqual(wide.rows.map(row => row.nodeIds.length), [4, 4, 2]);
assert.strictEqual(wide.nodes.find(node => node.nodeId === "node-5").row, 1);
assert.strictEqual(wide.nodes.find(node => node.nodeId === "node-5").column, 3);
assert.strictEqual(wide.rows[1].direction, "reverse");
assert.strictEqual(wide.edges.find(edge => edge.edgeId === "edge-4").route, "rowWrap");
assert.strictEqual(wide.edges.find(edge => edge.edgeId === "edge-5").route, "horizontal");
assert.strictEqual(JSON.stringify(model), before, "layout must not mutate the process model");
assert.deepStrictEqual(layout.create(model, { availableWidth: 1000 }), wide,
  "layout must be deterministic");
const narrow = layout.create(model, { availableWidth: 450 });
assert.strictEqual(narrow.columnCount, 2);
assert.strictEqual(narrow.rowCount, 5);
assert.strictEqual(layout.calculateColumnCount(20, { availableWidth: 2000 }), 5);
assert.strictEqual(layout.calculateColumnCount(9, { availableWidth: 1000 }), 3,
  "adaptive layout should avoid a final row containing one orphan node");
const vertical = layout.create(model, { availableWidth: 2000, direction: "vertical" });
assert.strictEqual(vertical.columnCount, 1);
assert.strictEqual(vertical.rowCount, 10);
assert.strictEqual(vertical.flowDirection, "topToBottom");
assert.strictEqual(vertical.strategy, "vertical");
assert(Object.isFrozen(wide));
assert(Object.isFrozen(wide.rows));
const branched = layout.create({ nodes: [
  { nodeId: "decision", nodeType: "decision", sequence: 0 },
  { nodeId: "yes", nodeType: "action", sequence: 1 },
  { nodeId: "no", nodeType: "action", sequence: 2 },
  { nodeId: "join", nodeType: "action", sequence: 3 }
], transitions: [
  { fromNodeId: "decision", toNodeId: "yes", transitionType: "conditional" },
  { fromNodeId: "decision", toNodeId: "no", transitionType: "alternate" },
  { fromNodeId: "yes", toNodeId: "join", transitionType: "sequence" },
  { fromNodeId: "no", toNodeId: "join", transitionType: "sequence" }
] });
assert.strictEqual(branched.flowDirection, "topToBottomBranches");
assert.strictEqual(branched.strategy, "branched");
assert.strictEqual(branched.columnCount, 3);
assert.deepStrictEqual(branched.rows.map(row => row.nodeIds), [
  ["decision"], ["yes", "no"], ["join"]
]);
assert.strictEqual(branched.nodes.find(node => node.nodeId === "decision").column, 1);
assert.deepStrictEqual(branched.nodes.filter(node => ["yes", "no"].includes(node.nodeId))
  .map(node => node.column), [0, 2]);
assert.strictEqual(branched.nodes.find(node => node.nodeId === "join").column, 1);
console.log("Process graph layout tests passed.");
