// A choice in a list is shown by the screenshot taken at the click, before the client
// responds, not by a queued screenshot of a later event that may show a later moment.
const assert = require("assert");
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");

const at = seconds => `2026-10-05T05:45:${String(seconds).padStart(2, "0")}.000Z`;
const field = { sourceFrameId: "inner", frameDepth: 1, pageId: "42", pageCaption: "Ny - Förs.order",
  controlType: "input", role: "combobox", ariaHasPopup: "grid", accessibleName: "Kundnr",
  fieldName: "Kundnr", label: "Kundnr", elementId: "custno", interactionId: "inner:customer" };
const raw = [
  { ...field, type: "field-change", category: "field", inputSource: "input", value: "iber",
    timestamp: at(11), uiState: { menuOpen: true, resultVisible: true } },
  { sourceFrameId: "inner", frameDepth: 1, pageId: "42", pageCaption: "Ny - Förs.order", type: "click",
    category: "selection", controlType: "tr", role: "row", interactionId: "inner:choice",
    accessibleName: "Nr, sorterade i Stigande order Välj posten \"905\"",
    label: "Nr, sorterade i Stigande order Välj posten \"905\"", pointerTarget: true,
    preActionCaptureId: "inner:choice-capture", timestamp: at(13),
    uiState: { selectedOptionVisible: true } },
  { ...field, type: "field-change", category: "field", inputSource: "change", value: "905",
    interactionId: "inner:choice", timestamp: at(16), uiState: { resultVisible: true } }
].map((event, index) => ({ ...event, sourceEventId: `source:${index + 1}`, sourceSequence: index + 1,
  recordingId: "selection-screenshot" }));

let recording = canonical.create({ id: "selection-screenshot", name: "Selection screenshot" });
const events = raw.map((event, index) => {
  recording = canonical.addEvent(recording, event, identify.identify(event, { eventId: `selection:event:${index}` }));
  return { ...event, eventNo: index + 1, canonicalSourceEventId: recording.events.at(-1).id };
});
const normalized = normalization.normalizeRecording(recording);
const grouped = grouping.group(normalized);
const interpret = imagePaths => pipeline.interpret({
  session: { id: "selection-screenshot", name: "Selection screenshot", settings: { documentLanguage: "sv-SE" } },
  events, normalizedEvents: normalized.events, stepGroups: grouped.groups,
  supportingEvents: grouped.supportingEvents, groupingDiagnostics: grouped.diagnostics,
  imagePaths, knowledgePacks: [] }).businessTasks;

const tasks = interpret({ 1: "screenshots/000001.png", 2: "screenshots/000002.png", 3: "screenshots/000003.png" });
const customer = tasks.find(task => /905/u.test(task.instruction));
assert.ok(customer, JSON.stringify(tasks.map(task => task.instruction)));
assert.strictEqual(customer.screenshot, "screenshots/000002.png", "the screenshot taken at the click");
// Without a screenshot at the click, the step keeps its other screenshot.
const fallback = interpret({ 1: "screenshots/000001.png", 3: "screenshots/000003.png" })
  .find(task => /905/u.test(task.instruction));
assert.notStrictEqual(fallback.screenshot, "screenshots/000002.png");
assert.ok(fallback.screenshot);
// A step that clicks a named control, OK in a dialog, shows the screenshot taken at that click,
// not the page after the dialog closed.
{
  const dialogPage = { sourceFrameId: "inner", frameDepth: 1, pageId: "7002", pageCaption: "Ändra tillämpad direkt enhetskostnad" };
  const dialogEvents = [
    { ...dialogPage, type: "click", category: "action", controlType: "button", role: "button",
      accessibleName: "OK", label: "OK", pointerTarget: true, interactionId: "inner:ok",
      preActionCaptureId: "inner:ok-capture", timestamp: at(20) },
    { ...dialogPage, type: "dialog-close", category: "dialog", controlType: "form", role: "dialog",
      accessibleName: "Ändra tillämpad direkt enhetskostnad", interactionId: "inner:ok", timestamp: at(21) }
  ].map((event, index) => ({ ...event, sourceEventId: `dialog:${index + 1}`, sourceSequence: 10 + index,
    recordingId: "selection-screenshot" }));
  let dialogRecording = canonical.create({ id: "dialog-screenshot", name: "Dialog screenshot" });
  const dialogInput = dialogEvents.map((event, index) => {
    dialogRecording = canonical.addEvent(dialogRecording, event, identify.identify(event, { eventId: `dialog:event:${index}` }));
    return { ...event, eventNo: index + 1, canonicalSourceEventId: dialogRecording.events.at(-1).id };
  });
  const dialogNormalized = normalization.normalizeRecording(dialogRecording);
  const dialogGrouped = grouping.group(dialogNormalized);
  const okTask = pipeline.interpret({ session: { id: "dialog", name: "Dialog", settings: { documentLanguage: "sv-SE" } },
    events: dialogInput, normalizedEvents: dialogNormalized.events, stepGroups: dialogGrouped.groups,
    supportingEvents: dialogGrouped.supportingEvents, groupingDiagnostics: dialogGrouped.diagnostics,
    imagePaths: { 1: "screenshots/ok-click.png", 2: "screenshots/after-close.png" }, knowledgePacks: [] })
    .businessTasks.find(task => /OK/u.test(task.instruction));
  assert.ok(okTask);
  assert.strictEqual(okTask.screenshot, "screenshots/ok-click.png");
}
// A row chosen with Enter in a lookup field's suggestion list: the step shows the screenshot
// taken with the list open, outlined around the chosen row, not the field afterwards.
{
  const line = { sourceFrameId: "inner", frameDepth: 1, pageId: "50", pageCaption: "Inköpsorder",
    rowTypeContext: { source: "same-row-type", schemaVersion: 1, caption: "Typ", value: "Artikel" } };
  const lookup = { ...line, controlType: "input", role: "combobox", ariaHasPopup: "grid",
    accessibleName: "Sortera efter Nr", fieldName: "Sortera efter Nr", label: "Sortera efter Nr",
    elementId: "lineNo", interactionId: "inner:item" };
  const keyEvents = [
    { ...lookup, type: "field-change", category: "field", inputSource: "input", value: "3", timestamp: at(38),
      uiState: { menuOpen: true, resultVisible: true }, topViewportBounds: { x: 0.1, y: 0.9, width: 0.03, height: 0.02 } },
    { ...line, type: "key", key: "Enter", category: "selection", inputSource: "keyboard", controlType: "tr",
      role: "row", accessibleName: "1283344 Wrapspapper brunt", selectedCaption: "1283344", selectedValue: "1283344",
      interactionId: "inner:item", timestamp: "2026-10-05T05:45:38.400Z",
      topViewportBounds: { x: 0.1265, y: 0.766, width: 0.21, height: 0.0218 } },
    { ...lookup, type: "field-change", category: "field", inputSource: "change", value: "3",
      timestamp: "2026-10-05T05:45:38.800Z", uiState: { resultVisible: true },
      topViewportBounds: { x: 0.1, y: 0.9, width: 0.03, height: 0.02 } }
  ].map((event, index) => ({ ...event, sourceEventId: `key:${index + 1}`, sourceSequence: 20 + index,
    recordingId: "selection-screenshot" }));
  let keyRecording = canonical.create({ id: "key-screenshot", name: "Key screenshot" });
  const keyInput = keyEvents.map((event, index) => {
    keyRecording = canonical.addEvent(keyRecording, event, identify.identify(event, { eventId: `key:event:${index}` }));
    return { ...event, eventNo: index + 1, canonicalSourceEventId: keyRecording.events.at(-1).id };
  });
  const keyNormalized = normalization.normalizeRecording(keyRecording);
  const keyGrouped = grouping.group(keyNormalized);
  const [itemTask] = pipeline.interpret({ session: { id: "key", name: "Key", settings: { documentLanguage: "sv-SE" } },
    events: keyInput, normalizedEvents: keyNormalized.events, stepGroups: keyGrouped.groups,
    supportingEvents: keyGrouped.supportingEvents, groupingDiagnostics: keyGrouped.diagnostics,
    imagePaths: { 1: "screenshots/list-open.png", 3: "screenshots/field-after.png" }, knowledgePacks: [] }).businessTasks;
  assert.ok(/1283344/u.test(itemTask.instruction), itemTask.instruction);
  assert.strictEqual(itemTask.screenshot, "screenshots/list-open.png");
  assert.deepStrictEqual(itemTask.screenshotHighlight, { screenshotRef: "screenshots/list-open.png",
    sourceEventNo: 2, x: 0.1265, y: 0.766, width: 0.21, height: 0.0218 });
}
// New on a list and a search in Tell me show the moment of the click, outlined, as in a Swedish
// purchase order recording: the list with New, and the search window with the result chosen,
// not the page each click opened.
{
  const { replay } = require("../scripts/capture-quality/replay");
  const frame = { sourceFrameId: "inner", frameDepth: 1, recordingId: "click-moment" };
  const second = value => `2026-11-10T11:02:${String(value).padStart(2, "0")}.000Z`;
  const ny = { x: 0.3217, y: 0.0944, width: 0.0258, height: 0.0326 };
  const row = { x: 0.3662, y: 0.1793, width: 0.2678, height: 0.0292 };
  const events = [
    { ...frame, type: "click", category: "action", role: "button", controlType: "button",
      label: "Sök", accessibleName: "Sök", pageCaption: "Rollcenter", pointerTarget: true,
      interactionId: "top:search", preActionCaptureId: "top:search-capture", timestamp: second(1),
      topViewportBounds: { x: 0.9, y: 0, width: 0.02, height: 0.04 } },
    { ...frame, type: "field-change", category: "field", role: "textbox", controlType: "input",
      inputType: "text", fieldName: "Berätta vad du vill göra.", label: "Berätta vad du vill göra.",
      accessibleName: "Berätta vad du vill göra.", inputSource: "change", value: "ink ord",
      pageCaption: "Aktiviteter", interactionId: "inner:tellme", timestamp: second(3) },
    { ...frame, type: "click", category: "action", role: "gridcell", controlType: "td",
      label: "Inköpsorder Listor \uEDFF", accessibleName: "Inköpsorder Listor \uEDFF",
      selectedCaption: "Inköpsorder Listor \uEDFF", pageCaption: "Aktiviteter", pointerTarget: true,
      interactionId: "inner:result", preActionCaptureId: "inner:result-capture", timestamp: second(5),
      topViewportBounds: row },
    { ...frame, type: "page-state", pageCaption: "Inköpsorder", pageId: "9307", timestamp: second(6) },
    { ...frame, type: "dialog-close", category: "dialog", role: "dialog", pageCaption: "Inköpsorder",
      interactionId: "inner:result", timestamp: second(7) },
    { ...frame, type: "click", category: "action", role: "menuitem", controlType: "button",
      label: "Ny", accessibleName: "Ny", pageCaption: "Inköpsorder", pageId: "9307", pointerTarget: true,
      interactionId: "inner:new", preActionCaptureId: "inner:new-capture", timestamp: second(9),
      topViewportBounds: ny },
    { ...frame, type: "page-state", pageCaption: "Ny - Inköpsorder", pageId: "50", timestamp: second(10) }
  ].map((event, index) => ({ ...event, sourceEventId: `moment:${index + 1}`, sourceSequence: index + 1 }));
  const images = { 1: "shot-1.png", 3: "shot-3.png", 5: "shot-5.png", 6: "shot-6.png", 7: "shot-7.png" };
  const tasks = replay(events, { documentLanguage: "sv-SE", imagePaths: images }).tasks;
  const search = tasks.find(task => task.taskType === "SearchAndOpenPage");
  const create = tasks.find(task => /\*\*Ny\*\*/u.test(task.instruction));
  assert.ok(search && create, JSON.stringify(tasks.map(task => task.instruction)));
  assert.strictEqual(search.screenshot, "shot-3.png", "the search shows the result being chosen");
  assert.deepStrictEqual({ ...search.screenshotHighlight }, { screenshotRef: "shot-3.png", sourceEventNo: 3, ...row });
  assert.strictEqual(create.screenshot, "shot-6.png", "New shows the list as it was clicked");
  assert.deepStrictEqual({ ...create.screenshotHighlight }, { screenshotRef: "shot-6.png", sourceEventNo: 6, ...ny });
}
console.log("Selection screenshot tests passed.");
