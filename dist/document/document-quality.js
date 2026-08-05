(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentQuality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DIAGNOSTIC_SCHEMA_VERSION = "1.0.0";
  const SEVERITIES = Object.freeze(["error", "warning", "information"]);

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function normalizeDiagnostic(value) {
    const input = clone(object(value));
    return deepFreeze({
      ...input,
      diagnosticSchemaVersion: typeof input.diagnosticSchemaVersion === "string"
        ? input.diagnosticSchemaVersion
        : DIAGNOSTIC_SCHEMA_VERSION,
      diagnosticId: typeof input.diagnosticId === "string"
        ? input.diagnosticId
        : "",
      ruleId: typeof input.ruleId === "string" ? input.ruleId : "",
      severity: SEVERITIES.includes(input.severity)
        ? input.severity
        : "warning",
      message: typeof input.message === "string" ? input.message : "",
      sourceRef: object(input.sourceRef),
      location: typeof input.location === "string" ? input.location : "",
      details: object(input.details),
      suggestedAction: typeof input.suggestedAction === "string"
        ? input.suggestedAction
        : ""
    });
  }

  function normalizeRule(value) {
    const input = object(value);
    if (typeof input.ruleId !== "string" || !input.ruleId.trim()) {
      throw new TypeError("Document quality rule requires a stable rule ID.");
    }
    if (typeof input.evaluate !== "function") {
      throw new TypeError(`Document quality rule ${input.ruleId} requires evaluate().`);
    }
    if (!SEVERITIES.includes(input.severity)) {
      throw new TypeError(`Document quality rule ${input.ruleId} has invalid severity.`);
    }
    return Object.freeze({
      ...input,
      ruleId: input.ruleId,
      version: typeof input.version === "string" ? input.version : "1.0.0",
      severity: input.severity,
      description: typeof input.description === "string" ? input.description : "",
      targetType: typeof input.targetType === "string"
        ? input.targetType
        : "document",
      evaluate: input.evaluate
    });
  }

  function createRegistry(rules = []) {
    const byId = new Map();
    rules.forEach(value => {
      const rule = normalizeRule(value);
      if (byId.has(rule.ruleId)) {
        throw new Error(`Duplicate document quality rule ID: ${rule.ruleId}.`);
      }
      byId.set(rule.ruleId, rule);
    });
    return Object.freeze({ rules: Object.freeze([...byId.values()]) });
  }

  function extendRegistry(registry, rules) {
    return createRegistry([...(registry?.rules || []), ...(rules || [])]);
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function diagnostic(rule, finding) {
    const sourceRef = clone(object(finding.sourceRef));
    const identity = JSON.stringify({
      ruleId: rule.ruleId,
      sourceRef,
      location: finding.location || "",
      details: finding.details || {}
    });
    return normalizeDiagnostic({
      ...clone(finding),
      diagnosticId: `${rule.ruleId}:${stableHash(identity)}`,
      ruleId: rule.ruleId,
      severity: finding.severity || rule.severity,
      sourceRef
    });
  }

  function summary(findings) {
    const bySeverity = { error: 0, warning: 0, information: 0 };
    const byRule = {};
    const sectionIds = new Set();
    const taskIds = new Set();
    findings.forEach(finding => {
      bySeverity[finding.severity] += 1;
      byRule[finding.ruleId] = (byRule[finding.ruleId] || 0) + 1;
      if (finding.sourceRef.sectionId) {
        sectionIds.add(finding.sourceRef.sectionId);
      }
      if (finding.sourceRef.taskId) taskIds.add(finding.sourceRef.taskId);
    });
    return deepFreeze({
      totalFindings: findings.length,
      bySeverity,
      byRule,
      affectedSections: [...sectionIds].sort(),
      affectedSteps: [...taskIds].sort()
    });
  }

  function analyze(document, plan, registry) {
    const findings = [];
    const diagnosticIds = new Set();
    function add(value) {
      if (diagnosticIds.has(value.diagnosticId)) return;
      diagnosticIds.add(value.diagnosticId);
      findings.push(value);
    }
    (registry?.rules || []).forEach(rule => {
      try {
        const values = rule.evaluate({ document, plan }) || [];
        values.forEach(value => add(diagnostic(rule, value)));
      } catch (error) {
        add(diagnostic({
          ruleId: `quality-rule-execution:${rule.ruleId}`,
          severity: "information"
        }, {
          message: `Quality rule ${rule.ruleId} could not be evaluated.`,
          location: "document",
          sourceRef: { documentId: document?.documentId || "" },
          details: { error: String(error?.message || error) },
          suggestedAction: "Review the quality rule implementation."
        }));
      }
    });
    findings.sort((left, right) =>
      left.ruleId.localeCompare(right.ruleId) ||
      left.diagnosticId.localeCompare(right.diagnosticId));
    const immutableFindings = deepFreeze(findings);
    return deepFreeze({
      diagnosticSchemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
      findings: immutableFindings,
      summary: summary(immutableFindings)
    });
  }

  function serialize(value) {
    return JSON.stringify(value);
  }

  function deserializeDiagnostic(value) {
    return normalizeDiagnostic(JSON.parse(value));
  }

  return {
    DIAGNOSTIC_SCHEMA_VERSION,
    SEVERITIES,
    analyze,
    createRegistry,
    deepFreeze,
    deserializeDiagnostic,
    extendRegistry,
    normalizeDiagnostic,
    serialize,
    summary
  };
});
