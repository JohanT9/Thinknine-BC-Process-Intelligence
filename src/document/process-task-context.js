(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessTaskContext = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const array = value => Array.isArray(value) ? value : [];
  const hasExplanation = task => Boolean(task?.contextualExplanationRuleId) &&
    (["observed-workflow", "authored-process", "page-context", "vendor-documentation"].includes(task?.contextualExplanationBasis) ||
      array(task?.contextualExplanationSources).some(source =>
        String(source?.sourceUri || "").startsWith("https://learn.microsoft.com/"))) &&
    Object.keys(task?.contextualExplanations || {}).length > 0;

  const PROVENANCE_BUCKETS = [
    ["sourceEventIds"],
    ["sourceEventNos", "legacyEventNos"],
    ["normalizedEventIds"],
    ["semanticActionIds"]
  ];

  function provenance(task) {
    return PROVENANCE_BUCKETS.map(fields => new Set(fields.flatMap(field =>
      array(task?.[field])).map(String).filter(Boolean)));
  }

  function matchesProvenance(task, candidate) {
    const taskRefs = provenance(task);
    const candidateRefs = provenance(candidate);
    return taskRefs.some((left, index) => {
      const right = candidateRefs[index];
      return left.size > 0 && right.size > 0 &&
        [...left].some(value => right.has(value));
    });
  }

  function actionIdentity(task) {
    const explicit = task?.semanticAction || task?.taskType ||
      task?.semanticActionModel?.actionType;
    if (explicit) return String(explicit).trim().toLowerCase();
    const idPrefix = String(task?.taskId || "").split(/[:/-]/u, 1)[0];
    return idPrefix.trim().toLowerCase();
  }

  function positionalMatch(task, interpretedTasks, index) {
    if (interpretedTasks.length === 0 || index < 0 ||
        task?.taskNo !== index + 1) return null;
    const candidate = interpretedTasks[index];
    if (candidate?.taskNo !== index + 1 || !hasExplanation(candidate)) return null;
    const taskAction = actionIdentity(task);
    const candidateAction = actionIdentity(candidate);
    return taskAction && candidateAction && taskAction === candidateAction
      ? candidate : null;
  }

  function match(task, interpretedTasks) {
    const exact = interpretedTasks.filter(candidate => candidate.taskId &&
      candidate.taskId === task.taskId && hasExplanation(candidate));
    if (exact.length) return exact.length === 1 ? exact[0] : null;

    const candidates = interpretedTasks.filter(candidate => {
      if (!hasExplanation(candidate)) return false;
      return matchesProvenance(task, candidate);
    });
    const ruleIds = new Set(candidates.map(candidate => candidate.contextualExplanationRuleId));
    if (ruleIds.size !== 1) return null;
    const explanationSets = new Map(candidates.map(candidate => [
      JSON.stringify(candidate.contextualExplanations), candidate
    ]));
    return explanationSets.size === 1 ? explanationSets.values().next().value : null;
  }

  function enrichForDisplay(reviewTasks = [], interpretedTasks = []) {
    const review = array(reviewTasks);
    const interpreted = array(interpretedTasks);
    const sameLength = review.length === interpreted.length;
    return review.map((task, index) => {
      const matched = match(task, interpreted);
      const context = matched || (sameLength
        ? positionalMatch(task, interpreted, index) : null);
      if (!context) return task;
      return { ...task,
        contextualExplanations: { ...context.contextualExplanations },
        contextualExplanationRuleId: context.contextualExplanationRuleId,
        contextualExplanationConfidence: context.contextualExplanationConfidence,
        contextualExplanationBasis: context.contextualExplanationBasis,
        contextualExplanationSourceIds: [...array(context.contextualExplanationSourceIds)],
        contextualExplanationSources: array(context.contextualExplanationSources)
          .map(source => ({ ...source })) };
    });
  }

  return { enrichForDisplay, match };
});
