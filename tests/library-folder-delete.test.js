// Removing a folder: an empty folder is removed after one question; a folder with content
// offers to keep the content, which moves to the folder above, or to delete the folder with its
// subfolders and documents for good. A document that cannot be deleted keeps the folders.
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const folders = require("../src/document/document-folders");
const library = require("../src/document/document-library");

const read = file => fs.readFileSync(file, "utf8");
const source = read("src/ui/dashboard.js");
const slice = (from, to) => {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, from);
  return source.slice(start, end);
};

const at = "2026-11-11T00:00:00Z";
let tree = folders.empty();
const old = folders.create(tree, { name: "Gammalt", createdAt: at });
tree = old.tree;
const sub = folders.create(tree, { name: "2025", parentId: old.folder.folderId, createdAt: at });
tree = sub.tree;
const deep = folders.create(tree, { name: "Q1", parentId: sub.folder.folderId, createdAt: at });
tree = deep.tree;
const other = folders.create(tree, { name: "Annat", createdAt: at });
tree = other.tree;
const empty = folders.create(tree, { name: "Tom", createdAt: at });
tree = empty.tree;
const records = [
  library.normalize({ projectId: "a", title: "A", folderId: old.folder.folderId }),
  library.normalize({ projectId: "b", title: "B", folderId: sub.folder.folderId, archived: true }),
  library.normalize({ projectId: "c", title: "C" }),
  library.normalize({ projectId: "d", title: "D", folderId: other.folder.folderId })
];

// What a folder holds counts the folders below it too.
const content = folders.contents(tree, old.folder.folderId, records);
assert.deepStrictEqual([...content.projectIds], ["a", "b"]);
assert.strictEqual(content.archived, 1);
assert.strictEqual(content.subfolders, 2);
assert.strictEqual(content.empty, false);
assert.strictEqual(folders.contents(tree, empty.folder.folderId, records).empty, true);
assert.strictEqual(folders.contents(tree, sub.folder.folderId, []).empty, false,
  "a folder with a subfolder is not empty");

// Removing with the content takes the whole branch and nothing else.
const pruned = folders.removeWithContents(tree, old.folder.folderId);
assert.deepStrictEqual(pruned.folders.map(folder => folder.name).sort(), ["Annat", "Tom"]);
assert.strictEqual(tree.folders.length, 5, "the tree it was given is unchanged");
assert.throws(() => folders.removeWithContents(tree, "missing"), /missing/u);

// The dialog: the safe choice comes first and is chosen; the permanent one says so.
const html = read("src/ui/dashboard.html");
const choice = html.slice(html.indexOf('<fieldset id="libraryFolderDeleteChoice"'),
  html.indexOf("</fieldset>", html.indexOf('<fieldset id="libraryFolderDeleteChoice"')));
assert.ok(choice.includes(" hidden>"), "an empty folder shows no choice");
assert.ok(choice.indexOf('value="keep" checked') > 0 &&
  choice.indexOf('value="keep"') < choice.indexOf('value="all"'));

// Every new text exists in every registered language, translated, with the same placeholders.
const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
context.window = context.globalThis;
vm.createContext(context);
for (const file of ["src/engine/locale-catalogs.js", "src/engine/language-registry.js", "src/ui/i18n.js"]) {
  vm.runInContext(read(file), context, { filename: file });
}
const i18n = context.globalThis.T9UiI18n;
const locales = context.globalThis.T9LanguageRegistry.DEFAULT_DEFINITIONS
  .filter(item => item.ui).map(item => item.locale);
assert.strictEqual(locales.length, 8);
const placeholders = value => [...value.matchAll(/\{(\w+)\}/gu)].map(match => match[1]).sort().join();
for (const key of ["folder.deleteEmpty", "folder.deleteContains", "folder.deleteContentDocuments",
  "folder.deleteContentArchived", "folder.deleteContentSubfolders", "folder.deleteChoice",
  "folder.deleteKeep", "folder.deleteAll", "folder.deleteAllHint", "folder.deleteAllConfirm",
  "folder.deleteProgress", "folder.deleteAllFailed", "folder.deletedAll", "folder.deletedEmpty"]) {
  const english = i18n.translate(key, "en-US");
  assert.notStrictEqual(english, key, key);
  for (const locale of locales) {
    const value = i18n.translate(key, locale);
    assert.ok(value && value !== key, `${key} in ${locale}`);
    assert.strictEqual(placeholders(value), placeholders(english), `${key} placeholders in ${locale}`);
    if (locale !== "en-US") assert.notStrictEqual(value, english, `${key} in ${locale}`);
  }
}
for (const locale of locales) {
  assert.match(i18n.translate("folder.deleteAllHint", locale), /\S\.$/u, locale);
}

// Deleting with the content: the documents go first, one at a time, then the folders.
const element = () => ({ textContent: "", disabled: false, closed: 0, close() { this.closed++; } });
function run(failOn) {
  const elements = {};
  const controls = [element(), element(), element()];
  const sent = [];
  const saved = [];
  const state = {
    globalThis: { T9DocumentFolders: folders },
    documentFolders: tree, documentLibraryRecords: records, libraryFolderDeleting: false,
    uiT: key => key, uiTf: (key, values) => `${key} ${JSON.stringify(values)}`,
    $: id => {
      elements[id] ||= element();
      if (id === "libraryFolderDeleteForm") elements[id].querySelectorAll = () => controls;
      return elements[id];
    },
    send: async message => {
      sent.push(message.sessionId);
      return message.sessionId === failOn ? { ok: false, error: "Lagringen svarar inte." } : { ok: true };
    },
    saveLibraryFolders: async next => { saved.push(next); },
    loaded: 0, opened: [], announced: [],
    folderErrorText: () => "folder.saveFailed"
  };
  state.loadSessions = async () => { state.loaded++; };
  state.openLibraryFolder = id => state.opened.push(id);
  state.announceLibraryFolders = message => state.announced.push(message);
  vm.createContext(state);
  vm.runInContext(slice("async function deleteLibraryFolderWithContents",
    '$("libraryFolderDeleteForm").addEventListener("submit"') +
    "this.remove = deleteLibraryFolderWithContents;" +
    "this.read = () => ({ documentFolders, libraryFolderDeleting });", state);
  return { state, elements, controls, sent, saved };
}

(async () => {
  const done = run("");
  await done.state.remove(folders.find(tree, old.folder.folderId));
  assert.deepStrictEqual(done.sent, ["a", "b"], "only the documents in the branch are deleted");
  assert.strictEqual(done.saved.length, 1);
  assert.deepStrictEqual(done.state.read().documentFolders.folders.map(folder => folder.name).sort(),
    ["Annat", "Tom"]);
  assert.strictEqual(done.state.loaded, 1, "the library is read again");
  assert.strictEqual(done.elements.libraryFolderDeleteDialog.closed, 1);
  assert.deepStrictEqual([...done.state.opened], [""], "the folder above is shown");
  assert.match(done.state.announced[0], /^folder\.deletedAll .*"count":2/u);
  assert.ok(done.controls.every(control => !control.disabled));
  assert.strictEqual(done.state.read().libraryFolderDeleting, false);

  // A document that cannot be deleted stops the deletion; the folders stay and the dialog says
  // how many documents were deleted.
  const failed = run("b");
  await failed.state.remove(folders.find(tree, old.folder.folderId));
  assert.deepStrictEqual(failed.sent, ["a", "b"]);
  assert.strictEqual(failed.saved.length, 0, "the folders are kept");
  assert.strictEqual(failed.state.read().documentFolders, tree);
  assert.strictEqual(failed.elements.libraryFolderDeleteDialog?.closed || 0, 0, "the dialog stays open");
  assert.match(failed.elements.libraryFolderDeleteError.textContent,
    /^Lagringen svarar inte\. folder\.deleteAllFailed .*"count":1/u);
  assert.strictEqual(failed.elements.libraryFolderDeleteProgress.textContent, "");
  assert.strictEqual(failed.state.loaded, 1, "the deleted document leaves the library");
  assert.ok(failed.controls.every(control => !control.disabled), "the dialog can be used again");

  console.log("Library folder delete tests passed in all registered languages.");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
