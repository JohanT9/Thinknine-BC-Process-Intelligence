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
assert.strictEqual(quantity.groupingVersion, "1.24.0");
// Regression: event 125 from the user's September 7 recording. No usable name or identity.
const legacyBack = run([event("legacy125", "activation", {
  rawEventType: "click", actionIdentification: { caption: "\uE72B" },
  controlIdentification: { type: "button", role: "button", caption: "\uE72B" }
})]);
assert.strictEqual(legacyBack.groups.length, 0);
assert.strictEqual(legacyBack.supportingEvents.length, 1);
assert.strictEqual(run([event("close1", "action-invocation", {
  actionIdentification: { caption: "Stäng" }
})]).groups.length, 0);
assert.strictEqual(run([event("saveclose1", "action-invocation", {
  actionIdentification: { caption: "Spara och stäng" }
})]).groups.length, 1);
const secondaryMenu = run([
  event("menu1", "action-invocation", {
    actionIdentification: { caption: "Visa sekundära åtgärder" }
  }),
  event("menu2", "action-invocation", {
    actionIdentification: { caption: "Manuell vikt" }
  })
]);
assert.strictEqual(secondaryMenu.groups.length, 1);
assert.deepStrictEqual(secondaryMenu.groups[0].sourceEventIds, ["source:menu2"]);
assert.strictEqual(secondaryMenu.supportingEvents.length, 1);
assert.strictEqual(run([event("legacy-section1", "action-invocation", {
  rawEventType: "click",
  controlIdentification: { controlType: "unknownInteractiveControl", caption: "Vikt" }
})]).groups.length, 0);
assert.strictEqual(run([event("section1", "action-invocation", {
  controlIdentification: { controlType: "sectionToggle", caption: "Vikt" }
})]).groups.length, 0);
assert.strictEqual(run([event("weight1", "value-change", {
  controlIdentification: { controlType: "field", caption: "Vikt" },
  value: { normalized: "10" }
})]).groups.length, 1);
for (const caption of ["Visa resten", "Show more", "Visa mindre", "Show less"]) {
  const result = run([event("display1", "action-invocation", {
    actionIdentification: { caption }
  })]);
  assert.strictEqual(result.groups.length, 0, caption);
  assert.strictEqual(result.supportingEvents.length, 1);
}
const scrollOnly = run([event("scroll1", "action-invocation", {
  actionIdentification: { caption: "Rulla åt höger" }
})]);
assert.strictEqual(scrollOnly.groups.length, 0);
assert.strictEqual(scrollOnly.supportingEvents.length, 1);
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

const legacyDialogLookup = run([
  lookupEvents[0],
  event("ld2", "dialog-open", { pageIdentification: {
    caption: "Customers", modal: true }, frameContext: { frameId: "dialog" } }),
  lookupEvents[1], lookupEvents[2],
  event("ld5", "dialog-close", { pageIdentification: {
    caption: "Customers", modal: true }, frameContext: { frameId: "dialog" } }),
  lookupEvents[3]
]);
assert.strictEqual(legacyDialogLookup.groups.length, 1,
  "legacy lookup dialog state must stay inside the lookup interaction");
assert.strictEqual(legacyDialogLookup.groups[0].groupKind, "lookup-interaction");
assert.deepStrictEqual(legacyDialogLookup.groups[0].normalizedEventIds,
  ["normalized:l1", "normalized:ld2", "normalized:l2", "normalized:l3",
    "normalized:ld5", "normalized:l4"]);
assert.strictEqual(semantic.processStepGroups(
  legacyDialogLookup.groups)[0].selectedValue, "1033");
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

const rowSelection = run([event("rs1", "selection-change", {
  controlIdentification: { controlType: "listRow", caption: "30043" },
  selection: { value: "30043", caption: "30043" }
})]);
assert.strictEqual(rowSelection.groups[0].groupKind, "row-interaction",
  "a selected Business Central list row must retain its distinct interaction type");
const rowSemanticInput = semantic.processStepGroups(rowSelection.groups)[0];
assert.strictEqual(rowSemanticInput.actionType, "SelectRecord");
assert.strictEqual(rowSemanticInput.displayText, "V\u00e4lj posten **30043**.");

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
const meaningfulDialogSemantic = semantic.processStepGroups(
  meaningfulDialogAction.groups);
assert.strictEqual(meaningfulDialogSemantic[1].actionType, "RunDialogAction");
assert.strictEqual(meaningfulDialogSemantic[1].displayText,
  "V\u00e4lj **Calculate and replace** i dialogrutan.");

const orphanDialogState = run([
  event("od1", "dialog-open", {
    pageIdentification: { caption: "Information", modal: true } }),
  event("od2", "dialog-close", {
    pageIdentification: { caption: "Information", modal: true } })
]);
assert.strictEqual(orphanDialogState.groups.length, 0,
  "dialog state without a recorded user action must not become a procedure step");
assert.deepStrictEqual(orphanDialogState.supportingEvents.map(item =>
  item.classification), ["dialog-state", "dialog-state"]);
assert.strictEqual(orphanDialogState.diagnostics.assignedEventCount, 2);

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

const technicalMenuHierarchy = run([event("mh1", "activation", {
  actionIdentification: { caption: "Post" },
  uiHierarchy: [{ type: "actionBar" },
    { type: "actionGroup", caption: "Posting" }]
})]);
assert.deepStrictEqual(technicalMenuHierarchy.groups[0].uiHierarchy,
  [{ type: "actionBar" }, { type: "actionGroup", caption: "Posting" }]);
const technicalMenuAction = semantic.processStepGroups(
  technicalMenuHierarchy.groups)[0];
assert.strictEqual(technicalMenuAction.actionType, "RunActionPath");
assert.strictEqual(technicalMenuAction.displayText,
  "V\u00e4lj **Posting** \u2192 **Post**.");
assert.deepStrictEqual(technicalMenuAction.actionPath, ["Posting", "Post"]);

const repeatedIntentionalActivation = run([
  event("ra1", "activation", { timestamp: "2026-08-10T10:00:00.000Z",
    actionIdentification: { caption: "New" } }),
  event("ra2", "activation", { timestamp: "2026-08-10T10:00:00.600Z",
    actionIdentification: { caption: "New" } })
]);
assert.strictEqual(repeatedIntentionalActivation.groups.length, 2,
  "separate repeated commands must not be hidden as capture duplicates");

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
  event("n2", "unknown", { rawEventType: "scroll" }),
  event("n3", "key-command", { interaction: { mechanism: "keyboard",
    key: "Escape" } })
]);
assert.strictEqual(noise.groups.length, 0);
assert.strictEqual(noise.supportingEvents.length, 3);
assert.strictEqual(noise.diagnostics.assignedEventCount, 3);

const lookupKeyboardMechanic = run([
  event("lk1", "activation", {
    controlIdentification: { identity: { value: "ItemNo" },
      controlType: "lookup", caption: "Item No." } }),
  event("lk2", "key-command", { interaction: { mechanism: "keyboard",
    key: "Enter" }, pageIdentification: { caption: "Items", modal: true } }),
  event("lk3", "selection-change", {
    pageIdentification: { caption: "Items", modal: true },
    controlIdentification: { controlType: "repeaterCell", caption: "No." },
    selection: { value: "30043" } }),
  event("lk4", "value-change", {
    controlIdentification: { identity: { value: "ItemNo" },
      caption: "Item No." }, value: { normalized: "30043" } })
]);
assert.strictEqual(lookupKeyboardMechanic.groups.length, 1);
assert(lookupKeyboardMechanic.groups[0].normalizedEventIds.includes(
  "normalized:lk2"), "lookup keyboard evidence must remain in its interaction");

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
assert.strictEqual(recorderSeparated.groups.length, 1,
  "a separate navigation observation must not become a user step");
assert.strictEqual(recorderSeparated.groups[0].capturePacket.interactionIdentitySource,
  "recorder");
assert.strictEqual(recorderSeparated.supportingEvents[0].reason,
  "orphan-page-observation");

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
assert.strictEqual(pageBoundary.groups.length, 2);
assert.strictEqual(pageBoundary.supportingEvents[0].reason,
  "orphan-page-observation");

const anonymousNavigation = run([
  event("pn1", "navigation", { pageIdentification: {} })
]);
assert.strictEqual(anonymousNavigation.groups.length, 0,
  "a page observation without a stable identity must not become a user step");
assert.strictEqual(anonymousNavigation.supportingEvents[0].classification,
  "navigation-state");
assert.strictEqual(anonymousNavigation.supportingEvents[0].reason,
  "anonymous-page-observation");

const identifiedNavigation = run([
  event("pn2", "navigation", { pageIdentification: {
    pageObjectId: "9307", caption: "Purchase Orders" } })
]);
assert.strictEqual(identifiedNavigation.groups.length, 0,
  "an observed page without a user interaction must not become a procedure step");
assert.strictEqual(identifiedNavigation.supportingEvents[0].reason,
  "orphan-page-observation");

const duplicateLegacyNavigation = run([
  event("pd1", "navigation", { timestamp: "2026-08-10T10:00:00.000Z",
    pageIdentification: { pageObjectId: "9307", caption: "Purchase Orders" } }),
  event("pd2", "navigation", { timestamp: "2026-08-10T10:00:00.200Z",
    pageIdentification: { pageObjectId: "9307", caption: "Purchase Orders" } })
]);
assert.strictEqual(duplicateLegacyNavigation.groups.length, 0,
  "legacy page telemetry without a user interaction must not create procedure steps");
assert.ok(duplicateLegacyNavigation.supportingEvents.every(item =>
  item.reason === "orphan-page-observation"));

const laterPageRevisit = run([
  event("pr1", "navigation", { timestamp: "2026-08-10T10:00:00.000Z",
    pageIdentification: { pageObjectId: "9307", caption: "Purchase Orders" } }),
  event("pr2", "navigation", { timestamp: "2026-08-10T10:00:01.000Z",
    pageIdentification: { pageObjectId: "9307", caption: "Purchase Orders" } })
]);
assert.strictEqual(laterPageRevisit.groups.length, 0,
  "page observations alone cannot prove a deliberate user revisit");

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

// Regression: a Role Center main landmark must not become a Choose step.
for (const caption of ['Actions Product A Product B', 'Åtgärder', 'Toiminnot', 'Aktionen']) {
  const backgroundClick = event('landmark', 'activation', {
    rawEventType: 'click', subtype: 'interaction',
    controlIdentification: { role: 'main', controlType: 'interactiveSurface', caption }
  });
  const actualButton = event('button', 'action-invocation', {
    rawEventType: 'click', controlIdentification: { role: 'button', caption }
  });
  const result = run([backgroundClick, actualButton]);
  assert.equal(result.groups.length, 1);
  assert.ok(result.groups[0].sourceEventIds.includes(actualButton.sourceEventId));
  assert.ok(!result.groups[0].sourceEventIds.includes(backgroundClick.sourceEventId));
  assert.ok(result.supportingEvents.some(item => item.normalizedEventId === backgroundClick.normalizedEventId));
}

for (const kind of ['value-change', 'toggle-change']) {
  const searchField = event('search-field', kind, { rawEventType: 'field-change',
    controlIdentification: {role:'textbox',caption:'Tell me what you want to do.'}, value:{normalized:'sales ord'} });
  assert.equal(run([searchField]).groups.length, 0);
  assert.equal(run([{...searchField,controlIdentification:{role:'textbox',caption:'Description'}}]).groups.length, 1);
}

// Empty field focus is supporting evidence, independent of the captured language.
for (const caption of ['The value for this field is required.', 'Värde krävs', 'Valeur requise', 'Wert erforderlich', 'Valor obligatorio', 'Værdi kræves', 'Arvo vaaditaan', 'Verdi kreves']) {
  for (const kind of ['activation', 'toggle-change']) {
    const focus = event('empty-field', kind, {rawEventType:'click',
      controlIdentification:{role:'combobox',controlType:'interactiveSurface',caption}});
    const snapshot = JSON.stringify(focus);
    const result = run([focus]);
    assert.equal(result.groups.length, 0);
    assert.ok(result.supportingEvents.some(item => item.normalizedEventId === focus.normalizedEventId));
    assert.equal(JSON.stringify(focus), snapshot);
    assert.equal(run([{...focus,kind:'value-change',rawEventType:'field-change',value:{normalized:'500'}}]).groups.length,1);
    assert.equal(run([{...focus,kind:'activation',controlIdentification:{role:'combobox',controlType:'lookup',caption}}]).groups.length,1);
    assert.equal(run([{...focus,kind:'selection-change',value:{normalized:'ITEM-1'}}]).groups.length,1);
  }
}
