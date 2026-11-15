(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TestHistory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // How a process has been tested over time, counted from its stored test runs: the latest
  // result of each document and every run with what changed since the run before it. Nothing
  // is stored; everything is counted again from the runs as they are now.
  //
  // A result is said as it is: a passed run means the tester, or the recording of the test,
  // passed every step. Steps the recording passed are counted, so that such a run never
  // looks more verified than it is, and a run with steps left untested is in progress.
  const STATES = Object.freeze(["passed", "failed", "in-progress"]);

  const text = value => typeof value === "string" ? value : value == null ? "" : String(value);
  const steps = run => Array.isArray(run?.steps) ? run.steps : [];
  const byRecording = step => step?.resultSource === "recording" &&
    ["passed", "failed"].includes(step.status);

  function counts(run) {
    const list = steps(run);
    const count = status => list.filter(step => step.status === status).length;
    const result = { total: list.length, passed: count("passed"), failed: count("failed"),
      skipped: count("skipped"), notRun: count("not-run"),
      byRecording: list.filter(byRecording).length };
    result.outcome = result.failed ? "failed" : result.notRun || !result.total
      ? "in-progress" : "passed";
    return result;
  }

  // A step of one run is the same step in another when it has the same id, or else, for a test
  // made again from a changed document, the same action on the same page. Never its position.
  const signatureKey = step => step?.signature ? JSON.stringify(step.signature) : "";
  function counterparts(run, previous) {
    const byId = new Map(steps(previous).map(step => [text(step.stepId), step]));
    const bySignature = new Map();
    for (const step of steps(previous)) {
      const key = signatureKey(step);
      if (key && !bySignature.has(key)) bySignature.set(key, step);
    }
    const used = new Set();
    const pairs = steps(run).map(step => {
      let match = byId.get(text(step.stepId));
      if (!match || used.has(match)) {
        const key = signatureKey(step);
        match = key ? bySignature.get(key) : undefined;
      }
      if (match && used.has(match)) match = undefined;
      if (match) used.add(match);
      return [step, match || null];
    });
    return { pairs, removed: steps(previous).filter(step => !used.has(step)) };
  }

  const stepFact = step => ({ stepId: text(step.stepId), number: Number(step.number) || 0,
    instruction: text(step.instruction), bugReportId: step.bugReportId ? text(step.bugReportId) : null,
    byRecording: byRecording(step) });

  // What changed since the previous run of the same document. A failed step is a new failure
  // when it passed last time, failed again when it failed last time, and untested last time
  // when it had no result then. A step without a counterpart is new in the test or was
  // removed from it; it is never counted as a failure of the other run.
  function compare(run, previous) {
    if (!previous) return null;
    const { pairs, removed } = counterparts(run, previous);
    const result = { previousRunId: text(previous.testRunId), newFailures: [], failedAgain: [],
      failedUntested: [], failedNewSteps: [], fixed: [], addedSteps: 0, removedSteps: removed.length };
    for (const [step, earlier] of pairs) {
      if (!earlier) {
        result.addedSteps += 1;
        if (step.status === "failed") result.failedNewSteps.push(stepFact(step));
        continue;
      }
      if (step.status === "failed") {
        (earlier.status === "failed" ? result.failedAgain : earlier.status === "passed"
          ? result.newFailures : result.failedUntested).push(stepFact(step));
      } else if (step.status === "passed" && earlier.status === "failed") {
        result.fixed.push(stepFact(step));
      }
    }
    return result;
  }

  const newestFirst = (a, b) => text(b.createdAt).localeCompare(text(a.createdAt)) ||
    text(b.testRunId).localeCompare(text(a.testRunId));

  // One entry of a document's history.
  function entry(run, previous) {
    return { testRunId: text(run.testRunId), sessionId: text(run.sessionId), title: text(run.title),
      createdAt: text(run.createdAt), updatedAt: text(run.updatedAt) || text(run.createdAt),
      tester: text(run.tester), environment: text(run.environment),
      suiteId: run.suiteId ? text(run.suiteId) : null, counts: counts(run),
      failedSteps: steps(run).filter(step => step.status === "failed").map(stepFact),
      comparison: compare(run, previous) };
  }

  // Every run of one document, newest first, each compared with the run made before it.
  function history(runs, sessionId) {
    const own = (Array.isArray(runs) ? runs : [])
      .filter(run => run && (!sessionId || text(run.sessionId) === text(sessionId)))
      .slice().sort(newestFirst);
    return own.map((run, index) => entry(run, own[index + 1]));
  }

  // The latest result of each document: the newest run, whatever environment it was run in,
  // with how many runs there are. A document without a run has no entry.
  function latest(runs) {
    const groups = new Map();
    for (const run of Array.isArray(runs) ? runs : []) {
      if (!run?.sessionId) continue;
      const key = text(run.sessionId);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(run);
    }
    const result = new Map();
    for (const [sessionId, own] of groups) {
      own.sort(newestFirst);
      const newest = own[0];
      const value = counts(newest);
      result.set(sessionId, { sessionId, testRunId: text(newest.testRunId),
        state: value.outcome, date: text(newest.updatedAt) || text(newest.createdAt),
        counts: value, runCount: own.length });
    }
    return result;
  }

  // The label key of a result: a passed run whose steps the recording passed says so.
  function stateKey(value) {
    const state = STATES.includes(value?.state || value?.outcome) ? (value.state || value.outcome) : "in-progress";
    const recorded = value?.counts?.byRecording ?? value?.byRecording ?? 0;
    const total = value?.counts?.total ?? value?.total ?? 0;
    if (state === "passed" && recorded) {
      return recorded >= total ? "testHistory.state.passedByRecording" : "testHistory.state.passedPartlyByRecording";
    }
    return `testHistory.state.${state}`;
  }

  // The test overview: per document its latest run with where and by whom it was tested,
  // and the outcomes of its last runs, oldest first. suites gives the Business Central
  // version of a run made in a suite.
  const TREND_LENGTH = 5;
  function summaries(runs, suites = []) {
    const versions = new Map((Array.isArray(suites) ? suites : [])
      .map(suite => [text(suite?.suiteId), text(suite?.version)]));
    const groups = new Map();
    for (const run of Array.isArray(runs) ? runs : []) {
      if (!run?.sessionId) continue;
      const key = text(run.sessionId);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(run);
    }
    return [...groups].map(([sessionId, own]) => {
      own.sort(newestFirst);
      const newest = own[0];
      const value = counts(newest);
      return { sessionId, testRunId: text(newest.testRunId), state: value.outcome,
        date: text(newest.updatedAt) || text(newest.createdAt), counts: value, runCount: own.length,
        environment: text(newest.environment), tester: text(newest.tester),
        version: newest.suiteId ? versions.get(text(newest.suiteId)) || "" : "",
        trend: own.slice(0, TREND_LENGTH).reverse().map(run => ({ testRunId: text(run.testRunId),
          state: counts(run).outcome, date: text(run.updatedAt) || text(run.createdAt) })) };
    });
  }

  // One row per process document, tested or not: the latest result, or "never". A tested
  // document whose latest run is older than staleDays is also stale, so that tests that
  // have not been run again in a long time show up. Failures come first.
  const ORDER = Object.freeze({ failed: 0, "in-progress": 1, never: 2, passed: 3 });
  const DAY_MS = 24 * 60 * 60 * 1000;
  function overviewRows(documents, tested, options = {}) {
    const now = Date.parse(options.now || new Date().toISOString());
    const staleDays = Number(options.staleDays) || 90;
    const bySession = new Map((tested || []).map(value => [value.sessionId, value]));
    return (Array.isArray(documents) ? documents : []).map(document => {
      const sessionId = text(document.sessionId || document.projectId);
      const summary = bySession.get(sessionId) || null;
      const when = summary ? Date.parse(summary.date) : NaN;
      return { sessionId, projectId: text(document.projectId || sessionId), title: text(document.title),
        state: summary ? summary.state : "never", summary,
        stale: Boolean(summary) && Number.isFinite(when) && now - when > staleDays * DAY_MS };
    }).sort((a, b) => ORDER[a.state] - ORDER[b.state] ||
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }

  const FILTERS = Object.freeze(["all", "failed", "in-progress", "passed", "never", "stale"]);
  const matches = (row, filter) => filter === "all" || (filter === "stale" ? row.stale : row.state === filter);
  function overviewCounts(rows) {
    return Object.fromEntries(FILTERS.map(filter => [filter, rows.filter(row => matches(row, filter)).length]));
  }
  // The rows a quick filter and a search (on the process name) leave.
  function overviewFilter(rows, options = {}) {
    const filter = FILTERS.includes(options.filter) ? options.filter : "all";
    const query = text(options.query).trim().toLocaleLowerCase();
    return rows.filter(row => matches(row, filter) &&
      (!query || row.title.toLocaleLowerCase().includes(query)));
  }

  // The overview as CSV, one row per process, with headings and results in the language given
  // by t. Values are quoted where needed, and a value that a spreadsheet would read as a
  // formula is kept as text. Excel in most of Europe expects semicolons; English uses commas.
  function overviewCsv(rows, options) {
    const { t, separator = ";", formatDate = value => value } = options;
    const cell = value => {
      let result = text(value);
      if (/^[=+\-@\t\r]/u.test(result)) result = `'${result}`;
      return /["\n\r]/u.test(result) || result.includes(separator) ? `"${result.replaceAll('"', '""')}"` : result;
    };
    const heading = ["process", "result", "date", "environment", "version", "tester", "runs",
      "failedSteps", "steps"].map(key => t(`testOverview.csv.${key}`));
    const lines = rows.map(row => {
      const summary = row.summary;
      const result = summary ? t(stateKey(summary)) : t("testHistory.notTested");
      return [row.title, result, summary ? formatDate(summary.date) : "", summary?.environment,
        summary?.version, summary?.tester, summary ? summary.runCount : "",
        summary ? summary.counts.failed : "", summary ? summary.counts.total : ""];
    });
    return [heading, ...lines].map(line => line.map(cell).join(separator)).join("\r\n") + "\r\n";
  }

  // The runs the overview's filters keep: run in an environment, in a suite or a Business
  // Central version (the version of the suite it was run in), or within the last days. Each
  // process is then shown with its latest run among these, so "UAT" shows how it went in UAT.
  const PERIODS = Object.freeze([7, 30, 90, 365]);
  function scopeRuns(runs, suites = [], scope = {}) {
    const versions = new Map((Array.isArray(suites) ? suites : [])
      .map(suite => [text(suite?.suiteId), text(suite?.version)]));
    const now = Date.parse(scope.now || new Date().toISOString());
    const days = PERIODS.includes(Number(scope.periodDays)) ? Number(scope.periodDays) : 0;
    return (Array.isArray(runs) ? runs : []).filter(run => {
      if (scope.environment && text(run?.environment).trim() !== scope.environment) return false;
      if (scope.suiteId && text(run?.suiteId) !== scope.suiteId) return false;
      if (scope.version && (!run?.suiteId || versions.get(text(run.suiteId)) !== scope.version)) return false;
      if (days) {
        const when = Date.parse(text(run?.updatedAt) || text(run?.createdAt));
        if (!Number.isFinite(when) || now - when > days * DAY_MS) return false;
      }
      return true;
    });
  }
  // The choices the filters offer: the environments, versions and suites that occur in runs,
  // so that a filter never offers something that matches nothing. Suites newest first.
  function scopeOptions(runs, suites = []) {
    const list = Array.isArray(runs) ? runs : [];
    const used = new Set(list.map(run => text(run?.suiteId)).filter(Boolean));
    const known = (Array.isArray(suites) ? suites : []).filter(suite => used.has(text(suite?.suiteId)));
    const sorted = values => [...new Set(values.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    return { environments: sorted(list.map(run => text(run?.environment).trim())),
      versions: sorted(known.map(suite => text(suite.version).trim())),
      suites: known.slice().sort((a, b) => text(b.createdAt).localeCompare(text(a.createdAt)))
        .map(suite => ({ suiteId: text(suite.suiteId), title: text(suite.title),
          environment: text(suite.environment), version: text(suite.version), createdAt: text(suite.createdAt) })) };
  }
  const activeScope = scope => ["environment", "version", "suiteId", "periodDays"]
    .filter(key => scope?.[key]).length;

  return { STATES, FILTERS, PERIODS, TREND_LENGTH, activeScope, compare, counts, history, latest,
    overviewCounts, overviewCsv, overviewFilter, overviewRows, scopeOptions, scopeRuns, stateKey,
    summaries };
});
