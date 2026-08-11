const assert = require("assert");
const recording = require("../src/engine/canonical-recording");
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
const session = { id: "recording-1", name: "Create order", purpose: "process", startedAt: "2026-08-10T08:00:00.000Z", completedAt: null, updatedAt: "2026-08-10T08:00:00.000Z", status: "recording", settings: { environmentName: "Sandbox" } };
const created = recording.create({ id: session.id, legacySession: session });
assert.strictEqual(created.schemaVersion, 1);
assert.strictEqual(created.metadata.businessCentral.environment, "Sandbox");
const raw = { eventNo: 1, timestamp: "2026-08-10T08:01:00.000Z", type: "field-change", fieldName: "Customer No.", value: "10000", futureCaptureProperty: { retained: true } };
const createdSnapshot = JSON.stringify(created);
const rawSnapshot = JSON.stringify(raw);
const withEvent = recording.addEvent(deepFreeze(created), deepFreeze(raw));
assert.strictEqual(JSON.stringify(created), createdSnapshot);
assert.strictEqual(JSON.stringify(raw), rawSnapshot);
const eventSnapshot = JSON.stringify(withEvent);
const withAsset = recording.addScreenshot(deepFreeze(withEvent), 1,
  "data:image/png;base64,abc", "2026-08-10T08:01:01.000Z");
assert.strictEqual(JSON.stringify(withEvent), eventSnapshot);
const loaded = recording.normalize(JSON.parse(JSON.stringify(withAsset)));
assert.strictEqual(loaded.events[0].type, "fieldChanged");
assert.deepStrictEqual(loaded.events[0].raw.futureCaptureProperty, { retained: true });
assert.strictEqual(loaded.events[0].screenshotAssetId, loaded.assets[0].id);
assert.strictEqual(loaded.assets[0].mimeType, "image/png");
assert.strictEqual(loaded.schemaVersion, 1);
assert.deepStrictEqual(recording.legacyView(loaded).events, [raw]);
assert.strictEqual(created.events.length, 0);
assert.strictEqual(withEvent.events.length, 1,
  "Later screenshot association must not edit accepted event input.");
assert.strictEqual(withEvent.events[0].id, "recording-1:event:1");
assert.strictEqual(recording.addEvent(withEvent, { ...raw, eventNo: 2 }).events.length, 2,
  "Legacy event-number identity remains append-only when no delivery ID exists.");
const stableSource = { ...raw, eventNo: 2, sourceEventId: "frame-a:delivery-2" };
const stableFirst = recording.addEvent(withEvent, stableSource);
const stableDuplicate = recording.addEvent(stableFirst, stableSource);
assert.strictEqual(stableFirst.events[1].id,
  "recording-1:event:frame-a:delivery-2");
assert.strictEqual(stableDuplicate.events.length, stableFirst.events.length);
assert.deepStrictEqual(stableDuplicate.events.map(event => event.id),
  stableFirst.events.map(event => event.id));
const assetAgain = recording.addScreenshot(withAsset, 1,
  "data:image/jpeg;base64,different", "2026-08-10T08:02:00.000Z");
assert.strictEqual(assetAgain.assets[0].id, withAsset.assets[0].id);
assert.strictEqual(assetAgain.assets[0].mimeType, "image/png",
  "Accepted screenshot evidence is not replaced by a later association.");
assert.throws(() => recording.addScreenshot(withEvent, "missing-event",
  "data:image/png;base64,abc"), /event not found/);
const finishedInput = deepFreeze(withAsset);
const finishedSnapshot = JSON.stringify(finishedInput);
const finished = recording.finish(finishedInput, "2026-08-10T09:00:00.000Z");
assert.strictEqual(JSON.stringify(finishedInput), finishedSnapshot);
assert.strictEqual(finished.metadata.finishedAt, "2026-08-10T09:00:00.000Z");
assert.throws(() => recording.addEvent(finished, raw), /immutable/);
assert.throws(() => recording.addScreenshot(finished, 1,
  "data:image/png;base64,late"), /immutable/);
const normalizedInput = deepFreeze({ ...JSON.parse(JSON.stringify(withAsset)),
  unknownTopLevel: { retained: true } });
const normalizedSnapshot = JSON.stringify(normalizedInput);
assert.deepStrictEqual(recording.normalize(normalizedInput).unknownTopLevel,
  { retained: true });
assert.strictEqual(JSON.stringify(normalizedInput), normalizedSnapshot);
assert.throws(() => recording.normalize({ schemaVersion: 99 }),
  /Unsupported recording schema: 99/);
assert.strictEqual(recording.integrityDiagnostics({ schemaVersion: 99 })[0].code,
  "unsupported-canonical-schema");
const brokenAsset = JSON.parse(JSON.stringify(withAsset));
brokenAsset.events[0].screenshotAssetId = "missing-asset";
assert(recording.integrityDiagnostics(brokenAsset).some(item =>
  item.code === "missing-canonical-screenshot-asset"));
assert(recording.integrityDiagnostics(withAsset, { legacyEventCount: 2 })
  .some(item => item.code === "legacy-canonical-event-count-mismatch"));
const old = recording.normalize(null, { session, events: [raw], screenshots: { 1: "data:image/png;base64,abc" } });
assert.strictEqual(old.schemaVersion, 1);
assert.strictEqual(old.events[0].screenshotAssetId, old.assets[0].id);
assert.deepStrictEqual(recording.legacyView(old).events, [raw]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(withAsset)), withAsset,
  "Canonical Recording remains service-worker serializable.");
console.log("Canonical recording tests passed.");
