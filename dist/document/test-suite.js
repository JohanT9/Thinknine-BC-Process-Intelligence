(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TestSuite = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // A test suite: the tests of several process documents run together, for example as the
  // regression test before a Business Central upgrade. The suite names the environment and
  // version tested and holds one test run per document; the runs are stored on their own,
  // as any test run, and the suite only refers to them. Its progress is counted from the
  // runs: a suite never sets a result itself. A suite is exported and synchronized with one
  // of its documents, its owner (ownerSessionId); when that document is deleted another one
  // of the suite takes over.
  const SCHEMA_VERSION = 1;
  const MAX_ITEMS = 200;
  const text = value => typeof value === "string" ? value : "";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function normalizeItem(value = {}) {
    return { ...clone(value), sessionId: String(value.sessionId || ""), title: text(value.title),
      testRunId: value.testRunId ? String(value.testRunId) : null };
  }

  function normalize(input = {}) {
    const result = clone(input) || {};
    result.schemaVersion = Number(result.schemaVersion || SCHEMA_VERSION);
    if (result.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Unsupported test suite schema: ${result.schemaVersion}`);
    }
    result.suiteId = String(result.suiteId || "");
    if (!result.suiteId) throw new TypeError("A test suite needs its own id.");
    result.title = text(result.title);
    result.environment = text(result.environment);
    result.version = text(result.version);
    result.previousSuiteId = result.previousSuiteId ? String(result.previousSuiteId) : null;
    const seen = new Set();
    result.items = (Array.isArray(result.items) ? result.items : []).map(normalizeItem)
      .filter(item => item.sessionId && !seen.has(item.sessionId) && seen.add(item.sessionId))
      .slice(0, MAX_ITEMS);
    const owner = result.ownerSessionId ? String(result.ownerSessionId) : "";
    result.ownerSessionId = owner && (seen.has(owner) || !result.items.length) ? owner
      : result.items[0]?.sessionId || owner;
    return result;
  }

  // A suite of the documents given, in the order given, each with the run made for it.
  function create(options = {}) {
    const now = options.now || new Date().toISOString();
    const items = (Array.isArray(options.items) ? options.items : []).map(normalizeItem);
    if (!items.length) throw new TypeError("A test suite needs at least one test.");
    return normalize({ schemaVersion: SCHEMA_VERSION, suiteId: String(options.suiteId || ""),
      title: text(options.title).trim(), environment: text(options.environment).trim(),
      version: text(options.version).trim(), previousSuiteId: options.previousSuiteId || null,
      createdAt: now, updatedAt: now, items });
  }

  function update(suite, patch = {}, now) {
    const result = normalize(suite);
    for (const field of ["title", "environment", "version"]) {
      if (typeof patch[field] === "string") result[field] = patch[field];
    }
    if (patch.removeSessionId) {
      result.items = result.items.filter(item => item.sessionId !== String(patch.removeSessionId));
    }
    result.updatedAt = now || result.updatedAt;
    return normalize(result);
  }

  // The suite once its owner document is deleted: owned by the first other document still
  // there (present(sessionId)), or null when none is left and the suite goes too.
  function withoutOwner(suite, present = () => true) {
    const value = normalize(suite);
    const next = value.items.find(item => item.sessionId !== value.ownerSessionId &&
      present(item.sessionId));
    return next ? { ...value, ownerSessionId: next.sessionId } : null;
  }

  // Where one test of the suite stands, from its run's step results. A run that no longer
  // exists (its document was deleted) is "missing".
  function itemStatus(summary) {
    if (!summary) return "missing";
    if (summary.failed) return "failed";
    if (summary.notRun === summary.total) return "not-started";
    return summary.notRun ? "in-progress" : "passed";
  }

  // The suite's progress: how many tests are run to the end, how many failed, and the same
  // per test. summaries maps a test run id to T9TestScript.summary of that run.
  function progress(suite, summaries = {}) {
    const items = normalize(suite).items.map(item => {
      const summary = item.testRunId ? summaries[item.testRunId] || null : null;
      return { ...item, summary, status: itemStatus(summary) };
    });
    const count = status => items.filter(item => item.status === status).length;
    // A test whose document was deleted can no longer be run, so it is not counted in total.
    const result = { total: items.length - count("missing"), passed: count("passed"), failed: count("failed"),
      inProgress: count("in-progress"), notStarted: count("not-started"), missing: count("missing") };
    // A test is run when every step has a result; a failed test may still have steps left.
    result.done = items.filter(item => item.summary && !item.summary.notRun).length;
    result.outcome = result.failed ? "failed" : result.done === result.total &&
      result.done ? "passed" : result.done || result.inProgress ? "in-progress" : "not-started";
    return { ...result, items };
  }

  // The next round of the same suite, such as after the next upgrade: the same documents in
  // the same order, with the new runs given by session id. The environment and version are
  // left for the tester to fill in.
  function nextRound(suite, runIds = {}, options = {}) {
    const value = normalize(suite);
    return create({ suiteId: options.suiteId, now: options.now, title: value.title,
      previousSuiteId: value.suiteId, items: value.items.filter(item => runIds[item.sessionId])
        .map(item => ({ sessionId: item.sessionId, title: item.title,
          testRunId: runIds[item.sessionId] })) });
  }

  // This round compared with the round before it (previousSuiteId), both given as progress().
  // Tests are paired by their document, never by position. A test is compared only once it
  // has a result in this round: a new failure passed last round, a fixed test failed then,
  // an unchanged test had the same result, and a test that had no full result last round is
  // said to be so rather than counted as either. A test that was not in the previous round
  // is new in the suite. stepChanges maps a test run id to T9TestHistory.compare of that run
  // with the previous round's run, for the step numbers of new failures.
  const CHANGES = Object.freeze(["new-failure", "fixed", "still-failed", "still-passed",
    "failed-untested", "passed-untested", "new"]);
  function compareRounds(current, previous, stepChanges = {}) {
    if (!current || !previous) return null;
    const before = new Map((previous.items || []).map(item => [item.sessionId, item]));
    const items = (current.items || []).map(item => {
      const earlier = before.get(item.sessionId);
      let change = null;
      if (item.status === "missing") change = null;
      else if (!earlier) change = "new";
      else if (item.status === "failed") {
        change = earlier.status === "failed" ? "still-failed" : earlier.status === "passed"
          ? "new-failure" : "failed-untested";
      } else if (item.status === "passed") {
        change = earlier.status === "passed" ? "still-passed" : earlier.status === "failed"
          ? "fixed" : "passed-untested";
      }
      const steps = item.testRunId ? stepChanges[item.testRunId] : null;
      return { sessionId: item.sessionId, testRunId: item.testRunId,
        previousTestRunId: earlier?.testRunId || null, change,
        newFailureSteps: change && change !== "new" && steps
          ? (steps.newFailures || []).map(step => step.number).filter(Boolean) : [] };
    });
    const count = (...changes) => items.filter(item => changes.includes(item.change)).length;
    return { items, counts: { newFailure: count("new-failure"), fixed: count("fixed"),
      unchanged: count("still-failed", "still-passed"),
      untested: count("failed-untested", "passed-untested"), new: count("new") } };
  }

  return { SCHEMA_VERSION, MAX_ITEMS, CHANGES, compareRounds, create, itemStatus, nextRound,
    normalize, progress, update, withoutOwner };
});
