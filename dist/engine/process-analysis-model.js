(function (root, factory) {
  const decisionCodes = typeof module === "object" && module.exports
    ? require("./process-decision-code-registry") : root.T9ProcessDecisionCodeRegistry;
  const qualityGuard = typeof module === "object" && module.exports
    ? require("./process-quality-guard") : root.T9ProcessQualityGuard;
  const contradictions = typeof module === "object" && module.exports
    ? require("./process-contradiction-engine") : root.T9ProcessContradictionEngine;
  const api = factory(decisionCodes, qualityGuard, contradictions);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessAnalysisModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (decisionCodes, qualityGuard, contradictions) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const MODEL_VERSION = "1.4.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const freeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value);
  };
  const ids = (value, key) => unique(value?.[key]);

  function build(input = {}) {
    const normalizedEvents = input.normalizedEvents || [];
    const groups = input.stepGroups || [];
    const actions = input.semanticActions || [];
    const tasks = input.businessTasks || [];
    const consolidationDecisions = (input.consolidationDecisions || []).map(value =>
      clone(value));
    const supporting = new Map((input.supportingEvents || []).map(item =>
      [String(item.normalizedEventId), item]));
    const actionsByGroup = new Map();
    actions.forEach(action => ids(action, "stepGroupIds").forEach(groupId => {
      if (!actionsByGroup.has(groupId)) actionsByGroup.set(groupId, []);
      actionsByGroup.get(groupId).push(action);
    }));
    const tasksByGroup = new Map();
    tasks.forEach(task => ids(task, "stepGroupIds").forEach(groupId => {
      if (!tasksByGroup.has(groupId)) tasksByGroup.set(groupId, []);
      tasksByGroup.get(groupId).push(task);
    }));
    const groupDecisions = groups.map(group => {
      const groupId = String(group.stepGroupId || "");
      const relatedActions = actionsByGroup.get(groupId) || [];
      const relatedTasks = tasksByGroup.get(groupId) || [];
      let outcome = "included"; let reasonCode = "process-group-produced-task";
      if (group.guidance?.ignored || group.status === "ignored") {
        outcome = "excluded"; reasonCode = "process-group-explicitly-ignored";
      } else if (relatedActions.length && relatedActions.every(action => action.hidden)) {
        outcome = "excluded"; reasonCode = "process-action-hidden";
      } else if (!relatedTasks.length) {
        outcome = "unresolved"; reasonCode = relatedActions.length
          ? "process-action-not-projected" : "process-group-not-interpreted";
      }
      const assignedCodes = decisionCodes.assign(reasonCode, outcome, {
        subjectType: "step-group",
        normalizedEventCount: ids(group, "normalizedEventIds").length });
      return { decisionId: `process-decision:group:${groupId}`,
        subjectType: "step-group", subjectId: groupId, outcome, reasonCode,
        decisionCode: assignedCodes[0].code, decisionCodes: assignedCodes,
        sourceEventIds: ids(group, "sourceEventIds"),
        normalizedEventIds: ids(group, "normalizedEventIds"),
        semanticActionIds: unique(relatedActions.map(action => action.actionId)),
        taskIds: unique(relatedTasks.map(task => task.taskId)),
        provenance: { authorship: "derived", sourceRefs: [groupId] } };
    });
    const groupByEvent = new Map();
    groupDecisions.forEach(decision => decision.normalizedEventIds.forEach(id =>
      groupByEvent.set(id, decision)));
    const eventDecisions = normalizedEvents.map(event => {
      const id = String(event.normalizedEventId || "");
      const groupDecision = groupByEvent.get(id);
      const supportingDecision = supporting.get(id);
      const outcome = groupDecision?.outcome === "included" ? "included" :
        groupDecision?.outcome === "excluded" ? "excluded" :
        supportingDecision ? "supporting" : "unresolved";
      const reasonCode = groupDecision?.reasonCode ||
        supportingDecision?.reason || "process-event-unassigned";
      const assignedCodes = decisionCodes.assign(reasonCode, outcome,
        { subjectType: "normalized-event" });
      return { decisionId: `process-decision:event:${id}`,
        subjectType: "normalized-event", subjectId: id, outcome, reasonCode,
        decisionCode: assignedCodes[0].code, decisionCodes: assignedCodes,
        sourceEventIds: ids(event, "sourceEventIds"),
        stepGroupIds: groupDecision ? [groupDecision.subjectId] : [],
        provenance: { authorship: "derived", sourceRefs: [id] } };
    });
    const allDecisions = [...groupDecisions, ...eventDecisions];
    const qualityGate = qualityGuard.evaluate({ normalizedEvents, stepGroups: groups,
      semanticActions: actions, businessTasks: tasks });
    const contradictionAnalysis = contradictions.analyze({ stepGroups: groups,
      businessTasks: tasks, languagePolicy: input.languagePolicy });
    const releaseStatus = qualityGate.status === "blocked" ||
      contradictionAnalysis.status === "blocked" ? "blocked" :
      qualityGate.status === "review-required" ||
      contradictionAnalysis.status === "review-required"
        ? "review-required" : "passed";
    const counts = allDecisions.reduce((result, decision) => {
      result[decision.outcome] = (result[decision.outcome] || 0) + 1;
      return result;
    }, { included: 0, supporting: 0, excluded: 0, unresolved: 0 });
    return freeze({ schemaVersion: SCHEMA_VERSION, modelVersion: MODEL_VERSION,
      decisionCodeRegistryVersion: decisionCodes.REGISTRY_VERSION,
      qualityGuardVersion: qualityGuard.GUARD_VERSION,
      contradictionEngineVersion: contradictions.ENGINE_VERSION,
      recordingId: String(input.recordingId || ""),
      pipelineVersion: String(input.pipelineVersion || ""),
      input: { normalizedEventCount: normalizedEvents.length,
        stepGroupCount: groups.length, semanticActionCount: actions.length },
      output: { taskCount: tasks.length, taskIds: unique(tasks.map(task => task.taskId)) },
      decisions: { events: eventDecisions, stepGroups: groupDecisions,
        consolidations: consolidationDecisions }, counts,
      qualityGate,
      contradictionAnalysis,
      releaseGate: { status: releaseStatus,
        blockingFindingCount: qualityGate.counts.blocked +
          contradictionAnalysis.counts.blocked,
        reviewFindingCount: qualityGate.counts.review +
          contradictionAnalysis.counts.review },
      diagnostics: clone(input.groupingDiagnostics || {}),
      provenance: { authorship: "derived",
        sourceRefs: unique(normalizedEvents.flatMap(event => event.sourceEventIds || [])),
        derivedBy: `process-analysis-model@${MODEL_VERSION}` } });
  }
  function normalize(value) {
    if (!value || Number(value.schemaVersion) !== SCHEMA_VERSION) {
      throw new Error(`Unsupported ProcessAnalysis schema: ${value?.schemaVersion}`);
    }
    return freeze(clone(value));
  }
  return { MODEL_VERSION, SCHEMA_VERSION, build, normalize };
});
