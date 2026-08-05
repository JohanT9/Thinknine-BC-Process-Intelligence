(function (root, factory) {
  const quality = typeof module === "object" && module.exports
    ? require("./document-quality")
    : root.T9DocumentQuality;
  const api = factory(quality);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentQualityValidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (quality) {
  function issue(issues, code, path, message) {
    issues.push({ code, path, message, severity: "error" });
  }

  function validateDiagnostic(value, path, ids, issues) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      issue(issues, "malformed-diagnostic", path,
        "Diagnostic must be an object.");
      return;
    }
    for (const field of ["diagnosticId", "ruleId", "message", "location"]) {
      if (typeof value[field] !== "string" || !value[field].trim()) {
        issue(issues, "missing-diagnostic-field", `${path}.${field}`,
          `Diagnostic requires ${field}.`);
      }
    }
    if (ids.has(value.diagnosticId)) {
      issue(issues, "duplicate-diagnostic-id", `${path}.diagnosticId`,
        `Duplicate diagnostic ID: ${value.diagnosticId}.`);
    } else if (value.diagnosticId) {
      ids.add(value.diagnosticId);
    }
    if (!quality.SEVERITIES.includes(value.severity)) {
      issue(issues, "invalid-diagnostic-severity", `${path}.severity`,
        "Diagnostic severity must be error, warning or information.");
    }
    if (!value.sourceRef || typeof value.sourceRef !== "object" ||
        Array.isArray(value.sourceRef)) {
      issue(issues, "invalid-diagnostic-source", `${path}.sourceRef`,
        "Diagnostic source reference must be an object.");
    }
  }

  function validate(value) {
    const issues = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { valid: false, issues: [{
        code: "malformed-quality-result",
        path: "$",
        message: "Quality result must be an object.",
        severity: "error"
      }] };
    }
    if (typeof value.diagnosticSchemaVersion !== "string" ||
        !value.diagnosticSchemaVersion.trim()) {
      issue(issues, "missing-diagnostic-schema-version",
        "$.diagnosticSchemaVersion",
        "Quality result requires a diagnostic schema version.");
    }
    const ids = new Set();
    if (!Array.isArray(value.findings)) {
      issue(issues, "malformed-findings", "$.findings",
        "Quality findings must be an array.");
    } else {
      value.findings.forEach((finding, index) =>
        validateDiagnostic(finding, `$.findings[${index}]`, ids, issues));
    }
    if (!value.summary || typeof value.summary !== "object" ||
        value.summary.totalFindings !== value.findings?.length) {
      issue(issues, "invalid-quality-summary", "$.summary",
        "Quality summary must match the findings collection.");
    }
    return { valid: issues.length === 0, issues };
  }

  return { validate };
});
