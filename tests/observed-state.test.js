const assert = require("assert");
const state = require("../src/engine/observed-state");
const grouping = require("../src/engine/event-step-grouping");
const processModel = require("../src/document/process-model");

function event(id, kind, extra = {}) {
  return { normalizedEventId: `normalized:${id}`,
    sourceEventId: `source:${id}`, sourceEventIds: [`source:${id}`],
    recordingId: "observed-state", kind,
    timestamp: `2026-08-31T12:00:0${id.length}.000Z`, sequence: id.length,
    pageIdentification: { pageIdentity: "bc:page:sales-order",
      pageCaption: "Sales Order" }, controlIdentification: {},
    frameContext: { frameId: "top" }, ...extra };
}

assert.strictEqual(state.VERSION, "1.1.0");
const action = event("release", "activation", { interactionId: "release",
  interactionIds: ["release"], actionIdentification: { caption: "Release" } });
const navigation = event("released", "navigation", { interactionId: "release",
  interactionIds: ["release"], pageIdentification: {
    pageIdentity: "bc:page:released-order", pageCaption: "Released Order" } });
const pageState = state.capture([action, navigation], action, [navigation]);
assert.strictEqual(pageState.status, "changed");
assert.deepStrictEqual(pageState.changes[0], {
  key: "page", kind: "page",
  before: { identity: "bc:page:sales-order", caption: "Sales Order" },
  after: { identity: "bc:page:released-order", caption: "Released Order" },
  sourceEventIds: ["source:release", "source:released"]
});
assert.ok(Object.isFrozen(pageState));

const fieldEvents = [event("input", "value-change", {
  interactionId: "quantity", interactionIds: ["quantity"],
  controlIdentification: { identity: { value: "Quantity" },
    caption: "Quantity" }, previousValue: { normalized: "5" },
  value: { normalized: "50" } }), event("commit", "value-change", {
  interactionId: "quantity", interactionIds: ["quantity"],
  controlIdentification: { identity: { value: "Quantity" },
    caption: "Quantity" }, previousValue: { normalized: "5" },
  value: { normalized: "500" } })];
const fieldEvidenceBefore = JSON.stringify(fieldEvents);
const fieldState = state.capture(fieldEvents, fieldEvents[1], fieldEvents);
assert.strictEqual(JSON.stringify(fieldEvents), fieldEvidenceBefore,
  "state observation must never mutate normalized evidence");
assert.strictEqual(fieldState.status, "changed");
assert.deepStrictEqual(fieldState.changes.find(item =>
  item.kind === "control-value").before.value, "5");
assert.deepStrictEqual(fieldState.changes.find(item =>
  item.kind === "control-value").after.value, "500");
assert.deepStrictEqual(fieldState.coverage, { beforeFactCount: 2,
  afterFactCount: 2, changedFactCount: 1,
  observedKinds: ["page", "control-value"] });

const multiControlEvents = [event("quantity", "value-change", {
  controlIdentification: { identity: { value: "Quantity" }, caption: "Quantity" },
  previousValue: { normalized: "1" }, value: { normalized: "2" }
}), event("status-field", "value-change", {
  controlIdentification: { identity: { value: "Status" }, caption: "Status" },
  previousValue: { normalized: "Open" }, value: { normalized: "Released" }
}), event("location", "selection-change", {
  controlIdentification: { identity: { value: "Location" }, caption: "Location" },
  previousValue: { normalized: "BLUE" }, selection: { value: "RED" }
})];
const multiControlState = state.capture(multiControlEvents,
  multiControlEvents[0], multiControlEvents);
assert.strictEqual(multiControlState.changes.length, 3,
  "all independently identified control changes must survive one packet");
assert.deepStrictEqual(multiControlState.changes.map(item => item.key), [
  "control:Quantity:value", "control:Status:value",
  "control:Location:selection"
]);
assert.strictEqual(multiControlState.changes[2].kind, "control-selection");
const multiControlModel = processModel.project({ recordingId: "multi-control",
  steps: [{ taskId: "release", instruction: "Release order",
    capturePacket: { stateObservation: multiControlState } }] });
assert.strictEqual(multiControlModel.stateTransitions.length, 3,
  "every proven control change must reach the Process Model");

const toggle = event("toggle", "toggle-change", {
  controlIdentification: { identity: { value: "IncludeVAT" },
    caption: "Prices Including VAT" }, previousValue: { normalized: false },
  state: { checked: true } });
const toggleState = state.capture([toggle], toggle, [toggle]);
assert.strictEqual(toggleState.status, "changed");
assert.strictEqual(toggleState.changes.find(item =>
  item.kind === "toggle-state").after.checked, true);

const outcomes = [event("notice", "status-message"),
  event("failure", "error-outcome")];
const outcomeState = state.capture([action, ...outcomes], action, outcomes);
assert.deepStrictEqual(outcomeState.after.facts.filter(item =>
  item.kind === "outcome").map(item => item.value.outcome),
["status-message", "error-outcome"]);
assert.strictEqual(JSON.stringify(outcomeState).includes("Sales order"), false,
  "outcome state must not copy message or diagnostic text");

const partial = state.capture([event("status", "status-message")], null, []);
assert.strictEqual(partial.status, "observed",
  "page context may be observed even when no control state changes");
assert.deepStrictEqual(partial.changes, []);

const grouped = grouping.group({ schemaVersion: 1,
  recordingId: "observed-state", events: [action, navigation] });
assert.strictEqual(grouping.GROUPING_VERSION, "1.13.0");
assert.strictEqual(grouping.CAPTURE_PACKET_VERSION, "1.6.0");
assert.deepStrictEqual(grouped.groups[0].capturePacket.stateObservation,
  pageState);
assert.strictEqual(grouped.diagnostics.capturePacketValid, true);

console.log("Observed before/after state tests passed.");
