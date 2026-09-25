const assert = require("assert");
const evidenceModel = require("../src/bug-report/error-evidence-model");
const correlator = require("../src/bug-report/error-incident-correlator");

const recordingId = "recording:correlation";
const evidence = values => evidenceModel.normalize({ kind: "error-evidence",
  schemaVersion: 1, recordingId, ...values });
const validation = evidence({ evidenceId: "error:validation",
  timestamp: "2026-09-22T11:00:00.000Z", sourceType: "business-central",
  category: "validation", message: { raw: "Quantity must have a value." },
  precedingAction: { eventId: "event:post" } });
const alRuntime = evidence({ evidenceId: "error:al",
  timestamp: "2026-09-22T11:00:00.700Z", sourceType: "al-runtime",
  category: "runtime", message: { raw: "Posting failed." },
  precedingAction: { eventId: "event:post" },
  callStack: { available: true, raw: "Codeunit.Run" } });
const unrelated = evidence({ evidenceId: "error:unrelated",
  timestamp: "2026-09-22T11:01:00.000Z", sourceType: "business-central",
  category: "validation", message: { raw: "Name is required." },
  precedingAction: { eventId: "event:customer" } });
const observed = [
  { evidenceId: validation.evidenceId,
    classification: { type: "data-validation", confidence: "high", priority: 900 } },
  { evidenceId: alRuntime.evidenceId,
    classification: { type: "al-runtime", confidence: "high", priority: 1000 } },
  { evidenceId: unrelated.evidenceId,
    classification: { type: "data-validation", confidence: "high", priority: 900 } }
];

const result = correlator.correlate([validation, alRuntime, unrelated], observed,
  { recordingId });
assert.strictEqual(result.incidents.length, 2);
const combined = result.incidents.find(item => item.evidenceIds.length === 2);
assert.deepStrictEqual(combined.evidenceIds, ["error:al", "error:validation"]);
assert.strictEqual(combined.primaryEvidenceId, "error:al");
assert.strictEqual(combined.correlation.confidence, "high");
assert(combined.correlation.reasons.some(reason =>
  reason.code === "same-preceding-action"));
assert.deepStrictEqual(result.uncorrelatedEvidenceIds, ["error:unrelated"]);

const sharedActivityA = evidence({ evidenceId: "error:activity-a",
  timestamp: "2026-09-22T12:00:00.000Z", sourceType: "network",
  message: { raw: "Request failed" },
  technicalIdentifiers: { clientActivityId: "ABC-123" } });
const sharedActivityB = evidence({ evidenceId: "error:activity-b",
  timestamp: "2026-09-22T12:00:30.000Z", sourceType: "business-central",
  message: { raw: "Operation failed" },
  technicalIdentifiers: { clientActivityId: "abc-123" } });
const activityResult = correlator.correlate([sharedActivityA, sharedActivityB], [],
  { recordingId });
assert.strictEqual(activityResult.incidents.length, 1,
  "a shared strong identifier must correlate evidence outside the time window");
assert(activityResult.incidents[0].correlation.reasons.some(reason =>
  reason.code === "shared-technical-identifier" &&
  reason.field === "clientActivityId"));

const contextA = evidence({ evidenceId: "error:context-a",
  timestamp: "2026-09-22T13:00:00.000Z", sourceType: "network",
  message: { raw: "Request failed" }, networkContext: { url: "https://bc/page/42" } });
const contextB = evidence({ evidenceId: "error:context-b",
  timestamp: "2026-09-22T13:00:04.000Z", sourceType: "business-central",
  message: { raw: "Operation failed" }, clientContext: { url: "https://bc/page/42" } });
const contextResult = correlator.correlate([contextA, contextB], [], { recordingId });
assert.strictEqual(contextResult.incidents.length, 1);
assert.strictEqual(contextResult.incidents[0].correlation.confidence, "medium");

const reversed = correlator.correlate([unrelated, alRuntime, validation],
  [...observed].reverse(), { recordingId });
assert.deepStrictEqual(reversed.incidents.map(item => item.incidentId),
  result.incidents.map(item => item.incidentId),
  "incident identity and order must not depend on input order");
assert(Object.isFrozen(result.incidents[0].correlation.reasons));

console.log("Deterministic error-incident correlation tests passed.");
