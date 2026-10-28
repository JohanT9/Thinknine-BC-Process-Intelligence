const assert = require("assert");
const fs = require("fs");
const path = require("path");

// The start page: Documents and Settings views, review status per document, a continue list,
// recording actions in each document's menu and settings that save automatically.
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
globalThis.T9LanguageRegistry = require("../src/engine/language-registry");
globalThis.T9LocaleCatalogs = require("../src/engine/locale-catalogs");
require("../src/ui/i18n");
const i18n = globalThis.T9UiI18n;
const view = require("../src/ui/document-library-view");
const library = require("../src/document/document-library");
const uiLocales = globalThis.T9LanguageRegistry.supported("ui").map(item => item.locale);

// Review state follows the approved steps of the saved review.
const doc = library.normalize({ projectId: "doc", title: "Sales order",
  modifiedAt: "2026-10-28T09:00:00Z", metadata: { company: "CRONUS" } });
const bug = library.normalize({ projectId: "bug", title: "Posting fails",
  metadata: { recordingPurpose: "bug-report" } });
const live = library.normalize({ projectId: "live", title: "Live",
  metadata: { status: "recording" } });
assert.deepStrictEqual(view.documentState(doc), { state: "new", total: 0, approved: 0 });
assert.deepStrictEqual(view.documentState(doc, { total: 9, approved: 3 }),
  { state: "review", total: 9, approved: 3 });
assert.strictEqual(view.documentState(doc, { total: 9, approved: 9 }).state, "ready");
assert.strictEqual(view.documentState(doc, { total: 9, approved: 2, completed: true }).state, "ready");
assert.strictEqual(view.documentState(doc, { total: 0, approved: 0 }).state, "new");
assert.strictEqual(view.documentState(bug, { total: 4, approved: 1 }).state, "bug-report");
assert.strictEqual(view.documentState(live).state, "recording");

// Rows show type, company and status; the menu holds export, archive and delete.
const container = { innerHTML: "" };
const progress = new Map([["doc", { total: 9, approved: 3 }]]);
view.renderList(container, [doc, bug, live], { locale: "sv-SE", progress });
const html = container.innerHTML;
assert(html.includes('data-kind="documentation"') && html.includes('data-kind="bug-report"'));
assert(html.includes(">CRONUS</span>"));
assert(html.includes('<span class="library-state" data-state="review">Granskas · 3 av 9</span>'));
assert(html.includes('data-state="recording">Spelar in</span>'));
assert.strictEqual((html.match(/data-library-action="export-word"/gu) || []).length, 1,
  "only finished documentation recordings offer Word export");
assert.strictEqual((html.match(/data-library-action="export-recording"/gu) || []).length, 2,
  "a recording in progress cannot be exported");
assert.strictEqual((html.match(/data-library-action="delete"/gu) || []).length, 3);
assert(html.includes('aria-label="Fler åtgärder för Sales order"'));
assert(/data-library-action="open" disabled>Öppna dokumentation</u.test(html),
  "a recording in progress cannot be opened");
assert(html.includes("data-no-tooltip"), "menu items do not show tooltips over the next item");
view.renderList(container, [library.normalize({ ...doc, archived: true })], { locale: "en-US" });
assert(container.innerHTML.includes(">Restore from archive</button>"));

// Continue where you left off lists started, unfinished and unarchived reviews only.
const started = library.normalize({ ...doc, projectId: "started" });
const done = library.normalize({ ...doc, projectId: "done" });
const archived = library.normalize({ ...doc, projectId: "archived", archived: true });
const continueProgress = new Map([["started", { total: 5, approved: 2 }],
  ["done", { total: 5, approved: 5 }], ["archived", { total: 5, approved: 1 }]]);
assert.strictEqual(view.renderContinue(container, [started, done, archived, bug],
  { locale: "en-US", progress: continueProgress }), 1);
assert(container.innerHTML.includes('data-library-continue="started"') &&
  container.innerHTML.includes("2 of 5 steps approved") &&
  container.innerHTML.includes("width:40%"));

// Every row and continue text exists in every interface language.
for (const locale of uiLocales) {
  view.renderList(container, [doc, bug, live], { locale, progress });
  const row = container.innerHTML;
  view.renderContinue(container, [doc], { locale, progress });
  const next = container.innerHTML;
  if (locale === "en-US") continue;
  for (const english of ["In review · 3 of 9", "Recording", "Export recording (ZIP)",
    "More actions for Sales order", "Delete…"]) {
    assert(!row.includes(english), `${locale}: ${english}`);
  }
  assert(!next.includes("steps approved"), `${locale}: continue card`);
}

// The page: two views, a new recording dialog, grouped settings without save buttons.
const page = read("src/ui/dashboard.html");
assert(page.includes('<header class="home-appbar">') &&
  page.includes('data-home-view="documents" aria-controls="documentsView" aria-current="page"'));
assert(page.includes('<dialog id="newRecordingDialog" class="new-recording-dialog" aria-labelledby="newRecordingTitle">'));
for (const section of ["settingsGeneral", "settingsDocuments", "settingsRecording",
  "settingsBugReports", "settingsAdvanced"]) {
  assert(page.includes(`id="${section}" class="settings-section"`), section);
  assert(page.includes(`aria-controls="${section}"`), `${section} navigation`);
}
assert(!page.includes('id="save"') && !page.includes('id="saveSupportEmail"'),
  "settings save automatically");
assert(page.includes('id="settingsSaveState"') && page.includes('id="settingsSaveRetry"'),
  "the save state and a retry are visible");
assert(page.includes('id="libraryQuickFilters"') && page.includes('id="librarySelectMode"'));
for (const filter of ["all", "documentation", "bug-report", "review", "favourite", "archived"]) {
  assert(page.includes(`data-library-filter="${filter}"`), filter);
}

const dashboard = read("src/ui/dashboard.js");
assert(dashboard.includes("if (settingsSaveRunning) {\n    settingsSaveQueued = true;"),
  "a change during a save is saved afterwards");
assert(dashboard.includes('setSettingsSaveState("error", uiT(error.message || String(error)));'),
  "a failed save keeps the edits and shows the error with a retry");
assert(dashboard.includes("throw new Error(response.error || uiT(\"Inställningarna kunde inte sparas.\"));"),
  "a rejected save is reported, not shown as saved");
assert(dashboard.includes('setSettingsSaveState("error", uiT("Rätta filnamnsmallen."));') &&
  dashboard.includes('uiT("Ange en giltig e-postadress, till exempel support@example.com.")'),
  "an invalid support address or filename template is not saved");
assert(dashboard.includes("all: record => !record.archived,") &&
  dashboard.includes("archived: record => record.archived"),
  "archived documents leave the main list and stay reachable");
assert(dashboard.includes("documentLibraryProgress.set(activeReviewSession.id, reviewProgressSummary(activeReview));"),
  "closing a review updates its status on the start page");

// Only the review progress leaves storage for the start page.
const background = read("src/recorder/background.js");
assert(background.includes("[SESSION_PREFIX, BUG_REPORT_PREFIX, REVIEW_PREFIX]") &&
  background.includes("return { sessions, reports, reviewProgress,"));

// New start page texts are translated in every interface language.
for (const text of ["Alla dokument", "Fortsätt där du slutade", "Välj flera", "Behöver granskas",
  "Arkiverade", "Ändringar sparas direkt.", "Starta en ny inspelning", "Gå till Business Central",
  "Inställningarna kunde inte sparas. {detail}", "Tillgängliga variabler: {variables}",
  "Förhandsvisning: {filename}", "Felaktiga variabler: {variables}. Använd formatet {namn}."]) {
  const english = i18n.translate(text, "en-US");
  assert.notStrictEqual(english, text, `en-US: ${text}`);
  for (const locale of uiLocales.filter(value => !["sv-SE", "en-US"].includes(value))) {
    const translated = i18n.translate(text, locale);
    assert(translated !== text && translated !== english, `${locale}: ${text}`);
  }
}

// Filename template help, preview and validation use the caller's translation.
const exportSettings = require("../src/engine/export-settings");
const format = (template, values = {}) => `[${Object.entries(values).reduce((result, [name, value]) =>
  result.replaceAll(`{${name}}`, value), template)}]`;
assert.deepStrictEqual(exportSettings.validationMessages("{customer}", format),
  ["[Okända variabler: {customer}.]"]);

console.log("Start page tests passed.");
