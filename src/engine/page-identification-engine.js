(function (root, factory) {
  const pageIdentity = typeof module === "object" && module.exports
    ? require("./page-identity") : root.T9PageIdentity;
  const api = factory(pageIdentity);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9PageIdentificationEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (pageIdentity) {
  "use strict";
  const VERSION = "1.0.0";
  const PAGE_TYPES = new Set(["card", "list", "document", "worksheet",
    "listPlus", "navigatePage", "roleCenter", "confirmationDialog",
    "standardDialog", "api", "controlAddIn"]);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  let configuredPacks = [];
  let configuredCompilation = null;
  let configurationRevision = 0;

  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }
  function text(value) {
    return typeof value === "string" || typeof value === "number"
      ? String(value).trim() : "";
  }
  function normalizePageObjectId(value) {
    return pageIdentity.normalizeNumericId(value);
  }
  function safeLocation(value) {
    try {
      const parsed = new URL(text(value));
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return "";
    }
  }
  function stableHash(value) {
    let hash = 2166136261;
    for (const character of value) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }
  function stablePageIdentity(observed) {
    if (observed.pageObjectId) return `bc:page:${observed.pageObjectId}`;
    const basis = [observed.legacyPageId || "", observed.pageCaption || "",
      observed.documentTitle || "", safeLocation(observed.frameUrl),
      safeLocation(observed.topUrl)].join("\u001f");
    return `bc:observed:${basis.replace(/\u001f/g, "") ? stableHash(basis) : "unknown"}`;
  }
  function diagnostic(code, message, details = {}) {
    return { code, severity: "warning", message, ...details };
  }
  function semanticShape(definition) {
    return JSON.stringify([definition.entity || null, definition.pageType || null,
      definition.tableId || null, definition.recordType || null,
      definition.documentType || null]);
  }
  function validatePageDefinition(input, context = {}) {
    const definition = clone(input || {});
    const diagnostics = [];
    const ruleId = text(definition.ruleId);
    const provider = text(definition.provider || context.packId || definition.packId);
    const pageObjectId = definition.pageObjectId == null ? null :
      normalizePageObjectId(definition.pageObjectId);
    const captionRules = Array.isArray(definition.captionRules)
      ? clone(definition.captionRules) : [];
    if (!ruleId) diagnostics.push(diagnostic("missing-page-rule-id",
      "Page definition requires ruleId."));
    if (!provider) diagnostics.push(diagnostic("missing-page-provider",
      "Page definition requires provider or Knowledge Pack packId."));
    if (definition.pageObjectId != null && !pageObjectId) diagnostics.push(diagnostic(
      "invalid-page-object-id", "pageObjectId must be a positive numeric identifier."));
    if (!pageObjectId && !captionRules.length) diagnostics.push(diagnostic(
      "missing-page-match", "Page definition requires pageObjectId or captionRules."));
    if (definition.pageType && !PAGE_TYPES.has(definition.pageType)) diagnostics.push(
      diagnostic("invalid-page-type", `Unsupported pageType: ${definition.pageType}.`));
    if (definition.entity && /^\d+$/.test(text(definition.entity))) diagnostics.push(
      diagnostic("numeric-entity", "entity must be semantic and must not look like an ID."));
    const tableId = definition.tableId == null ? null :
      pageIdentity.normalizeNumericId(definition.tableId);
    if (definition.tableId != null && !tableId) diagnostics.push(diagnostic(
      "invalid-table-id", "tableId must be a positive numeric identifier."));
    captionRules.forEach((rule, index) => {
      if (!text(rule?.pattern)) diagnostics.push(diagnostic("invalid-caption-rule",
        "Caption rule requires pattern.", { index }));
      else try { new RegExp(rule.pattern, "i"); } catch {
        diagnostics.push(diagnostic("invalid-caption-pattern",
          "Caption rule pattern is not a valid regular expression.", { index }));
      }
    });
    const normalized = { ...definition,
      ...(ruleId ? { ruleId } : {}),
      ...(pageObjectId ? { pageObjectId } : {}),
      ...(tableId ? { tableId } : {}),
      captionRules,
      provider: provider || undefined,
      packId: text(context.packId || definition.packId) || undefined,
      packPriority: Number(context.packPriority ?? definition.packPriority ?? 0) || 0,
      priority: Number(definition.priority || 0) || 0 };
    return freeze({ valid: diagnostics.length === 0, definition: normalized,
      diagnostics });
  }
  function compile(packs) {
    const definitions = [];
    const diagnostics = [];
    for (const pack of Array.isArray(packs) ? packs : []) {
      const packId = text(pack?.packId);
      const seen = new Set();
      for (const raw of Array.isArray(pack?.pageDefinitions)
        ? pack.pageDefinitions : []) {
        const result = validatePageDefinition(raw, { packId,
          packPriority: pack.priority });
        diagnostics.push(...result.diagnostics.map(item => ({ ...item,
          packId, ruleId: result.definition.ruleId || null })));
        if (!result.valid) continue;
        const id = result.definition.pageObjectId;
        if (id && seen.has(id)) {
          diagnostics.push(diagnostic("duplicate-page-object-id",
            "Pack contains duplicate pageObjectId.", { packId,
              pageObjectId: id, ruleId: result.definition.ruleId }));
          continue;
        }
        if (id) seen.add(id);
        definitions.push(result.definition);
      }
    }
    const byId = new Map();
    definitions.filter(item => item.pageObjectId).forEach(item => {
      const values = byId.get(item.pageObjectId) || [];
      values.push(item); byId.set(item.pageObjectId, values);
    });
    for (const [id, values] of byId) {
      const shapes = new Set(values.map(semanticShape));
      if (values.length > 1 && shapes.size > 1) diagnostics.push(diagnostic(
        "conflicting-page-definitions", "Packs define conflicting page metadata.",
        { pageObjectId: id, ruleIds: values.map(item => item.ruleId) }));
    }
    return { definitions, diagnostics };
  }
  function compare(left, right) {
    return (right.packPriority - left.packPriority) ||
      (right.priority - left.priority) || left.ruleId.localeCompare(right.ruleId);
  }
  function localeMatches(ruleLocale, requestedLocale) {
    if (!ruleLocale || ruleLocale === "*") return true;
    const rule = text(ruleLocale).toLowerCase();
    const requested = text(requestedLocale).toLowerCase();
    return !requested || requested === rule || requested.split("-")[0] === rule.split("-")[0];
  }
  function captionMatches(definition, caption, locale) {
    if (!caption) return false;
    return definition.captionRules.some(rule => localeMatches(rule.locale, locale) &&
      new RegExp(rule.pattern, "i").test(caption));
  }
  function known(result, definition, observed, source, confidence, diagnostics) {
    const value = {
      pageIdentity: stablePageIdentity(observed),
      ...(result ? { pageObjectId: result } : {}),
      ...(observed.pageCaption ? { pageCaption: observed.pageCaption } : {}),
      ...(definition.entity ? { entity: definition.entity } : {}),
      ...(definition.pageType ? { pageType: definition.pageType } : {}),
      ...(source === "page-object-id" && definition.tableId
        ? { tableId: definition.tableId } : {}),
      ...(source === "page-object-id" && definition.recordType
        ? { recordType: definition.recordType } : {}),
      ...(definition.documentType ? { documentType: definition.documentType } : {}),
      source, provider: definition.provider || definition.packId,
      ruleId: definition.ruleId, confidence,
      ...(diagnostics.length ? { diagnostics: clone(diagnostics) } : {})
    };
    return freeze(value);
  }
  function fallback(observed, source, confidence, diagnostics) {
    return freeze({
      pageIdentity: stablePageIdentity(observed),
      ...(observed.pageObjectId ? { pageObjectId: observed.pageObjectId } : {}),
      ...(observed.pageCaption ? { pageCaption: observed.pageCaption } : {}),
      source, confidence,
      ...(diagnostics.length ? { diagnostics: clone(diagnostics) } : {})
    });
  }
  function choose(candidates, observed, source, confidence, diagnostics) {
    const sorted = [...candidates].sort(compare);
    if (!sorted.length) return null;
    const best = sorted[0];
    const tied = sorted.filter(item => item.packPriority === best.packPriority &&
      item.priority === best.priority);
    if (new Set(tied.map(semanticShape)).size > 1) {
      return fallback(observed, observed.pageObjectId ? "runtime-metadata" :
        "generic-fallback", observed.pageObjectId ? 0.6 : 0.25,
      [...diagnostics, diagnostic("ambiguous-page-identification",
        "Equal-priority page definitions conflict; semantic classification was omitted.",
        { ruleIds: tied.map(item => item.ruleId) })]);
    }
    return known(observed.pageObjectId, best, observed, source, confidence, diagnostics);
  }
  function normalizeObserved(input = {}) {
    return {
      pageObjectId: normalizePageObjectId(input.pageObjectId),
      legacyPageId: text(input.legacyPageId || input.pageId) || null,
      pageCaption: text(input.pageCaption || input.caption) || null,
      documentTitle: text(input.documentTitle) || null,
      frameUrl: text(input.frameUrl) || null,
      topUrl: text(input.topUrl) || null,
      locale: text(input.locale) || null
    };
  }
  function resolvePageIdentity(input = {}, knowledgePacks) {
    const observed = normalizeObserved(input);
    const compiled = knowledgePacks === undefined
      ? configuredCompilation || compile(configuredPacks)
      : compile(knowledgePacks);
    if (observed.pageObjectId) {
      const exact = compiled.definitions.filter(item =>
        item.pageObjectId === observed.pageObjectId);
      const selected = choose(exact, observed, "page-object-id", 1,
        compiled.diagnostics);
      if (selected) return selected;
      return fallback(observed, "runtime-metadata", 0.6, compiled.diagnostics);
    }
    const caption = compiled.definitions.filter(item =>
      captionMatches(item, observed.pageCaption, observed.locale));
    return choose(caption, observed, "caption-rule", 0.75,
      compiled.diagnostics) || fallback(observed, "generic-fallback", 0.25,
      compiled.diagnostics);
  }
  function identifyPage(observedContext = {}, options = {}) {
    return resolvePageIdentity(observedContext, options.knowledgePacks);
  }
  function getPageDefinition(value, knowledgePacks) {
    const pageObjectId = normalizePageObjectId(value);
    if (!pageObjectId) return null;
    const observed = { pageObjectId };
    const compiled = knowledgePacks === undefined
      ? configuredCompilation || compile(configuredPacks)
      : compile(knowledgePacks);
    const candidates = compiled.definitions.filter(item =>
      item.pageObjectId === pageObjectId);
    const result = choose(candidates, observed, "page-object-id", 1,
      compiled.diagnostics);
    return result?.ruleId ? result : null;
  }
  function configureKnowledgePacks(packs = []) {
    configuredPacks = clone(Array.isArray(packs) ? packs : []);
    configurationRevision += 1;
    const result = compile(configuredPacks);
    configuredCompilation = result;
    return freeze({ packCount: configuredPacks.length,
      definitionCount: result.definitions.length,
      diagnostics: clone(result.diagnostics) });
  }
  function configurationVersion() { return configurationRevision; }
  async function loadKnowledgePacks(options = {}) {
    const fetchJson = options.fetchJson || (async url => {
      const response = await fetch(url); return response.json();
    });
    const index = await fetchJson(options.indexUrl);
    const packs = [];
    for (const descriptor of index.packs || []) {
      if (descriptor.enabled === false) continue;
      const url = options.resolveUrl ? options.resolveUrl(descriptor.file) :
        descriptor.file;
      packs.push(await fetchJson(url));
    }
    return { packs: freeze(clone(packs)),
      validation: configureKnowledgePacks(packs) };
  }
  return { VERSION, PAGE_TYPES, normalizePageObjectId, validatePageDefinition,
    validateKnowledgePacks: compile, resolvePageIdentity, identifyPage,
    getPageDefinition, configureKnowledgePacks, configurationVersion,
    loadKnowledgePacks };
});
