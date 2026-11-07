// A manual test made from a process document: the steps as the document reads, expected
// results written by the user and carried to the next run, a result per step, and a bug
// report from a failed step.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
globalThis.T9TextFormat = require("../src/engine/text-format");
const languages = require("../src/engine/language-registry");
const reviewStudio = require("../src/review/review-studio");
const pipeline = require("../src/exporters/word-export-pipeline");
const script = require("../src/document/test-script");
const canonical = require("../src/engine/canonical-recording");
const model = require("../src/bug-report/bug-report-model");
const service = require("../src/bug-report/bug-report-service");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const NOW = "2026-11-07T08:00:00Z";

// The steps come from the document as it is presented, in the document language, with the
// user's edits; a verification note fills the expected result and nothing else is invented.
const review = reviewStudio.createReview({ id: "order", name: "Skapa order" }, [
  { taskId: "step-1", instruction: "Ange __500__ i **Antal**.", sourceEventNos: [1],
    observedResult: "Business Central bekräftade raden." },
  { taskId: "step-2", instruction: "Välj **Bokför**.", sourceEventNos: [2] }]);
reviewStudio.addNote(review, "step-2", "Ordern finns i Bokförda följesedlar.",
  { noteType: "verification", now: NOW });
const presented = pipeline.createPresentation({ review, documentLanguage: "sv-SE",
  session: { id: "order", name: "Skapa order", startedAt: NOW, settings: {} } });
const run = script.create(presented.presentationDocument, { testRunId: "run-1",
  sessionId: "order", processExpectedResult: "Ordern är bokförd.", now: NOW });
assert.strictEqual(run.title, "Skapa order");
assert.strictEqual(run.documentLanguage, "sv-SE");
assert.deepStrictEqual(run.steps.map(step => [step.number, step.instruction, step.expected,
  step.status]), [[1, "Ange 500 i Antal.", "", "not-run"],
  [2, "Välj Bokför.", "Ordern finns i Bokförda följesedlar.", "not-run"]]);
assert.ok(!JSON.stringify(run).includes("bekräftade raden"),
  "the recording's own observation is not presented as an expected result");
assert.throws(() => script.create({ sections: [] }, { testRunId: "x", sessionId: "y" }), TypeError);

// Results, comments and expected results; unknown statuses are refused.
let tested = script.update(run, { tester: "Anna", environment: "BC 27.1 sandbox" }, NOW);
tested = script.updateStep(tested, run.steps[0].stepId, { status: "passed",
  expected: "Raden visar 500." });
assert.deepStrictEqual(script.summary(tested), { total: 2, passed: 1, failed: 0, skipped: 0,
  notRun: 1, outcome: "in-progress" });
tested = script.updateStep(tested, run.steps[1].stepId, { status: "failed",
  comment: "Bokföringen stoppades: Antal att leverera får inte vara större." });
assert.strictEqual(script.summary(tested).outcome, "failed");
assert.strictEqual(script.summary(script.updateStep(tested, run.steps[1].stepId,
  { status: "skipped" })).outcome, "passed");
assert.throws(() => script.updateStep(tested, run.steps[0].stepId, { status: "ok" }), TypeError);
assert.throws(() => script.updateStep(tested, "missing", { status: "passed" }), TypeError);
// Stored runs keep fields from later versions and refuse an unknown schema.
assert.strictEqual(script.normalize({ ...tested, future: 1 }).future, 1);
assert.throws(() => script.normalize({ ...tested, schemaVersion: 2 }), /Unsupported/u);

// A new run keeps the steps and expected results but nothing tested; a run made from the
// document again takes the expected results written in the latest run.
const again = script.rerun(tested, { testRunId: "run-2", now: "2026-11-08T08:00:00Z" });
assert.deepStrictEqual(again.steps.map(step => [step.status, step.comment, step.expected]),
  [["not-run", "", "Raden visar 500."], ["not-run", "", "Ordern finns i Bokförda följesedlar."]]);
assert.strictEqual(again.environment, "");
const fresh = script.create(presented.presentationDocument, { testRunId: "run-3",
  sessionId: "order", now: NOW });
const carried = script.carryOver(fresh, tested);
assert.strictEqual(carried.steps[0].expected, "Raden visar 500.");
assert.strictEqual(carried.processExpectedResult, "Ordern är bokförd.");
assert.strictEqual(script.carryOver(fresh, { ...tested, sessionId: "other" }).steps[0].expected, "",
  "another document's run is not used");

// A bug report from the failed step: the steps up to it, its expected result and the
// tester's description, as the background builds it.
const content = script.bugReportContent(tested, run.steps[1].stepId);
assert.deepStrictEqual(content.steps, ["Ange 500 i Antal.", "Välj Bokför."]);
assert.strictEqual(content.expectedResult, "Ordern finns i Bokförda följesedlar.");
assert.strictEqual(content.actualResult,
  "Bokföringen stoppades: Antal att leverera får inte vara större.");
assert.deepStrictEqual(content.source, { kind: "test-run", testRunId: "run-1",
  stepId: run.steps[1].stepId, stepNumber: 2 });
let recording = canonical.create({ id: "test-bug", startedAt: NOW, recordingPurpose: "bug-report" });
recording = canonical.finish(recording, NOW);
let report = service.createBugReportFromRecording(recording, [], { documentLanguage: "sv-SE",
  title: content.title, now: NOW });
content.steps.forEach(step => { report = model.addReproductionStep(report, step, NOW); });
report = model.updateHumanContent({ ...report, source: content.source }, {
  expectedResult: content.expectedResult, actualResult: content.actualResult }, NOW);
assert.deepStrictEqual(report.reproduction.steps.map(step => [step.instruction, step.authorship]),
  [["Ange 500 i Antal.", "human"], ["Välj Bokför.", "human"]]);
assert.strictEqual(report.expectedResult.text, content.expectedResult);
assert.strictEqual(report.actualResult.human.text, content.actualResult);
assert.deepStrictEqual(report.source, content.source);
assert.strictEqual(report.summary.title, "Skapa order");

// The page, library and background wiring.
const background = read("src/recorder/background.js");
assert.match(background, /importScripts\("document\/test-script\.js"\)/u);
assert.match(background, /if \(step\.status !== "failed"\) throw new Error\("test\.reportOnlyFailed"\)/u);
assert.match(background, /if \(!content\.actualResult\) throw new Error\("test\.describeFailure"\)/u);
assert.match(background, /T9TestScript\.carryOver\(message\.run, previous\)/u);
assert.match(background, /const runs = await listTestRuns\(id\);/u, "a deleted document takes its runs with it");
assert.match(read("src/engine/storage-keys.js"), /TEST_RUN_PREFIX = "t9_test_run_"/u);
assert.match(read("scripts/build.js"), /"test-run\.html", "test-run\.js"/u);
assert.match(read("src/ui/dashboard.html"), /document\/test-script\.js/u);
const page = read("src/ui/test-run.html");
for (const id of ["exportRun", "runAgain", "closeRun", "runMessage", "saveState", "runTitle",
  "runSummary", "runTester", "runEnvironment", "processExpected", "runSteps", "earlierRuns"]) {
  assert.ok(page.includes(`id="${id}"`), id);
}
const pageScript = read("src/ui/test-run.js");
assert.match(pageScript, /i18n\.translate\(key, run\.documentLanguage\)/u,
  "the exported file follows the document language");
assert.match(pageScript, /await flush\(\);\s+const result = await send\(\{ type: "T9_CREATE_BUG_REPORT_FROM_TEST_STEP"/u);

// Every text is in every interface language, with its placeholders.
const ui = vm.createContext({ T9LanguageRegistry: languages });
vm.runInContext(read("src/ui/i18n.js"), ui);
const keys = [...new Set([...pageScript.matchAll(/t\("(test\.[\w.-]+)"/gu), ...page.matchAll(
  /data-i18n="(test\.[\w.-]+)"/gu)].map(match => match[1]).concat(["test.scriptTitle",
  "test.updated", "test.step", "test.result", "test.noSteps", "test.runNotFound",
  "test.describeFailure", "test.reportOnlyFailed", "test.creatingRun", "test.saveFailed",
  ...["passed", "failed", "in-progress"].map(value => `test.outcome.${value}`),
  ...script.STATUSES.map(value => `test.status.${value}`)]))].filter(key => !key.endsWith("."));
assert.ok(keys.length > 30);
for (const { locale } of languages.supported("ui")) {
  for (const key of keys) {
    const value = ui.T9UiI18n.translate(key, locale);
    assert.notStrictEqual(value, key, `${locale} ${key}`);
    for (const placeholder of ui.T9UiI18n.translate(key, "en-US").match(/\{\w+\}/gu) || []) {
      assert.ok(value.includes(placeholder), `${locale} ${key} ${placeholder}`);
    }
  }
  const menu = languages.translate("Run test", locale, locale === "sv-SE" ? "Kör test" : "Run test");
  if (!["en-US"].includes(locale)) assert.notStrictEqual(menu, "Run test", locale);
}
// The exported file reads in the document language.
const label = key => ui.T9UiI18n.translate(key, "de-DE");
const exported = script.markdown(tested, label);
assert.match(exported, /^# Testskript: Skapa order/u);
assert.match(exported, /\| 2 \| Välj Bokför\. \| Ordern finns i Bokförda följesedlar\. \| Nicht bestanden \| Bokföringen stoppades/u);
assert.match(exported, /1 bestanden, 1 nicht bestanden, 0 übersprungen, 0 nicht ausgeführt/u);

// The library offers the test on documentation, not on bug reports or recordings.
const libraryView = require("../src/ui/document-library-view");
const card = purpose => { const target = { innerHTML: "" };
  libraryView.renderList(target, [{ projectId: "p", title: "T", tags: [], documentLanguage: "sv-SE",
    metadata: { recordingPurpose: purpose }, modifiedAt: NOW }], { locale: "sv-SE" });
  return target.innerHTML; };
assert.match(card("documentation"), /data-library-action="run-test">Kör test</u);
assert.ok(!card("bug-report").includes("run-test"));
console.log("Test script tests passed.");
