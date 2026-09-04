const assert = require("assert");
const legend = require("../src/document/process-map-legend");

const model = { nodes: [
  { nodeId: "order", nodeType: "document", metadata: { semanticStatus: "observed" } },
  { nodeId: "post", nodeType: "posting", metadata: { semanticStatus: "suggested" } },
  { nodeId: "duplicate", nodeType: "document", metadata: { semanticStatus: "observed" } }
], transitions: [
  { fromNodeId: "order", toNodeId: "post", transitionType: "sequence" },
  { fromNodeId: "post", toNodeId: "duplicate", transitionType: "documentPosting" }
] };
const swedish = legend.create(model, "sv-SE");
assert.strictEqual(swedish.title, "Teckenförklaring");
assert.deepStrictEqual(swedish.nodes.map(item => item.label), ["Dokument", "Bokföring"]);
assert.deepStrictEqual(swedish.routes.map(item => item.label), ["Nästa", "Bokför som"]);
assert.deepStrictEqual(swedish.statuses.map(item => item.label), ["Observerat", "Föreslaget"]);
assert(Object.isFrozen(swedish));
assert(Object.isFrozen(swedish.nodes));
assert(Object.isFrozen(swedish.statuses));
assert.strictEqual(legend.create({ nodes: [{ nodeType: "activity" }] }, "en-US")
  .nodes[0].label, "Action");
assert.strictEqual(legend.create({ nodes: [{ nodeType: "activity",
  metadata: { semanticStatus: "customerSpecific" } }] }, "en-US")
  .statuses[0].label, "Customer-specific");
console.log("Process map legend tests passed.");
