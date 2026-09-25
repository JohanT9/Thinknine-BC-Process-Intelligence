const assert = require("assert");
const quality = require("../scripts/run-process-output-quality");
const e2e = require("../scripts/run-process-e2e-corpus");
const corpus = require("./fixtures/process-e2e/sanitized-recording-corpus.json");

const result = quality.run();
assert.strictEqual(result.scenarioCount, 20);
assert.strictEqual(result.failed, 0, result.results.flatMap(item =>
  item.failures.map(failure => `${item.id}: ${failure}`)).join("\n"));

const checkboxScenario = corpus.scenarios.find(item =>
  item.id === "checkbox-state-is-preserved");
const corrupted = JSON.parse(JSON.stringify(e2e.execute(checkboxScenario)));
corrupted.interpreted.businessTasks[0].taskType = "DisableCheckbox";
corrupted.interpreted.businessTasks[0].screenshot = "invented.png";
const detected = quality.inspect(checkboxScenario, corrupted);
assert(detected.some(failure => failure.includes("checkbox state")));
assert(detected.some(failure => failure.includes("uncaptured screenshot")));
console.log("Process output quality passed (20 scenarios).");
