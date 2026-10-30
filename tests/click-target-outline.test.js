// The control a step clicked, typed in or chose is outlined in its screenshot: the recorder
// measures it in the tab's viewport through same-origin frames, the interpretation keeps the box
// only for the event the screenshot belongs to, and a new review adds an outline that the
// consultant can move or remove and that does not block regeneration until it is changed.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const studio = require("../src/review/review-studio");
const regeneration = require("../src/review/review-regeneration");

// The recorder's measurement, run against a page inside an inner frame of the same origin.
const source = fs.readFileSync(path.join(__dirname, "../src/recorder/content.js"), "utf8");
const start = source.indexOf("  // Only the visible part counts");
const helper = source.slice(start, source.indexOf("  function descriptor(element) {"));
assert(start > 0, "the recorder measures the viewport box");
const top = { innerWidth: 1000, innerHeight: 500 };
top.top = top;
const inner = { top, parent: top, frameElement: { clientLeft: 2, clientTop: 3,
  getBoundingClientRect: () => ({ x: 88, y: 47 }) } };
inner.top = top;
// The box crosses the context as JSON, so it compares like a plain object.
const run = (view, bounds, element, styles = new Map()) => {
  const json = vm.runInNewContext(`${helper}; JSON.stringify(viewportBounds(bounds, element))`,
    { window: view, bounds, element, Math, JSON, getComputedStyle: node => styles.get(node) ||
      { overflowX: "visible", overflowY: "visible" } });
  return json === undefined ? undefined : JSON.parse(json);
};
assert.deepStrictEqual(run(inner, { x: 404, y: 419, width: 28, height: 25 }),
  { x: 0.494, y: 0.938, width: 0.028, height: 0.05 });
assert.deepStrictEqual(run(top, { x: 100, y: 50, width: 200, height: 25 }),
  { x: 0.1, y: 0.1, width: 0.2, height: 0.05 });
// A frame of another origin cannot be measured, and an empty box is no box.
const foreign = { top, parent: top, get frameElement() { throw new Error("cross-origin"); } };
assert.strictEqual(run(foreign, { x: 1, y: 1, width: 10, height: 10 }), undefined);
assert.strictEqual(run({ top, parent: top, frameElement: null }, { x: 1, y: 1, width: 10, height: 10 }), undefined);
assert.strictEqual(run(top, { x: 1, y: 1, width: 0, height: 10 }), undefined);
// A row wider than its scrolling list is cut to the list; a parent that does not clip is ignored.
const list = { getBoundingClientRect: () => ({ x: 100, y: 0, width: 300, height: 500 }), parentElement: null };
const wrapper = { getBoundingClientRect: () => ({ x: 0, y: 0, width: 50, height: 50 }), parentElement: list };
const row = { parentElement: wrapper };
const clipped = run(top, { x: 150, y: 100, width: 600, height: 20 }, row,
  new Map([[list, { overflowX: "auto", overflowY: "hidden" }]]));
assert.deepStrictEqual(clipped, { x: 0.15, y: 0.2, width: 0.25, height: 0.04 });
assert.strictEqual(run(top, { x: 450, y: 100, width: 100, height: 20 }, row,
  new Map([[list, { overflowX: "auto", overflowY: "auto" }]])), undefined, "a row scrolled out of view has no box");

// A new review outlines the box in the step's screenshot as a generated rectangle.
const task = { taskId: "customer", instruction: "Välj **905** i **Kundnr**.",
  screenshot: "screenshots/000039.png", screenshots: ["screenshots/000039.png"],
  screenshotHighlight: { screenshotRef: "screenshots/000039.png", sourceEventNo: 39,
    x: 0.494, y: 0.938, width: 0.028, height: 0.05 } };
const session = { id: "outline", name: "Outline", settings: {} };
const review = studio.createReview(session, [task]);
const [set] = review.annotations.screenshotSets;
assert.strictEqual(set.screenshotRef, "screenshots/000039.png");
assert.strictEqual(set.items.length, 1);
const [outline] = set.items;
assert.strictEqual(outline.type, "rectangle");
assert.strictEqual(outline.provenance, "generated");
assert.strictEqual(outline.ownerStepId, "customer");
assert.deepStrictEqual(outline.metadata, { source: "click-target", sourceEventNo: 39 });
assert.ok(Math.abs(outline.geometry.x - 0.49) < 1e-9 && Math.abs(outline.geometry.width - 0.036) < 1e-9);
// A box for another screenshot than the step shows is not drawn, and the setting turns it off.
assert.strictEqual(studio.createReview(session, [{ ...task, screenshotHighlight: {
  ...task.screenshotHighlight, screenshotRef: "screenshots/000048.png" } }]).annotations.screenshotSets.length, 0);
assert.strictEqual(studio.createReview({ ...session, settings: { highlightClickTargets: false } },
  [task]).annotations.screenshotSets.length, 0);
assert.strictEqual(studio.createReview(session, [{ ...task, screenshotHighlight: undefined }])
  .annotations.screenshotSets.length, 0);

// An untouched generated outline does not block regeneration; once moved, it is the consultant's.
assert.ok(!regeneration.consultantState(review, { mappings: [], addedStepIds: [], removedStepIds: [] })
  .includes("annotations"));
const moved = studio.normalizeReview(JSON.parse(JSON.stringify(review)));
studio.updateAnnotation(moved, "screenshots/000039.png", outline.annotationId,
  { geometry: { x: 0.4, y: 0.9, width: 0.05, height: 0.05 } }, { now: "2099-01-01T00:00:00.000Z" });
assert.ok(regeneration.consultantState(moved, { mappings: [], addedStepIds: [], removedStepIds: [] })
  .includes("annotations"));
console.log("Click target outline tests passed.");
