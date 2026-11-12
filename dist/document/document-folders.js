// Folders in the document library. The folder tree is stored on its own; a library record
// names its folder with folderId. A record without a folder, or whose folder no longer
// exists, is shown at the top level. Folders only organize: removing a folder moves its
// documents and subfolders to the folder above and never deletes a document.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentFolders = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCHEMA_VERSION = "1.0.0";
  const MAX_NAME_LENGTH = 80;
  const MAX_DEPTH = 8;

  function text(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  }

  function timestamp(value) {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function folderError(code) {
    const error = new Error(`folder.${code}`);
    error.code = code;
    return error;
  }

  function freeze(tree) {
    tree.folders.forEach(Object.freeze);
    Object.freeze(tree.folders);
    return Object.freeze(tree);
  }

  function empty() {
    return freeze({ schemaVersion: SCHEMA_VERSION, folders: [] });
  }

  // The stored tree. A tree from a later major version is not read, so that it is not
  // overwritten by a version that does not understand it.
  function read(value) {
    if (value === undefined || value === null) return { supported: true, tree: empty() };
    if (typeof value !== "object" || Array.isArray(value)) {
      return { supported: false, schemaVersion: "" };
    }
    const version = text(value.schemaVersion) || SCHEMA_VERSION;
    if (!/^1(\.|$)/.test(version)) return { supported: false, schemaVersion: version };
    const seen = new Set();
    const folders = (Array.isArray(value.folders) ? value.folders : []).flatMap(folder => {
      const folderId = text(folder?.folderId);
      if (!folderId || seen.has(folderId)) return [];
      seen.add(folderId);
      return [{ ...folder, folderId, name: text(folder.name).slice(0, MAX_NAME_LENGTH) || folderId,
        parentId: text(folder.parentId), createdAt: timestamp(folder.createdAt),
        modifiedAt: timestamp(folder.modifiedAt || folder.createdAt) }];
    });
    // A parent that does not exist, or a loop, puts the folder at the top level.
    const byId = new Map(folders.map(folder => [folder.folderId, folder]));
    for (const folder of folders) {
      if (folder.parentId && !byId.has(folder.parentId)) folder.parentId = "";
      const visited = new Set([folder.folderId]);
      for (let parent = byId.get(folder.parentId); parent; parent = byId.get(parent.parentId)) {
        if (visited.has(parent.folderId)) { folder.parentId = ""; break; }
        visited.add(parent.folderId);
      }
    }
    return { supported: true, tree: freeze({ ...value, schemaVersion: version, folders }) };
  }

  function find(tree, folderId) {
    return tree.folders.find(folder => folder.folderId === folderId) || null;
  }

  // The folders from the top level down to the folder.
  function path(tree, folderId) {
    const result = [];
    for (let folder = find(tree, folderId); folder; folder = find(tree, folder.parentId)) {
      result.unshift(folder);
      if (result.length > tree.folders.length) break;
    }
    return result;
  }

  function children(tree, parentId = "", locale = "en-US") {
    return tree.folders.filter(folder => folder.parentId === (parentId || ""))
      .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base", numeric: true }));
  }

  // The folder and every folder below it.
  function descendantIds(tree, folderId) {
    const ids = new Set(folderId ? [folderId] : []);
    let grown = true;
    while (grown) {
      grown = false;
      for (const folder of tree.folders) {
        if (ids.has(folder.parentId) && !ids.has(folder.folderId)) {
          ids.add(folder.folderId);
          grown = true;
        }
      }
    }
    return ids;
  }

  // The folder a record is in: its own folder when it still exists, otherwise the top level.
  function folderOf(tree, record) {
    const folderId = text(record?.folderId);
    return folderId && find(tree, folderId) ? folderId : "";
  }

  function validateName(tree, name, parentId = "", exceptId = "") {
    const value = text(name);
    if (!value) return "nameRequired";
    if (value.length > MAX_NAME_LENGTH) return "nameTooLong";
    const key = value.toLocaleLowerCase();
    if (tree.folders.some(folder => folder.folderId !== exceptId &&
      folder.parentId === (parentId || "") && folder.name.toLocaleLowerCase() === key)) {
      return "nameExists";
    }
    return "";
  }

  function newId() {
    const random = globalThis.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `folder-${random}`;
  }

  function create(tree, { name, parentId = "", now = new Date().toISOString(), folderId = newId() } = {}) {
    const parent = parentId ? find(tree, parentId) : null;
    if (parentId && !parent) throw folderError("parentMissing");
    if (path(tree, parentId).length >= MAX_DEPTH) throw folderError("tooDeep");
    const problem = validateName(tree, name, parentId);
    if (problem) throw folderError(problem);
    const folder = { folderId, name: text(name), parentId: parentId || "",
      createdAt: timestamp(now), modifiedAt: timestamp(now) };
    return { tree: freeze({ ...tree, folders: [...tree.folders, folder] }), folder: Object.freeze(folder) };
  }

  function rename(tree, folderId, name, now = new Date().toISOString()) {
    const folder = find(tree, folderId);
    if (!folder) throw folderError("missing");
    const problem = validateName(tree, name, folder.parentId, folderId);
    if (problem) throw folderError(problem);
    return freeze({ ...tree, folders: tree.folders.map(value => value.folderId === folderId
      ? { ...value, name: text(name), modifiedAt: timestamp(now) } : value) });
  }

  // Moves a folder under another folder, or to the top level with an empty parentId.
  function move(tree, folderId, parentId = "", now = new Date().toISOString()) {
    const folder = find(tree, folderId);
    if (!folder) throw folderError("missing");
    if (parentId && !find(tree, parentId)) throw folderError("parentMissing");
    if (descendantIds(tree, folderId).has(parentId)) throw folderError("intoItself");
    const below = Math.max(...[...descendantIds(tree, folderId)].map(id =>
      path(tree, id).length - path(tree, folderId).length + 1));
    if (path(tree, parentId).length + below > MAX_DEPTH) throw folderError("tooDeep");
    const problem = validateName(tree, folder.name, parentId, folderId);
    if (problem) throw folderError(problem);
    return freeze({ ...tree, folders: tree.folders.map(value => value.folderId === folderId
      ? { ...value, parentId: parentId || "", modifiedAt: timestamp(now) } : value) });
  }

  // What removing a folder affects: its subfolders and the documents directly in it.
  function removal(tree, folderId, records = []) {
    return {
      subfolders: tree.folders.filter(folder => folder.parentId === folderId).length,
      documents: records.filter(record => folderOf(tree, record) === folderId).length
    };
  }

  // Removes a folder. Its subfolders and documents move to the folder above. Subfolders whose
  // names are already used there get a number, so that nothing is merged or lost.
  function remove(tree, folderId, records = [], locale = "en-US") {
    const folder = find(tree, folderId);
    if (!folder) throw folderError("missing");
    const parentId = folder.parentId;
    const remaining = tree.folders.filter(value => value.folderId !== folderId);
    const taken = new Set(remaining.filter(value => value.parentId === parentId &&
      value.parentId !== folderId).map(value => value.name.toLocaleLowerCase()));
    const folders = remaining.map(value => {
      if (value.parentId !== folderId) return value;
      let name = value.name;
      for (let number = 2; taken.has(name.toLocaleLowerCase()); number++) {
        const suffix = ` (${number.toLocaleString(locale)})`;
        name = value.name.slice(0, MAX_NAME_LENGTH - suffix.length) + suffix;
      }
      taken.add(name.toLocaleLowerCase());
      return { ...value, name, parentId };
    });
    const moved = [];
    const nextRecords = records.map(record => {
      if (folderOf(tree, record) !== folderId) return record;
      moved.push(record.projectId);
      return { ...record, folderId: parentId };
    });
    return { tree: freeze({ ...tree, folders }), records: nextRecords, moved };
  }

  // Everything in a folder and the folders below it: the documents, how many of them are
  // archived, and the subfolders. A folder with neither is empty.
  function contents(tree, folderId, records = []) {
    const folderIds = descendantIds(tree, folderId);
    const documents = records.filter(record => folderIds.has(folderOf(tree, record)));
    return {
      projectIds: documents.map(record => record.projectId),
      archived: documents.filter(record => record.archived).length,
      subfolders: folderIds.size - 1,
      empty: !documents.length && folderIds.size === 1
    };
  }

  // Removes a folder and every folder below it. The documents in them are deleted separately
  // first; a document whose folder no longer exists would show at the top level.
  function removeWithContents(tree, folderId) {
    if (!find(tree, folderId)) throw folderError("missing");
    const folderIds = descendantIds(tree, folderId);
    return freeze({ ...tree, folders: tree.folders.filter(folder => !folderIds.has(folder.folderId)) });
  }

  // Every folder in tree order, with its depth and full path, for a folder picker.
  function outline(tree, locale = "en-US") {
    const result = [];
    const visit = (parentId, depth) => children(tree, parentId, locale).forEach(folder => {
      result.push({ folderId: folder.folderId, name: folder.name, depth,
        path: path(tree, folder.folderId).map(value => value.name) });
      visit(folder.folderId, depth + 1);
    });
    visit("", 0);
    return result;
  }

  function serialize(tree) {
    return JSON.parse(JSON.stringify({ ...tree, schemaVersion: tree.schemaVersion || SCHEMA_VERSION }));
  }

  return Object.freeze({ MAX_DEPTH, MAX_NAME_LENGTH, SCHEMA_VERSION,
    children, contents, create, descendantIds, empty, find, folderOf, move, outline, path, read,
    removal, remove, removeWithContents, rename, serialize, validateName });
});
