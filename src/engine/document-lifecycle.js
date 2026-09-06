(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentLifecycle = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = "1.0.0";
  const STAGE_TYPES = Object.freeze(["document", "action", "state"]);
  const RELATIONSHIP_TYPES = Object.freeze(["creates", "derivedFrom", "postedAs",
    "fulfilledBy", "consumedBy", "produces", "reverses", "returns"]);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const array = value => Array.isArray(value) ? value : [];
  const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const strings = value => [...new Set(array(value).map(String).filter(Boolean))];
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value); }
  function normalize(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    schemaVersion: SCHEMA_VERSION, catalogId: String(value.catalogId || "bc-document-lifecycles"),
    variants: array(value.variants).map(item => ({ ...clone(object(item)), id: String(item.id || ""),
      name: String(item.name || ""), metadata: clone(object(item.metadata)) })),
    lifecycles: array(value.lifecycles).map(item => ({ ...clone(object(item)),
      id: String(item.id || ""), name: String(item.name || ""),
      bcProcessIds: strings(item.bcProcessIds), stages: array(item.stages).map(stage => ({
        ...clone(object(stage)), id: String(stage.id || ""), name: String(stage.name || ""),
        stageType: STAGE_TYPES.includes(stage.stageType) ? stage.stageType : "document",
        documentId: stage.documentId ? String(stage.documentId) : null,
        optional: Boolean(stage.optional), metadata: clone(object(stage.metadata)) })),
      transitions: array(item.transitions).map(transition => ({ ...clone(object(transition)),
        id: String(transition.id || ""), fromStageId: String(transition.fromStageId || ""),
        toStageId: String(transition.toStageId || ""), relationshipType:
          RELATIONSHIP_TYPES.includes(transition.relationshipType)
            ? transition.relationshipType : "derivedFrom",
        optional: Boolean(transition.optional), variantIds: strings(transition.variantIds),
        alternativeGroup: transition.alternativeGroup ? String(transition.alternativeGroup) : null })),
      variants: array(item.variants).map(variant => ({ ...clone(object(variant)),
        variantId: String(variant.variantId || ""), stageIds: strings(variant.stageIds),
        metadata: clone(object(variant.metadata)) })),
      stateModels: array(item.stateModels).map(model => clone(model)),
      metadata: clone(object(item.metadata)) })),
    metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) }); }
  function validate(input, taxonomy = null) { const catalog = normalize(input); const diagnostics = [];
    const variantIds = new Set(catalog.variants.map(item => item.id));
    const lifecycleIds = new Set(); catalog.lifecycles.forEach(lifecycle => {
      if (!lifecycle.id || lifecycleIds.has(lifecycle.id)) diagnostics.push({
        code: "duplicate-or-missing-lifecycle-id", lifecycleId: lifecycle.id || null });
      lifecycleIds.add(lifecycle.id); const stageIds = new Set(); lifecycle.stages.forEach(stage => {
        if (!stage.id || stageIds.has(stage.id)) diagnostics.push({ code: "duplicate-or-missing-stage-id",
          lifecycleId: lifecycle.id, stageId: stage.id || null }); stageIds.add(stage.id);
        if (stage.documentId && taxonomy && !taxonomy.documents.some(document =>
          document.id === stage.documentId)) diagnostics.push({ code: "unknown-lifecycle-document",
          lifecycleId: lifecycle.id, stageId: stage.id, documentId: stage.documentId }); });
      lifecycle.transitions.forEach(transition => { if (!stageIds.has(transition.fromStageId) ||
        !stageIds.has(transition.toStageId)) diagnostics.push({ code: "orphan-lifecycle-transition",
          lifecycleId: lifecycle.id, transitionId: transition.id });
      transition.variantIds.forEach(id => { if (!variantIds.has(id)) diagnostics.push({
        code: "unknown-lifecycle-variant", lifecycleId: lifecycle.id, variantId: id }); }); });
      lifecycle.variants.forEach(variant => { if (!variantIds.has(variant.variantId)) diagnostics.push({
        code: "unknown-lifecycle-variant", lifecycleId: lifecycle.id, variantId: variant.variantId });
      variant.stageIds.forEach(id => { if (!stageIds.has(id)) diagnostics.push({
        code: "unknown-lifecycle-stage", lifecycleId: lifecycle.id, stageId: id }); }); }); });
    return freeze({ valid: diagnostics.length === 0, diagnostics, catalog }); }
  function stageSequence(lifecycle, variantId) { const variant = lifecycle.variants.find(item =>
    item.variantId === variantId); return variant ? variant.stageIds.map(id =>
      lifecycle.stages.find(stage => stage.id === id)).filter(Boolean) : lifecycle.stages; }
  function matchVariant(lifecycle, variantId, observedDocumentIds, observedActions = []) { const expected = stageSequence(
    lifecycle, variantId); const observed = strings(observedDocumentIds); let position = 0;
    const matchedStages = []; observed.forEach(documentId => { const index = expected.findIndex(
      (stage, candidate) => candidate >= position && stage.documentId === documentId);
    if (index >= 0) { matchedStages.push(expected[index]); position = index + 1; } });
    observedActions.forEach(action => { const name = String(action || "").toLowerCase();
      const matched = expected.find(stage => stage.stageType === "action" &&
        (stage.name.toLowerCase().includes(name) || name.includes(stage.name.toLowerCase()) ||
          (name.length >= 5 && stage.name.toLowerCase().startsWith(name.slice(0, 5)))));
      if (matched && !matchedStages.some(stage => stage.id === matched.id)) matchedStages.push(matched); });
    matchedStages.sort((left, right) => expected.findIndex(stage => stage.id === left.id) -
      expected.findIndex(stage => stage.id === right.id));
    const matchedIds = new Set(matchedStages.map(item => item.id)); const allowedTransitions =
      lifecycle.transitions.filter(item => !item.variantIds.length || item.variantIds.includes(variantId));
    const matchedTransitions = allowedTransitions.filter(item => matchedIds.has(item.fromStageId) &&
      matchedIds.has(item.toStageId) && matchedStages.findIndex(stage => stage.id === item.fromStageId) <
      matchedStages.findIndex(stage => stage.id === item.toStageId));
    const required = expected.filter(stage => !stage.optional).length || 1;
    const stageCoverage = Math.min(1, matchedStages.length / Math.max(required, Math.min(3, expected.length)));
    const transitionCoverage = allowedTransitions.length ? Math.min(1,
      matchedTransitions.length / Math.min(3, allowedTransitions.length)) : 0;
    // A shared opening document (for example Purchase Order) is not evidence that
    // warehouse handling is configured. Prefer the least-specific compatible
    // lifecycle until variant-only stages or transitions are actually observed.
    const unmatchedStageCount = Math.max(0, expected.length - matchedStages.length);
    const specificityPenalty = matchedTransitions.length ? 0 :
      Math.min(0.2, unmatchedStageCount * 0.04);
    const confidence = Number(Math.max(0, Math.min(1,
      stageCoverage * 0.45 + transitionCoverage * 0.55 - specificityPenalty)).toFixed(3));
    return freeze({ lifecycleId: lifecycle.id, variantId, confidence,
      matchedStageIds: matchedStages.map(item => item.id),
      matchedDocumentIds: matchedStages.map(item => item.documentId).filter(Boolean),
      matchedTransitions: clone(matchedTransitions), partial: matchedStages.length < expected.length,
      specificityPenalty: Number(specificityPenalty.toFixed(3)),
      explanation: [...matchedStages.map(item => `Matched lifecycle stage ${item.name}`),
        ...matchedTransitions.map(item => `Matched lifecycle transition ${
          lifecycle.stages.find(stage => stage.id === item.fromStageId)?.name} ${item.relationshipType} ${
          lifecycle.stages.find(stage => stage.id === item.toStageId)?.name}`),
        specificityPenalty ? "Variant-specific stages were not observed" : null].filter(Boolean) }); }
  function match(input, observedDocumentIds, options = {}) { const catalog = normalize(input);
    const processId = options.bcProcessId || null; const results = [];
    catalog.lifecycles.filter(item => !processId || item.bcProcessIds.includes(processId))
      .forEach(lifecycle => lifecycle.variants.forEach(variant => results.push(matchVariant(
        lifecycle, variant.variantId, observedDocumentIds, options.observedActions))));
    return freeze(results.filter(item => item.matchedStageIds.length).sort((left, right) =>
      right.confidence - left.confidence || left.variantId.localeCompare(right.variantId))); }
  function stateTransitions(input, documentId) { const catalog = normalize(input); return freeze(
    catalog.lifecycles.flatMap(lifecycle => lifecycle.stateModels.filter(model =>
      model.documentId === documentId).map(model => ({ lifecycleId: lifecycle.id, ...clone(model) })))); }
  return { RELATIONSHIP_TYPES, SCHEMA_VERSION, STAGE_TYPES, match, matchVariant,
    normalize, stageSequence, stateTransitions, validate };
});
