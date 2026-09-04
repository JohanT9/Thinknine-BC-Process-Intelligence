const assert = require("assert");
const review = require("../src/review/review-studio");

const session = { id: "s1", name: "Test" };
const tasks = [
  { taskId: "a", instruction: "Steg A" },
  { taskId: "b", instruction: "Steg B" }
];

const model = review.createReview(session, tasks);
assert.strictEqual(model.tasks.length, 2);
assert.deepStrictEqual(model.annotations, {
  schemaVersion: "1.0.0",
  screenshotSets: []
});
assert.strictEqual(review.progress(model), 0);

const normalizedLegacyReview = review.normalizeReview({
  reviewVersion: "1.0.0",
  tasks: []
});
assert.deepStrictEqual(normalizedLegacyReview.annotations, {
  schemaVersion: "1.0.0",
  screenshotSets: []
});
const previousClassifiedReview = {
  processAnalysis: { confirmedReferenceId: "reference:simple-purchase-order",
    confirmedName: "Simple Purchase Order", classificationSource: "manual",
    status: "confirmed", confirmedAt: "2026-09-04T12:00:00.000Z" }
};
const manuallyClassified = review.replaceGeneratedReview(session, tasks,
  previousClassifiedReview);
assert.deepStrictEqual(manuallyClassified.processAnalysis, {
  confirmedReferenceId: "reference:simple-purchase-order",
  confirmedName: "Simple Purchase Order", classificationSource: "manual",
  status: "confirmed", confirmedAt: "2026-09-04T12:00:00.000Z"
});
assert.notStrictEqual(manuallyClassified.processAnalysis,
  previousClassifiedReview.processAnalysis,
  "a replacement review must own its preserved classification data");

const normalizedWithoutId = review.normalizeTasks([{ instruction: "Steg" }]);
assert.strictEqual(normalizedWithoutId[0].taskId, "ReviewTask-1");
assert.strictEqual(
  review.normalizeTasks([{ instruction: "Välj **Sök**." }])[0].instruction,
  'Välj "Sök".'
);
const normalizedDuplicateIds = review.normalizeTasks([
  { taskId: "duplicate", instruction: "Ett" },
  { taskId: "duplicate", instruction: "Två" },
  { taskId: "duplicate", instruction: "Tre" }
]);
assert.deepStrictEqual(
  normalizedDuplicateIds.map(task => task.taskId),
  ["duplicate", "duplicate-2", "duplicate-3"]
);

review.approveTask(model, 0, true);
assert.strictEqual(review.progress(model), 50);

review.move(model, 1, -1);
assert.strictEqual(model.tasks[0].taskId, "b");

review.add(model, 0);
assert.strictEqual(model.tasks.length, 3);

review.remove(model, 1);
assert.strictEqual(model.tasks.length, 2);

assert.strictEqual(review.canComplete(model), false);
const statusBeforeIncompleteAttempt = model.status;
review.complete(model);
assert.strictEqual(model.status, statusBeforeIncompleteAttempt);
model.tasks.forEach((task, index) => review.approveTask(model, index, true));
assert.strictEqual(review.canComplete(model), true);
review.complete(model);
assert.strictEqual(model.status, "completed");
assert.strictEqual(review.progress(model), 100);

const mergeModel = review.createReview(session, [
  { taskId: "m1", instruction: "Ett" },
  { taskId: "m2", instruction: "Två" }
]);
const merged = review.merge(mergeModel, ["m1", "m2"], {
  now: "2026-08-04T10:00:00.000Z",
  historyId: "merge-history"
});
assert.strictEqual(merged.mergedTask.taskId, "m1");
assert.strictEqual(mergeModel.tasks.length, 1);
assert.strictEqual(mergeModel.history.length, 1);
assert.strictEqual(mergeModel.history[0].historyId, "merge-history");
assert.strictEqual(mergeModel.history[0].sourceTasks.length, 2);

const splitResult = review.split(
  mergeModel,
  "m1",
  { segments: ["Del ett", "Del två"], suggestionSource: "test" },
  { now: "2026-08-04T12:00:00.000Z", historyId: "split-history" }
);
assert.strictEqual(splitResult.splitTasks.length, 2);
assert.strictEqual(mergeModel.tasks.length, 2);
assert.strictEqual(mergeModel.history.length, 2);
assert.strictEqual(mergeModel.history[1].historyId, "split-history");

assert.strictEqual(review.isGeneratedPlaceholderOnly({ tasks: [
  { taskType: "Unclassified", instruction: "Utför uppgiften." },
  { taskType: "Unclassified", instruction: "" },
  { taskType: "Unclassified", instruction: "Utför uppgiften." },
  { taskType: "RunAction", instruction: "Välj Släpp." }
] }), true);
for (const protectedChange of [{ approved: true }, { userComment: "Behåll" },
  { stepOverride: { fields: {} } }, { manualStepId: "manual-1" }]) {
  assert.strictEqual(review.isGeneratedPlaceholderOnly({ tasks: [{
    taskType: "Unclassified", instruction: "Utför uppgiften.",
    ...protectedChange
  }] }), false, "consultant state must never be regenerated automatically");
}
assert.strictEqual(review.isGeneratedPlaceholderOnly({ tasks: [{
  taskType: "RunAction", instruction: "Välj Släpp."
}] }), false);
const visibleReview = { tasks: [{ taskId: "real", taskType: "RunAction",
  instruction: "Välj aktiviteten." }, { taskId: "noise",
  taskType: "Unclassified", instruction: "Utför uppgiften.",
  sourceEventIds: ["event-noise"] }] };
assert.deepStrictEqual(review.activeTasks(visibleReview).map(task => task.taskId),
  ["real"], "Review Studio must hide generated empty placeholders");
const renumberedVisibleReview = { tasks: [
  { taskId: "first", taskNo: 1, taskType: "RunAction",
    instruction: "Välj den första aktiviteten." },
  { taskId: "hidden", taskNo: 2, taskType: "RunAction",
    instruction: "Välj den dolda aktiviteten.", deleted: true },
  { taskId: "target", taskNo: 6, taskType: "RunAction",
    instruction: "Välj kunden." }
] };
assert.strictEqual(review.visibleTaskNumber(renumberedVisibleReview, "target"), 2,
  "visible step numbers must ignore hidden steps and legacy taskNo values");
assert.strictEqual(review.visibleTaskNumber(renumberedVisibleReview, "hidden"), null,
  "hidden steps must not retain a visible step number");
assert.strictEqual(visibleReview.tasks.length, 2,
  "Review filtering must preserve source tasks and traceability");
const lookupLeak = { tasks: [{ taskType: "SelectCustomer",
  instruction: 'Välj kund "iberi".' }, { taskType: "RunAction",
  instruction: 'Välj "Nr, sorterade i Stigande order Välj posten "905"".' }] };
assert.strictEqual(review.hasGeneratedLookupSearchLeak(lookupLeak), true);
assert.strictEqual(review.hasGeneratedLookupSearchLeak({ tasks:
  lookupLeak.tasks.map((task, index) => index ? task : { ...task,
    userComment: "Behåll" }) }), false);
const itemLookupLeak = { tasks: [{ taskType: "EnterFieldValue",
  fieldCaption: "Sortera efter Nr", instruction: "Ange 30043." }, {
  taskType: "RunAction",
  instruction: 'Välj "Nr, sorterade i Stigande order Välj posten "30043"".'
}, { taskType: "EnterFieldValue", fieldCaption: "Sortera efter Nr",
  instruction: "Ange 30043." }] };
assert.strictEqual(review.hasGeneratedLookupSearchLeak(itemLookupLeak), true);
const repairedExistingSortingStep = review.normalizeTasks([{
  taskId: "legacy-sorted-number", taskType: "EnterFieldValue",
  fieldCaption: "Sortera efter Nr", value: "30043",
  instruction: 'Ange 30043 i "Sortera efter Nr".', provenance: "generated",
  derivedStep: { instruction: 'Ange 30043 i "Sortera efter Nr".' },
  semanticActionModel: { targetField: "Sortera efter Nr",
    displayText: 'Ange __30043__ i **Sortera efter Nr**.' }
}])[0];
assert.strictEqual(repairedExistingSortingStep.instruction,
  'Ange 30043 i "Nr".');
assert.strictEqual(repairedExistingSortingStep.fieldCaption, "Nr");
assert.strictEqual(repairedExistingSortingStep.derivedStep.instruction,
  'Ange 30043 i "Nr".');
assert.strictEqual(repairedExistingSortingStep.semanticActionModel.targetField,
  "Nr");
assert.strictEqual(repairedExistingSortingStep.stepOverride, null);
const preservedManualSortingStep = review.normalizeTasks([{
  taskId: "manual-sorted-number", taskType: "EnterFieldValue",
  fieldCaption: "Sortera efter Nr", instruction: 'Behåll "Sortera efter Nr".',
  provenance: "manual"
}])[0];
assert.strictEqual(preservedManualSortingStep.instruction,
  'Behåll "Sortera efter Nr".');
const menuPathLeak = { tasks: [
  { taskType: "RunAction", actionCaption: "Välj rad" },
  { taskType: "RunAction", actionCaption: "Relaterad information" },
  { taskType: "RunAction",
    actionCaption: "Tillämpat försäljningspris och rabatt" }
] };
assert.strictEqual(review.hasGeneratedMenuPathLeak(menuPathLeak), true);
assert.strictEqual(review.hasGeneratedMenuPathLeak({ tasks:
  menuPathLeak.tasks.map((task, index) => index === 1
    ? { ...task, approved: true } : task) }), false,
"consultant-owned menu steps must not regenerate automatically");
assert.strictEqual(review.hasGeneratedMenuPathLeak({ tasks: [
  { taskType: "RunAction", instruction: "Välj Åtgärder." },
  { taskType: "RunAction", instruction: "Välj Funktion." },
  { taskType: "RunAction", instruction: "Välj Manuellt pris." }
] }), true);
const closeScreenshotLeak = { tasks: [
  { taskType: "RunAction", instruction: "Öppna dialog.",
    screenshot: "dialog-open.png" },
  { taskType: "RunAction", instruction: 'Välj "Stäng".',
    screenshot: "dialog-closed.png" }
] };
assert.strictEqual(review.hasGeneratedCloseScreenshotLeak(closeScreenshotLeak),
  true);
assert.strictEqual(review.hasGeneratedCloseScreenshotLeak({ tasks:
  closeScreenshotLeak.tasks.map((task, index) => index
    ? { ...task, userComment: "Behåll" } : task) }), false);

const searchResultTypeLeak = { tasks: [{ taskType: "SearchAndOpenPage",
  resultCaption: "FÃ¶rs.order Listor îœ",
  instruction: 'VÃ¤lj "SÃ¶k" och vÃ¤lj "FÃ¶rs.order Listor îœ".' }] };
assert.strictEqual(review.hasGeneratedSearchResultTypeLeak(searchResultTypeLeak),
  true);
assert.strictEqual(review.hasGeneratedSearchResultTypeLeak({ tasks:
  searchResultTypeLeak.tasks.map(task => ({ ...task, approved: true })) }), false);
const searchInputLeak = { tasks: [{ taskType: "SearchAndOpenPage",
  resultCaption: "Sales Orders" }, {
  taskType: "EnterFieldValue", fieldCaption: "Tell me what you want to do.",
  value: "sales order" }] };
assert.strictEqual(review.hasGeneratedSearchInputLeak(searchInputLeak), true);
assert.strictEqual(review.hasGeneratedSearchInputLeak({ tasks:
  searchInputLeak.tasks.map((task, index) => index
    ? { ...task, userComment: "Keep separate" } : task) }), false,
"consultant-owned review structure must never be refreshed automatically");
const staleSearchEvidence = { tasks: [{ taskId: "search-1",
  taskType: "SearchAndOpenPage", screenshot: "loading.png" }] };
const freshSearchEvidence = [{ taskId: "search-1",
  taskType: "SearchAndOpenPage", screenshot: "screenshots/000008.png" }];
assert.strictEqual(review.hasGeneratedSearchEvidenceDrift(staleSearchEvidence,
  freshSearchEvidence), true);
assert.strictEqual(review.hasGeneratedSearchEvidenceDrift({ tasks: [{
  taskId: "search-1", taskType: "SearchAndOpenPage",
  instruction: 'Välj "Sök", ange söktext i "sökfältet".',
  screenshot: "screenshots/000008.png"
}] }, [{ taskId: "search-1", taskType: "SearchAndOpenPage",
  instruction: 'Välj "Sök", ange för ord i "sökfältet".',
  screenshot: "screenshots/000008.png" }]), true,
"untouched generic search instructions must refresh with the recorded phrase");
assert.strictEqual(review.hasGeneratedSearchEvidenceDrift({
  ...staleSearchEvidence,
  annotations: { screenshotSets: [{ screenshotRef: "loading.png",
    items: [{ annotationId: "keep" }] }] }
}, freshSearchEvidence), false, "annotated screenshots must remain consultant-owned");
assert.strictEqual(review.hasGeneratedSearchEvidenceDrift({ tasks:
  staleSearchEvidence.tasks.map(task => ({ ...task,
    stepOverride: { screenshotOverride: {
      selectedScreenshotAssetId: "manual.png" } } }))
}, freshSearchEvidence), false, "manual screenshot choices must be preserved");

console.log("Review Studio tests passed.");
