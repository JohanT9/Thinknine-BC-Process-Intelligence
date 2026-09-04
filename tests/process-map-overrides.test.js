const assert = require("assert");
const overrides = require("../src/document/process-map-overrides");
const model = { recordingId: "r", nodes: [{ nodeId: "a", title: "Order", nodeType: "document" },
  { nodeId: "b", title: "Release", nodeType: "processStep" }], transitions: [{
    transitionId: "ab", fromNodeId: "a", toNodeId: "b", transitionType: "sequence" }], metadata: {} };
const changed = overrides.apply(model, [{ nodeId: "a", title: "Purchase Order",
  nodeType: "postedDocument", processRole: { id: "finance", name: "Finance" } }]);
assert.strictEqual(changed.nodes[0].title, "Purchase Order");
assert.strictEqual(changed.nodes[0].nodeType, "postedDocument");
assert.strictEqual(changed.nodes[0].metadata.processRole.id, "finance");
assert.strictEqual(model.nodes[0].title, "Order", "The source graph must remain immutable.");
const moved = overrides.move([], model, "b", -1);
const reordered = overrides.apply(model, moved);
assert.deepStrictEqual(reordered.nodes.map(node => node.nodeId), ["b", "a"]);
assert.strictEqual(reordered.transitions[0].fromNodeId, "b");
assert(Object.isFrozen(reordered));
console.log("Process map override tests passed.");
