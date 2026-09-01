const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "../src/ui/popup.html"), "utf8");
const script = fs.readFileSync(path.join(__dirname, "../src/ui/popup.js"), "utf8");
const dashboard = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.js"), "utf8");

assert.match(html, /id="completionDialog"[^>]*aria-labelledby="completionDialogTitle"/);
assert.match(html, /id="openDocumentationAfterRecording"[^>]*[\s\S]*?>Öppna dokumentationen<\/button>/);
assert.match(html, /id="stayAfterRecording"[^>]*>Inte nu<\/button>/);
assert.match(html, /id="completedRecordingName"/);
assert.match(html, /data-i18n="recorder\.continueRecording">Fortsätt spela in<\/button>/);
assert.match(script, /if \(!pendingBugRecording\) openCompletionDialog\(response\.session\)/,
  "process recordings should offer navigation after a successful stop");
assert.match(script, /function openDocumentationAfterRecording[\s\S]*dashboard\.html\?openReview=/,
  "the primary action should deep-link to the completed Review");
assert.match(dashboard, /function openRequestedReview\(\)[\s\S]*searchParams\.get\("openReview"\)/,
  "the dashboard must consume the completed Review deep link");
assert.match(dashboard, /await loadSessions\(\)[\s\S]*await openRequestedReview\(\)/,
  "the deep link must be resolved after Document Library sessions load");
assert.match(script, /function stayAfterRecording[\s\S]*completionDialog[\s\S]*\.close\(\)/,
  "the user must be able to decline without leaving the popup");

console.log("Recording completion navigation tests passed.");
