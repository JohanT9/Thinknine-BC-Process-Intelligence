(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ErrorPrivacyClassifier = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const CLASSIFIER_VERSION = "1.0.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set(values)];
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
  const bearerPattern = /\b(Bearer\s+)[A-Z0-9._~+/=-]+/giu;
  const namedSecretPattern = /\b(access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|api[_ -]?key|password)\b\s*[:=]\s*([^\s,;&]+)/giu;
  const querySecretPattern = /([?&](?:access_token|refresh_token|client_secret|api_key|code)=)[^&#\s]+/giu;
  const matches = (pattern, value) => { pattern.lastIndex = 0;
    const result = pattern.test(value); pattern.lastIndex = 0; return result; };
  const keyPart = path => String(path).split(".").pop().replace(/\[\d+\]/gu, "")
    .replace(/[^a-z0-9]/giu, "").toLowerCase();
  const isPersonalKey = path => /^(?:user(?:name|email|id)?|email|createdby|modifiedby|contact)/u
    .test(keyPart(path));
  const isBusinessKey = path => /^(?:customer|vendor|item|order|company|document|account|product|description|name|number|no)/u
    .test(keyPart(path));
  const isTechnicalKey = path => /^(?:internal)?(?:session|activity|correlation|request|tenant|environment|recording|event|trace)(?:id)?/u
    .test(keyPart(path));
  const isSecretKey = path => /(?:authorization|token|secret|password|apikey|credential)/u
    .test(keyPart(path));

  function sanitizeString(value) {
    return String(value)
      .replace(bearerPattern, "$1[REDACTED]")
      .replace(namedSecretPattern, "$1=[REDACTED]")
      .replace(querySecretPattern, "$1[REDACTED]")
      .replace(emailPattern, "[REDACTED-EMAIL]");
  }

  function sanitize(value, path = "") {
    if (value == null) return value;
    if (typeof value === "string") {
      if (isSecretKey(path)) return "[REDACTED]";
      return sanitizeString(value);
    }
    if (Array.isArray(value)) return value.map((item, index) =>
      sanitize(item, `${path}[${index}]`));
    if (typeof value === "object") return Object.keys(value).reduce((out, key) => {
      if (key === "rawEvidence") return out;
      out[key] = sanitize(value[key], path ? `${path}.${key}` : key);
      return out;
    }, {});
    return value;
  }

  function finding(path, category, action, detectorId, confidence = "high") {
    return Object.freeze({ path, category, action, detectorId, confidence });
  }

  function inspect(value, path, findings) {
    if (value == null) return;
    if (isSecretKey(path)) {
      findings.push(finding(path, "secret", "redact", "secret-key"));
      return;
    }
    if (typeof value === "string") {
      if (matches(bearerPattern, value) || matches(namedSecretPattern, value) ||
          matches(querySecretPattern, value)) {
        findings.push(finding(path, "secret", "redact", "secret-pattern"));
      }
      if (matches(emailPattern, value) || isPersonalKey(path)) {
        findings.push(finding(path, "personal-data", "redact", "personal-data"));
      }
      if (isBusinessKey(path)) {
        findings.push(finding(path, "business-data", "review", "business-field"));
      }
      if (isTechnicalKey(path)) {
        findings.push(finding(path, "technical-identifier", "include",
          "technical-identifier"));
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => inspect(item, `${path}[${index}]`, findings));
      return;
    }
    if (typeof value === "object") Object.keys(value)
      .filter(key => key !== "rawEvidence")
      .forEach(key => inspect(value[key], path ? `${path}.${key}` : key, findings));
  }

  function assess(evidence = {}) {
    const evidenceId = String(evidence.evidenceId || evidence.errorEvidenceId || "");
    const findings = [];
    inspect(evidence, "evidence", findings);
    const screenshotAssetId = evidence.screenshot?.assetId ||
      evidence.errorScreenshotAssetId;
    if (screenshotAssetId) findings.push(finding("evidence.screenshot",
      "screenshot", "review", "screenshot-content", "medium"));
    const deduplicated = [...new Map(findings.map(item =>
      [`${item.path}:${item.category}:${item.action}`, item])).values()];
    const categories = unique(deduplicated.map(item => item.category));
    return Object.freeze({ schemaVersion: SCHEMA_VERSION,
      classifierVersion: CLASSIFIER_VERSION, evidenceId,
      findings: Object.freeze(deduplicated), categories: Object.freeze(categories),
      requiresReview: deduplicated.some(item => item.action === "review"),
      requiresRedaction: deduplicated.some(item => item.action === "redact"),
      exportPolicy: Object.freeze({ defaultAction: "include",
        secretAction: "redact", personalDataAction: "redact",
        businessDataAction: "review", screenshotAction: "review" }),
      provenance: Object.freeze({ authorship: "derived",
        sourceRefs: evidenceId ? [evidenceId] : [] }) });
  }

  function summarize(assessments = []) {
    const categories = unique(assessments.flatMap(item => item.categories || []));
    return Object.freeze({ schemaVersion: SCHEMA_VERSION,
      classifierVersion: CLASSIFIER_VERSION, categories,
      requiresReview: assessments.some(item => item.requiresReview),
      requiresRedaction: assessments.some(item => item.requiresRedaction),
      evidenceCount: assessments.length });
  }

  function safeProjection(value) { return sanitize(clone(value)); }

  return { SCHEMA_VERSION, CLASSIFIER_VERSION, assess, safeProjection,
    sanitizeString, summarize };
});
