const assert = require("assert");
const annotations = require("../src/review/review-annotations");
const scene = require("../src/review/review-annotation-scene");
const svgRenderer = require("../src/review/review-annotation-svg");
const reviewStudio = require("../src/review/review-studio");

const primitives = scene.create([{
  annotationId: "ann_rectangle",
  type: "rectangle",
  geometry: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 },
  style: { stroke: "#123456", strokeWidth: 0.01, opacity: 0.8 }
}], 1000, 500);

assert.deepStrictEqual(primitives, [{
  annotationId: "ann_rectangle",
  type: "rectangle",
  x: 100,
  y: 100,
  width: 400,
  height: 150,
  stroke: "#123456",
  strokeWidth: 5,
  opacity: 0.8
}]);

assert.deepStrictEqual(scene.create([{
  annotationId: "ann_future",
  type: "blur",
  geometry: { x: 0, y: 0, width: 1, height: 1 }
}], 100, 100), []);
assert.throws(() => scene.create([], 0, 100), /greater than zero/);

const arrowPrimitives = scene.create([{
  annotationId: "ann_arrow",
  type: "arrow",
  geometry: { startX: 0.1, startY: 0.2, endX: 0.9, endY: 0.8 },
  style: { stroke: "#ff0000", strokeWidth: 0.01, opacity: 1,
    arrowheadLength: 0.1, arrowheadWidth: 0.05 }
}], 1000, 500);
assert.strictEqual(arrowPrimitives.length, 1);
assert.strictEqual(arrowPrimitives[0].type, "arrow");
assert.strictEqual(arrowPrimitives[0].startX, 100);
assert.strictEqual(arrowPrimitives[0].endX, 900);
assert.strictEqual(arrowPrimitives[0].headPoints.length, 3);

const shortArrow = scene.create([{
  annotationId: "ann_short",
  type: "arrow",
  geometry: { startX: 0.5, startY: 0.5, endX: 0.501, endY: 0.5 },
  style: annotations.DEFAULT_STYLES.arrow
}], 1000, 1000)[0];
const shortLength = shortArrow.endX - shortArrow.startX;
for (const point of shortArrow.headPoints.slice(1)) {
  assert.ok(Math.hypot(
    shortArrow.endX - point[0],
    shortArrow.endY - point[1]
  ) < shortLength);
}
const longArrow = scene.create([{
  annotationId: "ann_long",
  type: "arrow",
  geometry: { startX: 0.1, startY: 0.5, endX: 0.9, endY: 0.5 },
  style: annotations.DEFAULT_STYLES.arrow
}], 1000, 1000)[0];
assert.strictEqual(longArrow.endX - longArrow.headPoints[1][0], 25);
assert.strictEqual(
  Math.abs(longArrow.endY - longArrow.headPoints[1][1]),
  9
);

const review = { annotations: annotations.emptyStore(), updatedAt: "old" };
const rectangle = annotations.createAnnotation(
  "rectangle",
  { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
  { idFactory: () => "rectangle", now: "created" }
);
annotations.add(review, "screenshots/000001.png", rectangle, {
  idFactory: () => "set",
  now: "updated"
});
assert.strictEqual(review.annotations.screenshotSets.length, 1);
assert.strictEqual(review.annotations.screenshotSets[0].revision, 1);
assert.strictEqual(review.annotations.screenshotSets[0].items[0].annotationId,
  "ann_rectangle");
assert.strictEqual(review.updatedAt, "updated");
assert.throws(
  () => annotations.add(review, "screenshots/000001.png", rectangle),
  /Duplicate annotation ID/
);

const secondRectangle = annotations.createAnnotation(
  "rectangle",
  { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
  { idFactory: () => "rectangle-2", now: "created-2" }
);
annotations.add(review, " screenshots/000001.png ", secondRectangle, {
  idFactory: () => "must-not-create-another-set",
  now: "updated-2"
});
assert.strictEqual(review.annotations.screenshotSets.length, 1);
assert.strictEqual(review.annotations.screenshotSets[0].items.length, 2);

const updatedRectangle = annotations.update(
  review,
  "screenshots/000001.png",
  secondRectangle.annotationId,
  { geometry: { x: 0.5, y: 0.5, width: 0.2, height: 0.2 } },
  { now: "updated-3" }
);
assert.strictEqual(updatedRectangle.geometry.x, 0.5);
assert.strictEqual(review.annotations.screenshotSets[0].revision, 3);
assert.strictEqual(
  annotations.remove(
    review,
    "screenshots/000001.png",
    secondRectangle.annotationId,
    { now: "removed" }
  ).annotationId,
  secondRectangle.annotationId
);
assert.strictEqual(review.annotations.screenshotSets[0].items.length, 1);
assert.strictEqual(review.annotations.screenshotSets[0].revision, 4);

const futureReview = { annotations: annotations.emptyStore(), tasks: [] };
const futureRectangle = {
  ...annotations.createAnnotation(
    "rectangle",
    { x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
    { idFactory: () => "future", now: "future-created" }
  ),
  futureField: { preserve: true },
  style: {
    ...annotations.DEFAULT_STYLES.rectangle,
    futureStyle: "preserve"
  }
};
annotations.add(futureReview, "screenshots/future.png", futureRectangle, {
  idFactory: () => "future-set",
  now: "future-added"
});
annotations.update(
  futureReview,
  "screenshots/future.png",
  futureRectangle.annotationId,
  {
    geometry: { x: 0.2, y: 0.2, width: 0.3, height: 0.2 },
    style: { opacity: 0.7 }
  },
  { now: "future-updated" }
);
const preservedFuture = annotations.findScreenshotSet(
  futureReview.annotations,
  "screenshots/future.png"
).items[0];
assert.deepStrictEqual(preservedFuture.futureField, { preserve: true });
assert.strictEqual(preservedFuture.style.futureStyle, "preserve");
assert.strictEqual(preservedFuture.style.stroke, "#dc2626");
assert.strictEqual(preservedFuture.style.opacity, 0.7);
const beforeInvalidUpdate = JSON.stringify(futureReview);
for (const geometry of [
  { x: Number.NaN, y: 0, width: 0.2, height: 0.2 },
  { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 0.2 },
  { x: 0, y: 0, width: 0, height: 0.2 }
]) {
  assert.throws(() => annotations.update(
    futureReview,
    "screenshots/future.png",
    futureRectangle.annotationId,
    { geometry }
  ));
  assert.strictEqual(JSON.stringify(futureReview), beforeInvalidUpdate);
}

const taskReview = reviewStudio.createReview(
  { id: "session", name: "Session" },
  [
    { taskId: "a", instruction: "A", screenshots: ["screenshots/a.png"] },
    { taskId: "b", instruction: "B", screenshots: ["screenshots/b.png"] }
  ]
);
annotations.add(taskReview, "screenshots/b.png", secondRectangle, {
  idFactory: () => "task-set",
  now: "task-update"
});
reviewStudio.move(taskReview, 1, -1);
assert.strictEqual(taskReview.tasks[0].taskId, "b");
assert.strictEqual(taskReview.tasks[0].screenshots[0], "screenshots/b.png");
assert.strictEqual(
  annotations.findScreenshotSet(
    taskReview.annotations,
    taskReview.tasks[0].screenshots[0]
  ).items[0].annotationId,
  secondRectangle.annotationId
);
reviewStudio.remove(taskReview, 1);
assert.strictEqual(taskReview.tasks.length, 1);
assert.strictEqual(taskReview.tasks[0].screenshots[0], "screenshots/b.png");
const reloadedTaskReview = reviewStudio.normalizeReview(
  JSON.parse(JSON.stringify(taskReview))
);
assert.strictEqual(
  annotations.findScreenshotSet(
    reloadedTaskReview.annotations,
    reloadedTaskReview.tasks[0].screenshots[0]
  ).items[0].annotationId,
  secondRectangle.annotationId
);

function element() {
  return {
    attributes: {},
    dataset: {},
    children: [],
    setAttribute(name, value) { this.attributes[name] = value; },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; }
  };
}
const svg = element();
const documentRef = { createElementNS() { return element(); } };
svgRenderer.render(
  svg,
  review.annotations.screenshotSets[0].items,
  800,
  400,
  documentRef
);
assert.strictEqual(svg.attributes.viewBox, "0 0 800 400");
assert.strictEqual(svg.children.length, 1);
assert.strictEqual(
  svg.children[0].attributes["data-annotation-id"],
  "ann_rectangle"
);
assert.strictEqual(svg.children[0].attributes.x, "80");
assert.ok(
  Math.abs(Number(svg.children[0].attributes.width) - 160) < Number.EPSILON * 160
);

const arrowSvg = element();
svgRenderer.render(arrowSvg, [{
  annotationId: "ann_arrow",
  type: "arrow",
  geometry: { startX: 0.1, startY: 0.2, endX: 0.9, endY: 0.8 },
  style: annotations.DEFAULT_STYLES.arrow
}], 1000, 500, documentRef, { selectedId: "ann_arrow" });
assert.strictEqual(arrowSvg.children.length, 1);
assert.strictEqual(arrowSvg.children[0].children.length, 2);
assert.strictEqual(arrowSvg.children[0].attributes["data-selected"], "true");

console.log("Review annotation scene tests passed.");
