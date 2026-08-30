const assert = require("assert");
const engine = require("../src/engine/screenshot-selection-engine");
const semanticDocument = require("../src/document/semantic-document");
const screenshotIntelligence = require("../src/document/screenshot-intelligence");

function group(overrides = {}) {
  return Object.freeze({
    stepGroupId: "step-group:quantity", groupingVersion: "1.0.0",
    sourceEventIds: ["event:item", "event:focus", "event:commit"],
    normalizedEventIds: ["normalized:item", "normalized:focus", "normalized:commit"],
    primaryEventId: "normalized:commit", primarySourceEventId: "event:commit",
    groupKind: "field-edit", screenshotAssetIds: ["shot-item", "shot-focus", "shot-commit"],
    controlContext: { identity: { value: "Quantity" }, caption: "Quantity" },
    pageContext: { id: "42", caption: "Sales Order" },
    primaryNormalizedEvent: { kind: "value-change",
      controlIdentification: { type: "field", caption: "Quantity" },
      value: { normalized: "500" } }, ...overrides
  });
}
function candidate(id, sourceEventId, normalizedKind, extra = {}) {
  return { screenshotAssetId: id, screenshotRef: `${id}.png`, sourceEventId,
    normalizedKind, page: { id: "42" }, control: { caption: "Quantity" },
    ...extra };
}

const quantityGroup = group();
const quantityCandidates = Object.freeze([
  candidate("shot-item", "event:item", "row-selection", {
    control: { caption: "Item No." } }),
  candidate("shot-focus", "event:focus", "focus-transition"),
  candidate("shot-commit", "event:commit", "value-change", {
    stability: { stable: true }, control: { caption: "Quantity", visible: true } })
]);
const quantity = engine.select({ stepGroup: quantityGroup,
  candidates: quantityCandidates });
assert.strictEqual(quantity.schemaVersion, 1);
assert.strictEqual(quantity.selectionVersion, "1.3.0");
assert.strictEqual(quantity.captureRoleVersion, "1.0.0");
assert.strictEqual(quantity.selectedScreenshotAssetId, "shot-commit");
assert.strictEqual(quantity.selectedCaptureRole, "result-visible");
assert.ok(quantity.selectionReasons.includes("primary-event"));
assert.ok(quantity.selectionReasons.includes("same-control"));
assert.ok(quantity.selectionReasons.includes("role-result-visible"));
assert.strictEqual(quantity.selectionMode, "automatic");
assert.ok(quantity.rejectedCandidates.find(item =>
  item.screenshotAssetId === "shot-item").reasons.includes("mismatched-control"));
assert.ok(Object.isFrozen(quantity));
assert.strictEqual(engine.select({ stepGroup: quantityGroup,
  candidates: quantityCandidates }), quantity);

const lookupGroup = group({ stepGroupId: "step-group:lookup",
  groupKind: "lookup-interaction", primarySourceEventId: "event:result",
  primaryEventId: "normalized:result",
  sourceEventIds: ["event:open", "event:search", "event:row", "event:result"],
  screenshotAssetIds: ["lookup-open", "lookup-search", "lookup-row", "lookup-result"],
  controlContext: { identity: { value: "CustomerNo" }, caption: "Customer No." }
});
const lookup = engine.select({ stepGroup: lookupGroup, candidates: [
  candidate("lookup-open", "event:open", "lookup-open", {
    control: { identity: { value: "CustomerNo" } } }),
  candidate("lookup-search", "event:search", "value-change"),
  candidate("lookup-row", "event:row", "row-selection", {
    page: { caption: "Customers", modal: true }, control: { caption: "No." } }),
  candidate("lookup-result", "event:result", "value-change", {
    control: { identity: { value: "CustomerNo" } } })
] });
assert.strictEqual(lookup.selectedScreenshotAssetId, "lookup-result",
  "primary final value wins when it is explicitly tied to the group primary event");
assert.strictEqual(lookup.selectedCaptureRole, "result-visible");
assert.ok(lookup.selectionReasons.includes("role-result-visible"));

const rowPrimary = engine.select({ stepGroup: { ...lookupGroup,
  primarySourceEventId: "event:row", primaryEventId: "normalized:row" }, candidates: [
  candidate("lookup-open", "event:open", "lookup-open"),
  candidate("lookup-row", "event:row", "row-selection")
] });
assert.strictEqual(rowPrimary.selectedScreenshotAssetId, "lookup-row");
assert.ok(rowPrimary.selectionReasons.includes("role-selection-visible"));

const toggle = engine.select({ stepGroup: group({ groupKind: "toggle-interaction",
  primarySourceEventId: "event:after", sourceEventIds: ["event:before", "event:after"],
  screenshotAssetIds: ["before", "after"] }), candidates: [
  candidate("before", "event:before", "activation"),
  candidate("after", "event:after", "toggle-change")
] });
assert.strictEqual(toggle.selectedScreenshotAssetId, "after");
assert.ok(toggle.selectionReasons.includes("role-result-visible"));

const action = engine.select({ stepGroup: group({ groupKind: "action",
  primarySourceEventId: "event:post", sourceEventIds: ["event:post", "event:result"],
  screenshotAssetIds: ["post", "result"] }), candidates: [
  candidate("post", "event:post", "activation"),
  candidate("result", "event:result", "navigation", { page: { id: "99" } })
] });
assert.strictEqual(action.selectedScreenshotAssetId, "post");
assert.ok(action.selectionReasons.includes("role-action-visible"));

const packetAwareGroup = group({ stepGroupId: "step-group:packet-aware-action",
  groupKind: "action", primarySourceEventId: "event:action",
  sourceEventIds: ["event:action", "event:result", "event:later"],
  screenshotAssetIds: ["action-visible", "verified-result", "later-context"],
  capturePacket: {
    packetVersion: "1.3.0", preferredScreenshotAssetId: "verified-result",
    preferredScreenshotRole: "result", screenshotEvidence: [
      { assetId: "action-visible", sourceEventId: "event:action",
        role: "interaction" },
      { assetId: "verified-result", sourceEventId: "event:result",
        role: "result" },
      { assetId: "later-context", sourceEventId: "event:later",
        role: "supporting" }
    ]
  }
});
const packetCandidates = Object.freeze([
  candidate("action-visible", "event:action", "activation"),
  candidate("verified-result", "event:result", "navigation", {
    stability: { stable: true } }),
  candidate("later-context", "event:later", "activation")
]);
const packetAware = engine.select({ stepGroup: packetAwareGroup,
  candidates: packetCandidates });
assert.strictEqual(packetAware.selectedScreenshotAssetId, "verified-result",
  "verified packet result should win over the action and later context image");
assert.strictEqual(packetAware.selectedPacketEvidenceRole, "result");
assert.ok(packetAware.selectionReasons.includes("capture-packet-result"));
assert.ok(packetAware.selectionReasons.includes("capture-packet-preferred"));
assert.ok(packetAware.rejectedCandidates.find(item =>
  item.screenshotAssetId === "later-context").reasons.includes(
    "capture-packet-supporting"));
assert.strictEqual(engine.select({ stepGroup: packetAwareGroup,
  candidates: packetCandidates }), packetAware,
"packet-aware selection should remain deterministic and cacheable");
assert.strictEqual(packetCandidates[0].packetEvidenceRole, undefined,
  "selection must not mutate candidate input");

const packetManual = engine.select({ stepGroup: packetAwareGroup,
  candidates: packetCandidates, manualOverride: "action-visible" });
assert.strictEqual(packetManual.selectedScreenshotAssetId, "action-visible");
assert.strictEqual(packetManual.selectionMode, "manual",
  "capture packet evidence must not replace a manual image choice");

const historicalAction = engine.select({ stepGroup: {
  ...packetAwareGroup, capturePacket: undefined }, candidates: packetCandidates });
assert.strictEqual(historicalAction.selectedScreenshotAssetId, "action-visible",
  "historical groups without packet evidence keep established action selection");

const captureRoles = [
  [{ normalizedKind: "lookup-open" }, "menu-open"],
  [{ normalizedKind: "activation", uiState: { menuOpen: true,
    selectedOptionVisible: true } }, "selection-visible"],
  [{ normalizedKind: "value-change" }, "result-visible"],
  [{ normalizedKind: "dialog-action", uiState: { dialogComplete: true } },
    "dialog-before-close"],
  [{ normalizedKind: "dialog-close" }, "dialog-closed"],
  [{ normalizedKind: "activation" }, "action-visible"],
  [{ normalizedKind: "focus-transition" }, "focus-only"],
  [{ normalizedKind: "value-change", capturePhase: "before-value" },
    "before-value"],
  [{ normalizedKind: "unknown" }, "context"]
];
for (const [input, expected] of captureRoles) {
  assert.strictEqual(engine.classifyCaptureRole(input), expected);
  const normalized = engine.normalizeCandidate(input);
  assert.strictEqual(normalized.captureRole, expected);
  assert.strictEqual(normalized.captureRoleVersion, "1.0.0");
  assert.ok(Object.isFrozen(normalized));
}

const menuSelection = engine.select({ stepGroup: group({ groupKind: "action",
  primarySourceEventId: "event:menu", sourceEventIds: ["event:open", "event:menu"],
  screenshotAssetIds: ["menu-open", "menu-selected"] }), candidates: [
  candidate("menu-open", "event:open", "activation", {
    uiState: { menuOpen: true } }),
  candidate("menu-selected", "event:menu", "activation", {
    uiState: { menuOpen: true, selectedOptionVisible: true } })
] });
assert.strictEqual(menuSelection.selectedScreenshotAssetId, "menu-selected");
assert.strictEqual(menuSelection.selectedCaptureRole, "selection-visible");
assert.ok(menuSelection.selectionReasons.includes("role-selection-visible"));

const derivedCandidates = screenshotIntelligence.fromEvents({ events: [{
  eventNo: 8, timestamp: "2026-08-28T10:00:00.000Z", type: "click",
  category: "action", normalizedInteraction: { kind: "dialog-action" },
  dialogComplete: true, canonicalScreenshotAssetId: "asset-dialog"
}], imagePaths: { 8: "dialog.png" }, tasks: [{ taskId: "dialog-task",
  sourceEventNos: [8], screenshot: "dialog.png" }] });
assert.strictEqual(engine.normalizeCandidate(derivedCandidates[0]).captureRole,
  "dialog-before-close", "observable capture metadata should reach role classification");

const manual = engine.select({ stepGroup: quantityGroup,
  candidates: quantityCandidates, manualOverride: "shot-focus" });
assert.strictEqual(manual.selectedScreenshotAssetId, "shot-focus");
assert.strictEqual(manual.selectionMode, "manual");
assert.deepStrictEqual(manual.selectionReasons, ["manual-override"]);

const annotated = engine.select({ stepGroup: quantityGroup, candidates: [
  candidate("shot-item", "event:item", "row-selection"),
  candidate("shot-focus", "event:focus", "focus-transition", {
    annotationRefs: [{ annotationId: "annotation-1" }] }),
  candidate("shot-commit", "event:commit", "value-change")
] });
assert.strictEqual(annotated.selectedScreenshotAssetId, "shot-focus");
assert.strictEqual(annotated.selectionMode, "annotation-safe");

const multipleAnnotated = engine.select({ stepGroup: quantityGroup, candidates: [
  candidate("shot-focus", "event:focus", "focus-transition", {
    annotationRefs: [{ annotationId: "a" }] }),
  candidate("shot-commit", "event:commit", "value-change", {
    annotationRefs: [{ annotationId: "b" }] })
] });
assert.strictEqual(multipleAnnotated.selectedScreenshotAssetId, null);
assert.strictEqual(multipleAnnotated.preserveAllAnnotated, true);

const duplicates = engine.select({ stepGroup: group({ screenshotAssetIds: ["same"] }),
  candidates: [candidate("same", "event:commit", "value-change"),
    candidate("same", "event:commit", "value-change")] });
assert.deepStrictEqual(duplicates.candidateScreenshotAssetIds, ["same"]);

const none = engine.select({ stepGroup: group({ sourceEventIds: [],
  screenshotAssetIds: [] }), candidates: [] });
assert.strictEqual(none.selectedScreenshotAssetId, null);
assert.ok(none.selectionReasons.includes("no-valid-candidate"));

const legacy = engine.select({ candidates: [candidate("legacy", "", "")],
  existingSelection: "legacy" });
assert.strictEqual(legacy.selectedScreenshotAssetId, "legacy");
assert.strictEqual(legacy.fallbackUsed, true);

const profileCandidates = [
  candidate("overview", "event:item", "value-change", {
    uiState: { context: "overview" } }),
  candidate("focused", "event:focus", "value-change", {
    uiState: { context: "focused" } })
];
const business = engine.select({ stepGroup: group({ primarySourceEventId: "" }),
  candidates: profileCandidates, profile: { profileId: "business-process" } });
const quick = engine.select({ stepGroup: group({ primarySourceEventId: "" }),
  candidates: profileCandidates, profile: { profileId: "quick-reference" } });
assert.strictEqual(business.selectedScreenshotAssetId, "overview");
assert.strictEqual(quick.selectedScreenshotAssetId, "focused");
assert.notStrictEqual(business.selectionId, quick.selectionId);

const future = engine.normalizeSelection({ ...quantity,
  futureSelectionMetadata: { retained: true } });
assert.deepStrictEqual(future.futureSelectionMetadata, { retained: true });

const largeCandidates = Array.from({ length: 5000 }, (_, index) =>
  candidate(`large-${index}`, `event-${index}`, "activation"));
const largeGroup = group({ stepGroupId: "large", groupKind: "action",
  primarySourceEventId: "event-4999",
  sourceEventIds: largeCandidates.map(item => item.sourceEventId),
  screenshotAssetIds: largeCandidates.map(item => item.screenshotAssetId) });
const started = Date.now();
assert.strictEqual(engine.select({ stepGroup: largeGroup,
  candidates: largeCandidates }).selectedScreenshotAssetId, "large-4999");
assert.ok(Date.now() - started < 5000, "large candidate selection regression");

const modernDocument = semanticDocument.normalize({
  documentId: "modern-selection", assets: quantityCandidates.map(item => ({
    assetId: `asset:${item.screenshotAssetId}`, kind: "image",
    sourceRef: { screenshotRef: item.screenshotRef }
  })), sections: [{ sectionId: "workflow", kind: "workflow", blocks: [{
    blockId: "step:quantity", kind: "step", stepNumber: 1,
    sourceRef: { taskId: "quantity" }, interaction: { stepGroups: [quantityGroup] },
    blocks: [{ blockId: "text", kind: "paragraph", text: "Quantity" },
      ...quantityCandidates.map(item => ({ blockId: `image:${item.screenshotAssetId}`,
        kind: "image", assetId: `asset:${item.screenshotAssetId}`,
        sourceRef: { screenshotRef: item.screenshotRef } }))]
  }] }]
});
const modernSelection = screenshotIntelligence.select(modernDocument, {
  candidates: screenshotIntelligence.normalizeCandidates(quantityCandidates)
});
const modernImages = modernSelection.document.sections[0].blocks[0].blocks
  .filter(block => block.kind === "image");
assert.deepStrictEqual(modernImages.map(block => block.sourceRef.screenshotRef),
  ["shot-commit.png"]);
assert.strictEqual(modernSelection.selections[0].selectionResult
  .selectedScreenshotAssetId, "shot-commit");

console.log("Screenshot Selection Engine tests passed.");
