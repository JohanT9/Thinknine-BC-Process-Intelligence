const assert = require("assert");
const grammar = require("../src/document/process-route-grammar");

assert.deepStrictEqual(grammar.presentationFor({ transitionType: "alternate" }, "sv-SE"), {
  version: "1.0.0", sourceType: "alternate", kind: "alternate", line: "dashed",
  tone: "alternative", marker: "arrow", label: "Alternativ"
});
assert.strictEqual(grammar.presentationFor({ transitionType: "conditional",
  label: "Ja" }, "en-US").label, "Ja");
assert.strictEqual(grammar.presentationFor({ relationshipType: "returnsTo" }).marker, "return");
assert.strictEqual(grammar.presentationFor({ relationshipType: "documentPosting" }).kind, "posts");
assert(Object.isFrozen(grammar.presentationFor({ transitionType: "sequence" })));
console.log("Process route grammar tests passed.");
