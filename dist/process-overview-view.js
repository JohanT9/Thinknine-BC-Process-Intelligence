(function (root, factory) {
  const layout = typeof module === "object" && module.exports
    ? require("../document/process-graph-layout") : root.T9ProcessGraphLayout;
  const visualGrammar = typeof module === "object" && module.exports
    ? require("../document/process-visual-grammar") : root.T9ProcessVisualGrammar;
  const routeGrammar = typeof module === "object" && module.exports
    ? require("../document/process-route-grammar") : root.T9ProcessRouteGrammar;
  const laneModel = typeof module === "object" && module.exports
    ? require("../document/process-lane-model") : root.T9ProcessLaneModel;
  const connectorView = typeof module === "object" && module.exports
    ? require("./process-connector-view") : root.T9ProcessConnectorView;
  const mapLegend = typeof module === "object" && module.exports
    ? require("../document/process-map-legend") : root.T9ProcessMapLegend;
  const minimap = typeof module === "object" && module.exports
    ? require("./process-map-minimap") : root.T9ProcessMapMinimap;
  const mapTheme = typeof module === "object" && module.exports
    ? require("../document/process-map-theme") : root.T9ProcessMapTheme;
  const mapLabels = typeof module === "object" && module.exports
    ? require("../document/process-map-labels") : root.T9ProcessMapLabels;
  const api = factory(layout, visualGrammar, routeGrammar, laneModel, connectorView,
    mapLegend, minimap, mapTheme, mapLabels);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessOverviewView = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
  function (graphLayout, visualGrammar, routeGrammar, processLaneModel,
    processConnectorView, processMapLegend, processMapMinimap, processMapTheme,
    processMapLabels) {
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
    if (status === "conditional") return { name: status,
      label: english ? "Conditional step" : "Villkorligt steg" };
    if (status === "customerSpecific") return { name: status,
      label: english ? "Customer-specific" : "Kundunikt" };
    if (status === "reference") return { name: status,
      label: english ? "Reference" : "Referens" };
    return null;
  }

  function routeLabel(route, english) {
    const handoff = processMapLabels.handoffTitle(route.metadata?.responsibilityHandoff,
      english ? "en-US" : "sv-SE");
    if (handoff) return handoff;
    return routeGrammar.presentationFor(route, english ? "en-US" : "sv-SE").label;
  }

  function routesMarkup(detail, english, compact = false) {
    const decision = detail?.node?.nodeType === "decision" ||
      detail?.node?.metadata?.originalNodeType === "decision";
    const routes = (detail?.outgoing || []).filter(route =>
      route.transitionType !== "sequence" || decision || route.metadata?.responsibilityHandoff
    );
    if (!routes.length) return "";
    return `<${compact ? "span" : "ul"} class="process-overview-routes${compact ? " compact" : ""}">${routes.map(route => {
      const visual = routeGrammar.presentationFor(route, english ? "en-US" : "sv-SE");
      return `<${compact ? "span" : "li"} class="process-overview-route process-overview-route-${visual.kind}"
        data-process-transition-type="${escape(route.transitionType)}" data-process-line="${visual.line}">
        <strong>${escape(routeLabel(route, english))}</strong><span aria-hidden="true">→</span>
        <span>${escape(plain(processMapLabels.nodeTitle(route.target,
          english ? "en-US" : "sv-SE")))}</span>
        ${compact ? "" : `<span class="process-overview-route-meta">${escape(route.transitionType)}${
          route.condition && route.condition !== route.label ? ` · ${escape(route.condition)}` : ""}</span>`}
      </${compact ? "span" : "li"}>`;
    }).join("")}</${compact ? "span" : "ul"}>`;
  }

  function routeSummary(detail, english) {
    const routes = (detail?.outgoing || []).filter(route =>
      route.transitionType !== "sequence" || detail.node.nodeType === "decision" ||
      detail.node.metadata?.originalNodeType === "decision" ||
      route.metadata?.responsibilityHandoff);
    if (!routes.length) return "";
    const connector = english ? "to" : "till";
    return routes.map(route => `${routeLabel(route, english)} ${connector} ${
      plain(processMapLabels.nodeTitle(route.target, english ? "en-US" : "sv-SE"))}`).join("; ");
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

  function legendMarkup(model, locale) {
    const legend = processMapLegend.create(model, locale);
    const nodes = legend.nodes.map(item => `<span class="process-grammar-legend-item">
      <span class="process-grammar-node-symbol" data-kind="${escape(item.kind)}"
        data-shape="${escape(item.shape)}" aria-hidden="true"></span>
      <span>${escape(item.label)}</span></span>`).join("");
    const routes = legend.routes.map(item => `<span class="process-grammar-legend-item">
      <span class="process-grammar-route-symbol" data-line="${escape(item.line)}" aria-hidden="true"></span>
      <span>${escape(item.label)}</span></span>`).join("");
    return `<aside class="process-grammar-legend" aria-label="${escape(legend.title)}">
      <span class="process-grammar-legend-title">${escape(legend.title)}</span>${nodes}${routes}</aside>`;
  }

  function minimapMarkup(layout, details, selectedTaskIds, english) {
    const selectedNodes = details.filter(detail => selectedTaskIds.has(detail.taskId))
      .map(detail => detail.node.nodeId);
    const map = processMapMinimap.create(layout, details.map(detail => ({
      nodeId: detail.node.nodeId, title: plain(detail.node.title)
    })), selectedNodes);
    return `<nav class="process-map-minimap" aria-label="${english
      ? "Process map overview" : "Översikt över processkartan"}">
      <strong>${english ? "Map overview" : "Kartöversikt"}</strong>
      <span class="process-map-minimap-grid" style="--minimap-columns:${map.columns};--minimap-rows:${map.rows}">${
        map.items.map((item, index) => `<button type="button" data-process-minimap-node="${
          escape(item.nodeId)}" style="--minimap-column:${item.column + 1};--minimap-row:${item.row + 1}"
          aria-label="${escape(`${english ? "Go to step" : "Gå till steg"} ${index + 1}: ${item.title}`)}"
          aria-current="${item.selected ? "step" : "false"}" title="${escape(item.title)}"><span>${
          index + 1}</span></button>`).join("")}</span></nav>`;
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
      availableWidth: options.availableWidth || container.clientWidth || undefined,
      direction: options.direction
    });
    const lanes = processLaneModel.create(model, { unassignedTitle: english
      ? "Other steps" : "Övriga steg", roleNames: english ? {} : {
        purchasing: "Inköp", warehouse: "Lager", sales: "Försäljning",
        production: "Produktion", finance: "Ekonomi", system: "System" } });
    const theme = processMapTheme.resolve(options.theme);
    const branchedLayout = layout.flowDirection === "topToBottomBranches";
    const showLaneHeaders = lanes.visible && !branchedLayout;
    const placementById = new Map(layout.nodes.map(item => [item.nodeId, item]));
    const laneById = new Map(lanes.lanes.map(lane => [lane.laneId, lane]));
    const laneStartIds = new Map(lanes.segments.map(segment => [segment.nodeIds[0],
      laneById.get(segment.laneId)]));
    const laneEndIds = showLaneHeaders ? lanes.segments.slice(0, -1)
      .map(segment => segment.nodeIds.at(-1)) : [];
    const rowEndIds = new Set([...layout.rows.slice(0, -1).map(row => row.nodeIds.at(-1)),
      ...laneEndIds]);
    container.innerHTML = `${minimapMarkup(layout, details, selectedTaskIds, english)}<div class="process-diagram-scroll" tabindex="0" role="group"
      data-process-theme="${escape(options.theme || "business-central")}"
      data-process-density="${options.density === "compact" ? "compact" : "standard"}"
      aria-label="${english ? "Process flow" : "Processflöde"}">
      <ol class="process-overview-list" data-process-layout-version="${layout.layoutVersion}"
        data-process-direction="${layout.direction}" data-process-flow="${layout.flowDirection}"
        style="--process-columns:${layout.columnCount};zoom:${Number(options.zoom) || 100}%">${details.map(detail => {
        const selected = selectedTaskIds.has(detail.taskId);
        const phase = detail.containers.phase?.title;
        const subtask = detail.containers.subtask?.title;
        const decision = detail.node.nodeType === "decision";
        const status = reviewState(detail, english);
        const semantic = semanticState(detail, english);
        const title = plain(processMapLabels.nodeTitle(detail.node, options.locale));
        const placement = placementById.get(detail.node.nodeId);
        const visual = visualGrammar.presentationFor(detail.node,
          english ? "en-US" : "sv-SE");
        const boundary = ["start", "end"].includes(visual.kind);
        const stepNumber = details.slice(0, detail.index).filter(item => !["start", "end"]
          .includes(visualGrammar.presentationFor(item.node, english ? "en-US" : "sv-SE").kind))
          .length + 1;
        const accessibleRoutes = routeSummary(detail, english);
        const lane = laneStartIds.get(detail.node.nodeId);
        const laneRole = String(lane?.laneId || "").replace(/^role:/u, "");
        const laneColors = theme.rolePalette?.[laneRole] || theme.rolePalette?.default ||
          [theme.palette.lane, theme.palette.brand];
        return `${showLaneHeaders && lane ? `<li class="process-overview-lane" data-process-lane-id="${
          escape(lane.laneId)}" style="background:${escape(laneColors[0])};border-left-color:${
            escape(laneColors[1])}"><span>${escape(lane.title)}</span></li>` : ""}<li class="process-overview-step${decision ? " process-overview-decision" : ""}${
          rowEndIds.has(detail.node.nodeId) ? " process-overview-row-end" : ""}${
          ` process-overview-kind-${visual.kind}`}${
          semantic ? ` process-overview-semantic-${semantic.name}` : ""}"
          data-process-row="${placement?.row ?? 0}" data-process-column="${placement?.column ?? 0}"
          style="grid-column:${(placement?.column ?? 0) + 1}${layout.flowDirection ===
            "topToBottomBranches" ? `;grid-row:${(placement?.row ?? 0) + 1}` : ""}"
          data-process-node-id="${escape(detail.node.nodeId)}" data-process-decision="${decision}"
          data-process-shape="${escape(visual.shape)}" data-process-tone="${escape(visual.tone)}">
          <button type="button" class="process-overview-action"
            data-process-node-action="${escape(detail.node.nodeId)}"
            ${detail.taskId ? `data-process-task-id="${escape(detail.taskId)}"` : ""}
            aria-pressed="${selected}"${selected ? ' aria-current="step"' : ""}
            aria-label="${escape(`${english ? "Step" : "Steg"} ${detail.index + 1}: ${title}${status ? `. ${status.label}` : ""}${accessibleRoutes ? `. ${accessibleRoutes}` : ""}`)}">
            <span class="process-map-drag-handle" data-process-drag-handle draggable="${
              options.reorderable === true}" title="${english ? "Drag to change position" :
                "Dra för att ändra position"}" aria-hidden="true">⠿</span>
            <span class="process-overview-number" aria-hidden="true"><span>${boundary ? "" :
              decision ? "?" : stepNumber}</span></span>
            <span class="process-overview-content">
              ${phase && !showLaneHeaders ? `<span class="process-overview-phase">${escape(phase)}</span>` : ""}
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
      }).join("")}</ol></div>${legendMarkup(model, english ? "en-US" : "sv-SE")}${
        detailMarkup(selectedDetail, english)}`;
    processConnectorView.render(container, model, {
      locale: english ? "en-US" : "sv-SE"
    });
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

  return { containersFor, detailMarkup, legendMarkup, minimapMarkup, render, reviewState, routeLabel, semanticState,
    routeSummary, routesMarkup, selectNode, taskIdFor, updateSelection };
});
