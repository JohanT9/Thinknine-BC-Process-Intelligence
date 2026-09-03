(function (root, factory) {
  const visualGrammar = typeof module === "object" && module.exports
    ? require("../document/process-visual-grammar") : root.T9ProcessVisualGrammar;
  const routeGrammar = typeof module === "object" && module.exports
    ? require("../document/process-route-grammar") : root.T9ProcessRouteGrammar;
  const laneModel = typeof module === "object" && module.exports
    ? require("../document/process-lane-model") : root.T9ProcessLaneModel;
  const mapTheme = typeof module === "object" && module.exports
    ? require("../document/process-map-theme") : root.T9ProcessMapTheme;
  const mapLegend = typeof module === "object" && module.exports
    ? require("../document/process-map-legend") : root.T9ProcessMapLegend;
  const api = factory(visualGrammar, routeGrammar, laneModel, mapTheme, mapLegend);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessSvgExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
  function (visualGrammar, routeGrammar, processLaneModel, processMapTheme,
    processMapLegend) {
  "use strict";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  })[character]);
  function wrap(value, width = 22, limit = 3) { const words = String(value || "").trim()
    .split(/\s+/u).filter(Boolean); const lines = []; words.forEach(word => {
      if (lines.length && `${lines.at(-1)} ${word}`.length <= width) lines[lines.length - 1] += ` ${word}`;
      else if (lines.length < limit) lines.push(word.slice(0, width));
      else if (!lines.at(-1).endsWith("…")) lines[limit - 1] = `${lines.at(-1).slice(0, width - 1)}…`;
    }); return lines; }
  const ordered = model => [...(model.nodes || [])].sort((left, right) =>
    (left.processOrder ?? left.sequence ?? 0) - (right.processOrder ?? right.sequence ?? 0) ||
    left.nodeId.localeCompare(right.nodeId));
  function stateValue(value, english) { if (value?.value !== undefined && value?.value !== null)
    return String(value.value); if (typeof value?.checked === "boolean") return value.checked
      ? (english ? "On" : "På") : (english ? "Off" : "Av");
    if (typeof value?.visible === "boolean") return value.visible
      ? (english ? "Visible" : "Synlig") : (english ? "Closed" : "Stängd");
    return String(value?.outcome || value?.page?.caption || ""); }
  function rowsFor(model, nodes, columns, english) {
    const lanes = processLaneModel.create(model, { unassignedTitle: english
      ? "Other steps" : "Övriga steg" });
    const laneById = new Map(lanes.lanes.map(lane => [lane.laneId, lane]));
    const assignment = node => lanes.assignments[node.nodeId] ||
      (node.nodeType === "start" ? "boundary:start" : "boundary:end");
    const segments = []; let current;
    nodes.forEach(node => { const laneId = assignment(node); if (!current || current.laneId !== laneId) {
      current = { laneId, nodes: [] }; segments.push(current); } current.nodes.push(node); });
    const rows = []; segments.forEach(segment => { for (let index = 0;
      index < segment.nodes.length; index += columns) rows.push({ laneId: segment.laneId,
      lane: laneById.get(segment.laneId), nodes: segment.nodes.slice(index, index + columns),
      firstInLane: index === 0 }); });
    return { lanes, rows };
  }
  function edgePath(from, to) { const sx = from.x + from.width; const sy = from.y + from.height / 2;
    const tx = to.x; const ty = to.y + to.height / 2; if (Math.abs(sy - ty) < 5 && tx >= sx)
      return { d: `M ${sx} ${sy} H ${tx}`, labelX: (sx + tx) / 2, labelY: sy - 8 };
    if (to.y > from.y) { const middle = sy + Math.max(24, (to.y - sy) / 2); return {
      d: `M ${from.x + from.width / 2} ${from.y + from.height} V ${middle} H ${
        to.x + to.width / 2} V ${to.y}`, labelX: (from.x + to.x + to.width) / 2,
      labelY: middle - 7 }; }
    const lift = Math.max(28, Math.abs(from.x - to.x) / 5); return {
      d: `M ${from.x + from.width / 2} ${from.y} V ${from.y - lift} H ${
        to.x + to.width / 2} V ${to.y}`, labelX: (from.x + to.x + to.width) / 2,
      labelY: from.y - lift - 7 }; }
  function nodeShape(node, box, visual) { const { x, y, width, height } = box;
    if (visual.shape === "diamond") return `<polygon points="${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}"/>`;
    if (visual.shape === "hexagon") return `<polygon points="${x + 14},${y} ${x + width - 14},${y} ${x + width},${y + height / 2} ${x + width - 14},${y + height} ${x + 14},${y + height} ${x},${y + height / 2}"/>`;
    const radius = visual.shape === "terminal" ? height / 2 : visual.shape === "rounded" ? 18 : 6;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/>`; }
  function applyTheme(markup, theme) {
    const palette = theme.palette;
    const colors = [["#fefefe", palette.actionFill], ["#f4f8fb", palette.lane],
      ["#c8d5df", palette.laneBorder],
      ["#213547", palette.text], ["#52606d", palette.edge], ["#172b3a", palette.text],
      ["#3f5668", palette.edge], ["#eaf3f8", palette.brandFill], ["#31566f", palette.brand],
      ["#eef8fd", palette.documentFill], ["#2878a5", palette.document],
      ["#eef8f0", palette.postedFill], ["#347447", palette.posted],
      ["#fff4ce", palette.decisionFill], ["#7a5b00", palette.decision],
      ["#f6f2ff", palette.systemFill], ["#66558f", palette.system],
      ["#fff8ef", palette.manualFill], ["#8a5a2b", palette.manual],
      ["#49657a", palette.edge], ["#8a6d1d", palette.decision],
      ["#765b00", palette.decision], ["#5f4b16", palette.decision]];
    const backgroundThemed = markup.replaceAll("fill:#fff}", `fill:${palette.background}}`)
      .replaceAll("stroke:#fff;", `stroke:${palette.background};`);
    const themed = colors.reduce((value, [from, to]) => value.split(from).join(to),
      backgroundThemed);
    return themed.replace("<svg ", `<svg data-process-theme="${theme.id}" `);
  }
  function legendFor(model, locale, width, y) {
    const legend = processMapLegend.create(model, locale);
    const items = [...legend.nodes.map(item => ({ ...item, type: "node" })),
      ...legend.routes.map(item => ({ ...item, type: "route" }))];
    const columns = Math.max(1, Math.min(4, Math.floor((width - 80) / 210)));
    const rows = Math.max(1, Math.ceil(items.length / columns));
    const itemWidth = (width - 80) / columns;
    const markup = items.map((item, index) => { const x = 42 + (index % columns) * itemWidth;
      const itemY = y + 35 + Math.floor(index / columns) * 28;
      const symbol = item.type === "node"
        ? nodeShape({}, { x, y: itemY - 12, width: 22, height: 16 }, item)
        : `<line x1="${x}" y1="${itemY - 4}" x2="${x + 26}" y2="${itemY - 4}"
          class="legend-route legend-route-${escape(item.line)}"/>`;
      return `<g class="legend-item">${symbol}<text x="${x + 34}" y="${itemY}">${
        escape(item.label)}</text></g>`; }).join("");
    return { height: 47 + rows * 28, markup: `<g class="diagram-legend"><rect x="20" y="${y}"
      width="${width - 40}" height="${47 + rows * 28}" rx="5"/><text class="legend-title"
      x="34" y="${y + 21}">${escape(legend.title)}</text>${markup}</g>` };
  }
  function svg(model, options = {}) {
    const english = String(options.language || "").toLowerCase().startsWith("en");
    const theme = processMapTheme.resolve(options.theme);
    const density = options.density === "compact" ? "compact" : "standard";
    const nodes = ordered(model); const columns = Math.max(1, Math.min(5, Number(options.columns) || 4));
    const nodeWidth = density === "compact" ? 150 : 190;
    const nodeHeight = density === "compact" ? 76 : 104;
    const gapX = density === "compact" ? 52 : 72;
    const gapY = density === "compact" ? 44 : 64;
    const margin = 54; const header = 74; const laneHeader = 34;
    const layout = rowsFor(model, nodes, columns, english); const boxes = {}; let cursorY = header;
    const laneBands = []; layout.rows.forEach(row => { if (layout.lanes.visible && row.firstInLane && row.lane) {
      laneBands.push({ y: cursorY, title: row.lane.title }); cursorY += laneHeader; }
      row.nodes.forEach((node, column) => { boxes[node.nodeId] = { x: margin + column *
        (nodeWidth + gapX), y: cursorY, width: nodeWidth, height: nodeHeight }; });
      cursorY += nodeHeight + gapY; });
    const width = Math.max(560, margin * 2 + Math.min(columns, Math.max(1,
      ...layout.rows.map(row => row.nodes.length))) * nodeWidth + (columns - 1) * gapX);
    const contentHeight = Math.max(300, cursorY - gapY + margin);
    const legend = legendFor(model, options.language, width, contentHeight + 12);
    const height = contentHeight + legend.height + 24;
    const stateByNode = new Map(); (model.stateTransitions || []).forEach(change => {
      const values = stateByNode.get(change.activityNodeId) || []; values.push(change);
      stateByNode.set(change.activityNodeId, values); });
    const edges = (model.transitions || model.relationships || []).filter(edge => boxes[
      edge.fromNodeId || edge.sourceNodeId] && boxes[edge.toNodeId || edge.targetNodeId])
      .map(edge => { const fromId = edge.fromNodeId || edge.sourceNodeId;
        const toId = edge.toNodeId || edge.targetNodeId; const route = routeGrammar.presentationFor(
          edge, options.language); const path = edgePath(boxes[fromId], boxes[toId]);
        const explicit = edge.label || edge.condition; return `<path d="${path.d}" class="edge edge-${
          escape(route.kind)}" marker-end="url(#arrow)"/>${explicit ? `<text x="${path.labelX}" y="${
          path.labelY}" class="route-label" text-anchor="middle">${escape(explicit)}</text>` : ""}`; })
      .join("");
    const nodeMarkup = nodes.map(node => { const box = boxes[node.nodeId];
      const visual = visualGrammar.presentationFor(node, options.language);
      const lines = wrap(node.title, density === "compact" ? 18 : 22,
        density === "compact" ? 2 : 3);
      const changes = stateByNode.get(node.nodeId) || [];
      const textY = box.y + box.height / 2 - (lines.length - 1) * 9 - (changes.length ? 10 : 0);
      const changeMarkup = changes.slice(0, 2).map((change, index) => { const label =
        change.before?.control?.caption || change.after?.control?.caption || change.factKey;
        return `<text x="${box.x + box.width / 2}" y="${box.y + box.height - 12 + index * 13}"
          class="state" text-anchor="middle">${escape(label)}: ${escape(stateValue(change.before,
          english))} → ${escape(stateValue(change.after, english))}</text>`; }).join("");
      return `<g class="map-node map-node-${escape(visual.kind)}" data-node-type="${
        escape(node.nodeType)}" data-node-id="${escape(node.nodeId)}">${nodeShape(node, box, visual)}<text x="${
        box.x + box.width / 2}" y="${textY}" text-anchor="middle">${lines.map((line, index) =>
        `<tspan x="${box.x + box.width / 2}" dy="${index ? 18 : 0}">${escape(line)}</tspan>`).join("")}</text>${changeMarkup}</g>`; }).join("");
    const laneMarkup = laneBands.map(lane => `<g class="lane"><rect x="20" y="${lane.y}" width="${
      width - 40}" height="${laneHeader - 6}" rx="4"/><text x="32" y="${lane.y + 19}">${
      escape(lane.title)}</text></g>`).join("");
    const title = options.title || model.title || "Process";
    return applyTheme(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">${escape(title)}</title><desc id="description">${escape(english ? "Exported process diagram" : "Exporterat processdiagram")}</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#49657a"/></marker></defs><style>.background{fill:#fff}.lane rect{fill:#f4f8fb;stroke:#c8d5df}.lane text{font:700 13px Arial,sans-serif;fill:#213547}.map-node>*:first-child{fill:#fefefe;stroke:#52606d;stroke-width:2}.map-node text{font:600 14px Arial,sans-serif;fill:#172b3a}.map-node .state{font:11px Arial,sans-serif;fill:#3f5668}.map-node-business-process>*:first-child{fill:#eaf3f8;stroke:#31566f}.map-node-document>*:first-child{fill:#eef8fd;stroke:#2878a5}.map-node-posted-document>*:first-child{fill:#eef8f0;stroke:#347447}.map-node-posting>*:first-child,.map-node-decision>*:first-child{fill:#fff4ce;stroke:#7a5b00}.map-node-system-action>*:first-child{fill:#f6f2ff;stroke:#66558f;stroke-dasharray:6 4}.map-node-manual-action>*:first-child{fill:#fff8ef;stroke:#8a5a2b}.edge{fill:none;stroke:#49657a;stroke-width:2;stroke-linejoin:round}.edge-alternate,.edge-loop,.edge-return{stroke:#8a6d1d;stroke-dasharray:7 5}.edge-conditional,.edge-branch{stroke:#765b00;stroke-width:2.5}.edge-creates{stroke:#2878a5;stroke-dasharray:2 5}.edge-posts{stroke:#347447;stroke-width:3}.route-label{font:12px Arial,sans-serif;fill:#5f4b16;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}.diagram-legend>rect{fill:#f4f8fb;stroke:#c8d5df}.diagram-legend text{font:12px Arial,sans-serif;fill:#172b3a}.diagram-legend .legend-title{font-weight:700}.legend-item>*:first-child{fill:#fefefe;stroke:#52606d;stroke-width:2}.legend-route{fill:none!important;stroke:#49657a!important}.legend-route-dashed{stroke-dasharray:7 5}.legend-route-dotted{stroke-dasharray:2 5}.legend-route-double{stroke-width:4!important}</style><rect class="background" width="100%" height="100%"/><text x="${margin}" y="38" style="font:700 20px Arial,sans-serif;fill:#172b3a">${escape(title)}</text>${laneMarkup}<g class="edges">${edges}</g><g class="nodes">${nodeMarkup}</g>${legend.markup}</svg>\n`, theme);
  }
  return { applyTheme, edgePath, legendFor, rowsFor, svg };
});
