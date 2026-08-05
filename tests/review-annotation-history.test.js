const assert = require("assert");
const reviewStudio = require("../src/review/review-studio");
const annotations = require("../src/review/review-annotations");

const review = reviewStudio.createReview(
  { id: "session", name: "Session" },
  [{ taskId: "task", instruction: "Task", screenshots: ["shot.png"] }]
);
const rectangle = annotations.createAnnotation(
  "rectangle",
  { x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
  { idFactory: () => "rectangle", now: "created" }
);

reviewStudio.addAnnotation(review, "shot.png", rectangle, {
  idFactory: () => "set",
  now: "add",
  beforeAnnotationSelection: null,
  afterAnnotationSelection: rectangle.annotationId
});
assert.strictEqual(review.commandHistoryVersion, "2.0.0");
assert.strictEqual(review.commandHistory.length, 1);
assert.strictEqual(review.historyIndex, 1);

let result = reviewStudio.undo(review);
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png"),
  null
);
assert.strictEqual(result.annotationSelection, null);
result = reviewStudio.redo(review);
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png").items.length,
  1
);
assert.strictEqual(result.annotationSelection, rectangle.annotationId);

reviewStudio.updateAnnotation(
  review,
  "shot.png",
  rectangle.annotationId,
  { geometry: { x: 0.2, y: 0.2, width: 0.3, height: 0.2 } },
  {
    type: "annotation-move",
    now: "move",
    beforeAnnotationSelection: rectangle.annotationId,
    afterAnnotationSelection: rectangle.annotationId
  }
);
assert.strictEqual(review.commandHistory.length, 2);
reviewStudio.undo(review);
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png")
    .items[0].geometry.x,
  0.1
);
reviewStudio.redo(review);

assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png")
    .items[0].geometry.x,
  0.2
);

const historyLengthBeforeNoOp = review.commandHistory.length;
reviewStudio.updateAnnotation(
  review,
  "shot.png",
  rectangle.annotationId,
  { geometry: { x: 0.2, y: 0.2, width: 0.3, height: 0.2 } },
  { type: "annotation-move", now: "noop" }
);
assert.strictEqual(review.commandHistory.length, historyLengthBeforeNoOp);

reviewStudio.updateAnnotation(
  review,
  "shot.png",
  rectangle.annotationId,
  { style: { opacity: 0.5, futureStyle: "preserve" } },
  { type: "annotation-style", now: "style" }
);
assert.strictEqual(review.commandHistory.at(-1).type, "annotation-style");
reviewStudio.undo(review);
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png")
    .items[0].style.opacity,
  1
);
reviewStudio.redo(review);
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png")
    .items[0].style.futureStyle,
  "preserve"
);

const groupedBefore = review.commandHistory.length;
for (const [index, x] of [0.21, 0.22].entries()) {
  reviewStudio.updateAnnotation(
    review,
    "shot.png",
    rectangle.annotationId,
    { geometry: { x, y: 0.2, width: 0.3, height: 0.2 } },
    {
      type: "annotation-move",
      groupKey: `annotation-nudge:shot.png:${rectangle.annotationId}`,
      now: `nudge-${index}`,
      beforeAnnotationSelection: rectangle.annotationId,
      afterAnnotationSelection: rectangle.annotationId
    }
  );
}
assert.strictEqual(review.commandHistory.length, groupedBefore + 1);
reviewStudio.undo(review);
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png")
    .items[0].geometry.x,
  0.2
);
reviewStudio.redo(review);

const historyBeforeUnrelatedCommand = review.commandHistory.length;
reviewStudio.updateAnnotation(
  review,
  "shot.png",
  rectangle.annotationId,
  { style: { opacity: 0.75 } },
  { type: "annotation-style", now: "unrelated-style" }
);
reviewStudio.updateAnnotation(
  review,
  "shot.png",
  rectangle.annotationId,
  { geometry: { x: 0.23, y: 0.2, width: 0.3, height: 0.2 } },
  {
    type: "annotation-move",
    groupKey: `annotation-nudge:shot.png:${rectangle.annotationId}`,
    now: "nudge-after-style"
  }
);
assert.strictEqual(review.commandHistory.length, historyBeforeUnrelatedCommand + 2);
assert.strictEqual(review.commandHistory.at(-2).type, "annotation-style");
assert.strictEqual(review.commandHistory.at(-1).type, "annotation-move");

reviewStudio.removeAnnotation(review, "shot.png", rectangle.annotationId, {
  now: "delete",
  beforeAnnotationSelection: rectangle.annotationId,
  afterAnnotationSelection: null
});
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png").items.length,
  0
);
result = reviewStudio.undo(review);
assert.strictEqual(result.annotationSelection, rectangle.annotationId);
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png").items.length,
  1
);
reviewStudio.redo(review);
assert.strictEqual(
  annotations.findScreenshotSet(review.annotations, "shot.png").items.length,
  0
);

reviewStudio.undo(review);
const replacement = annotations.createAnnotation(
  "arrow",
  { startX: 0.1, startY: 0.1, endX: 0.8, endY: 0.8 },
  { idFactory: () => "replacement", now: "replacement" }
);
reviewStudio.addAnnotation(review, "shot.png", replacement, {
  now: "branch",
  beforeAnnotationSelection: rectangle.annotationId,
  afterAnnotationSelection: replacement.annotationId
});
assert.strictEqual(reviewStudio.canRedo(review), false);

const reloaded = reviewStudio.normalizeReview(JSON.parse(JSON.stringify(review)));
assert.strictEqual(reloaded.commandHistoryVersion, "2.0.0");
assert.strictEqual(
  annotations.findScreenshotSet(reloaded.annotations, "shot.png").items.length,
  2
);

const multiScreenshotReview = reviewStudio.createReview(
  { id: "multi", name: "Multiple screenshots" },
  [{
    taskId: "multi-task",
    instruction: "Task",
    screenshots: ["first.png", "second.png"]
  }]
);
const firstAnnotation = annotations.createAnnotation(
  "rectangle",
  { x: 0.12, y: 0.23, width: 0.34, height: 0.45 },
  {
    idFactory: () => "first",
    now: "first-created",
    style: { futureStyle: { preserved: true } }
  }
);
const secondAnnotation = annotations.createAnnotation(
  "arrow",
  { startX: 0.15, startY: 0.25, endX: 0.75, endY: 0.85 },
  { idFactory: () => "second", now: "second-created" }
);
reviewStudio.addAnnotation(multiScreenshotReview, "first.png", firstAnnotation, {
  idFactory: () => "first-set",
  now: "first-added"
});
reviewStudio.addAnnotation(multiScreenshotReview, "second.png", secondAnnotation, {
  idFactory: () => "second-set",
  now: "second-added"
});
reviewStudio.updateAnnotation(
  multiScreenshotReview,
  "first.png",
  firstAnnotation.annotationId,
  { geometry: { x: 0.2, y: 0.23, width: 0.34, height: 0.45 } },
  { type: "annotation-move", now: "first-moved" }
);
const firstSet = annotations.findScreenshotSet(
  multiScreenshotReview.annotations,
  "first.png"
);
const secondSet = annotations.findScreenshotSet(
  multiScreenshotReview.annotations,
  "second.png"
);
assert.strictEqual(firstSet.items[0].geometry.x, 0.2);
assert.strictEqual(secondSet.items[0].geometry.startX, 0.15);
assert.strictEqual(firstSet.revision, 2);
assert.strictEqual(secondSet.revision, 1);

const persistedMultiScreenshot = JSON.parse(JSON.stringify(multiScreenshotReview));
const reloadedMultiScreenshot = reviewStudio.normalizeReview(
  persistedMultiScreenshot
);
assert.deepStrictEqual(
  reloadedMultiScreenshot.annotations,
  multiScreenshotReview.annotations
);
assert.strictEqual(
  annotations.findScreenshotSet(reloadedMultiScreenshot.annotations, "first.png")
    .items[0].annotationId,
  firstAnnotation.annotationId
);
assert.deepStrictEqual(
  annotations.findScreenshotSet(reloadedMultiScreenshot.annotations, "first.png")
    .items[0].style.futureStyle,
  { preserved: true }
);

const truncatedReview = reviewStudio.createReview(
  { id: "truncated", name: "Truncated history" },
  [{ taskId: "task", instruction: "Task", screenshots: ["shot.png"] }]
);
const truncatedAnnotation = annotations.createAnnotation(
  "rectangle",
  { x: 0.01, y: 0.1, width: 0.1, height: 0.1 },
  { idFactory: () => "truncated", now: "created" }
);
reviewStudio.addAnnotation(truncatedReview, "shot.png", truncatedAnnotation, {
  idFactory: () => "truncated-set",
  now: "added"
});
for (let index = 1; index <= 105; index += 1) {
  reviewStudio.updateAnnotation(
    truncatedReview,
    "shot.png",
    truncatedAnnotation.annotationId,
    {
      geometry: {
        x: 0.01 + index * 0.001,
        y: 0.1,
        width: 0.1,
        height: 0.1
      }
    },
    { type: "annotation-move", now: `move-${index}` }
  );
}
assert.strictEqual(truncatedReview.commandHistory.length, 100);
assert.strictEqual(truncatedReview.historyIndex, 100);
assert.ok(Math.abs(
  annotations.findScreenshotSet(truncatedReview.annotations, "shot.png")
    .items[0].geometry.x - 0.115
) < Number.EPSILON);
reviewStudio.undo(truncatedReview);
assert.ok(Math.abs(
  annotations.findScreenshotSet(truncatedReview.annotations, "shot.png")
    .items[0].geometry.x - 0.114
) < Number.EPSILON);

console.log("Review annotation history tests passed.");
