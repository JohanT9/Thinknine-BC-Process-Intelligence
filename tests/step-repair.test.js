const assert = require("assert");
const fs = require("fs");
const path = require("path");
const editor = require("../src/review/step-editor");
const reviewStudio = require("../src/review/review-studio");

const step = { taskId: "step-1", recordingId: "recording-1",
  sourceEventIds: ["event-1"], derivedStep: {
    instruction: "Choose item", sourceScreenshotAssetIds: ["shot-a"],
    selectedScreenshotAssetId: "shot-a" } };

const repaired = editor.repairScreenshot(step, "shot-from-recording", {},
  ["shot-a", "shot-from-recording"], {
    now: "2026-08-29T08:00:00.000Z",
    capturedAt: "2026-08-29T07:59:59.000Z"
  });
assert.equal(repaired.ok, true);
assert.equal(repaired.override.screenshotOverride.provenance, "step-repair");
assert.equal(repaired.override.screenshotOverride.capturedAt,
  "2026-08-29T07:59:59.000Z");
assert.equal(editor.resolve({ ...step, stepOverride: repaired.override })
  .selectedScreenshotAssetId, "shot-from-recording");
assert.equal(editor.repairScreenshot(step, "foreign-shot", {}, ["shot-a"]).reason,
  "not-a-recording-asset");

const review = reviewStudio.createReview({ id: "recording-1", name: "Test" },
  [step]);
const result = reviewStudio.repairTaskScreenshot(review, 0,
  "shot-from-recording", ["shot-a", "shot-from-recording"], {
    now: "2026-08-29T08:00:00.000Z"
  });
assert.equal(result.ok, true);
assert.equal(reviewStudio.resolveTask(review.tasks[0]).selectedScreenshotAssetId,
  "shot-from-recording");
assert(review.commandHistory.some(entry => entry.type === "step-screenshot-repair"),
  "step repair must be reversible through Review history");

const protectedReview = reviewStudio.createReview({ id: "recording-1" }, [step]);
protectedReview.annotations.screenshotSets.push({ screenshotRef: "shot-a",
  items: [{ annotationId: "annotation-1" }] });
assert.equal(reviewStudio.repairTaskScreenshot(protectedReview, 0,
  "shot-from-recording", ["shot-a", "shot-from-recording"]).reason,
  "annotation-protected");

const html = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.html"), "utf8");
const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.js"), "utf8");
const i18n = fs.readFileSync(path.join(__dirname, "../src/ui/i18n.js"), "utf8");
const background = fs.readFileSync(path.join(__dirname,
  "../src/recorder/background.js"), "utf8");
assert.match(html, /id="stepRepairDialog"[^>]*aria-labelledby="stepRepairTitle"/);
assert.match(html, /id="stepRepairTitle">Byt bild</);
assert.match(html, /id="captureStepRepairScreenshot"[\s\S]*Ta ny sk&auml;rmbild/);
assert.match(dashboard, /data-action="repair-step"/);
assert.match(dashboard, /uiTf\("a11y\.changeImage"/);
assert.match(i18n, /"a11y\.changeImage": "Byt bild för steg \{step\}"/);
assert.match(i18n, /"a11y\.changeImage": "Change image for step \{step\}"/);
assert.match(dashboard, /T9Review\.repairTaskScreenshot/);
assert.match(background, /case "T9_CAPTURE_STEP_REPAIR_SCREENSHOT"/);
assert.match(background, /case "T9_SAVE_STEP_REPAIR_SCREENSHOT"/);
assert.match(background, /screenshots\[assetKey\] = image/);
assert.match(dashboard, /T9_SAVE_STEP_REPAIR_SCREENSHOT/,
  "a newly captured screenshot is persisted only after explicit approval");
assert.doesNotMatch(background,
  /case "T9_CAPTURE_STEP_REPAIR_SCREENSHOT"[\s\S]{0,500}recordEvent\(/,
  "supplementary screenshots must not change original raw event meaning");

console.log("Single-step repair behaviour tests passed.");
