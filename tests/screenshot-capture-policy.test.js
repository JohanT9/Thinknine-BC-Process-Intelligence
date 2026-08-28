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
