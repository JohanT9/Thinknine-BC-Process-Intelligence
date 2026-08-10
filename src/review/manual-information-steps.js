(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ManualInformationSteps = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCHEMA_VERSION = "1.0.0";
  const STEP_TYPES = Object.freeze([
    "instruction", "information", "note", "warning", "tip",
    "verification", "prerequisite"
  ]);
  const RELATIONS = Object.freeze([
    "before", "after", "section-start", "section-end"
  ]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function stableId(values) {
    let hash = 2166136261;
    const input = values.map(String).join("\u001f");
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `manual-step:${(hash >>> 0).toString(36)}`;
  }

  function normalizeAnchor(value = {}) {
    const relation = RELATIONS.includes(value.relation)
      ? value.relation : "section-end";
    return {
      relation,
      ...(value.targetStepId ? { targetStepId: String(value.targetStepId) } : {}),
      sectionId: String(value.sectionId || "workflow")
    };
  }

  function normalize(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("Manual Information Step must be an object.");
    }
    const stepType = STEP_TYPES.includes(value.stepType)
      ? value.stepType : "information";
    return Object.freeze({
      ...clone(value),
      manualStepId: String(value.manualStepId || ""),
      schemaVersion: String(value.schemaVersion || SCHEMA_VERSION),
      recordingId: String(value.recordingId || ""),
      stepType,
      positionAnchor: normalizeAnchor(value.positionAnchor),
      title: String(value.title || ""),
      instruction: String(value.instruction || ""),
      comment: String(value.comment || ""),
      callout: value.callout ? clone(value.callout) : null,
      selectedScreenshotAssetId: value.selectedScreenshotAssetId
        ? String(value.selectedScreenshotAssetId) : null,
      visibility: value.visibility === "hidden" ? "hidden" : "visible",
      createdAt: value.createdAt || null,
      updatedAt: value.updatedAt || value.createdAt || null,
      createdBy: value.createdBy || null,
      provenance: "manual",
      sourceEventIds: [],
      metadata: clone(value.metadata || {}),
      futureFields: clone(value.futureFields || {})
    });
  }

  function create(options = {}) {
    const now = options.now || new Date().toISOString();
    const anchor = normalizeAnchor(options.positionAnchor);
    const manualStepId = options.manualStepId || stableId([
      options.recordingId || "", now, anchor.relation,
      anchor.targetStepId || "", options.nonce || ""
    ]);
    return normalize({
      ...options, manualStepId, positionAnchor: anchor,
      stepType: options.stepType || "information",
      instruction: options.instruction || "",
      createdAt: now, updatedAt: now
    });
  }

  function update(step, patch, options = {}) {
    const current = normalize(step);
    const next = { ...clone(current), ...clone(patch),
      manualStepId: current.manualStepId,
      provenance: "manual", sourceEventIds: [],
      createdAt: current.createdAt,
      updatedAt: options.now || new Date().toISOString() };
    return normalize(next);
  }

  function validate(step) {
    const value = normalize(step);
    const hasContent = Boolean(
      value.title.trim() || value.instruction.trim() || value.comment.trim() ||
      String(value.callout?.text || "").trim()
    );
    return { valid: hasContent, issues: hasContent ? [] : [{
      code: "empty-manual-step",
      message: "A manual information step requires visible content."
    }] };
  }

  function identity(step) {
    return String(step?.stepId || step?.taskId || "");
  }

  function project(step) {
    const screenshot = step.selectedScreenshotAssetId;
    return {
      taskId: step.manualStepId,
      stepId: step.manualStepId,
      manualStepId: step.manualStepId,
      taskType: "ManualInformation",
      stepType: step.stepType,
      title: step.title,
      instruction: step.instruction,
      userComment: step.comment,
      comment: step.comment,
      callout: clone(step.callout),
      screenshots: screenshot ? [screenshot] : [],
      sourceScreenshotAssetIds: screenshot ? [screenshot] : [],
      selectedScreenshotAssetId: screenshot,
      visibility: step.visibility,
      deleted: step.visibility === "hidden",
      provenance: "manual",
      sourceEventIds: [],
      sourceEventNos: [],
      manuallyAdded: true,
      derivedStep: {
        title: step.title,
        instruction: step.instruction,
        comment: step.comment,
        sourceScreenshotAssetIds: screenshot ? [screenshot] : [],
        selectedScreenshotAssetId: screenshot,
        visibility: step.visibility
      },
      manualModel: clone(step)
    };
  }

  function resolve(baseSteps, manualSteps, options = {}) {
    const steps = clone(baseSteps || []);
    const diagnostics = [];
    const unresolvedManualStepIds = [];
    for (const raw of manualSteps || []) {
      const manual = normalize(raw);
      if (manual.visibility === "hidden") continue;
      const value = project(manual);
      const anchor = manual.positionAnchor;
      let index;
      if (anchor.relation === "section-start") index = 0;
      else if (anchor.relation === "section-end") index = steps.length;
      else {
        const target = steps.findIndex(step =>
          identity(step) === anchor.targetStepId
        );
        if (target >= 0) index = target + (anchor.relation === "after" ? 1 : 0);
        else {
          index = steps.length;
          unresolvedManualStepIds.push(manual.manualStepId);
          diagnostics.push({
            code: "unresolved-manual-step-anchor",
            manualStepId: manual.manualStepId,
            targetStepId: anchor.targetStepId || null,
            fallback: "section-end",
            sectionId: anchor.sectionId
          });
        }
      }
      steps.splice(index, 0, value);
    }
    return Object.freeze({ steps, diagnostics, unresolvedManualStepIds,
      fallbackPlacement: options.fallbackPlacement || "section-end" });
  }

  return { RELATIONS, SCHEMA_VERSION, STEP_TYPES, create, normalize,
    normalizeAnchor, project, resolve, stableId, update, validate };
});
