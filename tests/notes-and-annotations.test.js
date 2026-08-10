const assert = require("assert");
const notes = require("../src/review/review-notes");
const annotations = require("../src/review/review-annotations");
const scene = require("../src/review/review-annotation-scene");
const svg = require("../src/review/review-annotation-svg");
const reviewStudio = require("../src/review/review-studio");
const projector = require("../src/document/review-document-projector");
const pipeline = require("../src/exporters/word-export-pipeline");
const workspace = require("../src/document/document-workspace");

const NOW = "2026-08-10T14:00:00.000Z";

{
  const note = notes.create({ recordingId: "r", ownerType: "step",
    ownerId: "step-1", noteType: "warning",
    content: "Quantity is entered in the customer's sales unit.", now: NOW,
    futureFields: { future: true } });
  assert.equal(note.schemaVersion, "1.0.0");
  assert.equal(note.provenance, "manual");
  assert.equal(note.ownerId, "step-1");
  assert.deepEqual(note.futureFields, { future: true });
  assert.equal(notes.validation(note).valid, true);
  assert.equal(notes.validation({ ...note, content: "" }).issues[0].code,
    "empty-note");
  const hidden = notes.update(note, { visibility: "hidden" }, { now: NOW });
  assert.equal(hidden.visibility, "hidden");
  const orphaned = notes.resolve([note], ["other"]);
  assert.equal(orphaned.diagnostics[0].code, "orphaned-note-owner");
  assert.equal(orphaned.notes.length, 1, "orphaned note is preserved");
}

{
  const rectangle = annotations.createAnnotation("rectangle",
    { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, {
      idFactory: () => "rect", screenshotAssetId: "shot",
      ownerStepId: "step-1", recordingId: "r", now: NOW,
      accessibleLabel: "Quantity field", styleRole: "instruction",
      futureFields: { future: true }
    });
  assert.equal(rectangle.screenshotAssetId, "shot");
  assert.equal(rectangle.ownerStepId, "step-1");
  assert.equal(rectangle.provenance, "manual");
  assert(Math.abs(rectangle.geometry.width - 0.3) < 1e-12);
  assert(Math.abs(rectangle.geometry.height - 0.4) < 1e-12);
  const review = { annotations: annotations.emptyStore() };
  annotations.add(review, "shot", rectangle, { now: NOW,
    idFactory: () => "set" });
  const moved = annotations.update(review, "shot", rectangle.annotationId,
    { geometry: { x: 0.2, y: 0.3, width: 0.3, height: 0.4 } }, { now: NOW });
  assert.equal(moved.geometry.x, 0.2);
  const resized = annotations.update(review, "shot", rectangle.annotationId,
    { geometry: { x: 0.2, y: 0.3, width: 0.5, height: 0.2 } }, { now: NOW });
  assert(Math.abs(resized.geometry.width - 0.5) < 1e-12);
  assert.equal(annotations.remove(review, "shot", rectangle.annotationId,
    { now: NOW }).annotationId, rectangle.annotationId);
}

{
  const types = ["highlight", "numbered-callout", "text-label"];
  const items = types.map((type, index) => annotations.createAnnotation(type,
    { x: 0.1 * index, y: 0.1, width: 0.2, height: 0.15 }, {
      idFactory: () => type, now: NOW,
      label: type === "highlight" ? "" : String(index + 1),
      accessibleLabel: `${type} guidance`, styleRole: "information"
    }));
  assert.equal(scene.create(items, 1000, 500).length, 3);
  const markup = svg.markup(items, 1000, 500);
  assert(markup.includes("numbered-callout guidance"));
  assert(markup.includes(">2<"));
  assert.throws(() => annotations.createAnnotation("text-label",
    { x: 0, y: 0, width: 0.2, height: 0.1 }, {
      idFactory: () => "empty"
    }), /require a label/);
}

{
  const review = reviewStudio.createReview({ id: "r", name: "BC" }, [{
    taskId: "step-1", instruction: "Enter 500 in Quantity",
    sourceEventNos: [1], screenshots: ["shot"]
  }]);
  const canonical = JSON.stringify(review.generatedTasks);
  const note = reviewStudio.addNote(review, "step-1",
    "Quantity is entered in the customer's sales unit.", {
      noteType: "information", now: NOW
    });
  assert.equal(review.stepNotes.length, 1);
  reviewStudio.updateNote(review, note.noteId, {
    content: "Use the customer's sales unit."
  }, { now: NOW });
  assert.equal(review.stepNotes[0].content, "Use the customer's sales unit.");
  reviewStudio.undo(review);
  assert.equal(review.stepNotes[0].content,
    "Quantity is entered in the customer's sales unit.");
  reviewStudio.redo(review);
  reviewStudio.updateNote(review, note.noteId, { visibility: "hidden" }, { now: NOW });
  assert.equal(review.stepNotes[0].visibility, "hidden");
  reviewStudio.undo(review);
  assert.equal(review.stepNotes[0].visibility, "visible");
  reviewStudio.removeNote(review, note.noteId, { now: NOW });
  assert.equal(review.stepNotes.length, 0);
  reviewStudio.undo(review);
  assert.equal(review.stepNotes.length, 1);
  assert.equal(JSON.stringify(review.generatedTasks), canonical);

  const annotation = annotations.createAnnotation("rectangle",
    { x: 0.2, y: 0.2, width: 0.3, height: 0.2 }, {
      idFactory: () => "quantity", ownerStepId: "step-1",
      screenshotAssetId: "shot", accessibleLabel: "Quantity field", now: NOW
    });
  reviewStudio.addAnnotation(review, "shot", annotation, { now: NOW,
    idFactory: () => "set" });
  const beforeScreenshot = JSON.stringify({ id: "shot", bytes: "unchanged" });
  assert.equal(reviewStudio.selectTaskScreenshot(review, 0, "other").reason,
    "annotation-protected");
  assert.equal(JSON.stringify({ id: "shot", bytes: "unchanged" }), beforeScreenshot);

  const projection = projector.project(review, { session: {
    id: "r", name: "BC", startedAt: NOW
  } });
  const step = projection.document.sections.find(section =>
    section.kind === "workflow").blocks.find(block => block.kind === "step");
  assert(step.blocks.some(block => block.kind === "callout" &&
    block.blocks[0].text === "Use the customer's sales unit."));
  const prepared = pipeline.create({ review, session: {
    id: "r", name: "BC", startedAt: NOW
  } });
  const model = workspace.render(prepared.plan);
  assert(model.sections.flatMap(section => section.items).some(item =>
    item.kind === "callout" && item.content.text ===
      "Use the customer's sales unit."));
  assert.equal(model.planId, prepared.plan.planId);
}

{
  const many = Array.from({ length: 5000 }, (_, index) => notes.create({
    noteId: `note-${index}`, ownerType: "step", ownerId: `step-${index}`,
    content: "Context", now: NOW
  }));
  assert.equal(notes.resolve(many,
    many.map((_, index) => `step-${index}`)).visibleNotes.length, 5000);
}

console.log("Notes & Annotations tests passed.");
