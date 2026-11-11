// The usability pass: first use, the library cards, the test run, the review, the bug report and
// the license page say what to do in every registered language and leave out what is not needed.
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const read = file => fs.readFileSync(file, "utf8");

const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
context.window = context.globalThis;
vm.createContext(context);
for (const file of ["src/engine/locale-catalogs.js", "src/engine/language-registry.js", "src/ui/i18n.js"]) {
  vm.runInContext(read(file), context, { filename: file });
}
const i18n = context.globalThis.T9UiI18n;
const registry = context.globalThis.T9LanguageRegistry;
const locales = registry.DEFAULT_DEFINITIONS.filter(item => item.ui).map(item => item.locale);
assert.strictEqual(locales.length, 8);

// New and changed keyed texts exist in every language, with the same placeholders.
const placeholders = value => [...value.matchAll(/\{(\w+)\}/gu)].map(match => match[1]).sort().join();
for (const key of ["technical.noScreenshots", "test.notesSummary", "test.nextNotRun", "test.intro",
  "license.cardUnknown", "license.knownTenant", "license.tenant", "license.refresh",
  "license.consultant", "license.header", "document.synchronized"]) {
  const english = i18n.translate(key, "en-US");
  assert.notStrictEqual(english, key, `${key} in English`);
  for (const locale of locales) {
    const value = i18n.translate(key, locale);
    assert.ok(value && value !== key, `${key} in ${locale}`);
    assert.strictEqual(placeholders(value), placeholders(english), `${key} placeholders in ${locale}`);
    if (locale !== "en-US") assert.notStrictEqual(value, english, `${key} is translated in ${locale}`);
  }
}
// The old wording that promised a reviewed document or a synchronization is gone.
assert.doesNotMatch(i18n.translate("test.intro", "en-US"), /reviewed/u);
assert.doesNotMatch(i18n.translate("document.synchronized", "en-US"), /synchroni/u);

// English-keyed texts shown by the library, the review and the bug report, in every language.
for (const english of ["Get started", "Open Business Central in the browser.",
  "Select BC Process Studio in the browser toolbar.",
  "Choose Document a process or Report an issue and do the work in Business Central.",
  "When you finish the recording, the document appears here. Documents from another computer can be brought in with Import or Sync.",
  "Reset zoom to 100%", "What happened instead?", "Your Business Central license",
  "Business Central environment", "Check the license again", "For consultants and administrators",
  "No license checked yet", "Open Business Central to check the license for the first time."]) {
  for (const locale of locales.filter(locale => !["en-US", "sv-SE"].includes(locale))) {
    assert.notStrictEqual(registry.translate(english, locale, english), english,
      `${english} in ${locale}`);
  }
}

// First use: the library gives the steps to the first document in the interface language,
// and the tools that work on documents are left out until there is one.
const libraryView = require("../src/ui/document-library-view");
for (const locale of locales) {
  const container = { innerHTML: "" };
  libraryView.renderList(container, [], { locale, storedCount: 0 });
  assert.ok(container.innerHTML.includes("library-first-run") &&
    (container.innerHTML.match(/<li>/gu) || []).length === 3, locale);
}
const dashboardHtml = read("src/ui/dashboard.html");
assert.match(dashboardHtml, /\.library-empty-store \.library-primary-controls,\.library-empty-store \.library-quick-row,\.library-empty-store #libraryFolders,\.library-empty-store #libraryExport/u);
assert.match(read("src/ui/dashboard.js"),
  /\$\("documentsView"\)\.classList\.toggle\("library-empty-store", !documentLibraryRecords\.length\)/u);

// The library heading, tools, folders and count stay in view while the documents scroll beneath
// them; continue-where-you-left-off and test suites scroll with the documents.
const headStart = dashboardHtml.indexOf('<div id="libraryHead" class="library-head">');
const headEnd = dashboardHtml.indexOf('id="libraryStatus"');
assert.ok(headStart > 0 && headStart < dashboardHtml.indexOf('id="documentLibraryTitle"') &&
  dashboardHtml.indexOf('id="librarySearch"') < headEnd);
assert.ok(dashboardHtml.indexOf('id="libraryContinue"') > headEnd &&
  dashboardHtml.indexOf('id="libraryContinue"') < dashboardHtml.indexOf('id="libraryResults"'));
assert.match(dashboardHtml, /\.library-head\{position:sticky;top:var\(--home-appbar-height,0px\)/u);
assert.match(dashboardHtml, /@media \(max-height:600px\),\(max-width:640px\)\{\.library-head\{position:static/u);
// Selecting several documents shows the batch actions at the bottom of the heading, above the
// list; in a small window only they stay in view.
const batchAt = dashboardHtml.indexOf('<div id="libraryBatchToolbar"');
assert.ok(batchAt > headEnd && batchAt < dashboardHtml.indexOf('id="libraryContinue"'));
assert.match(read("src/ui/design-system.css"), /\.library-batch-toolbar\{position:static;/u);
assert.match(dashboardHtml, /\.library-head:has\(#libraryBatchToolbar:not\(\[hidden\]\)\)\{position:sticky;top:calc\(var\(--home-appbar-height,0px\) - var\(--library-batch-offset,0px\)\)\}/u);
assert.match(read("src/ui/dashboard.js"), /root\.setProperty\("--library-head-height", `\$\{head\.offsetHeight\}px`\);/u);

// In Select several a click anywhere on a row marks or unmarks it; the checkbox label is not
// counted twice, and the row shows that it can be clicked.
const dashboardJs = read("src/ui/dashboard.js");
assert.match(dashboardJs, /if \(!selectionControl && event\.target\.closest\?\.\("\.library-select"\)\) return;/u);
assert.match(dashboardJs, /toggle: Boolean\(selectionControl \|\| librarySelectMode \|\| event\.ctrlKey \|\| event\.metaKey\)/u);
assert.match(dashboardHtml, /\.library-results\[data-select-mode=true\] \.library-card\{cursor:pointer;user-select:none\}/u);
const batch = require("../src/document/document-batch-operations");
let picked = batch.select(batch.clear(), ["a", "b", "c"], "a", { toggle: true });
picked = batch.select(picked, ["a", "b", "c"], "b", { toggle: true });
assert.deepStrictEqual([...picked.selectedIds], ["a", "b"]);
picked = batch.select(picked, ["a", "b", "c"], "a", { toggle: true });
assert.deepStrictEqual([...picked.selectedIds], ["b"]);

// The rows share their columns, so status, star and buttons line up and each button is as wide as
// the widest in its column, in every language.
const designCss = read("src/ui/design-system.css");
assert.match(designCss, /\.library-results\{grid-template-columns:minmax\(0,1fr\) repeat\(5,auto\);/u);
assert.match(designCss, /\.library-results>\.library-card\{grid-template-columns:subgrid;/u);
assert.match(designCss, /\.library-results>\.library-card>\.library-card-footer\{display:contents\}/u);
assert.match(designCss, /\[data-library-action="open"\]\{grid-column:5;justify-self:stretch\}/u);
assert.match(designCss, /\.library-results>\.library-card>\.library-state\{grid-column:2;justify-self:stretch;box-sizing:border-box;text-align:center;/u);

// Library cards: the company is not repeated as a tag, and a reviewed document offers Run test.
const record = { projectId: "p", title: "Order", tags: ["CRONUS", "Sales"],
  metadata: { company: "CRONUS" }, documentLanguage: "sv-SE", modifiedAt: "2026-11-11T00:00:00Z" };
const newCard = libraryView.card(record, false, false, "en-US", { total: 3, approved: 0 });
assert.ok(!newCard.includes("<span>CRONUS</span></div>") && newCard.includes("<span>Sales</span>"));
assert.ok(!/library-card-footer[\s\S]*data-library-action="run-test"[\s\S]*data-library-menu/u.test(newCard),
  "an unreviewed document keeps Run test in its menu");
assert.ok(newCard.includes('data-library-action="run-test"'));
// A documentation card always offers Open documentation; its status chip says whether it is reviewed.
for (const locale of locales) {
  const labels = new Set([{ total: 3, approved: 0 }, { total: 3, approved: 1 },
    { total: 3, approved: 3 }].map(progress => libraryView.card(record, false, false, locale, progress)
    .match(/data-library-action="open"\s*>([^<]+)<\/button>/u)[1]));
  assert.strictEqual(labels.size, 1, locale);
  const expected = locale === "sv-SE" ? "Öppna dokumentation"
    : registry.translate("Open documentation", locale, "Open documentation");
  assert.ok(labels.has(expected), `${locale}: ${[...labels]}`);
  if (!["sv-SE", "en-US"].includes(locale)) assert.notStrictEqual(expected, "Open documentation", locale);
}
// The language badge comes first in the details, so it lines up from row to row.
assert.match(newCard, /<div class="library-card-meta">\s*<span class="library-language"/u);
const readyCard = libraryView.card(record, false, false, "fr-FR", { total: 3, approved: 3 });
assert.ok(/data-library-action="run-test">[^<]+<\/button>\s*<button class="secondary" data-library-action="open"/u.test(readyCard),
  "a reviewed document shows Run test on the card");
assert.strictEqual((readyCard.match(/data-library-action="run-test"/gu) || []).length, 1);
assert.match(read("src/ui/dashboard.js"),
  /\.library-card-footer \[data-library-action="run-test"\]/u);

// One product name in the popup; one primary way to start; no disabled sign-in outside BC.
const popupHtml = read("src/ui/popup.html");
assert.ok(popupHtml.includes("<title>BC Process Studio</title>"));
assert.ok(popupHtml.includes('<button id="startProcess" class="primary mode-card">') &&
  popupHtml.includes('<button id="startBug" class="mode-card">'));
assert.match(read("src/ui/popup.js"), /\$\("licenseCardAction"\)\.hidden = !tenantId;/u);

// The review: autosave replaces Save, and the open step is approved with Approve and next.
assert.match(dashboardHtml, /<button id="saveReview"[^>]* hidden>Spara<\/button>/u);
assert.match(dashboardHtml,
  /\.review-card\[data-active-step=true\]:not\(\[data-review-state=approved\]\) \.review-approve-action\{display:none\}/u);
// The document toolbar shows the zoom once.
assert.match(dashboardHtml, /<output id="documentZoomValue" class="sr-only"/u);
assert.match(read("src/ui/dashboard.js"), /\$\("documentResetZoom"\)\.textContent = `\$\{zoom\}%`;/u);

// The test run: the result first, notes in a disclosure, a way to the next step not tested.
const testRun = read("src/ui/test-run.js");
assert.match(testRun, /const notes = element\("details", "run-step-notes"\);/u);
assert.match(testRun, /row\.append\(status\);\s*item\.append\(row, notes\);/u);
assert.match(testRun, /step\.expected\.trim\(\) \|\| step\.comment\.trim\(\) \|\| step\.status === "failed"/u);
assert.match(testRun, /notesOpen: Boolean\(item\.querySelector\("\.run-step-notes"\)\?\.open\)/u);
assert.match(testRun, /t\("test\.nextNotRun"\)/u);

// The license page: consultants' sign-in is in its own disclosure.
const licenseHtml = read("src/ui/license-status.html");
assert.match(licenseHtml, /<details id="consultantSection" class="consultant-section">\s*<summary><h2 id="consultantTitle"/u);
assert.match(read("src/ui/license-status.js"), /if \(result\.signedIn\) \$\("consultantSection"\)\.open = true;/u);
console.log("Usability pass tests passed in all registered languages.");
