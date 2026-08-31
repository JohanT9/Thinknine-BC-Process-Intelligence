(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessOverviewView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const renderedViews = new WeakMap();

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
    if (value?.value !== undefined && value?.value !== null) return String(value.value);
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

  function containersFor(model, nodeId) {
    const containers = (model?.subprocesses || []).filter(container =>
      (container.nodeIds || []).includes(nodeId));
    return {
      phase: containers.find(container => container.metadata?.containerType === "phase"),
      subtask: containers.find(container => container.metadata?.containerType === "subtask")
    };
  }

  function activityDetails(model, activities, transitions, options) {
    return activities.map((node, index) => ({
      node, index, taskId: taskIdFor(node, options.reviewTasks || []),
      containers: containersFor(model, node.nodeId),
      changes: transitions.get(node.nodeId) || []
    }));
  }

  function detailMarkup(detail, english) {
    if (!detail) return "";
    const changes = detail.changes.map(change => {
      const before = stateValue(change.before);
      const after = stateValue(change.after);
      return `<li><strong>${escape(stateLabel(change))}:</strong> ${escape(before)} ` +
        `<span aria-label="${english ? "changes to" : "ändras till"}">→</span> ` +
        `${escape(after)}</li>`;
    }).join("");
    const context = [detail.containers.phase?.title, detail.containers.subtask?.title]
      .filter(Boolean).map(value => `<span>${escape(value)}</span>`).join("");
    return `<aside class="process-overview-detail" data-process-overview-detail aria-live="polite">
      <div><span class="process-overview-detail-label">${english ? "Selected activity" : "Vald aktivitet"}</span>
      <strong>${escape(plain(detail.node.title))}</strong></div>
      ${context ? `<div class="process-overview-detail-context">${context}</div>` : ""}
      ${changes ? `<div><span class="process-overview-detail-label">${english ? "Observed changes" : "Observerade förändringar"}</span>
        <ul>${changes}</ul></div>` : `<p class="muted">${english
          ? "No observed state change is linked to this activity."
          : "Ingen observerad statusförändring är kopplad till aktiviteten."}</p>`}
    </aside>`;
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
      renderedViews.delete(container);
      container.innerHTML = `<p class="muted">${english
        ? "No process activities are available."
        : "Det finns inga processaktiviteter att visa."}</p>`;
      return { activityCount: 0, stateTransitionCount: 0 };
    }
    const details = activityDetails(model, activities, transitions, options);
    const selectedDetail = details.find(detail => selectedTaskIds.has(detail.taskId)) || details[0];
    renderedViews.set(container, { details, english });
    container.innerHTML = `<div class="process-diagram-scroll" tabindex="0" role="group"
      aria-label="${english ? "Process flow" : "Processflöde"}">
      <ol class="process-overview-list">${details.map(detail => {
        const stateChanges = detail.changes.map(change =>
          `<span class="process-overview-change"><strong>${escape(stateLabel(change))}:</strong> ` +
          `${escape(stateValue(change.before))} <span aria-hidden="true">→</span> ` +
          `${escape(stateValue(change.after))}</span>`).join("");
        const selected = selectedTaskIds.has(detail.taskId);
        const phase = detail.containers.phase?.title;
        const subtask = detail.containers.subtask?.title;
        return `<li class="process-overview-step" data-process-node-id="${escape(detail.node.nodeId)}">
          <button type="button" class="process-overview-action"
            data-process-task-id="${escape(detail.taskId)}" aria-pressed="${selected}">
            <span class="process-overview-number" aria-hidden="true">${detail.index + 1}</span>
            <span class="process-overview-content">
              ${phase ? `<span class="process-overview-phase">${escape(phase)}</span>` : ""}
              ${subtask ? `<span class="process-overview-subtask">${escape(subtask)}</span>` : ""}
              <strong>${escape(plain(detail.node.title))}</strong>
              ${stateChanges ? `<span class="process-overview-state">${stateChanges}</span>` : ""}
            </span>
          </button>
        </li>`;
      }).join("")}</ol></div>${detailMarkup(selectedDetail, english)}`;
    return { activityCount: activities.length,
      stateTransitionCount: [...transitions.values()].flat().length };
  }

  function updateSelection(container, selectedTaskIds = []) {
    const selected = new Set(selectedTaskIds);
    const actions = [...(container?.querySelectorAll?.("[data-process-task-id]") || [])];
    actions.forEach(action => action.setAttribute("aria-pressed", String(
      selected.has(action.dataset.processTaskId)
    )));
    const selectedActions = actions.filter(action => selected.has(action.dataset.processTaskId));
    const view = renderedViews.get(container);
    const detail = view?.details.find(item => selected.has(item.taskId));
    const detailContainer = container?.querySelector?.("[data-process-overview-detail]");
    if (detail && detailContainer) detailContainer.outerHTML = detailMarkup(detail, view.english);
    return selectedActions;
  }

  return { containersFor, detailMarkup, render, taskIdFor, updateSelection };
});
