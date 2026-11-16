// An option field in Business Central is a select whose options are numbered: Manuellt is 0 in
// Bokföringsmetod. The recording keeps the option the user chose, by its text, not its number, so
// the document says "Välj Manuellt som värde för Bokföringsmetod" and not "Välj 0 …".
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { replay } = require("../scripts/capture-quality/replay");

const content = fs.readFileSync(path.join(__dirname, "../src/recorder/content.js"), "utf8");
const start = content.indexOf("  function valueOf(element) {");
const end = content.indexOf("  function record(event) {", start);
assert.ok(start > 0 && end > start, "the recorder's value reading is found");

class Element {}
class HTMLInputElement extends Element {}
class HTMLTextAreaElement extends Element {}
class HTMLSelectElement extends Element {
  constructor(options, selectedIndex) {
    super();
    this.options = options;
    this.selectedIndex = selectedIndex;
  }
  get value() { return this.options[this.selectedIndex]?.value ?? ""; }
  get selectedOptions() { return this.selectedIndex >= 0 ? [this.options[this.selectedIndex]] : []; }
  getAttribute() { return null; }
}
const sandbox = { HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement, globalThis: {},
  clean: value => String(value || "").replace(/\s+/g, " ").trim() };
vm.runInNewContext(`${content.slice(start, end)}; globalThis.valueOf = valueOf;`, sandbox);
const valueOf = sandbox.globalThis.valueOf;

const flushing = ["Manuellt", "Framåt", "Bakåt", "Plock + framåt", "Plock + bakåt", "Plock + manuellt"]
  .map((textContent, index) => ({ value: String(index), textContent: `  ${textContent} ` }));
assert.strictEqual(valueOf(new HTMLSelectElement(flushing, 0)), "Manuellt", "the chosen option's text");
assert.strictEqual(valueOf(new HTMLSelectElement(flushing, 2)), "Bakåt");
assert.strictEqual(valueOf(new HTMLSelectElement([{ value: "7", textContent: " " }], 0)), "7",
  "an option without text keeps its value");
assert.strictEqual(valueOf(new HTMLSelectElement([], -1)), "");

// The document names the option chosen.
const at = seconds => new Date(Date.UTC(2026, 10, 16, 9, 0, 0) + seconds * 1000).toISOString();
const tasks = replay([{ pageCaption: "Prod.order komponenter", pageId: "99000818",
  type: "field-change", category: "field", role: "combobox", controlType: "select",
  label: "Bokföringsmetod", fieldName: "Bokföringsmetod", accessibleName: "Bokföringsmetod",
  value: valueOf(new HTMLSelectElement(flushing, 0)), inputSource: "change",
  interactionId: "frame:flushing", timestamp: at(1), sourceEventId: "option:1", sourceSequence: 1 }],
{ documentLanguage: "sv-SE" }).tasks.map(task => task.instruction);
assert.ok(tasks.some(text => /Manuellt/u.test(text) && /Bokföringsmetod/u.test(text)), JSON.stringify(tasks));
assert.ok(tasks.every(text => !/\b0\b/u.test(text)), JSON.stringify(tasks));

// The click that opens the option field's list is part of choosing; it is not a step of its own.
const lineRow = [{ caption: "", heuristic: false, identity: "", type: "repeater" },
  { caption: "", heuristic: false, identity: "", type: "row" }];
const field = { pageCaption: "Prod.order komponenter", pageId: "99000818", uiHierarchy: lineRow,
  role: "combobox", controlType: "select", label: "Bokföringsmetod", fieldName: "Bokföringsmetod",
  accessibleName: "Bokföringsmetod" };
const numbered = events => events.map((event, index) =>
  ({ ...event, sourceEventId: `open:${index + 1}`, sourceSequence: index + 1 }));
const chosenAfterOpen = replay(numbered([
  { ...field, type: "click", category: "interaction", pointerTarget: true, interactionId: "frame:open", timestamp: at(2) },
  { ...field, type: "field-change", category: "field", value: "Manuellt", inputSource: "change",
    interactionId: "frame:choose", timestamp: at(4) }]), { documentLanguage: "sv-SE" }).tasks.map(task => task.instruction);
assert.deepStrictEqual(chosenAfterOpen, ["Välj **Manuellt** i **Bokföringsmetod**."], JSON.stringify(chosenAfterOpen));
// A button that happens to have the field's name is still its own step.
const button = replay(numbered([
  { ...field, role: "button", controlType: "button", type: "click", category: "action", pointerTarget: true,
    interactionId: "frame:button", timestamp: at(2) },
  { ...field, type: "field-change", category: "field", value: "Manuellt", inputSource: "change",
    interactionId: "frame:choose", timestamp: at(4) }]), { documentLanguage: "sv-SE" }).tasks.map(task => task.instruction);
assert.strictEqual(button.length, 2, JSON.stringify(button));

console.log("Option field value tests passed.");
