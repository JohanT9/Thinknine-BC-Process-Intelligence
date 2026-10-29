const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Events captured by the real content script (scripts/capture-lab) on Business Central-shaped
// pages, used with the mouse and from the keyboard. Each user action must become exactly one
// correct step, and steps that only move the cursor or close a page none.
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const documentLanguage = require("../src/document/document-language");
const manifest = read("src/knowledge-packs/index.json");
const knowledgePacks = manifest.packs.filter(pack => pack.enabled)
  .map(pack => read(`src/${pack.file}`));
const locales = require("../src/engine/language-registry").supported("document")
  .map(item => item.locale).filter(locale => locale !== "sv-SE");

function prepare(events) {
  let recording = canonical.create({ id: "capture-lab", name: "Capture lab" });
  const sourceEvents = [];
  events.forEach((raw, index) => {
    recording = canonical.addEvent(recording, raw,
      identify.identify(raw, { eventId: `capture-lab:event:${index}` }));
    sourceEvents.push({ ...raw, eventNo: index + 1,
      canonicalSourceEventId: recording.events.at(-1).id });
  });
  const normalized = normalization.normalizeRecording(recording);
  return { sourceEvents, normalized, grouped: grouping.group(normalized) };
}

function interpret({ sourceEvents, normalized, grouped }, locale) {
  return pipeline.interpret({ session: { id: "capture-lab", name: "Capture lab",
    settings: { documentLanguage: locale } }, events: sourceEvents,
  normalizedEvents: normalized.events, stepGroups: grouped.groups,
  supportingEvents: grouped.supportingEvents, groupingDiagnostics: grouped.diagnostics,
  imagePaths: {}, knowledgePacks }).businessTasks.map(task => task.instruction);
}

// In every other document language no Swedish template word remains; captured values stay.
function assertLocalized(prepared, steps) {
  for (const locale of locales) {
    // A new document is interpreted in its document language and projected with translation.
    const localized = interpret(prepared, locale);
    assert.strictEqual(localized.length, steps.length, locale);
    for (const step of localized) {
      const translated = documentLanguage.translateInstruction(step, locale);
      // Danish and Norwegian also say "posten" and "siden"; their Swedish forms are checked.
      assert(!/\b(?:Välj|Ange|Börja|Sök|Tryck|öppna|listan|artikel|kund|sidan|genom att|filtrerade)\b/u
        .test(translated), `${locale}: ${translated}`);
      for (const value of step.match(/(?:\*\*|__)[^*_]+(?:\*\*|__)/gu) || []) {
        assert(translated.includes(value), `${locale} keeps ${value}`);
      }
    }
  }
}

// Mouse and typing on a sales order.
const fixture = read("tests/fixtures/capture-lab/sales-order-typeahead.json");
const events = fixture.events;
// Capture: text fields carry no checkbox state, a suggestion choice continues the field edit
// and the dialog button continues the action that opened the dialog.
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
// Closing a dialog joins the action that opened it, whatever the caption language.
const statistics = events.find(item => item.type === "click" && item.label === "Statistics");
const close = events.find(item => item.type === "click" && item.label === "Schließen");
assert.strictEqual(close.interactionId, statistics.interactionId);
// The date the client shows after validation is recorded in the edit that typed it; a later
// edit of a re-rendered line is never taken for the validation of an earlier one.
const postingDate = events.find(item => item.inputSource === "validated" &&
  item.fieldName === "Posting Date");
assert.deepStrictEqual([postingDate.value, postingDate.enteredValue], ["27.10.2026", "2026-10-27"]);
assert.strictEqual(postingDate.interactionId, events.find(item => item.inputSource === "change" &&
  item.fieldName === "Posting Date").interactionId);
assert(!events.some(item => item.inputSource === "validated" && item.fieldName === "Quantity"));

const prepared = prepare(events);
assert.strictEqual(prepared.grouped.groups.length, fixture.userActions.length,
  "one step group per user action");
const steps = interpret(prepared, "sv-SE");
assert.deepStrictEqual(steps, [
  "Börja skapa en ny post genom att välja **New** på sidan **Sales Orders - Dynamics 365 Business Central**.",
  "Välj **Adatum Corporation** i **Customer Name**.",
  "Ange __PO-1001__ i **External Document No.**.",
  "Ange __27.10.2026__ i **Posting Date**.",
  "Välj artikel **1896-S**.",
  "Ange __5__ i **Quantity**.",
  "Ange __6__ i **Quantity**.",
  "Välj **Release** på sidan **Sales Order - Dynamics 365 Business Central**.",
  "Välj **Statistics** på sidan **Sales Order - Dynamics 365 Business Central**.",
  "Välj **Post...** på sidan **Sales Order - Dynamics 365 Business Central**."
]);
assert(!steps.some(step => /Ada\b|Aktivera/u.test(step)),
  "no typed fragment and no checkbox step for a text field");
assertLocalized(prepared, steps);

// The same client used from the keyboard.
const keyboard = read("tests/fixtures/capture-lab/keyboard-navigation.json");
const keys = keyboard.events;
const byLabel = (type, label) => keys.find(item => item.type === type &&
  (item.label === label || item.accessibleName === label));
// A shortcut is recorded as the action that declares it and owns what it opens.
const deleteLine = byLabel("key", "Delete Line");
assert.deepStrictEqual([deleteLine.shortcut, deleteLine.category], ["Ctrl+Delete", "action"]);
const postKey = byLabel("key", "Post...");
assert.strictEqual(postKey.shortcut, "F9");
const postOk = keys.slice(keys.indexOf(postKey)).find(item => item.type === "click" &&
  item.label === "OK");
assert.strictEqual(postOk.interactionId, postKey.interactionId);
assert.strictEqual(byLabel("key", "Search").shortcut, "Alt+Q");
// Enter on a dialog button is one click, marked as made from the keyboard, not a key and a click.
const yes = keys.filter(item => item.label === "Yes" || item.accessibleName === "Yes");
assert.deepStrictEqual(yes.map(item => [item.type, item.inputSource, item.key]),
  [["click", "keyboard", "Enter"]]);
assert.strictEqual(yes[0].interactionId, deleteLine.interactionId);
// Enter chooses the highlighted Tell Me result after the typed text, and opens a list row.
const searchText = keys.findIndex(item => item.inputSource === "input" &&
  item.value === "sales ord");
const result = keys.findIndex(item => item.type === "key" && item.selectedCaption === "Sales Orders");
assert(searchText >= 0 && result > searchText, "the search text comes before the result");
assert.strictEqual(byLabel("key", "101003 School of Fine Art")?.selectedCaption, "101003");
// A shortcut no control declares stays a key of its own action, with evidence of which
// controls mention its key; F7 alone is declared, Shift+F7 is not.
const undeclared = keys.find(item => item.shortcut === "Shift+F7");
assert.strictEqual(undeclared.category, "interaction");
assert.notStrictEqual(undeclared.interactionId, deleteLine.interactionId);
assert.deepStrictEqual(undeclared.shortcutEvidence.samples.map(item => item.title), ["Statistics (F7)"]);
assert(undeclared.shortcutEvidence.declaredShortcuts >= 2);
// Arrow keys only move the selection, and a space in a text field is typing.
assert(!keys.some(item => /^Arrow/u.test(item.key || "")));
assert(!keys.some(item => item.type === "key" && item.key === " "));
// Values the client reformats are recorded as shown, with the typed text beside them.
for (const [field, value, entered] of [["Order Date", "28.10.2026", "t"],
  ["Unit Price Excl. VAT", "1,200.00", "1200"]]) {
  const validated = keys.find(item => item.inputSource === "validated" && item.fieldName === field);
  assert.deepStrictEqual([validated?.value, validated?.enteredValue], [value, entered], field);
}

const keyboardPrepared = prepare(keys);
const keyboardSteps = interpret(keyboardPrepared, "sv-SE");
assert.deepStrictEqual(keyboardSteps, [
  "Sök efter __sales ord__ och öppna listan **Sales Orders**.",
  "Välj posten **101003** på sidan **Sales Order 101003 - Dynamics 365 Business Central**.",
  "Ange __28.10.2026__ i **Order Date**.",
  "Ange __1,200.00__ i **Unit Price Excl. VAT**.",
  "Välj **Balance (LCY)** på sidan **Sales Order 101003 - Dynamics 365 Business Central**.",
  "Välj **Delete Line** på sidan **Sales Order 101003 - Dynamics 365 Business Central**.",
  "Tryck på **Shift+F7**.",
  "Välj **Post...** på sidan **Sales Order 101003 - Dynamics 365 Business Central**."
]);
assertLocalized(keyboardPrepared, keyboardSteps);
// A refusal is the result of the shortcut that caused it, and a completion of Post.
const keyboardResults = pipeline.interpret({ session: { id: "capture-lab", name: "Capture lab",
  settings: { documentLanguage: "sv-SE" } }, events: keyboardPrepared.sourceEvents,
normalizedEvents: keyboardPrepared.normalized.events, stepGroups: keyboardPrepared.grouped.groups,
supportingEvents: keyboardPrepared.grouped.supportingEvents,
groupingDiagnostics: keyboardPrepared.grouped.diagnostics, imagePaths: {}, knowledgePacks })
  .businessTasks.map(task => task.resultVerification?.summary || "");
assert.match(keyboardResults.at(-2), /^Business Central visade meddelandet “Status must be equal to 'Open'/u);
assert.strictEqual(keyboardResults.at(-1), "Business Central bekräftade att “The order was posted”.");

console.log(`Capture lab corpus passed (${fixture.userActions.length + keyboard.userActions.length} ` +
  `user actions, ${steps.length + keyboardSteps.length} steps).`);
