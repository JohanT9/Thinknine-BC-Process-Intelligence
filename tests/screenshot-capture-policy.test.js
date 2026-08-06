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
  { ...quantityInput, inputSource: "focusout" }), false);
assert.strictEqual(policy.shouldCapture(settings,
  { ...quantityInput, value: "" }), false);
assert.strictEqual(policy.shouldCapture({ ...settings, screenshotMode: "none" },
  quantityInput), false);
assert.strictEqual(policy.shouldCapture({ ...settings, captureScreenshots: false },
  quantityInput), false);
assert.strictEqual(policy.shouldCapture(settings,
  { type: "click", category: "action" }), true);

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

console.log("Screenshot capture policy behaviour tests passed.");
