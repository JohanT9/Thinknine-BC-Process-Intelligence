const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Every Review change is persisted by autosave, and the footer shows one save state.
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const dashboard = read("src/ui/dashboard.js");
const html = read("src/ui/dashboard.html");
const between = (start, end) => {
  const from = dashboard.indexOf(start);
  assert.ok(from >= 0, `${start} exists`);
  return dashboard.slice(from, dashboard.indexOf(end, from));
};

// Approving a step, hiding steps and every structural change (move, merge, split, undo/redo,
// all rendered through renderMovedReview) schedule an autosave. Approvals were previously
// lost on reload unless Save was pressed.
assert.match(between('card.querySelector(\'[data-action="approve"]\')', "renderReview();"),
  /reviewAutoSave\.schedule\(\)/u, "approving a step schedules an autosave");
assert.match(between("function deleteReviewTasks(", "renderReview();"),
  /reviewAutoSave\.schedule\(\)/u, "hiding steps schedules an autosave");
assert.match(between("function renderMovedReview(", "renderReview();"),
  /reviewAutoSave\.schedule\(\)/u, "structural changes schedule an autosave");
for (const caller of ["moveReviewTasksByOffset", "moveReviewTasksTo", "mergeSelectedReviewTasks",
  "splitSelectedReviewTask", "restoreReviewHistory"]) {
  assert.match(between(`function ${caller}(`, "\n}\n"), /renderMovedReview\(/u,
    `${caller} renders through renderMovedReview`);
}

// Autosave reports pending, saved and failed; a failure offers a retry in the footer.
assert.match(dashboard, /onSchedule: \(\) => setReviewSaveState\("pending"\)/u);
assert.match(dashboard, /onSaved: \(\) => setReviewSaveState\("saved"\)/u);
assert.match(between("onError(error) {", "\n    }"), /setReviewSaveState\("failed"\)/u);
assert.match(between("function setReviewSaveState(", "\n}\n"),
  /\$\("saveReviewBottom"\)\.hidden = status !== "failed"/u);
assert.ok(html.includes('<button id="saveReviewBottom" class="primary" hidden>Försök igen</button>'));
assert.ok(html.includes('<button id="saveReview" data-review-toolbar-item class="secondary"'),
  "with autosave, Save is a secondary action");
assert.match(html, /\.review-footer\{[^}]*position:sticky;bottom:0/u,
  "the save state stays visible at the bottom of the Review");

// A disabled Complete review explains what remains.
assert.match(between('$("completeReview").disabled = !activeReview ||', "\n  $(\"regenerateSelectedReview\")"),
  /Godkänn alla steg för att slutföra granskningen\. \{count\} kvar\./u);

// The step workspace lines up with the toolbar and uses the available width.
assert.match(html, /\.review-step-workspace\{[^}]*width:100%;max-width:1364px;margin:0 auto\}/u);

console.log("Review save state and layout tests passed.");
