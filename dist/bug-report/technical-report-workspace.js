(function (root, factory) {
  const model = typeof module === "object" && module.exports
    ? require("./bug-report-model") : root.T9BugReportModel;
  const generator = typeof module === "object" && module.exports
    ? require("./bug-report-generator") : root.T9BugReportGenerator;
  const textExport = typeof module === "object" && module.exports
    ? require("./bug-report-text-export") : root.T9BugReportTextExport;
  const api = factory(model, generator, textExport);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TechnicalReportWorkspace = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  model, generator, textExport
) {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function create(options = {}) {
    if (!options.store?.save) throw new TypeError("A Bug Report store is required.");
    let report = model.normalize(options.report);
    const evidence = clone(options.errorEvidence || []);
    let saveState = "saved";
    let savePromise = Promise.resolve(report);
    const history = [clone(report)];
    let historyIndex = 0;
    const listeners = new Set();
    const notify = () => listeners.forEach(listener => listener(api.state()));
    function commit(next) {
      report = model.normalize(next);
      history.splice(historyIndex + 1);
      history.push(clone(report));
      historyIndex = history.length - 1;
      saveState = "unsaved";
      notify();
      return report;
    }
    const api = {
      state() { return { report: clone(report), evidence: clone(evidence),
        document: generator.project(report, { errorEvidence: evidence }),
        saveState, canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1 }; },
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      edit(patch, now) { return commit(model.updateHumanContent(report, patch, now)); },
      selectPrimaryError(id, now) {
        return commit(model.selectPrimaryError(report, id, now));
      },
      undo() { if (historyIndex > 0) { historyIndex -= 1;
        report = model.normalize(history[historyIndex]); saveState = "unsaved";
        notify(); } return report; },
      redo() { if (historyIndex < history.length - 1) { historyIndex += 1;
        report = model.normalize(history[historyIndex]); saveState = "unsaved";
        notify(); } return report; },
      save() { saveState = "saving"; notify(); savePromise = options.store.save(report)
        .then(saved => { report = model.normalize(saved); saveState = "saved";
          notify(); return report; })
        .catch(error => { saveState = "failed"; notify(); throw error; });
      return savePromise; },
      async flush() { if (saveState === "unsaved" || saveState === "failed") {
        await api.save();
      } else await savePromise; return report; },
      async exportMarkdown() { await api.flush(); return textExport.markdown(
        generator.project(report, { errorEvidence: evidence })); },
      async exportPlainText() { await api.flush(); return textExport.plainText(
        generator.project(report, { errorEvidence: evidence })); },
      replaceTelemetry(errorEvidenceId, telemetry, now) {
        return commit(model.attachTelemetry(report, errorEvidenceId, telemetry, now));
      }
    };
    return api;
  }
  return { create };
});
