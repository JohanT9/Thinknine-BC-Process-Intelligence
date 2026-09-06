(function (root, factory) {
  const recognition = typeof module === "object" && module.exports
    ? require("./bc-process-recognition-engine") : root.T9BCProcessRecognitionEngine;
  const taxonomySeed = typeof module === "object" && module.exports
    ? require("./business-central-process-taxonomy-seed").seed
    : root.T9BusinessCentralProcessTaxonomySeed.seed;
  const api = factory(recognition, taxonomySeed);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReferenceProcessLibrary = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (recognition, taxonomySeed) {
  "use strict";
  const SCHEMA_VERSION = "1.0.0";
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const array = value => Array.isArray(value) ? value : [];
  const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const strings = value => [...new Set(array(value).map(String).map(item => item.trim()).filter(Boolean))];
  const words = value => String(value || "").toLowerCase().replace(/[^a-z0-9åäöæø]+/g, " ").trim();
  const DOCUMENT_DOMAIN_ANCHORS = Object.freeze({
    "document:purchase-order": "domain:source-to-pay",
    "document:purchase-invoice": "domain:source-to-pay",
    "document:posted-purchase-invoice": "domain:source-to-pay",
    "document:sales-order": "domain:order-to-cash",
    "document:sales-invoice": "domain:order-to-cash",
    "document:posted-sales-invoice": "domain:order-to-cash",
    "document:transfer-order": "domain:transfers",
    "document:transfer-shipment": "domain:transfers",
    "document:transfer-receipt": "domain:transfers",
    "document:production-order": "domain:plan-to-produce",
    "document:assembly-order": "domain:assembly",
    "document:planning-worksheet": "domain:forecast-to-plan"
  });
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value); }
  function normalizeTransition(value = {}) { return { ...clone(object(value)),
    from: String(value.from || ""), to: String(value.to || ""),
    relationshipType: String(value.relationshipType || "derivedFrom") }; }
  function normalizeReference(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    id: String(value.id || ""), name: String(value.name || ""), domain: String(value.domain || ""),
    description: String(value.description || ""),
    startingDocument: value.startingDocument ? String(value.startingDocument) : null,
    endingDocument: value.endingDocument ? String(value.endingDocument) : null,
    expectedDocuments: strings(value.expectedDocuments), optionalDocuments: strings(value.optionalDocuments),
    expectedActions: strings(value.expectedActions), optionalActions: strings(value.optionalActions),
    expectedTransitions: array(value.expectedTransitions).map(normalizeTransition),
    variants: strings(value.variants), configurationRequirements: strings(value.configurationRequirements),
    metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) }); }
  function normalize(input = {}) { const value = clone(object(input)); return freeze({ ...value,
    schemaVersion: SCHEMA_VERSION, libraryId: String(value.libraryId || "reference-processes"),
    namespace: String(value.namespace || "custom"),
    references: array(value.references).map(normalizeReference),
    metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) }); }
  function validate(input) { const library = normalize(input); const diagnostics = []; const ids = new Set();
    library.references.forEach(reference => { if (!reference.id || ids.has(reference.id)) diagnostics.push({
      code: "duplicate-or-missing-reference-id", referenceId: reference.id || null }); ids.add(reference.id);
    if (!reference.name || !reference.domain) diagnostics.push({ code: "incomplete-reference-process",
      referenceId: reference.id }); if (!reference.expectedDocuments.length &&
      !reference.expectedActions.length) diagnostics.push({ code: "empty-reference-process",
        referenceId: reference.id }); if (reference.startingDocument &&
      ![...reference.expectedDocuments, ...reference.optionalDocuments].includes(reference.startingDocument))
      diagnostics.push({ code: "invalid-reference-boundary", referenceId: reference.id,
        field: "startingDocument" }); if (reference.endingDocument &&
      ![...reference.expectedDocuments, ...reference.optionalDocuments].includes(reference.endingDocument))
      diagnostics.push({ code: "invalid-reference-boundary", referenceId: reference.id,
        field: "endingDocument" }); });
    return freeze({ valid: diagnostics.length === 0, diagnostics, library }); }
  function create(input) { const checked = validate(input); if (!checked.valid) { const error = new Error(
    `Invalid reference process library (${checked.diagnostics.length} diagnostics).`);
    error.diagnostics = checked.diagnostics; throw error; } const library = checked.library;
    const byId = new Map(library.references.map(item => [item.id, item]));
    return freeze({ library, get(id) { return byId.get(String(id || "")) || null; },
      list(domain = null) { return library.references.filter(item => !domain || item.domain === domain); },
      context(id) { const item = byId.get(String(id || "")); return item ? clone(item) : null; },
      extend(extension) { const next = normalize(extension); return create({ ...library,
        references: [...library.references, ...next.references], metadata: {
          ...library.metadata, extensions: [...(library.metadata.extensions || []), {
            libraryId: next.libraryId, namespace: next.namespace }] } }); } }); }
  function containsAction(expected, observed) { const left = words(expected); const right = words(observed);
    return left === right || left.includes(right) || right.includes(left); }
  function orderedDocumentMatches(observed, expected) { let position = 0; const result = [];
    expected.forEach(documentId => { const index = observed.indexOf(documentId, position);
      if (index >= 0) { result.push(documentId); position = index + 1; } }); return result; }
  function transitionMatches(observedDocuments, transition) { const from = observedDocuments.indexOf(
    transition.from); const to = observedDocuments.indexOf(transition.to, from + 1);
    return from >= 0 && to > from; }
  function observedEvidence(recording, options = {}) { const evidence = recognition.extractEvidence(recording,
    options.taxonomy || taxonomySeed, options); const semantic = recording.semanticInterpretation?.classifications || [];
    const documents = []; evidence.documentSequence.forEach(item => documents.push(item.id));
    semantic.slice().sort((left, right) => Math.min(...left.sourceEventIds.map(id =>
      recording.events.findIndex(event => event.id === id))) - Math.min(...right.sourceEventIds.map(id =>
      recording.events.findIndex(event => event.id === id)))).forEach(item => {
      if (item.businessDocument?.id && documents.at(-1) !== item.businessDocument.id)
        documents.push(item.businessDocument.id); });
    const actions = [...evidence.observations.flatMap(item => item.actions.map(action => action.name)),
      ...semantic.map(item => item.businessAction?.name).filter(Boolean)];
    return freeze({ documents: strings(documents), actions: strings(actions),
      sourceEventIds: strings(recording.events.map(event => event.id)), evidence }); }
  function compare(reference, observed, context = {}) { const matchedDocuments = orderedDocumentMatches(
    observed.documents, reference.expectedDocuments); const missingDocuments = reference.expectedDocuments
    .filter(item => !matchedDocuments.includes(item)); const optionalDocumentSet = new Set(reference.optionalDocuments);
    const unexpectedDocuments = observed.documents.filter(item => !reference.expectedDocuments.includes(item) &&
      !optionalDocumentSet.has(item)); const matchedActions = reference.expectedActions.filter(expected =>
      observed.actions.some(action => containsAction(expected, action))); const missingActions =
      reference.expectedActions.filter(item => !matchedActions.includes(item)); const unexpectedActions =
      observed.actions.filter(action => !reference.expectedActions.some(expected => containsAction(expected, action)) &&
        !reference.optionalActions.some(optional => containsAction(optional, action)));
    const matchedTransitions = reference.expectedTransitions.filter(item =>
      transitionMatches(observed.documents, item)); const missingTransitions = reference.expectedTransitions
      .filter(item => !matchedTransitions.includes(item)); const documentScore = reference.expectedDocuments.length
      ? matchedDocuments.length / reference.expectedDocuments.length : 0; const actionScore =
      reference.expectedActions.length ? matchedActions.length / reference.expectedActions.length : 0;
    const transitionScore = reference.expectedTransitions.length ? matchedTransitions.length /
      reference.expectedTransitions.length : 0;
    const applicableWeight = (reference.expectedDocuments.length ? 0.5 : 0) +
      (reference.expectedActions.length ? 0.3 : 0) +
      (reference.expectedTransitions.length ? 0.2 : 0);
    const hasConfigurationEvidence = matchedTransitions.length > 0 || matchedDocuments.length > 1;
    const specificityPenalty = reference.configurationRequirements.length &&
      !hasConfigurationEvidence ? Math.min(0.18,
        0.06 + reference.configurationRequirements.length * 0.03) : 0;
    let confidence = Number(Math.max(0, Math.min(1,
      (documentScore * 0.5 + actionScore * 0.3 + transitionScore * 0.2) /
      Math.max(0.01, applicableWeight) -
      Math.min(0.08, (unexpectedDocuments.length + unexpectedActions.length) * 0.01) -
      specificityPenalty)).toFixed(3));
    const domainConflict = Boolean(context.anchoredDomain && reference.domain !==
      context.anchoredDomain);
    if (domainConflict) confidence = Math.min(confidence, 0.11);
    const matchedSteps = [...matchedDocuments.map(id => ({ type: "document", id })),
      ...matchedActions.map(name => ({ type: "action", name })),
      ...matchedTransitions.map(item => ({ type: "transition", ...clone(item) }))];
    const missingSteps = [...missingDocuments.map(id => ({ type: "document", id })),
      ...missingActions.map(name => ({ type: "action", name })),
      ...missingTransitions.map(item => ({ type: "transition", ...clone(item) }))];
    const unexpectedSteps = [...unexpectedDocuments.map(id => ({ type: "document", id })),
      ...unexpectedActions.map(name => ({ type: "action", name }))];
    return freeze({ referenceId: reference.id, name: reference.name, domain: reference.domain,
      confidence, matchedSteps, missingSteps, unexpectedSteps,
      configurationEvidence: hasConfigurationEvidence,
      specificityPenalty: Number(specificityPenalty.toFixed(3)),
      domainConflict,
      interpretation: "advisory", deviationIsError: false }); }
  function matchRecordingToReference(recording, libraryOrRegistry, options = {}) {
    if (!recording || Number(recording.schemaVersion) !== 1) throw new TypeError(
      "A Canonical Recording schema-v1 value is required."); const registry = libraryOrRegistry?.library
      ? libraryOrRegistry : create(libraryOrRegistry); const observed = observedEvidence(recording, options);
    const recognized = recognition.recognize(recording, options);
    const recognizedDomain = recognized.classification?.signals?.strongMetadata &&
      recognized.classification.signals.matchedDocuments > 0
      ? recognized.classification.taxonomyReferences.domain.id : null;
    const observedDomains = strings(observed.documents.map(id => DOCUMENT_DOMAIN_ANCHORS[id]));
    const anchoredDomain = recognizedDomain || (observedDomains.length === 1 ? observedDomains[0] : null);
    const matches = registry.library.references.map(reference => compare(reference, observed,
      { anchoredDomain }))
      .sort((left, right) => right.confidence - left.confidence || left.referenceId.localeCompare(right.referenceId));
    const alternativeMatches = matches.slice(1).filter(item => !item.domainConflict &&
      item.confidence >= 0.12).slice(0, 5);
    return freeze({ bestMatch: matches[0] || null, confidence: matches[0]?.confidence || 0,
      matchedSteps: clone(matches[0]?.matchedSteps || []), missingSteps: clone(matches[0]?.missingSteps || []),
      unexpectedSteps: clone(matches[0]?.unexpectedSteps || []), alternativeMatches,
      suppressedAlternativeCount: Math.max(0, matches.length - 1 - alternativeMatches.length),
      observed, anchoredDomain, diagnostics: matches.length ? [] : [{ code: "no-reference-processes" }],
      advisory: true, customizedProcessMayBeValid: true }); }
  return { SCHEMA_VERSION, compare, create, matchRecordingToReference, normalize,
    normalizeReference, observedEvidence, validate };
});
