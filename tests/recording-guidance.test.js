const assert = require("assert");
const fs = require("fs");
const path = require("path");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const review = require("../src/review/review-studio");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const canonical = (id, raw, screenshotAssetId) => Object.freeze({
  id: `source:${id}`, recordingId: "guidance", schemaVersion: 1,
  timestamp: `2026-08-28T10:00:0${id}.000Z`, sequence: Number(id),
  source: { eventId: `raw:${id}` }, raw: Object.freeze({ ...raw }),
  ...(screenshotAssetId ? { screenshotAssetId } : {})
});

const events = [
  canonical("1", { type: "click", category: "action", label: "Post",
    actionCaption: "Post" }, "shot-post"),
  canonical("2", { type: "capture-guidance", category: "guidance",
    guidanceKind: "important", targetSourceEventId: "source:1" }),
  canonical("3", { type: "capture-guidance", category: "guidance",
    guidanceKind: "use-image", targetSourceEventId: "source:1",
    preferredScreenshotAssetId: "shot-post" }),
  canonical("4", { type: "capture-guidance", category: "guidance",
    guidanceKind: "new-section", targetSourceEventId: "source:1" })
];
const recording = Object.freeze({ id: "guidance", schemaVersion: 1,
  events: Object.freeze(events) });
const normalized = normalization.normalizeRecording(recording);
assert.strictEqual(normalized.events.length, 4);
assert.strictEqual(normalized.events[1].kind, "capture-guidance");
assert.deepStrictEqual(normalized.events[2].guidance, {
  kind: "use-image", targetSourceEventId: "source:1",
  preferredScreenshotAssetId: "shot-post"
});
assert.strictEqual(events[1].raw.guidanceKind, "important",
  "normalization must not mutate raw evidence");

const grouped = grouping.group(normalized);
assert.strictEqual(grouped.groups.length, 1,
  "guidance markers must not create documentation steps");
assert.strictEqual(grouped.supportingEvents.length, 3);
assert.strictEqual(grouped.groups[0].guidance.important, true);
assert.strictEqual(grouped.groups[0].guidance.sectionBoundaryAfter, true);
assert.strictEqual(grouped.groups[0].capturePacket.preferredScreenshotAssetId,
  "shot-post");

const interpretation = pipeline.interpret({ events: [{
  canonicalSourceEventId: "source:1", eventNo: 1
}], normalizedEvents: normalized.events, stepGroups: grouped.groups,
  imagePaths: { 1: "data:image/png;base64,post" } });
assert.strictEqual(interpretation.businessTasks.length, 1);
assert.strictEqual(interpretation.businessTasks[0].important, true);
assert.strictEqual(interpretation.businessTasks[0].sectionBoundaryAfter, true);
const guidedReview = review.createReview({ id: "guidance", name: "Guidance" },
  [...interpretation.businessTasks, {
    taskId: "following", taskType: "RunAction", instruction: "Continue"
  }]);
assert.strictEqual(guidedReview.hierarchy.sections.length, 2);
assert.strictEqual(guidedReview.hierarchy.sections[0].provenance,
  "recording-guidance");

const ignoredEvents = [...events, canonical("5", {
  type: "capture-guidance", category: "guidance", guidanceKind: "ignore",
  targetSourceEventId: "source:1"
})];
const ignoredNormalized = normalization.normalizeRecording(Object.freeze({
  id: "guidance-ignored", schemaVersion: 1,
  events: Object.freeze(ignoredEvents) }));
const ignoredGrouped = grouping.group(ignoredNormalized);
assert.strictEqual(ignoredGrouped.groups.length, 1);
assert.strictEqual(ignoredGrouped.groups[0].status, "ignored");
assert.strictEqual(pipeline.interpret({ stepGroups: ignoredGrouped.groups })
  .businessTasks.length, 0, "ignored interactions must be omitted from documents");

const content = read("src/recorder/content.js");
const background = read("src/recorder/background.js");
for (const id of ["indicatorImportant", "indicatorUseImage", "indicatorSection",
  "indicatorIgnore"]) assert.match(content, new RegExp(id));
assert.match(content, /aria-label="Markera senaste steget"/);
assert.match(content, /T9_CAPTURE_GUIDANCE/);
assert.match(background, /case "T9_CAPTURE_GUIDANCE"/);
assert.match(background, /targetSourceEventId: target\.id/);
assert.match(background, /event\.raw\?\.type !== "capture-guidance"/);
assert.match(background, /sender\.tab\?\.id !== state\.tabId/);

console.log("Recording guidance behaviour tests passed.");
