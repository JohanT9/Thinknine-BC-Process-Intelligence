(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessVisualGrammar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.0.0";
  const KINDS = Object.freeze({
    start: { kind: "start", shape: "terminal", tone: "success" },
    end: { kind: "end", shape: "terminal", tone: "neutral" },
    businessProcess: { kind: "business-process", shape: "rounded", tone: "brand" },
    processStep: { kind: "process-step", shape: "rectangle", tone: "neutral" },
    activity: { kind: "action", shape: "rectangle", tone: "neutral" },
    action: { kind: "action", shape: "rectangle", tone: "neutral" },
    manualAction: { kind: "manual-action", shape: "manual", tone: "manual" },
    systemAction: { kind: "system-action", shape: "system", tone: "system" },
    document: { kind: "document", shape: "document", tone: "document" },
    postedDocument: { kind: "posted-document", shape: "document", tone: "posted" },
    posting: { kind: "posting", shape: "hexagon", tone: "posting" },
    decision: { kind: "decision", shape: "diamond", tone: "decision" },
    status: { kind: "status", shape: "state", tone: "state" },
    dataEntity: { kind: "data-entity", shape: "data", tone: "document" },
    externalSystem: { kind: "external-system", shape: "system", tone: "external" }
  });
  const LABELS = Object.freeze({
    sv: { start: "Start", end: "Slut", "business-process": "Affärsprocess",
      "process-step": "Processsteg", "manual-action": "Manuell åtgärd",
      "system-action": "Systemåtgärd", document: "Dokument",
      "posted-document": "Bokfört dokument", posting: "Bokföring",
      decision: "Beslut", status: "Status", "data-entity": "Data",
      "external-system": "Externt system" },
    en: { start: "Start", end: "End", "business-process": "Business process",
      "process-step": "Process step", "manual-action": "Manual action",
      "system-action": "System action", document: "Document",
      "posted-document": "Posted document", posting: "Posting",
      decision: "Decision", status: "Status", "data-entity": "Data",
      "external-system": "External system" }
  });

  function canonicalType(node = {}) {
    const semanticLevel = node.metadata?.semanticLevel;
    const type = node.metadata?.originalNodeType ||
      (["domain", "businessProcess", "process"].includes(semanticLevel)
        ? "businessProcess" : node.nodeType) || "activity";
    return KINDS[type] ? type : "activity";
  }

  function presentationFor(node = {}, locale = "sv-SE") {
    const type = canonicalType(node);
    const definition = KINDS[type];
    const language = String(locale).toLowerCase().startsWith("en") ? "en" : "sv";
    return Object.freeze({ version: VERSION, sourceType: type, ...definition,
      label: LABELS[language][definition.kind] || "" });
  }

  return { KINDS, LABELS, VERSION, canonicalType, presentationFor };
});
