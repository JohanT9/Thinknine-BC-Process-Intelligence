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

  function render(container, model, options = {}) {
    if (!container) return { activityCount: 0, stateTransitionCount: 0 };
    const english = String(options.locale || "").toLowerCase().startsWith("en");
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
          return `<li><strong>${escape(stateLabel(change))}:</strong> ` +
            `${escape(before)} <span aria-label="${english ? "changes to" : "ändras till"}">→</span> ${escape(after)}</li>`;
        }).join("");
        return `<li class="process-overview-step" data-process-node-id="${escape(node.nodeId)}">
          <span class="process-overview-number" aria-hidden="true">${index + 1}</span>
          <div><strong>${escape(plain(node.title))}</strong>
          ${stateChanges ? `<ul class="process-overview-state">${stateChanges}</ul>` : ""}</div>
        </li>`;
      }).join("")}</ol>`;
    return { activityCount: activities.length,
      stateTransitionCount: [...transitions.values()].flat().length };
  }

  return { render };
});
