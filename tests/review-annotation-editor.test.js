const assert = require("assert");
const editor = require("../src/review/review-annotation-editor");
const annotations = require("../src/review/review-annotations");

let state = editor.create({
  taskId: "task-1",
  screenshotRef: "screenshots/000001.png",
  imageUrl: "data:image/png;base64,test"
});
assert.strictEqual(state.tool, "rectangle");
assert.deepStrictEqual(
  editor.point(150, 100, { left: 50, top: 50, width: 200, height: 100 }),
  { x: 0.5, y: 0.5 }
);
assert.deepStrictEqual(
  editor.point(-10, 500, { left: 0, top: 0, width: 100, height: 100 }),
  { x: 0, y: 1 }
);
assert.strictEqual(editor.point(0, 0, { width: 0, height: 1 }), null);

state = editor.begin(state, { x: 0.8, y: 0.7 });
state = editor.move(state, { x: 0.2, y: 0.3 });
const result = editor.finish(state);
assert.deepStrictEqual(result.geometry, {
  x: 0.8,
  y: 0.7,
  width: -0.6000000000000001,
  height: -0.39999999999999997
});
assert.strictEqual(result.state.draft, null);
assert.deepStrictEqual(editor.centeredRectangle(), {
  x: 0.3,
  y: 0.375,
  width: 0.4,
  height: 0.25
});

const persistedReview = {
  annotations: annotations.emptyStore(),
  tasks: []
};
const persistedSnapshot = JSON.stringify(persistedReview);
let cancelled = editor.create({
  taskId: "task-1",
  screenshotRef: "screenshots/000001.png",
  imageUrl: "image"
});
cancelled = editor.begin(cancelled, { x: 0.1, y: 0.1 });
cancelled = editor.move(cancelled, { x: 0.5, y: 0.5 });
cancelled = editor.cancel(cancelled);
assert.strictEqual(cancelled.draft, null);
assert.strictEqual(JSON.stringify(persistedReview), persistedSnapshot);

const released = [];
const capturedSurface = {
  hasPointerCapture(pointerId) { return pointerId === 7; },
  releasePointerCapture(pointerId) { released.push(pointerId); }
};
assert.strictEqual(editor.releasePointer(capturedSurface, 7), true);
assert.deepStrictEqual(released, [7]);
assert.strictEqual(editor.releasePointer(capturedSurface, 8), false);
assert.strictEqual(editor.releasePointer(capturedSurface, null), false);
assert.strictEqual(editor.releasePointer({
  releasePointerCapture() { throw new Error("already released"); }
}, 9), false);

console.log("Review annotation editor tests passed.");
