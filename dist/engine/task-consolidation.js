(function (root, factory) {
  const engine = typeof module === "object" && module.exports
    ? require("../document/semantic-interaction-engine")
    : root.T9SemanticInteractionEngine;
  const api = factory(engine);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TaskConsolidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (engine) {
  function consolidate(tasks = []) {
    return engine.consolidateInteractions(tasks).map((task, index) => ({
      ...task,
      taskNo: index + 1,
      taskId: `${task.taskType || "Task"}-${String(index + 1).padStart(3, "0")}`
    }));
  }

  return {
    consolidate,
    selectedRecordValue: engine.selectedRecordValue
  };
});
