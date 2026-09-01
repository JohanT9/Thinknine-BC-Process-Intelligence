"use strict";

const fs = require("fs");

const SUITE_VERSION = "1.0.0";
const REQUIRED_COVERAGE = Object.freeze([
  "standard-bc", "long-process", "lookup", "value-entry", "dialog",
  "posting", "warehouse", "production", "aptean", "react-control-add-in",
  "language-sv", "language-en", "language-other"
]);
const DEFECT_CATEGORIES = Object.freeze([
  "capture", "normalization", "grouping", "semantic", "screenshot",
  "renderer", "environment"
]);
const COUNT_FIELDS = Object.freeze([
  "expectedObservableInteractions", "capturedExpectedInteractions",
  "normalizedInteractionsSampled", "correctlyNormalizedInteractions",
  "stepGroupsSampled", "correctlyBoundedStepGroups", "generatedSteps",
  "stepsAcceptedWithoutTextEdit", "eligibleScreenshotSteps",
  "screenshotsAcceptedWithoutReplacement", "manualTextEdits",
  "manualScreenshotReplacements", "hiddenOperations", "mergeOperations",
  "splitOperations", "exportedDocuments", "wordPostExportCorrections"
]);
const ENTRY_FIELDS = Object.freeze(["fixtureId", "date", "testerAlias",
  "browserVersion", "bcVersion", "coverage", "counts", "defects"]);
const FORBIDDEN_KEYS = /^(?:company(?:name|id)?|tenant(?:name|id)?|customer(?:name|number|no)?|vendor(?:name|number|no)?|documentnumber|username|useremail|url|screenshots?|instruction(?:text)?|businessvalues?)$/i;

const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
};

function issue(fixtureId, code, details = {}) {
  return freeze({ fixtureId, code, details: clone(details) });
}

function findForbiddenKeys(value, path = "") {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => {
    const next = path ? `${path}.${key}` : key;
    return (FORBIDDEN_KEYS.test(key) ? [next] : [])
      .concat(findForbiddenKeys(item, next));
  });
}

function integer(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateEntry(entry = {}, index = 0) {
  const fixtureId = String(entry.fixtureId || `entry-${index + 1}`);
  const issues = [];
  if (!/^[A-Z0-9][A-Z0-9._-]{2,63}$/.test(fixtureId)) {
    issues.push(issue(fixtureId, "invalid-fixture-id"));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || ""))) {
    issues.push(issue(fixtureId, "invalid-date"));
  }
  if (!/^[A-Z0-9][A-Z0-9._-]{1,31}$/i.test(String(entry.testerAlias || ""))) {
    issues.push(issue(fixtureId, "invalid-tester-alias"));
  }
  if (!/^(?:Edge|Chrome)[ /-]\d+(?:\.\d+){0,3}$/i.test(
    String(entry.browserVersion || ""))) {
    issues.push(issue(fixtureId, "invalid-browser-version"));
  }
  if (!/^\d+(?:\.\d+){0,3}$/.test(String(entry.bcVersion || ""))) {
    issues.push(issue(fixtureId, "invalid-bc-version"));
  }
  const unexpectedFields = Object.keys(entry).filter(key =>
    !ENTRY_FIELDS.includes(key));
  if (unexpectedFields.length) issues.push(issue(fixtureId,
    "unexpected-entry-fields", { fields: unexpectedFields }));
  const coverage = Array.isArray(entry.coverage) ? [...new Set(entry.coverage)] : [];
  const unknownCoverage = coverage.filter(value => !REQUIRED_COVERAGE.includes(value));
  if (!coverage.length) issues.push(issue(fixtureId, "missing-coverage"));
  if (unknownCoverage.length) issues.push(issue(fixtureId, "unknown-coverage", {
    values: unknownCoverage }));
  for (const field of COUNT_FIELDS) {
    if (!integer(entry.counts?.[field])) issues.push(issue(fixtureId,
      "invalid-count", { field }));
  }
  for (const [numerator, denominator] of [
    ["capturedExpectedInteractions", "expectedObservableInteractions"],
    ["correctlyNormalizedInteractions", "normalizedInteractionsSampled"],
    ["correctlyBoundedStepGroups", "stepGroupsSampled"],
    ["stepsAcceptedWithoutTextEdit", "generatedSteps"],
    ["screenshotsAcceptedWithoutReplacement", "eligibleScreenshotSteps"],
    ["wordPostExportCorrections", "exportedDocuments"]
  ]) {
    if (integer(entry.counts?.[numerator]) && integer(entry.counts?.[denominator]) &&
        entry.counts[numerator] > entry.counts[denominator]) {
      issues.push(issue(fixtureId, "count-exceeds-denominator", {
        numerator, denominator }));
    }
  }
  const defects = Array.isArray(entry.defects) ? entry.defects : [];
  defects.forEach((defect, defectIndex) => {
    const unexpectedDefectFields = Object.keys(defect || {}).filter(key =>
      !["category", "reference"].includes(key));
    if (unexpectedDefectFields.length) issues.push(issue(fixtureId,
      "unexpected-defect-fields", { defectIndex,
        fields: unexpectedDefectFields }));
    if (!DEFECT_CATEGORIES.includes(defect?.category)) issues.push(issue(fixtureId,
      "invalid-defect-category", { defectIndex }));
    if (!/^[A-Z0-9][A-Z0-9._-]{2,63}$/i.test(String(defect?.reference || ""))) {
      issues.push(issue(fixtureId, "unsafe-defect-reference", { defectIndex }));
    }
  });
  const forbidden = findForbiddenKeys(entry);
  if (forbidden.length) issues.push(issue(fixtureId, "forbidden-customer-data", {
    paths: forbidden }));
  return freeze({ fixtureId, coverage, valid: issues.length === 0, issues });
}

function ratio(numerator, denominator, multiplier = 1) {
  return freeze({ numerator, denominator,
    value: denominator ? (numerator / denominator) * multiplier : null });
}

function evaluate(dataset = {}, options = {}) {
  const entries = Array.isArray(dataset.entries) ? dataset.entries : [];
  const results = entries.map(validateEntry);
  const fixtureIds = entries.map(entry => String(entry.fixtureId || ""));
  const duplicates = [...new Set(fixtureIds.filter((value, index) =>
    value && fixtureIds.indexOf(value) !== index))];
  const totals = Object.fromEntries(COUNT_FIELDS.map(field => [field,
    entries.reduce((sum, entry) => sum + (integer(entry.counts?.[field])
      ? entry.counts[field] : 0), 0)]));
  const coverage = [...new Set(results.flatMap(result => result.coverage))].sort();
  const requiredCoverage = options.requiredCoverage || REQUIRED_COVERAGE;
  const missingCoverage = requiredCoverage.filter(value => !coverage.includes(value));
  const minimumRecordings = options.minimumRecordings ?? 24;
  const gateIssues = [];
  const unexpectedRootFields = Object.keys(dataset || {}).filter(key =>
    !["schemaVersion", "entries"].includes(key));
  if (unexpectedRootFields.length) gateIssues.push(issue("suite",
    "unexpected-workbook-fields", { fields: unexpectedRootFields }));
  if (dataset.schemaVersion !== "1.0.0") gateIssues.push(issue("suite",
    "unsupported-schema", { actual: dataset.schemaVersion || null }));
  if (entries.length < minimumRecordings) gateIssues.push(issue("suite",
    "insufficient-recordings", { expected: minimumRecordings,
      actual: entries.length }));
  if (missingCoverage.length) gateIssues.push(issue("suite",
    "missing-coverage-categories", { values: missingCoverage }));
  if (duplicates.length) gateIssues.push(issue("suite", "duplicate-fixture-ids", {
    values: duplicates }));
  const issues = results.flatMap(result => result.issues).concat(gateIssues);
  const defectCounts = Object.fromEntries(DEFECT_CATEGORIES.map(category => [category,
    entries.flatMap(entry => Array.isArray(entry.defects) ? entry.defects : [])
      .filter(defect => defect?.category === category).length]));
  return freeze({ suiteVersion: SUITE_VERSION,
    schemaVersion: dataset.schemaVersion || null,
    valid: issues.length === 0, recordingCount: entries.length,
    minimumRecordings, coverage, missingCoverage, totals,
    kpis: {
      generatedStepAcceptance: ratio(totals.stepsAcceptedWithoutTextEdit,
        totals.generatedSteps),
      screenshotAcceptance: ratio(totals.screenshotsAcceptedWithoutReplacement,
        totals.eligibleScreenshotSteps),
      manualEditsPerTenSteps: ratio(totals.manualTextEdits,
        totals.generatedSteps, 10),
      wordCorrectionsPerDocument: ratio(totals.wordPostExportCorrections,
        totals.exportedDocuments),
      captureCompleteness: ratio(totals.capturedExpectedInteractions,
        totals.expectedObservableInteractions)
    }, defectCounts, results, issues });
}

function assertValid(dataset, options) {
  const report = evaluate(dataset, options);
  if (!report.valid) {
    const error = new Error("Product validation suite failed.");
    error.code = "PRODUCT_VALIDATION_FAILED";
    error.report = report;
    throw error;
  }
  return report;
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node scripts/product-validation-suite.js <sanitized-workbook.json>");
    process.exitCode = 2;
  } else {
    const report = evaluate(JSON.parse(fs.readFileSync(input, "utf8")));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.valid) process.exitCode = 1;
  }
}

module.exports = { COUNT_FIELDS, DEFECT_CATEGORIES, ENTRY_FIELDS, REQUIRED_COVERAGE,
  SUITE_VERSION, assertValid, evaluate, findForbiddenKeys, validateEntry };
