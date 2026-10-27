const assert = require("node:assert/strict");
const fs = require("node:fs");
const canonical = require("../src/engine/canonical-recording");

const recording = canonical.fromLegacy({ id: "r1", name: "Purchase order",
  startedAt: "2026-10-03T10:00:00Z", updatedAt: "2026-10-03T10:01:00Z",
  recordingPurpose: "documentation", settings: { documentLanguage: "sv-SE" } }, [
  { eventNo: 1, timestamp: "2026-10-03T10:00:01Z", type: "click",
    label: "Ny", nested: { preserve: true } },
  { eventNo: 2, timestamp: "2026-10-03T10:00:02Z", type: "field-change",
    fieldName: "Leverantör" }
]);
recording.events[0].identification = { action: { caption: "Ny" } };
const legacy = canonical.legacyView(recording);
assert.deepEqual(canonical.legacySessionView(recording), legacy.session);
assert.deepEqual(recording.events.map(canonical.legacyEventView), legacy.events,
  "the low-allocation legacy projection must preserve the established response shape");

const background = fs.readFileSync(require("node:path").join(__dirname, "../src/recorder/background.js"), "utf8");
const sessionCase = background.slice(background.indexOf('case "T9_GET_SESSION_DATA"'),
  background.indexOf('case "T9_GET_SCREENSHOT_ASSETS"'));
assert.ok(sessionCase.includes("legacySessionView(recording)"));
assert.ok(sessionCase.includes("legacyEventView(canonicalEvent)"));
assert.ok(!sessionCase.includes("legacyView(recording)"),
  "session opening should not build and clone an unused intermediate event array");
console.log("PASS session-open projection matches legacy response without cloning an intermediate event list");
