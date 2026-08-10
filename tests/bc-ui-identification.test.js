const assert = require("assert");
const fs = require("fs");
const identification = require("../src/engine/bc-ui-identification");
const canonical = require("../src/engine/canonical-recording");
const semantic = require("../src/document/semantic-interaction-engine");

function identify(overrides = {}) {
  return identification.identify({
    type: "click", pageCaption: "Sales Order", sourceFrameId: "top",
    frameUrl: "https://businesscentral.dynamics.com/?page=42", frameDepth: 0,
    role: "textbox", controlType: "input", accessibleName: "Customer No.",
    accessibleNameSource: "aria-labelledby", label: "Customer No.",
    ...overrides
  }, { eventId: "recording:event:source-1" });
}

const standard = identify({ pageId: "42", automationId: "CustomerNo" });
assert.strictEqual(standard.eventId, "recording:event:source-1");
assert.deepStrictEqual(standard.page, {
  id: "42", caption: "Sales Order",
  route: "https://businesscentral.dynamics.com/?page=42"
});
assert.deepStrictEqual(standard.control.identity,
  { value: "CustomerNo", source: "data-automation-id", stability: "explicit" });
assert.strictEqual(standard.control.caption, "Customer No.");
assert.strictEqual(standard.control.type, "field");
assert.strictEqual(standard.confidence.page, "exact");
assert.strictEqual(standard.confidence.control, "exact");
assert.ok(standard.evidence.some(item => item.source === "aria-labelledby"));
assert.ok(Object.isFrozen(standard) && Object.isFrozen(standard.control));

const captionOnly = identify({ pageId: "", automationId: "" });
assert.strictEqual(captionOnly.page.id, undefined);
assert.strictEqual(captionOnly.page.caption, "Sales Order");
assert.strictEqual(captionOnly.confidence.page, "strong");

const salesLine = identify({ accessibleName: "Quantity", label: "Quantity",
  uiHierarchy: [{ type: "subpage", caption: "Sales Lines", identity: "Lines" },
    { type: "repeater", identity: "SalesLinesRepeater" }, { type: "row" }] });
assert.deepStrictEqual(salesLine.hierarchy.map(item => item.type),
  ["subpage", "repeater", "row"]);

const lookup = identify({ ariaHasPopup: "listbox", accessibleName: "Customer No.",
  uiHierarchy: [{ type: "dialog", caption: "Customers" }] });
assert.strictEqual(lookup.control.type, "lookup");
assert.strictEqual(lookup.page.modal, true);
assert.strictEqual(lookup.page.dialogCaption, "Customers");

assert.strictEqual(identify({ inputType: "checkbox", accessibleName: "Blocked" }).control.type, "checkbox");
assert.strictEqual(identify({ controlType: "select", accessibleName: "Status" }).control.type, "option");

const post = identify({ category: "action", role: "button", controlType: "button",
  accessibleName: "Post", label: "Post", dataControlId: "PostAction",
  uiHierarchy: [{ type: "actionBar" }, { type: "actionGroup", caption: "Posting" }] });
assert.strictEqual(post.action.caption, "Post");
assert.deepStrictEqual(post.action.identity,
  { value: "PostAction", source: "data-control-id", stability: "explicit" });
assert.strictEqual(post.hierarchy[1].caption, "Posting");

const fastTab = identify({ accessibleName: "Posting Date", label: "Posting Date",
  uiHierarchy: [{ type: "fastTab", caption: "General" }, { type: "group", caption: "Posting" }] });
assert.deepStrictEqual(fastTab.hierarchy.map(item => item.type), ["fastTab", "group"]);
const factBox = identify({ accessibleName: "Customer Statistics",
  uiHierarchy: [{ type: "factBox", caption: "Customer Statistics" }] });
assert.strictEqual(factBox.container.type, "factBox");
const row = identify({ pageCaption: "Item List", role: "gridcell",
  accessibleName: "No.", uiHierarchy: [{ type: "repeater", identity: "Items" },
    { type: "row", transientIndex: 3 }] });
assert.strictEqual(row.control.type, "repeaterCell");
assert.strictEqual(row.control.identity, undefined);
assert.strictEqual(row.hierarchy[1].transientIndex, 3);

const mui = identify({ pageCaption: "", role: "", controlType: "input",
  inputType: "text", placeholder: "YYYY-MM-DD", accessibleName: "",
  label: "", controlAddIn: true, sourceFrameId: "addin-frame", frameDepth: 1 });
assert.strictEqual(mui.control.type, "dateInput");
assert.strictEqual(mui.confidence.control, "partial");
assert.strictEqual(mui.frameContext.controlAddIn, true);
assert.strictEqual(mui.frameContext.depth, 1);

const unknown = identify({ role: "custom-future-role", controlType: "future-widget",
  accessibleName: "", label: "", futureMetadata: { retained: true } });
assert.strictEqual(unknown.control.type, "unknownInteractiveControl");
assert.strictEqual(unknown.control.identity, undefined);
assert.strictEqual(unknown.confidence.control, "unknown");
const futureIdentification = identification.normalize({
  ...unknown, futureIdentificationMetadata: { retained: true }
});
assert.deepStrictEqual(futureIdentification.futureIdentificationMetadata,
  { retained: true });

const localized = identify({ accessibleName: "Kundnr.", label: "Kundnr.",
  automationId: "CustomerNo" });
assert.strictEqual(localized.control.caption, "Kundnr.");
assert.strictEqual(localized.control.identity.value, standard.control.identity.value);

const raw = { sourceEventId: "source-1", type: "click", pageCaption: "Sales Order",
  label: "Post", category: "action", unknownFuture: { retained: true } };
const before = JSON.stringify(raw);
const result = identification.identify(raw, { eventId: "rec:event:source-1" });
const recording = canonical.addEvent(canonical.create({ id: "rec" }), raw, result);
assert.strictEqual(JSON.stringify(raw), before);
assert.deepStrictEqual(recording.events[0].raw.unknownFuture, { retained: true });
assert.strictEqual(recording.events[0].identification.eventId, recording.events[0].id);
const projected = canonical.legacyView(recording).events[0];
projected.identification.control.caption = "Changed projection";
assert.strictEqual(recording.events[0].identification.control.caption, "Post");

const identifiedSemantic = semantic.processInteractions([{
  taskId: "identified-quantity", taskType: "ChangeField", value: "5",
  inputSources: ["input"], identifications: [identify({
    accessibleName: "Quantity", label: "Quantity"
  })]
}]);
assert.strictEqual(identifiedSemantic[0].actionType, "EnterQuantity");

const contentSource = fs.readFileSync("src/recorder/content.js", "utf8");
assert.ok(contentSource.indexOf("labelledText || ariaLabel || associatedLabel || elementText") >= 0,
  "accessible name precedence must be deterministic");
assert.ok(contentSource.includes("depth < 8"), "ancestor traversal must be bounded");

const started = Date.now();
for (let index = 0; index < 5000; index += 1) identify({ sourceSequence: index });
assert.ok(Date.now() - started < 3000, "identification performance regression");

console.log("BC UI identification tests passed.");
