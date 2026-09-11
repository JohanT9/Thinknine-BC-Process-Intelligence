const assert = require("assert");
const fs = require("fs");
const detector = require("../src/recorder/bc-error-detector");
const evidence = require("../src/bug-report/bc-diagnostic-evidence");
const canonical = require("../src/engine/canonical-recording");
const service = require("../src/bug-report/bug-report-service");
const fixtures = require("./fixtures/bc-error-diagnostics.json");

assert.strictEqual(detector.classifySnapshot({ role: "alertdialog",
  accessibleName: "Something went wrong", actions: ["Copy details"] }).detected,
true);
assert.strictEqual(detector.classifySnapshot({ role: "dialog", modal: true,
  accessibleName: "Ett fel uppstod", actions: ["Kopiera information"] }).detected,
true);
assert.strictEqual(detector.classifySnapshot({ role: "dialog", modal: true,
  accessibleName: "Choose a customer" }).detected, false);
assert.notStrictEqual(detector.lifecycleKey({ frameInstanceId: "f",
  elementIdentity: "d", openedAt: "t" }), detector.lifecycleKey({
  frameInstanceId: "f", elementIdentity: "d", openedAt: "t2" }));

let recoveredRecording = canonical.create({ id: "recovered-bug",
  startedAt: "2026-09-11T08:57:47.016Z", recordingPurpose: "bug-report" });
recoveredRecording = canonical.addEvent(recoveredRecording, { type: "click",
  timestamp: "2026-09-11T08:57:59.950Z", label: "Registrera vikt" });
recoveredRecording = canonical.addEvent(recoveredRecording, { type: "dialog-open",
  timestamp: "2026-09-11T08:58:00.100Z",
  topUrl: "https://businesscentral.dynamics.com/tenant/Sandbox?company=Salico%20UAT&page=5768&dc=0&bookmark=abc&tid=secret",
  label: "Spill inträffade under konverteringen av Decimal18 till System.Int32. OK" });
const recovered = evidence.recoverFromRecording(recoveredRecording);
assert.strictEqual(recovered.length, 1);
assert.strictEqual(recovered[0].rawMessage,
  "Spill inträffade under konverteringen av Decimal18 till System.Int32.");
assert.strictEqual(recovered[0].precedingActionEventId,
  recoveredRecording.events[0].id);
assert.strictEqual(recovered[0].supportUrl,
  "https://businesscentral.dynamics.com/tenant/Sandbox?company=Salico%20UAT&page=5768&dc=0&bookmark=abc");
const reportedLocation =
  "https://businesscentral.dynamics.com/20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb/Salico_Sandbox_SE?company=Salico%20UAT&page=5768&dc=0&bookmark=1D_lBwAAAJ7_0QASQBSADEAMAAwADIAMwAx";
assert.strictEqual(evidence.supportUrl(reportedLocation), reportedLocation,
  "BC deep links must retain their exact parameter encoding and order");
assert.strictEqual(evidence.supportUrl("https://evil.example/?page=42"), "");
let informationRecording = canonical.create({ id: "information",
  startedAt: "2026-09-11T08:57:47.016Z", recordingPurpose: "bug-report" });
informationRecording = canonical.addEvent(informationRecording, {
  type: "dialog-open", timestamp: "2026-09-11T08:58:00.100Z",
  label: "Det finns inga nya inleveransrader att skapa. Visa öppna rader" });
assert.deepStrictEqual(evidence.recoverFromRecording(informationRecording), []);

const source = { errorEvidenceId: "error-1", recordingId: "bug-1",
  capturedAt: "2026-08-24T10:00:01Z", rawMessage: "Exact BC punctuation!",
  rawDiagnostics: fixtures.fullEnglish, diagnosticsAvailable: true,
  frameContext: { tabId: 1, frameId: 2, documentId: "doc",
    topUrl: "https://businesscentral.dynamics.com/tenant/Sandbox?company=CRONUS&page=42&bookmark=abc&tid=secret" },
  screenshotStatus: "screenshot-captured", errorScreenshotAssetId: "asset:error" };
const snapshot = JSON.stringify(source);
const full = evidence.normalize(source);
assert.strictEqual(JSON.stringify(source), snapshot);
assert.strictEqual(full.rawMessage, "Exact BC punctuation!");
assert.strictEqual(full.structuredDiagnostics.clientActivityId, "activity-sanitized");
assert.strictEqual(full.callStackAvailable, true);
assert.strictEqual(full.callStackParsed, false);
assert.strictEqual(full.supportUrl,
  "https://businesscentral.dynamics.com/tenant/Sandbox?company=CRONUS&page=42&bookmark=abc");
assert(full.rawCallStack.includes("Sample.Codeunit line 10"));
const localized = evidence.normalize({ ...source, errorEvidenceId: "error-2",
  rawDiagnostics: fixtures.swedish });
assert.strictEqual(localized.structuredDiagnostics.environment, "Sandbox");
assert.strictEqual(localized.callStackAvailable, true);
assert.strictEqual(evidence.normalize({ ...source, errorEvidenceId: "error-3",
  rawDiagnostics: fixtures.withoutStack }).callStackAvailable, false);
assert.deepStrictEqual(evidence.normalize({ ...source, errorEvidenceId: "error-4",
  rawDiagnostics: fixtures.unknownField }).unknownDiagnosticFields,
[{ label: "Future Diagnostic Label", value: "preserved value" }]);
assert.strictEqual(evidence.normalize({ ...source, errorEvidenceId: "error-5",
  rawDiagnostics: "", diagnosticsAvailable: false }).diagnosticsStatus,
"diagnostics-unavailable");
assert.strictEqual(evidence.normalize({ ...source, errorEvidenceId: "error-6",
  rawDiagnostics: "", diagnosticsAvailable: true,
  diagnosticsStatus: "diagnostics-capture-failed" }).diagnosticsStatus,
"diagnostics-capture-failed");

let recording = canonical.create({ id: "bug-1", startedAt: source.capturedAt,
  recordingPurpose: "bug-report" });
recording = canonical.addEvent(recording, { sourceEventId: "source-action",
  type: "click", timestamp: source.capturedAt, label: "Post" });
recording = canonical.addEvent(recording, { sourceEventId: "source-error",
  type: "bc-error", timestamp: source.capturedAt,
  errorEvidenceId: source.errorEvidenceId });
recording = canonical.finish(recording, source.capturedAt);
const report = service.createBugReportFromRecording(recording, [], {
  now: source.capturedAt, errorEvidence: [full, localized] });
assert.deepStrictEqual(report.businessCentralError.errorEvidenceIds,
["error-1", "error-2"]);
assert.strictEqual(report.businessCentralError.primaryErrorEvidenceId, null);
assert(report.evidence.screenshots.some(item => item.assetId === "asset:error" &&
  item.role === "error"));
assert.deepStrictEqual(report.actualResult.capturedErrorRefs,
["error-1", "error-2"]);
const reportWithoutEvidence = service.createBugReportFromRecording(recording, [], {
  now: source.capturedAt, errorEvidence: [] });
const attached = service.attachRecoveredErrorEvidence(reportWithoutEvidence,
  [recovered[0]], source.capturedAt);
assert.deepStrictEqual(attached.businessCentralError.errorEvidenceIds,
  [recovered[0].errorEvidenceId]);
assert.deepStrictEqual(attached.actualResult.capturedErrorRefs,
  [recovered[0].errorEvidenceId]);
assert.deepStrictEqual(service.regenerate(report, recording, [], {
  updatedAt: source.capturedAt }).businessCentralError.errorEvidenceIds,
["error-1", "error-2"]);

const content = fs.readFileSync("src/recorder/content.js", "utf8");
const background = fs.readFileSync("src/recorder/background.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("src/ui/manifest.json", "utf8"));
assert(content.includes('recordingPurpose !== "bug-report"'));
assert(background.includes("T9_CAPTURE_BC_ERROR"));
assert(!JSON.stringify(manifest.permissions).includes("clipboard"));
for (const forbidden of ["ApplicationInsights", "appInsights", "OpenAI", "fetch("]) {
  assert(!fs.readFileSync("src/bug-report/bc-diagnostic-evidence.js", "utf8")
    .includes(forbidden));
}
console.log("BC error dialog and diagnostic evidence capture tests passed.");
