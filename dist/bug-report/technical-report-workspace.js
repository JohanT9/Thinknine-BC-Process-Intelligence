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
    let inFlightSave = false;
    let revision = 0;
    const history = [clone(report)];
    let historyIndex = 0;
    // A save that changes what the report says marks when it was edited, so the library shows
    // the edit; an email recorded on it, which changes no content, does not.
    let savedContent = model.contentRevision(report);
    const now = () => options.now ? options.now() : new Date().toISOString();
    const listeners = new Set();
    const notify = () => listeners.forEach(listener => listener(api.state()));
    function commit(next) {
      report = model.normalize(next);
      history.splice(historyIndex + 1);
      history.push(clone(report));
      historyIndex = history.length - 1;
      revision += 1;
      saveState = "unsaved";
      notify();
      return report;
    }
    const api = {
      state() { return { report: clone(report), evidence: clone(evidence),
        document: generator.project(report, { errorEvidence: evidence }),
        // Changes with every edit, undo and redo, but not when a save completes.
        revision, saveState, contentRevision: model.contentRevision(report),
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1 }; },
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      edit(patch, now) { return commit(model.updateHumanContent(report, patch, now)); },
      selectPrimaryError(id, now) {
        return commit(model.selectPrimaryError(report, id, now));
      },
      updateReproductionStep(id, patch, now) {
        return commit(model.updateReproductionStep(report, id, patch, now));
      },
      addReproductionStep(instruction, now) {
        return commit(model.addReproductionStep(report, instruction, now));
      },
      updateScreenshotVisibility(assetId, visibility, now) {
        return commit(model.updateScreenshotVisibility(report, assetId, visibility, now));
      },
      updateScreenshotRedactions(assetId, redactions, now) {
        return commit(model.updateScreenshotRedactions(report, assetId, redactions, now));
      },
      // An email made from the report is recorded with the version it held. It belongs to
      // every undo step, so undoing an edit does not remove it.
      recordDelivery(delivery) {
        const entry = { ...clone(delivery), reportRevision: model.contentRevision(report) };
        report = model.recordDelivery(report, entry);
        for (let index = 0; index < history.length; index += 1) {
          history[index] = clone(model.recordDelivery(history[index], entry));
        }
        revision += 1;
        saveState = "unsaved";
        notify();
        return report;
      },
      undo() { if (historyIndex > 0) { historyIndex -= 1; revision += 1;
        report = model.normalize(history[historyIndex]); saveState = "unsaved";
        notify(); } return report; },
      redo() { if (historyIndex < history.length - 1) { historyIndex += 1; revision += 1;
        report = model.normalize(history[historyIndex]); saveState = "unsaved";
        notify(); } return report; },
      save() {
        if (inFlightSave) return savePromise.then(() => api.flush());
        const savingRevision = revision;
        const snapshot = clone(report);
        const content = model.contentRevision(snapshot);
        if (content !== savedContent) snapshot.updatedAt = now();
        inFlightSave = true;
        saveState = "saving"; notify(); savePromise = options.store.save(snapshot)
        .then(saved => { savedContent = content; if (revision === savingRevision) {
          report = model.normalize(saved); saveState = "saved";
        } else saveState = "unsaved";
          notify(); return report; })
        .catch(error => { saveState = "failed"; notify(); throw error; })
        .finally(() => { inFlightSave = false; });
        return savePromise;
      },
      async flush() { if (saveState === "unsaved" || saveState === "failed") {
        await api.save();
      } else if (inFlightSave) await savePromise;
        if (saveState === "unsaved" || saveState === "failed") await api.flush();
        return report; },
      async exportMarkdown(exportOptions = {}) { await api.flush(); return textExport.markdown(
        generator.project(report, { errorEvidence: evidence }), exportOptions); },
      async exportPlainText(exportOptions = {}) { await api.flush(); return textExport.plainText(
        generator.project(report, { errorEvidence: evidence }), exportOptions); },
      replaceTelemetry(errorEvidenceId, telemetry, now) {
        return commit(model.attachTelemetry(report, errorEvidenceId, telemetry, now));
      }
    };
    return api;
  }
  return { create };
});
