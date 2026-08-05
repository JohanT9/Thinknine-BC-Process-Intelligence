(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewSplit = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeSegments(task, specification = {}) {
    if (Array.isArray(specification.segments)) {
      return specification.segments.map(segment =>
        typeof segment === "string"
          ? { text: segment.trim(), metadata: {} }
          : {
              text: String(segment?.text || "").trim(),
              metadata: clone(segment?.metadata || {})
            }
      ).filter(segment => segment.text);
    }
    const instruction = String(task.instruction || "");
    const splitAt = Number(specification.splitAt);
    if (!Number.isInteger(splitAt) || splitAt <= 0 || splitAt >= instruction.length) {
      return [];
    }
    return [instruction.slice(0, splitAt), instruction.slice(splitAt)]
      .map(text => ({ text: text.trim(), metadata: {} }))
      .filter(segment => segment.text);
  }

  function allocateId(baseId, partIndex, usedIds) {
    if (partIndex === 0 && !usedIds.has(baseId)) return baseId;
    const base = `${baseId}-Split-${partIndex + 1}`;
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function split(tasks, taskId, specification = {}, options = {}) {
    const sourceIndex = tasks.findIndex(task => task.taskId === taskId);
    if (sourceIndex < 0) {
      return { tasks: [...tasks], splitTasks: [], historyEntry: null };
    }
    const source = tasks[sourceIndex];
    const segments = normalizeSegments(source, specification);
    if (segments.length < 2) {
      return { tasks: [...tasks], splitTasks: [], historyEntry: null };
    }

    const usedIds = new Set(tasks.filter(task => task.taskId !== taskId).map(task => task.taskId));
    const sourceScreenshots = source.screenshots?.length
      ? [...source.screenshots]
      : source.screenshot
        ? [source.screenshot]
        : [];
    const splitTasks = segments.map((segment, index) => {
      const newTaskId = allocateId(taskId, index, usedIds);
      usedIds.add(newTaskId);
      return {
        ...clone(source),
        ...segment.metadata,
        taskId: newTaskId,
        instruction: segment.text,
        originalInstruction: segment.text,
        screenshot: sourceScreenshots[0] || null,
        screenshots: [...sourceScreenshots],
        sourceEventNos: clone(source.sourceEventNos || []),
        sourceMetadata: clone(source.sourceMetadata || []),
        sourceTaskIds: clone(source.sourceTaskIds || []),
        splitSourceTaskId: taskId,
        splitSourceInstruction: source.instruction || "",
        splitSourceOriginalInstruction: source.originalInstruction || "",
        splitIndex: index + 1,
        splitCount: segments.length,
        suggestionSource: specification.suggestionSource || "manual",
        reviewStatus: "edited",
        approved: false,
        merged: false
      };
    });
    const result = [...tasks];
    result.splice(sourceIndex, 1, ...splitTasks);
    const createdAt = options.now || new Date().toISOString();
    return {
      tasks: result,
      splitTasks,
      historyEntry: {
        historyId: options.historyId || `Split-${createdAt}-${taskId}`,
        type: "split",
        createdAt,
        sourceTaskId: taskId,
        sourceIndex,
        sourceTask: clone(source),
        createdTaskIds: splitTasks.map(task => task.taskId),
        suggestionSource: specification.suggestionSource || "manual"
      }
    };
  }

  return { allocateId, normalizeSegments, split };
});
