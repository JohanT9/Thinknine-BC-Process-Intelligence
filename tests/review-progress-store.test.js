// The library reads each review's progress from a small entry stored beside the review instead
// of reading every review. Reviews saved before that are read once to fill the entry in.
const assert = require("assert");
const keys = require("../src/engine/storage-keys");
const visibility = require("../src/review/task-visibility");
const store = require("../src/engine/review-progress-store");

function fakeStorage(initial, withKeys = true) {
  const data = { ...initial };
  const reads = [];
  const area = {
    data, reads,
    async get(request) {
      if (request === null) { reads.push("*"); return { ...data }; }
      const list = Array.isArray(request) ? request : [request];
      reads.push(...list);
      return Object.fromEntries(list.filter(key => key in data).map(key => [key, data[key]]));
    },
    async set(values) { Object.assign(data, JSON.parse(JSON.stringify(values))); }
  };
  if (withKeys) area.getKeys = async () => Object.keys(data);
  return area;
}
const create = storage => store.create({ storage, reviewPrefix: keys.REVIEW_PREFIX,
  progressPrefix: keys.REVIEW_PROGRESS_PREFIX, isVisible: visibility.isVisible });
const review = (approved, total, status = "draft") => ({ status, tasks: Array.from({ length: total },
  (_, index) => ({ taskId: `t${index}`, approved: index < approved })) });

(async () => {
  // A legacy review without progress is read once and its progress stored.
  const storage = fakeStorage({ t9_review_old: review(1, 3), t9_session_old: { id: "old" } });
  const progress = create(storage);
  assert.deepStrictEqual((await progress.list()).map(({ sessionId, total, approved, completed }) =>
    [sessionId, total, approved, completed]), [["old", 3, 1, false]]);
  assert.ok(storage.reads.includes("t9_review_old"));
  assert.strictEqual(storage.data.t9_progress_old.hasTasks, true);

  // After that only the progress is read, never the review.
  storage.reads.length = 0;
  assert.strictEqual((await progress.list())[0].approved, 1);
  assert.ok(!storage.reads.some(key => key.startsWith(keys.REVIEW_PREFIX)), storage.reads.join());

  // A save writes the review and its progress together.
  const saved = progress.entries("new", review(2, 2, "completed"));
  assert.deepStrictEqual(Object.keys(saved), ["t9_review_new", "t9_progress_new"]);
  await storage.set(saved);
  const listed = await progress.list();
  assert.deepStrictEqual(listed.map(item => [item.sessionId, item.approved, item.completed]),
    [["old", 1, false], ["new", 2, true]]);
  assert.ok(!listed.some(item => item.sessionId.startsWith("progress")), "progress is not a review");

  // Whether a review had steps comes from its progress; without it, from the review.
  storage.reads.length = 0;
  assert.strictEqual(await progress.hasTasks("new"), true);
  assert.ok(!storage.reads.includes("t9_review_new"));
  assert.strictEqual(await progress.hasTasks("missing"), false);
  await storage.set({ t9_review_empty: review(0, 0) });
  assert.strictEqual(await progress.hasTasks("empty"), false);

  // Progress left behind by a deleted review is not listed.
  delete storage.data.t9_review_old;
  assert.deepStrictEqual((await progress.list()).map(item => item.sessionId).sort(), ["empty", "new"]);

  // Without getKeys() every review is read, as before.
  const older = fakeStorage({ t9_review_a: review(1, 2) }, false);
  assert.deepStrictEqual((await create(older).list()).map(item => [item.sessionId, item.approved]), [["a", 1]]);

  assert.throws(() => store.create({ storage }), TypeError);
  console.log("Review progress store tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
