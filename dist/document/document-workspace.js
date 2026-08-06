(function (root, factory) {
  const planModel = typeof module === "object" && module.exports
    ? require("./document-plan")
    : root.T9DocumentPlan;
  const textFormat = typeof module === "object" && module.exports
    ? require("../engine/text-format")
    : root.T9TextFormat;
  const api = factory(planModel, textFormat);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentWorkspace = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  planModel,
  textFormat
) {
  const RENDERER_VERSION = "1.0.0";

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function workspaceItem(component, suffix, kind, content = {}) {
    return {
      workspaceItemId: `${component.componentId}:${suffix}`,
      sourceComponentId: component.componentId,
      kind,
      accessibility: clone(component.accessibility || {}),
      appearance: clone(component.appearance || {}),
      content: clone(content)
    };
  }

  function renderComponents(components, result) {
    for (const component of components || []) {
      if (component.visibility === "hidden") continue;
      if (component.kind === "heading") {
        result.push(workspaceItem(component, "heading", "heading", {
          text: component.content.text,
          level: component.content.level || 1
        }));
      } else if (component.kind === "metadata") {
        result.push(workspaceItem(component, "metadata", "metadata", {
          rows: component.content.rows || []
        }));
      } else if (component.kind === "step") {
        result.push(workspaceItem(component, "title", "stepTitle", {
          text: component.content.title,
          stepNumber: component.content.stepNumber
        }));
        renderComponents(component.components, result);
      } else if (component.kind === "paragraph") {
        const runs = component.content.runs ||
          textFormat.instructionSegments(component.content.text);
        result.push(workspaceItem(component, "paragraph", "paragraph", {
          text: runs.map(run => run.text).join(""),
          runs
        }));
      } else if (component.kind === "screenshot") {
        result.push(workspaceItem(component, "image", "image", {
          assetId: component.content.assetId || component.sourceRef?.assetId,
          alt: component.accessibility?.label || "Dokumentskärmbild",
          annotationRefs: component.content.annotationRefs || []
        }));
      } else if (component.kind === "callout") {
        const runs = component.content.runs ||
          textFormat.instructionSegments(component.content.text || "");
        result.push(workspaceItem(component, "callout", "callout", {
          label: component.accessibility?.label || "Kommentar",
          text: runs.map(run => run.text).join(""),
          runs
        }));
      } else {
        renderComponents(component.components, result);
      }
    }
  }

  function render(plan) {
    if (!plan || typeof plan !== "object" || !Array.isArray(plan.sections)) {
      throw new TypeError("Document Workspace requires a Document Plan.");
    }
    const sections = plan.sections.map(section => {
      const items = [];
      renderComponents(section.components, items);
      return {
        workspaceSectionId: `workspace:${section.planSectionId}`,
        sourceSectionId: section.sourceSectionId,
        kind: section.kind,
        items
      };
    });
    return planModel.deepFreeze({
      rendererVersion: RENDERER_VERSION,
      planId: plan.planId,
      documentId: plan.documentRef?.documentId || "",
      title: plan.content?.title || "Dokument",
      themeRef: clone(plan.themeRef || {}),
      sections
    });
  }

  return { RENDERER_VERSION, render };
});
