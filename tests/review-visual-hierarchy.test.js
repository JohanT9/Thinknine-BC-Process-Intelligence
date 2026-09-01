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
assert(html.includes(".review-state-label.needs-review"));
assert(html.includes(".review-state-label.approved"));
assert(design.includes("border-left-color: var(--colorStatusSuccess)"));
assert(design.includes("border-left-color: #c58b00"));
assert(!design.includes(".review-card.needs-review { border-color: #f7630c"),
  "review attention must not use an aggressive full orange border");
for (const pair of [["Godkänt", "Approved"],
  ["Behöver granskas", "Needs review"], ["Ej granskat", "Not reviewed"]]) {
  assert(i18n.includes(`["${pair[0]}", "${pair[1]}"]`));
}
console.log("Review visual hierarchy UX tests passed.");
