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
assert.strictEqual(svg.children.length, 2);
assert.strictEqual(svg.children[0].dataset.annotationId, "ann_rectangle");
assert.strictEqual(svg.children[0].attributes.x, "80");
assert.ok(
  Math.abs(Number(svg.children[0].attributes.width) - 160) < Number.EPSILON * 160
);

console.log("Review annotation scene tests passed.");
