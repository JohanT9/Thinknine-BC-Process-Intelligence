const assert = require("assert");
const fs = require("fs");
const canonical = require("../src/engine/canonical-recording");
const model = require("../src/bug-report/bug-report-model");
const service = require("../src/bug-report/bug-report-service");
const stores = require("../src/bug-report/bug-report-store");
const keys = require("../src/engine/storage-keys");

const NOW = "2026-08-21T08:00:00.000Z";
const legacy = { id: "legacy", name: "Legacy", purpose: "Create an order",
  startedAt: NOW };
const legacyRecording = canonical.fromLegacy(legacy, []);
assert.strictEqual(legacyRecording.metadata.recordingPurpose, "documentation");
assert.strictEqual(canonical.legacyView(legacyRecording).session.purpose,
  "Create an order");
assert.strictEqual(canonical.normalizeRecordingPurpose("future-mode"),
  "documentation");

const documentation = canonical.create({ id: "documentation", startedAt: NOW });
assert.strictEqual(documentation.metadata.recordingPurpose, "documentation");
const bugSource = canonical.finish(canonical.addScreenshot(canonical.addEvent(
  canonical.create({ id: "bug-recording", startedAt: NOW,
    recordingPurpose: "bug-report" }),
  { id: "event-1", sourceEventId: "source-1", type: "click", timestamp: NOW,
    label: "Post" }), "event-1", "data:image/png;base64,AA==", NOW), NOW);
assert.strictEqual(bugSource.metadata.recordingPurpose, "bug-report");

const sourceSnapshot = JSON.stringify(bugSource);
const steps = [{ taskId: "task-1", instruction: "Select Post.",
  sourceEventIds: [bugSource.events[0].id],
  screenshotAssetIds: [bugSource.assets[0].id] }];
const report = service.createBugReportFromRecording(bugSource, steps, {
  now: NOW, productVersion: "4.6.0", extensionVersion: "4.6.0",
  browser: { name: "Edge", version: "test" }
});
assert.strictEqual(JSON.stringify(bugSource), sourceSnapshot,
  "Bug Report creation must not mutate Canonical Recording");
assert.strictEqual(report.bugReportId, "bug-report:bug-recording");
assert.strictEqual(report.recordingId, bugSource.id);
assert.deepStrictEqual(report.traceability.canonicalEventIds,
  [bugSource.events[0].id]);
assert.deepStrictEqual(report.traceability.screenshotAssetIds,
  [bugSource.assets[0].id]);
assert.strictEqual(report.reproduction.steps[0].authorship, "derived");
assert.strictEqual(report.reproduction.steps[0].failurePoint, undefined);
assert.strictEqual(report.expectedResult.authorship, "human");
assert.strictEqual(report.environment.authorship, "captured");
assert.strictEqual(report.diagnostics.parsedAuthorship, "derived");
assert.strictEqual(report.evidence.authorship, "captured");
assert.strictEqual(report.businessCentralError, null);
assert.strictEqual(report.callStack.parsed, false);
const linkedFailure = service.createBugReportFromRecording(bugSource, steps, {
  now: NOW, errorEvidence: [{ errorEvidenceId: "error-linked",
    recordingId: bugSource.id, capturedAt: NOW,
    precedingActionEventId: bugSource.events[0].id }] });
assert.strictEqual(linkedFailure.reproduction.steps[0].failurePoint, true);
assert.strictEqual(linkedFailure.reproduction.steps[0].outcome, "error");
assert.throws(() => service.createBugReportFromRecording(documentation, []),
  /bug-report recording/u);
assert.throws(() => model.normalize({ schemaVersion: 1 }),
  /identity and recording reference/u);

const future = model.normalize({ ...report, futureField: { retained: true },
  diagnostics: { rawEvidenceRefs: ["diagnostic:1"], parsed: null },
  callStack: { rawEvidenceRef: "call-stack:1", frames: [], parsed: false } });
assert.deepStrictEqual(future.futureField, { retained: true });
const human = model.updateHumanContent(future, {
  summary: { title: "Posting fails", severity: "high", category: "posting" },
  expectedResult: "The order should be posted.",
  actualResult: "Posting stops with an error.",
  notes: [{ noteId: "note-1", text: "Reproduced in a sandbox." }]
}, NOW);
const regenerated = service.regenerate(human, bugSource, [{ taskId: "task-2",
  instruction: "Post the order.", sourceEventIds: [bugSource.events[0].id] }],
{ updatedAt: "2026-08-21T09:00:00.000Z" });
assert.strictEqual(regenerated.summary.title, "Posting fails");
assert.strictEqual(regenerated.expectedResult.text,
  "The order should be posted.");
assert.strictEqual(regenerated.actualResult.human.text,
  "Posting stops with an error.");
assert.strictEqual(regenerated.notes[0].text, "Reproduced in a sandbox.");
assert.strictEqual(regenerated.reproduction.steps[0].source.sourceStepId, "task-2");
assert.strictEqual(regenerated.diagnostics.rawEvidenceRefs[0], "diagnostic:1");
assert.strictEqual(regenerated.callStack.rawEvidenceRef, "call-stack:1");
assert.deepStrictEqual(regenerated.futureField, { retained: true });

const memory = {};
const store = stores.createStore({
  async get(key) { return memory[key]; },
  async set(key, value) { memory[key] = value; },
  async remove(key) { delete memory[key]; },
  async all() { return { ...memory }; }
}, keys.BUG_REPORT_PREFIX);

(async () => {
  await store.save(regenerated);
  assert.strictEqual((await store.load(regenerated.bugReportId)).recordingId,
    bugSource.id);
  assert.strictEqual((await store.list()).length, 1);
  assert.strictEqual((await store.archive(regenerated.bugReportId, NOW)).status,
    "archived");
  await store.remove(regenerated.bugReportId);
  assert.strictEqual(await store.load(regenerated.bugReportId), null);
  assert(!keys.sessionDataKeys(bugSource.id).some(key =>
    key.startsWith(keys.BUG_REPORT_PREFIX)),
  "Bug Report lifecycle must remain independent from recording deletion");

  const domainSource = ["bug-report-model.js", "bug-report-service.js",
    "bug-report-store.js"].map(file => fs.readFileSync(
      `src/bug-report/${file}`, "utf8")).join("\n");
  assert(!domainSource.includes("chrome."));
  assert(!domainSource.includes("docx"));
  const background = fs.readFileSync("src/recorder/background.js", "utf8");
  for (const entry of ["T9_START_BUG_RECORDING", "T9_FINISH_BUG_RECORDING",
    "T9_CREATE_BUG_REPORT", "T9_UPDATE_BUG_REPORT"]) assert(background.includes(entry));
  console.log("Bug Recording architecture and Bug Report model tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
