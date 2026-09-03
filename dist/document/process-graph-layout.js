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
    return Math.min(nodeCount, Math.max(minimum, Math.min(maximum, fitting)));
  }

  function create(model, options = {}) {
    const sourceNodes = orderedNodes(model);
    const direction = DIRECTIONS.includes(options.direction) ? options.direction : "adaptive";
    const columnCount = direction === "vertical" ? Math.min(1, sourceNodes.length) :
      calculateColumnCount(sourceNodes.length, options);
    const rows = [];
    const nodes = sourceNodes.map((node, order) => {
      const row = Math.floor(order / columnCount);
      const column = order % columnCount;
      if (!rows[row]) rows[row] = { row, nodeIds: [] };
      rows[row].nodeIds.push(node.nodeId);
      return Object.freeze({ nodeId: node.nodeId, order, row, column });
    });
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
    return Object.freeze({ layoutVersion: LAYOUT_VERSION, direction,
      flowDirection: direction === "vertical" ? "topToBottom" : "leftToRightRows",
      columnCount, rowCount: rows.length,
      rows: Object.freeze(rows.map(row => Object.freeze({ row: row.row,
        nodeIds: Object.freeze([...row.nodeIds]) }))),
      nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
  }

  return { DEFAULTS, DIRECTIONS, LAYOUT_VERSION, calculateColumnCount, create, orderedNodes };
});
