// Screenshots of steps Page Scripting plays back during a test recording: one taken after a
// later step was announced, in which the step's own control is no longer shown, most likely
// shows that later step and is left out; one that still shows the control is kept.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "src/recorder/background.js"), "utf8");
const start = source.indexOf("const PLAYBACK_TARGET_TIMEOUT_MS");
const end = source.indexOf("async function consumePreActionCapture");
assert.ok(start > 0 && end > start, "the playback screenshot code is found");

async function run({ bounds, announcedLater }) {
  const saved = [];
  const context = vm.createContext({
    Promise, setTimeout, Date, String,
    SCREENSHOT_MIN_INTERVAL_MS: 600, lastScreenshotAt: 0, lastCaptureCallAt: 0,
    screenshotStats: { requested: 0, captured: 0, dropped: 0, errors: 0 },
    captureSlotWait: () => 0,
    getState: async () => ({ recording: true, sessionId: "rec" }),
    chrome: { tabs: { sendMessage: async () => null } },
    capture: async (tabId, options) => {
      if (announcedLater) context.playbackAnnounced += 1;
      options.playbackTarget.bounds = bounds;
      return "data:image/png;base64,AA";
    },
    saveScreenshot: async (id, key) => { saved.push(key); },
    canonicalStore: { associateScreenshot: async () => {} }
  });
  vm.runInContext(`${source.slice(start, end)}
    globalThis.take = takePlaybackScreenshot;
    globalThis.announce = () => { playbackAnnounced += 1; return playbackAnnounced; };`, context);
  const order = context.announce();
  if (announcedLater === "before") context.announce();
  await context.take({ recordingId: "rec", eventNo: 7, eventId: "e7", tabId: 1, frameId: 0,
    step: { kind: "action", caption: "Ny" }, order });
  return { saved, stats: context.screenshotStats };
}

(async () => {
  const box = { left: 1, top: 1, width: 10, height: 10 };
  assert.deepStrictEqual((await run({ bounds: null, announcedLater: false })).saved, ["7"],
    "stepping: the screenshot is kept even when the control is gone");
  const overtaken = await run({ bounds: null, announcedLater: "before" });
  assert.deepStrictEqual(overtaken.saved, [], "a later step was announced and the control is gone");
  assert.strictEqual(overtaken.stats.dropped, 1);
  assert.deepStrictEqual((await run({ bounds: box, announcedLater: "before" })).saved, ["7"],
    "the control still shows, with its outline");
  console.log("Playback screenshot tests passed.");
})().catch(error => { console.error(error); process.exit(1); });
