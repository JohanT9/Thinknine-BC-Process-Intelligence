const assert = require("assert");
const fs = require("fs");

const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
const design = fs.readFileSync("src/ui/design-system.css", "utf8");
const i18n = fs.readFileSync("src/ui/i18n.js", "utf8");

assert(dashboard.includes("const reviewState = task.approved"));
assert(dashboard.includes('card.dataset.reviewState = reviewState'));
assert(dashboard.includes('class="review-state-label ${reviewState}"'));
assert(dashboard.includes('${uiT("Steg")} ${visibleIndex + 1}, ${reviewStateLabel}'),
  "screen readers must receive the textual Step state");
assert(dashboard.includes('class="secondary review-hide-action"'),
  "reversible Hide must not look like a permanent destructive error");
assert(html.includes("border-left:4px solid transparent"));
assert(html.includes(".review-state-label.edited"));
assert(html.includes(".review-state-label.approved"));
assert(design.includes("border-left-color: var(--colorStatusSuccess)"));
assert(design.includes(".review-card.edited"));
assert(!dashboard.includes('uiT("Behöver granskas")'));
for (const pair of [["Godkänt", "Approved"],
  ["Ändrad", "Edited"], ["Ej granskat", "Not reviewed"]]) {
  assert(i18n.includes(`["${pair[0]}", "${pair[1]}"]`));
}
console.log("Review visual hierarchy UX tests passed.");
