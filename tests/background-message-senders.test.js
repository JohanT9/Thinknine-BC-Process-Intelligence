// The background worker takes from web pages only the messages its capture scripts send;
// everything else must come from the extension's own pages.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const background = fs.readFileSync(path.join(root, "src/recorder/background.js"), "utf8");
const start = background.indexOf("const PAGE_MESSAGE_TYPES");
const end = background.indexOf("chrome.runtime.onMessage.addListener(");
assert.ok(start > 0 && end > start, "the sender check precedes the message listener");
const context = { chrome: { runtime: { id: "studio", getURL: file => `chrome-extension://studio/${file}` } } };
vm.runInNewContext(`${background.slice(start, end)}
this.messageAllowed = messageAllowed; this.PAGE_MESSAGE_TYPES = PAGE_MESSAGE_TYPES;`, context);
const { messageAllowed, PAGE_MESSAGE_TYPES } = context;

// Every message the capture scripts send is allowed from a Business Central page.
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/ui/manifest.json"), "utf8"));
const captureFiles = new Set(manifest.content_scripts.flatMap(script => script.js));
const sources = {
  "content.js": "src/recorder/content.js",
  "bc-error-detector.js": "src/recorder/bc-error-detector.js",
  "engine/business-central-version-capture.js": "src/engine/business-central-version-capture.js",
  "engine/bc-client-captions.js": "src/engine/bc-client-captions.js"
};
const sent = new Set();
for (const file of captureFiles) {
  const source = sources[file] || `src/recorder/${file}`;
  const text = fs.readFileSync(path.join(root, source), "utf8");
  // Messages it receives are compared with message.type; messages it sends are built with type:.
  for (const match of text.matchAll(/type:\s*"(T9_[A-Z_]+)"/g)) sent.add(match[1]);
}
assert.ok(sent.has("T9_RECORD_EVENT") && sent.has("T9_PING"), "the capture messages are found");
const bcPage = { id: "studio", url: "https://businesscentral.dynamics.com/tenant/Production", tab: { id: 4 } };
for (const type of sent) assert.equal(messageAllowed({ type }, bcPage), true, `${type} from a page`);
for (const type of PAGE_MESSAGE_TYPES) assert.ok(sent.has(type), `${type} is still sent by a capture script`);

// What changes or reads the library, settings, licenses or files is refused from a page.
for (const type of ["T9_DELETE_SESSION", "T9_SAVE_SETTINGS", "T9_DOWNLOAD_FILE", "T9_SAVE_DOCUMENT_LIBRARY",
  "T9_SAVE_DOCUMENT_FOLDERS", "T9_SHARE_BUG_REPORT_WINDOWS", "T9_GET_SESSION_DATA", "T9_SAVE_REVIEW",
  "T9_START", "T9_STOP", "T9_LICENSE_CHECK", "T9_MICROSOFT_SIGN_IN", "T9_SAVE_TELEMETRY_CONFIGURATION"]) {
  assert.equal(messageAllowed({ type }, bcPage), false, `${type} refused from a page`);
  assert.equal(messageAllowed({ type }, { id: "studio", url: "chrome-extension://studio/dashboard.html" }), true,
    `${type} from the dashboard`);
}
// A page cannot pass itself off as an extension page.
assert.equal(messageAllowed({ type: "T9_DELETE_SESSION" },
  { id: "studio", url: "https://chrome-extension.studio.example/dashboard.html" }), false);
assert.equal(messageAllowed({ type: "T9_DELETE_SESSION" }, { id: "other", url: "chrome-extension://studio/x.html" }), false);
assert.equal(messageAllowed(null, bcPage), false);
console.log("Background message sender tests passed.");
