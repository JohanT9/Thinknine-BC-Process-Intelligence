const assert = require("assert");
const fs = require("fs");
const path = require("path");
const frameCapture = require("../src/recorder/frame-capture");
const screenshotPolicy = require("../src/engine/screenshot-capture-policy");
const projector = require("../src/document/review-document-projector");
const interactions = require("../src/document/semantic-interaction-engine");
const language = require("../src/document/language-excellence");
const presentation = require("../src/document/presentation-grammar");

const event = {
  sourceEventId: "frame-runtime:7",
  localSequence: 7,
  captureTimestamp: "2026-08-06T10:00:00.100Z",
  type: "field-change",
  category: "field",
  fieldName: "Antal",
  value: "500",
  inputSource: "input",
  eventSource: "frame-dom",
  localBounds: { x: 10, y: 20, width: 100, height: 30 },
  topViewportBounds: { x: 130, y: 260, width: 100, height: 30 },
  shadowHost: { role: "group", label: "Orderrad" },
  futureFrameField: { schema: 9 }
};
const message = {
  type: frameCapture.MESSAGE_TYPES.EVENT,
  sessionId: "session-1",
  frameUrl: "https://businesscentral.dynamics.com/controladdin/index.html",
  topFrameUrl: "https://businesscentral.dynamics.com/order",
  frameOrigin: "https://businesscentral.dynamics.com",
  frameDepth: 2,
  event
};
const sender = { tab: { id: 42 }, frameId: 7, documentId: "document-7",
  url: message.frameUrl, origin: message.frameOrigin };
const state = { recording: true, sessionId: "session-1", tabId: 42 };
const seen = new Set();
const valid = frameCapture.validateMessage(message, sender, state, seen);
assert.strictEqual(valid.valid, true);
assert.strictEqual(valid.event.tabId, 42);
assert.strictEqual(valid.event.frameId, 7);
assert.strictEqual(valid.event.frameDepth, 2);
assert.strictEqual(valid.event.futureFrameField.schema, 9);
assert.deepStrictEqual(valid.event.localBounds, event.localBounds);
assert.deepStrictEqual(valid.event.topViewportBounds, event.topViewportBounds);

seen.add(valid.identity);
assert.strictEqual(frameCapture.validateMessage(message, sender, state, seen).reason,
  "duplicate-event");
assert.strictEqual(frameCapture.validateMessage({ ...message, sessionId: "old" },
  sender, state).reason, "stale-session");
assert.strictEqual(frameCapture.validateMessage(message,
  { ...sender, tab: { id: 99 } }, state).reason, "inactive-tab");
assert.strictEqual(frameCapture.validateMessage({ ...message,
  event: { type: "click" } }, sender, state).reason, "malformed-event");
assert.strictEqual(frameCapture.validateMessage(message, sender,
  { ...state, recording: false }).reason, "inactive-session");

const ordered = frameCapture.merge([
  { captureTimestamp: "2026-08-06T10:00:00.200Z", localSequence: 1,
    frameId: 2, sourceEventId: "b" },
  { captureTimestamp: "2026-08-06T10:00:00.100Z", localSequence: 9,
    frameId: 8, sourceEventId: "a" },
  { captureTimestamp: "2026-08-06T10:00:00.200Z", localSequence: 1,
    frameId: 1, sourceEventId: "c" }
]);
assert.deepStrictEqual(ordered.map(value => value.sourceEventId), ["a", "c", "b"]);
assert.deepStrictEqual(frameCapture.topViewportBounds(event.localBounds, [
  { x: 50, y: 80, width: 500, height: 400 },
  { x: 70, y: 160, width: 900, height: 700 }
]), event.topViewportBounds);
assert.strictEqual(frameCapture.topViewportBounds(event.localBounds,
  [{ x: "unknown" }]), null);

const inner = { nodeType: 1, id: "inner" };
assert.strictEqual(frameCapture.effectiveTarget({ target: { id: "host" },
  composedPath: () => [inner, { id: "shadow-root" }] }), inner);
assert.strictEqual(frameCapture.effectiveTarget({ target: inner }), inner);
assert.strictEqual(frameCapture.diagnosticUrl(
  "https://example.test/path?tenant=secret#selection"),
"https://example.test/path");

assert.strictEqual(screenshotPolicy.shouldCapture({ captureScreenshots: true,
  screenshotMode: "important" }, valid.event), true);
assert.strictEqual(screenshotPolicy.shouldCapture({ captureScreenshots: true,
  screenshotMode: "important" }, { ...valid.event,
  inputSource: "focusout" }), false);

const review = { sessionId: "frame-review", sessionName: "Frame Review",
  tasks: [{ taskId: "frame-task", taskType: "ChangeField",
    fieldCaption: valid.event.fieldName, value: valid.event.value,
    inputSources: [valid.event.inputSource], instruction: "Frame input",
    frameContext: { frameId: valid.event.frameId,
      sourceEventId: valid.event.sourceEventId, future: { schema: 9 } }
  }] };
const projected = projector.project(review).document;
const semanticActions = interactions.processDocument(projected);
const presented = presentation.process(language.process(semanticActions));
const instruction = presented.sections.find(section => section.kind === "workflow")
  .blocks.find(block => block.kind === "step").blocks
  .find(block => block.kind === "paragraph");
assert.strictEqual(instruction.text, 'Ange 500 i "Antal".');
assert.ok(instruction.presentationRuns.some(run =>
  run.text === "500" && run.bold));

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname,
  "../src/ui/manifest.json"), "utf8"));
const script = manifest.content_scripts[0];
assert.strictEqual(script.all_frames, true);
assert.strictEqual(script.match_about_blank, true);
assert.strictEqual(script.match_origin_as_fallback, true);
assert.deepStrictEqual(script.js, ["frame-capture.js", "content.js"]);
assert.ok(manifest.permissions.includes("webNavigation"));
assert.deepStrictEqual(manifest.host_permissions, [
  "https://businesscentral.dynamics.com/*",
  "https://*.businesscentral.dynamics.com/*"
]);

console.log("Frame capture compatibility behaviour tests passed.");
