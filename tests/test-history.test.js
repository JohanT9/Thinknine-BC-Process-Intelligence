// How a process has been tested over time (src/document/test-history.js): the latest result of
// each document, its runs newest first and what changed since the run before.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const history = require("../src/document/test-history");

const step = (stepId, status, extra = {}) => ({ stepId, number: Number(stepId.slice(1)),
  instruction: `Steg ${stepId}`, status, ...extra });
const run = (testRunId, createdAt, steps, extra = {}) => ({ testRunId, sessionId: "s1",
  title: "Inköpsorder", createdAt, updatedAt: createdAt, tester: "Anna", environment: "UAT",
  steps, ...extra });

// Three runs of one document and one of another. The newest run of s1 failed in two steps.
const first = run("r1", "2026-09-02T10:00:00.000Z", [step("s1", "passed"), step("s2", "passed"),
  step("s3", "passed"), step("s4", "passed")]);
const second = run("r2", "2026-10-03T10:00:00.000Z", [step("s1", "passed"), step("s2", "failed"),
  step("s3", "not-run"), step("s4", "failed")]);
const third = run("r3", "2026-11-12T10:00:00.000Z", [step("s1", "failed", { bugReportId: "br-12" }),
  step("s2", "failed"), step("s3", "failed"), step("s4", "passed"),
  step("s9", "failed", { signature: { action: "Release", page: "50" } })], { suiteId: "suite-1" });
const other = run("o1", "2026-11-01T10:00:00.000Z", [step("s1", "passed", { resultSource: "recording" }),
  step("s2", "passed")], { sessionId: "s2" });
const runs = [second, other, first, third];

// Newest first, each compared with the run before it; the oldest has nothing to compare with.
const entries = history.history(runs, "s1");
assert.deepStrictEqual(entries.map(entry => entry.testRunId), ["r3", "r2", "r1"]);
assert.strictEqual(entries[2].comparison, null, "the first run has no previous run");
const latestChange = entries[0].comparison;
assert.deepStrictEqual(latestChange.newFailures.map(item => item.stepId), ["s1"],
  "a step that passed last time and fails now is a new failure");
assert.deepStrictEqual(latestChange.failedAgain.map(item => item.stepId), ["s2"]);
assert.deepStrictEqual(latestChange.failedUntested.map(item => item.stepId), ["s3"],
  "a step without a result last time is not called a new failure");
assert.deepStrictEqual(latestChange.failedNewSteps.map(item => item.stepId), ["s9"],
  "a step that was not in the previous run is new, not a new failure");
assert.deepStrictEqual(latestChange.fixed.map(item => item.stepId), ["s4"]);
assert.strictEqual(latestChange.addedSteps, 1);
assert.strictEqual(latestChange.removedSteps, 0);
assert.strictEqual(latestChange.newFailures[0].bugReportId, "br-12", "linked bug reports are kept");
assert.strictEqual(entries[0].suiteId, "suite-1");
assert.deepStrictEqual(entries[0].counts, { total: 5, passed: 1, failed: 4, skipped: 0, notRun: 0,
  byRecording: 0, outcome: "failed" });

// Steps are paired by their id, or else by what they do; never by their position. A test made
// again from a changed document has new ids: the same action on the same page is the same step.
const moved = history.compare(
  run("m2", "2026-11-13T10:00:00.000Z", [step("x9", "failed", { signature: { action: "Post" } }),
    step("x1", "passed", { signature: { action: "New" } })]),
  run("m1", "2026-11-12T10:00:00.000Z", [step("y1", "failed", { signature: { action: "New" } }),
    step("y2", "passed", { signature: { action: "Post" } })]));
assert.deepStrictEqual(moved.newFailures.map(item => item.stepId), ["x9"]);
assert.deepStrictEqual(moved.fixed.map(item => item.stepId), ["x1"]);
// A step left out of the newer run is removed, never counted as a failure.
const removed = history.compare(run("n2", "b", [step("s1", "passed")]),
  run("n1", "a", [step("s1", "passed"), step("s2", "failed")]));
assert.strictEqual(removed.removedSteps, 1);
assert.strictEqual(removed.failedAgain.length + removed.newFailures.length, 0);

// The latest result of each document. A run with steps left untested is in progress; a run is
// passed only when every step has a result and none failed.
const latest = history.latest(runs);
assert.deepStrictEqual([...latest.keys()].sort(), ["s1", "s2"]);
assert.strictEqual(latest.get("s1").testRunId, "r3");
assert.strictEqual(latest.get("s1").state, "failed");
assert.strictEqual(latest.get("s1").runCount, 3);
assert.strictEqual(history.latest([run("p1", "a", [step("s1", "passed"), step("s2", "not-run")])])
  .get("s1").state, "in-progress");
assert.strictEqual(history.latest([run("q1", "a", [])]).get("s1").state, "in-progress",
  "a run without steps is never passed");
// A passed run whose steps the recording passed says so, so that it never looks more
// verified than it is.
assert.strictEqual(history.stateKey(latest.get("s2")), "testHistory.state.passedPartlyByRecording");
assert.strictEqual(history.stateKey(history.latest([run("t1", "a", [step("s1", "passed",
  { resultSource: "recording" })])]).get("s1")), "testHistory.state.passedByRecording");
assert.strictEqual(history.stateKey(latest.get("s1")), "testHistory.state.failed");
assert.strictEqual(history.stateKey({ state: "passed", counts: { total: 2, byRecording: 0 } }),
  "testHistory.state.passed");

// The stored runs are not changed.
assert.strictEqual(third.steps.length, 5);
assert.ok(!("comparison" in third));

// The overview: per tested document its latest run, the version of the suite it was run in,
// and its last runs oldest first.
const suiteRun = run("r4", "2026-11-13T10:00:00.000Z", [step("s1", "passed")],
  { sessionId: "s3", suiteId: "suite-27", environment: "UAT", tester: "Erik" });
const many = Array.from({ length: 7 }, (_, index) => run(`m${index}`,
  `2026-0${index + 1}-01T10:00:00.000Z`, [step("s1", index % 2 ? "failed" : "passed")], { sessionId: "s4" }));
const tested = history.summaries([first, second, third, suiteRun, ...many],
  [{ suiteId: "suite-27", version: "27.1" }]);
const bySession = Object.fromEntries(tested.map(value => [value.sessionId, value]));
assert.deepStrictEqual([bySession.s1.testRunId, bySession.s1.state, bySession.s1.runCount],
  ["r3", "failed", 3]);
assert.deepStrictEqual(bySession.s1.trend.map(value => value.testRunId), ["r1", "r2", "r3"],
  "the trend is oldest first");
assert.deepStrictEqual([bySession.s3.version, bySession.s3.tester], ["27.1", "Erik"]);
assert.strictEqual(bySession.s1.version, "", "a run outside a suite has no version");
assert.deepStrictEqual(bySession.s4.trend.map(value => value.testRunId), ["m2", "m3", "m4", "m5", "m6"],
  "the trend shows the last five runs");

// One row per document, tested or not. Failures come first; a test not run again for
// longer than the limit is stale, and a document never tested is "never", not stale.
const documents = [{ projectId: "s3", title: "Bokför" }, { projectId: "s9", title: "Aldrig" },
  { projectId: "s1", title: "Inköpsorder" }, { projectId: "s4", title: "Gammal" }];
const rows = history.overviewRows(documents, tested, { now: "2026-11-15T10:00:00.000Z", staleDays: 90 });
assert.deepStrictEqual(rows.map(row => [row.sessionId, row.state, row.stale]),
  [["s1", "failed", false], ["s9", "never", false], ["s3", "passed", false], ["s4", "passed", true]]);
assert.deepStrictEqual(history.overviewCounts(rows),
  { all: 4, failed: 1, "in-progress": 0, passed: 2, never: 1, stale: 1 });
assert.deepStrictEqual(history.overviewFilter(rows, { filter: "stale" }).map(row => row.sessionId), ["s4"]);
assert.deepStrictEqual(history.overviewFilter(rows, { query: "  INKÖP " }).map(row => row.sessionId), ["s1"]);
assert.deepStrictEqual(history.overviewFilter(rows, { filter: "nonsense" }).length, 4,
  "an unknown filter shows everything");

// The CSV: headings and results in the language given, values quoted where needed and
// formulas kept as text.
const label = key => `<${key}>`;
const csv = history.overviewCsv([...rows, { sessionId: "x", title: '=HYPERLINK("a";b)', state: "never",
  summary: null }], { t: label, separator: ";", formatDate: value => value.slice(0, 10) });
const lines = csv.trimEnd().split("\r\n");
assert.strictEqual(lines[0], ["process", "result", "date", "environment", "version", "tester", "runs",
  "failedSteps", "steps"].map(key => `<testOverview.csv.${key}>`).join(";"));
assert.strictEqual(lines[1], "Inköpsorder;<testHistory.state.failed>;2026-11-12;UAT;;Anna;3;4;5");
assert.strictEqual(lines[2], "Aldrig;<testHistory.notTested>;;;;;;;");
assert.strictEqual(lines[5], `"'=HYPERLINK(""a"";b)";<testHistory.notTested>;;;;;;;`);
assert.ok(csv.endsWith("\r\n"));
// The filters pick runs: by environment, by the version of the suite a run was made in, by
// suite and by period. Each process then shows its latest run among them, so in UAT a
// document whose newest run was in production shows how it went in UAT.
const scoped = [run("e1", "2026-11-10T10:00:00.000Z", [step("s1", "failed")], { environment: " UAT " }),
  run("e2", "2026-11-14T10:00:00.000Z", [step("s1", "passed")], { environment: "PROD", suiteId: "su2" }),
  run("e3", "2026-06-01T10:00:00.000Z", [step("s1", "passed")], { environment: "UAT", suiteId: "su1" }),
  run("e4", "2026-11-12T10:00:00.000Z", [step("s1", "passed")], { sessionId: "s7", environment: "" })];
const scopeSuites = [{ suiteId: "su1", title: "Uppgradering", version: "26.5", createdAt: "2026-06-01" },
  { suiteId: "su2", title: "Uppgradering", version: "27.1", createdAt: "2026-11-14" },
  { suiteId: "unused", version: "99", createdAt: "2026-11-15" }];
const NOW = "2026-11-15T10:00:00.000Z";
const ids = scope => history.scopeRuns(scoped, scopeSuites, { now: NOW, ...scope }).map(value => value.testRunId);
assert.deepStrictEqual(ids({}), ["e1", "e2", "e3", "e4"]);
assert.deepStrictEqual(ids({ environment: "UAT" }), ["e1", "e3"], "an environment is matched without its spaces");
assert.deepStrictEqual(ids({ version: "27.1" }), ["e2"], "a version is the version of the run's suite");
assert.deepStrictEqual(ids({ suiteId: "su1" }), ["e3"]);
assert.deepStrictEqual(ids({ periodDays: "30" }), ["e1", "e2", "e4"]);
assert.deepStrictEqual(ids({ periodDays: "13" }), ["e1", "e2", "e3", "e4"], "an unknown period keeps every run");
assert.deepStrictEqual(ids({ environment: "UAT", periodDays: 30 }), ["e1"]);
const inUat = history.summaries(history.scopeRuns(scoped, scopeSuites, { environment: "UAT", now: NOW }), scopeSuites);
assert.strictEqual(inUat.find(value => value.sessionId === "s1").testRunId, "e1",
  "in UAT the process shows its latest UAT run, not its newer run in production");
const choices = history.scopeOptions(scoped, scopeSuites);
assert.deepStrictEqual(choices.environments, ["PROD", "UAT"]);
assert.deepStrictEqual(choices.versions, ["26.5", "27.1"], "only versions of suites with runs are offered");
assert.deepStrictEqual(choices.suites.map(suite => suite.suiteId), ["su2", "su1"], "suites newest first");
assert.strictEqual(history.activeScope({ environment: "UAT", version: "", periodDays: "30" }), 2);
const scopeKeys = ["scopeLabel", "scopeHelp", "environment", "version", "period", "suite", "allEnvironments",
  "allVersions", "allPeriods", "allSuites", "periodDays", "scoped"].map(key => `testOverview.${key}`);
for (const id of ["testsOverviewEnvironment", "testsOverviewVersion", "testsOverviewPeriod", "testsOverviewSuite"]) {
  assert.ok(fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.html"), "utf8").includes(`id="${id}"`), id);
}

const csvKeys = ["process", "result", "date", "environment", "version", "tester", "runs", "failedSteps", "steps"]
  .map(key => `testOverview.csv.${key}`);
const overviewKeys = [...history.FILTERS.map(filter => `testOverview.filter.${filter}`), ...csvKeys,
  ...history.STATES.map(state => `testHistory.state.${state}`), ...scopeKeys];

// Every text the history shows exists in every registered language.
require("../src/engine/locale-catalogs");
require("../src/engine/language-registry");
require("../src/ui/i18n");
const i18n = globalThis.T9UiI18n;
const registry = require("../src/engine/language-registry");
const locales = registry.languages.filter(language => language.ui !== false).map(language => language.locale);
const view = fs.readFileSync(path.join(__dirname, "../src/ui/test-history-view.js"), "utf8");
const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.js"), "utf8");
const model = fs.readFileSync(path.join(__dirname, "../src/document/test-history.js"), "utf8");
const dashboardPage = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.html"), "utf8");
const keys = new Set([...`${view}\n${dashboard}\n${model}\n${dashboardPage}`.matchAll(/"((?:testHistory|testOverview)\.[A-Za-z.-]+)"/gu)]
  .map(match => match[1]).filter(key => !key.endsWith(".")));
for (const state of history.STATES) keys.add(`testHistory.state.${state}`);
for (const key of overviewKeys) keys.add(key);
assert.ok(keys.size > 25, "the history's texts are found");
for (const locale of locales) {
  for (const key of keys) {
    const value = i18n.translate(key, locale);
    assert.ok(value && value !== key, `${key} in ${locale}`);
  }
}
// The step's own words are kept as they were written; only the sentence around them changes.
for (const locale of locales) {
  const sentence = i18n.format("testHistory.newFailure", { n: 4, step: "Bokför ordern" }, locale);
  assert.ok(sentence.includes("Bokför ordern") && sentence.includes("4"), `${locale}: ${sentence}`);
}

// The pages load the history and the build copies its view.
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
assert.ok(read("src/recorder/background.js").includes('importScripts("document/test-history.js");'));
for (const page of ["src/ui/dashboard.html", "src/ui/test-run.html"]) {
  assert.ok(read(page).includes('<script src="document/test-history.js"></script>'), page);
  assert.ok(read(page).includes('<script src="test-history-view.js"></script>'), page);
}
assert.ok(read("scripts/build.js").includes('"test-history-view.js"'));
// The review shows the open document's tests in its header, closed until it is opened, with
// the same timeline as the library and a way to run or continue the test.
const reviewHeader = dashboardPage.slice(dashboardPage.indexOf('<header id="reviewHeader"'),
  dashboardPage.indexOf('id="workspaceTabs"'));
for (const id of ["reviewTests", "reviewTestsMarker", "reviewTestsList", "reviewTestsRun", "reviewTestsRetry"]) {
  assert.ok(reviewHeader.includes(`id="${id}"`), `review header has ${id}`);
}
assert.ok(/<details id="reviewTests"[^>]*\shidden/u.test(reviewHeader), "the section starts hidden");
assert.ok(reviewHeader.includes('data-i18n="testHistory.section"'));
assert.ok(dashboard.includes("void loadReviewTests();") && dashboard.includes("closeReviewTests();"),
  "the review loads the tests when a document opens and forgets them when it closes");
// The overview is its own view beside Documents and Settings, counted by the background.
assert.ok(read("src/recorder/background.js").includes('case "T9_TEST_OVERVIEW"'));
assert.ok(dashboardPage.includes('data-home-view="tests"') && dashboardPage.includes('id="testsView"'));
for (const filter of history.FILTERS) assert.ok(dashboardPage.includes(`data-tests-filter="${filter}"`), filter);
assert.ok(dashboard.includes('$("testsView").hidden = view !== "tests";'));
console.log("Test history tests passed.");
