(function (root, factory) {
  const engine = typeof module === "object" && module.exports
    ? require("../document/semantic-interaction-engine")
    : root.T9SemanticInteractionEngine;
  const api = factory(engine);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TaskConsolidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (engine) {
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  function sourceTasks(output, inputs) {
    const inputIds = new Set(inputs.map(task => String(task.taskId || "")));
    const declared = unique(output.sourceTaskIds ||
      output.semanticActionModel?.sourceTaskIds).filter(id => inputIds.has(id));
    if (declared.length) return declared;
    if (output.taskId && inputs.some(task => task.taskId === output.taskId)) {
      return [String(output.taskId)];
    }
    const evidence = new Set(output.sourceEventIds || []);
    return unique(inputs.filter(task => (task.sourceEventIds || [])
      .some(id => evidence.has(id))).map(task => task.taskId));
  }
  function consolidateWithAnalysis(tasks = []) {
    const outputs = engine.consolidateInteractions(tasks).map((task, index) => ({
      ...task,
      taskNo: index + 1,
      taskId: `${task.taskType || "Task"}-${String(index + 1).padStart(3, "0")}`
    }));
    const represented = new Set();
    const decisions = outputs.map((task, index) => {
      const inputTaskIds = sourceTasks(task, tasks);
      inputTaskIds.forEach(id => represented.add(id));
      const merged = inputTaskIds.length > 1 ||
        Number(task.consolidation?.sourceTaskCount || 0) > 1;
      const sourceEventIds = unique(task.sourceEventIds);
      const ruleId = String(task.consolidation?.type ||
        task.semanticActionModel?.ruleId || "passthrough");
      const confidence = inputTaskIds.length && sourceEventIds.length
        ? "high" : inputTaskIds.length ? "medium" : "low";
      return Object.freeze({
        decisionId: `process-consolidation:${index + 1}`,
        outcome: merged ? "merged" : "preserved",
        decisionCode: merged ? "BCPS-PROCESS-MERGE-001" :
          "BCPS-PROCESS-INCLUDE-001",
        ruleId, confidence, inputTaskIds,
        outputTaskId: task.taskId, outputIndex: index,
        sourceEventIds, normalizedEventIds: unique(task.normalizedEventIds),
        stepGroupIds: unique(task.stepGroupIds),
        provenance: { authorship: "derived", sourceRefs: sourceEventIds }
      });
    });
    tasks.filter(task => task.taskId && !represented.has(String(task.taskId)))
      .forEach(task => decisions.push(Object.freeze({
        decisionId: `process-consolidation:filtered:${task.taskId}`,
        outcome: "filtered", decisionCode: "BCPS-PROCESS-FILTER-002",
        ruleId: "semantic-rule-hidden-or-consumed", confidence: "medium",
        inputTaskIds: [String(task.taskId)], outputTaskId: null, outputIndex: null,
        sourceEventIds: unique(task.sourceEventIds),
        normalizedEventIds: unique(task.normalizedEventIds),
        stepGroupIds: unique(task.stepGroupIds),
        provenance: { authorship: "derived",
          sourceRefs: unique(task.sourceEventIds) }
      })));
    return Object.freeze({ tasks: Object.freeze(outputs),
      decisions: Object.freeze(decisions) });
  }
  function consolidate(tasks = []) {
    return consolidateWithAnalysis(tasks).tasks;
  }

  return {
    consolidate,
    consolidateWithAnalysis,
    selectedRecordValue: engine.selectedRecordValue
  };
});
