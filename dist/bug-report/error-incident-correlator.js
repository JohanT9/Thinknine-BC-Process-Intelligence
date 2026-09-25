(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ErrorIncidentCorrelator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const CORRELATOR_VERSION = "1.0.0";
  const STRONG_IDENTIFIER_KEYS = Object.freeze([
    "clientActivityId", "internalSessionId", "applicationInsightsSessionId",
    "correlationId", "requestId", "sessionId"
  ]);
  const confidenceRank = Object.freeze({ low: 1, medium: 2, high: 3 });
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const clean = value => String(value || "").trim().toLocaleLowerCase();
  const deepFreeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };
  function hash(value) {
    let result = 2166136261;
    for (const character of String(value)) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(16).padStart(8, "0");
  }
  function timestamp(value) {
    const result = Date.parse(String(value || ""));
    return Number.isFinite(result) ? result : null;
  }
  function identifierMap(evidence) {
    const source = evidence.technicalIdentifiers || {};
    const network = evidence.networkContext || {};
    const client = evidence.clientContext || {};
    return new Map(STRONG_IDENTIFIER_KEYS.flatMap(key => {
      const value = clean(source[key] || network[key] || client[key]);
      return value ? [[key, value]] : [];
    }));
  }
  function contextValues(evidence) {
    const network = evidence.networkContext || {};
    const client = evidence.clientContext || {};
    return new Set([
      network.url, network.pageId, network.company,
      client.topUrl, client.frameUrl, client.url, client.pageId, client.company
    ].map(clean).filter(Boolean));
  }
  function comparePair(left, right) {
    const reasons = [];
    let score = 0;
    let confidence = "low";
    const leftIds = identifierMap(left);
    const rightIds = identifierMap(right);
    for (const [key, value] of leftIds) {
      if (rightIds.get(key) === value) {
        reasons.push({ code: "shared-technical-identifier", field: key,
          confidence: "high" });
        score = Math.max(score, 100);
        confidence = "high";
      }
    }
    const leftAction = clean(left.precedingAction?.eventId);
    const rightAction = clean(right.precedingAction?.eventId);
    if (leftAction && leftAction === rightAction) {
      reasons.push({ code: "same-preceding-action", field: "precedingAction.eventId",
        confidence: "high" });
      score = Math.max(score, 90);
      confidence = "high";
    }
    const leftTime = timestamp(left.timestamp);
    const rightTime = timestamp(right.timestamp);
    const deltaMs = leftTime == null || rightTime == null
      ? null : Math.abs(leftTime - rightTime);
    const leftContext = contextValues(left);
    const sharedContext = [...contextValues(right)].find(value => leftContext.has(value));
    if (sharedContext && deltaMs != null && deltaMs <= 5000) {
      reasons.push({ code: "shared-context-near-time", field: "context",
        confidence: "medium", deltaMs });
      score = Math.max(score, 70);
      if (confidence !== "high") confidence = "medium";
    }
    if (deltaMs != null && deltaMs <= 1500 &&
        left.source?.type !== right.source?.type) {
      reasons.push({ code: "cross-source-near-time", field: "timestamp",
        confidence: "medium", deltaMs });
      score = Math.max(score, 60);
      if (confidence !== "high") confidence = "medium";
    }
    return { linked: score >= 60, score, confidence, reasons };
  }
  function evidenceOrder(left, right) {
    const leftTime = timestamp(left.timestamp);
    const rightTime = timestamp(right.timestamp);
    if (leftTime != null && rightTime != null && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    if (leftTime != null) return -1;
    if (rightTime != null) return 1;
    return left.evidenceId.localeCompare(right.evidenceId);
  }
  function primaryEvidence(items, observedById) {
    return [...items].sort((left, right) => {
      const leftAnalysis = observedById.get(left.evidenceId)?.classification || {};
      const rightAnalysis = observedById.get(right.evidenceId)?.classification || {};
      const priority = Number(rightAnalysis.priority || 0) - Number(leftAnalysis.priority || 0);
      if (priority) return priority;
      const confidence = (confidenceRank[rightAnalysis.confidence] || 0) -
        (confidenceRank[leftAnalysis.confidence] || 0);
      if (confidence) return confidence;
      return evidenceOrder(right, left);
    })[0]?.evidenceId || null;
  }
  function correlate(normalizedEvidence = [], observedErrors = [], context = {}) {
    const evidence = [...normalizedEvidence].sort(evidenceOrder);
    const parent = evidence.map((_, index) => index);
    const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
    const union = (left, right) => {
      const leftRoot = find(left); const rightRoot = find(right);
      if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
    };
    const links = [];
    for (let left = 0; left < evidence.length; left += 1) {
      for (let right = left + 1; right < evidence.length; right += 1) {
        const comparison = comparePair(evidence[left], evidence[right]);
        if (!comparison.linked) continue;
        union(left, right);
        links.push({ leftEvidenceId: evidence[left].evidenceId,
          rightEvidenceId: evidence[right].evidenceId, ...comparison });
      }
    }
    const groups = new Map();
    evidence.forEach((item, index) => {
      const root = find(index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(item);
    });
    const observedById = new Map(observedErrors.map(item => [item.evidenceId, item]));
    const incidents = [...groups.values()].map(items => {
      const ids = items.map(item => item.evidenceId).sort();
      const incidentLinks = links.filter(link => ids.includes(link.leftEvidenceId) &&
        ids.includes(link.rightEvidenceId));
      const confidence = incidentLinks.some(link => link.confidence === "high")
        ? "high" : incidentLinks.length ? "medium" : "low";
      const classifications = [...new Set(ids.map(id =>
        observedById.get(id)?.classification?.type).filter(Boolean))];
      const errorCodes = [...new Set(ids.map(id =>
        observedById.get(id)?.classification?.errorCode).filter(Boolean))];
      return { schemaVersion: SCHEMA_VERSION,
        incidentId: `error-incident:${hash(ids.join("|"))}`,
        recordingId: String(context.recordingId || items[0]?.recordingId || ""),
        evidenceIds: ids,
        primaryEvidenceId: primaryEvidence(items, observedById),
        classifications, errorCodes,
        correlation: { confidence,
          reasons: incidentLinks.flatMap(link => link.reasons.map(reason => ({
            ...clone(reason), evidenceIds: [link.leftEvidenceId, link.rightEvidenceId]
          }))) },
        timeline: items.map(item => ({ evidenceId: item.evidenceId,
          timestamp: item.timestamp || null, sourceType: item.source?.type || "unknown" })) };
    }).sort((left, right) => {
      const leftTime = timestamp(left.timeline[0]?.timestamp);
      const rightTime = timestamp(right.timeline[0]?.timestamp);
      if (leftTime != null && rightTime != null && leftTime !== rightTime) return leftTime - rightTime;
      return left.incidentId.localeCompare(right.incidentId);
    });
    return deepFreeze({ schemaVersion: SCHEMA_VERSION,
      correlatorVersion: CORRELATOR_VERSION,
      recordingId: String(context.recordingId || ""), incidents,
      uncorrelatedEvidenceIds: incidents.filter(item => item.evidenceIds.length === 1)
        .flatMap(item => item.evidenceIds) });
  }
  return { CORRELATOR_VERSION, SCHEMA_VERSION, STRONG_IDENTIFIER_KEYS,
    comparePair, correlate, hash };
});
