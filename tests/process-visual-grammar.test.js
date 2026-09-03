const assert = require("assert");
const grammar = require("../src/document/process-visual-grammar");

assert.deepStrictEqual(grammar.presentationFor({ nodeType: "document" }, "sv-SE"), {
  version: "1.0.0", sourceType: "document", kind: "document",
  shape: "document", tone: "document", label: "Dokument"
});
assert.strictEqual(grammar.presentationFor({ nodeType: "activity", metadata: {
  originalNodeType: "posting" } }, "en-US").label, "Posting");
assert.strictEqual(grammar.presentationFor({ nodeType: "unknown" }).kind, "action");
assert.strictEqual(grammar.presentationFor({ nodeType: "decision" }).shape, "diamond");
assert.strictEqual(grammar.presentationFor({ nodeType: "activity", metadata: {
  semanticLevel: "domain" } }).kind, "business-process");
assert(Object.isFrozen(grammar.KINDS));
assert(Object.isFrozen(grammar.presentationFor({ nodeType: "systemAction" })));
console.log("Process visual grammar tests passed.");
