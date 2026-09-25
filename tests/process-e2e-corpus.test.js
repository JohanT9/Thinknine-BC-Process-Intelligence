const assert = require("assert");
const runner = require("../scripts/run-process-e2e-corpus");
assert.throws(() => runner.validate({ schemaVersion: 1 }),
  /Invalid process end-to-end corpus/u);
const result = runner.run();
assert.strictEqual(result.scenarioCount, 20);
assert.strictEqual(result.failed, 0, result.results.flatMap(item =>
  item.failures.map(failure => `${item.id}: ${failure}`)).join("\n"));
assert.strictEqual(result.accuracy, 1);
console.log(`Process end-to-end corpus passed (${result.scenarioCount} scenarios).`);
