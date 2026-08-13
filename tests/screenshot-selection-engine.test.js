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
assert.strictEqual(quantity.selectionVersion, "1.1.0");
assert.strictEqual(quantity.selectedScreenshotAssetId, "shot-commit");
assert.ok(quantity.selectionReasons.includes("primary-event"));
assert.ok(quantity.selectionReasons.includes("same-control"));
assert.ok(quantity.selectionReasons.includes("committed-value"));
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
assert.ok(lookup.selectionReasons.includes("resulting-field-value"));

const rowPrimary = engine.select({ stepGroup: { ...lookupGroup,
  primarySourceEventId: "event:row", primaryEventId: "normalized:row" }, candidates: [
  candidate("lookup-open", "event:open", "lookup-open"),
  candidate("lookup-row", "event:row", "row-selection")
] });
assert.strictEqual(rowPrimary.selectedScreenshotAssetId, "lookup-row");
assert.ok(rowPrimary.selectionReasons.includes("selected-row"));

const toggle = engine.select({ stepGroup: group({ groupKind: "toggle-interaction",
  primarySourceEventId: "event:after", sourceEventIds: ["event:before", "event:after"],
  screenshotAssetIds: ["before", "after"] }), candidates: [
  candidate("before", "event:before", "activation"),
  candidate("after", "event:after", "toggle-change")
] });
assert.strictEqual(toggle.selectedScreenshotAssetId, "after");
assert.ok(toggle.selectionReasons.includes("confirmed-toggle-state"));

const action = engine.select({ stepGroup: group({ groupKind: "action",
  primarySourceEventId: "event:post", sourceEventIds: ["event:post", "event:result"],
  screenshotAssetIds: ["post", "result"] }), candidates: [
  candidate("post", "event:post", "activation"),
  candidate("result", "event:result", "navigation", { page: { id: "99" } })
] });
assert.strictEqual(action.selectedScreenshotAssetId, "post");
assert.ok(action.selectionReasons.includes("action-invocation"));

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
