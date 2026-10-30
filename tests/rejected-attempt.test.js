// A choice Business Central rejected with an error, made again in the same field as the next
// step, is a failed attempt: it is hidden, its error stays on the action, and the process
// analysis records why. A rejected change that is not tried again stays a step.
const assert = require("assert");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const analysis = require("../src/engine/process-analysis-model");
const registry = require("../src/engine/process-decision-code-registry");

const action = (id, actionType, targetField, status) => ({ actionId: id, actionType, targetField,
  displayText: id, resultVerification: { status } });
// The test describes a visible action as the pipeline does: its type, field and verification.
const describe = actions => actions.filter(value => !value.hidden).map(value => ({
  taskType: value.actionType, fieldCaption: value.targetField, resultVerification: value.resultVerification }));

const rejected = action("10137", "SelectLookupValue", "Leverantörsnr", "error");
const retried = action("11579", "SelectVendor", "Leverantörsnr", "verified");
const quantity = action("qty", "EnterQuantity", "Antal", "verified");
const result = pipeline.hideRejectedAttempts([rejected, retried, quantity], describe);
assert.deepStrictEqual(result.filter(value => !value.hidden).map(value => value.actionId), ["11579", "qty"]);
const hidden = result.find(value => value.hidden);
assert.strictEqual(hidden.hiddenReason, "rejected-and-retried");
assert.strictEqual(hidden.resultVerification.status, "error", "the error stays as evidence");

// Not hidden: a rejected change that is not tried again, a retry in another field, two errors,
// a different kind of step, and a step without a field.
for (const actions of [
  [rejected, quantity],
  [rejected, action("other", "SelectVendor", "Betala till-leverantör", "verified")],
  [rejected, action("again", "SelectVendor", "Leverantörsnr", "error")],
  [action("typed", "EnterFieldValue", "Antal", "error"), action("button", "RunAction", "Antal", "verified")],
  [action("blank", "SelectVendor", "", "error"), action("blank2", "SelectVendor", "", "verified")]
]) {
  assert.ok(!pipeline.hideRejectedAttempts(actions, describe).some(value => value.hidden),
    JSON.stringify(actions.map(value => value.actionId)));
}

// The process analysis names the reason with its own decision code.
assert.strictEqual(registry.resolve("process-action-rejected-and-retried", "excluded").code,
  "BCPS-PROCESS-FILTER-003");
const group = { stepGroupId: "group-1", sourceEventIds: ["source:1"], normalizedEventIds: ["n:1"] };
const model = analysis.build({ stepGroups: [group], normalizedEvents: [{ normalizedEventId: "n:1", sourceEventIds: ["source:1"] }],
  semanticActions: [{ ...hidden, stepGroupIds: ["group-1"], sourceEventIds: ["source:1"] }], businessTasks: [] });
assert.ok(JSON.stringify(model).includes("BCPS-PROCESS-FILTER-003"), "decision code in the analysis");
console.log("Rejected attempt tests passed.");
