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
state = editor.selectTool(state, "arrow");
assert.strictEqual(state.tool, "arrow");
state = editor.begin(state, { x: 0.2, y: 0.8 });
state = editor.move(state, { x: 0.8, y: 0.2 });
assert.deepStrictEqual(editor.finish(state).geometry, {
  startX: 0.2,
  startY: 0.8,
  endX: 0.8,
  endY: 0.2
});
assert.deepStrictEqual(editor.centeredArrow(), {
  startX: 0.3,
  startY: 0.65,
  endX: 0.7,
  endY: 0.35
});

const selectedAnnotation = {
  annotationId: "ann_selected",
  type: "rectangle",
  geometry: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 }
};
state = editor.select(editor.create({
  taskId: "task",
  screenshotRef: "screenshot",
  imageUrl: "image"
}), selectedAnnotation.annotationId);
state = editor.beginTranslation(state, selectedAnnotation, { x: 0.7, y: 0.7 });
state = editor.moveTranslation(state, { x: 1, y: 1 });
const translation = editor.finishTranslation(state);
assert.deepStrictEqual(translation.change.geometry, {
  x: 0.8,
  y: 0.8,
  width: 0.2,
  height: 0.2
});
assert.strictEqual(translation.state.translation, null);
assert.strictEqual(translation.state.selectedId, selectedAnnotation.annotationId);
const pointerTranslation = translation.change.geometry;
const keyboardTranslation = editor.translatedGeometry(
  selectedAnnotation.type,
  selectedAnnotation.geometry,
  0.3,
  0.3
);
assert.deepStrictEqual(pointerTranslation, keyboardTranslation);
const translatedArrow = editor.translatedGeometry("arrow", {
  startX: 0.1, startY: 0.2, endX: 0.8, endY: 0.7
}, -0.5, 0.5);
assert.strictEqual(translatedArrow.startX, 0);
assert.strictEqual(translatedArrow.startY, 0.5);
assert.ok(Math.abs(translatedArrow.endX - 0.7) < Number.EPSILON);
assert.strictEqual(translatedArrow.endY, 1);

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
