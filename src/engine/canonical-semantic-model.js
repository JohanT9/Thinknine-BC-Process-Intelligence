(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CanonicalSemanticModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MODEL_VERSION = "1.0.0";
  const CLASSIFICATION_SOURCES = Object.freeze(["rule", "metadata", "AI", "manual"]);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const array = value => Array.isArray(value) ? value : [];
  const strings = value => [...new Set(array(value).map(String).map(item => item.trim()).filter(Boolean))];

  function stableId(prefix, parts) {
    const text = parts.filter(Boolean).join("|");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${prefix}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function reference(value) {
    if (value == null || value === "") return null;
    if (typeof value === "string") return { id: value, name: null };
    const source = object(value);
    const id = String(source.id || source.entityId || "").trim();
    const name = String(source.name || "").trim() || null;
    if (!id && !name) return null;
    return { ...clone(source), id: id || null, name };
  }

  function confidence(value) {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(1, Number(value)));
  }

  function classificationSource(value) {
    const source = String(value || "").trim();
    if (!CLASSIFICATION_SOURCES.includes(source)) {
      throw new Error(`Unsupported classification source: ${source || "(empty)"}`);
    }
    return source;
  }

  function normalizeClassification(input = {}) {
    const value = clone(object(input));
    const sourceEventIds = strings(value.sourceEventIds);
    const source = classificationSource(value.classificationSource);
    const processStep = reference(value.processStep);
    const classificationId = String(value.classificationId || "").trim() || stableId(
      "classification", [...sourceEventIds, processStep?.id, source]
    );
    return { ...value, classificationId, sourceEventIds,
      businessDomain: reference(value.businessDomain),
      businessProcess: reference(value.businessProcess),
      bcProcess: reference(value.bcProcess), processStep,
      businessDocument: reference(value.businessDocument),
      businessAction: reference(value.businessAction),
      businessEntity: reference(value.businessEntity),
      processRole: reference(value.processRole), confidence: confidence(value.confidence),
      classificationSource: source,
      classificationMetadata: clone(object(value.classificationMetadata)),
      metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) };
  }

  function normalizeTransition(input = {}) {
    const value = clone(object(input));
    const sourceEventIds = strings(value.sourceEventIds);
    const source = classificationSource(value.classificationSource);
    const document = reference(value.businessDocument);
    const transitionId = String(value.transitionId || "").trim() || stableId(
      "transition", [...sourceEventIds, document?.id, JSON.stringify(value.fromState),
        JSON.stringify(value.toState)]
    );
    return { ...value, transitionId, sourceEventIds, businessDocument: document,
      businessEntity: reference(value.businessEntity),
      fromState: clone(value.fromState ?? null), toState: clone(value.toState ?? null),
      confidence: confidence(value.confidence), classificationSource: source,
      classificationMetadata: clone(object(value.classificationMetadata)),
      metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) };
  }

  function normalize(input = {}) {
    const value = clone(object(input));
    return { ...value, modelVersion: MODEL_VERSION,
      classifications: array(value.classifications).map(normalizeClassification),
      classificationHistory: array(value.classificationHistory).map(item => ({ ...clone(item),
        classification: normalizeClassification(item.classification || item) })),
      documentStateTransitions: array(value.documentStateTransitions).map(normalizeTransition),
      metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) };
  }

  function upsertClassification(input, classification) {
    const result = normalize(input);
    const next = normalizeClassification(classification);
    const index = result.classifications.findIndex(item =>
      item.classificationId === next.classificationId);
    if (index >= 0) {
      const previous = result.classifications[index];
      result.classificationHistory.push({ classification: previous,
        supersededBy: next.classificationId,
        supersededAt: next.metadata?.classifiedAt || null });
      result.classifications[index] = next;
    } else result.classifications.push(next);
    return result;
  }

  function upsertDocumentStateTransition(input, transition) {
    const result = normalize(input);
    const next = normalizeTransition(transition);
    const index = result.documentStateTransitions.findIndex(item =>
      item.transitionId === next.transitionId);
    if (index >= 0) result.documentStateTransitions[index] = next;
    else result.documentStateTransitions.push(next);
    return result;
  }

  function forEvent(input, eventId) {
    const semantic = normalize(input);
    const id = String(eventId);
    return { classifications: semantic.classifications.filter(item =>
      item.sourceEventIds.includes(id)),
    documentStateTransitions: semantic.documentStateTransitions.filter(item =>
      item.sourceEventIds.includes(id)) };
  }

  return { CLASSIFICATION_SOURCES, MODEL_VERSION, forEvent, normalize,
    normalizeClassification, normalizeTransition, upsertClassification,
    upsertDocumentStateTransition };
});
