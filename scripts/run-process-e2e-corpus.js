const fs = require("fs");
const path = require("path");
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const projector = require("../src/document/review-document-projector");
const corpusPath = path.resolve(__dirname,
  "../tests/fixtures/process-e2e/sanitized-recording-corpus.json");

function validate(corpus) {
  if (corpus?.schemaVersion !== 1 || !corpus.corpusVersion ||
      !Array.isArray(corpus.scenarios) || corpus.scenarios.length < 10) {
    throw new TypeError("Invalid process end-to-end corpus.");
  }
  const ids = new Set();
  corpus.scenarios.forEach(scenario => {
    if (!scenario.id || !Array.isArray(scenario.events) || !scenario.expected ||
        !Array.isArray(scenario.expected.tasks)) {
      throw new TypeError("Invalid process end-to-end scenario.");
    }
    if (ids.has(scenario.id)) throw new TypeError(`Duplicate scenario: ${scenario.id}`);
    ids.add(scenario.id);
  });
  return corpus;
}

function execute(scenario) {
  let recording = canonical.create({ id: scenario.id, name: scenario.id });
  const sourceEvents = []; const imagePaths = {};
  scenario.events.forEach((fixture, index) => {
    const eventNo = index + 1;
    const raw = { sourceEventId: fixture.id, type: fixture.type,
      timestamp: `2026-09-23T10:00:${String(eventNo).padStart(2, "0")}.000Z`,
      sourceFrameId: "top", sourceSequence: eventNo, ...fixture };
    delete raw.id; delete raw.screenshot;
    const eventId = `${scenario.id}:event:${fixture.id}`;
    recording = canonical.addEvent(recording, raw,
      identify.identify(raw, { eventId }));
    sourceEvents.push({ ...raw, eventNo,
      canonicalSourceEventId: recording.events.at(-1).id });
    if (fixture.screenshot) imagePaths[eventNo] = fixture.screenshot;
  });
  const normalized = normalization.normalizeRecording(recording);
  const grouped = grouping.group(normalized);
  const interpreted = pipeline.interpret({ session: { id: scenario.id,
    name: scenario.id }, events: sourceEvents,
  normalizedEvents: normalized.events, stepGroups: grouped.groups,
  supportingEvents: grouped.supportingEvents,
  groupingDiagnostics: grouped.diagnostics, imagePaths, knowledgePacks: [] });
  const document = projector.project({ sessionId: scenario.id,
    sessionName: scenario.id, tasks: interpreted.businessTasks },
  { session: { id: scenario.id, name: scenario.id } }).document;
  return { recording, normalized, grouped, interpreted, document };
}

function evaluateScenario(scenario) {
  const output = execute(scenario); const failures = [];
  const expected = scenario.expected;
  const compareCount = (label, actual, wanted) => {
    if (wanted != null && actual !== wanted) failures.push(
      `${label}: expected ${wanted}, received ${actual}`);
  };
  compareCount("normalizedEvents", output.normalized.events.length,
    expected.normalizedEvents);
  compareCount("groups", output.grouped.groups.length, expected.groups);
  compareCount("tasks", output.interpreted.businessTasks.length,
    expected.tasks.length);
  expected.tasks.forEach((taskExpected, index) => {
    const task = output.interpreted.businessTasks[index]; if (!task) return;
    ["taskType", "fieldCaption", "selectedCaption", "actionCaption",
      "screenshot"].forEach(field => {
      if (taskExpected[field] != null && task[field] !== taskExpected[field]) {
        failures.push(`task ${index + 1} ${field}: expected ${taskExpected[field]}, received ${task[field]}`);
      }
    });
    (taskExpected.instructionIncludes || []).forEach(token => {
      if (!String(task.instruction || "").includes(token)) failures.push(
        `task ${index + 1} instruction omitted required evidence`);
    });
    if (taskExpected.resultStatus &&
        task.resultVerification?.status !== taskExpected.resultStatus) {
      failures.push(`task ${index + 1} resultStatus: expected ${taskExpected.resultStatus}, received ${task.resultVerification?.status}`);
    }
    if (!JSON.stringify(output.document).includes(task.instruction)) failures.push(
      `task ${index + 1} was not projected into the final document`);
  });
  (scenario.protectedTokens || []).forEach(token => {
    if (!JSON.stringify(output.interpreted.businessTasks).includes(token)) {
      failures.push("captured label was not preserved");
    }
  });
  return { id: scenario.id, failures, output };
}

function run(corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"))) {
  validate(corpus);
  const results = corpus.scenarios.map(evaluateScenario);
  const passed = results.filter(result => !result.failures.length).length;
  return { corpusVersion: corpus.corpusVersion, scenarioCount: results.length,
    passed, failed: results.length - passed, accuracy: passed / results.length,
    results };
}
if (require.main === module) {
  const result = run();
  result.results.forEach(item => item.failures.forEach(failure =>
    console.error(`${item.id}: ${failure}`)));
  console.log(`Process end-to-end corpus ${result.corpusVersion}: ` +
    `${result.passed}/${result.scenarioCount} scenarios passed.`);
  if (result.failed) process.exitCode = 1;
}
module.exports = { corpusPath, evaluateScenario, execute, run, validate };
