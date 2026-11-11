// Moving documents between folders: while documents are dragged the folder row offers every
// folder in the library and the top level, and the move dialog can make a new folder and move
// the documents into it with one save.
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const folders = require("../src/document/document-folders");
const library = require("../src/document/document-library");

const source = fs.readFileSync("src/ui/dashboard.js", "utf8");
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
const slice = (from, to) => {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, from);
  return source.slice(start, end);
};

let tree = folders.empty();
const old = folders.create(tree, { name: "Gammalt", createdAt: "2026-11-11T00:00:00Z" });
tree = old.tree;
const sub = folders.create(tree, { name: "2025", parentId: old.folder.folderId,
  createdAt: "2026-11-11T00:00:00Z" });
tree = sub.tree;
const oldId = old.folder.folderId;

const saved = [];
const context = {
  globalThis: { T9DocumentFolders: folders, T9DocumentLibrary: library },
  documentFolders: tree, libraryFolder: oldId, applicationSettings: { uiLocale: "sv-SE" },
  documentLibraryRecords: [
    library.normalize({ projectId: "a", title: "A", folderId: oldId }),
    library.normalize({ projectId: "b", title: "B", folderId: oldId }),
    library.normalize({ projectId: "c", title: "C" })],
  uiT: key => key, rebuilt: 0,
  saveLibraryFolders: async (next, records) => { saved.push({ next, records }); }
};
context.rebuildDocumentLibraryIndex = () => { context.rebuilt++; };
vm.createContext(context);
vm.runInContext(slice("let libraryDragRow = null;", "function showLibraryDragTargets") +
  slice("async function moveLibraryDocumentsToNewFolder", '$("libraryMoveForm").addEventListener("submit"') +
  "this.read = () => ({ documentFolders, documentLibraryRecords });", context);

// Every folder is a target, by its full path; the folder the documents are in is left out.
const targets = drag => [...context.libraryDragTargets(drag)].map(item => `${item.kind}:${item.name}`);
assert.deepStrictEqual(targets({ kind: "documents", ids: ["a", "b"] }),
  ["top:folder.allDocuments", "target:Gammalt / 2025"]);
assert.deepStrictEqual(targets({ kind: "documents", ids: ["c"] }),
  ["target:Gammalt", "target:Gammalt / 2025"], "documents at the top can go to any folder");
assert.deepStrictEqual(targets({ kind: "documents", ids: ["a", "c"] }),
  ["top:folder.allDocuments", "target:Gammalt", "target:Gammalt / 2025"],
  "documents from different places can go anywhere");
assert.match(source, /if \(libraryDrag\?\.kind !== "documents"\) return;/u,
  "a dragged folder keeps the usual row");
assert.match(source, /hideLibraryDragTargets\(\);\n\}\);/u, "the usual row returns when the drag ends");

(async () => {
  // A new folder is made in the folder shown and the documents move into it in one save.
  const result = await context.moveLibraryDocumentsToNewFolder(["a", "c"], " Avtal ");
  assert.strictEqual(result.moved, 2);
  assert.strictEqual(saved.length, 1, "the folder and the documents are saved together");
  const state = context.read();
  const made = folders.find(state.documentFolders, result.folderId);
  assert.strictEqual(made.name, "Avtal");
  assert.strictEqual(made.parentId, oldId);
  assert.deepStrictEqual([...state.documentLibraryRecords].map(record =>
    folders.folderOf(state.documentFolders, record)), [result.folderId, oldId, result.folderId]);
  assert.strictEqual(saved[0].records, state.documentLibraryRecords);
  assert.strictEqual(context.rebuilt, 1);

  // Nothing changes when the name is taken or saving fails.
  const before = context.read();
  await assert.rejects(context.moveLibraryDocumentsToNewFolder(["b"], "2025"),
    error => error.code === "nameExists");
  context.saveLibraryFolders = async () => { throw new Error("offline"); };
  await assert.rejects(context.moveLibraryDocumentsToNewFolder(["b"], "Nytt"), /offline/u);
  assert.strictEqual(context.read().documentFolders, before.documentFolders);
  assert.strictEqual(context.read().documentLibraryRecords, before.documentLibraryRecords);

  // The dialog offers the new folder only for documents, with a name field.
  assert.match(source, /const canCreate = !libraryMoveFolderId && documentFoldersEditable;/u);
  assert.match(html, /id="libraryMoveNewField"[^>]*hidden><span data-i18n="folder\.nameLabel">/u);
  assert.match(html, /id="libraryMoveNewName"[^>]*\n\s*aria-describedby="libraryMoveError"/u);

  // The drop row's name exists in every registered language.
  const ui = { globalThis: {}, CustomEvent: class CustomEvent {} };
  ui.window = ui.globalThis;
  vm.createContext(ui);
  for (const file of ["src/engine/locale-catalogs.js", "src/engine/language-registry.js", "src/ui/i18n.js"]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), ui, { filename: file });
  }
  const i18n = ui.globalThis.T9UiI18n;
  const english = i18n.translate("folder.dropTargets", "en-US");
  for (const item of ui.globalThis.T9LanguageRegistry.DEFAULT_DEFINITIONS.filter(entry => entry.ui)) {
    for (const key of ["folder.dropTargets", "folder.newTitle", "folder.nameLabel"]) {
      const value = i18n.translate(key, item.locale);
      assert.ok(value && value !== key, `${item.locale} ${key}`);
    }
    if (item.locale !== "en-US") {
      assert.notStrictEqual(i18n.translate("folder.dropTargets", item.locale), english, item.locale);
    }
  }
  console.log("Library folder move tests passed in all registered languages.");
})().catch(error => { console.error(error); process.exit(1); });
