const assert = require("assert");
const runner = require("../scripts/run-process-analysis-corpus");

assert.throws(() => runner.validate({ schemaVersion: 1 }),
  /Invalid process-analysis corpus/u);
assert.throws(() => runner.validate({ schemaVersion: 1, corpusVersion: "x",
  scenarios: [{ id: "duplicate", input: { businessTasks: [{}] },
    expected: { status: "passed", codes: [] } },
  { id: "duplicate", input: { businessTasks: [{}] },
    expected: { status: "passed", codes: [] } }] }), /Duplicate scenario/u);

const result = runner.run();
assert(result.scenarioCount >= 10,
  "the process corpus must cover representative output conflicts");
assert.strictEqual(result.failed, 0, result.results.flatMap(item =>
  item.failures.map(failure => `${item.id}: ${failure}`)).join("\n"));
assert.strictEqual(result.accuracy, 1);

console.log(`Process analysis corpus passed (${result.scenarioCount} scenarios).`);
