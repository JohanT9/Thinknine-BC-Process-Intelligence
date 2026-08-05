(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9WorkspaceContext = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FIELDS = Object.freeze([
    "selectedSectionId", "selectedStepId", "selectedScreenshotId",
    "selectedAnnotationId", "scrollAnchor", "focusOrigin", "navigationReason"
  ]);

  function create(value = {}) {
    return Object.freeze(Object.fromEntries(FIELDS.map(field => [
      field,
      typeof value[field] === "string" && value[field] ? value[field] : null
    ])));
  }

  function update(context, patch = {}) {
    return create({ ...context, ...Object.fromEntries(
      FIELDS.filter(field => Object.hasOwn(patch, field)).map(field =>
        [field, patch[field]]
      )
    ) });
  }

  function bind(model, options = {}) {
    const taskIds = [...(options.taskIds || [])];
    const screenshotsByTask = options.screenshotsByTask || {};
    const byItemId = {};
    const byStepId = {};
    const byScreenshotId = {};
    const bySectionId = {};
    const byAnchor = {};
    let taskIndex = -1;
    let screenshotIndex = 0;
    let currentStepId = null;
    for (const section of model?.sections || []) {
      currentStepId = null;
      screenshotIndex = 0;
      bySectionId[section.sourceSectionId] = section.workspaceSectionId;
      byAnchor[section.sourceSectionId] = section.workspaceSectionId;
      byAnchor[section.workspaceSectionId] = section.workspaceSectionId;
      const firstSectionStepId = (section.items || []).some(
        item => item.kind === "stepTitle"
      ) ? taskIds[taskIndex + 1] || null : null;
      byItemId[section.workspaceSectionId] = create({
        selectedSectionId: section.sourceSectionId,
        selectedStepId: firstSectionStepId,
        scrollAnchor: section.workspaceSectionId
      });
      for (const item of section.items || []) {
        if (item.kind === "stepTitle") {
          taskIndex += 1;
          screenshotIndex = 0;
          currentStepId = taskIds[taskIndex] || null;
          if (currentStepId) byStepId[currentStepId] = item.workspaceItemId;
        }
        const screenshotId = item.kind === "image" && currentStepId
          ? (screenshotsByTask[currentStepId] || [])[screenshotIndex++] || null
          : null;
        const itemContext = create({
          selectedSectionId: section.sourceSectionId,
          selectedStepId: currentStepId,
          selectedScreenshotId: screenshotId,
          scrollAnchor: item.workspaceItemId
        });
        byItemId[item.workspaceItemId] = itemContext;
        byAnchor[item.workspaceItemId] = item.workspaceItemId;
        if (item.sourceComponentId) {
          byAnchor[item.sourceComponentId] = item.workspaceItemId;
          const blockId = item.sourceComponentId.replace(/^component:block:/, "");
          byAnchor[blockId] = item.workspaceItemId;
        }
        if (screenshotId) byScreenshotId[screenshotId] = item.workspaceItemId;
      }
    }
    return Object.freeze({
      byItemId: Object.freeze(byItemId),
      byStepId: Object.freeze(byStepId),
      byScreenshotId: Object.freeze(byScreenshotId),
      bySectionId: Object.freeze(bySectionId),
      byAnchor: Object.freeze(byAnchor)
    });
  }

  function target(binding, context) {
    const itemId = binding?.byScreenshotId?.[context.selectedScreenshotId] ||
      binding?.byStepId?.[context.selectedStepId] ||
      binding?.byAnchor?.[context.scrollAnchor] || context.scrollAnchor;
    return Object.freeze({
      itemId: itemId || null,
      sectionId: context.selectedSectionId
        ? binding?.bySectionId?.[context.selectedSectionId] || null
        : null
    });
  }

  return { FIELDS, bind, create, target, update };
});
