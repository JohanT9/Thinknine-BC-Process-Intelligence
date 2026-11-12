// Moving library documents to another computer: an export file and its import.
//
// A document is every stored entry that belongs to its recording: the session, the raw and
// canonical recordings and their events, screenshots, the review and its progress, error
// evidence, test runs and bug reports. The file holds those entries unchanged, so nothing is
// regenerated or reinterpreted when it is imported. It is gzip-compressed text with one JSON
// object per line, so that a large library is written and read a line at a time:
//
//   {"type":"header", format, formatVersion, exportedAt, appVersion, scope, folders, templates,
//    itemCount}                             templates: the document templates the documents
//                                           name (document/document-template.js)
//   {"type":"item", id, record}             the library record of one document
//   {"type":"entry", id, key, value}        one stored entry of that document
//   {"type":"itemEnd", id, entryCount, digest}
//   {"type":"end", itemCount, entryCount}
//
// An import accepts an entry only when its key belongs to the document it is listed under,
// so a file cannot write settings, licenses or another document's data. Entries that are
// replaced are kept first, so the import can be undone; an import that stops halfway is
// rolled back. A template from the file is added when it is not here and replaces the one
// here when it was changed later; the template it replaces is kept for undo as well.
(function (root, factory) {
  const folders = typeof module === "object" && module.exports
    ? require("./document-folders") : root.T9DocumentFolders;
  const reviewFormat = typeof module === "object" && module.exports
    ? require("../engine/review-storage-format") : root.T9ReviewStorageFormat;
  const templates = typeof module === "object" && module.exports
    ? require("./document-template") : root.T9DocumentTemplate;
  const api = factory(folders, reviewFormat, templates);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9LibraryTransfer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (folderModel, reviewFormat, templateModel) {
  const FORMAT = "bc-process-studio-library";
  const FORMAT_VERSION = 1;
  const FILE_EXTENSION = ".bcps";
  const UNDO_SCHEMA_VERSION = 1;
  const BATCH = 100;

  function transferError(code, detail = "") {
    const error = new Error(`transfer.${code}`);
    error.code = code;
    if (detail) error.detail = detail;
    return error;
  }

  function validId(id) {
    return typeof id === "string" && id.length > 0 && id.length <= 300 &&
      !/[:\x00-\x1F]/u.test(id);
  }

  // The document a stored entry belongs to, or "" when it belongs to none.
  function ownership(keys) {
    // Prefixes whose key is the prefix followed by the document id.
    const exact = [keys.SESSION_PREFIX, keys.EVENT_PREFIX, keys.SCREENSHOT_PREFIX,
      keys.SCREENSHOT_MANIFEST_PREFIX, keys.REVIEW_PREFIX, keys.REVIEW_PROGRESS_PREFIX];
    // Event logs: the header is prefix + id, each event prefix + id + ":event:…".
    const logs = [keys.RECORDING_PREFIX, keys.RAW_RECORDING_PREFIX];
    // Screenshots: prefix + id + ":" + screenshot key or hash (test screenshots: + run id too).
    const assets = [keys.SCREENSHOT_ASSET_PREFIX, keys.SCREENSHOT_BLOB_PREFIX,
      keys.TEST_SCREENSHOT_PREFIX].filter(Boolean);
    const evidenceIndex = `${keys.BC_ERROR_EVIDENCE_PREFIX}index_`;
    // Entries named by their own id that record the document in their value.
    const byValue = [
      [keys.BC_ERROR_EVIDENCE_PREFIX, "recordingId"],
      [keys.TEST_RUN_PREFIX, "sessionId"],
      [keys.BUG_REPORT_PREFIX, "recordingId"]
    ];
    // A test suite spans several documents; it travels with one of them, its owner.
    const suites = keys.TEST_SUITE_PREFIX ? [[keys.TEST_SUITE_PREFIX, "suite"]] : [];
    const rules = [
      ...exact.map(prefix => [prefix, "exact"]), ...logs.map(prefix => [prefix, "log"]),
      ...assets.map(prefix => [prefix, "asset"]), [evidenceIndex, "exact"],
      ...byValue.map(([prefix, field]) => [prefix, field]), ...suites
    ].sort((a, b) => b[0].length - a[0].length);
    function rule(key) {
      return typeof key === "string" ? rules.find(([prefix]) => key.startsWith(prefix)) : null;
    }
    function needsValue(key) {
      const found = rule(key);
      return Boolean(found) && !["exact", "log", "asset"].includes(found[1]);
    }
    function ownerOf(key, value) {
      const found = rule(key);
      if (!found) return "";
      const [prefix, kind] = found;
      const rest = key.slice(prefix.length);
      let id = "";
      if (kind === "exact") id = rest;
      else if (kind === "log") id = rest.split(":")[0];
      else if (kind === "asset") id = rest.includes(":") ? rest.split(":")[0] : "";
      else if (kind === "suite") {
        id = value && typeof value === "object" ? String(value.ownerSessionId ||
          (Array.isArray(value.items) && value.items[0]?.sessionId) || "") : "";
      } else id = value && typeof value === "object" ? String(value[kind] || "") : "";
      return validId(id) ? id : "";
    }
    return { ownerOf, needsValue };
  }

  async function storedKeys(storage) {
    if (typeof storage.getKeys === "function") return storage.getKeys();
    return Object.keys(await storage.get(null) || {});
  }

  async function readBatches(storage, keys, visit) {
    for (let offset = 0; offset < keys.length; offset += BATCH) {
      const slice = keys.slice(offset, offset + BATCH);
      const values = await storage.get(slice) || {};
      for (const key of slice) {
        if (Object.hasOwn(values, key)) await visit(key, values[key]);
      }
    }
  }

  // The stored keys of each requested document, sorted.
  async function inventory(storage, keys, ids) {
    const wanted = new Set(ids);
    const { ownerOf, needsValue } = ownership(keys);
    const result = new Map([...wanted].map(id => [id, []]));
    const valueKeys = [];
    for (const key of await storedKeys(storage)) {
      if (needsValue(key)) { valueKeys.push(key); continue; }
      const id = ownerOf(key);
      if (wanted.has(id)) result.get(id).push(key);
    }
    await readBatches(storage, valueKeys, (key, value) => {
      const id = ownerOf(key, value);
      if (wanted.has(id)) result.get(id).push(key);
    });
    for (const list of result.values()) list.sort();
    return result;
  }

  // JSON with object keys in sorted order: the same content gives the same text whatever
  // order its fields were stored in.
  function canonical(value) {
    if (Array.isArray(value)) {
      return `[${value.map(item => canonical(item === undefined ? null : item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value).filter(key => value[key] !== undefined).sort()
        .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value === undefined ? null : value);
  }

  async function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  // An entry as the file holds it. A review is written as it was saved, without the shared
  // parts this version stores it with (engine/review-storage-format.js), so that every version
  // reads the file and the same review gives the same digest however it is stored.
  function transferValue(keys, key, value) {
    return reviewFormat && typeof key === "string" && key.startsWith(keys.REVIEW_PREFIX)
      ? reviewFormat.unpack(value) : value;
  }

  // A digest of a document's entries that does not depend on their order.
  function entryDigest() {
    const parts = [];
    return {
      async add(key, value) { parts.push(`${key}\n${await sha256(canonical(value))}`); },
      async finish() { return sha256(parts.sort().join("\n")); }
    };
  }

  async function localDigests(storage, keys, ids) {
    const owned = await inventory(storage, keys, ids);
    const result = new Map();
    for (const [id, list] of owned) {
      if (!list.length) continue;
      const digest = entryDigest();
      await readBatches(storage, list, (key, value) => digest.add(key, transferValue(keys, key, value)));
      result.set(id, { digest: await digest.finish(), keys: list });
    }
    return result;
  }

  // What is compared for the library record: not when it was last opened on this computer.
  function recordFingerprint(record) {
    const { lastOpenedAt, recentActivity, ...rest } = record || {};
    return canonical(rest);
  }

  // The folders a set of documents needs: their folders and every folder above them, in
  // the order they can be created. For a folder export, the empty folders below it too.
  function exportFolders(tree, records, { folderId: scopeFolderId = "", all = false } = {}) {
    const needed = new Set();
    const addPath = folderId => folderModel.path(tree, folderId)
      .forEach(folder => needed.add(folder.folderId));
    records.forEach(record => addPath(folderModel.folderOf(tree, record)));
    if (scopeFolderId) folderModel.descendantIds(tree, scopeFolderId).forEach(addPath);
    if (all) tree.folders.forEach(folder => addPath(folder.folderId));
    return tree.folders.filter(folder => needed.has(folder.folderId))
      .sort((a, b) => folderModel.path(tree, a.folderId).length -
        folderModel.path(tree, b.folderId).length)
      .map(({ folderId, name, parentId, createdAt, modifiedAt }) =>
        ({ folderId, name, parentId, createdAt, modifiedAt }));
  }

  // The export as lines of text. items: [{ id, record }].
  // templates: the user's own templates; the ones the documents name go with them.
  async function* exportLines({ storage, keys, items, folders = [], scope = {}, templates = [],
    exportedAt = new Date().toISOString(), appVersion = "", onProgress = () => {} }) {
    const ids = items.map(item => item.id);
    if (!ids.every(validId)) throw transferError("documentMissing");
    const owned = await inventory(storage, keys, ids);
    const used = templateModel ? templateModel.usedBy(templates, items.map(item => item.record)) : [];
    yield JSON.stringify({ type: "header", format: FORMAT, formatVersion: FORMAT_VERSION,
      exportedAt, appVersion, scope, folders, ...(used.length ? { templates: used } : {}),
      itemCount: items.length });
    let entryTotal = 0;
    let done = 0;
    for (const { id, record } of items) {
      const list = owned.get(id) || [];
      if (!list.length) throw transferError("documentMissing", id);
      yield JSON.stringify({ type: "item", id, record });
      const digest = entryDigest();
      let count = 0;
      for (let offset = 0; offset < list.length; offset += BATCH) {
        const slice = list.slice(offset, offset + BATCH);
        const values = await storage.get(slice) || {};
        for (const key of slice) {
          if (!Object.hasOwn(values, key)) continue;
          const value = transferValue(keys, key, values[key]);
          await digest.add(key, value);
          count += 1;
          yield JSON.stringify({ type: "entry", id, key, value });
        }
      }
      entryTotal += count;
      yield JSON.stringify({ type: "itemEnd", id, entryCount: count, digest: await digest.finish() });
      done += 1;
      onProgress({ done, total: items.length });
    }
    yield JSON.stringify({ type: "end", itemCount: items.length, entryCount: entryTotal });
  }

  // Lines from a stream of text chunks.
  async function* splitLines(chunks) {
    let rest = "";
    for await (const chunk of chunks) {
      rest += chunk;
      let index;
      while ((index = rest.indexOf("\n")) >= 0) {
        const line = rest.slice(0, index);
        rest = rest.slice(index + 1);
        if (line.trim()) yield line;
      }
    }
    if (rest.trim()) yield rest;
  }

  function parseLine(line) {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch { /* reported below */ }
    throw transferError("damaged");
  }

  // Reads the whole file and checks it. visit(id, key, value) receives each entry of the
  // documents in `only` (all when omitted); otherwise the values are not kept.
  async function read(lines, keys, { only = null, visit = null, onProgress = () => {} } = {}) {
    const { ownerOf } = ownership(keys);
    let header = null;
    let current = null;
    let ended = false;
    let entryTotal = 0;
    const items = [];
    const seen = new Set();
    for await (const line of lines) {
      const value = parseLine(line);
      if (!header) {
        if (value.type !== "header" || value.format !== FORMAT) throw transferError("notLibrary");
        if (!Number.isInteger(value.formatVersion) || value.formatVersion < 1) {
          throw transferError("notLibrary");
        }
        if (value.formatVersion > FORMAT_VERSION) throw transferError("newerVersion");
        header = value;
        continue;
      }
      if (ended) throw transferError("damaged");
      if (value.type === "item") {
        if (current || !validId(value.id) || seen.has(value.id)) throw transferError("damaged");
        seen.add(value.id);
        current = { id: value.id, record: value.record && typeof value.record === "object" &&
          !Array.isArray(value.record) ? value.record : {}, keys: [], seen: new Set(),
          digest: entryDigest() };
      } else if (value.type === "entry") {
        if (!current || value.id !== current.id || typeof value.key !== "string" ||
          !Object.hasOwn(value, "value")) throw transferError("damaged");
        if (ownerOf(value.key, value.value) !== current.id) {
          throw transferError("foreignEntry", value.key);
        }
        if (current.seen.has(value.key)) throw transferError("damaged");
        current.seen.add(value.key);
        current.keys.push(value.key);
        await current.digest.add(value.key, value.value);
        if (visit && (!only || only.has(current.id))) await visit(current.id, value.key, value.value);
      } else if (value.type === "itemEnd") {
        if (!current || value.id !== current.id) throw transferError("damaged");
        const digest = await current.digest.finish();
        if (value.entryCount !== current.keys.length || value.digest !== digest) {
          throw transferError("damaged");
        }
        if (!current.keys.includes(keys.SESSION_PREFIX + current.id)) {
          throw transferError("damaged");
        }
        entryTotal += current.keys.length;
        items.push({ id: current.id, record: current.record, keys: current.keys.sort(), digest });
        current = null;
        onProgress({ done: items.length, total: Number(header.itemCount) || 0 });
      } else if (value.type === "end") {
        if (current || value.itemCount !== items.length || value.entryCount !== entryTotal) {
          throw transferError("damaged");
        }
        ended = true;
      } else {
        throw transferError("damaged");
      }
    }
    if (!header) throw transferError("notLibrary");
    if (!ended) throw transferError("incomplete");
    return { header, items };
  }

  // Where the file's folders go in this library: the same folder when it exists here,
  // otherwise a folder with the same name in the same place, otherwise a new folder. A
  // folder that would be too deep here takes its documents to the folder above it.
  function mapFolders(tree, folders = []) {
    const imported = folderModel.read({ schemaVersion: folderModel.SCHEMA_VERSION,
      folders: Array.isArray(folders) ? folders : [] });
    const map = new Map();
    const pending = [];
    let scratch = tree;
    if (!imported.supported) return { map, pending };
    const ordered = [...imported.tree.folders].sort((a, b) =>
      folderModel.path(imported.tree, a.folderId).length -
      folderModel.path(imported.tree, b.folderId).length);
    for (const folder of ordered) {
      const parentId = folder.parentId ? map.get(folder.parentId) ?? "" : "";
      if (folderModel.find(scratch, folder.folderId)) {
        map.set(folder.folderId, folder.folderId);
        continue;
      }
      const sameName = folderModel.children(scratch, parentId).find(item =>
        item.name.toLocaleLowerCase() === folder.name.toLocaleLowerCase());
      if (sameName) {
        map.set(folder.folderId, sameName.folderId);
        continue;
      }
      try {
        scratch = folderModel.create(scratch, { name: folder.name, parentId,
          folderId: folder.folderId, now: folder.createdAt || undefined }).tree;
        map.set(folder.folderId, folder.folderId);
        pending.push(folder.folderId);
      } catch {
        map.set(folder.folderId, parentId);
      }
    }
    return { map, pending, scratch };
  }

  // What importing each document would do.
  //   new        not in this library
  //   same       here already, unchanged
  //   different  here already, with other content
  //   busy       being recorded now; never changed
  // templates: the user's own templates here.
  function plan({ inspection, local, records, tree, activeId = "", templates = [] }) {
    const folders = mapFolders(tree, inspection.header.folders);
    const incomingTemplates = templateModel
      ? templateModel.incoming(inspection.header.templates, templates)
      : { items: [], writes: [], unreadable: 0 };
    const recordById = new Map(records.map(record => [record.projectId || record.sessionId, record]));
    const items = inspection.items.map(item => {
      const folderId = folders.map.get(String(item.record.folderId || "")) ?? "";
      const record = { ...item.record, projectId: item.id, sessionId: item.id, folderId };
      const existing = local.get(item.id);
      let status = "new";
      if (item.id === activeId) status = "busy";
      else if (existing) {
        const sameRecord = !recordById.has(item.id) ||
          recordFingerprint(recordById.get(item.id)) === recordFingerprint(record);
        status = existing.digest === item.digest && sameRecord ? "same" : "different";
      }
      return { id: item.id, status, record, keys: item.keys, digest: item.digest,
        localRecord: recordById.get(item.id) || null };
    });
    const count = status => items.filter(item => item.status === status).length;
    return { header: inspection.header, items, folders, templates: incomingTemplates,
      counts: { new: count("new"), same: count("same"), different: count("different"),
        busy: count("busy") } };
  }

  // The documents to write, and the library records and folders after the import.
  // normalize: the library record normalizer.
  function changes(planned, { replace = false, records, tree, normalize = value => value }) {
    const written = planned.items.filter(item => item.status === "new" ||
      (replace && item.status === "different"));
    // Create only the folders the written documents are in, and the folders above them.
    const scratch = planned.folders.scratch || tree;
    const needed = new Set();
    for (const item of written) {
      folderModel.path(scratch, item.record.folderId).forEach(folder => needed.add(folder.folderId));
    }
    let nextTree = tree;
    const createdFolderIds = [];
    for (const folderId of planned.folders.pending) {
      if (!needed.has(folderId)) continue;
      const folder = folderModel.find(scratch, folderId);
      nextTree = folderModel.create(nextTree, { name: folder.name, parentId: folder.parentId,
        folderId, now: folder.createdAt || undefined }).tree;
      createdFolderIds.push(folderId);
    }
    const byId = new Map(written.map(item => [item.id, normalize(item.record)]));
    const nextRecords = records.map(record => byId.get(record.projectId || record.sessionId) || record);
    const present = new Set(records.map(record => record.projectId || record.sessionId));
    for (const [id, record] of byId) if (!present.has(id)) nextRecords.push(record);
    return {
      written,
      newIds: written.filter(item => item.status === "new").map(item => item.id),
      replacedIds: written.filter(item => item.status === "different").map(item => item.id),
      tree: nextTree, records: nextRecords, createdFolderIds,
      templates: (planned.templates?.writes || []).map(({ template, previous }) => ({ template, previous }))
    };
  }

  // Templates are written after the documents and put back with them.
  async function writeTemplates(storage, keys, list) {
    if (!list.length) return;
    await storage.set(Object.fromEntries(list.map(({ template }) =>
      [keys.DOCUMENT_TEMPLATE_PREFIX + template.templateId, template])));
  }
  // A template changed again after the import is left as it is now.
  async function restoreTemplates(storage, keys, meta) {
    const written = meta.templates?.written || [];
    if (!written.length || !keys.DOCUMENT_TEMPLATE_PREFIX) return;
    const previous = new Map((meta.templates.previous || []).map(item => [item.templateId, item]));
    const stored = await storage.get(written.map(item => keys.DOCUMENT_TEMPLATE_PREFIX + item.templateId)) || {};
    for (const { templateId, updatedAt } of written) {
      const key = keys.DOCUMENT_TEMPLATE_PREFIX + templateId;
      if (!Object.hasOwn(stored, key) || String(stored[key]?.updatedAt || "") !== updatedAt) continue;
      if (previous.has(templateId)) await storage.set({ [key]: previous.get(templateId) });
      else await storage.remove(key);
    }
  }

  function undoKeys(keys) {
    return { meta: keys.LIBRARY_IMPORT_UNDO_KEY, entry: keys.LIBRARY_IMPORT_UNDO_ENTRY_PREFIX };
  }

  async function readUndo(storage, keys) {
    const { meta } = undoKeys(keys);
    const value = (await storage.get(meta))?.[meta];
    if (!value || typeof value !== "object") return null;
    if (value.schemaVersion !== UNDO_SCHEMA_VERSION) return { ...value, supported: false };
    return { ...value, supported: true };
  }

  async function removeKeys(storage, list) {
    for (let offset = 0; offset < list.length; offset += BATCH) {
      await storage.remove(list.slice(offset, offset + BATCH));
    }
  }

  async function clearUndo(storage, keys) {
    const { meta, entry } = undoKeys(keys);
    const list = (await storedKeys(storage)).filter(key => key.startsWith(entry));
    await removeKeys(storage, list);
    await storage.remove(meta);
  }

  // Writes the documents. Before anything is replaced or removed, the entries it replaces are
  // kept; when writing fails, everything is put back as it was and the error is rethrown.
  // lines: a fresh reading of the same file (not needed when nothing is written).
  // saveLibrary(tree, records) stores the records. A synchronization also removes documents
  // (change.removed: [{ id, localRecord }]) and passes old folders to restore on undo.
  async function apply({ storage, keys, lines, change, saveLibrary, fileName = "",
    importId = `import-${Date.now().toString(36)}`, now = new Date().toISOString(),
    kind = "import", oldFolders = null, onProgress = () => {} }) {
    const { meta: metaKey, entry: entryPrefix } = undoKeys(keys);
    const ids = change.written.map(item => item.id);
    const writing = new Set(ids);
    const removed = change.removed || [];
    const meta = { schemaVersion: UNDO_SCHEMA_VERSION, importId, kind, fileName, startedAt: now,
      state: "running", phase: "keeping", newIds: change.newIds, replacedIds: change.replacedIds,
      removedIds: removed.map(item => item.id),
      oldRecords: Object.fromEntries([...change.written, ...removed]
        .filter(item => item.localRecord).map(item => [item.id, item.localRecord])),
      createdFolderIds: change.createdFolderIds || [], keptEntries: 0,
      ...(change.templates?.length ? { templates: {
        written: change.templates.map(({ template }) =>
          ({ templateId: template.templateId, updatedAt: String(template.updatedAt || "") })),
        previous: change.templates.map(item => item.previous).filter(Boolean) } } : {}),
      ...(oldFolders ? { oldFolders, newFolders: folderModel.serialize(change.tree) } : {}) };
    await clearUndo(storage, keys);
    await storage.set({ [metaKey]: meta });
    try {
      // Keep the entries that are replaced or removed, then remove them.
      const owned = await inventory(storage, keys, [...change.replacedIds, ...meta.removedIds]);
      let kept = 0;
      for (const list of owned.values()) {
        for (let offset = 0; offset < list.length; offset += BATCH) {
          const values = await storage.get(list.slice(offset, offset + BATCH)) || {};
          const copies = {};
          for (const [key, value] of Object.entries(values)) {
            copies[`${entryPrefix}${String(kept).padStart(8, "0")}`] = { key, value };
            kept += 1;
          }
          await storage.set(copies);
        }
      }
      // From here on the replaced entries are kept in full, so a rollback can restore them.
      meta.keptEntries = kept;
      meta.phase = "writing";
      await storage.set({ [metaKey]: meta });
      for (const list of owned.values()) await removeKeys(storage, list);
      // Write the imported entries, checking them again as they are read.
      let batch = {};
      let size = 0;
      const flush = async () => {
        if (!size) return;
        await storage.set(batch);
        batch = {};
        size = 0;
      };
      const expected = new Map(change.written.map(item => [item.id, item.digest]));
      if (ids.length) {
        const second = await read(lines, keys, { only: writing, onProgress,
          visit: async (id, key, value) => {
            batch[key] = value;
            size += 1;
            if (size >= BATCH) await flush();
          } });
        await flush();
        for (const id of ids) {
          const item = second.items.find(value => value.id === id);
          if (!item || item.digest !== expected.get(id)) throw transferError("changedFile");
        }
      }
      await writeTemplates(storage, keys, change.templates || []);
      await saveLibrary(change.tree, change.records);
      meta.state = "complete";
      meta.completedAt = new Date().toISOString();
      await storage.set({ [metaKey]: meta });
      return meta;
    } catch (error) {
      try {
        await restoreEntries(storage, keys, meta);
        await clearUndo(storage, keys);
      } catch (rollbackError) {
        rollbackError.cause = error;
        rollbackError.code = rollbackError.code || "rollbackFailed";
        throw rollbackError;
      }
      throw error;
    }
  }

  // Puts the stored entries back as they were before the import: removes what the import
  // wrote (and anything added to those documents since) and restores what it replaced.
  // While the replaced entries are still being kept, nothing has been written or removed.
  async function restoreEntries(storage, keys, meta) {
    const { entry: entryPrefix } = undoKeys(keys);
    if (meta.phase === "keeping") return;
    const keptKeys = (await storedKeys(storage)).filter(key => key.startsWith(entryPrefix)).sort();
    if (keptKeys.length !== Number(meta.keptEntries)) throw transferError("rollbackFailed");
    const ids = [...(meta.newIds || []), ...(meta.replacedIds || []), ...(meta.removedIds || [])]
      .filter(validId);
    const owned = await inventory(storage, keys, ids);
    for (const list of owned.values()) await removeKeys(storage, list);
    await readBatches(storage, keptKeys, async (_key, kept) => {
      if (kept && typeof kept.key === "string") await storage.set({ [kept.key]: kept.value });
    });
    await restoreTemplates(storage, keys, meta);
  }

  // The library records and folders after undoing an import.
  function undoLibrary(meta, { records, tree, normalize = value => value }) {
    const added = new Set(meta.newIds || []);
    const old = meta.oldRecords || {};
    const nextRecords = records.filter(record => !added.has(record.projectId || record.sessionId))
      .map(record => old[record.projectId || record.sessionId]
        ? normalize(old[record.projectId || record.sessionId]) : record);
    // Documents a synchronization removed come back.
    const present = new Set(nextRecords.map(record => record.projectId || record.sessionId));
    for (const id of meta.removedIds || []) {
      if (old[id] && !present.has(id)) nextRecords.push(normalize(old[id]));
    }
    // A synchronization puts back the folders it changed. A folder changed after it is left
    // as it is now; one the synchronization added is removed when nothing is left in it.
    if (meta.oldFolders) {
      const restored = folderModel.read(meta.oldFolders);
      const synced = meta.newFolders ? folderModel.read(meta.newFolders) : { supported: false };
      if (restored.supported) {
        const key = folder => folder ? JSON.stringify([folder.name, folder.parentId || ""]) : "";
        const before = new Map(restored.tree.folders.map(folder => [folder.folderId, folder]));
        const after = synced.supported ? new Map(synced.tree.folders.map(folder => [folder.folderId, folder])) : null;
        const now = new Map(tree.folders.map(folder => [folder.folderId, folder]));
        const used = id => nextRecords.some(record => String(record.folderId || "") === id);
        const folders = [];
        for (const id of new Set([...before.keys(), ...now.keys()])) {
          const old = before.get(id);
          const current = now.get(id);
          // Without the folders after the synchronization (an older undo record), every
          // folder is put back as it was, as before.
          const untouchedSince = after ? key(current) === key(after.get(id)) : true;
          if (untouchedSince) {
            if (old) folders.push({ ...(current || {}), ...old });
            else if (current && used(id)) folders.push(current);
          } else if (current) folders.push(current);
        }
        const merged = folderModel.read({ ...folderModel.serialize(restored.tree), folders });
        if (merged.supported) return { records: nextRecords, tree: merged.tree };
      }
    }
    // A folder the import created is removed again when nothing is left in it.
    let nextTree = tree;
    for (const folderId of [...(meta.createdFolderIds || [])].reverse()) {
      if (!folderModel.find(nextTree, folderId)) continue;
      const below = folderModel.descendantIds(nextTree, folderId);
      const used = nextRecords.some(record => below.has(String(record.folderId || "")));
      if (!used && below.size === 1) {
        nextTree = folderModel.remove(nextTree, folderId, nextRecords).tree;
      }
    }
    return { records: nextRecords, tree: nextTree };
  }

  async function undo({ storage, keys, saveLibrary, records, tree, normalize }) {
    const meta = await readUndo(storage, keys);
    if (!meta) throw transferError("nothingToUndo");
    if (!meta.supported) throw transferError("newerVersion");
    await restoreEntries(storage, keys, meta);
    const library = undoLibrary(meta, { records, tree, normalize });
    // Also after an interrupted import: whatever part of the library it saved is put back.
    await saveLibrary(library.tree, library.records);
    await clearUndo(storage, keys);
    return { meta, ...library };
  }

  function fileName(date = new Date(), label = "") {
    const stamp = date.toISOString().slice(0, 16).replace(/[:T]/gu, "-");
    const safe = String(label || "").replace(/[<>:"/\\|?*\x00-\x1F]/gu, "_")
      .replace(/\s+/gu, "-").slice(0, 60);
    return `BC-Process-Studio-${safe ? `${safe}-` : ""}${stamp}${FILE_EXTENSION}`;
  }

  return Object.freeze({
    FORMAT, FORMAT_VERSION, FILE_EXTENSION, UNDO_SCHEMA_VERSION,
    ownership, inventory, localDigests, exportFolders, exportLines, splitLines, read,
    mapFolders, plan, changes, apply, undo, undoLibrary, readUndo, clearUndo,
    recordFingerprint, fileName, validId, canonical, sha256, transferError
  });
});
