(function (root, factory) {
  const library = typeof module === "object" && module.exports
    ? require("./document-library")
    : root.T9DocumentLibrary;
  const api = factory(library);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentBatchOperations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (library) {
  const BATCH_SCHEMA_VERSION = "1.0.0";

  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(freeze);
    return value;
  }

  function selection(value = {}) {
    return freeze({
      selectedIds: [...new Set(Array.isArray(value.selectedIds)
        ? value.selectedIds.filter(Boolean) : [])],
      activeId: value.activeId || null,
      anchorId: value.anchorId || null
    });
  }

  function select(current, visibleIds, targetId, modifiers = {}) {
    const state = selection(current);
    const ids = [...new Set(visibleIds || [])];
    if (!ids.includes(targetId)) return state;
    let selected = [...state.selectedIds];
    if (modifiers.shift && state.anchorId && ids.includes(state.anchorId)) {
      const start = ids.indexOf(state.anchorId);
      const end = ids.indexOf(targetId);
      const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1);
      selected = modifiers.toggle
        ? [...new Set([...selected, ...range])]
        : [...new Set([...selected.filter(id => !ids.includes(id)), ...range])];
    } else if (modifiers.toggle) {
      selected = selected.includes(targetId)
        ? selected.filter(id => id !== targetId)
        : [...selected, targetId];
    } else {
      selected = [targetId];
    }
    return selection({ selectedIds: selected, activeId: targetId,
      anchorId: modifiers.shift ? state.anchorId : targetId });
  }

  function selectAll(current, visibleIds) {
    const ids = [...new Set(visibleIds || [])];
    return selection({ selectedIds: [...new Set([
      ...selection(current).selectedIds, ...ids
    ])], activeId: ids[0] || null, anchorId: ids[0] || null });
  }

  function clear() {
    return selection();
  }

  function focus(current, visibleIds, key) {
    const state = selection(current);
    const ids = [...new Set(visibleIds || [])];
    if (!ids.length) return selection({ ...state, activeId: null });
    const currentIndex = ids.indexOf(state.activeId);
    const index = currentIndex < 0 ? 0 : currentIndex;
    const next = key === "Home" ? 0 : key === "End" ? ids.length - 1 :
      key === "ArrowDown" || key === "ArrowRight" ?
        Math.min(ids.length - 1, index + 1) :
        key === "ArrowUp" || key === "ArrowLeft" ?
          Math.max(0, index - 1) : index;
    return selection({ ...state, activeId: ids[next] });
  }

  function reconcile(current, existingIds) {
    const allowed = new Set(existingIds || []);
    const state = selection(current);
    const selectedIds = state.selectedIds.filter(id => allowed.has(id));
    return selection({ selectedIds,
      activeId: selectedIds.includes(state.activeId) ? state.activeId :
        selectedIds[0] || null,
      anchorId: allowed.has(state.anchorId) ? state.anchorId :
        selectedIds[0] || null });
  }

  function selected(records, state) {
    const ids = new Set(selection(state).selectedIds);
    return records.filter(record => ids.has(record.projectId));
  }

  function patchFor(operation = {}) {
    const patch = {};
    const fields = operation.fields || {};
    if (fields.tags?.selected) {
      patch.tags = Array.isArray(fields.tags.value) ? fields.tags.value : [];
    }
    for (const field of ["author", "status", "archived", "favourite"]) {
      if (fields[field]?.selected) patch[field] = fields[field].value;
    }
    if (fields.profile?.selected) {
      patch.profile = fields.profile.value;
      patch.health = { overall: "Behöver ny bedömning", suggestionLabel: "",
        confirmations: [] };
    }
    if (fields.theme?.selected) patch.theme = fields.theme.value;
    return patch;
  }

  function apply(records, state, operation = {}) {
    const ids = new Set(selection(state).selectedIds);
    const patch = patchFor(operation);
    const hasChanges = Object.keys(patch).length > 0;
    let affected = 0;
    const next = records.map(record => {
      if (!ids.has(record.projectId) || !hasChanges) return library.normalize(record);
      const updated = library.merge(record, patch);
      if (JSON.stringify(updated) === JSON.stringify(record)) return updated;
      affected += 1;
      return updated;
    });
    return freeze({ batchSchemaVersion: BATCH_SCHEMA_VERSION,
      records: next, affected, operation: operation.type || "metadata" });
  }

  function favourite(records, state, value) {
    return apply(records, state, { type: "favourite", fields: {
      favourite: { selected: true, value: Boolean(value) }
    } });
  }

  function remove(records, state) {
    const ids = new Set(selection(state).selectedIds);
    return freeze({ batchSchemaVersion: BATCH_SCHEMA_VERSION,
      records: records.filter(record => !ids.has(record.projectId))
        .map(library.normalize), affected: records.filter(record =>
        ids.has(record.projectId)).length, operation: "delete",
      projectIds: [...ids] });
  }

  function exportPlan(records, state) {
    return freeze({ batchSchemaVersion: BATCH_SCHEMA_VERSION,
      operation: "export", projectIds: selected(records, state).map(
        record => record.projectId
      ), total: selected(records, state).length });
  }

  async function execute(plan, handler, options = {}) {
    const ids = Array.isArray(plan?.projectIds) ? plan.projectIds : [];
    const results = [];
    for (let index = 0; index < ids.length; index += 1) {
      const projectId = ids[index];
      options.onProgress?.({ phase: "starting", projectId,
        completed: index, total: ids.length });
      try {
        results.push(await handler(projectId, index));
      } catch (cause) {
        const error = new Error(cause?.message || "Batch operation failed.");
        error.cause = cause;
        error.completed = index;
        error.projectId = projectId;
        throw error;
      }
      options.onProgress?.({ phase: "completed", projectId,
        completed: index + 1, total: ids.length });
    }
    return freeze({ batchSchemaVersion: BATCH_SCHEMA_VERSION,
      operation: plan?.operation || "batch", completed: ids.length,
      total: ids.length, results });
  }

  return { BATCH_SCHEMA_VERSION, apply, clear, execute, exportPlan, focus,
    favourite, reconcile, remove, select, selectAll,
    selected, selection };
});
