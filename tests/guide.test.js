"use strict";
// Visa mig: a document's steps as a guide beside Business Central, with the field or button of
// each step named by its AL name, the texts in every registered language, and the guide's
// parts wired into the extension.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
globalThis.T9TextFormat = require("../src/engine/text-format");
const reviewStudio = require("../src/review/review-studio");
const pipeline = require("../src/exporters/word-export-pipeline");
const guideSteps = require("../src/document/guide-steps");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const NOW = "2026-11-19T08:00:00Z";

// What to outline: a field by its AL name, an action by its AL name or as the client's New, the
// recorded caption when no AL name was recorded, and nothing when the step names neither.
const field = guideSteps.targetOf({ taskType: "SelectVendor", fieldCaption: "Leverantörsnr",
  pageCaption: "Inköpsorder", semanticActionModel: { captionKeys: { page: "p|Purchase Order",
    field: "f|Purchase Order|Buy-from Vendor No." } } });
assert.deepStrictEqual(field, { kind: "field", page: "Purchase Order", pageCaption: "Inköpsorder",
  field: "Buy-from Vendor No.", caption: "Leverantörsnr", captions: ["Leverantörsnr"] });
assert.deepStrictEqual(guideSteps.targetOf({ taskType: "EnterQuantity", fieldCaption: "Antal",
  knowledgeControlRef: { alControlName: "Quantity" } }),
{ kind: "field", page: "", pageCaption: "", field: "Quantity", caption: "Antal", captions: ["Antal"] });
assert.deepStrictEqual(guideSteps.targetOf({ taskType: "ReleaseDocumentAction", actionCaption: "Släpp",
  semanticActionModel: { captionKeys: { page: "p|Purchase Order", action: "a|Purchase Order|Release" } } }),
{ kind: "action", page: "Purchase Order", pageCaption: "", action: "Release", caption: "Släpp" });
assert.deepStrictEqual(guideSteps.targetOf({ taskType: "NewRecordAction", actionCaption: "Ny",
  semanticActionModel: { captionKeys: { action: "c|New" } } }),
{ kind: "action", page: "", pageCaption: "", action: "", operation: "New", caption: "Ny" });
assert.deepStrictEqual(guideSteps.targetOf({ taskType: "GenericAction", actionCaption: "Bokför" }),
  { kind: "action", page: "", pageCaption: "", action: "", caption: "Bokför" });
// An action step whose recorded field is the page's name is still the action.
assert.equal(guideSteps.targetOf({ taskType: "GenericAction", actionCaption: "Bokför",
  knowledgeControlRef: { alControlName: "Purchase Order" } }).kind, "action");
// A page opened by searching outlines Business Central's search and names the page it opens,
// even when a caption was recorded for the search.
assert.deepStrictEqual(guideSteps.targetOf({ taskType: "SearchAndOpenPage", actionCaption: "Sök",
  pageCaption: "Inköpsorder", semanticActionModel: { captionKeys: { page: "p|Purchase Order List" } } }),
{ kind: "search", page: "Purchase Order List", pageCaption: "", result: "Inköpsorder", caption: "Sök" });
assert.deepStrictEqual(guideSteps.targetOf({ taskType: "SearchAndOpenPage" }), { kind: "search", page: "", pageCaption: "", result: "", caption: "" });
assert.deepStrictEqual(guideSteps.targetOf({ taskType: "ManualStep" }), { kind: "none", page: "", pageCaption: "" });
assert.deepStrictEqual(guideSteps.targetOf(null), { kind: "none", page: "", pageCaption: "" });

// The steps come from the document as it is presented: in the document language, with the
// user's edits and the headings they are under.
const review = reviewStudio.createReview({ id: "order", name: "Skapa order" }, [
  { taskId: "step-1", taskType: "EnterQuantity", instruction: "Ange __5__ i **Antal**.", sourceEventNos: [1],
    fieldCaption: "Antal", knowledgeControlRef: { alControlName: "Quantity" } },
  { taskId: "step-2", taskType: "PostAction", instruction: "Välj **Bokför**.", sourceEventNos: [2],
    actionCaption: "Bokför" }]);
const presented = pipeline.createPresentation({ review, documentLanguage: "sv-SE",
  session: { id: "order", name: "Skapa order", startedAt: NOW, settings: {} } });
const guide = guideSteps.create(presented.presentationDocument, { projectId: "order", sessionId: "order",
  title: "Skapa order" });
assert.equal(guide.title, "Skapa order");
assert.equal(guide.documentLanguage, "sv-SE");
assert.deepStrictEqual(guide.steps.map(step => [step.number, step.instruction, step.target.kind,
  step.target.field || step.target.caption]), [[1, "Ange 5 i Antal.", "field", "Quantity"],
  [2, "Välj Bokför.", "action", "Bokför"]]);
assert.throws(() => guideSteps.create({ sections: [] }), TypeError);

// Steps as a real recording has them, before Business Central's AL names were kept: the kind of
// sentence Review wrote says what the user did. The presented document keeps only each step's
// semantic action, so the targets come from the document Review projected.
const recorded = (taskId, taskType, kind, fields) => ({ taskId, taskType, sourceEventNos: [taskId.length],
  semanticActionModel: { actionType: taskType, stepText: { kind } }, ...fields });
const realReview = reviewStudio.createReview({ id: "salico", name: "Inköp" }, [
  recorded("s1", "SearchAndOpenPage", "searchOpenList", { instruction: "Sök efter __ink ord__ och öppna listan **Inköpsorder**.",
    fieldCaption: "Sök", actionCaption: "Sök", selectedCaption: "ink ord", pageCaption: "Inköpsorder" }),
  recorded("s22", "CreatePurchaseOrder", "create", { instruction: "Börja skapa en ny **inköpsorder** genom att välja **Ny**.",
    fieldCaption: "Ny", actionCaption: "Ny", pageCaption: "Inköpsorder" }),
  recorded("s333", "SelectRecord", "recordOnPage", { instruction: "Välj posten **10000** på sidan **Inköpsorder**.",
    fieldCaption: "10000", actionCaption: "10000", selectedCaption: "10000", value: "10000",
    knowledgeControlRef: { alControlName: "1" }, pageCaption: "Inköpsorder" }),
  recorded("s4444", "SelectItem", null, { instruction: "Välj artikel **300043**.", fieldCaption: "Artikelnummer",
    actionCaption: "Nr", selectedCaption: "300043", pageCaption: "Inköpsorder - 2600204 ∙ 3N Produkter AB" }),
  recorded("s55555", "EnterQuantity", "enter", { instruction: "Ange __4 500__ i **Antal**.", fieldCaption: "Antal",
    actionCaption: "Antal", selectedCaption: "4 500", pageCaption: "Inköpsorder - 2600204 ∙ 3N Produkter AB" }),
  recorded("s666666", "ReleasePurchaseDocument", "actionOnPage", { instruction: "Välj **Släpp**.", actionCaption: "Släpp",
    pageCaption: "Inköpsorder" })]);
const realPresented = pipeline.createPresentation({ review: realReview, documentLanguage: "sv-SE",
  session: { id: "salico", name: "Inköp", startedAt: NOW, settings: {} } });
const realGuide = guideSteps.create(realPresented.presentationDocument,
  { sourceDocument: realPresented.sourceSemanticDocument, projectId: "salico" });
// The search step outlines the page in the results by its name.
assert.equal(realGuide.steps[0].target.result, "Inköpsorder");
assert.deepStrictEqual(realGuide.steps.map(step => [step.target.kind, step.target.captions || step.target.caption || "",
  step.target.field || "", step.target.pageCaption]), [
  ["search", "Sök", "", ""],
  ["action", "Ny", "", "Inköpsorder"],
  ["action", "10000", "", "Inköpsorder"],
  ["field", ["Artikelnummer", "Nr"], "", "Inköpsorder"],
  ["field", ["Antal"], "", "Inköpsorder"],
  ["action", "Släpp", "", "Inköpsorder"]]);
// The guide travels from the library page to the panel by postMessage: plain data only.
assert.deepStrictEqual(JSON.parse(JSON.stringify(guide)), guide);

// A path written as one step is guided one click at a time, in the document's language; a
// step whose text the user rewrote is guided as written.
{
  const leaf = "Tillämpat inköpspris och rabatt";
  const pathTask = { taskId: "path", actionCaption: leaf, pageCaption: "Inköpsorder",
    semanticActionModel: { actionType: "RunActionPath", actionPath: ["Rad", leaf],
      captionKeys: { action: "a|Purchase Order|ApplyPrice" }, stepText: { kind: "path", path: ["Rad", leaf] } } };
  const pathDocument = (language, instruction) => ({ metadata: { documentLanguage: language },
    sections: [{ kind: "workflow", blocks: [{ kind: "step", blockId: "b", sourceRef: { taskId: "path" },
      interaction: pathTask, blocks: [{ kind: "paragraph", text: instruction }] }] }] });
  const split = guideSteps.stepsFromDocument(pathDocument("sv-SE", `Välj Rad → ${leaf}.`));
  assert.deepEqual(split.map(step => [step.number, step.instruction, step.target.kind, step.target.caption]), [
    [1, "Välj Rad.", "action", "Rad"], [2, `Välj ${leaf}.`, "action", leaf]]);
  assert.equal(split[1].target.action, "ApplyPrice");
  assert.equal(guideSteps.stepsFromDocument(pathDocument("de-DE", `Wählen Sie Rad → ${leaf} aus.`))[0].instruction,
    "Wählen Sie Rad aus.");
  assert.equal(guideSteps.stepsFromDocument(pathDocument("sv-SE", "Öppna prisfönstret.")).length, 1);
}

// Whether what the user did is the step's action.
const release = { kind: "action", action: "Release" };
assert.ok(guideSteps.actionMatches(release, { kind: "action", action: "Release" }));
assert.ok(!guideSteps.actionMatches(release, { kind: "action", action: "Reopen" }));
assert.ok(guideSteps.actionMatches({ kind: "action", operation: "New" }, { kind: "system", operation: "New" }));
assert.ok(!guideSteps.actionMatches({ kind: "field", field: "Quantity" }, { kind: "field", field: "Quantity" }));
assert.ok(guideSteps.sameCaption("&Släpp ", "släpp"));
assert.ok(!guideSteps.sameCaption("", ""));

// Every text of the guide exists in every registered interface language, translated, with the
// same placeholders.
const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
for (const file of ["src/engine/locale-catalogs.js", "src/engine/language-registry.js", "src/ui/i18n.js"]) {
  vm.runInNewContext(read(file), context);
}
const i18n = context.globalThis.T9UiI18n;
const locales = context.globalThis.T9LanguageRegistry.supported("ui").map(language => language.locale);
assert.equal(locales.length, 8);
const sources = ["src/ui/guide-panel.html", "src/ui/guide-panel.js", "src/ui/dashboard.js", "src/ui/dashboard.html"].map(read);
const used = new Set(sources.flatMap(text => [...text.matchAll(/["'](guide\.[A-Za-z]+)["']/gu)].map(match => match[1])));
assert.ok(used.size >= 30, `guide texts in use: ${used.size}`);
const placeholders = text => [...String(text).matchAll(/\{(\w+)\}/gu)].map(match => match[1]).sort();
for (const key of used) {
  const english = i18n.translate(key, "en-US");
  assert.notEqual(english, key, `${key} is missing in English`);
  for (const locale of locales) {
    const text = i18n.translate(key, locale);
    assert.ok(text && text !== key, `${key} is missing in ${locale}`);
    assert.deepEqual(placeholders(text), placeholders(english), `${key} placeholders in ${locale}`);
    if (locale !== "en-US") assert.notEqual(text, english, `${key} is not translated in ${locale}`);
  }
}

// The parts are wired in: the content script in every Business Central frame, the panel in the
// build, the guide job in the library page, and the button in the review toolbar and library.
const manifest = JSON.parse(read("src/ui/manifest.json"));
const isolated = manifest.content_scripts.find(entry => entry.js.includes("content.js"));
assert.ok(isolated.js.includes("guide-overlay.js") && isolated.all_frames && !isolated.world);
const build = read("scripts/build.js");
for (const file of ["guide-overlay.js", "guide-panel.html", "guide-panel.js"]) assert.ok(build.includes(`"${file}"`), file);
const dashboardHtml = read("src/ui/dashboard.html");
assert.ok(dashboardHtml.indexOf('<script src="document/guide-steps.js"></script>') <
  dashboardHtml.indexOf('<script src="dashboard.js"></script>'));
assert.match(dashboardHtml, /<button id="reviewShowMe" data-review-command="guide"/u);
const dashboard = read("src/ui/dashboard.js");
assert.match(dashboard, /\["export-word", "run-test", "share-link", "show-me"\]/u);
assert.match(read("src/ui/document-library-view.js"), /data-library-action="show-me"/u);
const toolbarContext = { globalThis: {} };
vm.runInNewContext(read("src/review/review-toolbar.js"), toolbarContext);
const toolbar = toolbarContext.globalThis.T9ReviewToolbar;
assert.equal(toolbar.derive({ taskIds: ["a"], canExport: true }).guide, true);
assert.equal(toolbar.derive({ taskIds: [], canExport: true }).guide, false);
// The panel never takes the keyboard from Business Central when the guide moves on by itself.
const panel = read("src/ui/guide-panel.js");
assert.match(panel, /message\.type === "done" && !finished\(\)\) \{\s*lastDone = step\(\)\.number;\s*go\(index \+ 1\);/u);
// The ring in Business Central takes no clicks, and the guide changes nothing there.
const overlay = read("src/recorder/guide-overlay.js");
assert.match(overlay, /"pointer-events", "none", "important"/u);
assert.doesNotMatch(overlay, /\.click\(\)|\.value\s*=[^=]|dispatchEvent\(new (Mouse|Keyboard|Input)Event/u);
console.log(`Guide passed: ${guide.steps.length} steps, ${used.size} texts in ${locales.length} languages.`);
