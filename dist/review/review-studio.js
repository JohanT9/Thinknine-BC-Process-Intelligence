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
  const structure = typeof module === "object" && module.exports
    ? require("./step-structure-overrides")
    : root.T9StepStructureOverrides;
  const manual = typeof module === "object" && module.exports
    ? require("./manual-information-steps")
    : root.T9ManualInformationSteps;
  const notes = typeof module === "object" && module.exports
    ? require("./review-notes")
    : root.T9ReviewNotes;
  const hierarchy = typeof module === "object" && module.exports
    ? require("./documentation-hierarchy")
    : root.T9DocumentationHierarchy;
  const api = factory(
    moveEngine,
    mergeEngine,
    splitEngine,
    historyEngine,
    textFormat,
    annotations,
    stepEditor,
    structure,
    manual,
    notes,
    hierarchy
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
  stepEditor,
  structure,
  manual,
  notes,
  hierarchy
) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureGeneratedStructure(review) {
    review.structureOverrides = Array.isArray(review.structureOverrides)
      ? review.structureOverrides : [];
    review.generatedTasks = Array.isArray(review.generatedTasks)
      ? review.generatedTasks : clone(review.tasks || []);
    review.structureOverrideVersion = review.structureOverrideVersion || "1.0.0";
    return review;
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
    const normalizedTasks = normalizeTasks(tasks, { modern: true });
    const initialNotes = normalizedTasks.filter(task => task.userComment)
      .map(task => notes.create({ recordingId: session.id,
        ownerType: "step", ownerId: task.stepId || task.taskId,
        content: task.userComment, now }));
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
      structureOverrideVersion: "1.0.0",
      structureOverrides: [],
      manualStepVersion: "1.0.0",
      manualSteps: [],
      noteModelVersion: "1.0.0",
      stepNotes: initialNotes,
      hierarchy: hierarchy.empty(session.id),
      generatedTasks: clone(normalizedTasks),
      tasks: normalizedTasks
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
      beforeStructureOverrides: options.beforeStructureOverrides,
      afterStructureOverrides: review.structureOverrides,
      beforeManualSteps: options.beforeManualSteps,
      afterManualSteps: review.manualSteps,
      beforeStepNotes: options.beforeStepNotes,
      afterStepNotes: review.stepNotes,
      beforeHierarchy: options.beforeHierarchy,
      afterHierarchy: review.hierarchy,
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
    const beforeManualSteps = historyEngine.snapshot(review.manualSteps || []);
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    review.tasks = tasks;
    if (review.hierarchy?.assignments?.length) {
      review.hierarchy = hierarchy.reorder(review.hierarchy, "step",
        tasks.map(task => task.stepId || task.taskId), options);
    }
    review.manualSteps = (review.manualSteps || []).map(item => {
      const index = tasks.findIndex(task => task.manualStepId === item.manualStepId);
      if (index < 0) return item;
      const previous = tasks.slice(0, index).reverse().find(task =>
        !task.manualStepId
      );
      return manual.update(item, { positionAnchor: previous
        ? { relation: "after", targetStepId: previous.stepId || previous.taskId,
          sectionId: "workflow" }
        : { relation: "section-start", sectionId: "workflow" }
      });
    });
    renumber(review);
    return record(review, "move", beforeTasks, {
      ...options, beforeManualSteps, beforeHierarchy
    });
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
    const beforeManualSteps = historyEngine.snapshot(review.manualSteps || []);
    const target = review.tasks[afterIndex];
    const manualStep = manual.create({
      recordingId: review.sessionId,
      manualStepId: options.manualStepId,
      now: options.now,
      nonce: String((review.manualSteps || []).length + 1),
      stepType: options.stepType || "information",
      instruction: options.instruction || "Nytt manuellt steg.",
      positionAnchor: target
        ? { relation: "after", targetStepId: target.stepId || target.taskId,
          sectionId: "workflow" }
        : { relation: "section-end", sectionId: "workflow" }
    });
    review.manualSteps = [...(review.manualSteps || []), manualStep];
    const newTask = {
      ...manual.project(manualStep),
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
      manuallyAdded: true
    };

    review.tasks.splice(afterIndex + 1, 0, newTask);
    renumber(review);
    return record(review, "manual-step-create", beforeTasks, {
      ...options, beforeManualSteps
    });
  }

  function updateTask(review, index, patch) {
    const task = review.tasks[index];
    const now = new Date().toISOString();
    if (patch.userComment !== undefined) {
      const ownerId = task.stepId || task.taskId;
      const noteIndex = (review.stepNotes || []).findIndex(note =>
        note.ownerType === "step" && note.ownerId === ownerId
      );
      if (patch.userComment) {
        const value = noteIndex >= 0
          ? notes.update(review.stepNotes[noteIndex], {
            content: patch.userComment }, { now })
          : notes.create({ recordingId: review.sessionId,
            ownerType: "step", ownerId, content: patch.userComment, now });
        review.stepNotes = [...(review.stepNotes || [])];
        if (noteIndex >= 0) review.stepNotes[noteIndex] = value;
        else review.stepNotes.push(value);
      } else if (noteIndex >= 0) {
        review.stepNotes = review.stepNotes.filter((_, itemIndex) =>
          itemIndex !== noteIndex
        );
      }
    }
    if (task.manualStepId) {
      const manualIndex = (review.manualSteps || []).findIndex(item =>
        item.manualStepId === task.manualStepId
      );
      if (manualIndex >= 0) {
        const manualPatch = {};
        if (patch.instruction !== undefined) {
          manualPatch.instruction = patch.instruction;
        }
        if (patch.userComment !== undefined) manualPatch.comment = patch.userComment;
        if (patch.title !== undefined) manualPatch.title = patch.title;
        if (patch.callout !== undefined) manualPatch.callout = patch.callout;
        if (patch.manualCallout !== undefined) {
          manualPatch.callout = patch.manualCallout
            ? { type: patch.stepType || task.stepType || "information",
              text: patch.manualCallout }
            : null;
        }
        if (patch.stepType !== undefined) manualPatch.stepType = patch.stepType;
        review.manualSteps[manualIndex] = manual.update(
          review.manualSteps[manualIndex], manualPatch, { now }
        );
      }
    }
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
    const compatibilityPatch = { ...patch };
    if (patch.manualCallout !== undefined) {
      compatibilityPatch.callout = patch.manualCallout
        ? { type: patch.stepType || task.stepType || "information",
          text: patch.manualCallout } : null;
      delete compatibilityPatch.manualCallout;
    }
    review.tasks[index] = {
      ...task,
      ...compatibilityPatch,
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
    const beforeManualSteps = historyEngine.snapshot(review.manualSteps || []);
    const beforeStepNotes = historyEngine.snapshot(review.stepNotes || []);
    updateTask(review, index, patch);
    return record(review, "edit", beforeTasks, {
      ...options, beforeManualSteps, beforeStepNotes
    });
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
    ensureGeneratedStructure(review);
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeStructureOverrides = historyEngine.snapshot(
      review.structureOverrides || []
    );
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    const locations = selectedIds.map(stepId =>
      review.hierarchy?.assignments?.find(item => item.stepId === stepId)
    ).filter(Boolean);
    if (new Set(locations.map(item => `${item.sectionId}:${item.subtaskId || ""}`))
      .size > 1) {
      return { review, mergedTask: null, reason: "cross-hierarchy-boundary" };
    }
    const structural = structure.merge(review.tasks, selectedIds, {
      recordingId: review.sessionId,
      sequence: (review.structureOverrides || []).length,
      now: options.now
    });
    if (!structural.ok) return { review, mergedTask: null,
      reason: structural.reason };
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
    review.structureOverrides = [
      ...(review.structureOverrides || []), structural.override
    ];
    result.mergedTask.structureOverrideId = structural.override.structureOverrideId;
    result.mergedTask.stepId = structural.resolvedStepId;
    if (locations[0]) {
      const withoutSources = { ...review.hierarchy,
        assignments: review.hierarchy.assignments.filter(item =>
          !selectedIds.includes(item.stepId)
        ) };
      review.hierarchy = hierarchy.assign(withoutSources,
        [structural.resolvedStepId], locations[0].sectionId,
        locations[0].subtaskId, {
          position: Math.min(...locations.map(item => item.presentationOrder))
        }).state;
    }
    review.tasks = result.tasks;
    review.historyVersion = review.historyVersion || "1.0.0";
    review.history = [...(review.history || []), result.historyEntry];
    renumber(review);
    record(review, "merge", beforeTasks, {
      ...options,
      beforeStructureOverrides,
      beforeHierarchy,
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
    ensureGeneratedStructure(review);
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeStructureOverrides = historyEngine.snapshot(
      review.structureOverrides || []
    );
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    const source = review.tasks.find(task => task.taskId === taskId);
    const sourceIdentity = source?.stepId || source?.taskId;
    const location = review.hierarchy?.assignments?.find(item =>
      item.stepId === sourceIdentity
    );
    const result = splitEngine.split(
      review.tasks,
      taskId,
      specification,
      options
    );
    if (!result.splitTasks.length) return { review, splitTasks: [] };
    const sourceEvents = structure.eventIds(source);
    const partitions = result.splitTasks.map((task, index) => ({
      partitionId: task.taskId,
      sourceEventIds: sourceEvents.filter((eventId, eventIndex) =>
        eventIndex % result.splitTasks.length === index
      ),
      instruction: task.instruction
    }));
    const structural = structure.split(source, partitions, {
      recordingId: review.sessionId,
      sequence: (review.structureOverrides || []).length,
      now: options.now
    });
    if (!structural.ok) return { review, splitTasks: [], reason: structural.reason };
    review.structureOverrides = [
      ...(review.structureOverrides || []), structural.override
    ];
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
      const partitionIndex = result.splitTasks.indexOf(task);
      task.sourceStepIds = [taskId];
      task.sourceEventIds = [...partitions[partitionIndex].sourceEventIds];
      task.structureOverrideId = structural.override.structureOverrideId;
      task.stepId = structural.resolvedStepIds[partitionIndex];
    });
    if (location) {
      const withoutSource = { ...review.hierarchy,
        assignments: review.hierarchy.assignments.filter(item =>
          item.stepId !== sourceIdentity
        ) };
      review.hierarchy = hierarchy.assign(withoutSource,
        structural.resolvedStepIds, location.sectionId, location.subtaskId, {
          position: location.presentationOrder
        }).state;
    }
    review.tasks = result.tasks;
    review.historyVersion = review.historyVersion || "1.0.0";
    review.history = [...(review.history || []), result.historyEntry];
    renumber(review);
    const createdIds = result.splitTasks.map(task => task.taskId);
    record(review, "split", beforeTasks, {
      ...options,
      beforeStructureOverrides,
      beforeHierarchy,
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
    ensureGeneratedStructure(review);
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeStructureOverrides = historyEngine.snapshot(
      review.structureOverrides || []
    );
    const beforeManualSteps = historyEngine.snapshot(review.manualSteps || []);
    if (review.tasks[index].manualStepId) {
      const manualIndex = (review.manualSteps || []).findIndex(item =>
        item.manualStepId === review.tasks[index].manualStepId
      );
      review.manualSteps[manualIndex] = manual.update(
        review.manualSteps[manualIndex],
        { visibility: hidden ? "hidden" : "visible" }, options
      );
      review.tasks[index] = { ...review.tasks[index],
        deleted: Boolean(hidden), visibility: hidden ? "hidden" : "visible" };
      review.updatedAt = options.now || new Date().toISOString();
      return record(review, "manual-step-visibility", beforeTasks, {
        ...options, beforeStructureOverrides, beforeManualSteps
      });
    }
    if (hidden) {
      review.structureOverrides = [...(review.structureOverrides || []),
        structure.hide(review.tasks[index], {
          recordingId: review.sessionId,
          sequence: (review.structureOverrides || []).length,
          now: options.now
        })];
    } else {
      review.structureOverrides = (review.structureOverrides || []).filter(item =>
        !(item.type === "hide" && item.sourceStepIds?.includes(
          review.tasks[index].taskId
        ))
      );
    }
    review.tasks[index].stepOverride = stepEditor.setVisibility(
      review.tasks[index], hidden, options
    );
    review.updatedAt = options.now || new Date().toISOString();
    return record(review, "step-visibility", beforeTasks, {
      ...options, beforeStructureOverrides
    });
  }

  function deleteManualStep(review, manualStepId, options = {}) {
    const index = review.tasks.findIndex(task => task.manualStepId === manualStepId);
    if (index < 0) return review;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeManualSteps = historyEngine.snapshot(review.manualSteps || []);
    review.tasks.splice(index, 1);
    review.manualSteps = (review.manualSteps || []).filter(item =>
      item.manualStepId !== manualStepId
    );
    renumber(review);
    return record(review, "manual-step-delete", beforeTasks, {
      ...options, beforeManualSteps
    });
  }

  function setManualStepScreenshot(review, manualStepId, assetId, options = {}) {
    const index = review.tasks.findIndex(task => task.manualStepId === manualStepId);
    const manualIndex = (review.manualSteps || []).findIndex(item =>
      item.manualStepId === manualStepId
    );
    if (index < 0 || manualIndex < 0) {
      return { review, ok: false, reason: "missing-manual-step" };
    }
    const currentAssetId = review.manualSteps[manualIndex]
      .selectedScreenshotAssetId;
    if (currentAssetId && currentAssetId !== assetId &&
        annotations.findScreenshotSet(review.annotations, currentAssetId)
          ?.items?.length) {
      return { review, ok: false, reason: "annotation-protected" };
    }
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeManualSteps = historyEngine.snapshot(review.manualSteps);
    review.manualSteps[manualIndex] = manual.update(
      review.manualSteps[manualIndex],
      { selectedScreenshotAssetId: assetId || null }, options
    );
    review.tasks[index] = { ...review.tasks[index],
      selectedScreenshotAssetId: assetId || null,
      screenshots: assetId ? [assetId] : [],
      sourceScreenshotAssetIds: assetId ? [assetId] : [] };
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "manual-step-screenshot", beforeTasks, {
      ...options, beforeManualSteps
    });
    return { review, ok: true };
  }

  function addNote(review, ownerId, content, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeStepNotes = historyEngine.snapshot(review.stepNotes || []);
    const note = notes.create({ recordingId: review.sessionId,
      ownerType: options.ownerType || "step", ownerId,
      noteType: options.noteType || "note", content,
      createdBy: options.createdBy, now: options.now,
      futureFields: options.futureFields });
    review.stepNotes = [...(review.stepNotes || []), note];
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "note-create", beforeTasks, {
      ...options, beforeStepNotes
    });
    return note;
  }

  function updateNote(review, noteId, patch, options = {}) {
    const index = (review.stepNotes || []).findIndex(note => note.noteId === noteId);
    if (index < 0) return null;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeStepNotes = historyEngine.snapshot(review.stepNotes);
    review.stepNotes[index] = notes.update(review.stepNotes[index], patch, options);
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "note-update", beforeTasks, { ...options, beforeStepNotes });
    return review.stepNotes[index];
  }

  function removeNote(review, noteId, options = {}) {
    const existing = (review.stepNotes || []).find(note => note.noteId === noteId);
    if (!existing) return null;
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeStepNotes = historyEngine.snapshot(review.stepNotes);
    review.stepNotes = review.stepNotes.filter(note => note.noteId !== noteId);
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "note-delete", beforeTasks, { ...options, beforeStepNotes });
    return existing;
  }

  function createSection(review, title, stepIds = [], options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    const recordedOrders = Object.fromEntries(review.tasks.map((task, index) =>
      [task.stepId || task.taskId, index]
    ));
    const result = hierarchy.createSection(review.hierarchy, title, stepIds, {
      ...options, recordingId: review.sessionId, recordedOrders
    });
    review.hierarchy = result.state;
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "hierarchy-create-section", beforeTasks, {
      ...options, beforeHierarchy
    });
    return result.section;
  }

  function createSubtask(review, sectionId, title, stepIds = [], options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    const result = hierarchy.createSubtask(
      review.hierarchy, sectionId, title, stepIds,
      { ...options, recordingId: review.sessionId }
    );
    if (!result.ok) return result;
    review.hierarchy = result.state;
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "hierarchy-create-subtask", beforeTasks, {
      ...options, beforeHierarchy
    });
    return result;
  }

  function renameHierarchy(review, targetId, title, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    const result = hierarchy.rename(review.hierarchy, targetId, title, options);
    if (!result.ok) return result;
    review.hierarchy = result.state;
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "hierarchy-rename", beforeTasks, { ...options, beforeHierarchy });
    return result;
  }

  function assignHierarchy(review, stepIds, sectionId, subtaskId, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    const recordedOrders = Object.fromEntries(review.tasks.map((task, index) =>
      [task.stepId || task.taskId, index]
    ));
    const result = hierarchy.assign(review.hierarchy, stepIds, sectionId,
      subtaskId, { ...options, recordedOrders });
    if (!result.ok) return result;
    review.hierarchy = result.state;
    review.updatedAt = options.now || new Date().toISOString();
    record(review, "hierarchy-move", beforeTasks, { ...options, beforeHierarchy });
    return result;
  }

  function reorderHierarchy(review, kind, ids, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    review.hierarchy = hierarchy.reorder(review.hierarchy, kind, ids, options);
    review.updatedAt = options.now || new Date().toISOString();
    return record(review, "hierarchy-reorder", beforeTasks, {
      ...options, beforeHierarchy
    });
  }

  function resetHierarchy(review, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeHierarchy = historyEngine.snapshot(review.hierarchy);
    review.hierarchy = hierarchy.empty(review.sessionId);
    review.updatedAt = options.now || new Date().toISOString();
    return record(review, "hierarchy-reset", beforeTasks, {
      ...options, beforeHierarchy
    });
  }

  function resetStructure(review, options = {}) {
    const beforeTasks = historyEngine.snapshot(review.tasks);
    const beforeStructureOverrides = historyEngine.snapshot(
      review.structureOverrides || []
    );
    review.structureOverrides = [];
    if (Array.isArray(review.generatedTasks)) {
      const contentOverrides = (review.tasks || []).filter(task => task.stepOverride)
        .map(task => ({ taskId: task.taskId, stepId: task.stepId,
          stepOverride: historyEngine.snapshot(task.stepOverride) }));
      review.tasks = historyEngine.snapshot(review.generatedTasks).map(task => {
        const match = contentOverrides.find(item => item.taskId === task.taskId ||
          item.stepId === task.stepId);
        return match ? { ...task, stepOverride: match.stepOverride } : task;
      });
      const matched = new Set(review.tasks.filter(task => task.stepOverride)
        .map(task => task.stepOverride.overrideId));
      review.orphanedStepOverrides = [
        ...(review.orphanedStepOverrides || []),
        ...contentOverrides.map(item => item.stepOverride).filter(override =>
          !matched.has(override.overrideId)
        )
      ];
    }
    renumber(review);
    return record(review, "structure-reset", beforeTasks, {
      ...options, beforeStructureOverrides
    });
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

  function isGeneratedPlaceholderOnly(review) {
    const tasks = Array.isArray(review?.tasks) ? review.tasks : [];
    const consultantOwned = tasks.some(task => task?.approved ||
      task?.userComment || task?.stepOverride || task?.manualStepId ||
      task?.provenance === "manual");
    const placeholderCount = tasks.filter(task =>
      task?.taskType === "Unclassified" &&
      ["", "Utför uppgiften."].includes(String(
        task.instruction || task.description || "").trim())).length;
    return !consultantOwned && placeholderCount >= 3 &&
      placeholderCount / tasks.length >= 0.25;
  }

  function hasGeneratedLookupSearchLeak(review) {
    const tasks = Array.isArray(review?.tasks) ? review.tasks : [];
    const consultantOwned = tasks.some(task => task?.approved ||
      task?.userComment || task?.stepOverride || task?.manualStepId ||
      task?.provenance === "manual");
    if (consultantOwned) return false;
    const embeddedSelection = value =>
      /(?:välj posten|select record)\s+["“][^"”]+["”]/iu.test(String(
        value?.instruction || value?.description || ""));
    const lookupPair = tasks.some((task, index) =>
      ["SelectCustomer", "SelectItem", "SelectVendor", "SelectLocation",
        "SelectDimension"].includes(task?.taskType) &&
      embeddedSelection(tasks[index + 1])
    );
    const itemTriplet = tasks.some((task, index) => {
      const selected = tasks[index + 1];
      const result = tasks[index + 2];
      const sortingNumber = value => /(?:sortera efter|sort by)\s+nr\.?/iu
        .test(String(value?.fieldCaption || value?.instruction || ""));
      return ["EnterFieldValue", "ChangeField"].includes(task?.taskType) &&
        sortingNumber(task) && embeddedSelection(selected) &&
        ["EnterFieldValue", "ChangeField"].includes(result?.taskType) &&
        sortingNumber(result);
    });
    return lookupPair || itemTriplet;
  }

  function hasGeneratedMenuPathLeak(review) {
    const tasks = Array.isArray(review?.tasks) ? review.tasks : [];
    const consultantOwned = tasks.some(task => task?.approved ||
      task?.userComment || task?.stepOverride || task?.manualStepId ||
      task?.provenance === "manual");
    if (consultantOwned) return false;
    const paths = [
      [/(?:välj\s+)?rad/iu,
        /relaterad information|related information/iu,
        /tillämpat försäljningspris och rabatt|applied sales price and discount/iu],
      [/(?:välj\s+)?(?:åtgärder|actions)/iu,
        /(?:välj\s+)?(?:funktion|function|functions)/iu,
        /(?:välj\s+)?(?:manuellt pris|manual price)/iu]
    ];
    return tasks.some((_task, index) => paths.some(patterns =>
      patterns.every((pattern, offset) => {
        const candidate = tasks[index + offset];
        return ["RunAction", "ClickAction"].includes(candidate?.taskType) &&
          pattern.test(String(candidate?.actionCaption || candidate?.instruction ||
            candidate?.description || ""));
      })));
  }

  function hasGeneratedCloseScreenshotLeak(review) {
    const tasks = Array.isArray(review?.tasks) ? review.tasks : [];
    const consultantOwned = tasks.some(task => task?.approved ||
      task?.userComment || task?.stepOverride || task?.manualStepId ||
      task?.provenance === "manual");
    if (consultantOwned) return false;
    return tasks.some((task, index) => task?.taskType === "RunAction" &&
      /(?:(?:välj|select)\s+)?["“]?(?:stäng|close)["”]?\.?/iu.test(String(
        task.actionCaption || task.instruction || task.description || "")) &&
      Boolean(tasks[index - 1]?.screenshot) && Boolean(task.screenshot) &&
      tasks[index - 1].screenshot !== task.screenshot);
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
    deleteManualStep,
    setManualStepScreenshot,
    addNote,
    updateNote,
    removeNote,
    createSection,
    createSubtask,
    renameHierarchy,
    assignHierarchy,
    reorderHierarchy,
    resetHierarchy,
    resetStructure,
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
    progress,
    isGeneratedPlaceholderOnly,
    hasGeneratedLookupSearchLeak,
    hasGeneratedMenuPathLeak,
    hasGeneratedCloseScreenshotLeak
  };
});
