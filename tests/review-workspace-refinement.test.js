const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname,
  "../src/ui/dashboard.html"), "utf8");
const dashboard = fs.readFileSync(path.join(__dirname,
  "../src/ui/dashboard.js"), "utf8");
const toolbarStart = html.indexOf('id="reviewToolbar"');
const toolbarEnd = html.indexOf('id="reviewProgress"');
const toolbar = html.slice(toolbarStart, toolbarEnd);
const moreStart = toolbar.indexOf('id="reviewMoreActions"');
assert(toolbarStart >= 0 && toolbarEnd > toolbarStart && moreStart > 0);
for (const id of ["undoReview", "redoReview", "saveReview",
  "exportWordReview"]) {
  assert(toolbar.indexOf(`id="${id}"`) < moreStart,
    `${id} must remain immediately visible`);
}
for (const id of ["mergeReviewSteps", "splitReviewStep",
  "moveUpReviewSteps", "moveDownReviewSteps", "compactReviewSteps",
  "addReviewStep", "completeReview"]) {
  assert(toolbar.indexOf(`id="${id}"`) > moreStart,
    `${id} must use progressive disclosure`);
}
assert(toolbar.includes('aria-controls="reviewMoreActionsPanel"'));
assert(toolbar.includes('aria-expanded="false"'));
assert(html.includes(".review-fields textarea{width:100%;min-height:88px"));
assert(html.includes(".review-list{padding:18px;width:min(100%,1400px);margin-inline:auto;box-sizing:border-box}"));
assert(html.includes('.review-header>.review-title-row,.review-header>.workspace-tabs,.review-header>.review-zoom-toolbar,.review-header>.review-toolbar,.review-header>.review-progress,.review-header>#reviewStatus{width:100%;max-width:1364px;margin-inline:auto;box-sizing:border-box}'));
assert(html.includes("width:min(calc(100% - 40px),1360px)"));
assert(html.includes(".review-document-fields{margin:16px auto"));
assert(html.includes("padding:16px max(16px,calc((100% - 1368px)/2))"));
assert(html.includes(".annotation-stage{position:relative;width:fit-content;max-width:min(100%,960px);margin:0"));
assert(html.includes(".annotation-editor{padding:18px;width:min(100%,1400px);margin-inline:auto;box-sizing:border-box}"));
assert(html.includes("margin:-18px 0 0;padding:18px 0 1px"));
assert(html.includes('<h3 id="annotationTitle">Redigera bild</h3>'));
assert(dashboard.includes(">Redigera bild</button>"));
assert(!dashboard.includes(">Annotera</button>"));
assert(dashboard.includes("T9Review.visibleTaskNumber("));
assert(!dashboard.includes("`Redigera bild för steg ${task.taskNo}`"));
assert(html.includes("line-height:1.55"));
assert(html.includes("scroll-margin-top:260px"));
assert(html.includes("@media(max-width:800px)"));
assert(html.includes("@media(prefers-reduced-motion:reduce)"));
assert(html.includes("@media(forced-colors:active)"));
assert(html.indexOf('<details class="annotation-advanced">') <
  html.indexOf('id="annotationProperties"'));
assert(dashboard.includes('control.scrollIntoView({ block: "nearest"'));
assert(dashboard.includes('control.focus({ preventScroll: true })'));
assert(html.includes(".review-instruction-preview"));
assert(html.includes(".instruction-format-toolbar"));
assert(dashboard.includes("data-instruction-preview"));
assert(dashboard.includes("data-instruction-format=\"bold\""));
assert(dashboard.includes("data-instruction-format=\"italic\""));
assert(dashboard.includes("data-instruction-font"));
assert(dashboard.includes("data-instruction-size"));
assert(dashboard.includes("data-instruction-text-color"));
assert(dashboard.includes("data-instruction-background-color"));
assert(dashboard.includes("updateInstructionToolbar"));
assert(!dashboard.includes('<option value="">Behåll</option>'));
assert(dashboard.includes("normalizeInstructionRuns"));
assert(dashboard.includes('editor.contentEditable = "true"'));
assert(dashboard.includes("instructionRunsFromEditor"));
assert(dashboard.includes("restoreInstructionSelection"));
assert(dashboard.includes('addEventListener("pointerdown"'));
assert(dashboard.includes("const collapsed = from === to"));
assert(dashboard.includes('workspace === "document" && activeReviewEdit'));
assert(dashboard.includes("finishReviewEdit(current, true)"));
assert(dashboard.includes("documentInstructionRunsByTask"));
assert(dashboard.includes("createActiveDocumentPipeline().semanticDocument"));
assert(html.includes('.review-fields textarea[hidden]{display:none}'));
assert(dashboard.includes('$("reviewMoreActions").addEventListener("toggle"'));

console.log("Review Workspace refinement regression tests passed.");
