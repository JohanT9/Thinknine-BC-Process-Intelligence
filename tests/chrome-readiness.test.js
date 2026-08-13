const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "src/ui/manifest.json"), "utf8"));
assert.strictEqual(manifest.manifest_version, 3);
assert.strictEqual(manifest.background.service_worker, "background.js");
assert(manifest.content_scripts[0].all_frames);
assert(manifest.content_scripts[0].match_about_blank);
for (const permission of ["activeTab", "downloads", "scripting", "storage",
  "tabs"]) assert(manifest.permissions.includes(permission));

const runtimeFiles = ["src/recorder/background.js", "src/recorder/content.js",
  "src/ui/popup.js", "src/ui/dashboard.js"].map(file =>
  fs.readFileSync(path.join(root, file), "utf8")).join("\n");
assert(!runtimeFiles.includes("browser."));
assert(!runtimeFiles.includes("microsoftEdge"));
assert(runtimeFiles.includes("matchOriginAsFallback: true"));
for (const api of ["chrome.runtime", "chrome.storage", "chrome.tabs",
  "chrome.scripting", "chrome.downloads", "chrome.action",
  "chrome.tabs.captureVisibleTab"]) assert(runtimeFiles.includes(api), api);

const packageJson = JSON.parse(fs.readFileSync(
  path.join(root, "package.json"), "utf8"));
assert.strictEqual(manifest.version, packageJson.version);
assert(!manifest.description.includes("Edge-only"));
assert(packageJson.description.includes("Edge production target"));
console.log("Chrome static readiness checks passed; manual product verification remains required.");
