(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9StepStructureOverrides = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCHEMA_VERSION = "1.0.0";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function unique(values) {
    return [...new Set((values || []).filter(value =>
      value !== undefined && value !== null && value !== ""
    ).map(String))];
  }

  function stableId(prefix, values) {
    let hash = 2166136261;
    const input = values.map(String).join("\u001f");
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${prefix}:${(hash >>> 0).toString(36)}`;
  }

  function eventIds(step) {
    return unique(step?.sourceEventIds || step?.sourceEventNos || []);
  }

  function screenshotIds(step) {
    return unique(step?.sourceScreenshotAssetIds || step?.screenshots ||
      (step?.screenshot ? [step.screenshot] : []));
  }

  function stepGroupIds(step) {
    return unique(step?.sourceStepGroupIds ||
      (step?.stepGroupId ? [step.stepGroupId] : []));
  }

  function stepId(step) {
    return String(step?.stepId || step?.taskId || "");
  }

  function normalize(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("Step Structure Override must be an object.");
    }
    const type = String(value.type || "");
    if (!new Set(["hide", "merge", "split"]).has(type)) {
      throw new TypeError(`Unsupported structure override type: ${type}.`);
    }
    return Object.freeze({
      ...clone(value),
      structureOverrideId: String(value.structureOverrideId || ""),
      schemaVersion: String(value.schemaVersion || SCHEMA_VERSION),
      recordingId: String(value.recordingId || ""),
      type,
      sourceStepIds: unique(value.sourceStepIds),
      sourceEventIds: unique(value.sourceEventIds),
      createdAt: value.createdAt || null,
      updatedAt: value.updatedAt || value.createdAt || null,
      sequence: Number.isInteger(value.sequence) ? value.sequence : 0,
      partitions: Array.isArray(value.partitions)
        ? value.partitions.map(partition => ({ ...clone(partition),
          partitionId: String(partition.partitionId),
          sourceEventIds: unique(partition.sourceEventIds) })) : [],
      metadata: clone(value.metadata || {}),
      futureFields: clone(value.futureFields || {})
    });
  }

  function base(type, steps, options = {}) {
    const ids = steps.map(stepId);
    const now = options.now || new Date().toISOString();
    const identityParts = [options.recordingId || "", type, ...ids,
      options.identity || ""];
    return {
      structureOverrideId: options.structureOverrideId ||
        stableId(`structure-${type}`, identityParts),
      schemaVersion: SCHEMA_VERSION,
      recordingId: options.recordingId || "",
      type,
      sourceStepIds: ids,
      sourceEventIds: unique(steps.flatMap(eventIds)),
      createdAt: now,
      updatedAt: now,
      sequence: options.sequence || 0,
      metadata: { provenance: "user-edited", ...(options.metadata || {}) },
      futureFields: clone(options.futureFields || {})
    };
  }

  function hide(step, options = {}) {
    if (!stepId(step)) throw new TypeError("Hide requires a stable step ID.");
    return normalize(base("hide", [step], options));
  }

  function validateAdjacent(allSteps, selectedSteps) {
    const positions = selectedSteps.map(selected =>
      allSteps.findIndex(step => stepId(step) === stepId(selected))
    );
    return positions.length >= 2 && positions.every((position, index) =>
      position >= 0 && (index === 0 || position === positions[index - 1] + 1)
    );
  }

  function merge(allSteps, sourceStepIds, options = {}) {
    const requested = sourceStepIds.map(String);
    const selected = requested.map(id => allSteps.find(step => stepId(step) === id));
    if (selected.some(step => !step)) {
      return { ok: false, reason: "missing-source-step" };
    }
    if (!validateAdjacent(allSteps, selected)) {
      return { ok: false, reason: "non-adjacent-steps" };
    }
    const override = normalize(base("merge", selected, options));
    return { ok: true, override, resolvedStepId: stableId(
      "merged-step", [override.structureOverrideId, ...override.sourceStepIds]
    ) };
  }

  function split(step, partitions, options = {}) {
    const sourceEvents = eventIds(step);
    const normalizedPartitions = (partitions || []).map((partition, index) => ({
      partitionId: String(partition.partitionId || `part-${index + 1}`),
      sourceEventIds: unique(partition.sourceEventIds),
      instruction: partition.instruction,
      futureFields: clone(partition.futureFields || {})
    }));
    if (normalizedPartitions.length < 2) {
      return { ok: false, reason: "insufficient-partitions" };
    }
    const assigned = normalizedPartitions.flatMap(partition => partition.sourceEventIds);
    if (assigned.length !== new Set(assigned).size) {
      return { ok: false, reason: "duplicate-event-assignment" };
    }
    if (sourceEvents.length !== assigned.length ||
        sourceEvents.some(id => !assigned.includes(id))) {
      return { ok: false, reason: "incomplete-event-partition" };
    }
    const raw = base("split", [step], {
      ...options,
      identity: normalizedPartitions.map(partition =>
        `${partition.partitionId}:${partition.sourceEventIds.join(",")}`
      ).join("|")
    });
    const override = normalize({ ...raw, partitions: normalizedPartitions });
    return { ok: true, override, resolvedStepIds: normalizedPartitions.map(partition =>
      stableId("split-step", [override.structureOverrideId, stepId(step),
        partition.partitionId])
    ) };
  }

  function mergedStep(sources, override) {
    const instruction = sources.map(step =>
      step.stepOverride?.fields && Object.prototype.hasOwnProperty.call(
        step.stepOverride.fields, "instruction"
      ) ? step.stepOverride.fields.instruction
        : step.instruction || step.description || ""
    ).filter(Boolean).join("\n\n");
    const mergedId = stableId("merged-step", [override.structureOverrideId,
      ...override.sourceStepIds]);
    const screenshots = unique(sources.flatMap(screenshotIds));
    return {
      ...clone(sources[0]),
      taskId: mergedId,
      stepId: mergedId,
      instruction,
      derivedStep: {
        title: sources[0].title || "",
        instruction,
        comment: sources.map(step => step.userComment || "").filter(Boolean)
          .join("\n\n"),
        sourceScreenshotAssetIds: screenshots,
        selectedScreenshotAssetId: screenshots[0] || null,
        visibility: "visible"
      },
      stepOverride: null,
      sourceStepIds: [...override.sourceStepIds],
      sourceStepGroupIds: unique(sources.flatMap(stepGroupIds)),
      sourceEventIds: [...override.sourceEventIds],
      sourceScreenshotAssetIds: screenshots,
      screenshots,
      structureOverrideId: override.structureOverrideId,
      structureProvenance: "user-edited",
      merged: true
    };
  }

  function splitSteps(source, override) {
    const screenshots = screenshotIds(source);
    return override.partitions.map(partition => {
      const relevant = screenshots.filter(assetId => {
        const association = source.screenshotAssociations?.find(item =>
          item.assetId === assetId
        );
        return !association || partition.sourceEventIds.includes(
          String(association.sourceEventId)
        );
      });
      const id = stableId("split-step", [override.structureOverrideId,
        stepId(source), partition.partitionId]);
      return {
        ...clone(source), taskId: id, stepId: id,
        instruction: partition.instruction || source.instruction,
        derivedStep: {
          title: source.title || "",
          instruction: partition.instruction || source.instruction,
          comment: source.userComment || "",
          sourceScreenshotAssetIds: relevant,
          selectedScreenshotAssetId: relevant[0] || null,
          visibility: "visible"
        },
        stepOverride: null,
        sourceStepIds: [stepId(source)],
        sourceEventIds: [...partition.sourceEventIds],
        sourceScreenshotAssetIds: relevant,
        screenshots: relevant,
        structureOverrideId: override.structureOverrideId,
        partitionId: partition.partitionId,
        structureProvenance: "user-edited",
        split: true
      };
    });
  }

  function resolve(derivedSteps, values) {
    let steps = clone(derivedSteps || []);
    const overrides = (values || []).map(normalize)
      .sort((a, b) => a.sequence - b.sequence ||
        a.structureOverrideId.localeCompare(b.structureOverrideId));
    const diagnostics = [];
    const appliedOverrideIds = [];
    for (const override of overrides) {
      const indexes = override.sourceStepIds.map(id =>
        steps.findIndex(step => stepId(step) === id)
      );
      if (indexes.some(index => index < 0)) {
        diagnostics.push({ code: "orphaned-structure-override",
          structureOverrideId: override.structureOverrideId,
          reason: "source-step-not-found", sourceStepIds: override.sourceStepIds });
        continue;
      }
      if (override.type === "hide") {
        steps.splice(indexes[0], 1);
      } else if (override.type === "merge") {
        if (!indexes.every((index, position) =>
          position === 0 || index === indexes[position - 1] + 1)) {
          diagnostics.push({ code: "unresolved-structure-conflict",
            structureOverrideId: override.structureOverrideId,
            reason: "sources-no-longer-adjacent" });
          continue;
        }
        const sources = indexes.map(index => steps[index]);
        steps.splice(indexes[0], indexes.length, mergedStep(sources, override));
      } else {
        const source = steps[indexes[0]];
        const actual = eventIds(source);
        const assigned = override.partitions.flatMap(partition =>
          partition.sourceEventIds
        );
        if (actual.length !== assigned.length ||
            actual.some(id => !assigned.includes(id))) {
          diagnostics.push({ code: "unresolved-structure-conflict",
            structureOverrideId: override.structureOverrideId,
            reason: "source-events-changed" });
          continue;
        }
        steps.splice(indexes[0], 1, ...splitSteps(source, override));
      }
      appliedOverrideIds.push(override.structureOverrideId);
    }
    return Object.freeze({ steps, overrides, appliedOverrideIds, diagnostics,
      orphanedOverrides: overrides.filter(override => diagnostics.some(item =>
        item.structureOverrideId === override.structureOverrideId
      )) });
  }

  return { SCHEMA_VERSION, eventIds, hide, merge, normalize, resolve,
    screenshotIds, split, stableId, stepGroupIds, validateAdjacent };
});
