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
      document: {
        fontFamily: "Arial", fontSize: 11, lineHeight: 1.15,
        paragraphAfter: 6,
        margins: { top: 20, right: 20, bottom: 20, left: 20,
          header: 10, footer: 10, unit: "mm" }
      },
      header: {
        textColor: "{colors.muted}", borderColor: "{colors.primary}",
        fontSize: 9
      },
      footer: {
        textColor: "{colors.muted}", borderColor: "{colors.border}",
        fontSize: 9
      },
      cover: {
        accentColor: "{colors.primary}", mutedColor: "{colors.muted}",
        brandSize: 12, documentTypeSize: 13, titleSize: 26,
        subtitleSize: 13, metadataWidth: 100,
        spacing: { brandAfter: 6, typeAfter: 8, titleAfter: 11,
          subtitleAfter: 18 }
      },
      metadataTable: {
        width: 100, labelWidth: 30, borderColor: "{colors.border}",
        labelFill: "{colors.background}", valueFill: "{colors.background}",
        cellPadding: 4
      },
      heading: { dividerColor: "{colors.primary}", dividerSize: 0 },
      step: {
        accentColor: "{colors.primary}", headingColor: "{colors.primary}",
        headingStyle: "plain"
      },
      screenshot: {
        maxWidth: 590, maxHeight: 390, presentationStyle: "plain"
      },
      callout: { noteColor: "{colors.note}", warningColor: "{colors.warning}" },
      table: { borderColor: "{colors.border}" },
      revisionHistory: { borderColor: "{colors.border}" },
      toc: { textColor: "{colors.text}", title: "Innehåll" }
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
    displayName: "BC Process Studio",
    description: "BC Process Studio document appearance.",
    extends: "base",
    colors: {
      primary: "#007a82",
      secondary: "#596673",
      text: "#172b45",
      note: "#f0f7f7"
    },
    spacing: { page: 10, section: 9, paragraph: 5, component: 7 },
    typography: {
      title: { family: "Segoe UI", size: 26, weight: 700, color: "#172b45" },
      heading1: { family: "Segoe UI", size: 16, weight: 700, color: "{colors.primary}" },
      heading2: { family: "Segoe UI", size: 13, weight: 700, color: "{colors.primary}" },
      body: { family: "Segoe UI", size: 11, weight: 400, color: "{colors.text}" },
      caption: { family: "Segoe UI", size: 9, weight: 400, color: "{colors.muted}" }
    },
    components: {
      document: {
        fontFamily: "Segoe UI", fontSize: 11, lineHeight: 1.18,
        paragraphAfter: 5,
        margins: { top: 17, right: 16, bottom: 17, left: 18,
          header: 9, footer: 9, unit: "mm" }
      },
      header: {
        textColor: "#ffffff", borderColor: "#05474f", fillColor: "#05474f", fontSize: 9
      },
      footer: {
        textColor: "#596673", borderColor: "#ccdee0", fontSize: 9
      },
      cover: {
        brandText: "BC Process Studio",
        documentType: "Arbetsinstruktion",
        subtitle: "Business Central Process Documentation",
        accentColor: "#172b45",
        mutedColor: "#5f6b76",
        dividerColor: "#007a82",
        dividerSize: 0,
        brandSize: 11,
        documentTypeSize: 14,
        titleSize: 28,
        subtitleSize: 12,
        metadataWidth: 90,
        spacing: { brandAfter: 8, typeAfter: 12, titleAfter: 8,
          subtitleAfter: 18 }
      },
      metadataTable: {
        width: 90,
        labelWidth: 34,
        labelFill: "#f0f7f7",
        valueFill: "#ffffff",
        borderColor: "#b8c2cc",
        insideBorderColor: "#d5dce3",
        cellPadding: 5,
        groupSpacing: 2,
        style: "compact"
      },
      heading: {
        dividerColor: "#007a82",
        dividerSize: 8,
        before: 14,
        after: 7
      },
      step: {
        headingColor: "#007a82",
        headingFill: "#f0f7f7",
        headingBorderColor: "#007a82",
        headingStyle: "band",
        instructionSize: 11,
        instructionColor: "#172b45",
        contentPadding: 6,
        before: 9,
        after: 5
      },
      screenshot: {
        maxWidth: 620,
        maxHeight: 385,
        supportingMaxWidth: 570,
        adaptiveFit: true,
        panoramicMaxHeight: 330,
        portraitMaxWidth: 480,
        presentationStyle: "framed",
        borderColor: "#ccdee0",
        backgroundColor: "#ffffff",
        borderSize: 4,
        cellPadding: 4,
        before: 5,
        after: 9
      },
      callout: {
        presentationStyle: "inline",
        borderColor: "#2673a8",
        fillColor: "#edf6fb",
        labelColor: "#0f4c81",
        borderSize: 12,
        roleStyles: {
          information: { borderColor: "#2673a8", fillColor: "#edf6fb" },
          note: { borderColor: "#2673a8", fillColor: "#edf6fb" },
          warning: { borderColor: "#c27a00", fillColor: "#fff4d6" },
          tip: { borderColor: "#2f855a", fillColor: "#edf8f2" },
          decision: { borderColor: "#6b46a1", fillColor: "#f4effb" },
          example: { borderColor: "#5f6b76", fillColor: "#f3f5f7" }
        },
        before: 3,
        after: 6
      },
      table: {
        borderColor: "#b8c2cc",
        insideBorderColor: "#d5dce3",
        headerFill: "#eaf2f8",
        rowIntegrity: true,
        cellPadding: 4,
        before: 6,
        after: 9
      },
      revisionHistory: {
        headerFill: "#d9eaf7",
        borderColor: "#b8c2cc",
        insideBorderColor: "#d5dce3",
        headerEmphasis: true,
        rowIntegrity: true,
        cellPadding: 4,
        before: 6,
        after: 8
      },
      toc: { textColor: "{colors.text}", title: "Innehåll" }
    },
    branding: {
      organizationName: "BC Process Studio",
      footer: "BC Process Studio"
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
