(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessGraph = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = "1.0.0";
  const LEVELS = Object.freeze(["businessProcess", "businessCentralProcess", "userProcedure"]);
  const NODE_TYPES = Object.freeze(["start", "end", "businessProcess", "subprocess",
    "processStep", "document", "postedDocument", "action", "decision", "systemAction",
    "posting", "manualAction", "status", "dataEntity", "externalSystem"]);
  const RELATIONSHIP_TYPES = Object.freeze(["sequence", "branch", "conditionalBranch",
    "loop", "subprocess", "documentCreation", "documentPosting", "creates", "posts",
    "releases", "consumes", "produces", "references", "derivedFrom", "triggers",
    "branchesTo", "returnsTo", "updates", "transfersTo"]);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const unique = values => [...new Set((values || []).map(String).filter(Boolean))];
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value); }
  function stableId(prefix, values) { let hash = 2166136261; for (const character of
    values.map(String).join("\u001f")) { hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619); } return `${prefix}:${(hash >>> 0).toString(36)}`; }
  function node(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    nodeId: String(value.nodeId || ""), nodeType: NODE_TYPES.includes(value.nodeType)
      ? value.nodeType : "action", title: String(value.title || ""),
    description: String(value.description || ""), sequence: Number.isFinite(value.sequence)
      ? value.sequence : 0, sourceEventIds: unique(value.sourceEventIds),
    semanticClassificationIds: unique(value.semanticClassificationIds),
    taxonomyEntityIds: unique(value.taxonomyEntityIds), childNodeIds: unique(value.childNodeIds),
    metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) }); }
  function relationship(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    relationshipId: String(value.relationshipId || ""), fromNodeId: String(value.fromNodeId || ""),
    toNodeId: String(value.toNodeId || ""), relationshipType:
      RELATIONSHIP_TYPES.includes(value.relationshipType) ? value.relationshipType : "sequence",
    label: String(value.label || ""), condition: value.condition ?? null,
    sourceEventIds: unique(value.sourceEventIds), metadata: clone(object(value.metadata)),
    futureFields: clone(object(value.futureFields)) }); }
  function normalize(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    schemaVersion: SCHEMA_VERSION, graphId: String(value.graphId || ""),
    recordingId: String(value.recordingId || ""), level: LEVELS.includes(value.level)
      ? value.level : "userProcedure", title: String(value.title || ""),
    nodes: (value.nodes || []).map(node), relationships: (value.relationships || []).map(relationship),
    groups: (value.groups || []).map(item => freeze({ ...clone(object(item)),
      groupId: String(item.groupId || ""), title: String(item.title || ""),
      nodeIds: unique(item.nodeIds), metadata: clone(object(item.metadata)) })),
    startNodeIds: unique(value.startNodeIds), endNodeIds: unique(value.endNodeIds),
    metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) }); }
  function validate(input) { const graph = normalize(input); const diagnostics = [];
    const ids = new Set(); graph.nodes.forEach(item => { if (!item.nodeId || ids.has(item.nodeId))
      diagnostics.push({ code: "duplicate-or-missing-node-id", nodeId: item.nodeId || null });
    ids.add(item.nodeId); }); graph.relationships.forEach(edge => { if (!edge.relationshipId)
      diagnostics.push({ code: "missing-relationship-id" });
    if (!ids.has(edge.fromNodeId) || !ids.has(edge.toNodeId)) diagnostics.push({
      code: "orphan-relationship", relationshipId: edge.relationshipId }); });
    [...graph.startNodeIds, ...graph.endNodeIds].forEach(id => { if (!ids.has(id))
      diagnostics.push({ code: "missing-boundary-node", nodeId: id }); });
    return freeze({ valid: diagnostics.length === 0, diagnostics, graph }); }
  return { LEVELS, NODE_TYPES, RELATIONSHIP_TYPES, SCHEMA_VERSION, normalize, node,
    relationship, stableId, validate };
});
