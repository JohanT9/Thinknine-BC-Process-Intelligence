(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewHistory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_ENTRIES = 100;

  // Same result as a JSON round trip, without re-serializing strings (engine/json-clone.js).
  const jsonClone = typeof module === "object" && module.exports
    ? require("../engine/json-clone") : globalThis.T9JsonClone;

  function clone(value) {
    return jsonClone.clone(value);
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

  // An entry stores the steps in their order before and after the command, but the content of
  // only the steps the command added, removed or changed. Undo and redo take every other step
  // from the current steps, which are the entry's other side. Full copies of every step made a
  // review grow by megabytes per edit. Entries without stable unique step IDs keep full copies.
  const TASK_DELTA = "task-delta";

  function taskIds(tasks) {
    const ids = (Array.isArray(tasks) ? tasks : []).map(task => task?.taskId);
    if (ids.some(id => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) {
      return null;
    }
    return ids;
  }

  function taskDelta(beforeTasks, afterTasks) {
    const before = Array.isArray(beforeTasks) ? beforeTasks : [];
    const after = Array.isArray(afterTasks) ? afterTasks : [];
    const beforeTaskOrder = taskIds(before);
    const afterTaskOrder = taskIds(after);
    if (!beforeTaskOrder || !afterTaskOrder) return null;
    const beforeText = new Map(before.map(task => [task.taskId, JSON.stringify(task)]));
    const afterText = new Map(after.map(task => [task.taskId, JSON.stringify(task)]));
    return {
      taskStorage: TASK_DELTA,
      beforeTaskOrder,
      afterTaskOrder,
      beforeTasks: before.filter(task => afterText.get(task.taskId) !== beforeText.get(task.taskId))
        .map(task => JSON.parse(beforeText.get(task.taskId))),
      afterTasks: after.filter(task => beforeText.get(task.taskId) !== afterText.get(task.taskId))
        .map(task => JSON.parse(afterText.get(task.taskId)))
    };
  }

  function fullTaskStorage(beforeTasks, afterTasks) {
    return { beforeTasks: snapshot(beforeTasks), afterTasks: snapshot(afterTasks) };
  }

  function sameTasks(storage) {
    if (storage.taskStorage === TASK_DELTA) {
      return !storage.beforeTasks.length && !storage.afterTasks.length &&
        storage.beforeTaskOrder.join("\u001f") === storage.afterTaskOrder.join("\u001f");
    }
    return JSON.stringify(storage.beforeTasks) === JSON.stringify(storage.afterTasks);
  }

  // The steps on one side of an entry, given the steps on its other side. Null when a step that
  // the entry did not store is missing from those steps.
  function entryTasks(entry, side, otherSideTasks) {
    if (entry?.taskStorage !== TASK_DELTA) return snapshot(entry?.[`${side}Tasks`]);
    const stored = new Map((entry[`${side}Tasks`] || []).map(task => [task.taskId, task]));
    const other = new Map((Array.isArray(otherSideTasks) ? otherSideTasks : [])
      .map(task => [task?.taskId, task]));
    const tasks = (entry[`${side}TaskOrder`] || []).map(id => stored.get(id) || other.get(id));
    return tasks.every(Boolean) ? snapshot(tasks) : null;
  }

  function unchangedIdsPresent(storage, side, tasks) {
    const changed = new Set(storage[`${side}Tasks`].map(task => task.taskId));
    const present = new Set((Array.isArray(tasks) ? tasks : []).map(task => task?.taskId));
    return storage[`${side}TaskOrder`].every(id => changed.has(id) || present.has(id));
  }

  // Converts entries with full copies, from the current position outwards, as long as the steps
  // they did not change exist where undo or redo would take them from.
  function compact(review) {
    ensure(review);
    const entries = review.commandHistory;
    const isFull = entry => entry && entry.taskStorage !== TASK_DELTA &&
      (Array.isArray(entry.beforeTasks) || Array.isArray(entry.afterTasks));
    if (!entries.some(isFull)) return review;
    // restored: the side undo ("before") or redo ("after") restores, starting from anchor.
    const convert = (index, restored, anchor) => {
      const entry = entries[index];
      if (!isFull(entry)) return entryTasks(entry, restored, anchor);
      const storage = taskDelta(entry.beforeTasks, entry.afterTasks);
      if (storage && unchangedIdsPresent(storage, restored, anchor)) {
        entries[index] = { ...entry, ...storage };
      }
      return entry[`${restored}Tasks`];
    };
    let anchor = review.tasks;
    for (let index = review.historyIndex - 1; index >= 0 && anchor; index -= 1) {
      anchor = convert(index, "before", anchor);
    }
    anchor = review.tasks;
    for (let index = review.historyIndex; index < entries.length && anchor; index += 1) {
      anchor = convert(index, "after", anchor);
    }
    return review;
  }

  function groupedMetadata(previous, current) {
    if (current === undefined) return previous;
    const before = previous?.correctionFeedback;
    const after = current?.correctionFeedback;
    if (!before || !after) return clone(current);
    return clone({
      ...previous,
      ...current,
      correctionFeedback: {
        ...before,
        ...after,
        affectedFields: [...new Set([
          ...(before.affectedFields || []), ...(after.affectedFields || [])
        ])].sort(),
        engineAttributed: Boolean(before.engineAttributed || after.engineAttributed),
        processFindingCodes: [...new Set([
          ...(before.processFindingCodes || []),
          ...(after.processFindingCodes || [])
        ])].sort(),
        affectedStepCount: Math.max(
          before.affectedStepCount || 0, after.affectedStepCount || 0
        )
      }
    });
  }

  function record(review, command) {
    compact(review);
    const taskStorage = taskDelta(command.beforeTasks, command.afterTasks) ||
      fullTaskStorage(command.beforeTasks, command.afterTasks);
    const beforeAnnotations = command.beforeAnnotations === undefined
      ? undefined
      : clone(command.beforeAnnotations);
    const afterAnnotations = command.afterAnnotations === undefined
      ? undefined
      : clone(command.afterAnnotations);
    const beforeStructureOverrides = command.beforeStructureOverrides === undefined
      ? undefined : clone(command.beforeStructureOverrides);
    const afterStructureOverrides = command.afterStructureOverrides === undefined
      ? undefined : clone(command.afterStructureOverrides);
    const beforeManualSteps = command.beforeManualSteps === undefined
      ? undefined : clone(command.beforeManualSteps);
    const afterManualSteps = command.afterManualSteps === undefined
      ? undefined : clone(command.afterManualSteps);
    const beforeStepNotes = command.beforeStepNotes === undefined
      ? undefined : clone(command.beforeStepNotes);
    const afterStepNotes = command.afterStepNotes === undefined
      ? undefined : clone(command.afterStepNotes);
    const beforeHierarchy = command.beforeHierarchy === undefined
      ? undefined : clone(command.beforeHierarchy);
    const afterHierarchy = command.afterHierarchy === undefined
      ? undefined : clone(command.afterHierarchy);
    const beforeDocumentFields = command.beforeDocumentFields === undefined
      ? undefined : clone(command.beforeDocumentFields);
    const afterDocumentFields = command.afterDocumentFields === undefined
      ? undefined : clone(command.afterDocumentFields);
    const beforeGeneratedTasks = command.beforeGeneratedTasks === undefined
      ? undefined : clone(command.beforeGeneratedTasks);
    const afterGeneratedTasks = command.afterGeneratedTasks === undefined
      ? undefined : clone(command.afterGeneratedTasks);
    if (
      sameTasks(taskStorage) &&
      command.beforeStatus === command.afterStatus &&
      JSON.stringify(beforeAnnotations) === JSON.stringify(afterAnnotations) &&
      JSON.stringify(beforeStructureOverrides) ===
        JSON.stringify(afterStructureOverrides) &&
      JSON.stringify(beforeManualSteps) === JSON.stringify(afterManualSteps) &&
      JSON.stringify(beforeStepNotes) === JSON.stringify(afterStepNotes) &&
      JSON.stringify(beforeHierarchy) === JSON.stringify(afterHierarchy) &&
      JSON.stringify(beforeDocumentFields) === JSON.stringify(afterDocumentFields) &&
      JSON.stringify(beforeGeneratedTasks) === JSON.stringify(afterGeneratedTasks)
    ) {
      return review;
    }
    let entries = review.commandHistory.slice(0, review.historyIndex);
    const previous = entries.at(-1);
    // A grouped command extends the previous entry: its steps before stay those before the group.
    const groupedBefore = command.groupKey && previous?.groupKey === command.groupKey &&
      previous.type === command.type
      ? entryTasks(previous, "before", command.beforeTasks) : null;
    if (groupedBefore) {
      const { taskStorage: _storage, beforeTaskOrder: _beforeOrder,
        afterTaskOrder: _afterOrder, ...rest } = previous;
      entries[entries.length - 1] = {
        ...rest,
        ...(taskDelta(groupedBefore, command.afterTasks) ||
          fullTaskStorage(groupedBefore, command.afterTasks)),
        updatedAt: command.createdAt,
        afterAnnotations,
        afterStructureOverrides,
        afterManualSteps,
        afterStepNotes,
        afterHierarchy,
        afterDocumentFields,
        afterGeneratedTasks,
        afterSelection: command.afterSelection === undefined
          ? previous.afterSelection
          : clone(command.afterSelection),
        afterAnnotationSelection:
          command.afterAnnotationSelection === undefined
            ? previous.afterAnnotationSelection
            : clone(command.afterAnnotationSelection),
        metadata: groupedMetadata(previous.metadata, command.metadata)
      };
    } else {
      entries.push({
        historyId: command.historyId,
        type: command.type,
        createdAt: command.createdAt,
        updatedAt: command.createdAt,
        groupKey: command.groupKey || null,
        ...taskStorage,
        beforeAnnotations,
        afterAnnotations,
        beforeStructureOverrides,
        afterStructureOverrides,
        beforeManualSteps,
        afterManualSteps,
        beforeStepNotes,
        afterStepNotes,
        beforeHierarchy,
        afterHierarchy,
        beforeDocumentFields,
        afterDocumentFields,
        beforeGeneratedTasks,
        afterGeneratedTasks,
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
    const tasks = entryTasks(entry, direction === "undo" ? "before" : "after", review.tasks);
    if (!tasks) return null;
    review.tasks = tasks;
    const annotations = direction === "undo"
      ? entry.beforeAnnotations
      : entry.afterAnnotations;
    if (annotations !== undefined) review.annotations = clone(annotations);
    const structureOverrides = direction === "undo"
      ? entry.beforeStructureOverrides : entry.afterStructureOverrides;
    if (structureOverrides !== undefined) {
      review.structureOverrides = clone(structureOverrides);
    }
    const manualSteps = direction === "undo"
      ? entry.beforeManualSteps : entry.afterManualSteps;
    if (manualSteps !== undefined) review.manualSteps = clone(manualSteps);
    const stepNotes = direction === "undo"
      ? entry.beforeStepNotes : entry.afterStepNotes;
    if (stepNotes !== undefined) review.stepNotes = clone(stepNotes);
    const hierarchy = direction === "undo"
      ? entry.beforeHierarchy : entry.afterHierarchy;
    if (hierarchy !== undefined) review.hierarchy = clone(hierarchy);
    const documentFields = direction === "undo"
      ? entry.beforeDocumentFields : entry.afterDocumentFields;
    if (documentFields !== undefined) review.documentFields = clone(documentFields);
    const generatedTasks = direction === "undo"
      ? entry.beforeGeneratedTasks : entry.afterGeneratedTasks;
    if (generatedTasks !== undefined) review.generatedTasks = clone(generatedTasks);
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
    compact,
    directionFromKey,
    ensure,
    entryTasks,
    record,
    redo: review => restore(review, "redo"),
    snapshot,
    undo: review => restore(review, "undo")
  };
});
