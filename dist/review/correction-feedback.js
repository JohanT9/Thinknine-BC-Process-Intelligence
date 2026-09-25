(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CorrectionFeedback = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const VERSION = "1.1.0";
  const CORRECTION_TYPES = new Set([
    "edit", "step-reset", "step-screenshot", "step-screenshot-repair",
    "manual-step-screenshot", "step-visibility", "manual-step-visibility",
    "delete", "manual-step-delete", "merge", "split", "move",
    "manual-step-create", "hierarchy-create-section",
    "hierarchy-create-subtask", "hierarchy-rename", "hierarchy-move",
    "hierarchy-reorder", "hierarchy-reset", "structure-reset"
  ]);
  const CONTENT_FIELDS = [
    "instruction", "instructionRuns", "userComment", "commentRuns", "title"
  ];

  function comparable(task) {
    return {
      instruction: task?.instruction,
      instructionRuns: task?.instructionRuns,
      userComment: task?.userComment,
      commentRuns: task?.commentRuns,
      title: task?.title,
      screenshot: task?.stepOverride?.screenshotOverride
        ?.selectedScreenshotAssetId || task?.selectedScreenshotAssetId,
      hidden: Boolean(task?.deleted ||
        task?.stepOverride?.visibilityOverride === "hidden")
    };
  }

  function changed(left, right, field) {
    return JSON.stringify(left?.[field]) !== JSON.stringify(right?.[field]);
  }

  function create(commandType, beforeTasks, afterTasks, context = {}) {
    if (!CORRECTION_TYPES.has(commandType)) return null;
    const before = Array.isArray(beforeTasks) ? beforeTasks : [];
    const after = Array.isArray(afterTasks) ? afterTasks : [];
    const afterById = new Map(after.map(task => [task?.taskId, task]));
    const affectedFields = new Set();
    const processFindingCodes = new Set();
    let affectedStepCount = 0;

    for (const task of before) {
      const next = afterById.get(task?.taskId);
      if (!next) {
        affectedFields.add("structure");
        (task?.processValidation?.codes || []).forEach(code =>
          processFindingCodes.add(String(code)));
        affectedStepCount += 1;
        continue;
      }
      const left = comparable(task);
      const right = comparable(next);
      const fields = CONTENT_FIELDS.filter(field => changed(left, right, field));
      if (changed(left, right, "screenshot")) fields.push("screenshot");
      if (changed(left, right, "hidden")) fields.push("visibility");
      if (fields.length) {
        affectedStepCount += 1;
        (task?.processValidation?.codes || []).forEach(code =>
          processFindingCodes.add(String(code)));
      }
      fields.forEach(field => affectedFields.add(field));
      afterById.delete(task?.taskId);
    }
    if (afterById.size) {
      affectedFields.add("structure");
      affectedStepCount += afterById.size;
    }
    const structuralContextChanged = ["beforeHierarchy", "beforeStructureOverrides",
      "beforeManualSteps"].some(field => context[field] !== undefined);
    if (!affectedFields.size && structuralContextChanged) {
      affectedFields.add("structure");
    }
    if (!affectedFields.size) return null;
    return Object.freeze({
      version: VERSION,
      scope: "local-review",
      contentIncluded: false,
      commandType,
      affectedFields: Object.freeze([...affectedFields].sort()),
      affectedStepCount,
      engineAttributed: processFindingCodes.size > 0,
      processFindingCodes: Object.freeze([...processFindingCodes].sort())
    });
  }

  function entries(review) {
    const history = Array.isArray(review?.commandHistory)
      ? review.commandHistory.slice(0, review.historyIndex) : [];
    return history.map(entry => entry?.metadata?.correctionFeedback)
      .filter(Boolean);
  }

  function summary(review) {
    const applied = entries(review);
    const byField = {};
    const byProcessCode = {};
    applied.forEach(entry => entry.affectedFields.forEach(field => {
      byField[field] = (byField[field] || 0) + 1;
    }));
    applied.forEach(entry => (entry.processFindingCodes || []).forEach(code => {
      byProcessCode[code] = (byProcessCode[code] || 0) + 1;
    }));
    return Object.freeze({
      version: VERSION,
      scope: "local-review",
      contentIncluded: false,
      correctionCount: applied.length,
      engineAttributedCorrectionCount: applied.filter(entry =>
        entry.engineAttributed).length,
      byField: Object.freeze(byField),
      byProcessCode: Object.freeze(byProcessCode)
    });
  }

  return { VERSION, create, entries, summary };
});
