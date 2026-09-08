const assert = require("assert");
const fs = require("fs");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");

function event(id, kind, extra = {}) {
  return {
    normalizedEventId: `normalized:${id}`,
    sourceEventId: `source:${id}`,
    sourceEventIds: [`source:${id}`],
    recordingId: "result-verification",
    kind,
    timestamp: `2026-08-28T10:00:0${id.length}.000Z`,
    sequence: id.length,
    pageIdentification: { pageIdentity: "bc:page:sales-order",
      pageCaption: "F\u00f6rs.order" },
    controlIdentification: {}, frameContext: { frameId: "top" }, ...extra
  };
}

const sourceError = { id: "canonical:error", recordingId: "result-verification",
  timestamp: "2026-08-28T10:00:03.000Z", sequence: 3,
  raw: { type: "bc-error", errorEvidenceId: "private-evidence",
    copiedDetails: "Sensitive diagnostic details" } };
const [errorKind, errorReason] = normalization.classify(sourceError);
assert.strictEqual(errorKind, "error-outcome");
assert.strictEqual(errorReason, "observed-business-central-error");
assert.strictEqual(normalization.NORMALIZATION_VERSION, "2.7.0");
assert.strictEqual(sourceError.raw.copiedDetails, "Sensitive diagnostic details");

const grouped = grouping.group({ recordingId: "result-verification", events: [
  event("action", "activation", {
    actionIdentification: { caption: "Bokf\u00f6r" },
    screenshotAssetId: "before.png"
  }),
  event("dialog", "dialog-open", {
    pageIdentification: { pageCaption: "Bekr\u00e4fta", modal: true }
  }),
  event("error", "error-outcome", { screenshotAssetId: "error.png" })
] });

assert.strictEqual(grouping.GROUPING_VERSION, "1.14.0");
assert.strictEqual(grouping.CAPTURE_PACKET_VERSION, "1.6.0");
assert.strictEqual(grouping.RESULT_VERIFICATION_VERSION, "1.2.0");
assert.strictEqual(grouped.groups.length, 1,
  "an action and all its immediate outcomes form one packet");
const verification = grouped.groups[0].capturePacket.resultVerification;
assert.strictEqual(verification.status, "error");
assert.strictEqual(verification.primaryOutcome, "error-outcome");
assert.strictEqual(verification.primaryOutcomeEventId, "normalized:error");
assert.deepStrictEqual(verification.outcomes.map(value => value.kind),
  ["dialog-open", "error-outcome"]);
assert.strictEqual(verification.summary, "Business Central visade ett fel.");
assert.ok(!JSON.stringify(verification).includes("Sensitive diagnostic details"));
assert.ok(Object.isFrozen(grouped.groups[0].capturePacket));

const navigation = grouping.group({ recordingId: "result-verification", events: [
  event("open", "activation", { actionIdentification: { caption: "F\u00f6rs.order" } }),
  event("page", "navigation", { pageIdentification: {
    pageIdentity: "bc:page:sales-order", pageCaption: "F\u00f6rs.order" } })
] });
assert.strictEqual(navigation.groups[0].capturePacket.resultVerification.status,
  "verified");
assert.strictEqual(navigation.groups[0].capturePacket.resultVerification.summary,
  "Sidan F\u00f6rs.order \u00f6ppnades.");

const unverified = grouping.group({ recordingId: "result-verification", events: [
  event("only", "activation", { actionIdentification: { caption: "Spara" } })
] }).groups[0].capturePacket.resultVerification;
assert.strictEqual(unverified.status, "unverified");
assert.strictEqual(unverified.expectedResultSuggestion, "");

const sourceStatus = { id: "canonical:status", recordingId: "result-verification",
  timestamp: "2026-08-28T10:00:04.000Z", sequence: 4,
  raw: { type: "status-message", label: "Sales order 1001 was posted." } };
assert.deepStrictEqual(normalization.classify(sourceStatus),
  ["status-message", "observed-accessible-status-message"]);
const statusResult = grouping.group({ recordingId: "result-verification", events: [
  event("post", "activation", { interactionId: "interaction:post",
    interactionIds: ["interaction:post"], actionIdentification: { caption: "Post" } }),
  event("status", "status-message", { interactionId: "interaction:post",
    interactionIds: ["interaction:post"], screenshotAssetId: "status.png" })
] }).groups[0].capturePacket.resultVerification;
assert.strictEqual(statusResult.status, "verified");
assert.strictEqual(statusResult.primaryOutcome, "status-message");
assert.strictEqual(statusResult.summary,
  "Business Central visade ett statusmeddelande.");
assert.ok(!JSON.stringify(statusResult).includes("Sales order 1001"),
  "status text must remain in canonical evidence rather than the document model");
const orphanStatus = grouping.group({ recordingId: "result-verification", events: [
  event("orphan-status", "status-message")
] });
assert.strictEqual(orphanStatus.groups.length, 0,
  "an unbound status message must not create an empty documentation step");
assert.strictEqual(orphanStatus.supportingEvents[0].reason,
  "orphan-status-message");

const interpreted = pipeline.interpret({
  events: navigation.groups[0].sourceEventIds.map((id, index) => ({
    canonicalSourceEventId: id, eventNo: index + 1
  })),
  normalizedEvents: navigation.groups[0].normalizedEvents,
  stepGroups: navigation.groups,
  knowledgePacks: []
});
assert.strictEqual(interpreted.businessTasks.length, 1);
assert.strictEqual(interpreted.businessTasks[0].resultVerified, true);
assert.strictEqual(interpreted.businessTasks[0].observedResult,
  "Sidan F\u00f6rs.order \u00f6ppnades.");
assert.strictEqual(interpreted.businessTasks[0].expectedResultSuggestion,
  "Sidan F\u00f6rs.order \u00f6ppnades.");
assert.strictEqual(interpreted.businessTasks[0].expectedResult, undefined,
  "observations must not overwrite the editable expected-result field");

const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const content = fs.readFileSync("src/recorder/content.js", "utf8");
assert.ok(dashboard.includes('"review.observedResult"'));
assert.ok(dashboard.includes('"review.observedError"'));
assert.ok(dashboard.includes("task.observedResult"));
assert.ok(dashboard.includes("escapeHtml("));
assert.ok(dashboard.includes("T9DocumentLanguage.translateInstruction"));
assert.ok(content.includes('type: "status-message"'));
assert.ok(content.includes("observedStatusMessages"));

console.log("Interaction result verification tests passed.");
