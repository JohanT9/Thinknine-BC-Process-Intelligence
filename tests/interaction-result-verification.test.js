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
assert.strictEqual(normalization.NORMALIZATION_VERSION, "2.10.0");
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

assert.strictEqual(grouped.groupingVersion, grouping.GROUPING_VERSION);
assert.strictEqual(grouping.CAPTURE_PACKET_VERSION, "1.6.0");
assert.strictEqual(grouping.RESULT_VERIFICATION_VERSION, "1.6.0");
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
  "Sidan F\u00f6rs.order visas nu.");

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
// A status message without readable text is not evidence of completion.
assert.strictEqual(statusResult.status, "unverified");
assert.strictEqual(statusResult.expectedResultSuggestion, "");
const statusWith = caption => grouping.group({ recordingId: "result-verification", events: [
  event("post", "activation", { interactionId: "interaction:post",
    interactionIds: ["interaction:post"], actionIdentification: { caption: "Post" } }),
  event("status", "status-message", { interactionId: "interaction:post",
    interactionIds: ["interaction:post"], controlIdentification: { caption } })
] }).groups[0].capturePacket.resultVerification;
const confirmed = statusWith("Sales order 1001 was posted.");
assert.strictEqual(confirmed.status, "verified");
assert.strictEqual(confirmed.primaryOutcome, "status-message");
assert.ok(confirmed.summary.includes("Sales order 1001 was posted"),
  "the exact Business Central confirmation is preserved");
assert.strictEqual(statusWith("Showing 20 rows").status, "unverified",
  "list announcements do not verify a business outcome");
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
  "Sidan F\u00f6rs.order visas nu.");
assert.strictEqual(interpreted.businessTasks[0].expectedResultSuggestion,
  "Sidan F\u00f6rs.order visas nu.");
assert.strictEqual(interpreted.businessTasks[0].expectedResult, undefined,
  "observations must not overwrite the editable expected-result field");

const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const content = fs.readFileSync("src/recorder/content.js", "utf8");
assert.ok(!dashboard.includes("review-observed-result"), "verified outcomes are retained in the model but omitted from the step card");
assert.ok(!dashboard.includes("renderExternalKnowledgeSuggestions"), "unverified external proposals are omitted from the main review");
assert.ok(content.includes('type: "status-message"'));
assert.ok(content.includes("observedStatusMessages"));

// A refusal that names a completed state is never a confirmation, in any registered language;
// real completions still are.
for (const refusal of [
  "Status must be equal to 'Open' in Sales Header: Document Type=Order, No.=101003. Current value is 'Released'.",
  "Status måste vara lika med Öppen i Inköpshuvud: Dokumenttyp=Order, Nr=2600187. Aktuellt värde är Släppt.",
  "Der Status muss gleich 'Offen' sein. Der aktuelle Wert ist 'Freigegeben'.",
  "Le statut doit être égal à 'Ouvert'. La valeur actuelle est 'Lancé'.",
  "El estado debe ser igual a 'Abierto'. El valor actual es 'Lanzado'.",
  "Status skal være lig med 'Åben'. Den aktuelle værdi er 'Frigivet'.",
  "Tilan on oltava 'Avoin'. Nykyinen arvo on 'Vapautettu'.",
  "Status må være lik 'Åpen'. Gjeldende verdi er 'Frigitt'.",
  "Det är inte tillåtet eftersom ordern har frisläppts."
]) assert.strictEqual(grouping.isCompletionMessage(refusal), false, refusal);
for (const completion of ["The order was posted.", "Sales order 1001 has been released.",
  "Ordern har bokförts.", "Der Auftrag wurde gebucht.", "No. 1001 was posted."]) {
  assert.strictEqual(grouping.isCompletionMessage(completion), true, completion);
}

// A dialog the user types in, such as Tell me, is not a message whatever its text; one only
// answered with a button is.
const dialogWith = typing => grouping.group({ recordingId: "result-verification", events: [
  event("open", "activation", { interactionId: "interaction:open",
    interactionIds: ["interaction:open"], actionIdentification: { caption: "Search" } }),
  event("dialog", "dialog-open", { interactionId: "interaction:open",
    interactionIds: ["interaction:open"],
    controlIdentification: { caption: "Not sure what to search for? Explore pages" } }),
  ...(typing ? [event("typed", "value-change", { interactionId: "interaction:typed",
    interactionIds: ["interaction:typed"], controlIdentification: { caption: "Tell me" },
    value: { normalized: "sales" } })] : []),
  event("closed", "dialog-close", { interactionId: "interaction:open",
    interactionIds: ["interaction:open"] })
] }).groups[0].capturePacket.resultVerification.summary;
assert.doesNotMatch(dialogWith(true), /visade meddelandet/u);
assert.match(dialogWith(false), /^Business Central visade meddelandet “Not sure what to search for/u);

console.log("Interaction result verification tests passed.");
