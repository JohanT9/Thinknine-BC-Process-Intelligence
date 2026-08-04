(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.confidence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function taskScore(task) {
    let score = 45;
    if (task.knowledgeMatched) score += 20;
    if (task.processPattern) score += 10;
    if (task.entity) score += 10;
    if (task.actionCaption || task.fieldCaption || task.selectedCaption) score += 8;
    if (task.screenshot) score += 5;
    if (task.reviewSuggested) score -= 15;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function evaluate(tasks, graph) {
    const scoredTasks = (tasks || []).map(task => ({
      ...task,
      confidenceScore: taskScore(task)
    }));

    const average = scoredTasks.length
      ? Math.round(scoredTasks.reduce((sum, task) => sum + task.confidenceScore, 0) / scoredTasks.length)
      : 0;

    const recognized = scoredTasks.filter(task => task.knowledgeMatched).length;
    const graphCoverage = graph?.nodes?.length
      ? Math.round(
          graph.nodes.filter(node => node.operations.length).length /
          graph.nodes.length * 100
        )
      : 0;

    return {
      tasks: scoredTasks,
      sessionConfidence: Math.round(average * 0.8 + graphCoverage * 0.2),
      knowledgeMatchPercent: scoredTasks.length
        ? Math.round(recognized / scoredTasks.length * 100)
        : 0,
      graphCoveragePercent: graphCoverage,
      reviewSuggestedCount: scoredTasks.filter(task => task.confidenceScore < 80).length
    };
  }

  return { evaluate, taskScore };
});
