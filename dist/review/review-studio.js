(function (root, factory) {
  const moveEngine = typeof module === "object" && module.exports
    ? require("./review-move")
    : root.T9ReviewMove;
  const mergeEngine = typeof module === "object" && module.exports
    ? require("./review-merge")
    : root.T9ReviewMerge;
  const splitEngine = typeof module === "object" && module.exports
    ? require("./review-split")
    : root.T9ReviewSplit;
  const historyEngine = typeof module === "object" && module.exports
    ? require("./review-history")
    : root.T9ReviewHistory;
  const textFormat = typeof module === "object" && module.exports
    ? require("../engine/text-format")
    : root.T9TextFormat;
  const annotations = typeof module === "object" && module.exports
    ? require("./review-annotations")
    : root.T9ReviewAnnotations;
  const stepEditor = typeof module === "object" && module.exports
    ? require("./step-editor")
    : root.T9StepEditor;
  const api = factory(
    moveEngine,
    mergeEngine,
    splitEngine,
    historyEngine,
    textFormat,
    annotations,
    stepEditor
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Review = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  moveEngine,
  mergeEngine,
  splitEngine,
  historyEngine,
  textFormat,
  annotations,
  stepEditor
) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeTasks(tasks, options = {}) {
    const usedIds = new Set();
    return (tasks || []).map((task, index) => {
      const baseId = task.taskId || `ReviewTask-${index + 1}`;
      let taskId = baseId;
      let suffix = 2;
      while (usedIds.has(taskId)) {
        taskId = `${baseId}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(taskId);
      const instruction = textFormat.quoteEmphasis(
        task.instruction || task.description || "Utför uppgiften."
      );
      const screenshots = task.screenshots?.length
        ? [...task.screenshots] : task.screenshot ? [task.screenshot] : [];
      const derivedStep = task.derivedStep || {
        title: task.title || task.stepTitle || "",
        instruction: textFormat.quoteEmphasis(
          task.originalInstruction || instruction
        ),
        comment: "",
        sourceScreenshotAssetIds: screenshots,
        selectedScreenshotAssetId: screenshots[0] || null,
        visibility: "visible"
      };
      let stepOverride = stepEditor.normalizeOverride(task.stepOverride, task);
      if (!stepOverride && task.originalInstruction &&
          textFormat.quoteEmphasis(task.originalInstruction) !== instruction) {
        stepOverride = stepEditor.edit(
          { ...task, taskId, derivedStep }, "instruction", instruction,
          { now: task.updatedAt || task.createdAt }
        );
      }
      if (!stepOverride && task.userComment) {
        stepOverride = stepEditor.edit(
          { ...task, taskId, derivedStep }, "comment", task.userComment,
          { now: task.updatedAt || task.createdAt }
        );
      }
      return {
        ...clone(task),
        taskId,
        taskNo: index + 1,
        reviewStatus: task.reviewStatus || "unreviewed",
        approved: Boolean(task.approved),
        deleted: Boolean(task.deleted),
        userComment: task.userComment || "",
        originalInstruction: textFormat.quoteEmphasis(
          task.originalInstruction ||
          task.instruction ||
          ""
        ),
        instruction,
        screenshots,
        derivedStep,
        stepOverride,
        legacyFullCopy: task.legacyFullCopy ?? !options.modern
      };
    });
  }

  function createReview(session, tasks) {
    const now = new Date().toISOString();
    return {
      reviewVersion: "1.0.0",
      sessionId: session.id,
      sessionName: session.name,
      createdAt: now,
      updatedAt: now,
      status: "in-progress",
      reviewer: "",
      notes: "",
      historyVersion: "1.0.0",
      history: [],
      commandHistoryVersion: "1.0.0",
      commandHistory: [],
      historyIndex: 0,
      annotations: annotations.emptyStore(),
      tasks: normalizeTasks(tasks, { modern: true })
    };
  }

  function renumber(review) {
    review.tasks = review.tasks.map((task, index) => ({
      ...task,
      taskNo: index + 1
    }));
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function record(review, type, beforeTasks, options = {}) {
    const createdAt = options.now || new Date().toISOString();
    historyEngine.record(review, {
      historyId: options.commandHistoryId || `${type}-${createdAt}`,
      type,
      createdAt,
      groupKey: options.groupKey,
      beforeTasks,
      afterTasks: review.tasks,
      beforeSelection: options.beforeSelection,
      afterSelection: options.afterSelection,
      metadata: options.metadata,
      beforeStatus: options.beforeStatus === undefined
        ? review.status
        : options.beforeStatus,
      afterStatus: review.status
    });
    return review;
  }

  function recordAnnotationChange(
    review,
    type,
    beforeAnnotations,
    options = {}
  ) {
    const createdAt = options.now || new Date().toISOString();
    historyEngine.record(review, {
      historyId: options.commandHistoryId || `${type}-${createdAt}`,
      type,
      createdAt,
      groupKey: options.groupKey,
      beforeTasks: review.tasks,
      afterTasks: review.tasks,
      beforeAnnotations,
      afterAnnotations: review.annotations,
      beforeAnnotationSelection: options.beforeAnnotationSelection,
      afterAnnotationSelection: options.afterAnnotationSelection,
      metadata: options.metadata,
      beforeStatus: review.status,
      afterStatus: review.status
    });
    return review;
  }

  function addAnnotation(review, screenshotRef, annotation, options = {}) {
    const beforeAnnotations = historyEngine.snapshot(review.annotations);
    const added = annotations.add(review, screenshotRef, annotation, options);
    recordAnnotationChange(review, "annotation-add", beforeAnnotations, options);
    return added;
  }

  function updateAnnotation(
    review,
    screenshotRef,
    annotationId,
    patch,
    options = {}
  ) {
    const beforeAnnotations = historyEngine.snapshot(review.annotations);
    const updated = annotations.update(
      review,
      screenshotRef,
      annotationId,
      patch,
      options
    );
    if (updated) {
      recordAnnotationChange(
        review,
        options.type || "annotation-update",
        beforeAnnotations,
        options
      );
    }
    return updated;
  }

  function removeAnnotation(
    review,
    screenshotRef,
    annotationId,
    options = {}
  ) {
    const beforeAnnotations = historyEngine.snapshot(review.annotations);
    const removed = annotations.remove(
      review,
      screenshotRef,
      annotationId,
      options
    );
    if (removed) {
      recordAnnotationChange(
        review,
        "annotation-delete",
        beforeAnnotations,
        options
      );
    }
    return removed;
  }

  function move(review, index, delta, options = {}) {
    const task = review.tasks[index];
    if (!task) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    review.tasks = moveEngine.moveByOffset(
      review.tasks,
      [task.taskId],
      delta
    );
    renumber(review);
    return record(review, "move", beforeTasks, options);
  }

  function reorder(review, tasks, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    review.tasks = tasks;
    renumber(review);
    return record(review, "move", beforeTasks, options);
  }

  function remove(review, index, options = {}) {
    if (!review.tasks[index]) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    review.tasks.splice(index, 1);
    renumber(review);
    return record(review, "delete", beforeTasks, options);
  }

  function removeTasks(review, taskIds, options = {}) {
    const removed = new Set(taskIds || []);
    if (!review.tasks.some(task => removed.has(task.taskId))) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    review.tasks = review.tasks.filter(task => !removed.has(task.taskId));
    renumber(review);
    return record(review, "delete", beforeTasks, options);
  }

  function add(review, afterIndex = review.tasks.length - 1, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const newTask = {
      taskId: `Manual-${Date.now()}-${review.tasks.length + 1}`,
      taskNo: 0,
      taskType: "Manual",
      semanticAction: "Manual",
      instruction: "Nytt manuellt steg.",
      originalInstruction: "",
      pageCaption: "",
      actionCaption: "",
      fieldCaption: "",
      selectedCaption: "",
      screenshot: null,
      confidenceScore: 100,
      reviewStatus: "edited",
      approved: false,
      deleted: false,
      userComment: "",
      manuallyAdded: true,
      sourceEventNos: []
    };

    review.tasks.splice(afterIndex + 1, 0, newTask);
    renumber(review);
    return record(review, "add", beforeTasks, options);
  }

  function updateTask(review, index, patch) {
    const task = review.tasks[index];
    const now = new Date().toISOString();
    let stepOverride = task.stepOverride || null;
    if (patch.instruction !== undefined) {
      stepOverride = stepEditor.edit(
        { ...task, stepOverride }, "instruction", patch.instruction, { now }
      );
    }
    if (patch.userComment !== undefined) {
      stepOverride = stepEditor.edit(
        { ...task, stepOverride }, "comment", patch.userComment, { now }
      );
    }
    if (patch.title !== undefined) {
      stepOverride = stepEditor.edit(
        { ...task, stepOverride }, "title", patch.title, { now }
      );
    }
    review.tasks[index] = {
      ...task,
      ...patch,
      stepOverride,
      reviewStatus:
        patch.instruction !== undefined ||
        patch.userComment !== undefined
          ? "edited"
          : review.tasks[index].reviewStatus
    };
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function editTask(review, index, patch, options = {}) {
    if (!review.tasks[index]) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    updateTask(review, index, patch);
    return record(review, "edit", beforeTasks, options);
  }

  function approveTask(review, index, approved, options = {}) {
    if (!review.tasks[index]) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    updateTask(review, index, {
      approved: Boolean(approved),
      reviewStatus: approved ? "approved" : "unreviewed"
    });
    return record(review, "approve", beforeTasks, options);
  }

  function approveAll(review, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    review.tasks = review.tasks.map(task => ({
      ...task,
      approved: true,
      reviewStatus: "approved"
    }));
    review.updatedAt = new Date().toISOString();
    return record(review, "approve-all", beforeTasks, options);
  }

  function complete(review, options = {}) {
    if (!canComplete(review)) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeStatus = review.status;
    review.status = "completed";
    review.updatedAt = new Date().toISOString();
    review.tasks = review.tasks.map(task => ({
      ...task,
      approved: true,
      reviewStatus: "approved"
    }));
    return record(review, "complete", beforeTasks, { ...options, beforeStatus });
  }

  function merge(review, selectedIds, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const result = mergeEngine.merge(review.tasks, selectedIds, options);
    if (!result.mergedTask) return { review, mergedTask: null };
    result.mergedTask.derivedStep = {
      title: result.mergedTask.title || "",
      instruction: result.mergedTask.instruction,
      comment: result.mergedTask.userComment || "",
      sourceScreenshotAssetIds: [...(result.mergedTask.screenshots || [])],
      selectedScreenshotAssetId: result.mergedTask.screenshots?.[0] || null,
      visibility: "visible"
    };
    result.mergedTask.stepOverride = null;
    result.mergedTask.legacyFullCopy = false;
    review.tasks = result.tasks;
    review.historyVersion = review.historyVersion || "1.0.0";
    review.history = [...(review.history || []), result.historyEntry];
    renumber(review);
    record(review, "merge", beforeTasks, {
      ...options,
      afterSelection: {
        selectedIds: [result.mergedTask.taskId],
        activeId: result.mergedTask.taskId,
        anchorId: result.mergedTask.taskId
      },
      metadata: result.historyEntry
    });
    return { review, mergedTask: result.mergedTask };
  }

  function split(review, taskId, specification, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const result = splitEngine.split(
      review.tasks,
      taskId,
      specification,
      options
    );
    if (!result.splitTasks.length) return { review, splitTasks: [] };
    result.splitTasks.forEach(task => {
      task.derivedStep = {
        title: task.title || "",
        instruction: task.instruction,
        comment: task.userComment || "",
        sourceScreenshotAssetIds: [...(task.screenshots || [])],
        selectedScreenshotAssetId: task.screenshots?.[0] || null,
        visibility: "visible"
      };
      task.stepOverride = null;
      task.legacyFullCopy = false;
    });
    review.tasks = result.tasks;
    review.historyVersion = review.historyVersion || "1.0.0";
    review.history = [...(review.history || []), result.historyEntry];
    renumber(review);
    const createdIds = result.splitTasks.map(task => task.taskId);
    record(review, "split", beforeTasks, {
      ...options,
      afterSelection: {
        selectedIds: createdIds,
        activeId: createdIds[0],
        anchorId: createdIds[0]
      },
      metadata: result.historyEntry
    });
    return { review, splitTasks: result.splitTasks };
  }

  function activeTasks(review) {
    return review.tasks.map(stepEditor.resolve).filter(task => !task.deleted);
  }

  function resetTaskField(review, index, field, options = {}) {
    if (!review.tasks[index]) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    review.tasks[index].stepOverride = stepEditor.reset(
      review.tasks[index], field, options
    );
    review.updatedAt = options.now || new Date().toISOString();
    return record(review, "step-reset", beforeTasks, options);
  }

  function selectTaskScreenshot(review, index, assetId, options = {}) {
    if (!review.tasks[index]) return { review, ok: false, reason: "missing-step" };
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const result = stepEditor.selectScreenshot(
      review.tasks[index], assetId, review, options
    );
    if (!result.ok) return { review, ...result };
    review.tasks[index].stepOverride = result.override;
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "step-screenshot", beforeTasks, options);
    return { review, ok: true };
  }

  function setTaskHidden(review, index, hidden, options = {}) {
    if (!review.tasks[index]) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    review.tasks[index].stepOverride = stepEditor.setVisibility(
      review.tasks[index], hidden, options
    );
    review.updatedAt = options.now || new Date().toISOString();
    return record(review, "step-visibility", beforeTasks, options);
  }

  function canComplete(review) {
    const tasks = activeTasks(review);
    return tasks.length > 0 && tasks.every(task => task.approved);
  }

  function progress(review) {
    const tasks = activeTasks(review);
    if (!tasks.length) return 0;
    return Math.round(
      tasks.filter(task => task.approved).length /
      tasks.length * 100
    );
  }

  return {
    createReview,
    normalizeReview: annotations.normalizeReview,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    normalizeTasks,
    renumber,
    move,
    reorder,
    remove,
    removeTasks,
    add,
    updateTask,
    editTask,
    resetTaskField,
    selectTaskScreenshot,
    setTaskHidden,
    resolveTask: stepEditor.resolve,
    approveTask,
    approveAll,
    complete,
    merge,
    split,
    canUndo: historyEngine.canUndo,
    canRedo: historyEngine.canRedo,
    undo: historyEngine.undo,
    redo: historyEngine.redo,
    historyDirectionFromKey: historyEngine.directionFromKey,
    activeTasks,
    canComplete,
    progress
  };
});
