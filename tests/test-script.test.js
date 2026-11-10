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

// Screenshots of a step: listed in the order taken, limited per step, removable, carried
// to the bug report from that step and not into a new run.
let shot = script.addScreenshot(tested, run.steps[1].stepId,
  { screenshotId: "shot-a", capturedAt: NOW }, NOW);
shot = script.addScreenshot(shot, run.steps[1].stepId, { screenshotId: "shot-b", capturedAt: NOW });
assert.deepStrictEqual(shot.steps[1].screenshots.map(item => item.screenshotId), ["shot-a", "shot-b"]);
assert.deepStrictEqual(script.screenshotIds(shot), ["shot-a", "shot-b"]);
assert.deepStrictEqual(script.bugReportContent(shot, run.steps[1].stepId).screenshotIds,
  ["shot-a", "shot-b"]);
assert.deepStrictEqual(script.bugReportContent(shot, run.steps[0].stepId).screenshotIds, []);
assert.throws(() => script.addScreenshot(shot, run.steps[1].stepId, { screenshotId: "../x" }), TypeError);
let full = shot;
for (let index = 2; index < script.MAX_SCREENSHOTS_PER_STEP; index += 1) {
  full = script.addScreenshot(full, run.steps[1].stepId, { screenshotId: `shot-${index}` });
}
assert.throws(() => script.addScreenshot(full, run.steps[1].stepId, { screenshotId: "shot-x" }),
  /test\.screenshotLimit/u);
assert.deepStrictEqual(script.removeScreenshot(shot, run.steps[1].stepId, "shot-a")
  .steps[1].screenshots.map(item => item.screenshotId), ["shot-b"]);
assert.deepStrictEqual(script.rerun(shot, { testRunId: "run-4" }).steps[1].screenshots, []);
assert.deepStrictEqual(script.normalize({ ...shot, steps: shot.steps.map(step => ({ ...step,
  screenshots: [{ screenshotId: "bad id" }] })) }).steps[1].screenshots, [], "unknown ids are dropped");

// Changes from two pages on the same run touch only their own fields, and a page cannot
// change the screenshots through an ordinary change.
const fromPanel = script.applyChanges(shot, { steps: [{ stepId: run.steps[0].stepId,
  patch: { comment: "Raden syns." } }] }, NOW);
const fromPage = script.applyChanges(fromPanel, { run: { tester: "Bo" }, steps: [{
  stepId: run.steps[1].stepId, patch: { expected: "Ny text.", screenshots: [] } }] }, NOW);
assert.strictEqual(fromPage.steps[0].comment, "Raden syns.");
assert.strictEqual(fromPage.steps[1].expected, "Ny text.");
assert.strictEqual(fromPage.tester, "Bo");
assert.strictEqual(fromPage.steps[1].screenshots.length, 2);

// The page client shows a change at once, saves it as a change to the field, keeps what is
// waiting when the other page saves, and keeps it after a failed save for a retry.
(async () => {
  const client = require("../src/ui/test-run-client");
  const listeners = [];
  const storage = { onChanged: { addListener: listener => listeners.push(listener) } };
  const sent = [];
  let stored = shot;
  let failNext = false;
  const send = async payload => {
    sent.push(payload);
    if (payload.type === "T9_LOAD_TEST_RUN") return { run: stored };
    if (failNext) { failNext = false; throw new Error("offline"); }
    stored = script.applyChanges(stored, payload.changes);
    return { run: stored };
  };
  const states = [];
  const shown = [];
  const page = client.create({ testRunId: "run-1", send, storage, storageKey: "k", script,
    onSaveState: state => states.push(state), onRun: value => shown.push(value) });
  await page.load();
  page.change({ steps: [{ stepId: run.steps[0].stepId, patch: { comment: "A" } }] });
  page.change({ steps: [{ stepId: run.steps[0].stepId, patch: { comment: "AB" } }] });
  assert.strictEqual(page.run().steps[0].comment, "AB", "shown at once");
  // The panel changes another step meanwhile; what waits here is kept on top of it.
  const elsewhere = script.updateStep(stored, run.steps[1].stepId, { comment: "Från panelen" });
  listeners.forEach(listener => listener({ k: { newValue: elsewhere } }, "local"));
  assert.strictEqual(shown.at(-1).steps[0].comment, "AB");
  assert.strictEqual(shown.at(-1).steps[1].comment, "Från panelen");
  stored = elsewhere;
  await page.flush();
  const update = sent.find(payload => payload.type === "T9_UPDATE_TEST_RUN");
  assert.deepStrictEqual(update.changes, { steps: [{ stepId: run.steps[0].stepId,
    patch: { comment: "AB" } }] }, "only the changed field is sent");
  assert.strictEqual(stored.steps[1].comment, "Från panelen", "the panel's change stays");
  assert.strictEqual(page.state(), "saved");
  failNext = true;
  page.change({ run: { environment: "BC 28" } });
  await assert.rejects(page.flush(), /test\.saveFailed/u);
  assert.strictEqual(page.state(), "failed");
  assert.strictEqual(page.run().environment, "BC 28", "the change stays on the page");
  await page.save();
  assert.strictEqual(page.state(), "saved");
  assert.strictEqual(stored.environment, "BC 28");
  assert.deepStrictEqual(states.slice(0, 3), ["unsaved", "unsaved", "saving"]);
})().catch(error => { console.error(error); process.exit(1); });

// The page, library and background wiring.
const background = read("src/recorder/background.js");
assert.match(background, /importScripts\("document\/test-script\.js"\)/u);
assert.match(background, /if \(step\.status !== "failed"\) throw new Error\("test\.reportOnlyFailed"\)/u);
assert.match(background, /if \(!content\.actualResult\) throw new Error\("test\.describeFailure"\)/u);
assert.match(background, /T9TestScript\.carryOver\(message\.run, previous\)/u);
assert.match(background, /const runs = await listTestRuns\(id\);/u, "a deleted document takes its runs with it");
assert.match(read("src/engine/storage-keys.js"), /TEST_RUN_PREFIX = "t9_test_run_"/u);
assert.match(read("scripts/build.js"),
  /"test-run\.html", "test-run\.js", "test-run-client\.js", "test-panel\.html",\s+"test-panel\.js"/u);
// The panel beside Business Central and the screenshots of a step.
assert.ok(JSON.parse(read("src/ui/manifest.json")).permissions.includes("sidePanel"));
assert.match(read("src/engine/storage-keys.js"), /TEST_SCREENSHOT_PREFIX = "t9_test_shot_"/u);
assert.ok(background.includes("await removeTestScreenshots(`${TEST_SCREENSHOT_PREFIX}${id}:`);"),
  "a deleted document takes its test screenshots with it");
assert.ok(background.includes(
  "const shots = Object.values(await loadTestScreenshots(run, content.screenshotIds));"),
  "a bug report from a step gets the step's screenshots");
assert.ok(background.includes("image = await capture(target.id, { valueRegions: true });"),
  "values are measured so that a report can cover them");
const pageTypes = /PAGE_MESSAGE_TYPES = new Set\(\[[^\]]*\]/u.exec(background)[0];
for (const type of ["T9_UPDATE_TEST_RUN", "T9_FIND_TEST_TAB", "T9_CAPTURE_TEST_SCREENSHOT",
  "T9_LOAD_TEST_SCREENSHOTS", "T9_DELETE_TEST_SCREENSHOT"]) {
  assert.ok(background.includes(`case "${type}"`), type);
  assert.ok(!pageTypes.includes(type), `${type} is taken only from the extension's pages`);
}
// Without access to the tab Edge refuses the capture; the tester is told what to do.
// The tab is then no longer counted as allowed, so the panel and the button say so again.
assert.match(background, /\/activeTab\|<all_urls>\/u\.test\(lastCaptureError\)\) \{\s+await setTestTabAccess\(target\.id, false\)\.catch\(\(\) => \{\}\);\s+throw new Error\("test\.screenshotNeedsAccess"\);/u);
assert.ok(!background.includes("T9_SAVE_TEST_RUN"), "a whole run is never written over from a page");
const panel = read("src/ui/test-panel.html");
const panelScript = read("src/ui/test-panel.js");
for (const id of ["panelTitle", "panelProgress", "saveState", "panelStep", "previousStep",
  "nextStep", "stepJump", "panelMessage", "openFullRun", "closePanel"]) {
  assert.ok(panel.includes(`id="${id}"`), id);
}
for (const file of ["engine/storage-keys.js", "document/test-script.js", "test-run-client.js"]) {
  assert.ok(panel.includes(`<script src="${file}"></script>`), file);
}
assert.ok(panelScript.includes("stepId: step.stepId, tabId: tab?.id"),
  "the panel captures the tab it is shown beside");
assert.match(read("src/ui/dashboard.html"), /document\/test-script\.js/u);
const page = read("src/ui/test-run.html");
for (const id of ["exportRun", "runAgain", "closeRun", "runMessage", "saveState", "runTitle",
  "runSummary", "runTester", "runEnvironment", "processExpected", "runSteps", "earlierRuns"]) {
  assert.ok(page.includes(`id="${id}"`), id);
}
const pageScript = read("src/ui/test-run.js");
assert.match(pageScript, /i18n\.translate\(key, value\.documentLanguage\)/u,
  "the exported file follows the document language");
assert.match(pageScript, /await client\.flush\(\);\s+const result = await send\(\{ type: "T9_CREATE_BUG_REPORT_FROM_TEST_STEP"/u);
assert.ok(page.includes('id="openPanel"'), "the page opens the panel");
// The browser opens a panel only straight from a click, so nothing is awaited before it.
const openPanel = /function openPanel\(\) \{[\s\S]*?chrome\.sidePanel\.open\(\{ windowId: tab\.windowId \}\)/u
  .exec(pageScript)[0];
assert.doesNotMatch(openPanel, /await /u);
// Edge reports a panel opened for a tab that is not shown as opened but shows nothing, so the
// panel is opened for the Business Central tab's window.
assert.doesNotMatch(pageScript, /sidePanel\.(open|setOptions)\(\{ tabId/u);

// The protocol to print and sign reads in the document language and loads what it shows.
const protocol = read("src/ui/test-protocol.html");
const protocolScript = read("src/ui/test-protocol.js");
for (const id of ["printProtocol", "includeScreenshots", "protocolStatus", "protocol"]) {
  assert.ok(protocol.includes(`id="${id}"`), id);
}
assert.match(protocol, /@media print\{[\s\S]*?\.protocol-toolbar\{display:none\}/u,
  "the toolbar is not printed");
assert.match(protocolScript, /i18n\.translate\(key, language\)/u);
assert.ok(protocolScript.includes('type: "T9_LOAD_TEST_SCREENSHOTS"'));
assert.ok(page.includes('id="openProtocol"') && page.includes('id="exportCsv"'));
for (const id of ["runPrerequisites", "testDataRows", "addTestData"]) assert.ok(page.includes(`id="${id}"`), id);
for (const file of ["test-protocol.html", "test-protocol.js"]) {
  assert.ok(read("scripts/build.js").includes(`"${file}"`), file);
}

// The active test is continued from the toolbar popup on a Business Central tab. Choosing the
// toolbar button is what lets Edge capture that tab, so the panel opened from there can take
// screenshots; the panel opens straight from the click. Only the test being worked on is
// offered, and only while it has steps left.
const popup = read("src/ui/popup.html");
const popupScript = read("src/ui/popup.js");
for (const id of ["activeTestCard", "activeTestTitle", "activeTestProgress", "continueTest"]) {
  assert.ok(popup.includes(`id="${id}"`), id);
}
assert.ok(popup.indexOf('id="activeTestCard"') < popup.indexOf('id="startPanel"'),
  "the active test is shown above everything else");
const continueTest = /function continueTest\(testRunId\) \{[\s\S]*?chrome\.sidePanel\.open\(\{ windowId: tab\.windowId \}\)/u
  .exec(popupScript)[0];
assert.doesNotMatch(continueTest, /await /u);
assert.ok(popupScript.includes('send({ type: "T9_GET_ACTIVE_TEST_RUN" }'));
assert.ok(popupScript.includes("!(run.summary?.notRun > 0)"), "a finished test is not offered");
assert.ok(popupScript.includes('send({ type: "T9_TEST_TAB_OPENED", tabId: tab.id }'),
  "opening the popup on the tab counts as access and clears the mark");
for (const file of [pageScript, panelScript]) {
  assert.ok(file.includes('send({ type: "T9_SET_ACTIVE_TEST_RUN", testRunId })'), "the open test is the active one");
}
assert.ok(panel.includes('id="panelAccess"'), "the panel says how to allow screenshots");
assert.ok(panelScript.includes('t(pinned ? "test.accessNotice" : "test.accessNoticeUnpinned")'),
  "an unpinned button is found through the Extensions menu");
for (const type of ["T9_SET_ACTIVE_TEST_RUN", "T9_GET_ACTIVE_TEST_RUN", "T9_MARK_TEST_TAB", "T9_TEST_TAB_OPENED"]) {
  assert.ok(background.includes(`case "${type}"`), type);
  assert.ok(!pageTypes.includes(type), `${type} is taken only from the extension's pages`);
}
// The mark blinks a few times and then stays; it is not set while recording, where the button
// shows REC, and clearing it gives the tab the button's own badge back.
assert.match(background, /if \(\(await getState\(\)\)\.recording\) return false;/u);
assert.ok(background.includes("if (count < 7) testTabMarks.set(tabId, setTimeout(blink, 450));"));
assert.ok(background.includes("await chrome.action.setBadgeText({ tabId, text: null })"));
// The pointer and the session's access list belong to no document, so they are never exported.
const storageKeys = require("../src/engine/storage-keys");
for (const key of [storageKeys.ACTIVE_TEST_RUN_KEY, storageKeys.TEST_ACCESS_TABS_KEY]) {
  assert.ok(!key.startsWith(storageKeys.TEST_RUN_PREFIX) && !key.startsWith(storageKeys.TEST_SCREENSHOT_PREFIX), key);
}

// Every text is in every interface language, with its placeholders.
const ui = vm.createContext({ T9LanguageRegistry: languages });
vm.runInContext(read("src/ui/i18n.js"), ui);
const keys = [...new Set([...pageScript.matchAll(/t\("(test\.[\w.-]+)"/gu), ...page.matchAll(
  /data-i18n="(test\.[\w.-]+)"/gu), ...panelScript.matchAll(/t\("(test\.[\w.-]+)"/gu),
  ...panel.matchAll(/data-i18n="(test\.[\w.-]+)"/gu), ...protocolScript.matchAll(/[td]\("(test\.[\w.-]+)"/gu),
  ...protocol.matchAll(/data-i18n="(test\.[\w.-]+)"/gu)].map(match => match[1]).concat([
  "test.section", "test.screenshots", "test.prerequisites", "test.testData", "test.testedBy",
  "test.approvedBy", "test.signName", "test.signDate", "test.signature",
  "test.screenshotLimit", "test.screenshotFailed", "test.screenshotNeedsAccess", "test.activeTest", "test.continueTest", "test.continueHelp", "test.stepsTested", "test.badgeTitle", "test.accessNotice", "test.accessNoticeUnpinned", "test.noBusinessCentral","test.scriptTitle",
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

// Prerequisites and test data: an expected result names a value as {Name}, matched without
// regard to case; an unknown name is left as written. Empty rows are kept while editing.
let prepared = script.update(tested, { prerequisites: "Kunden 10000 finns.",
  testData: [{ name: "Kund", value: "10000" }, { name: "", value: "" }, { name: "Antal", value: "=5" }] }, NOW);
assert.strictEqual(prepared.prerequisites, "Kunden 10000 finns.");
assert.strictEqual(prepared.testData.length, 3, "an empty row stays while it is edited");
assert.deepStrictEqual(script.filledTestData(prepared.testData).map(item => item.name), ["Kund", "Antal"]);
assert.strictEqual(script.resolveText("Order för {kund} med {Antal} st, {Okänd}", prepared.testData),
  "Order för 10000 med =5 st, {Okänd}");
assert.strictEqual(script.normalize({ ...prepared, testData: Array.from({ length: 40 },
  (item, i) => ({ name: `n${i}`, value: "v" })) }).testData.length, script.MAX_TEST_DATA);
prepared = script.updateStep(prepared, run.steps[0].stepId, { expected: "Raden för {Kund} finns." });
// The next run keeps the prerequisites and the filled test data unless it has its own.
const nextRun = script.carryOver(script.rerun(script.update(prepared, { prerequisites: "", testData: [] }, NOW),
  { testRunId: "run-2", now: NOW }), prepared);
assert.strictEqual(nextRun.prerequisites, "Kunden 10000 finns.");
assert.deepStrictEqual(nextRun.testData.map(item => item.name), ["Kund", "Antal"]);
assert.strictEqual(script.carryOver(script.update(nextRun, { prerequisites: "Egen." }, NOW), prepared)
  .prerequisites, "Egen.");
// The Markdown file shows them and the resolved expected result.
const preparedMarkdown = script.markdown(prepared, key => ui.T9UiI18n.translate(key, "sv-SE"));
assert.match(preparedMarkdown, /## Förutsättningar\n\nKunden 10000 finns\./u);
assert.match(preparedMarkdown, /- Kund: 10000/u);
assert.match(preparedMarkdown, /Raden för 10000 finns\./u);
// The CSV file for Excel: a byte order mark, CRLF, a semicolon outside English, a comma in
// English, quoted cells and a value that would start a formula kept as text.
const csvSv = script.csv(script.updateStep(prepared, run.steps[1].stepId,
  { comment: '=HYPERLINK("x"); "fel"' }), key => ui.T9UiI18n.translate(key, "sv-SE"));
assert.ok(csvSv.startsWith("\uFEFF#;Avsnitt;Steg;"), csvSv.slice(0, 40));
assert.ok(csvSv.endsWith("\r\n") && !/[^\r]\n/u.test(csvSv), "lines end with CRLF");
assert.match(csvSv, /\r\n1;[^;]*;Ange 500 i Antal\.;Raden för 10000 finns\.;Godkänd;/u);
assert.ok(csvSv.includes(`"'=HYPERLINK(""x""); ""fel"""`), "a formula is kept as text and quoted");
const csvEn = script.csv({ ...prepared, documentLanguage: "en-US" }, key => ui.T9UiI18n.translate(key, "en-US"));
assert.ok(csvEn.startsWith("\uFEFF#,Section,Step,"), csvEn.slice(0, 40));

// The library offers the test on documentation, not on bug reports or recordings.
const libraryView = require("../src/ui/document-library-view");
const card = purpose => { const target = { innerHTML: "" };
  libraryView.renderList(target, [{ projectId: "p", title: "T", tags: [], documentLanguage: "sv-SE",
    metadata: { recordingPurpose: purpose }, modifiedAt: NOW }], { locale: "sv-SE" });
  return target.innerHTML; };
assert.match(card("documentation"), /data-library-action="run-test">Kör test</u);
assert.ok(!card("bug-report").includes("run-test"));
console.log("Test script tests passed.");
