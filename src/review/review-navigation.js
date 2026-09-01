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

  return { unreviewedTaskIds, nextUnreviewedTaskId, derive };
});
