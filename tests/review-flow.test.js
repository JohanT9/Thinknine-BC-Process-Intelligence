const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Review flow: screenshot beside the instruction, Approve and next, click-to-edit,
// approval progress, language label and undo instead of confirmation when hiding a step.
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const dashboard = read("src/ui/dashboard.js");
const html = read("src/ui/dashboard.html");
const between = (start, end) => {
  const from = dashboard.indexOf(start);
  assert.ok(from >= 0, `${start} exists`);
  return dashboard.slice(from, dashboard.indexOf(end, from));
};

// The step body has a text column and a screenshot column; wide screens place them side by side.
const card = between('<div class="review-number" role="gridcell">', "list.appendChild(card);");
assert.match(card, /<div class="review-step-body"><div class="review-step-text">/u);
assert.match(card, /<\/div><div class="review-step-images">\s+\$\{images\.map\(/u);
assert.ok(card.indexOf('data-action="approve-next"') < card.indexOf('<details class="review-technical-details">'),
  "Approve and next follows the instruction and explanation");
assert.match(html, /@media\(min-width:1100px\)\{\.review-step-body:has\(\.review-step-images:not\(:empty\)\)\{grid-template-columns:/u);

// Approve and next approves, saves, moves on and keeps focus on the next step's button.
const approveNext = between("function approveAndShowNextStep(", "\nlet reviewToastTimer");
assert.match(approveNext, /T9Review\.approveTask\(activeReview, index, true/u);
assert.match(approveNext, /reviewAutoSave\.schedule\(\)/u);
assert.match(approveNext, /activateNextUnreviewedStep\(\)/u);
assert.match(approveNext, /\[data-action="approve-next"\]`\s*\)\?\.focus\(\)/u);
assert.match(between("card.querySelector('[data-action=\"approve-next\"]')", "card.querySelector(\"[data-instruction-preview]\")"),
  /event\.stopPropagation\(\);\s+approveAndShowNextStep\(task\.taskId\)/u,
  "the card's own click handler must not select the approved step again");

// Clicking the instruction text opens the editor.
assert.match(between("card.querySelector(\"[data-instruction-preview]\")\n      .addEventListener(\"click\"", "});"),
  /editReviewField\(card, task\.taskId, "instruction"\)/u);

// Hiding a step shows an undo toast that restores it through the review history.
assert.match(between("card.querySelector('[data-action=\"remove\"]')", "});"),
  /showReviewUndoToast\(uiTf\("Steg \{step\} dolt\.", \{ step: stepNumber \}\)\)/u);
assert.match(dashboard, /\$\("reviewToastUndo"\)\.addEventListener\("click", \(\) => \{\s+\$\("reviewToast"\)\.hidden = true;\s+restoreReviewHistory\("undo"\);/u);
assert.match(html, /<div id="reviewToast" class="review-toast" role="status" aria-live="polite" hidden>/u);

// Progress and the document/interface languages are shown with the summary.
const attention = between("function renderReviewAttention(", "\n}\n");
assert.match(attention, /uiTf\("\{approved\} av \{total\} godkända"/u);
assert.match(attention, /uiTf\("Dokument: \{document\} · Gränssnitt: \{interface\}"/u);
assert.match(html, /id="reviewStepProgressText"/u);
assert.match(html, /id="reviewLanguages"/u);

// New texts are translated into every interface language.
globalThis.T9LanguageRegistry = require("../src/engine/language-registry");
globalThis.T9LocaleCatalogs = require("../src/engine/locale-catalogs");
require("../src/ui/i18n");
const locales = globalThis.T9LanguageRegistry.supported("ui").map(item => item.locale);
for (const text of ["Godkänn och nästa", "Nästa steg"]) {
  const translations = new Set(locales.map(locale => globalThis.T9UiI18n.translate(text, locale)));
  assert.strictEqual(translations.size, locales.length, `"${text}" is translated into every language`);
}
assert.strictEqual(globalThis.T9UiI18n.format("{approved} av {total} godkända",
  { approved: 2, total: 9 }, "de-DE"), "2 von 9 freigegeben");

console.log("Review flow tests passed.");
