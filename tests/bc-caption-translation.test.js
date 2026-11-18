"use strict";
// Business Central's own names in another document language: a step keeps the AL identity of its
// field, action and page, and a recorded caption is replaced by Microsoft's caption in the
// document language only when it is that control's caption in one of the languages.
const assert = require("assert");
const translation = require("../src/document/bc-caption-translation");
const grammar = require("../src/document/presentation-grammar");
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const data = require("../src/document/bc-captions.json");

// The table: Microsoft's Base Application in every registered language.
const languages = require("../src/engine/language-registry");
assert.deepStrictEqual([...data.locales].sort(),
  languages.supported("document").map(language => language.locale).sort(), "every document language");
assert.ok(Object.keys(data.keys).length > 30000, "the Base Application's pages, fields and actions");
const row = key => data.rows[data.keys[key]];
assert.deepStrictEqual(row("f|Purchase Order|Buy-from Vendor No."), ["Vendor No.", "Leverantörsnr",
  "N° fournisseur", "Kreditorennr.", "N.º de proveedor", "Kreditornr.", "Toimittajan nro", "Leverandørnr."],
  "a page control's own caption, not the table field's");
assert.strictEqual(row("a|Purchase Order|Release")[data.locales.indexOf("de-DE")], "Freigeben");
assert.strictEqual(row("f|Purchase Order Subform|Quantity")[data.locales.indexOf("fi-FI")], "Määrä");
assert.ok(!data.rows.some(captions => captions.some(caption => /&/u.test(caption) && !/&&|& /u.test(caption))),
  "access-key ampersands are removed");

// Without the table nothing is translated.
assert.strictEqual(translation.translate("Leverantörsnr", "f|Purchase Order|Buy-from Vendor No.", "de-DE"),
  "Leverantörsnr");
assert.ok(translation.load(data));
assert.strictEqual(translation.translate("Leverantörsnr", "f|Purchase Order|Buy-from Vendor No.", "de-DE"),
  "Kreditorennr.");
assert.strictEqual(translation.translate("Kreditorennr.", "f|Purchase Order|Buy-from Vendor No.", "sv-SE"),
  "Leverantörsnr", "from any recorded language");
assert.strictEqual(translation.translate("Vendor No.", "f|Purchase Order|Buy-from Vendor No.", "en-US"), "Vendor No.");
// A caption that is not the control's own (personalized, changed by an extension) stays as recorded.
assert.strictEqual(translation.translate("Leverantör", "f|Purchase Order|Buy-from Vendor No.", "de-DE"), "Leverantör");
assert.strictEqual(translation.translate("Leverantörsnr", "f|Purchase Order|Unknown Control", "de-DE"), "Leverantörsnr");
assert.strictEqual(translation.translate("Leverantörsnr", "", "de-DE"), "Leverantörsnr");
assert.strictEqual(translation.translate("Leverantörsnr", "f|Purchase Order|Buy-from Vendor No.", "pt-BR"), "Leverantörsnr");
// An unsupported table is not used.
assert.strictEqual(translation.load({ schema: 2 }), false);
assert.strictEqual(translation.translate("Leverantörsnr", "f|Purchase Order|Buy-from Vendor No.", "de-DE"), "Leverantörsnr");
translation.load(data);

// Keys from the AL identity: the innermost page of the path, then the field or action.
assert.deepStrictEqual(translation.keysFromIdentity({ v: 1, kind: "field",
  path: [{ page: "Purchase Order" }, { part: "PurchLines", page: "Purchase Order Subform" }, { repeater: "Control1" }],
  field: "Quantity" }), { page: "p|Purchase Order Subform", field: "f|Purchase Order Subform|Quantity" });
assert.deepStrictEqual(translation.keysFromIdentity({ v: 1, kind: "action", path: [{ page: "Purchase Order" }],
  action: "Release" }), { page: "p|Purchase Order", action: "a|Purchase Order|Release" });
assert.deepStrictEqual(translation.keysFromIdentity(null), {});
assert.deepStrictEqual(translation.keysFromIdentity({ kind: "field", path: [{ page: "lookup:Vendor" }], field: "No." }), {});

// A recording in Swedish Business Central, with the AL identity the capture script adds.
const at = seconds => `2026-11-17T10:00:${String(seconds).padStart(2, "0")}.000Z`;
const page = { sourceFrameId: "main", frameDepth: 0, pageId: "50", pageCaption: "Inköpsorder" };
const raw = [
  { ...page, type: "field-change", category: "field", inputSource: "input", value: "10000",
    controlType: "input", role: "textbox", accessibleName: "Leverantörsnr", fieldName: "Leverantörsnr",
    label: "Leverantörsnr", elementId: "vendor", interactionId: "main:vendor", timestamp: at(1),
    alIdentity: { v: 1, kind: "field", path: [{ page: "Purchase Order" }], field: "Buy-from Vendor No." } },
  { ...page, type: "click", category: "action", controlType: "button", role: "button",
    accessibleName: "Släpp", label: "Släpp", pointerTarget: true, interactionId: "main:release", timestamp: at(5),
    alIdentity: { v: 1, kind: "action", path: [{ page: "Purchase Order" }], action: "Release" } }
].map((event, index) => ({ ...event, sourceEventId: `caption:${index + 1}`, sourceSequence: index + 1,
  recordingId: "caption-translation" }));
let recording = canonical.create({ id: "caption-translation", name: "Caption translation" });
const events = raw.map((event, index) => {
  recording = canonical.addEvent(recording, event, identify.identify(event, { eventId: `caption:event:${index}` }));
  return { ...event, eventNo: index + 1, canonicalSourceEventId: recording.events.at(-1).id };
});
const normalized = normalization.normalizeRecording(recording);
const grouped = grouping.group(normalized);
const tasks = pipeline.interpret({
  session: { id: "caption-translation", name: "Caption translation", settings: { documentLanguage: "sv-SE" } },
  events, normalizedEvents: normalized.events, stepGroups: grouped.groups,
  supportingEvents: grouped.supportingEvents, groupingDiagnostics: grouped.diagnostics,
  imagePaths: {}, knowledgePacks: [] }).businessTasks;
const vendor = tasks.find(task => /10000/u.test(task.instruction));
const release = tasks.find(task => /Släpp/u.test(task.instruction));
assert.ok(vendor && release, JSON.stringify(tasks.map(task => task.instruction)));
assert.strictEqual(vendor.semanticActionModel.captionKeys.field, "f|Purchase Order|Buy-from Vendor No.");
assert.strictEqual(release.semanticActionModel.captionKeys.action, "a|Purchase Order|Release");

// The document in every language names the field and action as Business Central does there.
const documentOf = (task, documentLanguage) => ({
  schemaVersion: 1, documentId: "captions", metadata: { title: "Captions", documentLanguage },
  sections: [{ sectionId: "workflow", kind: "workflow", title: "Workflow", blocks: [{
    blockId: "step:1", kind: "step", stepNumber: 1,
    interaction: { taskId: task.taskId, instruction: task.instruction, semanticActionModel: task.semanticActionModel },
    blocks: [{ blockId: `block:instruction:${task.taskId}:1`, kind: "paragraph", text: task.instruction }]
  }] }]
});
const sentence = (task, locale) => grammar.process(documentOf(task, locale)).sections[0].blocks[0].blocks[0];
const vendorIn = { "sv-SE": "Leverantörsnr", "en-US": "Vendor No.", "fr-FR": "N° fournisseur",
  "de-DE": "Kreditorennr.", "es-ES": "N.º de proveedor", "da-DK": "Kreditornr.", "fi-FI": "Toimittajan nro",
  "nb-NO": "Leverandørnr." };
for (const [locale, caption] of Object.entries(vendorIn)) {
  const paragraph = sentence(vendor, locale);
  assert.ok(paragraph.presentationRuns.some(item => item.role === "interface" && item.text === caption),
    `${locale}: ${paragraph.text}`);
  assert.ok(paragraph.text.includes("10000"), `${locale} keeps the entered value`);
}
assert.match(sentence(vendor, "de-DE").text, /Kreditorennr. 10000/u);
assert.match(sentence(release, "de-DE").text, /Freigeben/u);
assert.match(sentence(release, "en-US").text, /Release/u);
assert.match(sentence(release, "fi-FI").text, /Vapauta/u);

// New is the client's own action, not the Base Application's: its caption comes from the client's
// resources. It is recorded as Control_New or as a system action with the operation New.
assert.deepStrictEqual(translation.keysFromIdentity({ v: 1, kind: "action", path: [{ page: "Purchase Order List" }],
  action: "Control_New", operation: "New" }), { page: "p|Purchase Order List", action: "c|New" });
assert.deepStrictEqual(translation.keysFromIdentity({ v: 1, kind: "system", path: [{ page: "Purchase Order List" }],
  operation: "New" }), { page: "p|Purchase Order List", action: "c|New" });
assert.strictEqual(translation.translate("Ny", "c|New", "fr-FR"), "Créer");
assert.strictEqual(translation.translate("New", "c|New", "sv-SE"), "Ny");
assert.strictEqual(translation.translate("Nytt", "c|New", "de-DE"), "Nytt", "a caption that is not New");
const newClick = { ...page, pageId: "9307", pageCaption: "Inköpsorder", type: "click", category: "action",
  controlType: "button", role: "button", accessibleName: "Ny", label: "Ny", pointerTarget: true,
  interactionId: "main:new", timestamp: at(1), sourceEventId: "new:1", sourceSequence: 1, recordingId: "new",
  alIdentity: { v: 1, kind: "action", path: [{ page: "Purchase Order List" }], action: "Control_New", operation: "New" } };
let newRecording = canonical.create({ id: "new", name: "New" });
newRecording = canonical.addEvent(newRecording, newClick, identify.identify(newClick, { eventId: "new:event:0" }));
const newNormalized = normalization.normalizeRecording(newRecording);
const newGrouped = grouping.group(newNormalized);
const newTask = pipeline.interpret({
  session: { id: "new", name: "New", settings: { documentLanguage: "sv-SE" } },
  events: [{ ...newClick, eventNo: 1, canonicalSourceEventId: newRecording.events[0].id }],
  normalizedEvents: newNormalized.events, stepGroups: newGrouped.groups,
  supportingEvents: newGrouped.supportingEvents, groupingDiagnostics: newGrouped.diagnostics,
  imagePaths: {}, knowledgePacks: [] }).businessTasks.find(task => /Ny/u.test(task.instruction));
assert.ok(newTask, "the New step");
const newIn = { "sv-SE": "Ny", "en-US": "New", "fr-FR": "Créer", "de-DE": "Neu", "es-ES": "Nuevo",
  "da-DK": "Ny", "fi-FI": "Uusi", "nb-NO": "Ny" };
for (const [locale, caption] of Object.entries(newIn)) {
  const paragraph = sentence(newTask, locale);
  assert.ok(paragraph.presentationRuns.some(item => item.role === "interface" && item.text === caption),
    `New in ${locale}: ${paragraph.text}`);
}

// A step without the AL identity, recorded before it was captured, keeps its captions.
const withoutKeys = { ...vendor, semanticActionModel: { ...vendor.semanticActionModel, captionKeys: undefined } };
assert.match(sentence(withoutKeys, "de-DE").text, /Leverantörsnr/u);
// Text the user wrote is never changed.
const edited = grammar.process({ ...documentOf(vendor, "de-DE"), sections: [{ sectionId: "workflow", kind: "workflow",
  title: "Workflow", blocks: [{ blockId: "step:1", kind: "step", stepNumber: 1,
    interaction: { taskId: vendor.taskId, instruction: vendor.instruction, semanticActionModel: vendor.semanticActionModel },
    blocks: [{ blockId: "block:instruction:edited", kind: "paragraph", provenance: "user-edited",
      text: "Fyll i Leverantörsnr med 10000." }] }] }] }).sections[0].blocks[0].blocks[0];
assert.strictEqual(edited.text, "Fyll i Leverantörsnr med 10000.");

// The language picker in the review toolbar, in every interface language.
const fs = require("fs");
const read = file => fs.readFileSync(require("path").join(__dirname, "..", file), "utf8");
const html = read("src/ui/dashboard.html");
assert.match(html, /<select id="reviewLanguageSwitch" data-language-select="document"/u);
assert.match(html, /id="reviewLanguageStatus"[^>]*role="status"/u);
assert.ok(html.indexOf("document/bc-caption-translation.js") < html.indexOf("engine/session-interpretation-pipeline.js"),
  "the dashboard loads the captions before the pipeline");
assert.ok(read("src/recorder/background.js").indexOf('importScripts("document/bc-caption-translation.js")') <
  read("src/recorder/background.js").indexOf('importScripts("engine/session-interpretation-pipeline.js")'),
  "steps recorded in the background keep their caption keys");
globalThis.T9LanguageRegistry = languages;
require("../src/ui/i18n");
const ui = globalThis.T9UiI18n;
const english = key => ui.translate(key, "en-US");
for (const { locale } of languages.supported("ui")) {
  for (const key of ["label", "help", "done", "older", "olderOne", "undo"]) {
    const value = ui.translate(`languageSwitch.${key}`, locale);
    assert.ok(value && !value.startsWith("languageSwitch."), `${locale} ${key}`);
    if (locale !== "en-US" && key !== "label" && key !== "undo") assert.notStrictEqual(value, english(`languageSwitch.${key}`), `${locale} ${key} translated`);
  }
  assert.match(ui.format("languageSwitch.done", { language: "Deutsch" }, locale), /Deutsch/u);
  assert.match(ui.format("languageSwitch.older", { n: 3 }, locale), /3/u);
}

// A step whose saved description no longer matches its sentence is read from the sentence, so it
// is written in the document language like every other step.
const savedSentence = "Börja skapa en ny **kund** genom att välja **Ny** på sidan **Inköpsorder**.";
const mismatched = grammar.process({ schemaVersion: 1, documentId: "mismatch",
  metadata: { title: "Mismatch", documentLanguage: "en-US" }, sections: [{ sectionId: "workflow",
    kind: "workflow", title: "Workflow", blocks: [{ blockId: "step:2", kind: "step", stepNumber: 2,
      interaction: { taskId: "mismatch", instruction: savedSentence, semanticActionModel: {
        actionType: "CreateNewRecord", displayText: savedSentence,
        stepText: { kind: "create", entity: "PurchaseOrder", action: "Ny", page: "Inköpsorder" } } },
      blocks: [{ blockId: "block:instruction:mismatch:1", kind: "paragraph", text: savedSentence }] }] }] })
  .sections[0].blocks[0].blocks[0];
assert.strictEqual(mismatched.text, "Start creating a new customer by selecting Ny on the Inköpsorder page.");

// Captions are compared with their letter case: the record type inköpsorder is not the page.
assert.strictEqual(translation.translate("inköpsorder", "p|Purchase Order List", "en-US"), "inköpsorder");
assert.strictEqual(translation.translate("Inköpsorder", "p|Purchase Order List", "en-US"), "Purchase Orders");
// Action groups: a promoted category (Släpp) and a menu (Rad).
assert.strictEqual(translation.translate("Släpp", "a|Purchase Order|Category_Category5", "en-US"), "Release");
assert.strictEqual(translation.translate("Rad", "a|Purchase Order Subform|&Line", "de-DE"), "Zeile");
// A standard field on a page the table does not have, such as a partner app's dialog.
assert.strictEqual(translation.translate("Direkt styckkostnad", "f|ChangeApplPurchDirUnitCostFDW|Direct Unit Cost",
  "en-US"), "Direct Unit Cost");
assert.strictEqual(translation.translate("Något annat", "f|ChangeApplPurchDirUnitCostFDW|Direct Unit Cost",
  "en-US"), "Något annat");
assert.strictEqual(translation.translate("Tillämpat inköpspris och rabatt",
  "a|Purchase Order Subform|AppliedPurchasePriceAndDiscountFDW", "en-US"), "Tillämpat inköpspris och rabatt");
// The field of a lookup button, a value chosen in its lookup list, a row of lines and a menu.
assert.deepStrictEqual(translation.keysFromEvents([
  { alIdentity: { kind: "control", path: [{ page: "Purchase Order" }], field: "Buy-from Vendor No." } },
  { alIdentity: { kind: "row", path: [{ page: "lookup:Buy-from Vendor No." }, { repeater: "repeater" }] } }
]), { page: "p|Purchase Order", field: "f|Purchase Order|Buy-from Vendor No." });
assert.deepStrictEqual(translation.keysFromEvents([
  { alIdentity: { kind: "row", path: [{ page: "Purchase Order" }, { part: "PurchLines", page: "Purchase Order Subform" }],
    field: "No." } }]), { page: "p|Purchase Order Subform", field: "f|Purchase Order Subform|No." });
assert.deepStrictEqual(translation.keysFromEvents([
  { alIdentity: { kind: "menu", path: [{ page: "Purchase Order Subform" }], action: "&Line" } },
  { alIdentity: { kind: "action", path: [{ page: "Purchase Order Subform" }], action: "Reserve" } }
]).actions, ["a|Purchase Order Subform|&Line", "a|Purchase Order Subform|Reserve"]);

// A sentence that Review saved with its captions in quotation marks is written in the document
// language like the step's own text, and Business Central's names follow.
const quotedSentence = "Börja skapa en ny \"inköpsorder\" genom att välja \"Ny\" på sidan \"Inköpsorder\".";
const quotedStep = grammar.process({ schemaVersion: 1, documentId: "quoted",
  metadata: { title: "Quoted", documentLanguage: "en-US" }, sections: [{ sectionId: "workflow",
    kind: "workflow", title: "Workflow", blocks: [{ blockId: "step:2", kind: "step", stepNumber: 2,
      interaction: { taskId: "quoted", instruction: quotedSentence, semanticActionModel: {
        actionType: "CreateNewRecord", displayText: "Börja skapa en ny **inköpsorder** genom att välja **Ny** på sidan **Inköpsorder**.",
        stepText: { kind: "create", entity: "PurchaseOrder", action: "Ny", page: "Inköpsorder" },
        captionKeys: { action: "c|New", page: "p|Purchase Order List" } } },
      blocks: [{ blockId: "block:instruction:quoted:1", kind: "paragraph", text: quotedSentence }] }] }] })
  .sections[0].blocks[0].blocks[0];
assert.strictEqual(quotedStep.text, "Start creating a new purchase order by selecting New on the Purchase Orders page.");

// A selection rule's own Swedish word for the field is not Business Central's: the document
// language's label names it.
const itemStep = grammar.process({ schemaVersion: 1, documentId: "item",
  metadata: { title: "Item", documentLanguage: "en-US" }, sections: [{ sectionId: "workflow",
    kind: "workflow", title: "Workflow", blocks: [{ blockId: "step:4", kind: "step", stepNumber: 4,
      interaction: { taskId: "item", instruction: "Välj artikel \"21036\".", semanticActionModel: {
        actionType: "SelectItem", displayText: "Välj artikel **21036**.", targetField: "Artikelnummer",
        selectedValue: "21036" } },
      blocks: [{ blockId: "block:instruction:item:1", kind: "paragraph", text: "Välj artikel \"21036\"." }] }] }] })
  .sections[0].blocks[0].blocks[0];
assert.strictEqual(itemStep.text, "Choose Item No. 21036.");

console.log("Business Central caption translation tests passed");
