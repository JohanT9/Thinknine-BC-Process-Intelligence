const assert = require("assert");
const fs = require("fs");
const path = require("path");
const live = require("../src/engine/recording-live-status");

const session = { eventCount: 2, settings: { captureScreenshots: true,
  environmentName: "Sandbox", companyName: "Företag AB" } };
const result = live.derive({ session, connected: true, debug: {
  screenshotStats: { requested: 2, captured: 1, errors: 0 },
  lastScreenshotAt: "2026-08-28T10:00:01.000Z",
  lastEvent: { type: "click", category: "action", actionCaption: "Frisläpp",
    pageCaption: "Försäljningsorder", capturedAt: "2026-08-28T10:00:00.000Z",
    hasAccessibleLabel: true }
} });

assert.equal(result.eventCount, 2);
assert.equal(result.latestAction.label, "Frisläpp");
assert.equal(result.latestAction.pageCaption, "Försäljningsorder");
assert.deepEqual(result.context, { environmentName: "Sandbox",
  companyName: "Företag AB" });
assert.equal(result.screenshots.captured, 1);
assert.deepEqual(result.warnings, []);

const waiting = live.derive({ session: { eventCount: 0, settings: {} },
  connected: false, debug: {} });
assert.deepEqual(waiting.warnings.map(item => item.code),
  ["bc-not-connected", "no-events-yet"]);

const missingImage = live.derive({ session, connected: true, debug: {
  screenshotStats: { requested: 1, captured: 0 }
} });
assert.deepEqual(missingImage.warnings.map(item => item.code),
  ["no-screenshots-yet"]);

const safeLabel = live.latestAction({ actionCaption: "  Manuellt   pris  ",
  value: "SENSITIVE", pageCaption: "Sida" });
assert.equal(safeLabel.label, "Manuellt pris");
assert.equal(Object.hasOwn(safeLabel, "value"), false);

const fresh = live.freshSessionDebug("new-session");
assert.deepEqual(fresh.screenshotStats, { requested: 0, captured: 0, reused: 0,
  dropped: 0, errors: 0 });
assert.equal(fresh.activeSessionId, "new-session");
assert.equal(fresh.screenshotQueueLength, 0);
assert.equal(fresh.lastScreenshotAt, null);
assert.equal(fresh.lastEvent, null);

const isolated = live.derive({ session: { id: "new-session", eventCount: 0,
  settings: { captureScreenshots: true } }, connected: true, debug: {
  activeSessionId: "old-session", eventCount: 77,
  screenshotStats: { requested: 77, captured: 77, errors: 0 },
  screenshotQueueLength: 4, lastScreenshotAt: "2026-08-28T10:00:01.000Z",
  lastEvent: { actionCaption: "Old action" }
} });
assert.equal(isolated.eventCount, 0);
assert.deepEqual(isolated.screenshots, { requested: 0, captured: 0, pending: 0,
  errors: 0, lastCapturedAt: "" });
assert.equal(isolated.latestAction, null);
assert.deepEqual(isolated.warnings.map(item => item.code), ["no-events-yet"]);

const background = fs.readFileSync(path.join(__dirname, "../src/recorder/background.js"), "utf8");
assert.match(background, /previousState\.recording \|\| previousState\.sessionId/);
assert.match(background, /preActionCaptures\.clear\(\)/);
assert.match(background, /previous session screenshots/);
assert(background.indexOf("previous session screenshots") <
  background.indexOf("await saveScreenshots(id, {});"),
"Previous screenshot work must settle before the new session store is initialized.");

console.log("Recording live status behaviour tests passed.");
