const assert = require("assert");
const privacy = require("../src/bug-report/error-privacy-classifier");
const engine = require("../src/bug-report/error-analysis-engine");
const issuePackage = require("../src/bug-report/issue-package");

const token = "very-sensitive-token";
const email = "person@example.com";
const evidence = { errorEvidenceId: "privacy:error-1",
  recordingId: "privacy:recording-1", capturedAt: "2026-09-22T10:00:00.000Z",
  rawMessage: `Posting failed for ${email}. Authorization: Bearer ${token}`,
  errorCategory: "runtime", errorScreenshotAssetId: "asset:private-screen",
  structuredDiagnostics: { internalSessionId: "session-1",
    customerName: "Contoso", accessToken: token },
  networkContext: { url: `https://example.test/path?access_token=${token}` } };

const assessment = privacy.assess(evidence);
assert.strictEqual(assessment.classifierVersion, "1.0.0");
assert(assessment.categories.includes("secret"));
assert(assessment.categories.includes("personal-data"));
assert(assessment.categories.includes("business-data"));
assert(assessment.categories.includes("technical-identifier"));
assert(assessment.categories.includes("screenshot"));
assert.strictEqual(assessment.requiresReview, true);
assert.strictEqual(assessment.requiresRedaction, true);
assert(!JSON.stringify(assessment).includes(token),
  "privacy findings must never repeat detected secret values");

const source = { message: evidence.rawMessage, token,
  url: evidence.networkContext.url, nested: { email } };
const projected = privacy.safeProjection(source);
assert(!JSON.stringify(projected).includes(token));
assert(!JSON.stringify(projected).includes(email));
assert.strictEqual(source.token, token, "safe projection must not mutate its source");

const analyzed = engine.analyze([evidence], [], { recordingId: evidence.recordingId });
assert.strictEqual(analyzed.privacyAssessments[0].evidenceId, evidence.errorEvidenceId);
assert.strictEqual(analyzed.privacySummary.requiresRedaction, true);

const report = { bugReportId: "bug-report:privacy", recordingId: evidence.recordingId,
  updatedAt: "2026-09-22T10:01:00.000Z", summary: { title: "Failure" },
  reproduction: { steps: [] }, expectedResult: { text: "" },
  actualResult: { human: { text: "" } }, environment: {}, evidence: { screenshots: [] },
  technicalDiagnostics: [], notes: [], enrichment: {}, errorAnalysis: analyzed };
const packaged = issuePackage.build(report, { errorEvidence: [] },
  { generatedAt: "2026-09-22T10:02:00.000Z" });
assert(!JSON.stringify(packaged.errorAnalysis).includes(token));
assert(!JSON.stringify(packaged.errorAnalysis).includes(email));
assert.strictEqual(packaged.privacy.classifierVersion, privacy.CLASSIFIER_VERSION);
const exposed = issuePackage.build({ ...report, errorAnalysis: null,
  summary: { title: `Failure for ${email}` }, actualResult: { human: {
    text: `Authorization: Bearer ${token}` } } }, { errorEvidence: [] },
{ generatedAt: "2026-09-22T10:02:00.000Z" });
assert(!JSON.stringify(exposed).includes(token),
  "the complete outbound issue package must be sanitized");
assert(!JSON.stringify(exposed).includes(email));

console.log("Error privacy classifier tests passed.");
