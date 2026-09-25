const fs = require("fs");
const path = require("path");
const engine = require("../src/bug-report/error-analysis-engine");
const corpusPath = path.resolve(__dirname, "../tests/fixtures/error-analysis/sanitized-error-corpus.json");

function validate(corpus) {
  if (corpus?.schemaVersion !== 1 || !corpus.corpusVersion || !Array.isArray(corpus.scenarios) || !corpus.scenarios.length) throw new TypeError("Invalid error-analysis corpus.");
  const ids = new Set();
  corpus.scenarios.forEach(scenario => {
    if (!scenario.id || !scenario.recordingId || !scenario.evidence?.length || !scenario.expected) throw new TypeError("Invalid error-analysis scenario.");
    if (ids.has(scenario.id)) throw new TypeError(`Duplicate scenario: ${scenario.id}`);
    ids.add(scenario.id);
  });
  return corpus;
}
function compareArray(failures, label, actual, expected) {
  if (expected && JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}
function evaluateScenario(scenario) {
  const analysis = engine.analyze(scenario.evidence, scenario.technicalDiagnostics || [], { recordingId: scenario.recordingId });
  const expected = scenario.expected; const failures = [];
  compareArray(failures, "classifications", analysis.classifications, expected.classifications);
  compareArray(failures, "errorCodes", analysis.errorCodes, expected.errorCodes);
  compareArray(failures, "diagnosisStatuses", analysis.diagnosisResults.map(item => item.status), expected.diagnosisStatuses);
  if (analysis.incidents.length !== expected.incidentCount) failures.push(`incidentCount: expected ${expected.incidentCount}, received ${analysis.incidents.length}`);
  if (expected.primaryErrorEvidenceId && analysis.primaryErrorEvidenceId !== expected.primaryErrorEvidenceId) failures.push(`primaryErrorEvidenceId: expected ${expected.primaryErrorEvidenceId}, received ${analysis.primaryErrorEvidenceId}`);
  if (expected.incidentPrimaryEvidenceId && analysis.incidents[0]?.primaryEvidenceId !== expected.incidentPrimaryEvidenceId) failures.push(`incidentPrimaryEvidenceId: expected ${expected.incidentPrimaryEvidenceId}, received ${analysis.incidents[0]?.primaryEvidenceId}`);
  const categories = [...analysis.privacySummary.categories];
  (expected.privacyCategories || []).forEach(category => { if (!categories.includes(category)) failures.push(`privacy category missing: ${category}`); });
  if (typeof expected.requiresRedaction === "boolean" && analysis.privacySummary.requiresRedaction !== expected.requiresRedaction) failures.push(`requiresRedaction: expected ${expected.requiresRedaction}, received ${analysis.privacySummary.requiresRedaction}`);
  return { id: scenario.id, failures, analysis };
}
function run(corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"))) {
  validate(corpus); const results = corpus.scenarios.map(evaluateScenario);
  const passed = results.filter(item => !item.failures.length).length;
  return { corpusVersion: corpus.corpusVersion, scenarioCount: results.length, passed, failed: results.length - passed, classificationAccuracy: passed / results.length, results };
}
if (require.main === module) {
  const result = run();
  result.results.forEach(item => item.failures.forEach(failure => console.error(`${item.id}: ${failure}`)));
  console.log(`Error analysis corpus ${result.corpusVersion}: ${result.passed}/${result.scenarioCount} scenarios passed.`);
  if (result.failed) process.exitCode = 1;
}
module.exports = { corpusPath, evaluateScenario, run, validate };
