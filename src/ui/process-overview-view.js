(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessOverviewView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function plain(value) {
    return String(value ?? "").replace(/\*\*|__/gu, "").trim();
  }

  function stateLabel(transition) {
    return transition?.before?.control?.caption ||
      transition?.after?.control?.caption || transition?.factKey || "Status";
  }

  function stateValue(value) {
    if (value?.value !== undefined && value?.value !== null) {
      return String(value.value);
    }
    if (value?.page?.caption) return String(value.page.caption);
    return "";
  }

  function taskIdFor(node, reviewTasks = []) {
    const sourceIds = new Set(node?.sourceStepIds || []);
    const exact = reviewTasks.find(task => sourceIds.has(task.taskId));
    if (exact) return exact.taskId;
    const traced = reviewTasks.find(task => (task.sourceStepIds || [])
      .some(sourceId => sourceIds.has(sourceId)));
    return traced?.taskId || node?.sourceStepIds?.[0] || "";
  }

  function render(container, model, options = {}) {
    if (!container) return { activityCount: 0, stateTransitionCount: 0 };
    const english = String(options.locale || "").toLowerCase().startsWith("en");
    const selectedTaskIds = new Set(options.selectedTaskIds || []);
    const activities = (model?.nodes || []).filter(node =>
      !["start", "end", "subprocess"].includes(node.nodeType)
    ).sort((left, right) => (left.processOrder ?? left.sequence ?? 0) -
      (right.processOrder ?? right.sequence ?? 0));
    const transitions = new Map();
    (model?.stateTransitions || []).forEach(transition => {
      const current = transitions.get(transition.activityNodeId) || [];
      current.push(transition);
      transitions.set(transition.activityNodeId, current);
    });
    if (!activities.length) {
      container.innerHTML = `<p class="muted">${english
        ? "No process activities are available."
        : "Det finns inga processaktiviteter att visa."}</p>`;
      return { activityCount: 0, stateTransitionCount: 0 };
    }
    container.innerHTML = `<ol class="process-overview-list">${activities.map(
      (node, index) => {
        const changes = transitions.get(node.nodeId) || [];
        const stateChanges = changes.map(change => {
          const before = stateValue(change.before);
          const after = stateValue(change.after);
          return `<span class="process-overview-change"><strong>${escape(
            stateLabel(change))}:</strong> ${escape(before)} ` +
            `<span aria-label="${english ? "changes to" : "ändras till"}">→</span> ${escape(after)}</span>`;
        }).join("");
        const taskId = taskIdFor(node, options.reviewTasks || []);
        const selected = selectedTaskIds.has(taskId);
        return `<li class="process-overview-step" data-process-node-id="${escape(node.nodeId)}">
          <button type="button" class="process-overview-action"
            data-process-task-id="${escape(taskId)}" aria-pressed="${selected}">
            <span class="process-overview-number" aria-hidden="true">${index + 1}</span>
            <span class="process-overview-content"><strong>${escape(plain(node.title))}</strong>
            ${stateChanges ? `<span class="process-overview-state">${stateChanges}</span>` : ""}</span>
          </button>
        </li>`;
      }).join("")}</ol>`;
    return { activityCount: activities.length,
      stateTransitionCount: [...transitions.values()].flat().length };
  }

  function updateSelection(container, selectedTaskIds = []) {
    const selected = new Set(selectedTaskIds);
    const actions = [...(container?.querySelectorAll?.(
      "[data-process-task-id]"
    ) || [])];
    actions.forEach(action => action.setAttribute("aria-pressed", String(
      selected.has(action.dataset.processTaskId)
    )));
    return actions.filter(action => selected.has(action.dataset.processTaskId));
  }

  return { render, taskIdFor, updateSelection };
});
