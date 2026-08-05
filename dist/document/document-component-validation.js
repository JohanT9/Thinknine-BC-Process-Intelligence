(function (root, factory) {
  const registryApi = typeof module === "object" && module.exports
    ? require("./document-component-registry")
    : root.T9DocumentComponentRegistry;
  const api = factory(registryApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentComponentValidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (registryApi) {
  const CALLOUT_ROLES = Object.freeze([
    "information", "warning", "note", "tip", "decision", "example"
  ]);

  function issue(issues, code, path, message, severity = "error") {
    issues.push({ code, path, message, severity });
  }

  function validate(component, options = {}) {
    const issues = [];
    const registry = options.registry || registryApi.BUILT_IN_REGISTRY;
    const definition = registryApi.get(registry, component?.kind);
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      issue(issues, "malformed-component", "$", "Component must be an object.");
      return { valid: false, issues };
    }
    if (!definition) {
      issue(issues, "future-component-kind", "$.kind",
        `Unknown future component kind is preserved: ${component.kind}.`,
        "warning");
      return { valid: true, issues };
    }
    const isRevisionContainer = component.kind === "revisionHistory" &&
      !component.sourceRef?.blockId;
    for (const field of isRevisionContainer ? [] : definition.requiredContent) {
      if (component.content?.[field] === undefined) {
        issue(issues, "missing-component-content", `$.content.${field}`,
          `${component.kind} requires semantic content '${field}'.`);
      }
    }
    for (const field of isRevisionContainer ? [] : definition.requiredSourceRefs) {
      if (!component.sourceRef?.[field]) {
        issue(issues, "missing-component-reference", `$.sourceRef.${field}`,
          `${component.kind} requires source reference '${field}'.`);
      }
    }
    if (!component.accessibility?.label) {
      issue(issues, "missing-accessibility-label", "$.accessibility.label",
        `${component.kind} requires an accessibility label.`);
    }
    if (!component.presentationIntent?.rendererNeutral) {
      issue(issues, "renderer-specific-component", "$.presentationIntent",
        "Component presentation intent must remain renderer-neutral.");
    }
    for (const reference of definition.themeTokenReferences) {
      if (!component.themeTokenReferences?.includes(reference)) {
        issue(issues, "missing-theme-token-reference",
          "$.themeTokenReferences",
          `${component.kind} requires theme token reference '${reference}'.`);
      }
    }
    for (const capability of definition.capabilityRequirements) {
      if (!component.capabilityRequirements?.includes(capability)) {
        issue(issues, "missing-capability-requirement",
          "$.capabilityRequirements",
          `${component.kind} requires capability '${capability}'.`);
      }
    }
    if (component.kind === "callout" && component.content?.calloutType &&
        !CALLOUT_ROLES.includes(component.content.calloutType)) {
      issue(issues, "future-callout-role", "$.content.calloutType",
        `Unknown future callout role is preserved: ${component.content.calloutType}.`,
        "warning");
    }
    return {
      valid: !issues.some(item => item.severity === "error"),
      issues
    };
  }

  return { CALLOUT_ROLES, validate };
});
