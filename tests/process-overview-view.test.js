const assert = require("assert");
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
const container = { innerHTML: "" };
const result = view.render(container, model, { locale: "sv-SE" });
assert.deepStrictEqual(result, { activityCount: 2, stateTransitionCount: 1 });
assert(container.innerHTML.includes("Välj kund."));
assert(container.innerHTML.includes("Välj Frisläpp."));
assert(container.innerHTML.includes("Open"));
assert(container.innerHTML.includes("Released"));
assert(container.innerHTML.includes('aria-label="ändras till"'));
assert(!container.innerHTML.includes("**"));
const empty = { innerHTML: "" };
assert.deepStrictEqual(view.render(empty, processModel.project({
  recordingId: "empty", steps: []
}), { locale: "en-US" }), { activityCount: 0, stateTransitionCount: 0 });
assert(empty.innerHTML.includes("No process activities"));
console.log("Process Overview view tests passed.");
