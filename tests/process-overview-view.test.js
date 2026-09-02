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
assert.deepStrictEqual(result, { activityCount: 2, stateTransitionCount: 1 });
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
assert(container.innerHTML.includes('class="process-overview-detail"'));
assert(container.innerHTML.includes("Försäljningsorder"));
assert(container.innerHTML.includes("Frisläpp order"));
assert(container.innerHTML.includes("Vald aktivitet"));
assert(!container.innerHTML.includes('class="process-overview-routes compact"'));
assert(!container.innerHTML.includes('class="process-overview-state"'),
  "state details belong in the shared detail area, not every compact node");
assert.strictEqual(view.containersFor(groupedModel, activityIds[1]).subtask.title,
  "Frisläpp order");
assert(!container.innerHTML.includes("**"));

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
assert(decisionContainer.innerHTML.includes("Finns varan i lager?"));
assert(decisionContainer.innerHTML.includes("Beslut"));
assert(!decisionContainer.innerHTML.includes('class="process-overview-routes compact"'),
  "decision routes must not clutter the compact flow node");
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
const dashboardHtml = fs.readFileSync("src/ui/dashboard.html", "utf8");
assert(dashboardHtml.includes('id="processMapLevels"'));
assert(dashboardHtml.includes('data-process-map-level="businessCentral"'));
assert(dashboardHtml.includes('src="document/semantic-process-map.js"'));
assert(dashboard.includes('activeProcessMapLevel = button.dataset.processMapLevel'));
console.log("Process Overview view tests passed.");
