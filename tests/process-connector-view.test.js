const assert = require("assert");
const connectors = require("../src/ui/process-connector-view");

assert.deepStrictEqual(connectors.connectorPath({ left: 0, top: 0, width: 100, height: 60 },
  { left: 140, top: 0, width: 100, height: 60 }), {
  route: "horizontal", path: "M 100 30 H 140"
});
assert.deepStrictEqual(connectors.connectorPath({ left: 220, top: 0, width: 100, height: 60 },
  { left: 0, top: 120, width: 100, height: 60 }), {
  route: "orthogonal", path: "M 270 60 V 90 H 50 V 120"
});
const layer = connectors.buildLayer({ recordingId: "sales", nodes: [{ nodeId: "a" },
  { nodeId: "b" }], transitions: [{ transitionId: "ab", fromNodeId: "a", toNodeId: "b",
    transitionType: "conditional", label: "Yes" }] }, {
  a: { left: 0, top: 0, width: 100, height: 60 },
  b: { left: 140, top: 0, width: 100, height: 60 }
}, { width: 240, height: 60 }, "en-US");
assert.strictEqual(layer.count, 1);
assert(layer.markup.includes("process-connector-conditional"));
assert(layer.markup.includes('data-process-line="solid"'));
assert(layer.markup.includes('class="process-connector-label process-connector-label-conditional"'));
assert(layer.markup.includes(">Yes</text>"));
assert(layer.markup.includes('aria-hidden="true"'));
const unlabeledSequence = connectors.buildLayer({ transitions: [{ fromNodeId: "a", toNodeId: "b",
  transitionType: "sequence" }] }, {
  a: { left: 0, top: 0, width: 100, height: 60 },
  b: { left: 140, top: 0, width: 100, height: 60 }
}, { width: 240, height: 60 });
assert(!unlabeledSequence.markup.includes("process-connector-label"),
  "ordinary sequence routes must remain visually quiet");
assert.strictEqual(connectors.buildLayer({ transitions: [] }, {}, { width: 0, height: 0 }).count, 0);
console.log("Process connector view tests passed.");
