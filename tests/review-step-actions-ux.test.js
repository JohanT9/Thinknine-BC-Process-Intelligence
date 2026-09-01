const assert = require("assert");
const fs = require("fs");

const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
const i18n = fs.readFileSync("src/ui/i18n.js", "utf8");

assert(dashboard.includes('class="review-approve-action"'),
  "approval must remain directly visible on every Step");
assert(dashboard.includes('class="review-step-actions-menu"'));
assert(dashboard.includes('class="review-step-actions-panel"'));
assert(dashboard.includes('<summary aria-label="${uiT("Fler åtgärder")}">⋯</summary>'));
for (const action of ["add", "repair-step", "reset-instruction", "remove",
  "toggle-layout"]) {
  const actionPosition = dashboard.indexOf(`data-action="${action}"`);
  const panelPosition = dashboard.lastIndexOf("review-step-actions-panel",
    actionPosition);
  assert(panelPosition >= 0 && actionPosition - panelPosition < 3000,
    `${action} must be grouped in the secondary Step menu`);
}
assert(dashboard.includes('class="review-technical-details"'));
assert(dashboard.includes('uiT("Teknisk information")'));
assert(dashboard.includes('event.key !== "Escape"'));
assert(dashboard.includes("stepActionsMenu.open = false"));
assert(dashboard.includes('stepActionsMenu.querySelector("summary").focus()'));
assert(html.includes(".review-step-actions-panel{position:absolute"));
assert(html.includes(".review-card.compact .review-technical-details"));
assert(i18n.includes('"a11y.stepActions"'));
assert(i18n.includes('["Teknisk information", "Technical information"]'));
console.log("Review Step action simplification UX tests passed.");
