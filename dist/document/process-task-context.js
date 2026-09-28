(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessTaskContext = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const array = value => Array.isArray(value) ? value : [];
  const hasExplanation = task => Object.keys(task?.contextualExplanations || {}).length > 0;

  function eventIds(task) {
    return new Set(array(task?.sourceEventIds).map(String).filter(Boolean));
  }

  function match(task, interpretedTasks) {
    const exact = interpretedTasks.filter(candidate => candidate.taskId &&
      candidate.taskId === task.taskId && hasExplanation(candidate));
    if (exact.length === 1) return exact[0];

    const sourceIds = eventIds(task);
    if (!sourceIds.size) return null;
    const candidates = interpretedTasks.filter(candidate => {
      if (!hasExplanation(candidate)) return false;
      const candidateIds = eventIds(candidate);
      return [...sourceIds].some(id => candidateIds.has(id));
    });
    const explanationSets = new Map(candidates.map(candidate => [
      JSON.stringify(candidate.contextualExplanations), candidate
    ]));
    return explanationSets.size === 1 ? explanationSets.values().next().value : null;
  }

  function enrichForDisplay(reviewTasks = [], interpretedTasks = []) {
    return array(reviewTasks).map(task => {
      const interpreted = match(task, array(interpretedTasks));
      if (!interpreted) return task;
      return { ...task,
        contextualExplanations: { ...interpreted.contextualExplanations },
        contextualExplanationSourceIds: [...array(interpreted.contextualExplanationSourceIds)],
        contextualExplanationSources: array(interpreted.contextualExplanationSources)
          .map(source => ({ ...source })) };
    });
  }

  return { enrichForDisplay, match };
});
