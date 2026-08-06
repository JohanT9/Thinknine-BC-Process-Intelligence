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
  }

  function appendRuns(element, runs, documentValue) {
    for (const run of runs || []) {
      const child = documentValue.createElement(run.bold ? "strong" : "span");
      child.textContent = run.text || "";
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
      const paragraph = textElement(documentValue, "p", "", "");
      appendRuns(paragraph,
        item.content.runs || [{ text: item.content.text }], documentValue);
      element.appendChild(paragraph);
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
    const media = section.items.filter(item => item.kind === "image").map(item => {
      const value = mediaAssets[item.content.assetId];
      return [item.content.assetId, value?.revision || ""];
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

  function render(container, model, mediaAssets = {}, documentValue = document) {
    const existing = new Map([...container.children].map(element => [
      element.dataset.documentWorkspaceSectionId,
      element
    ]));
    let changedSections = 0;
    for (const section of model.sections) {
      const current = existing.get(section.workspaceSectionId);
      const fingerprint = sectionFingerprint(section, mediaAssets);
      const next = current?.dataset.renderFingerprint === fingerprint
        ? current
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
