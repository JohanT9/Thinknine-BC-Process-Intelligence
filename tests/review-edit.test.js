const assert = require("assert");
const edit = require("../src/review/review-edit");

let session = edit.createSession("task-1", "instruction", "Original");
session = edit.update(session, "Changed");
assert.deepStrictEqual(edit.result(session), {
  taskId: "task-1", field: "instruction", value: "Changed", changed: true
});
assert.strictEqual(edit.result(edit.createSession("a", "instruction", "A")).changed, false);
assert.strictEqual(edit.commandFromKey({ key: "Enter" }, false), "start");
assert.strictEqual(edit.commandFromKey({ key: "Enter", shiftKey: false }, true), "commit");
const textareaTarget = { tagName: "TEXTAREA" };
assert.strictEqual(edit.commandFromKey({ key: "Enter", target: textareaTarget }, true), null);
assert.strictEqual(edit.commandFromKey({ key: "Enter", shiftKey: true, target: textareaTarget }, true), null);
assert.strictEqual(edit.commandFromKey({ key: "Enter", ctrlKey: true, target: textareaTarget }, true), "commit");
assert.strictEqual(edit.commandFromKey({ key: "Enter", metaKey: true, target: textareaTarget }, true), "commit");
assert.strictEqual(edit.commandFromKey({ key: "Escape" }, true), "cancel");

const listeners = {};
const removed = {};
const calls = [];
const container = {
  addEventListener(type, listener) { listeners[type] = listener; },
  removeEventListener(type, listener) { removed[type] = listener; }
};
const control = {
  tagName: "TEXTAREA",
  dataset: { editField: "instruction" }, value: "A",
  closest(selector) {
    if (selector === "[data-review-task-id]") return card;
    if (selector === "[data-edit-field]") return this;
    return null;
  }
};
const card = {
  dataset: { reviewTaskId: "a" },
  closest(selector) {
    return selector === "[data-review-task-id]" ? this : null;
  },
  querySelector() { return control; }
};
const unbind = edit.bind(container, {
  start(details) { calls.push(["start", details.field]); },
  update(details) { calls.push(["update", details.value]); },
  commit() { calls.push(["commit"]); },
  cancel() { calls.push(["cancel"]); }
});

listeners.dblclick({ target: control });
assert.deepStrictEqual(calls.at(-1), ["start", "instruction"]);
let prevented = false;
control.dataset.editing = "true";
listeners.keydown({
  target: control, key: "Enter", shiftKey: false,
  preventDefault() { prevented = true; }
});
assert.strictEqual(prevented, false);
assert.notDeepStrictEqual(calls.at(-1), ["commit"]);
listeners.keydown({
  target: control, key: "Enter", ctrlKey: true,
  preventDefault() { prevented = true; }
});
assert.strictEqual(prevented, true);
assert.deepStrictEqual(calls.at(-1), ["commit"]);
listeners.keydown({ target: control, key: "Escape", preventDefault() {} });
assert.deepStrictEqual(calls.at(-1), ["cancel"]);
control.value = "Draft";
listeners.input({ target: control });
assert.deepStrictEqual(calls.at(-1), ["update", "Draft"]);
listeners.focusout({ target: control });
assert.deepStrictEqual(calls.at(-1), ["commit"]);
delete control.dataset.editing;
listeners.keydown({ target: card, key: "Enter", preventDefault() {} });
assert.deepStrictEqual(calls.at(-1), ["start", "instruction"]);
unbind();
assert.strictEqual(removed.dblclick, listeners.dblclick);
assert.strictEqual(removed.keydown, listeners.keydown);
assert.strictEqual(removed.input, listeners.input);
assert.strictEqual(removed.focusout, listeners.focusout);

(async () => {
  let timerId = 0;
  const timers = new Map();
  const cleared = [];
  let saves = 0;
  const autoSave = edit.createAutoSave(async () => { saves += 1; }, {
    delay: 25,
    setTimer(callback, delay) {
      timerId += 1;
      timers.set(timerId, { callback, delay });
      return timerId;
    },
    clearTimer(id) {
      cleared.push(id);
      timers.delete(id);
    }
  });
  autoSave.schedule();
  autoSave.schedule();
  assert.deepStrictEqual(cleared, [1]);
  assert.strictEqual(timers.get(2).delay, 25);
  assert.strictEqual(autoSave.pending(), true);
  await timers.get(2).callback();
  assert.strictEqual(saves, 1);
  assert.strictEqual(autoSave.pending(), false);
  autoSave.schedule();
  await autoSave.flush();
  assert.strictEqual(saves, 2);
  assert.strictEqual(autoSave.pending(), false);

  const releases = [];
  const completed = [];
  const queue = edit.createSaveQueue((payload, revision) =>
    new Promise(resolve => {
      releases.push(() => {
        completed.push({ payload, revision });
        resolve(payload);
      });
    })
  );
  const first = queue.enqueue({ value: "old" });
  const second = queue.enqueue({ value: "new" });
  assert.strictEqual(queue.pending(), true);
  await Promise.resolve();
  assert.strictEqual(releases.length, 1);
  releases.shift()();
  const firstResult = await first;
  assert.strictEqual(firstResult.latest, false);
  await Promise.resolve();
  assert.strictEqual(releases.length, 1);
  releases.shift()();
  const secondResult = await second;
  assert.strictEqual(secondResult.latest, true);
  await queue.flush();
  assert.strictEqual(queue.pending(), false);
  assert.deepStrictEqual(completed.map(item => item.payload.value), ["old", "new"]);
  assert.deepStrictEqual(completed.map(item => item.revision), [1, 2]);

  let quotaAttempts = 0;
  const recoverableQueue = edit.createSaveQueue(async payload => {
    quotaAttempts += 1;
    if (quotaAttempts === 1) throw new Error("Storage quota exceeded");
    return { persisted: payload.value };
  });
  const failedSnapshot = { value: "still-in-memory" };
  await assert.rejects(
    recoverableQueue.enqueue(failedSnapshot),
    /Storage quota exceeded/
  );
  assert.deepStrictEqual(failedSnapshot, { value: "still-in-memory" });
  const recoveredSave = await recoverableQueue.enqueue({ value: "recovered" });
  assert.strictEqual(recoveredSave.latest, true);
  assert.deepStrictEqual(recoveredSave.value, { persisted: "recovered" });
  await recoverableQueue.flush();
  assert.strictEqual(recoverableQueue.pending(), false);

  const orderedSnapshots = [];
  const queuedResolvers = [];
  const cancellationQueue = edit.createSaveQueue(payload =>
    new Promise(resolve => {
      queuedResolvers.push(() => {
        orderedSnapshots.push(payload.state);
        resolve({ ok: true });
      });
    })
  );
  const earlierAutosave = cancellationQueue.enqueue({ state: "edited" });
  const restoredBaselineSave = cancellationQueue.enqueue({ state: "baseline" });
  await Promise.resolve();
  queuedResolvers.shift()();
  assert.strictEqual((await earlierAutosave).latest, false);
  await Promise.resolve();
  queuedResolvers.shift()();
  assert.strictEqual((await restoredBaselineSave).latest, true);
  await cancellationQueue.flush();
  assert.deepStrictEqual(orderedSnapshots, ["edited", "baseline"]);

  const persistenceCalls = [];
  const persistence = edit.createPersistenceCoordinator({
    autoSave: {
      async flush() { persistenceCalls.push("autosave-flush"); }
    },
    saveQueue: {
      async flush() { persistenceCalls.push("queue-flush"); }
    },
    async save(options) { persistenceCalls.push(["save", options]); }
  });
  await persistence.flush();
  assert.deepStrictEqual(persistenceCalls, [
    "autosave-flush",
    "queue-flush"
  ]);

  const savedReview = { updatedAt: "one" };
  assert.strictEqual(edit.isCurrentSave({
    latest: true,
    currentSession: true,
    currentReview: savedReview,
    savedReview,
    savedUpdatedAt: "one"
  }), true);
  assert.strictEqual(edit.isCurrentSave({
    latest: false,
    currentSession: true,
    currentReview: savedReview,
    savedReview,
    savedUpdatedAt: "one"
  }), false);
  assert.strictEqual(edit.isCurrentSave({
    latest: true,
    currentSession: true,
    currentReview: { updatedAt: "two" },
    savedReview,
    savedUpdatedAt: "one"
  }), false);
  persistenceCalls.length = 0;
  await persistence.saveExplicitly({ render: false });
  assert.deepStrictEqual(persistenceCalls, [
    "autosave-flush",
    "queue-flush",
    ["save", { render: false }],
    "queue-flush"
  ]);
  console.log("Review editing behaviour tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
