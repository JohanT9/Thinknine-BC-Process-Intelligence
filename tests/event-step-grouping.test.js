const assert = require("assert");
const grouping = require("../src/engine/event-step-grouping");
const semantic = require("../src/document/semantic-interaction-engine");

function event(id, kind, extra = {}) {
  return {
    normalizedEventId: `normalized:${id}`, schemaVersion: 1,
    sourceEventId: `source:${id}`, sourceEventIds: [`source:${id}`],
    recordingId: "grouping", kind, timestamp: "2026-08-10T10:00:00.000Z",
    sequence: Number(id.replace(/\D/g, "")) || 1,
    pageIdentification: { id: "42", caption: "Sales Order" },
    controlIdentification: {}, frameContext: { frameId: "top" },
    interaction: { mechanism: "unknown" }, evidence: [], ...extra
  };
}
function run(events) {
  return grouping.group(Object.freeze({ schemaVersion: 1,
    recordingId: "grouping", events: Object.freeze(events) }));
}

const quantity = run([
  event("q1", "value-change", { subtype: "input",
    controlIdentification: { identity: { value: "Quantity" }, caption: "Quantity" },
    value: { normalized: "5" }, screenshotAssetId: "shot-1" }),
  event("q2", "value-change", { subtype: "input",
    controlIdentification: { identity: { value: "Quantity" }, caption: "Quantity" },
    value: { normalized: "50" }, screenshotAssetId: "shot-1" }),
  event("q3", "value-change", { subtype: "focusout",
    controlIdentification: { identity: { value: "Quantity" }, caption: "Quantity" },
    value: { normalized: "500" }, screenshotAssetId: "shot-2" })
]);
assert.strictEqual(quantity.schemaVersion, 1);
assert.strictEqual(quantity.groupingVersion, "1.9.0");
assert.strictEqual(quantity.groups.length, 1);
assert.strictEqual(quantity.groups[0].groupKind, "field-edit");
assert.deepStrictEqual(quantity.groups[0].sourceEventIds,
  ["source:q1", "source:q2", "source:q3"]);
assert.deepStrictEqual(quantity.groups[0].normalizedEventIds,
  ["normalized:q1", "normalized:q2", "normalized:q3"]);
assert.strictEqual(quantity.groups[0].primaryEventId, "normalized:q3");
assert.deepStrictEqual(quantity.groups[0].supportingNormalizedEventIds,
  ["normalized:q1", "normalized:q2"]);
assert.deepStrictEqual(quantity.groups[0].screenshotAssetIds,
  ["shot-1", "shot-2"]);
assert.strictEqual(quantity.groups[0].capturePacket.packetVersion, "1.6.0");
assert.strictEqual(quantity.groups[0].capturePacket.preferredScreenshotAssetId,
  "shot-2");
assert.strictEqual(quantity.groups[0].capturePacket.completeness, "complete");
assert.deepStrictEqual(quantity.groups[0].capturePacket.missing, []);
assert.ok(quantity.groups[0].groupingReason.includes("same-control"));
assert.ok(Object.isFrozen(quantity.groups[0]));
assert.strictEqual(quantity.diagnostics.unassignedMeaningfulEventIds.length, 0);
assert.strictEqual(semantic.processStepGroups(quantity.groups)[0].actionType,
  "EnterQuantity");

const lookupEvents = [
  event("l1", "activation", {
    controlIdentification: { identity: { value: "CustomerNo" },
      controlType: "lookup", caption: "Customer No." } }),
  event("l2", "value-change", { pageIdentification: { caption: "Customers", modal: true },
    controlIdentification: { identity: { value: "LookupSearch" }, caption: "Search" },
    value: { normalized: "103" }, frameContext: { frameId: "dialog" } }),
  event("l3", "selection-change", { pageIdentification: { caption: "Customers", modal: true },
    controlIdentification: { controlType: "repeaterCell", caption: "No." },
    selection: { value: "1033", caption: "1033" }, frameContext: { frameId: "dialog" } }),
  event("l4", "value-change", {
    controlIdentification: { identity: { value: "CustomerNo" }, caption: "Customer No." },
    value: { normalized: "1033" }, frameContext: { frameId: "top" } })
];
const customer = run(lookupEvents);
assert.strictEqual(customer.groups.length, 1);
assert.strictEqual(customer.groups[0].groupKind, "lookup-interaction");
assert.strictEqual(customer.groups[0].primaryEventId, "normalized:l4");
assert.ok(customer.groups[0].groupingReason.includes("selected-record"));
assert.ok(customer.groups[0].groupingReason.includes("resulting-control-value-match"));
assert.deepStrictEqual(customer.groups[0].frameContexts.map(value => value.frameId),
  ["top", "dialog", "dialog", "top"]);
const customerAction = semantic.processStepGroups(customer.groups)[0];
assert.strictEqual(customerAction.actionType, "SelectCustomer");
assert.strictEqual(customerAction.selectedValue, "1033");
assert.strictEqual(customerAction.rawInteractions[0].kind, "lookup-interaction");
assert.strictEqual(customerAction.rawInteractions[0].targetControl.caption,
  "Customer No.");
assert.deepStrictEqual(customerAction.sourceEventIds,
  ["source:l1", "source:l2", "source:l3", "source:l4"]);
const numberPreferredToCaption = run(lookupEvents.map(item => {
  if (item.normalizedEventId === "normalized:l3") return { ...item,
    selection: { value: "905", caption: "Iberi AB" } };
  if (item.normalizedEventId === "normalized:l4") return { ...item,
    value: { normalized: "905" } };
  return item;
}));
assert.strictEqual(semantic.processStepGroups(
  numberPreferredToCaption.groups)[0].selectedValue, "905");

for (const [identity, actionType] of [["ItemNo", "SelectItem"],
  ["VendorNo", "SelectVendor"]]) {
  const values = lookupEvents.map(item => ({ ...item,
    controlIdentification: item.normalizedEventId === "normalized:l1" ||
      item.normalizedEventId === "normalized:l4"
      ? { identity: { value: identity }, controlType: "lookup",
        caption: identity } : item.controlIdentification
  }));
  const grouped = run(values);
  assert.strictEqual(grouped.groups[0].groupKind, "lookup-interaction");
  assert.strictEqual(semantic.processStepGroups(grouped.groups)[0].actionType,
    actionType);
}

const option = run([
  event("o1", "selection-change", { controlIdentification: {
    identity: { value: "Status" }, caption: "Status" }, selection: { value: "Open" } }),
  event("o2", "value-change", { subtype: "focusout", controlIdentification: {
    identity: { value: "Status" }, caption: "Status" }, value: { normalized: "Open" } })
]);
assert.strictEqual(option.groups.length, 1);
assert.strictEqual(option.groups[0].groupKind, "selection");

const toggle = run([event("t1", "toggle-change", {
  controlIdentification: { identity: { value: "Blocked" }, type: "checkbox" },
  state: { checked: true } })]);
assert.strictEqual(toggle.groups[0].groupKind, "toggle-interaction");

const actionDialog = run([
  event("a1", "activation", { actionIdentification: { caption: "Post" } }),
  event("a2", "dialog-action", { pageIdentification: { caption: "Confirm", modal: true },
    actionIdentification: { actionType: "ConfirmYes", caption: "Yes" } }),
  event("a3", "dialog-close", { pageIdentification: { caption: "Confirm", modal: true } })
]);
assert.deepStrictEqual(actionDialog.groups.map(group => group.groupKind), ["action"]);
assert.deepStrictEqual(actionDialog.groups[0].sourceEventIds,
  ["source:a1", "source:a2", "source:a3"]);
assert(actionDialog.groups[0].groupingReason.includes("confirmation-dialog"));
assert.deepStrictEqual(actionDialog.groups[0].capturePacket.interactionEventIds,
  ["normalized:a1", "normalized:a2"]);

const meaningfulDialogAction = run([
  event("ma1", "activation", { actionIdentification: { caption: "Open options" } }),
  event("ma2", "dialog-action", { pageIdentification: { caption: "Options", modal: true },
    actionIdentification: { caption: "Calculate and replace" } })
]);
assert.strictEqual(meaningfulDialogAction.groups.length, 2,
  "A meaningful dialog command must remain a separate documentable step.");

const actionResult = run([
  event("ar1", "activation", { actionIdentification: { caption: "Open" },
    screenshotAssetId: "shot-before" }),
  event("ar2", "navigation", { pageIdentification: {
    id: "43", caption: "Sales Order" }, screenshotAssetId: "shot-result" })
]);
assert.strictEqual(actionResult.groups.length, 1);
assert.strictEqual(actionResult.groups[0].groupKind, "action");
assert.strictEqual(actionResult.groups[0].primaryEventId, "normalized:ar1");
assert.deepStrictEqual(actionResult.groups[0].capturePacket.resultEventIds,
  ["normalized:ar2"]);
assert.strictEqual(actionResult.groups[0].capturePacket.preferredScreenshotAssetId,
  "shot-result");
assert.strictEqual(actionResult.groups[0].capturePacket.preferredSourceEventId,
  "source:ar2");
assert.strictEqual(actionResult.groups[0].capturePacket.completeness, "complete");
assert.ok(actionResult.groups[0].groupingReason.includes("observed-action-result"));
const actionResultSemantic = semantic.processStepGroups(actionResult.groups)[0];
assert.strictEqual(actionResultSemantic.actionType, "RunAction");
assert.strictEqual(actionResultSemantic.preferredSourceEventId, "source:ar2");
assert.strictEqual(actionResultSemantic.rawInteractions[0].capturePacket.completeness,
  "complete");

const duplicateActivation = run([
  event("da1", "activation", { actionIdentification: { caption: "Edit" },
    screenshotAssetId: "shot-action" }),
  event("da2", "activation", { actionIdentification: { caption: "Edit" } })
]);
assert.strictEqual(duplicateActivation.groups.length, 1);
assert.deepStrictEqual(duplicateActivation.groups[0].sourceEventIds,
  ["source:da1", "source:da2"]);
assert.ok(duplicateActivation.groups[0].groupingReason.includes(
  "duplicate-activation"));

const date = run([
  event("d1", "activation", { controlIdentification: {
    identity: { value: "PostingDate" }, controlType: "lookup", type: "dateInput" } }),
  event("d2", "selection-change", { pageIdentification: { modal: true },
    controlIdentification: { controlType: "repeaterCell" },
    selection: { value: "2026-08-07" } }),
  event("d3", "value-change", { controlIdentification: {
    identity: { value: "PostingDate" }, type: "dateInput" },
    value: { normalized: "2026-08-07" } })
]);
assert.strictEqual(date.groups.length, 1);
assert.strictEqual(date.groups[0].groupKind, "lookup-interaction");

const noise = run([
  event("n1", "focus-transition"),
  event("n2", "unknown", { rawEventType: "scroll" })
]);
assert.strictEqual(noise.groups.length, 0);
assert.strictEqual(noise.supportingEvents.length, 2);
assert.strictEqual(noise.diagnostics.assignedEventCount, 2);

const repeated = run([
  event("r1", "value-change", { subtype: "focusout",
    controlIdentification: { identity: { value: "Quantity" } }, value: { normalized: "100" } }),
  event("r2", "value-change", { subtype: "input",
    controlIdentification: { identity: { value: "Quantity" } }, value: { normalized: "500" } })
]);
assert.strictEqual(repeated.groups.length, 2);

const twoFields = run([
  event("f1", "value-change", { controlIdentification: {
    identity: { value: "ItemNo" } }, value: { normalized: "136" } }),
  event("f2", "value-change", { controlIdentification: {
    identity: { value: "Quantity" } }, value: { normalized: "500" } })
]);
assert.strictEqual(twoFields.groups.length, 2);

const recorderBound = run([
  event("ib1", "activation", { interactionId: "frame:interaction-1",
    interactionIds: ["frame:interaction-1"],
    actionIdentification: { caption: "Open" }, screenshotAssetId: "before" }),
  event("ib2", "navigation", { interactionId: "frame:interaction-1",
    interactionIds: ["frame:interaction-1"],
    pageIdentification: { id: "99", caption: "Result" },
    screenshotAssetId: "after" })
]);
assert.strictEqual(recorderBound.groups.length, 1);
assert.strictEqual(recorderBound.groups[0].capturePacket.interactionId,
  "frame:interaction-1");
assert.deepStrictEqual(recorderBound.groups[0].interactionIds,
  ["frame:interaction-1"]);
assert.strictEqual(recorderBound.groups[0].capturePacket.interactionIdentitySource,
  "recorder");
assert.ok(recorderBound.groups[0].groupingReason.includes(
  "recorder-interaction-id"));

const recorderPacketWithFrameworkNoise = run([
  event("ip1", "activation", { interactionId: "frame:interaction-packet",
    interactionIds: ["frame:interaction-packet"],
    actionIdentification: { caption: "Post" }, screenshotAssetId: "before" }),
  event("ip2", "unknown", { interactionId: "frame:interaction-packet",
    interactionIds: ["frame:interaction-packet"],
    rawEventType: "react-state-transition", screenshotAssetId: "transient" }),
  event("ip3", "navigation", { interactionId: "frame:interaction-packet",
    interactionIds: ["frame:interaction-packet"],
    pageIdentification: { id: "posted", caption: "Posted document" },
    screenshotAssetId: "result" }),
  event("ip4", "unknown", { interactionId: "frame:interaction-packet",
    interactionIds: ["frame:interaction-packet"],
    rawEventType: "react-render-complete", screenshotAssetId: "late-support" })
]);
assert.strictEqual(recorderPacketWithFrameworkNoise.groups.length, 1,
  "same-interaction framework mechanics must not split a capture packet");
const stablePacket = recorderPacketWithFrameworkNoise.groups[0].capturePacket;
assert.deepStrictEqual(stablePacket.interactionEventIds,
  ["normalized:ip1"]);
assert.deepStrictEqual(stablePacket.resultEventIds,
  ["normalized:ip3"]);
assert.strictEqual(stablePacket.preferredScreenshotAssetId, "result",
  "verified result evidence must win over a later supporting capture");
assert.strictEqual(stablePacket.preferredScreenshotRole, "result");
assert.deepStrictEqual(stablePacket.screenshotEvidence.map(item => item.role),
  ["interaction", "supporting", "result", "supporting"]);
assert.ok(recorderPacketWithFrameworkNoise.groups[0].groupingReason.includes(
  "recorder-interaction-supporting-evidence"));

const recorderSeparated = run([
  event("is1", "activation", { interactionId: "frame:interaction-1",
    interactionIds: ["frame:interaction-1"],
    actionIdentification: { caption: "Open" } }),
  event("is2", "navigation", { interactionId: "frame:interaction-2",
    interactionIds: ["frame:interaction-2"],
    pageIdentification: { id: "99", caption: "Other result" } })
]);
assert.strictEqual(recorderSeparated.groups.length, 2,
  "different recorder interaction IDs are an authoritative boundary");
assert.strictEqual(recorderSeparated.groups[0].capturePacket.interactionIdentitySource,
  "recorder");

assert.strictEqual(actionResult.groups[0].capturePacket.interactionId, null);
assert.strictEqual(actionResult.groups[0].capturePacket.interactionIdentitySource,
  "compatibility-grouping", "legacy recordings retain heuristic grouping");

const ambiguousFrames = run([
  event("cf1", "value-change", { frameContext: { frameId: "top" },
    controlIdentification: { caption: "Search" }, value: { normalized: "a" } }),
  event("cf2", "value-change", { frameContext: { frameId: "addin" },
    controlIdentification: { caption: "Search" }, value: { normalized: "ab" } })
]);
assert.strictEqual(ambiguousFrames.groups.length, 2);

const pageBoundary = run([
  event("p1", "value-change", { controlIdentification: {
    identity: { value: "Search" } }, value: { normalized: "x" } }),
  event("p2", "navigation", { pageIdentification: { id: "31", caption: "Item List" } }),
  event("p3", "value-change", { pageIdentification: { id: "31", caption: "Item List" },
    controlIdentification: { identity: { value: "Search" } }, value: { normalized: "y" } })
]);
assert.strictEqual(pageBoundary.groups.length, 3);

const ambiguous = run([
  event("x1", "activation", { controlIdentification: {
    identity: { value: "CustomerNo" }, controlType: "lookup" } }),
  event("x2", "value-change", { controlIdentification: {
    identity: { value: "Unrelated" } }, value: { normalized: "1033" } })
]);
assert.strictEqual(ambiguous.groups.length, 2);

const unknown = run([event("u1", "unknown", { rawEventType: "future-event" })]);
assert.strictEqual(unknown.groups.length, 0);
assert.strictEqual(unknown.supportingEvents[0].classification, "unclassified");
assert.strictEqual(unknown.supportingEvents[0].reason,
  "no-documentable-interaction");
assert.strictEqual(unknown.diagnostics.unassignedMeaningfulEventIds.length, 0);

const again = run(quantity.groups.flatMap(() => [
  event("q1", "value-change", { subtype: "input", controlIdentification: {
    identity: { value: "Quantity" } }, value: { normalized: "5" } }),
  event("q2", "value-change", { subtype: "focusout", controlIdentification: {
    identity: { value: "Quantity" } }, value: { normalized: "500" } })
]));
assert.strictEqual(again.groups[0].stepGroupId,
  run([event("q1", "value-change", { subtype: "input", controlIdentification: {
    identity: { value: "Quantity" } } }), event("q2", "value-change", {
    subtype: "focusout", controlIdentification: {
      identity: { value: "Quantity" } } })]).groups[0].stepGroupId);

const future = grouping.normalizeStepGroup({
  ...quantity.groups[0], futureGroupingMetadata: { retained: true }
});
assert.deepStrictEqual(future.futureGroupingMetadata, { retained: true });

const largeEvents = Array.from({ length: 5000 }, (_, index) =>
  event(`large-${index}`, "activation", { sequence: index + 1 }));
const started = Date.now();
const large = run(largeEvents);
assert.strictEqual(large.groups.length, 5000);
assert.ok(Date.now() - started < 5000, "large grouping regression");

console.log("Event Step Grouping tests passed.");
