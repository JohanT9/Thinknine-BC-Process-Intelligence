const assert = require("assert");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");

function normalized(id, kind, extra = {}) {
  return {
    normalizedEventId: `normalized:${id}`,
    sourceEventId: `source:${id}`,
    sourceEventIds: [`source:${id}`],
    recordingId: "capture-packet",
    kind,
    timestamp: "2026-08-28T10:00:00.000Z",
    sequence: Number(id.replace(/\D/gu, "")) || 1,
    pageIdentification: { pageIdentity: "bc:page:sales-order",
      pageCaption: "Förs.order" },
    controlIdentification: {},
    frameContext: { frameId: "top" },
    ...extra
  };
}

const recordedInteraction = { interactionId: "frame:interaction-1",
  interactionIds: ["frame:interaction-1"] };
const normalizedEvents = [
  normalized("1", "activation", { actionIdentification: { caption: "Släpp" },
    screenshotAssetId: "asset-before" }),
  normalized("2", "activation", { actionIdentification: { caption: "Släpp" } }),
  normalized("3", "navigation", { screenshotAssetId: "asset-result" }),
  normalized("4", "unknown", { rawEventType: "future-framework-mechanic" })
].map((event, index) => index < 3 ? { ...event, ...recordedInteraction } : event);
const before = JSON.stringify(normalizedEvents);
const grouped = grouping.group({ schemaVersion: 1, recordingId: "capture-packet",
  events: normalizedEvents });

assert.strictEqual(JSON.stringify(normalizedEvents), before,
  "capture packet grouping must not mutate normalized or canonical evidence");
assert.ok(Object.isFrozen(grouped.groups[0].capturePacket));
assert.strictEqual(grouped.groups[0].capturePacketIntegrity.valid, true);
assert.strictEqual(grouped.diagnostics.capturePacketValid, true);

assert.strictEqual(grouped.groups.length, 1,
  "duplicate mechanics and their result should become one capture packet");
assert.strictEqual(grouped.supportingEvents.length, 1,
  "unclassified mechanics must remain traceable without creating a step");
assert.strictEqual(grouped.groups[0].capturePacket.completeness, "complete");
assert.strictEqual(grouped.groups[0].capturePacket.preferredSourceEventId,
  "source:3");
assert.strictEqual(grouped.groups[0].capturePacket.interactionId,
  "frame:interaction-1");
assert.deepStrictEqual(grouped.groups[0].capturePacket.interactionEventIds,
  ["normalized:1", "normalized:2"]);
assert.deepStrictEqual(grouped.groups[0].capturePacket.resultEventIds,
  ["normalized:3"]);
assert.strictEqual(grouped.groups[0].capturePacket.preferredScreenshotRole,
  "result");

const interpreted = pipeline.interpret({
  session: { id: "capture-packet", name: "Packet test" },
  events: normalizedEvents.map((event, index) => ({
    eventNo: index + 1,
    canonicalSourceEventId: event.sourceEventId
  })),
  normalizedEvents,
  stepGroups: grouped.groups,
  imagePaths: {
    1: "screenshots/000001.png",
    3: "screenshots/000003.png"
  },
  knowledgePacks: []
});

assert.strictEqual(interpreted.businessTasks.length, 1);
assert.strictEqual(interpreted.businessTasks[0].taskType, "RunAction");
assert.strictEqual(interpreted.businessTasks[0].instruction, "Välj **Släpp**.");
assert.strictEqual(interpreted.businessTasks[0].screenshot,
  "screenshots/000003.png", "the observed result image should win");
assert.strictEqual(interpreted.businessTasks[0].interactionId,
  "frame:interaction-1");
assert.strictEqual(interpreted.businessTasks[0].capturePacket
  .preferredScreenshotRole, "result");
assert.strictEqual(interpreted.businessTasks[0].capturePackets.length, 1);
assert.ok(!interpreted.businessTasks.some(task =>
  String(task.instruction || "").includes("Utför uppgiften")));
assert.deepStrictEqual(interpreted.businessTasks[0].sourceEventIds,
  ["source:1", "source:2", "source:3"]);

console.log("Capture packet pipeline integration tests passed.");
