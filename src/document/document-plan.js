(function (root, factory) {
  const components = typeof module === "object" && module.exports
    ? require("./document-components")
    : root.T9DocumentComponents;
  const api = factory(components);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentPlan = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (components) {
  const PLAN_SCHEMA_VERSION = "1.0.0";
  const PAGE_INTENTS = Object.freeze([
    "normal", "newSection", "newPage", "appendix"
  ]);

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
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
      content: object(input.content),
      components: Array.isArray(input.components)
        ? input.components.map(components.normalizeComponent)
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
            ? section.components.map(components.normalizeComponent)
            : []
        }))
        : [],
      metadata: object(input.metadata)
    };
    return components.deepFreeze(normalized);
  }

  function serialize(value) {
    return JSON.stringify(value);
  }

  function deserialize(value) {
    return normalize(JSON.parse(value));
  }

  return {
    PAGE_INTENTS,
    PLAN_SCHEMA_VERSION,
    deepFreeze: components.deepFreeze,
    deserialize,
    normalize,
    serialize
  };
});
