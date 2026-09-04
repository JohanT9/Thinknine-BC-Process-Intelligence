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
  function taskIdsForEvents(eventIds, reviewTasks) { const events = new Set(array(eventIds));
    return array(reviewTasks).filter(task => array(task.sourceEventIds).some(id => events.has(id)))
      .map(task => task.taskId); }
  function transition(fromNodeId, toNodeId, index, type = "sequence") { return freeze({
    transitionId: `semantic-map-transition:${index}:${fromNodeId}:${toNodeId}`,
    fromNodeId, toNodeId, transitionType: type }); }
  function processModel(recordingId, title, values) { const nodes = values.map((value, index) => freeze({
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
    .filter(node => !["start", "end"].includes(node.nodeType)).map(node => {
      const observed = matchingObservedNode(node, input.analysis?.observedGraph);
      return { nodeId: `semantic:${node.nodeId}`, title: node.title, sourceEventIds:
        array(observed?.sourceEventIds), sourceStepIds: taskIdsForEvents(observed?.sourceEventIds,
        input.reviewTasks), metadata: { semanticStatus: semanticStatus(node, model),
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
  function fromComparison(input, model) { const selectedVariantId = text(
    input.decision?.confirmedVariantId); const missing = model.missing.filter(item =>
      !selectedVariantId || !array(item.variantIds).length ||
      array(item.variantIds).includes(selectedVariantId)); const values = [
    ...model.matched.map(item => ({ title: text(item.title || item.name || item.id),
      metadata: { semanticStatus: "observed", semanticLevel: "businessCentral",
        originalNodeType: item.nodeType || (item.type === "document" ? "document" : "processStep") } })),
    ...missing.map(item => ({ title: text(item.title || item.name || item.id),
      metadata: { semanticStatus: !selectedVariantId && ["conditional", "optional"].includes(item.applicability)
        ? "conditional" : "suggested", semanticLevel: "businessCentral",
        applicability: item.applicability || "expected", variantIds: array(item.variantIds),
        originalNodeType: item.nodeType || (item.type === "document" ? "document" : "processStep") } })),
    ...model.additional.map(item => ({ title: text(item.title || item.name || item.id),
      metadata: { semanticStatus: "customerSpecific", semanticLevel: "businessCentral" } }))
  ].filter(item => item.title); return processModel(input.recordingId, input.title, values); }
  function project(input = {}, level = "businessCentral") { if (!LEVELS.includes(level))
    throw new Error(`Unsupported semantic process-map level: ${level}`);
    if (level === "procedure") return input.procedureModel || processModel(input.recordingId,
      input.title, []); const model = analysisView.normalize(input.analysis || {}, input.decision);
    if (!model.available) return processModel(input.recordingId, input.title, []);
    if (level === "business") return business(input, model); const reference = graphFor(input, model);
    return reference ? fromReferenceGraph(input, model, reference) : fromComparison(input, model); }
  return { LEVELS, project, semanticStatus };
});
