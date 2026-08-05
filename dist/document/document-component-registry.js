(function (root, factory) {
  const components = typeof module === "object" && module.exports
    ? require("./document-components")
    : root.T9DocumentComponents;
  const api = factory(components);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentComponentRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (components) {
  const definitions = [
    ["cover", "documentCover", ["title", "documentId", "metadataComponentId"], [], "document cover",
      ["components.cover"], ["supportsCover"]],
    ["header", "runningHeader", ["title"], ["documentId"], "document header",
      ["components.header"], ["supportsHeader"]],
    ["footer", "runningFooter", ["text", "pageLabel", "totalSeparator", "pageFieldIntent"],
      ["documentId"], "document footer", ["components.footer"],
      ["supportsFooter"]],
    ["metadata", "metadataTable", ["rows", "accessibilityLabel"], ["documentId"],
      "document metadata", ["components.metadataTable"], []],
    ["workflow", "workflowSection", ["heading", "stepComponentIds"], ["sectionId"], "workflow section",
      [], []],
    ["step", "workflowStep", ["stepNumber", "title", "instruction",
      "commentComponentIds", "screenshotComponentIds"], ["blockId"],
      "workflow step", ["components.step"], []],
    ["screenshot", "screenshot", ["assetId", "altTitle", "description",
      "captionIntent", "presentationRole"],
      ["blockId", "assetId"], "process screenshot",
      ["components.screenshot"], []],
    ["callout", "callout", ["calloutType", "label", "text"], ["blockId"], "callout",
      ["components.callout"], ["supportsCallouts"]],
    ["revisionHistory", "revisionHistory", ["entries", "columns"], ["blockId"],
      "revision history", ["components.revisionHistory"],
      ["supportsRevisionHistory"]],
    ["toc", "tableOfContents", ["headingLevelRange", "updateField"], ["blockId"], "table of contents",
      ["components.toc"], ["supportsTOC"]],
    ["pageBreak", "pageBreak", [], ["blockId"], "page break", [], []],
    ["heading", "heading", ["text", "level"], ["blockId"], "heading",
      ["components.heading"], []],
    ["paragraph", "paragraph", ["text"], ["blockId"], "paragraph", [], []],
    ["table", "table", [], ["blockId"], "table",
      ["components.table"], []],
    ["list", "list", [], ["blockId"], "list", [], []],
    ["group", "group", [], [], "content group", [], []],
    ["generic", "content", [], [], "document content", [], []]
  ].map(([kind, semanticRole, requiredContent, requiredSourceRefs,
    accessibilityLabel, themeTokenReferences, capabilityRequirements]) =>
    components.normalizeDefinition({
      kind,
      semanticRole,
      requiredContent,
      requiredSourceRefs,
      accessibility: { role: "document", label: accessibilityLabel },
      presentationIntent: { rendererNeutral: true },
      themeTokenReferences,
      capabilityRequirements
    }));

  function createRegistry(values = []) {
    const byKind = new Map();
    values.forEach(value => {
      const definition = components.normalizeDefinition(value);
      if (!definition.kind) {
        throw new TypeError("Document component definition requires a kind.");
      }
      if (byKind.has(definition.kind)) {
        throw new Error(`Duplicate document component kind: ${definition.kind}.`);
      }
      byKind.set(definition.kind, definition);
    });
    return components.deepFreeze({
      definitions: [...byKind.values()],
      kinds: [...byKind.keys()]
    });
  }

  const BUILT_IN_REGISTRY = createRegistry(definitions);

  function get(registry, kind) {
    return registry.definitions.find(item => item.kind === kind) || null;
  }

  function extend(registry, values) {
    return createRegistry([...registry.definitions, ...(values || [])]);
  }

  function contract(registry, kind, overrides = {}) {
    const definition = get(registry, kind) || components.normalizeDefinition({
      kind,
      semanticRole: "futureComponent",
      accessibility: { role: "document", label: kind || "document content" },
      presentationIntent: { rendererNeutral: true }
    });
    return {
      accessibility: {
        ...definition.accessibility,
        ...(overrides.accessibility || {})
      },
      presentationIntent: {
        ...definition.presentationIntent,
        ...(overrides.presentationIntent || {})
      },
      themeTokenReferences: [...definition.themeTokenReferences],
      capabilityRequirements: [...definition.capabilityRequirements]
    };
  }

  return {
    BUILT_IN_REGISTRY,
    contract,
    createRegistry,
    extend,
    get
  };
});
