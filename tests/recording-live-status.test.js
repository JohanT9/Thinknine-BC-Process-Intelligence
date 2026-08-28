const assert = require("assert");
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

console.log("Recording live status behaviour tests passed.");
