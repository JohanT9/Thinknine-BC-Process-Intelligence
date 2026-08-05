const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.html"),
  "utf8"
);
const js = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.js"),
  "utf8"
);

assert.ok(
  html.includes(".review-header{position:sticky;top:0") &&
    html.includes(".review-shell{") &&
    html.includes("overflow:clip"),
  "Review Studio must keep its header sticky without an overflow container blocking it."
);

const htmlIds = new Set(
  [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1])
);
const referencedIds = new Set(
  [...js.matchAll(/\$\("([^"]+)"\)/g)].map(match => match[1])
);

const missing = [...referencedIds].filter(id => !htmlIds.has(id));

assert.deepStrictEqual(
  missing,
  [],
  `Dashboard JS references missing HTML IDs: ${missing.join(", ")}`
);
assert.ok(
  !htmlIds.has("approveAllReview") &&
    html.includes('id="completeReview" class="primary" disabled') &&
    js.includes("T9Review.canComplete(activeReview)"),
  "Review completion must require individual approval of every step."
);

assert.ok(
  htmlIds.has("exportWordReview"),
  "Review Studio must contain the Word export button."
);
assert.ok(
  htmlIds.has("mergeReviewSteps"),
  "Review Studio must contain the merge selection button."
);
assert.ok(
  htmlIds.has("splitReviewStep"),
  "Review Studio must contain the split selection button."
);
assert.ok(
  html.includes('id="undoReview"') && html.includes('aria-keyshortcuts="Control+Z Meta+Z"'),
  "Review Studio must expose its undo shortcut to assistive technology."
);
assert.ok(
  html.includes('id="redoReview"') && html.includes('aria-keyshortcuts="Control+Y Meta+Shift+Z"'),
  "Review Studio must expose its redo shortcut to assistive technology."
);
assert.ok(
  html.includes('<script src="review/review-edit.js"></script>'),
  "Review Studio must load the inline editing controller."
);
assert.ok(
  html.includes('<script src="review/review-toolbar.js"></script>') &&
    html.includes('id="reviewToolbar"') &&
    html.includes('role="toolbar"'),
  "Review Studio must load and expose the command toolbar."
);
assert.ok(
  html.includes('<script src="review/review-status.js"></script>') &&
    html.includes('id="reviewStatus"') &&
    html.includes('role="status"') &&
    html.includes('aria-live="polite"') &&
    html.includes('aria-atomic="true"'),
  "Review Studio must expose its live document status accessibly."
);
assert.ok(
  html.includes('aria-describedby="reviewStatus"'),
  "The review grid must reference the status summary."
);
assert.ok(
  html.includes('id="reviewDialog"') &&
    html.includes('role="dialog"') &&
    html.includes('aria-modal="true"') &&
    html.includes('aria-labelledby="reviewTitle"'),
  "Review Studio must expose modal dialog semantics."
);
assert.ok(
  html.includes('id="reviewProgress"') &&
    html.includes('role="progressbar"') &&
    html.includes('aria-valuemin="0"') &&
    html.includes('aria-valuemax="100"'),
  "Review Studio must expose progressbar semantics."
);
assert.ok(
  html.includes('<script src="review/review-accessibility.js"></script>'),
  "Review Studio must load the accessibility controller."
);
assert.ok(
  htmlIds.has("compactReviewSteps") &&
    html.includes('<script src="review/review-layout.js"></script>') &&
    html.includes('aria-pressed="false"'),
  "Review Studio must expose the accessible compact-view toggle."
);
assert.ok(
  js.includes('data-action="toggle-layout"') &&
    js.includes("T9ReviewLayout.toggleTask") &&
    js.includes("T9ReviewLayout.toggleAll"),
  "Review Studio must support global and per-task compact view controls."
);
assert.ok(
  js.includes('data-action="edit-instruction"') &&
    js.includes('data-action="edit-comment"') &&
    js.includes('data-action="add-comment"') &&
    js.includes("editReviewField(card, task.taskId"),
  "Review fields must expose explicit inline editing controls."
);
assert.ok(
  js.includes('setAttribute("aria-rowindex"') &&
    js.includes('setAttribute("aria-rowcount"') &&
    js.includes('setAttribute("aria-valuenow"'),
  "Dynamic Review Studio ARIA values must update during rendering."
);
for (const id of ["moveUpReviewSteps", "moveDownReviewSteps"]) {
  assert.ok(htmlIds.has(id), `Review toolbar must contain ${id}.`);
}
assert.ok(
  !htmlIds.has("deleteReviewSteps") &&
    js.includes('data-action="remove"') &&
    js.includes("deleteReviewTasks([task.taskId])"),
  "Each review task must expose its own delete action instead of a toolbar command."
);
assert.ok(
  js.includes('data-edit-field="instruction"') &&
    js.includes('data-edit-field="userComment"'),
  "Review Studio fields must opt into delegated inline editing."
);
assert.ok(
  html.includes('id="reviewList"') &&
    html.includes('role="grid"') &&
    html.includes('aria-multiselectable="true"'),
  "Review Studio must expose its multi-selection grid semantics."
);
assert.ok(
  js.includes('card.setAttribute("role", "row")') &&
    js.includes('card.setAttribute("aria-selected", String(selected))'),
  "Review cards must expose selection state as grid rows."
);
assert.ok(
  html.includes('class="annotation-editor-sticky"') &&
    html.includes(".annotation-editor-sticky{position:sticky;top:0;"),
  "Annotation editor actions should remain available while scrolling."
);

console.log("UI ID regression tests passed.");
