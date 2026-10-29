const assert = require("assert");
const delivery = require("../src/recorder/capture-delivery");
const sequence = require("../src/engine/capture-sequence");

// A transport whose answers the test decides, and a scheduler the test runs by hand.
function harness({ delays } = {}) {
  const sent = []; const timers = []; const lost = [];
  const queue = delivery.create({
    transport(message, done) { sent.push({ message, done }); },
    schedule(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    onLost(message, attempts) { lost.push({ message, attempts }); },
    ...(delays ? { delays } : {})
  });
  const answer = (index, ok) => sent[index].done(ok ? { ok: true } : null);
  const tick = () => { const timer = timers.shift(); timer.callback(); return timer.delay; };
  return { queue, sent, timers, lost, answer, tick };
}

// Delivered events leave the page; nothing waits.
{
  const test = harness();
  test.queue.deliver("e1"); test.queue.deliver("e2");
  assert.deepStrictEqual(test.sent.map(item => item.message), ["e1", "e2"]);
  test.answer(0, true); test.answer(1, true);
  assert.strictEqual(test.queue.pending(), 0);
  assert.strictEqual(test.timers.length, 0);
}

// A failed event is sent again after a pause, and later events wait so the order holds.
{
  const test = harness();
  test.queue.deliver("e1");
  test.answer(0, false);
  test.queue.deliver("e2"); test.queue.deliver("e3");
  assert.deepStrictEqual(test.sent.map(item => item.message), ["e1"], "later events wait");
  assert.strictEqual(test.tick(), 250);
  assert.deepStrictEqual(test.sent.map(item => item.message), ["e1", "e1"]);
  test.answer(1, true);
  assert.strictEqual(test.tick(), 0);
  assert.strictEqual(test.sent.at(-1).message, "e2");
  test.answer(2, true); test.tick(); test.answer(3, true);
  assert.deepStrictEqual(test.sent.map(item => item.message), ["e1", "e1", "e2", "e3"]);
  assert.strictEqual(test.queue.pending(), 0);
  // Once everything is delivered, events are sent at once again.
  test.queue.deliver("e4");
  assert.strictEqual(test.sent.at(-1).message, "e4");
}

// A thrown send (the extension was reloaded) counts as a failure, not an exception in the page.
{
  const lost = [];
  const queue = delivery.create({ transport() { throw new Error("Extension context invalidated."); },
    schedule(callback) { callback(); return 1; }, onLost: (message, attempts) => lost.push([message, attempts]),
    delays: [1, 2] });
  queue.deliver("e1");
  assert.deepStrictEqual(lost, [["e1", 3]], "reported as lost after the last attempt");
  assert.strictEqual(queue.pending(), 0);
}

// An event that is never delivered is reported, and the next one goes on.
{
  const test = harness({ delays: [10, 20] });
  test.queue.deliver("e1"); test.queue.deliver("e2");
  test.answer(0, false); test.answer(1, true);
  assert.strictEqual(test.tick(), 10); test.answer(2, false);
  assert.strictEqual(test.tick(), 20); test.answer(3, false);
  assert.deepStrictEqual(test.lost, [{ message: "e1", attempts: 3 }]);
  test.queue.deliver("e3");
  assert.strictEqual(test.sent.at(-1).message, "e3");
}

// Gaps: per frame the numbers of a recording that never arrived. A repeated delivery does not
// count twice, and events numbered across recordings by older versions are not counted.
{
  const event = (frame, number, scope = "recording") => ({ sourceFrameId: frame,
    sourceSequence: number, captureProvenance: { sequenceScope: scope } });
  const stored = [event("a", 1), event("a", 2), event("a", 5), event("b", 1),
    event("old", 51, null), event("old", 60, null)];
  assert.deepStrictEqual(sequence.gaps(stored), { missingCount: 2,
    frames: [{ frameId: "a", received: 3, max: 5, missingCount: 2, missing: [3, 4] }] });
  let running = {};
  for (const item of stored) running = sequence.track(running, item);
  assert.strictEqual(sequence.missingCount(running), 2);
  running = sequence.track(running, event("a", 3));
  running = sequence.track(running, event("a", 4));
  assert.strictEqual(sequence.missingCount(running), 0, "a late delivery closes the gap");
}

console.log("Capture delivery tests passed.");
