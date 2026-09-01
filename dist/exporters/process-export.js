(function (root, factory) {
  const processModel = typeof module === "object" && module.exports
    ? require("../document/process-model") : root.T9ProcessModel;
  const api = factory(processModel);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (processModel) {
  const EXPORT_VERSION = "1.0.0";

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
    })[character]);
  }

  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = canonical(value[key]);
      return result;
    }, {});
  }

  function validate(model) {
    const result = processModel.validate(model);
    if (!result.valid) {
      const error = new Error("The Process Model is invalid and cannot be exported.");
      error.code = "INVALID_PROCESS_MODEL";
      error.diagnostics = result.diagnostics;
      throw error;
    }
    return model;
  }

  function json(model, options = {}) {
    validate(model);
    return JSON.stringify(canonical({
      exportVersion: EXPORT_VERSION,
      format: "thinknine-process-model",
      language: options.language || null,
      title: options.title || model.title || "Process",
      processModel: model
    }), null, 2) + "\n";
  }

  function wrapLines(value, width = 24, limit = 3) {
    const words = String(value || "").trim().split(/\s+/u).filter(Boolean);
    const lines = [];
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      const current = lines.at(-1);
      if (!current) {
        lines.push(word.slice(0, width));
      } else if (current.length + word.length + 1 <= width) {
        lines[lines.length - 1] = `${current} ${word}`;
      } else if (lines.length < limit) {
        lines.push(word.slice(0, width));
      } else {
        lines[limit - 1] = `${lines[limit - 1].slice(0, width - 1)}…`;
        break;
      }
      if (word.length > width || (index === words.length - 1 &&
          lines.join(" ").length < words.join(" ").length)) {
        lines[lines.length - 1] = `${lines.at(-1).slice(0, width - 1)}…`;
      }
    }
    return lines;
  }

  function stateValue(value, english) {
    if (value?.value !== undefined && value?.value !== null) return String(value.value);
    if (typeof value?.checked === "boolean") return value.checked
      ? (english ? "On" : "På") : (english ? "Off" : "Av");
    if (typeof value?.visible === "boolean") return value.visible
      ? (english ? "Visible" : "Synlig") : (english ? "Closed" : "Stängd");
    return String(value?.outcome || value?.page?.caption || "");
  }

  function svg(model, options = {}) {
    validate(model);
    const english = String(options.language || "").toLowerCase().startsWith("en");
    const nodes = [...(model.nodes || [])].sort((left, right) =>
      (left.processOrder ?? left.sequence ?? 0) -
      (right.processOrder ?? right.sequence ?? 0) ||
      left.nodeId.localeCompare(right.nodeId));
    const nodeIndex = new Map(nodes.map((node, index) => [node.nodeId, index]));
    const nodeWidth = 180;
    const gap = 80;
    const margin = 60;
    const centerY = 155;
    const width = Math.max(520, margin * 2 + nodes.length * nodeWidth +
      Math.max(0, nodes.length - 1) * gap);
    const height = 360;
    const position = node => ({
      x: margin + nodeIndex.get(node.nodeId) * (nodeWidth + gap), y: centerY
    });
    const stateByNode = new Map();
    (model.stateTransitions || []).forEach(change => {
      const values = stateByNode.get(change.activityNodeId) || [];
      values.push(change);
      stateByNode.set(change.activityNodeId, values);
    });
    const nodeById = new Map(nodes.map(node => [node.nodeId, node]));
    const transitions = (model.transitions || []).filter(transition =>
      nodeById.has(transition.fromNodeId) && nodeById.has(transition.toNodeId));
    const edges = transitions.map((transition, index) => {
      const from = position(nodeById.get(transition.fromNodeId));
      const to = position(nodeById.get(transition.toNodeId));
      const startX = from.x + nodeWidth;
      const endX = to.x;
      const alternate = transition.transitionType !== "sequence";
      const offset = alternate ? (index % 2 ? 70 : -70) : 0;
      const path = offset
        ? `M ${startX} ${centerY} C ${startX + 35} ${centerY + offset}, ${endX - 35} ${centerY + offset}, ${endX} ${centerY}`
        : `M ${startX} ${centerY} L ${endX} ${centerY}`;
      const label = transition.label || (typeof transition.condition === "string"
        ? transition.condition : "");
      return `<path d="${path}" class="transition ${escape(transition.transitionType)}" marker-end="url(#arrow)"/>` +
        (label ? `<text x="${(startX + endX) / 2}" y="${centerY + offset - 9}" class="route-label" text-anchor="middle">${escape(label)}</text>` : "");
    }).join("");
    const nodeMarkup = nodes.map(node => {
      const { x, y } = position(node);
      const changes = stateByNode.get(node.nodeId) || [];
      const lines = wrapLines(node.title || node.nodeType);
      const text = lines.map((line, index) =>
        `<tspan x="${x + nodeWidth / 2}" dy="${index ? 17 : 0}">${escape(line)}</tspan>`
      ).join("");
      const shape = node.nodeType === "decision"
        ? `<polygon points="${x + nodeWidth / 2},${y - 58} ${x + nodeWidth},${y} ${x + nodeWidth / 2},${y + 58} ${x},${y}" class="node decision"/>`
        : node.nodeType === "start" || node.nodeType === "end"
          ? `<rect x="${x + 20}" y="${y - 35}" width="${nodeWidth - 40}" height="70" rx="35" class="node boundary"/>`
          : `<rect x="${x}" y="${y - 48}" width="${nodeWidth}" height="96" rx="10" class="node ${escape(node.nodeType)}"/>`;
      const changesMarkup = changes.slice(0, 2).map((change, index) => {
        const label = change.before?.control?.caption ||
          change.after?.control?.caption || change.factKey;
        return `<text x="${x + nodeWidth / 2}" y="${y + 75 + index * 16}" class="state" text-anchor="middle">${escape(label)}: ${escape(stateValue(change.before, english))} → ${escape(stateValue(change.after, english))}</text>`;
      }).join("");
      return `<g data-node-type="${escape(node.nodeType)}" data-node-id="${escape(node.nodeId)}">${shape}<text x="${x + nodeWidth / 2}" y="${y - (lines.length - 1) * 8}" class="node-title" text-anchor="middle">${text}</text>${changesMarkup}</g>`;
    }).join("");
    const title = options.title || model.title || (english ? "Process" : "Process");
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">${escape(title)}</title>
  <desc id="description">${escape(english ? "Exported process diagram" : "Exporterat processdiagram")}</desc>
  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#49657a"/></marker></defs>
  <style>.background{fill:#fff}.node{fill:#f7fbfc;stroke:#008c95;stroke-width:2}.decision{fill:#fff8dc;stroke:#b7791f}.boundary{fill:#e6f5f5}.information{fill:#eef4ff}.node-title{font:600 14px Arial,sans-serif;fill:#172b3a}.transition{fill:none;stroke:#49657a;stroke-width:2}.conditional,.alternate{stroke:#b7791f}.route-label{font:12px Arial,sans-serif;fill:#6b4f16}.state{font:11px Arial,sans-serif;fill:#3f5668}</style>
  <rect class="background" width="100%" height="100%"/>
  <text x="${margin}" y="38" style="font:700 20px Arial,sans-serif;fill:#172b3a">${escape(title)}</text>
  <g class="transitions">${edges}</g>
  <g class="nodes">${nodeMarkup}</g>
</svg>\n`;
  }

  function fileBase(value) {
    return String(value || "process").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ").replace(/[. ]+$/g, "") || "process";
  }

  function create(model, options = {}) {
    const base = fileBase(options.title || model.title || "process");
    return Object.freeze({
      json: Object.freeze({ filename: `${base} - process.json`,
        mimeType: "application/json;charset=utf-8", content: json(model, options) }),
      diagram: Object.freeze({ filename: `${base} - processdiagram.svg`,
        mimeType: "image/svg+xml;charset=utf-8", content: svg(model, options) })
    });
  }

  return { EXPORT_VERSION, create, fileBase, json, svg };
});
