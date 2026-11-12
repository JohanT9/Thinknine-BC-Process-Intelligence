const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const format = require("../src/engine/review-storage-format");
const progressStore = require("../src/engine/review-progress-store");
const keys = require("../src/engine/storage-keys");
const transfer = require("../src/document/library-transfer");
const { replay } = require("../scripts/capture-quality/replay");

const json = value => JSON.parse(JSON.stringify(value));
const size = value => Buffer.byteLength(JSON.stringify(value));

// A review of a real recording, with its steps as first generated, as the review stores it.
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,
  "fixtures/capture-quality/recordings/bc-purchase-order-vendor-item-release.json"), "utf8"));
const { tasks } = replay(fixture.events, { id: fixture.id, documentLanguage: "sv-SE" });
const review = json({ sessionId: "s1", status: "in-progress", tasks, generatedTasks: tasks,
  commandHistory: [{ type: "edit", before: tasks[0], after: { ...tasks[0], instruction: "Egen text." } }],
  futureField: { kept: true } });

// Stored, every repeated part is kept once; read, the review is exactly what was stored.
const packed = format.pack(review);
assert.equal(format.isPacked(packed), true);
assert.deepEqual(format.unpack(packed), review);
assert(size(packed) < size(review) / 2, `stored ${size(packed)} of ${size(review)} bytes`);
assert.deepEqual(format.unpack(format.pack(packed)), review, "storing a stored review again changes nothing");
assert.deepEqual(json(packed), packed, "the stored review is plain JSON");

// A review stored before this format is read as it is.
assert.equal(format.unpack(review), review);
assert.equal(format.unpack(null), null);
// Values storage leaves out stay left out; small values are not shared.
const small = { a: [undefined, 1], b: { c: undefined, d: "x" } };
assert.deepEqual(json(format.unpack(json(format.pack(small)))), json(small));
// A review that uses the reference key in its own data is stored as it is.
const reserved = { tasks: [{ $shared: 1, note: "x".repeat(600) }, { $shared: 1, note: "x".repeat(600) }] };
assert.deepEqual(format.pack(reserved), reserved);
// Other format markers are kept.
assert.deepEqual(format.unpack(format.pack({ ...review, storageFormat: { other: 2 } })),
  { ...review, storageFormat: { other: 2 } });

// A review a newer version stored is refused, not read wrongly; a damaged one fails clearly.
const newer = { ...packed, storageFormat: { sharedValues: 2 } };
assert.throws(() => format.unpack(newer), error => error.code === "unsupported-review-format");
assert.throws(() => format.unpack({ ...packed, sharedValues: [] }), /invalid shared value/u);

// The progress shown in the library is read from a stored review.
const stored = {};
const storage = {
  async get(request) {
    if (request === null) return json(stored);
    const list = Array.isArray(request) ? request : [request];
    return Object.fromEntries(list.filter(key => key in stored).map(key => [key, json(stored[key])]));
  },
  async set(values) { Object.assign(stored, json(values)); },
  async getKeys() { return Object.keys(stored); }
};
const store = progressStore.create({ storage, reviewPrefix: keys.REVIEW_PREFIX,
  progressPrefix: keys.REVIEW_PROGRESS_PREFIX, isVisible: () => true });

(async () => {
  Object.assign(stored, json(store.entries("s1", review)));
  assert.equal(format.isPacked(stored[`${keys.REVIEW_PREFIX}s1`]), true, "the review is stored packed");
  assert.equal(stored[`${keys.REVIEW_PROGRESS_PREFIX}s1`].total, tasks.length);
  delete stored[`${keys.REVIEW_PROGRESS_PREFIX}s1`];
  assert.equal(await store.hasTasks("s1"), true);
  const [listed] = await store.list();
  assert.equal(listed.total, tasks.length, "progress is read from the stored review");
  stored[`${keys.REVIEW_PREFIX}s2`] = newer;
  assert.equal(progressStore.readStored(newer), null);
  assert.equal(await store.hasTasks("s2"), false, "a newer review is not read");

  // An export holds the review as it was saved, so any version reads it, and its digest is
  // the same as the stored review's.
  stored[`${keys.SESSION_PREFIX}s1`] = { id: "s1", name: "Order", status: "completed" };
  const lines = [];
  for await (const line of transfer.exportLines({ storage, keys,
    items: [{ id: "s1", record: { projectId: "s1", title: "Order" } }] })) lines.push(JSON.parse(line));
  const exported = lines.find(line => line.type === "entry" && line.key === `${keys.REVIEW_PREFIX}s1`);
  assert.deepEqual(exported.value, review);
  const digests = await transfer.localDigests(storage, keys, ["s1"]);
  assert.equal(lines.find(line => line.type === "itemEnd").digest, digests.get("s1").digest);
  console.log(`Review storage format tests passed (${Math.round(100 - 100 * size(packed) / size(review))} % smaller).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
