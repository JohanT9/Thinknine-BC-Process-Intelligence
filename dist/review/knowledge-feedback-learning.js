(function (root, factory) {
  const adapter = typeof module === "object" && module.exports
    ? require("../engine/canonical-process-adapter") : root.BCProcessAdapter;
  const api = factory(adapter);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeFeedbackLearning = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (adapter) {
  "use strict";
  const VERSION = "1.0.0";
  const MINIMUM_OBSERVATIONS = 2;
  const identifier = value => typeof value === "string" &&
    /^[A-Za-z][A-Za-z0-9._:-]{0,79}$/.test(value);
  const text = value => typeof value === "string" ? value.trim().slice(0, 100) : "";
  const redacted = value => text(value).replace(/https?:\/\/\S+|\b[^\s@]+@[^\s@]+\.[^\s@]+|\b\d{6,}\b/giu, "");
  const exactPattern = value => `^${value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`;
  const output = task => ({ taskType: task?.taskType || "",
    semanticAction: task?.semanticAction || "", entity: task?.entity || "" });
  const outputKey = value => JSON.stringify(value);

  function inputFor(before, after) {
    const source = before || after || {};
    const match = {};
    for (const [field, key] of [["pageCaption", "pagePatterns"],
      ["actionCaption", "actionPatterns"], ["fieldCaption", "fieldPatterns"],
      ["automationId", "automationIdPatterns"]]) {
      const value = redacted(source[field] || after?.[field]);
      if (value) match[key] = [exactPattern(value)];
    }
    const beforeOutput = output(before), afterOutput = output(after);
    if (!Object.keys(match).length || !identifier(afterOutput.taskType) ||
        !identifier(afterOutput.semanticAction) ||
        (afterOutput.entity && !identifier(afterOutput.entity)) ||
        outputKey(beforeOutput) === outputKey(afterOutput)) return null;
    return { match, beforeOutput, afterOutput };
  }

  function create(reviews = []) {
    const groups = new Map();
    (Array.isArray(reviews) ? reviews : []).forEach(review => {
      const history = Array.isArray(review?.commandHistory)
        ? review.commandHistory.slice(0, review.historyIndex) : [];
      history.forEach(entry => {
        const before = new Map((entry.beforeTasks || []).map(task => [task?.taskId, task]));
        const after = new Map((entry.afterTasks || []).map(task => [task?.taskId, task]));
        for (const [taskId, original] of before) {
          const corrected = after.get(taskId);
          if (!corrected) continue;
          const input = inputFor(original, corrected);
          if (!input) continue;
          const signature = adapter.digest(input.match);
          if (!groups.has(signature)) groups.set(signature, { signature,
            match: input.match, outputs: new Map(), sources: new Set() });
          const group = groups.get(signature);
          const source = [original.knowledgePackId, original.knowledgeRule,
            original.knowledgeReleaseId].filter(Boolean).join(":");
          if (source) group.sources.add(source);
          const key = outputKey(input.afterOutput);
          group.outputs.set(key, (group.outputs.get(key) || 0) + 1);
        }
      });
    });
    const proposals = [...groups.values()].map(group => {
      const alternatives = [...group.outputs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const observations = alternatives.reduce((sum, [, count]) => sum + count, 0);
      const conflict = alternatives.length !== 1;
      const proposedOutput = !conflict ? JSON.parse(alternatives[0][0]) : null;
      const repeated = observations >= MINIMUM_OBSERVATIONS;
      return Object.freeze({ proposalId: `feedback:${group.signature}`,
        status: conflict ? "conflicting-feedback" : repeated ? "review-ready" : "needs-more-feedback",
        match: group.match,
        observationCount: observations, minimumObservations: MINIMUM_OBSERVATIONS,
        sourceRules: [...group.sources].sort(),
        alternatives: conflict ? alternatives.map(([value, count]) => ({
          output: JSON.parse(value), observationCount: count })) : [],
        proposedRule: proposedOutput ? Object.freeze({
          ruleId: `Feedback.${group.signature.slice(0, 16)}`,
          taskType: proposedOutput.taskType, semanticAction: proposedOutput.semanticAction,
          entity: proposedOutput.entity, priority: 500,
          confidence: repeated ? 0.65 : 0.45, match: group.match,
          confidenceBasis: "repeat-count-heuristic-v1",
          source: "local-review-feedback", requiresReview: true,
          autoActivation: false }) : null });
    }).sort((a, b) => a.proposalId.localeCompare(b.proposalId));
    return Object.freeze({ version: VERSION, scope: "local-review-only",
      contentIncluded: false, identityIncluded: false,
      autoActivation: false, minimumObservations: MINIMUM_OBSERVATIONS,
      proposalCount: proposals.length,
      reviewReadyCount: proposals.filter(item => item.status === "review-ready").length,
      conflictCount: proposals.filter(item => item.status === "conflicting-feedback").length,
      proposals: Object.freeze(proposals) });
  }

  return { VERSION, MINIMUM_OBSERVATIONS, create };
});
