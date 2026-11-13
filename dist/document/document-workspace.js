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

  // Same result as a JSON round trip, without re-serializing strings (engine/json-clone.js).
  const jsonClone = typeof module === "object" && module.exports
    ? require("../engine/json-clone") : globalThis.T9JsonClone;

  function clone(value) {
    return jsonClone.clone(value);
  }

  // Same date form as the Word export's metadata table.
  function displayDate(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleDateString("sv-SE");
  }

  function workspaceItem(component, suffix, kind, content = {}) {
    return {
      workspaceItemId: `${component.componentId}:${suffix}`,
      sourceComponentId: component.componentId,
      sourceRef: clone(component.sourceRef || {}),
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
          rows: (component.content.rows || []).map(row => row.key === "date"
            ? { ...row, value: displayDate(row.value) } : row)
        }));
      } else if (component.kind === "step") {
        result.push(workspaceItem(component, "title", "stepTitle", {
          text: component.content.title,
          stepNumber: component.content.stepNumber
        }));
        renderComponents(component.components, result);
      } else if (component.kind === "toc") {
        result.push(workspaceItem(component, "toc", "toc", {
          title: String(component.appearance?.title || ""), entries: []
        }));
      } else if (component.kind === "cover") {
        // The cover's logo and organisation, above the title, as Word shows them.
        const logoAssetId = String(component.appearance?.brandLogo || "");
        const text = String(component.appearance?.brandText || "");
        if (logoAssetId || text) {
          result.push(workspaceItem(component, "brand", "brand", { logoAssetId, text }));
        }
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
    // A table of contents lists the document's headings and steps, as Word fills it in;
    // the preview has no pages, so it has no page numbers.
    const entries = sections.filter(section => !["cover", "toc"].includes(section.kind))
      .flatMap(section => section.items).flatMap(item =>
        item.kind === "heading" ? [{ text: item.content.text, level: Math.min(2, item.content.level || 1) }]
          : item.kind === "stepTitle" ? [{ text: item.content.text, level: 2 }] : []);
    sections.forEach(section => section.items.forEach(item => {
      if (item.kind === "toc") item.content.entries = entries.map(entry => ({ ...entry }));
    }));
    // A template of the user's own shows its logo and company above the document and its
    // footer below it, as Word shows them on every page. The preview is one long page, so
    // the page number reads 1.
    const pageComponent = kind => (plan.components || []).find(component =>
      component.kind === kind && component.visibility !== "hidden");
    const header = pageComponent("header");
    const footer = pageComponent("footer");
    const branding = header?.appearance?.branding || footer?.appearance?.branding || {};
    const footerText = String(footer?.content?.text || "");
    return planModel.deepFreeze({
      // A template made from one with a header band shows the band, as in Word.
      pageHeader: branding.templateId && header ? {
        company: String(branding.organizationName || ""), logoAssetId: String(branding.logo || ""),
        title: String(header.content?.text || ""), borderColor: header.appearance?.borderColor || "",
        ...(header.appearance?.fillColor ? { band: {
          fillColor: header.appearance.fillColor, textColor: header.appearance.textColor || "#ffffff",
          text: [String(header.appearance.brand || "").trim(), "Business Central",
            String(header.content?.text || "")].filter(Boolean).join("  |  ")
        } } : {})
      } : null,
      pageFooter: branding.templateId && footer ? {
        text: footerText.includes("{page}") ? footerText.split("{page}").join("1")
          : `${footerText} | ${footer.content?.pageLabel || ""} 1`,
        borderColor: footer.appearance?.borderColor || ""
      } : null,
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
