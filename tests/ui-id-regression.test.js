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
const popupHtml = fs.readFileSync(
  path.join(__dirname, "../src/ui/popup.html"),
  "utf8"
);
const popupJs = fs.readFileSync(
  path.join(__dirname, "../src/ui/popup.js"),
  "utf8"
);

assert.ok(
  html.includes(".review-header{position:sticky;top:0") &&
    html.includes(".review-shell{") &&
    html.includes("overflow:clip"),
  "Review Studio must keep its header sticky without an overflow container blocking it."
);

assert.ok(
  html.includes(".review-image-stage{position:relative;display:block;width:fit-content;max-width:min(100%,960px)") &&
    html.includes(".review-annotation-layer{position:absolute;inset:0;width:100%;height:100%"),
  "Review screenshots and their annotation layer must scale together at browser zoom levels."
);

assert.ok(
  html.includes(".review-overlay{position:fixed;inset:0") &&
    html.includes("padding:24px;overflow:hidden}") &&
    html.includes(".document-workspace-viewport{padding:22px;min-height:0;flex:1;overflow:auto;overscroll-behavior:contain}"),
  "Document scrolling must remain inside the full-screen workspace at both scroll boundaries."
);

assert.ok(
  html.includes(".review-shell{width:100%;max-width:none;height:calc(100vh - 48px);height:calc(100dvh - 48px)") &&
    html.includes("#reviewWorkspacePanel{min-height:0;flex:1;overflow:auto;overscroll-behavior:contain}") &&
    html.includes('.review-shell>[role="tabpanel"][hidden]{display:none!important}') &&
    html.includes(".review-shell.document-workspace-mode .document-workspace-panel{height:auto;min-height:0;flex:1}") &&
    html.includes(".document-workspace-body{display:flex;min-width:0;min-height:0;flex:1}"),
  "Review and Document views must fill the viewport without competing fixed-height or horizontal layouts."
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
    html.includes("top:var(--review-header-height,0px)") &&
    js.includes("function updateAnnotationStickyOffset()") &&
    js.includes('globalThis.addEventListener("resize", updateAnnotationStickyOffset)'),
  "Annotation editor actions should remain available while scrolling."
);
assert.ok(
  html.includes('id="message" role="status" aria-live="polite"') &&
    html.includes('aria-controls="advancedPanel"') &&
    html.includes('aria-expanded="false"') &&
    js.includes('setAttribute("aria-expanded", String(expanded))'),
  "Dashboard feedback and disclosure state must be available to assistive technology."
);
assert.ok(
  js.includes('button.setAttribute("aria-busy", "true")') &&
    js.includes('button.removeAttribute("aria-busy")'),
  "Word export must expose and clear its busy state."
);
assert.ok(
  popupHtml.includes('id="status" class="status" role="status"') &&
    popupHtml.includes('id="message" class="message" role="status"') &&
    popupJs.includes("function updateText(element, value)") &&
    popupJs.includes("if (element.textContent !== text)"),
  "Popup status must be live without repeated unchanged DOM announcements."
);
assert.ok(
  html.includes('id="workspaceTabs" class="workspace-tabs" role="tablist"') &&
    html.includes('id="reviewWorkspaceTab" role="tab"') &&
    html.includes('id="documentWorkspaceTab" role="tab"') &&
    html.includes('id="reviewWorkspacePanel" role="tabpanel"') &&
    html.includes('id="documentWorkspacePanel" class="document-workspace-panel"') &&
    html.includes('role="tabpanel" aria-labelledby="documentWorkspaceTab"'),
  "Review and Document must be accessible first-class workspaces."
);
assert.ok(
  html.includes('<script src="document/document-workspace.js"></script>') &&
    html.includes('<script src="workspace-controller.js"></script>') &&
    html.includes('<script src="workspace-context.js"></script>') &&
    html.includes('<script src="document-workspace-view.js"></script>') &&
    html.includes('<script src="document-workspace-experience.js"></script>'),
  "Dashboard must load the isolated Document Workspace renderer and controller."
);
assert.ok(
  html.includes('id="documentToolbar"') &&
    html.includes('role="toolbar"') &&
    html.includes('id="documentPageIndicator"') &&
    html.includes('aria-live="polite"') &&
    html.includes('id="documentViewSettings"') &&
    html.includes('aria-labelledby="documentViewSettingsTitle"'),
  "Document Workspace must expose accessible reading controls and advanced settings."
);
assert.ok(
  html.includes('@media(prefers-reduced-motion:reduce)') &&
    js.includes('"(prefers-reduced-motion: reduce)"') &&
    js.includes('behavior: reducedMotion ? "auto" : "smooth"'),
  "Connected-workspace feedback must respect reduced-motion preferences."
);
assert.ok(
  html.includes('id="documentContextHelp" class="sr-only"') &&
    js.includes('["Enter", " "]'),
  "Document-to-Review navigation must be explained and keyboard accessible."
);
assert.ok(
  html.includes('<script src="document/documentation-intelligence.js"></script>') &&
    html.includes('id="documentationGuidance"') &&
    html.includes('aria-labelledby="documentationGuidanceTitle"') &&
    html.includes('id="documentationGuidanceStatus"') &&
    html.includes('aria-live="polite"'),
  "Documentation Guidance must be an accessible, non-modal document panel."
);
assert.ok(
  html.includes('<script src="document/document-profile.js"></script>') &&
    html.includes('id="documentProfileSelector"') &&
    html.includes('for="documentProfileSelector"') &&
    html.includes('id="documentProfileDescription"'),
  "Smart Document Profiles must expose a labelled, described selector."
);

console.log("UI ID regression tests passed.");
