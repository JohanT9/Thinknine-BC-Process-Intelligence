// The recording panel beside Business Central: its words in every interface language, the
// markers it sets on the latest step, and how it takes over from the floating box in the page.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

// ---- Every text of the panel exists in every registered interface language ----------------
const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
vm.runInNewContext(read("src/engine/locale-catalogs.js"), context);
vm.runInNewContext(read("src/engine/language-registry.js"), context);
vm.runInNewContext(read("src/ui/i18n.js"), context);
const i18n = context.globalThis.T9UiI18n;
const locales = [...i18n.SUPPORTED_LOCALES];
assert.ok(locales.length >= 8, "all registered interface languages are checked");

const panelHtml = read("src/ui/recording-panel.html");
const panelJs = read("src/ui/recording-panel.js");
const htmlKeys = [...panelHtml.matchAll(/data-i18n(?:-placeholder|-title|-aria-label)?="([^"]+)"/g)]
  .map(match => match[1]);
const scriptKeys = [...panelJs.matchAll(/"((?:recPanel|recorder|settings)\.[A-Za-z.-]+)"/g)]
  .map(match => match[1]);
// Keys built from a code: the warnings.
const builtKeys = ["recorder.notIdentified",
  ...["capture-write-error", "events-missing", "license-blocked", "recording-truncated",
    "screenshot-error", "screenshot-dropped", "bc-not-connected", "no-screenshots-yet"]
    .map(code => `recorder.warning.${code}`)];
const usedKeys = [...new Set([...htmlKeys, ...scriptKeys, ...builtKeys, "recPanel.show",
  "recPanel.unavailable"])];
assert.ok(usedKeys.length > 40, "the panel's keys are found");

const placeholders = text => [...String(text).matchAll(/\{([a-z]+)\}/g)].map(match => match[1]).sort();
// Words that are the same in English and the language itself.
const sameAsEnglish = new Set(["de-DE:recPanel.nameLabel", "de-DE:recPanel.counts",
  "fr-FR:recPanel.sectionNumber", "fr-FR:recPanel.pickerImage", "fr-FR:recPanel.statSections",
  "fr-FR:recPanel.statImages"]);
for (const key of usedKeys) {
  const english = i18n.translate(key, "en-US");
  assert.notEqual(english, key, `${key} has an English text`);
  for (const locale of locales) {
    const text = i18n.translate(key, locale);
    assert.ok(text && text !== key, `${key} exists in ${locale}`);
    assert.deepEqual(placeholders(text), placeholders(english), `${key} keeps its placeholders in ${locale}`);
    if (locale !== "en-US" && key.startsWith("recPanel.") && !sameAsEnglish.has(`${locale}:${key}`)) {
      assert.notEqual(text, english, `${key} is translated to ${locale}, not shown in English`);
    }
  }
}
// The panel's own texts are written out for every language, not left to a fallback.
for (const locale of locales) {
  const key = "recPanel.intro";
  assert.match(i18n.translate(key, locale), /\S/, `${key} in ${locale}`);
}
assert.equal(i18n.format("recPanel.toastIgnored", { number: 4 }, "sv-SE"),
  "Steg 4 tas inte med i dokumentet. Det finns kvar i inspelningen.");
assert.equal(i18n.format("recPanel.counts", { events: 3, screenshots: 2 }, "fi-FI"),
  "Tapahtumat: 3 · Kuvakaappaukset: 2");
assert.equal(i18n.format("recPanel.toastSectionNamed", { name: "Auftrag" }, "de-DE"),
  "Der Abschnitt heißt jetzt „Auftrag“.");
assert.equal(i18n.format("recPanel.outlineSteps", { count: 3 }, "fi-FI"), "3 vaihetta");

// ---- The panel marks the latest step of the active recording ------------------------------
const background = read("src/recorder/background.js");
const liveStatus = require("../src/engine/recording-live-status.js");

// ---- The panel lists the steps the user took, not everything recorded around them ----------
let steps = [];
[{ type: "navigation", category: "navigation", pageCaption: "Sales Orders" },
  { type: "click", category: "action", interactionId: "i1", actionCaption: "New", pageCaption: "Sales Order" },
  { type: "focus", category: "lifecycle", interactionId: "i2", fieldName: "Customer No.", value: "secret" },
  { type: "field-change", category: "field", interactionId: "i2", fieldName: "Customer No.", value: "100" },
  { type: "field-change", category: "field", interactionId: "i2", fieldName: "Customer No.", value: "10000" },
  { type: "dialog-open", category: "dialog" },
  { type: "status-message", category: "result" }
].forEach(event => { steps = liveStatus.addStep(steps, event); });
assert.deepEqual(steps.map(step => [step.category, step.actionCaption || step.fieldName]),
  [["action", "New"], ["field", "Customer No."]],
  "typing in one field is one step; focus changes and messages are not steps");
assert.ok(!JSON.stringify(steps).includes("10000") && !JSON.stringify(steps).includes("secret"),
  "the panel never keeps field values");
for (let index = 0; index < 8; index += 1) {
  steps = liveStatus.addStep(steps, { type: "click", category: "action",
    interactionId: `c${index}`, actionCaption: `A${index}` });
}
assert.equal(steps.length, 5, "only the latest steps are kept");
// A search result's icon is a character from Business Central's icon font: no empty square.
const iconStep = liveStatus.addStep([], { type: "click", category: "selection", interactionId: "s1",
  label: "Släppta produktionsorder Listor ", pageCaption: "Aktiviteter​" });
// The search result is named as in the document, without its category.
assert.equal(liveStatus.latestAction(iconStep[0]).label, "Släppta produktionsorder");
assert.equal(liveStatus.latestAction(iconStep[0]).pageCaption, "Aktiviteter");
for (const [caption, expected] of [["Released Production Orders Lists ", "Released Production Orders"],
  ["Freigegebene Fertigungsaufträge Listen", "Freigegebene Fertigungsaufträge"],
  ["Frigivne produktionsordrer Lister ", "Frigivne produktionsordrer"],
  ["Vapautetut tuotantotilaukset Luettelot ", "Vapautetut tuotantotilaukset"],
  // Without the icon it is an ordinary name, such as a button, and is kept whole.
  ["Prislistor Listor", "Prislistor Listor"], ["Lists", "Lists"]]) {
  const [step] = liveStatus.addStep([], { type: "click", category: "action", interactionId: "x", actionCaption: caption });
  assert.equal(liveStatus.latestAction(step).label, expected, caption);
}
// A list row is shown as the record the user chose, without the column's sort order.
require("../src/engine/bc-client-captions.js");
for (const [label, name, record] of [
  ["Nr, sorterade i Stigande order Välj posten \"3\"", "Nr Välj posten \"3\"", "3"],
  ["N°, trié dans l'ordre Croissant Choisir l’enregistrement « 30043 »", "N° Choisir l’enregistrement « 30043 »", "30043"],
  ["Nr., Sortierreihenfolge Aufsteigend Datensatz \"30043\" auswählen", "Nr. Datensatz \"30043\" auswählen", "30043"],
  // A button with a quoted word in its name, without a sort order, is not a record.
  ["Visa \"Order\" kort", "Visa \"Order\" kort", ""]]) {
  const [step] = liveStatus.addStep([], { type: "click", category: "action", interactionId: "r", label });
  assert.equal(step.label, name, label);
  assert.equal(step.record, record, label);
}
assert.equal(liveStatus.addStep([], { type: "change", category: "field", interactionId: "f",
  label: "Beskrivning \"A\"" })[0].record, "", "a field is never a record choice");
// The panel shows the document's own steps, interpreted by the background worker.
assert.match(panelJs, /type: "T9_GET_LIVE_STEPS", language: documentLanguage/);

const derived = liveStatus.derive({ session: { id: "rec-1", eventCount: 3 },
  debug: { activeSessionId: "rec-1", recentSteps: steps }, connected: true });
assert.deepEqual(derived.steps.map(step => step.label), ["A3", "A4", "A5", "A6", "A7"]);
assert.deepEqual(liveStatus.derive({ session: { id: "rec-2" },
  debug: { activeSessionId: "rec-1", recentSteps: steps } }).steps, [],
"steps belong to their own recording");
assert.deepEqual(liveStatus.freshSessionDebug("rec-3").recentSteps, []);
assert.match(background, /recentSteps: rawResult\.status === "duplicate"/);
const guidanceSource = background.slice(background.indexOf("const CAPTURE_GUIDANCE_KINDS"),
  background.indexOf("async function saveBcErrorEvidence"));
function guidanceHarness({ state, events }) {
  const recorded = [];
  const sandbox = {
    writeQueue: Promise.resolve(), screenshotWorkerPromise: Promise.resolve(),
    settleBounded: async () => {},
    globalThis: { T9RecordingLiveStatus: liveStatus },
    getState: async () => state,
    getCanonicalRecording: async () => ({ events }),
    extensionPageSender: sender => sender?.id === "studio" &&
      String(sender.url || "").startsWith("chrome-extension://studio/"),
    recordEvent: async (event, captureContext) => {
      recorded.push({ event, captureContext });
      return { canonicalEvent: { id: `marker:${recorded.length}` } };
    }
  };
  vm.runInNewContext(`${guidanceSource}\nthis.recordCaptureGuidance = recordCaptureGuidance;`, sandbox);
  return { recordCaptureGuidance: sandbox.recordCaptureGuidance, recorded };
}
const recordingState = { recording: true, sessionId: "rec-1", tabId: 7 };
const postEvent = { id: "source:1", screenshotAssetId: "shot-1",
  raw: { type: "click", category: "action", interactionId: "interaction:1", actionCaption: "Post" } };
const panelSender = { id: "studio", url: "chrome-extension://studio/recording-panel.html" };

(async () => {
  const fromPanel = guidanceHarness({ state: recordingState, events: [postEvent] });
  const result = await fromPanel.recordCaptureGuidance("use-image", panelSender);
  assert.equal(result.targetSourceEventId, "source:1");
  assert.equal(result.targetLabel, "Post", "the confirmation can name the step");
  assert.equal(result.preferredScreenshotAssetId, "shot-1");
  assert.equal(fromPanel.recorded[0].event.source, "recording-panel");
  assert.equal(fromPanel.recorded[0].captureContext.tabId, 7,
    "a marker from the panel belongs to the recording tab");

  // Moving into a field is not a step: a marker made then applies to the step before it.
  const focusFirst = guidanceHarness({ state: recordingState, events: [postEvent,
    { id: "source:9", raw: { type: "focus", category: "lifecycle",
      interactionId: "interaction:9", fieldName: "Quantity" } }] });
  assert.equal((await focusFirst.recordCaptureGuidance("ignore", panelSender))
    .targetSourceEventId, "source:1");

  // The page's own box still works, and only in the recording tab.
  const fromPage = guidanceHarness({ state: recordingState, events: [postEvent] });
  await fromPage.recordCaptureGuidance("ignore", { id: "studio", tab: { id: 7 }, frameId: 0,
    url: "https://businesscentral.dynamics.com/" });
  assert.equal(fromPage.recorded[0].event.source, "recording-indicator");
  await assert.rejects(fromPage.recordCaptureGuidance("ignore", { id: "studio", tab: { id: 9 },
    url: "https://businesscentral.dynamics.com/" }), error => error.code === "no-recording");
  // A web page cannot pass itself off as the panel.
  await assert.rejects(fromPage.recordCaptureGuidance("ignore",
    { id: "studio", url: "https://chrome-extension.studio.example/recording-panel.html" }),
  error => error.code === "no-recording");

  // A refusal carries a code the panel explains in the interface language.
  await assert.rejects(guidanceHarness({ state: recordingState, events: [] })
    .recordCaptureGuidance("ignore", panelSender), error => error.code === "no-step");
  await assert.rejects(guidanceHarness({ state: recordingState,
    events: [{ id: "source:2", raw: { type: "click", interactionId: "i:2" } }] })
    .recordCaptureGuidance("use-image", panelSender), error => error.code === "no-image");
  await assert.rejects(guidanceHarness({ state: { recording: false }, events: [postEvent] })
    .recordCaptureGuidance("ignore", panelSender), error => error.code === "no-recording");
  for (const code of ["no-step", "no-image", "no-recording"]) {
    assert.ok(panelJs.includes(`"${code}"`), `the panel explains ${code}`);
  }
  assert.match(background, /\.\.\.\(error\?\.code \? \{ code: error\.code \} : \{\}\)/,
    "the refusal code reaches the panel");

  // ---- The panel changes any step it shows, and only with that step's own events ----------
  const threeSteps = [postEvent,
    { id: "source:2", screenshotAssetId: "shot-2",
      raw: { type: "click", category: "action", interactionId: "i:2", actionCaption: "OK" } },
    { id: "source:3", screenshotAssetId: "shot-3",
      raw: { type: "change", category: "field", interactionId: "i:3", fieldName: "Qty" } }];
  const earlier = guidanceHarness({ state: recordingState, events: threeSteps });
  assert.equal((await earlier.recordCaptureGuidance("ignore", panelSender,
    { targetSourceEventIds: ["source:1"] })).targetSourceEventId, "source:1", "an earlier step is marked");
  await earlier.recordCaptureGuidance("use-image", panelSender,
    { targetSourceEventIds: ["source:1", "source:2"], preferredScreenshotAssetId: "shot-1" });
  assert.deepEqual([...earlier.recorded[1].event.targetSourceEventIds], ["source:1", "source:2"],
    "a step made of several events is marked as a whole");
  assert.equal(earlier.recorded[1].event.preferredScreenshotAssetId, "shot-1", "the chosen image is kept");
  // Only the step's own events: never the interaction, which a step after it can share.
  assert.equal(earlier.recorded[0].event.targetInteractionId, undefined,
    "a step named by the panel is not marked by its interaction");
  await assert.rejects(earlier.recordCaptureGuidance("use-image", panelSender,
    { targetSourceEventIds: ["source:1"], preferredScreenshotAssetId: "shot-3" }),
  error => error.code === "no-image", "an image of another step cannot be chosen");
  await assert.rejects(earlier.recordCaptureGuidance("ignore", panelSender,
    { targetSourceEventIds: ["source:1", "other-recording:7"] }),
  error => error.code === "no-step", "only events of this recording can be marked");
  await earlier.recordCaptureGuidance("include", panelSender, { targetSourceEventIds: ["source:1"] });
  assert.equal(earlier.recorded.at(-1).event.preferredScreenshotAssetId, undefined,
    "a marker from the panel never replaces a chosen image");
  await earlier.recordCaptureGuidance("new-section", panelSender, { targetSourceEventIds: ["source:2"],
    sectionTitle: `  Skapa${String.fromCharCode(0x200b)}   order\n${"x".repeat(100)}` });
  assert.equal(earlier.recorded.at(-1).event.sectionTitle.length, 80, "a section name is kept short");
  assert.match(earlier.recorded.at(-1).event.sectionTitle, /^Skapa order x+$/u,
    "a section name is one plain line");
  const named = await earlier.recordCaptureGuidance("first-section-title", panelSender,
    { sectionTitle: "Order" });
  assert.equal(named.sectionTitle, "Order");
  assert.equal(earlier.recorded.at(-1).event.targetSourceEventId, undefined,
    "the first section's name belongs to no step");
  // The page's own box keeps to the latest step and cannot name sections.
  const boxSender = { id: "studio", tab: { id: 7 }, url: "https://businesscentral.dynamics.com/" };
  const pageBox = guidanceHarness({ state: recordingState, events: threeSteps });
  await pageBox.recordCaptureGuidance("ignore", boxSender, { targetSourceEventIds: ["source:1"] });
  assert.equal(pageBox.recorded[0].event.targetSourceEventId, "source:3");
  assert.equal(pageBox.recorded[0].event.targetInteractionId, "i:3",
    "the page's box still marks the latest step by its interaction");
  await assert.rejects(pageBox.recordCaptureGuidance("first-section-title", boxSender,
    { sectionTitle: "X" }), error => error.code === "unknown-kind");

  // ---- The floating box steps aside while a panel is shown in the recording's window ------
  const panelSource = background.slice(background.indexOf("const RECORDING_PANEL_PORT"),
    background.indexOf("// What the capture scripts in Business Central pages send."));
  let connectListener = null;
  const tabs = { 7: { id: 7, windowId: 1 } };
  const panelSandbox = {
    chrome: { runtime: { onConnect: { addListener: listener => { connectListener = listener; } } },
      tabs: { get: async id => { if (!tabs[id]) throw new Error("no tab"); return tabs[id]; } } },
    extensionPageSender: sender => sender?.id === "studio" &&
      String(sender.url || "").startsWith("chrome-extension://studio/")
  };
  vm.runInNewContext(`${panelSource}\nthis.recordingPanelShown = recordingPanelShown;`, panelSandbox);
  const port = (name, sender) => {
    const listeners = { message: [], disconnect: [] };
    return { name, sender, onMessage: { addListener: fn => listeners.message.push(fn) },
      onDisconnect: { addListener: fn => listeners.disconnect.push(fn) },
      post: message => listeners.message.forEach(fn => fn(message)),
      disconnect: () => listeners.disconnect.forEach(fn => fn()) };
  };
  const shown = state => panelSandbox.recordingPanelShown(state);
  assert.equal(await shown(recordingState), false, "no panel, the box is shown");
  const panel = port("T9_RECORDING_PANEL", panelSender);
  connectListener(panel);
  panel.post({ windowId: 2 });
  assert.equal(await shown(recordingState), false, "a panel in another window does not hide the box");
  panel.post({ windowId: 1 });
  assert.equal(await shown(recordingState), true);
  assert.equal(await shown({ ...recordingState, recording: false }), false);
  assert.equal(await shown({ ...recordingState, tabId: 99 }), false, "a closed tab is handled");
  panel.disconnect();
  assert.equal(await shown(recordingState), false, "closing the panel brings the box back");
  // The test panel steps the box aside only while its own test is recorded.
  const testPanel = port("T9_RECORDING_PANEL", panelSender);
  connectListener(testPanel);
  testPanel.post({ windowId: 1, testRunId: "run-1" });
  assert.equal(await shown({ ...recordingState, testRunId: "run-1" }), true, "its test is recorded");
  assert.equal(await shown({ ...recordingState, testRunId: "run-2" }), false, "another test keeps the box");
  assert.equal(await shown(recordingState), false, "a process recording keeps the box");
  testPanel.disconnect();
  const testPanelJs = read("src/ui/test-panel.js");
  assert.match(testPanelJs, /chrome\.runtime\.connect\(\{ name: "T9_RECORDING_PANEL" \}\)/);
  assert.match(testPanelJs, /port\.postMessage\(\{ windowId: window\.id, testRunId \}\)/);
  const fake = port("T9_RECORDING_PANEL", { id: "studio", url: "https://example.com/" });
  connectListener(fake);
  fake.post({ windowId: 1 });
  assert.equal(await shown(recordingState), false, "a web page cannot hide the box");

  const content = read("src/recorder/content.js");
  assert.match(content, /dataset\.panel = response\.recordingPanelOpen \? "open" : ""/);
  assert.match(content, /:host\(\[data-panel="open"\]\) \.panel\{display:none\}/,
    "only the box is hidden; the frame around the page stays");
  assert.match(background, /recordingPanelOpen: await recordingPanelShown\(state\)/);

  // ---- The popup opens the panel straight from the click ----------------------------------
  const popup = read("src/ui/popup.js");
  const startBody = popup.slice(popup.indexOf("function startRecording("),
    popup.indexOf("// Without the panel the recording is started here"));
  assert.ok(startBody.includes("openRecordingPanel({ start: recordingPurpose, tabId: popupTab.id })"),
    "the popup hands the start to the panel");
  assert.doesNotMatch(startBody, /\bawait\b/, "the panel is opened before anything is awaited");
  // Edge closes the popup when the panel opens, so the panel carries out the start, once.
  assert.match(panelJs, /if \(!recordingSeen && claimStart\(\)\) void runStart\(\);/);
  assert.match(panelJs, /recordingStart\.startRecording\(\{ purpose: startPurpose, tab,/);
  assert.match(panelHtml, /<script src="recording-start\.js"><\/script>/);
  assert.match(read("src/ui/popup.html"), /<script src="recording-start\.js"><\/script>/);
  assert.match(popup, /\$\("showRecordingPanel"\)\.hidden = testRecording;/,
    "a test recording is followed in the test panel");
  assert.match(read("src/ui/popup.html"), /id="showRecordingPanel"[^>]*data-i18n="recPanel\.show"/);

  // ---- The panel saves like the popup, and the build ships it -----------------------------
  for (const type of ["T9_STOP", "T9_FINISH_BUG_RECORDING", "T9_CANCEL_RECORDING",
    "T9_CAPTURE_GUIDANCE", "T9_GET_STATE", "T9_GET_SETTINGS"]) {
    assert.ok(panelJs.includes(`type: "${type}"`), `the panel sends ${type}`);
  }
  assert.doesNotMatch(panelJs, /confirm\(/, "deleting is confirmed in the panel, not in a browser dialog");
  assert.match(panelHtml, /<form id="rpSaveForm"/);
  assert.match(panelHtml, /data-language-select="document"/, "the document language is chosen when saving");
  assert.doesNotMatch(panelHtml, /data-kind="important"/,
    "the panel offers only markers that change the document");
  assert.match(read("scripts/build.js"), /"recording-panel\.html", "recording-panel\.js"/);

  // ---- The panel keeps up when an answer is lost or the extension was reloaded --------------
  function element() {
    const target = { dataset: {}, style: {}, hidden: false, textContent: "", value: "",
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false } };
    return new Proxy(target, { get: (object, key) => key in object ? object[key] :
      (key === "querySelectorAll" ? () => [] : () => element()) });
  }
  function runPanel({ runtimeId = "studio", answer, search = "?starting=1", tabs = {} } = {}) {
    const timers = []; const sent = []; const events = { reloads: 0, connects: 0 };
    const chrome = {
      runtime: { id: runtimeId, lastError: null,
        sendMessage(message, callback) { sent.push(message.type); answer?.(message, callback); },
        connect() {
          events.connects += 1;
          if (!chrome.runtime.id) throw new Error("Extension context invalidated.");
          return { postMessage() {}, onDisconnect: { addListener(fn) { events.disconnect = fn; } } };
        },
        onMessage: { addListener() {} } },
      windows: { getCurrent: () => Promise.resolve({ id: 1 }) },
      storage: { onChanged: { addListener() {} } },
      tabs
    };
    const store = new Map();
    const sandbox = {
      globalThis: null, chrome, URLSearchParams, Date, Promise, Error, String, Number, Math,
      JSON, Object, Set, Map, Array, console,
      location: { search, reload() { events.reloads += 1; } },
      sessionStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) },
      document: { getElementById: () => element(), querySelector: () => element(), querySelectorAll: () => [],
        createElement: () => element(), createTextNode: () => element(), addEventListener() {},
        title: "" },
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
      clearTimeout: id => { if (timers[id - 1]) timers[id - 1].cleared = true; },
      setInterval: (fn, ms) => { timers.push({ fn, ms, interval: true }); return timers.length; },
      window: { close() {} }
    };
    sandbox.globalThis = Object.assign(sandbox, { T9UiI18n: i18n,
      T9LanguageRegistry: context.globalThis.T9LanguageRegistry,
      T9AsyncOperations: { withTimeout: promise => promise },
      T9TenantLicense: { CHECK_TIMEOUT_MS: 30000 } });
    vm.createContext(sandbox);
    vm.runInContext(read("src/ui/recording-start.js"), sandbox);
    vm.runInContext(read("src/ui/recording-panel.js"), sandbox);
    return { timers, sent, events, chrome };
  }
  const flush = () => new Promise(resolve => setImmediate(resolve));

  // Settings answer at once, but the first status request is never answered.
  const lost = runPanel({ answer: (message, callback) => {
    if (message.type === "T9_GET_SETTINGS") callback({ ok: true, settings: { uiLocale: "sv-SE" } });
  } });
  for (let i = 0; i < 5; i += 1) await flush();
  assert.equal(lost.events.connects, 1, "the panel connects at once, before its settings arrive");
  assert.ok(lost.timers.some(timer => timer.interval), "updates run on their own timer");
  const timeout = lost.timers.find(timer => timer.ms === 8000 && !timer.cleared);
  assert.ok(timeout, "an unanswered request has a time limit");
  timeout.fn(); await flush();
  const before = lost.sent.filter(type => type === "T9_GET_STATE").length;
  lost.timers.find(timer => timer.interval).fn(); await flush();
  assert.equal(lost.sent.filter(type => type === "T9_GET_STATE").length, before + 1,
    "after a lost answer the next update is asked for again");

  // A panel left from before the extension was reloaded loads itself again, once.
  const stale = runPanel({ answer: (message, callback) => callback({ ok: true, state: {} }) });
  for (let i = 0; i < 3; i += 1) await flush();
  stale.chrome.runtime.id = undefined;
  stale.events.disconnect();
  assert.equal(stale.events.reloads, 1, "the panel reconnects to the reloaded extension");
  stale.events.disconnect();
  assert.equal(stale.events.reloads, 1, "it does not reload over and over");
  const orphan = runPanel({ runtimeId: null });
  assert.equal(orphan.events.reloads, 1, "a panel opened without the extension reloads");
  assert.equal(orphan.sent.length, 0);

  // ---- The panel carries out a start the popup handed to it ------------------------------
  // Edge closes the popup as soon as the panel opens, so a start left there never finished.
  const bcTab = { id: 7, windowId: 1, url: "https://businesscentral.dynamics.com/tenant/Production" };
  const startAnswers = (startResult) => (message, callback) => {
    const answers = {
      T9_GET_SETTINGS: { ok: true, settings: { uiLocale: "sv-SE" } },
      T9_GET_STATE: { ok: true, state: { recording: false } },
      T9_LICENSE_INFORMATION: { ok: true, information: {} },
      T9_LICENSE_CHECK: { ok: true, tenantId: "tenant", license: { allowed: true, stale: true } },
      T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: true },
      T9_TENANT_USER_REGISTER: { ok: true },
      T9_START: startResult
    };
    callback(answers[message.type] || { ok: false });
  };
  const bcTabs = { get: async id => (id === 7 ? bcTab : null),
    sendMessage: async () => ({ ok: true }) };
  const handed = runPanel({ search: "?start=documentation&tabId=7&nonce=n1", tabs: bcTabs,
    answer: startAnswers({ ok: true }) });
  for (let i = 0; i < 20; i += 1) await flush();
  assert.equal(handed.sent.filter(type => type === "T9_START").length, 1,
    "the panel starts the recording the popup asked for");
  assert.ok(handed.sent.indexOf("T9_LICENSE_CHECK") < handed.sent.indexOf("T9_START"),
    "the license is checked first");
  const failing = runPanel({ search: "?start=bug-report&tabId=7&nonce=n2", tabs: bcTabs,
    answer: startAnswers({ ok: false, error: "recorder.startFailed" }) });
  for (let i = 0; i < 20; i += 1) await flush();
  assert.equal(failing.sent.filter(type => type === "T9_START").length, 0);
  assert.ok(!failing.sent.includes("T9_START_BUG_RECORDING") ||
    failing.sent.filter(type => type === "T9_START_BUG_RECORDING").length === 1,
  "a failed start is not repeated by itself");
  assert.match(panelJs, /\$\("rpRetry"\)\.addEventListener\("click", \(\) => \{ void runStart\(\); \}\);/,
    "a failed start can be tried again");

  // The background accepts the license steps of a start from the panel, not only the popup;
  // before, a start from the panel stopped at "Testlicens får bara begäras från tilläggets popup".
  for (const type of ["T9_ACCEPT_LICENSE_NOTICE", "T9_LICENSE_CHECK", "T9_REQUEST_TRIAL",
    "T9_MICROSOFT_SIGN_IN", "T9_TENANT_USER_REGISTER"]) {
    const body = background.slice(background.indexOf(`case "${type}": {`));
    assert.match(body.slice(0, 400), /!fromRecordingPanel\(sender\)\)/,
      `${type} is allowed from the recording panel`);
  }
  const helperSource = background.slice(background.indexOf("function fromRecordingPanel("),
    background.indexOf("function messageAllowed("));
  const fromRecordingPanel = new Function("chrome", `${helperSource}; return fromRecordingPanel;`)({
    runtime: { id: "ext", getURL: path => `chrome-extension://ext/${path}` } });
  const page = "chrome-extension://ext/recording-panel.html";
  assert.equal(fromRecordingPanel({ id: "ext", url: page }), true);
  assert.equal(fromRecordingPanel({ id: "ext", url: `${page}?start=documentation&tabId=7` }), true);
  assert.equal(fromRecordingPanel({ id: "ext", url: `${page}x` }), false);
  assert.equal(fromRecordingPanel({ id: "other", url: page }), false);
  assert.equal(fromRecordingPanel({ id: "ext", url: page, tab: { id: 3 } }), false,
    "a content script is never the panel");

  console.log("Recording panel tests passed.");
})().catch(error => { console.error(error); process.exit(1); });
