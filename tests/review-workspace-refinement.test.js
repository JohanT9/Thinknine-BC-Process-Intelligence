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
