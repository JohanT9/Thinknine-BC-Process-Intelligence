// The live status counts events in the debug state while the screenshot worker writes to the
// same state. Each write reads, changes and writes back in one queue, so no count is lost and
// the recording is not reported as missing events.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "../src/recorder/background.js"), "utf8");
const start = source.indexOf("let debugWrites = Promise.resolve();");
const end = source.indexOf("function diagnosticUrl(");
assert(start > 0 && end > start, "setDebug is serialized");
let stored = {};
const pause = () => new Promise(resolve => setTimeout(resolve, Math.random() * 3));
const chrome = { storage: { local: {
  async get(key) { await pause(); return { [key]: JSON.parse(JSON.stringify(stored[key] || {})) }; },
  async set(value) { await pause(); stored = { ...stored, ...JSON.parse(JSON.stringify(value)) }; }
} } };
const context = { chrome, Promise, Date, JSON, DEBUG_KEY: "t9_debug", VERSION: "test" };
vm.runInNewContext(`${source.slice(start, end)}; this.setDebug = setDebug;`, context);

(async () => {
  const writes = [];
  for (let index = 0; index < 60; index += 1) {
    // An event counter that builds on the latest value, interleaved with the screenshot worker's
    // writes of its own keys.
    writes.push(context.setDebug(current => ({ counted: (current.counted || 0) + 1 })));
    writes.push(context.setDebug({ screenshotQueueLength: index }));
  }
  await Promise.all(writes);
  assert.strictEqual(stored.t9_debug.counted, 60);
  assert.strictEqual(stored.t9_debug.screenshotQueueLength, 59);
  assert.strictEqual(stored.t9_debug.version, "test");
  // A failed write does not stop the queue.
  await context.setDebug(() => { throw new Error("bad patch"); }).catch(() => {});
  await context.setDebug(current => ({ counted: current.counted + 1 }));
  assert.strictEqual(stored.t9_debug.counted, 61);
  console.log("Debug state write tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
