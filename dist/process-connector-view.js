(function (root, factory) {
  const routeGrammar = typeof module === "object" && module.exports
    ? require("../document/process-route-grammar") : root.T9ProcessRouteGrammar;
  const api = factory(routeGrammar);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessConnectorView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (routeGrammar) {
  "use strict";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const round = value => Math.round(Number(value) * 10) / 10;
  function hash(value) { let result = 2166136261; for (const character of String(value)) {
    result ^= character.charCodeAt(0); result = Math.imul(result, 16777619); }
  return (result >>> 0).toString(36); }

  function connectorPath(from, to) {
    const sameBand = Math.abs((from.top + from.height / 2) -
      (to.top + to.height / 2)) < Math.max(from.height, to.height) / 2;
    if (sameBand && to.left >= from.left + from.width) {
      const startX = round(from.left + from.width);
      const startY = round(from.top + from.height / 2);
      return { route: "horizontal", path: `M ${startX} ${startY} H ${round(to.left)}` };
    }
    if (to.top >= from.top + from.height) {
      const startX = round(from.left + from.width / 2);
      const startY = round(from.top + from.height);
      const endX = round(to.left + to.width / 2);
      const middleY = round(startY + Math.max(14, (to.top - startY) / 2));
      return { route: "orthogonal", path: `M ${startX} ${startY} V ${middleY} H ${endX} V ${round(to.top)}` };
    }
    const startX = round(from.left + from.width / 2);
    const startY = round(from.top);
    const endX = round(to.left + to.width / 2);
    const endY = round(to.top);
    const lift = round(Math.max(20, Math.abs(startX - endX) / 5));
      return { route: "return", path: `M ${startX} ${startY} V ${round(startY - lift)} H ${endX} V ${endY}` };
  }

  function labelPosition(from, to, geometry) {
    if (geometry.route === "horizontal") return {
      x: round((from.left + from.width + to.left) / 2),
      y: round(from.top + from.height / 2 - 8)
    };
    if (geometry.route === "orthogonal") return {
      x: round((from.left + from.width / 2 + to.left + to.width / 2) / 2),
      y: round(from.top + from.height + Math.max(14,
        (to.top - from.top - from.height) / 2) - 7)
    };
    return { x: round((from.left + from.width / 2 + to.left + to.width / 2) / 2),
      y: round(Math.min(from.top, to.top) - 9) };
  }

  function buildLayer(model, bounds, size, locale = "sv-SE") {
    const edges = model?.transitions || model?.relationships || [];
    const markerId = `process-arrow-${hash(`${model?.recordingId || "process"}:${
      (model?.nodes || []).map(node => node.nodeId).join("|")}`)}`;
    const paths = edges.map(edge => {
      const fromId = edge.fromNodeId || edge.sourceNodeId;
      const toId = edge.toNodeId || edge.targetNodeId;
      const from = bounds[fromId];
      const to = bounds[toId];
      if (!from || !to || fromId === toId) return "";
      const geometry = connectorPath(from, to);
      const visual = routeGrammar.presentationFor(edge, locale);
      const label = edge.label || edge.condition ||
        (visual.kind === "sequence" ? "" : visual.label);
      const position = label ? labelPosition(from, to, geometry) : null;
      return `<path d="${geometry.path}" class="process-connector process-connector-${
        escape(visual.kind)}" data-process-route="${geometry.route}" data-process-line="${
        escape(visual.line)}" marker-end="url(#${markerId})"/>${position ? `<text x="${
          position.x}" y="${position.y}" class="process-connector-label process-connector-label-${
          escape(visual.kind)}" text-anchor="middle">${escape(label)}</text>` : ""}`;
    }).filter(Boolean);
    if (!paths.length) return { count: 0, markup: "" };
    return { count: paths.length, markup: `<svg class="process-connector-layer" width="${
      Math.max(1, Math.ceil(size.width))}" height="${Math.max(1, Math.ceil(size.height))}"
      viewBox="0 0 ${Math.max(1, Math.ceil(size.width))} ${Math.max(1, Math.ceil(size.height))}"
      aria-hidden="true" focusable="false"><defs><marker id="${markerId}" viewBox="0 0 10 10"
      refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" class="process-connector-marker"/></marker></defs>${
      paths.join("")}</svg>` };
  }

  function render(container, model, options = {}) {
    const viewport = container?.querySelector?.(".process-diagram-scroll");
    if (!viewport?.getBoundingClientRect || !viewport.insertAdjacentHTML) return 0;
    viewport.querySelector?.(".process-connector-layer")?.remove?.();
    const origin = viewport.getBoundingClientRect();
    const bounds = {};
    [...(viewport.querySelectorAll?.("[data-process-node-id]") || [])].forEach(element => {
      const rect = element.getBoundingClientRect();
      bounds[element.dataset.processNodeId] = { left: rect.left - origin.left + viewport.scrollLeft,
        top: rect.top - origin.top + viewport.scrollTop, width: rect.width, height: rect.height };
    });
    const layer = buildLayer(model, bounds, { width: viewport.scrollWidth || origin.width,
      height: viewport.scrollHeight || origin.height }, options.locale);
    if (!layer.count) return 0;
    viewport.insertAdjacentHTML("afterbegin", layer.markup);
    viewport.classList?.add("process-connectors-active");
    return layer.count;
  }

  return { buildLayer, connectorPath, labelPosition, render };
});
