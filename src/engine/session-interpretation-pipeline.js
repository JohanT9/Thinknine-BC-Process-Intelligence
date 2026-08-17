(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("../document/semantic-interaction-engine")
    : root.T9SemanticInteractionEngine;
  const knowledge = typeof module === "object" && module.exports
    ? require("./knowledge-domain") : root.T9KnowledgeDomain;
  const refs = typeof module === "object" && module.exports
    ? require("./source-reference") : root.T9SourceReference;
  const api = factory(semantic, knowledge, refs);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SessionInterpretationPipeline = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
function (semantic, knowledge, refs) {
  "use strict";
  const VERSION = "1.0.0";
  const unique = values => [...new Set((values || []).filter(Boolean))];

  function eventIndex(events = []) {
    const byCanonicalId = new Map();
    events.forEach(event => {
      if (event.canonicalSourceEventId) byCanonicalId.set(
        event.canonicalSourceEventId, event);
    });
    return byCanonicalId;
  }

  function context(action, sourceEvents) {
    const primary = sourceEvents.at(-1) || {};
    return { currentPageCaption: action.pageCaption || primary.pageCaption || "",
      previousPageCaption: primary.context?.previousPageCaption || "",
      currentEntity: action.entity || primary.identification?.pageIdentity?.entity || "",
      followingEntity: primary.context?.followingEntity || "",
      pendingSemanticHint: action.actionType || "" };
  }

  function task(action, index, eventsById, screenshots = {}) {
    const sourceEvents = (action.sourceEventIds || []).map(id =>
      eventsById.get(id)).filter(Boolean);
    const eventNos = unique(sourceEvents.map(event => event.eventNo));
    const screenshot = [...eventNos].reverse().map(no => screenshots[no])
      .find(Boolean) || action.screenshotRefs?.at(-1) || null;
    const trace = refs.normalize({ recordingId: action.recordingId,
      sourceEventIds: action.sourceEventIds,
      normalizedEventIds: action.normalizedEventIds,
      stepGroupIds: action.stepGroupIds, semanticActionIds: [action.actionId] });
    return { taskId: `${action.actionType || "Task"}:${refs.stableIdentity(trace)}`,
      taskNo: index + 1, taskType: action.actionType || "Unclassified",
      semanticAction: action.actionType || "", semanticActionModel: action,
      instruction: action.displayText || "", description: action.displayText || "",
      pageId: action.pageId || "", pageCaption: action.pageCaption || "",
      actionCaption: action.actionCaption || "", fieldCaption: action.targetField || "",
      selectedCaption: action.selectedValue || "", value: action.selectedValue ?? "",
      instructionValue: action.selectedValue ?? "", sourceEventNos: eventNos,
      ...trace, screenshot, screenshots: screenshot ? [screenshot] : [],
      context: context(action, sourceEvents), automationId: "",
      reviewStatus: action.confidence < 0.85 ? "review-suggested" : "unreviewed",
      confidence: action.confidence || 0.55 };
  }

  function interpret(input = {}, services = {}) {
    const groups = input.stepGroups || [];
    const actions = semantic.processStepGroups(groups);
    const byId = eventIndex(input.events);
    const baseTasks = actions.filter(action => !action.hidden)
      .map((action, index) => task(action, index, byId, input.imagePaths));
    const knowledgeResult = knowledge.apply(baseTasks, input.knowledgePacks || []);
    const tasks = knowledgeResult.tasks.map((value, index) => ({
      ...value, taskNo: index + 1,
      taskId: `${value.taskType || "Task"}:${refs.stableIdentity(value)}`,
      ...(!value.screenshot ? (() => {
        const evidence = new Set(value.sourceEventIds || []);
        const source = baseTasks.find(candidate => (candidate.sourceEventIds || [])
          .some(id => evidence.has(id)) && candidate.screenshot);
        return source ? { screenshot: source.screenshot,
          screenshots: [...source.screenshots] } : {};
      })() : {})
    }));
    const onlyUnclassified = tasks.length > 0 && tasks.every(value =>
      value.taskType === "Unclassified" &&
      (!String(value.instruction || "").trim() ||
        String(value.instruction).trim() === "Utför uppgiften."));
    if (onlyUnclassified && typeof services.compatibilityInterpret === "function") {
      const compatibility = services.compatibilityInterpret(input);
      if (compatibility?.businessTasks?.length) {
        return { ...compatibility, pipelineVersion: VERSION,
          normalizedEvents: input.normalizedEvents || [], stepGroups: groups,
          semanticActions: actions, compatibilityMode: "legacy-unclassified" };
      }
    }
    const entityNodes = services.entityMemory?.build(input.events || []) || [];
    const sessionGraph = services.sessionGraph?.build(input.session, tasks,
      entityNodes) || { nodes: [], edges: [] };
    const confidenceResult = services.confidence?.evaluate(tasks, sessionGraph) ||
      { tasks, sessionConfidence: 0, knowledgeMatchPercent: 0,
        graphCoveragePercent: 0, reviewSuggestedCount: 0 };
    return { pipelineVersion: VERSION, normalizedEvents: input.normalizedEvents || [],
      stepGroups: groups, semanticActions: actions, interpretedSteps: actions,
      businessSteps: actions, businessTasks: confidenceResult.tasks,
      sessionGraph, confidenceResult, unmatchedKnowledgeItems: knowledgeResult.unmatched,
      contextEvents: input.events || [], contextCandidates: [] };
  }
  return { VERSION, interpret };
});
