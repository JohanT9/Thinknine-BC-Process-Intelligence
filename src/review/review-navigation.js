(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.T9ReviewNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function taskId(task) {
    return String(task?.taskId || "");
  }

  function unreviewedTaskIds(tasks) {
    return (Array.isArray(tasks) ? tasks : [])
      .filter(task => task && !task.approved && taskId(task))
      .map(taskId);
  }

  function nextUnreviewedTaskId(tasks, activeId) {
    const ids = unreviewedTaskIds(tasks);
    if (!ids.length) return null;
    const allIds = (Array.isArray(tasks) ? tasks : []).map(taskId);
    const activeIndex = allIds.indexOf(String(activeId || ""));
    if (activeIndex < 0) return ids[0];
    for (let offset = 1; offset <= allIds.length; offset += 1) {
      const candidate = allIds[(activeIndex + offset) % allIds.length];
      if (ids.includes(candidate)) return candidate;
    }
    return ids[0];
  }

  function derive(tasks, activeId) {
    const ids = unreviewedTaskIds(tasks);
    return {
      count: ids.length,
      complete: ids.length === 0,
      nextTaskId: nextUnreviewedTaskId(tasks, activeId)
    };
  }


  // Read-only guidance. Approval does not erase evidence-quality findings.
  function attention(tasks, imageQualities = new Map()) {
    const items = [];
    const visible = (Array.isArray(tasks) ? tasks : []).filter(task => task && taskId(task));
    visible.forEach((task, index) => {
      const reasons = [];
      if (task.resultVerification?.status === "error") reasons.push("observedError");
      if (!task.approved && (task.reviewSuggested ||
          (Number.isFinite(task.confidenceScore) && task.confidenceScore < 80))) {
        reasons.push("instruction");
      }
      const quality = imageQualities.get(task.taskId)?.qualityLevel;
      if (quality === "low" || quality === "unresolved") reasons.push("image");
      if (reasons.length) items.push({ taskId: task.taskId, step: index + 1,
        reasons, priority: reasons.includes("observedError") ? 0
          : reasons.includes("instruction") ? 1 : 2 });
    });
    items.sort((a, b) => a.priority - b.priority || a.step - b.step);
    return { items, total: visible.length,
      remaining: visible.filter(task => !task.approved).length };
  }

  function outcomes(tasks) {
    const counts = { verified: 0, error: 0, unverified: 0, unknown: 0, manual: 0 };
    (Array.isArray(tasks) ? tasks : []).filter(task => task && taskId(task)).forEach(task => {
      const status = task.resultVerification?.status;
      if (["verified", "error", "unverified"].includes(status)) counts[status] += 1;
      else if (task.manualStepId || task.provenance === "manual") counts.manual += 1;
      else counts.unknown += 1;
    });
    return counts;
  }

  function exportCheck(tasks, imageQualities) {
    const visible = (Array.isArray(tasks) ? tasks : []).filter(task => task && taskId(task));
    const guidance = attention(visible, imageQualities);
    const result = outcomes(visible);
    const target = guidance.items[0]?.taskId || unreviewedTaskIds(visible)[0] ||
      visible.find(task => task.resultVerification?.status === "unverified")?.taskId || null;
    return { total: guidance.total, remaining: guidance.remaining,
      questions: guidance.items.length, unverified: result.unverified,
      unknown: result.unknown, nextTaskId: target };
  }

  return { unreviewedTaskIds, nextUnreviewedTaskId, derive, attention, outcomes, exportCheck };
});
