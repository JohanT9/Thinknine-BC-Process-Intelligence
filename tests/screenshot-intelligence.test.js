const assert = require("assert");
const semantic = require("../src/document/semantic-document");
const intelligence = require("../src/document/screenshot-intelligence");
const profiles = require("../src/document/document-profile");
const pipeline = require("../src/exporters/word-export-pipeline");
const workspace = require("../src/document/document-workspace");

function profile(id) {
  return profiles.get(profiles.BUILT_IN_REGISTRY, id);
}

function documentFor(steps) {
  const refs = [...new Set(steps.flatMap(step => step.refs))];
  return semantic.normalize({ documentId: "screenshot-document",
    metadata: { title: "Order" },
    assets: refs.map(ref => ({ assetId: `asset:${ref}`, kind: "image",
      sourceRef: { screenshotRef: ref } })),
    sections: [{ sectionId: "workflow", kind: "workflow",
      blocks: steps.map((step, stepIndex) => ({
        blockId: `step:${stepIndex + 1}`, kind: "step", stepNumber: stepIndex + 1,
        sourceRef: { taskId: step.taskId || `task-${stepIndex + 1}`,
          sourceEventIds: step.eventIds || [] },
        ...(step.selection ? { screenshotSelection: step.selection } : {}),
        blocks: [{ blockId: `text:${stepIndex + 1}`, kind: "paragraph",
          text: "Välj Bokför." }, ...step.refs.map((ref, imageIndex) => ({
          blockId: `image:${stepIndex + 1}:${imageIndex + 1}`, kind: "image",
          assetId: `asset:${ref}`,
          sourceRef: { taskId: step.taskId || `task-${stepIndex + 1}`,
            screenshotRef: ref },
          annotationRefs: step.annotations?.[ref] || []
        }))]
      })) }]
  });
}

function selectedRefs(result, stepIndex = 0) {
  const step = result.document.sections[0].blocks[stepIndex];
  return step.blocks.filter(block => block.kind === "image")
    .map(block => block.sourceRef.screenshotRef);
}

const singleDocument = documentFor([{ refs: ["one.png"] }]);
const single = intelligence.select(singleDocument, { candidates: [] });
assert.deepStrictEqual(selectedRefs(single), ["one.png"]);
assert.deepStrictEqual(single.selections[0].reasons, ["single-candidate"]);

const candidates = intelligence.normalizeCandidates([{
  screenshotRef: "loading.png", sourceEventId: 1, taskId: "task-1",
  dimensions: { width: 800, height: 450 }, target: { visible: false },
  uiState: { loading: true, tooltipVisible: true, transientNotification: true },
  stability: { stable: false },
  futureSignal: { preserve: true }
}, {
  screenshotRef: "clear.png", sourceEventId: 2, taskId: "task-1",
  dimensions: { width: 1920, height: 1080 }, target: { visible: true,
    obscured: false }, uiState: { dialogComplete: true },
  stability: { stable: true }
}]);
const evaluatedDocument = documentFor([{
  refs: ["loading.png", "clear.png"], eventIds: ["1", "2"]
}]);
const evaluated = intelligence.select(evaluatedDocument, {
  candidates, profile: profile("sop")
});
assert.deepStrictEqual(selectedRefs(evaluated), ["clear.png"]);
assert.ok(evaluated.selections[0].reasons.includes("target-visible"));
assert.ok(evaluated.selections[0].reasons.includes("stable-ui-state"));
assert.ok(evaluated.selections[0].reasons.includes("complete-dialog"));
assert.ok(evaluated.selections[0].reasons.includes("sufficient-resolution"));
assert.ok(evaluated.selections[0].rejectedReasons["loading.png"]
  .includes("loading-state"));
assert.ok(evaluated.selections[0].rejectedReasons["loading.png"]
  .includes("tooltip-visible"));
assert.ok(evaluated.selections[0].rejectedReasons["loading.png"]
  .includes("transient-notification"));
assert.deepStrictEqual(evaluated.selections[0].candidates[0]
  .metadata.futureSignal, { preserve: true });

const duplicates = intelligence.select(documentFor([{
  refs: ["same.png", "same.png"]
}]), { candidates: [] });
assert.deepStrictEqual(selectedRefs(duplicates), ["same.png"]);
assert.deepStrictEqual(duplicates.selections[0].reasons, ["exact-duplicate"]);

const tiedCandidates = intelligence.normalizeCandidates([{
  screenshotRef: "first.png", sourceEventId: 1, taskId: "task-1"
}, { screenshotRef: "second.png", sourceEventId: 2, taskId: "task-1" }]);
const tied = intelligence.select(documentFor([{
  refs: ["first.png", "second.png"], eventIds: ["1", "2"]
}]), { candidates: tiedCandidates });
assert.deepStrictEqual(selectedRefs(tied), ["first.png", "second.png"]);
assert.deepStrictEqual(tied.selections[0].reasons,
  ["equivalent-candidates-fallback"]);

const nearDuplicateCandidates = intelligence.normalizeCandidates([{
  screenshotRef: "near-1.png", sourceEventId: 9,
  target: { automationId: "Post" }, dimensions: { width: 1280, height: 720 },
  uiState: { pageId: "SalesOrder" }
}, { screenshotRef: "near-2.png", sourceEventId: 9,
  target: { automationId: "Post" }, dimensions: { width: 1280, height: 720 },
  uiState: { pageId: "SalesOrder" }
}]);
const nearDuplicate = intelligence.select(documentFor([{
  refs: ["near-1.png", "near-2.png"], eventIds: ["9"]
}]), { candidates: nearDuplicateCandidates });
assert.deepStrictEqual(selectedRefs(nearDuplicate), ["near-1.png"]);
assert.deepStrictEqual(nearDuplicate.selections[0].reasons,
  ["near-duplicate-stable-order"]);

const incomplete = intelligence.select(documentFor([{
  refs: ["known.png", "unknown.png"]
}]), { candidates: intelligence.normalizeCandidates([{
  screenshotRef: "known.png", stability: { stable: true }
}]) });
assert.deepStrictEqual(selectedRefs(incomplete), ["known.png", "unknown.png"]);
assert.deepStrictEqual(incomplete.selections[0].reasons,
  ["incomplete-metadata-fallback"]);

const manualDocument = documentFor([{ refs: ["auto.png", "manual.png"],
  selection: { mode: "manual", screenshotRef: "manual.png",
    futureSelectionField: true } }]);
const manual = intelligence.select(manualDocument, { candidates });
assert.deepStrictEqual(selectedRefs(manual), ["manual.png"]);
assert.strictEqual(manual.selections[0].manualSelectionPreserved, true);
const unavailableManual = intelligence.select(documentFor([{
  refs: ["auto-1.png", "auto-2.png"], selection: {
    mode: "manual", screenshotRef: "missing.png"
  }
}]), { candidates: intelligence.normalizeCandidates([
  { screenshotRef: "auto-1.png", stability: { stable: false } },
  { screenshotRef: "auto-2.png", stability: { stable: true } }
]) });
assert.deepStrictEqual(selectedRefs(unavailableManual),
  ["auto-1.png", "auto-2.png"]);
assert.deepStrictEqual(unavailableManual.selections[0].reasons,
  ["manual-selection-unavailable-fallback"]);
const manualAnnotationConflict = intelligence.select(documentFor([{
  refs: ["manual.png", "annotated-other.png"], selection: {
    mode: "manual", screenshotRef: "manual.png"
  }, annotations: { "annotated-other.png": [{ annotationId: "other",
    screenshotRef: "annotated-other.png" }] }
}]), { candidates: intelligence.normalizeCandidates([
  { screenshotRef: "manual.png", stability: { stable: true } },
  { screenshotRef: "annotated-other.png", stability: { stable: false } }
]) });
assert.deepStrictEqual(selectedRefs(manualAnnotationConflict),
  ["manual.png", "annotated-other.png"]);
assert.strictEqual(manualAnnotationConflict.selections[0]
  .manualSelectionPreserved, true);
assert.ok(manualAnnotationConflict.selections[0].reasons
  .includes("annotation-preservation-fallback"));

const annotated = intelligence.select(documentFor([{
  refs: ["plain.png", "annotated.png"], annotations: {
    "annotated.png": [{ annotationId: "annotation-1",
      screenshotRef: "annotated.png" }]
  }
}]), { candidates: intelligence.normalizeCandidates([{
  screenshotRef: "plain.png", stability: { stable: true }
}, { screenshotRef: "annotated.png", stability: { stable: false } }]) });
assert.deepStrictEqual(selectedRefs(annotated), ["annotated.png"]);
assert.strictEqual(annotated.document.sections[0].blocks[0].blocks
  .find(block => block.kind === "image").annotationRefs[0].annotationId,
"annotation-1");

const multipleAnnotatedDocument = documentFor([{
  refs: ["a.png", "b.png"], annotations: {
    "a.png": [{ annotationId: "a", screenshotRef: "a.png" }],
    "b.png": [{ annotationId: "b", screenshotRef: "b.png" }]
  }
}]);
const multipleAnnotated = intelligence.select(multipleAnnotatedDocument, {
  candidates: intelligence.normalizeCandidates([
    { screenshotRef: "a.png", stability: { stable: false } },
    { screenshotRef: "b.png", stability: { stable: true } }
  ])
});
assert.deepStrictEqual(selectedRefs(multipleAnnotated), ["a.png", "b.png"]);
assert.deepStrictEqual(multipleAnnotated.selections[0].reasons,
  ["annotation-preservation-fallback"]);

const profileDocument = documentFor([{ refs: ["overview.png", "focused.png"] }]);
const profileCandidates = intelligence.normalizeCandidates([{
  screenshotRef: "overview.png", uiState: { context: "overview" }
}, { screenshotRef: "focused.png", uiState: { context: "focused" } }]);
assert.deepStrictEqual(selectedRefs(intelligence.select(profileDocument, {
  candidates: profileCandidates, profile: profile("business-process")
})), ["overview.png"]);
assert.deepStrictEqual(selectedRefs(intelligence.select(profileDocument, {
  candidates: profileCandidates, profile: profile("quick-reference")
})), ["focused.png"]);

const narrativeDocument = documentFor([
  { taskId: "task-1", refs: ["start-a.png", "start-b.png"] },
  { taskId: "task-2", refs: ["continue-a.png", "switch-b.png"] }
]);
const narrativeCandidates = intelligence.normalizeCandidates([
  { screenshotRef: "start-a.png", taskId: "task-1", uiState: { pageId: "A" },
    stability: { stable: true } },
  { screenshotRef: "start-b.png", taskId: "task-1", uiState: { pageId: "B" },
    stability: { stable: false } },
  { screenshotRef: "continue-a.png", taskId: "task-2", uiState: { pageId: "A" } },
  { screenshotRef: "switch-b.png", taskId: "task-2", uiState: { pageId: "B" } }
]);
const narrative = intelligence.select(narrativeDocument,
  { candidates: narrativeCandidates });
assert.deepStrictEqual(selectedRefs(narrative, 0), ["start-a.png"]);
assert.deepStrictEqual(selectedRefs(narrative, 1), ["continue-a.png"]);
assert.ok(narrative.selections[1].reasons.includes("visual-continuity"));

const recorderEvents = [{ eventNo: 41, timestamp: "2026-08-06T10:00:00Z",
  type: "click", category: "action", pageId: "SalesOrders",
  pageCaption: "Försäljningsorder", role: "button", label: "Bokför" },
{ eventNo: 42, timestamp: "2026-08-06T10:00:01Z", type: "dialog",
  category: "dialog", pageId: "SalesOrders",
  pageCaption: "Försäljningsorder", role: "dialog", label: "Bekräfta" }];
const realShaped = intelligence.fromEvents({ events: recorderEvents,
  imagePaths: { 41: "screenshots/000041.png", 42: "screenshots/000042.png",
    99: "screenshots/unrelated.png" },
  tasks: [{ taskId: "ReviewTask-1", sourceEventNos: [41, 42],
    screenshots: ["screenshots/000041.png", "screenshots/000042.png"] }] });
assert.strictEqual(realShaped[1].interactionType, "dialog");
assert.strictEqual(realShaped[1].target.role, "dialog");
assert.strictEqual(realShaped[1].uiState.pageId, "SalesOrders");
assert.strictEqual(realShaped.length, 2, "unrelated session images are not scanned");
assert.ok(Object.isFrozen(realShaped));

const sourceBefore = JSON.stringify(evaluatedDocument);
const first = intelligence.select(evaluatedDocument, { candidates });
const repeated = intelligence.select(evaluatedDocument, { candidates });
assert.strictEqual(first, repeated, "immutable revision/profile output is cached");
assert.strictEqual(JSON.stringify(evaluatedDocument), sourceBefore);
assert.deepStrictEqual(first, repeated, "selection is deterministic");
const mutableCandidates = JSON.parse(JSON.stringify(candidates));
const mutableFirst = intelligence.select(evaluatedDocument,
  { candidates: mutableCandidates });
mutableCandidates[0].stability.stable = true;
assert.notStrictEqual(intelligence.select(evaluatedDocument,
  { candidates: mutableCandidates }), mutableFirst,
"mutable candidate input must not be cached");

const review = { reviewVersion: "1.0.0", sessionId: "legacy",
  sessionName: "Order", tasks: [{ taskId: "legacy-task",
    instruction: "Välj Bokför.", sourceEventNos: [41, 42],
    screenshots: ["screenshots/000041.png", "screenshots/000042.png"] }] };
const session = { id: "legacy", name: "Order", startedAt: "2026-08-06",
  settings: { environmentName: "Test" } };
const legacy = pipeline.create({ review, session });
assert.strictEqual(legacy.screenshotSelections[0].reasons[0],
  "incomplete-metadata-fallback");
assert.strictEqual(pipeline.screenshotComponents(legacy.plan).length, 2);
const prepared = pipeline.create({ review, session, screenshotCandidates: realShaped });
assert.strictEqual(prepared.screenshotSelections[0].selectedScreenshotRef,
  "screenshots/000042.png");
const assetById = new Map(prepared.semanticDocument.assets.map(asset =>
  [asset.assetId, asset]));
const planRefs = pipeline.screenshotComponents(prepared.plan)
  .map(component => assetById.get(component.content.assetId)
    ?.sourceRef.screenshotRef);
const workspaceAssetIds = workspace.render(prepared.plan).sections
  .flatMap(section => section.items)
  .filter(item => item.kind === "image")
  .map(item => item.content.assetId);
assert.deepStrictEqual(planRefs, ["screenshots/000042.png"]);
assert.deepStrictEqual(workspaceAssetIds,
  pipeline.requiredMediaAssetIds(prepared.plan),
  "Document Workspace and Word plan must use the same selection");
assert.deepStrictEqual(pipeline.requiredMediaAssetIds(prepared.plan),
  [pipeline.screenshotComponents(prepared.plan)[0].content.assetId]);

console.log("Screenshot Intelligence behaviour tests passed.");
