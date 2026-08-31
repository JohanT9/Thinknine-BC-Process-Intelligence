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
  selectedTaskIds: ["release"] });
assert.deepStrictEqual(result, { activityCount: 2, stateTransitionCount: 1 });
assert(container.innerHTML.includes("Välj kund."));
assert(container.innerHTML.includes("Välj Frisläpp."));
assert(container.innerHTML.includes("Open"));
assert(container.innerHTML.includes("Released"));
assert(container.innerHTML.includes('aria-label="ändras till"'));
assert(container.innerHTML.includes('data-process-task-id="customer"'));
assert(container.innerHTML.includes('aria-pressed="false"'));
assert(container.innerHTML.includes('aria-pressed="true"'));
assert(container.innerHTML.includes('class="process-diagram-scroll"'));
assert(container.innerHTML.includes('class="process-overview-detail"'));
assert(container.innerHTML.includes("Försäljningsorder"));
assert(container.innerHTML.includes("Frisläpp order"));
assert(container.innerHTML.includes("Vald aktivitet"));
assert(!container.innerHTML.includes('class="process-overview-routes compact"'));
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
assert(decisionContainer.innerHTML.includes("Ja"));
assert(decisionContainer.innerHTML.includes("Nej"));
assert(decisionContainer.innerHTML.includes("Leverera"));
assert(decisionContainer.innerHTML.includes("Fyll på lager"));
assert(decisionContainer.innerHTML.includes('data-process-transition-type="conditional"'));
assert(decisionContainer.innerHTML.includes('data-process-transition-type="alternate"'));
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
assert(detailTarget.outerHTML.includes("stock-available"));
assert(detailTarget.outerHTML.includes("conditional"));
const selectedAttributes = {};
const selectedAction = { dataset: { processTaskId: "release" },
  setAttribute(name, value) { selectedAttributes[name] = value; } };
const unselectedAttributes = {};
const unselectedAction = { dataset: { processTaskId: "customer" },
  setAttribute(name, value) { unselectedAttributes[name] = value; } };
assert.deepStrictEqual(view.updateSelection({ querySelectorAll() {
  return [unselectedAction, selectedAction];
} }, ["release"]), [selectedAction]);
assert.strictEqual(selectedAttributes["aria-pressed"], "true");
assert.strictEqual(unselectedAttributes["aria-pressed"], "false");
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
console.log("Process Overview view tests passed.");
