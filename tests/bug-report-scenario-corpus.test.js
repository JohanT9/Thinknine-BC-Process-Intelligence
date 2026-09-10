const assert = require("assert");
const runner = require("../scripts/run-bug-report-scenarios");

assert.throws(() => runner.validate({ schemaVersion: 1 }, "invalid.yaml"),
  /id is required/u);
const results = runner.runTarget();
assert(results.length >= 5, "the executable YAML corpus must not be empty");
for (const result of results) assert.deepStrictEqual(result.failures, [],
  `${result.id}: ${result.failures.join("; ")}`);

console.log(`Bug-report YAML scenario corpus passed (${results.length} flows).`);
