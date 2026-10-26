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
assert(dashboard.includes('uiTf("library.deleteCountConfirm"') &&
  dashboard.includes('uiTf("library.archiveCountConfirm"'));
{
  globalThis.T9LanguageRegistry = require("../src/engine/language-registry");
  require("../src/ui/i18n");
  assert.match(globalThis.T9UiI18n.translate("library.deleteCountConfirm", "sv-SE"),
    /kan inte ångras/u);
  assert.match(globalThis.T9UiI18n.translate("library.archiveCountConfirm", "sv-SE"),
    /kan ångras/u);
  for (const { locale } of globalThis.T9LanguageRegistry.supported("ui")) {
    for (const key of ["library.deleteCountConfirm", "library.archiveCountConfirm"]) {
      assert.notEqual(globalThis.T9UiI18n.translate(key, locale), key, `${key} ${locale}`);
    }
  }
}
assert(dashboard.includes("async function exportLibraryDocument") &&
  dashboard.includes("T9WordExportPipeline.create") &&
  dashboard.includes("T9DocumentBatchOperations.execute"));
assert(!dashboard.includes("const batchReviews ="),
  "batch export must never collect Review objects");
console.log("Document batch accessibility and integration tests passed.");
