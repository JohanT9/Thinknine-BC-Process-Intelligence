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
console.log("Selection screenshot tests passed.");
