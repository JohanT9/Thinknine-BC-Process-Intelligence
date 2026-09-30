const assert = require("assert");
const manual = require("../src/review/manual-information-steps");
const reviewStudio = require("../src/review/review-studio");
const structure = require("../src/review/step-structure-overrides");
const pipeline = require("../src/exporters/word-export-pipeline");
const workspace = require("../src/document/document-workspace");

const NOW = "2026-08-10T13:00:00.000Z";
const base = [{ taskId: "a", instruction: "Select No. 136",
  sourceEventIds: ["e1"] }, { taskId: "b",
  instruction: "Enter 500 in Quantity", sourceEventIds: ["e2"] }];

{
  const step = manual.create({ recordingId: "r", now: NOW,
    positionAnchor: { relation: "after", targetStepId: "a" },
    instruction: "Verify that the item is available before continuing.",
    futureFields: { future: true } });
  assert.equal(step.schemaVersion, "1.0.0");
  assert.equal(step.provenance, "manual");
  assert.equal(step.stepType, "information");
  assert.deepEqual(step.sourceEventIds, []);
  assert.deepEqual(step.futureFields, { future: true });
  assert.equal(manual.validate(step).valid, true);
  assert.equal(manual.validate(manual.create({ now: NOW,
    manualStepId: "empty" })).issues[0].code, "empty-manual-step");
  assert.equal(step.manualStepId, manual.create({ recordingId: "r", now: NOW,
    positionAnchor: { relation: "after", targetStepId: "a" },
    instruction: "Different text" }).manualStepId,
  "identity is independent of mutable content");
  const resolved = manual.resolve(base, [step]);
  assert.deepEqual(resolved.steps.map(item => item.taskId),
    ["a", step.manualStepId, "b"]);
  assert.deepEqual(resolved.steps[1].sourceEventIds, []);
}

{
  for (const stepType of manual.STEP_TYPES) {
    assert.equal(manual.create({ now: NOW, manualStepId: stepType,
      stepType }).stepType, stepType);
  }
  const prerequisite = manual.create({ now: NOW, manualStepId: "pre",
    stepType: "prerequisite", positionAnchor: { relation: "section-start" },
    instruction: "The user has posting permission." });
  const warning = manual.create({ now: NOW, manualStepId: "warn",
    stepType: "warning", positionAnchor: { relation: "section-end" },
    instruction: "Do not post twice.", callout: {
      type: "warning", text: "Confirm the document number."
    } });
  assert.deepEqual(manual.resolve(base, [prerequisite, warning]).steps
    .map(item => item.taskId), ["pre", "a", "b", "warn"]);
}

{
  const screenshot = manual.create({ now: NOW, manualStepId: "shot",
    instruction: "Use the highlighted value.",
    selectedScreenshotAssetId: "existing-shot" });
  assert.deepEqual(manual.project(screenshot).screenshots, ["existing-shot"]);
  assert.deepEqual(manual.project(manual.create({ now: NOW,
    manualStepId: "no-shot", instruction: "Information only." })).screenshots, []);
}

{
  const step = manual.create({ now: NOW, manualStepId: "orphan",
    positionAnchor: { relation: "after", targetStepId: "removed" },
    instruction: "Preserve me." });
  const resolved = manual.resolve(base, [step]);
  assert.equal(resolved.steps.at(-1).taskId, "orphan");
  assert.deepEqual(resolved.unresolvedManualStepIds, ["orphan"]);
  assert.equal(resolved.diagnostics[0].fallback, "section-end");
}

{
  const review = reviewStudio.createReview({ id: "r", name: "BC" }, base);
  const evidence = JSON.stringify(base);
  reviewStudio.add(review, 0, { now: NOW, manualStepId: "manual-middle",
    instruction: "Verify stock." });
  assert.equal(review.manualSteps.length, 1);
  assert.deepEqual(review.manualSteps[0].sourceEventIds, []);
  assert.deepEqual(reviewStudio.activeTasks(review).map(item => item.taskId),
    ["a", "manual-middle", "b"]);
  reviewStudio.editTask(review, 0, {
    includeKnowledgeExplanationInWord: true
  }, { now: NOW });
  assert.equal(reviewStudio.activeTasks(review)[0].includeKnowledgeExplanationInWord,
    true, "per-step Word explanation choice is persisted on the review task");
  reviewStudio.undo(review);
  assert.equal(reviewStudio.activeTasks(review)[0].includeKnowledgeExplanationInWord,
    undefined, "undo restores the per-step Word explanation choice");
  reviewStudio.redo(review);
  assert.equal(reviewStudio.activeTasks(review)[0].includeKnowledgeExplanationInWord,
    true, "redo restores the per-step Word explanation choice");
  reviewStudio.editTask(review, 1, { instruction: "Verify available stock.",
    userComment: "Required before quantity entry.", callout: {
      type: "tip", text: "Check inventory by location."
    } }, { now: NOW });
  assert.equal(review.manualSteps[0].instruction, "Verify available stock.");
  assert.equal(reviewStudio.setManualStepScreenshot(
    review, "manual-middle", "shot-existing", { now: NOW }
  ).ok, true);
  assert.equal(review.manualSteps[0].selectedScreenshotAssetId, "shot-existing");
  review.annotations = { schemaVersion: "1.0.0", screenshotSets: [{
    screenshotRef: "shot-existing", items: [{ annotationId: "ann-1" }]
  }] };
  assert.equal(reviewStudio.setManualStepScreenshot(
    review, "manual-middle", "shot-other", { now: NOW }
  ).reason, "annotation-protected");
  reviewStudio.undo(review);
  assert.equal(review.manualSteps[0].selectedScreenshotAssetId, null);
  reviewStudio.undo(review);
  assert.equal(review.manualSteps[0].instruction, "Verify stock.");
  reviewStudio.redo(review);
  assert.equal(review.manualSteps[0].instruction, "Verify available stock.");
  reviewStudio.redo(review);
  assert.equal(review.manualSteps[0].selectedScreenshotAssetId, "shot-existing");
  reviewStudio.setTaskHidden(review, 1, true, { now: NOW });
  assert.equal(review.manualSteps[0].visibility, "hidden");
  reviewStudio.undo(review);
  assert.equal(review.manualSteps[0].visibility, "visible");
  assert.equal(JSON.stringify(base), evidence, "canonical-shaped evidence unchanged");

  const merged = reviewStudio.merge(review, ["a", "manual-middle"], { now: NOW });
  assert(merged.mergedTask);
  const resolvedMerge = structure.resolve(
    manual.resolve(review.generatedTasks, review.manualSteps).steps,
    review.structureOverrides
  ).steps[0];
  assert.deepEqual(resolvedMerge.sourceEventIds, ["e1"]);
  assert.deepEqual(resolvedMerge.manualStepIds, ["manual-middle"]);
  assert(resolvedMerge.documentationProvenance.includes("manual"));
}

{
  const review = reviewStudio.createReview({ id: "r", name: "BC" }, base);
  reviewStudio.add(review, 0, { now: NOW, manualStepId: "manual-split",
    instruction: "Verify inventory. Confirm availability." });
  const result = reviewStudio.split(review, "manual-split", {
    segments: ["Verify inventory.", "Confirm availability."]
  }, { now: NOW });
  assert.equal(result.splitTasks.length, 2);
  const resolved = structure.resolve(
    manual.resolve(review.generatedTasks, review.manualSteps).steps,
    review.structureOverrides
  );
  const parts = resolved.steps.filter(step =>
    step.originalManualStepId === "manual-split"
  );
  assert.equal(parts.length, 2);
  assert(parts.every(step => step.sourceEventIds.length === 0));
  reviewStudio.undo(review);
  assert(reviewStudio.activeTasks(review).some(step =>
    step.manualStepId === "manual-split"
  ));
}

{
  const review = reviewStudio.createReview({ id: "r", name: "BC" }, base);
  reviewStudio.add(review, 0, { now: NOW, manualStepId: "manual-export",
    instruction: "Verify that the item is available before continuing." });
  reviewStudio.editTask(review, 1, { callout: {
    type: "warning", text: "Confirm availability before continuing."
  } }, { now: NOW });
  const session = { id: "r", name: "BC", startedAt: NOW };
  const prepared = pipeline.create({ review, session });
  const model = workspace.render(prepared.plan);
  const texts = model.sections.flatMap(section => section.items)
    .filter(item => item.kind === "paragraph").map(item => item.content.text);
  assert(texts.includes("Verify that the item is available before continuing."));
  assert(model.sections.flatMap(section => section.items)
    .some(item => item.kind === "callout" &&
      item.content.text === "Confirm availability before continuing."));
  assert.equal(model.planId, prepared.plan.planId,
    "Workspace and Word share one resolved plan");

  const explanationReview = reviewStudio.createReview(session, [{
    taskId: "explained", instruction: "Release the sales order."
  }]);
  explanationReview.documentFields.documentLanguage = "en-US";
  explanationReview.tasks[0] = { ...explanationReview.tasks[0],
    includeKnowledgeExplanationInWord: true,
    contextualExplanationRuleId: "Sales.Release",
    contextualExplanationConfidence: 0.99,
    contextualExplanations: { "en-US": "Releasing prepares the order for the next workflow step." },
    contextualExplanationSources: [{ sourceUri: "https://learn.microsoft.com/en-us/dynamics365/business-central/sales-how-sell-products" }]
  };
  const explanationPlan = pipeline.create({ review: explanationReview, session }).plan;
  assert.match(JSON.stringify(explanationPlan),
    /Releasing prepares the order for the next workflow step\./,
  "the opted-in explanation is included in the Word export plan");
  assert.match(JSON.stringify(explanationPlan),
    /Microsoft Learn: https:\/\/learn\.microsoft\.com\/en-us\//,
  "the exported explanation retains its source link");
  const originalInstruction = explanationReview.tasks[0].instruction;
  reviewStudio.editTask(explanationReview, 0, {
    contextualExplanationOverrides: { "en-US": "Explain only the checks needed before release." }
  }, { now: NOW });
  assert.equal(explanationReview.tasks[0].instruction, originalInstruction,
    "editing an explanation does not alter the captured instruction");
  const editedPlan = pipeline.create({ review: explanationReview, session }).plan;
  assert.match(JSON.stringify(editedPlan), /Explain only the checks needed before release\./,
    "the edited per-step explanation is used in the Word export");
  assert.doesNotMatch(JSON.stringify(editedPlan), /Releasing prepares the order/,
    "the generated wording is replaced in the export");
  reviewStudio.undo(explanationReview);
  assert.match(JSON.stringify(pipeline.create({ review: explanationReview, session }).plan),
    /Releasing prepares the order/, "undo restores the suggested explanation");
  reviewStudio.redo(explanationReview);
  assert.match(JSON.stringify(pipeline.create({ review: explanationReview, session }).plan),
    /Explain only the checks needed before release\./, "redo restores the edited wording");
  explanationReview.tasks[0].includeKnowledgeExplanationInWord = false;
  assert.doesNotMatch(JSON.stringify(pipeline.create({
    review: explanationReview, session
  }).plan), /Explain only the checks needed before release\./,
  "the explanation is omitted when the per-step choice is off");
  reviewStudio.undo(review);
  assert.equal(review.manualSteps.length, 1);
  reviewStudio.undo(review);
  assert.equal(review.manualSteps.length, 0);
  reviewStudio.redo(review);
  assert.equal(review.manualSteps.length, 1);
  reviewStudio.redo(review);
  reviewStudio.deleteManualStep(review, "manual-export", { now: NOW });
  assert.equal(review.manualSteps.length, 0);
  reviewStudio.undo(review);
  assert.equal(review.manualSteps.length, 1);
}

{
  const many = Array.from({ length: 5000 }, (_, index) => ({
    taskId: `s-${index}`
  }));
  const step = manual.create({ now: NOW, manualStepId: "large",
    positionAnchor: { relation: "after", targetStepId: "s-2499" },
    instruction: "Manual context." });
  assert.equal(manual.resolve(many, [step]).steps[2500].taskId, "large");
}

console.log("Manual Information Step tests passed.");
