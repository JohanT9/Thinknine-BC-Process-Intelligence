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

  // The person a test is assigned to, known by the Microsoft account they sign in with: a
  // name and an email address. Without a valid address nobody is assigned.
  const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/u;
  function person(value) {
    const email = text(value?.email).trim().toLowerCase();
    if (!EMAIL.test(email)) return null;
    return { name: text(value?.name).trim() || email, email };
  }
  const samePerson = (a, b) => Boolean(a?.email && b?.email && a.email === text(b.email).trim().toLowerCase());

  function normalizeItem(value = {}) {
    return { ...clone(value), sessionId: String(value.sessionId || ""), title: text(value.title),
      testRunId: value.testRunId ? String(value.testRunId) : null, assignee: person(value.assignee) };
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
    // An archived suite is kept, for its protocol and history, but out of the way.
    result.archived = result.archived === true;
    result.archivedAt = result.archived && result.archivedAt ? String(result.archivedAt) : null;
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
    if (typeof patch.archived === "boolean") {
      result.archived = patch.archived;
      result.archivedAt = patch.archived ? now || new Date().toISOString() : null;
    }
    // Assigning tests to a person, or taking the assignment away (assignee null).
    if (patch.assign && Array.isArray(patch.assign.sessionIds)) {
      const ids = new Set(patch.assign.sessionIds.map(String));
      const assignee = person(patch.assign.assignee);
      result.items = result.items.map(item => ids.has(item.sessionId) ? { ...item, assignee } : item);
    }
    if (patch.removeSessionId) {
      result.items = result.items.filter(item => item.sessionId !== String(patch.removeSessionId));
    }
    result.updatedAt = now || result.updatedAt;
    return normalize(result);
  }

  // The suite with more tests added at the end, each a document with the run made for it. A
  // document already in the suite is not added again, and the suite never grows past
  // MAX_ITEMS; both are named so the user can be told.
  function addItems(suite, items = [], now) {
    const result = normalize(suite);
    const present = new Set(result.items.map(item => item.sessionId));
    const added = [];
    const already = [];
    const full = [];
    for (const value of Array.isArray(items) ? items : []) {
      const item = normalizeItem(value);
      if (!item.sessionId) continue;
      if (present.has(item.sessionId)) { already.push(item); continue; }
      if (result.items.length >= MAX_ITEMS) { full.push(item); continue; }
      present.add(item.sessionId);
      result.items.push(item);
      added.push(item);
    }
    if (added.length) result.updatedAt = now || new Date().toISOString();
    return { suite: normalize(result), added, already, full };
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
    if (summary.outcome === "cancelled") return "cancelled";
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
    // A test whose document was deleted can no longer be run, and a cancelled test will not be
    // run in this round, so neither is counted in total.
    const result = { total: items.length - count("missing") - count("cancelled"), passed: count("passed"),
      failed: count("failed"), inProgress: count("in-progress"), notStarted: count("not-started"),
      missing: count("missing"), cancelled: count("cancelled") };
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
          testRunId: runIds[item.sessionId], assignee: item.assignee })) });
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

  // Whether any test of the round has a result. Until then a new round would be an empty copy.
  function hasResults(value) {
    return Boolean(value && (value.passed || value.failed || value.inProgress));
  }

  // A name from what is tested, such as "UAT – BC 27.1", so that suites tell themselves
  // apart in a long list. Empty when neither is known.
  function suggestedTitle(options = {}) {
    return [text(options.environment).trim(), text(options.version).trim()].filter(Boolean).join(" – ");
  }

  // Which round each suite is: 1 for a suite without a previous round, 2 for the round after
  // it, and so on. A previous round that was deleted ends the count there.
  function roundNumbers(suites = []) {
    const byId = new Map((Array.isArray(suites) ? suites : []).map(suite => [String(suite?.suiteId || ""), suite]));
    const numbers = {};
    const number = suiteId => {
      if (numbers[suiteId]) return numbers[suiteId];
      const seen = new Set();
      let count = 0;
      let current = byId.get(suiteId);
      while (current && !seen.has(current.suiteId)) {
        seen.add(current.suiteId);
        count += 1;
        current = current.previousSuiteId ? byId.get(String(current.previousSuiteId)) : null;
      }
      numbers[suiteId] = Math.max(1, count);
      return numbers[suiteId];
    };
    for (const suiteId of byId.keys()) if (suiteId) number(suiteId);
    return numbers;
  }

  // The list of suites: each is in progress until every test of it has been run to the end,
  // then done, unless it is archived. All is every suite that is not archived, as in the
  // library. The search finds the name, environment and version.
  const LIST_FILTERS = Object.freeze(["in-progress", "done", "archived", "all"]);
  function listState(entry) {
    if (entry?.archived) return "archived";
    const value = entry?.progress || {};
    return value.total && value.done === value.total ? "done" : "in-progress";
  }
  function listCounts(entries = []) {
    const counts = Object.fromEntries(LIST_FILTERS.map(filter => [filter, 0]));
    for (const entry of entries) {
      const state = listState(entry);
      counts[state] += 1;
      if (state !== "archived") counts.all += 1;
    }
    return counts;
  }
  function listFilter(entries = [], options = {}) {
    const filter = LIST_FILTERS.includes(options.filter) ? options.filter : "all";
    const query = text(options.query).trim().toLocaleLowerCase();
    return entries.filter(entry => {
      const state = listState(entry);
      if (filter === "all" ? state === "archived" : state !== filter) return false;
      return !query || [entry.title, entry.environment, entry.version]
        .some(value => text(value).toLocaleLowerCase().includes(query));
    });
  }

  // The tests of a suite (given as progress items) assigned to a person that are not run to
  // the end yet: what waits for them.
  function waitingFor(items, who) {
    return (Array.isArray(items) ? items : []).filter(item => samePerson(item.assignee, who) &&
      !["passed", "failed", "missing", "cancelled"].includes(item.status) &&
      !(item.summary && !item.summary.notRun));
  }
  // The email telling the assigned people which tests wait for them, in the language t gives:
  // one message to all of them, with each person's tests under their name. Only tests not
  // run to the end are named; null when none wait.
  // The name to greet a person by: the first name, also from "Surname, Given name" as some
  // organisations write it; without a name, the whole of what is known.
  function firstName(who) {
    const name = text(who?.name).trim();
    if (!name || name.toLowerCase() === text(who?.email).toLowerCase()) return name;
    const given = name.includes(",") ? name.slice(name.indexOf(",") + 1).trim() : name;
    return given.split(/\s+/u)[0] || name;
  }

  // The email to one person about the tests just assigned to them: only those tests, with the
  // suite's name, environment and version, each a link to open it when the test has one (an
  // https link; anything else is left out). Null without a valid address or a test.
  function assignmentEmail(suite, assignee, tests, t) {
    const who = person(assignee);
    const list = (Array.isArray(tests) ? tests : []).map(item => typeof item === "string" ? { title: item } : item)
      .map(item => ({ title: text(item?.title).trim(), link: /^https:\/\/[^\s"<>]+$/u.test(text(item?.link)) ? text(item.link) : "" }))
      .filter(item => item.title);
    if (!who || !list.length) return null;
    const value = normalize(suite);
    const title = value.title || t("suite.pageTitle");
    const where = [value.environment, value.version].filter(Boolean).join(" · ");
    const intro = t("suite.emailIntro", { name: firstName(who), title, where: where ? ` (${where})` : "" });
    const how = t("suite.emailHow");
    const escape = item => String(item).replace(/[&<>"]/gu, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
    return { to: who.email, subject: t("suite.emailSubject", { title }),
      text: [intro, "", ...list.map(item => item.link ? `- ${item.title}: ${item.link}` : `- ${item.title}`), "", how].join("\n"),
      html: `<p>${escape(intro)}</p><ul>${list.map(item => item.link
        ? `<li><a href="${escape(item.link)}">${escape(item.title)}</a></li>` : `<li>${escape(item.title)}</li>`).join("")}</ul><p>${escape(how)}</p>` };
  }

  // The people tests can be assigned to: the person signed in first, then everyone tests
  // have been assigned to before, by name.
  function people(suites, me = null) {
    const found = new Map();
    const self = person(me);
    for (const suite of Array.isArray(suites) ? suites : []) {
      for (const item of normalize(suite).items) {
        if (item.assignee && !found.has(item.assignee.email)) found.set(item.assignee.email, item.assignee);
      }
    }
    if (self) found.delete(self.email);
    const others = [...found.values()].sort((a, b) => a.name.localeCompare(b.name, undefined,
      { sensitivity: "base" }));
    return self ? [self, ...others] : others;
  }

  return { SCHEMA_VERSION, MAX_ITEMS, CHANGES, LIST_FILTERS, addItems, compareRounds, create, hasResults, itemStatus,
    assignmentEmail, people, person, samePerson, waitingFor,
    listCounts, listFilter, listState, nextRound, normalize, progress, roundNumbers, suggestedTitle, update,
    withoutOwner };
});
