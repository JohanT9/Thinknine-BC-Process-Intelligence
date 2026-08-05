(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewMerge = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function unique(values) {
    return [...new Set(values.filter(value => value !== undefined && value !== null && value !== ""))];
  }

  function text(tasks, field) {
    return tasks.map(task => String(task[field] || "").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  function screenshots(tasks) {
    return unique(tasks.flatMap(task =>
      task.screenshots?.length
        ? task.screenshots
        : task.screenshot
          ? [task.screenshot]
          : []
    ));
  }

  function sourceMetadata(task) {
    return clone({
      taskId: task.taskId,
      taskType: task.taskType,
      semanticAction: task.semanticAction,
      pageCaption: task.pageCaption,
      actionCaption: task.actionCaption,
      fieldCaption: task.fieldCaption,
      selectedCaption: task.selectedCaption,
      confidence: task.confidence,
      confidenceScore: task.confidenceScore,
      knowledgeRule: task.knowledgeRule,
      sourceEventNos: task.sourceEventNos || []
    });
  }

  function merge(tasks, selectedIds, options = {}) {
    const selected = new Set(selectedIds || []);
    const sources = tasks
      .map((task, index) => ({ task, index }))
      .filter(item => selected.has(item.task.taskId));
    if (sources.length < 2) return { tasks: [...tasks], mergedTask: null, historyEntry: null };

    const sourceTasks = sources.map(source => source.task);
    const images = screenshots(sourceTasks);
    const scores = sourceTasks
      .map(task => task.confidenceScore ?? task.confidence)
      .filter(value => Number.isFinite(value));
    const mergedTask = {
      ...clone(sourceTasks[0]),
      taskType: "Merged",
      semanticAction: "Merged",
      instruction: text(sourceTasks, "instruction") || "Utför de sammanslagna stegen.",
      originalInstruction: text(sourceTasks, "originalInstruction"),
      userComment: text(sourceTasks, "userComment"),
      screenshot: images[0] || null,
      screenshots: images,
      sourceEventNos: unique(sourceTasks.flatMap(task => task.sourceEventNos || [])),
      sourceTaskIds: sourceTasks.map(task => task.taskId),
      sourceMetadata: sourceTasks.map(sourceMetadata),
      confidenceScore: scores.length ? Math.min(...scores) : undefined,
      approved: sourceTasks.every(task => task.approved),
      reviewStatus: "edited",
      merged: true
    };
    const insertionIndex = sources[0].index;
    const result = tasks.filter(task => !selected.has(task.taskId));
    result.splice(insertionIndex, 0, mergedTask);
    const createdAt = options.now || new Date().toISOString();
    return {
      tasks: result,
      mergedTask,
      historyEntry: {
        historyId: options.historyId || `Merge-${createdAt}-${mergedTask.taskId}`,
        type: "merge",
        createdAt,
        mergedTaskId: mergedTask.taskId,
        insertionIndex,
        sourceTasks: sources.map(source => ({
          index: source.index,
          task: clone(source.task)
        }))
      }
    };
  }

  return { merge, screenshots, sourceMetadata };
});
