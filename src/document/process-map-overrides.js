(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapOverrides = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const array = value => Array.isArray(value) ? value : [];
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value); }
  function normalize(input) { return freeze(array(input).filter(item => item?.nodeId).map(item => ({
    nodeId: String(item.nodeId), title: item.title == null ? null : String(item.title).trim(),
    nodeType: item.nodeType || null, processRole: item.processRole ? clone(item.processRole) : null,
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : null
  }))); }
  function upsert(input, change) { const values = normalize(input).map(clone);
    const index = values.findIndex(item => item.nodeId === change.nodeId);
    const next = { ...(index >= 0 ? values[index] : { nodeId: change.nodeId }), ...clone(change) };
    if (index >= 0) values[index] = next; else values.push(next); return normalize(values); }
  function apply(model = {}, input = []) { const overrides = new Map(normalize(input).map(item => [item.nodeId, item]));
    const nodes = array(model.nodes).map((node, index) => { const change = overrides.get(node.nodeId) || {};
      return { ...clone(node), title: change.title || node.title,
        nodeType: change.nodeType || node.nodeType,
        processOrder: change.order == null ? (node.processOrder ?? index) : change.order,
        metadata: { ...clone(node.metadata || {}), ...(change.processRole ? {
          processRole: clone(change.processRole) } : {}) } }; }).sort((left, right) =>
      left.processOrder - right.processOrder).map((node, index) => ({ ...node, processOrder: index }));
    const onlySequence = array(model.transitions).every(item => item.transitionType === "sequence");
    const transitions = onlySequence ? nodes.slice(1).map((node, index) => ({
      transitionId: `map-override-sequence:${index + 1}:${nodes[index].nodeId}:${node.nodeId}`,
      fromNodeId: nodes[index].nodeId, toNodeId: node.nodeId, transitionType: "sequence" })) :
      clone(array(model.transitions));
    return freeze({ ...clone(model), nodes, transitions,
      startNodeIds: nodes[0] ? [nodes[0].nodeId] : [], endNodeIds: nodes.at(-1) ? [nodes.at(-1).nodeId] : [],
      metadata: { ...clone(model.metadata || {}), processMapOverridesApplied: overrides.size } }); }
  function move(input, model, nodeId, direction) { const applied = apply(model, input);
    const nodes = applied.nodes.map(node => node.nodeId); const index = nodes.indexOf(nodeId);
    const target = Math.max(0, Math.min(nodes.length - 1, index + (direction < 0 ? -1 : 1)));
    if (index < 0 || index === target) return normalize(input);
    [nodes[index], nodes[target]] = [nodes[target], nodes[index]];
    return normalize(nodes.reduce((result, id, order) => upsert(result, { nodeId: id, order }), input)); }
  return { apply, move, normalize, upsert };
});
