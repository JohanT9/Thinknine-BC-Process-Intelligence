(function (root, factory) {
  const processGraph = typeof module === "object" && module.exports
    ? require("./process-graph") : root.T9ProcessGraph;
  const analysisView = typeof module === "object" && module.exports
    ? require("../ui/process-analysis-view") : root.T9ProcessAnalysisView;
  const api = factory(processGraph, analysisView);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SemanticProcessMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (processGraph, analysisView) {
  "use strict";
  const LEVELS = Object.freeze(["business", "businessCentral", "procedure"]);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const array = value => Array.isArray(value) ? value : [];
  const text = value => value == null ? "" : String(value).trim();
  const key = value => text(value).toLocaleLowerCase().replace(/[^a-z0-9åäö]+/gu, " ").trim();
  const display = value => { const raw = text(value); if (!raw.includes(":")) return raw;
    return raw.split(":").at(-1).split("-").map(word => word ?
      word[0].toUpperCase() + word.slice(1) : "").join(" "); };
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value); }
  function stepKey(step) { return key(step?.title || step?.name || step?.id); }
  function processRoleFor(value = {}) { const identity = key([value.id, value.title,
    value.name, value.nodeType, ...array(value.taxonomyEntityIds)].filter(Boolean).join(" "));
    if (/warehouse|receipt|shipment|pick|put away|movement|lager|plock|inleverans|utleverans/.test(identity))
      return { id: "warehouse", name: "Warehouse" };
    if (/invoice|payment|ledger|finance|faktur|betal|redovis/.test(identity))
      return { id: "finance", name: "Finance" };
    if (/purchase|vendor|source to pay|inköp|leverantör/.test(identity))
      return { id: "purchasing", name: "Purchasing" };
    if (/sales|customer|order to cash|försälj|kund/.test(identity))
      return { id: "sales", name: "Sales" };
    if (/production|assembly|planning|consume|output|produktion|monter|planer/.test(identity))
      return { id: "production", name: "Production" };
    if (/system/.test(identity)) return { id: "system", name: "System" };
    return null; }
  function semanticStatus(node, model) { const candidates = new Set([
    key(node.title), ...array(node.taxonomyEntityIds).map(key)
  ]); const includes = values => array(values).some(item => candidates.has(stepKey(item)) ||
    array(node.taxonomyEntityIds).some(id => key(id) === key(item.id)));
    if (includes(model.matched)) return "observed";
    if (includes(model.missing)) return "suggested";
    return "reference"; }
  function matchingObservedNode(node, observedGraph) { const identities = new Set([
    key(node.title), ...array(node.taxonomyEntityIds).map(key)
  ]); return array(observedGraph?.nodes).find(candidate => identities.has(key(candidate.title)) ||
    array(candidate.taxonomyEntityIds).some(id => identities.has(key(id)))); }
  function matchesItems(node, items) { const identities = new Set([
    key(node.title), ...array(node.taxonomyEntityIds).map(key)
  ]); return array(items).some(item => identities.has(stepKey(item)) ||
    array(node.taxonomyEntityIds).some(id => key(id) === key(item.id))); }
  function taskIdsForEvents(eventIds, reviewTasks) { const events = new Set(array(eventIds));
    return array(reviewTasks).filter(task => array(task.sourceEventIds).some(id => events.has(id)))
      .map(task => task.taskId); }
  function transition(fromNodeId, toNodeId, index, type = "sequence") { return freeze({
    transitionId: `semantic-map-transition:${index}:${fromNodeId}:${toNodeId}`,
    fromNodeId, toNodeId, transitionType: type }); }
  function inheritProcessRoles(values) { let activeRole = null;
    const forward = values.map(value => { const explicit = value.metadata?.processRole || null;
      if (explicit) activeRole = explicit; return { ...value, metadata: { ...(value.metadata || {}),
        ...(explicit || !activeRole ? {} : { processRole: clone(activeRole) }) } }; });
    let followingRole = null; for (let index = forward.length - 1; index >= 0; index -= 1) {
      const role = forward[index].metadata?.processRole || null; if (role) followingRole = role;
      else if (followingRole) forward[index] = { ...forward[index], metadata: {
        ...(forward[index].metadata || {}), processRole: clone(followingRole) } }; }
    return forward;
  }
  function processModel(recordingId, title, values) { const nodes = inheritProcessRoles(values)
    .map((value, index) => freeze({
    nodeId: value.nodeId || processGraph.stableId("semantic-map-node",
      [recordingId, title, value.title, index]), nodeType: value.nodeType || "activity",
    title: text(value.title), processOrder: index, sourceStepIds: array(value.sourceStepIds),
    sourceEventIds: array(value.sourceEventIds), metadata: clone(value.metadata || {}) }));
    return freeze({ modelVersion: "semantic-reference-1.0.0", recordingId, title,
      nodes, transitions: nodes.slice(1).map((node, index) => transition(nodes[index].nodeId,
        node.nodeId, index + 1, node.metadata.relationshipType || "sequence")),
      subprocesses: [], stateTransitions: [], startNodeIds: nodes[0] ? [nodes[0].nodeId] : [],
      endNodeIds: nodes.at(-1) ? [nodes.at(-1).nodeId] : [], metadata: {
        semanticReferenceProjection: true } }); }
  function business(input, model) { const best = input.analysis?.bestMatch || {};
    const titles = [display(model.domain), display(best.businessProcess), model.name].filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index);
    return processModel(input.recordingId, input.title, titles.map((title, index) => ({ title,
      metadata: { semanticStatus: index === titles.length - 1 ? "observed" : "reference",
        semanticLevel: index === 0 ? "domain" : index === titles.length - 1 ? "process" : "businessProcess" } })));
  }
  function graphFor(input, model) { const confirmedId = input.decision?.confirmedReferenceId;
    return input.analysis?.referenceGraphs?.[confirmedId] || input.analysis?.bestReferenceGraph || null; }
  function fromReferenceGraph(input, model, graph) { const referenceNodes = array(graph.nodes)
    .filter(node => !["start", "end"].includes(node.nodeType) &&
      !matchesItems(node, model.conditional)).map(node => {
      const observed = matchingObservedNode(node, input.analysis?.observedGraph);
      return { nodeId: `semantic:${node.nodeId}`, title: node.title, sourceEventIds:
        array(observed?.sourceEventIds), sourceStepIds: taskIdsForEvents(observed?.sourceEventIds,
        input.reviewTasks), metadata: { semanticStatus: semanticStatus(node, model),
          processRole: processRoleFor(node),
          semanticLevel: "businessCentral", originalNodeType: node.nodeType } };
    });
    const existing = new Set(referenceNodes.map(node => key(node.title)));
    array(model.additional).forEach((item, index) => { const title = text(item.title || item.name || item.id);
      if (!title || existing.has(key(title))) return; const observed = array(input.analysis?.observedGraph?.nodes)
        .find(node => key(node.title) === key(title)); referenceNodes.push({
        nodeId: `semantic:additional:${index}:${key(title)}`, title,
        sourceEventIds: array(observed?.sourceEventIds), sourceStepIds:
          taskIdsForEvents(observed?.sourceEventIds, input.reviewTasks), metadata: {
            semanticStatus: "customerSpecific", semanticLevel: "businessCentral",
            originalNodeType: observed?.nodeType || item.type || "processStep" } }); });
    return processModel(input.recordingId, input.title, referenceNodes);
  }
  function fromComparison(input, model) { const missing = array(model.missing)
    .filter(item => !["conditional", "optional"].includes(item.applicability)); const values = [
    ...model.matched.map(item => ({ title: text(item.title || item.name || item.id),
      metadata: { semanticStatus: "observed", semanticLevel: "businessCentral",
        processRole: processRoleFor(item),
        originalNodeType: item.nodeType || (item.type === "document" ? "document" : "processStep") } })),
    ...missing.map(item => ({ title: text(item.title || item.name || item.id),
      metadata: { semanticStatus: "suggested", semanticLevel: "businessCentral",
        processRole: processRoleFor(item),
        applicability: item.applicability || "expected", variantIds: array(item.variantIds),
        originalNodeType: item.nodeType || (item.type === "document" ? "document" : "processStep") } })),
    ...model.additional.map(item => ({ title: text(item.title || item.name || item.id),
      metadata: { semanticStatus: "customerSpecific", semanticLevel: "businessCentral",
        processRole: processRoleFor(item) } }))
  ].filter(item => item.title); return processModel(input.recordingId, input.title, values); }
  function observedOnly(model) { const values = array(model.nodes).filter(node =>
    ["observed", "customerSpecific"].includes(node.metadata?.semanticStatus));
    return processModel(model.recordingId, model.title, values); }
  function project(input = {}, level = "businessCentral", options = {}) { if (!LEVELS.includes(level))
    throw new Error(`Unsupported semantic process-map level: ${level}`);
    if (level === "procedure") return input.procedureModel || processModel(input.recordingId,
      input.title, []); const model = analysisView.normalize(input.analysis || {}, input.decision);
    if (!model.available) return processModel(input.recordingId, input.title, []);
    if (level === "business") return business(input, model); const reference = graphFor(input, model);
    const projected = reference ? fromReferenceGraph(input, model, reference) :
      fromComparison(input, model);
    return options.includeReferences === true ? projected : observedOnly(projected); }
  return { LEVELS, inheritProcessRoles, project, semanticStatus };
});
