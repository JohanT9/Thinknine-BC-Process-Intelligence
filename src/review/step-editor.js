(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9StepEditor = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCHEMA_VERSION = "1.0.0";
  const EDITABLE_FIELDS = Object.freeze(["title", "instruction", "comment"]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function text(value) {
    return typeof value === "string" ? value : "";
  }

  function sourceIds(step, key, legacyKey) {
    const values = step?.[key] || step?.[legacyKey] || [];
    return [...new Set((Array.isArray(values) ? values : []).map(String))];
  }

  function generated(step) {
    const value = step?.derivedStep || step || {};
    const legacy = step?.legacyFullCopy && !step?.stepOverride ? step : value;
    return {
      title: text(legacy.title || legacy.stepTitle),
      instruction: text(legacy.instruction || legacy.description),
      comment: text(legacy.comment || legacy.userComment),
      screenshotAssetIds: sourceIds(value, "sourceScreenshotAssetIds", "screenshots"),
      selectedScreenshotAssetId: value.selectedScreenshotAssetId ||
        value.screenshot || value.screenshots?.[0] || null,
      visibility: value.visibility || (value.deleted ? "hidden" : "visible")
    };
  }

  function normalizeOverride(value, step = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const fields = {};
    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(value.fields || {}, field)) {
        fields[field] = value.fields[field];
      }
    }
    const normalized = {
      ...clone(value),
      overrideId: String(value.overrideId || `step-override:${step.taskId || step.stepId}`),
      schemaVersion: String(value.schemaVersion || SCHEMA_VERSION),
      stepId: String(value.stepId || step.stepId || step.taskId || ""),
      recordingId: String(value.recordingId || step.recordingId || ""),
      sourceEventIds: sourceIds(value, "sourceEventIds", "sourceEventNos"),
      createdAt: value.createdAt || null,
      updatedAt: value.updatedAt || null,
      editedBy: value.editedBy || null,
      fields,
      screenshotOverride: value.screenshotOverride?.selectedScreenshotAssetId
        ? { ...clone(value.screenshotOverride),
          selectedScreenshotAssetId: String(
            value.screenshotOverride.selectedScreenshotAssetId
          ) }
        : null,
      visibilityOverride: value.visibilityOverride === "hidden"
        ? "hidden" : null,
      metadata: clone(value.metadata || {}),
      futureFields: clone(value.futureFields || {})
    };
    return normalized;
  }

  function isEmpty(value) {
    return !value || (!Object.keys(value.fields || {}).length &&
      !value.screenshotOverride && !value.visibilityOverride);
  }

  function edit(step, field, value, options = {}) {
    if (!EDITABLE_FIELDS.includes(field)) {
      throw new TypeError(`Unsupported Step Override field: ${field}.`);
    }
    const now = options.now || new Date().toISOString();
    const current = normalizeOverride(step.stepOverride, step) || {};
    return normalizeOverride({
      ...current,
      createdAt: current.createdAt || now,
      updatedAt: now,
      editedBy: options.editedBy ?? current.editedBy ?? null,
      fields: { ...(current.fields || {}), [field]: value },
      metadata: { ...(current.metadata || {}), provenance: "user-edited" }
    }, step);
  }

  function reset(step, field, options = {}) {
    const current = normalizeOverride(step.stepOverride, step);
    if (!current) return null;
    const next = clone(current);
    if (EDITABLE_FIELDS.includes(field)) delete next.fields[field];
    else if (field === "selectedScreenshotAssetId") next.screenshotOverride = null;
    else if (field === "visibility") next.visibilityOverride = null;
    else throw new TypeError(`Unsupported reset field: ${field}.`);
    next.updatedAt = options.now || new Date().toISOString();
    return isEmpty(next) ? null : normalizeOverride(next, step);
  }

  function annotationsFor(review, screenshotAssetId) {
    return (review?.annotations?.screenshotSets || []).find(set =>
      set.screenshotRef === screenshotAssetId
    )?.items || [];
  }

  function selectScreenshot(step, assetId, review, options = {}) {
    const current = resolve(step);
    if (current.selectedScreenshotAssetId !== assetId &&
        annotationsFor(review, current.selectedScreenshotAssetId).length) {
      return { ok: false, reason: "annotation-protected", override: step.stepOverride || null };
    }
    const candidates = new Set(generated(step).screenshotAssetIds);
    if (!candidates.has(String(assetId))) {
      return { ok: false, reason: "not-a-step-candidate", override: step.stepOverride || null };
    }
    const now = options.now || new Date().toISOString();
    const currentOverride = normalizeOverride(step.stepOverride, step) || {};
    return { ok: true, override: normalizeOverride({
      ...currentOverride,
      createdAt: currentOverride.createdAt || now,
      updatedAt: now,
      screenshotOverride: {
        selectedScreenshotAssetId: String(assetId),
        provenance: "user-edited"
      },
      metadata: { ...(currentOverride.metadata || {}), provenance: "user-edited" }
    }, step) };
  }

  function setVisibility(step, hidden, options = {}) {
    const now = options.now || new Date().toISOString();
    const current = normalizeOverride(step.stepOverride, step) || {};
    return normalizeOverride({ ...current,
      createdAt: current.createdAt || now, updatedAt: now,
      visibilityOverride: hidden ? "hidden" : null,
      metadata: { ...(current.metadata || {}), provenance: "user-edited" }
    }, step);
  }

  function resolve(step) {
    const base = generated(step);
    const override = normalizeOverride(step?.stepOverride, step);
    const fields = override?.fields || {};
    const provenance = {};
    for (const field of EDITABLE_FIELDS) {
      provenance[field] = Object.prototype.hasOwnProperty.call(fields, field)
        ? "user-edited" : "generated";
    }
    return Object.freeze({
      ...clone(step),
      title: Object.prototype.hasOwnProperty.call(fields, "title")
        ? fields.title : base.title,
      instruction: Object.prototype.hasOwnProperty.call(fields, "instruction")
        ? fields.instruction : base.instruction,
      userComment: Object.prototype.hasOwnProperty.call(fields, "comment")
        ? fields.comment : base.comment,
      comment: Object.prototype.hasOwnProperty.call(fields, "comment")
        ? fields.comment : base.comment,
      selectedScreenshotAssetId: override?.screenshotOverride
        ?.selectedScreenshotAssetId || base.selectedScreenshotAssetId,
      screenshots: override?.screenshotOverride?.selectedScreenshotAssetId
        ? [override.screenshotOverride.selectedScreenshotAssetId]
        : [...base.screenshotAssetIds],
      visibility: override?.visibilityOverride || base.visibility,
      deleted: (override?.visibilityOverride || base.visibility) === "hidden",
      stepOverride: override,
      sourceEventIds: sourceIds(step, "sourceEventIds", "sourceEventNos"),
      sourceScreenshotAssetIds: [...base.screenshotAssetIds],
      fieldProvenance: Object.freeze({ ...provenance,
        screenshot: override?.screenshotOverride ? "user-edited" : "system-derived",
        visibility: override?.visibilityOverride ? "user-edited" : "generated" })
    });
  }

  function resolveReview(review) {
    const tasks = (review?.tasks || []).map(resolve);
    const taskIds = new Set(tasks.map(task => String(task.taskId || task.stepId)));
    const orphanedOverrides = (review?.orphanedStepOverrides || []).map(clone);
    for (const override of review?.stepOverrides || []) {
      if (!taskIds.has(String(override.stepId))) orphanedOverrides.push(clone(override));
    }
    return { ...clone(review), tasks, orphanedStepOverrides: orphanedOverrides };
  }

  return {
    EDITABLE_FIELDS, SCHEMA_VERSION, annotationsFor, edit, generated,
    isEmpty, normalizeOverride, reset, resolve, resolveReview,
    selectScreenshot, setVisibility
  };
});
