(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BCProcessImprovementAnalysis = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TOP_LEVEL_KEYS = new Set(["schemaVersion", "datasetVersion", "scope",
    "contentIncluded", "identityIncluded", "correctionCount",
    "engineAttributedCorrectionCount", "unattributedCorrectionCount",
    "byProcessCode", "byAffectedField", "byCommandType", "prioritizedCodes"]);
  const TARGETS = Object.freeze({
    "BCPS-PROCESS-CONFLICT-FIELD-001": "semantic field projection",
    "BCPS-PROCESS-CONFLICT-VALUE-001": "selected-value projection",
    "BCPS-PROCESS-CONFLICT-ACTION-001": "action identification",
    "BCPS-PROCESS-CONFLICT-EVIDENCE-001": "source traceability",
    "BCPS-PROCESS-CONFLICT-SCREENSHOT-001": "screenshot selection",
    "BCPS-PROCESS-CONFLICT-INSTRUCTION-001": "instruction generation",
    "BCPS-PROCESS-CONFLICT-LANGUAGE-001": "language preservation",
    "BCPS-PROCESS-GUARD-TRACE-001": "canonical event tracing",
    "BCPS-PROCESS-GUARD-FIELD-001": "field preservation",
    "BCPS-PROCESS-GUARD-VALUE-001": "value preservation",
    "BCPS-PROCESS-GUARD-RESULT-001": "result-only step filtering",
    "BCPS-PROCESS-GUARD-MERGE-001": "interaction grouping"
  });
  const integer = (value, label) => {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(`${label} must be a non-negative integer.`);
    }
  };
  const countMap = (value, label, keyPattern) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`${label} must be an object.`);
    }
    Object.entries(value).forEach(([key, count]) => {
      if (!keyPattern.test(key)) throw new TypeError(`${label} contains an invalid key.`);
      integer(count, `${label}.${key}`);
    });
  };

  function validate(dataset) {
    if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
      throw new TypeError("Invalid process improvement dataset.");
    }
    Object.keys(dataset).forEach(key => {
      if (!TOP_LEVEL_KEYS.has(key)) {
        throw new TypeError("Dataset contains an unexpected field.");
      }
    });
    if (dataset.schemaVersion !== 1 || !dataset.datasetVersion ||
        dataset.scope !== "local-aggregate" || dataset.contentIncluded !== false ||
        dataset.identityIncluded !== false) {
      throw new TypeError("Dataset privacy or schema contract is invalid.");
    }
    integer(dataset.correctionCount, "correctionCount");
    integer(dataset.engineAttributedCorrectionCount,
      "engineAttributedCorrectionCount");
    integer(dataset.unattributedCorrectionCount, "unattributedCorrectionCount");
    if (dataset.engineAttributedCorrectionCount +
        dataset.unattributedCorrectionCount !== dataset.correctionCount) {
      throw new TypeError("Correction totals are inconsistent.");
    }
    countMap(dataset.byProcessCode, "byProcessCode", /^BCPS-PROCESS-[A-Z-]+-\d{3}$/u);
    countMap(dataset.byAffectedField, "byAffectedField", /^[a-z][a-z-]*$/u);
    countMap(dataset.byCommandType, "byCommandType", /^[a-z][a-z-]*$/u);
    if (!Array.isArray(dataset.prioritizedCodes)) {
      throw new TypeError("prioritizedCodes must be an array.");
    }
    dataset.prioritizedCodes.forEach(item => {
      if (!item || Object.keys(item).sort().join(",") !== "code,corrections" ||
          !/^BCPS-PROCESS-[A-Z-]+-\d{3}$/u.test(item.code)) {
        throw new TypeError("prioritizedCodes contains an invalid item.");
      }
      integer(item.corrections, `prioritizedCodes.${item.code}`);
      if (dataset.byProcessCode[item.code] !== item.corrections) {
        throw new TypeError("Prioritized code totals are inconsistent.");
      }
    });
    return dataset;
  }

  function analyze(dataset) {
    validate(dataset);
    const priorities = Object.entries(dataset.byProcessCode)
      .map(([code, corrections]) => ({ code, corrections,
        priority: corrections >= 5 ? "high" : corrections >= 2 ? "medium" : "watch",
        target: TARGETS[code] || "unmapped process rule",
        requiredAction: "add a sanitized regression scenario before changing the rule" }))
      .sort((left, right) => right.corrections - left.corrections ||
        left.code.localeCompare(right.code));
    return Object.freeze({ datasetVersion: dataset.datasetVersion,
      correctionCount: dataset.correctionCount,
      engineAttributedCorrectionCount: dataset.engineAttributedCorrectionCount,
      engineAttributionRate: dataset.correctionCount
        ? dataset.engineAttributedCorrectionCount / dataset.correctionCount : 0,
      priorities: Object.freeze(priorities.map(Object.freeze)) });
  }

  function markdown(report) {
    const lines = ["# Process engine improvement report", "",
      `Corrections: ${report.correctionCount}`,
      `Engine-attributed: ${report.engineAttributedCorrectionCount}`,
      `Attribution rate: ${(report.engineAttributionRate * 100).toFixed(1)}%`, "",
      "| Priority | Rule | Corrections | Target |", "|---|---|---:|---|"];
    report.priorities.forEach(item => lines.push(
      `| ${item.priority} | ${item.code} | ${item.corrections} | ${item.target} |`));
    if (!report.priorities.length) lines.push("| — | No engine corrections | 0 | — |");
    return `${lines.join("\n")}\n`;
  }

  return { TARGETS, analyze, markdown, validate };
});
