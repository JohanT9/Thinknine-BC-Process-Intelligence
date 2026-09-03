(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapMinimap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create(layout = {}, nodes = [], selectedIds = []) {
    const selected = new Set(selectedIds);
    const nodeById = new Map(nodes.map(node => [node.nodeId, node]));
    const items = (layout.nodes || []).map(position => {
      const node = nodeById.get(position.nodeId) || {};
      return Object.freeze({ nodeId: position.nodeId, row: position.row,
        column: position.column, title: String(node.title || ""),
        selected: selected.has(position.nodeId) });
    });
    return Object.freeze({ columns: Math.max(1, layout.columnCount || 1),
      rows: Math.max(1, layout.rowCount || 1), items: Object.freeze(items) });
  }
  return { create };
});
