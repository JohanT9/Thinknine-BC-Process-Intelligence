(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapRelationshipOverrides = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clone = value => JSON.parse(JSON.stringify(value));
  const freeze = value => { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value); };
  function normalize(input = []) { return freeze((Array.isArray(input) ? input : []).filter(item =>
    item?.relationshipId && item?.fromNodeId && item?.toNodeId).map(item => ({
      relationshipId: String(item.relationshipId), fromNodeId: String(item.fromNodeId),
      toNodeId: String(item.toNodeId), transitionType: item.transitionType || "sequence",
      label: String(item.label || "").trim(), deleted: item.deleted === true
    }))); }
  function upsert(input, change) { const values = normalize(input).map(clone);
    const index = values.findIndex(item => item.relationshipId === change.relationshipId);
    const next = { ...(index >= 0 ? values[index] : {}), ...clone(change) };
    if (index >= 0) values[index] = next; else values.push(next); return normalize(values); }
  function apply(model = {}, input = []) { const changes = normalize(input);
    const byId = new Map(changes.map(item => [item.relationshipId, item])); const replaced = new Set();
    const existing = (model.transitions || model.relationships || []).map((edge, index) => {
      const id = edge.transitionId || edge.relationshipId || `relationship:${index}`;
      const change = byId.get(id); if (!change) return clone(edge); replaced.add(id);
      if (change.deleted) return null;
      return { ...clone(edge), transitionId: id, fromNodeId: change.fromNodeId,
        toNodeId: change.toNodeId, transitionType: change.transitionType,
        label: change.label || undefined };
    }).filter(Boolean);
    changes.filter(change => !replaced.has(change.relationshipId) && !change.deleted)
      .forEach(change => existing.push({ transitionId: change.relationshipId,
        fromNodeId: change.fromNodeId, toNodeId: change.toNodeId,
        transitionType: change.transitionType, label: change.label || undefined }));
    return freeze({ ...clone(model), transitions: existing,
      metadata: { ...clone(model.metadata || {}), processMapRelationshipOverridesApplied: changes.length } });
  }
  function createId(fromNodeId, toNodeId, sequence = 0) {
    return `map-relationship:${fromNodeId}:${toNodeId}:${Number(sequence) || 0}`;
  }
  return { apply, createId, normalize, upsert };
});
