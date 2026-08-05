(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const themeValidation = typeof module === "object" && module.exports
    ? require("./document-theme-validation")
    : root.T9DocumentThemeValidation;
  const themeModel = typeof module === "object" && module.exports
    ? require("./document-theme")
    : root.T9DocumentTheme;
  const planModel = typeof module === "object" && module.exports
    ? require("./document-plan")
    : root.T9DocumentPlan;
  const api = factory(semantic, themeValidation, themeModel, planModel);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentPlanner = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  semantic,
  themeValidation,
  themeModel,
  planModel
) {
  const PLANNER_VERSION = "1.0.0";

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function supports(theme, capability) {
    return theme.capabilities.includes(capability);
  }

  function assertInputs(document, theme) {
    const documentResult = semantic.validate(document);
    if (!documentResult.valid) {
      throw new TypeError("Document Planner requires a valid Semantic Document.");
    }
    const themeResult = themeValidation.validate(theme, {
      requireValues: true
    });
    if (!themeResult.valid) {
      throw new TypeError("Document Planner requires a valid resolved theme.");
    }
    if (theme.themeSchemaVersion !== themeModel.THEME_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported theme schema version: ${theme.themeSchemaVersion}.`
      );
    }
    const compatibility = theme.compatibility || {};
    if (!themeModel.isCompatible(
      compatibility.semanticDocument,
      document.schemaVersion
    )) {
      throw new Error(
        `Theme does not support Semantic Document ${document.schemaVersion}.`
      );
    }
    if (!themeModel.isCompatible(compatibility.planner, PLANNER_VERSION)) {
      throw new Error(`Theme does not support Document Planner ${PLANNER_VERSION}.`);
    }
    if (Object.keys(themeModel.TOKEN_GROUPS).some(group =>
      containsUnresolvedToken(theme[group]))) {
      throw new TypeError("Document Planner requires resolved theme tokens.");
    }
  }

  function containsUnresolvedToken(value) {
    if (typeof value === "string") return themeModel.TOKEN_REFERENCE.test(value);
    if (!value || typeof value !== "object") return false;
    return Object.values(value).some(containsUnresolvedToken);
  }

  function spacingIntent(theme, token = "component") {
    return {
      before: theme.spacing[token] ?? theme.spacing.component,
      after: theme.spacing[token] ?? theme.spacing.component
    };
  }

  function appearanceFor(block, theme, sectionKind) {
    if (block.kind === "heading") {
      const role = sectionKind === "cover"
        ? "title"
        : block.level === 1
          ? "heading1"
          : "heading2";
      return { typography: clone(theme.typography[role] || {}) };
    }
    if (block.kind === "paragraph") {
      return { typography: clone(theme.typography.body || {}) };
    }
    const key = block.kind === "image" ? "screenshot" : block.kind;
    return clone(theme.components[key] || {});
  }

  function componentKind(blockKind) {
    if (blockKind === "image") return "screenshot";
    return planModel.COMPONENT_KINDS.includes(blockKind)
      ? blockKind
      : "generic";
  }

  function visibilityFor(kind, theme) {
    const capability = planModel.CAPABILITY_BY_COMPONENT[kind];
    return capability && !supports(theme, capability) ? "hidden" : "visible";
  }

  function groupingComponent(id, grouping, sourceRef, children, theme) {
    return {
      componentId: `component:group:${id}`,
      kind: "group",
      sourceRef,
      placement: "flow",
      grouping,
      priority: 50,
      pageIntent: "normal",
      keepTogether: grouping !== "table",
      keepWithNext: false,
      visibility: "visible",
      spacingIntent: spacingIntent(theme),
      appearance: {},
      components: children
    };
  }

  function nestedComponents(block, sectionKind, theme) {
    if (Array.isArray(block.blocks)) {
      return block.blocks.map(child => planBlock(child, sectionKind, theme));
    }
    if (block.kind === "list") {
      return (block.items || []).map(item => groupingComponent(
        item.itemId,
        "listItem",
        { blockId: block.blockId, itemId: item.itemId },
        (item.blocks || []).map(child => planBlock(child, sectionKind, theme)),
        theme
      ));
    }
    if (block.kind === "table") {
      return (block.rows || []).map(row => groupingComponent(
        row.rowId,
        "tableRow",
        { blockId: block.blockId, rowId: row.rowId },
        (row.cells || []).map(cell => groupingComponent(
          cell.cellId,
          "tableCell",
          {
            blockId: block.blockId,
            rowId: row.rowId,
            cellId: cell.cellId,
            columnId: cell.columnId
          },
          (cell.blocks || []).map(child =>
            planBlock(child, sectionKind, theme)),
          theme
        )),
        theme
      ));
    }
    return [];
  }

  function planBlock(block, sectionKind, theme) {
    const kind = componentKind(block.kind);
    return {
      componentId: `component:block:${block.blockId}`,
      kind,
      sourceRef: {
        blockId: block.blockId,
        ...(block.assetId ? { assetId: block.assetId } : {})
      },
      placement: "flow",
      grouping: block.kind === "step" ? "step" : "none",
      priority: block.kind === "heading" ? 80 : block.kind === "step" ? 70 : 50,
      pageIntent: block.kind === "pageBreak" ? "newPage" : "normal",
      keepTogether: ["step", "image", "callout"].includes(block.kind),
      keepWithNext: block.kind === "heading",
      visibility: visibilityFor(kind, theme),
      spacingIntent: spacingIntent(
        theme,
        block.kind === "paragraph" ? "paragraph" : "component"
      ),
      appearance: appearanceFor(block, theme, sectionKind),
      components: nestedComponents(block, sectionKind, theme)
    };
  }

  function sectionIntent(kind) {
    if (kind === "cover") return "newPage";
    if (kind === "workflow") return "newSection";
    if (kind === "appendix" || kind === "revisionHistory") return "appendix";
    return "normal";
  }

  function sectionCapability(kind) {
    return {
      cover: planModel.CAPABILITY_BY_COMPONENT.cover,
      revisionHistory: planModel.CAPABILITY_BY_COMPONENT.revisionHistory
    }[kind];
  }

  function planSection(section, document, theme) {
    const capability = sectionCapability(section.kind);
    const wrapperKind = ["cover", "workflow", "revisionHistory"].includes(
      section.kind
    ) ? section.kind : "generic";
    const children = section.blocks.map(block =>
      planBlock(block, section.kind, theme));
    if (section.kind === "cover") {
      children.push({
        componentId: `component:metadata:${document.documentId}`,
        kind: "metadata",
        sourceRef: { documentId: document.documentId },
        placement: "flow",
        grouping: "metadata",
        priority: 60,
        pageIntent: "normal",
        keepTogether: true,
        keepWithNext: false,
        visibility: "visible",
        spacingIntent: spacingIntent(theme),
        appearance: clone(theme.components.metadataTable || {}),
        components: []
      });
    }
    return {
      planSectionId: `plan-section:${section.sectionId}`,
      sourceSectionId: section.sectionId,
      kind: section.kind,
      flow: "sequential",
      pageIntent: sectionIntent(section.kind),
      keepTogether: section.kind === "cover",
      spacingIntent: spacingIntent(theme, "section"),
      components: [{
        componentId: `component:section:${section.sectionId}`,
        kind: wrapperKind,
        sourceRef: { sectionId: section.sectionId },
        placement: "flow",
        grouping: "section",
        priority: 100,
        pageIntent: sectionIntent(section.kind),
        keepTogether: section.kind === "cover",
        keepWithNext: false,
        visibility: capability && !supports(theme, capability)
          ? "hidden"
          : "visible",
        spacingIntent: spacingIntent(theme, "section"),
        appearance: clone(theme.components[section.kind] || {}),
        components: children
      }]
    };
  }

  function globalComponents(document, theme) {
    const branding = supports(theme, "supportsBranding")
      ? clone(theme.branding)
      : {};
    return [
      ["header", "supportsHeader"],
      ["footer", "supportsFooter"]
    ].filter(([, capability]) => supports(theme, capability))
      .map(([kind]) => ({
        componentId: `component:${kind}:${document.documentId}`,
        kind,
        sourceRef: { documentId: document.documentId },
        placement: kind,
        grouping: "document",
        priority: 100,
        pageIntent: "normal",
        keepTogether: true,
        keepWithNext: false,
        visibility: "visible",
        spacingIntent: spacingIntent(theme),
        appearance: { branding },
        components: []
      }));
  }

  function plan(document, resolvedTheme) {
    assertInputs(document, resolvedTheme);
    return planModel.normalize({
      planId: `document-plan:${document.documentId}:${resolvedTheme.themeId}`,
      plannerVersion: PLANNER_VERSION,
      documentRef: {
        documentId: document.documentId,
        schemaVersion: document.schemaVersion
      },
      themeRef: {
        themeId: resolvedTheme.themeId,
        themeSchemaVersion: resolvedTheme.themeSchemaVersion,
        version: resolvedTheme.version,
        origin: clone(resolvedTheme.origin),
        compatibility: clone(resolvedTheme.compatibility)
      },
      flow: "document",
      page: clone(resolvedTheme.page),
      spacing: clone(resolvedTheme.spacing),
      components: globalComponents(document, resolvedTheme),
      sections: document.sections.map(section =>
        planSection(section, document, resolvedTheme)),
      metadata: {
        producer: "document-planner",
        capabilities: clone(resolvedTheme.capabilities)
      }
    });
  }

  return {
    PLANNER_VERSION,
    compatible: themeModel.isCompatible,
    plan,
    planBlock,
    planSection,
    spacingIntent
  };
});
