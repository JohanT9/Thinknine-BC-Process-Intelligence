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

// A run of a suite names it; a new run belongs to a suite only when made for one, and the
// environment can be given.
const run = script.normalize({ testRunId: "run-a", sessionId: "doc-a", suiteId: "suite-1",
  environment: "Sandbox, BC 28", steps: [{ stepId: "s1", instruction: "Välj Ny.", status: "passed" }] });
assert.strictEqual(run.suiteId, "suite-1");
assert.strictEqual(script.rerun(run, { testRunId: "run-2" }).suiteId, undefined);
const again = script.rerun(run, { testRunId: "run-3", suiteId: "suite-2", environment: "" });
assert.deepStrictEqual([again.suiteId, again.environment, again.steps[0].status], ["suite-2", "", "not-run"]);
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
// The suite's protocol: the protocol page with the suite, opened from the suite's page.
assert.ok(read("src/ui/test-suite.js").includes("test-protocol.html?suiteId="));
assert.ok(read("src/ui/test-protocol.js").includes('type: "T9_LOAD_TEST_SUITE"'));

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
for (const key of [...used, ...["not-started", "in-progress", "passed", "failed", "missing"].map(status => `suite.status.${status}`)]) {
  const english = i18n.translate(key, "en-US");
  assert.notStrictEqual(english, key, `${key} in English`);
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/gu)].map(match => match[1]).sort().join();
  for (const locale of locales) {
    const value = i18n.translate(key, locale);
    assert.ok(value && value !== key, `${key} in ${locale}`);
    assert.strictEqual(placeholders(value), placeholders(english), `${key} placeholders in ${locale}`);
  }
}
console.log("Test suite wiring and languages passed.");
