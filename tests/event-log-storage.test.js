const assert = require("node:assert/strict");
const eventLogStorage = require("../src/engine/event-log-storage");

function makeStorage(supportsGetKeys = false) {
  const values = new Map();
  const writes = [];
  const reads = [];
  const storage = {
    async get(keys) {
      reads.push(keys);
      if (keys == null) return Object.fromEntries([...values].map(([key, value]) =>
        [key, JSON.parse(JSON.stringify(value))]));
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter(key => values.has(key)).map(key =>
        [key, JSON.parse(JSON.stringify(values.get(key)))]));
    },
    async set(items) {
      writes.push(Object.keys(items));
      for (const [key, value] of Object.entries(items)) {
        values.set(key, JSON.parse(JSON.stringify(value)));
      }
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) values.delete(key);
    },
    keys() { return [...values.keys()]; },
    value(key) { return values.get(key); },
    removeRaw(key) { values.delete(key); },
    writes,
    reads
  };
  if (supportsGetKeys) storage.getKeys = async () => [...values.keys()];
  return storage;
}

(async () => {
  const storage = makeStorage();
  const log = eventLogStorage.create({ storage, prefix: "raw_", batchSize: 3 });
  let recording = { recordingId: "r1", schemaVersion: 1, events: [], diagnostics: [] };
  await log.save(recording);
  for (let index = 1; index <= 8; index += 1) {
    recording = { ...recording, events: [...recording.events, {
      acceptedSequence: index, sourceEventId: `event-${index}`, type: "click"
    }] };
    await log.save(recording);
    const writtenEventKeys = storage.writes.at(-1).filter(key => key.includes(":event:"));
    assert.equal(writtenEventKeys.length, 1,
      "an append writes one event record regardless of the existing recording length");
  }
  const restored = await log.load("r1");
  assert.deepEqual(restored.events.map(event => event.acceptedSequence),
    [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(storage.reads.filter(Array.isArray).every(keys => keys.length <= 3),
    "event restoration is split into bounded storage reads");

  const canonicalStorage = makeStorage();
  const canonicalLog = eventLogStorage.create({ storage: canonicalStorage,
    prefix: "canonical_", batchSize: 3 });
  let canonicalRecording = { id: "c1", schemaVersion: 1, metadata: {}, assets: [],
    events: [{ id: "c1:event:1", sequence: 1, screenshotAssetId: undefined }] };
  await canonicalLog.save(canonicalRecording);
  canonicalRecording = { ...canonicalRecording,
    events: [...canonicalRecording.events, { id: "c1:event:2", sequence: 2 }] };
  await canonicalLog.save(canonicalRecording);
  assert.equal(canonicalStorage.writes.at(-1).filter(key => key.includes(":event:")).length, 1,
    "canonical event appends also persist only their new event record");
  canonicalRecording = { ...canonicalRecording, events: canonicalRecording.events.map(event =>
    event.sequence === 1 ? { ...event, screenshotAssetId: "asset-1" } : event) };
  await canonicalLog.save(canonicalRecording);
  assert.deepEqual(canonicalStorage.writes.at(-1).filter(key => key.includes(":event:")),
    ["canonical_c1:event:00000001"],
    "screenshot association rewrites only the event it changes");
  assert.equal((await canonicalLog.load("c1")).events[0].screenshotAssetId, "asset-1");

  const legacyStorage = makeStorage();
  await legacyStorage.set({ raw_legacy: { recordingId: "legacy", schemaVersion: 1,
    events: [{ acceptedSequence: 1 }, { acceptedSequence: 2 }], diagnostics: [] } });
  const legacyLog = eventLogStorage.create({ storage: legacyStorage,
    prefix: "raw_", batchSize: 3 });
  const legacy = await legacyLog.load("legacy");
  legacy.events.push({ acceptedSequence: 3 });
  await legacyLog.save(legacy);
  assert.equal(legacyStorage.value("raw_legacy").eventStorageFormat, "chunked-v1");
  assert.equal(legacyStorage.value("raw_legacy").eventCount, 3);
  assert.equal(legacyStorage.value("raw_legacy").events, undefined,
    "legacy monolithic recordings migrate to event-key records on their next save");
  assert.equal((await legacyLog.load("legacy")).events.length, 3);

  await log.remove("r1");
  assert.equal(storage.keys().some(key => key.startsWith("raw_r1")), false,
    "deleting a recording removes both its header and event records");
  log.release("r1");
  canonicalLog.release("c1");
  legacyLog.release("legacy");
  legacyStorage.removeRaw("raw_legacy:event:00000002");
  await assert.rejects(legacyLog.load("legacy"), /Missing persisted event/,
    "incomplete event logs fail loudly instead of silently dropping evidence");
  await legacyLog.remove("legacy");
  assert.equal(legacyStorage.keys().some(key => key.startsWith("raw_legacy")), false,
    "a corrupted event log remains removable without reading every damaged event");
  const orphanStorage = makeStorage();
  await orphanStorage.set({
    "raw_orphan:event:00000001": { acceptedSequence: 1 },
    "raw_orphan:event:00000002": { acceptedSequence: 2 }
  });
  const orphanLog = eventLogStorage.create({ storage: orphanStorage,
    prefix: "raw_", batchSize: 1 });
  assert.equal(await orphanLog.remove("orphan"), 2);
  assert.deepEqual(orphanStorage.keys(), [],
    "orphaned event chunks remain removable after their header is lost");
  const modernOrphanStorage = makeStorage(true);
  await modernOrphanStorage.set({
    "raw_orphan:event:00000001": { acceptedSequence: 1 },
    "raw_unrelated:event:00000001": { acceptedSequence: 1 }
  });
  const modernOrphanLog = eventLogStorage.create({ storage: modernOrphanStorage,
    prefix: "raw_", batchSize: 1 });
  await modernOrphanLog.remove("orphan");
  assert.deepEqual(modernOrphanStorage.keys(), ["raw_unrelated:event:00000001"],
    "key enumeration cleans only the selected recording's orphan chunks");
  console.log("PASS chunked event storage writes appended events independently, migrates old logs and detects gaps.");
})().catch(error => { console.error(error); process.exitCode = 1; });
