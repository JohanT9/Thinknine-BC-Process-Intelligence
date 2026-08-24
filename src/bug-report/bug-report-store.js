(function (root, factory) {
  const model = typeof module === "object" && module.exports
    ? require("./bug-report-model") : root.T9BugReportModel;
  const api = factory(model);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (model) {
  "use strict";
  function createStore(adapter, prefix) {
    if (!adapter?.get || !adapter?.set || !adapter?.remove || !adapter?.all) {
      throw new TypeError("Bug Report storage adapter is incomplete.");
    }
    const key = id => prefix + id;
    return {
      async save(report) {
        const value = model.normalize(report);
        await adapter.set(key(value.bugReportId), value);
        return value;
      },
      async load(id) {
        const value = await adapter.get(key(id));
        return value ? model.normalize(value) : null;
      },
      async list() {
        const values = await adapter.all();
        return Object.entries(values).filter(([name]) => name.startsWith(prefix))
          .map(([, value]) => model.normalize(value))
          .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      },
      async remove(id) { await adapter.remove(key(id)); },
      async archive(id, updatedAt) {
        const report = await this.load(id);
        if (!report) return null;
        return this.save(model.updateHumanContent(report,
          { status: "archived" }, updatedAt));
      }
    };
  }
  return { createStore };
});
