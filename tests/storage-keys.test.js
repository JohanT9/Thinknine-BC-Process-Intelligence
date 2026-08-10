const assert = require("assert");
const keys = require("../src/engine/storage-keys");

assert.strictEqual(keys.SESSION_PREFIX, "t9_session_");
assert.strictEqual(keys.EVENT_PREFIX, "t9_events_");
assert.strictEqual(keys.SCREENSHOT_PREFIX, "t9_screenshots_");
assert.strictEqual(keys.REVIEW_PREFIX, "t9_review_");
assert.strictEqual(keys.RECORDING_PREFIX, "t9_recording_");
assert.strictEqual(keys.DOCUMENT_LIBRARY_KEY, "t9_document_library");
assert.deepStrictEqual(keys.sessionDataKeys("session-1"), [
  "t9_session_session-1",
  "t9_recording_session-1",
  "t9_events_session-1",
  "t9_screenshots_session-1",
  "t9_review_session-1"
]);

console.log("Storage key behaviour tests passed.");
