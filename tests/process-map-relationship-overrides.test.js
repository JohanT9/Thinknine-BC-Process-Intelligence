const assert = require("assert");
const relationships = require("../src/document/process-map-relationship-overrides");
const model = { recordingId: "map", nodes: [{ nodeId: "a" }, { nodeId: "b" },
  { nodeId: "c" }], transitions: [{ transitionId: "ab", fromNodeId: "a",
    toNodeId: "b", transitionType: "sequence" }], metadata: {} };
const edited = relationships.apply(model, [{ relationshipId: "ab", fromNodeId: "a",
  toNodeId: "c", transitionType: "conditional", label: "Godkänd" }]);
assert.deepStrictEqual(edited.transitions[0], { transitionId: "ab", fromNodeId: "a",
  toNodeId: "c", transitionType: "conditional", label: "Godkänd" });
const added = relationships.apply(model, [{ relationshipId: "custom", fromNodeId: "b",
  toNodeId: "a", transitionType: "loop", label: "Försök igen" }]);
assert.strictEqual(added.transitions.length, 2);
assert.strictEqual(relationships.apply(model, [{ relationshipId: "ab", fromNodeId: "a",
  toNodeId: "b", deleted: true }]).transitions.length, 0);
assert.strictEqual(model.transitions[0].toNodeId, "b");
assert(Object.isFrozen(edited));
console.log("Process map relationship override tests passed.");
