// Keeping the library the same on several computers through a folder they share, for example
// a folder that OneDrive already synchronizes. The extension only reads and writes files in
// that folder; whatever synchronizes the folder moves them between computers.
//
// The folder holds:
//   devices/<deviceId>.json                 one manifest per computer, written only by it
//   documents/<id hash>/<version>.bcps      one file per document version (library-transfer
//                                           format), never changed once written
// Each computer writes only its own manifest and new files, so two computers never write the
// same file and the synchronizing service has no conflicting copies to make.
//
// A manifest lists the documents the computer has (version, file, when it changed) and the
// documents it knows to be deleted. Each computer keeps, per document, the version it last
// agreed with the folder ("base"): a document changed only here is saved in the folder, one
// changed only elsewhere is fetched, and one changed in both places is a conflict the user
// decides. Fetched and removed documents are written with the library import (with undo and
// rollback); deletions and conflicts are never applied without the user.
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const api = factory(node ? require("./library-transfer") : root.T9LibraryTransfer,
    node ? require("./document-folders") : root.T9DocumentFolders);
  if (node) module.exports = api;
  root.T9LibrarySync = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (transfer, folderModel) {
  const FORMAT = "bc-process-studio-sync";
  const FORMAT_VERSION = 1;
  const STATE_SCHEMA_VERSION = 1;
  const DEVICES = "devices";
  const DOCUMENTS = "documents";
  const DELETED = "deleted";
  // A file no manifest refers to is removed when it is this old: a newer manifest that refers
  // to it may still be on its way from another computer.
  const UNREFERENCED_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  function syncError(code, detail = "") {
    const error = new Error(`sync.${code}`);
    error.code = code;
    if (detail) error.detail = detail;
    return error;
  }

  const DEVICE_ID = /^device-[A-Za-z0-9-]{1,80}$/u;
  function newDeviceId() {
    const random = globalThis.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    return `device-${random}`;
  }

  // The state this computer keeps. A state from a later version is not used or overwritten.
  // previous is what connect() takes: a disconnected computer keeps its id, so that its own
  // manifest in the folder is not mistaken for another computer's when it connects again.
  function readState(value) {
    if (!value || typeof value !== "object") return { supported: true, state: null, previous: null };
    if (value.schemaVersion !== STATE_SCHEMA_VERSION) return { supported: false, state: null, previous: null };
    if (value.disconnected) return { supported: true, state: null, previous: value };
    return { supported: true, state: value, previous: value };
  }

  function disconnect(state) {
    return DEVICE_ID.test(state?.deviceId || "")
      ? { schemaVersion: STATE_SCHEMA_VERSION, deviceId: state.deviceId, disconnected: true } : null;
  }

  // Connecting a folder starts over with it; the computer keeps its id.
  function connect(previous, folderName, now = new Date().toISOString()) {
    const deviceId = DEVICE_ID.test(previous?.deviceId || "") ? previous.deviceId : newDeviceId();
    return { schemaVersion: STATE_SCHEMA_VERSION, deviceId, folderName: String(folderName || ""),
      connectedAt: now, lastSyncAt: "", base: {}, published: {}, deleted: {},
      folders: null, publishedFolders: null, foldersChangedAt: "" };
  }

  async function documentVersion(digest, record) {
    return transfer.sha256(`${digest}\n${transfer.recordFingerprint(record)}`);
  }

  async function documentPath(id, version) {
    return `${DOCUMENTS}/${(await transfer.sha256(id)).slice(0, 32)}/${version}${transfer.FILE_EXTENSION}`;
  }

  // The current version of every document in the library.
  async function localVersions({ storage, keys, records }) {
    const byId = new Map(records.map(record => [record.projectId || record.sessionId, record]));
    const digests = await transfer.localDigests(storage, keys, [...byId.keys()].filter(transfer.validId));
    const result = new Map();
    for (const [id, { digest }] of digests) {
      result.set(id, { digest, record: byId.get(id), version: await documentVersion(digest, byId.get(id)) });
    }
    return result;
  }

  // The manifests in the folder. Copies a synchronizing service makes of a manifest have other
  // names and are not read; a manifest from a later version stops the synchronization.
  async function readManifests(dir) {
    const manifests = [];
    let unreadable = 0;
    for (const file of await dir.list(DEVICES)) {
      const name = file.path.slice(DEVICES.length + 1);
      const match = /^(device-[A-Za-z0-9-]{1,80})\.json$/u.exec(name);
      if (!match) continue;
      let value;
      try {
        value = JSON.parse(await dir.readText(file.path));
      } catch {
        unreadable += 1;
        continue;
      }
      if (!value || value.format !== FORMAT) { unreadable += 1; continue; }
      // A copy a synchronizing service made under another name (device-…-LAPTOP.json) is not
      // that computer's manifest.
      if (value.deviceId !== match[1]) continue;
      if (!Number.isInteger(value.formatVersion) || value.formatVersion > FORMAT_VERSION) {
        throw syncError("newerVersion");
      }
      manifests.push({ ...value, documents: plain(value.documents), deleted: plain(value.deleted),
        folders: Array.isArray(value.folders) ? value.folders : null });
    }
    return { manifests, unreadable };
  }

  function plain(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  // What the other computers have: for each document, the newest version or deletion.
  function remoteView(manifests) {
    const view = new Map();
    const newer = (candidate, current) => !current || candidate.changedAt > current.changedAt ||
      (candidate.changedAt === current.changedAt && (current.kind === DELETED && candidate.kind !== DELETED ||
        (candidate.kind === current.kind && String(candidate.version) > String(current.version))));
    for (const manifest of manifests) {
      for (const [id, entry] of Object.entries(manifest.documents)) {
        if (!transfer.validId(id) || typeof entry?.version !== "string" || typeof entry.file !== "string") continue;
        const candidate = { kind: "document", version: entry.version, file: entry.file,
          changedAt: String(entry.changedAt || ""), title: String(entry.title || ""),
          modifiedAt: String(entry.modifiedAt || ""), deviceId: manifest.deviceId };
        if (newer(candidate, view.get(id))) view.set(id, candidate);
      }
      for (const [id, entry] of Object.entries(manifest.deleted)) {
        if (!transfer.validId(id)) continue;
        const candidate = { kind: DELETED, version: DELETED, changedAt: String(entry?.deletedAt || ""),
          deviceId: manifest.deviceId };
        if (newer(candidate, view.get(id))) view.set(id, candidate);
      }
    }
    return view;
  }

  const folderKey = folder => folder ? `${folder.name}\u0000${folder.parentId || ""}` : "";

  // The folders after synchronizing: a folder changed only on one side takes that side's
  // name and place; one changed on both keeps this computer's.
  function mergeFolders(tree, base, remote) {
    if (!remote) return tree;
    const local = new Map(tree.folders.map(folder => [folder.folderId, folder]));
    const before = new Map((base || []).map(folder => [folder.folderId, folder]));
    const theirs = new Map(remote.filter(folder => folder?.folderId).map(folder => [folder.folderId, folder]));
    const ids = [...new Set([...local.keys(), ...theirs.keys(), ...before.keys()])];
    const folders = [];
    for (const id of ids) {
      const mine = local.get(id);
      const other = theirs.get(id);
      const was = before.get(id);
      const changedHere = folderKey(mine) !== folderKey(was);
      const changedThere = folderKey(other) !== folderKey(was);
      const chosen = !changedThere ? mine : !changedHere ? other : mine;
      if (chosen) folders.push({ ...chosen });
    }
    const read = folderModel.read({ ...folderModel.serialize(tree), folders });
    return read.supported ? read.tree : tree;
  }

  // The folders as the computers agree on them. The newest list says which folders there
  // are; a folder another computer changed after that list was made counts with its newer
  // name and place, so a list that arrived late does not undo another computer's change.
  function remoteFolderView(manifests) {
    const lists = manifests.filter(manifest => Array.isArray(manifest.folders) && manifest.foldersChangedAt)
      .sort((a, b) => String(b.foldersChangedAt).localeCompare(String(a.foldersChangedAt)));
    if (!lists.length) return null;
    const newest = lists[0];
    const view = new Map(newest.folders.filter(folder => folder?.folderId)
      .map(folder => [folder.folderId, folder]));
    for (const manifest of lists.slice(1)) {
      for (const folder of manifest.folders) {
        if (!folder?.folderId) continue;
        const known = view.get(folder.folderId);
        const changed = String(folder.modifiedAt || "");
        if (known ? changed > String(known.modifiedAt || "") : changed > String(newest.foldersChangedAt)) {
          view.set(folder.folderId, folder);
        }
      }
    }
    return [...view.values()];
  }

  const folderList = tree => folderModel.serialize(tree).folders.map(
    ({ folderId, name, parentId, createdAt, modifiedAt }) => ({ folderId, name, parentId, createdAt, modifiedAt }));

  // Reads a document file from the folder and checks that it holds the version listed.
  async function inspect(dir, keys, id, remote) {
    let inspection;
    try {
      inspection = await transfer.read(await dir.readLines(remote.file), keys);
    } catch (error) {
      return { ready: false, reason: error?.code === "newerVersion" ? "newerVersion" : "unreadable" };
    }
    const item = inspection.items.length === 1 && inspection.items[0].id === id ? inspection.items[0] : null;
    if (!item || await documentVersion(item.digest, item.record) !== remote.version) {
      return { ready: false, reason: "unreadable" };
    }
    return { ready: true, item };
  }

  // What synchronizing would do with each document.
  //   same          unchanged everywhere
  //   adopt         changed in the same way here and elsewhere
  //   push          changed here: saved in the folder
  //   pull          changed elsewhere: fetched
  //   deleteThere   deleted here: recorded as deleted in the folder
  //   deleteHere    deleted elsewhere: removed here (the user confirms)
  //   conflict      changed both here and elsewhere (the user decides)
  //   busy          being recorded now; left as it is
  //   waiting       its file has not arrived in the folder yet
  // activeIds: documents being recorded or edited now; they are left as they are.
  async function prepare({ dir, storage, keys, records, state, tree, activeId = "", activeIds = [] }) {
    const active = new Set([activeId, ...activeIds].filter(Boolean));
    const { manifests, unreadable } = await readManifests(dir);
    const others = manifests.filter(manifest => manifest.deviceId !== state.deviceId);
    // What this computer last saved in the folder takes part as well: when it is the newest,
    // an older version on another computer is no change there. It comes from this computer's
    // state, so an earlier connection's manifest in the folder is not used.
    const own = { deviceId: state.deviceId, documents: plain(state.published),
      deleted: Object.fromEntries(Object.entries(plain(state.deleted)).map(([id, deletedAt]) => [id, { deletedAt }])),
      folders: state.publishedFolders || null, foldersChangedAt: state.foldersChangedAt || "" };
    const remote = remoteView([...others, own]);
    const local = await localVersions({ storage, keys, records });
    const files = new Map((await dir.list(DOCUMENTS)).map(file => [file.path, file]));
    const base = plain(state.base);
    const published = plain(state.published);
    const tombstones = plain(state.deleted);
    const ids = [...new Set([...local.keys(), ...Object.keys(base), ...remote.keys()])]
      .filter(transfer.validId);
    // A document that is stored here but missing from the records given is not deleted here:
    // the records are out of date. It is left as it is rather than deleted on every computer.
    const unlisted = await transfer.localDigests(storage, keys,
      ids.filter(id => !local.has(id) && (base[id] || remote.has(id))));
    const items = [];
    for (const id of ids) {
      const mine = local.get(id);
      const was = base[id] || null;
      let theirs = remote.get(id) || null;
      // A version older than this computer's record of the deletion is a stale copy.
      if (theirs?.kind === "document" && tombstones[id] && theirs.changedAt <= tombstones[id]) theirs = null;
      const remoteVersion = theirs ? theirs.version : undefined;
      const changedHere = was ? mine?.version !== was.local : Boolean(mine);
      const changedThere = theirs ? (was ? remoteVersion !== was.remote : remoteVersion !== DELETED) : false;
      const title = String(mine?.record?.title || theirs?.title || id);
      const item = { id, title, local: mine || null, remote: theirs, action: "same" };
      if (active.has(id) || unlisted.has(id)) item.action = "busy";
      else if (!changedHere && !changedThere) {
        // Saved again when it is not in the folder: never saved, or its file was removed there.
        item.action = mine && (!published[id] || published[id].version === mine.version &&
          !files.has(published[id].file)) ? "push" : "same";
      } else if (changedHere && !changedThere) {
        item.action = mine ? "push" : "deleteThere";
      } else if (!changedHere && changedThere) {
        item.action = remoteVersion === DELETED ? (mine ? "deleteHere" : "adopt") : "pull";
      } else if (mine && remoteVersion === mine.version) item.action = "adopt";
      else if (!mine && remoteVersion === DELETED) item.action = "adopt";
      else {
        item.action = "conflict";
        item.conflict = !mine ? "deletedHere" : remoteVersion === DELETED ? "deletedThere" : "both";
      }
      if (theirs?.kind === "document" && (item.action === "pull" || item.action === "conflict")) {
        const checked = files.has(theirs.file) ? await inspect(dir, keys, id, theirs)
          : { ready: false, reason: "missing" };
        if (checked.ready) item.incoming = checked.item;
        else if (item.action === "pull") { item.action = "waiting"; item.reason = checked.reason; }
        else item.incomingMissing = checked.reason;
      }
      items.push(item);
    }
    const folders = mergeFolders(tree, state.folders, remoteFolderView([...others, own]));
    const count = action => items.filter(item => item.action === action).length;
    const counts = Object.fromEntries(["same", "adopt", "push", "pull", "deleteThere", "deleteHere",
      "conflict", "busy", "waiting"].map(action => [action, count(action)]));
    return { manifests, others, items, files, folders, counts, unreadable,
      needsDecision: counts.conflict > 0 || counts.deleteHere > 0 };
  }

  // A fresh reading of the fetched files as one import file.
  async function* joinedLines(dir, list) {
    yield JSON.stringify({ type: "header", format: transfer.FORMAT, formatVersion: transfer.FORMAT_VERSION,
      exportedAt: new Date().toISOString(), appVersion: "", scope: { kind: "sync" }, folders: [],
      itemCount: list.length });
    let itemCount = 0;
    let entryCount = 0;
    for (const file of list) {
      for await (const line of await dir.readLines(file)) {
        // Lines are written with their type first; large entry lines are not parsed here.
        if (line.startsWith("{\"type\":\"header\"") || line.startsWith("{\"type\":\"end\"")) continue;
        if (line.startsWith("{\"type\":\"item\",")) itemCount += 1;
        if (line.startsWith("{\"type\":\"entry\"")) entryCount += 1;
        yield line;
      }
    }
    yield JSON.stringify({ type: "end", itemCount, entryCount });
  }

  // Writes a document's file, checking that what was written is the version compared.
  async function writeDocument({ dir, storage, keys, tree, item, path, appVersion }) {
    let written = "";
    const source = transfer.exportLines({ storage, keys, appVersion,
      items: [{ id: item.id, record: item.local.record }],
      folders: transfer.exportFolders(tree, [item.local.record]), scope: { kind: "sync" } });
    async function* lines() {
      for await (const line of source) {
        if (line.startsWith("{\"type\":\"itemEnd\"")) written = JSON.parse(line).digest;
        yield line;
      }
    }
    await dir.writeLines(path, lines());
    if (written === item.local.digest) return true;
    // Changed while it was written: saved next time.
    await dir.remove(path).catch(() => {});
    return false;
  }

  // Carries out the synchronization prepared. decisions.conflicts: "mine", "theirs" or
  // "later"; decisions.deleteHere: whether documents deleted elsewhere are removed here.
  // saveState(state) stores this computer's state; saveLibrary(tree, records) the library.
  async function commit({ prepared, dir, storage, keys, records, tree, state, decisions = {},
    saveLibrary, saveState, normalize = value => value, appVersion = "",
    reload = async value => value, now = new Date().toISOString(), onProgress = () => {} }) {
    const conflicts = ["mine", "theirs"].includes(decisions.conflicts) ? decisions.conflicts : "later";
    const pushes = [];
    const pulls = [];
    const removeHere = [];
    const removeThere = [];
    const adopted = [];
    const left = { conflict: 0, deleteHere: 0, deferred: 0 };
    // decisions.receive === false: nothing is fetched or removed here this time (it would
    // replace an import that can still be undone); it is counted as deferred.
    const receive = decisions.receive !== false;
    for (const item of prepared.items) {
      let action = item.action;
      if (action === "conflict") {
        if (conflicts === "later") { left.conflict += 1; continue; }
        if (conflicts === "mine") action = item.local ? "push" : "deleteThere";
        else if (item.remote.kind === DELETED) action = "deleteHere";
        else if (item.incoming) action = "pull";
        else { left.conflict += 1; continue; }
      }
      if (action === "deleteHere" && !decisions.deleteHere) { left.deleteHere += 1; continue; }
      if (!receive && (action === "pull" || action === "deleteHere")) { left.deferred += 1; continue; }
      if (action === "push") pushes.push(item);
      else if (action === "pull") pulls.push(item);
      else if (action === "deleteHere") removeHere.push(item);
      else if (action === "deleteThere") removeThere.push(item);
      else if (action === "adopt") adopted.push(item);
    }
    const next = { ...state, base: { ...plain(state.base) }, published: { ...plain(state.published) },
      deleted: { ...plain(state.deleted) } };

    // 1. Documents changed here go into the folder. Their files are written before the
    // manifest that names them.
    const pushed = [];
    let changedDuring = 0;
    for (const [index, item] of pushes.entries()) {
      onProgress({ phase: "sending", done: index, total: pushes.length });
      const path = await documentPath(item.id, item.local.version);
      if (prepared.files.has(path) ||
        await writeDocument({ dir, storage, keys, tree, item, path, appVersion })) pushed.push({ item, path });
      else changedDuring += 1;
    }

    // 2. Documents fetched or removed here, and the folders, are written like an import.
    const recordById = new Map(records.map(record => [record.projectId || record.sessionId, record]));
    // A document changed here since it was compared (in another tab, say) is not replaced or
    // removed; it is compared again next time.
    if (pulls.length || removeHere.length) {
      const current = await transfer.localDigests(storage, keys, [...pulls, ...removeHere].map(item => item.id));
      const unchanged = item => (current.get(item.id)?.digest || "") === (item.local?.digest || "");
      for (const list of [pulls, removeHere]) {
        const kept = list.filter(unchanged);
        changedDuring += list.length - kept.length;
        list.splice(0, list.length, ...kept);
      }
    }
    const removedIds = new Set(removeHere.map(item => item.id));
    const fetched = pulls.map(item => ({ id: item.id, digest: item.incoming.digest,
      status: recordById.has(item.id) ? "different" : "new", localRecord: recordById.get(item.id) || null,
      record: normalize({ ...item.incoming.record, projectId: item.id, sessionId: item.id }) }));
    const byId = new Map(fetched.map(item => [item.id, item.record]));
    const nextRecords = records.filter(record => !removedIds.has(record.projectId || record.sessionId))
      .map(record => byId.get(record.projectId || record.sessionId) || record);
    for (const [id, record] of byId) if (!recordById.has(id)) nextRecords.push(record);
    const foldersChanged = transfer.canonical(folderList(prepared.folders)) !== transfer.canonical(folderList(tree));
    if (fetched.length || removeHere.length) {
      onProgress({ phase: "receiving", done: 0, total: fetched.length });
      await transfer.apply({ storage, keys, kind: "sync", fileName: state.folderName, now,
        importId: `sync-${Date.now().toString(36)}`, oldFolders: folderModel.serialize(tree),
        lines: joinedLines(dir, pulls.map(item => item.remote.file)),
        change: { written: fetched, newIds: fetched.filter(item => item.status === "new").map(item => item.id),
          replacedIds: fetched.filter(item => item.status === "different").map(item => item.id),
          removed: removeHere.map(item => ({ id: item.id, localRecord: recordById.get(item.id) || null })),
          createdFolderIds: [], tree: prepared.folders, records: nextRecords },
        saveLibrary, onProgress: ({ done, total }) => onProgress({ phase: "receiving", done, total }) });
    } else if (foldersChanged) {
      await saveLibrary(prepared.folders, records);
    }

    // 3. What was fetched or removed here is recorded at once: it no longer depends on the
    // folder. Fetched documents are compared with the version they now have here, as the
    // library shows them after loading again (reload returns its records).
    const shown = fetched.length || removeHere.length || foldersChanged ? await reload(nextRecords) : records;
    if (fetched.length) {
      const actual = await localVersions({ storage, keys,
        records: shown.filter(record => byId.has(record.projectId || record.sessionId)) });
      for (const item of pulls) {
        next.base[item.id] = { local: actual.get(item.id)?.version || "", remote: item.remote.version };
        next.published[item.id] = { version: item.remote.version, file: item.remote.file,
          changedAt: item.remote.changedAt, title: item.remote.title, modifiedAt: item.remote.modifiedAt };
        delete next.deleted[item.id];
      }
    }
    for (const item of removeHere) {
      delete next.base[item.id];
      delete next.published[item.id];
      next.deleted[item.id] = item.remote.changedAt || now;
    }
    if (fetched.length || removeHere.length) await saveState(next);

    // 4. This computer's manifest.
    for (const { item, path } of pushed) {
      const previous = next.published[item.id];
      // A new version is stamped later than the version it replaces in the folder, also when
      // another computer's clock is ahead of this one's.
      const after = item.remote?.changedAt && Date.parse(item.remote.changedAt) >= Date.parse(now)
        ? new Date(Date.parse(item.remote.changedAt) + 1).toISOString() : now;
      next.published[item.id] = { version: item.local.version, file: path,
        changedAt: previous?.version === item.local.version && previous.changedAt ? previous.changedAt : after,
        title: String(item.local.record?.title || ""), modifiedAt: String(item.local.record?.modifiedAt || "") };
      delete next.deleted[item.id];
    }
    for (const item of removeThere) {
      delete next.published[item.id];
      next.deleted[item.id] = item.remote?.changedAt && Date.parse(item.remote.changedAt) >= Date.parse(now)
        ? new Date(Date.parse(item.remote.changedAt) + 1).toISOString() : now;
    }
    for (const item of adopted) {
      if (item.local && item.remote?.kind === "document") {
        next.published[item.id] = { version: item.remote.version, file: item.remote.file,
          changedAt: item.remote.changedAt, title: item.remote.title, modifiedAt: item.remote.modifiedAt };
      } else {
        delete next.published[item.id];
        if (item.remote?.kind === DELETED) next.deleted[item.id] = item.remote.changedAt || now;
      }
    }
    const folders = folderList(prepared.folders);
    const foldersChangedAt = transfer.canonical(folders) !== transfer.canonical(state.publishedFolders || null)
      ? now : state.foldersChangedAt || now;
    const manifest = { format: FORMAT, formatVersion: FORMAT_VERSION, deviceId: state.deviceId,
      appVersion, updatedAt: now, foldersChangedAt, folders,
      documents: next.published,
      deleted: Object.fromEntries(Object.entries(next.deleted).map(([id, deletedAt]) => [id, { deletedAt }])) };
    await dir.writeText(`${DEVICES}/${state.deviceId}.json`, JSON.stringify(manifest));

    // 5. Now the folder agrees with this computer.
    for (const { item } of pushed) next.base[item.id] = { local: item.local.version, remote: item.local.version };
    for (const item of removeThere) delete next.base[item.id];
    for (const item of adopted) {
      if (item.local) next.base[item.id] = { local: item.local.version, remote: item.remote.version };
      else delete next.base[item.id];
    }
    next.folders = folders;
    next.publishedFolders = folders;
    next.foldersChangedAt = foldersChangedAt;
    next.lastSyncAt = now;
    // When this computer first saw each file no manifest refers to.
    next.unreferenced = unreferencedSince([...prepared.others, manifest], prepared.files,
      plain(state.unreferenced), now);
    const result = { pushed: pushed.length, pulled: fetched.length, removedHere: removeHere.length,
      removedThere: removeThere.length, conflictsLeft: left.conflict, deletionsLeft: left.deleteHere,
      deferred: left.deferred,
      waiting: prepared.counts.waiting, busy: prepared.counts.busy, changedDuring,
      unreadable: prepared.unreadable, foldersChanged,
      newIds: fetched.filter(item => item.status === "new").map(item => item.id),
      replacedIds: fetched.filter(item => item.status === "different").map(item => item.id),
      removedIds: [...removedIds] };
    next.lastResult = { at: now, ...Object.fromEntries(Object.entries(result).filter(([, value]) =>
      typeof value === "number" || typeof value === "boolean")) };
    await saveState(next);

    // 6. Files no manifest refers to any more.
    // A manifest that could not be read may name files too, so nothing is removed then.
    if (!prepared.unreadable) {
      await removeUnreferenced(dir, prepared.files, next.unreferenced, Date.parse(now)).catch(() => {});
    }
    return { ...result, state: next };
  }

  function unreferencedSince(manifests, files, seen, now) {
    const referenced = new Set(manifests.flatMap(manifest => Object.values(manifest.documents || {})
      .map(entry => entry?.file)));
    const since = {};
    for (const path of files.keys()) {
      if (!referenced.has(path)) since[path] = typeof seen[path] === "string" && seen[path] <= now ? seen[path] : now;
    }
    return since;
  }

  // A file is removed when no manifest has referred to it for as long as this computer has
  // looked, at least UNREFERENCED_AGE_MS, and it was not written recently either. Its own
  // modification time alone is not enough: a service may deliver an old file long after it
  // was written, before the manifest that names it.
  async function removeUnreferenced(dir, files, since, nowMs) {
    for (const [path, first] of Object.entries(since)) {
      const file = files.get(path);
      if (!file || !(nowMs - Date.parse(first) > UNREFERENCED_AGE_MS) ||
        !(nowMs - Number(file.lastModified || nowMs) > UNREFERENCED_AGE_MS)) continue;
      await dir.remove(path).catch(() => {});
    }
  }

  // The folder the user chose, through the browser's File System Access API.
  function folderAdapter(handle) {
    const notFound = error => error?.name === "NotFoundError" || error?.name === "TypeMismatchError";
    async function directory(parts, create) {
      let current = handle;
      for (const part of parts.filter(Boolean)) current = await current.getDirectoryHandle(part, { create });
      return current;
    }
    async function file(path, create) {
      const parts = path.split("/");
      const name = parts.pop();
      return (await directory(parts, create)).getFileHandle(name, { create });
    }
    async function* text(stream) {
      const reader = stream.getReader();
      try {
        for (;;) {
          let chunk;
          try { chunk = await reader.read(); } catch { throw transfer.transferError("damaged"); }
          if (chunk.done) return;
          yield chunk.value;
        }
      } finally { reader.releaseLock(); }
    }
    return {
      name: handle.name,
      async list(prefix) {
        let start;
        try { start = await directory(prefix.split("/"), false); } catch (error) {
          if (notFound(error)) return [];
          throw error;
        }
        const found = [];
        const walk = async (current, path) => {
          for await (const [name, entry] of current.entries()) {
            if (entry.kind === "directory") await walk(entry, `${path}/${name}`);
            else {
              const value = await entry.getFile();
              found.push({ path: `${path}/${name}`, lastModified: value.lastModified, size: value.size });
            }
          }
        };
        await walk(start, prefix);
        return found;
      },
      async readText(path) {
        return (await (await file(path, false)).getFile()).text();
      },
      async readLines(path) {
        const value = await (await file(path, false)).getFile();
        const head = new Uint8Array(await value.slice(0, 2).arrayBuffer());
        let stream = value.stream();
        if (head[0] === 0x1f && head[1] === 0x8b) stream = stream.pipeThrough(new DecompressionStream("gzip"));
        return transfer.splitLines(text(stream.pipeThrough(new TextDecoderStream())));
      },
      async writeText(path, value) {
        const writable = await (await file(path, true)).createWritable();
        try {
          await writable.write(value);
          await writable.close();
        } catch (error) {
          await writable.abort().catch(() => {});
          throw error;
        }
      },
      // Written through gzip a line at a time; the browser replaces the file only when it
      // is complete.
      async writeLines(path, lines) {
        const writable = await (await file(path, true)).createWritable();
        const gzip = new CompressionStream("gzip");
        const piped = gzip.readable.pipeTo(writable);
        const writer = gzip.writable.getWriter();
        const encoder = new TextEncoder();
        try {
          for await (const line of lines) await writer.write(encoder.encode(`${line}\n`));
          await writer.close();
          await piped;
        } catch (error) {
          await writer.abort(error).catch(() => {});
          await piped.catch(() => {});
          throw error;
        }
      },
      async remove(path) {
        const parts = path.split("/");
        const name = parts.pop();
        await (await directory(parts, false)).removeEntry(name);
      }
    };
  }

  return Object.freeze({
    FORMAT, FORMAT_VERSION, STATE_SCHEMA_VERSION, DEVICES, DOCUMENTS,
    readState, connect, disconnect, documentVersion, documentPath, localVersions, readManifests, remoteView,
    remoteFolderView, mergeFolders, prepare, commit, folderAdapter
  });
});
