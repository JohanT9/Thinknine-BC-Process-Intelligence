const assert = require("assert");
const golden = require("../scripts/run-process-golden-baseline");

const actual = golden.verify();
assert.strictEqual(actual.schemaVersion, 1);
assert.strictEqual(actual.scenarios.length, 20);
assert.strictEqual(new Set(actual.scenarios.map(item => item.id)).size, 20);
assert.throws(() => golden.verify({ ...actual, scenarios: [] }, actual),
  /approved golden baseline/u);
console.log("Process golden baseline passed (20 scenarios).");
