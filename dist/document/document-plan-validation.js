(function (root, factory) {
  const plan = typeof module === "object" && module.exports
    ? require("./document-plan")
    : root.T9DocumentPlan;
  const themeModel = typeof module === "object" && module.exports
    ? require("./document-theme")
    : root.T9DocumentTheme;
  const api = factory(plan, themeModel);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentPlanValidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  plan,
  themeModel
) {
  function issue(issues, code, path, message, severity = "error") {
    issues.push({ code, path, message, severity });
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function validateId(value, path, ids, issues) {
    if (typeof value !== "string" || !value.trim()) {
      issue(issues, "missing-id", path, "A stable planning ID is required.");
    } else if (ids.has(value)) {
      issue(issues, "duplicate-id", path, `Duplicate planning ID: ${value}.`);
    } else {
      ids.add(value);
    }
  }

  function semanticReferences(document) {
    const sectionIds = new Set();
    const blockIds = new Set();
    const assetIds = new Set((document?.assets || []).map(asset => asset.assetId));
    function blocks(values) {
      (values || []).forEach(block => {
        if (block?.blockId) blockIds.add(block.blockId);
        blocks(block?.blocks);
        (block?.items || []).forEach(item => blocks(item?.blocks));
        (block?.rows || []).forEach(row =>
          (row?.cells || []).forEach(cell => blocks(cell?.blocks)));
      });
    }
    (document?.sections || []).forEach(section => {
      if (section?.sectionId) sectionIds.add(section.sectionId);
      blocks(section?.blocks);
    });
    return { assetIds, blockIds, sectionIds };
  }

  function validatePageIntent(value, path, issues) {
    if (typeof value !== "string" || !value.trim()) {
      issue(issues, "invalid-page-intent", path,
        "Page intent must be a non-empty string.");
    } else if (!plan.PAGE_INTENTS.includes(value)) {
      issue(issues, "future-page-intent", path,
        `Unknown future page intent is preserved: ${value}.`, "warning");
    }
  }

  function validateSourceRef(reference, path, context) {
    if (!object(reference)) {
      issue(context.issues, "invalid-reference", path,
        "Planning source reference must be an object.");
      return;
    }
    const { semantic } = context;
    if (!context.document) return;
    if (reference.documentId !== undefined &&
        reference.documentId !== context.document?.documentId) {
      issue(context.issues, "invalid-reference", `${path}.documentId`,
        "Component references another Semantic Document.");
    }
    if (reference.sectionId !== undefined &&
        !semantic.sectionIds.has(reference.sectionId)) {
      issue(context.issues, "invalid-reference", `${path}.sectionId`,
        "Component references a missing semantic section.");
    }
    if (reference.blockId !== undefined &&
        !semantic.blockIds.has(reference.blockId)) {
      issue(context.issues, "invalid-reference", `${path}.blockId`,
        "Component references a missing semantic block.");
    }
    if (reference.assetId !== undefined &&
        !semantic.assetIds.has(reference.assetId)) {
      issue(context.issues, "invalid-reference", `${path}.assetId`,
        "Component references a missing semantic asset.");
    }
  }

  function capabilityFor(kind) {
    return plan.CAPABILITY_BY_COMPONENT[kind];
  }

  function validateComponent(component, path, context) {
    if (!object(component)) {
      issue(context.issues, "malformed-component", path,
        "Plan component must be an object.");
      return;
    }
    validateId(component.componentId, `${path}.componentId`,
      context.ids, context.issues);
    if (typeof component.kind !== "string" || !component.kind.trim()) {
      issue(context.issues, "invalid-component-kind", `${path}.kind`,
        "Component kind must be a non-empty string.");
    } else if (!plan.COMPONENT_KINDS.includes(component.kind)) {
      issue(context.issues, "future-component-kind", `${path}.kind`,
        `Unknown future component kind is preserved: ${component.kind}.`,
        "warning");
    }
    validateSourceRef(component.sourceRef, `${path}.sourceRef`, context);
    validatePageIntent(component.pageIntent, `${path}.pageIntent`,
      context.issues);
    if (!["visible", "hidden"].includes(component.visibility)) {
      issue(context.issues, "invalid-visibility", `${path}.visibility`,
        "Component visibility must be visible or hidden.");
    }
    const capability = capabilityFor(component.kind);
    if (component.visibility === "visible" && capability &&
        !context.capabilities.has(capability)) {
      issue(context.issues, "capability-conflict", path,
        `${component.kind} is visible without ${capability}.`);
    }
    if (!context.capabilities.has("supportsBranding") &&
        object(component.appearance?.branding) &&
        Object.keys(component.appearance.branding).length) {
      issue(context.issues, "capability-conflict", `${path}.appearance.branding`,
        "Branding appearance is present without supportsBranding.");
    }
    if (component.sourceRef?.blockId) {
      context.plannedBlockIds.add(component.sourceRef.blockId);
    }
    context.componentKinds.push({
      kind: component.kind,
      visibility: component.visibility
    });
    if (!Array.isArray(component.components)) {
      issue(context.issues, "malformed-components", `${path}.components`,
        "Nested components must be an array.");
    } else {
      component.components.forEach((child, index) =>
        validateComponent(child, `${path}.components[${index}]`, context));
    }
  }

  function validate(value, options = {}) {
    const issues = [];
    if (!object(value)) {
      issue(issues, "malformed-document-plan", "$",
        "Document Plan must be an object.");
      return { valid: false, issues };
    }
    const ids = new Set();
    validateId(value.planId, "$.planId", ids, issues);
    if (typeof value.planSchemaVersion !== "string" ||
        !value.planSchemaVersion.trim()) {
      issue(issues, "invalid-plan-schema-version", "$.planSchemaVersion",
        "Plan schema version must be a non-empty string.");
    } else if (value.planSchemaVersion !== plan.PLAN_SCHEMA_VERSION) {
      issue(issues, "future-plan-schema-version", "$.planSchemaVersion",
        `Plan schema version ${value.planSchemaVersion} is preserved.`, "warning");
    }
    if (typeof value.plannerVersion !== "string" ||
        !value.plannerVersion.trim()) {
      issue(issues, "invalid-planner-version", "$.plannerVersion",
        "Planner version must be a non-empty string.");
    } else if (options.plannerVersion &&
        value.plannerVersion !== options.plannerVersion) {
      issue(issues, "future-planner-version", "$.plannerVersion",
        `Planner version ${value.plannerVersion} is preserved.`, "warning");
    }
    if (!object(value.documentRef) ||
        typeof value.documentRef.documentId !== "string" ||
        !value.documentRef.documentId.trim()) {
      issue(issues, "invalid-reference", "$.documentRef",
        "Plan must reference a Semantic Document.");
    }
    if (!object(value.themeRef) ||
        typeof value.themeRef.themeId !== "string" ||
        !value.themeRef.themeId.trim()) {
      issue(issues, "invalid-reference", "$.themeRef",
        "Plan must reference a resolved theme.");
    }
    const document = options.document;
    if (document && value.documentRef?.documentId !== document.documentId) {
      issue(issues, "invalid-reference", "$.documentRef.documentId",
        "Plan references another Semantic Document.");
    }
    const theme = options.theme;
    if (theme && value.themeRef?.themeId !== theme.themeId) {
      issue(issues, "invalid-reference", "$.themeRef.themeId",
        "Plan references another theme.");
    }
    if (theme && value.themeRef?.themeSchemaVersion !==
        theme.themeSchemaVersion) {
      issue(issues, "invalid-reference", "$.themeRef.themeSchemaVersion",
        "Plan references another theme schema version.");
    }
    if (theme) {
      const compatibility = theme.compatibility || {};
      if (!themeModel.isCompatible(
        compatibility.semanticDocument,
        value.documentRef?.schemaVersion
      ) || !themeModel.isCompatible(
        compatibility.planner,
        value.plannerVersion
      )) {
        issue(issues, "unsupported-theme-compatibility", "$.themeRef.compatibility",
          "Theme compatibility does not include this document plan.");
      }
    }
    const context = {
      capabilities: new Set(theme?.capabilities || value.metadata?.capabilities || []),
      componentKinds: [],
      document,
      ids,
      issues,
      plannedBlockIds: new Set(),
      semantic: semanticReferences(document)
    };
    if (!Array.isArray(value.components)) {
      issue(issues, "malformed-components", "$.components",
        "Global components must be an array.");
    } else {
      value.components.forEach((component, index) =>
        validateComponent(component, `$.components[${index}]`, context));
    }
    if (!Array.isArray(value.sections)) {
      issue(issues, "malformed-plan-sections", "$.sections",
        "Plan sections must be an array.");
    } else {
      const sourceSectionIds = new Set();
      value.sections.forEach((section, index) => {
        const path = `$.sections[${index}]`;
        if (!object(section)) {
          issue(issues, "malformed-plan-section", path,
            "Plan section must be an object.");
          return;
        }
        validateId(section.planSectionId, `${path}.planSectionId`, ids, issues);
        validatePageIntent(section.pageIntent, `${path}.pageIntent`, issues);
        if (document && !context.semantic.sectionIds.has(section.sourceSectionId)) {
          issue(issues, "invalid-reference", `${path}.sourceSectionId`,
            "Plan section references a missing semantic section.");
        } else if (sourceSectionIds.has(section.sourceSectionId)) {
          issue(issues, "planning-conflict", `${path}.sourceSectionId`,
            "Semantic section is planned more than once.");
        } else {
          sourceSectionIds.add(section.sourceSectionId);
        }
        if (!Array.isArray(section.components) || !section.components.length) {
          issue(issues, "missing-component", `${path}.components`,
            "Plan section requires at least one component.");
        } else {
          section.components.forEach((component, componentIndex) =>
            validateComponent(
              component,
              `${path}.components[${componentIndex}]`,
              context
            ));
        }
      });
      for (const sectionId of context.semantic.sectionIds) {
        if (!sourceSectionIds.has(sectionId)) {
          issue(issues, "missing-component", "$.sections",
            `Semantic section is not planned: ${sectionId}.`);
        }
      }
    }
    for (const blockId of context.semantic.blockIds) {
      if (!context.plannedBlockIds.has(blockId)) {
        issue(issues, "missing-component", "$.sections",
          `Semantic block is not planned: ${blockId}.`);
      }
    }
    for (const [kind, capability] of [
      ["header", "supportsHeader"],
      ["footer", "supportsFooter"]
    ]) {
      if (context.capabilities.has(capability) &&
          !context.componentKinds.some(item =>
            item.kind === kind && item.visibility === "visible")) {
        issue(issues, "missing-component", "$.components",
          `Theme capability ${capability} requires a ${kind} plan component.`);
      }
    }
    return {
      valid: !issues.some(entry => entry.severity === "error"),
      issues
    };
  }

  return { validate };
});
