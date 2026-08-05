const assert = require("assert");
const fs = require("fs");
const path = require("path");

const dashboard = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.js"),
  "utf8"
);
const background = fs.readFileSync(
  path.join(__dirname, "../src/recorder/background.js"),
  "utf8"
);

assert.ok(
  dashboard.includes("async function initializeDashboard()"),
  "Dashboard must use guarded initialization."
);

assert.ok(
  dashboard.includes("await loadSettings();"),
  "Dashboard must await settings loading."
);

assert.ok(
  dashboard.includes("await loadSessions();"),
  "Dashboard must await session loading."
);

assert.ok(
  dashboard.includes("...DEFAULTS"),
  "Dashboard must merge stored settings with defaults."
);

assert.ok(
  dashboard.includes("Inga sessioner har sparats ännu."),
  "Dashboard must render an explicit empty state."
);

assert.ok(
  background.includes("...DEFAULT_SETTINGS"),
  "Background must merge stored settings with defaults."
);

assert.ok(
  background.includes("Array.isArray(sessions) ? sessions : []"),
  "Background must always return an array of sessions."
);
assert.ok(
  background.includes("T9StorageKeys.sessionDataKeys(id)"),
  "Session deletion must remove all data through the shared key definition."
);
assert.ok(
  dashboard.includes("function createActiveDocumentPipeline()") &&
    dashboard.includes("function prepareDocumentMedia(pipeline)") &&
    dashboard.includes("const pipeline = createActiveDocumentPipeline();") &&
    dashboard.includes("const mediaAssets = await prepareDocumentMedia(pipeline);"),
  "Document Workspace and Word must share pipeline and prepared-media composition."
);

console.log("Dashboard regression tests passed.");
