// A bug report made from an error dialog that is already on screen: the capture shares the
// dialog observer's work, the report starts without recorded steps and the user writes them.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const canonical = require("../src/engine/canonical-recording");
const languages = require("../src/engine/language-registry");
const model = require("../src/bug-report/bug-report-model");
const service = require("../src/bug-report/bug-report-service");
const generator = require("../src/bug-report/bug-report-generator");
const workspace = require("../src/bug-report/technical-report-workspace");
const view = require("../src/ui/technical-report-workspace-view");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

const NOW = "2026-11-04T08:00:00.000Z";
let recording = canonical.create({ id: "visible-error", startedAt: NOW,
  recordingPurpose: "bug-report", documentLanguage: "en-US" });
recording = canonical.addEvent(recording, { id: "visible-error:dialog", type: "bc-error",
  timestamp: NOW, label: "Business Central error" });
recording = canonical.finish(recording, "2026-11-04T08:00:01.000Z");
const evidence = [{ errorEvidenceId: "visible:1", recordingId: recording.id,
  capturedAt: NOW, rawMessage: "Qty. to Ship (5) cannot be more than 3.",
  canonicalEventId: "visible-error:dialog", diagnosticsStatus: "diagnostics-unavailable" }];

// The open dialog alone is not a step to reproduce.
const report = service.createBugReportFromRecording(recording, [
  { taskId: "dialog", instruction: "", sourceEventIds: ["visible-error:dialog"] }],
{ now: NOW, documentLanguage: "en-US", errorEvidence: evidence });
assert.strictEqual(report.reproduction.steps.length, 0);
// Its suggested title does not claim a recorded process, in every document language.
const titles = {};
for (const { locale } of languages.supported("document")) {
  titles[locale] = service.createBugReportFromRecording(recording, [], { now: NOW,
    documentLanguage: locale, errorEvidence: evidence }).summary.title;
}
assert.strictEqual(titles["en-US"], "Business Central error");
assert.strictEqual(titles["sv-SE"], "Business Central-fel");
assert.strictEqual(titles["de-DE"], "Business Central-Fehler");
assert.strictEqual(new Set(Object.values(titles)).size, Object.keys(titles).length,
  JSON.stringify(titles));
assert.deepStrictEqual(generator.project(report, { errorEvidence: evidence })
  .completeness.issues.filter(issue => issue.level === "required")
  .map(issue => issue.code), ["missing-reproduction"]);

// Steps the user writes are theirs: added after recorded ones, edited and removed directly.
let edited = model.addReproductionStep(report, "  Open sales order 1001  ", NOW);
edited = model.addReproductionStep(edited, "Choose Post", NOW);
assert.deepStrictEqual(edited.reproduction.steps.map(step => [step.reproductionStepId,
  step.origin, step.authorship, step.instruction, step.visibility]), [
  ["manual-step-1", "manual", "human", "Open sales order 1001", "visible"],
  ["manual-step-2", "manual", "human", "Choose Post", "visible"]]);
assert.throws(() => model.addReproductionStep(edited, "   "), TypeError);
edited = model.updateReproductionStep(edited, "manual-step-2", { instruction: "Choose Post..." });
assert.strictEqual(edited.reproduction.steps[1].instruction, "Choose Post...");
assert.strictEqual(edited.reproduction.steps[1].stepOverride, undefined,
  "a written step has no generated text to return to");
assert.throws(() => model.updateReproductionStep(edited, "manual-step-2", { instruction: " " }),
  TypeError);
const removed = model.updateReproductionStep(edited, "manual-step-1", { remove: true });
assert.deepStrictEqual(removed.reproduction.steps.map(step => step.reproductionStepId),
  ["manual-step-2"]);
assert.strictEqual(model.addReproductionStep(removed, "Again").reproduction.steps[1]
  .reproductionStepId, "manual-step-3", "ids are not reused within a report");
assert.ok(generator.project(edited, { errorEvidence: evidence }).completeness.ready);

// Recorded steps cannot be removed, only left out, and keep their generated text.
let recorded = service.createBugReportFromRecording(recording, [
  { taskId: "post", instruction: "Choose **Post**.", sourceEventIds: ["visible-error:dialog"] }],
{ now: NOW, documentLanguage: "en-US", errorEvidence: evidence });
recorded = model.addReproductionStep(recorded, "Then choose OK", NOW);
const derivedId = recorded.reproduction.steps[0].reproductionStepId;
assert.strictEqual(model.updateReproductionStep(recorded, derivedId, { remove: true })
  .reproduction.steps.length, 2);

// Regenerating from the recording keeps the steps the user wrote after the new ones.
const regenerated = service.regenerate(recorded, recording, [
  { taskId: "post-again", instruction: "Choose **Post** again.",
    sourceEventIds: ["visible-error:dialog"] }], { errorEvidence: evidence, updatedAt: NOW });
assert.deepStrictEqual(regenerated.reproduction.steps.map(step => [step.origin || "recorded",
  step.instruction]), [["recorded", "Choose **Post** again."], ["manual", "Then choose OK"]]);

// The workspace adds a step as one undoable edit.
const controller = workspace.create({ report, errorEvidence: evidence,
  store: { save: async value => model.normalize(value) } });
controller.addReproductionStep("Open the order");
assert.strictEqual(controller.state().report.reproduction.steps.length, 1);
controller.undo();
assert.strictEqual(controller.state().report.reproduction.steps.length, 0);

// The view asks for steps when there are none, offers an add row and removes written steps.
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {};
    this.attributes = {}; this.textContent = ""; this.className = ""; this.value = "";
    this.listeners = {}; this.open = false; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  focus() { this.focused = true; }
}
const doc = { createElement: tag => new Element(tag) };
const all = node => [node, ...node.children.flatMap(all)];
const added = [];
const edits = [];
const render = state => {
  const container = new Element("main");
  view.render(container, state, { onEditReproductionStep: (id, patch) => edits.push([id, patch]),
    onAddReproductionStep: value => added.push(value), onSetScreenshotVisibility() {} }, doc);
  return all(container);
};
const empty = render(controller.state());
assert.ok(empty.some(node => node.className === "reproduction-empty" &&
  /No steps were recorded/u.test(node.textContent)));
assert.strictEqual(empty.find(node => node.className === "reproduction-editor").open, true);
const input = empty.find(node => node.id === "technical-report-new-step");
const addButton = empty.find(node => node.dataset.focusKey === "add-step");
input.value = "  Open the order  ";
addButton.listeners.click();
assert.deepStrictEqual(added, ["Open the order"]);
assert.strictEqual(input.value, "");
addButton.listeners.click();
assert.deepStrictEqual(added, ["Open the order"], "an empty step is not added");
input.value = "Choose Post";
let prevented = false;
input.listeners.keydown({ key: "Enter", preventDefault() { prevented = true; } });
assert.ok(prevented);
assert.deepStrictEqual(added, ["Open the order", "Choose Post"]);

controller.addReproductionStep("Open the order");
const withStep = render(controller.state());
assert.ok(!withStep.some(node => node.className === "reproduction-empty"));
const remove = withStep.find(node => node.dataset.focusKey === "step-remove-manual-step-1");
assert.ok(remove && !withStep.some(node => node.dataset.focusKey === "step-reset-manual-step-1"));
remove.listeners.click();
assert.deepStrictEqual(edits.at(-1), ["manual-step-1", { remove: true }]);

// The popup action, the background flow and the content capture are wired together.
const popup = read("src/ui/popup.js");
const popupPage = read("src/ui/popup.html");
const background = read("src/recorder/background.js");
const content = read("src/recorder/content.js");
assert.match(popupPage, /id="reportVisibleError"[^>]*>[\s\S]*data-i18n="recorder\.reportVisibleError"/);
assert.match(popup, /type: "T9_REPORT_VISIBLE_BC_ERROR", tabId: tab\.id/);
assert.match(popup, /\$\("reportVisibleError"\)\.disabled = starting;/);
const handler = background.slice(background.indexOf('case "T9_REPORT_VISIBLE_BC_ERROR"'),
  background.indexOf('case "T9_CREATE_BUG_REPORT"'));
assert.match(handler, /recordingPurpose: "bug-report"/);
assert.match(handler, /chrome\.webNavigation\.getAllFrames/);
assert.match(handler, /if \(!captured\) \{\s+await cancelActiveSession\(\);\s+throw new Error\("recorder\.noVisibleError"\);/);
assert.match(handler, /catch \(error\) \{\s+await cancelActiveSession\(\);\s+throw error;/);
assert.match(content, /message\.type === "T9_CAPTURE_VISIBLE_BC_ERROR"/);
assert.match(content, /if \(current\?\.captured\) return current\.capture;/,
  "a capture the dialog observer already started is counted");
assert.match(content, /stored\?\.sessionId === sessionId \? stored : null/);
// The page's validation banner counts as an error, during a recording and when reporting
// an error already shown; the banner sentence itself is left out of the captured message.
assert.ok(content.includes('surface: banner ? "page-error-banner" : "field-validation-error"'));
assert.match(content, /\.\.\.banners\.map\(observePageError\)/);
assert.match(content, /if \(recording && recordingPurpose === "bug-report"\) \{\s+new Map\(pageErrorBanners\(\)/);
assert.match(content, /\.\.\.lines\.filter\(line => !generic\.has\(line\)\),\s+\.\.\.fieldErrorMessages\(\)/);
// A field's validation message is the accessible name of the error icon it is labelled by,
// as the client renders it (aria-invalid, aria-labelledby "<label> validation_tooltip_N").
assert.match(content, /document\.querySelectorAll\('\[aria-invalid="true"\]'\)/);
assert.match(content, /\["aria-labelledby", "aria-describedby", "aria-errormessage"\]/);
assert.match(content, /const isIcon = element => \/validation\/iu\.test/);
assert.match(content, /const fieldsOnly = !banners\.length && fieldErrorMessages\(\)\.length/);
const manifest = JSON.parse(read("src/ui/manifest.json"));
const captureFiles = JSON.parse(background.match(/const CAPTURE_SCRIPT_FILES = Object\.freeze\((\[[\s\S]*?\])\);/u)[1]);
assert.deepStrictEqual(manifest.content_scripts[0].js, captureFiles,
  "static and dynamic content scripts load the same files");
assert.ok(captureFiles.indexOf("engine/bc-client-captions.js") < captureFiles.indexOf("content.js"));
const captions = require("../src/engine/bc-client-captions");
assert.ok(captions.isPageError(
  "Sidan innehåller ett fel. Uppdatera (F5) för att ångra ändringen eller rätta felet."));
assert.ok(!captions.isPageError("Du kan inte ta bort Artikel 30043 därför att det finns minst " +
  "en Artikeljournalrad som inkluderar den här artikeln."));

// Every interface language has the new texts.
globalThis.T9LanguageRegistry = languages;
globalThis.T9LocaleCatalogs = require("../src/engine/locale-catalogs");
require("../src/ui/i18n");
const keys = ["recorder.reportVisibleError", "recorder.reportVisibleErrorHelp",
  "recorder.capturingVisibleError", "recorder.noVisibleError", "technical.addStep",
  "technical.newStep", "technical.removeStep", "technical.noRecordedSteps"];
for (const { locale } of languages.supported("ui")) {
  for (const key of keys) {
    const value = globalThis.T9UiI18n.translate(key, locale);
    assert.ok(value && value !== key, `${locale} ${key}`);
    if (locale !== "en-US") {
      assert.notStrictEqual(value, globalThis.T9UiI18n.translate(key, "en-US"), `${locale} ${key}`);
    }
  }
}
assert.strictEqual(globalThis.T9UiI18n.translateStaticText("Step", "sv-SE"), "Steg");
console.log("Visible error bug report tests passed.");
