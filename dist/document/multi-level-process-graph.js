(function (root, factory) {
  const graph = typeof module === "object" && module.exports
    ? require("./process-graph") : root.T9ProcessGraph;
  const schema = typeof module === "object" && module.exports
    ? require("../engine/process-taxonomy-schema") : root.T9ProcessTaxonomySchema;
  const seed = typeof module === "object" && module.exports
    ? require("../engine/business-central-process-taxonomy-seed").seed
    : root.T9BusinessCentralProcessTaxonomySeed.seed;
  const recognition = typeof module === "object" && module.exports
    ? require("../engine/bc-process-recognition-engine") : root.T9BCProcessRecognitionEngine;
  const api = factory(graph, schema, seed, recognition);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9MultiLevelProcessGraph = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (graph, schema, seed, recognition) {
  "use strict";
  const PROJECTION_VERSION = "1.0.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => value == null ? "" : String(value).trim();
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const firstEventOrder = (classification, eventOrder) => Math.min(...classification.sourceEventIds
    .map(id => eventOrder.get(id) ?? Number.MAX_SAFE_INTEGER));
  function eventTitle(event) { const raw = event.raw || {}; return text(
    event.identification?.actionIdentity?.caption || event.action?.caption ||
    event.accessibleTarget?.name || event.control?.name || raw.actionCaption ||
    raw.accessibleName || raw.label || raw.fieldName || raw.pageCaption || raw.pageName ||
    event.page?.caption || event.page?.name || event.type || "Recorded action"); }
  function actionNodeType(event) { const raw = event.raw || {}; const action = text(
    event.identification?.actionIdentity?.actionType || raw.actionType || raw.automationId);
    const meaning = `${action} ${eventTitle(event)}`;
    if (/post|bokf(?:ö|Ã¶)r/i.test(meaning)) return "posting";
    if (raw.manual === true || raw.manuallyAdded === true) return "manualAction";
    if (/system|background|automatic/i.test(meaning) || raw.inputSource === "system") return "systemAction";
    if (/decision|beslut/i.test(meaning) || raw.processNodeType === "decision") return "decision";
    return "action"; }
  function documentNodeType(document, taxonomy) {
    const definition = taxonomy.documents.find(item => item.id === document?.id);
    return definition?.documentType === "posted-document" ||
      /(^|:)posted-|bokförd/i.test(`${document?.id || ""} ${document?.name || ""}`)
      ? "postedDocument" : "document";
  }
  function semanticStepNodeType(item, title) {
    const requested = item.metadata?.nodeType;
    if (["decision", "systemAction", "manualAction", "posting", "processStep"]
      .includes(requested)) return requested;
    return /post|bokför/i.test(item.businessAction?.name || title) ? "posting" : "processStep";
  }
  function boundary(recordingId, level, type, sequence) { return graph.node({
    nodeId: graph.stableId("process-graph-node", [recordingId, level, type]),
    nodeType: type, title: type === "start" ? "Start" : "End", sequence,
    metadata: { generatedBoundary: true } }); }
  function edge(recordingId, level, from, to, index, type = "sequence", metadata = {}) {
    return graph.relationship({ relationshipId: graph.stableId("process-graph-relationship",
      [recordingId, level, from.nodeId, to.nodeId, type, index]), fromNodeId: from.nodeId,
    toNodeId: to.nodeId, relationshipType: type, sourceEventIds: unique([
      ...from.sourceEventIds, ...to.sourceEventIds]), metadata }); }
  function relationshipType(item) { const requested = item?.metadata?.relationshipType;
    return graph.RELATIONSHIP_TYPES.includes(requested) ? requested :
      ["posting", "postedDocument"].includes(item?.nodeType) ? "documentPosting" : "sequence"; }
  function chain(recordingId, level, contentNodes, title, metadata = {}) {
    const start = boundary(recordingId, level, "start", 0);
    const end = boundary(recordingId, level, "end", contentNodes.length + 1);
    const nodes = [start, ...contentNodes, end]; const relationships = [];
    for (let index = 1; index < nodes.length; index += 1) relationships.push(edge(
      recordingId, level, nodes[index - 1], nodes[index], index,
      index === 1 || index === nodes.length - 1 ? "sequence" : relationshipType(nodes[index])));
    return graph.normalize({ graphId: graph.stableId("process-graph", [PROJECTION_VERSION,
      recordingId, level]), recordingId, level, title, nodes, relationships,
    startNodeIds: [start.nodeId], endNodeIds: [end.nodeId], metadata: {
      projectionVersion: PROJECTION_VERSION, ...metadata } }); }
  function observedClassifications(recording, taxonomy) {
    const result = recognition?.recognize?.(recording, { taxonomy });
    const candidate = result?.classification;
    if (!candidate?.signals?.strongMetadata || !candidate.signals.matchedDocuments) return [];
    const shared = { businessDomain: candidate.taxonomyReferences.domain,
      businessProcess: candidate.taxonomyReferences.businessProcess,
      bcProcess: candidate.taxonomyReferences.bcProcess, classificationSource: "rule",
      confidence: candidate.confidence, metadata: { inferredFromObservedEvidence: true } };
    return [
      ...(candidate.processEvidence?.matchedDocuments || []).map((item, index) => ({
        ...shared, classificationId: `observed-document:${item.id}:${index}`,
        sourceEventIds: [item.eventId], businessDocument: { id: item.id, name: item.name }
      })),
      ...(candidate.processEvidence?.matchedActions || []).map((item, index) => ({
        ...shared, classificationId: `observed-action:${item.name}:${index}`,
        sourceEventIds: [item.eventId], businessAction: { id: `action:${item.name.toLowerCase()}`,
          name: item.name }, metadata: { ...shared.metadata,
          nodeType: item.nodeType, qualifiers: clone(item.qualifiers || []) }
      }))
    ];
  }
  function classifications(recording, taxonomy = seed) { const order = new Map(recording.events.map((event,
    index) => [event.id, event.sequence || index + 1])); const explicit = (recording.semanticInterpretation
      ?.classifications || []).filter(item => item.sourceEventIds?.length); const values = explicit.length
      ? explicit : observedClassifications(recording, taxonomy); return values.slice().sort((a, b) =>
      firstEventOrder(a, order) - firstEventOrder(b, order) ||
      a.classificationId.localeCompare(b.classificationId)); }
  function procedure(recording) { const byEvent = new Map(); classifications(recording)
    .forEach(item => item.sourceEventIds.forEach(eventId => {
      const values = byEvent.get(eventId) || []; values.push(item.classificationId);
      byEvent.set(eventId, values);
    })); const nodes = recording.events.map((event, index) => graph.node({
    nodeId: graph.stableId("process-graph-node", [recording.id, "userProcedure", event.id]),
    nodeType: actionNodeType(event), title: eventTitle(event), sequence: index + 1,
    sourceEventIds: [event.id], semanticClassificationIds: byEvent.get(event.id) || [],
    metadata: { eventType: event.type,
      screenshotAssetId: event.screenshotAssetId || null } }));
    return chain(recording.id, "userProcedure", nodes,
      recording.metadata?.title || "User procedure"); }
  function bcProcess(recording, taxonomy) { const values = classifications(recording, taxonomy); const nodes = [];
    let previousDocument = null; values.forEach(item => { const document = item.businessDocument;
      if (document?.id && document.id !== previousDocument) { nodes.push(graph.node({
        nodeId: graph.stableId("process-graph-node", [recording.id, "document", document.id,
          item.classificationId]), nodeType: documentNodeType(document, taxonomy),
        title: document.name || document.id,
        sequence: nodes.length + 1, sourceEventIds: item.sourceEventIds,
        semanticClassificationIds: [item.classificationId], taxonomyEntityIds: [document.id],
        metadata: { relationshipType: item.metadata?.createsDocument ? "documentCreation" : "sequence",
          semanticStatus: item.metadata?.inferredFromObservedEvidence ? "observed" :
            item.metadata?.semanticStatus }
      })); previousDocument = document.id; }
      const step = item.processStep; const action = item.businessAction;
      if (item.metadata?.inferredFromObservedEvidence && !step?.id && !action?.id) return;
      const title = step?.name || action?.name || item.bcProcess?.name || "Classified BC step";
      const nodeType = semanticStepNodeType(item, title);
      nodes.push(graph.node({ nodeId: graph.stableId("process-graph-node",
        [recording.id, "businessCentralProcess", item.classificationId]), nodeType, title,
      sequence: nodes.length + 1, sourceEventIds: item.sourceEventIds,
      semanticClassificationIds: [item.classificationId], taxonomyEntityIds: unique([
        item.bcProcess?.id, step?.id, action?.id]), childNodeIds: item.sourceEventIds.map(eventId =>
        graph.stableId("process-graph-node", [recording.id, "userProcedure", eventId])),
      metadata: { relationshipType: item.metadata?.relationshipType ||
        (nodeType === "posting" ? "documentPosting" : "sequence"),
        condition: item.metadata?.condition || null,
        semanticStatus: item.metadata?.inferredFromObservedEvidence ? "observed" :
          item.metadata?.semanticStatus } })); });
    return chain(recording.id, "businessCentralProcess", nodes,
      `${recording.metadata?.title || "Recording"} — Business Central`, { taxonomyId: taxonomy.taxonomyId }); }
  function business(recording, taxonomy, bcGraph) { const values = classifications(recording, taxonomy);
    const groups = []; values.forEach(item => { const reference = item.businessProcess ||
      (item.bcProcess?.id ? (() => { const process = taxonomy.bcProcesses.find(candidate =>
        candidate.id === item.bcProcess.id); return taxonomy.businessProcesses.find(candidate =>
          candidate.id === process?.businessProcessId); })() : null);
    if (!reference) return; let group = groups.find(candidate => candidate.id === reference.id);
    if (!group) { group = { id: reference.id, name: reference.name || reference.id,
      sourceEventIds: [], classificationIds: [] }; groups.push(group); }
    group.sourceEventIds.push(...item.sourceEventIds); group.classificationIds.push(item.classificationId); });
    const nodes = groups.map((item, index) => graph.node({ nodeId: graph.stableId(
      "process-graph-node", [recording.id, "businessProcess", item.id]),
    nodeType: "businessProcess", title: item.name, sequence: index + 1,
    sourceEventIds: unique(item.sourceEventIds), semanticClassificationIds:
      unique(item.classificationIds), taxonomyEntityIds: [item.id], childNodeIds:
      bcGraph.nodes.filter(node => node.semanticClassificationIds.some(id =>
        item.classificationIds.includes(id))).map(node => node.nodeId), metadata: {
        semanticStatus: values.filter(value => item.classificationIds.includes(
          value.classificationId)).every(value => value.metadata?.inferredFromObservedEvidence)
          ? "observed" : undefined } }));
    return chain(recording.id, "businessProcess", nodes,
      `${recording.metadata?.title || "Recording"} — Business process`, { taxonomyId: taxonomy.taxonomyId }); }
  function generateAll(recording, options = {}) { if (!recording || Number(recording.schemaVersion) !== 1)
    throw new TypeError("A Canonical Recording schema-v1 value is required.");
    const taxonomy = schema.normalize(options.taxonomy || seed); const userProcedure = procedure(recording);
    const businessCentralProcess = bcProcess(recording, taxonomy);
    const businessProcess = business(recording, taxonomy, businessCentralProcess);
    return Object.freeze({ businessProcess, businessCentralProcess, userProcedure,
      expansionIndex: Object.freeze(Object.fromEntries([...businessProcess.nodes,
        ...businessCentralProcess.nodes].filter(node => node.childNodeIds.length)
        .map(node => [node.nodeId, clone(node.childNodeIds)]))) }); }
  function generate(recording, level, options = {}) { if (!graph.LEVELS.includes(level))
    throw new Error(`Unsupported process graph level: ${level}`); return generateAll(recording, options)[level]; }
  function expand(bundle, nodeId) { const ids = bundle.expansionIndex?.[nodeId] || [];
    const candidates = [...bundle.businessCentralProcess.nodes, ...bundle.userProcedure.nodes];
    return Object.freeze(candidates.filter(node => ids.includes(node.nodeId))); }
  return { PROJECTION_VERSION, actionNodeType, documentNodeType, expand, generate, generateAll,
    relationshipType, semanticStepNodeType };
});
