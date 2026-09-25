const assert = require("assert");
const engine = require("../src/bug-report/error-analysis-engine");
const evidenceModel = require("../src/bug-report/error-evidence-model");
const canonical = require("../src/engine/canonical-recording");
const service = require("../src/bug-report/bug-report-service");
const issuePackage = require("../src/bug-report/issue-package");

const validation = {
  errorEvidenceId: "error:validation", recordingId: "recording:error-engine",
  capturedAt: "2026-09-22T08:00:00.000Z",
  rawMessage: "Quantity must have a value.", errorCategory: "validation",
  precedingActionEventId: "event:quantity",
  errorScreenshotAssetId: "asset:validation",
  structuredDiagnostics: {}
};
const runtime = {
  errorEvidenceId: "error:runtime", recordingId: "recording:error-engine",
  capturedAt: "2026-09-22T08:00:01.000Z",
  rawMessage: "An error occurred while posting.", errorCategory: "runtime",
  rawDiagnostics: "AL Call Stack: ...", callStackAvailable: true,
  structuredDiagnostics: { internalSessionId: "session-1" }
};
const network = {
  errorEvidenceId: "error:network", recordingId: "recording:error-engine",
  capturedAt: "2026-09-22T08:00:02.000Z",
  rawMessage: "HTTP 504: Network connection timed out.",
  errorCategory: "unknown", structuredDiagnostics: {}
};

const analyzed = engine.analyze([validation, network, runtime], [{
  errorEvidenceId: runtime.errorEvidenceId,
  summary: { callStackAvailable: true }, callStack: { frames: [{ method: "Post" }] }
}], { recordingId: validation.recordingId });

assert.strictEqual(analyzed.schemaVersion, 1);
assert.strictEqual(analyzed.engineVersion, "1.6.0");
assert.strictEqual(analyzed.diagnosisEngineVersion, "1.1.0");
assert.strictEqual(analyzed.errorCodeRegistryVersion, "1.0.0");
assert.strictEqual(analyzed.privacyClassifierVersion, "1.0.0");
assert.strictEqual(analyzed.privacyAssessments.length, 3);
assert.strictEqual(analyzed.correlatorVersion, "1.0.0");
assert.strictEqual(analyzed.rulesetVersion, "1.0.0");
assert.strictEqual(analyzed.evidenceSchemaVersion, 1);
assert.deepStrictEqual(analyzed.classifications,
  ["data-validation", "integration-network", "al-runtime"]);
assert.strictEqual(analyzed.primaryErrorEvidenceId, runtime.errorEvidenceId,
  "the strongest and latest evidence should become primary deterministically");
assert.strictEqual(analyzed.incidents.length, 1);
assert.deepStrictEqual(analyzed.incidents[0].evidenceIds,
  [network.errorEvidenceId, runtime.errorEvidenceId, validation.errorEvidenceId]);
assert.strictEqual(analyzed.observedErrors[0].classification.confidence, "high");
assert.strictEqual(analyzed.observedErrors[0].classification.reasonCode,
  "captured-error-category");
assert.strictEqual(analyzed.observedErrors[0].classification.errorCode,
  "BCPS-VALIDATION-001");
assert.deepStrictEqual(analyzed.errorCodes,
  ["BCPS-VALIDATION-001", "BCPS-NETWORK-001", "BCPS-AL-RUNTIME-001"]);
assert.deepStrictEqual(analyzed.incidents[0].errorCodes,
  ["BCPS-NETWORK-001", "BCPS-AL-RUNTIME-001", "BCPS-VALIDATION-001"]);
assert.strictEqual(analyzed.observations[0].provenance.authorship, "captured");
assert.strictEqual(analyzed.classificationResults[0].provenance.authorship,
  "derived");
assert.strictEqual(analyzed.diagnosisResults[0].status, "hypothesis");
assert.strictEqual(analyzed.diagnosisResults[0].hypotheses[0].epistemicStatus,
  "hypothesis");
assert(analyzed.observedErrors[0].facts.some(fact =>
  fact.kind === "error-message" && fact.provenance === "captured"));
assert(analyzed.observedErrors[0].facts.some(fact =>
  fact.kind === "classification" && fact.provenance === "derived"));
assert(analyzed.observedErrors[1].missingInformation.includes("technical-diagnostics"));
assert.strictEqual(runtime.rawMessage, "An error occurred while posting.",
  "analysis must not mutate captured evidence");

const normalizedValidation = evidenceModel.normalize({ ...validation,
  futureCapturedField: "preserved" });
assert.strictEqual(normalizedValidation.kind, "error-evidence");
assert.strictEqual(normalizedValidation.evidenceId, validation.errorEvidenceId);
assert.strictEqual(normalizedValidation.message.raw, validation.rawMessage);
assert.strictEqual(normalizedValidation.precedingAction.eventId, "event:quantity");
assert.strictEqual(normalizedValidation.screenshot.assetId, "asset:validation");
assert.strictEqual(normalizedValidation.rawEvidence.futureCapturedField, "preserved");
assert(Object.isFrozen(normalizedValidation.rawEvidence));
assert.throws(() => evidenceModel.normalizeMany([validation, validation]),
  /Duplicate ErrorEvidence identity/u);
const canonicalNetwork = evidenceModel.normalize({ kind: "error-evidence",
  schemaVersion: 1, evidenceId: "network:canonical",
  recordingId: validation.recordingId, timestamp: "2026-09-22T08:00:03.000Z",
  sourceType: "network", message: { raw: "Gateway unavailable" },
  networkContext: { status: 502 } });
assert.strictEqual(engine.analyzeOne(canonicalNetwork).classification.type,
  "integration-network");

let recording = canonical.create({ id: validation.recordingId,
  startedAt: "2026-09-22T07:59:00.000Z", recordingPurpose: "bug-report" });
recording = canonical.addEvent(recording, { id: "event:quantity", type: "input",
  timestamp: "2026-09-22T07:59:30.000Z", label: "Quantity" });
recording = canonical.finish(recording, "2026-09-22T08:01:00.000Z");
const report = service.createBugReportFromRecording(recording, [{
  taskId: "quantity", instruction: "Enter Quantity.",
  sourceEventIds: ["event:quantity"]
}], { now: "2026-09-22T08:01:00.000Z", errorEvidence: [validation] });
assert.strictEqual(report.errorAnalysis.observedErrors[0].classification.type,
  "data-validation");
assert.strictEqual(report.businessCentralError.primaryErrorEvidenceId,
  validation.errorEvidenceId);
assert.strictEqual(report.reproduction.steps[0].failurePoint, true);
const packaged = issuePackage.build(report, { errorEvidence: [validation] },
  { generatedAt: "2026-09-22T08:02:00.000Z" });
assert.strictEqual(packaged.errorAnalysis.engineVersion, engine.ENGINE_VERSION);
assert(!JSON.stringify(packaged.errorAnalysis).includes("rawEvidence"));
const reparsed = service.reparseTechnicalDiagnostics(report, [runtime]);
assert.strictEqual(reparsed.errorAnalysis.observedErrors[0].classification.type,
  "al-runtime");

console.log("Canonical error analysis engine tests passed.");
