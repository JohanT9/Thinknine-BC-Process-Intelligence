(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessGraphLayout = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const LAYOUT_VERSION = "1.0.0";
  const DIRECTIONS = Object.freeze(["adaptive", "vertical"]);
  const DEFAULTS = Object.freeze({ availableWidth: 1000, nodeWidth: 190,
    columnGap: 30, minColumns: 1, maxColumns: 5 });
  const positive = (value, fallback) => Number.isFinite(value) && value > 0
    ? value : fallback;

  function orderedNodes(model) {
    return (model?.nodes || []).filter(node =>
      !["start", "end", "subprocess"].includes(node.nodeType)
    ).map((node, sourceIndex) => ({ node, sourceIndex }))
      .sort((left, right) =>
        ((left.node.processOrder ?? left.node.sequence ?? left.sourceIndex) -
          (right.node.processOrder ?? right.node.sequence ?? right.sourceIndex)) ||
        left.sourceIndex - right.sourceIndex)
      .map(item => item.node);
  }

  function calculateColumnCount(nodeCount, options = {}) {
    if (!nodeCount) return 0;
    const width = positive(options.availableWidth, DEFAULTS.availableWidth);
    const nodeWidth = positive(options.nodeWidth, DEFAULTS.nodeWidth);
    const gap = positive(options.columnGap, DEFAULTS.columnGap);
    const minimum = Math.max(1, Math.floor(positive(options.minColumns,
      DEFAULTS.minColumns)));
    const maximum = Math.max(minimum, Math.floor(positive(options.maxColumns,
      DEFAULTS.maxColumns)));
    const fitting = Math.max(1, Math.floor((width + gap) / (nodeWidth + gap)));
    let columns = Math.min(nodeCount, Math.max(minimum, Math.min(maximum, fitting)));
    if (columns > 2 && nodeCount > columns && nodeCount % columns === 1) {
      const balanced = columns - 1;
      if (Math.ceil(nodeCount / balanced) === Math.ceil(nodeCount / columns)) {
        columns = balanced;
      }
    }
    return columns;
  }

  function branchLayers(nodes, relationships) {
    const ids = new Set(nodes.map(node => node.nodeId));
    const edges = (relationships || []).map(edge => ({
      from: edge.fromNodeId || edge.sourceNodeId,
      to: edge.toNodeId || edge.targetNodeId,
      type: edge.transitionType || edge.relationshipType || "sequence"
    })).filter(edge => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to &&
      !["loop", "return", "returnsTo"].includes(edge.type));
    const outgoing = new Map();
    edges.forEach(edge => outgoing.set(edge.from, [...(outgoing.get(edge.from) || []), edge]));
    if (![...outgoing.values()].some(values => values.length > 1)) return null;
    const depth = new Map(nodes.map(node => [node.nodeId, 0]));
    for (let pass = 0; pass < nodes.length; pass += 1) {
      let changed = false;
      edges.forEach(edge => { const next = Math.min(nodes.length - 1,
        (depth.get(edge.from) || 0) + 1); if (next > (depth.get(edge.to) || 0)) {
        depth.set(edge.to, next); changed = true; } });
      if (!changed) break;
    }
    const layers = []; nodes.forEach(node => { const level = depth.get(node.nodeId) || 0;
      if (!layers[level]) layers[level] = []; layers[level].push(node); });
    return layers.filter(Boolean);
  }

  function create(model, options = {}) {
    const sourceNodes = orderedNodes(model);
    const direction = DIRECTIONS.includes(options.direction) ? options.direction : "adaptive";
    const layers = direction === "adaptive" ? branchLayers(sourceNodes,
      model?.transitions || model?.relationships) : null;
    const columnCount = layers ? Math.max(3, ...layers.map(layer => layer.length)) :
      direction === "vertical" ? Math.min(1, sourceNodes.length) :
      calculateColumnCount(sourceNodes.length, options);
    const rows = [];
    const placements = layers ? layers.flatMap((layer, row) => layer.map((node, position) => {
      const column = layer.length === 1 ? Math.floor(columnCount / 2) :
        Math.round(position * (columnCount - 1) / (layer.length - 1));
      if (!rows[row]) rows[row] = { row, direction: "forward", nodeIds: [] };
      rows[row].nodeIds.push(node.nodeId);
      return { node, row, column };
    })) : sourceNodes.map((node, order) => {
      const row = Math.floor(order / columnCount);
      const position = order % columnCount;
      const reverse = direction === "adaptive" && row % 2 === 1;
      const column = reverse ? columnCount - position - 1 : position;
      if (!rows[row]) rows[row] = { row, direction: reverse ? "reverse" : "forward",
        nodeIds: [] };
      rows[row].nodeIds.push(node.nodeId);
      return { node, row, column };
    });
    const nodes = placements.map((placement, order) => Object.freeze({
      nodeId: placement.node.nodeId, order, row: placement.row, column: placement.column
    }));
    const byId = new Map(nodes.map(node => [node.nodeId, node]));
    const edges = (model?.transitions || model?.relationships || []).map(edge => {
      const fromNodeId = edge.fromNodeId || edge.sourceNodeId;
      const toNodeId = edge.toNodeId || edge.targetNodeId;
      const from = byId.get(fromNodeId);
      const to = byId.get(toNodeId);
      if (!from || !to) return null;
      const route = from.row === to.row ? "horizontal" :
        (to.order === from.order + 1 ? "rowWrap" : "orthogonal");
      return Object.freeze({ edgeId: edge.transitionId || edge.relationshipId ||
        `${fromNodeId}:${toNodeId}`, fromNodeId, toNodeId, route,
      relationshipType: edge.transitionType || edge.relationshipType || "sequence" });
    }).filter(Boolean);
    const strategy = layers ? "branched" : direction === "vertical" ? "vertical" :
      rows.length <= 1 ? "horizontal" : "serpentine";
    return Object.freeze({ layoutVersion: LAYOUT_VERSION, direction,
      strategy,
      flowDirection: layers ? "topToBottomBranches" : direction === "vertical"
        ? "topToBottom" : "leftToRightRows",
      columnCount, rowCount: rows.length,
      rows: Object.freeze(rows.map(row => Object.freeze({ row: row.row,
        direction: row.direction,
        nodeIds: Object.freeze([...row.nodeIds]) }))),
      nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
  }

  return { DEFAULTS, DIRECTIONS, LAYOUT_VERSION, branchLayers, calculateColumnCount,
    create, orderedNodes };
});
