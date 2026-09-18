const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const helper = dashboard.slice(dashboard.indexOf("function stepRepairContext()"),
  dashboard.indexOf("function renderStepRepairGallery()"));
const handlers = dashboard.slice(dashboard.indexOf('$("captureStepRepairScreenshot").addEventListener("click", async'),
  dashboard.indexOf("function annotationItems("));
function setup() {
  const elements = {};
  const context = {
    stepRepairState: { taskIndex: 0, taskId: "a", selectedAssetId: "new",
      capturedAssetId: "new", capturedAssetKey: "key", capturedImage: "image" },
    activeReview: { tasks: [{ taskId: "a" }] }, activeReviewSession: { id: "s" },
    activeReviewModel: { screenshotData: {} }, activeReviewSelection: {},
    annotationItems: () => [], renderStepRepairGallery: () => {},
    renderReview: () => {}, show: () => {}, reviewAutoSave: { schedule() {} },
    repairs: 0,
    T9Review: { resolveTask: () => ({ selectedScreenshotAssetId: "old" }),
      repairTaskScreenshot: () => { context.repairs += 1; return { ok: true }; } },
    $: id => elements[id] ||= { open: true, disabled: false, textContent: "",
      handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; },
      close() { this.open = false; } }
  };
  let finish;
  context.send = () => new Promise(resolve => { finish = resolve; });
  vm.createContext(context);
  vm.runInContext(helper + handlers, context);
  return { context, elements, finish: value => finish(value) };
}
async function main() {
  for (const mode of ["closed", "reopened", "reordered", "session"]) {
    const test = setup();
    const pending = test.elements.captureStepRepairScreenshot.handlers.click();
    if (mode === "closed") test.context.stepRepairState = null;
    if (mode === "reopened") test.context.stepRepairState = { taskId: "b", taskIndex: 0 };
    if (mode === "reordered") test.context.activeReview.tasks = [{ taskId: "b" }];
    if (mode === "session") test.context.activeReviewSession = { id: "other" };
    test.elements.stepRepairStatus.textContent = "New dialog status";
    test.finish({ ok: true, assetId: "late", image: "pixels" });
    await pending;
    assert.strictEqual(Object.keys(test.context.activeReviewModel.screenshotData).length, 0, mode);
    assert.strictEqual(test.elements.stepRepairStatus.textContent, "New dialog status", mode);
  }
  const good = setup();
  const captured = good.elements.captureStepRepairScreenshot.handlers.click();
  good.finish({ ok: true, assetId: "new-image", image: "pixels" });
  await captured;
  assert.strictEqual(good.context.stepRepairState.selectedAssetId, "new-image");
  assert.strictEqual(good.elements.captureStepRepairScreenshot.disabled, false);
  for (const mode of ["closed", "reopened", "selection"]) {
    const test = setup();
    const pending = test.elements.applyStepRepair.handlers.click();
    if (mode === "closed") test.context.stepRepairState = null;
    if (mode === "reopened") test.context.stepRepairState = { taskId: "b", taskIndex: 0 };
    if (mode === "selection") test.context.stepRepairState.selectedAssetId = "another";
    test.finish({ ok: true });
    await pending;
    assert.strictEqual(test.context.repairs, 0, mode);
  }
  const saved = setup();
  const pending = saved.elements.applyStepRepair.handlers.click();
  saved.finish({ ok: true });
  await pending;
  assert.strictEqual(saved.context.repairs, 1);
  console.log("Step repair async lifecycle tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
