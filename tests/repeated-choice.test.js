// Business Central can report a click on a row in a list twice: the same row with the same
// caption, a moment apart. That is one choice and one step; the repeat keeps its events as
// evidence. Choosing a row again later, or another row, stays its own step.
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

// The click reported again 0.14 seconds later, at no position, is the same choice.
const once = steps([type("isbergss", 0), choose("30043", 0.02, { clientX: 686, clientY: 891 })]);
const twice = steps([type("isbergss", 0), choose("30043", 0.02, { clientX: 686, clientY: 891 }),
  choose("30043", 0.16, { clientX: 0, clientY: 0 })]);
assert.deepStrictEqual(twice.map(task => task.instruction), once.map(task => task.instruction),
  "a repeated click on the same row adds no step");
assert.strictEqual(twice.filter(task => /30043/u.test(task.instruction)).length, 1);

// Another row, or the same row chosen again later, is a step of its own.
const other = steps([type("isbergss", 0), choose("30043", 0.02), choose("30044", 0.16)]);
assert.ok(other.length > once.length, "choosing another row is kept");
const later = steps([type("isbergss", 0), choose("30043", 0.02), choose("30043", 5)]);
assert.ok(later.length > once.length, "choosing the row again later is kept");
console.log("Repeated choice tests passed.");
