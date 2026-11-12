(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentWorkspaceView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function textElement(documentValue, tagName, text, className) {
    const element = documentValue.createElement(tagName);
    element.className = className;
    element.textContent = text || "";
    return element;
  }

  function applyAppearance(element, item) {
    const appearance = item.appearance || {};
    const typography = appearance.typography || {};
    if (typography.color) element.style.color = typography.color;
    if (typography.family) element.style.fontFamily = typography.family;
    if (appearance.headingFill) {
      element.style.backgroundColor = appearance.headingFill;
    }
    if (appearance.fillColor) element.style.backgroundColor = appearance.fillColor;
    if (appearance.borderColor) {
      element.style.borderColor = appearance.borderColor;
    }
    // A heading's line has the colour Word gives it.
    if (item.kind === "heading" && appearance.dividerColor) {
      element.style.borderBottomColor = appearance.dividerColor;
    }
    if (item.kind === "stepTitle" && appearance.headingBorderColor) {
      element.style.borderLeftColor = appearance.headingBorderColor;
    }
  }

  function appendRuns(element, runs, documentValue) {
    for (const run of runs || []) {
      const child = documentValue.createElement(run.bold ? "strong" :
        run.italic ? "em" : run.monospace ? "code" : "span");
      child.textContent = run.text || "";
      if (run.italic && run.bold) child.style.fontStyle = "italic";
      if (run.fontFamily) child.style.fontFamily = run.fontFamily;
      if (run.fontSize) child.style.fontSize = `${run.fontSize}pt`;
      if (run.textColor) child.style.color = run.textColor;
      if (run.backgroundColor) child.style.backgroundColor = run.backgroundColor;
      element.appendChild(child);
    }
  }

  function createItem(item, mediaAssets, documentValue) {
    let element;
    if (item.kind === "heading") {
      const level = Math.max(1, Math.min(6, Number(item.content.level) || 1));
      element = textElement(
        documentValue,
        `h${level}`,
        item.content.text,
        "document-workspace-heading"
      );
    } else if (item.kind === "stepTitle") {
      element = textElement(
        documentValue,
        "h3",
        item.content.text,
        "document-workspace-step-title"
      );
    } else if (item.kind === "paragraph") {
      element = textElement(documentValue, "p", "",
        "document-workspace-paragraph");
      appendRuns(element, item.content.runs || [{ text: item.content.text }],
        documentValue);
    } else if (item.kind === "metadata") {
      element = documentValue.createElement("dl");
      element.className = "document-workspace-metadata";
      for (const row of item.content.rows || []) {
        element.append(
          textElement(documentValue, "dt", row.label, ""),
          textElement(documentValue, "dd", row.value, "")
        );
      }
    } else if (item.kind === "toc") {
      element = documentValue.createElement("nav");
      element.className = "document-workspace-page-toc";
      element.setAttribute("aria-label", item.content.title);
      const list = documentValue.createElement("ol");
      for (const entry of item.content.entries || []) {
        list.appendChild(textElement(documentValue, "li", entry.text,
          entry.level > 1 ? "document-workspace-page-toc-sub" : ""));
      }
      element.append(textElement(documentValue, "h2", item.content.title,
        "document-workspace-heading"), list);
    } else if (item.kind === "brand") {
      element = documentValue.createElement("div");
      element.className = "document-workspace-page-cover-brand";
      const media = item.content.logoAssetId ? mediaAssets[item.content.logoAssetId] : null;
      if (media?.source) {
        const image = documentValue.createElement("img");
        image.className = "document-workspace-page-cover-logo";
        image.src = media.source;
        image.alt = "";
        element.appendChild(image);
      }
      if (item.content.text) {
        element.appendChild(textElement(documentValue, "span", item.content.text, ""));
      }
    } else if (item.kind === "image") {
      const media = mediaAssets[item.content.assetId];
      element = documentValue.createElement("figure");
      element.className = "document-workspace-image";
      if (media?.source) {
        const image = documentValue.createElement("img");
        image.src = media.source;
        image.alt = item.content.alt;
        element.appendChild(image);
      } else {
        element.appendChild(textElement(
          documentValue,
          "p",
          "Skärmbilden kunde inte visas.",
          "muted"
        ));
      }
    } else if (item.kind === "callout") {
      element = documentValue.createElement("aside");
      element.className = "document-workspace-callout";
      element.setAttribute("aria-label", item.content.label);
      const label = textElement(documentValue, "strong",
        `${item.content.label}:`, "document-workspace-callout-label");
      const paragraph = textElement(documentValue, "p", "", "");
      appendRuns(paragraph,
        item.content.runs || [{ text: item.content.text }], documentValue);
      element.append(label, paragraph);
    } else {
      element = documentValue.createElement("div");
    }
    element.dataset.documentWorkspaceItemId = item.workspaceItemId;
    if (["stepTitle", "paragraph", "image", "callout"].includes(item.kind)) {
      element.dataset.workspaceContextTarget = "true";
      element.tabIndex = 0;
      element.setAttribute("aria-describedby", "documentContextHelp");
      element.setAttribute("aria-keyshortcuts", "Enter Space");
    }
    applyAppearance(element, item);
    return element;
  }

  function sectionFingerprint(section, mediaAssets) {
    const media = section.items.filter(item => ["image", "brand"].includes(item.kind)).map(item => {
      const assetId = item.content.assetId || item.content.logoAssetId;
      const value = mediaAssets[assetId];
      return [assetId, value?.revision || "", value?.source ? 1 : 0];
    });
    return JSON.stringify([section, media]);
  }

  function createSection(section, mediaAssets, documentValue) {
    const element = documentValue.createElement("section");
    element.dataset.documentWorkspaceSectionId = section.workspaceSectionId;
    element.dataset.documentWorkspaceItemId = section.workspaceSectionId;
    element.dataset.workspaceContextTarget = "true";
    element.tabIndex = 0;
    element.setAttribute("aria-describedby", "documentContextHelp");
    element.setAttribute("aria-keyshortcuts", "Enter Space");
    element.className = `document-workspace-section ${section.kind}`;
    const heading = section.items.find(item =>
      item.kind === "heading" || item.kind === "stepTitle"
    );
    element.setAttribute(
      "aria-label",
      heading?.content?.text || "Dokumentavsnitt"
    );
    for (const item of section.items) {
      element.appendChild(createItem(item, mediaAssets, documentValue));
    }
    element.dataset.renderFingerprint = sectionFingerprint(section, mediaAssets);
    return element;
  }

  // The template's header (logo, company and the document's name) and footer, above and
  // below the document as on a Word page. They are not part of the document's content.
  function createPageBand(band, mediaAssets, documentValue) {
    const element = documentValue.createElement(band.kind === "pageHeader" ? "header" : "footer");
    element.className = `document-workspace-page-band ${band.kind}`;
    element.dataset.documentWorkspaceSectionId = band.workspaceSectionId;
    if (band.value.borderColor) element.style.borderColor = band.value.borderColor;
    if (band.kind === "pageHeader") {
      const media = band.value.logoAssetId ? mediaAssets[band.value.logoAssetId] : null;
      if (media?.source) {
        const image = documentValue.createElement("img");
        image.src = media.source;
        image.alt = band.value.company ? `${band.value.company} logo` : "Logo";
        image.className = "document-workspace-page-logo";
        element.appendChild(image);
      }
      if (band.value.company) {
        element.appendChild(textElement(documentValue, "strong", band.value.company,
          "document-workspace-page-company"));
      }
      element.appendChild(textElement(documentValue, "span", band.value.title,
        "document-workspace-page-title"));
    } else {
      element.appendChild(textElement(documentValue, "span", band.value.text, ""));
    }
    element.dataset.renderFingerprint = JSON.stringify([band, band.value.logoAssetId
      ? mediaAssets[band.value.logoAssetId]?.source || "" : ""]);
    return element;
  }

  function render(container, model, mediaAssets = {}, documentValue = document) {
    const existing = new Map([...container.children].map(element => [
      element.dataset.documentWorkspaceSectionId,
      element
    ]));
    let changedSections = 0;
    const band = (kind, value) => value
      ? [{ band: true, kind, value, workspaceSectionId: `workspace:${kind}` }] : [];
    for (const section of [...band("pageHeader", model.pageHeader), ...model.sections,
      ...band("pageFooter", model.pageFooter)]) {
      const current = existing.get(section.workspaceSectionId);
      const fingerprint = section.band
        ? JSON.stringify([section, section.value.logoAssetId
          ? mediaAssets[section.value.logoAssetId]?.source || "" : ""])
        : sectionFingerprint(section, mediaAssets);
      const next = current?.dataset.renderFingerprint === fingerprint
        ? current
        : section.band ? createPageBand(section, mediaAssets, documentValue)
          : createSection(section, mediaAssets, documentValue);
      if (next !== current) changedSections += 1;
      container.appendChild(next);
      existing.delete(section.workspaceSectionId);
      if (current && next !== current) current.remove();
    }
    for (const obsolete of existing.values()) {
      obsolete.remove();
      changedSections += 1;
    }
    container.dataset.documentId = model.documentId;
    container.setAttribute("aria-label", model.title);
    return { changedSections, sectionCount: model.sections.length };
  }

  function clear(container) {
    container.replaceChildren();
    delete container.dataset.documentId;
    container.setAttribute("aria-label", "Dokument");
  }

  return { clear, render };
});
