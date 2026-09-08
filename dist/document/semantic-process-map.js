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
  function semanticNodeType(item = {}) {
    if (item.nodeType) return item.nodeType;
    const identity = key([item.id, item.title, item.name].filter(Boolean).join(" "));
    if (item.type === "document") return /document posted|posted document|bokförd/.test(identity)
      ? "postedDocument" : "document";
    if (item.type === "action" && /(^| )post( |$)|bokför/.test(identity)) return "posting";
    return "processStep";
  }
  function processRoleFor(value = {}) { const identity = key([value.id, value.title,
    value.name, value.nodeType, ...array(value.taxonomyEntityIds)].filter(Boolean).join(" "));
    if (/warehouse movement|warehouse|receipt|shipment|pick|put away|lagerförflytt|distributionslager|plock|inleverans|utleverans/.test(identity))
      return { id: "warehouse", name: "Warehouse" };
    if (/invoice|payment|ledger|finance|faktur|betal|redovis/.test(identity))
      return { id: "finance", name: "Finance" };
    if (/purchase|vendor|source to pay|inköp|leverantör/.test(identity))
      return { id: "purchasing", name: "Purchasing" };
    if (/sales|customer|order to cash|försälj|kund/.test(identity))
      return { id: "sales", name: "Sales" };
    if (/inventory|item journal|item tracking|reclass|physical count|physical inventory|artikeljournal|artikelspår|omklassific|inventering|lagerflytt/.test(identity))
      return { id: "inventory", name: "Inventory" };
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
  function transition(fromNodeId, toNodeId, index, type = "sequence", metadata = {},
    details = {}) { return freeze({
    transitionId: details.transitionId || `semantic-map-transition:${index}:${fromNodeId}:${toNodeId}`,
    fromNodeId, toNodeId, transitionType: type, label: text(details.label),
    condition: details.condition ?? null, sourceEventIds: array(details.sourceEventIds), metadata }); }
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
  function inferredRelationship(previous, node) {
    const previousType = previous?.nodeType || "activity";
    const nextType = node?.nodeType || "activity";
    if (nextType === "postedDocument" ||
        (previousType === "posting" && nextType === "document")) {
      return "documentPosting";
    }
    if ((previousType === "document" && nextType === "document") ||
        (/\b(create|skapa)\b/iu.test(text(previous?.title)) &&
          ["document", "postedDocument"].includes(nextType))) {
      return "documentCreation";
    }
    return node?.metadata?.relationshipType || "sequence";
  }
  function processModel(recordingId, title, values, relationships = []) { const nodes = inheritProcessRoles(values)
    .map((value, index) => freeze({
    nodeId: value.nodeId || processGraph.stableId("semantic-map-node",
      [recordingId, title, value.title, index]), nodeType: value.nodeType || "activity",
    title: text(value.title), processOrder: index, sourceStepIds: array(value.sourceStepIds),
    sourceEventIds: array(value.sourceEventIds), metadata: clone(value.metadata || {}) }));
    const nodeById = new Map(nodes.map(node => [node.nodeId, node]));
    const explicit = array(relationships).filter(item => nodeById.has(item.fromNodeId) &&
      nodeById.has(item.toNodeId));
    const connected = new Set(explicit.flatMap(item => [item.fromNodeId, item.toNodeId]));
    const routes = explicit.length ? [...explicit] : nodes.slice(1).map((node, index) => ({
      fromNodeId: nodes[index].nodeId, toNodeId: node.nodeId,
      transitionType: inferredRelationship(nodes[index], node)
    }));
    if (explicit.length) nodes.forEach((node, index) => { if (connected.has(node.nodeId) || !index) return;
      routes.push({ fromNodeId: nodes[index - 1].nodeId, toNodeId: node.nodeId,
        transitionType: node.metadata.relationshipType || "sequence" }); });
    const transitions = routes.map((route, index) => { const previous = nodeById.get(route.fromNodeId);
        const node = nodeById.get(route.toNodeId); const fromRole = previous.metadata?.processRole;
        const toRole = node.metadata?.processRole;
        const handoff = fromRole?.id && toRole?.id && fromRole.id !== toRole.id ? {
          responsibilityHandoff: { from: clone(fromRole), to: clone(toRole) } } : {};
        return transition(previous.nodeId, node.nodeId, index + 1,
          route.transitionType || route.relationshipType || "sequence",
          { ...(route.metadata || {}), ...handoff }, route); });
    const incoming = new Set(transitions.map(item => item.toNodeId));
    const outgoing = new Set(transitions.map(item => item.fromNodeId));
    return freeze({ modelVersion: "semantic-reference-1.2.0", recordingId, title,
      nodes, transitions, subprocesses: [], stateTransitions: [],
      startNodeIds: nodes.filter(node => !incoming.has(node.nodeId)).map(node => node.nodeId),
      endNodeIds: nodes.filter(node => !outgoing.has(node.nodeId)).map(node => node.nodeId), metadata: {
        semanticReferenceProjection: true } }); }
  function business(input, model) { const best = input.analysis?.bestMatch || {};
    const titles = [display(model.domain), display(best.businessProcess), model.name].filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index);
    return processModel(input.recordingId, input.title, titles.map((title, index) => ({ title,
      nodeType: "businessProcess",
      metadata: { semanticStatus: index === titles.length - 1 ? "observed" : "reference",
        semanticLevel: index === 0 ? "domain" : index === titles.length - 1 ? "process" : "businessProcess" } })));
  }
  function graphFor(input, model) { const confirmedId = input.decision?.confirmedReferenceId;
    return input.analysis?.referenceGraphs?.[confirmedId] || input.analysis?.bestReferenceGraph || null; }
  function fromReferenceGraph(input, model, graph) { const incomingByNode = new Map(array(
    graph.relationships).map(relationship => [relationship.toNodeId || relationship.targetNodeId,
      relationship])); const referenceNodes = array(graph.nodes)
    .filter(node => !["start", "end"].includes(node.nodeType) &&
      !matchesItems(node, model.conditional)).map(node => {
      const observed = matchingObservedNode(node, input.analysis?.observedGraph);
      return { nodeId: `semantic:${node.nodeId}`, nodeType: semanticNodeType(node),
        title: node.title, sourceEventIds:
        array(observed?.sourceEventIds), sourceStepIds: taskIdsForEvents(observed?.sourceEventIds,
        input.reviewTasks), metadata: { semanticStatus: semanticStatus(node, model),
          processRole: processRoleFor(node),
          semanticLevel: "businessCentral", originalNodeType: node.nodeType,
          relationshipType: incomingByNode.get(node.nodeId)?.relationshipType ||
            incomingByNode.get(node.nodeId)?.transitionType || "sequence" } };
    });
    const existing = new Set(referenceNodes.map(node => key(node.title)));
    array(model.additional).forEach((item, index) => { const title = text(item.title || item.name || item.id);
      if (!title || existing.has(key(title))) return; const observed = array(input.analysis?.observedGraph?.nodes)
        .find(node => key(node.title) === key(title)); referenceNodes.push({
        nodeId: `semantic:additional:${index}:${key(title)}`,
        nodeType: semanticNodeType(observed || item), title,
        sourceEventIds: array(observed?.sourceEventIds), sourceStepIds:
          taskIdsForEvents(observed?.sourceEventIds, input.reviewTasks), metadata: {
            semanticStatus: "customerSpecific", semanticLevel: "businessCentral",
            originalNodeType: observed?.nodeType || item.type || "processStep" } }); });
    const relationships = array(graph.relationships).map(item => ({ ...clone(item),
      fromNodeId: `semantic:${item.fromNodeId || item.sourceNodeId}`,
      toNodeId: `semantic:${item.toNodeId || item.targetNodeId}`,
      transitionType: item.transitionType || item.relationshipType || "sequence" }));
    return processModel(input.recordingId, input.title, referenceNodes, relationships);
  }
  function fromComparison(input, model) { const missing = array(model.missing)
    .filter(item => !["conditional", "optional"].includes(item.applicability)); const values = [
    ...model.matched.map(item => ({ title: text(item.title || item.name || item.id),
      nodeType: semanticNodeType(item),
      metadata: { semanticStatus: "observed", semanticLevel: "businessCentral",
        processRole: processRoleFor(item),
        originalNodeType: semanticNodeType(item) } })),
    ...missing.map(item => ({ title: text(item.title || item.name || item.id),
      nodeType: semanticNodeType(item),
      metadata: { semanticStatus: "suggested", semanticLevel: "businessCentral",
        processRole: processRoleFor(item),
        applicability: item.applicability || "expected", variantIds: array(item.variantIds),
        originalNodeType: semanticNodeType(item) } })),
    ...model.additional.map(item => ({ title: text(item.title || item.name || item.id),
      nodeType: semanticNodeType(item),
      metadata: { semanticStatus: "customerSpecific", semanticLevel: "businessCentral",
        processRole: processRoleFor(item) } }))
  ].filter(item => item.title); return processModel(input.recordingId, input.title, values); }
  function observedOnly(model) { const values = array(model.nodes).filter(node =>
    ["observed", "customerSpecific"].includes(node.metadata?.semanticStatus));
    return processModel(model.recordingId, model.title, values, model.transitions); }
  function withBoundaries(model, locale) { if (!model.nodes.length) return model;
    const english = String(locale || "").toLowerCase().startsWith("en");
    const boundary = (position, nodeType, title) => ({ nodeId: processGraph.stableId(
      "semantic-map-boundary", [model.recordingId, model.title, position]), nodeType, title,
      sourceStepIds: [], sourceEventIds: [], metadata: { structuralBoundary: true,
        semanticLevel: "businessCentral" } });
    const start = boundary("start", "start", "Start");
    const end = boundary("end", "end", english ? "End" : "Slut");
    const relationships = [...model.transitions,
      ...model.startNodeIds.map(nodeId => ({ fromNodeId: start.nodeId, toNodeId: nodeId,
        transitionType: "sequence" })),
      ...model.endNodeIds.map(nodeId => ({ fromNodeId: nodeId, toNodeId: end.nodeId,
        transitionType: "sequence" }))];
    return processModel(model.recordingId, model.title, [start, ...model.nodes, end], relationships);
  }
  function project(input = {}, level = "businessCentral", options = {}) { if (!LEVELS.includes(level))
    throw new Error(`Unsupported semantic process-map level: ${level}`);
    if (level === "procedure") return input.procedureModel || processModel(input.recordingId,
      input.title, []); const model = analysisView.normalize(input.analysis || {}, input.decision);
    if (!model.available) return processModel(input.recordingId, input.title, []);
    if (level === "business") return business(input, model); const reference = graphFor(input, model);
    const projected = reference ? fromReferenceGraph(input, model, reference) :
      fromComparison(input, model);
    const visible = options.includeReferences === true ? projected : observedOnly(projected);
    return options.includeBoundaries === true ? withBoundaries(visible, options.locale) : visible; }
  return { LEVELS, inferredRelationship, inheritProcessRoles, project,
    semanticNodeType, semanticStatus, withBoundaries };
});
