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
  const mapLabels = typeof module === "object" && module.exports
    ? require("../document/process-map-labels") : root.T9ProcessMapLabels;
  const graphLayout = typeof module === "object" && module.exports
    ? require("../document/process-graph-layout") : root.T9ProcessGraphLayout;
  const api = factory(visualGrammar, routeGrammar, laneModel, mapTheme, mapLegend, mapLabels,
    graphLayout);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessSvgExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
  function (visualGrammar, routeGrammar, processLaneModel, processMapTheme,
    processMapLegend, processMapLabels, processGraphLayout) {
  "use strict";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  })[character]);
  function wrap(value, width = 22, limit = 3) { const words = String(value || "").trim()
    .split(/\s+/u).filter(Boolean); const tokens = words.flatMap(word => word.length <= width
      ? [word] : (word.match(new RegExp(`.{1,${width}}`, "gu")) || [])); const lines = [];
    tokens.forEach(word => {
      if (lines.length && `${lines.at(-1)} ${word}`.length <= width)
        lines[lines.length - 1] += ` ${word}`;
      else if (lines.length < limit) lines.push(word);
      else if (!lines.at(-1).endsWith("…"))
        lines[limit - 1] = `${lines.at(-1).slice(0, width - 1)}…`;
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
  function rowsFor(model, nodes, columns, english, graph) {
    if (graph?.flowDirection === "topToBottomBranches") {
      const nodeById = new Map(nodes.map(node => [node.nodeId, node]));
      const placements = new Map(graph.nodes.map(item => [item.nodeId, item]));
      const centered = Math.floor(graph.columnCount / 2);
      const boundaries = nodes.filter(node => ["start", "end"].includes(node.nodeType));
      boundaries.forEach(node => placements.set(node.nodeId, { nodeId: node.nodeId,
        column: centered }));
      const rows = graph.rows.map(row => ({ laneId: null, lane: null,
        nodes: row.nodeIds.map(nodeId => nodeById.get(nodeId)).filter(Boolean),
        firstInLane: false }));
      const starts = boundaries.filter(node => node.nodeType === "start");
      const ends = boundaries.filter(node => node.nodeType === "end");
      return { lanes: { visible: false }, placements, rows: [
        ...(starts.length ? [{ laneId: null, lane: null, nodes: starts,
          firstInLane: false }] : []), ...rows,
        ...(ends.length ? [{ laneId: null, lane: null, nodes: ends,
          firstInLane: false }] : [])
      ] };
    }
    const lanes = processLaneModel.create(model, { unassignedTitle: english
      ? "Other steps" : "Övriga steg", roleNames: english ? {} : {
        purchasing: "Inköp", warehouse: "Lager", sales: "Försäljning",
        production: "Produktion", finance: "Ekonomi", system: "System" } });
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
    if (Math.abs(sy - ty) < 5 && to.x < from.x) { const reverseStart = from.x;
      const reverseTarget = to.x + to.width; return { d: `M ${reverseStart} ${sy} H ${reverseTarget}`,
        labelX: (reverseStart + reverseTarget) / 2, labelY: sy - 8 }; }
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
    if (visual.shape === "document") return `<path class="document-shape" d="M ${x} ${y} H ${
      x + width} V ${y + height - 12} C ${x + width * 0.75} ${y + height + 2}, ${
      x + width * 0.25} ${y + height - 24}, ${x} ${y + height - 12} Z"/>`;
    if (visual.shape === "manual") return `<polygon class="manual-shape" points="${x + 14},${
      y} ${x + width},${y} ${x + width - 14},${y + height} ${x},${y + height}"/>`;
    if (visual.shape === "data") return `<path class="data-shape" d="M ${x} ${y + 10} C ${x} ${
      y - 3}, ${x + width} ${y - 3}, ${x + width} ${y + 10} V ${y + height - 10} C ${
      x + width} ${y + height + 3}, ${x} ${y + height + 3}, ${x} ${y + height - 10} Z"/>`;
    if (["system", "external"].includes(visual.shape)) return `<path class="system-shape" d="M ${
      x + 10} ${y} H ${x + width - 10} L ${x + width} ${y + 10} V ${
      y + height - 10} L ${x + width - 10} ${y + height} H ${x + 10} L ${x} ${
      y + height - 10} V ${y + 10} Z"/>`;
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
      ...legend.routes.map(item => ({ ...item, type: "route" })),
      ...(legend.statuses || []).map(item => ({ ...item, type: "status" }))];
    const columns = Math.max(1, Math.min(4, Math.floor((width - 80) / 210)));
    const rows = Math.max(1, Math.ceil(items.length / columns));
    const itemWidth = (width - 80) / columns;
    const markup = items.map((item, index) => { const x = 42 + (index % columns) * itemWidth;
      const itemY = y + 35 + Math.floor(index / columns) * 28;
      const symbol = item.type === "node"
        ? nodeShape({}, { x, y: itemY - 12, width: 22, height: 16 }, item)
        : item.type === "status"
          ? `<rect x="${x}" y="${itemY - 12}" width="22" height="16" rx="4"
            class="legend-status semantic-${escape(item.status)}"/>`
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
    const nodes = ordered(model); let columns = Math.max(1, Math.min(5,
      Number(options.columns) || 4));
    const graph = processGraphLayout.create(model, { availableWidth: columns * 242,
      maxColumns: columns });
    if (graph.flowDirection === "topToBottomBranches") columns = graph.columnCount;
    if (columns > 2 && nodes.length > columns && nodes.length % columns === 1 &&
        Math.ceil(nodes.length / (columns - 1)) === Math.ceil(nodes.length / columns)) {
      columns -= 1;
    }
    const nodeWidth = density === "compact" ? 150 : 190;
    const titleWidth = density === "compact" ? 18 : 22;
    const titleLineLimit = density === "compact" ? 2 : 4;
    const titleLinesByNode = new Map(nodes.map(node => [node.nodeId, wrap(
      processMapLabels.nodeTitle(node, options.language), titleWidth, titleLineLimit)]));
    const maximumTitleLines = Math.max(1, ...titleLinesByNode.values().map(lines => lines.length));
    const nodeHeight = density === "compact" ? 76 : Math.max(104, 68 + maximumTitleLines * 18);
    const gapX = density === "compact" ? 52 : 72;
    const gapY = density === "compact" ? 44 : 64;
    const margin = 64; const header = 126; const laneHeader = 42;
    const layout = rowsFor(model, nodes, columns, english, graph); const boxes = {};
    let cursorY = header;
    const laneBands = []; let activeLaneBand;
    layout.rows.forEach(row => { if (row.firstInLane) activeLaneBand = null;
      if (layout.lanes.visible && row.firstInLane && row.lane) {
        activeLaneBand = { y: cursorY, title: row.lane.title, laneId: row.lane.laneId,
          bottom: cursorY };
        laneBands.push(activeLaneBand); cursorY += laneHeader; }
      const rowNumber = layout.rows.indexOf(row);
      row.nodes.forEach((node, column) => { const visualColumn = layout.placements?.get(
        node.nodeId)?.column ?? (rowNumber % 2 ? row.nodes.length - column - 1 : column);
        boxes[node.nodeId] = { x: margin + visualColumn *
        (nodeWidth + gapX), y: cursorY, width: nodeWidth, height: nodeHeight }; });
      cursorY += nodeHeight + gapY;
      if (activeLaneBand) activeLaneBand.bottom = cursorY - Math.round(gapY / 2); });
    const visibleColumns = Math.min(columns, Math.max(1,
      ...layout.rows.map(row => row.nodes.length)));
    const width = Math.max(560, margin * 2 + visibleColumns * nodeWidth +
      Math.max(0, visibleColumns - 1) * gapX);
    const contentHeight = Math.max(340, cursorY - gapY + margin);
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
        const explicit = edge.label || edge.condition || processMapLabels.handoffTitle(
          edge.metadata?.responsibilityHandoff, options.language);
        const routeLabel = explicit || (route.kind === "sequence" ? "" : route.label);
        return `<path d="${path.d}" class="edge edge-${
          escape(route.kind)}" marker-end="url(#arrow)"/>${routeLabel ? `<text x="${path.labelX}" y="${
          path.labelY}" class="route-label" text-anchor="middle">${escape(routeLabel)}</text>` : ""}`; })
      .join("");
    const nodeMarkup = nodes.map((node, nodeIndex) => { const box = boxes[node.nodeId];
      const visual = visualGrammar.presentationFor(node, options.language);
      const fullTitle = processMapLabels.nodeTitle(node, options.language);
      const lines = titleLinesByNode.get(node.nodeId) || [fullTitle];
      const changes = stateByNode.get(node.nodeId) || [];
      const textY = box.y + box.height / 2 - (lines.length - 1) * 9 - (changes.length ? 10 : 0);
      const changeMarkup = changes.slice(0, 2).map((change, index) => { const label =
        change.before?.control?.caption || change.after?.control?.caption || change.factKey;
        return `<text x="${box.x + box.width / 2}" y="${box.y + box.height - 12 + index * 13}"
          class="state" text-anchor="middle">${escape(label)}: ${escape(stateValue(change.before,
          english))} → ${escape(stateValue(change.after, english))}</text>`; }).join("");
      const semanticStatus = node?.metadata?.semanticStatus;
      const semanticClass = semanticStatus ? ` semantic-${escape(semanticStatus)}` : "";
      const boundary = ["start", "end"].includes(visual.kind);
      const stepNumber = nodes.slice(0, nodeIndex).filter(item => !["start", "end"].includes(
        visualGrammar.presentationFor(item, options.language).kind)).length + 1;
      const badge = boundary ? "" : `<circle class="step-badge" cx="${box.x + 1}" cy="${
        box.y + 1}" r="16"/><text class="step-number" x="${box.x + 1}" y="${
        box.y + 6}" text-anchor="middle">${stepNumber}</text>`;
      const statusMarker = semanticStatus ? `<circle class="status-dot" cx="${
        box.x + box.width - 13}" cy="${box.y + 14}" r="6"><title>${
        escape(processMapLabels.statusTitle(semanticStatus, options.language))}</title></circle>` : "";
      const kindLabel = visual.label ? `<text class="node-kind" x="${box.x + 24}" y="${box.y + 22}">${
        escape(String(visual.label).toLocaleUpperCase(english ? "en-US" : "sv-SE"))}</text>` : "";
      return `<g class="map-node map-node-${escape(visual.kind)}${semanticClass}" data-node-type="${
        escape(node.nodeType)}" data-node-id="${escape(node.nodeId)}">${nodeShape(node, box, visual)}<title>${
        escape(fullTitle)}</title>${badge}${statusMarker}${kindLabel}<text class="node-title" x="${
        box.x + box.width / 2}" y="${textY}" text-anchor="middle">${lines.map((line, index) =>
        `<tspan x="${box.x + box.width / 2}" dy="${index ? 18 : 0}">${escape(line)}</tspan>`).join("")}</text>${changeMarkup}</g>`; }).join("");
    const semanticMarkerStyles = `<style>.map-node-action>*:first-child,.map-node-process-step>*:first-child{fill:#fefefe;stroke:#52606d}.map-node-business-process>*:first-child{fill:#eaf3f8;stroke:#31566f}.map-node-document>*:first-child{fill:#eef8fd;stroke:#2878a5}.map-node-posted-document>*:first-child{fill:#eef8f0;stroke:#347447}.map-node-posting>*:first-child,.map-node-decision>*:first-child{fill:#fff4ce;stroke:#7a5b00}.map-node-system-action>*:first-child{fill:#f6f2ff;stroke:#66558f}.map-node-manual-action>*:first-child{fill:#fff8ef;stroke:#8a5a2b}.status-dot{stroke:#fff!important;stroke-width:2!important;filter:none!important}.semantic-observed .status-dot{fill:#15803d}.semantic-suggested .status-dot{fill:#a16207}.semantic-suggested>*:first-child{stroke-dasharray:6 4}.semantic-conditional .status-dot{fill:#7c3aed}.semantic-conditional>*:first-child{stroke-dasharray:6 4}.semantic-customerSpecific .status-dot{fill:#0369a1}.semantic-reference .status-dot{fill:#64717d}</style>`;
    const laneMarkup = semanticMarkerStyles + laneBands.map(lane => { const roleId = String(
      lane.laneId || "").replace(/^role:/u, ""); const colors = theme.rolePalette?.[roleId] ||
        theme.rolePalette?.default || [theme.palette.lane, theme.palette.brand];
      return `<g class="lane lane-${escape(roleId)}"><rect class="lane-panel" x="20" y="${lane.y}" width="${
      width - 40}" height="${Math.max(laneHeader, lane.bottom - lane.y)}" rx="12" style="fill:${
        escape(colors[0])};stroke:${escape(colors[1])}"/><path class="lane-accent" d="M 32 ${
        lane.y + laneHeader} H ${width - 32}" style="stroke:${escape(colors[1])}"/><text x="38" y="${lane.y + 26}">${
      escape(english ? `OWNER: ${lane.title}` : `ANSVAR: ${lane.title}`)}</text></g>`; }).join("");
    const title = options.title || model.title || "Process";
    const subtitle = options.subtitle || (english ? "Microsoft Dynamics 365 Business Central · Process map" : "Microsoft Dynamics 365 Business Central · Processkarta");
    const footer = options.footer || (english ? "Based on the recorded process in BC Process Studio" : "Baserad på den inspelade processen i BC Process Studio");
    return applyTheme(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">${escape(title)}</title><desc id="description">${escape(english ? "Exported process diagram" : "Exporterat processdiagram")}</desc><defs><filter id="card-shadow" x="-15%" y="-15%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#172b3a" flood-opacity=".14"/></filter><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#49657a"/></marker></defs><style>.background{fill:#fff}.top-accent{fill:#31566f}.subtitle,.footer{font:12px 'Segoe UI',Arial,sans-serif;fill:#3f5668}.lane-panel{fill:#f4f8fb;stroke:#c8d5df;stroke-width:1.5}.lane-accent{fill:none;stroke:#31566f;stroke-width:2}.lane text{font:700 12px 'Segoe UI',Arial,sans-serif;letter-spacing:.7px;fill:#213547}.map-node>*:first-child{fill:#fefefe;stroke:#52606d;stroke-width:2;filter:url(#card-shadow)}.map-node text{font:600 14px 'Segoe UI',Arial,sans-serif;fill:#172b3a}.map-node .node-kind{font:700 9px 'Segoe UI',Arial,sans-serif;letter-spacing:.8px;fill:#3f5668}.map-node .node-title{font-weight:650}.map-node .state{font:11px 'Segoe UI',Arial,sans-serif;fill:#3f5668}.map-node .step-badge{fill:#31566f;stroke:#fff;stroke-width:3;filter:none}.map-node .step-number{font:700 12px 'Segoe UI',Arial,sans-serif;fill:#fff}.map-node-business-process>*:first-child{fill:#eaf3f8;stroke:#31566f}.map-node-document>*:first-child{fill:#eef8fd;stroke:#2878a5}.map-node-posted-document>*:first-child{fill:#eef8f0;stroke:#347447}.map-node-posting>*:first-child,.map-node-decision>*:first-child{fill:#fff4ce;stroke:#7a5b00}.map-node-system-action>*:first-child{fill:#f6f2ff;stroke:#66558f;stroke-dasharray:6 4}.map-node-manual-action>*:first-child{fill:#fff8ef;stroke:#8a5a2b}.semantic-observed>*:first-child,.legend-status.semantic-observed{fill:#dff3e5;stroke:#15803d}.semantic-suggested>*:first-child,.legend-status.semantic-suggested{fill:#fff8e1;stroke:#a16207;stroke-dasharray:6 4}.semantic-conditional>*:first-child,.legend-status.semantic-conditional{fill:#f5f3ff;stroke:#7c3aed;stroke-dasharray:6 4}.semantic-customerSpecific>*:first-child,.legend-status.semantic-customerSpecific{fill:#e0f2fe;stroke:#0369a1}.semantic-reference>*:first-child,.legend-status.semantic-reference{fill:#eef1f4;stroke:#64717d}.edge{fill:none;stroke:#49657a;stroke-width:3;stroke-linejoin:round}.edge-alternate,.edge-loop,.edge-return{stroke:#8a6d1d;stroke-dasharray:7 5}.edge-conditional,.edge-branch{stroke:#765b00;stroke-width:3}.edge-creates{stroke:#2878a5;stroke-dasharray:2 5}.edge-posts{stroke:#347447;stroke-width:4}.route-label{font:12px 'Segoe UI',Arial,sans-serif;fill:#5f4b16;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}.diagram-legend>rect{fill:#f4f8fb;stroke:#c8d5df}.diagram-legend text{font:12px 'Segoe UI',Arial,sans-serif;fill:#172b3a}.diagram-legend .legend-title{font-weight:700}.legend-item>*:first-child{fill:#fefefe;stroke:#52606d;stroke-width:2}.legend-route{fill:none!important;stroke:#49657a!important}.legend-route-dashed{stroke-dasharray:7 5}.legend-route-dotted{stroke-dasharray:2 5}.legend-route-double{stroke-width:4!important}</style><rect class="background" width="100%" height="100%"/><rect class="top-accent" width="100%" height="10"/><text x="${margin}" y="49" style="font:700 25px 'Segoe UI',Arial,sans-serif;fill:#172b3a">${escape(title)}</text><text class="subtitle" x="${margin}" y="74">${escape(subtitle)}</text>${laneMarkup}<g class="edges">${edges}</g><g class="nodes">${nodeMarkup}</g>${legend.markup}<text class="footer" x="${margin}" y="${height - 9}">${escape(footer)}</text></svg>\n`, theme);
  }
  return { applyTheme, edgePath, legendFor, rowsFor, svg };
});
