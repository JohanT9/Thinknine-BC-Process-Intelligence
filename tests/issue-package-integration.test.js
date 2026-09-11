const assert = require("assert");
const fs = require("fs");
const model = require("../src/bug-report/bug-report-model");
const packages = require("../src/bug-report/issue-package");
const formatter = require("../src/bug-report/issue-package-markdown");
const azure = require("../src/bug-report/azure-devops-adapter");
const github = require("../src/bug-report/github-issue-adapter");
const submissions = require("../src/bug-report/issue-submission-service");

const evidence = [{ errorEvidenceId: "error-1", capturedAt: "2026-08-24T10:00:00Z",
  rawMessage: "Posting **failed** <script>alert(1)</script>\nDo not alter this error.",
  rawCallStack: "Codeunit 80 Sales-Post.Run line 42",
  structuredDiagnostics: { internalSessionId: "session-1", environment: "Sandbox" } },
{ errorEvidenceId: "error-2", capturedAt: "2026-08-24T10:01:00Z",
  rawMessage: "Secondary error", rawCallStack: "" }];
let report = model.normalize({ schemaVersion: 1, bugReportId: "bug-report:issue",
  recordingId: "recording-1", updatedAt: "2026-08-24T11:00:00Z", status: "ready",
  summary: { title: "Posting failure", summary: "Posting cannot complete.",
    severity: "High" }, environment: { name: "Sandbox" }, reproduction: { steps: [
    { reproductionStepId: "step-a", instruction: "Open order.",
      source: { screenshotAssetIds: ["shot-1"] } },
    { reproductionStepId: "hidden", instruction: "Obsolete event.", visibility: "hidden" },
    { reproductionStepId: "step-b", instruction: "Post order.",
      source: { screenshotAssetIds: ["shot-2", "unused"] } }] },
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
  includeTelemetry: false, includeAiAnalysis: false };
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
assert.strictEqual(pkg.telemetry, null); assert.strictEqual(pkg.aiAnalysis, null);
const markdown = formatter.markdown(pkg);
assert(!markdown.includes("Obsolete event"));
assert(markdown.includes(evidence[0].rawMessage));
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
assert(technicalMarkdown.includes("## AL Call Stack"));
assert(formatter.code(evidence[0].rawMessage).includes(evidence[0].rawMessage));
const telemetryPkg = packages.build(report, { errorEvidence: evidence }, {
  ...options, includeTelemetry: true });
assert.strictEqual(telemetryPkg.telemetry.contexts[0].events[0].telemetryEventId,
  "event-1");

const currentFingerprint = require("../src/bug-report/ai-analysis-input")
  .build(report, evidence, {}).sourceEvidenceFingerprint;
report = model.attachAiAnalysis(report, { schemaVersion: 1, analysisId: "analysis-1",
  sourceEvidenceFingerprint: currentFingerprint, status: "completed",
  summary: "Inspect posting.", observations: [], hypotheses: [], recommendedNextChecks: [],
  missingEvidence: [], warnings: [], riskFlags: [], inputPolicy: {} }, report.updatedAt);
assert(packages.build(report, { errorEvidence: evidence }, { ...options,
  includeAiAnalysis: true }).aiAnalysis);
const changed = model.updateHumanContent(report, { expectedResult: "Changed" },
  "2026-08-24T13:00:00Z");
assert.strictEqual(packages.build(changed, { errorEvidence: evidence }, {
  ...options, includeAiAnalysis: true }).aiAnalysis, null);
assert(packages.isStale(pkg, changed, { errorEvidence: evidence }));

const adoConfig = { enabled: true, organization: "org", project: "project",
  workItemType: "Bug", tenantId: "tenant", clientId: "client",
  scope: "499b84ac-1321-427f-aa17-267ca6975798/.default", tags: ["bc"] };
let adoCall;
const ado = azure.create({ async invoke(operation, request) { adoCall = { operation, request };
  return operation === "test" ? { status: "connected" } : { destination: "org/project",
    externalId: 123, url: "https://dev.azure.com/org/project/_workitems/edit/123" }; } });
assert(ado.validatePackage(pkg, adoConfig).valid);
assert(!azure.fieldMap(pkg, adoConfig)[1].value.includes("<script>"));

const ghConfig = { enabled: true, repository: "owner/repository",
  brokerUrl: "https://broker.example", tenantId: "tenant", clientId: "client",
  scope: "api://broker/issues", labels: ["bug"] };
let ghCall;
const gh = github.create({ async invoke(operation, request) { ghCall = { operation, request };
  return operation === "test" ? { status: "connected" } : {
    destination: "owner/repository", externalId: 45,
    url: "https://github.com/owner/repository/issues/45" }; } });
assert(gh.validatePackage(pkg, ghConfig).warnings.length === 1);

(async () => {
  assert.strictEqual((await ado.testConnection(adoConfig)).status, "connected");
  const service = submissions.create(ado);
  await assert.rejects(() => service.submit(pkg, adoConfig),
    error => error.category === "confirmation-required");
  const created = await service.submit(pkg, adoConfig, { explicitConfirmation: true });
  assert.strictEqual(created.reference.externalId, "123");
  assert.strictEqual(adoCall.request.fields[0].path, "/fields/System.Title");
  const ghCreated = await submissions.create(gh).submit(pkg, ghConfig,
    { explicitConfirmation: true });
  assert.strictEqual(ghCall.request.issue.labels[0], "bug");
  assert.strictEqual(ghCreated.status, "partial-success");

  let release;
  const pendingProvider = { id: "fake", capabilities: () => ({}),
    validatePackage: () => ({ valid: true, errors: [] }),
    testConnection: async () => ({}), createIssue: () => new Promise(resolve => {
      release = resolve; }) };
  const pendingService = submissions.create(pendingProvider);
  const pending = pendingService.submit(pkg, { destination: "x" },
    { explicitConfirmation: true });
  await assert.rejects(() => pendingService.submit(pkg, { destination: "x" },
    { explicitConfirmation: true }), error => error.category === "duplicate-submission");
  release({ destination: "x", externalId: "1", url: "https://example.test/1" });
  await pending;

  const timeout = { ...pendingProvider, id: "timeout", async createIssue() {
    throw Object.assign(new Error("timeout"), { category: "ambiguous-timeout",
      uncertain: true }); } };
  await assert.rejects(() => submissions.create(timeout).submit(pkg,
    { destination: "x" }, { explicitConfirmation: true }),
  error => error.category === "ambiguous-timeout" && error.uncertain);
  const unauthorized = { ...pendingProvider, id: "unauthorized", async createIssue() {
    throw Object.assign(new Error("Authorization: Bearer sensitive"), { status: 401 }); } };
  await assert.rejects(() => submissions.create(unauthorized).submit(pkg,
    { destination: "x" }, { explicitConfirmation: true }),
  error => error.category === "unauthorized" && !error.message.includes("sensitive"));

  assert.strictEqual(gh.validatePackage({ ...pkg, expectedResult: "x".repeat(70000) },
    ghConfig).valid, false);
  const referenced = model.attachExternalIssue(report, created.reference,
    "2026-08-24T14:00:00Z");
  assert.strictEqual(referenced.enrichment.externalIssues[0].externalId, "123");
  assert.strictEqual(report.enrichment.externalIssues, undefined);
  assert(!/client_secret|access_token|refresh_token|Bearer sensitive/iu.test(
    JSON.stringify(pkg)));
  assert(!fs.readFileSync("src/ui/technical-report.js", "utf8").includes("innerHTML"));
  console.log("Issue Package and destination integration tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
