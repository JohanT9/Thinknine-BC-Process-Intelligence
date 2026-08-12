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
  const componentRegistry = typeof module === "object" && module.exports
    ? require("./document-component-registry")
    : root.T9DocumentComponentRegistry;
  const api = factory(
    semantic, themeValidation, themeModel, planModel, componentRegistry
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentPlanner = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  semantic,
  themeValidation,
  themeModel,
  planModel,
  componentRegistry
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
      return {
        ...clone(theme.components.heading || {}),
        typography: clone(theme.typography[role] || {})
      };
    }
    if (block.kind === "paragraph") {
      return { typography: clone(theme.typography.body || {}) };
    }
    if (block.kind === "step") {
      return {
        ...clone(theme.components.step || {}),
        typography: clone(theme.typography.heading2 || {})
      };
    }
    const key = block.kind === "image" ? "screenshot" : block.kind;
    const appearance = clone(theme.components[key] || {});
    if (block.kind !== "callout") return appearance;
    const { roleStyles = {}, ...base } = appearance;
    return {
      ...base,
      ...(roleStyles[block.calloutType] || {}),
      semanticRole: block.calloutType
    };
  }

  function presentationIntentFor(block, childComponents = []) {
    const byKind = {
      heading: {
        hierarchy: `heading${block.level || 1}`,
        avoidOrphan: true
      },
      paragraph: { readableMeasure: true },
      step: {
        composition: "instructionWithEvidence",
        avoidFragmentation: true,
        relatedComponentIds: childComponents.map(item => item.componentId)
      },
      image: {
        emphasis: "primary",
        widthIntent: "fullContent",
        avoidIsolated: true,
        preserveAspectRatio: true,
        preserveQuality: true
      },
      callout: {
        emphasis: "supporting",
        semanticRole: block.calloutType,
        avoidFragmentation: true
      },
      table: {
        headerEmphasis: true,
        rowIntegrity: true,
        avoidFragmentation: true
      },
      revisionHistory: {
        headerEmphasis: true,
        rowIntegrity: true
      },
      pageBreak: { transition: "explicit" },
      toc: { navigationAid: true }
    };
    return byKind[block.kind] || { composition: "flow" };
  }

  function plannedSpacing(block, theme, appearance) {
    const token = block.kind === "heading"
      ? "section"
      : block.kind === "paragraph"
        ? "paragraph"
        : "component";
    const fallback = spacingIntent(theme, token);
    return {
      before: appearance.before ?? fallback.before,
      after: appearance.after ?? fallback.after
    };
  }

  function componentKind(blockKind) {
    if (blockKind === "image") return "screenshot";
    return componentRegistry.get(
      componentRegistry.BUILT_IN_REGISTRY,
      blockKind
    )
      ? blockKind
      : "generic";
  }

  function visibilityFor(kind, theme) {
    const capability = componentRegistry.get(
      componentRegistry.BUILT_IN_REGISTRY,
      kind
    )?.capabilityRequirements[0];
    return capability && !supports(theme, capability) ? "hidden" : "visible";
  }

  function componentContract(kind, overrides = {}) {
    return componentRegistry.contract(
      componentRegistry.BUILT_IN_REGISTRY,
      kind,
      overrides
    );
  }

  function groupingComponent(id, grouping, sourceRef, children, theme) {
    return {
      ...componentContract("group", {
        presentationIntent: {
          composition: grouping,
          rowIntegrity: grouping === "tableRow",
          avoidFragmentation: ["tableRow", "listItem"].includes(grouping)
        }
      }),
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
      content: clone(sourceRef),
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
    const components = nestedComponents(block, sectionKind, theme);
    const stepInstruction = block.kind === "step"
      ? block.blocks?.find(child => child.kind === "paragraph")?.text || ""
      : "";
    const calloutText = block.kind === "callout"
      ? block.blocks?.find(child => child.kind === "paragraph")?.text || ""
      : "";
    const appearance = appearanceFor(block, theme, sectionKind);
    if (block.kind === "step") {
      let imageIndex = 0;
      components.forEach(component => {
        if (component.kind !== "screenshot") return;
        imageIndex += 1;
        const primary = imageIndex === 1;
        component.content = {
          ...component.content,
          imageIndex,
          stepNumber: block.stepNumber,
          description: stepInstruction,
          altTitle: `Skärmbild ${imageIndex} steg ${block.stepNumber}`,
          altName: `step-${block.stepNumber}-${imageIndex}`
        };
        component.accessibility = {
          ...component.accessibility,
          label: `Skärmbild ${imageIndex} steg ${block.stepNumber}`,
          description: stepInstruction
        };
        component.grouping = "screenshotSequence";
        component.placement = "supportingVisual";
        component.presentationIntent = {
          ...component.presentationIntent,
          emphasis: primary ? "primary" : "supporting",
          widthIntent: primary ? "fullContent" : "consistentSupporting",
          avoidIsolated: true,
          preserveAspectRatio: true,
          preserveQuality: true,
          sequencePosition: imageIndex,
          sequenceLength: components.filter(item =>
            item.kind === "screenshot").length
        };
        component.appearance = {
          ...component.appearance,
          maxWidth: primary
            ? component.appearance.maxWidth
            : component.appearance.supportingMaxWidth ||
              component.appearance.maxWidth
        };
      });
      components.forEach((component, index) => {
        if (component.kind === "paragraph" && components[index + 1]) {
          component.keepWithNext = true;
        }
        if (component.kind === "callout") component.grouping = "stepSupport";
      });
    }
    return {
      ...componentContract(kind, {
        accessibility: kind === "step"
          ? { label: `Steg ${block.stepNumber}` }
          : kind === "callout"
            ? { label: "Kommentar", description: calloutText }
          : kind === "screenshot"
            ? { label: block.altText || "Processkärmbild" }
            : {},
        presentationIntent: presentationIntentFor(block, components)
      }),
      componentId: `component:block:${block.blockId}`,
      kind,
      sourceRef: {
        ...clone(block.sourceRef || {}),
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
      spacingIntent: plannedSpacing(block, theme, appearance),
      appearance,
      content: {
        ...(block.text !== undefined ? { text: block.text } : {}),
        ...(Array.isArray(block.presentationRuns)
          ? { runs: clone(block.presentationRuns) } : {}),
        ...(block.level !== undefined ? { level: block.level } : {}),
        ...(block.stepNumber !== undefined ? { stepNumber: block.stepNumber } : {}),
        ...(block.stepNumber !== undefined ? {
          title: `Steg ${block.stepNumber}`,
          instruction: stepInstruction,
          commentComponentIds: components.filter(component =>
            component.kind === "callout").map(component => component.componentId),
          screenshotComponentIds: components.filter(component =>
            component.kind === "screenshot").map(component => component.componentId)
        } : {}),
        ...(block.calloutType ? { calloutType: block.calloutType } : {}),
        ...(block.kind === "callout" ? {
          label: "Kommentar",
          text: calloutText
        } : {}),
        ...(block.kind === "toc" ? {
          headingLevelRange: [1, 3],
          updateField: true
        } : {}),
        ...(block.kind === "image" ? {
          captionIntent: "none",
          presentationRole: "processEvidence",
          annotationRefs: clone(block.annotationRefs || [])
        } : {}),
        ...(block.kind === "revisionHistory" ? {
          columns: [
            { key: "version", label: "Version" },
            { key: "createdAt", label: "Datum" },
            { key: "change", label: "Ändring" },
            { key: "reviewer", label: "Granskad av" }
          ]
        } : {}),
        ...(block.kind === "table" ? {
          columns: clone(block.columns || [])
        } : {}),
        ...(block.assetId ? { assetId: block.assetId } : {}),
        ...(block.entries ? { entries: clone(block.entries) } : {})
      },
      components
    };
  }

  function sectionIntent(kind) {
    if (kind === "cover") return "newPage";
    if (kind === "workflow") return "newSection";
    if (kind === "appendix" || kind === "revisionHistory") return "appendix";
    return "normal";
  }

  function sectionCapability(kind) {
    return componentRegistry.get(
      componentRegistry.BUILT_IN_REGISTRY,
      kind
    )?.capabilityRequirements[0];
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
        ...componentContract("metadata", {
          presentationIntent: {
            composition: "compactKeyValueGroups",
            hierarchy: "coverSupporting",
            align: "center",
            avoidFragmentation: true
          }
        }),
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
        spacingIntent: {
          before: theme.components.metadataTable?.before ??
            theme.spacing.component,
          after: theme.components.metadataTable?.after ??
            theme.spacing.component
        },
        appearance: clone(theme.components.metadataTable || {}),
        content: {
          accessibilityLabel: "Dokumentmetadata",
          rows: [
            { key: "version", group: "identity", label: "Version",
              value: document.metadata.documentVersion },
            { key: "date", group: "identity", label: "Datum",
              value: document.metadata.updatedAt || document.metadata.createdAt },
            { key: "environment", group: "context", label: "Miljö",
              value: document.metadata.environment },
            { key: "documentationProfile", group: "context",
              label: "Dokumentationstyp",
              value: document.metadata.documentationProfile },
            { key: "reviewStatus", group: "review", label: "Granskningsstatus",
              value: document.metadata.statusLabel },
            { key: "reviewer", group: "review", label: "Granskad av",
              value: document.metadata.reviewer }
          ]
        },
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
        ...componentContract(wrapperKind, {
          presentationIntent: section.kind === "cover"
            ? {
              composition: "balancedCover",
              hierarchy: "brandTypeTitleSubtitleMetadata",
              verticalBalance: true
            }
            : section.kind === "workflow"
              ? {
                composition: "orderedWorkflow",
                transition: "sectionOpening",
                avoidTinySection: true
              }
              : {
                composition: "section",
                transition: "continuous"
              }
        }),
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
        content: {
          sectionKind: section.kind,
          ...(section.kind === "cover" ? {
            title: document.metadata.title,
            documentId: document.documentId,
            metadataComponentId: `component:metadata:${document.documentId}`
          } : {}),
          ...(section.kind === "workflow" ? {
            heading: children.find(component => component.kind === "heading")
              ?.content.text || "",
            introduction: "",
            stepComponentIds: children.filter(component =>
              component.kind === "step").map(component => component.componentId)
          } : {})
        },
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
        ...componentContract(kind, {
          accessibility: { label: kind === "header"
            ? "Dokumenthuvud"
            : "Dokumentsidfot" },
          presentationIntent: {
            placement: kind,
            repetition: "everyPage",
            unobtrusive: true
          }
        }),
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
        appearance: {
          ...clone(theme.components[kind] || {}),
          branding
        },
        content: {
          title: document.metadata.title,
          text: kind === "footer" ? branding.footer : document.metadata.title,
          brandingReference: supports(theme, "supportsBranding")
            ? "theme.branding"
            : "",
          ...(kind === "footer" ? {
            pageLabel: "Sida",
            totalSeparator: " av ",
            pageFieldIntent: { current: true, total: true }
          } : {})
        },
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
      content: {
        title: document.metadata.title,
        creator: "Thinknine Process Intelligence",
        subject: "Business Central arbetsinstruktion",
        description: "Genererad från en granskad Business Central-process.",
        documentAppearance: clone(resolvedTheme.components.document || {}),
        presentationProfile: "professional"
      },
      components: globalComponents(document, resolvedTheme),
      sections: document.sections.map(section =>
        planSection(section, document, resolvedTheme)),
      metadata: {
        producer: "document-planner",
        presentationPlannerVersion: "1.0.0",
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
