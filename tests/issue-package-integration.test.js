const assert = require("assert");
const fs = require("fs");
const model = require("../src/bug-report/bug-report-model");
const packages = require("../src/bug-report/issue-package");
const formatter = require("../src/bug-report/issue-package-markdown");
const generator = require("../src/bug-report/bug-report-generator");

const evidence = [{ errorEvidenceId: "error-1", capturedAt: "2026-08-24T10:00:00Z",
  rawMessage: "Posting **failed** <script>alert(1)</script>\nDo not alter this error.",
  supportUrl: "https://businesscentral.dynamics.com/tenant/Sandbox?page=42",
  rawCallStack: "Codeunit 80 Sales-Post.Run line 42",
  structuredDiagnostics: { internalSessionId: "session-1", environment: "Sandbox" } },
{ errorEvidenceId: "error-2", capturedAt: "2026-08-24T10:01:00Z",
  rawMessage: "Secondary error", rawCallStack: "" }];
let report = model.normalize({ schemaVersion: 1, bugReportId: "bug-report:issue",
  recordingId: "recording-1", updatedAt: "2026-08-24T11:00:00Z", status: "ready",
  summary: { title: "Posting failure", summary: "Posting cannot complete.",
    severity: "High" }, reproduction: { steps: [
    { reproductionStepId: "step-a", instruction: "Open order.",
      source: { screenshotAssetIds: ["shot-1"] } },
    { reproductionStepId: "hidden", instruction: "Obsolete event.", visibility: "hidden" },
    { reproductionStepId: "step-b", instruction: "Post order.",
      source: { screenshotAssetIds: ["shot-2", "unused"] } }] },
  environment: { name: "Sandbox", businessCentral: {
    environment: "BC-Sandbox" } },
  expectedResult: { text: "Order is posted." }, actualResult: { human: {
    text: "Posting stops." }, capturedErrorRefs: ["error-1", "error-2"] },
  businessCentralError: { primaryErrorEvidenceId: "error-1",
    errorEvidenceIds: ["error-1", "error-2"] }, evidence: { screenshots: [
    { assetId: "error-shot", role: "error", errorEvidenceId: "error-1" },
    { assetId: "shot-1", role: "reproduction" },
    { assetId: "shot-2", role: "reproduction" },
    { assetId: "unused", role: "supporting" }] },
  technicalDiagnostics: [{ errorEvidenceId: "error-1", summary: {
    parseStatus: "parsed" }, callStack: { parserVersion: "1.0.0", frames: [
      { frameIndex: 0, objectType: "Codeunit", objectId: 80,
        objectName: "Sales-Post", methodName: "Run" },
      { frameIndex: 1, objectType: "Page", objectId: 42,
        objectName: "Sales Order", methodName: "Post" }] } }],
  notes: [{ noteId: "note-1", text: "Review with developer." }], enrichment: {
    telemetry: { byErrorEvidenceId: { "error-1": { status: "completed", events: [{
      telemetryEventId: "event-1", timestamp: "2026-08-24T10:00:01Z",
      category: "error", eventName: "AL runtime", correlationReasons: ["exact-session"]
    }] } } }, analysis: null } });

const options = { generatedAt: "2026-08-24T12:00:00Z",
  includeTelemetry: false };
const pkg = packages.build(report, { errorEvidence: evidence }, options);
assert.deepStrictEqual(pkg, packages.build(report, { errorEvidence: evidence }, options));
assert.strictEqual(pkg.provenance.type, "derived-issue-package");
assert.strictEqual(pkg.documentLanguage, "en-US");
assert.deepStrictEqual(pkg.reproduction.map(item => item.instruction),
  ["Open order.", "Post order."]);
assert.strictEqual(pkg.errorEvidence.primary.rawMessage, evidence[0].rawMessage);
assert.deepStrictEqual(pkg.callStack[0].frames.map(item => item.objectId), [80, 42]);
assert.deepStrictEqual(pkg.attachments.map(item => item.assetId),
  ["error-shot", "shot-1", "shot-2"]);
assert.strictEqual(pkg.telemetry, null); assert.ok(!("aiAnalysis" in pkg));
const markdown = formatter.markdown(pkg);
assert(!markdown.includes("Obsolete event"));
assert(markdown.includes(evidence[0].rawMessage));
assert(markdown.includes(`[Open in Business Central](${evidence[0].supportUrl})`));
assert(markdown.includes("## Summary"),
  "a distinct human summary must remain visible");
assert(!markdown.includes("Technical Details"));
assert(!markdown.includes("## AL Call Stack"));
const callStackMarkdown = formatter.markdown(packages.build(report,
  { errorEvidence: evidence }, { ...options, includeCallStack: true }));
assert(callStackMarkdown.includes("## AL Call Stack"));
assert(!callStackMarkdown.includes("## Technical Details"));
assert(!callStackMarkdown.includes("## Telemetry"));
const technicalMarkdown = formatter.markdown(packages.build(report,
  { errorEvidence: evidence }, { ...options, includeTechnicalDetails: true }));
assert(technicalMarkdown.includes("## Technical Details"));
assert(technicalMarkdown.includes("### Environment"));
assert(technicalMarkdown.includes("businessCentral.environment: BC-Sandbox"));
assert(!technicalMarkdown.includes("recordingSchemaVersion"));
assert(technicalMarkdown.includes("## AL Call Stack"));
assert(formatter.code(evidence[0].rawMessage).includes(evidence[0].rawMessage));
const telemetryPkg = packages.build(report, { errorEvidence: evidence }, {
  ...options, includeTelemetry: true });
assert.strictEqual(telemetryPkg.telemetry.contexts[0].events[0].telemetryEventId,
  "event-1");

// AI analysis was removed; an analysis stored by an earlier version is kept but never shared.
const legacyAnalysis = { schemaVersion: 1, analysisId: "analysis-1", status: "current",
  summary: "Legacy AI summary.", observations: [], hypotheses: [] };
const legacy = model.normalize({ ...report, enrichment: { ...report.enrichment,
  analysis: legacyAnalysis } });
assert.deepStrictEqual(legacy.enrichment.analysis, legacyAnalysis);
const legacyPkg = packages.build(legacy, { errorEvidence: evidence }, { ...options,
  includeAiAnalysis: true });
assert.ok(!("aiAnalysis" in legacyPkg) && !("aiAnalysis" in legacyPkg.inclusion));
assert.ok(!legacyPkg.privacy.categories.includes("ai-analysis"));
assert.ok(!formatter.markdown(legacyPkg).includes("Legacy AI summary."));
assert.ok(!generator.project(legacy, { errorEvidence: evidence }).sections
  .some(item => item.id === "ai-analysis"));
const changed = model.updateHumanContent(report, { expectedResult: "Changed" },
  "2026-08-24T13:00:00Z");
assert(packages.isStale(pkg, changed, { errorEvidence: evidence }));

// External issue destinations were removed; the package stays a local projection.
assert(!/client_secret|access_token|refresh_token|Bearer/iu.test(JSON.stringify(pkg)));
assert(!fs.readFileSync("src/ui/technical-report.js", "utf8").includes("innerHTML"));
console.log("Issue Package integration tests passed.");
