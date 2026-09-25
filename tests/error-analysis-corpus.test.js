const assert = require("assert");
const runner = require("../scripts/run-error-analysis-corpus");
assert.throws(() => runner.validate({ schemaVersion: 1 }), /Invalid error-analysis corpus/u);
assert.throws(() => runner.validate({ schemaVersion: 1, corpusVersion: "x", scenarios: [{ id: "duplicate", recordingId: "r", evidence: [{}], expected: {} }, { id: "duplicate", recordingId: "r", evidence: [{}], expected: {} }] }), /Duplicate scenario/u);
const result = runner.run();
assert(result.scenarioCount >= 10, "the error corpus must cover representative classes");
assert.strictEqual(result.failed, 0, result.results.flatMap(item => item.failures.map(failure => `${item.id}: ${failure}`)).join("\n"));
assert.strictEqual(result.classificationAccuracy, 1);
console.log(`Error analysis corpus passed (${result.scenarioCount} scenarios).`);
