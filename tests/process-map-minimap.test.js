const assert = require("assert");
const minimap = require("../src/ui/process-map-minimap");

const result = minimap.create({ columnCount: 2, rowCount: 2, nodes: [
  { nodeId: "one", row: 0, column: 0 },
  { nodeId: "two", row: 0, column: 1 },
  { nodeId: "three", row: 1, column: 0 }
] }, [
  { nodeId: "one", title: "Create order" },
  { nodeId: "two", title: "Release order" },
  { nodeId: "three", title: "Post shipment" }
], ["two"]);
assert.strictEqual(result.columns, 2);
assert.strictEqual(result.rows, 2);
assert.strictEqual(result.items[1].selected, true);
assert.strictEqual(result.items[2].title, "Post shipment");
assert(Object.isFrozen(result));
assert(Object.isFrozen(result.items));
assert.deepStrictEqual(minimap.create({}, []).items, []);
console.log("Process map minimap tests passed.");
