(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TestReportFollowUp = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // When a step that had a bug report passes, the test offers to mark the report resolved.
  // The report stays open until the tester says so; Not now hides the offer for this step
  // until the page is opened again, and a report marked resolved can be opened again with Undo.
  // Reports come from the step itself or the same step in an earlier run (T9_TEST_RUN_OPEN_REPORTS).
  function create({ send, t, testRunId, onChange = () => {}, onMessage = () => {}, doc = document }) {
    let open = {};
    const dismissed = new Set();
    const resolved = new Map();
    const fill = (key, values) => Object.entries(values).reduce((text, [name, value]) =>
      text.replaceAll(`{${name}}`, value), t(key));
    const element = (tag, className, text = "") => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      node.textContent = text;
      return node;
    };
    async function refresh() {
      try {
        const response = await send({ type: "T9_TEST_RUN_OPEN_REPORTS", testRunId });
        open = response?.steps || {};
      } catch { open = {}; }
      const changed = new Set([...Object.keys(open), ...resolved.keys()]);
      changed.forEach(stepId => onChange(stepId));
    }
    async function setState(step, report, state) {
      try {
        await send({ type: "T9_SET_BUG_REPORT_RESOLUTION", bugReportId: report.bugReportId,
          state, testRunId, stepId: step.stepId });
      } catch {
        onMessage(t("test.resolveFailed"));
        return false;
      }
      if (state === "resolved") {
        resolved.set(step.stepId, [...(resolved.get(step.stepId) || []), report]);
        open[step.stepId] = (open[step.stepId] || []).filter(item =>
          item.bugReportId !== report.bugReportId);
        onMessage(fill("test.reportResolved", { title: report.title }));
      } else {
        resolved.set(step.stepId, (resolved.get(step.stepId) || []).filter(item =>
          item.bugReportId !== report.bugReportId));
        open[step.stepId] = [...(open[step.stepId] || []), report];
        onMessage("");
      }
      onChange(step.stepId, state === "resolved" ? ".run-followup-undo" : ".run-followup-resolve");
      return true;
    }
    // The offer under a passed step, or null. Only a passed step offers it.
    function render(step) {
      if (step.status !== "passed") return null;
      const waiting = dismissed.has(step.stepId) ? [] : open[step.stepId] || [];
      const done = resolved.get(step.stepId) || [];
      if (!waiting.length && !done.length) return null;
      const box = element("div", "run-followup");
      box.setAttribute("role", "group");
      for (const report of waiting) {
        const row = element("div", "run-followup-row");
        row.append(element("p", "", fill("test.reportStillOpen", { title: report.title })));
        const resolve = element("button", "run-followup-resolve primary", t("test.markResolved"));
        resolve.type = "button";
        resolve.addEventListener("click", async () => {
          resolve.disabled = true;
          if (!await setState(step, report, "resolved")) resolve.disabled = false;
        });
        const later = element("button", "run-followup-later", t("test.notNow"));
        later.type = "button";
        later.addEventListener("click", () => {
          dismissed.add(step.stepId);
          onChange(step.stepId);
        });
        const actions = element("div", "run-followup-actions");
        actions.append(resolve, later);
        row.append(actions);
        box.append(row);
      }
      for (const report of done) {
        const row = element("div", "run-followup-row is-resolved");
        row.append(element("p", "", fill("test.reportResolved", { title: report.title })));
        const undo = element("button", "run-followup-undo", t("test.undoResolve"));
        undo.type = "button";
        undo.addEventListener("click", async () => {
          undo.disabled = true;
          if (!await setState(step, report, "open")) undo.disabled = false;
        });
        row.append(undo);
        box.append(row);
      }
      return box;
    }
    // Whether a passed step offers to mark a report resolved, so the panel stays on the step.
    const hasOffer = stepId => !dismissed.has(stepId) && Boolean(open[stepId]?.length);
    return { refresh, render, hasOffer };
  }
  return { create };
});
