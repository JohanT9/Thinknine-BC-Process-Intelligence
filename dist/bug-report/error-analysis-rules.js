(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ErrorAnalysisRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RULESET_VERSION = "1.0.0";
  const text = value => typeof value === "string" ? value : "";
  const hasDiagnosticCallStack = diagnostic => Boolean(
    diagnostic?.summary?.callStackAvailable || diagnostic?.callStack?.frames?.length
  );
  const rule = value => Object.freeze({
    strengtheningEvidence: [], requiredEvidence: [], ...value
  });

  const BUILT_IN_RULES = Object.freeze([
    rule({ id: "al-call-stack-present", priority: 1000,
      classification: "al-runtime", confidence: "high",
      reasonCode: "captured-call-stack",
      requiredEvidence: ["callStack.available"],
      strengtheningEvidence: ["technicalIdentifiers.internalSessionId"],
      matches: (evidence, diagnostic) => Boolean(
        evidence.callStack?.available || hasDiagnosticCallStack(diagnostic)) }),
    rule({ id: "captured-validation-category", priority: 900,
      classification: "data-validation", confidence: "high",
      reasonCode: "captured-error-category",
      requiredEvidence: ["category=validation"],
      strengtheningEvidence: ["precedingAction.eventId", "screenshot.assetId"],
      matches: evidence => evidence.category === "validation" }),
    rule({ id: "captured-permission-category", priority: 890,
      classification: "permission", confidence: "high",
      reasonCode: "captured-error-category",
      requiredEvidence: ["category=permission"],
      strengtheningEvidence: ["technicalIdentifiers.clientActivityId"],
      matches: evidence => evidence.category === "permission" }),
    rule({ id: "captured-network-source", priority: 880,
      classification: "integration-network", confidence: "high",
      reasonCode: "captured-source-type",
      requiredEvidence: ["source.type=network"],
      strengtheningEvidence: ["networkContext.status", "networkContext.url"],
      matches: evidence => evidence.source?.type === "network" }),
    rule({ id: "captured-client-source", priority: 870,
      classification: "client-technical", confidence: "high",
      reasonCode: "captured-source-type",
      requiredEvidence: ["source.type=client"],
      strengtheningEvidence: ["clientContext.url", "clientContext.stack"],
      matches: evidence => evidence.source?.type === "client" }),
    rule({ id: "captured-posting-category", priority: 860,
      classification: "business-central-posting", confidence: "high",
      reasonCode: "captured-error-category",
      requiredEvidence: ["category=posting"],
      strengtheningEvidence: ["callStack.available", "technicalIdentifiers.clientActivityId"],
      matches: evidence => evidence.category === "posting" }),
    rule({ id: "captured-runtime-category", priority: 850,
      classification: "business-central-runtime", confidence: "high",
      reasonCode: "captured-error-category",
      requiredEvidence: ["category=runtime"],
      strengtheningEvidence: ["callStack.available", "technicalIdentifiers.internalSessionId"],
      matches: evidence => evidence.category === "runtime" }),
    rule({ id: "validation-message-pattern", priority: 700,
      classification: "data-validation", confidence: "medium",
      reasonCode: "message-pattern",
      requiredEvidence: ["message.raw"],
      strengtheningEvidence: ["category", "precedingAction.eventId"],
      matches: evidence => /(?:must have a value|måste ha ett värde|required|cannot be empty|får inte vara tom)/iu
        .test(text(evidence.message?.raw)) }),
    rule({ id: "permission-message-pattern", priority: 690,
      classification: "permission", confidence: "medium",
      reasonCode: "message-pattern",
      requiredEvidence: ["message.raw"],
      strengtheningEvidence: ["category", "technicalIdentifiers.clientActivityId"],
      matches: evidence => /(?:permission|permissions|behörighet|behörigheter|not authorized|access denied)/iu
        .test(text(evidence.message?.raw)) }),
    rule({ id: "network-message-pattern", priority: 680,
      classification: "integration-network", confidence: "medium",
      reasonCode: "message-pattern",
      requiredEvidence: ["message.raw"],
      strengtheningEvidence: ["source.type", "networkContext.status", "networkContext.url"],
      matches: evidence => /(?:http\s*[45]\d\d|network|fetch failed|connection|timeout|timed out|nätverk|anslutning)/iu
        .test(text(evidence.message?.raw)) }),
    rule({ id: "client-error-message-pattern", priority: 670,
      classification: "client-technical", confidence: "medium",
      reasonCode: "message-pattern",
      requiredEvidence: ["message.raw"],
      strengtheningEvidence: ["source.type", "clientContext.stack"],
      matches: evidence => /(?:javascript|typeerror|referenceerror|syntaxerror|uncaught)/iu
        .test(text(evidence.message?.raw)) }),
    rule({ id: "insufficient-evidence", priority: 0,
      classification: "unclassified-error", confidence: "low",
      reasonCode: "no-specific-rule-matched",
      strengtheningEvidence: ["message.raw", "category", "source.type",
        "technicalIdentifiers", "callStack.available"],
      matches: () => true })
  ]);

  function validate(rules) {
    if (!Array.isArray(rules) || !rules.length) {
      throw new TypeError("At least one error-analysis rule is required.");
    }
    const ids = new Set();
    for (const item of rules) {
      if (!item?.id || !Number.isFinite(item.priority) ||
          typeof item.matches !== "function" || !item.classification ||
          !item.confidence || !item.reasonCode) {
        throw new TypeError("Invalid error-analysis rule.");
      }
      if (ids.has(item.id)) throw new TypeError(`Duplicate error-analysis rule: ${item.id}`);
      ids.add(item.id);
    }
  }

  function createRegistry(rules = BUILT_IN_RULES) {
    const normalized = rules.map(item => rule(item));
    validate(normalized);
    const ordered = normalized.sort((left, right) =>
      right.priority - left.priority || left.id.localeCompare(right.id));
    return Object.freeze({
      version: RULESET_VERSION,
      rules: Object.freeze(ordered.map(item => Object.freeze({ ...item }))),
      evaluate(evidence, diagnostic = {}) {
        const matched = ordered.find(item => item.matches(evidence, diagnostic));
        return Object.freeze({ type: matched.classification,
          confidence: matched.confidence, ruleId: matched.id,
          priority: matched.priority, reasonCode: matched.reasonCode,
          requiredEvidence: [...matched.requiredEvidence],
          strengtheningEvidence: [...matched.strengtheningEvidence],
          rulesetVersion: RULESET_VERSION });
      }
    });
  }

  const registry = createRegistry();
  return { BUILT_IN_RULES, RULESET_VERSION, createRegistry,
    evaluate: registry.evaluate, validate };
});
