const assert = require("assert");
const fs = require("fs");
const canonical = require("../src/engine/canonical-recording");
const evidenceModel = require("../src/bug-report/bc-diagnostic-evidence");
const reportModel = require("../src/bug-report/bug-report-model");
const service = require("../src/bug-report/bug-report-service");
const generator = require("../src/bug-report/bug-report-generator");
const issuePackage = require("../src/bug-report/issue-package");
const issueMarkdown = require("../src/bug-report/issue-package-markdown");

const NOW = "2026-09-08T08:00:00.000Z";
const diagnostics = JSON.parse(fs.readFileSync(
  "tests/fixtures/bc-error-diagnostics.json", "utf8"));

function recording(id) {
  let result = canonical.create({ id, startedAt: NOW,
    recordingPurpose: "bug-report", documentLanguage: "sv-SE" });
  result = canonical.addEvent(result, { id: `${id}:open`, type: "click",
    timestamp: NOW, label: "Open Sales Order" });
  result = canonical.addEvent(result, { id: `${id}:post`, type: "click",
    timestamp: "2026-09-08T08:00:01.000Z", label: "Post" });
  return canonical.finish(result, "2026-09-08T08:00:02.000Z");
}

function steps(source) {
  return [{ taskId: "open-order", instruction: "Öppna försäljningsordern.",
    sourceEventIds: [source.events[0].id] },
  { taskId: "post-order", instruction: "Välj Bokför.",
    sourceEventIds: [source.events[1].id] }];
}

const validationRecording = recording("validation-error");
const validationEvidence = evidenceModel.normalize({
  errorEvidenceId: "validation:evidence", recordingId: validationRecording.id,
  capturedAt: "2026-09-08T08:00:01.500Z",
  precedingActionEventId: validationRecording.events[1].id,
  rawMessage: "Fältet Bokföringsdatum måste ha ett värde.",
  diagnosticsAvailable: false, errorCategory: "validation",
  errorScreenshotAssetId: "validation:screenshot",
  screenshotStatus: "screenshot-captured"
});
let validationReport = service.createBugReportFromRecording(validationRecording,
  steps(validationRecording), { now: NOW, title: "Bokföringen stoppas",
    documentLanguage: "sv-SE", errorEvidence: [validationEvidence] });
validationReport = reportModel.updateHumanContent(validationReport, {
  expectedResult: "Försäljningsordern ska bokföras."
}, "2026-09-08T08:01:00.000Z");
assert.strictEqual(validationReport.reproduction.steps[0].failurePoint,
  undefined);
assert.strictEqual(validationReport.reproduction.steps[1].failurePoint, true);

let delayedRecording = canonical.create({ id: "delayed-validation-error",
  startedAt: NOW, recordingPurpose: "bug-report", documentLanguage: "sv-SE" });
delayedRecording = canonical.addEvent(delayedRecording, { id: "delayed:open",
  type: "click", timestamp: NOW, label: "Open Sales Order" });
delayedRecording = canonical.addEvent(delayedRecording, { id: "delayed:post",
  type: "click", timestamp: "2026-09-08T08:00:01.000Z", label: "Post" });
delayedRecording = canonical.addEvent(delayedRecording, { id: "technical-navigation",
  type: "navigation", timestamp: "2026-09-08T08:00:01.250Z",
  label: "Dialog navigation" });
delayedRecording = canonical.finish(delayedRecording,
  "2026-09-08T08:00:02.000Z");
const delayedEvidence = evidenceModel.normalize({
  errorEvidenceId: "delayed:evidence", recordingId: delayedRecording.id,
  capturedAt: "2026-09-08T08:00:01.500Z",
  precedingActionEventId: delayedRecording.events[2].id,
  rawMessage: "Bokf\u00f6ringen kunde inte slutf\u00f6ras.",
  diagnosticsAvailable: false, errorCategory: "validation"
});
const delayedReport = service.createBugReportFromRecording(delayedRecording,
  steps(delayedRecording), { now: NOW, documentLanguage: "sv-SE",
    errorEvidence: [delayedEvidence] });
assert.strictEqual(delayedReport.reproduction.steps[0].failurePoint, undefined);
assert.strictEqual(delayedReport.reproduction.steps[1].failurePoint, true,
  "the closest documented action should remain the failure point");
const foreignEvidenceReport = service.createBugReportFromRecording(
  delayedRecording, steps(delayedRecording), { now: NOW,
    errorEvidence: [{ errorEvidenceId: "foreign:evidence",
      recordingId: delayedRecording.id, capturedAt: NOW,
      precedingActionEventId: "event-from-another-recording" }] });
assert(foreignEvidenceReport.reproduction.steps.every(step =>
  !step.failurePoint), "foreign evidence must not guess a failure point");
const validationDocument = generator.project(validationReport,
  { errorEvidence: [validationEvidence] });
assert.strictEqual(validationDocument.completeness.ready, true);
assert.strictEqual(validationDocument.sections.find(section =>
  section.id === "actual-result").content.capturedErrors[0].rawMessage,
validationEvidence.rawMessage);

const alRecording = recording("al-runtime-error");
const alEvidence = evidenceModel.normalize({
  errorEvidenceId: "al:evidence", recordingId: alRecording.id,
  capturedAt: "2026-09-08T08:00:01.500Z",
  precedingActionEventId: alRecording.events[1].id,
  rawMessage: "Ett fel uppstod när försäljningsordern bokfördes.",
  rawDiagnostics: diagnostics.fullEnglish, diagnosticsAvailable: true,
  errorCategory: "posting", errorScreenshotAssetId: "al:screenshot",
  screenshotStatus: "screenshot-captured"
});
let alReport = service.createBugReportFromRecording(alRecording,
  steps(alRecording), { now: NOW, title: "AL-fel vid bokföring",
    documentLanguage: "sv-SE", errorEvidence: [alEvidence] });
alReport = reportModel.updateHumanContent(alReport, {
  expectedResult: "Försäljningsordern ska bokföras utan fel."
}, "2026-09-08T08:01:00.000Z");
assert.strictEqual(alReport.reproduction.steps[1].failurePoint, true);
assert(alReport.technicalDiagnostics[0].callStack.frames.length > 0);
assert.strictEqual(alReport.technicalDiagnostics[0].summary.callStackAvailable,
  true);
const pkg = issuePackage.build(alReport, { errorEvidence: [alEvidence] }, {
  generatedAt: "2026-09-08T08:02:00.000Z", includeTelemetry: false,
  includeAiAnalysis: false
});
assert.deepStrictEqual(pkg.reproduction.map(step => step.instruction),
  ["Öppna försäljningsordern.", "Välj Bokför."]);
assert.strictEqual(pkg.errorEvidence.primary.rawMessage, alEvidence.rawMessage);
assert(pkg.callStack[0].frames.length > 0);
assert(pkg.attachments.some(item => item.assetId === "al:screenshot"));
const markdown = issueMarkdown.markdown(pkg);
assert(markdown.includes("AL-fel vid bokföring"));
assert(markdown.includes(alEvidence.rawMessage));
assert(!markdown.includes("undefined"));

console.log("End-to-end bug report validation passed for BC validation and AL runtime errors.");
