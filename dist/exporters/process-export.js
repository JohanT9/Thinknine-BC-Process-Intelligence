(function (root, factory) {
  const processModel = typeof module === "object" && module.exports
    ? require("../document/process-model") : root.T9ProcessModel;
  const svgExporter = typeof module === "object" && module.exports
    ? require("./process-svg-export") : root.T9ProcessSvgExport;
  const api = factory(processModel, svgExporter);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
  function (processModel, svgExporter) {
  "use strict";
  const EXPORT_VERSION = "1.0.0";
  function canonical(value) { if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).sort().reduce((result, key) => { if (value[key] !== undefined)
      result[key] = canonical(value[key]); return result; }, {}); }
  function validate(model) { const result = processModel.validate(model); if (!result.valid) {
    const error = new Error("The Process Model is invalid and cannot be exported.");
    error.code = "INVALID_PROCESS_MODEL"; error.diagnostics = result.diagnostics; throw error; }
  return model; }
  function json(model, options = {}) { validate(model); return JSON.stringify(canonical({
    exportVersion: EXPORT_VERSION, format: "thinknine-process-model",
    language: options.language || null, title: options.title || model.title || "Process",
    processModel: model }), null, 2) + "\n"; }
  function svg(model, options = {}) { validate(model); return svgExporter.svg(model, options); }
  function fileBase(value) { return String(value || "process").trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "") || "process"; }
  function create(model, options = {}) { const base = fileBase(options.title || model.title ||
    "process"); return Object.freeze({ json: Object.freeze({ filename: `${base} - process.json`,
      mimeType: "application/json;charset=utf-8", content: json(model, options) }),
    diagram: Object.freeze({ filename: `${base} - processdiagram.svg`,
      mimeType: "image/svg+xml;charset=utf-8", content: svg(model, options) }) }); }
  return { EXPORT_VERSION, create, fileBase, json, svg };
});
