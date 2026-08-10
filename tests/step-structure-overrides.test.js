const assert = require("assert");
const structure = require("../src/review/step-structure-overrides");
const reviewStudio = require("../src/review/review-studio");

const NOW = "2026-08-10T12:00:00.000Z";
const steps = [{
  taskId: "step-a", instruction: "Select No. 136",
  sourceEventIds: ["e1"], sourceStepGroupIds: ["g1"],
  sourceScreenshotAssetIds: ["shot-a"]
}, {
  taskId: "step-b", instruction: "Enter 500 in Quantity",
  sourceEventIds: ["e2", "e3"], sourceStepGroupIds: ["g2"],
  sourceScreenshotAssetIds: ["shot-b"],
  stepOverride: { fields: { instruction: "Enter quantity 500" } }
}, {
  taskId: "step-c", instruction: "Post order",
  sourceEventIds: ["e4"], sourceScreenshotAssetIds: ["shot-c"]
}];

{
  const before = JSON.stringify(steps);
  const hidden = structure.hide(steps[0], {
    recordingId: "recording", now: NOW, futureFields: { future: true }
  });
  assert.equal(hidden.type, "hide");
  assert.deepEqual(hidden.sourceStepIds, ["step-a"]);
  assert.deepEqual(hidden.sourceEventIds, ["e1"]);
  assert.deepEqual(hidden.futureFields, { future: true });
  assert.deepEqual(structure.resolve(steps, [hidden]).steps.map(step => step.taskId),
    ["step-b", "step-c"]);
  assert.equal(JSON.stringify(steps), before, "derived steps remain immutable");
  assert.deepEqual(structure.resolve(steps, []).steps.map(step => step.taskId),
    ["step-a", "step-b", "step-c"]);
}

{
  const result = structure.merge(steps, ["step-a", "step-b"], {
    recordingId: "recording", now: NOW
  });
  assert.equal(result.ok, true);
  assert.equal(result.resolvedStepId,
    structure.merge(steps, ["step-a", "step-b"], {
      recordingId: "recording", now: NOW
    }).resolvedStepId);
  const resolved = structure.resolve(steps, [result.override]).steps;
  assert.equal(resolved.length, 2);
  assert.deepEqual(resolved[0].sourceStepIds, ["step-a", "step-b"]);
  assert.deepEqual(resolved[0].sourceEventIds, ["e1", "e2", "e3"]);
  assert.deepEqual(resolved[0].sourceStepGroupIds, ["g1", "g2"]);
  assert.deepEqual(resolved[0].screenshots, ["shot-a", "shot-b"]);
  assert(resolved[0].instruction.includes("Enter quantity 500"),
    "explicit content override wins deterministically");
  assert.equal(structure.merge(steps, ["step-a", "step-c"]).reason,
    "non-adjacent-steps");
}

{
  const source = { ...steps[1], screenshotAssociations: [{
    assetId: "shot-b", sourceEventId: "e2"
  }, { assetId: "shot-c", sourceEventId: "e3" }],
  sourceScreenshotAssetIds: ["shot-b", "shot-c"] };
  const result = structure.split(source, [{
    partitionId: "quantity", sourceEventIds: ["e2"]
  }, { partitionId: "commit", sourceEventIds: ["e3"] }], {
    recordingId: "recording", now: NOW
  });
  assert.equal(result.ok, true);
  assert.equal(result.resolvedStepIds[0], structure.split(source, [{
    partitionId: "quantity", sourceEventIds: ["e2"]
  }, { partitionId: "commit", sourceEventIds: ["e3"] }], {
    recordingId: "recording", now: NOW
  }).resolvedStepIds[0]);
  const parts = structure.resolve([source], [result.override]).steps;
  assert.deepEqual(parts.flatMap(part => part.sourceEventIds), ["e2", "e3"]);
  assert.deepEqual(parts[0].screenshots, ["shot-b"]);
  assert.deepEqual(parts[1].screenshots, ["shot-c"]);
  assert.equal(structure.split(source, [{ partitionId: "a", sourceEventIds: ["e2"] },
    { partitionId: "b", sourceEventIds: ["e2"] }]).reason,
  "duplicate-event-assignment");
}

{
  const merge = structure.merge(steps, ["step-a", "step-b"], {
    recordingId: "recording", now: NOW
  }).override;
  const regenerated = steps.map(step => step.taskId === "step-a"
    ? { ...step, instruction: "Improved generated wording" } : step);
  assert.equal(structure.resolve(regenerated, [merge]).steps.length, 2,
    "merge survives regeneration while stable identities resolve");
  const orphaned = structure.resolve(steps.slice(1), [merge]);
  assert.equal(orphaned.orphanedOverrides.length, 1);
  assert.equal(orphaned.diagnostics[0].code, "orphaned-structure-override");
}

{
  const review = reviewStudio.createReview({ id: "recording", name: "BC" },
    steps.map(step => ({ ...step, sourceEventNos: step.sourceEventIds })));
  const canonical = JSON.stringify(steps);
  const merged = reviewStudio.merge(review, ["step-a", "step-b"], { now: NOW });
  assert(merged.mergedTask);
  assert.equal(review.structureOverrides[0].type, "merge");
  assert.equal(reviewStudio.activeTasks(review).length, 2);
  reviewStudio.undo(review);
  assert.equal(reviewStudio.activeTasks(review).length, 3);
  assert.equal(review.structureOverrides.length, 0);
  reviewStudio.redo(review);
  assert.equal(reviewStudio.activeTasks(review).length, 2);
  assert.equal(review.structureOverrides.length, 1);
  reviewStudio.resetStructure(review, { now: NOW });
  assert.equal(reviewStudio.activeTasks(review).length, 3);
  assert.equal(review.structureOverrides.length, 0);
  assert.equal(JSON.stringify(steps), canonical);
}

{
  const many = Array.from({ length: 5000 }, (_, index) => ({
    taskId: `s-${index}`, sourceEventIds: [`e-${index}`]
  }));
  const hidden = structure.hide(many[2500], { now: NOW });
  assert.equal(structure.resolve(many, [hidden]).steps.length, 4999);
}

console.log("Step Structure Override tests passed.");
