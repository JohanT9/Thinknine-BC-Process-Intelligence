"use strict";
// Dela länk: every text of the share dialog exists in every registered interface language,
// with the same placeholders, and every key the page and the dialog use is defined.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
for (const file of ["src/engine/locale-catalogs.js", "src/engine/language-registry.js", "src/ui/i18n.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}
const i18n = context.globalThis.T9UiI18n;
const registry = context.globalThis.T9LanguageRegistry;
const locales = registry.supported("ui").map(language => language.locale);
assert.equal(locales.length, 8);

const html = fs.readFileSync(path.join(root, "src/ui/dashboard.html"), "utf8");
const script = fs.readFileSync(path.join(root, "src/ui/dashboard.js"), "utf8");
const panelHtml = fs.readFileSync(path.join(root, "src/ui/recording-panel.html"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/recording-panel.js"), "utf8");
const used = new Set([html, panelHtml].flatMap(text => [...text.matchAll(/data-i18n="(share\.[\w]+)"/gu)])
  .concat([script, panel].flatMap(text => [...text.matchAll(/"(share\.[\w]+)"/gu)]))
  .map(match => match[1]));
assert.ok(used.size >= 30, `share keys in use: ${used.size}`);

const placeholders = text => [...String(text).matchAll(/\{(\w+)\}/gu)].map(match => match[1]).sort();
// Words that are the same in English and the language, as Microsoft writes them.
const sameAsEnglish = new Set(["de-DE|share.linkLabel", "da-DK|share.linkLabel"]);
for (const key of used) {
  const english = i18n.translate(key, "en-US");
  assert.notEqual(english, key, `${key} is missing in English`);
  for (const locale of locales) {
    const text = i18n.translate(key, locale);
    assert.ok(text && text !== key, `${key} is missing in ${locale}`);
    assert.deepEqual(placeholders(text), placeholders(english), `${key} placeholders in ${locale}`);
    if (locale !== "en-US" && !sameAsEnglish.has(`${locale}|${key}`)) {
      assert.notEqual(text, english, `${key} is not translated in ${locale}`);
    }
  }
}
// The dialog states where the file goes and who can read it before anything is shared.
for (const locale of locales) {
  assert.match(i18n.translate("share.intro", locale), /OneDrive/u);
  assert.match(i18n.translate("share.intro", locale), /BC Process Studio/u);
  assert.match(i18n.format("share.meta", { date: "1", file: "OneDrive › BC Process Studio › A.docx" }, locale),
    /A\.docx/u);
}
// The dialog is a native dialog with an accessible name, and the share scripts are loaded.
assert.match(html, /<dialog id="documentShareDialog"[^>]*aria-labelledby="documentShareTitle"/u);
for (const file of ["engine/tenant-license-config.js", "bug-report/outlook-draft.js", "document/onedrive-share.js"]) {
  assert.ok(html.indexOf(`<script src="${file}"></script>`) < html.indexOf('<script src="dashboard.js"></script>'), file);
}
// Share link starts from the review toolbar, a document in the library and the recording panel.
assert.match(html, /<button id="reviewShareLink" data-review-command="share"/u);
assert.doesNotMatch(html, /id="documentShareLink"/u);
assert.match(fs.readFileSync(path.join(root, "src/ui/document-library-view.js"), "utf8"), /data-library-action="share-link"/u);
assert.match(panelHtml, /<button id="rpShareAction"/u);
const toolbarContext = { globalThis: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "src/review/review-toolbar.js"), "utf8"), toolbarContext);
const toolbar = toolbarContext.globalThis.T9ReviewToolbar;
assert.equal(toolbar.derive({ taskIds: ["a"], canExport: true }).share, true);
assert.equal(toolbar.derive({ taskIds: [], canExport: true }).share, false);
assert.equal(toolbar.derive({ taskIds: ["a"], canExport: false }).share, false);
console.log(`Share dialog texts passed in ${locales.length} languages (${used.size} texts).`);
