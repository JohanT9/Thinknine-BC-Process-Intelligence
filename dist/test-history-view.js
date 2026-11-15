(function (root) {
  "use strict";
  // A document's test history as a timeline, newest run first: the result, when, where and by
  // whom, links to the run and its protocol, and under a failed run what changed since the run
  // before it. The same component is shown in the library and on the test page.
  const ICONS = Object.freeze({ passed: "✓", failed: "●", "in-progress": "◐" });

  function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function formatDate(value, locale, withTime = false) {
    try {
      return new Intl.DateTimeFormat(locale, withTime ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" }).format(new Date(value));
    } catch { return String(value || ""); }
  }

  // "Failed · 2 of 9 steps failed": the result and its count, in words.
  function resultText(entry, t) {
    const counts = entry.counts;
    const state = t(root.T9TestHistory.stateKey({ state: counts.outcome, counts }));
    const detail = counts.outcome === "failed"
      ? t("testHistory.countFailed", { failed: counts.failed, total: counts.total })
      : counts.outcome === "passed"
        ? t("testHistory.countPassed", { passed: counts.passed, total: counts.total })
        : t("testHistory.countProgress", { done: counts.total - counts.notRun, total: counts.total });
    return `${state} · ${detail}`;
  }

  function stepLine(t, key, step) {
    return t(key, { n: step.number, step: step.instruction });
  }

  // The failed steps of a run: what changed since the previous run, or for the first run just
  // that the step failed. Bug reports made from a step are offered beside it.
  function changes(entry, t) {
    const list = create("ul", "test-history-changes");
    const comparison = entry.comparison;
    const groups = comparison ? [["testHistory.newFailure", comparison.newFailures],
      ["testHistory.failedNewStep", comparison.failedNewSteps],
      ["testHistory.failedUntested", comparison.failedUntested],
      ["testHistory.failedAgain", comparison.failedAgain]]
      : [["testHistory.failedStep", entry.failedSteps]];
    for (const [key, steps] of groups) {
      for (const step of steps) {
        const item = create("li", "", stepLine(t, key, step));
        item.dataset.change = key.split(".").pop();
        if (step.bugReportId) {
          const report = create("button", "secondary test-history-report", t("testHistory.openReport"));
          report.type = "button";
          report.dataset.bugReportId = step.bugReportId;
          item.append(" ", report);
        }
        list.append(item);
      }
    }
    if (comparison?.fixed.length) {
      const item = create("li", "", t("testHistory.fixed", {
        steps: comparison.fixed.map(step => step.number).join(", ") }));
      item.dataset.change = "fixed";
      list.append(item);
    }
    if (comparison?.addedSteps) {
      list.append(create("li", "test-history-note", t("testHistory.addedSteps", { count: comparison.addedSteps })));
    }
    if (comparison?.removedSteps) {
      list.append(create("li", "test-history-note", t("testHistory.removedSteps", { count: comparison.removedSteps })));
    }
    return list.childElementCount ? list : null;
  }

  function link(text, href) {
    const anchor = create("a", "", text);
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    return anchor;
  }

  // Renders the history into the list; returns how many runs it shows. The run given as
  // currentRunId is left out, for the test page that shows that run itself.
  function render(list, history, options) {
    const { t, locale, currentRunId = "" } = options;
    const entries = (history || []).filter(entry => entry.testRunId !== currentRunId);
    list.replaceChildren(...entries.map(entry => {
      const item = create("li", "test-history-run");
      item.dataset.state = entry.counts.outcome;
      item.dataset.testRunId = entry.testRunId;
      const head = create("div", "test-history-head");
      const icon = create("span", "test-history-icon", ICONS[entry.counts.outcome] || "◐");
      icon.setAttribute("aria-hidden", "true");
      const when = create("time", "test-history-date", formatDate(entry.updatedAt, locale));
      when.dateTime = entry.updatedAt;
      const result = create("strong", "test-history-result", resultText(entry, t));
      const details = create("span", "test-history-details",
        [entry.environment, entry.tester].filter(Boolean).join(" · "));
      const actions = create("span", "test-history-actions");
      const id = encodeURIComponent(entry.testRunId);
      actions.append(link(t(entry.counts.outcome === "in-progress" ? "testHistory.continue"
        : "testHistory.open"), `test-run.html?testRunId=${id}`),
      link(t("testHistory.protocol"), `test-protocol.html?testRunId=${id}`));
      if (entry.suiteId) {
        actions.append(link(t("testHistory.suite"),
          `test-suite.html?suiteId=${encodeURIComponent(entry.suiteId)}`));
      }
      head.append(icon, when, result);
      if (details.textContent) head.append(details);
      head.append(actions);
      item.append(head);
      const changed = changes(entry, t);
      if (changed) item.append(changed);
      return item;
    }));
    return entries.length;
  }

  // The short marker on a document's library row: "✓ Passed 12 Nov", or "Not tested".
  function marker(latest, t, locale) {
    if (!latest) return { state: "none", icon: "–", text: t("testHistory.notTested") };
    return { state: latest.state, icon: ICONS[latest.state] || "◐",
      text: t("testHistory.marker", { state: t(root.T9TestHistory.stateKey(latest)),
        date: formatDate(latest.date, locale) }) };
  }

  root.T9TestHistoryView = Object.freeze({ ICONS, formatDate, marker, render, resultText });
})(typeof globalThis !== "undefined" ? globalThis : this);
