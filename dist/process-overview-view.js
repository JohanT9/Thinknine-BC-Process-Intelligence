(function (root, factory) {
  const layout = typeof module === "object" && module.exports
    ? require("../document/process-graph-layout") : root.T9ProcessGraphLayout;
  const visualGrammar = typeof module === "object" && module.exports
    ? require("../document/process-visual-grammar") : root.T9ProcessVisualGrammar;
  const routeGrammar = typeof module === "object" && module.exports
    ? require("../document/process-route-grammar") : root.T9ProcessRouteGrammar;
  const api = factory(layout, visualGrammar, routeGrammar);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessOverviewView = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
  function (graphLayout, visualGrammar, routeGrammar) {
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

  function stateValue(value, english = false) {
    if (value?.value !== undefined && value?.value !== null) return String(value.value);
    if (typeof value?.checked === "boolean") return value.checked
      ? (english ? "On" : "På") : (english ? "Off" : "Av");
    if (typeof value?.visible === "boolean") return value.visible
      ? (english ? "Visible" : "Synlig") : (english ? "Closed" : "Stängd");
    if (value?.outcome) return String(value.outcome);
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

  function activityDetails(model, activities, stateTransitions, options) {
    const nodeById = new Map((model?.nodes || []).map(node => [node.nodeId, node]));
    const graphTransitions = new Map();
    (model?.transitions || []).forEach(transition => {
      if (!nodeById.has(transition.fromNodeId) || !nodeById.has(transition.toNodeId)) return;
      const current = graphTransitions.get(transition.fromNodeId) || [];
      current.push({ ...transition, target: nodeById.get(transition.toNodeId) });
      graphTransitions.set(transition.fromNodeId, current);
    });
    return activities.map((node, index) => {
      const taskId = taskIdFor(node, options.reviewTasks || []);
      return {
        node, index, taskId,
        reviewTask: (options.reviewTasks || []).find(task => task.taskId === taskId),
        containers: containersFor(model, node.nodeId),
        changes: stateTransitions.get(node.nodeId) || [],
        outgoing: graphTransitions.get(node.nodeId) || []
      };
    });
  }

  function reviewState(detail, english) {
    if (!detail?.reviewTask) return null;
    if (detail.reviewTask.approved) return {
      name: "approved", label: english ? "Reviewed" : "Granskad"
    };
    if (detail.reviewTask.reviewSuggested ||
        Number(detail.reviewTask.confidenceScore) < 80) {
      return { name: "attention", label: english ? "Review" : "Granska" };
    }
    return { name: "pending", label: english ? "Not reviewed" : "Ej granskad" };
  }

  function semanticState(detail, english) {
    const status = detail?.node?.metadata?.semanticStatus;
    if (status === "observed") return { name: status,
      label: english ? "Observed" : "Observerat" };
    if (status === "suggested") return { name: status,
      label: english ? "Reference suggestion" : "Referensförslag" };
    if (status === "customerSpecific") return { name: status,
      label: english ? "Customer-specific" : "Kundunikt" };
    if (status === "reference") return { name: status,
      label: english ? "Reference" : "Referens" };
    return null;
  }

  function routeLabel(route, english) {
    return routeGrammar.presentationFor(route, english ? "en-US" : "sv-SE").label;
  }

  function routesMarkup(detail, english, compact = false) {
    const decision = detail?.node?.nodeType === "decision" ||
      detail?.node?.metadata?.originalNodeType === "decision";
    const routes = (detail?.outgoing || []).filter(route =>
      route.transitionType !== "sequence" || decision
    );
    if (!routes.length) return "";
    return `<${compact ? "span" : "ul"} class="process-overview-routes${compact ? " compact" : ""}">${routes.map(route => {
      const visual = routeGrammar.presentationFor(route, english ? "en-US" : "sv-SE");
      return `<${compact ? "span" : "li"} class="process-overview-route process-overview-route-${visual.kind}"
        data-process-transition-type="${escape(route.transitionType)}" data-process-line="${visual.line}">
        <strong>${escape(routeLabel(route, english))}</strong><span aria-hidden="true">→</span>
        <span>${escape(plain(route.target?.title))}</span>
        ${compact ? "" : `<span class="process-overview-route-meta">${escape(route.transitionType)}${
          route.condition && route.condition !== route.label ? ` · ${escape(route.condition)}` : ""}</span>`}
      </${compact ? "span" : "li"}>`;
    }).join("")}</${compact ? "span" : "ul"}>`;
  }

  function routeSummary(detail, english) {
    const routes = (detail?.outgoing || []).filter(route =>
      route.transitionType !== "sequence" || detail.node.nodeType === "decision" ||
      detail.node.metadata?.originalNodeType === "decision");
    if (!routes.length) return "";
    const connector = english ? "to" : "till";
    return routes.map(route => `${routeLabel(route, english)} ${connector} ${
      plain(route.target?.title)}`).join("; ");
  }

  function detailMarkup(detail, english) {
    if (!detail) return "";
    const changes = detail.changes.map(change => {
      const before = stateValue(change.before, english);
      const after = stateValue(change.after, english);
      return `<li><strong>${escape(stateLabel(change))}:</strong> ${escape(before)} ` +
        `<span aria-label="${english ? "changes to" : "ändras till"}">→</span> ` +
        `${escape(after)}</li>`;
    }).join("");
    const context = [detail.containers.phase?.title, detail.containers.subtask?.title]
      .filter(Boolean).map(value => `<span>${escape(value)}</span>`).join("");
    const routes = routesMarkup(detail, english);
    return `<aside class="process-overview-detail" data-process-overview-detail aria-live="polite">
      <div><span class="process-overview-detail-label">${detail.node.nodeType === "decision"
        ? (english ? "Selected decision" : "Valt beslut")
        : (english ? "Selected activity" : "Vald aktivitet")}</span>
      <strong>${escape(plain(detail.node.title))}</strong></div>
      ${context ? `<div class="process-overview-detail-context">${context}</div>` : ""}
      ${routes ? `<div><span class="process-overview-detail-label">${english ? "Routes" : "Vägar"}</span>${routes}</div>` : ""}
      ${changes ? `<div><span class="process-overview-detail-label">${english ? "Observed changes" : "Observerade förändringar"}</span>
        <ul>${changes}</ul></div>` : !routes ? `<p class="muted">${english
          ? "No observed state change is linked to this activity."
          : "Ingen observerad statusförändring är kopplad till aktiviteten."}</p>` : ""}
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
    const stateTransitions = new Map();
    (model?.stateTransitions || []).forEach(transition => {
      const current = stateTransitions.get(transition.activityNodeId) || [];
      current.push(transition);
      stateTransitions.set(transition.activityNodeId, current);
    });
    if (!activities.length) {
      renderedViews.delete(container);
      container.innerHTML = `<p class="muted">${english
        ? "No process activities are available."
        : "Det finns inga processaktiviteter att visa."}</p>`;
      return { activityCount: 0, stateTransitionCount: 0 };
    }
    const details = activityDetails(model, activities, stateTransitions, options);
    const selectedDetail = details.find(detail => selectedTaskIds.has(detail.taskId)) || details[0];
    renderedViews.set(container, { details, english });
    const layout = graphLayout.create(model, {
      availableWidth: options.availableWidth || container.clientWidth || undefined
    });
    const placementById = new Map(layout.nodes.map(item => [item.nodeId, item]));
    const rowEndIds = new Set(layout.rows.slice(0, -1).map(row => row.nodeIds.at(-1)));
    container.innerHTML = `<div class="process-diagram-scroll" tabindex="0" role="group"
      aria-label="${english ? "Process flow" : "Processflöde"}">
      <ol class="process-overview-list" data-process-layout-version="${layout.layoutVersion}"
        style="--process-columns:${layout.columnCount}">${details.map(detail => {
        const selected = selectedTaskIds.has(detail.taskId);
        const phase = detail.containers.phase?.title;
        const subtask = detail.containers.subtask?.title;
        const decision = detail.node.nodeType === "decision";
        const status = reviewState(detail, english);
        const semantic = semanticState(detail, english);
        const title = plain(detail.node.title);
        const placement = placementById.get(detail.node.nodeId);
        const visual = visualGrammar.presentationFor(detail.node,
          english ? "en-US" : "sv-SE");
        const accessibleRoutes = routeSummary(detail, english);
        return `<li class="process-overview-step${decision ? " process-overview-decision" : ""}${
          rowEndIds.has(detail.node.nodeId) ? " process-overview-row-end" : ""}${
          ` process-overview-kind-${visual.kind}`}${
          semantic ? ` process-overview-semantic-${semantic.name}` : ""}"
          data-process-row="${placement?.row ?? 0}" data-process-column="${placement?.column ?? 0}"
          data-process-node-id="${escape(detail.node.nodeId)}" data-process-decision="${decision}"
          data-process-shape="${escape(visual.shape)}" data-process-tone="${escape(visual.tone)}">
          <button type="button" class="process-overview-action"
            data-process-node-action="${escape(detail.node.nodeId)}"
            ${detail.taskId ? `data-process-task-id="${escape(detail.taskId)}"` : ""}
            aria-pressed="${selected}"${selected ? ' aria-current="step"' : ""}
            aria-label="${escape(`${english ? "Step" : "Steg"} ${detail.index + 1}: ${title}${status ? `. ${status.label}` : ""}${accessibleRoutes ? `. ${accessibleRoutes}` : ""}`)}">
            <span class="process-overview-number" aria-hidden="true"><span>${decision ? "?" : detail.index + 1}</span></span>
            <span class="process-overview-content">
              ${phase ? `<span class="process-overview-phase">${escape(phase)}</span>` : ""}
              ${subtask ? `<span class="process-overview-subtask">${escape(subtask)}</span>` : ""}
              ${!["action", "process-step"].includes(visual.kind)
                ? `<span class="process-overview-node-type">${escape(visual.label)}</span>` : ""}
              <strong>${escape(title)}</strong>
              ${routesMarkup(detail, english, true)}
              ${status ? `<span class="process-overview-review-state ${status.name}">${escape(status.label)}</span>` : ""}
              ${semantic ? `<span class="process-overview-semantic-state ${semantic.name}">${escape(
                semantic.label)}</span>` : ""}
            </span>
          </button>
        </li>`;
      }).join("")}</ol></div>${detailMarkup(selectedDetail, english)}`;
    return { activityCount: activities.length,
      stateTransitionCount: [...stateTransitions.values()].flat().length };
  }

  function updateSelection(container, selectedTaskIds = []) {
    const selected = new Set(selectedTaskIds);
    const actions = [...(container?.querySelectorAll?.("[data-process-node-action]") || [])];
    actions.forEach(action => {
      const active = Boolean(action.dataset.processTaskId &&
        selected.has(action.dataset.processTaskId));
      action.setAttribute("aria-pressed", String(active));
      if (active) action.setAttribute("aria-current", "step");
      else action.removeAttribute?.("aria-current");
    });
    const selectedActions = actions.filter(action => action.dataset.processTaskId &&
      selected.has(action.dataset.processTaskId));
    const view = renderedViews.get(container);
    const detail = view?.details.find(item => selected.has(item.taskId));
    const detailContainer = container?.querySelector?.("[data-process-overview-detail]");
    if (detail && detailContainer) detailContainer.outerHTML = detailMarkup(detail, view.english);
    selectedActions[0]?.scrollIntoView?.({ block: "nearest", inline: "center" });
    return selectedActions;
  }

  function selectNode(container, nodeId) {
    const view = renderedViews.get(container);
    const detail = view?.details.find(item => item.node.nodeId === nodeId);
    if (!detail) return false;
    const actions = [...(container?.querySelectorAll?.("[data-process-node-action]") || [])];
    actions.forEach(action => {
      const active = action.dataset.processNodeAction === nodeId;
      action.setAttribute("aria-pressed", String(active));
      if (active) action.setAttribute("aria-current", "step");
      else action.removeAttribute?.("aria-current");
    });
    const detailContainer = container?.querySelector?.("[data-process-overview-detail]");
    if (detailContainer) detailContainer.outerHTML = detailMarkup(detail, view.english);
    return true;
  }

  return { containersFor, detailMarkup, render, reviewState, routeLabel, semanticState,
    routeSummary, routesMarkup, selectNode, taskIdFor, updateSelection };
});
