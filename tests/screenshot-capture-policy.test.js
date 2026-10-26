const assert = require("assert");
const policy = require("../src/engine/screenshot-capture-policy");
const fs = require("fs");
const path = require("path");

const settings = { captureScreenshots: true, screenshotMode: "important" };
const quantityInput = { type: "field-change", category: "field",
  fieldName: "Antal", value: "500", inputSource: "input" };
assert.strictEqual(policy.category(quantityInput), "field-input");
assert.strictEqual(policy.shouldCapture(settings, quantityInput), true);
assert.strictEqual(policy.shouldCapture(settings,
  { ...quantityInput, inputSource: "change" }), true);
assert.strictEqual(policy.shouldCapture(settings,
  { ...quantityInput, previousValue: "", inputSource: "focusout" }), true);
assert.strictEqual(policy.shouldCapture(settings,
  { ...quantityInput, previousValue: "500", inputSource: "focusout" }), false);
assert.strictEqual(policy.shouldCapture(settings,
  { ...quantityInput, value: "" }), false);
assert.strictEqual(policy.shouldCapture({ ...settings, screenshotMode: "none" },
  quantityInput), false);
assert.strictEqual(policy.shouldCapture({ ...settings, captureScreenshots: false },
  quantityInput), false);
assert.strictEqual(policy.shouldCapture(settings,
  { type: "click", category: "action" }), true);
assert.strictEqual(policy.shouldCapture(settings,
  { type: "status-message", category: "result" }), true,
"transient result confirmations need their visible evidence captured");
const namedReactClick = { type: "click", category: "interaction",
  pointerTarget: true, accessibleName: "R101312" };
assert.strictEqual(policy.category(namedReactClick), "action");
assert.strictEqual(policy.shouldCapture(settings, namedReactClick), true);
assert.strictEqual(policy.shouldCapture(settings, { type: "click",
  category: "interaction", pointerTarget: true }), false);

assert.strictEqual(policy.canReuse(
  { category: "action", captureKey: "" },
  { category: "field-input", captureKey: "Antal" }
), false, "field input must not reuse the preceding action screenshot");
assert.strictEqual(policy.canReuse(
  { category: "field-input", captureKey: "Artikel" },
  { category: "field-input", captureKey: "Antal" }
), false, "different fields need independent screenshots");
assert.strictEqual(policy.canReuse(
  { category: "field-input", captureKey: "Antal" },
  { category: "field-input", captureKey: "Antal" }
), true, "events for the same edited field may share one screenshot");
const background = fs.readFileSync(path.join(__dirname,
  "../src/recorder/background.js"), "utf8");
assert(background.includes('importScripts("engine/screenshot-capture-policy.js")'));
assert(background.includes("T9ScreenshotCapturePolicy.shouldCapture"));
assert(background.includes('importScripts("engine/screenshot-queue-policy.js")'));
assert(background.includes("T9ScreenshotTargetRegistration.register("));

const queuePolicy = require("../src/engine/screenshot-queue-policy");
const queue = [];
queuePolicy.enqueue(queue, { sessionId: "s", eventNo: 1, eventId: "e1",
  category: "field-input", captureKey: "Antal", queuedAt: 1 });
const reused = queuePolicy.enqueue(queue, { sessionId: "s", eventNo: 2,
  eventId: "e2", category: "field-input", captureKey: "Antal", queuedAt: 2 });
assert.strictEqual(reused.reused, true);
assert.strictEqual(queue.length, 1);
assert.deepStrictEqual(queue[0].targets, [{ eventNo: 1, eventId: "e1" },
  { eventNo: 2, eventId: "e2" }],
"coalesced screenshot requests must retain every event association");
queuePolicy.enqueue(queue, { sessionId: "s", eventNo: 2, eventId: "e2",
  category: "field-input", captureKey: "Antal", queuedAt: 3 });
assert.strictEqual(queue[0].targets.length, 2, "an event is associated once");
queuePolicy.enqueue(queue, { sessionId: "s", eventNo: 3, eventId: "e3",
  category: "field-input", captureKey: "Artikel", queuedAt: 4 });
assert.strictEqual(queue.length, 2, "different fields are not coalesced");
queuePolicy.enqueue(queue, { sessionId: "other", eventNo: 2, eventId: "x2",
  category: "field-input", captureKey: "Antal", queuedAt: 5 });
assert.strictEqual(queue.length, 3, "recordings never share a capture");

const registration = require("../src/engine/screenshot-target-registration");
(async () => {
  const saved = [];
  const associated = [];
  const result = await registration.register({
    targets: [{ eventNo: 1, eventId: "e1" }, { eventNo: 2, eventId: "e2" },
      { eventNo: 3, eventId: "e3" }],
    async saveAsset(target) {
      if (target.eventNo === 2) throw new Error("quota");
      saved.push(target.eventNo);
    },
    async associate(target) {
      if (target.eventNo === 3) throw new Error("canonical");
      associated.push(target.eventId);
    }
  });
  assert.deepStrictEqual(saved, [1, 3],
    "one reused capture must be persisted for every associated event");
  assert.deepStrictEqual(associated, ["e1"],
    "an event is associated only after its asset is stored");
  assert.strictEqual(result.saved, 1);
  assert.deepStrictEqual(result.failures.map(item =>
    [item.target.eventNo, item.stage]),
  [[2, "asset-write"], [3, "canonical-association"]],
  "failures are reported per target without discarding the rest");
  await assert.rejects(registration.register({ targets: [] }), TypeError);
})().catch(error => { console.error(error); process.exit(1); });
const content = fs.readFileSync(path.join(__dirname,
  "../src/recorder/content.js"), "utf8");
assert(content.includes("dialogComplete: Boolean(dialog?.isConnected)"),
  "recorder should preserve observable dialog visibility");
assert(content.includes("selectedOptionVisible:"),
  "recorder should preserve observable selected menu or row visibility");
assert(content.includes("resultVisible: true"),
  "recorder should preserve observable committed and navigation results");
assert(!content.includes("captureRole:"),
  "recorder must not own screenshot-role classification");

console.log("Screenshot capture policy behaviour tests passed.");
