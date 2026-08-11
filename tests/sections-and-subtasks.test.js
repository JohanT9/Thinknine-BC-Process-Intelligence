const assert = require("assert");
const hierarchy = require("../src/review/documentation-hierarchy");
const reviewStudio = require("../src/review/review-studio");
const pipeline = require("../src/exporters/word-export-pipeline");
const workspace = require("../src/document/document-workspace");

const NOW = "2026-08-11T08:00:00.000Z";
const steps = Array.from({ length: 10 }, (_, index) => ({
  taskId: `step-${index + 1}`,
  instruction: `Instruction ${index + 1}`,
  sourceEventIds: [`event-${index + 1}`],
  screenshots: index === 0 ? ["shot-1"] : []
}));

{
  let state = hierarchy.empty("recording");
  const sales = hierarchy.createSection(state, "Sales Order",
    steps.slice(0, 5).map(step => step.taskId), {
      sectionId: "section-sales", now: NOW, futureFields: { future: true }
    });
  state = sales.state;
  const warehouse = hierarchy.createSection(state, "Warehouse",
    steps.slice(5).map(step => step.taskId), {
      sectionId: "section-warehouse", now: NOW
    });
  state = warehouse.state;
  assert.equal(sales.section.schemaVersion, "1.0.0");
  assert.equal(sales.section.provenance, "manual");
  assert.deepEqual(sales.section.futureFields, { future: true });
  const resolved = hierarchy.resolve(steps, state);
  assert.equal(resolved.sections.length, 2);
  assert.equal(resolved.sections.flatMap(section => section.directSteps).length, 10);
  assert.equal(new Set(resolved.presentationOrder).size, 10);
  assert.deepEqual(resolved.recordedOrder, steps.map(step => step.taskId));
}

{
  let state = hierarchy.createSection(hierarchy.empty("r"), "Sales",
    ["step-1", "step-2", "step-3"], {
      sectionId: "sales", now: NOW
    }).state;
  let result = hierarchy.createSubtask(state, "sales", "Lines",
    ["step-2", "step-3"], { subtaskId: "lines", now: NOW,
      futureFields: { future: true } });
  assert.equal(result.ok, true);
  state = result.state;
  const resolved = hierarchy.resolve(steps.slice(0, 3), state);
  assert.deepEqual(resolved.sections[0].directSteps.map(step => step.taskId),
    ["step-1"]);
  assert.deepEqual(resolved.sections[0].subtasks[0].steps.map(step => step.taskId),
    ["step-2", "step-3"]);
  assert.deepEqual(resolved.sections[0].sourceEventIds,
    ["event-1", "event-2", "event-3"]);

  result = hierarchy.rename(state, "sales", "Customer Order", { now: NOW });
  assert.equal(result.state.sections[0].title, "Customer Order");
  state = hierarchy.assign(result.state, ["step-1"], "sales", "lines", {
    position: 2
  }).state;
  assert.equal(hierarchy.resolve(steps.slice(0, 3), state)
    .sections[0].subtasks[0].steps.length, 3);
  state = hierarchy.reorder(state, "step",
    ["step-3", "step-2", "step-1"]);
  assert.deepEqual(hierarchy.resolve(steps.slice(0, 3), state)
    .sections[0].subtasks[0].steps.map(step => step.taskId),
  ["step-3", "step-2", "step-1"]);
}

{
  let state = hierarchy.createSection(hierarchy.empty("r"), "Generated",
    ["step-1"], { sectionId: "generated", provenance: "generated", now: NOW }).state;
  state = hierarchy.rename(state, "generated", "Consultant title", { now: NOW }).state;
  assert.equal(state.sections[0].provenance, "user-adjusted");
  const regenerated = [{ ...steps[0], instruction: "Improved generated step" }];
  assert.equal(hierarchy.resolve(regenerated, state).sections[0].title,
    "Consultant title");
  const orphan = hierarchy.resolve([], state);
  assert.equal(orphan.diagnostics[0].code, "orphaned-hierarchy-step");
  assert.equal(state.overrides.length, 2, "manual decisions remain persisted");
}

{
  const review = reviewStudio.createReview({ id: "r", name: "BC" }, steps.slice(0, 4));
  const evidence = JSON.stringify(review.generatedTasks);
  const sales = reviewStudio.createSection(review, "Sales Order",
    ["step-1", "step-2"], { sectionId: "sales", now: NOW });
  reviewStudio.createSection(review, "Warehouse", ["step-3", "step-4"], {
    sectionId: "warehouse", now: NOW
  });
  reviewStudio.createSubtask(review, sales.sectionId, "Lines", ["step-2"], {
    subtaskId: "lines", now: NOW
  });
  reviewStudio.renameHierarchy(review, "lines", "Order Lines", { now: NOW });
  assert.equal(review.hierarchy.subtasks[0].title, "Order Lines");
  reviewStudio.undo(review);
  assert.equal(review.hierarchy.subtasks[0].title, "Lines");
  reviewStudio.redo(review);
  assert.equal(review.hierarchy.subtasks[0].title, "Order Lines");
  assert.equal(JSON.stringify(review.generatedTasks), evidence);

  reviewStudio.add(review, 1, { manualStepId: "manual-info", now: NOW,
    instruction: "Verify availability." });
  reviewStudio.assignHierarchy(review, ["manual-info"], "sales", "lines", { now: NOW });
  assert.equal(review.hierarchy.assignments.find(item =>
    item.stepId === "manual-info").subtaskId, "lines");
  assert.equal(reviewStudio.merge(review, ["step-2", "step-3"], {
    now: NOW
  }).reason, "cross-hierarchy-boundary");

  const split = reviewStudio.split(review, "step-2", {
    segments: ["First line action.", "Second line action."]
  }, { now: NOW });
  assert.equal(split.splitTasks.length, 2);
  const splitAssignments = review.hierarchy.assignments.filter(item =>
    split.splitTasks.some(task => task.stepId === item.stepId)
  );
  assert.equal(splitAssignments.length, 2);
  assert(splitAssignments.every(item => item.subtaskId === "lines"));

  const session = { id: "r", name: "BC", startedAt: NOW };
  const prepared = pipeline.create({ review, session });
  const model = workspace.render(prepared.plan);
  const headings = model.sections.flatMap(section => section.items)
    .filter(item => item.kind === "heading").map(item => item.content.text);
  assert(headings.includes("Sales Order"));
  assert(headings.includes("Order Lines"));
  assert(headings.includes("Warehouse"));
  assert.equal(model.planId, prepared.plan.planId,
    "Workspace and Word share one hierarchy plan");
  reviewStudio.resetHierarchy(review, { now: NOW });
  assert.equal(review.hierarchy.sections.length, 0);
  reviewStudio.undo(review);
  assert.equal(review.hierarchy.sections.length, 2);
}

{
  let state = hierarchy.empty("large");
  const many = Array.from({ length: 5000 }, (_, index) => ({
    taskId: `step-${index}`, sourceEventIds: [`event-${index}`]
  }));
  state = hierarchy.createSection(state, "Large",
    many.map(step => step.taskId), { sectionId: "large", now: NOW }).state;
  assert.equal(hierarchy.resolve(many, state).sections[0].directSteps.length, 5000);
}

console.log("Sections / Subtasks tests passed.");
