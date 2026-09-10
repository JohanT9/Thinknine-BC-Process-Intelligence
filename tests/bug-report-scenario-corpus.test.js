const assert = require("assert");
const fs = require("fs");
const canonical = require("../src/engine/canonical-recording");
const service = require("../src/bug-report/bug-report-service");
const issuePackage = require("../src/bug-report/issue-package");
const markdown = require("../src/bug-report/issue-package-markdown");

const NOW = "2026-09-10T08:00:00.000Z";
const scenarios = JSON.parse(fs.readFileSync(
  "tests/fixtures/bug-report/sanitized-scenarios.json", "utf8"));

for (const scenario of scenarios) {
  let recording = canonical.create({ id: `bug-corpus:${scenario.id}`,
    startedAt: NOW, recordingPurpose: "bug-report" });
  scenario.events.forEach((event, index) => {
    recording = canonical.addEvent(recording, { ...event,
      id: `${scenario.id}:event:${index + 1}`,
      timestamp: new Date(Date.parse(NOW) + index * 1000).toISOString() });
  });
  recording = canonical.finish(recording,
    new Date(Date.parse(NOW) + scenario.events.length * 1000).toISOString());
  const steps = scenario.steps.map((step, index) => ({ ...step,
    taskId: `${scenario.id}:step:${index + 1}`,
    sourceEventIds: step.sourceIndexes.map(sourceIndex =>
      recording.events[sourceIndex].id) }));
  const errorEvidence = scenario.error ? [{
    errorEvidenceId: `${scenario.id}:error`, recordingId: recording.id,
    capturedAt: recording.metadata.finishedAt,
    precedingActionEventId: recording.events[scenario.error.precedingIndex].id,
    rawMessage: scenario.error.message, diagnosticsAvailable: false
  }] : [];
  const report = service.createBugReportFromRecording(recording, steps, {
    now: NOW, documentLanguage: scenario.language,
    title: scenario.manualTitle, errorEvidence });
  assert.strictEqual(report.summary.title, scenario.expectedTitle,
    `${scenario.id}: title`);
  report.reproduction.steps.forEach((step, index) => assert.strictEqual(
    Boolean(step.failurePoint), index === scenario.failureStepIndex,
    `${scenario.id}: failure step ${index + 1}`));
  const pkg = issuePackage.build(report, { errorEvidence }, {
    generatedAt: NOW, includeTelemetry: false, includeAiAnalysis: false });
  const description = markdown.markdown(pkg);
  assert(!description.includes("## Technical Details"),
    `${scenario.id}: concise sharing default`);
  if (scenario.error) assert(description.includes(scenario.error.message),
    `${scenario.id}: captured error`);
  if (scenario.error) assert.strictEqual(
    description.split(scenario.error.message).length - 1, 1,
    `${scenario.id}: captured error should not be repeated as a summary`);
  assert(description.includes(scenario.language === "sv-SE"
    ? "## Steg för att återskapa" : "## Steps to Reproduce"),
  `${scenario.id}: localized structure`);
}

console.log(`Bug-report scenario corpus passed (${scenarios.length} flows).`);
