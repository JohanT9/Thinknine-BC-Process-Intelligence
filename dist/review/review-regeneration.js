(function (root, factory) {
  const reviewEngine = typeof module === "object" && module.exports
    ? require("./review-studio")
    : root.T9Review;
  const regenerationEngine = typeof module === "object" && module.exports
    ? require("../document/regenerate-from-recording")
    : root.T9RegenerateFromRecording;
  const api = factory(reviewEngine, regenerationEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewRegeneration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  reviewEngine,
  regenerationEngine
) {
  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function consultantState(review) {
    const reasons = [];
    const tasks = array(review?.tasks);
    if (tasks.some(task => task?.stepOverride || task?.userComment ||
        task?.approved || task?.manualStepId || task?.provenance === "manual")) {
      reasons.push("step-edits");
    }
    if (array(review?.structureOverrides).length) reasons.push("structure-overrides");
    if (array(review?.manualSteps).length) reasons.push("manual-steps");
    if (array(review?.stepNotes).length) reasons.push("notes");
    if (array(review?.annotations?.screenshotSets).some(set =>
      array(set?.items).length > 0)) reasons.push("annotations");
    const hierarchy = review?.hierarchy || {};
    if (["sections", "subtasks", "assignments", "overrides"].some(key =>
      array(hierarchy[key]).length > 0)) reasons.push("hierarchy");
    return reasons;
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
    const reasons = consultantState(currentReview);
    if (previousTasks.length > 0 && freshReview.generatedTasks.length === 0) {
      reasons.push("empty-generated-result");
    }
    const consolidated = stepMap.mappings.filter(item =>
      item.mappingType === "many-to-one"
    ).reduce((count, item) => count + Math.max(0, item.oldStepIds.length - 1), 0);
    return Object.freeze({
      blocked: reasons.length > 0,
      blockingReasons: Object.freeze(reasons),
      previousStepCount: previousTasks.length,
      nextStepCount: freshReview.generatedTasks.length,
      consolidatedStepCount: consolidated,
      addedStepCount: stepMap.addedStepIds.length,
      removedStepCount: stepMap.removedStepIds.length,
      mappings: stepMap.mappings,
      freshReview
    });
  }

  function apply(currentReview, regenerationPreview, options = {}) {
    if (!regenerationPreview || regenerationPreview.blocked) {
      throw new Error("Review contains consultant-owned state and cannot be replaced safely.");
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

  return { apply, consultantState, preview };
});
