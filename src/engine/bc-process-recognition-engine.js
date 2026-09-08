(function (root, factory) {
  const schema = typeof module === "object" && module.exports
    ? require("./process-taxonomy-schema") : root.T9ProcessTaxonomySchema;
  const seed = typeof module === "object" && module.exports
    ? require("./business-central-process-taxonomy-seed").seed
    : root.T9BusinessCentralProcessTaxonomySeed.seed;
  const lifecycleModel = typeof module === "object" && module.exports
    ? require("./document-lifecycle") : root.T9DocumentLifecycle;
  const lifecycleSeed = typeof module === "object" && module.exports
    ? require("./business-central-document-lifecycle-seed").catalog
    : root.T9BusinessCentralDocumentLifecycleSeed.catalog;
  const api = factory(schema, seed, lifecycleModel, lifecycleSeed);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BCProcessRecognitionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  schema, seed, lifecycleModel, lifecycleSeed
) {
  "use strict";
  const ENGINE_VERSION = "1.7.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => value == null ? "" : String(value).trim();
  const words = value => text(value).toLowerCase().replace(/[^a-z0-9åäöæø]+/g, " ").trim();
  const unique = values => [...new Set(values.filter(Boolean))];
  const key = value => text(value).replace(/[^a-z0-9]+/gi, " ").trim()
    .split(/\s+/).map((part, index) => index ? part[0]?.toUpperCase() + part.slice(1) :
      part[0]?.toUpperCase() + part.slice(1)).join("");

  const ACTIONS = [
    ["Release", /\b(release|released|släpp|frisläpp)\b/i],
    ["Register", /\b(register|registered|registrera|registrerad)\b/i],
    ["Receive", /\b(receive|receipt|mottag|inleverans)\b/i],
    ["Invoice", /\b(invoice|faktur)\b/i], ["Ship", /\b(ship|shipment|leverans)\b/i],
    ["Pick", /\b(pick|plock)\b/i], ["Consume", /\b(consum|förbruk)\b/i],
    ["Output", /\b(output|utflöde)\b/i], ["Transfer", /\btransfer|överför\b/i],
    ["Post", /\b(post|posting|bokför)\b/i], ["Create", /\b(create|new|ny|skapa)\b/i]
  ];
  const ACTION_QUALIFIERS = [
    ["shipment", /ship|shipment|utleverans|leverans/i],
    ["receipt", /receipt|receive|inleverans|mottag/i],
    ["invoice", /invoice|faktur/i], ["pick", /pick|plock/i],
    ["put-away", /put.?away|inlagr/i], ["assembly", /assembl|monter/i],
    ["consumption", /consum|förbruk/i], ["output", /output|utflöde/i],
    ["transfer", /transfer|överför/i]
  ];
  function eventPage(event) {
    return event.identification?.pageIdentity || event.page || event.businessCentral || {};
  }

  function pageIdFromUrl(value) {
    const candidate = text(value);
    if (!candidate) return "";
    try { return text(new URL(candidate).searchParams.get("page")); }
    catch { return text(/[?&]page=([0-9]+)/i.exec(candidate)?.[1]); }
  }

  function eventPageObjectId(event) {
    const page = eventPage(event); const raw = event.raw || {};
    const explicit = text(page.pageObjectId || event.page?.pageObjectId ||
      event.businessCentral?.pageObjectId);
    if (explicit) return { pageObjectId: explicit, fromUrl: false };
    const urls = [page.url, event.page?.url, event.frame?.url, event.frame?.topUrl,
      raw.frameUrl, raw.topUrl, raw.url];
    const pageObjectId = urls.map(pageIdFromUrl).find(Boolean) || "";
    return { pageObjectId, fromUrl: Boolean(pageObjectId) };
  }

  function eventTexts(event) {
    const raw = event.raw || {};
    return unique([event.page?.caption, event.page?.name, event.businessCentral?.pageCaption,
      event.identification?.pageIdentity?.pageCaption,
      event.identification?.pageIdentity?.documentType,
      event.identification?.pageIdentity?.entity, event.action?.caption,
      event.identification?.actionIdentity?.caption, event.control?.name,
      event.accessibleTarget?.name, raw.actionCaption, raw.accessibleName, raw.label,
      raw.fieldName, raw.pageCaption, raw.pageName, raw.documentTitle, raw.automationId,
      raw.dataControlId, raw.dataControlName, raw.category, raw.type]);
  }

  function eventActionTexts(event) {
    const raw = event.raw || {};
    const identified = event.identification?.actionIdentity || {};
    const controlCaption = /^(button|menuitem|option|tab)$/i.test(text(
      event.control?.role || raw.role)) ? event.control?.name : null;
    return unique([event.action?.caption, identified.caption, controlCaption,
      raw.actionCaption, raw.dataControlName]);
  }

  function semanticDocumentMatch(event, documents) {
    const page = eventPage(event);
    const identityForms = value => {
      const compact = words(value).replace(/\s+/g, "");
      if (!compact) return [];
      const withoutView = compact.replace(/(?:list|card|page|worksheet)$/i, "");
      const singular = withoutView.length > 3 ? withoutView.replace(/s$/i, "") : withoutView;
      return unique([compact, withoutView, singular]);
    };
    const identities = unique([page.documentType, page.entity, page.recordType,
      event.businessCentral?.documentType, event.businessCentral?.entity]
      .flatMap(identityForms))
      .filter(value => value && !["document", "list", "card", "record",
        "posteddocument", "warehousedocument"].includes(value));
    if (!identities.length) return null;
    const matches = documents.filter(document => {
      const aliases = [document.id.split(":").at(-1), document.name,
        ...(document.aliases || [])].flatMap(identityForms);
      return identities.some(identity => aliases.includes(identity));
    });
    return matches.length === 1 ? matches[0] : null;
  }

  function documentMatch(event, documents) {
    const page = eventPage(event);
    const pageIdentity = eventPageObjectId(event);
    const pageId = pageIdentity.pageObjectId;
    const tableId = text(page.tableId || event.page?.tableId);
    const semanticDocument = event.semantic?.businessDocument?.id ||
      event.businessDocument?.id || null;
    if (semanticDocument) {
      const document = documents.find(item => item.id === semanticDocument);
      if (document) return { document, strength: 1, signal: "semantic-document",
        explanation: `Matched semantic document ${document.name}` };
    }
    if (pageId) {
      const document = documents.find(item => item.pageIds.includes(pageId));
      if (document) {
        const view = (document.pageViews || []).find(item => item.pageObjectId === pageId);
        const viewLabel = view?.viewType ? ` ${view.viewType}` : "";
        return { document, view: view ? clone(view) : null,
          strength: pageIdentity.fromUrl ? 0.96 : 1,
          signal: pageIdentity.fromUrl ? "url-page-object-id" : "page-object-id",
          explanation: `Matched ${document.name}${viewLabel} page ${pageId}${
            pageIdentity.fromUrl ? " from recorded URL" : ""}` };
      }
    }
    const matchedSemanticDocument = semanticDocumentMatch(event, documents);
    if (matchedSemanticDocument) return { document: matchedSemanticDocument, strength: 0.88,
      signal: "page-document-identity",
      explanation: `Matched ${matchedSemanticDocument.name} from BC document identity` };
    if (tableId) {
      const candidates = documents.filter(item => item.tableIds.includes(tableId));
      if (candidates.length === 1) return { document: candidates[0], strength: 0.9,
        signal: "source-table", explanation: `Matched ${candidates[0].name} table ${tableId}` };
    }
    const combined = words(eventTexts(event).join(" "));
    const candidates = documents.filter(item => [item.name, ...(item.aliases || [])]
      .some(name => combined.includes(words(name))));
    if (candidates.length === 1) return { document: candidates[0], strength: 0.32,
      signal: "caption-text", explanation: `Caption suggests ${candidates[0].name}` };
    return null;
  }

  function actionMatches(event, semanticActions = []) {
    const raw = event.raw || {};
    const identified = event.identification?.actionIdentity || {};
    const technical = words([identified.actionType, raw.actionType, raw.automationId,
      raw.dataControlId, raw.dataControlName].join(" "));
    const captions = words(eventActionTexts(event).join(" "));
    const semanticActionPaths = semanticActions.filter(action =>
      Array.isArray(action?.actionPath)).map(action => action.actionPath);
    const semanticTypes = words(semanticActions.map(action =>
      action?.actionType || action?.semanticAction).filter(Boolean).join(" "));
    const semanticCompact = semanticTypes.replace(/\s+/g, "");
    const pathText = words(semanticActionPaths.flat().join(" "));
    const pathLeaf = words(semanticActionPaths.map(path => path.at(-1))
      .filter(Boolean).join(" "));
    const qualifiers = ACTION_QUALIFIERS.filter(([, expression]) =>
      expression.test(`${technical} ${captions} ${pathText} ${semanticTypes}`))
      .map(([name]) => name);
    const results = [];
    ACTIONS.forEach(([name, expression]) => {
      const technicalCompact = technical.replace(/\s+/g, "");
      if (technical && (technicalCompact.includes(name.toLowerCase()) ||
        expression.test(technical))) results.push({ name, strength: 1, qualifiers,
        signal: "technical-action", explanation: `Detected ${name} from BC action metadata` });
      else if (pathLeaf && expression.test(pathLeaf)) results.push({ name,
        strength: 0.7, qualifiers, signal: "semantic-action-path",
        explanation: `Detected ${name} from structured BC action path` });
      else if (semanticTypes && (semanticCompact.includes(name.toLowerCase()) ||
        expression.test(semanticTypes))) results.push({ name,
        strength: 0.65, qualifiers, signal: "semantic-action",
        explanation: `Detected ${name} from semantic recording action` });
      else if (name === "Register" && expression.test(captions) &&
        !/pick|put.?away|plock|inlagr/i.test(captions)) return;
      else if (expression.test(captions)) results.push({ name, strength: 0.38, qualifiers,
        signal: "action-caption", explanation: `Action caption suggests ${name}` });
    });
    return results;
  }

  function actionCompatible(expected, observed) {
    const actionMatchesName = words(expected.name).includes(words(observed.name)) ||
      words(expected.actionType).includes(words(observed.name));
    if (!actionMatchesName) return false;
    const expectedText = `${words(expected.name)} ${words(expected.actionType)}`;
    const expectedQualifiers = ACTION_QUALIFIERS.filter(([, expression]) =>
      expression.test(expectedText)).map(([name]) => name);
    return !observed.qualifiers?.length || !expectedQualifiers.length ||
      observed.qualifiers.some(item => expectedQualifiers.includes(item));
  }

  function extractEvidence(recording, taxonomy = seed, options = {}) {
    const documents = taxonomy.documents || [];
    const observations = [];
    const semanticActions = Array.isArray(options.semanticActions)
      ? options.semanticActions : [];
    (recording?.events || []).forEach((event, index) => {
      const document = documentMatch(event, documents);
      const eventSemanticActions = semanticActions.filter(action =>
        (action?.sourceEventIds || []).includes(event.id));
      const semanticActionPaths = eventSemanticActions.filter(action =>
        Array.isArray(action.actionPath)).map(action => action.actionPath);
      const actions = actionMatches(event, eventSemanticActions);
      const screenshot = options.screenshotEvidence?.[event.id] || null;
      observations.push({ eventId: event.id, sequence: event.sequence || index + 1,
        document: document ? { id: document.document.id, name: document.document.name,
          strength: document.strength, signal: document.signal,
          view: clone(document.view) } : null,
        actions, actionPaths: clone(semanticActionPaths),
        page: clone(eventPage(event)), screenshot: screenshot ? {
          interpretation: clone(screenshot), strength: 0.15, signal: "screenshot-interpretation"
        } : null,
        explanations: unique([document?.explanation, ...actions.map(item => item.explanation),
          screenshot ? "Screenshot interpretation supplied weak supporting evidence" : null]) });
    });
    const transitions = [];
    const semanticTransitions = recording?.semanticInterpretation?.documentStateTransitions || [];
    semanticTransitions.forEach(item => transitions.push({ type: "state",
      documentId: item.businessDocument?.id || null, fromState: clone(item.fromState),
      toState: clone(item.toState), sourceEventIds: clone(item.sourceEventIds), strength: 1,
      explanation: `Detected ${item.businessDocument?.name || "document"} state transition ${item.fromState?.name || item.fromState || "?"} → ${item.toState?.name || item.toState || "?"}` }));
    const documentSequence = [];
    observations.forEach(item => { if (item.document &&
      documentSequence.at(-1)?.id !== item.document.id) documentSequence.push({
      id: item.document.id, name: item.document.name, strength: item.document.strength,
      eventId: item.eventId, signal: item.document.signal }); });
    for (let index = 1; index < documentSequence.length; index += 1) transitions.push({
      type: "navigation", fromDocumentId: documentSequence[index - 1].id,
      toDocumentId: documentSequence[index].id,
      sourceEventIds: [documentSequence[index - 1].eventId, documentSequence[index].eventId],
      strength: Math.min(documentSequence[index - 1].strength, documentSequence[index].strength),
      explanation: `Observed ${documentSequence[index - 1].name} → ${documentSequence[index].name}` });
    return { observations, documentSequence, transitions };
  }

  function orderedMatches(observed, expected) {
    let position = 0;
    const matched = [];
    observed.forEach(item => {
      const next = expected.indexOf(item.id, position);
      if (next >= 0) { matched.push(item); position = next + 1; }
    });
    return matched;
  }

  function lifecycleEvidence(catalog, matches, observedDocumentIds) {
    const best = matches[0] || null;
    if (!best) return { documents: [], assessment: null };
    const plausible = matches.filter(item => item.lifecycleId === best.lifecycleId &&
      best.confidence - item.confidence <= 0.08);
    const lifecycle = catalog.lifecycles.find(item => item.id === best.lifecycleId);
    if (!lifecycle) return { documents: [], assessment: null };
    const observed = new Set(observedDocumentIds);
    const stages = new Map();
    plausible.forEach(match => lifecycleModel.stageSequence(lifecycle, match.variantId)
      .filter(stage => stage.documentId).forEach((stage, index) => {
        const current = stages.get(stage.documentId) || { id: stage.documentId,
          name: stage.name, optional: stage.optional, count: 0, order: index, variantIds: [] };
        current.count += 1;
        current.order = Math.min(current.order, index);
        current.optional = current.optional && stage.optional;
        current.variantIds.push(match.variantId);
        stages.set(stage.documentId, current);
      }));
    const documents = [...stages.values()].sort((left, right) => left.order - right.order ||
      left.id.localeCompare(right.id)).map(item => ({ id: item.id, name: item.name,
        applicability: observed.has(item.id) ? "observed" :
          item.count < plausible.length ? "conditional" : item.optional ? "optional" : "expected",
        variantIds: unique(item.variantIds) }));
    const variantName = id => catalog.variants.find(item => item.id === id)?.name || id;
    return { documents, assessment: { selectedVariantId: best.variantId,
      selectedVariantName: variantName(best.variantId),
      alternativeVariantIds: plausible.slice(1).map(item => item.variantId),
      alternativeVariants: plausible.slice(1).map(item => ({ id: item.variantId,
        name: variantName(item.variantId), confidence: item.confidence })),
      ambiguous: plausible.length > 1,
      candidateMargin: plausible[1] ? Number((best.confidence - plausible[1].confidence).toFixed(3)) : null } };
  }

  function candidateFor(process, taxonomy, evidence, lifecycleCatalog) {
    const businessProcess = taxonomy.businessProcesses.find(item =>
      item.id === process.businessProcessId);
    const domain = taxonomy.domains.find(item => item.id === businessProcess?.domainId);
    const expectedDocuments = process.documentIds || [];
    const matchedDocuments = orderedMatches(evidence.documentSequence, expectedDocuments);
    const processSteps = taxonomy.processSteps.filter(item => process.processStepIds.includes(item.id));
    const expectedActions = taxonomy.actions.filter(item =>
      processSteps.some(step => step.id === item.processStepId));
    const observedActions = evidence.observations.flatMap(item => item.actions.map(action => ({
      ...action, eventId: item.eventId })));
    const matchingActions = observedActions.filter(observed => expectedActions.some(expected =>
      actionCompatible(expected, observed)));
    const actionHits = [...matchingActions.reduce((hits, observed) => {
      const current = hits.get(observed.name);
      if (!current || observed.strength > current.strength) hits.set(observed.name, observed);
      return hits;
    }, new Map()).values()];
    const documentStrength = matchedDocuments.reduce((sum, item) => sum + item.strength, 0);
    const documentCoverage = expectedDocuments.length ? documentStrength / expectedDocuments.length : 0;
    const observedCoverage = evidence.documentSequence.length ?
      matchedDocuments.length / evidence.documentSequence.length : 0;
    const sequenceStrength = matchedDocuments.length > 1 ?
      Math.min(1, matchedDocuments.length / Math.min(3, expectedDocuments.length)) : 0;
    const actionStrength = actionHits.reduce((sum, item) => sum + item.strength, 0) /
      Math.max(1, Math.min(3, expectedActions.length));
    const relevantTransitions = evidence.transitions.filter(transition =>
      transition.type === "state" ? expectedDocuments.includes(transition.documentId) :
        expectedDocuments.includes(transition.fromDocumentId) &&
        expectedDocuments.includes(transition.toDocumentId));
    const transitionStrength = Math.min(1, relevantTransitions.reduce((sum, item) =>
      sum + item.strength, 0) / 2);
    const lifecycleMatches = lifecycleModel.match(lifecycleCatalog,
      evidence.documentSequence.map(item => item.id), { bcProcessId: process.id,
        observedActions: observedActions.map(item => item.name) });
    const lifecycleMatch = lifecycleMatches[0] || null;
    const lifecycle = lifecycleEvidence(lifecycleCatalog, lifecycleMatches,
      evidence.documentSequence.map(item => item.id));
    const lifecycleStrength = lifecycleMatch && lifecycleMatch.matchedTransitions.length
      ? lifecycleMatch.confidence : 0;
    const expectedPositions = new Map(expectedDocuments.map((id, index) => [id, index]));
    const relevantObserved = evidence.documentSequence.filter(item => expectedPositions.has(item.id));
    let orderConflicts = 0;
    for (let index = 1; index < relevantObserved.length; index += 1) {
      if (expectedPositions.get(relevantObserved[index].id) <
          expectedPositions.get(relevantObserved[index - 1].id)) orderConflicts += 1;
    }
    const unexpectedStrongDocuments = evidence.documentSequence.filter(item =>
      item.strength >= 0.8 && !expectedDocuments.includes(item.id)).length;
    const documentsById = new Map((taxonomy.documents || []).map(item => [item.id, item]));
    const anchoredDomains = unique(evidence.documentSequence.filter(item => item.strength >= 0.8)
      .map(item => documentsById.get(item.id)?.primaryDomainId));
    const warehouseBridgeEstablished = domain?.id === "domain:warehouse-management" &&
      matchedDocuments.some(item => item.strength >= 0.8);
    const domainAnchorConflict = anchoredDomains.length > 0 &&
      !anchoredDomains.includes(domain?.id) && !warehouseBridgeEstablished;
    let confidence = Math.min(0.99, documentCoverage * 0.3 + observedCoverage * 0.14 +
      sequenceStrength * 0.18 + Math.min(1, actionStrength) * 0.15 +
      transitionStrength * 0.08 + lifecycleStrength * 0.15);
    confidence = Math.max(0, confidence - Math.min(0.24, orderConflicts * 0.12) -
      Math.min(0.2, unexpectedStrongDocuments * 0.05));
    if (domainAnchorConflict) confidence = Math.min(confidence, 0.11);
    const hasStrong = matchedDocuments.some(item => item.strength >= 0.8) ||
      actionHits.some(item => item.strength >= 0.8) || relevantTransitions.some(item => item.strength >= 0.8);
    if (!hasStrong) confidence = Math.min(confidence, 0.54);
    const strongDocumentCount = matchedDocuments.filter(item => item.strength >= 0.8).length;
    const strongActionCount = actionHits.filter(item => item.strength >= 0.8).length;
    const evidenceQuality = strongDocumentCount >= 2 ||
      (strongDocumentCount >= 1 && (strongActionCount || relevantTransitions.length))
      ? "strong" : hasStrong ? "moderate" : "weak";
    if (evidenceQuality === "moderate") confidence = Math.min(confidence, 0.68);
    const variant = selectVariant(process, taxonomy, evidence);
    const reasons = unique([...matchedDocuments.map(item =>
      `Matched ${item.name}${item.signal === "page-object-id" ? ` page` : ""}`),
    ...actionHits.map(item => item.explanation), ...relevantTransitions.map(item => item.explanation),
    ...(lifecycleMatch?.explanation || []),
    matchedDocuments.length ? `Matched ${matchedDocuments.length} of ${expectedDocuments.length} process documents in sequence` : null,
    matchedDocuments.length && matchedDocuments.length < expectedDocuments.length ?
      "Partial process sequence recognized; later steps may not have been recorded" : null,
    orderConflicts ? `Detected ${orderConflicts} document order conflict${orderConflicts === 1 ? "" : "s"}` : null,
    unexpectedStrongDocuments ? `${unexpectedStrongDocuments} strong document signal${unexpectedStrongDocuments === 1 ? " was" : "s were"} outside this process` : null]);
    if (domainAnchorConflict) reasons.push(`Strong Business Central document metadata anchors the recording to ${
      anchoredDomains.join(", ")}, which conflicts with ${domain?.name || process.name}`);
    return { domain: key(domain?.name), process: key(businessProcess?.name),
      variant: variant ? key(variant.name) : null, confidence: Number(confidence.toFixed(3)),
      taxonomyReferences: { domain: domain ? { id: domain.id, name: domain.name } : null,
        businessProcess: businessProcess ? { id: businessProcess.id, name: businessProcess.name } : null,
        bcProcess: { id: process.id, name: process.name },
        variant: variant ? { id: variant.id, name: variant.name } : null },
      matchedEventIds: unique([...matchedDocuments.map(item => item.eventId),
        ...actionHits.map(item => item.eventId),
        ...relevantTransitions.flatMap(item => item.sourceEventIds || [])]),
      processEvidence: {
        matchedDocuments: matchedDocuments.map(item => ({ id: item.id, name: item.name,
          eventId: item.eventId, sequence: evidence.observations.find(observation =>
            observation.eventId === item.eventId)?.sequence || 0, strength: item.strength })),
        expectedDocuments: expectedDocuments.map(id => { const document = taxonomy.documents
          .find(item => item.id === id); return { id, name: document?.name || id }; }),
        lifecycleDocuments: lifecycle.documents,
        variantAssessment: lifecycle.assessment,
        matchedActions: actionHits.map(item => ({ name: item.name, eventId: item.eventId,
          sequence: evidence.observations.find(observation =>
            observation.eventId === item.eventId)?.sequence || 0, strength: item.strength,
          qualifiers: clone(item.qualifiers || []),
          nodeType: item.name === "Post" ? "posting" : "processStep" }))
      },
      explanation: reasons, signals: { matchedDocuments: matchedDocuments.length,
        expectedDocuments: expectedDocuments.length, matchedActions: actionHits.length,
        matchedTransitions: relevantTransitions.length,
        matchedLifecycleTransitions: lifecycleMatch?.matchedTransitions.length || 0,
        distinctMatchedActions: actionHits.length, orderConflicts,
        unexpectedStrongDocuments, anchoredDomains, domainAnchorConflict,
        warehouseBridgeEstablished, evidenceQuality,
        scoreBreakdown: { documentCoverage: Number(documentCoverage.toFixed(3)),
          observedCoverage: Number(observedCoverage.toFixed(3)),
          sequenceStrength: Number(sequenceStrength.toFixed(3)),
          actionStrength: Number(Math.min(1, actionStrength).toFixed(3)),
          transitionStrength: Number(transitionStrength.toFixed(3)),
          lifecycleStrength: Number(lifecycleStrength.toFixed(3)) },
        lifecycle: lifecycleMatch ? { lifecycleId: lifecycleMatch.lifecycleId,
          variantId: lifecycleMatch.variantId, confidence: lifecycleMatch.confidence,
          alternativeVariantIds: lifecycle.assessment?.alternativeVariantIds || [],
          ambiguous: Boolean(lifecycle.assessment?.ambiguous) } : null,
        strongMetadata: hasStrong } };
  }

  function selectVariant(process, taxonomy, evidence) {
    const variants = (taxonomy.variants || []).filter(item => item.bcProcessId === process.id);
    if (!variants.length) return null;
    const ids = new Set(evidence.documentSequence.map(item => item.id));
    return variants.find(item => item.conditions?.directedPutAwayAndPick &&
      (ids.has("document:warehouse-pick") || ids.has("document:warehouse-put-away"))) ||
      variants.find(item => item.conditions?.warehouseHandling === false &&
        !ids.has("document:warehouse-pick") && !ids.has("document:warehouse-put-away")) || null;
  }

  function recognize(recording, options = {}) {
    if (!recording || Number(recording.schemaVersion) !== 1 || !Array.isArray(recording.events))
      throw new TypeError("A Canonical Recording schema-v1 value is required.");
    const taxonomy = schema.normalize(options.taxonomy || seed);
    const lifecycleCatalog = lifecycleModel.normalize(options.lifecycleCatalog || lifecycleSeed);
    const evidence = extractEvidence(recording, taxonomy, options);
    const candidates = taxonomy.bcProcesses.map(process => candidateFor(process, taxonomy,
      evidence, lifecycleCatalog))
      .filter(item => item.confidence >= (options.minimumConfidence ?? 0.12))
      .sort((left, right) => right.confidence - left.confidence ||
        left.taxonomyReferences.bcProcess.id.localeCompare(right.taxonomyReferences.bcProcess.id));
    const top = candidates[0] || null;
    const runnerUp = candidates[1] || null;
    const margin = top && runnerUp ? Number((top.confidence - runnerUp.confidence).toFixed(3)) :
      top ? top.confidence : 0;
    if (top) {
      top.signals.candidateMargin = margin;
      top.signals.ambiguous = Boolean(runnerUp && margin < 0.1);
      if (top.signals.ambiguous) {
        top.confidence = Number(Math.min(top.confidence, 0.64).toFixed(3));
        top.explanation.push(`Classification is close to ${runnerUp.taxonomyReferences.bcProcess.name}; manual confirmation is recommended`);
      }
    }
    const identityEstablished = Boolean(top && top.signals.strongMetadata &&
      top.signals.matchedDocuments >= 1 && top.signals.matchedActions >= 1 &&
      top.signals.anchoredDomains.length === 1 && !top.signals.ambiguous);
    if (top) top.signals.identityEstablished = identityEstablished;
    const assessmentStatus = !top || (top.confidence < 0.35 && !identityEstablished)
      ? "insufficient-evidence" :
      top.signals.ambiguous || top.confidence < 0.82 ? "review-required" : "auto-classifiable";
    return { engineVersion: ENGINE_VERSION, classificationSource: "rule",
      assessment: { status: assessmentStatus, candidateMargin: margin,
        evidenceQuality: top?.signals.evidenceQuality || "none",
        manualConfirmationRecommended: assessmentStatus !== "auto-classifiable" },
      partial: candidates[0] ? candidates[0].signals.matchedDocuments <
        candidates[0].signals.expectedDocuments : false,
      classification: candidates[0] || null, alternatives: candidates.slice(1, 4),
      evidence, diagnostics: top?.signals.ambiguous ? [{ code: "ambiguous-process",
        severity: "warning", message: "The leading process candidates are too close for a confident automatic decision.",
        candidateIds: [top.taxonomyReferences.bcProcess.id,
          runnerUp.taxonomyReferences.bcProcess.id], margin }] : candidates.length ? [] : [{ code: "process-not-recognized",
        severity: "info", message: "Available evidence did not match a known BC process pattern." }],
      aiComplement: { permitted: true, authoritativeMetadataPrecedence: true,
        status: "not-invoked" } };
  }

  function toSemanticClassification(result, options = {}) {
    const candidate = result?.classification;
    if (!candidate) return null;
    const references = candidate.taxonomyReferences;
    return { classificationId: options.classificationId ||
      `recognition:${references.bcProcess.id}`,
    sourceEventIds: clone(options.sourceEventIds || candidate.matchedEventIds),
    businessDomain: clone(references.domain),
    businessProcess: clone(references.businessProcess),
    bcProcess: clone(references.bcProcess), processStep: null,
    businessDocument: null, businessAction: null, businessEntity: null,
    processRole: null, confidence: candidate.confidence,
    classificationSource: "rule", classificationMetadata: {
      engine: "bc-process-recognition-engine", engineVersion: result.engineVersion,
      partial: result.partial, explanation: clone(candidate.explanation),
      signals: clone(candidate.signals), alternatives: clone(result.alternatives.map(item => ({
        bcProcess: item.taxonomyReferences.bcProcess, confidence: item.confidence })))
    } };
  }

  return { ENGINE_VERSION, eventPageObjectId, extractEvidence, pageIdFromUrl,
    recognize, semanticDocumentMatch, toSemanticClassification };
});
