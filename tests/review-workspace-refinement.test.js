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
assert(html.includes('<h3 id="annotationTitle">Redigera bild</h3>'));
assert(dashboard.includes(">Redigera bild</button>"));
assert(!dashboard.includes(">Annotera</button>"));
assert(html.includes("line-height:1.55"));
assert(html.includes("scroll-margin-top:260px"));
assert(html.includes("@media(max-width:800px)"));
assert(html.includes("@media(prefers-reduced-motion:reduce)"));
assert(html.includes("@media(forced-colors:active)"));
assert(html.indexOf('<details class="annotation-advanced">') <
  html.indexOf('id="annotationProperties"'));
assert(dashboard.includes('control.scrollIntoView({ block: "nearest"'));
assert(dashboard.includes('control.focus({ preventScroll: true })'));
assert(dashboard.includes('$("reviewMoreActions").addEventListener("toggle"'));

console.log("Review Workspace refinement regression tests passed.");
