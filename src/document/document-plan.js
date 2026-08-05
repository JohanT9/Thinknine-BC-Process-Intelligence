(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentPlan = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PLAN_SCHEMA_VERSION = "1.0.0";
  const PAGE_INTENTS = Object.freeze([
    "normal", "newSection", "newPage", "appendix"
  ]);
  const COMPONENT_KINDS = Object.freeze([
    "header", "footer", "cover", "metadata", "workflow", "step",
    "heading", "paragraph", "screenshot", "table", "callout", "list",
    "revisionHistory", "toc", "pageBreak", "group", "generic"
  ]);
  const CAPABILITY_BY_COMPONENT = Object.freeze({
    header: "supportsHeader",
    footer: "supportsFooter",
    cover: "supportsCover",
    callout: "supportsCallouts",
    revisionHistory: "supportsRevisionHistory",
    toc: "supportsTOC"
  });

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
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  }

  function normalizeComponent(value) {
    const input = clone(object(value));
    return {
      ...input,
      componentId: typeof input.componentId === "string"
        ? input.componentId
        : "",
      kind: typeof input.kind === "string" ? input.kind : "generic",
      sourceRef: object(input.sourceRef),
      placement: typeof input.placement === "string"
        ? input.placement
        : "flow",
      grouping: typeof input.grouping === "string" ? input.grouping : "none",
      priority: Number.isFinite(input.priority) ? input.priority : 0,
      pageIntent: typeof input.pageIntent === "string"
        ? input.pageIntent
        : "normal",
      keepTogether: Boolean(input.keepTogether),
      keepWithNext: Boolean(input.keepWithNext),
      visibility: typeof input.visibility === "string"
        ? input.visibility
        : "visible",
      spacingIntent: object(input.spacingIntent),
      appearance: object(input.appearance),
      components: Array.isArray(input.components)
        ? input.components.map(normalizeComponent)
        : []
    };
  }

  function normalize(value) {
    const input = clone(object(value));
    const normalized = {
      ...input,
      planSchemaVersion: typeof input.planSchemaVersion === "string"
        ? input.planSchemaVersion
        : PLAN_SCHEMA_VERSION,
      plannerVersion: typeof input.plannerVersion === "string"
        ? input.plannerVersion
        : "",
      planId: typeof input.planId === "string" ? input.planId : "",
      documentRef: object(input.documentRef),
      themeRef: object(input.themeRef),
      flow: typeof input.flow === "string" ? input.flow : "document",
      page: object(input.page),
      spacing: object(input.spacing),
      components: Array.isArray(input.components)
        ? input.components.map(normalizeComponent)
        : [],
      sections: Array.isArray(input.sections)
        ? input.sections.map(section => ({
          ...clone(object(section)),
          planSectionId: typeof section?.planSectionId === "string"
            ? section.planSectionId
            : "",
          sourceSectionId: typeof section?.sourceSectionId === "string"
            ? section.sourceSectionId
            : "",
          kind: typeof section?.kind === "string" ? section.kind : "content",
          flow: typeof section?.flow === "string"
            ? section.flow
            : "sequential",
          pageIntent: typeof section?.pageIntent === "string"
            ? section.pageIntent
            : "normal",
          keepTogether: Boolean(section?.keepTogether),
          spacingIntent: object(section?.spacingIntent),
          components: Array.isArray(section?.components)
            ? section.components.map(normalizeComponent)
            : []
        }))
        : [],
      metadata: object(input.metadata)
    };
    return deepFreeze(normalized);
  }

  function serialize(value) {
    return JSON.stringify(value);
  }

  function deserialize(value) {
    return normalize(JSON.parse(value));
  }

  return {
    COMPONENT_KINDS,
    CAPABILITY_BY_COMPONENT,
    PAGE_INTENTS,
    PLAN_SCHEMA_VERSION,
    deepFreeze,
    deserialize,
    normalize,
    serialize
  };
});
