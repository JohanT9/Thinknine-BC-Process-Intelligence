const assert = require("assert");
const fs = require("fs");
const path = require("path");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const content = read("src/recorder/content.js");
const background = read("src/recorder/background.js");
const popup = read("src/ui/popup.js");

assert.match(content, /id = "t9-recording-indicator-host"/);
assert.match(content, /attachShadow\(\{ mode: "closed" \}\)/);
assert.match(content, /window === window\.top/);
assert.match(content, /isRecorderUiEvent\(event\)/);
assert.match(content, /T9_REQUEST_STOP_DIALOG/);
assert.match(content, /indicatorMinimize/);
assert.match(content, /liveStatus\?\.screenshots\?\.captured/);
assert.match(content, /T9_SET_INDICATOR_CAPTURE_VISIBILITY/);
assert.match(background, /T9_SET_INDICATOR_CAPTURE_VISIBILITY/);
assert.match(background, /hidden: true/);
assert.match(background, /hidden: false/);
assert.match(background, /case "T9_REQUEST_STOP_DIALOG"/);
assert.match(background, /chrome\.action\.openPopup\(\)/);
assert.match(background, /stopPromptRequested: true/);
assert.match(background, /sender\.tab\?\.id === state\.tabId/);
assert.match(background, /sender\.tab\?\.id === pingState\.tabId/);
assert.match(content, /response\?\.state\?\.recording && response\.isRecordingTab/);
assert.match(popup, /function openNameDialog\(bugRecording\)/);
assert.match(popup, /T9_CLEAR_STOP_REQUEST/);
assert.doesNotMatch(content, /T9_RECORD_EVENT[\s\S]{0,300}indicatorLatest/,
  "The recording indicator must not generate recorder events.");

console.log("In-page recording indicator behaviour tests passed.");
