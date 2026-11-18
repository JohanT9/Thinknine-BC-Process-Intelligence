const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.html"), "utf8");
const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.js"),
  "utf8");
assert(html.includes('id="libraryBatchToolbar"') &&
  html.includes('role="toolbar"') && html.includes('aria-label="Batchåtgärder"'));
assert(html.includes('id="libraryBatchStatus"') && html.includes('aria-live="polite"'));
assert(html.includes('id="libraryBatchProgress"') &&
  html.includes('aria-label="Batchförlopp"'));
assert(html.includes('id="libraryBatchMetadataDialog"') &&
  html.includes('aria-labelledby="libraryBatchMetadataTitle"'));
assert(html.includes('role="list"') && !html.includes('role="listbox"'),
  "interactive cards must use list semantics rather than nested listbox options");
assert(dashboard.includes('event.shiftKey') && dashboard.includes('event.metaKey') &&
  dashboard.includes('event.ctrlKey'));
assert(dashboard.includes('event.key === "Escape"') &&
  dashboard.includes('event.key.toLowerCase() === "a"'));
assert(dashboard.includes('$("libraryBatchMetadataDialog").returnValue = ""'),
  "a cancelled reopened dialog must never reuse a previous apply result");
// Destructive and reversible batch actions say so, in every UI language.
// Deleting is confirmed in the library's own dialog, which says the deletion is permanent.
assert(dashboard.includes('await confirmLibraryDelete(selectedLibraryRecords())') &&
  dashboard.includes('"library.deleteDocumentsBody"') &&
  dashboard.includes('uiTf("library.archiveCountConfirm"'));
{
  globalThis.T9LanguageRegistry = require("../src/engine/language-registry");
  require("../src/ui/i18n");
  assert.match(globalThis.T9UiI18n.translate("library.deleteDocumentsBody", "sv-SE"),
    /går inte att ångra/u);
  assert.match(globalThis.T9UiI18n.translate("library.archiveCountConfirm", "sv-SE"),
    /kan ångras/u);
  for (const { locale } of globalThis.T9LanguageRegistry.supported("ui")) {
    for (const key of ["library.deleteDocumentsTitle", "library.deleteDocumentsBody",
      "library.deleteDocumentTitle", "library.deleteDocumentBody", "library.deleteConfirm",
      "library.archiveCountConfirm"]) {
      assert.notEqual(globalThis.T9UiI18n.translate(key, locale), key, `${key} ${locale}`);
    }
  }
}
// Tags, template and author are changed in one dialog, from one menu entry. Tags are added
// and removed rather than replaced; status and archive state are not edited there (the
// Archive button restores when every selected document is archived).
for (const id of ["libraryBatchTags", "libraryBatchTheme", "libraryBatchUseTags",
  "libraryBatchTagsValue", "libraryBatchUseStatus", "libraryBatchStatusValue",
  "libraryBatchUseArchived", "libraryBatchArchivedValue", "libraryBatchUseTheme",
  "libraryBatchUseAuthor"]) {
  assert(!html.includes(`id="${id}"`), `${id} is gone`);
  assert(!dashboard.includes(`"${id}"`), `${id} is not used`);
}
assert(html.includes('id="libraryBatchMetadata" class="secondary" data-i18n="library.batchEdit"'));
for (const id of ["libraryBatchAddTagsValue", "libraryBatchRemoveTagsList",
  "libraryBatchNoTags", "libraryBatchThemeValue", "libraryBatchAuthorValue"]) {
  assert(html.includes(`id="${id}"`), `${id} is in the dialog`);
}
assert(html.includes('aria-describedby="libraryBatchAddTagsHint"'));
// Tags and template names are the user's own words; the interface must not translate them.
assert(html.includes('id="libraryBatchRemoveTagsList" class="library-batch-tag-list" data-i18n-ignore') &&
  html.includes('id="libraryBatchThemeValue" data-i18n-ignore'));
assert(dashboard.includes('uiT("library.batchKeepTemplate")'),
  "the template choice starts with keeping the current template");
assert(dashboard.includes('"library.batchRestore" : "Arkivera"') &&
  dashboard.includes('restore ? "library.batchRestored" : "library.batchArchived"'));
{
  const keys = ["library.batchEdit", "library.batchEditDescription", "library.batchAddTags",
    "library.batchAddTagsPlaceholder", "library.batchAddTagsHint", "library.batchRemoveTags",
    "library.batchNoTags", "library.batchTagUsage", "library.batchAuthor",
    "library.batchKeepAuthor", "library.batchKeepTemplate", "library.batchRestore",
    "library.batchRestored", "library.noMetadataChanges", "library.batchMetadataUpdated"];
  const english = Object.fromEntries(keys.map(key =>
    [key, globalThis.T9UiI18n.translate(key, "en-US")]));
  for (const { locale } of globalThis.T9LanguageRegistry.supported("ui")) {
    for (const key of keys) {
      const text = globalThis.T9UiI18n.translate(key, locale);
      assert.notEqual(text, key, `${key} ${locale}`);
      if (locale !== "en-US") assert.notEqual(text, english[key], `${key} is translated for ${locale}`);
    }
    for (const key of ["library.batchEditDescription", "library.batchRestored",
      "library.batchMetadataUpdated"]) {
      assert(globalThis.T9UiI18n.format(key, { count: 3 }, locale).includes("3"), `${key} ${locale}`);
    }
    assert.match(globalThis.T9UiI18n.format("library.batchTagUsage",
      { count: 2, total: 5 }, locale), /2.*5/u, `usage ${locale}`);
  }
}
assert(dashboard.includes("async function exportLibraryDocument") &&
  dashboard.includes("T9WordExportPipeline.create") &&
  dashboard.includes("T9DocumentBatchOperations.execute"));
assert(!dashboard.includes("const batchReviews ="),
  "batch export must never collect Review objects");
console.log("Document batch accessibility and integration tests passed.");
