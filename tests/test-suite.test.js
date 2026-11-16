// Test suites: the tests of several documents run together, with the environment and version
// tested. The suite refers to its runs and counts its progress from them; it never sets a
// result.
const assert = require("assert");
const fs = require("fs");
const suites = require("../src/document/test-suite");
const script = require("../src/document/test-script");

const NOW = "2026-11-10T10:00:00.000Z";
const items = [{ sessionId: "doc-a", title: "Inköpsorder", testRunId: "run-a" },
  { sessionId: "doc-b", title: "Försäljningsorder", testRunId: "run-b" },
  { sessionId: "doc-c", title: "Lagerflytt", testRunId: "run-c" },
  { sessionId: "doc-a", title: "Inköpsorder igen", testRunId: "run-x" }];
const suite = suites.create({ suiteId: "suite-1", title: " Regression BC 28 ", environment: "Sandbox",
  version: "BC 28", items, now: NOW });
assert.strictEqual(suite.title, "Regression BC 28");
assert.deepStrictEqual(suite.items.map(item => item.sessionId), ["doc-a", "doc-b", "doc-c"],
  "a document is in a suite once, in the order chosen");
assert.throws(() => suites.create({ suiteId: "empty", items: [] }), /at least one test/u);
assert.throws(() => suites.normalize({ suiteId: "s", schemaVersion: 2 }), /Unsupported test suite schema/u);
assert.throws(() => suites.normalize({ items }), /own id/u);
// Unknown fields are kept.
assert.strictEqual(suites.normalize({ ...suite, future: { a: 1 } }).future.a, 1);

// Progress from the runs' step results; a run whose document was deleted is missing.
const summary = (passed, failed, skipped, notRun) => ({ total: passed + failed + skipped + notRun,
  passed, failed, skipped, notRun });
let progress = suites.progress(suite, {});
assert.deepStrictEqual(progress.items.map(item => item.status), ["missing", "missing", "missing"]);
progress = suites.progress(suite, { "run-a": summary(0, 0, 0, 5), "run-b": summary(0, 0, 0, 3),
  "run-c": summary(0, 0, 0, 4) });
assert.strictEqual(progress.outcome, "not-started");
assert.strictEqual(progress.done, 0);
progress = suites.progress(suite, { "run-a": summary(4, 0, 1, 0), "run-b": summary(1, 1, 0, 1),
  "run-c": summary(2, 0, 0, 2) });
assert.deepStrictEqual(progress.items.map(item => item.status), ["passed", "failed", "in-progress"]);
assert.deepStrictEqual([progress.done, progress.failed, progress.total, progress.outcome], [1, 1, 3, "failed"]);
progress = suites.progress(suite, { "run-a": summary(5, 0, 0, 0), "run-b": summary(3, 0, 0, 0) });
assert.deepStrictEqual([progress.done, progress.total, progress.missing, progress.outcome], [2, 2, 1, "passed"],
  "a suite whose remaining tests all passed has passed");
progress = suites.progress(suite, { "run-a": summary(5, 0, 0, 0), "run-b": summary(0, 0, 0, 3),
  "run-c": summary(0, 0, 0, 3) });
assert.strictEqual(progress.outcome, "in-progress");

// Editing the suite and removing a test.
const edited = suites.update(suite, { title: "Regression", version: "BC 28.1", removeSessionId: "doc-b",
  suiteId: "ignored" }, "2026-11-11T10:00:00.000Z");
assert.deepStrictEqual([edited.suiteId, edited.title, edited.version, edited.environment, edited.updatedAt],
  ["suite-1", "Regression", "BC 28.1", "Sandbox", "2026-11-11T10:00:00.000Z"]);
assert.deepStrictEqual(edited.items.map(item => item.sessionId), ["doc-a", "doc-c"]);

// The owner: the document the suite is exported and synchronized with.
assert.strictEqual(suite.ownerSessionId, "doc-a", "a new suite is owned by its first document");
assert.strictEqual(suites.normalize({ suiteId: "s", items }).ownerSessionId, "doc-a",
  "a suite saved without an owner gets its first document");
assert.strictEqual(suites.normalize({ ...suite, ownerSessionId: "doc-c" }).ownerSessionId, "doc-c");
assert.strictEqual(suites.update(suite, { removeSessionId: "doc-a" }).ownerSessionId, "doc-b",
  "removing the owner's test moves the suite to the next document");
// When the owner document is deleted the next document still there takes over.
const moved = suites.withoutOwner(suite, id => id !== "doc-b");
assert.deepStrictEqual([moved.ownerSessionId, moved.items.length], ["doc-c", 3],
  "the deleted document's test stays in the suite, shown as missing");
assert.strictEqual(suites.withoutOwner(suite, () => false), null, "no document left: the suite goes");
assert.strictEqual(suites.withoutOwner(suites.create({ suiteId: "one", items: [items[0]] })), null);

// The next round: the same documents with new runs, naming the previous suite; a test whose
// run is gone is left out. The environment and version are filled in for the new round.
const round = suites.nextRound(suite, { "doc-a": "run-a2", "doc-c": "run-c2" }, { suiteId: "suite-2", now: NOW });
assert.deepStrictEqual([round.suiteId, round.previousSuiteId, round.title, round.environment, round.version],
  ["suite-2", "suite-1", "Regression BC 28", "", ""]);
assert.deepStrictEqual(round.items.map(item => [item.sessionId, item.testRunId]),
  [["doc-a", "run-a2"], ["doc-c", "run-c2"]]);

// A round compared with the round before it: tests are paired by document, never by position,
// and a test is compared once it has a result in this round; a test new in the suite is
// said to be new at once. A test without a full result last
// round is said to be so, never counted as fixed or as a new failure.
const status = (sessionId, value, testRunId = `${sessionId}-run`) => ({ sessionId, status: value, testRunId });
const before = { items: [status("a", "passed", "a1"), status("b", "failed"), status("c", "passed"),
  status("d", "failed"), status("e", "in-progress"), status("f", "not-started"), status("g", "passed")] };
const now = { items: [status("g", "missing"), status("f", "passed"), status("e", "failed"),
  status("d", "failed"), status("c", "passed"), status("b", "passed"), status("a", "failed", "a2"),
  status("h", "failed"), status("i", "in-progress")] };
const compared = suites.compareRounds(now, before, { a2: { newFailures: [{ number: 4 }, { number: 7 }] } });
assert.deepStrictEqual(Object.fromEntries(compared.items.map(item => [item.sessionId, item.change])),
  { g: null, f: "passed-untested", e: "failed-untested", d: "still-failed", c: "still-passed",
    b: "fixed", a: "new-failure", h: "new", i: "new" });
assert.deepStrictEqual(compared.items.find(item => item.sessionId === "a").newFailureSteps, [4, 7]);
assert.strictEqual(compared.items.find(item => item.sessionId === "a").previousTestRunId, "a1");
assert.deepStrictEqual(compared.counts, { newFailure: 1, fixed: 1, unchanged: 2, untested: 2, new: 2 });
assert.strictEqual(suites.compareRounds(now, null), null, "a suite without a previous round is not compared");
assert.ok(compared.items.every(item => item.change === null || suites.CHANGES.includes(item.change)));

// A run of a suite names it; a new run belongs to a suite only when made for one, and the
// environment can be given.
const run = script.normalize({ testRunId: "run-a", sessionId: "doc-a", suiteId: "suite-1",
  environment: "Sandbox, BC 28", steps: [{ stepId: "s1", instruction: "Välj Ny.", status: "passed" }] });
assert.strictEqual(run.suiteId, "suite-1");
assert.strictEqual(script.rerun(run, { testRunId: "run-2" }).suiteId, undefined);
const again = script.rerun(run, { testRunId: "run-3", suiteId: "suite-2", environment: "" });
assert.deepStrictEqual([again.suiteId, again.environment, again.steps[0].status], ["suite-2", "", "not-run"]);
// A new round is offered once the round has a result, not for a round nothing was run in.
assert.strictEqual(suites.hasResults({ passed: 0, failed: 0, inProgress: 0, notStarted: 2 }), false);
assert.strictEqual(suites.hasResults({ passed: 0, failed: 0, inProgress: 1, notStarted: 1 }), true);
assert.strictEqual(suites.hasResults({ passed: 1, failed: 0, inProgress: 0 }), true);
// Processes are added at the end; one already in the suite is not added again, and the suite
// never grows past its limit.
const growing = suites.create({ suiteId: "grow", items: [{ sessionId: "s1", testRunId: "r1" }] });
const grown = suites.addItems(growing, [{ sessionId: "s2", testRunId: "r2" }, { sessionId: "s1", testRunId: "rX" },
  { sessionId: "", testRunId: "r0" }], "2026-11-16T11:00:00.000Z");
assert.deepStrictEqual(grown.suite.items.map(item => [item.sessionId, item.testRunId]), [["s1", "r1"], ["s2", "r2"]]);
assert.deepStrictEqual([grown.added.length, grown.already.map(item => item.sessionId), grown.suite.updatedAt],
  [1, ["s1"], "2026-11-16T11:00:00.000Z"]);
const fullSuite = suites.create({ suiteId: "full", items: Array.from({ length: suites.MAX_ITEMS },
  (_, index) => ({ sessionId: `f${index}`, testRunId: `fr${index}` })) });
assert.deepStrictEqual(suites.addItems(fullSuite, [{ sessionId: "extra", testRunId: "x" }]).full.map(item => item.sessionId),
  ["extra"]);
const unchanged = suites.addItems(growing, [{ sessionId: "s1", testRunId: "again" }]);
assert.strictEqual(unchanged.suite.updatedAt, growing.updatedAt, "nothing added changes nothing");
// Archiving keeps the suite, out of the way; restoring brings it back.
const archivedSuite = suites.update(suites.create({ suiteId: "ar", items: [{ sessionId: "x", testRunId: "rx" }] }),
  { archived: true }, "2026-11-16T10:00:00.000Z");
assert.deepStrictEqual([archivedSuite.archived, archivedSuite.archivedAt], [true, "2026-11-16T10:00:00.000Z"]);
const restoredSuite = suites.update(archivedSuite, { archived: false });
assert.deepStrictEqual([restoredSuite.archived, restoredSuite.archivedAt], [false, null]);
assert.strictEqual(suites.normalize({ suiteId: "old" }).archived, false, "a suite saved before archiving is not archived");
assert.strictEqual(suites.nextRound(archivedSuite, { x: "ry" }, { suiteId: "ar2" }).archived, false,
  "a new round starts out of the archive");
// Rounds are counted along the previous rounds that still exist.
assert.deepStrictEqual(suites.roundNumbers([{ suiteId: "r3", previousSuiteId: "r2" }, { suiteId: "r1" },
  { suiteId: "r2", previousSuiteId: "r1" }, { suiteId: "lone", previousSuiteId: "deleted" }]),
{ r3: 3, r1: 1, r2: 2, lone: 1 });
// The list: in progress until every test is run, then done; archived apart; All is every suite
// not archived; the search finds name, environment and version.
const listed = [
  { suiteId: "a", title: "Uppgradering", environment: "UAT", version: "27.1", progress: { total: 3, done: 1 } },
  { suiteId: "b", title: "Månadstest", environment: "PROD", version: "27.0", progress: { total: 2, done: 2 } },
  { suiteId: "c", title: "Gammal", environment: "UAT", version: "26.5", archived: true, progress: { total: 2, done: 2 } },
  { suiteId: "d", title: "Tom", environment: "", version: "", progress: { total: 0, done: 0 } }];
assert.deepStrictEqual(listed.map(suites.listState), ["in-progress", "done", "archived", "in-progress"]);
assert.deepStrictEqual(suites.listCounts(listed), { "in-progress": 2, done: 1, archived: 1, all: 3 });
assert.deepStrictEqual(suites.listFilter(listed, { filter: "all" }).map(entry => entry.suiteId), ["a", "b", "d"]);
assert.deepStrictEqual(suites.listFilter(listed, { filter: "archived" }).map(entry => entry.suiteId), ["c"]);
assert.deepStrictEqual(suites.listFilter(listed, { filter: "all", query: " uat " }).map(entry => entry.suiteId), ["a"]);
assert.deepStrictEqual(suites.listFilter(listed, { filter: "done", query: "27.0" }).map(entry => entry.suiteId), ["b"]);
// A name from what is tested.
assert.strictEqual(suites.suggestedTitle({ environment: " UAT ", version: "BC 27.1" }), "UAT – BC 27.1");
assert.strictEqual(suites.suggestedTitle({ version: "28" }), "28");
assert.strictEqual(suites.suggestedTitle({}), "");
// A cancelled test will not be run in this round: it is shown as cancelled and left out of the total.
{
  const suite = suites.create({ suiteId: "cx", items: [{ sessionId: "a", testRunId: "ra" }, { sessionId: "b", testRunId: "rb" }] });
  const result = suites.progress(suite, { ra: { total: 2, passed: 2, failed: 0, skipped: 0, notRun: 0, outcome: "passed" },
    rb: { total: 2, passed: 1, failed: 0, skipped: 0, notRun: 1, outcome: "cancelled" } });
  assert.strictEqual(result.items[1].status, "cancelled");
  assert.strictEqual(result.cancelled, 1);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.outcome, "passed");
}
// Assigning tests to people, known by their Microsoft account's email address.
{
  let suite = suites.create({ suiteId: "as", title: "UAT", environment: "UAT", version: "BC 28",
    items: [{ sessionId: "a", title: "Order", testRunId: "ra" }, { sessionId: "b", title: "Invoice", testRunId: "rb" },
      { sessionId: "c", title: "Credit", testRunId: "rc" }] });
  assert.strictEqual(suites.person({ name: "X", email: "not an address" }), null, "an invalid address assigns nobody");
  suite = suites.update(suite, { assign: { sessionIds: ["a", "b"], assignee: { name: "Bo", email: " BO@Example.com " } } }, "t1");
  assert.deepStrictEqual(suite.items.map(item => item.assignee?.email || null), ["bo@example.com", "bo@example.com", null]);
  suite = suites.update(suite, { assign: { sessionIds: ["b"], assignee: null } }, "t2");
  assert.strictEqual(suite.items[1].assignee, null, "Nobody removes the assignment");
  suite = suites.update(suite, { assign: { sessionIds: ["c"], assignee: { email: "ann@example.com" } } }, "t3");
  assert.strictEqual(suite.items[2].assignee.name, "ann@example.com", "without a name the address names the person");
  assert.deepStrictEqual(suites.people([suite], { name: "Me", email: "me@example.com" }).map(who => who.email),
    ["me@example.com", "ann@example.com", "bo@example.com"], "the signed-in person first, then by name");
  const summary = notRun => ({ total: 2, passed: 2 - notRun, failed: 0, skipped: 0, notRun,
    outcome: notRun ? "in-progress" : "passed" });
  const progress = suites.progress(suite, { ra: summary(1), rb: summary(2), rc: summary(0) });
  assert.deepStrictEqual(suites.waitingFor(progress.items, { email: "BO@example.com" }).map(item => item.sessionId), ["a"]);
  assert.strictEqual(suites.waitingFor(progress.items, { email: "ann@example.com" }).length, 0, "a finished test waits for nobody");
  const t = (key, values = {}) =>
    Object.entries(values).reduce((value, [name, item]) => value.replaceAll(`{${name}}`, item), `<${key}>{name}{title}{where}`);
  const email = suites.assignmentEmail(suite, { name: "Bo", email: "BO@example.com" }, ["Order", "<Invoice>"], t);
  assert.strictEqual(email.to, "bo@example.com", "the email goes to the one person assigned");
  assert.match(email.text, /^<suite\.emailIntro>BoUAT \(UAT · BC 28\)\n\n- Order\n- <Invoice>/u);
  assert.ok(!email.text.includes("Credit"), "only the tests just assigned are named");
  assert.match(email.html, /<li>Order<\/li><li>&lt;Invoice&gt;<\/li>/u, "titles are escaped in the HTML body");
  const greeting = name => suites.assignmentEmail(suite, { name, email: "jj@example.com" }, ["Order"], t).text.split("UAT")[0];
  assert.strictEqual(greeting("Johan Johansson"), "<suite.emailIntro>Johan", "greeted by first name");
  assert.strictEqual(greeting("Johansson, Johan"), "<suite.emailIntro>Johan", "also from Surname, Given name");
  assert.strictEqual(greeting(""), "<suite.emailIntro>jj@example.com", "without a name, the address");
  assert.strictEqual(suites.assignmentEmail(suite, { name: "Bo", email: "bo@example.com" }, [], t), null);
  assert.strictEqual(suites.assignmentEmail(suite, null, ["Order"], t), null);
  // Each test links to the page that opens it; only an https link is used.
  const linked = suites.assignmentEmail(suite, { name: "Bo", email: "bo@example.com" },
    [{ title: "Order", link: "https://license.example.net/open?suite=as&test=ra" },
      { title: "Invoice", link: "javascript:alert(1)" }], t);
  assert.match(linked.html, /<li><a href="https:\/\/license\.example\.net\/open\?suite=as&amp;test=ra">Order<\/a><\/li><li>Invoice<\/li>/u);
  assert.match(linked.text, /- Order: https:\/\/license\.example\.net\/open\?suite=as&test=ra\n- Invoice\n/u);
  const next = suites.nextRound(suite, { a: "n1", c: "n3" }, { suiteId: "as2" });
  assert.strictEqual(next.items[0].assignee.email, "bo@example.com", "a new round keeps the assignments");
}
console.log("Test suite model tests passed.");

// Wiring: storage, background, pages and the library.
const read = file => fs.readFileSync(file, "utf8");
const keys = require("../src/engine/storage-keys");
assert.strictEqual(keys.TEST_SUITE_PREFIX, "t9_test_suite_");
const background = read("src/recorder/background.js");
assert.ok(/async function deleteSession\(id\) \{\s+await reanchorTestSuites\(id\);/u.test(background),
  "deleting a document moves or deletes the suites it owns");
assert.match(read("src/document/library-transfer.js"), /TEST_SUITE_PREFIX, "suite"/u,
  "suites are part of export and synchronization");
for (const type of ["T9_CREATE_TEST_SUITE", "T9_LOAD_TEST_SUITE", "T9_LIST_TEST_SUITES",
  "T9_UPDATE_TEST_SUITE", "T9_DELETE_TEST_SUITE", "T9_NEXT_TEST_SUITE_ROUND"]) {
  assert.ok(background.includes(`case "${type}"`), type);
}
assert.ok(background.includes('importScripts("document/test-suite.js");'));
assert.ok(background.includes("message.open === false ? null"), "a run made for a suite opens from the suite");
const page = read("src/ui/test-suite.html");
assert.ok(page.includes('<script src="document/test-suite.js"></script>') && page.includes('<script src="test-suite.js"></script>'));
assert.ok(read("scripts/build.js").includes('"test-suite.html", "test-suite.js"'));
const dashboardPage = read("src/ui/dashboard.html");
assert.ok(dashboardPage.includes('id="libraryBatchSuite"') && dashboardPage.includes('id="libraryTestSuiteDialog"') &&
  dashboardPage.includes('id="libraryTestSuites"') && dashboardPage.includes('<script src="document/test-suite.js"></script>'));
const dashboard = read("src/ui/dashboard.js");
assert.ok(dashboard.includes('type: "T9_CREATE_TEST_SUITE"') && dashboard.includes('type: "T9_LIST_TEST_SUITES"'));
assert.ok(read("src/ui/test-run.js").includes('suite.partOf'));
// Tests has a tab with every suite by its latest round, searched and filtered; the library
// shows only suites in progress, a few at a time. In both a click marks a suite and unfolds
// its actions. Suites are made from the processes ticked in Tests with the library's dialog.
assert.ok(background.includes("message.latestRounds") && background.includes("message.comparison") &&
  background.includes("roundNumbers(suites)"));
assert.ok(dashboard.includes('type: "T9_LIST_TEST_SUITES", latestRounds: true, comparison: true') &&
  dashboard.includes("openLibraryTestSuiteDialog(event.currentTarget, ids") && dashboard.includes("LIBRARY_SUITES_SHOWN"));
assert.ok(dashboard.includes('listState(suite) === "in-progress"'), "the library lists the suites in progress");
for (const action of ["open", "next-round", "protocol", "edit", "archive", "restore", "delete", "delete-confirm", "delete-cancel"]) {
  assert.ok(dashboard.includes(`"${action}"`), `suite action ${action}`);
}
for (const id of ["testsTabs", "testsTabProcesses", "testsTabSuites", "testsProcessesPanel", "testsSuitesPanel",
  "suitesSearch", "suitesFilters", "suitesList", "testsOverviewSuite", "librarySuiteEditDialog", "libraryTestSuitesMore"]) {
  assert.ok(dashboardPage.includes(`id="${id}"`), id);
}
for (const filter of suites.LIST_FILTERS) {
  assert.ok(dashboardPage.includes(`data-suites-filter="${filter}"`), filter);
  assert.ok(dashboard.includes("`suite.empty.${suitesFilter}`"));
}
// Processes are added to an existing suite from the library and from Tests, with tests made
// as Create test suite makes them.
assert.ok(background.includes('case "T9_ADD_TO_TEST_SUITE"') && dashboard.includes('type: "T9_ADD_TO_TEST_SUITE"'));
for (const id of ["libraryBatchAddSuite", "testsOverviewAddSuite", "libraryAddSuiteDialog", "libraryAddSuiteSelect"]) {
  assert.ok(dashboardPage.includes(`id="${id}"`), id);
}
// The name of a new suite follows the environment and version until the user writes one.
assert.ok(dashboard.includes("suggestedTitle({") && dashboard.includes("libraryTestSuiteNameOwn"));
// The suite's protocol: the protocol page with the suite, opened from the suite's page.
assert.ok(read("src/ui/test-suite.js").includes("test-protocol.html?suiteId="));
assert.ok(read("src/ui/test-protocol.js").includes('type: "T9_LOAD_TEST_SUITE"'));
// Both the suite's page and its protocol show the comparison the background counts.
assert.ok(background.includes("comparison: await testSuiteComparison(suite, progress)"));
assert.ok(read("src/ui/test-suite.js").includes("response.comparison") &&
  read("src/ui/test-suite.html").includes('id="suiteComparison"'));
assert.ok(read("src/ui/test-protocol.js").includes('labels.push(d("suite.compare.label"))'));

// Every suite text in every registered language, with the same placeholders.
const vm = require("vm");
const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
context.window = context.globalThis;
vm.createContext(context);
for (const file of ["src/engine/locale-catalogs.js", "src/engine/language-registry.js", "src/ui/i18n.js"]) {
  vm.runInContext(read(file), context, { filename: file });
}
const i18n = context.globalThis.T9UiI18n;
const locales = context.globalThis.T9LanguageRegistry.DEFAULT_DEFINITIONS.filter(item => item.ui).map(item => item.locale);
assert.strictEqual(locales.length, 8);
const used = new Set([page, dashboardPage, read("src/ui/test-suite.js"), dashboard, read("src/ui/test-run.js"),
  read("src/ui/test-protocol.js")]
  .flatMap(source => [...source.matchAll(/["'`](suite\.[a-zA-Z.-]+)["'`]/gu)].map(match => match[1])));
assert.ok(used.size >= 25, `suite texts found: ${used.size}`);
for (const key of [...used, ...["not-started", "in-progress", "passed", "failed", "missing", "cancelled"].map(value => `suite.status.${value}`),
  ...suites.CHANGES.map(change => `suite.compare.${change}`)]) {
  const english = i18n.translate(key, "en-US");
  assert.notStrictEqual(english, key, `${key} in English`);
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/gu)].map(match => match[1]).sort().join();
  for (const locale of locales) {
    const value = i18n.translate(key, locale);
    assert.ok(value && value !== key, `${key} in ${locale}`);
    assert.strictEqual(placeholders(value), placeholders(english), `${key} placeholders in ${locale}`);
  }
}
// Assigning: the page, the people, the tester filled in when a suite's test is begun, and the
// count of tests waiting for the signed-in person.
for (const id of ["assignTests", "assignDialog", "assignPerson", "assignEmail", "assignNotify", "onlyMine"]) {
  assert.ok(page.includes(`id="${id}"`), id);
}
assert.ok(page.includes('src="bug-report/outlook-draft.js"'));
// The email to the person assigned: asked for with the click, sent after the assignment is saved,
// and never the old button that emailed everyone with tests waiting.
assert.ok(!page.includes('id="emailAssignments"'), "no button that emails everyone");
assert.ok(/const permission = notify \? chrome\.permissions\.request\(GRAPH\)[\s\S]*?await save\(\)/u.test(read("src/ui/test-suite.js")),
  "the permission is requested before anything is awaited");
assert.ok(/T9_UPDATE_TEST_SUITE[\s\S]*?notifyAssignee\(/u.test(read("src/ui/test-suite.js")), "the email follows the saved assignment");
assert.ok(read("src/ui/test-suite.js").includes("await outlook().send("));
// The link from the email: built from the configured page, and a suite that has not arrived
// yet is waited for.
assert.ok(read("src/ui/test-suite.js").includes("T9TenantLicenseConfig?.openLink"));
assert.ok(read("src/ui/test-suite.js").includes('query.get("from") === "link"') &&
  read("src/ui/test-suite.js").includes('t("suite.notSynced")'));
assert.ok(background.includes('case "T9_OPEN_LINK"') && background.includes("&from=link"));
// Suggestions for a new person: known people and Microsoft 365, never a sign-in while typing.
const suitePage = read("src/ui/test-suite.js");
for (const id of ["assignSuggestions", "assignSearchPeople"]) assert.ok(page.includes(`id="${id}"`), id);
assert.ok(page.includes('aria-controls="assignSuggestions"'));
assert.ok(suitePage.includes("outlook().people(term)") && suitePage.includes('outlook().people("", { interactive: true })'));
assert.ok(/chrome\.permissions\.contains\(GRAPH\) \? await outlook\(\)\.people\(term\)/u.test(suitePage),
  "typing searches Microsoft 365 only once it is allowed");
assert.ok(background.includes('case "T9_TEST_PEOPLE"'));
assert.ok(background.includes("mine: me ? globalThis.T9TestSuite.waitingFor(progress.items, me).length : 0"));
assert.ok(background.includes("message.run?.suiteId ? carried"), "a suite's test is not filled in when the suite is made");
assert.ok(/globalThis\.T9TestHistory\.started\(changed\)[\s\S]*?withTester/u.test(background),
  "the tester is filled in when the test is begun");
assert.ok(dashboard.includes('uiTf("suite.mineCount"'));
assert.ok(read("src/bug-report/outlook-draft.js").includes("!email.withoutAttachments"));
console.log("Test suite wiring and languages passed.");
