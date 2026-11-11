// The library behaves like folders on the computer: browsing (All, Documentation, Bug reports)
// shows the documents in the folder shown (at the top, those not in a folder), while a search, a
// filter or Needs review, Favorites or Archived finds documents in that folder and every folder
// below it (at the top, everywhere).
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const folders = require("../src/document/document-folders");
const view = require("../src/ui/document-library-view");

const source = fs.readFileSync("src/ui/dashboard.js", "utf8");
const helpers = source.slice(source.indexOf("// Browsing shows the documents in the folder shown"),
  source.indexOf("function reviewProgressSummary(review)"));
assert.ok(helpers.includes("function libraryFinding(") && helpers.includes("function inLibraryFolder("));

let tree = folders.empty();
const old = folders.create(tree, { name: "Gammalt", createdAt: "2026-11-11T00:00:00Z" });
tree = old.tree;
const oldId = old.folder.folderId;
const sub = folders.create(tree, { name: "2025", parentId: oldId, createdAt: "2026-11-11T00:00:00Z" });
tree = sub.tree;
const subId = sub.folder.folderId;

const context = { globalThis: null, documentFolders: tree, libraryFolder: "",
  libraryQuickFilter: "all", libraryOptions: () => ({ search: "", filters: {} }) };
context.globalThis = { T9DocumentFolders: folders, T9DocumentLibraryView: view };
vm.createContext(context);
vm.runInContext(helpers, context);
const records = [{ projectId: "top" }, { projectId: "old", folderId: oldId },
  { projectId: "deep", folderId: subId }];
const shown = finding => records.filter(record => context.inLibraryFolder(record, finding))
  .map(record => record.projectId);
const finding = (search = "", quick = "all", filters = {}) =>
  context.libraryFinding({ search, filters }, quick);

// Browsing: All with no search or filter.
assert.strictEqual(finding(), false);
assert.deepStrictEqual(shown(false), ["top"], "the top shows only documents not in a folder");
context.libraryFolder = oldId;
assert.deepStrictEqual(shown(false), ["old"], "a folder shows only its own documents");
context.libraryFolder = subId;
assert.deepStrictEqual(shown(false), ["deep"]);

// Finding: a search, another quick filter or a filter reaches the folders below.
assert.strictEqual(finding("order"), true);
assert.strictEqual(finding("  "), false, "spaces are not a search");
assert.strictEqual(finding("", "documentation"), false, "Documentation splits the folder by kind");
assert.strictEqual(finding("", "bug-report"), false, "so does Bug reports");
for (const quick of ["review", "favourite", "archived"]) assert.strictEqual(finding("", quick), true, quick);
assert.strictEqual(finding("", "all", { favourite: true }), true);
context.libraryFolder = "";
assert.deepStrictEqual(shown(true), ["top", "old", "deep"], "at the top a search finds everything");
context.libraryFolder = oldId;
assert.deepStrictEqual(shown(true), ["old", "deep"], "in a folder a search covers its subfolders");

// The folder row no longer offers "Not in a folder"; documents all in folders say where they are.
assert.doesNotMatch(source, /LIBRARY_UNFILED|folder\.unfiled|folder\.emptyUnfiled/u);
assert.match(source, /\? uiT\("folder\.inFolders"\) : ""/u);
const context2 = { globalThis: {}, CustomEvent: class CustomEvent {} };
context2.window = context2.globalThis;
vm.createContext(context2);
for (const file of ["src/engine/locale-catalogs.js", "src/engine/language-registry.js", "src/ui/i18n.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context2, { filename: file });
}
const i18n = context2.globalThis.T9UiI18n;
const english = i18n.translate("folder.inFolders", "en-US");
for (const item of context2.globalThis.T9LanguageRegistry.DEFAULT_DEFINITIONS.filter(entry => entry.ui)) {
  const value = i18n.translate("folder.inFolders", item.locale);
  assert.ok(value && value !== "folder.inFolders", item.locale);
  if (item.locale !== "en-US") assert.notStrictEqual(value, english, `${item.locale} is translated`);
  assert.strictEqual(i18n.translate("folder.unfiled", item.locale), "folder.unfiled",
    `${item.locale} no longer has Not in a folder`);
}
console.log("Library folder browsing tests passed in all registered languages.");
