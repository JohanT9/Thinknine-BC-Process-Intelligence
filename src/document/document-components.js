(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentComponents = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const COMPONENT_SCHEMA_VERSION = "1.0.0";

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
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function normalizeDefinition(value) {
    const input = clone(object(value));
    return deepFreeze({
      ...input,
      componentSchemaVersion: typeof input.componentSchemaVersion === "string"
        ? input.componentSchemaVersion
        : COMPONENT_SCHEMA_VERSION,
      kind: typeof input.kind === "string" ? input.kind : "",
      semanticRole: typeof input.semanticRole === "string"
        ? input.semanticRole
        : "content",
      requiredContent: Array.isArray(input.requiredContent)
        ? clone(input.requiredContent)
        : [],
      requiredSourceRefs: Array.isArray(input.requiredSourceRefs)
        ? clone(input.requiredSourceRefs)
        : [],
      accessibility: object(input.accessibility),
      presentationIntent: object(input.presentationIntent),
      themeTokenReferences: Array.isArray(input.themeTokenReferences)
        ? clone(input.themeTokenReferences)
        : [],
      capabilityRequirements: Array.isArray(input.capabilityRequirements)
        ? clone(input.capabilityRequirements)
        : []
    });
  }

  function normalizeComponent(value) {
    const input = clone(object(value));
    return deepFreeze({
      ...input,
      componentId: typeof input.componentId === "string"
        ? input.componentId
        : "",
      kind: typeof input.kind === "string" ? input.kind : "generic",
      content: object(input.content),
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
      accessibility: object(input.accessibility),
      presentationIntent: object(input.presentationIntent),
      themeTokenReferences: Array.isArray(input.themeTokenReferences)
        ? clone(input.themeTokenReferences)
        : [],
      capabilityRequirements: Array.isArray(input.capabilityRequirements)
        ? clone(input.capabilityRequirements)
        : [],
      components: Array.isArray(input.components)
        ? input.components.map(normalizeComponent)
        : []
    });
  }

  function serialize(value) {
    return JSON.stringify(value);
  }

  function deserializeDefinition(value) {
    return normalizeDefinition(JSON.parse(value));
  }

  function deserializeComponent(value) {
    return normalizeComponent(JSON.parse(value));
  }

  return {
    COMPONENT_SCHEMA_VERSION,
    deepFreeze,
    deserializeComponent,
    deserializeDefinition,
    normalizeComponent,
    normalizeDefinition,
    serialize
  };
});
