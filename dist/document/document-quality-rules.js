(function (root, factory) {
  const quality = typeof module === "object" && module.exports
    ? require("./document-quality")
    : root.T9DocumentQuality;
  const componentValidation = typeof module === "object" && module.exports
    ? require("./document-component-validation")
    : root.T9DocumentComponentValidation;
  const api = factory(quality, componentValidation);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentQualityRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  quality,
  componentValidation
) {
  const VERSION = "1.0.0";

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function rule(ruleId, severity, targetType, description, evaluate) {
    return { ruleId, version: VERSION, severity, targetType, description, evaluate };
  }

  function semanticBlocks(document) {
    const result = [];
    function visit(blocks, section, parentLocation) {
      (blocks || []).forEach(block => {
        const blockPart = block?.blockId || `missing-${block?.kind || "block"}`;
        const location = `${parentLocation}/block:${blockPart}`;
        result.push({ block, section, location });
        visit(block?.blocks, section, location);
        (block?.items || []).forEach(item => visit(
          item?.blocks,
          section,
          `${location}/item:${item?.itemId || "missing"}`
        ));
        (block?.rows || []).forEach(row =>
          (row?.cells || []).forEach(cell => visit(
            cell?.blocks,
            section,
            `${location}/row:${row?.rowId || "missing"}` +
              `/cell:${cell?.cellId || "missing"}`
          )));
      });
    }
    (document?.sections || []).forEach(section => visit(
      section?.blocks,
      section,
      `section:${section?.sectionId || "missing"}`
    ));
    return result;
  }

  function planComponents(plan) {
    const result = [];
    function visit(values, parentLocation) {
      (values || []).forEach(component => {
        const location = `${parentLocation}/component:` +
          `${component?.componentId || "missing"}`;
        result.push({ component, location });
        visit(component?.components, location);
      });
    }
    visit(plan?.components, "plan");
    (plan?.sections || []).forEach(section => visit(
      section?.components,
      `plan-section:${section?.planSectionId || "missing"}`
    ));
    return result;
  }

  function source(document, section, block, extra = {}) {
    return {
      documentId: document?.documentId || "",
      ...(section?.sectionId ? { sectionId: section.sectionId } : {}),
      ...(block?.blockId ? { blockId: block.blockId } : {}),
      ...(block?.sourceRef || {}),
      ...extra
    };
  }

  function finding(message, location, sourceRef, suggestedAction, details = {}) {
    return { message, location, sourceRef, suggestedAction, details };
  }

  const rules = [
    rule("document.missing-title", "error", "document",
      "Document title is required.", ({ document }) => text(document?.metadata?.title)
        ? []
        : [finding("Document title is missing.", "document:metadata:title",
          { documentId: document?.documentId || "" },
          "Add a descriptive document title.")]),

    rule("document.missing-purpose", "warning", "section",
      "Purpose content should exist.", ({ document }) => {
        const section = (document?.sections || []).find(item =>
          item.kind === "purpose");
        const hasText = section?.blocks?.some(block =>
          block.kind === "paragraph" && text(block.text));
        return hasText ? [] : [finding("Document purpose is missing.",
          `section:${section?.sectionId || "purpose"}`,
          source(document, section), "Describe why the process is performed.")];
      }),

    rule("document.missing-workflow", "error", "section",
      "A workflow section is required.", ({ document }) =>
        (document?.sections || []).some(section => section.kind === "workflow")
          ? []
          : [finding("Workflow section is missing.", "document:workflow",
            { documentId: document?.documentId || "" },
            "Add at least one workflow section.")]),

    rule("document.empty", "error", "document",
      "Document should contain semantic content.", ({ document }) =>
        semanticBlocks(document).length
          ? []
          : [finding("Document contains no semantic blocks.", "document",
            { documentId: document?.documentId || "" },
            "Add document content before export.")]),

    rule("document.missing-revision-history", "warning", "section",
      "Revision history is expected when the theme supports it.",
      ({ document, plan }) => {
        const expected = plan?.metadata?.capabilities?.includes(
          "supportsRevisionHistory"
        );
        const section = (document?.sections || []).find(item =>
          item.kind === "revisionHistory");
        return !expected || section ? [] : [finding(
          "Revision history is expected but missing.",
          "document:revisionHistory",
          { documentId: document?.documentId || "" },
          "Add revision history information."
        )];
      }),

    rule("step.missing-stable-id", "error", "step",
      "Steps require stable block IDs.", ({ document }) =>
        semanticBlocks(document).filter(item =>
          item.block?.kind === "step" && !text(item.block.blockId)
        ).map(item => finding("Step has no stable ID.", item.location,
          source(document, item.section, item.block),
          "Assign a stable step block ID."))),

    rule("step.missing-source-task", "warning", "step",
      "Projected steps should reference their source task.", ({ document }) =>
        semanticBlocks(document).filter(item => item.block?.kind === "step" &&
          !text(item.block?.sourceRef?.taskId)).map(item => finding(
          "Step has no source task reference.", item.location,
          source(document, item.section, item.block),
          "Preserve the originating task ID during projection."
        ))),

    rule("step.empty-instruction", "error", "step",
      "Steps require an instruction.", ({ document }) =>
        semanticBlocks(document).filter(item => item.block?.kind === "step")
          .filter(item => !text(item.block.blocks?.find(block =>
            block.kind === "paragraph")?.text)).map(item => finding(
            "Step instruction is empty.", item.location,
            source(document, item.section, item.block),
            "Add a clear action-oriented instruction."
          ))),

    rule("step.very-short-instruction", "information", "step",
      "Very short instructions may lack context.", ({ document }) =>
        semanticBlocks(document).filter(item => item.block?.kind === "step")
          .flatMap(item => {
            const instruction = text(item.block.blocks?.find(block =>
              block.kind === "paragraph")?.text);
            return instruction && instruction.length < 15
              ? [finding("Step instruction is very short.", item.location,
                source(document, item.section, item.block),
                "Confirm that the instruction contains enough context.",
                { characterCount: instruction.length, threshold: 15 })]
              : [];
          })),

    rule("step.duplicate-instruction", "warning", "step",
      "Exact normalized instruction duplicates may be accidental.",
      ({ document }) => {
        const groups = new Map();
        semanticBlocks(document).filter(item => item.block?.kind === "step")
          .forEach(item => {
            const value = text(item.block.blocks?.find(block =>
              block.kind === "paragraph")?.text)
              .replace(/\s+/g, " ").toLowerCase();
            if (!value) return;
            groups.set(value, [...(groups.get(value) || []), item]);
          });
        return [...groups.entries()].flatMap(([value, items]) =>
          items.length < 2 ? [] : items.map(item => finding(
            "Step instruction duplicates another step exactly.", item.location,
            source(document, item.section, item.block),
            "Confirm that both steps are required.",
            { normalizedInstruction: value }
          )));
      }),

    rule("screenshot.missing", "information", "step",
      "Steps normally benefit from visual evidence.", ({ document }) =>
        semanticBlocks(document).filter(item => item.block?.kind === "step" &&
          !item.block.blocks?.some(block => block.kind === "image"))
          .map(item => finding("Step has no screenshot.", item.location,
            source(document, item.section, item.block),
            "Confirm whether a screenshot should be included."))),

    rule("screenshot.missing-asset", "error", "screenshot",
      "Screenshot blocks must reference an existing asset.", ({ document }) => {
        const assets = new Set((document?.assets || []).map(asset => asset.assetId));
        return semanticBlocks(document).filter(item => item.block?.kind === "image" &&
          !assets.has(item.block.assetId)).map(item => finding(
          "Screenshot references a missing asset.", item.location,
          source(document, item.section, item.block,
            { screenshotRef: item.block?.sourceRef?.screenshotRef || "" }),
          "Restore the screenshot asset reference.",
          { assetId: item.block.assetId || "" }
        ));
      }),

    rule("screenshot.missing-alt-text", "warning", "component",
      "Planned screenshots require accessible alternative text.", ({ document, plan }) =>
        planComponents(plan).filter(item => item.component?.kind === "screenshot" &&
          !text(item.component?.accessibility?.label)).map(item => finding(
          "Screenshot has no alternative text.", item.location,
          { documentId: document?.documentId || "",
            componentId: item.component.componentId,
            ...(item.component.sourceRef || {}) },
          "Add concise alternative text for the screenshot."
        ))),

    rule("screenshot.duplicate-usage", "information", "screenshot",
      "Repeated screenshot usage may be accidental.", ({ document }) => {
        const groups = new Map();
        semanticBlocks(document).filter(item => item.block?.kind === "image")
          .forEach(item => groups.set(item.block.assetId,
            [...(groups.get(item.block.assetId) || []), item]));
        return [...groups.entries()].flatMap(([assetId, items]) =>
          !assetId || items.length < 2 ? [] : items.map(item => finding(
            "Screenshot asset is used more than once.", item.location,
            source(document, item.section, item.block,
              { screenshotRef: item.block?.sourceRef?.screenshotRef || "" }),
            "Confirm that repeated screenshot usage is intentional.",
            { assetId, usageCount: items.length }
          )));
      }),

    rule("screenshot.invalid-annotation-reference", "warning", "annotation",
      "Annotation references require stable matching IDs.", ({ document }) =>
        semanticBlocks(document).filter(item => item.block?.kind === "image")
          .flatMap(item => (item.block.annotationRefs || []).flatMap(reference => {
            const invalid = !text(reference?.annotationId) ||
              !text(reference?.screenshotRef) ||
              reference.screenshotRef !== item.block?.sourceRef?.screenshotRef;
            return invalid ? [finding(
              "Screenshot contains an invalid annotation reference.",
              `${item.location}/annotation:${reference?.annotationId || "missing"}`,
              source(document, item.section, item.block, {
                annotationId: reference?.annotationId || "",
                screenshotRef: reference?.screenshotRef || ""
              }),
              "Repair or remove the invalid annotation reference."
            )] : [];
          }))),

    rule("callout.empty", "warning", "callout",
      "Callouts require meaningful text.", ({ document }) =>
        semanticBlocks(document).filter(item => item.block?.kind === "callout" &&
          !text(item.block.blocks?.find(block => block.kind === "paragraph")?.text))
          .map(item => finding("Callout is empty.", item.location,
            source(document, item.section, item.block),
            "Add callout content or remove the callout."))),

    rule("callout.invalid-role", "warning", "callout",
      "Callouts should use a supported semantic role.", ({ document }) =>
        semanticBlocks(document).filter(item => item.block?.kind === "callout" &&
          !componentValidation.CALLOUT_ROLES.includes(item.block.calloutType))
          .map(item => finding("Callout has an unsupported semantic role.",
            item.location, source(document, item.section, item.block),
            "Choose information, warning, note, tip, decision or example.",
            { calloutType: item.block.calloutType || "" }))),

    rule("callout.missing-accessibility-label", "warning", "component",
      "Planned callouts require an accessibility label.", ({ document, plan }) =>
        planComponents(plan).filter(item => item.component?.kind === "callout" &&
          !text(item.component?.accessibility?.label)).map(item => finding(
          "Callout has no accessibility label.", item.location,
          { documentId: document?.documentId || "",
            componentId: item.component.componentId,
            ...(item.component.sourceRef || {}) },
          "Add an accessibility label describing the callout role."
        ))),

    rule("metadata.missing-environment", "warning", "metadata",
      "Environment metadata should identify the target environment.",
      ({ document }) => text(document?.metadata?.environment) ? [] : [finding(
          "Environment metadata is missing.", "document:metadata:environment",
          { documentId: document?.documentId || "" },
          "Specify the environment used for the process."
        )]),

    rule("metadata.missing-reviewer", "information", "metadata",
      "Reviewer metadata should identify the responsible person.",
      ({ document }) => text(document?.metadata?.reviewer) ? [] : [finding(
          "Reviewer metadata is missing.", "document:metadata:reviewer",
          { documentId: document?.documentId || "" },
          "Specify the reviewer or document author."
        )]),

    rule("metadata.missing-revision", "warning", "metadata",
      "Revision history should contain version information.", ({ document }) => {
        const revisions = semanticBlocks(document).filter(item =>
          item.block?.kind === "revisionHistory");
        return revisions.length && revisions.some(item =>
          item.block.entries?.some(entry => text(entry.version)))
          ? []
          : [finding("Revision information is missing.",
            "document:metadata:revision", {
              documentId: document?.documentId || ""
            }, "Add at least one versioned revision entry.")];
      }),

    rule("plan.component-source-missing", "error", "component",
      "Component references must resolve to semantic content.",
      ({ document, plan }) => {
        const sectionIds = new Set((document?.sections || []).map(item =>
          item.sectionId));
        const blocks = semanticBlocks(document);
        const blockIds = new Set(blocks.map(item => item.block?.blockId));
        const assetIds = new Set((document?.assets || []).map(item => item.assetId));
        return planComponents(plan).flatMap(item => {
          const ref = item.component?.sourceRef || {};
          const invalid = (ref.documentId && ref.documentId !== document?.documentId) ||
            (ref.sectionId && !sectionIds.has(ref.sectionId)) ||
            (ref.blockId && !blockIds.has(ref.blockId)) ||
            (ref.assetId && !assetIds.has(ref.assetId));
          return invalid ? [finding(
            "Plan component references missing semantic content.", item.location,
            { documentId: document?.documentId || "",
              componentId: item.component.componentId, ...ref },
            "Rebuild the Document Plan from the current Semantic Document."
          )] : [];
        });
      }),

    rule("plan.hidden-required-component", "warning", "component",
      "Required capable components should not be hidden unexpectedly.",
      ({ document, plan }) => planComponents(plan).filter(item =>
        item.component?.visibility === "hidden" &&
        item.component.capabilityRequirements?.some(capability =>
          plan?.metadata?.capabilities?.includes(capability)))
        .map(item => finding("Required component is hidden.", item.location,
          { documentId: document?.documentId || "",
            componentId: item.component.componentId,
            ...(item.component.sourceRef || {}) },
          "Review theme capabilities and component visibility."))),

    rule("plan.unsupported-capability", "warning", "component",
      "Visible components must have their declared capabilities.",
      ({ document, plan }) => planComponents(plan).filter(item =>
        item.component?.visibility !== "hidden" &&
        item.component.capabilityRequirements?.some(capability =>
          !plan?.metadata?.capabilities?.includes(capability)))
        .map(item => finding("Visible component requires an unsupported capability.",
          item.location, { documentId: document?.documentId || "",
            componentId: item.component.componentId,
            ...(item.component.sourceRef || {}) },
          "Resolve the theme capability conflict before rendering."))),

    rule("plan.missing-semantic-component", "error", "plan",
      "Every semantic block should be represented in the plan.",
      ({ document, plan }) => {
        const planned = new Set(planComponents(plan).map(item =>
          item.component?.sourceRef?.blockId).filter(Boolean));
        return semanticBlocks(document).filter(item =>
          text(item.block?.blockId) && !planned.has(item.block.blockId))
          .map(item => finding("Semantic block has no planned component.",
            item.location, source(document, item.section, item.block),
            "Rebuild the Document Plan from the Semantic Document."));
      })
  ];

  const BUILT_IN_REGISTRY = quality.createRegistry(rules);

  return {
    BUILT_IN_REGISTRY,
    VERSION,
    planComponents,
    semanticBlocks
  };
});
