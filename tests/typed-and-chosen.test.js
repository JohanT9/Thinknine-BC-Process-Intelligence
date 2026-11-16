// When the text typed to find a record is not the start of the record chosen (a word of a name or
// description), the step says both: what was typed and what was chosen. Here a vendor, through
// the whole interpretation with the knowledge packs that describe the step again; an item line
// is covered in presentation-grammar.test.js. No step says "the filtered record".
const assert = require("assert");
const { replay } = require("../scripts/capture-quality/replay");
const grammar = require("../src/document/presentation-grammar");

const second = value => new Date(Date.UTC(2026, 10, 11, 9, 0, 0) + value * 1000).toISOString();
const page = { sourceFrameId: "inner", frameDepth: 1, recordingId: "typed", pageCaption: "Inköpsorder", pageId: "50" };
const typeIn = (base, caption, value, at, interactionId) => ({ ...base, type: "field-change",
  category: "field", role: "combobox", controlType: "input", inputType: "text", ariaHasPopup: "grid",
  fieldName: caption, label: caption, accessibleName: caption, inputSource: "change", value,
  interactionId, timestamp: second(at) });
const choose = (base, number, at, interactionId) => ({ ...base, type: "click", category: "action",
  role: "button", controlType: "a", pointerTarget: true, interactionId,
  label: `Nr, sorterade i Stigande order Välj posten "${number}"`,
  accessibleName: `Nr, sorterade i Stigande order Välj posten "${number}"`, timestamp: second(at) });
const events = [
  typeIn(page, "Leverantörsnamn", "iberic", 1, "inner:vendor"),
  choose(page, "11976", 2, "inner:vendor-row")
].map((event, index) => ({ ...event, sourceEventId: `typed:${index + 1}`, sourceSequence: index + 1 }));
const tasks = replay(events, { documentLanguage: "sv-SE" }).tasks;
const texts = tasks.map(task => task.instruction);
assert.ok(texts.includes("Ange __iberic__ i **Leverantörsnamn** och välj **11976**."), JSON.stringify(texts));
assert.ok(texts.every(value => !/filtrerade/u.test(value)));

// The document says the same in every document language, with the typed text kept as typed.
const vendor = tasks.find(task => /iberic/u.test(task.instruction));
for (const locale of ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"]) {
  const text = grammar.presentationFor(vendor.semanticActionModel || vendor, vendor.instruction, locale).text;
  assert.ok(text.includes("iberic") && text.includes("11976"), `${locale}: ${text}`);
  assert.ok(!/matching|correspondant|passenden|coincidente|matchende|vastaava|samsvarende/u.test(text), text);
}
// Typing the start of the number chosen is simply entering it.
const prefix = replay([typeIn(page, "Leverantörsnamn", "1197", 1, "inner:vendor"),
  choose(page, "11976", 2, "inner:vendor-row")].map((event, index) =>
  ({ ...event, sourceEventId: `prefix:${index + 1}`, sourceSequence: index + 1 })),
{ documentLanguage: "sv-SE" }).tasks;
assert.ok(prefix.every(task => !/1197__/u.test(task.instruction)), JSON.stringify(prefix.map(t => t.instruction)));
// Any lookup field, not only a known one: typing a number and clicking its row in the field's
// list is one step, although the row names only the list's column (Nr), not the field.
const production = { ...page, recordingId: "origin", pageCaption: "Släppt produktionsorder", pageId: "99000831" };
for (const [row, typedValue, chosen] of [
  ['Nr, sorterade i Stigande order Välj posten "3"', "3", "3"],
  ['Nr, sorterade i Stigande order Välj posten "30043"', "300", "30043"],
  ["N°, trié dans l’ordre Croissant Choisir l’enregistrement « 30043 »", "300", "30043"],
  ['Nr., Sortierreihenfolge Aufsteigend Datensatz "30043" auswählen', "300", "30043"]]) {
  const origin = replay([typeIn(production, "Ursprungsnr", typedValue, 1, "inner:origin"),
    choose(production, "", 2, "inner:origin-row")].map((event, index) => ({ ...event,
    ...(index === 1 ? { label: row, accessibleName: row } : {}),
    sourceEventId: `origin:${index + 1}`, sourceSequence: index + 1 })),
  { documentLanguage: "sv-SE" }).tasks.map(task => task.instruction);
  assert.deepStrictEqual(origin, [`Ange __${chosen}__ i **Ursprungsnr**.`], row);
}
// A typed value that is not the start of the record chosen stays two steps: both are kept.
const other = replay([typeIn(production, "Ursprungsnr", "9", 1, "inner:origin"),
  choose(production, "30043", 2, "inner:origin-row")].map((event, index) =>
  ({ ...event, sourceEventId: `other:${index + 1}`, sourceSequence: index + 1 })),
{ documentLanguage: "sv-SE" }).tasks.map(task => task.instruction);
assert.strictEqual(other.length, 2, JSON.stringify(other));
console.log("Typed and chosen tests passed in all document languages.");
