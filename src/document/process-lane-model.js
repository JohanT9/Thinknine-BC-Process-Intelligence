(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessLaneModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.0.0";
  const freeze = value => { if (!value || typeof value !== "object" || Object.isFrozen(value))
    return value; Object.values(value).forEach(freeze); return Object.freeze(value); };
  const ordered = model => (model?.nodes || []).filter(node =>
    !["start", "end", "subprocess"].includes(node.nodeType)
  ).map((node, index) => ({ node, index })).sort((left, right) =>
    ((left.node.processOrder ?? left.node.sequence ?? left.index) -
      (right.node.processOrder ?? right.node.sequence ?? right.index)) ||
    left.index - right.index).map(item => item.node);

  function create(model = {}, options = {}) {
    const nodes = ordered(model);
    const phases = (model.subprocesses || []).filter(container =>
      container.metadata?.containerType === "phase" && (container.nodeIds || []).length
    );
    const phaseByNode = new Map();
    const hasRoles = nodes.some(node => node.metadata?.processRole);
    phases.forEach(phase => (phase.nodeIds || []).forEach(nodeId => {
      if (!phaseByNode.has(nodeId)) phaseByNode.set(nodeId, phase);
    }));
    const assignments = {};
    const lanes = new Map();
    const unassignedTitle = options.unassignedTitle || "Other steps";
    nodes.forEach(node => {
      const phase = phaseByNode.get(node.nodeId);
      const role = node.metadata?.processRole;
      const roleId = typeof role === "object" ? role.id || role.name : role;
      const roleTitle = typeof role === "object" ? role.name || role.id : role;
      const laneId = phase?.subprocessId || (roleId ? `role:${roleId}` :
        (phases.length || hasRoles ? "lane:unassigned" : "lane:implicit"));
      const title = phase?.title || options.roleNames?.[roleId] || roleTitle ||
        (phases.length || hasRoles ? unassignedTitle : "");
      const source = phase ? "phase" : roleId ? "processRole" : "implicit";
      if (!lanes.has(laneId)) lanes.set(laneId, { laneId, title: String(title || ""),
        source, nodeIds: [] });
      lanes.get(laneId).nodeIds.push(node.nodeId);
      assignments[node.nodeId] = laneId;
    });
    const orderedLanes = [...lanes.values()].sort((left, right) =>
      nodes.findIndex(node => left.nodeIds.includes(node.nodeId)) -
      nodes.findIndex(node => right.nodeIds.includes(node.nodeId)));
    const segments = [];
    let current = null;
    nodes.forEach(node => {
      const laneId = assignments[node.nodeId];
      if (!current || current.laneId !== laneId) {
        current = { laneId, nodeIds: [] };
        segments.push(current);
      }
      current.nodeIds.push(node.nodeId);
    });
    return freeze({ version: VERSION, visible: orderedLanes.some(lane =>
      lane.source !== "implicit"), lanes: orderedLanes, assignments,
    segments: segments.map(segment => ({ ...segment })) });
  }

  return { VERSION, create };
});
