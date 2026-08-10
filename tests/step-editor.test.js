const assert = require("assert");
const editor = require("../src/review/step-editor");
const reviewStudio = require("../src/review/review-studio");
const projector = require("../src/document/review-document-projector");
const language = require("../src/document/language-excellence");
const pipeline = require("../src/exporters/word-export-pipeline");
const workspace = require("../src/document/document-workspace");

const NOW = "2026-08-10T10:00:00.000Z";

function step() {
  return {
    taskId: "step:events:event-1:event-2",
    recordingId: "recording-1",
    sourceEventIds: ["event-1", "event-2"],
    derivedStep: {
      title: "Select item",
      instruction: "Click on No. 136",
      comment: "Generated note",
      sourceScreenshotAssetIds: ["shot-a", "shot-b"],
      selectedScreenshotAssetId: "shot-a",
      visibility: "visible"
    },
    approved: false
  };
}

{
  const source = step();
  const before = JSON.stringify(source);
  const override = editor.edit(source, "instruction", "Select article 136", {
    now: NOW, editedBy: "consultant"
  });
  assert.deepEqual(override.fields, { instruction: "Select article 136" });
  assert.equal(override.schemaVersion, "1.0.0");
  assert.equal(override.stepId, source.taskId);
  assert.equal(override.createdAt, NOW);
  assert.equal(override.updatedAt, NOW);
  assert.equal(override.metadata.provenance, "user-edited");
  assert.equal(JSON.stringify(source), before, "canonical/derived input is immutable");
  assert.equal(editor.resolve({ ...source, stepOverride: override }).instruction,
    "Select article 136");
}

{
  const source = step();
  const comment = editor.edit(source, "comment", "Keep this note", { now: NOW });
  const regenerated = { ...source, derivedStep: { ...source.derivedStep,
    instruction: "Select article 136" }, stepOverride: comment };
  const resolved = editor.resolve(regenerated);
  assert.equal(resolved.instruction, "Select article 136");
  assert.equal(resolved.comment, "Keep this note");
  const reset = editor.reset({ ...regenerated, stepOverride: editor.edit(
    regenerated, "instruction", "My wording", { now: NOW }
  ) }, "instruction", { now: "2026-08-10T11:00:00.000Z" });
  assert.equal(editor.resolve({ ...regenerated, stepOverride: reset }).instruction,
    "Select article 136");
}

{
  const source = step();
  const selected = editor.selectScreenshot(source, "shot-b", {}, { now: NOW });
  assert.equal(selected.ok, true);
  const resolved = editor.resolve({ ...source, stepOverride: selected.override });
  assert.equal(resolved.selectedScreenshotAssetId, "shot-b");
  assert.deepEqual(resolved.screenshots, ["shot-b"]);
  assert.deepEqual(resolved.sourceScreenshotAssetIds, ["shot-a", "shot-b"]);
  assert.equal(editor.selectScreenshot(source, "other", {}, { now: NOW }).ok, false);
  const protectedReview = { annotations: { screenshotSets: [{
    screenshotRef: "shot-a", items: [{ annotationId: "ann-1" }]
  }] } };
  assert.equal(editor.selectScreenshot(source, "shot-b", protectedReview).reason,
    "annotation-protected");
}

{
  const source = step();
  const hidden = editor.setVisibility(source, true, { now: NOW });
  assert.equal(editor.resolve({ ...source, stepOverride: hidden }).deleted, true);
  assert.deepEqual(source.sourceEventIds, ["event-1", "event-2"]);
}

{
  const future = editor.normalizeOverride({
    overrideId: "o", schemaVersion: "9.0.0", stepId: "s",
    fields: { instruction: "Exact", unknown: "preserved outside sparse fields" },
    futureFields: { aiSuggestionProvenance: "future" },
    vendorExtension: { value: 1 }
  });
  assert.deepEqual(future.futureFields, { aiSuggestionProvenance: "future" });
  assert.deepEqual(future.vendorExtension, { value: 1 });
}

{
  const review = { tasks: [step()], stepOverrides: [{
    overrideId: "orphan", stepId: "removed-step", fields: { instruction: "Keep" }
  }] };
  const resolved = editor.resolveReview(review);
  assert.equal(resolved.orphanedStepOverrides.length, 1);
  assert.equal(resolved.orphanedStepOverrides[0].stepId, "removed-step");
}

{
  const review = reviewStudio.createReview({ id: "recording-1", name: "Test" }, [{
    taskId: "stable-step", instruction: "Click on No. 136",
    sourceEventNos: [1], screenshots: ["shot-a", "shot-b"]
  }]);
  reviewStudio.editTask(review, 0, { instruction: "Select article 136" }, { now: NOW });
  assert.equal(review.tasks[0].derivedStep.instruction, "Click on No. 136");
  assert.deepEqual(review.tasks[0].stepOverride.fields,
    { instruction: "Select article 136" });
  assert.equal(reviewStudio.activeTasks(review)[0].instruction, "Select article 136");
  reviewStudio.undo(review);
  assert.equal(reviewStudio.activeTasks(review)[0].instruction, "Click on No. 136");
  reviewStudio.redo(review);
  assert.equal(reviewStudio.activeTasks(review)[0].instruction, "Select article 136");

  const projection = projector.project(review, { session: { id: "recording-1",
    name: "Test", startedAt: NOW } });
  const workflow = projection.document.sections.find(section =>
    section.kind === "workflow"
  );
  const instruction = workflow.blocks.find(block => block.kind === "step")
    .blocks.find(block => block.kind === "paragraph");
  assert.equal(instruction.text, "Select article 136");
  assert.equal(instruction.provenance, "user-edited");
  assert.equal(instruction.preserveUserText, true);
  assert.equal(language.process(projection.document).sections.find(section =>
    section.kind === "workflow").blocks.find(block => block.kind === "step")
    .blocks.find(block => block.kind === "paragraph").text,
  "Select article 136", "Language Excellence must preserve exact manual text");

  const exported = pipeline.create({ review, session: {
    id: "recording-1", name: "Test", startedAt: NOW
  } });
  const workspaceResult = workspace.render(exported.plan);
  const workspaceTexts = workspaceResult.sections.flatMap(section => section.items)
    .filter(item => item.kind === "paragraph").map(item => item.content.text);
  assert(workspaceTexts.includes("Select article 136"));
  assert.equal(workspaceResult.planId, exported.plan.planId,
    "Word and Workspace share the resolved Document Plan");
}

{
  const many = Array.from({ length: 5000 }, (_, index) => ({
    ...step(), taskId: `step-${index}`
  }));
  assert.equal(editor.resolveReview({ tasks: many }).tasks.length, 5000);
}

console.log("Step Editor tests passed.");
