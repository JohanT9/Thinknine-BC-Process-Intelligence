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
console.log("Selection screenshot tests passed.");
