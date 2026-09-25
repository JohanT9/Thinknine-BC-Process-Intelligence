const assert = require("assert");
const runner = require("../scripts/run-process-metamorphic-corpus");

assert(runner.transformations.length >= 15);
const result = runner.run();
assert.strictEqual(result.variantCount, 300);
assert.strictEqual(result.failed, 0, result.results.flatMap(item =>
  item.failures.map(failure =>
    `${item.scenarioId}/${item.transformation}: ${failure}`)).join("\n"));
assert.strictEqual(result.accuracy, 1);
console.log(`Process metamorphic corpus passed (${result.variantCount} variants).`);
