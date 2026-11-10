const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const keys = require("../src/engine/storage-keys");
const transfer = require("../src/document/library-transfer");
const folderModel = require("../src/document/document-folders");
const library = require("../src/document/document-library");

// chrome.storage.local as the transfer uses it. failAfter makes a write fail.
function storage(initial = {}) {
  const data = new Map(Object.entries(JSON.parse(JSON.stringify(initial))));
  const area = {
    data, sets: 0, failAt: 0,
    async getKeys() { return [...data.keys()]; },
    async get(request) {
      if (request === null) return Object.fromEntries(data);
      const list = Array.isArray(request) ? request : [request];
      return Object.fromEntries(list.filter(key => data.has(key))
        .map(key => [key, JSON.parse(JSON.stringify(data.get(key)))]));
    },
    async set(values) {
      area.sets += 1;
      if (area.sets === area.failAt) throw new Error("QUOTA_BYTES");
      for (const [key, value] of Object.entries(values)) data.set(key, JSON.parse(JSON.stringify(value)));
    },
    async remove(request) { (Array.isArray(request) ? request : [request]).forEach(key => data.delete(key)); }
  };
  return area;
}

function documentEntries(id, marker = "a") {
  return {
    [`t9_session_${id}`]: { id, name: `Order ${id}`, startedAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-02T08:00:00.000Z", status: "completed", futureField: { kept: true } },
    [`t9_recording_${id}`]: { recordingId: id, eventStorageFormat: "events-v1", eventCount: 2 },
    [`t9_recording_${id}:event:00000001`]: { type: "click", label: `Ny ${marker}` },
    [`t9_recording_${id}:event:00000002`]: { type: "input", value: "Åsa Öberg – 10 000 kr" },
    [`t9_raw_recording_${id}`]: { recordingId: id, eventCount: 0 },
    [`t9_screenshot_manifest_${id}`]: { keys: ["s1"] },
    [`t9_screenshot_asset_${id}:s1`]: { hash: "abc" },
    [`t9_screenshot_blob_${id}:abc`]: "data:image/jpeg;base64,/9j/AAA=",
    [`t9_review_${id}`]: { sessionId: id, tasks: [{ taskId: "t1", title: `Steg ${marker}` }] },
    [`t9_progress_${id}`]: { sessionId: id, total: 1, approved: 1 },
    [`t9_bc_error_evidence_index_${id}`]: [`ev-${id}`],
    [`t9_bc_error_evidence_ev-${id}`]: { evidenceId: `ev-${id}`, recordingId: id, message: "Fel" },
    [`t9_test_run_run-${id}`]: { testRunId: `run-${id}`, sessionId: id },
    [`t9_test_shot_${id}:run-${id}:shot-1`]: { image: "data:image/png;base64,iVBORw0KGgo=",
      capturedAt: "2026-10-02T08:00:00.000Z" },
    [`t9_bug_report_bug-${id}`]: { bugReportId: `bug-${id}`, recordingId: id },
    // A suite also names tests of other documents; it travels with its owner.
    [`t9_test_suite_suite-${id}`]: { schemaVersion: 1, suiteId: `suite-${id}`, ownerSessionId: id,
      title: "Uppgradering BC 28", items: [{ sessionId: id, testRunId: `run-${id}` },
        { sessionId: "doc-elsewhere", testRunId: "run-elsewhere" }] }
  };
}
const unrelated = { t9_settings: { uiLocale: "sv-SE" }, t9_state: { recording: false },
  t9_tenant_license: { token: "secret" } };

async function exportText(area, items, folders = [], scope = { kind: "library" }) {
  const lines = [];
  for await (const line of transfer.exportLines({ storage: area, keys, items, folders, scope,
    exportedAt: "2026-11-07T10:00:00.000Z", appVersion: "4.7.237" })) lines.push(line);
  return lines.join("\n") + "\n";
}
// The file arrives in chunks that do not follow line boundaries.
async function* chunks(text, size = 37) {
  for (let offset = 0; offset < text.length; offset += size) yield text.slice(offset, offset + size);
}
const lines = text => transfer.splitLines(chunks(text));

async function inspect(text) { return transfer.read(lines(text), keys); }

async function importInto(area, text, { replace = false, records = [], tree = folderModel.empty(),
  activeId = "" } = {}) {
  const inspection = await inspect(text);
  const local = await transfer.localDigests(area, keys, inspection.items.map(item => item.id));
  const planned = transfer.plan({ inspection, local, records, tree, activeId });
  const change = transfer.changes(planned, { replace, records, tree, normalize: library.normalize });
  let saved = null;
  const meta = await transfer.apply({ storage: area, keys, lines: lines(text), planned, change,
    fileName: "library.bcps", saveLibrary: async (nextTree, nextRecords) => {
      saved = { tree: nextTree, records: nextRecords };
    } });
  return { planned, change, saved, meta };
}

const snapshot = area => JSON.stringify([...area.data].sort(([a], [b]) => a.localeCompare(b)));

(async () => {
  // Every entry of a document belongs to it, by key or by the document named in the value.
  const { ownerOf, needsValue } = transfer.ownership(keys);
  for (const [key, value] of Object.entries(documentEntries("doc-1"))) {
    assert.equal(ownerOf(key, value), "doc-1", key);
  }
  assert.equal(ownerOf("t9_settings"), "");
  assert.equal(ownerOf("t9_document_library"), "");
  assert.equal(ownerOf(keys.LIBRARY_IMPORT_UNDO_KEY), "");
  assert.equal(ownerOf(`${keys.LIBRARY_IMPORT_UNDO_ENTRY_PREFIX}00000000`), "");
  assert.equal(ownerOf("t9_session_doc-1:x"), "", "an exact key has nothing after the id");
  assert.equal(ownerOf("t9_screenshot_asset_doc-1"), "", "a screenshot key names its screenshot");
  assert.equal(ownerOf("t9_bug_report_bug-1", { recordingId: "other" }), "other");
  assert.ok(needsValue("t9_test_run_x") && !needsValue("t9_review_x"));
  assert.ok(needsValue("t9_test_suite_x"));
  assert.equal(ownerOf("t9_test_suite_x", { items: [{ sessionId: "first" }, { sessionId: "second" }] }),
    "first", "a suite without an owner travels with its first document");
  assert.equal(ownerOf("t9_test_suite_x", { ownerSessionId: "second", items: [{ sessionId: "first" }] }),
    "second");
  assert.equal(ownerOf("t9_test_suite_x", { items: [] }), "");
  // A test screenshot belongs to the document by its key, so its image is never read to tell.
  assert.ok(!needsValue("t9_test_shot_doc-1:run-1:shot-1"));
  assert.equal(ownerOf("t9_test_shot_doc-1"), "", "a test screenshot key names its run and screenshot");

  // Export, then import into an empty library on another computer.
  const tree = folderModel.create(folderModel.empty(), { name: "Kund Nordbygg", folderId: "f-a" }).tree;
  const deep = folderModel.create(tree, { name: "Release 25.1", parentId: "f-a", folderId: "f-b" }).tree;
  const source = storage({ ...documentEntries("doc-1"), ...documentEntries("doc-2"), ...unrelated });
  const records = [
    library.normalize({ projectId: "doc-1", title: "Order doc-1", folderId: "f-b", tags: ["ÅÄÖ"] }),
    library.normalize({ projectId: "doc-2", title: "Order doc-2" })
  ];
  const folders = transfer.exportFolders(deep, records, { all: true });
  assert.deepEqual(folders.map(folder => folder.folderId), ["f-a", "f-b"], "parents first");
  assert.deepEqual(transfer.exportFolders(deep, [records[1]]).length, 0,
    "a document at the top level needs no folders");
  const text = await exportText(source, records.map(record => ({ id: record.projectId, record })), folders);
  assert.ok(!text.includes("secret") && !text.includes("uiLocale"), "only document entries are exported");
  const inspection = await inspect(text);
  assert.equal(inspection.header.format, "bc-process-studio-library");
  assert.deepEqual(inspection.items.map(item => item.id), ["doc-1", "doc-2"]);

  const target = storage({ t9_settings: { uiLocale: "en-US" } });
  const first = await importInto(target, text);
  assert.deepEqual(first.planned.counts, { new: 2, same: 0, different: 0, busy: 0 });
  for (const [key, value] of Object.entries({ ...documentEntries("doc-1"), ...documentEntries("doc-2") })) {
    assert.deepEqual(target.data.get(key), value, `${key} is imported unchanged`);
  }
  assert.deepEqual(target.data.get("t9_settings"), { uiLocale: "en-US" }, "settings are not touched");
  assert.ok(!target.data.has("t9_tenant_license"));
  assert.deepEqual(first.saved.tree.folders.map(folder => [folder.folderId, folder.name, folder.parentId]),
    [["f-a", "Kund Nordbygg", ""], ["f-b", "Release 25.1", "f-a"]]);
  assert.equal(first.saved.records.find(record => record.projectId === "doc-1").folderId, "f-b");
  assert.deepEqual(first.saved.records.find(record => record.projectId === "doc-1").tags, ["ÅÄÖ"]);
  assert.equal(first.meta.state, "complete");

  // Importing the same file again changes nothing.
  const again = await importInto(target, text, { records: first.saved.records, tree: first.saved.tree });
  assert.deepEqual(again.planned.counts, { new: 0, same: 2, different: 0, busy: 0 });
  assert.equal(again.change.written.length, 0);

  // The same content stored with its fields in another order is unchanged.
  const reverse = value => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).reverse()) : value;
  const reorderedArea = storage(Object.fromEntries([...target.data].map(([key, value]) => [key, reverse(value)])));
  const reorderedPlan = transfer.plan({ inspection, records: first.saved.records.map(reverse),
    tree: first.saved.tree, local: await transfer.localDigests(reorderedArea, keys, ["doc-1", "doc-2"]) });
  assert.deepEqual(reorderedPlan.counts, { new: 0, same: 2, different: 0, busy: 0 });

  // A document changed on this computer is a conflict; keeping it changes nothing.
  const edited = storage({ ...documentEntries("doc-1", "lokal"), ...unrelated });
  const kept = await importInto(edited, text);
  assert.deepEqual(kept.planned.counts, { new: 1, same: 0, different: 1, busy: 0 });
  assert.deepEqual(kept.change.replacedIds, []);
  assert.deepEqual(edited.data.get("t9_review_doc-1"), documentEntries("doc-1", "lokal")["t9_review_doc-1"]);

  // Replacing it takes the file's version, and undo puts this computer's version back.
  const replaceArea = storage({ ...documentEntries("doc-1", "lokal"), ...unrelated,
    "t9_recording_doc-1:event:00000003": { type: "extra" } });
  const replaceBefore = snapshot(replaceArea);
  const localRecords = [library.normalize({ projectId: "doc-1", title: "Lokal titel" })];
  const replaced = await importInto(replaceArea, text, { replace: true, records: localRecords });
  assert.deepEqual(replaced.change.replacedIds, ["doc-1"]);
  assert.deepEqual(replaceArea.data.get("t9_review_doc-1"), documentEntries("doc-1")["t9_review_doc-1"]);
  assert.ok(!replaceArea.data.has("t9_recording_doc-1:event:00000003"), "no old entries are left");
  const undoMeta = await transfer.readUndo(replaceArea, keys);
  assert.equal(undoMeta.state, "complete");
  assert.equal(undoMeta.keptEntries, Object.keys(documentEntries("doc-1")).length + 1);
  let undoSaved = null;
  const undone = await transfer.undo({ storage: replaceArea, keys, records: replaced.saved.records,
    tree: replaced.saved.tree, normalize: library.normalize,
    saveLibrary: async (nextTree, nextRecords) => { undoSaved = { tree: nextTree, records: nextRecords }; } });
  assert.equal(snapshot(replaceArea), replaceBefore, "undo restores every entry and removes the import");
  assert.deepEqual(undoSaved.records.map(record => [record.projectId, record.title]), [["doc-1", "Lokal titel"]]);
  assert.deepEqual(undoSaved.tree.folders, [], "folders the import created are removed when empty");
  assert.equal(undone.meta.importId, undoMeta.importId);
  await assert.rejects(transfer.undo({ storage: replaceArea, keys, records: [], tree: folderModel.empty(),
    saveLibrary: async () => {} }), { code: "nothingToUndo" });

  // A document being recorded is never changed.
  const busy = await importInto(storage(documentEntries("doc-1", "lokal")), text,
    { replace: true, activeId: "doc-1" });
  assert.equal(busy.planned.items.find(item => item.id === "doc-1").status, "busy");
  assert.deepEqual(busy.change.replacedIds, []);

  // Folders are matched by name in the same place; documents keep their folder.
  const localTree = folderModel.create(folderModel.empty(), { name: "kund nordbygg", folderId: "f-local" }).tree;
  const named = await importInto(storage(), text, { tree: localTree });
  assert.deepEqual(named.saved.tree.folders.map(folder => [folder.folderId, folder.parentId]),
    [["f-local", ""], ["f-b", "f-local"]]);
  assert.equal(named.saved.records.find(record => record.projectId === "doc-1").folderId, "f-b");

  // A write that fails at any point rolls back everything the import did.
  let writes = 0;
  { const probe = storage({ ...documentEntries("doc-1", "lokal"), ...unrelated });
    await importInto(probe, text, { replace: true }); writes = probe.sets; }
  assert.ok(writes > 3);
  for (let failAt = 1; failAt < writes; failAt += 1) {
    const failing = storage({ ...documentEntries("doc-1", "lokal"), ...unrelated });
    const failingBefore = snapshot(failing);
    failing.failAt = failAt;
    await assert.rejects(importInto(failing, text, { replace: true }), /QUOTA_BYTES/u);
    assert.equal(snapshot(failing), failingBefore, `nothing is left when write ${failAt} fails`);
  }

  // An import interrupted after the replaced entries were kept is undone on the next start.
  const crashed = storage({ ...documentEntries("doc-1", "lokal"), ...unrelated });
  const crashedBefore = snapshot(crashed);
  const crashInspection = await inspect(text);
  const crashPlan = transfer.plan({ inspection: crashInspection,
    local: await transfer.localDigests(crashed, keys, ["doc-1", "doc-2"]), records: [], tree: folderModel.empty() });
  const crashChange = transfer.changes(crashPlan, { replace: true, records: [], tree: folderModel.empty() });
  await assert.rejects(transfer.apply({ storage: crashed, keys, lines: lines(text), planned: crashPlan,
    change: crashChange, saveLibrary: async () => { throw new Error("browser closed"); } }), /browser closed/u);
  assert.equal(snapshot(crashed), crashedBefore, "a failure while saving the library is rolled back");

  // A file that is not a library, comes from a newer version, is cut short or was altered.
  await assert.rejects(inspect("{\"type\":\"header\",\"format\":\"other\"}\n"), { code: "notLibrary" });
  await assert.rejects(inspect("not json\n"), { code: "damaged" });
  await assert.rejects(inspect(""), { code: "notLibrary" });
  const header = JSON.parse(text.split("\n")[0]);
  await assert.rejects(inspect(`${JSON.stringify({ ...header, formatVersion: 2 })}\n`), { code: "newerVersion" });
  const all = text.trim().split("\n");
  await assert.rejects(inspect(all.slice(0, -1).join("\n")), { code: "incomplete" });
  await assert.rejects(inspect(all.slice(0, 5).join("\n")), { code: "incomplete" });
  await assert.rejects(inspect(text.replace("Åsa Öberg", "Asa Oberg")), { code: "damaged" });
  // An entry that belongs to something other than its document is refused, whatever its digest.
  const foreign = all.map(line => {
    const value = JSON.parse(line);
    return value.type === "entry" && value.key === "t9_review_doc-1"
      ? JSON.stringify({ ...value, key: "t9_settings" }) : line;
  }).join("\n");
  await assert.rejects(inspect(foreign), { code: "foreignEntry" });
  const otherDocument = all.map(line => {
    const value = JSON.parse(line);
    return value.type === "entry" && value.key === "t9_review_doc-1"
      ? JSON.stringify({ ...value, key: "t9_review_doc-2" }) : line;
  }).join("\n");
  await assert.rejects(inspect(otherDocument), { code: "foreignEntry" });
  const sneaky = all.map(line => {
    const value = JSON.parse(line);
    return value.type === "entry" && value.key === "t9_bug_report_bug-doc-1"
      ? JSON.stringify({ ...value, value: { ...value.value, recordingId: "doc-2" } }) : line;
  }).join("\n");
  await assert.rejects(inspect(sneaky), { code: "foreignEntry" });

  // A file that changed between the preview and the import is rolled back.
  const changedArea = storage({ ...unrelated });
  const changedInspection = await inspect(text);
  const changedPlan = transfer.plan({ inspection: changedInspection, local: new Map(), records: [],
    tree: folderModel.empty() });
  const changedChange = transfer.changes(changedPlan, { records: [], tree: folderModel.empty() });
  const otherText = await exportText(storage({ ...documentEntries("doc-1", "b"), ...documentEntries("doc-2") }),
    records.map(record => ({ id: record.projectId, record })), folders);
  await assert.rejects(transfer.apply({ storage: changedArea, keys, lines: lines(otherText),
    planned: changedPlan, change: changedChange, saveLibrary: async () => {} }), { code: "changedFile" });
  assert.equal(snapshot(changedArea), snapshot(storage(unrelated)));

  // A file name for the export.
  assert.equal(transfer.fileName(new Date("2026-11-07T10:05:00Z"), "Kund: Nordbygg"),
    "BC-Process-Studio-Kund_-Nordbygg-2026-11-07-10-05.bcps");

  // The dashboard loads the module and offers export and import.
  const html = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "dashboard.html"), "utf8");
  assert.ok(html.includes('<script src="document/library-transfer.js"></script>'), "transfer module");
  assert.ok(html.includes('<script src="engine/storage-queries.js"></script>'), "storage queries");
  for (const id of ["libraryExport", "libraryImport", "libraryImportFile", "libraryExportDialog",
    "libraryImportDialog", "libraryImportNotice"]) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  // The export is typed as binary: an untyped blob is saved as text/plain and Edge then
  // replaces .bcps with .txt. Import also opens files an earlier version saved as .txt.
  const dashboardScript = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "dashboard.js"), "utf8");
  assert.match(dashboardScript, /const blob = new Blob\(\[await compressed\], \{ type: "application\/octet-stream" \}\);/u);
  assert.ok(html.includes('id="libraryImportFile" type="file" accept=".bcps,.txt"'), "import accepts .txt");

  // Every transfer text exists in every interface language with the same placeholders.
  const vm = require("node:vm");
  const languages = require("../src/engine/language-registry");
  const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  const i18nSource = read("src/ui/i18n.js");
  const messages = vm.runInNewContext(`(${i18nSource.match(
    /const libraryTransferMessages = (Object\.freeze\(\{[\s\S]*?\n {2}\}\));/u)[1]})`, { Object });
  const english = messages["en-US"];
  const placeholders = value => (value.match(/\{[a-z]+\}/gu) || []).sort().join();
  const sameAsEnglish = ["transfer.source"];
  for (const { locale } of languages.supported("ui")) {
    const values = messages[locale];
    assert.ok(values, `${locale} transfer texts`);
    assert.deepStrictEqual(Object.keys(values).sort(), Object.keys(english).sort(), locale);
    for (const [key, value] of Object.entries(values)) {
      assert.ok(value.trim(), `${locale} ${key}`);
      assert.strictEqual(placeholders(value), placeholders(english[key]), `${locale} ${key} placeholders`);
      if (locale !== "en-US" && !sameAsEnglish.includes(key) && value.length > 12) {
        assert.notStrictEqual(value, english[key], `${locale} ${key} is translated`);
      }
    }
  }
  assert.match(i18nSource, /if \(libraryTransferMessages\[normalized\]\?\.\[key\] !== undefined\)/u);
  // Every text the page uses exists, and every error the module reports has a message.
  const dashboard = read("src/ui/dashboard.js");
  const used = new Set([
    ...[...dashboard.matchAll(/uiTf?\("(transfer\.[a-zA-Z]+)"/gu)].map(match => match[1]),
    ...[...html.matchAll(/data-i18n(?:-aria-label)?="(transfer\.[a-zA-Z]+)"/gu)].map(match => match[1])
  ]);
  assert.ok(used.size > 40, "the page uses the transfer texts");
  for (const key of used) assert.ok(english[key], `text ${key}`);
  const codes = new Set([...read("src/document/library-transfer.js")
    .matchAll(/transferError\("([a-zA-Z]+)"/gu)].map(match => match[1]));
  for (const code of codes) {
    assert.ok(english[`transfer.${code}`], `message for ${code}`);
    assert.ok(dashboard.includes(`"${code}"`), `the page maps ${code} to its message`);
  }

  console.log("Library transfer tests passed.");
})().catch(error => { console.error(error); process.exit(1); });
