const assert = require("assert");
const legend = require("../src/document/process-map-legend");

const model = { nodes: [
  { nodeId: "order", nodeType: "document" },
  { nodeId: "post", nodeType: "posting" },
  { nodeId: "duplicate", nodeType: "document" }
], transitions: [
  { fromNodeId: "order", toNodeId: "post", transitionType: "sequence" },
  { fromNodeId: "post", toNodeId: "duplicate", transitionType: "documentPosting" }
] };
const swedish = legend.create(model, "sv-SE");
assert.strictEqual(swedish.title, "Teckenförklaring");
assert.deepStrictEqual(swedish.nodes.map(item => item.label), ["Dokument", "Bokföring"]);
assert.deepStrictEqual(swedish.routes.map(item => item.label), ["Nästa", "Bokför som"]);
assert(Object.isFrozen(swedish));
assert(Object.isFrozen(swedish.nodes));
assert.strictEqual(legend.create({ nodes: [{ nodeType: "activity" }] }, "en-US")
  .nodes[0].label, "Action");
console.log("Process map legend tests passed.");
