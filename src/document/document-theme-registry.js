(function (root, factory) {
  const theme = typeof module === "object" && module.exports
    ? require("./document-theme")
    : root.T9DocumentTheme;
  const validation = typeof module === "object" && module.exports
    ? require("./document-theme-validation")
    : root.T9DocumentThemeValidation;
  const api = factory(theme, validation);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentThemeRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  theme,
  validation
) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function create(themes = []) {
    return theme.deepFreeze({
      themes: Array.isArray(themes) ? clone(themes) : []
    });
  }

  function register(registry, value) {
    return create([...(registry?.themes || []), clone(value)]);
  }

  function matches(registry, themeId) {
    return (registry?.themes || []).filter(item => item?.themeId === themeId);
  }

  function get(registry, themeId) {
    const found = matches(registry, themeId);
    return found.length === 1 ? theme.normalize(found[0]) : null;
  }

  function list(registry) {
    return theme.deepFreeze((registry?.themes || []).map(theme.normalize));
  }

  function inheritanceChain(registry, themeId, chain = []) {
    if (chain.includes(themeId)) {
      throw new Error(`Cyclic theme inheritance: ${[...chain, themeId].join(" -> ")}.`);
    }
    const candidates = matches(registry, themeId);
    if (candidates.length !== 1) {
      const reason = candidates.length ? "duplicate" : "missing";
      throw new Error(`Theme inheritance is ${reason}: ${themeId}.`);
    }
    const current = candidates[0];
    if (!current.extends) return [current];
    return [
      ...inheritanceChain(registry, current.extends, [...chain, themeId]),
      current
    ];
  }

  function resolve(registry, themeId, overrides = {}) {
    const chain = inheritanceChain(registry, themeId);
    const inherited = chain.reduce(
      (result, current) => theme.merge(result, current),
      {}
    );
    const withOverrides = theme.merge(inherited, overrides);
    withOverrides.themeId = themeId;
    return theme.resolveTokens(withOverrides);
  }

  function addIssue(issues, code, path, message, severity = "error") {
    issues.push({ code, path, message, severity });
  }

  function validateRegistry(registry) {
    const issues = [];
    const themes = Array.isArray(registry?.themes) ? registry.themes : [];
    if (!Array.isArray(registry?.themes)) {
      addIssue(issues, "malformed-theme-registry", "$.themes",
        "Theme registry must contain a themes array.");
    }
    const indexesById = new Map();
    themes.forEach((value, index) => {
      const normalized = theme.normalize(value);
      const ownValidation = validation.validate(value, {
        allowPartial: true,
        requireValues: false,
        validateReferences: false
      });
      ownValidation.issues.forEach(entry => issues.push({
        ...entry,
        path: `$.themes[${index}]${entry.path.slice(1)}`
      }));
      if (normalized.themeId) {
        const indexes = indexesById.get(normalized.themeId) || [];
        indexes.push(index);
        indexesById.set(normalized.themeId, indexes);
      }
    });
    for (const [themeId, indexes] of indexesById) {
      if (indexes.length > 1) {
        indexes.slice(1).forEach(index => addIssue(
          issues,
          "duplicate-theme-id",
          `$.themes[${index}].themeId`,
          `Duplicate theme ID: ${themeId}.`
        ));
      }
    }
    themes.forEach((value, index) => {
      const themeId = value?.themeId;
      if (!themeId || (indexesById.get(themeId)?.length || 0) !== 1) return;
      if (value.extends && !indexesById.has(value.extends)) {
        addIssue(issues, "invalid-inheritance", `$.themes[${index}].extends`,
          `Parent theme does not exist: ${value.extends}.`);
        return;
      }
      try {
        const resolved = resolve(registry, themeId);
        const resolvedValidation = validation.validate(resolved, {
          requireValues: true
        });
        resolvedValidation.issues.forEach(entry => issues.push({
          ...entry,
          path: `$.themes[${index}].resolved${entry.path.slice(1)}`
        }));
      } catch (error) {
        const cyclic = error.message.startsWith("Cyclic theme inheritance");
        addIssue(
          issues,
          cyclic ? "cyclic-inheritance" : "invalid-inheritance",
          `$.themes[${index}].extends`,
          error.message
        );
      }
    });
    return {
      valid: !issues.some(entry => entry.severity === "error"),
      issues
    };
  }

  const BASE_THEME = {
    themeId: "base",
    themeSchemaVersion: theme.THEME_SCHEMA_VERSION,
    version: theme.THEME_VERSION,
    displayName: "Base",
    description: "Complete renderer-independent document appearance defaults.",
    colors: {
      primary: "#1f2937",
      secondary: "#4b5563",
      text: "#111827",
      muted: "#6b7280",
      border: "#d1d5db",
      warning: "#b45309",
      note: "#1d4ed8",
      success: "#047857",
      background: "#ffffff"
    },
    typography: {
      title: { family: "Arial", size: 30, weight: 700, color: "{colors.primary}" },
      heading1: { family: "Arial", size: 22, weight: 700, color: "{colors.primary}" },
      heading2: { family: "Arial", size: 16, weight: 700, color: "{colors.text}" },
      body: { family: "Arial", size: 11, weight: 400, color: "{colors.text}" },
      caption: { family: "Arial", size: 9, weight: 400, color: "{colors.muted}" }
    },
    spacing: { page: 8, section: 6, paragraph: 3, component: 4 },
    page: { size: "A4", orientation: "portrait", background: "{colors.background}" },
    branding: { organizationName: "", logo: "", footer: "" },
    components: {
      cover: { accentColor: "{colors.primary}" },
      metadataTable: { borderColor: "{colors.border}" },
      step: { accentColor: "{colors.primary}" },
      callout: { noteColor: "{colors.note}", warningColor: "{colors.warning}" },
      revisionHistory: { borderColor: "{colors.border}" },
      toc: { textColor: "{colors.text}" }
    },
    capabilities: [
      "supportsCover",
      "supportsHeader",
      "supportsFooter",
      "supportsRevisionHistory",
      "supportsTOC",
      "supportsBranding",
      "supportsCallouts"
    ],
    metadata: { builtIn: true },
    origin: { provider: "built-in", package: "thinknine", id: "base" },
    compatibility: { semanticDocument: "1.0.0", planner: "1.0.0" }
  };

  const BUILT_IN_THEMES = theme.deepFreeze([BASE_THEME, {
    themeId: "thinknine",
    themeSchemaVersion: theme.THEME_SCHEMA_VERSION,
    version: theme.THEME_VERSION,
    displayName: "Thinknine",
    description: "Thinknine document appearance.",
    extends: "base",
    colors: {
      primary: "#0f4c81",
      secondary: "#5f6b76",
      note: "#dbeafe"
    },
    branding: {
      organizationName: "Thinknine AB",
      footer: "Thinknine Process Intelligence"
    },
    metadata: { builtIn: true },
    origin: { provider: "built-in", package: "thinknine", id: "thinknine" }
  }, {
    themeId: "minimal",
    themeSchemaVersion: theme.THEME_SCHEMA_VERSION,
    version: theme.THEME_VERSION,
    displayName: "Minimal",
    description: "Quiet document appearance with restrained accents.",
    extends: "base",
    colors: {
      primary: "#111827",
      secondary: "#6b7280",
      border: "#e5e7eb"
    },
    capabilities: [
      "supportsCover",
      "supportsFooter",
      "supportsRevisionHistory",
      "supportsTOC",
      "supportsCallouts"
    ],
    metadata: { builtIn: true },
    origin: { provider: "built-in", package: "thinknine", id: "minimal" }
  }, {
    themeId: "corporate",
    themeSchemaVersion: theme.THEME_SCHEMA_VERSION,
    version: theme.THEME_VERSION,
    displayName: "Corporate",
    description: "Neutral corporate document appearance.",
    extends: "base",
    colors: {
      primary: "#17365d",
      secondary: "#44546a",
      border: "#a5b4c6"
    },
    typography: {
      title: { family: "Arial", size: 28, weight: 700, color: "{colors.primary}" }
    },
    metadata: { builtIn: true },
    origin: { provider: "built-in", package: "thinknine", id: "corporate" }
  }]);
  const BUILT_IN_REGISTRY = create(BUILT_IN_THEMES);

  return {
    BUILT_IN_REGISTRY,
    BUILT_IN_THEMES,
    create,
    get,
    inheritanceChain,
    list,
    register,
    resolve,
    validate: validateRegistry
  };
});
