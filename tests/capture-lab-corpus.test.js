const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Events captured by the real content script (scripts/capture-lab) for nine user actions on a
// Business Central-shaped sales order. Each action must become exactly one correct step.
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const fixture = read("tests/fixtures/capture-lab/sales-order-typeahead.json");
const manifest = read("src/knowledge-packs/index.json");
const knowledgePacks = manifest.packs.filter(pack => pack.enabled)
  .map(pack => read(`src/${pack.file}`));

// Capture: text fields carry no checkbox state, a suggestion choice continues the field edit
// and the dialog button continues the action that opened the dialog.
const events = fixture.events;
for (const event of events.filter(item => item.type === "field-change")) {
  assert.strictEqual(event.checked, undefined, `${event.fieldName} is not a checkbox`);
  assert.strictEqual(event.inputType, "text");
}
const customerEdit = events.find(item => item.type === "field-change" &&
  item.fieldName === "Customer Name" && item.inputSource === "change");
const suggestion = events.find(item => item.type === "click" && item.label === "Adatum Corporation");
assert.strictEqual(suggestion.interactionId, customerEdit.interactionId);
const post = events.find(item => item.type === "click" && item.label === "Post...");
const ok = events.find(item => item.type === "click" && item.label === "OK");
assert.strictEqual(ok.interactionId, post.interactionId);

let recording = canonical.create({ id: "capture-lab", name: "Capture lab" });
const sourceEvents = [];
events.forEach((raw, index) => {
  recording = canonical.addEvent(recording, raw,
    identify.identify(raw, { eventId: `capture-lab:event:${index}` }));
  sourceEvents.push({ ...raw, eventNo: index + 1,
    canonicalSourceEventId: recording.events.at(-1).id });
});
const normalized = normalization.normalizeRecording(recording);
const grouped = grouping.group(normalized);
assert.strictEqual(grouped.groups.length, fixture.userActions.length,
  "one step group per user action");

const result = pipeline.interpret({ session: { id: "capture-lab", name: "Capture lab",
  settings: { documentLanguage: "sv-SE" } }, events: sourceEvents,
normalizedEvents: normalized.events, stepGroups: grouped.groups,
supportingEvents: grouped.supportingEvents, groupingDiagnostics: grouped.diagnostics,
imagePaths: {}, knowledgePacks });
const steps = result.businessTasks.map(task => task.instruction);
assert.deepStrictEqual(steps, [
  "Börja skapa en ny post genom att välja **New** på sidan **Sales Orders - Dynamics 365 Business Central**.",
  "Välj **Adatum Corporation** i **Customer Name**.",
  "Ange __PO-1001__ i **External Document No.**.",
  "Ange __2026-10-27__ i **Posting Date**.",
  "Välj artikel **1896-S**.",
  "Ange __5__ i **Quantity**.",
  "Ange __6__ i **Quantity**.",
  "Välj **Release** på sidan **Sales Order - Dynamics 365 Business Central**.",
  "Välj **Post...** på sidan **Sales Order - Dynamics 365 Business Central**."
]);
assert(!steps.some(step => /Ada\b|Aktivera/u.test(step)),
  "no typed fragment and no checkbox step for a text field");

console.log(`Capture lab corpus passed (${fixture.userActions.length} user actions, ${steps.length} steps).`);
