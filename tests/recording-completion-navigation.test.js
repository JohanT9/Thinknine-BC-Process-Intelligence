const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "../src/ui/popup.html"), "utf8");
const script = fs.readFileSync(path.join(__dirname, "../src/ui/popup.js"), "utf8");

assert.match(html, /id="completionDialog"[^>]*aria-labelledby="completionDialogTitle"/);
assert.match(html, /id="openLibraryAfterRecording"[^>]*>Öppna Dokumentbiblioteket<\/button>/);
assert.match(html, /id="stayAfterRecording"[^>]*>Inte nu<\/button>/);
assert.match(script, /if \(!pendingBugRecording\) openCompletionDialog\(\)/,
  "process recordings should offer navigation after a successful stop");
assert.match(script, /function openLibraryAfterRecording[\s\S]*chrome\.runtime\.openOptionsPage\(\)/,
  "the primary action should reuse the existing Document Library route");
assert.match(script, /function stayAfterRecording[\s\S]*completionDialog[\s\S]*\.close\(\)/,
  "the user must be able to decline without leaving the popup");

console.log("Recording completion navigation tests passed.");
