const assert = require("assert");
const asyncOperations = require("../src/ui/async-operations");

(async () => {
  const cancelled = [];
  const timers = {
    setTimeout(callback) { return { callback }; },
    clearTimeout(timer) { cancelled.push(timer); }
  };
  assert.strictEqual(await asyncOperations.withTimeout(
    Promise.resolve("ready"), 100, "Operation", timers
  ), "ready");
  assert.strictEqual(cancelled.length, 1);

  const rejection = new Error("failed");
  await assert.rejects(asyncOperations.withTimeout(
    Promise.reject(rejection), 100, "Operation", timers
  ), error => error === rejection);
  assert.strictEqual(cancelled.length, 2);

  let timeoutCallback;
  const timed = asyncOperations.withTimeout(new Promise(() => {}), 100,
    "Statuskontrollen", {
      setTimeout(callback) { timeoutCallback = callback; return 2; },
      clearTimeout() {}
    });
  timeoutCallback();
  await assert.rejects(timed, /Statuskontrollen tog för lång tid/);

  let calls = 0;
  let release;
  const guarded = asyncOperations.singleFlight(() => {
    calls += 1;
    return new Promise(resolve => { release = resolve; });
  });
  const first = guarded();
  const second = guarded();
  assert.strictEqual(first, second);
  await Promise.resolve();
  assert.strictEqual(calls, 1);
  release("done");
  assert.strictEqual(await first, "done");
  const third = guarded();
  await Promise.resolve();
  assert.strictEqual(calls, 2);
  release("again");
  await third;
  console.log("Async operation guard behavior tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
