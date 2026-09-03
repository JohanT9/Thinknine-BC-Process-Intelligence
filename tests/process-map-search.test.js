const assert = require("assert");
const search = require("../src/ui/process-map-search");

assert.strictEqual(search.normalize("  Försäljningsorder  "), "forsaljningsorder");
assert.deepStrictEqual(search.find(["Create Sales Order", "Release order", "Post invoice"],
  "order").map(item => item.index), [0, 1]);
assert.deepStrictEqual(search.find(["Välj försäljningsorder"], "forsaljning")
  .map(item => item.index), [0]);
assert.deepStrictEqual(search.find(["Order"], ""), []);
const matches = search.find(["Order", "Invoice", "Order archive"], "order");
assert.strictEqual(search.next(matches, -1), 0);
assert.strictEqual(search.next(matches, 0), 2);
assert.strictEqual(search.next(matches, 2), 0);
assert.strictEqual(search.next([], 0), -1);
console.log("Process map search tests passed.");
