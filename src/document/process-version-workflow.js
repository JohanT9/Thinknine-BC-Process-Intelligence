(function (root, factory) {
  const versioning = typeof module === "object" && module.exports
    ? require("./process-versioning") : root.T9ProcessVersioning;
  const api = factory(versioning);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessVersionWorkflow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (versioning) {
  const CURRENT_ID = "current-process";

  function nextVersionNumber(values = []) {
    const ordered = versioning.history(values);
    if (!ordered.length) return "1.0";
    const [major, minor] = ordered.at(-1).versionNumber.split(".").map(Number);
    return `${major}.${minor + 1}`;
  }

  function save(model, values = [], options = {}) {
    return versioning.createVersion(model, {
      versionNumber: options.versionNumber || nextVersionNumber(values),
      title: options.title || model.title || "",
      versionNotes: options.versionNotes || "",
      status: options.status || "draft",
      baseline: values.length === 0 || Boolean(options.baseline),
      createdAt: options.createdAt || null,
      creationReason: options.creationReason || "consultant-snapshot",
      provenance: options.provenance || "manual-snapshot"
    }, values);
  }

  function choices(values = [], currentModel = null) {
    const saved = versioning.history(values).map(value => Object.freeze({
      id: value.processVersionId,
      label: `v${value.versionNumber}${value.baseline ? " · baseline" : ""}`,
      version: value
    }));
    if (currentModel) saved.push(Object.freeze({
      id: CURRENT_ID, label: "current", version: null
    }));
    return Object.freeze(saved);
  }

  function resolve(values, id, currentModel) {
    if (id === CURRENT_ID) return currentModel;
    return versioning.history(values).find(value => value.processVersionId === id) || null;
  }

  function compare(values, fromId, toId, currentModel) {
    const from = resolve(values, fromId, currentModel);
    const to = resolve(values, toId, currentModel);
    if (!from || !to) throw new Error("Both process versions must be selected.");
    return Object.freeze({
      from, to,
      diff: versioning.compareProcessVersions(from, to)
    });
  }

  return { CURRENT_ID, choices, compare, nextVersionNumber, save };
});
