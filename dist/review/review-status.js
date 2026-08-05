(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewStatus = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function screenshotPaths(task) {
    return [...new Set(
      task.screenshots?.length
        ? task.screenshots
        : task.screenshot
          ? [task.screenshot]
          : []
    )].filter(Boolean);
  }

  function estimatePages(steps, screenshots) {
    if (!steps) return 0;
    return Math.max(2, Math.ceil(1.5 + steps * 0.25 + screenshots * 0.75));
  }

  function derive(tasks, selection) {
    const activeTasks = (tasks || []).filter(task => !task.deleted);
    const availableIds = new Set(activeTasks.map(task => task.taskId));
    const selected = new Set(selection?.selectedIds || []);
    const screenshots = activeTasks.reduce(
      (count, task) => count + screenshotPaths(task).length,
      0
    );
    const steps = activeTasks.length;
    return {
      steps,
      selected: [...selected].filter(id => availableIds.has(id)).length,
      estimatedPages: estimatePages(steps, screenshots),
      screenshots
    };
  }

  function apply(container, status) {
    for (const [name, value] of Object.entries(status)) {
      const output = container.querySelector(`[data-review-stat="${name}"]`);
      if (output) output.textContent = String(value);
    }
  }

  return { apply, derive, estimatePages, screenshotPaths };
});
