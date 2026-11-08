// Synchronizing the library between computers through a shared folder
// (document/library-sync.js): two or three computers with their own storage share one folder.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const keys = require("../src/engine/storage-keys");
const transfer = require("../src/document/library-transfer");
const sync = require("../src/document/library-sync");
const folderModel = require("../src/document/document-folders");
const library = require("../src/document/document-library");

function storage() {
  const data = new Map();
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

// The shared folder, as the folder adapter presents it. Files are plain text here.
function folder() {
  const files = new Map();
  let clock = Date.parse("2026-11-08T08:00:00.000Z");
  async function* chunks(text) { for (let i = 0; i < text.length; i += 53) yield text.slice(i, i + 53); }
  return {
    files, name: "OneDrive - BC Process Studio",
    async list(prefix) {
      return [...files].filter(([key]) => key.startsWith(`${prefix}/`))
        .map(([key, value]) => ({ path: key, lastModified: value.lastModified, size: value.text.length }));
    },
    async readText(key) {
      if (!files.has(key)) throw Object.assign(new Error("missing"), { name: "NotFoundError" });
      return files.get(key).text;
    },
    async readLines(key) {
      if (!files.has(key)) throw Object.assign(new Error("missing"), { name: "NotFoundError" });
      return transfer.splitLines(chunks(files.get(key).text));
    },
    async writeText(key, text) { files.set(key, { text, lastModified: clock += 1000 }); },
    async writeLines(key, lines) {
      const list = [];
      for await (const line of lines) list.push(line);
      files.set(key, { text: list.join("\n") + "\n", lastModified: clock += 1000 });
    },
    async remove(key) { files.delete(key); }
  };
}

function documentEntries(id, marker = "a") {
  return {
    [`t9_session_${id}`]: { id, name: `Order ${id}`, status: "completed", futureField: { kept: true } },
    [`t9_recording_${id}`]: { recordingId: id, eventCount: 1 },
    [`t9_recording_${id}:event:00000001`]: { type: "click", label: `Ny ${marker}` },
    [`t9_screenshot_asset_${id}:s1`]: { hash: "abc" },
    [`t9_screenshot_blob_${id}:abc`]: "data:image/jpeg;base64,/9j/AAA=",
    [`t9_review_${id}`]: { sessionId: id, tasks: [{ taskId: "t1", title: `Steg ${marker}` }] },
    [`t9_test_run_run-${id}`]: { testRunId: `run-${id}`, sessionId: id }
  };
}

let tick = 0;
const at = () => new Date(Date.parse("2026-11-08T09:00:00.000Z") + (tick += 60000)).toISOString();

// A computer: its storage, library records, folders and synchronization state, kept the
// way the dashboard keeps them.
function computer(name) {
  const self = {
    name, area: storage(), records: [], tree: folderModel.empty(), state: null, activeId: "",
    add(id, marker = "a", folderId = "") {
      for (const [key, value] of Object.entries(documentEntries(id, marker))) self.area.data.set(key, value);
      self.records = self.records.filter(record => record.projectId !== id);
      self.records.push(library.normalize({ projectId: id, sessionId: id, title: `Order ${id}`,
        folderId, modifiedAt: "2026-11-01T08:00:00.000Z" }));
    },
    async edit(id, marker) {
      await self.area.set({ [`t9_review_${id}`]: { sessionId: id, tasks: [{ taskId: "t1", title: `Steg ${marker}` }] } });
    },
    async delete(id) {
      const owned = await transfer.inventory(self.area, keys, [id]);
      await self.area.remove(owned.get(id));
      self.records = self.records.filter(record => record.projectId !== id);
    },
    entries(id) {
      return Object.fromEntries([...self.area.data].filter(([key]) =>
        key.includes(id) && !key.startsWith("t9_library_")).sort());
    },
    async connect(dir) { self.state = sync.connect(self.state, dir.name, at()); },
    async prepare(dir) {
      return sync.prepare({ dir, storage: self.area, keys, records: self.records, state: self.state,
        tree: self.tree, activeId: self.activeId, activeIds: self.activeIds || [] });
    },
    async sync(dir, decisions = {}) {
      const prepared = await self.prepare(dir);
      if (self.beforeCommit) await self.beforeCommit();
      const result = await sync.commit({ prepared, dir, storage: self.area, keys, records: self.records,
        tree: self.tree, state: self.state, decisions, now: at(), appVersion: "4.7.238",
        normalize: library.normalize,
        saveLibrary: async (tree, records) => { self.tree = tree; self.records = records; },
        saveState: async state => { self.saved = (self.saved || 0) + 1; self.state = state; } });
      return { prepared, result };
    }
  };
  return self;
}

(async () => {
  const dir = folder();
  const a = computer("A");
  const b = computer("B");
  // A has two documents, one of them in a folder.
  a.tree = folderModel.create(a.tree, { name: "Kunder", folderId: "folder-customers", now: "2026-11-01T08:00:00.000Z" }).tree;
  a.add("d1", "a", "folder-customers");
  a.add("d2");
  await a.connect(dir);
  await b.connect(dir);
  assert.notEqual(a.state.deviceId, b.state.deviceId);
  assert.match(a.state.deviceId, /^device-/);
  // Reconnecting keeps the computer's id and starts over with the folder.
  assert.equal(sync.connect(a.state, "other").deviceId, a.state.deviceId);

  // The first synchronization saves both documents in the folder.
  let run = await a.sync(dir);
  assert.equal(run.result.pushed, 2);
  assert.equal(run.result.pulled, 0);
  const manifestA = JSON.parse(dir.files.get(`devices/${a.state.deviceId}.json`).text);
  assert.equal(manifestA.format, sync.FORMAT);
  assert.deepEqual(Object.keys(manifestA.documents).sort(), ["d1", "d2"]);
  assert.ok(dir.files.has(manifestA.documents.d1.file), "the manifest names a file that is there");
  assert.match(manifestA.documents.d1.file, /^documents\/[0-9a-f]{32}\/[0-9a-f]{64}\.bcps$/);
  assert.deepEqual(manifestA.folders.map(value => value.name), ["Kunder"]);
  // Only document entries are in the folder: no settings, license or state.
  for (const [key, value] of dir.files) {
    if (key.startsWith("documents/")) assert.doesNotMatch(value.text, /t9_settings|t9_tenant_license|t9_library_sync_state/);
  }

  // The second computer fetches them with their folder.
  run = await b.sync(dir);
  assert.equal(run.result.pulled, 2);
  assert.equal(run.result.pushed, 0);
  assert.deepEqual(b.entries("d1"), a.entries("d1"));
  assert.equal(b.records.find(record => record.projectId === "d1").folderId, "folder-customers");
  assert.equal(folderModel.find(b.tree, "folder-customers").name, "Kunder");
  // A fetch is undoable like an import.
  const undoMeta = await transfer.readUndo(b.area, keys);
  assert.equal(undoMeta.kind, "sync");
  assert.deepEqual(undoMeta.newIds.sort(), ["d1", "d2"]);

  // Nothing changed: nothing is written or fetched on either computer.
  const filesBefore = new Map([...dir.files].filter(([key]) => key.startsWith("documents/")));
  run = await b.sync(dir);
  assert.deepEqual([run.result.pushed, run.result.pulled, run.result.removedHere], [0, 0, 0]);
  run = await a.sync(dir);
  assert.deepEqual([run.result.pushed, run.result.pulled, run.result.removedHere], [0, 0, 0]);
  assert.deepEqual([...dir.files].filter(([key]) => key.startsWith("documents/")).map(([key]) => key),
    [...filesBefore.keys()], "no new document files");

  // A change on one computer reaches the other.
  await b.edit("d1", "b");
  run = await b.sync(dir);
  assert.equal(run.result.pushed, 1);
  run = await a.sync(dir);
  assert.equal(run.result.pulled, 1);
  assert.deepEqual(a.entries("d1"), b.entries("d1"));
  assert.equal(a.entries("d1")["t9_review_d1"].tasks[0].title, "Steg b");
  assert.deepEqual((await transfer.readUndo(a.area, keys)).replacedIds, ["d1"]);

  // A document deleted on one computer is removed on the other only when the user lets it.
  await a.delete("d2");
  run = await a.sync(dir);
  assert.equal(run.result.removedThere, 1);
  assert.ok(JSON.parse(dir.files.get(`devices/${a.state.deviceId}.json`).text).deleted.d2);
  let prepared = await b.prepare(dir);
  assert.equal(prepared.items.find(item => item.id === "d2").action, "deleteHere");
  assert.equal(prepared.needsDecision, true);
  run = await b.sync(dir);
  assert.equal(run.result.deletionsLeft, 1);
  assert.ok(Object.keys(b.entries("d2")).length, "kept until the user lets it go");
  const beforeRemoval = b.entries("d2");
  run = await b.sync(dir, { deleteHere: true });
  assert.equal(run.result.removedHere, 1);
  assert.deepEqual(b.entries("d2"), {});
  assert.equal(b.records.some(record => record.projectId === "d2"), false);
  // The removal can be undone; the restored document is then saved in the folder again.
  const undone = await transfer.undo({ storage: b.area, keys, records: b.records, tree: b.tree,
    normalize: library.normalize, saveLibrary: async (tree, records) => { b.tree = tree; b.records = records; } });
  assert.deepEqual(undone.meta.removedIds, ["d2"]);
  assert.deepEqual(b.entries("d2"), beforeRemoval);
  assert.ok(b.records.some(record => record.projectId === "d2"));
  prepared = await b.prepare(dir);
  assert.equal(prepared.items.find(item => item.id === "d2").action, "push");
  run = await b.sync(dir);
  // A's older record of the deletion does not ask B again, nor remove what B restored.
  prepared = await b.prepare(dir);
  assert.equal(prepared.items.find(item => item.id === "d2").action, "same");
  assert.equal(prepared.needsDecision, false);
  run = await a.sync(dir);
  assert.equal(run.result.pulled, 1, "the document B kept comes back to A");
  assert.ok(Object.keys(a.entries("d2")).length);

  // A computer that synchronizes again before the others does not fetch their older
  // version of what it just saved, nor their older folder names.
  await a.edit("d1", "a1");
  a.tree = folderModel.rename(a.tree, "folder-customers", "Kunder A", at());
  run = await a.sync(dir);
  assert.equal(run.result.pushed, 1);
  run = await a.sync(dir);
  assert.deepEqual([run.result.pushed, run.result.pulled, run.result.removedHere, run.result.conflictsLeft], [0, 0, 0, 0]);
  assert.equal(a.entries("d1")["t9_review_d1"].tasks[0].title, "Steg a1");
  assert.equal(folderModel.find(a.tree, "folder-customers").name, "Kunder A");
  run = await b.sync(dir);
  assert.equal(b.entries("d1")["t9_review_d1"].tasks[0].title, "Steg a1");
  assert.equal(folderModel.find(b.tree, "folder-customers").name, "Kunder A");
  a.tree = folderModel.rename(a.tree, "folder-customers", "Kunder", at());
  await a.sync(dir);
  await b.sync(dir);

  // A document changed on both computers is a conflict; it waits until the user decides.
  await a.edit("d1", "a2");
  await b.edit("d1", "b2");
  run = await a.sync(dir);
  assert.equal(run.result.pushed, 1);
  prepared = await b.prepare(dir);
  const conflict = prepared.items.find(item => item.id === "d1");
  assert.equal(conflict.action, "conflict");
  assert.equal(conflict.conflict, "both");
  run = await b.sync(dir);
  assert.equal(run.result.conflictsLeft, 1);
  assert.equal(b.entries("d1")["t9_review_d1"].tasks[0].title, "Steg b2", "nothing is decided for the user");
  run = await b.sync(dir, { conflicts: "theirs" });
  assert.equal(run.result.pulled, 1);
  assert.equal(b.entries("d1")["t9_review_d1"].tasks[0].title, "Steg a2");
  // Keeping this computer's version saves it in the folder for the others.
  await a.edit("d1", "a3");
  await b.edit("d1", "b3");
  await a.sync(dir);
  run = await b.sync(dir, { conflicts: "mine" });
  assert.equal(run.result.pushed, 1);
  run = await a.sync(dir);
  assert.equal(a.entries("d1")["t9_review_d1"].tasks[0].title, "Steg b3");

  // The same change on both computers is no conflict.
  await a.edit("d1", "same");
  await b.edit("d1", "same");
  await a.sync(dir);
  prepared = await b.prepare(dir);
  assert.equal(prepared.items.find(item => item.id === "d1").action, "adopt");

  // Folders: a rename on one computer and a new folder on the other both survive.
  a.tree = folderModel.rename(a.tree, "folder-customers", "Kunder 2026", at());
  b.tree = folderModel.create(b.tree, { name: "Leverantörer", folderId: "folder-vendors", now: at() }).tree;
  await b.sync(dir);
  await a.sync(dir);
  await b.sync(dir);
  for (const side of [a, b]) {
    assert.deepEqual(side.tree.folders.map(value => value.name).sort(), ["Kunder 2026", "Leverantörer"], side.name);
  }

  // A document being recorded is left as it is.
  b.add("d3");
  b.activeId = "d3";
  prepared = await b.prepare(dir);
  assert.equal(prepared.items.find(item => item.id === "d3").action, "busy");
  b.activeId = "";

  // A manifest that names a file that has not arrived yet: the document waits.
  const c = computer("C");
  c.add("d4");
  await c.connect(dir);
  await c.sync(dir);
  const manifestC = JSON.parse(dir.files.get(`devices/${c.state.deviceId}.json`).text);
  const fileD4 = dir.files.get(manifestC.documents.d4.file);
  dir.files.delete(manifestC.documents.d4.file);
  prepared = await a.prepare(dir);
  const waiting = prepared.items.find(item => item.id === "d4");
  assert.equal(waiting.action, "waiting");
  assert.equal(waiting.reason, "missing");
  run = await a.sync(dir);
  assert.equal(run.result.waiting, 1);
  assert.equal(a.records.some(record => record.projectId === "d4"), false);
  // A file whose content is not the version named is not used.
  dir.files.set(manifestC.documents.d4.file, { ...fileD4, text: fileD4.text.replace("Ny a", "Ny x") });
  prepared = await a.prepare(dir);
  assert.equal(prepared.items.find(item => item.id === "d4").action, "waiting");
  dir.files.set(manifestC.documents.d4.file, fileD4);
  run = await a.sync(dir);
  assert.equal(run.result.pulled, 1);

  // A computer that has not seen a deletion does not bring the document back.
  await a.delete("d4");
  await a.sync(dir);
  prepared = await b.prepare(dir);
  assert.equal(prepared.items.find(item => item.id === "d4").action, "same", "B never had it: nothing to do");
  run = await b.sync(dir);
  assert.equal(b.records.some(record => record.projectId === "d4"), false);
  prepared = await a.prepare(dir);
  assert.equal(prepared.items.find(item => item.id === "d4").action, "same",
    "C's older copy does not come back");

  // A write that fails here is rolled back, and this computer's state is not changed.
  await b.edit("d1", "b4");
  await b.sync(dir);
  const stateA = JSON.stringify(a.state);
  const entriesA = a.entries("d1");
  a.area.sets = 0;
  a.area.failAt = 4;
  await assert.rejects(a.sync(dir), /QUOTA_BYTES/);
  a.area.failAt = 0;
  assert.equal(JSON.stringify(a.state), stateA);
  assert.deepEqual(a.entries("d1"), entriesA);
  assert.equal(await transfer.readUndo(a.area, keys), null);
  run = await a.sync(dir);
  assert.equal(a.entries("d1")["t9_review_d1"].tasks[0].title, "Steg b4");

  // A manifest from a later version stops the synchronization before anything is written.
  const later = folder();
  later.files.set("devices/device-future.json", { text: JSON.stringify({ format: sync.FORMAT,
    formatVersion: 2, deviceId: "device-future", documents: {}, deleted: {} }), lastModified: 1 });
  const d = computer("D");
  d.add("d5");
  await d.connect(later);
  await assert.rejects(d.sync(later), error => error.code === "newerVersion");
  assert.deepEqual([...later.files.keys()], ["devices/device-future.json"]);
  // Copies a synchronizing service makes and other files are not read as manifests.
  later.files.set("devices/device-future-LAPTOP.json", { text: "{", lastModified: 1 });
  later.files.delete("devices/device-future.json");
  later.files.set("devices/notes.txt", { text: "x", lastModified: 1 });
  run = await d.sync(later);
  assert.equal(run.result.pushed, 1);

  // Files no manifest refers to are removed once they are old enough.
  const stale = "documents/00000000000000000000000000000000/old.bcps";
  const fresh = "documents/00000000000000000000000000000000/new.bcps";
  dir.files.set(stale, { text: "x", lastModified: Date.parse("2026-10-01T00:00:00.000Z") });
  dir.files.set(fresh, { text: "x", lastModified: Date.parse("2026-11-08T08:59:00.000Z") });
  // Not while a manifest cannot be read: it may name the file (a service still copying it).
  dir.files.set("devices/device-halfway.json", { text: "{\"format\":", lastModified: 1 });
  run = await a.sync(dir);
  assert.equal(run.result.unreadable, 1);
  assert.equal(dir.files.has(stale), true, "kept while a manifest is unreadable");
  dir.files.delete("devices/device-halfway.json");
  // An old file seen for the first time is kept: a service may deliver it before the manifest
  // that names it.
  await a.sync(dir);
  assert.equal(dir.files.has(stale), true, "kept when first seen, however old the file is");
  assert.ok(a.state.unreferenced[stale], "the time it was first seen is kept");
  const firstSeen = a.state.unreferenced[stale];
  await a.sync(dir);
  assert.equal(a.state.unreferenced[stale], firstSeen, "first seen stays the first time");
  // Once no manifest has named it for seven days it is removed; a recently written file is not.
  for (const path of [stale, fresh]) a.state.unreferenced[path] = "2026-10-30T00:00:00.000Z";
  await a.sync(dir);
  assert.equal(dir.files.has(stale), false);
  assert.equal(dir.files.has(fresh), true);
  await a.sync(dir);
  assert.equal(a.state.unreferenced[stale], undefined, "forgotten once the file is gone");
  const referenced = new Set([...dir.files].filter(([key]) => key.startsWith("devices/"))
    .flatMap(([, value]) => Object.values(JSON.parse(value.text).documents).map(entry => entry.file)));
  for (const file of referenced) assert.ok(dir.files.has(file), `${file} is still there`);

  // A state from a later version is neither used nor overwritten.
  assert.deepEqual(sync.readState({ schemaVersion: 2 }), { supported: false, state: null, previous: null });
  assert.equal(sync.readState(null).state, null);
  // Disconnecting keeps the computer's id, so its own manifest is its own when it connects again.
  const parked = sync.disconnect(a.state);
  assert.deepEqual(Object.keys(parked).sort(), ["deviceId", "disconnected", "schemaVersion"]);
  const reread = sync.readState(parked);
  assert.equal(reread.state, null, "not connected");
  assert.equal(sync.connect(reread.previous, "OneDrive").deviceId, a.state.deviceId);

  // Folder lists that arrive late: a rename another computer made after the newest list
  // still counts, and the newest list decides which folders there are.
  const lists = [
    { deviceId: "device-x", foldersChangedAt: "2026-11-08T10:00:00.000Z", folders: [
      { folderId: "f1", name: "Kunder", parentId: "", modifiedAt: "2026-11-01T00:00:00.000Z" },
      { folderId: "f2", name: "Gammal", parentId: "", modifiedAt: "2026-11-01T00:00:00.000Z" }] },
    { deviceId: "device-y", foldersChangedAt: "2026-11-08T11:00:00.000Z", folders: [
      { folderId: "f1", name: "Kunder", parentId: "", modifiedAt: "2026-11-01T00:00:00.000Z" },
      { folderId: "f3", name: "Ny", parentId: "", modifiedAt: "2026-11-08T11:00:00.000Z" }] },
    { deviceId: "device-z", foldersChangedAt: "2026-11-08T09:00:00.000Z", folders: [
      { folderId: "f1", name: "Kunder 2026", parentId: "", modifiedAt: "2026-11-08T09:00:00.000Z" }] }
  ];
  assert.deepEqual(sync.remoteFolderView(lists).map(folder => `${folder.folderId}:${folder.name}`).sort(),
    ["f1:Kunder 2026", "f3:Ny"]);

  // A computer whose clock is behind still stamps its new version after the one it replaces.
  const e = computer("E");
  const f = computer("F");
  const skew = folder();
  e.add("d6");
  await e.connect(skew);
  await f.connect(skew);
  await e.sync(skew);
  await f.sync(skew);
  await e.edit("d6", "e1");
  await e.sync(skew);
  const ahead = JSON.parse(skew.files.get(`devices/${e.state.deviceId}.json`).text);
  ahead.documents.d6.changedAt = "2027-01-01T00:00:00.000Z";
  skew.files.set(`devices/${e.state.deviceId}.json`, { text: JSON.stringify(ahead), lastModified: 1 });
  await f.edit("d6", "f1");
  run = await f.sync(skew, { conflicts: "mine" });
  assert.equal(run.result.pushed, 1);
  assert.ok(f.state.published.d6.changedAt > "2027-01-01T00:00:00.000Z");
  prepared = await f.prepare(skew);
  assert.equal(prepared.items.find(item => item.id === "d6").action, "same", "the decision holds");
  run = await e.sync(skew);
  assert.equal(e.entries("d6")["t9_review_d6"].tasks[0].title, "Steg f1");

  // receive: false fetches and removes nothing (an import can still be undone); it waits.
  await f.edit("d6", "f2");
  await f.sync(skew);
  run = await e.sync(skew, { receive: false });
  assert.deepEqual([run.result.pulled, run.result.deferred], [0, 1]);
  assert.equal(e.entries("d6")["t9_review_d6"].tasks[0].title, "Steg f1");
  run = await e.sync(skew);
  assert.equal(run.result.pulled, 1);

  // Undoing a synchronization puts back the folders it changed and keeps those changed after it.
  const g = computer("G");
  const h = computer("H");
  const folders = folder();
  g.add("d7");
  g.tree = folderModel.create(g.tree, { name: "Delad", folderId: "folder-shared", now: at() }).tree;
  await g.connect(folders);
  await h.connect(folders);
  await g.sync(folders);
  await h.sync(folders);
  h.tree = folderModel.create(h.tree, { name: "Från H", folderId: "folder-h", now: at() }).tree;
  await h.edit("d7", "h1");
  await h.sync(folders);
  run = await g.sync(folders);
  assert.equal(run.result.pulled, 1);
  assert.ok(folderModel.find(g.tree, "folder-h"));
  g.tree = folderModel.create(g.tree, { name: "Q4", folderId: "folder-q4", now: at() }).tree;
  g.tree = folderModel.rename(g.tree, "folder-shared", "Delad 2026", at());
  const undoneSync = await transfer.undo({ storage: g.area, keys, records: g.records, tree: g.tree,
    normalize: library.normalize, saveLibrary: async (tree, records) => { g.tree = tree; g.records = records; } });
  assert.equal(undoneSync.meta.kind, "sync");
  assert.equal(folderModel.find(g.tree, "folder-h"), null, "the folder the sync added goes");
  assert.equal(folderModel.find(g.tree, "folder-q4").name, "Q4", "a folder made after the sync stays");
  assert.equal(folderModel.find(g.tree, "folder-shared").name, "Delad 2026", "a rename after the sync stays");

  // Holes closed after the first release.
  const k = computer("K");
  const l = computer("L");
  const holes = folder();
  k.add("d8");
  k.add("d9");
  await k.connect(holes);
  await l.connect(holes);
  await k.sync(holes);
  await l.sync(holes);
  // A copy a synchronizing service made of a manifest is ignored, not unreadable.
  const original = holes.files.get(`devices/${k.state.deviceId}.json`);
  holes.files.set(`devices/${k.state.deviceId}-LAPTOP.json`, { ...original });
  prepared = await l.prepare(holes);
  assert.equal(prepared.unreadable, 0, "a renamed copy is not an unreadable manifest");
  holes.files.delete(`devices/${k.state.deviceId}-LAPTOP.json`);
  // A document stored here but missing from out-of-date records is not deleted everywhere.
  const listed = l.records;
  l.records = l.records.filter(record => record.projectId !== "d8");
  prepared = await l.prepare(holes);
  assert.equal(prepared.items.find(item => item.id === "d8").action, "busy");
  assert.equal(prepared.counts.deleteThere, 0);
  l.records = listed;
  // A document open for review here is left as it is.
  await k.edit("d9", "k1");
  await k.sync(holes);
  l.activeIds = ["d9"];
  prepared = await l.prepare(holes);
  assert.equal(prepared.items.find(item => item.id === "d9").action, "busy");
  l.activeIds = [];
  // A document changed here after it was compared is neither replaced nor removed.
  l.beforeCommit = () => l.edit("d9", "l-during");
  run = await l.sync(holes);
  l.beforeCommit = null;
  assert.deepEqual([run.result.pulled, run.result.changedDuring], [0, 1]);
  assert.equal(l.entries("d9")["t9_review_d9"].tasks[0].title, "Steg l-during", "the edit is kept");
  prepared = await l.prepare(holes);
  assert.equal(prepared.items.find(item => item.id === "d9").action, "conflict", "compared again next time");
  // A file of this computer's that was removed from the folder is saved again.
  const ownFile = k.state.published.d8.file;
  holes.files.delete(ownFile);
  run = await k.sync(holes);
  assert.equal(run.result.pushed, 1);
  assert.ok(holes.files.has(ownFile), "written again");
  run = await k.sync(holes);
  assert.equal(run.result.pushed, 0, "and then left alone");

  // The dashboard is wired to the module and has its texts in every language.
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "src/ui/dashboard.html"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "src/ui/dashboard.js"), "utf8");
  assert.ok(html.indexOf("document/library-sync.js") > html.indexOf("document/library-transfer.js"));
  for (const id of ["librarySync", "librarySyncDialog", "librarySyncChoose", "librarySyncNow",
    "librarySyncDisconnect", "librarySyncConflicts", "librarySyncStatus"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  global.window = global;
  require("../src/engine/language-registry");
  require("../src/ui/i18n");
  const used = [...new Set([...html.matchAll(/data-i18n(?:-aria-label)?="(sync\.[A-Za-z]+)"/g),
    ...dashboard.matchAll(/"(sync\.[A-Za-z]+)"/g)].map(match => match[1])), "sync.undoTitle"];
  assert.ok(used.length >= 50, `${used.length} sync texts are used`);
  const locales = require("../src/engine/language-registry").supported().map(item => item.locale);
  for (const locale of locales) {
    for (const key of used) {
      const value = globalThis.T9UiI18n.translate(key, locale);
      assert.ok(value && value !== key, `${key} in ${locale}`);
    }
  }
  // Errors are shown by their code.
  for (const code of ["newerVersion", "permissionDenied", "folderMissing", "unsupported", "busySync", "restoreFirst"]) {
    assert.match(dashboard, new RegExp(`"${code}"`), code);
    for (const locale of locales) assert.notEqual(globalThis.T9UiI18n.translate(`sync.${code}`, locale), `sync.${code}`);
  }
  console.log("Library sync tests passed.");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
