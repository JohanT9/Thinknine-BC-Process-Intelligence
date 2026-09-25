const fs = require("fs");
const path = require("path");
const engine = require("../src/engine/process-contradiction-engine");

const corpusPath = path.resolve(__dirname,
  "../tests/fixtures/process-analysis/sanitized-process-corpus.json");

function validate(corpus) {
  if (corpus?.schemaVersion !== 1 || !corpus.corpusVersion ||
      !Array.isArray(corpus.scenarios) || !corpus.scenarios.length) {
    throw new TypeError("Invalid process-analysis corpus.");
  }
  const ids = new Set();
  corpus.scenarios.forEach(scenario => {
    if (!scenario.id || !scenario.input?.businessTasks?.length ||
        !scenario.expected?.status || !Array.isArray(scenario.expected.codes)) {
      throw new TypeError("Invalid process-analysis scenario.");
    }
    if (ids.has(scenario.id)) throw new TypeError(`Duplicate scenario: ${scenario.id}`);
    ids.add(scenario.id);
  });
  return corpus;
}

function evaluateScenario(scenario) {
  const analysis = engine.analyze(scenario.input);
  const actualCodes = analysis.findings.map(item => item.code);
  const failures = [];
  if (analysis.status !== scenario.expected.status) failures.push(
    `status: expected ${scenario.expected.status}, received ${analysis.status}`);
  if (JSON.stringify(actualCodes) !== JSON.stringify(scenario.expected.codes)) failures.push(
    `codes: expected ${JSON.stringify(scenario.expected.codes)}, received ${JSON.stringify(actualCodes)}`);
  if (scenario.expected.languageAssessment && analysis.languageAssessment !==
      scenario.expected.languageAssessment) failures.push(
    `languageAssessment: expected ${scenario.expected.languageAssessment}, received ${analysis.languageAssessment}`);
  const serializedFindings = JSON.stringify(analysis.findings);
  (scenario.sensitiveTokens || []).forEach(token => {
    if (serializedFindings.includes(token)) failures.push(
      "findings exposed a protected fixture token");
  });
  return { id: scenario.id, failures, analysis };
}

function run(corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"))) {
  validate(corpus);
  const results = corpus.scenarios.map(evaluateScenario);
  const passed = results.filter(item => !item.failures.length).length;
  return { corpusVersion: corpus.corpusVersion, scenarioCount: results.length,
    passed, failed: results.length - passed, accuracy: passed / results.length,
    results };
}

if (require.main === module) {
  const result = run();
  result.results.forEach(item => item.failures.forEach(failure =>
    console.error(`${item.id}: ${failure}`)));
  console.log(`Process analysis corpus ${result.corpusVersion}: ` +
    `${result.passed}/${result.scenarioCount} scenarios passed.`);
  if (result.failed) process.exitCode = 1;
}

module.exports = { corpusPath, evaluateScenario, run, validate };
