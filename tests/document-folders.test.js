const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const folders = require("../src/document/document-folders");
const library = require("../src/document/document-library");
const view = require("../src/ui/document-library-view");
const languages = require("../src/engine/language-registry");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const codeOf = error => error.code;
const throwsCode = (fn, code) => assert.throws(fn, error => codeOf(error) === code, code);
const at = "2026-11-07T10:00:00.000Z";

// Reading the stored tree.
assert.deepStrictEqual(folders.read(undefined).tree.folders, [], "no tree is an empty tree");
assert.strictEqual(folders.read({ schemaVersion: "2.0.0", folders: [] }).supported, false,
  "a tree from a later major version is not read");
assert.strictEqual(folders.read([]).supported, false);
const stored = folders.read({ schemaVersion: "1.0.0", extra: { kept: true }, folders: [
  { folderId: "a", name: "  Customer   A ", parentId: "", createdAt: at, color: "teal" },
  { folderId: "b", name: "Release", parentId: "a", createdAt: at },
  { folderId: "orphan", name: "Orphan", parentId: "gone" },
  { folderId: "x", name: "X", parentId: "y" }, { folderId: "y", name: "Y", parentId: "x" },
  { folderId: "a", name: "Duplicate id" }, { name: "No id" }
] });
assert.strictEqual(stored.supported, true);
const tree = stored.tree;
assert.deepStrictEqual(tree.folders.map(folder => folder.folderId), ["a", "b", "orphan", "x", "y"]);
assert.strictEqual(folders.find(tree, "a").name, "Customer A", "names are trimmed");
assert.strictEqual(folders.find(tree, "a").color, "teal", "unknown folder fields are kept");
assert.deepStrictEqual(tree.extra, { kept: true }, "unknown tree fields are kept");
assert.strictEqual(folders.find(tree, "orphan").parentId, "", "a missing parent puts the folder at the top");
assert.ok([folders.find(tree, "x").parentId, folders.find(tree, "y").parentId].includes(""),
  "a loop is broken");
assert.ok(Object.isFrozen(tree) && Object.isFrozen(tree.folders[0]));
assert.deepStrictEqual(folders.path(tree, "b").map(folder => folder.name), ["Customer A", "Release"]);
assert.deepStrictEqual([...folders.descendantIds(tree, "a")].sort(), ["a", "b"]);
assert.strictEqual(folders.folderOf(tree, { folderId: "b" }), "b");
assert.strictEqual(folders.folderOf(tree, { folderId: "deleted" }), "",
  "a record whose folder no longer exists is shown at the top level");
assert.strictEqual(folders.folderOf(tree, {}), "");

// Creating, renaming and moving.
let next = folders.create(tree, { name: "Sales", parentId: "a", now: at, folderId: "s" }).tree;
assert.deepStrictEqual(folders.children(next, "a").map(folder => folder.name), ["Release", "Sales"]);
throwsCode(() => folders.create(next, { name: "  ", folderId: "n" }), "nameRequired");
throwsCode(() => folders.create(next, { name: "x".repeat(81), folderId: "n" }), "nameTooLong");
throwsCode(() => folders.create(next, { name: "sales", parentId: "a", folderId: "n" }), "nameExists");
assert.ok(folders.create(next, { name: "Sales", parentId: "", folderId: "n" }).folder,
  "the same name is allowed in another folder");
throwsCode(() => folders.create(next, { name: "Z", parentId: "missing" }), "parentMissing");
let deep = folders.empty();
for (let level = 0; level < folders.MAX_DEPTH; level++) {
  deep = folders.create(deep, { name: `L${level}`, parentId: level ? `d${level - 1}` : "",
    folderId: `d${level}` }).tree;
}
throwsCode(() => folders.create(deep, { name: "Too deep", parentId: `d${folders.MAX_DEPTH - 1}` }), "tooDeep");
next = folders.rename(next, "s", "Sales orders", at);
assert.strictEqual(folders.find(next, "s").name, "Sales orders");
throwsCode(() => folders.rename(next, "s", "release"), "nameExists");
assert.strictEqual(folders.rename(next, "s", "SALES ORDERS").folders.find(folder =>
  folder.folderId === "s").name, "SALES ORDERS", "a folder can change the case of its own name");
throwsCode(() => folders.move(next, "a", "b"), "intoItself");
throwsCode(() => folders.move(next, "a", "a"), "intoItself");
assert.strictEqual(folders.find(folders.move(next, "b", ""), "b").parentId, "");
// A moved folder keeps its subfolders and cannot take a name already used in the destination.
const regrouped = folders.move(next, "s", "b");
assert.deepStrictEqual(folders.path(regrouped, "s").map(folder => folder.name),
  ["Customer A", "Release", "Sales orders"]);
const clash = folders.create(next, { name: "Sales orders", parentId: "", folderId: "top" }).tree;
throwsCode(() => folders.move(clash, "s", ""), "nameExists");
throwsCode(() => folders.move(next, "s", "missing"), "parentMissing");
let ladder = next;
for (let depth = 1; depth < folders.MAX_DEPTH; depth++) {
  ladder = folders.create(ladder, { name: `Level ${depth}`, parentId: depth === 1 ? "" : `d${depth - 1}`,
    folderId: `d${depth}` }).tree;
}
throwsCode(() => folders.move(ladder, "a", `d${folders.MAX_DEPTH - 1}`), "tooDeep");

// Removing a folder never deletes documents.
const records = [{ projectId: "p1", folderId: "a" }, { projectId: "p2", folderId: "b" },
  { projectId: "p3" }, { projectId: "p4", folderId: "a", archived: true }];
assert.deepStrictEqual(folders.removal(next, "a", records), { subfolders: 2, documents: 2 });
const withClash = folders.create(next, { name: "Release", parentId: "", folderId: "r" }).tree;
const removed = folders.remove(withClash, "a", records);
assert.strictEqual(folders.find(removed.tree, "a"), null);
assert.strictEqual(folders.find(removed.tree, "b").parentId, "", "subfolders move up");
assert.strictEqual(folders.find(removed.tree, "b").name, "Release (2)",
  "a subfolder whose name is taken above is renamed, not merged");
assert.strictEqual(folders.find(removed.tree, "s").parentId, "");
assert.deepStrictEqual(removed.moved, ["p1", "p4"]);
assert.deepStrictEqual(removed.records.map(record => record.folderId),
  ["", "b", undefined, ""], "documents in the folder move up, including archived ones");
assert.strictEqual(removed.records.length, records.length);
const nested = folders.remove(next, "b", [{ projectId: "p2", folderId: "b" }]);
assert.strictEqual(nested.records[0].folderId, "a", "documents move to the folder above");

// Outline for the folder picker, in name order with paths.
const outline = folders.outline(next).map(item => [item.depth, item.path.join(" / ")]);
assert.deepStrictEqual(outline.slice(0, 4), [[0, "Customer A"], [1, "Customer A / Release"],
  [1, "Customer A / Sales orders"], [0, "Orphan"]]);
assert.strictEqual(outline.length, next.folders.length, "every folder is listed once");
assert.deepStrictEqual(folders.read(folders.serialize(next)).tree.folders, next.folders,
  "a saved tree reads back unchanged");

// Library records keep their folder; older records have none.
assert.strictEqual(library.normalize({ projectId: "p", folderId: " a " }).folderId, "a");
assert.strictEqual(library.normalize({ projectId: "p" }).folderId, "");
assert.strictEqual(library.merge({ projectId: "p", folderId: "a" }, { title: "T" }).folderId, "a",
  "updating a record keeps its folder");

// Cards show the folder and the move action only when the library provides them.
const record = library.normalize({ projectId: "p1", title: "Order to cash", folderId: "b",
  createdAt: at, modifiedAt: at });
const plain = view.card(record, false, true, "en-US");
assert.ok(!plain.includes("library-folder-badge") && !plain.includes("move-folder"));
const filed = view.card(record, false, true, "en-US", null, null, {
  folderOf: () => ({ path: "Customer A / <Release>", label: "Folder: Customer A / <Release>" }),
  moveToFolderLabel: "Move to folder…" });
assert.ok(filed.includes('data-library-action="move-folder">Move to folder…</button>'));
assert.ok(filed.includes("Customer A / &lt;Release&gt;") && !filed.includes("<Release>"),
  "folder names are escaped");
const container = { innerHTML: "" };
view.renderList(container, [], { storedCount: 3, emptyMessage: "This folder is empty." });
assert.ok(container.innerHTML.includes("This folder is empty.") &&
  !container.innerHTML.includes("clear-search-filters"),
  "an empty folder is not presented as a filter result");
view.renderList(container, [], { storedCount: 3 });
assert.ok(container.innerHTML.includes("clear-search-filters"));

// Every folder text exists in every interface language with the same placeholders.
const i18nSource = read("src/ui/i18n.js");
const messages = vm.runInNewContext(`(${i18nSource.match(
  /const libraryFolderMessages = (Object\.freeze\(\{[\s\S]*?\n {2}\}\));/u)[1]})`, { Object });
const english = messages["en-US"];
const placeholders = value => (value.match(/\{[a-z]+\}/gu) || []).sort().join();
for (const { locale } of languages.supported("ui")) {
  const values = messages[locale];
  assert.ok(values, `${locale} folder texts`);
  assert.deepStrictEqual(Object.keys(values).sort(), Object.keys(english).sort(), locale);
  for (const [key, value] of Object.entries(values)) {
    assert.ok(value.trim(), `${locale} ${key}`);
    assert.strictEqual(placeholders(value), placeholders(english[key]), `${locale} ${key} placeholders`);
    if (locale !== "en-US" && !["folder.label", "folder.destination", "folder.moveTitleMany"].includes(key) &&
      value.length > 12) assert.notStrictEqual(value, english[key], `${locale} ${key} is translated`);
  }
}
for (const key of ["folder.navigation", "folder.breadcrumb", "folder.new", "folder.rename",
  "folder.delete", "folder.moveSelected", "folder.nameLabel", "folder.cancel", "folder.move",
  "folder.deleteConfirm", "folder.destination", "folder.actions", "folder.moveFolder",
  "folder.moveFolderTitle", "folder.folderMoved", "folder.folderMovedTop", "folder.nameExistsThere"]) {
  assert.ok(english[key], key);
}
// Every error the folder model reports has a message; a missing parent reads as a missing folder.
const errorCodes = [...read("src/document/document-folders.js")
  .matchAll(/folderError\("([a-zA-Z]+)"\)/gu)].map(match => match[1]);
for (const code of new Set(errorCodes)) {
  if (code !== "parentMissing") assert.ok(english[`folder.${code}`], `message for ${code}`);
}
assert.match(read("src/ui/dashboard.js"), /error\?\.code === "parentMissing" \? "missing"/u);
assert.match(i18nSource, /if \(libraryFolderMessages\[normalized\]\?\.\[key\] !== undefined\)/u);

// The page wiring.
const dashboardHtml = read("src/ui/dashboard.html");
for (const id of ["libraryFolders", "libraryFolderPath", "libraryFolderList", "libraryFolderNew",
  "libraryFolderRename", "libraryFolderMove", "libraryFolderDelete", "libraryBatchMove", "libraryFolderDialog",
  "libraryMoveDialog", "libraryFolderDeleteDialog", "libraryFolderStatus"]) {
  assert.ok(dashboardHtml.includes(`id="${id}"`), id);
}
assert.ok(dashboardHtml.indexOf('src="document/document-folders.js"') <
  dashboardHtml.indexOf('src="dashboard.js"'));
for (const dialog of dashboardHtml.match(/<dialog id="library(Folder|Move)[^>]*>/gu)) {
  assert.match(dialog, /aria-labelledby="/u, "folder dialogs have an accessible name");
}
const dashboard = read("src/ui/dashboard.js");
assert.match(dashboard, /folderId: Object\.hasOwn\(storedRecord, "folderId"\) \? storedRecord\.folderId/u,
  "a document stays where it was filed");

// The background saves the tree with the moved records in one write, and never overwrites a
// tree saved by a later version.
const background = read("src/recorder/background.js");
assert.match(background, /importScripts\("document\/document-folders\.js"\)/u);
const saveSource = background.match(/async function saveDocumentFolders[\s\S]*?\n\}\n/u)[0];
const keys = require("../src/engine/storage-keys");
assert.strictEqual(keys.DOCUMENT_FOLDERS_KEY, "t9_document_folders");
(async () => {
  const storage = {};
  const writes = [];
  const chrome = { storage: { local: {
    get: async key => ({ [key]: storage[key] }),
    set: async values => { writes.push(Object.keys(values).sort()); Object.assign(storage, values); }
  } } };
  const context = vm.createContext({ chrome, globalThis: { T9StorageKeys: keys,
    T9DocumentFolders: folders, T9DocumentLibrary: library } });
  vm.runInContext(`${saveSource}; this.save = saveDocumentFolders;`, context);
  await context.save(folders.serialize(next), [{ projectId: "p1", folderId: "a" }]);
  assert.deepStrictEqual(writes, [["t9_document_folders", "t9_document_library"]],
    "the tree and the moved records are written together");
  assert.strictEqual(storage.t9_document_library[0].folderId, "a");
  await context.save(folders.serialize(next));
  assert.deepStrictEqual(writes[1], ["t9_document_folders"], "the library is untouched without records");
  storage.t9_document_folders = { schemaVersion: "2.0.0", folders: [{ folderId: "future" }] };
  await assert.rejects(context.save(folders.serialize(next)), /later version/u);
  assert.strictEqual(storage.t9_document_folders.schemaVersion, "2.0.0",
    "a tree from a later version is not overwritten");
  assert.match(background, /libraryFolderId: String\(testedRecord\.folderId\)/u,
    "a bug report made from a test starts in the tested document's folder");
  console.log("Document folders: tree reading, names, nesting, moving, non-destructive removal, " +
    "card and empty states, eight-language texts and storage passed.");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
