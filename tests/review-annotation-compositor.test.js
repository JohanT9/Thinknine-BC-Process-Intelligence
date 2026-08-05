const assert = require("assert");
const annotations = require("../src/review/review-annotations");
const compositor = require("../src/review/review-annotation-compositor");
const svg = require("../src/review/review-annotation-svg");
const reviewStudio = require("../src/review/review-studio");
const editor = require("../src/review/review-annotation-editor");

const rectangle = annotations.createAnnotation(
  "rectangle",
  { x: 0.1, y: 0.2, width: 0.4, height: 0.3 },
  {
    idFactory: () => "rectangle",
    now: "created",
    style: { stroke: "#123456", strokeWidth: 0.01, opacity: 0.8 }
  }
);
const arrow = annotations.createAnnotation(
  "arrow",
  { startX: 0.2, startY: 0.8, endX: 0.9, endY: 0.1 },
  { idFactory: () => "arrow", now: "created" }
);
const future = {
  annotationId: "ann_future",
  type: "highlight",
  geometry: { x: 0, y: 0, width: 1, height: 1 },
  futureField: { preserved: true }
};

const visualMarkup = svg.markup([rectangle, arrow, future], 1000, 500);
assert.ok(visualMarkup.startsWith(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"'
));
assert.match(
  visualMarkup,
  /<rect[^>]*x="100"[^>]*y="100"[^>]*width="400"[^>]*height="150"/
);
assert.match(visualMarkup, /stroke="#123456"/);
assert.match(visualMarkup, /<line[^>]*x1="200"[^>]*y1="400"/);
assert.match(visualMarkup, /<polygon[^>]*points="[^"]+"/);
assert.ok(!visualMarkup.includes("ann_future"));

function renderingEnvironment() {
  const canvases = [];
  const loadedSources = [];
  class FakeImage {
    set src(value) {
      this._src = value;
      loadedSources.push(value);
      this.naturalWidth = 1600;
      this.naturalHeight = 900;
      queueMicrotask(() => this.onload());
    }
    get src() { return this._src; }
  }
  function createCanvas() {
    const calls = [];
    const canvas = {
      width: 0,
      height: 0,
      calls,
      getContext() {
        return {
          drawImage(...args) { calls.push(args); },
          imageSmoothingEnabled: false,
          imageSmoothingQuality: "low"
        };
      },
      toBlob(callback) {
        callback(new Blob([new Uint8Array([137, 80, 78, 71])]));
      }
    };
    canvases.push(canvas);
    return canvas;
  }
  return { ImageConstructor: FakeImage, createCanvas, canvases, loadedSources };
}

(async () => {
  const environment = renderingEnvironment();
  const released = [];
  const sourceState = JSON.stringify([rectangle, arrow, future]);
  const composed = await compositor.composeScreenshot(
    "data:image/png;base64,original",
    [rectangle, arrow, future],
    { ...environment, onRelease(value) { released.push(value); } }
  );
  assert.deepStrictEqual([...composed.bytes], [137, 80, 78, 71]);
  assert.strictEqual(composed.mimeType, "image/png");
  assert.deepStrictEqual([composed.width, composed.height], [1600, 900]);
  assert.strictEqual(environment.canvases[0].calls.length, 2);
  assert.deepStrictEqual(
    environment.canvases[0].calls[0].slice(1),
    [0, 0, 1600, 900]
  );
  assert.ok(environment.loadedSources[1].startsWith("data:image/svg+xml"));
  assert.deepStrictEqual(
    [environment.canvases[0].width, environment.canvases[0].height],
    [0, 0]
  );
  assert.strictEqual(released.length, 1);
  assert.strictEqual(JSON.stringify([rectangle, arrow, future]), sourceState);

  const review = { annotations: annotations.emptyStore() };
  annotations.add(review, "one.png", rectangle, {
    idFactory: () => "one-set", now: "added"
  });
  annotations.add(review, "two.png", arrow, {
    idFactory: () => "two-set", now: "added"
  });
  review.annotations.screenshotSets.push({
    annotationSetId: "future-set",
    screenshotRef: "future.png",
    revision: 1,
    items: [future]
  });
  const sources = {
    "one.png": "data:image/png;base64,one",
    "two.png": "data:image/png;base64,two",
    "plain.png": "data:image/png;base64,plain",
    "future.png": "data:image/png;base64,future"
  };
  const originals = [];
  const batchEnvironment = renderingEnvironment();
  const batch = await compositor.composeReview({
    review,
    paths: ["one.png", "two.png", "one.png", "plain.png", "future.png"],
    screenshotSources: sources,
    convertOriginal(source) {
      originals.push(source);
      return { bytes: new Uint8Array([1]), mimeType: "image/png" };
    },
    ...batchEnvironment
  });
  assert.deepStrictEqual(Object.keys(batch), [
    "one.png", "two.png", "plain.png", "future.png"
  ]);
  assert.strictEqual(batchEnvironment.canvases.length, 2);
  assert.deepStrictEqual(originals, [sources["plain.png"], sources["future.png"]]);

  const repeatedEnvironment = renderingEnvironment();
  await compositor.composeReview({
    review,
    paths: ["one.png"],
    screenshotSources: sources,
    convertOriginal() { throw new Error("Unexpected original conversion."); },
    ...repeatedEnvironment
  });
  assert.strictEqual(repeatedEnvironment.canvases.length, 1);
  assert.deepStrictEqual(
    [repeatedEnvironment.canvases[0].width, repeatedEnvironment.canvases[0].height],
    [0, 0]
  );

  const failedCanvas = {
    width: 0,
    height: 0,
    getContext() { return null; }
  };
  await assert.rejects(
    compositor.composeScreenshot(
      sources["one.png"],
      [rectangle],
      {
        ImageConstructor: repeatedEnvironment.ImageConstructor,
        createCanvas: () => failedCanvas
      }
    ),
    /Canvas rendering is unavailable/
  );
  assert.deepStrictEqual([failedCanvas.width, failedCanvas.height], [0, 0]);

  const workflowReview = reviewStudio.createReview(
    { id: "workflow", name: "Workflow" },
    [
      { taskId: "a", instruction: "First part. Second part.", screenshots: ["a.png"] },
      { taskId: "b", instruction: "B", screenshots: ["b.png"] }
    ]
  );
  assert.deepStrictEqual(
    compositor.pathsForTasks(workflowReview.tasks),
    ["a.png", "b.png"]
  );
  reviewStudio.move(workflowReview, 1, -1, { now: "move" });
  assert.deepStrictEqual(
    compositor.pathsForTasks(workflowReview.tasks),
    ["b.png", "a.png"]
  );
  reviewStudio.undo(workflowReview);
  assert.deepStrictEqual(
    compositor.pathsForTasks(workflowReview.tasks),
    ["a.png", "b.png"]
  );
  reviewStudio.redo(workflowReview);
  assert.deepStrictEqual(
    compositor.pathsForTasks(workflowReview.tasks),
    ["b.png", "a.png"]
  );
  reviewStudio.merge(workflowReview, ["b", "a"], { now: "merge" });
  assert.deepStrictEqual(
    compositor.pathsForTasks(workflowReview.tasks),
    ["b.png", "a.png"]
  );
  reviewStudio.split(
    workflowReview,
    workflowReview.tasks[0].taskId,
    { segments: ["First", "Second"] },
    { now: "split" }
  );
  assert.deepStrictEqual(
    compositor.pathsForTasks(workflowReview.tasks),
    ["b.png", "a.png"]
  );
  reviewStudio.remove(workflowReview, 0, { now: "delete" });
  assert.deepStrictEqual(
    compositor.pathsForTasks(workflowReview.tasks),
    ["b.png", "a.png"]
  );

  const historyAnnotation = annotations.createAnnotation(
    "rectangle",
    { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    { idFactory: () => "history", now: "created" }
  );
  reviewStudio.addAnnotation(workflowReview, "a.png", historyAnnotation, {
    idFactory: () => "history-set",
    now: "history-add"
  });
  reviewStudio.updateAnnotation(
    workflowReview,
    "a.png",
    historyAnnotation.annotationId,
    { geometry: { x: 0.4, y: 0.1, width: 0.2, height: 0.2 } },
    { type: "annotation-move", now: "history-move" }
  );
  reviewStudio.undo(workflowReview);
  assert.match(
    svg.markup(
      annotations.findScreenshotSet(workflowReview.annotations, "a.png").items,
      1000,
      500
    ),
    /x="100"/
  );
  reviewStudio.redo(workflowReview);
  assert.match(
    svg.markup(
      annotations.findScreenshotSet(workflowReview.annotations, "a.png").items,
      1000,
      500
    ),
    /x="400"/
  );

  const baseline = editor.baseline(review);
  annotations.update(
    review,
    "one.png",
    rectangle.annotationId,
    { geometry: { x: 0.3, y: 0.2, width: 0.4, height: 0.3 } },
    { now: "temporary-edit" }
  );
  const cancelledReview = editor.restoreBaseline(review, baseline, {
    now: "cancelled"
  });
  assert.strictEqual(
    annotations.findScreenshotSet(cancelledReview.annotations, "one.png")
      .items[0].geometry.x,
    0.1
  );

  console.log("Review annotation compositor tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
