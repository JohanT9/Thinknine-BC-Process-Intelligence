// A recording is turned into a Page Scripting file: the AL identity read in the page
// (recorder/al-identity-capture.js) is kept on each recorded event, and
// document/page-script-export.js writes the steps Page Scripting replays. The expected file is
// the reduced purchase order file that replayed 19 of 19 steps in Business Central 29.
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const exporter = require("../src/document/page-script-export");

const order = [{ page: "Purchase Order" }];
const lines = [...order, { part: "PurchLines" }, { page: "Purchase Order Subform" }, { repeater: "Control1" }];
const id = (kind, rest) => ({ v: 1, kind, ...rest });
let n = 0;
const at = () => new Date(Date.UTC(2026, 10, 13, 10, 0, n)).toISOString();
const click = (alIdentity, label) => ({ type: "click", eventNo: ++n, timestamp: at(), label, alIdentity });
const change = (path, field, value, extra = {}) => ({ type: "field-change", eventNo: ++n, timestamp: at(),
  fieldName: field, value, inputSource: "change", alIdentity: id("field", { path, field, caption: field }), ...extra });
const focus = (path, field) => ({ type: "focus", eventNo: ++n, timestamp: at(),
  alIdentity: id("field", { path, field }) });
const lookupRow = rowIndex => id("row", { path: [{ page: "Vendor Lookup" }, { repeater: "Control1" }], rowIndex });

const events = [
  click(id("action", { path: [{ page: "Purchase Order List" }], action: "Control_New", operation: "New", caption: "Ny" }), "Ny"),
  { type: "navigation", eventNo: ++n, timestamp: at() },
  focus(order, "Buy-from Vendor No."),
  change(order, "Buy-from Vendor No.", "iber", { inputSource: "input" }),
  change(order, "Buy-from Vendor No.", "iberi", { inputSource: "input" }),
  click(lookupRow(0), "IBERIA"),
  change(order, "Buy-from Vendor No.", "40000", { inputSource: "validated" }),
  change(order, "Buy-from Vendor No.", "40000", { inputSource: "focusout" }),
  change(lines, "No.", "30043", { inputSource: "input" }),
  click(lookupRow(0), "30043"),
  change(lines, "Quantity", "500"),
  click(id("system", { path: lines, operation: "New", caption: "Ny rad" }), "Ny rad"),
  focus(lines, "No."),
  click(lookupRow(4), "1936-S"),
  change(lines, "Quantity", "50"),
  change(lines, "Direct Unit Cost", "[belopp]"),
  click(id("system", { path: lines, operation: "Delete", caption: "Ta bort rad" }), "Ta bort rad"),
  click(id("dialog", { page: null, automationId: "00000000-0000-0000-0400-0000836bd2d2", caption: "Bekräfta",
    operation: "Yes", button: "Ja" }), "Ja"),
  click(id("action", { path: [...order, { part: "PurchLines" }, { page: "Purchase Order Subform" }],
    action: "AppliedPurchasePriceAndDiscountFDW", caption: "Tillämpat inköpspris och rabatt" }), "Tillämpat inköpspris och rabatt"),
  click(id("dialog", { page: "AppldPurchPriceAndDiscountFDW", operation: "Cancel", caption: "Tillämpat inköpspris och rabatt" }), "Stäng"),
  click(id("menu", { path: order, action: "Category_Category5" }), "Släpp"),
  click(id("action", { path: order, action: "Release", caption: "Släpp" }), "Släpp"),
  { raw: click(id("action", { path: order, action: "Reopen", caption: "Öppna igen" }), "Öppna igen") },
  click(null, "Något utan namn"),
  click(id("system", { path: lines, operation: "", caption: "Okänd" }), "Okänd")
];

const result = exporter.build({ name: "IO systemknappar", description: "BC Process Studio", events });
assert.strictEqual(result.startPage, "Purchase Order List");
assert.strictEqual(result.recordedIdentity, true);
assert.deepStrictEqual(result.steps.map(step => [step.type, step.invokeType || "",
  step.target.map(entry => Object.values(entry)[0]).join(" › ")]), [
  ["navigate", "", "Purchase Order List"],
  ["invoke", "New", "Purchase Order List › Control_New"],
  ["input", "", "Purchase Order › Buy-from Vendor No."],
  ["input", "", "Purchase Order › Buy-from Vendor No."],
  ["invoke", "", "lookup:Buy-from Vendor No. › repeater"],
  ["input", "", "Purchase Order › PurchLines › Purchase Order Subform › Control1 › No."],
  ["input", "", "Purchase Order › PurchLines › Purchase Order Subform › Control1 › No."],
  ["invoke", "", "lookup:No. › repeater"],
  ["input", "", "Purchase Order › PurchLines › Purchase Order Subform › Control1 › Quantity"],
  ["invoke", "New", "Purchase Order › PurchLines › Purchase Order Subform"],
  ["input", "", "Purchase Order › PurchLines › Purchase Order Subform › Control1 › No."],
  ["set-current-row", "", "lookup:No. › repeater"],
  ["invoke", "", "lookup:No. › repeater"],
  ["input", "", "Purchase Order › PurchLines › Purchase Order Subform › Control1 › Quantity"],
  ["invoke", "Delete", "Purchase Order › PurchLines › Purchase Order Subform › Control1"],
  ["invoke", "Yes", ""],
  ["invoke", "", "Purchase Order › PurchLines › Purchase Order Subform › AppliedPurchasePriceAndDiscountFDW"],
  ["invoke", "Cancel", "AppldPurchPriceAndDiscountFDW"],
  ["invoke", "", "Purchase Order › Release"],
  ["invoke", "", "Purchase Order › Reopen"]
], "the same steps as the reduced file that replayed in Business Central, in order");
assert.strictEqual(result.stepCount, 19);

const inputs = result.steps.filter(step => step.type === "input");
assert.deepStrictEqual(inputs.map(step => [step.value, Boolean(step.isFilterAsYouType)]),
  [["", true], ["iberi", true], ["", true], ["30043", true], ["500", false], ["", true], ["50", false]],
  "a lookup opens with an empty filter, then filters with what was typed; the chosen record shown afterwards is not typed again");
assert.deepStrictEqual(result.steps.find(step => step.type === "set-current-row").targetRecord, { relative: 4 });
assert.deepStrictEqual(result.steps.find(step => step.invokeType === "Yes").target,
  [{ page: null, automationId: "00000000-0000-0000-0400-0000836bd2d2", caption: "Bekräfta" }]);
assert.deepStrictEqual(result.skipped.map(item => [item.label, item.reason]), [
  ["Direct Unit Cost", "masked"], ["Något utan namn", "noIdentity"], ["Okänd", "systemAction"]],
  "masked values, unnamed clicks and unknown system actions are reported, not guessed");

// As Business Central reports them: its own line actions name only a fixed id, Delete is chosen
// from a line's own menu after clicking the line, and a lookup row click may come twice.
{
  const head = [{ page: "Purchase Order" }, { part: "PurchLines" }, { page: "Purchase Order Subform" }];
  const system = (guid, caption) => id("system", { path: head, operation: "", caption,
    properties: { controlIdentifier: guid, name: guid } });
  const noLookup = [{ page: "lookup:No." }, { repeater: "repeater" }];
  let first;
  const real = exporter.build({ events: [
    change(lines, "Quantity", "5000"),
    click(system("97614525-6ed6-4ed5-9262-c6e5a8d4e6a5", "Ny rad"), "Ny rad"),
    focus(lines, "No."),
    (first = click(id("row", { path: [{ page: "lookup:No." }], rowIndex: 2, field: "repeater" }), "1936-S")),
    { ...click(id("row", { path: noLookup, rowIndex: 2 }), "1936-S"), timestamp: first.timestamp },
    click(id("row", { path: lines, rowIndex: 0 }), "Visa fler alternativ"),
    click(system("{7A6412B6-F244-4670-9259-0123456789ab}", "Ta bort rad"), "Ta bort rad"),
    click(id("row", { path: lines, rowIndex: 1 }), "Rad"),
    click(id("action", { path: order, action: "Release", caption: "Släpp" }), "Släpp")
  ] });
  assert.deepStrictEqual(real.steps.slice(1).map(step => [step.type, step.invokeType || "",
    step.target.map(entry => Object.values(entry)[0]).join(" › ")]), [
    ["input", "", "Purchase Order › PurchLines › Purchase Order Subform › Control1 › Quantity"],
    ["invoke", "New", "Purchase Order › PurchLines › Purchase Order Subform"],
    ["input", "", "Purchase Order › PurchLines › Purchase Order Subform › Control1 › No."],
    ["set-current-row", "", "lookup:No. › repeater"],
    ["invoke", "", "lookup:No. › repeater"],
    ["invoke", "Delete", "Purchase Order › PurchLines › Purchase Order Subform › Control1"],
    ["invoke", "", "Purchase Order › Release"]
  ], "Business Central's own line actions by their id, Delete on the line, one lookup choice");
  assert.deepStrictEqual(real.skipped.map(item => [item.label, item.reason]), [["Rad", "rowSelection"]],
    "the click that opened the line menu belongs to Delete; a line click without a step is reported");
  assert.deepStrictEqual(exporter.SYSTEM_ACTIONS.map(([, operation]) => operation), ["New", "Delete"]);
}

// The record chosen in a lookup is entered as its value: a search text and a row position depend
// on the data. Text typed and then erased is not a step.
{
  const vendorLookup = [{ page: "lookup:Buy-from Vendor Name" }, { repeater: "repeater" }];
  const itemLookup = [{ page: "lookup:No." }, { repeater: "repeater" }];
  const chosen = exporter.build({ locale: "sv-SE", events: [
    click(id("action", { path: [{ page: "Purchase Order List" }], action: "Control_New", operation: "New", caption: "Ny" }), "Ny"),
    change(order, "No.", "iber", { inputSource: "input", previousValue: "" }),
    change(order, "No.", "", { inputSource: "input", previousValue: "" }),
    change(order, "Buy-from Vendor Name", "iber", { inputSource: "input" }),
    { ...click(id("row", { path: vendorLookup, rowIndex: 3 }), "x"),
      accessibleName: "Nr, sorterade i Stigande order Välj posten \"11976\"" },
    change(order, "Buy-from Vendor Name", "Greenfood Iberica", { inputSource: "validated" }),
    change(lines, "No.", "isber", { inputSource: "input" }),
    click(id("row", { path: itemLookup, rowIndex: 15, value: "1936-S" }), "1936-S"),
    { ...click(id("row", { path: itemLookup, rowIndex: 15, value: "1936-S" }), "1936-S"), timestamp: new Date(Date.parse(at()) + 3000).toISOString() },
    click(id("row", { path: lines, field: "No.", rowIndex: 0 }), "Välj ett värde för Nr"),
    focus(lines, "Quantity"),
    focus(order, "Buy-from Vendor No."),
    { ...click(id("row", { path: [{ page: "lookup:Buy-from Vendor No." }, { repeater: "repeater" }], rowIndex: 0 }), "10000"),
      role: "gridcell" },
    change(lines, "No.", "x", { inputSource: "input" }),
    { ...click(id("row", { path: itemLookup, rowIndex: 0 }), "x"), accessibleName: "Choisir l’enregistrement « 70000 »" }
  ] });
  assert.deepStrictEqual(chosen.steps.filter(step => step.type !== "navigate").map(step => [step.type,
    step.target.at(-1).field || step.target.at(-1).action || "", step.value ?? "", Boolean(step.isFilterAsYouType)]), [
    ["invoke", "Control_New", "", false],
    ["input", "Buy-from Vendor Name", "11976", false],
    ["input", "No.", "1936-S", false],
    ["input", "Buy-from Vendor No.", "10000", false],
    ["input", "No.", "70000", false]
  ], "the chosen record's value, in the field the lookup opened from; no search text, row or erased text");
  assert.strictEqual(chosen.steps[2].description, "Mata in <value>11976</value> i <caption>Buy-from Vendor Name</caption>");
}

// A question whose cause is missing from the file is not answered: replay would stop there.
{
  const ask = exporter.build({ events: [
    change(lines, "Quantity", "5"),
    { ...click(null, "Ta bort rad"), role: "menuitem" },
    click(id("dialog", { page: null, automationId: "00000000-0000-0000-0400-0000836bd2d2", caption: "Bekräfta",
      operation: "Yes", button: "Ja" }), "Ja"),
    click(id("action", { path: order, action: "Release", caption: "Släpp" }), "Släpp"),
    { ...click(null, "Vill du släppa?"), role: "" },
    click(id("dialog", { page: null, automationId: "00000000-0000-0000-0400-0000836bd2d2", caption: "Bekräfta",
      operation: "Yes", button: "Ja" }), "Ja")
  ] });
  assert.deepStrictEqual(ask.steps.slice(1).map(step => step.invokeType || step.target.at(-1).action || step.type),
    ["input", "Release", "Yes"], "the answer to a question from a missing step is left out; the next one is kept");
  assert.deepStrictEqual(ask.skipped.map(item => [item.label, item.reason]),
    [["Ta bort rad", "noIdentity"], ["Ja", "withoutCause"], ["Vill du släppa?", "noIdentity"]],
    "a click on the question text does not take away the answer");
}

// A page the test opened and closed with its ✕ (an icon glyph, no text) is closed with Cancel.
{
  const subform = [...order, { part: "PurchLines" }, { page: "Purchase Order Subform" }];
  const closed = exporter.build({ locale: "sv-SE", events: [
    change(lines, "Quantity", "5"),
    click(id("action", { path: subform, action: "AppliedPurchasePriceAndDiscountFDW", caption: "Tillämpat inköpspris och rabatt" }),
      "Tillämpat inköpspris och rabatt"),
    click(id("action", { path: [{ page: "AppldPurchPriceAndDiscountFDW" }], action: "Manual Price", caption: "Manuellt pris..." }), "Manuellt pris..."),
    click(id("dialog", { page: "ChangeApplPurchDirUnitCostFDW", operation: "OK", caption: "Ändra" }), "OK"),
    { type: "dialog-close", eventNo: ++n, timestamp: at(), alControlPath: ["ChangeApplPurchDirUnitCostFDW"] },
    { type: "click", eventNo: ++n, timestamp: at(), label: "", role: "button", alControlPath: ["AppldPurchPriceAndDiscountFDW"] },
    { type: "dialog-close", eventNo: ++n, timestamp: at(), alControlPath: ["AppldPurchPriceAndDiscountFDW"] },
    { type: "dialog-close", eventNo: ++n, timestamp: at(), alControlPath: ["PageSearchForm"] },
    click(id("action", { path: order, action: "Release", caption: "Släpp" }), "Släpp")
  ] });
  assert.deepStrictEqual(closed.steps.slice(-3).map(step => [step.invokeType || step.target.at(-1).action,
    step.target.map(entry => Object.values(entry)[0]).join(" › ")]), [
    ["LookupOk", "ChangeApplPurchDirUnitCostFDW"], ["Cancel", "AppldPurchPriceAndDiscountFDW"], ["Release", "Purchase Order › Release"]]);
  assert.strictEqual(closed.steps.at(-3).description,
    "Anropa <operation>Sökning OK</operation> på <caption>Ändra</caption>", "as Page Scripting writes it");
  assert.strictEqual(closed.steps.at(-2).description,
    "Anropa <operation>Avsluta och stäng</operation> på <caption>Tillämpat inköpspris och rabatt</caption>");
  assert.deepStrictEqual(closed.skipped, [], "the ✕ is the close step; a page the test never used is not closed");
}

// A value the recording masks is entered as typed, from typedValue.
{
  const typed = exporter.build({ events: [
    change(lines, "Direct Unit Cost", "[belopp]", { previousValue: "[belopp]", typedValue: "120" }),
    change(lines, "Line Discount %", "[belopp]", { previousValue: "[belopp]" })
  ] });
  assert.deepStrictEqual(typed.steps.filter(step => step.type === "input").map(step => step.value), ["120"]);
  assert.deepStrictEqual(typed.skipped, []);
}

// The YAML reads as Page Scripting writes it.
const yaml = result.content;
const has = text => { if (!yaml.includes(text)) throw new Error(`The file lacks:
${text}
--- file:
${yaml}`); };
assert.ok(yaml.startsWith("name: IO systemknappar\ndescription: BC Process Studio\nsteps:\n  - type: navigate\n"));
has(`  - type: invoke
    target:
      - page: null
        automationId: "00000000-0000-0000-0400-0000836bd2d2"
        caption: Bekräfta
    invokeType: Yes
`);
has(`  - type: input
    target:
      - page: Purchase Order
      - part: PurchLines
      - page: Purchase Order Subform
      - repeater: Control1
      - field: No.
    value: "30043"
    isFilterAsYouType: true
`);
has(`      - page: "lookup:No."
      - repeater: repeater
    targetRecord:
      relative: 4
`);
has(`    parameters:
      AlwaysCommit: true
`);
assert.ok(!/runtimeRef|runtimeId|page-shown|page-closed|type: focus/u.test(yaml), "replay does not need these");
assert.strictEqual(exporter.scalar("No."), "No.");
assert.strictEqual(exporter.scalar("lookup:No."), "\"lookup:No.\"");
assert.strictEqual(exporter.scalar("yes"), "\"yes\"");
assert.strictEqual(exporter.scalar("Ta bort: rad"), "\"Ta bort: rad\"");
assert.strictEqual(exporter.fileName("Inköp: order/IO?"), "Inköp- order-IO-.yml");
assert.strictEqual(exporter.fileName(""), "BC Process Studio.yml");

// A recording made before the AL identity was kept gives no file, and says why.
const old = exporter.build({ name: "Gammal", events: [{ type: "click", label: "Ny" }] });
assert.strictEqual(old.stepCount, 0);
assert.strictEqual(old.content, "");
assert.strictEqual(old.recordedIdentity, false);

// --- Reading the identity in the page (MAIN world), with stand-ins for the client's objects.
class Node {}
class Element extends Node {
  constructor(tag, attributes = {}, parent = null) {
    super();
    this.tagName = tag.toUpperCase(); this.nodeType = 1; this.attributes = attributes;
    this.parentElement = parent; this.children = []; this.textContent = attributes.text || "";
    this.dispatched = [];
    if (parent) parent.children.push(this);
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  matches(selector) { return selector.split(",").some(part => this.matchOne(part.trim())); }
  matchOne(part) {
    const attribute = part.match(/^\[([a-z-]+)(?:="([^"]*)")?\]$/u);
    if (attribute) return attribute[2] === undefined ? this.attributes[attribute[1]] != null
      : this.attributes[attribute[1]] === attribute[2];
    const tagged = part.match(/^([a-z0-9]+)(?:\[([a-z-]+)="([^"]*)"\])?$/u);
    if (tagged) return this.tagName === tagged[1].toUpperCase() &&
      (!tagged[2] || this.attributes[tagged[2]] === tagged[3]);
    return false;
  }
  closest(selector) {
    for (let element = this; element; element = element.parentElement) if (element.matches(selector)) return element;
    return null;
  }
  get ownerDocument() { return documentStub; }
  querySelector(selector) { return this.getElementsByTagName("*").find(element => element.matches(selector)) || null; }
  getElementsByTagName() { return this.children.flatMap(child => [child, ...child.getElementsByTagName("*")]); }
  dispatchEvent(event) { this.dispatched.push(event); return true; }
}
const body = new Element("div");
const documentStub = { getElementsByTagName: () => [body, ...body.getElementsByTagName("*")], activeElement: null };
class Form { constructor(props) { Object.assign(this, props); } }
class Control { constructor(props) { Object.assign(this, props); } }
const box = value => ({ value_: value });
const page = new Form({ designName: "Purchase Order", name: "Purchase Order", _children: [] });
const part = new Control({ designName: "PurchLines", name: "321840514", _parent: box(page) });
const subform = new Form({ designName: "Purchase Order Subform", name: "Purchase Order Subform", _parent: part, _children: [] });
const repeater = new Control({ designName: "Control1", name: "Control1", _parent: box(subform) });
const row = new Control({ designName: "", name: "RepeaterRowControl", _parent: repeater });
const quantity = new Control({ designName: "Quantity", name: "Quantity", _parent: row, _rawCaption: box("Antal") });
const release = new Control({ designName: "Release", name: "Release", _parent: page, _rawCaption: box("&Släpp") });
const releaseRef = new Control({ designName: "1718829673", name: "1718829673", _parent: page,
  actionReference: { targetId: 1, targetName: "Release" }, _rawCaption: box("Släpp") });
const deleteGuid = "7a6412b6-f244-4670-9259-0123456789ab";
const deleteInLines = new Control({ designName: null, name: deleteGuid, controlIdentifier: deleteGuid,
  _parent: repeater, _rawCaption: box("Ta bort rad") });
const deleteInBar = new Control({ designName: null, name: deleteGuid, controlIdentifier: deleteGuid,
  _parent: subform, _rawCaption: box("Ta bort rad") });
const registry = new Map([["b3z", release], ["b35", releaseRef], ["c1", deleteInLines], ["c2", deleteInBar]]);
page._context = { controlRegistry: { controlLookupById: registry } };
quantity._context = page._context;
const pageElement = new Element("div", {}, body);
pageElement._adapter = { $logicalControl: page };
const cell = new Element("td", { controlname: "Quantity" }, pageElement);
cell._adapter = { $logicalControl: quantity };
const input = new Element("input", { "aria-label": "Antal" }, cell);
const lookupTable = new Element("tbody", {}, pageElement);
const lookupRows = [0, 1].map(() => new Element("tr", {}, lookupTable));
const lookupCell = new Element("td", { text: " 30043 " }, lookupRows[1]);
lookupCell._adapter = { $logicalControl: row };
const lookupLink = new Element("a", { text: "30043" }, lookupCell);
const button = new Element("button", { "aria-label": "Släpp" }, pageElement);
const label = new Element("span", { text: "Släpp" }, button);
label["__reactFiber$x"] = { pendingProps: {}, return: { pendingProps: { "data-control-id": "b35" } } };
const dialog = new Element("div", { role: "dialog", "aria-label": "Vill du ta bort?" }, body);
const dialogRoot = new Element("div", {}, dialog);
dialogRoot._adapter = { $buildController: { _childAdapters: { items: [{ containerController: {
  attachedForm: new Form({ designName: "", controlIdentifier: "00000000-0000-0000-0400-0000836bd2d2", _rawCaption: box("Bekräfta") }) } }] } } };
const yes = new Element("button", { text: "Ja" }, dialog);
const lineMenu = new Element("div", { role: "menu" }, body);
const deleteItem = new Element("button", { role: "menuitem", text: "Ta bort rad" }, lineMenu);
const deleteText = new Element("span", { text: "Ta bort rad" }, deleteItem);

const listeners = {};
const windowStub = { addEventListener: (type, handler) => { (listeners[type] ||= []).push(handler); } };
class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } }
const context = vm.createContext({ window: windowStub, document: documentStub, CustomEvent, Map, WeakMap,
  Object, JSON, String, Array, Number });
const source = fs.readFileSync("src/recorder/al-identity-capture.js", "utf8");
vm.runInContext(source, context);
vm.runInContext(source, context); // a second injection adds nothing
assert.strictEqual(listeners.pointerdown.length, 1);
const identityAfter = (type, target, extra = {}) => {
  target.dispatched.length = 0;
  for (const handler of listeners[type]) handler({ button: 0, target, composedPath: () => [target], ...extra });
  const event = target.dispatched.find(item => item.type === "bcps-al-identity");
  return event ? JSON.parse(event.detail) : null;
};

const field = identityAfter("focusin", input);
assert.strictEqual(field.kind, "field");
assert.strictEqual(field.field, "Quantity");
assert.deepStrictEqual(field.path, [{ page: "Purchase Order" }, { part: "PurchLines" },
  { page: "Purchase Order Subform" }, { repeater: "Control1" }], "page › part › page › repeater, groups left out");
assert.strictEqual(field.caption, "Antal");

const chosenRow = identityAfter("pointerdown", lookupLink);
assert.deepStrictEqual([chosenRow.kind, chosenRow.rowIndex, chosenRow.value], ["row", 1, "30043"],
  "a row click keeps the value in the cell clicked");

const action = identityAfter("pointerdown", label);
assert.strictEqual(action.kind, "action");
assert.strictEqual(action.action, "Release", "an action reference names the action it points to");
assert.deepStrictEqual(action.path, [{ page: "Purchase Order" }]);

const confirm = identityAfter("pointerdown", yes);
assert.deepStrictEqual({ kind: confirm.kind, page: confirm.page, automationId: confirm.automationId,
  caption: confirm.caption, operation: confirm.operation },
{ kind: "dialog", page: null, automationId: "00000000-0000-0000-0400-0000836bd2d2", caption: "Bekräfta", operation: "Yes" });

// A line's own ⋯ menu names no control: the action is found by its caption, and its fixed id
// tells the file it is Delete.
const fromMenu = identityAfter("pointerdown", deleteText);
assert.strictEqual(fromMenu.kind, "system");
assert.strictEqual(fromMenu.matchedBy, "caption");
assert.strictEqual(fromMenu.properties.controlIdentifier, deleteGuid);
assert.strictEqual(exporter.build({ events: [change(lines, "Quantity", "5"),
  { type: "click", eventNo: 900, timestamp: at(), label: "Ta bort rad", alIdentity: fromMenu }] })
  .steps.at(-1).invokeType, "Delete");
lineMenu.children.push(new Element("button", { role: "menuitem", text: "Okänd sak" }, lineMenu));
// Another page open in the same document keeps its own registry; a menu item there is found
// in the registry of the control used just before it.
const salesPage = new Form({ designName: "Sales Order", name: "Sales Order", _children: [] });
const deleteSales = new Control({ designName: null, name: "7a6412b6-f244-4670-9259-00000000000a",
  _parent: salesPage, _rawCaption: box("Radera försäljningsrad") });
salesPage._context = { controlRegistry: { controlLookupById: new Map([["s1", deleteSales]]) } };
const salesElement = new Element("div", {}, body);
salesElement._adapter = { $logicalControl: salesPage };
const salesCell = new Element("span", { text: "Rad" }, salesElement);
identityAfter("pointerdown", salesCell);
const salesItem = new Element("button", { role: "menuitem", text: "Radera försäljningsrad" }, lineMenu);
const fromOtherPage = identityAfter("pointerdown", salesItem);
assert.strictEqual(fromOtherPage?.properties?.name, "7a6412b6-f244-4670-9259-00000000000a",
  "the registry of the page just used, not the first one found in the document");

assert.strictEqual(identityAfter("pointerdown", lineMenu.children.find(item => item.textContent === "Okänd sak")), null,
  "a menu item with no control of that caption is not guessed");

assert.strictEqual(identityAfter("pointerdown", new Element("div", {}, body)), null,
  "nothing is announced for an element without a control");
assert.strictEqual(identityAfter("pointerdown", label, { button: 2 }), null, "only the main button");

// --- Wiring: manifest, build, background, content script, library and texts.
const manifest = JSON.parse(fs.readFileSync("src/ui/manifest.json", "utf8"));
assert.deepStrictEqual(manifest.content_scripts.find(entry => entry.world === "MAIN").js, ["al-identity-capture.js"]);
assert.ok(fs.readFileSync("scripts/build.js", "utf8").includes('"al-identity-capture.js"'));
const background = fs.readFileSync("src/recorder/background.js", "utf8");
assert.ok(background.includes('importScripts("document/page-script-export.js")'));
assert.ok(background.includes('case "T9_BUILD_PAGE_SCRIPT"'));
assert.ok(background.includes('"al-identity-capture.js"'), "injected into tabs open before an update");
assert.ok(!/PAGE_MESSAGE_TYPES = new Set\(\[[^\]]*T9_BUILD_PAGE_SCRIPT/u.test(background), "not callable from a page");
const content = fs.readFileSync("src/recorder/content.js", "utf8");
assert.ok(content.includes('const AL_IDENTITY_EVENT = "bcps-al-identity"'));
assert.ok(content.includes("...(alIdentity ? { alIdentity } : {})"));
const view = require("../src/ui/document-library-view");
const record = { projectId: "p1", title: "IO", modifiedAt: "2026-11-13T10:00:00Z", metadata: {}, tags: [] };
const html = (view.T9DocumentLibraryView || globalThis.T9DocumentLibraryView || view)
  .card?.(record, false, false, "sv-SE", null, null, { pageScriptLabel: "Spara som Page Scripting-test" });
if (html) assert.ok(html.includes('data-library-action="export-page-script"'));
assert.ok(fs.readFileSync("src/ui/document-library-view.js", "utf8").includes('data-library-action="export-page-script"'));
assert.ok(fs.readFileSync("src/ui/dashboard.js", "utf8").includes('action === "export-page-script"'));

require("../src/engine/language-registry");
require("../src/ui/i18n");
const i18n = globalThis.T9UiI18n;
const keys = ["pageScript.exportAction", "pageScript.exportCreating", "pageScript.exportDone",
  "pageScript.exportPartial", "pageScript.exportEmpty", "pageScript.exportNotRecorded", "pageScript.exportFailed"];
for (const locale of require("../src/engine/language-registry").supported().map(item => item.locale)) {
  for (const key of keys) {
    const text = i18n.translate(key, locale);
    assert.ok(text && text !== key, `${locale}: ${key}`);
    if (locale !== "en-US") assert.notStrictEqual(text, i18n.translate(key, "en-US"), `${locale} is translated: ${key}`);
  }
  const done = i18n.format("pageScript.exportPartial", { fileName: "IO.yml", count: 16, skipped: 2, steps: "A; B" }, locale);
  assert.ok(done.includes("IO.yml") && done.includes("16") && done.includes("A; B") && !done.includes("{"), `${locale} fills in every value`);
}

// Step texts in every registered document language, as Page Scripting writes its own.
{
  const english = Object.keys(exporter.PHRASES["en-US"]);
  for (const locale of require("../src/engine/language-registry").supported().map(item => item.locale)) {
    const words = exporter.PHRASES[locale];
    assert.ok(words, `step texts for ${locale}`);
    assert.deepStrictEqual(Object.keys(words), english, `every step text in ${locale}`);
    const file = exporter.build({ locale, events: events.slice(0, 6) }).content;
    assert.ok(file.includes("<caption>Purchase Order List</caption>") && file.includes("<value>iberi</value>"),
      `${locale}: captions and values are kept as recorded`);
  }
  const swedish = exporter.build({ locale: "sv-SE", events }).steps;
  assert.strictEqual(swedish.find(step => step.invokeType === "Yes").description,
    "Anropa <operation>Bekräfta med Ja</operation> på <caption>Bekräfta</caption>");
  assert.strictEqual(swedish.filter(step => step.type === "input")[1].description, "Mata in <value>iberi</value> i <caption>Buy-from Vendor No.</caption>");
  assert.strictEqual(swedish.find(step => step.type === "input").description, "Mata in <value></value> i <caption>Buy-from Vendor No.</caption>",
    "the lookup opens with an empty filter, written as Page Scripting writes it");
  assert.ok(swedish.every(step => step.description), "every step has a text, or the list shows an empty row");
}

console.log("Page Scripting export tests passed.");
