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
assert.strictEqual(wide.rowCount, 3);
assert.deepStrictEqual(wide.rows.map(row => row.nodeIds.length), [4, 4, 2]);
assert.strictEqual(wide.nodes.find(node => node.nodeId === "node-5").row, 1);
assert.strictEqual(wide.edges.find(edge => edge.edgeId === "edge-4").route, "rowWrap");
assert.strictEqual(wide.edges.find(edge => edge.edgeId === "edge-5").route, "horizontal");
assert.strictEqual(JSON.stringify(model), before, "layout must not mutate the process model");
assert.deepStrictEqual(layout.create(model, { availableWidth: 1000 }), wide,
  "layout must be deterministic");
const narrow = layout.create(model, { availableWidth: 450 });
assert.strictEqual(narrow.columnCount, 2);
assert.strictEqual(narrow.rowCount, 5);
assert.strictEqual(layout.calculateColumnCount(20, { availableWidth: 2000 }), 5);
const vertical = layout.create(model, { availableWidth: 2000, direction: "vertical" });
assert.strictEqual(vertical.columnCount, 1);
assert.strictEqual(vertical.rowCount, 10);
assert.strictEqual(vertical.flowDirection, "topToBottom");
assert(Object.isFrozen(wide));
assert(Object.isFrozen(wide.rows));
console.log("Process graph layout tests passed.");
