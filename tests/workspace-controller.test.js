const assert = require("assert");
const controller = require("../src/ui/workspace-controller");

const initial = controller.create();
assert.deepStrictEqual(initial, {
  active: "review",
  revision: 0,
  renderedRevision: -1
});
assert.ok(Object.isFrozen(initial));
assert.strictEqual(controller.workspaceFromKey("review", "ArrowRight"), "document");
assert.strictEqual(controller.workspaceFromKey("document", "ArrowLeft"), "review");
assert.strictEqual(controller.workspaceFromKey("review", "End"), "document");
assert.strictEqual(controller.workspaceFromKey("document", "Home"), "review");
assert.strictEqual(controller.workspaceFromKey("review", "Enter"), "review");

const documentState = controller.switchTo(initial, "document");
assert.strictEqual(documentState.active, "document");
assert.strictEqual(controller.switchTo(documentState, "unknown"), documentState);
assert.strictEqual(controller.needsRender(documentState), true);

const changed = controller.invalidate(documentState);
assert.strictEqual(changed.revision, 1);
assert.strictEqual(controller.complete(changed, 0), changed);
const rendered = controller.complete(changed, 1);
assert.strictEqual(rendered.renderedRevision, 1);
assert.strictEqual(controller.needsRender(rendered), false);
assert.strictEqual(controller.invalidate(rendered).renderedRevision, 1);

let builds = 0;
const cache = controller.createRevisionCache();
const review = {};
const first = cache.get([review, 1, "business-process"], () => {
  builds += 1;
  return Object.freeze({ revision: 1 });
});
assert.strictEqual(cache.get([review, 1, "business-process"], () => {
  builds += 1;
  return {};
}), first);
assert.strictEqual(builds, 1);
assert.notStrictEqual(cache.get([review, 2, "business-process"], () => {
  builds += 1;
  return Object.freeze({ revision: 2 });
}), first);
assert.strictEqual(builds, 2);
cache.clear();
cache.get([review, 2, "business-process"], () => {
  builds += 1;
  return Object.freeze({ revision: 2 });
});
assert.strictEqual(builds, 3);

console.log("Workspace switching behaviour tests passed.");
