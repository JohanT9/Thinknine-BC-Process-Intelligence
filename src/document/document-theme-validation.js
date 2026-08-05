(function (root, factory) {
  const theme = typeof module === "object" && module.exports
    ? require("./document-theme")
    : root.T9DocumentTheme;
  const api = factory(theme);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentThemeValidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (theme) {
  const REQUIRED_TOKENS = Object.freeze([
    "colors.primary",
    "colors.text",
    "colors.background",
    "typography.title",
    "typography.heading1",
    "typography.heading2",
    "typography.body",
    "typography.caption",
    "spacing.page",
    "spacing.section",
    "spacing.paragraph",
    "spacing.component",
    "page.size",
    "page.orientation"
  ]);

  function issue(issues, code, path, message, severity = "error") {
    issues.push({ code, path, message, severity });
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function validateStringTokens(value, group, issues) {
    if (!object(value)) {
      issue(issues, "invalid-token-group", `$.${group}`,
        `${group} must be an object.`);
      return;
    }
    for (const [name, token] of Object.entries(value)) {
      if (typeof token !== "string" || !token.trim()) {
        issue(issues, "invalid-token", `$.${group}.${name}`,
          `${group}.${name} must be a non-empty string.`);
      }
    }
  }

  function validateTypography(value, issues) {
    if (!object(value)) {
      issue(issues, "invalid-token-group", "$.typography",
        "typography must be an object.");
      return;
    }
    for (const [name, token] of Object.entries(value)) {
      if (!object(token)) {
        issue(issues, "invalid-token", `$.typography.${name}`,
          `typography.${name} must be an object.`);
        continue;
      }
      if (token.family !== undefined &&
          (typeof token.family !== "string" || !token.family.trim())) {
        issue(issues, "invalid-token", `$.typography.${name}.family`,
          "Typography family must be a non-empty string.");
      }
      for (const field of ["size", "lineHeight"]) {
        if (token[field] !== undefined &&
            (!Number.isFinite(token[field]) || token[field] <= 0)) {
          issue(issues, "invalid-token", `$.typography.${name}.${field}`,
            `${field} must be a positive finite number.`);
        }
      }
      if (token.color !== undefined &&
          (typeof token.color !== "string" || !token.color.trim())) {
        issue(issues, "invalid-token", `$.typography.${name}.color`,
          "Typography color must be a non-empty string or token reference.");
      }
    }
  }

  function validateSpacing(value, issues) {
    if (!object(value)) {
      issue(issues, "invalid-token-group", "$.spacing",
        "spacing must be an object.");
      return;
    }
    for (const [name, token] of Object.entries(value)) {
      if (!Number.isFinite(token) || token < 0) {
        issue(issues, "invalid-token", `$.spacing.${name}`,
          `spacing.${name} must be a non-negative finite number.`);
      }
    }
  }

  function validatePage(value, issues) {
    validateStringTokens(value, "page", issues);
    if (object(value) && value.orientation !== undefined &&
        !["portrait", "landscape"].includes(value.orientation)) {
      issue(issues, "invalid-token", "$.page.orientation",
        "Page orientation must be portrait or landscape.");
    }
  }

  function validateBranding(value, issues) {
    if (!object(value)) {
      issue(issues, "invalid-token-group", "$.branding",
        "branding must be an object.");
      return;
    }
    for (const [name, token] of Object.entries(value)) {
      if (typeof token !== "string") {
        issue(issues, "invalid-token", `$.branding.${name}`,
          `branding.${name} must be a string.`);
      }
    }
  }

  function validateComponents(value, issues) {
    if (!object(value)) {
      issue(issues, "invalid-token-group", "$.components",
        "components must be an object.");
      return;
    }
    for (const [name, token] of Object.entries(value)) {
      if (!object(token)) {
        issue(issues, "invalid-token", `$.components.${name}`,
          `components.${name} must be an object.`);
      }
    }
  }

  function validateCapabilities(value, issues) {
    if (!Array.isArray(value)) {
      issue(issues, "invalid-capabilities", "$.capabilities",
        "Capabilities must be an array.");
      return;
    }
    const seen = new Set();
    value.forEach((capability, index) => {
      const path = `$.capabilities[${index}]`;
      if (typeof capability !== "string" || !capability.trim()) {
        issue(issues, "invalid-capability", path,
          "Capability must be a non-empty string.");
      } else if (seen.has(capability)) {
        issue(issues, "duplicate-capability", path,
          `Duplicate capability: ${capability}.`);
      } else {
        seen.add(capability);
        if (!theme.CAPABILITIES.includes(capability)) {
          issue(issues, "future-capability", path,
            `Unknown future capability is preserved: ${capability}.`, "warning");
        }
      }
    });
  }

  function valueAt(value, path) {
    return path.split(".").reduce((current, key) => current?.[key], value);
  }

  function validateRequired(value, issues, requireValues) {
    if (!requireValues) return;
    for (const path of REQUIRED_TOKENS) {
      if (valueAt(value, path) === undefined) {
        issue(issues, "missing-required-token", `$.${path}`,
          `Required theme token is missing: ${path}.`);
      }
    }
  }

  function validateReferences(value, issues) {
    function visit(child, path) {
      if (typeof child === "string") {
        const match = theme.TOKEN_REFERENCE.exec(child);
        if (match && value[match[1]]?.[match[2]] === undefined) {
          issue(issues, "invalid-token-reference", path,
            `Unknown theme token reference: ${child}.`);
        }
        return;
      }
      if (!child || typeof child !== "object") return;
      for (const [key, nested] of Object.entries(child)) {
        visit(nested, `${path}.${key}`);
      }
    }
    for (const group of Object.keys(theme.TOKEN_GROUPS)) {
      visit(value[group], `$.${group}`);
    }
  }

  function validate(value, options = {}) {
    const issues = [];
    if (!object(value)) {
      issue(issues, "malformed-theme", "$", "Theme must be an object.");
      return { valid: false, issues };
    }
    if (typeof value.themeId !== "string" || !value.themeId.trim()) {
      issue(issues, "missing-theme-id", "$.themeId",
        "Theme requires a stable theme ID.");
    }
    if (value.version === undefined && options.allowPartial) {
      // Normalization supplies the current version for legacy themes.
    } else if (typeof value.version !== "string" || !value.version.trim()) {
      issue(issues, "invalid-theme-version", "$.version",
        "Theme version must be a non-empty string.");
    } else if (value.version !== theme.THEME_VERSION) {
      issue(issues, "future-theme-version", "$.version",
        `Theme version ${value.version} is preserved.`, "warning");
    }
    if (value.themeSchemaVersion === undefined && options.allowPartial) {
      // Normalization supplies the schema version for legacy themes.
    } else if (typeof value.themeSchemaVersion !== "string" ||
        !value.themeSchemaVersion.trim()) {
      issue(issues, "invalid-theme-schema-version", "$.themeSchemaVersion",
        "Theme schema version must be a non-empty string.");
    } else if (value.themeSchemaVersion !== theme.THEME_SCHEMA_VERSION) {
      issue(issues, "future-theme-schema-version", "$.themeSchemaVersion",
        `Theme schema version ${value.themeSchemaVersion} is preserved.`, "warning");
    }
    if (typeof value.displayName !== "string" || !value.displayName.trim()) {
      issue(issues, "missing-display-name", "$.displayName",
        "Theme requires a display name.");
    }
    if (value.extends !== undefined && value.extends !== null &&
        (typeof value.extends !== "string" || !value.extends.trim())) {
      issue(issues, "invalid-inheritance", "$.extends",
        "Theme parent ID must be a non-empty string.");
    }
    if (value.origin !== undefined && !object(value.origin)) {
      issue(issues, "invalid-theme-origin", "$.origin",
        "Theme origin must be an object.");
    } else if (object(value.origin)) {
      for (const key of ["provider", "package", "id"]) {
        if (value.origin[key] !== undefined &&
            typeof value.origin[key] !== "string") {
          issue(issues, "invalid-theme-origin", `$.origin.${key}`,
            `Theme origin ${key} must be a string.`);
        }
      }
    }
    if (value.compatibility !== undefined && !object(value.compatibility)) {
      issue(issues, "invalid-theme-compatibility", "$.compatibility",
        "Theme compatibility must be an object.");
    } else if (object(value.compatibility)) {
      for (const key of ["semanticDocument", "planner"]) {
        if (value.compatibility[key] !== undefined &&
            (typeof value.compatibility[key] !== "string" ||
             !value.compatibility[key].trim())) {
          issue(issues, "invalid-theme-compatibility",
            `$.compatibility.${key}`,
            `Theme compatibility ${key} must be a non-empty string.`);
        }
      }
    }
    if (value.colors !== undefined || !options.allowPartial) {
      validateStringTokens(value.colors, "colors", issues);
    }
    if (value.typography !== undefined || !options.allowPartial) {
      validateTypography(value.typography, issues);
    }
    if (value.spacing !== undefined || !options.allowPartial) {
      validateSpacing(value.spacing, issues);
    }
    if (value.page !== undefined || !options.allowPartial) {
      validatePage(value.page, issues);
    }
    if (value.branding !== undefined || !options.allowPartial) {
      validateBranding(value.branding, issues);
    }
    if (value.components !== undefined || !options.allowPartial) {
      validateComponents(value.components, issues);
    }
    if (value.capabilities !== undefined || !options.allowPartial) {
      validateCapabilities(value.capabilities, issues);
    }
    if (options.validateReferences !== false) {
      validateReferences(value, issues);
    }
    validateRequired(value, issues, options.requireValues ?? !value.extends);
    return {
      valid: !issues.some(entry => entry.severity === "error"),
      issues
    };
  }

  return { REQUIRED_TOKENS, validate };
});
