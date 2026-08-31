const assert = require("assert");
const integrity = require("../src/engine/capture-packet-integrity");
const grouping = require("../src/engine/event-step-grouping");

function event(id, kind, extra = {}) {
  return { normalizedEventId: `normalized:${id}`,
    sourceEventId: `source:${id}`, sourceEventIds: [`source:${id}`],
    recordingId: "integrity", kind,
    timestamp: `2026-08-31T10:00:0${id.length}.000Z`, sequence: id.length,
    pageIdentification: { pageIdentity: "bc:page:sales-order" },
    controlIdentification: {}, frameContext: { frameId: "top" }, ...extra };
}

assert.strictEqual(integrity.VERSION, "1.0.0");
const events = [
  event("action", "activation", { interactionId: "interaction:release",
    interactionIds: ["interaction:release"], screenshotAssetId: "before" }),
  event("result", "navigation", { interactionId: "interaction:release",
    interactionIds: ["interaction:release"], screenshotAssetId: "after" })
];
const grouped = grouping.group({ schemaVersion: 1, recordingId: "integrity",
  events });
assert.strictEqual(grouped.groups.length, 1);
assert.strictEqual(grouped.groups[0].capturePacketIntegrity.valid, true);
assert.strictEqual(grouped.diagnostics.capturePacketValid, true);
assert.deepStrictEqual(grouped.diagnostics.capturePacketDiagnostics, []);
assert.ok(Object.isFrozen(grouped.groups[0].capturePacketIntegrity));
assert.strictEqual(JSON.stringify(events).includes("capturePacketIntegrity"), false,
  "integrity validation must not mutate normalized evidence");

const validPacket = grouped.groups[0].capturePacket;
assert.strictEqual(integrity.assertValid(validPacket, { events }).valid, true);

const conflicting = { ...validPacket, interactionId: "interaction:c",
  interactionIds: ["interaction:a", "interaction:b"], completeness: "complete",
  missing: [], preferredScreenshotAssetId: "missing-asset",
  preferredSourceEventId: "source:missing",
  interactionEventIds: ["normalized:missing"],
  resultVerification: { ...validPacket.resultVerification,
    primaryOutcome: "missing-outcome",
    primaryOutcomeEventId: "normalized:missing",
    sourceEventIds: ["source:missing"], outcomes: [{
      kind: "navigation", normalizedEventId: "normalized:missing",
      sourceEventIds: ["source:missing"] }] } };
const invalid = integrity.validate(conflicting, { events });
assert.strictEqual(invalid.valid, false);
for (const code of ["conflicting-interaction-identities",
  "interaction-identity-mismatch", "unknown-interaction-event-reference",
  "unknown-preferred-screenshot", "unknown-preferred-source-event",
  "unknown-result-source-reference", "unknown-result-outcome-event",
  "primary-outcome-mismatch", "primary-outcome-kind-mismatch"]) {
  assert(invalid.diagnostics.some(item => item.code === code),
    `expected diagnostic ${code}`);
}
assert.throws(() => integrity.assertValid(conflicting, { events }), error =>
  error.code === "CAPTURE_PACKET_INTEGRITY_FAILED" &&
  error.diagnostics.length === invalid.diagnostics.length);

const compatibility = integrity.validate({ ...validPacket,
  interactionId: null, interactionIds: [],
  interactionIdentitySource: "compatibility-grouping" }, { events });
assert.strictEqual(compatibility.valid, true,
  "historical packets without recorder identity remain compatible");
assert(compatibility.diagnostics.some(item =>
  item.code === "compatibility-interaction-identity" && item.severity === "info"));

console.log("Capture Packet integrity gate tests passed.");
