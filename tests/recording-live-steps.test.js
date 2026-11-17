// The recording panel shows the document's steps while recording. They come from the
// background worker's own code (computeLiveSteps), run here with the worker's modules on a
// recording made from raw events, with markers made as the panel makes them.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const background = read("src/recorder/background.js");

// The worker's modules, loaded in its order into one sandbox.
const sandbox = { console, setTimeout, clearTimeout, URL, TextEncoder, TextDecoder,
  chrome: { runtime: { getURL: value => value, id: "studio" }, storage: { local: {} } } };
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
const modules = [...background.matchAll(/^importScripts\("([^"]+)"\);/gmu)].map(match => match[1]);
for (const file of modules) {
  try { vm.runInContext(read(`src/${file}`), sandbox, { filename: file }); }
  catch (error) { throw new Error(`${file}: ${error.message}`); }
}

// The live-steps code and the interpretation it uses, as the worker has them.
const start = background.indexOf("// ---- The document as it is recorded, for the recording panel");
const end = background.indexOf("function privacyMaskLabels");
assert.ok(start > 0 && end > start, "the worker's live-steps code is found");
const packs = JSON.parse(read("src/knowledge-packs/index.json")).packs.filter(pack => pack.enabled)
  .map(pack => JSON.parse(read(`src/${pack.file}`)));
let recording = null;
sandbox.__getRecording = () => recording;
vm.runInContext(`
  const getCanonicalRecording = async () => globalThis.__getRecording();
  const screenshotAssetStore = { manifest: async () => ({ keys: [], paths: [] }) };
  const pageKnowledgePacksReady = Promise.resolve({ packs: globalThis.__packs });
  ${background.slice(start, end)}
  globalThis.__live = { computeLiveSteps, liveDocumentSteps };`, Object.assign(sandbox, { __packs: packs }));
// Results come from the sandbox's realm; compared as plain values.
const plain = value => JSON.parse(JSON.stringify(value));
const computeLiveSteps = async (...args) => plain(await sandbox.__live.computeLiveSteps(...args));

// A recording built from raw events, as the recorder writes them.
const at = seconds => new Date(Date.UTC(2026, 10, 17, 9, 0, 0) + seconds * 1000).toISOString();
const page = { pageCaption: "Släppt produktionsorder", pageId: "99000831", sourceFrameId: "inner", frameDepth: 1 };
let clock = 0;
function add(raw) {
  clock += 2;
  recording = canonical.addEvent(recording, { ...raw, timestamp: at(clock), sourceSequence: clock },
    identify.identify(raw, { eventId: `live:event:${clock}` }));
  return recording.events.at(-1).id;
}
const field = (caption, value, id) => add({ ...page, type: "field-change", category: "field",
  role: "textbox", controlType: "input", fieldName: caption, label: caption, accessibleName: caption,
  value, inputSource: "change", interactionId: id });
const button = (caption, id) => add({ ...page, type: "click", category: "action", role: "button",
  controlType: "button", label: caption, accessibleName: caption, pointerTarget: true, interactionId: id });
const marker = (kind, targets, extra = {}) => add({ type: "capture-guidance", category: "guidance",
  guidanceKind: kind, targetSourceEventId: targets[0],
  ...(targets.length > 1 ? { targetSourceEventIds: targets } : {}), source: "recording-panel", ...extra });

(async () => {
  recording = canonical.create({ id: "live", name: "live" });
  const quantity = field("Antal", "150", "inner:qty");
  const refresh = button("Uppdatera", "inner:refresh");
  const description = field("Beskrivning", "Sallad", "inner:desc");
  let live = await computeLiveSteps("live", "sv-SE");
  const text = step => step.runs.map(run => run.text).join("");
  assert.deepStrictEqual(live.steps.map(text), ["Ange 150 i Antal.", "Välj Uppdatera på sidan Släppt produktionsorder.",
    "Ange Sallad i Beskrivning."], JSON.stringify(live.steps.map(text)));
  assert.ok(live.steps[0].runs.some(run => run.bold && run.text === "150"), "the value is bold as in the document");
  assert.deepStrictEqual(live.steps[1].sourceEventIds, [refresh]);
  assert.strictEqual(live.steps[1].key, refresh, "a step is known by its first event");
  // In the document language chosen.
  live = await computeLiveSteps("live", "en-US");
  assert.strictEqual(text(live.steps[0]), "Enter 150 in Antal.");

  // Left out: still shown, marked; taken back: shown as before. The latest marker decides.
  marker("ignore", [refresh]);
  live = await computeLiveSteps("live", "sv-SE");
  assert.deepStrictEqual(live.steps.map(step => step.ignored), [false, true, false]);
  marker("include", [refresh]);
  live = await computeLiveSteps("live", "sv-SE");
  assert.deepStrictEqual(live.steps.map(step => step.ignored), [false, false, false]);

  // A new section after a step, with its name; renamed; removed again.
  marker("new-section", [quantity], { sectionTitle: "Ange antal" });
  live = await computeLiveSteps("live", "sv-SE");
  assert.deepStrictEqual(live.steps.map(step => [step.sectionAfter, step.sectionTitle]),
    [[true, "Ange antal"], [false, ""], [false, ""]]);
  marker("new-section", [quantity], { sectionTitle: "Antal och uppdatering" });
  live = await computeLiveSteps("live", "sv-SE");
  assert.strictEqual(live.steps[0].sectionTitle, "Antal och uppdatering");
  marker("no-section", [quantity]);
  live = await computeLiveSteps("live", "sv-SE");
  assert.strictEqual(live.steps[0].sectionAfter, false);
  // The first section's name; an empty name removes it.
  add({ type: "capture-guidance", category: "guidance", guidanceKind: "first-section-title",
    sectionTitle: "Skapa order", source: "recording-panel" });
  live = await computeLiveSteps("live", "sv-SE");
  assert.strictEqual(live.firstSectionTitle, "Skapa order");
  assert.strictEqual(live.steps.length, 3, "markers are not steps");
  void description;

  // The saved document gets the same sections, with the names given; one without a name is
  // numbered in the document's language.
  const { replay } = require("../scripts/capture-quality/replay");
  const studio = require("../src/review/review-studio");
  const fieldEvent = (caption, value, id, second) => ({ pageCaption: "P", pageId: "1",
    type: "field-change", category: "field", role: "textbox", controlType: "input",
    fieldName: caption, label: caption, value, inputSource: "change", interactionId: id,
    timestamp: at(100 + second) });
  const guidance = (kind, second, extra = {}) => ({ type: "capture-guidance", category: "guidance",
    guidanceKind: kind, source: "recording-panel", timestamp: at(100 + second), ...extra });
  const saved = (events, documentLanguage) => {
    const tasks = replay(events, { documentLanguage }).tasks;
    return studio.createReview({ id: "saved", name: "saved", settings: { documentLanguage } }, tasks)
      .hierarchy.sections.map(section => section.title);
  };
  const events = [fieldEvent("Antal", "150", "a", 1),
    guidance("first-section-title", 2, { sectionTitle: "Skapa order" }),
    guidance("new-section", 3, { targetSourceEventId: "capture-quality:event:1", sectionTitle: "Ange antal" }),
    fieldEvent("Beskrivning", "Sallad", "b", 5)];
  assert.deepStrictEqual(saved(events, "sv-SE"), ["Skapa order", "Ange antal"]);
  const unnamed = { ...events[2] };
  delete unnamed.sectionTitle;
  assert.deepStrictEqual(saved([events[0], unnamed, events[3]], "de-DE"),
    ["Abschnitt 1", "Abschnitt 2"], "an unnamed section is numbered in the document language");
  // A later marker on the same step decides: the section is removed again.
  assert.deepStrictEqual(saved([...events.slice(0, 3),
    guidance("no-section", 4, { targetSourceEventId: "capture-quality:event:1" }), events[3]], "sv-SE"),
  ["Skapa order"]);

  globalThis.__liveContext = { sandbox, recording: () => recording, add, field, button, marker, text };
  console.log("Recording live steps tests passed.");
})().catch(error => { console.error(error); process.exit(1); });
