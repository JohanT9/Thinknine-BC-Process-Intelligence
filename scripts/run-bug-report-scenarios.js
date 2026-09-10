const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const canonical = require("../src/engine/canonical-recording");
const service = require("../src/bug-report/bug-report-service");
const issuePackage = require("../src/bug-report/issue-package");
const markdown = require("../src/bug-report/issue-package-markdown");

const DEFAULT_DIRECTORY = path.resolve(__dirname, "../scenarios/bug-report");
const STARTED_AT = "2026-09-10T08:00:00.000Z";

function required(value, name, source) {
  if (value == null || value === "" || Array.isArray(value) && !value.length) {
    throw new Error(`${source}: ${name} is required.`);
  }
}

function validate(scenario, source = "scenario") {
  required(scenario?.id, "id", source);
  required(scenario?.name, "name", source);
  if (Number(scenario.schemaVersion) !== 1) throw new Error(
    `${source}: schemaVersion must be 1.`);
  required(scenario?.businessCentral?.language, "businessCentral.language", source);
  required(scenario?.recording?.events, "recording.events", source);
  required(scenario?.recording?.steps, "recording.steps", source);
  required(scenario?.expected?.title, "expected.title", source);
  const eventIds = new Set(scenario.recording.events.map(event => String(event.id)));
  if (eventIds.size !== scenario.recording.events.length) throw new Error(
    `${source}: recording event IDs must be unique.`);
  for (const step of scenario.recording.steps) {
    required(step.id, "recording.steps[].id", source);
    required(step.instruction, `step ${step.id} instruction`, source);
    required(step.sourceEvents, `step ${step.id} sourceEvents`, source);
    for (const id of step.sourceEvents) if (!eventIds.has(String(id))) throw new Error(
      `${source}: step ${step.id} references unknown event ${id}.`);
  }
  if (scenario.error?.afterEvent && !eventIds.has(String(
    scenario.error.afterEvent))) throw new Error(
    `${source}: error references unknown event ${scenario.error.afterEvent}.`);
  if (scenario.live) {
    required(scenario.live.preconditions, "live.preconditions", source);
    required(scenario.live.actions, "live.actions", source);
    required(scenario.live.expectedOutcome, "live.expectedOutcome", source);
  }
  return scenario;
}

function readFiles(target = DEFAULT_DIRECTORY) {
  const resolved = path.resolve(target);
  const stat = fs.statSync(resolved);
  return (stat.isDirectory() ? fs.readdirSync(resolved)
    .filter(file => /\.ya?ml$/iu.test(file)).sort()
    .map(file => path.join(resolved, file)) : [resolved]);
}

function load(target = DEFAULT_DIRECTORY) {
  return readFiles(target).map(file => ({ file, scenario: validate(
    YAML.parse(fs.readFileSync(file, "utf8")), file) }));
}

function check(condition, message, failures) {
  if (!condition) failures.push(message);
}

function run(scenario) {
  const startedAt = scenario.recording.startedAt || STARTED_AT;
  let recording = canonical.create({ id: `scenario:${scenario.id}`, startedAt,
    recordingPurpose: "bug-report" });
  const eventById = new Map();
  scenario.recording.events.forEach((event, index) => {
    recording = canonical.addEvent(recording, { ...event,
      id: `${scenario.id}:event:${event.id}`,
      timestamp: new Date(Date.parse(startedAt) + index * 1000).toISOString() });
    eventById.set(String(event.id), recording.events.at(-1));
  });
  recording = canonical.finish(recording, new Date(Date.parse(startedAt) +
    scenario.recording.events.length * 1000).toISOString());
  const steps = scenario.recording.steps.map(step => ({ ...step,
    taskId: `${scenario.id}:step:${step.id}`,
    sourceEventIds: step.sourceEvents.map(id => eventById.get(String(id)).id) }));
  const errorEvidence = scenario.error ? [{
    errorEvidenceId: `${scenario.id}:error`, recordingId: recording.id,
    capturedAt: recording.metadata.finishedAt,
    precedingActionEventId: eventById.get(String(scenario.error.afterEvent))?.id,
    rawMessage: scenario.error.message,
    diagnosticsAvailable: Boolean(scenario.error.diagnosticsAvailable)
  }] : [];
  const report = service.createBugReportFromRecording(recording, steps, {
    now: startedAt, documentLanguage: scenario.businessCentral.language,
    title: scenario.manualTitle, errorEvidence });
  const pkg = issuePackage.build(report, { errorEvidence }, {
    generatedAt: startedAt, includeTelemetry: false, includeAiAnalysis: false,
    includeTechnicalDetails: Boolean(scenario.export?.includeTechnicalDetails) });
  const description = markdown.markdown(pkg);
  const failures = [];
  check(report.summary.title === scenario.expected.title,
    `title: expected "${scenario.expected.title}", got "${report.summary.title}"`, failures);
  const actualFailure = report.reproduction.steps.find(step => step.failurePoint)
    ?.source?.sourceStepId?.split(":").at(-1) || null;
  check(actualFailure === (scenario.expected.failureStep || null),
    `failure step: expected ${scenario.expected.failureStep || "none"}, got ${
      actualFailure || "none"}`, failures);
  for (const text of scenario.expected.descriptionContains || []) check(
    description.includes(text), `description missing "${text}"`, failures);
  for (const text of scenario.expected.descriptionExcludes || []) check(
    !description.includes(text), `description unexpectedly contains "${text}"`, failures);
  if (scenario.error?.message) check(description.split(scenario.error.message).length - 1 === 1,
    "captured error must occur exactly once in the shared description", failures);
  return { id: scenario.id, name: scenario.name, passed: failures.length === 0,
    failures, report, issuePackage: pkg, markdown: description };
}

function runTarget(target = DEFAULT_DIRECTORY) {
  const loaded = load(target);
  if (!loaded.length) throw new Error(`No YAML scenarios found in ${target}.`);
  return loaded.map(item => ({ file: item.file, ...run(item.scenario) }));
}

if (require.main === module) {
  try {
    const results = runTarget(process.argv[2] || DEFAULT_DIRECTORY);
    results.forEach(result => console.log(`${result.passed ? "PASS" : "FAIL"} ${
      result.id} — ${result.name}${result.failures.length ? `\n  ${
        result.failures.join("\n  ")}` : ""}`));
    const passed = results.filter(result => result.passed).length;
    console.log(`\n${passed}/${results.length} Business Central scenarios passed.`);
    if (passed !== results.length) process.exitCode = 1;
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

module.exports = { DEFAULT_DIRECTORY, load, readFiles, run, runTarget, validate };
