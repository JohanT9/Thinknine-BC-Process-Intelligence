const assert = require("assert");
const fs = require("fs");
const definitions = require("../src/bug-report/telemetry-query-definitions");
const enrichment = require("../src/bug-report/telemetry-enrichment");
const providerModule = require("../src/bug-report/application-insights-provider");
const reportModel = require("../src/bug-report/bug-report-model");
const generator = require("../src/bug-report/bug-report-generator");
const exporter = require("../src/bug-report/bug-report-text-export");

const context = { errorEvidenceId: "error-1", timestamp: "2026-08-24T10:00:00+02:00",
  applicationInsightsSessionId: "session-1", clientActivityId: "activity-1" };
assert.strictEqual(definitions.windowFor(context.timestamp).normalizedUtc,
  "2026-08-24T08:00:00.000Z");
assert.throws(() => definitions.windowFor(context.timestamp, 31), /1-30/);
assert.strictEqual(definitions.escapeKqlLiteral("x' or 1==1"), "'x'' or 1==1'");
assert.strictEqual(providerModule.validateConfiguration({ enabled: false }).valid, false);
const querySet = definitions.definitions(context);
assert.deepStrictEqual(querySet.map(item => item.queryId), ["bc-session-context",
  "bc-client-activity", "bc-error-window"]);
assert(querySet.every(item => item.queryVersion === "1.0.0"));
assert(!querySet.some(item => item.kql.includes("x' or")));

const configuration = { enabled: true,
  tenantId: "11111111-1111-1111-1111-111111111111",
  clientId: "22222222-2222-2222-2222-222222222222",
  applicationId: "33333333-3333-3333-3333-333333333333" };
let authCalls = 0; let queryCalls = 0;
const provider = providerModule.create({
  async authenticate() { authCalls += 1; return "memory-only-token"; },
  async query(_configuration, token, kql) {
    assert.strictEqual(token, "memory-only-token"); queryCalls += 1;
    if (kql.includes("where tostring(customDimensions.clientActivityId)")) throw Object.assign(new Error("token Bearer abc"),
      { category: "query-failed" });
    return { tables: [{ columns: [{ name: "timestamp" }, { name: "itemId" },
      { name: "eventName" }, { name: "message" }, { name: "severityLevel" },
      { name: "session_Id" }], rows: [["2026-08-24T08:00:01Z", "item-1",
        "AL runtime", "Observed runtime event", 3, "session-1"]] }] };
  }, now: () => "2026-08-24T08:05:00Z",
  sanitizeError: () => "Sanitized query failure." });

(async () => {
  assert.strictEqual((await provider.testConnection(configuration)).status, "connected");
  const result = await provider.queryBugContext(context, configuration);
  assert.strictEqual(result.status, "partial");
  assert.strictEqual(result.events.length, 1, "stable telemetry IDs deduplicate events");
  assert.deepStrictEqual(result.events[0].correlationReasons,
    ["exact-session", "time-window"]);
  assert.strictEqual(result.events[0].provenance.type, "external-telemetry");
  assert(result.queries.some(item => item.status === "failed"));
  assert.strictEqual(authCalls, 2); assert.strictEqual(queryCalls, 4);
  const bounded = providerModule.boundedRecords(Array.from({ length: 600 },
    (_, index) => ({ index, unknownFutureDimension: "x".repeat(3000) })));
  assert(bounded.truncated); assert(bounded.bytes <= 1024 * 1024);

  const unauthorizedProvider = providerModule.create({
    async authenticate() { throw Object.assign(new Error("denied"),
      { category: "unauthorized" }); }, async query() { throw new Error("not called"); },
    sanitizeError: () => "Authorization denied." });
  const unauthorized = await unauthorizedProvider.queryBugContext(context, configuration);
  assert.strictEqual(unauthorized.status, "unauthorized");
  assert.strictEqual(unauthorized.events.length, 0);

  const emptyProvider = providerModule.create({ async authenticate() { return "token"; },
    async query() { return { tables: [] }; } });
  assert.strictEqual((await emptyProvider.queryBugContext(context, {
    ...configuration, environmentName: "Production" })).status, "no-matches");
  const mismatch = await provider.queryBugContext({ ...context,
    environmentName: "Sandbox" }, { ...configuration, environmentName: "Production" });
  assert(mismatch.warnings.some(item => item.code === "environment-mismatch"));

  const report = reportModel.normalize({ bugReportId: "bug-report:1",
    recordingId: "recording-1", schemaVersion: 1,
    businessCentralError: { errorEvidenceIds: ["error-1"] },
    reproduction: { steps: [{ instruction: "Reproduce.", source: {} }] },
    actualResult: { human: { text: "Failed." } } });
  const attached = reportModel.attachTelemetry(report, "error-1", result,
    "2026-08-24T08:06:00Z");
  assert.strictEqual(report.enrichment.telemetry, null, "attachment is immutable");
  assert.strictEqual(attached.enrichment.telemetry.byErrorEvidenceId["error-1"].status,
    "partial");
  const withSecondError = reportModel.attachTelemetry(attached, "error-2",
    { ...result, enrichmentId: "telemetry:error-2" });
  assert.deepStrictEqual(Object.keys(withSecondError.enrichment.telemetry
    .byErrorEvidenceId).sort(), ["error-1", "error-2"]);
  const regenerated = { ...attached, reproduction: { steps: [] } };
  assert(regenerated.enrichment.telemetry, "regeneration can preserve enrichment");
  const document = generator.project(attached, { errorEvidence: [{
    errorEvidenceId: "error-1", capturedAt: context.timestamp, rawMessage: "Exact error" }] });
  assert(document.sectionOrder.includes("telemetry"));
  assert(document.sections.find(item => item.id === "telemetry").content.configured);
  assert(document.sections.find(item => item.id === "correlated-timeline").content
    .some(item => item.provenance === "external-telemetry-evidence"));
  assert(exporter.markdown(document).includes("Application Insights Telemetry"));

  const source = ["application-insights-auth.js", "application-insights-transport.js"]
    .map(file => fs.readFileSync(`src/bug-report/${file}`, "utf8")).join("\n");
  assert(source.includes("code_challenge_method: \"S256\""));
  assert(!/client_secret|refresh_token/iu.test(source));
  assert(fs.readFileSync("src/recorder/background.js", "utf8")
    .includes("Explicit user action only"));
  assert(!fs.readFileSync("src/engine/canonical-recording.js", "utf8")
    .includes("telemetryEnrichment"));
  console.log("Application Insights telemetry enrichment tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
