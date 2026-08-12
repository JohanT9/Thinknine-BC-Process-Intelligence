const assert = require("assert");
const fs = require("fs");
const canonical = require("../src/engine/canonical-recording");
const identifier = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");

function recording(id = "normalize") { return canonical.create({ id }); }
function append(model, source, identified = {}) {
  const eventId = `${model.id}:event:${source.sourceEventId}`;
  const identification = identifier.identify({ ...source, ...identified }, { eventId });
  return canonical.addEvent(model, source, identification);
}
function raw(id, type, extra = {}) {
  return { sourceEventId: id, timestamp: "2026-08-10T10:00:00.000Z",
    type, sourceFrameId: "top", sourceSequence: Number(id.replace(/\D/g, "")) || 1,
    ...extra };
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

let model = recording();
const original = raw("e1", "focus", { fieldName: "Quantity", value: "" });
const before = JSON.stringify(original);
model = append(model, original, { role: "textbox", controlType: "input" });
model = append(model, raw("e2", "field-change", { fieldName: "Quantity",
  value: "500", previousValue: "", inputSource: "input" }),
  { role: "textbox", controlType: "input" });
model = append(model, raw("e3", "field-change", { fieldName: "Quantity",
  value: "500", previousValue: "", inputSource: "change" }),
  { role: "textbox", controlType: "input" });
model = append(model, raw("e4", "field-change", { fieldName: "Quantity",
  value: "500", previousValue: "", inputSource: "focusout" }),
  { role: "textbox", controlType: "input" });
let result = normalization.normalizeRecording(model);
assert.strictEqual(JSON.stringify(original), before);
assert.strictEqual(result.schemaVersion, 1);
assert.strictEqual(result.normalizationVersion, "2.0.0");
assert.strictEqual(normalization.NORMALIZATION_VERSION, "2.0.0");
assert.strictEqual(result.events.length, 1);
assert.strictEqual(result.events[0].kind, "value-change");
assert.deepStrictEqual(result.events[0].sourceEventIds,
  ["normalize:event:e2", "normalize:event:e3", "normalize:event:e4"]);
assert.strictEqual(result.events[0].sourceEventId, "normalize:event:e4");
assert.strictEqual(result.events[0].sequence, 4);
assert.strictEqual(result.events[0].rawEventType, "field-change");
assert.deepStrictEqual(result.events[0].timestampRange, {
  start: "2026-08-10T10:00:00.000Z", end: "2026-08-10T10:00:00.000Z"
});
assert.deepStrictEqual(result.events[0].value,
  { raw: "500", normalized: "500", display: "500" });
assert.strictEqual(typeof result.events[0].value.normalized, "string");
assert.ok(Object.isFrozen(result.events[0]));
assert.strictEqual(normalization.normalizeRecording(model), result);

let controls = recording("controls");
controls = append(controls, raw("b1", "click", { label: "Post", clientX: 10,
  clientY: 20 }), { category: "action", role: "button", controlType: "button",
  accessibleName: "Post" });
controls = append(controls, raw("b2", "key", { label: "Post", key: "Enter",
  code: "Enter", ctrlKey: false, inputSource: "keyboard" }),
  { category: "action", role: "button", controlType: "button", accessibleName: "Post" });
controls = append(controls, raw("c1", "click", { label: "Blocked", checked: true }),
  { inputType: "checkbox", controlType: "input", accessibleName: "Blocked" });
controls = append(controls, raw("l1", "click", { label: "Customer No." }),
  { controlType: "input", role: "textbox", ariaHasPopup: "listbox",
    accessibleName: "Customer No." });
controls = append(controls, raw("r1", "click", { selectedCaption: "10000",
  selectedIndex: 2 }), { role: "gridcell", accessibleName: "No." });
controls = append(controls, raw("o1", "field-change", { value: "Open",
  inputSource: "change", selectedValue: "Open" }),
  { controlType: "select", accessibleName: "Status" });
result = normalization.normalizeRecording(controls);
assert.deepStrictEqual(result.events.map(event => event.kind), [
  "activation", "activation", "toggle-change", "activation",
  "selection-change", "selection-change"
]);
assert.strictEqual(result.events[0].interaction.mechanism, "pointer");
assert.deepStrictEqual(result.events[0].coordinates.pointer, { x: 10, y: 20 });
assert.strictEqual(result.events[1].interaction.mechanism, "keyboard");
assert.strictEqual(result.events[1].interaction.key, "Enter");
assert.deepStrictEqual(result.events[2].state, { checked: true });
assert.strictEqual(result.events[4].selection.transientIndex, 2);

let date = recording("date");
date = append(date, raw("d1", "focus", { value: "07-08-2026" }),
  { controlType: "input", placeholder: "YYYY-MM-DD", controlAddIn: true });
date = append(date, raw("d2", "field-change", { value: "2026-08-07",
  previousValue: "07-08-2026", inputSource: "focusout", frameDepth: 1,
  sourceFrameId: "mui-frame", tabId: 7, browserFrameId: 2,
  parentFrameId: 0, documentId: "document-1", frameOrigin: "https://addin.example",
  localBounds: { x: 5, y: 6, width: 100, height: 30 }, devicePixelRatio: 2 }),
  { controlType: "input", placeholder: "YYYY-MM-DD", controlAddIn: true });
result = normalization.normalizeRecording(date);
assert.strictEqual(result.events[0].kind, "value-change");
assert.strictEqual(result.events[0].value.format, "iso-date");
assert.strictEqual(result.events[0].value.normalized, "2026-08-07");
assert.strictEqual(result.events[0].frameContext.frameId, "mui-frame");
assert.strictEqual(result.events[0].frameContext.depth, 1);
assert.strictEqual(result.events[0].frameContext.tabId, 7);
assert.strictEqual(result.events[0].frameContext.browserFrameId, 2);
assert.strictEqual(result.events[0].frameContext.documentId, "document-1");
assert.deepStrictEqual(result.events[0].coordinates.localBounds,
  { x: 5, y: 6, width: 100, height: 30 });
assert.strictEqual(result.events[0].evidence[0].value,
  "changed-value-on-focusout-fallback");

let noise = recording("noise");
noise = append(noise, raw("f1", "focus", { value: "same" }),
  { controlType: "input" });
noise = append(noise, raw("f2", "field-change", { value: "same",
  previousValue: "same", inputSource: "focusout" }), { controlType: "input" });
assert.strictEqual(normalization.normalizeRecording(noise).events.length, 0);
let focusOnly = recording("focus-only");
focusOnly = append(focusOnly, raw("only-focus", "focus", { value: "same" }),
  { controlType: "input" });
assert.strictEqual(normalization.normalizeRecording(focusOnly).events.length, 0);

let nativeOnly = recording("native-only");
nativeOnly = append(nativeOnly, raw("native-input", "field-change", {
  fieldName: "Quantity", value: "5", previousValue: "", inputSource: "input"
}), { controlType: "input", automationId: "Quantity" });
assert.strictEqual(normalization.normalizeRecording(nativeOnly).events[0].kind,
  "value-change");

let typing = recording("typing");
typing = append(typing, raw("t0", "focus", { fieldName: "Quantity", value: "" }),
  { controlType: "input", automationId: "Quantity" });
for (const [index, value] of ["5", "50", "500"].entries()) {
  typing = append(typing, raw(`t${index + 1}`, "field-change", {
    fieldName: "Quantity", value, previousValue: "", inputSource: "input"
  }), { controlType: "input", automationId: "Quantity" });
}
typing = append(typing, raw("t4", "field-change", { fieldName: "Quantity",
  value: "500", previousValue: "", inputSource: "change" }),
  { controlType: "input", automationId: "Quantity" });
const committedTyping = normalization.normalizeRecording(typing);
assert.strictEqual(committedTyping.events.length, 1);
assert.strictEqual(committedTyping.events[0].value.normalized, "500");
assert.deepStrictEqual(committedTyping.events[0].sourceEventIds,
  ["typing:event:t1", "typing:event:t2", "typing:event:t3", "typing:event:t4"]);

let mechanics = recording("mechanics");
mechanics = append(mechanics, raw("dialog-open", "dialog-open", {
  label: "Confirm" }), { uiHierarchy: [{ type: "dialog", caption: "Confirm" }] });
mechanics = append(mechanics, raw("dialog-close", "dialog-close", {
  label: "Confirm" }));
mechanics = append(mechanics, raw("key-command", "keydown", {
  key: "Escape", inputSource: "keyboard" }));
assert.deepStrictEqual(normalization.normalizeRecording(mechanics).events
  .map(event => event.kind), ["dialog-open", "dialog-close", "key-command"]);

let repeated = recording("repeat");
for (const suffix of ["a", "b"]) {
  repeated = append(repeated, raw(`${suffix}1`, "focus", { value: "" }),
    { controlType: "input", automationId: "Reference" });
  repeated = append(repeated, raw(`${suffix}2`, "field-change", { value: "X",
    previousValue: "", inputSource: "input" }),
    { controlType: "input", automationId: "Reference" });
}
assert.strictEqual(normalization.normalizeRecording(repeated).events.length, 2);

let future = recording("future");
future = append(future, raw("u1", "future-browser-event", {
  futureRawMetadata: { retained: true }
}), { role: "future-role" });
const unknown = normalization.normalizeRecording(future).events[0];
assert.strictEqual(unknown.kind, "unknown");
assert.strictEqual(unknown.rawEventType, "future-browser-event");
assert.strictEqual(unknown.sourceEventId, "future:event:u1");
assert.deepStrictEqual(unknown.futureMetadata, { retained: true });
const futureNormalized = normalization.normalizeEvent({
  ...unknown, futureNormalizedMetadata: { retained: true }
});
assert.deepStrictEqual(futureNormalized.futureNormalizedMetadata, { retained: true });

const frozenModel = deepFreeze(JSON.parse(JSON.stringify(future)));
const frozenBefore = JSON.stringify(frozenModel);
normalization.normalizeRecording(frozenModel);
assert.strictEqual(JSON.stringify(frozenModel), frozenBefore);

const legacySession = { id: "legacy-normalize", startedAt: "2026-08-10T09:00:00Z" };
const legacy = canonical.fromLegacy(legacySession, [{ eventNo: 1, type: "click",
  timestamp: "2026-08-10T09:00:00Z", label: "Post" }]);
assert.strictEqual(normalization.normalizeRecording(legacy).events[0].kind, "activation");
assert.strictEqual(normalization.normalizeRecording(legacy).events[0].normalizedEventId,
  "normalized:24:legacy-normalize:event:1");

let large = recording("large-normalized");
for (let index = 0; index < 3000; index += 1) large = append(large,
  raw(`large-${index}`, "click"), { role: "button", controlType: "button" });
const started = Date.now();
assert.strictEqual(normalization.normalizeRecording(large).events.length, 3000);
assert.ok(Date.now() - started < 4000, "large normalization regression");

const contentSource = fs.readFileSync("src/recorder/content.js", "utf8");
assert.ok(contentSource.includes("event.composedPath?.()"));
assert.ok(contentSource.includes('type: "dialog-close"'));

console.log("Event normalization tests passed.");
