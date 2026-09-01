(function (root, factory) {
  const reviewEngine = typeof module === "object" && module.exports
    ? require("./review-studio")
    : root.T9Review;
  const regenerationEngine = typeof module === "object" && module.exports
    ? require("../document/regenerate-from-recording")
    : root.T9RegenerateFromRecording;
  const stepEditor = typeof module === "object" && module.exports
    ? require("./step-editor") : root.T9StepEditor;
  const api = factory(reviewEngine, regenerationEngine, stepEditor);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewRegeneration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  reviewEngine,
  regenerationEngine,
  stepEditor
) {
  const PREVIEW_VERSION = "1.2.0";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function canonicalValue(value) {
    if (Array.isArray(value)) return value.map(canonicalValue);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = canonicalValue(value[key]);
      return result;
    }, {});
  }

  function fingerprint(value) {
    const source = JSON.stringify(canonicalValue(value));
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `review:${PREVIEW_VERSION}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function stalePreviewError() {
    const error = new Error(
      "Review changed after the regeneration preview was created.");
    error.code = "STALE_REGENERATION_PREVIEW";
    return error;
  }

  function oneToOneTarget(stepMap, oldId) {
    return stepMap?.mappings?.find(item => item.mappingType === "one-to-one" &&
      item.oldStepIds.includes(String(oldId)))?.newStepIds[0] || null;
  }

  function noteOwnerId(note) {
    if (note?.ownerType && note.ownerType !== "step") return null;
    return String(note?.ownerStepId || note?.stepId || note?.ownerId || "");
  }

  function consultantState(review, stepMap) {
    const reasons = [];
    const tasks = array(review?.tasks);
    const edited = tasks.filter(task => task?.stepOverride || task?.userComment);
    if (edited.some(task => !oneToOneTarget(stepMap, stepId(task)))) {
      reasons.push("step-edits");
    }
    if (tasks.some(task => task?.approved)) reasons.push("approvals");
    if (tasks.some(task => task?.manualStepId || task?.provenance === "manual")) {
      reasons.push("manual-steps");
    }
    if (array(review?.structureOverrides).length) reasons.push("structure-overrides");
    if (array(review?.manualSteps).length && !reasons.includes("manual-steps")) {
      reasons.push("manual-steps");
    }
    if (array(review?.stepNotes).some(note => {
      const ownerId = noteOwnerId(note);
      return ownerId && !oneToOneTarget(stepMap, ownerId);
    })) reasons.push("notes");
    if (array(review?.annotations?.screenshotSets).some(set =>
      array(set?.items).length > 0)) reasons.push("annotations");
    const hierarchy = review?.hierarchy || {};
    if (["sections", "subtasks", "assignments", "overrides"].some(key =>
      array(hierarchy[key]).length > 0)) reasons.push("hierarchy");
    return reasons;
  }

  function stepId(step) {
    return String(step?.taskId || step?.stepId || "");
  }

  function screenshotIds(step) {
    return [...new Set([
      step?.selectedScreenshotAssetId,
      step?.screenshot,
      ...(Array.isArray(step?.screenshots) ? step.screenshots : []),
      ...(Array.isArray(step?.sourceScreenshotAssetIds)
        ? step.sourceScreenshotAssetIds : [])
    ].filter(Boolean).map(String))].sort();
  }

  function summary(step) {
    return Object.freeze({ stepId: stepId(step),
      instruction: String(step?.instruction || step?.description || ""),
      screenshotIds: Object.freeze(screenshotIds(step)) });
  }

  function retargetOverride(value, targetStepId) {
    if (!value) return null;
    return { ...clone(value), stepId: targetStepId,
      targetStepId: value.targetStepId !== undefined ? targetStepId : undefined };
  }

  function reconcileTaskEdits(currentReview, freshReview, stepMap) {
    const oldById = new Map(array(currentReview?.tasks).map(task =>
      [stepId(task), task]));
    const oldByTarget = new Map(stepMap.mappings.filter(item =>
      item.mappingType === "one-to-one").map(item =>
      [item.newStepIds[0], oldById.get(item.oldStepIds[0])]));
    const tasks = array(freshReview?.tasks).map(task => {
      const old = oldByTarget.get(stepId(task));
      if (!old || (!old.stepOverride && !old.userComment)) return clone(task);
      return stepEditor.resolve({ ...clone(task),
        stepOverride: retargetOverride(old.stepOverride, stepId(task)),
        userComment: old.userComment || "",
        approved: false,
        reviewStatus: "unreviewed" });
    });
    const stepNotes = array(currentReview?.stepNotes).map(note => {
      const ownerId = noteOwnerId(note);
      const target = ownerId ? oneToOneTarget(stepMap, ownerId) : null;
      if (!target) return clone(note);
      const key = note.ownerStepId !== undefined ? "ownerStepId" :
        note.stepId !== undefined ? "stepId" : "ownerId";
      return { ...clone(note), [key]: target };
    });
    return { tasks, stepNotes };
  }

  function changeSet(previousTasks, nextTasks, stepMap) {
    const oldById = new Map(previousTasks.map(step => [stepId(step), step]));
    const newById = new Map(nextTasks.map(step => [stepId(step), step]));
    const added = stepMap.addedStepIds.map(id => summary(newById.get(id)));
    const removed = stepMap.removedStepIds.map(id => summary(oldById.get(id)));
    const changed = [];
    const screenshotChanges = [];
    for (const mapping of stepMap.mappings.filter(item =>
      item.mappingType === "one-to-one")) {
      const before = summary(oldById.get(mapping.oldStepIds[0]));
      const after = summary(newById.get(mapping.newStepIds[0]));
      if (before.instruction !== after.instruction) changed.push(Object.freeze({
        before, after, strategy: mapping.strategy
      }));
      if (JSON.stringify(before.screenshotIds) !==
          JSON.stringify(after.screenshotIds)) screenshotChanges.push(Object.freeze({
        before, after, strategy: mapping.strategy
      }));
    }
    const mapped = type => stepMap.mappings.filter(item =>
      item.mappingType === type).map(item => Object.freeze({
        before: Object.freeze(item.oldStepIds.map(id => summary(oldById.get(id)))),
        after: Object.freeze(item.newStepIds.map(id => summary(newById.get(id)))),
        strategy: item.strategy
      }));
    return Object.freeze({
      added: Object.freeze(added), removed: Object.freeze(removed),
      changed: Object.freeze(changed),
      screenshotChanges: Object.freeze(screenshotChanges),
      splits: Object.freeze(mapped("one-to-many")),
      merges: Object.freeze(mapped("many-to-one"))
    });
  }

  function preview(currentReview, session, generatedTasks) {
    if (!currentReview || !session) {
      throw new TypeError("Review regeneration requires a Review and recording session.");
    }
    const previousTasks = array(currentReview.generatedTasks).length
      ? currentReview.generatedTasks
      : array(currentReview.tasks).filter(task => !task?.manualStepId);
    const freshReview = reviewEngine.createReview(session, generatedTasks || []);
    const stepMap = regenerationEngine.mapSteps(previousTasks,
      freshReview.generatedTasks);
    const reasons = consultantState(currentReview, stepMap);
    if (previousTasks.length > 0 && freshReview.generatedTasks.length === 0) {
      reasons.push("empty-generated-result");
    }
    const consolidated = stepMap.mappings.filter(item =>
      item.mappingType === "many-to-one"
    ).reduce((count, item) => count + Math.max(0, item.oldStepIds.length - 1), 0);
    const changes = changeSet(previousTasks, freshReview.generatedTasks, stepMap);
    const reconciled = reconcileTaskEdits(currentReview, freshReview, stepMap);
    return Object.freeze({
      previewVersion: PREVIEW_VERSION,
      baseReviewFingerprint: fingerprint(currentReview),
      blocked: reasons.length > 0,
      blockingReasons: Object.freeze(reasons),
      previousStepCount: previousTasks.length,
      nextStepCount: freshReview.generatedTasks.length,
      consolidatedStepCount: consolidated,
      addedStepCount: stepMap.addedStepIds.length,
      removedStepCount: stepMap.removedStepIds.length,
      changedStepCount: changes.changed.length,
      screenshotChangeCount: changes.screenshotChanges.length,
      splitStepCount: changes.splits.length,
      mergeStepCount: changes.merges.length,
      preservedStepEditCount: reconciled.tasks.filter(task =>
        task.stepOverride || task.userComment).length,
      changeSet: changes,
      mappings: stepMap.mappings,
      freshReview: Object.freeze({ ...freshReview,
        tasks: Object.freeze(reconciled.tasks),
        stepNotes: Object.freeze(reconciled.stepNotes) })
    });
  }

  function selectivePreview(currentReview, session, generatedTasks, selectedIds) {
    if (!currentReview || !session) {
      throw new TypeError("Selective regeneration requires a Review and recording session.");
    }
    const selected = new Set(array(selectedIds).filter(Boolean).map(String));
    const previousTasks = array(currentReview.generatedTasks).length
      ? currentReview.generatedTasks
      : array(currentReview.tasks).filter(task => !task?.manualStepId);
    const freshReview = reviewEngine.createReview(session, generatedTasks || []);
    const stepMap = regenerationEngine.mapSteps(previousTasks,
      freshReview.generatedTasks);
    const oldById = new Map(previousTasks.map(task => [stepId(task), task]));
    const currentById = new Map(array(currentReview.tasks).map(task =>
      [stepId(task), task]));
    const freshById = new Map(freshReview.generatedTasks.map(task =>
      [stepId(task), task]));
    const reasons = [];
    if (!selected.size) reasons.push("selection-empty");
    const replacements = [];
    for (const id of selected) {
      const current = currentById.get(id);
      const generated = oldById.get(id);
      const mapping = stepMap.mappings.find(item =>
        item.oldStepIds.includes(id));
      if (!current || !generated || current.manualStepId ||
          current.provenance === "manual") {
        reasons.push("selection-manual-or-missing");
        continue;
      }
      if (!mapping || mapping.mappingType !== "one-to-one") {
        reasons.push("selection-structure-change");
        continue;
      }
      const fresh = freshById.get(mapping.newStepIds[0]);
      if (!fresh) {
        reasons.push("selection-missing-target");
        continue;
      }
      if (current.approved) reasons.push("selection-approved");
      const previousScreenshots = screenshotIds(current);
      const nextScreenshots = screenshotIds(fresh);
      const annotated = array(currentReview?.annotations?.screenshotSets).some(set =>
        previousScreenshots.includes(String(set?.screenshotRef)) &&
        array(set?.items).length > 0);
      if (annotated && JSON.stringify(previousScreenshots) !==
          JSON.stringify(nextScreenshots)) reasons.push("selection-annotated-image");
      const identity = {
        taskId: current.taskId || generated.taskId,
        ...(current.stepId !== undefined ? { stepId: current.stepId } : {})
      };
      const generatedTask = { ...clone(fresh), ...identity };
      const task = stepEditor.resolve({
        ...generatedTask,
        stepOverride: retargetOverride(current.stepOverride, stepId(current)),
        userComment: current.userComment || "",
        approved: false,
        reviewStatus: current.stepOverride || current.userComment
          ? "edited" : "unreviewed"
      });
      replacements.push(Object.freeze({
        targetTaskId: id,
        mappingStrategy: mapping.strategy,
        before: summary(current),
        after: summary(task),
        generatedBefore: summary(generated),
        generatedAfter: summary(generatedTask),
        task: Object.freeze(task),
        generatedTask: Object.freeze(generatedTask)
      }));
    }
    const uniqueReasons = [...new Set(reasons)];
    const changed = replacements.filter(item =>
      item.before.instruction !== item.after.instruction);
    const screenshotChanges = replacements.filter(item =>
      JSON.stringify(item.before.screenshotIds) !==
      JSON.stringify(item.after.screenshotIds));
    const generatedChanges = replacements.filter(item =>
      item.generatedBefore.instruction !== item.generatedAfter.instruction);
    return Object.freeze({
      previewVersion: PREVIEW_VERSION,
      scope: "selected-steps",
      selectedStepIds: Object.freeze([...selected]),
      baseReviewFingerprint: fingerprint(currentReview),
      blocked: uniqueReasons.length > 0,
      blockingReasons: Object.freeze(uniqueReasons),
      previousStepCount: selected.size,
      nextStepCount: replacements.length,
      addedStepCount: 0,
      removedStepCount: 0,
      changedStepCount: changed.length,
      generatedBaselineChangeCount: generatedChanges.length,
      screenshotChangeCount: screenshotChanges.length,
      preservedStepEditCount: replacements.filter(item =>
        item.task.stepOverride || item.task.userComment).length,
      changeSet: Object.freeze({
        added: Object.freeze([]), removed: Object.freeze([]),
        changed: Object.freeze(changed.map(item => Object.freeze({
          before: item.before, after: item.after,
          strategy: item.mappingStrategy
        }))),
        screenshotChanges: Object.freeze(screenshotChanges.map(item =>
          Object.freeze({ before: item.before, after: item.after,
            strategy: item.mappingStrategy }))),
        generatedChanges: Object.freeze(generatedChanges.map(item =>
          Object.freeze({ before: item.generatedBefore,
            after: item.generatedAfter, strategy: item.mappingStrategy }))),
        splits: Object.freeze([]), merges: Object.freeze([])
      }),
      replacements: Object.freeze(replacements)
    });
  }

  function applySelective(currentReview, regenerationPreview, options = {}) {
    if (!regenerationPreview || regenerationPreview.blocked ||
        regenerationPreview.scope !== "selected-steps") {
      throw new Error("The selected Steps cannot be regenerated safely.");
    }
    if (regenerationPreview.previewVersion !== PREVIEW_VERSION ||
        regenerationPreview.baseReviewFingerprint !== fingerprint(currentReview)) {
      throw stalePreviewError();
    }
    const review = clone(currentReview);
    reviewEngine.applySelectiveRegeneration(
      review, regenerationPreview.replacements, options
    );
    review.regeneration = {
      ...(review.regeneration || {}),
      selectivelyRegeneratedAt: options.now || review.updatedAt,
      selectivelyRegeneratedStepCount: regenerationPreview.replacements.length
    };
    return reviewEngine.normalizeReview(review);
  }

  function apply(currentReview, regenerationPreview, options = {}) {
    if (!regenerationPreview || regenerationPreview.blocked) {
      throw new Error("Review contains consultant-owned state and cannot be replaced safely.");
    }
    if (regenerationPreview.previewVersion !== PREVIEW_VERSION ||
        regenerationPreview.baseReviewFingerprint !== fingerprint(currentReview)) {
      throw stalePreviewError();
    }
    const now = options.now || new Date().toISOString();
    const fresh = clone(regenerationPreview.freshReview);
    return reviewEngine.normalizeReview({
      ...clone(currentReview),
      ...fresh,
      createdAt: currentReview.createdAt || fresh.createdAt,
      updatedAt: now,
      status: "in-progress",
      reviewer: currentReview.reviewer || "",
      notes: currentReview.notes || "",
      documentFields: clone(currentReview.documentFields || fresh.documentFields),
      history: [],
      commandHistory: [],
      historyIndex: 0,
      regeneration: {
        ...(clone(currentReview.regeneration) || {}),
        regeneratedAt: now,
        previousStepCount: regenerationPreview.previousStepCount,
        nextStepCount: regenerationPreview.nextStepCount
      }
    });
  }

  return { PREVIEW_VERSION, apply, applySelective, consultantState, fingerprint,
    preview, reconcileTaskEdits, selectivePreview };
});
