const assert = require("assert");
const evidenceStore = require("../src/engine/bc-error-evidence-store");

const PREFIX = "t9_bc_error_evidence_";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  const calls = { getAll: 0 };
  return {
    data, calls,
    async get(keys) {
      if (keys === null) { calls.getAll += 1; return { ...data }; }
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter(key => key in data)
        .map(key => [key, data[key]]));
    },
    async set(values) { Object.assign(data, values); },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    }
  };
}

(async () => {
  assert.throws(() => evidenceStore.create({ storage: memoryStorage() }), TypeError);

  // Evidence stored by versions without an index is found and indexed once.
  const legacy = memoryStorage({
    [`${PREFIX}e1`]: { recordingId: "r1", errorEvidenceId: "e1" },
    [`${PREFIX}e2`]: { recordingId: "r2", errorEvidenceId: "e2" },
    unrelated: { recordingId: "r1", errorEvidenceId: "x" }
  });
  const store = evidenceStore.create({ storage: legacy, prefix: PREFIX });
  assert.deepStrictEqual((await store.list("r1")).map(item => item.errorEvidenceId), ["e1"]);
  assert.deepStrictEqual(legacy.data[`${PREFIX}index_r1`], ["e1"]);
  await store.list("r1");
  assert.strictEqual(legacy.calls.getAll, 1, "the legacy scan runs once per recording");

  // Concurrent saves for one recording keep every evidence ID in the index.
  await Promise.all([
    store.save({ recordingId: "r1", errorEvidenceId: "e3" }),
    store.save({ recordingId: "r1", errorEvidenceId: "e4" }),
    store.save({ recordingId: "r1", errorEvidenceId: "e3", status: "updated" })
  ]);
  const listed = await store.list("r1");
  assert.deepStrictEqual(listed.map(item => item.errorEvidenceId), ["e1", "e3", "e4"]);
  assert.strictEqual(listed[1].status, "updated", "a later save replaces the evidence");
  assert.throws(() => store.save({ recordingId: "r1" }), TypeError);

  // Deleting one recording removes its evidence and index, not other recordings'.
  assert.strictEqual(await store.remove("r1"), 3);
  for (const id of ["e1", "e3", "e4"]) assert(!(`${PREFIX}${id}` in legacy.data));
  assert(!(`${PREFIX}index_r1` in legacy.data));
  assert(`${PREFIX}e2` in legacy.data, "other recordings keep their evidence");
  assert(legacy.data.unrelated, "keys outside the prefix are untouched");
  assert.deepStrictEqual(await store.list("r2").then(items =>
    items.map(item => item.errorEvidenceId)), ["e2"]);

  // A new recording starts with an empty index and never scans storage.
  const fresh = memoryStorage();
  const freshStore = evidenceStore.create({ storage: fresh, prefix: PREFIX });
  assert.strictEqual(await freshStore.initialize("r9"), true);
  assert.strictEqual(await freshStore.initialize("r9"), false);
  assert.deepStrictEqual(await freshStore.list("r9"), []);
  assert.strictEqual(fresh.calls.getAll, 0);

  console.log("BC error evidence store tests passed.");
})().catch(error => { console.error(error); process.exit(1); });
