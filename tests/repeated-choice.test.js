// Business Central can report a click on a row in a list twice: the same row with the same
// caption, a moment apart. That is one choice and one step; the repeat keeps its events as
// evidence. A click on another row that Business Central did not answer chose nothing; choosing
// a row again later, or another row after the first was saved, stays its own step.
const assert = require("assert");
const { replay } = require("../scripts/capture-quality/replay");

const rows = JSON.stringify([{ caption: "", heuristic: false, identity: "", type: "repeater" }]);
const line = { pageCaption: "Inköpsorder", pageId: "50", uiHierarchy: rows,
  rowTypeContext: JSON.stringify({ caption: "Typ", rowId: "1", schemaVersion: 1,
    source: "same-row-type", value: "Artikel" }) };
const at = seconds => new Date(Date.UTC(2026, 10, 11, 9, 0, 0) + seconds * 1000).toISOString();
// Each click is its own interaction on a row element Business Central has drawn again.
let clicks = 0;
const choose = (number, seconds, extra = {}) => ({ ...line, type: "click", role: "button",
  elementId: `row-${++clicks}`, interactionId: `frame:click-${clicks}`, pointerTarget: true,
  category: "action", controlType: "a", label: `Nr, sorterade i Stigande order Välj posten "${number}"`,
  accessibleName: `Nr, sorterade i Stigande order Välj posten "${number}"`, timestamp: at(seconds), ...extra });
const type = (value, seconds) => ({ ...line, type: "field-change", role: "combobox", category: "field",
  controlType: "input", inputType: "text", fieldName: "Sortera efter Nr", label: "Sortera efter Nr",
  accessibleName: "Sortera efter Nr", inputSource: "change", value, timestamp: at(seconds) });
const steps = events => replay(events, { documentLanguage: "sv-SE" }).tasks;
// Business Central's answer to a click: the line is being saved.
const saved = (seconds, interaction) => ({ ...line, type: "status-message", category: "result",
  controlType: "div", role: "div", label: "Sparar ...", accessibleName: "Sparar ...",
  interactionId: interaction, timestamp: at(seconds) });

// The click reported again 0.14 seconds later, at no position, is the same choice.
const once = steps([type("isbergss", 0), choose("30043", 0.02, { clientX: 686, clientY: 891 })]);
const twice = steps([type("isbergss", 0), choose("30043", 0.02, { clientX: 686, clientY: 891 }),
  choose("30043", 0.16, { clientX: 0, clientY: 0 })]);
assert.deepStrictEqual(twice.map(task => task.instruction), once.map(task => task.instruction),
  "a repeated click on the same row adds no step");
assert.strictEqual(twice.filter(task => /30043/u.test(task.instruction)).length, 1);

// A click on another row while Business Central has not answered the first chose nothing yet:
// the list was still being drawn. The row chosen last is the one step.
const redrawn = steps([type("isbergss", 0), choose("30044", 0.02), choose("30043", 0.16)]);
assert.deepStrictEqual(redrawn.map(task => task.instruction), once.map(task => task.instruction),
  "an unanswered click on another row adds no step");
// The same row clicked again 1.7 seconds later, after the list was drawn again, is one choice
// too: the first click was not answered, the second was saved. The step keeps the result.
const resaved = steps([type("isbergss", 0), choose("30043", 0.02, { clientY: 1016 }),
  choose("30043", 1.72, { clientY: 995 }), saved(1.73, `frame:click-${clicks}`)]);
assert.strictEqual(resaved.filter(task => /30043/u.test(task.instruction)).length, 1,
  "an unanswered click on the same row adds no step");
// Later clients name the line's number field "Nr" instead of its sort button "Sortera efter Nr".
// Typing in it and choosing the item is one step, as with the sort button.
// The events are those recorded on a purchase order line: "isber" typed in Nr, the item clicked
// twice while the list was drawn again (the first click unanswered) and the number the field
// then shows. Before, that was three steps: "Välj artikel isber" and "Välj posten 30043" twice.
const searchEvents = require("./fixtures/repeated-choice/item-search-in-number-field.json");
assert.deepStrictEqual(steps(searchEvents).map(task => task.instruction),
  ["Ange __isber__ i **Nr** och välj **30043**."], "typing in Nr and choosing the item is one step");
// A number typed in is still named as the item chosen, not as a search.
const typedNumber = steps(searchEvents.map(event => event.value === "isber"
  ? { ...event, value: "30043" } : event));
assert.ok(typedNumber.every(task => !/__30043__ i \*\*Nr\*\* och välj/u.test(task.instruction)),
  "a typed item number is not described as a search");
// Another row chosen after Business Central answered the first, or the same row chosen again
// later, is a step of its own.
const other = steps([type("isbergss", 0), choose("30043", 0.02), saved(0.1, `frame:click-${clicks}`),
  choose("30044", 0.16)]);
assert.ok(other.length > once.length, "choosing another row after the first was saved is kept");
const later = steps([type("isbergss", 0), choose("30043", 0.02), choose("30043", 5)]);
assert.ok(later.length > once.length, "choosing the row again later is kept");
console.log("Repeated choice tests passed.");
