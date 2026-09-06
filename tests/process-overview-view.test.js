const assert = require("assert");
const fs = require("fs");
const processModel = require("../src/document/process-model");
const view = require("../src/ui/process-overview-view");

const changed = { version: "1.0.0", status: "changed",
  before: { facts: [] }, after: { facts: [] }, changes: [{
    key: "control:Status:value", kind: "control-value",
    before: { control: { caption: "Status" }, value: "Open" },
    after: { control: { caption: "Status" }, value: "Released" },
    sourceEventIds: ["release", "released"]
  }], sourceEventIds: ["release", "released"] };
const model = processModel.project({ recordingId: "overview", steps: [{
  taskId: "customer", instruction: "Välj **kund**.", sourceEventIds: ["customer"]
}, { taskId: "release", instruction: "Välj **Frisläpp**.",
  sourceEventIds: ["release", "released"],
  capturePacket: { packetId: "release-packet", stateObservation: changed }
}] });
const activityIds = model.nodes.filter(node => node.nodeType === "activity")
  .map(node => node.nodeId);
const groupedModel = { ...model, subprocesses: [{ subprocessId: "sales-phase",
  title: "Försäljningsorder", nodeIds: activityIds,
  metadata: { containerType: "phase" } }, { subprocessId: "release-subtask",
  title: "Frisläpp order", nodeIds: [activityIds[1]],
  metadata: { containerType: "subtask" } }] };
const container = { innerHTML: "" };
const result = view.render(container, groupedModel, { locale: "sv-SE",
  selectedTaskIds: ["release"], reviewTasks: [
    { taskId: "customer", approved: true },
    { taskId: "release", approved: false, reviewSuggested: true }
  ] });
assert.deepStrictEqual(result, { activityCount: 2, layoutStrategy: "horizontal",
  stateTransitionCount: 1 });
assert(container.innerHTML.includes("Välj kund."));
assert(container.innerHTML.includes("Välj Frisläpp."));
assert(container.innerHTML.includes("Open"));
assert(container.innerHTML.includes("Released"));
assert(container.innerHTML.includes('aria-label="ändras till"'));
assert(container.innerHTML.includes('data-process-task-id="customer"'));
assert(container.innerHTML.includes('aria-pressed="false"'));
assert(container.innerHTML.includes('aria-pressed="true"'));
assert(container.innerHTML.includes('aria-current="step"'));
assert(container.innerHTML.includes('class="process-overview-review-state approved"'));
assert(container.innerHTML.includes('class="process-overview-review-state attention"'));
assert(container.innerHTML.includes("Granskad"));
assert(container.innerHTML.includes("Granska"));
assert(container.innerHTML.includes('class="process-diagram-scroll"'));
assert(container.innerHTML.includes('class="process-map-minimap"'));
assert(container.innerHTML.includes('data-process-minimap-node'));
assert(container.innerHTML.includes("Kartöversikt"));
assert(container.innerHTML.includes('data-process-layout-version="1.0.0"'));
assert(container.innerHTML.includes('class="process-overview-detail"'));
assert(container.innerHTML.includes('class="process-grammar-legend"'));
assert(container.innerHTML.includes("Teckenförklaring"));
assert(container.innerHTML.includes('data-shape="rectangle"'));
assert(container.innerHTML.includes("Försäljningsorder"));
assert(container.innerHTML.includes('class="process-overview-lane"'));
assert(container.innerHTML.includes('data-process-lane-id="sales-phase"'));
assert(container.innerHTML.includes('style="background:#f4f8fb;border-left-color:#31566f"'));
assert(container.innerHTML.includes("Frisläpp order"));
assert(container.innerHTML.includes("Vald aktivitet"));
assert(!container.innerHTML.includes('class="process-overview-routes compact"'));
assert(!container.innerHTML.includes('class="process-overview-state"'),
  "state details belong in the shared detail area, not every compact node");
assert.strictEqual(view.containersFor(groupedModel, activityIds[1]).subtask.title,
  "Frisläpp order");
assert(!container.innerHTML.includes("**"));

const responsibilityContainer = { innerHTML: "" };
view.render(responsibilityContainer, { recordingId: "responsibility", nodes: [{
  nodeId: "purchase", nodeType: "document", title: "Inköpsorder", sequence: 0,
  metadata: { processRole: { id: "purchasing", name: "Purchasing" } }
}], transitions: [], subprocesses: [], stateTransitions: [] }, { locale: "sv-SE",
  theme: "business-central" });
assert(responsibilityContainer.innerHTML.includes('data-process-lane-id="role:purchasing"'));
assert(responsibilityContainer.innerHTML.includes(
  'style="background:#eef5ff;border-left-color:#2563a6"'));
assert(responsibilityContainer.innerHTML.includes("Inköpsorder"));
assert(!responsibilityContainer.innerHTML.includes("document:purchase-order"));
const localizedCanonicalContainer = { innerHTML: "" };
view.render(localizedCanonicalContainer, { recordingId: "localized", nodes: [{
  nodeId: "purchase-canonical", nodeType: "document", title: "Purchase Order", sequence: 0,
  metadata: { taskId: "purchase-task" }
}], transitions: [], subprocesses: [], stateTransitions: [] }, { locale: "sv-SE",
  selectedTaskIds: ["purchase-task"] });
assert(localizedCanonicalContainer.innerHTML.includes("Inköpsorder"));
assert(!localizedCanonicalContainer.innerHTML.includes("Purchase Order"),
  "node card, minimap, and selected-node detail must use the same localized title");
const localizedBusinessContainer = { innerHTML: "" };
view.render(localizedBusinessContainer, { recordingId: "localized-business", nodes: [{
  nodeId: "purchase-process", nodeType: "businessProcess", title: "Purchase to Pay",
  sequence: 0
}], transitions: [], subprocesses: [], stateTransitions: [] }, { locale: "sv-SE" });
assert(localizedBusinessContainer.innerHTML.includes("Inköp till betalning"));
assert(!localizedBusinessContainer.innerHTML.includes("Purchase to Pay"));
const localizedLaneContainer = { innerHTML: "" };
view.render(localizedLaneContainer, { recordingId: "localized-lane", nodes: [{
  nodeId: "purchase-lane-node", nodeType: "document", title: "Purchase Order", sequence: 0
}], transitions: [], subprocesses: [{ subprocessId: "purchase-lane",
  title: "Purchase to Pay", nodeIds: ["purchase-lane-node"],
  metadata: { containerType: "phase" } }], stateTransitions: [] }, { locale: "sv-SE" });
assert(localizedLaneContainer.innerHTML.includes("Inköp till betalning"));
assert(!localizedLaneContainer.innerHTML.includes("Purchase to Pay"));

const decisionId = processModel.stableId("manual-process-node", ["branching", "stock"]);
const shipId = processModel.stableId("process-node",
  [processModel.MODEL_VERSION, "branching", "step", "ship"]);
const replenishId = processModel.stableId("process-node",
  [processModel.MODEL_VERSION, "branching", "step", "replenish"]);
const branchingModel = processModel.project({ recordingId: "branching",
  steps: [{ taskId: "ship", instruction: "Leverera" },
    { taskId: "replenish", instruction: "Fyll på lager" }], overrides: [{
    type: "create-decision", processOverrideId: "decision-stock",
    manualNodeId: "stock", title: "Finns varan i lager?", processOrder: 1
  }, { type: "create-transition", fromNodeId: decisionId, toNodeId: shipId,
    transitionType: "conditional", label: "Ja", condition: "stock-available"
  }, { type: "create-transition", fromNodeId: decisionId, toNodeId: replenishId,
    transitionType: "alternate", label: "Nej", condition: "stock-unavailable"
  }] });
const decisionContainer = { innerHTML: "" };
view.render(decisionContainer, branchingModel, { locale: "sv-SE" });
assert(decisionContainer.innerHTML.includes('data-process-decision="true"'));
assert(decisionContainer.innerHTML.includes('data-process-shape="diamond"'));
assert(decisionContainer.innerHTML.includes("process-overview-kind-decision"));
assert(decisionContainer.innerHTML.includes('data-process-flow="topToBottomBranches"'));
assert(/style="grid-column:2;grid-row:\d+"/u.test(decisionContainer.innerHTML),
  "the decision must be centered on its own graph layer");
assert(decisionContainer.innerHTML.includes("Finns varan i lager?"));
assert(decisionContainer.innerHTML.includes("Beslut"));
assert(decisionContainer.innerHTML.includes('class="process-overview-routes compact"'),
  "decision routes must be visible directly in the process map");
assert(decisionContainer.innerHTML.includes("process-overview-route-conditional"));
assert(decisionContainer.innerHTML.includes('data-process-line="solid"'));
assert(decisionContainer.innerHTML.includes("Ja till Leverera; Nej till Fyll på lager"));
assert(!decisionContainer.innerHTML.includes(`data-process-task-id=""`));
const decisionActionAttributes = {};
const decisionAction = { dataset: { processNodeAction: decisionId },
  setAttribute(name, value) { decisionActionAttributes[name] = value; } };
const detailTarget = { outerHTML: "" };
decisionContainer.querySelectorAll = () => [decisionAction];
decisionContainer.querySelector = () => detailTarget;
assert.strictEqual(view.selectNode(decisionContainer, decisionId), true);
assert.strictEqual(decisionActionAttributes["aria-pressed"], "true");
assert(detailTarget.outerHTML.includes("Valt beslut"));
assert(detailTarget.outerHTML.includes("Vägar"));
assert(detailTarget.outerHTML.includes("Ja"));
assert(detailTarget.outerHTML.includes("Nej"));
assert(detailTarget.outerHTML.includes("Leverera"));
assert(detailTarget.outerHTML.includes("Fyll på lager"));
assert(detailTarget.outerHTML.includes('data-process-transition-type="conditional"'));
assert(detailTarget.outerHTML.includes('data-process-transition-type="alternate"'));
assert(detailTarget.outerHTML.includes("stock-available"));
assert(detailTarget.outerHTML.includes("conditional"));
assert.deepStrictEqual(view.routeLabel({ transitionType: "alternate" }, false), "Alternativ");
assert(view.detailMarkup({ node: { nodeType: "activity", title: "VAT" },
  containers: {}, outgoing: [], changes: [{ factKind: "toggle-state",
    before: { control: { caption: "Moms" }, checked: false },
    after: { control: { caption: "Moms" }, checked: true } }] }, false)
  .includes("Av"));
assert(view.detailMarkup({ node: { nodeType: "activity", title: "VAT" },
  containers: {}, outgoing: [], changes: [{ factKind: "toggle-state",
    before: { control: { caption: "VAT" }, checked: false },
    after: { control: { caption: "VAT" }, checked: true } }] }, true)
  .includes("On"));
const selectedAttributes = {};
let selectedScrolled = false;
const selectedAction = { dataset: { processTaskId: "release" },
  setAttribute(name, value) { selectedAttributes[name] = value; },
  removeAttribute(name) { delete selectedAttributes[name]; },
  scrollIntoView() { selectedScrolled = true; } };
const unselectedAttributes = {};
const unselectedAction = { dataset: { processTaskId: "customer" },
  setAttribute(name, value) { unselectedAttributes[name] = value; },
  removeAttribute(name) { delete unselectedAttributes[name]; } };
assert.deepStrictEqual(view.updateSelection({ querySelectorAll() {
  return [unselectedAction, selectedAction];
} }, ["release"]), [selectedAction]);
assert.strictEqual(selectedAttributes["aria-pressed"], "true");
assert.strictEqual(selectedAttributes["aria-current"], "step");
assert.strictEqual(unselectedAttributes["aria-pressed"], "false");
assert.strictEqual(selectedScrolled, true,
  "the map must follow the active Review Step");
assert.strictEqual(view.taskIdFor({ sourceStepIds: ["source-a", "source-b"] }, [{
  taskId: "merged-task", sourceStepIds: ["source-a", "source-b"]
}]), "merged-task", "merged activities must navigate to the current Review task");
const empty = { innerHTML: "" };
assert.deepStrictEqual(view.render(empty, processModel.project({
  recordingId: "empty", steps: []
}), { locale: "en-US" }), { activityCount: 0, stateTransitionCount: 0 });
assert(empty.innerHTML.includes("No process activities"));
const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
assert(dashboard.includes("function activateProcessOverviewTask(taskId"));
assert(dashboard.includes('$("processOverview").addEventListener("click"'));
assert(dashboard.includes('$("processOverview").addEventListener("keydown"'));
assert(dashboard.includes("T9ProcessOverviewView.updateSelection"));
assert(dashboard.includes("T9ProcessOverviewView.selectNode"));
assert(dashboard.includes("resolvedHierarchy,"));
assert(dashboard.includes('"ArrowLeft", "ArrowRight"'));
assert(dashboard.includes('locale: applicationSettings.uiLocale || "sv-SE"'));
assert.deepStrictEqual(view.reviewState({ reviewTask: { approved: false } }, true),
  { name: "pending", label: "Not reviewed" });
assert.deepStrictEqual(view.semanticState({ node: { metadata: {
  semanticStatus: "suggested" } } }, false),
{ name: "suggested", label: "Referensförslag" });
const semanticContainer = { innerHTML: "" };
view.render(semanticContainer, { nodes: [{ nodeId: "suggestion", nodeType: "activity",
  title: "Post Shipment", processOrder: 0, metadata: { semanticStatus: "suggested" } }],
transitions: [], subprocesses: [], stateTransitions: [] }, { locale: "sv-SE" });
assert(semanticContainer.innerHTML.includes("process-overview-semantic-suggested"));
assert(semanticContainer.innerHTML.includes("Referensförslag"));
const typedContainer = { innerHTML: "" };
view.render(typedContainer, { nodes: [{ nodeId: "posted", nodeType: "activity",
  title: "Posted Sales Invoice", processOrder: 0, metadata: {
    originalNodeType: "postedDocument" } }, { nodeId: "post", nodeType: "activity",
  title: "Post", processOrder: 1, metadata: { originalNodeType: "posting" } }],
transitions: [], subprocesses: [], stateTransitions: [] }, { locale: "en-US" });
assert(typedContainer.innerHTML.includes("process-overview-kind-posted-document"));
assert(typedContainer.innerHTML.includes("Posted document"));
assert(typedContainer.innerHTML.includes("process-overview-kind-posting"));
const wrappingContainer = { innerHTML: "", clientWidth: 450 };
view.render(wrappingContainer, { nodes: Array.from({ length: 5 }, (_, index) => ({
  nodeId: `wrap-${index}`, nodeType: "activity", title: `Step ${index}`,
  processOrder: index
})), transitions: [], subprocesses: [], stateTransitions: [] }, { locale: "en-US" });
assert(wrappingContainer.innerHTML.includes("--process-columns:2"));
assert(wrappingContainer.innerHTML.includes('data-process-row="1" data-process-column="1"'));
assert(wrappingContainer.innerHTML.includes('style="grid-column:2"'));
assert.strictEqual((wrappingContainer.innerHTML.match(/process-overview-row-end/g) || []).length, 2);
const verticalContainer = { innerHTML: "", clientWidth: 1200 };
view.render(verticalContainer, { nodes: Array.from({ length: 3 }, (_, index) => ({
  nodeId: `vertical-${index}`, nodeType: "activity", title: `Vertical ${index}`,
  processOrder: index
})), transitions: [], subprocesses: [], stateTransitions: [] }, {
  locale: "en-US", direction: "vertical"
});
assert(verticalContainer.innerHTML.includes('data-process-direction="vertical"'));
assert(verticalContainer.innerHTML.includes("--process-columns:1"));
const themedContainer = { innerHTML: "" };
view.render(themedContainer, { nodes: [{ nodeId: "theme", nodeType: "activity",
  title: "Theme", processOrder: 0 }], transitions: [], subprocesses: [],
stateTransitions: [] }, { locale: "en-US", theme: "monochrome" });
assert(themedContainer.innerHTML.includes('data-process-theme="monochrome"'));
const compactContainer = { innerHTML: "" };
view.render(compactContainer, { nodes: [{ nodeId: "compact", nodeType: "activity",
  title: "Compact", processOrder: 0 }], transitions: [], subprocesses: [],
stateTransitions: [] }, { locale: "en-US", density: "compact" });
assert(compactContainer.innerHTML.includes('data-process-density="compact"'));
const dashboardHtml = fs.readFileSync("src/ui/dashboard.html", "utf8");
assert(dashboardHtml.includes('id="processMapLevels"'));
assert(dashboardHtml.includes('data-process-map-level="businessCentral"'));
assert(dashboardHtml.includes('src="document/semantic-process-map.js"'));
assert(dashboardHtml.includes('src="document/process-graph-layout.js"'));
assert(dashboardHtml.includes('src="document/process-visual-grammar.js"'));
assert(dashboardHtml.includes('src="document/process-route-grammar.js"'));
assert(dashboardHtml.includes('src="document/process-lane-model.js"'));
assert(dashboardHtml.includes('src="document/process-map-overrides.js"'));
assert(dashboardHtml.includes('id="editProcessMapNode"'));
assert(dashboardHtml.includes('id="processMapNodeDialog"'));
assert(dashboardHtml.includes('id="processMapRelationshipDialog"'));
assert(dashboardHtml.includes('id="editProcessMapRelationship"'));
assert(dashboardHtml.includes('src="document/process-map-relationship-overrides.js"'));
assert(dashboardHtml.includes('src="process-connector-view.js"'));
assert(dashboardHtml.includes('src="process-map-viewport.js"'));
assert(dashboardHtml.includes('id="processMapViewportControls"'));
assert(dashboardHtml.includes('id="processMapDirection"'));
assert(dashboardHtml.includes('id="processMapLayoutStatus"'));
assert(dashboard.includes("processMapRender.layoutStrategy"));
assert(dashboardHtml.includes('id="processMapTheme"'));
assert(dashboardHtml.includes('id="processMapDensity"'));
assert(dashboardHtml.includes('id="processMapFocus"'));
assert(dashboardHtml.includes('id="processMapSearch"'));
assert(dashboardHtml.includes('id="processMapSearchNext"'));
assert(dashboardHtml.includes('src="process-map-search.js"'));
assert(dashboardHtml.includes('src="process-map-minimap.js"'));
assert(dashboardHtml.includes('src="process-map-drag.js"'));
assert(dashboard.includes("T9ProcessMapDrag.bind"));
assert(dashboardHtml.includes('aria-pressed="false"'));
assert(dashboardHtml.includes('src="document/process-map-theme.js"'));
assert(dashboardHtml.includes('src="document/process-map-legend.js"'));
assert(dashboard.includes('activeProcessMapLevel = button.dataset.processMapLevel'));
assert(dashboard.includes("includeReferences: processMapIncludeReferences"));
assert(dashboard.includes("includeBoundaries: true"));
assert(dashboard.includes('$("processMapIncludeReferences").addEventListener("change"'));
assert(dashboardHtml.includes('id="processMapIncludeReferences"'));
assert(dashboard.includes('button.disabled = false'));
assert(dashboard.includes('await loadProcessAnalysis()'));
assert(dashboard.includes('window.addEventListener("resize", scheduleProcessMapLayout)'));
assert(dashboard.includes('$("processOverviewDisclosure").addEventListener("toggle"'));
assert(dashboard.includes("function changeProcessMapZoom(value)"));
assert(dashboard.includes("T9ProcessMapViewport.measureFit"));
assert(dashboard.includes("PROCESS_MAP_DIRECTION_STORAGE_KEY"));
assert(dashboard.includes("PROCESS_MAP_THEME_STORAGE_KEY"));
assert(dashboard.includes("PROCESS_MAP_DENSITY_STORAGE_KEY"));
assert(dashboard.includes("function setProcessMapFocus(active)"));
assert(dashboard.includes('event.key !== "Escape"'));
assert(dashboard.includes('classList.toggle("process-map-focus", enabled)'));
assert(dashboard.includes("function applyProcessMapSearch(advance)"));
assert(dashboard.includes("T9ProcessMapSearch.find"));
assert(dashboard.includes("T9ProcessMapSearch.next"));
assert(dashboard.includes('closest?.("[data-process-minimap-node]")'));
assert(dashboard.includes("T9ProcessOverviewView.selectNode"));
assert(dashboard.includes("theme: processMapTheme"));
assert(dashboard.includes("T9ProcessMapOverrides.apply"));
assert(dashboard.includes("T9ProcessMapOverrides.upsert"));
assert(dashboard.includes("T9ProcessMapRelationshipOverrides.apply"));
assert(dashboard.includes("T9ProcessMapRelationshipOverrides.upsert"));
assert(dashboard.includes('processMapDirection === "vertical" ? { columns: 1 } : {}'));
console.log("Process Overview view tests passed.");
