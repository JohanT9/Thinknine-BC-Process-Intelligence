(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentTheme = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const THEME_VERSION = "1.0.0";
  const TOKEN_GROUPS = Object.freeze({
    colors: Object.freeze([
      "primary", "secondary", "text", "muted", "border", "warning",
      "note", "success", "background"
    ]),
    typography: Object.freeze([
      "title", "heading1", "heading2", "body", "caption"
    ]),
    spacing: Object.freeze([
      "page", "section", "paragraph", "component"
    ]),
    page: Object.freeze([
      "size", "orientation", "background"
    ]),
    branding: Object.freeze([
      "organizationName", "logo", "footer"
    ]),
    components: Object.freeze([
      "cover", "metadataTable", "step", "callout", "revisionHistory", "toc"
    ])
  });
  const CAPABILITIES = Object.freeze([
    "supportsCover",
    "supportsHeader",
    "supportsFooter",
    "supportsRevisionHistory",
    "supportsTOC",
    "supportsBranding",
    "supportsCallouts"
  ]);
  const TOKEN_REFERENCE = /^\{([a-z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)\}$/;

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

  function normalize(value) {
    const input = clone(object(value));
    const normalized = {
      ...input,
      themeId: typeof input.themeId === "string" ? input.themeId : "",
      version: typeof input.version === "string"
        ? input.version
        : THEME_VERSION,
      displayName: typeof input.displayName === "string"
        ? input.displayName
        : "",
      description: typeof input.description === "string"
        ? input.description
        : "",
      extends: typeof input.extends === "string" ? input.extends : null,
      colors: object(input.colors),
      typography: object(input.typography),
      spacing: object(input.spacing),
      page: object(input.page),
      branding: object(input.branding),
      components: object(input.components),
      capabilities: Array.isArray(input.capabilities)
        ? clone(input.capabilities)
        : [],
      metadata: object(input.metadata)
    };
    return deepFreeze(normalized);
  }

  function merge(base, override) {
    if (override === undefined) return clone(base);
    if (Array.isArray(override)) return clone(override);
    if (!override || typeof override !== "object") return clone(override);
    const result = clone(object(base));
    for (const [key, value] of Object.entries(override)) {
      const baseValue = result[key];
      result[key] = value && typeof value === "object" &&
          !Array.isArray(value) && baseValue &&
          typeof baseValue === "object" && !Array.isArray(baseValue)
        ? merge(baseValue, value)
        : clone(value);
    }
    return result;
  }

  function tokenValue(theme, reference) {
    const match = TOKEN_REFERENCE.exec(reference);
    if (!match) return undefined;
    return theme[match[1]]?.[match[2]];
  }

  function resolveTokenValue(value, theme, chain = []) {
    if (typeof value === "string" && TOKEN_REFERENCE.test(value)) {
      if (chain.includes(value)) {
        throw new Error(`Cyclic theme token reference: ${[...chain, value].join(" -> ")}.`);
      }
      const referenced = tokenValue(theme, value);
      if (referenced === undefined) {
        throw new Error(`Unknown theme token reference: ${value}.`);
      }
      return resolveTokenValue(referenced, theme, [...chain, value]);
    }
    if (Array.isArray(value)) {
      return value.map(item => resolveTokenValue(item, theme, chain));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        key,
        resolveTokenValue(child, theme, chain)
      ]));
    }
    return clone(value);
  }

  function resolveTokens(value) {
    const theme = normalize(value);
    const resolved = clone(theme);
    for (const group of Object.keys(TOKEN_GROUPS)) {
      resolved[group] = resolveTokenValue(theme[group], theme);
    }
    return normalize(resolved);
  }

  function serialize(theme) {
    return JSON.stringify(theme);
  }

  function deserialize(value) {
    return normalize(JSON.parse(value));
  }

  return {
    CAPABILITIES,
    THEME_VERSION,
    TOKEN_GROUPS,
    TOKEN_REFERENCE,
    deepFreeze,
    deserialize,
    merge,
    normalize,
    resolveTokens,
    serialize,
    tokenValue
  };
});
