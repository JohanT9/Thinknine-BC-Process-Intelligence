const assert = require("assert");
const annotations = require("../src/review/review-annotations");

function ids(...values) {
  let index = 0;
  return () => values[index++];
}

const empty = annotations.emptyStore();
assert.deepStrictEqual(empty, {
  schemaVersion: "1.0.0",
  screenshotSets: []
});

const rectangle = annotations.createAnnotation(
  annotations.TYPES.RECTANGLE,
  { x: 0.8, y: 0.7, width: -0.4, height: -0.3 },
  {
    idFactory: ids("rectangle-id"),
    now: "2026-08-05T10:00:00.000Z"
  }
);
assert.strictEqual(rectangle.annotationId, "ann_rectangle-id");
assert.ok(Math.abs(rectangle.geometry.x - 0.4) < Number.EPSILON);
assert.ok(Math.abs(rectangle.geometry.y - 0.4) < Number.EPSILON);
assert.ok(Math.abs(rectangle.geometry.width - 0.4) < Number.EPSILON);
assert.ok(Math.abs(rectangle.geometry.height - 0.3) < Number.EPSILON);
assert.deepStrictEqual(rectangle.style, {
  stroke: "#dc2626",
  strokeWidth: 0.006,
  opacity: 1
});
assert.strictEqual(annotations.validation(rectangle).valid, true);

const arrow = annotations.createAnnotation(
  annotations.TYPES.ARROW,
  { startX: -1, startY: 0.2, endX: 2, endY: 0.8 },
  { idFactory: ids("ann_arrow-id") }
);
assert.strictEqual(arrow.annotationId, "ann_arrow-id");
assert.deepStrictEqual(arrow.geometry, {
  startX: 0,
  startY: 0.2,
  endX: 1,
  endY: 0.8
});
assert.strictEqual(arrow.style.arrowheadLength, 0.025);
assert.strictEqual(arrow.style.arrowheadWidth, 0.018);

assert.throws(
  () => annotations.createAnnotation(
    annotations.TYPES.RECTANGLE,
    { x: 0.5, y: 0.5, width: 0, height: 0.2 },
    { idFactory: ids("invalid") }
  ),
  /visible width and height/
);
assert.throws(
  () => annotations.createAnnotation(
    annotations.TYPES.ARROW,
    { startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5 },
    { idFactory: ids("invalid") }
  ),
  /different start and end points/
);
assert.throws(
  () => annotations.createAnnotation(
    annotations.TYPES.ARROW,
    { startX: Number.NaN, startY: 0, endX: 1, endY: 1 },
    { idFactory: ids("invalid") }
  ),
  /finite number/
);

const set = annotations.createScreenshotSet(
  " screenshots/000001.png ",
  {
    idFactory: ids("set-id"),
    now: "2026-08-05T10:00:00.000Z"
  }
);
assert.strictEqual(set.annotationSetId, "annset_set-id");
assert.strictEqual(set.screenshotRef, "screenshots/000001.png");

const futureAnnotation = {
  annotationId: "ann_future",
  type: "blur",
  geometry: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
  futureProperty: { strength: 8 }
};
const futureStore = {
  schemaVersion: "2.0.0",
  futureTopLevel: true,
  screenshotSets: [{
    annotationSetId: "annset_future",
    screenshotRef: "screenshots/000002.png",
    revision: 1,
    items: [futureAnnotation]
  }]
};
const normalizedFuture = annotations.normalizeStore(futureStore);
assert.deepStrictEqual(normalizedFuture, futureStore);
assert.notStrictEqual(normalizedFuture, futureStore);
assert.strictEqual(
  annotations.validation(futureAnnotation).supported,
  false
);
assert.strictEqual(
  annotations.findScreenshotSet(
    normalizedFuture,
    "screenshots/000002.png"
  ).annotationSetId,
  "annset_future"
);

const changedFutureShape = {
  schemaVersion: "3.0.0",
  screenshotSets: {
    futureCollection: true
  },
  migrationHints: ["preserve-me"]
};
assert.deepStrictEqual(
  annotations.normalizeStore(changedFutureShape),
  changedFutureShape
);

const legacyReview = {
  reviewVersion: "1.0.0",
  tasks: [{
    taskId: "task-1",
    metadata: { preserve: true }
  }]
};
const legacySnapshot = JSON.parse(JSON.stringify(legacyReview));
const normalizedReview = annotations.normalizeReview(legacyReview);
assert.deepStrictEqual(normalizedReview.annotations, empty);
assert.strictEqual(legacyReview.annotations, undefined);
assert.deepStrictEqual(legacyReview, legacySnapshot);
normalizedReview.tasks[0].metadata.preserve = false;
assert.deepStrictEqual(legacyReview, legacySnapshot);

const reviewWithFutureData = {
  reviewVersion: "1.0.0",
  annotations: futureStore,
  tasks: []
};
const loaded = JSON.parse(JSON.stringify(reviewWithFutureData));
const normalized = annotations.normalizeReview(loaded);
const saved = JSON.parse(JSON.stringify(normalized));
assert.deepStrictEqual(saved.annotations, futureStore);
assert.deepStrictEqual(loaded, reviewWithFutureData);

console.log("Review annotation domain tests passed.");
