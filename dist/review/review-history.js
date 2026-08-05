(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewHistory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_ENTRIES = 100;

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function ensure(review) {
    review.commandHistoryVersion = review.commandHistoryVersion || "1.0.0";
    review.commandHistory = Array.isArray(review.commandHistory)
      ? review.commandHistory
      : [];
    review.historyIndex = Number.isInteger(review.historyIndex)
      ? Math.max(0, Math.min(review.historyIndex, review.commandHistory.length))
      : review.commandHistory.length;
    return review;
  }

  function snapshot(tasks) {
    return clone(tasks || []);
  }

  function record(review, command) {
    ensure(review);
    const beforeTasks = snapshot(command.beforeTasks);
    const afterTasks = snapshot(command.afterTasks);
    const beforeAnnotations = command.beforeAnnotations === undefined
      ? undefined
      : clone(command.beforeAnnotations);
    const afterAnnotations = command.afterAnnotations === undefined
      ? undefined
      : clone(command.afterAnnotations);
    if (
      JSON.stringify(beforeTasks) === JSON.stringify(afterTasks) &&
      command.beforeStatus === command.afterStatus &&
      JSON.stringify(beforeAnnotations) === JSON.stringify(afterAnnotations)
    ) {
      return review;
    }
    let entries = review.commandHistory.slice(0, review.historyIndex);
    const previous = entries.at(-1);
    if (
      command.groupKey &&
      previous?.groupKey === command.groupKey &&
      previous.type === command.type
    ) {
      entries[entries.length - 1] = {
        ...previous,
        updatedAt: command.createdAt,
        afterTasks,
        afterAnnotations,
        afterSelection: command.afterSelection === undefined
          ? previous.afterSelection
          : clone(command.afterSelection),
        afterAnnotationSelection:
          command.afterAnnotationSelection === undefined
            ? previous.afterAnnotationSelection
            : clone(command.afterAnnotationSelection)
      };
    } else {
      entries.push({
        historyId: command.historyId,
        type: command.type,
        createdAt: command.createdAt,
        updatedAt: command.createdAt,
        groupKey: command.groupKey || null,
        beforeTasks,
        afterTasks,
        beforeAnnotations,
        afterAnnotations,
        beforeSelection: clone(command.beforeSelection ?? null),
        afterSelection: clone(command.afterSelection ?? null),
        beforeAnnotationSelection: clone(
          command.beforeAnnotationSelection ?? null
        ),
        afterAnnotationSelection: clone(
          command.afterAnnotationSelection ?? null
        ),
        metadata: clone(command.metadata || {}),
        beforeStatus: command.beforeStatus,
        afterStatus: command.afterStatus
      });
    }
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }
    review.commandHistory = entries;
    review.historyIndex = entries.length;
    if (beforeAnnotations !== undefined || afterAnnotations !== undefined) {
      review.commandHistoryVersion = "2.0.0";
    }
    return review;
  }

  function canUndo(review) {
    ensure(review);
    return review.historyIndex > 0;
  }

  function canRedo(review) {
    ensure(review);
    return review.historyIndex < review.commandHistory.length;
  }

  function directionFromKey(event) {
    if (!(event.ctrlKey || event.metaKey)) return null;
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) return "undo";
    if (key === "y" || (key === "z" && event.shiftKey)) return "redo";
    return null;
  }

  function restore(review, direction) {
    ensure(review);
    if (direction === "undo" && !canUndo(review)) return null;
    if (direction === "redo" && !canRedo(review)) return null;
    const entryIndex = direction === "undo"
      ? review.historyIndex - 1
      : review.historyIndex;
    const entry = review.commandHistory[entryIndex];
    review.tasks = snapshot(
      direction === "undo" ? entry.beforeTasks : entry.afterTasks
    );
    const annotations = direction === "undo"
      ? entry.beforeAnnotations
      : entry.afterAnnotations;
    if (annotations !== undefined) review.annotations = clone(annotations);
    if (entry.beforeStatus !== undefined || entry.afterStatus !== undefined) {
      review.status = direction === "undo" ? entry.beforeStatus : entry.afterStatus;
    }
    review.historyIndex += direction === "undo" ? -1 : 1;
    review.updatedAt = new Date().toISOString();
    return {
      review,
      entry,
      selection: clone(
        direction === "undo" ? entry.beforeSelection : entry.afterSelection
      ),
      annotationSelection: clone(
        direction === "undo"
          ? entry.beforeAnnotationSelection
          : entry.afterAnnotationSelection
      )
    };
  }

  return {
    MAX_ENTRIES,
    canRedo,
    canUndo,
    directionFromKey,
    ensure,
    record,
    redo: review => restore(review, "redo"),
    snapshot,
    undo: review => restore(review, "undo")
  };
});
