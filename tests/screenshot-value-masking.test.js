// Screenshots in a bug report that masks values: the recorder measures where amounts, names
// and contact details are shown as each screenshot is taken, the report covers those regions
// (as the user adjusted them) in what it shows and sends, and the originals are kept.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
globalThis.T9TextFormat = require("../src/engine/text-format");
const languages = require("../src/engine/language-registry");
const regions = require("../src/recorder/capture-value-regions");
const redaction = require("../src/bug-report/screenshot-redaction");
const canonical = require("../src/engine/canonical-recording");
const model = require("../src/bug-report/bug-report-model");
const service = require("../src/bug-report/bug-report-service");
const workspaces = require("../src/bug-report/technical-report-workspace");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

// What is covered: amounts, names and contact details; not quantities, dates, codes or numbers.
const kinds = {
  "Direct Unit Cost Excl. VAT": "amount", "Amount Including VAT": "amount", "Balance (LCY)": "amount",
  "Line Discount Amount": "amount", "Belopp inkl. moms": "amount", "Betrag": "amount",
  "Montant TTC": "amount", "Importe": "amount", "Beløb": "amount", "Summa": "amount",
  "Vendor Name": "name", "Buy-from Vendor Name": "name", "Kundnamn": "name", "Contact": "name",
  "Nom": "name", "Navn": "name", "E-Mail": "contact", "Phone No.": "contact", "Telefon": "contact",
  "Sähköposti": "contact",
  "Quantity": null, "Document Date": null, "Status": null, "No.": null, "Vendor No.": null,
  "VAT Bus. Posting Group": null, "Gen. Prod. Posting Group": null, "Line Discount %": null,
  "Currency Code": null, "Description": null, "Activate": null, "Enterprise": null,
  "Location Code": null, "Item No.": null, "": null };
for (const [caption, kind] of Object.entries(kinds)) {
  assert.strictEqual(regions.kindOf(caption), kind, caption);
}

// Collecting from a page: each field with a value and a recognized caption becomes a region.
function fakeDocument() {
  const labels = { l1: "Direct Unit Cost Excl. VAT", l2: "Quantity", l3: "E-Mail",
    l4: "Vendor Name", l5: "Amount", l6: "Amount", l7: "Balance (LCY)", l8: "Total",
    l9: "Amount", l10: "Amount, shown in the currency of the document as calculated when the line was posted",
    l11: "Amount" };
  let row = 0;
  const field = (id, labelledBy, value, options = {}) => ({ id, tagName: options.tagName || "INPUT",
    value, textContent: value, children: options.children || [],
    getAttribute: name => name === "aria-labelledby" ? labelledBy : options.attributes?.[name] ?? null,
    closest: () => options.inside ? {} : null, querySelector: () => null,
    checkVisibility: () => !options.hidden,
    bounds: options.bounds || { x: 0.1, y: 0.05 * ++row, width: 0.3, height: 0.04 } });
  const fields = [field("f1", "l1", "125,00"), field("f2", "l2", "5"),
    field("f3", "l3", "anna@example.com"), field("f4", "l4", ""),
    // Ignored, unmeasurable, hidden, inside a command, not a number, too large, a duplicate,
    // under a description rather than a caption, and a group of elements.
    field("f5", "l5", "99,00", { inside: true }),
    field("f6", "l6", "10,00", { bounds: { x: 0, y: 0, width: 0, height: 0 } }),
    field("f7", "l7", "4 711,00", { hidden: true }),
    field("f8", "l8", "Dokumentkontroll", { tagName: "DIV" }),
    field("f9", "l9", "1 000,00", { bounds: { x: 0.6, y: 0.1, width: 0.3, height: 0.5 } }),
    field("f10", "l1", "125,00", { bounds: { x: 0.1, y: 0.05, width: 0.3, height: 0.04 } }),
    field("f11", "l10", "12,00"),
    field("f12", "l11", "12,00", { tagName: "DIV", children: [{}, {}] })];
  const heading = { tagName: "H1", textContent: "106014 · Fabrikam Ltd",
    getAttribute: () => null, bounds: { x: 0, y: 0.05, width: 0.4, height: 0.05 } };
  return { fields, querySelectorAll: selector => selector.includes("input:not") ? fields
    : selector.includes("heading") ? [heading] : [],
  getElementById: id => labels[id] ? { textContent: labels[id], getAttribute: () => null } : null };
}
const page = fakeDocument();
const found = regions.collect(page, element => element.bounds);
assert.deepStrictEqual(found.map(region => region.kind), ["amount", "contact", "name"],
  "only visible, field-sized values of the captioned kind count; the record caption names the record");
assert.deepStrictEqual(found[0], { x: 0.1, y: 0.05, width: 0.3, height: 0.04, kind: "amount" });
assert.strictEqual(regions.collect(page, element => element.bounds, 1).length, 1, "limited");

// The screenshot asset keeps what was measured; older assets have nothing measured.
let recording = canonical.create({ id: "shots", startedAt: "2026-11-06T10:00:00Z",
  recordingPurpose: "bug-report" });
recording = canonical.addEvent(recording, { id: "e1", type: "click", timestamp: "2026-11-06T10:00:01Z",
  raw: { eventNo: 1 } });
recording = canonical.addEvent(recording, { id: "e2", type: "click", timestamp: "2026-11-06T10:00:02Z",
  raw: { eventNo: 2 } });
recording = canonical.addScreenshot(recording, "e1", "data:image/png;base64,AA==",
  "2026-11-06T10:00:01Z", { valueRegions: found, valueRegionsComplete: true });
recording = canonical.addScreenshot(recording, "e2", "data:image/png;base64,AA==",
  "2026-11-06T10:00:02Z");
const [measuredAsset, olderAsset] = recording.assets;
assert.deepStrictEqual(measuredAsset.valueRegions, found);
assert.strictEqual(measuredAsset.valueRegionsComplete, true);
assert.ok(!("valueRegions" in olderAsset));
assert.strictEqual(redaction.measured(measuredAsset), true);
assert.strictEqual(redaction.measured(olderAsset), false);
assert.strictEqual(redaction.measured({ valueRegions: [], valueRegionsComplete: false }), false);

// Editing: measured regions can be removed and regions added; only that is stored.
const editable = redaction.editable(measuredAsset, {});
assert.deepStrictEqual(editable.map(item => [item.id, item.source, item.removed]),
  [["auto:0", "auto", false], ["auto:1", "auto", false], ["auto:2", "auto", false]]);
const screenshot = { assetId: measuredAsset.id, redactions: { removed: ["auto:1"],
  added: [{ id: "manual:a", x: 0.5, y: 0.5, width: 0.2, height: 0.1 }] } };
assert.deepStrictEqual(redaction.covered(measuredAsset, screenshot).map(item => item.id),
  ["auto:0", "auto:2", "manual:a"]);
assert.deepStrictEqual(redaction.covered(olderAsset, screenshot).map(item => item.id), ["manual:a"],
  "added regions cover screenshots that were never measured");
assert.deepStrictEqual(redaction.box({ x: 0.9, y: 0.9, width: 0.5, height: 0.5 }),
  { x: 0.9, y: 0.9, width: 0.1, height: 0.1 }, "kept inside the image");
assert.strictEqual(redaction.box({ x: 0.1, y: 0.1, width: 0, height: 0.2 }), null);
assert.deepStrictEqual(redaction.normalize({ removed: ["auto:1", "auto:1", "manual:a", "x"],
  added: [{ id: "manual:b", x: 0, y: 0, width: 0.1, height: 0.1 }, { x: 0, y: 0, width: 1, height: 1 }] }),
{ removed: ["auto:1"], added: [{ id: "manual:b", x: 0, y: 0, width: 0.1, height: 0.1 }] });

// The report stores the adjustments with its screenshot; undo restores the previous ones.
recording = canonical.finish(recording, "2026-11-06T10:01:00Z");
const created = service.createBugReportFromRecording(recording, [
  { taskId: "t1", instruction: "Välj **Bokför**.", sourceEventIds: ["e1"], screenshotAssetIds: [measuredAsset.id] }],
{ documentLanguage: "sv-SE", now: "2026-11-06T10:02:00Z" });
const assetId = measuredAsset.id;
assert.ok(created.evidence.screenshots.some(item => item.assetId === assetId));
const adjusted = model.updateScreenshotRedactions(created, assetId, {
  removed: ["auto:1", "manual:z"], added: [{ id: "manual:a", x: 0.5, y: 0.5, width: 0.2, height: 0.1 },
    { id: "manual:bad", x: 0.5, y: 0.5, width: 0, height: 0.1 }] });
assert.deepStrictEqual(adjusted.evidence.screenshots.find(item => item.assetId === assetId).redactions,
  { removed: ["auto:1"], added: [{ id: "manual:a", x: 0.5, y: 0.5, width: 0.2, height: 0.1 }] });
assert.throws(() => model.updateScreenshotRedactions(created, "missing", {}), /not found/);
const saved = [];
const workspace = workspaces.create({ report: created, store: { save: async report => {
  saved.push(report); return report; } } });
workspace.updateScreenshotRedactions(assetId, { removed: ["auto:0"], added: [] });
assert.deepStrictEqual(workspace.state().report.evidence.screenshots
  .find(item => item.assetId === assetId).redactions, { removed: ["auto:0"], added: [] });
assert.strictEqual(workspace.state().saveState, "unsaved");
workspace.undo();
assert.ok(!workspace.state().report.evidence.screenshots
  .find(item => item.assetId === assetId).redactions);
// Regenerating from the recording keeps the adjustments of each screenshot, once.
const regenerated = service.regenerate(adjusted, recording, [
  { taskId: "t1", instruction: "Välj **Bokför**.", sourceEventIds: ["e1"], screenshotAssetIds: [measuredAsset.id] }]);
const kept = regenerated.evidence.screenshots.filter(item => item.assetId === assetId);
assert.strictEqual(kept.length, 1);
assert.deepStrictEqual(kept[0].redactions, adjusted.evidence.screenshots
  .find(item => item.assetId === assetId).redactions);

// The recorder measures regions for bug reports only and keeps them with the screenshot.
const background = read("src/recorder/background.js");
assert.match(background, /collectValueRegions: Boolean\(options\.valueRegions\)/);
assert.match(background, /\{ valueRegions: itemSession\?\.recordingPurpose === "bug-report" \}/);
assert.match(background, /complete: hidden\.every\(result => Array\.isArray\(result\.value\?\.valueRegions\)\)/);
assert.match(background, /"capture-value-regions\.js"/);
const content = read("src/recorder/content.js");
assert.match(content, /if \(message\.collectValueRegions\)/);
assert.match(content, /!frameReachesTop\(\)/);
assert.match(read("src/engine/raw-event-persistence.js"), /createdAt, details = \{\}\)/);
const manifest = JSON.parse(read("src/ui/manifest.json"));
assert.ok(manifest.content_scripts.some(entry => entry.js.includes("capture-value-regions.js")));

// The report page covers regions before showing or exporting a screenshot and has an editor.
const pageScript = read("src/ui/technical-report.js");
assert.match(pageScript, /maskedSource\(report, assetId, media\.source\)/);
assert.match(pageScript, /throw new Error\(t\("technical\.maskingFailed"\)\)/);
assert.match(pageScript, /workspace\.updateScreenshotRedactions\(editing\.assetId/);
const html = read("src/ui/technical-report.html");
for (const id of ["redactionDialog", "redactionImage", "redactionStage", "redactionBoxes",
  "addRedaction", "resetRedactions", "saveRedactions", "cancelRedactions", "redactionUnmeasured"]) {
  assert.ok(html.includes(`id="${id}"`), id);
}
assert.match(html, /<dialog id="redactionDialog"[^>]*aria-labelledby="redactionTitle"/);
assert.match(html, /bug-report\/screenshot-redaction\.js/);

// Every interface language describes masking in screenshots and the editor.
const ui = vm.createContext({ T9LanguageRegistry: languages });
vm.runInContext(read("src/ui/i18n.js"), ui);
const keys = ["technical.maskValuesHelp", "technical.maskValuesNone", "technical.maskUnmeasured",
  "technical.adjustMasking", "technical.maskingTitle", "technical.maskingHelp", "technical.addBox",
  "technical.resetBoxes", "technical.done", "technical.boxCovered", "technical.boxShown",
  "technical.boxAdded", "technical.maskUnmeasuredImage", "technical.maskingFailed", "technical.cancel"];
for (const key of keys) {
  assert.ok(html.includes(`data-i18n="${key}"`) || pageScript.includes(`"${key}"`) ||
    read("src/ui/technical-report-workspace-view.js").includes(`"${key}"`), "used: " + key);
}
for (const { locale } of languages.supported("ui")) {
  for (const key of keys) {
    const value = ui.T9UiI18n.translate(key, locale);
    assert.notStrictEqual(value, key, locale + " " + key);
    if (locale !== "en-US" && key !== "technical.cancel") {
      assert.notStrictEqual(value, ui.T9UiI18n.translate(key, "en-US"), locale + " " + key);
    }
    if (/^technical\.box/u.test(key)) assert.ok(value.includes("{n}"), locale + " " + key);
  }
}
console.log("Screenshot value masking tests passed.");
