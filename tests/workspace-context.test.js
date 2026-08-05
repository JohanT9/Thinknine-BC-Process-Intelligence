const assert = require("assert");
const fs = require("fs");
const path = require("path");
const context = require("../src/ui/workspace-context");

const initial = context.create();
assert.ok(Object.isFrozen(initial));
assert.deepStrictEqual(context.update(initial, {
  selectedStepId: "step-1",
  navigationReason: "review-selection",
  unknown: "ignored"
}), {
  selectedSectionId: null,
  selectedStepId: "step-1",
  selectedScreenshotId: null,
  selectedAnnotationId: null,
  scrollAnchor: null,
  focusOrigin: null,
  navigationReason: "review-selection"
});
assert.strictEqual(initial.selectedStepId, null);

const model = {
  sections: [{
    workspaceSectionId: "workspace:workflow",
    sourceSectionId: "workflow",
    items: [
      { workspaceItemId: "title-1", kind: "stepTitle" },
      { workspaceItemId: "text-1", kind: "paragraph" },
      { workspaceItemId: "image-1", kind: "image" },
      { workspaceItemId: "callout-1", kind: "callout" },
      { workspaceItemId: "title-2", kind: "stepTitle" },
      { workspaceItemId: "image-2", kind: "image" }
    ]
  }, {
    workspaceSectionId: "workspace:revision",
    sourceSectionId: "revision",
    items: [{ workspaceItemId: "revision-text", kind: "paragraph" }]
  }]
};
const binding = context.bind(model, {
  taskIds: ["step-1", "step-2"],
  screenshotsByTask: {
    "step-1": ["one.png"],
    "step-2": ["two.png"]
  }
});
assert.ok(Object.isFrozen(binding));
assert.strictEqual(binding.byItemId["text-1"].selectedStepId, "step-1");
assert.strictEqual(binding.byItemId["image-1"].selectedScreenshotId, "one.png");
assert.strictEqual(binding.byItemId["callout-1"].selectedStepId, "step-1");
assert.strictEqual(binding.byItemId["image-2"].selectedStepId, "step-2");
assert.strictEqual(binding.byItemId["workspace:workflow"].selectedStepId, "step-1");
assert.strictEqual(
  binding.byItemId["revision-text"].selectedStepId,
  null,
  "A later non-workflow section must not inherit the last task context."
);
assert.deepStrictEqual(context.target(binding, context.update(initial, {
  selectedStepId: "step-2"
})), { itemId: "title-2", sectionId: null });
assert.deepStrictEqual(context.target(binding, context.update(initial, {
  selectedStepId: "step-1",
  selectedScreenshotId: "one.png"
})), { itemId: "image-1", sectionId: null });

const repeated = context.bind(model, {
  taskIds: ["step-1", "step-2"],
  screenshotsByTask: { "step-1": ["one.png"], "step-2": ["two.png"] }
});
assert.deepStrictEqual(repeated, binding);
const moved = context.bind(model, {
  taskIds: ["step-2", "step-1"],
  screenshotsByTask: { "step-1": ["one.png"], "step-2": ["two.png"] }
});
assert.strictEqual(moved.byItemId["title-1"].selectedStepId, "step-2");
assert.strictEqual(moved.byItemId["image-1"].selectedScreenshotId, "two.png");
const restored = context.bind(model, {
  taskIds: ["step-1", "step-2"],
  screenshotsByTask: { "step-1": ["one.png"], "step-2": ["two.png"] }
});
assert.deepStrictEqual(restored, binding, "Undo/Redo rebinding must be deterministic.");
const annotated = context.update(initial, {
  selectedStepId: "step-1",
  selectedScreenshotId: "one.png",
  selectedAnnotationId: "annotation-1"
});
assert.strictEqual(context.target(binding, annotated).itemId, "image-1");
assert.strictEqual(context.target(binding, context.update(annotated, {
  selectedScreenshotId: "removed.png"
})).itemId, "title-1", "Stale screenshot context must fall back to its step.");
const source = fs.readFileSync(
  path.join(__dirname, "../src/ui/workspace-context.js"),
  "utf8"
);
for (const forbidden of ["review-studio", "document-workspace-view", "word-export"]) {
  assert.ok(!source.includes(forbidden), `Workspace Context must not depend on ${forbidden}.`);
}

console.log("Connected Workspace Context behaviour tests passed.");
