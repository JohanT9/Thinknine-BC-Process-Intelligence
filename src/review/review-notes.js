(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewNotes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCHEMA_VERSION = "1.0.0";
  const NOTE_TYPES = Object.freeze(["note", "information", "warning", "tip", "verification"]);
  const OWNER_TYPES = Object.freeze(["step", "section", "document"]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function stableId(values) {
    let hash = 2166136261;
    for (const character of values.map(String).join("\u001f")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `note:${(hash >>> 0).toString(36)}`;
  }

  function normalize(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("Note must be an object.");
    }
    if (!OWNER_TYPES.includes(value.ownerType)) {
      throw new TypeError("Note owner type is invalid.");
    }
    if (!value.ownerId) throw new TypeError("Note owner ID is required.");
    return Object.freeze({ ...clone(value),
      noteId: String(value.noteId || ""),
      schemaVersion: String(value.schemaVersion || SCHEMA_VERSION),
      recordingId: String(value.recordingId || ""),
      ownerType: value.ownerType,
      ownerId: String(value.ownerId),
      noteType: NOTE_TYPES.includes(value.noteType) ? value.noteType : "note",
      content: String(value.content || ""),
      visibility: value.visibility === "hidden" ? "hidden" : "visible",
      createdAt: value.createdAt || null,
      updatedAt: value.updatedAt || value.createdAt || null,
      createdBy: value.createdBy || null,
      provenance: value.provenance || "manual",
      metadata: clone(value.metadata || {}),
      futureFields: clone(value.futureFields || {})
    });
  }

  function create(options = {}) {
    const now = options.now || new Date().toISOString();
    return normalize({ ...options,
      noteId: options.noteId || stableId([options.recordingId || "",
        options.ownerType || "step", options.ownerId, now, options.nonce || ""]),
      ownerType: options.ownerType || "step",
      noteType: options.noteType || "note",
      createdAt: now, updatedAt: now, provenance: "manual"
    });
  }

  function update(note, patch, options = {}) {
    const current = normalize(note);
    return normalize({ ...clone(current), ...clone(patch),
      noteId: current.noteId, ownerType: current.ownerType,
      ownerId: current.ownerId, createdAt: current.createdAt,
      updatedAt: options.now || new Date().toISOString(),
      provenance: current.provenance });
  }

  function resolve(notes, ownerIds, screenshotAssetIds = []) {
    const owners = new Set((ownerIds || []).map(String));
    const assets = new Set((screenshotAssetIds || []).map(String));
    const normalized = (notes || []).map(normalize);
    const diagnostics = normalized.flatMap(note =>
      note.ownerType === "step" && !owners.has(note.ownerId) ? [{
        code: "orphaned-note-owner", noteId: note.noteId,
        ownerType: note.ownerType, ownerId: note.ownerId
      }] : []
    );
    return { notes: normalized, visibleNotes: normalized.filter(note =>
      note.visibility === "visible" &&
      (note.ownerType !== "step" || owners.has(note.ownerId))
    ), diagnostics, screenshotAssetIds: [...assets] };
  }

  function validation(note) {
    try {
      const value = normalize(note);
      return { valid: Boolean(value.content.trim()), issues:
        value.content.trim() ? [] : [{ code: "empty-note" }] };
    } catch (error) {
      return { valid: false, issues: [{ code: "invalid-note", message: error.message }] };
    }
  }

  return { NOTE_TYPES, OWNER_TYPES, SCHEMA_VERSION, create, normalize,
    resolve, stableId, update, validation };
});
