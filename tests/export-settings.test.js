const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.html"),
  "utf8"
);
const dashboard = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.js"),
  "utf8"
);
const background = fs.readFileSync(
  path.join(__dirname, "../src/recorder/background.js"),
  "utf8"
);
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../src/ui/manifest.json"),
    "utf8"
  )
);

assert.ok(manifest.permissions.includes("downloads"));
assert.ok(html.includes('id="alwaysAskExportLocation"'));
assert.ok(html.includes('id="exportFileNamePattern"'));
assert.ok(dashboard.includes("function buildExportFileName("));
assert.ok(dashboard.includes("T9_DOWNLOAD_FILE"));
assert.ok(background.includes('case "T9_DOWNLOAD_FILE"'));
assert.ok(background.includes("chrome.downloads.download"));
assert.ok(background.includes("alwaysAskExportLocation: true"));

console.log("Export settings tests passed.");
