(function (root, factory) {
  const processModel = typeof module === "object" && module.exports
    ? require("./process-model") : root.T9ProcessModel;
  const processVersioning = typeof module === "object" && module.exports
    ? require("./process-versioning") : root.T9ProcessVersioning;
  const api = factory(processModel, processVersioning);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RegenerateFromRecording = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  processModel,
  processVersioning
) {
  const SCHEMA_VERSION = "1.0.0";
  const REGENERATION_VERSION = "1.0.0";
  const PIPELINE_COMPONENTS = Object.freeze([
    "identificationVersion", "normalizationVersion", "groupingVersion",
    "semanticRulesVersion", "languageVersion", "presentationGrammarVersion",
    "screenshotSelectionVersion", "hierarchyProjectionVersion", "processModelVersion"
  ]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function unique(values) {
    return [...new Set(array(values).filter(Boolean).map(String))].sort();
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
  }

  function stableId(prefix, values) {
    let hash = 2166136261;
    for (const character of values.map(String).join("\u001f")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `${prefix}:${(hash >>> 0).toString(36)}`;
  }

  function stepId(step) {
    return String(step?.stepId || step?.taskId || "");
  }

  function groupId(step) {
    return String(step?.stepGroupId || step?.sourceStepGroupId ||
      step?.groupId || "");
  }

  function semanticIds(step) {
    return unique(step?.sourceSemanticActionIds || step?.semanticActionIds);
  }

  function eventIds(step) {
    return unique(step?.sourceEventIds || step?.sourceEventNos);
  }

  function exactKey(values) {
    const ids = unique(values);
    return ids.length ? ids.join("\u001e") : "";
  }

  function uniqueIndex(values, keyOf) {
    const map = new Map();
    values.forEach(value => {
      const key = keyOf(value);
      if (!key) return;
      map.set(key, map.has(key) ? null : value);
    });
    return map;
  }

  function overlap(left, right) {
    const rightSet = new Set(right);
    return left.filter(value => rightSet.has(value));
  }

  function mapSteps(previousSteps = [], newSteps = []) {
    const oldRemaining = new Map(previousSteps.map(step => [stepId(step), step]));
    const newRemaining = new Map(newSteps.map(step => [stepId(step), step]));
    const mappings = [];
    function match(oldStep, newStep, strategy) {
      mappings.push({ mappingType: "one-to-one", strategy,
        oldStepIds: [stepId(oldStep)], newStepIds: [stepId(newStep)],
        sourceEventIds: unique([...eventIds(oldStep), ...eventIds(newStep)]) });
      oldRemaining.delete(stepId(oldStep)); newRemaining.delete(stepId(newStep));
    }
    for (const [id, oldStep] of [...oldRemaining]) {
      if (newRemaining.has(id)) match(oldStep, newRemaining.get(id), "step-id");
    }
    for (const [strategy, keyOf] of [
      ["step-group-id", groupId],
      ["semantic-action-id", step => exactKey(semanticIds(step))],
      ["source-event-identity", step => exactKey(eventIds(step))]
    ]) {
      const oldIndex = uniqueIndex([...oldRemaining.values()], keyOf);
      const newIndex = uniqueIndex([...newRemaining.values()], keyOf);
      for (const [key, oldStep] of oldIndex) {
        const newStep = newIndex.get(key);
        if (oldStep && newStep && oldRemaining.has(stepId(oldStep)) &&
            newRemaining.has(stepId(newStep))) match(oldStep, newStep, strategy);
      }
    }
    for (const oldStep of [...oldRemaining.values()]) {
      const oldEvents = eventIds(oldStep);
      if (!oldEvents.length) continue;
      const candidates = [...newRemaining.values()].filter(step => {
        const events = eventIds(step);
        return events.length && events.every(id => oldEvents.includes(id));
      });
      const union = unique(candidates.flatMap(eventIds));
      if (candidates.length > 1 && stableStringify(union) === stableStringify(oldEvents)) {
        mappings.push({ mappingType: "one-to-many", strategy: "event-partition",
          oldStepIds: [stepId(oldStep)], newStepIds: candidates.map(stepId),
          sourceEventIds: oldEvents });
        oldRemaining.delete(stepId(oldStep));
        candidates.forEach(step => newRemaining.delete(stepId(step)));
      }
    }
    for (const newStep of [...newRemaining.values()]) {
      const newEvents = eventIds(newStep);
      if (!newEvents.length) continue;
      const candidates = [...oldRemaining.values()].filter(step => {
        const events = eventIds(step);
        return events.length && events.every(id => newEvents.includes(id));
      });
      const union = unique(candidates.flatMap(eventIds));
      if (candidates.length > 1 && stableStringify(union) === stableStringify(newEvents)) {
        mappings.push({ mappingType: "many-to-one", strategy: "event-consolidation",
          oldStepIds: candidates.map(stepId), newStepIds: [stepId(newStep)],
          sourceEventIds: newEvents });
        candidates.forEach(step => oldRemaining.delete(stepId(step)));
        newRemaining.delete(stepId(newStep));
      }
    }
    const ambiguous = [];
    for (const oldStep of oldRemaining.values()) {
      const oldEvents = eventIds(oldStep);
      const possibleTargets = [...newRemaining.values()].filter(step =>
        overlap(oldEvents, eventIds(step)).length).map(stepId);
      if (possibleTargets.length) ambiguous.push({ oldStepId: stepId(oldStep),
        possibleTargets, sourceEventIds: oldEvents });
    }
    return deepFreeze({ mappings,
      removedStepIds: [...oldRemaining.keys()], addedStepIds: [...newRemaining.keys()],
      ambiguous });
  }

  function oneToOneTarget(stepMap, oldId) {
    const mapping = stepMap.mappings.find(item => item.mappingType === "one-to-one" &&
      item.oldStepIds.includes(String(oldId)));
    return mapping?.newStepIds[0] || null;
  }

  function unresolved(type, target, reason, traceability = [], possibleTargets = []) {
    return { unresolvedOverrideId: stableId("unresolved-regeneration", [
      type, target || "", reason, exactKey(traceability)
    ]), overrideType: type, originalTargetId: target || null,
    sourceTraceability: unique(traceability), reason,
    possibleTargets: unique(possibleTargets), status: "unresolved" };
  }

  function reconcileStepOverrides(overrides, stepMap, previousSteps, newState,
    unresolvedOverrides, preservedOverrides, availableAssets) {
    const oldById = new Map(previousSteps.map(step => [stepId(step), step]));
    const assetIds = new Set(availableAssets);
    const values = [];
    for (const override of overrides) {
      const oldTarget = String(override.targetStepId || override.stepId || "");
      const target = oneToOneTarget(stepMap, oldTarget);
      const trace = eventIds(oldById.get(oldTarget));
      const ambiguous = stepMap.ambiguous.find(item => item.oldStepId === oldTarget);
      if (!target) {
        unresolvedOverrides.push(unresolved("step-content", oldTarget,
          stepMap.mappings.some(item => item.oldStepIds.includes(oldTarget))
            ? "non-one-to-one-step-mapping" : "missing-step-target", trace,
          ambiguous?.possibleTargets));
        continue;
      }
      const screenshotId = override.selectedScreenshotAssetId ||
        override.screenshotAssetId || override.patch?.selectedScreenshotAssetId ||
        override.screenshotOverride?.selectedScreenshotAssetId;
      if (screenshotId && !assetIds.has(String(screenshotId))) {
        unresolvedOverrides.push(unresolved("manual-screenshot", oldTarget,
          "missing-screenshot-asset", trace));
        continue;
      }
      const mapped = { ...clone(override),
        ...(override.targetStepId !== undefined ? { targetStepId: target } : {}),
        ...(override.stepId !== undefined ? { stepId: target } : {}) };
      values.push(mapped);
      preservedOverrides.push({ overrideType: screenshotId
        ? "manual-screenshot" : "step-content", originalTargetId: oldTarget,
      resolvedTargetId: target, strategy: "one-to-one" });
    }
    newState.stepOverrides = values;
  }

  function reconcileStructure(overrides, stepMap, previousSteps,
    unresolvedOverrides, preservedOverrides) {
    const oldById = new Map(previousSteps.map(step => [stepId(step), step]));
    const values = [];
    for (const override of overrides) {
      const targets = unique(override.sourceStepIds || [override.targetStepId]);
      let mapped = targets.map(id => oneToOneTarget(stepMap, id));
      let safe = mapped.every(Boolean) && new Set(mapped).size === mapped.length;
      if (override.type === "split") {
        const partitionEvents = unique(array(override.partitions)
          .flatMap(partition => partition.sourceEventIds));
        const mappedEvents = unique(stepMap.mappings.filter(item =>
          targets.some(id => item.oldStepIds.includes(id))).flatMap(item =>
          item.sourceEventIds));
        mapped = unique(stepMap.mappings.filter(item => targets.some(id =>
          item.oldStepIds.includes(id))).flatMap(item => item.newStepIds));
        safe = mapped.length > 0 && partitionEvents.length > 0 &&
          partitionEvents.every(id => mappedEvents.includes(id));
      }
      if (!safe) {
        unresolvedOverrides.push(unresolved(`structure-${override.type || "unknown"}`,
          targets.join(","), "incompatible-generated-structure",
          targets.flatMap(id => eventIds(oldById.get(id))), mapped.filter(Boolean)));
        continue;
      }
      values.push({ ...clone(override), sourceStepIds: mapped,
        ...(override.targetStepId ? { targetStepId: mapped[0] } : {}) });
      preservedOverrides.push({ overrideType: `structure-${override.type}`,
        originalTargetId: targets.join(","), resolvedTargetId: mapped.join(","),
        strategy: override.type === "split" ? "event-partition" : "one-to-one" });
    }
    return values;
  }

  function reconcileManualSteps(values, stepMap, diagnostics) {
    return values.map(value => {
      const manual = clone(value);
      const target = manual.positionAnchor?.targetStepId;
      if (!target) return manual;
      const mapped = oneToOneTarget(stepMap, target);
      if (mapped) manual.positionAnchor.targetStepId = mapped;
      else diagnostics.push({ code: "unresolved-manual-anchor",
        manualStepId: manual.manualStepId, targetStepId: target,
        fallback: "existing-anchor-policy" });
      return manual;
    });
  }

  function reconcileOwned(values, stepMap, kind, diagnostics) {
    return values.map(value => {
      const item = clone(value);
      const key = item.ownerStepId !== undefined ? "ownerStepId" :
        item.stepId !== undefined ? "stepId" :
          item.ownerType === "step" && item.ownerId !== undefined ? "ownerId" : null;
      if (!key || !item[key]) return item;
      const mapped = oneToOneTarget(stepMap, item[key]);
      if (mapped) item[key] = mapped;
      else {
        item.orphaned = true;
        item.orphanReason = "unresolved-regeneration-owner";
        diagnostics.push({ code: `orphaned-${kind}`, itemId: item.noteId ||
          item.annotationId || null, originalTargetId: item[key] });
      }
      return item;
    });
  }

  function reconcileHierarchy(value, stepMap, unresolvedOverrides,
    preservedOverrides) {
    const hierarchy = clone(object(value));
    hierarchy.sections = array(hierarchy.sections);
    hierarchy.subtasks = array(hierarchy.subtasks);
    hierarchy.assignments = array(hierarchy.assignments).flatMap(assignment => {
      const mapped = oneToOneTarget(stepMap, assignment.stepId);
      if (!mapped) {
        unresolvedOverrides.push(unresolved("hierarchy-assignment", assignment.stepId,
          "missing-or-non-one-to-one-step-target"));
        return [];
      }
      preservedOverrides.push({ overrideType: "hierarchy-assignment",
        originalTargetId: assignment.stepId, resolvedTargetId: mapped,
        strategy: "one-to-one" });
      return [{ ...assignment, stepId: mapped }];
    });
    hierarchy.overrides = array(hierarchy.overrides);
    return hierarchy;
  }

  function reconcileProcessOverrides(values, previousModel, newModel, stepMap,
    unresolvedOverrides, preservedOverrides) {
    const oldNodes = new Map(array(previousModel?.nodes).map(node => [node.nodeId, node]));
    const newByStep = new Map(array(newModel?.nodes).flatMap(node =>
      array(node.sourceStepIds).map(id => [String(id), node.nodeId])));
    return values.flatMap(override => {
      if (!override.targetNodeId) {
        preservedOverrides.push({ overrideType: "process-manual",
          originalTargetId: override.processOverrideId, resolvedTargetId:
            override.processOverrideId, strategy: "manual-identity" });
        return [clone(override)];
      }
      const oldNode = oldNodes.get(override.targetNodeId);
      const candidates = unique(array(oldNode?.sourceStepIds).map(id =>
        oneToOneTarget(stepMap, id)).filter(Boolean).map(id => newByStep.get(id)));
      if (candidates.length !== 1) {
        unresolvedOverrides.push(unresolved("process-override", override.targetNodeId,
          "unresolved-process-node", oldNode?.sourceEventIds, candidates));
        return [];
      }
      preservedOverrides.push({ overrideType: "process-override",
        originalTargetId: override.targetNodeId, resolvedTargetId: candidates[0],
        strategy: "source-step-traceability" });
      return [{ ...clone(override), targetNodeId: candidates[0] }];
    });
  }

  function generatedStepChanges(previousSteps, nextSteps, stepMap) {
    const oldById = new Map(previousSteps.map(step => [stepId(step), step]));
    const newById = new Map(nextSteps.map(step => [stepId(step), step]));
    const changedGeneratedSteps = [];
    const screenshotChanges = [];
    for (const mapping of stepMap.mappings.filter(item =>
      item.mappingType === "one-to-one")) {
      const oldStep = oldById.get(mapping.oldStepIds[0]);
      const newStep = newById.get(mapping.newStepIds[0]);
      const oldSemantic = { title: oldStep?.title || "",
        instruction: oldStep?.instruction || "", comment: oldStep?.comment || "",
        screenshotAssetIds: unique(oldStep?.sourceScreenshotAssetIds || oldStep?.screenshots) };
      const newSemantic = { title: newStep?.title || "",
        instruction: newStep?.instruction || "", comment: newStep?.comment || "",
        screenshotAssetIds: unique(newStep?.sourceScreenshotAssetIds || newStep?.screenshots) };
      if (stableStringify(oldSemantic) !== stableStringify(newSemantic)) {
        changedGeneratedSteps.push({ oldStepId: stepId(oldStep), newStepId: stepId(newStep),
          strategy: mapping.strategy });
      }
      if (stableStringify(oldSemantic.screenshotAssetIds) !==
          stableStringify(newSemantic.screenshotAssetIds)) screenshotChanges.push({
        oldStepId: stepId(oldStep), newStepId: stepId(newStep),
        beforeAssetIds: oldSemantic.screenshotAssetIds,
        afterAssetIds: newSemantic.screenshotAssetIds, provenance: "generated" });
    }
    return { addedGeneratedSteps: stepMap.addedStepIds,
      removedGeneratedSteps: stepMap.removedStepIds, changedGeneratedSteps,
      screenshotChanges,
      splitMappings: stepMap.mappings.filter(item => item.mappingType === "one-to-many"),
      mergeMappings: stepMap.mappings.filter(item => item.mappingType === "many-to-one") };
  }

  function reconcileWorkspaceContext(value, stepMap) {
    const context = clone(object(value));
    if (!context.selectedStepId) return context;
    const mapped = oneToOneTarget(stepMap, context.selectedStepId);
    return { ...context, selectedStepId: mapped,
      navigationReason: "regeneration",
      announcement: mapped
        ? "Regeneration complete. Previous step selection was preserved."
        : "Regeneration complete. The previous step is no longer available." };
  }

  function pipelineVersions(value = {}) {
    return Object.fromEntries(PIPELINE_COMPONENTS.map(key => [key,
      String(value[key] || "unknown") ]));
  }

  function revision(generated, options) {
    const versions = pipelineVersions(options.pipelineVersions);
    const steps = array(generated.steps);
    const stepFingerprint = stableId("step-fingerprint", [stableStringify(steps.map(step => ({
      stepId: stepId(step), groupId: groupId(step), semanticActionIds: semanticIds(step),
      sourceEventIds: eventIds(step), title: step.title || "",
      instruction: step.instruction || "",
      screenshotAssetIds: unique(step.sourceScreenshotAssetIds || step.screenshots)
    })))]);
    const processFingerprint = generated.processModel
      ? processVersioning.semanticFingerprint(generated.processModel) : "";
    const semanticFingerprint = stableId("derived-fingerprint", [
      stepFingerprint, processFingerprint, stableStringify(versions)
    ]);
    return deepFreeze({ derivedRevisionId: stableId("derived-revision", [
      options.recordingId, semanticFingerprint
    ]), recordingId: options.recordingId, createdAt: options.completedAt || null,
    pipelineVersions: versions, semanticFingerprint, stepFingerprint,
    processFingerprint, metadata: clone(object(options.revisionMetadata)) });
  }

  function validate(preview, options = {}) {
    const diagnostics = [];
    const ids = new Set();
    array(preview.freshGeneratedState.steps).forEach(step => {
      const id = stepId(step);
      if (!id || ids.has(id)) diagnostics.push({ code: "duplicate-generated-step-id",
        severity: "error", stepId: id });
      ids.add(id);
      eventIds(step).filter(eventId => options.canonicalEventIds?.length &&
        !options.canonicalEventIds.includes(eventId)).forEach(eventId =>
        diagnostics.push({ code: "invalid-generated-source-reference",
          severity: "error", stepId: id, sourceEventId: eventId }));
    });
    if (preview.freshGeneratedState.processModel) {
      diagnostics.push(...processModel.validate(preview.freshGeneratedState.processModel)
        .diagnostics);
    }
    if (preview.changeSet.unresolvedOverrides.length !==
        preview.result.unresolvedOverrides.length) diagnostics.push({
      code: "untracked-unresolved-override", severity: "error" });
    const historicalBefore = options.historicalVersionsBefore;
    if (historicalBefore !== undefined && stableStringify(options.processVersions) !==
        historicalBefore) diagnostics.push({ code: "historical-version-mutation",
      severity: "error" });
    return deepFreeze({ valid: !diagnostics.some(item => item.severity === "error"),
      diagnostics });
  }

  function prepare(options = {}) {
    if (typeof options.generate !== "function") {
      throw new TypeError("Regeneration requires the current interpretation pipeline.");
    }
    const canonicalBefore = stableStringify(options.canonicalRecording);
    const historicalBefore = stableStringify(options.processVersions || []);
    const freshGeneratedState = clone(options.generate(clone(options.canonicalRecording), {
      pipelineVersions: pipelineVersions(options.pipelineVersions)
    }));
    if (stableStringify(options.canonicalRecording) !== canonicalBefore) {
      throw new Error("Canonical Recording changed during regeneration.");
    }
    const previousGenerated = clone(object(options.previousGeneratedState));
    const previousSteps = array(previousGenerated.steps);
    const nextSteps = array(freshGeneratedState.steps);
    const stepMap = mapSteps(previousSteps, nextSteps);
    const user = clone(object(options.userState));
    const reconciledUserState = {};
    const unresolvedOverrides = [];
    const preservedOverrides = [];
    const diagnostics = [];
    const inferredAssets = unique([
      ...array(freshGeneratedState.screenshotAssets).map(asset => asset.screenshotAssetId),
      ...previousSteps.flatMap(step => step.sourceScreenshotAssetIds || step.screenshots || []),
      ...nextSteps.flatMap(step => step.sourceScreenshotAssetIds || step.screenshots || [])
    ]);
    const availableAssets = unique(Array.isArray(options.availableScreenshotAssetIds)
      ? options.availableScreenshotAssetIds : inferredAssets);
    reconcileStepOverrides(array(user.stepOverrides), stepMap, previousSteps,
      reconciledUserState, unresolvedOverrides, preservedOverrides, availableAssets);
    reconciledUserState.structureOverrides = reconcileStructure(
      array(user.structureOverrides), stepMap, previousSteps,
      unresolvedOverrides, preservedOverrides);
    reconciledUserState.manualSteps = reconcileManualSteps(array(user.manualSteps),
      stepMap, diagnostics);
    reconciledUserState.notes = reconcileOwned(array(user.notes), stepMap, "note", diagnostics);
    reconciledUserState.annotations = Array.isArray(user.annotations)
      ? reconcileOwned(user.annotations, stepMap, "annotation", diagnostics)
      : clone(user.annotations || {});
    reconciledUserState.hierarchy = reconcileHierarchy(user.hierarchy, stepMap,
      unresolvedOverrides, preservedOverrides);
    reconciledUserState.processOverrides = reconcileProcessOverrides(
      array(user.processOverrides), previousGenerated.processModel,
      freshGeneratedState.processModel, stepMap, unresolvedOverrides, preservedOverrides);
    for (const [key, value] of Object.entries(user)) {
      if (reconciledUserState[key] === undefined) reconciledUserState[key] = clone(value);
    }
    if (typeof options.projectProcessModel === "function") {
      freshGeneratedState.processModel = clone(options.projectProcessModel(
        clone(freshGeneratedState), clone(reconciledUserState)));
    }
    const nextRevision = revision(freshGeneratedState, {
      ...options, recordingId: options.recordingId ||
        options.canonicalRecording?.recordingId || options.canonicalRecording?.id || ""
    });
    const processChanges = previousGenerated.processModel && freshGeneratedState.processModel
      ? processVersioning.compareProcessVersions(previousGenerated.processModel,
        freshGeneratedState.processModel) : null;
    const manualItemsPreserved = {
      manualSteps: array(reconciledUserState.manualSteps).length,
      notes: array(reconciledUserState.notes).length,
      annotations: array(reconciledUserState.annotations).length,
      sections: array(reconciledUserState.hierarchy?.sections).length,
      subtasks: array(reconciledUserState.hierarchy?.subtasks).length
    };
    const generatedChanges = generatedStepChanges(previousSteps, nextSteps, stepMap);
    const changeSet = deepFreeze({
      ...generatedChanges, mappings: stepMap.mappings,
      ambiguousMappings: stepMap.ambiguous, preservedOverrides, unresolvedOverrides,
      manualItemsPreserved,
      hierarchyChanges: preservedOverrides.filter(item =>
        item.overrideType === "hierarchy-assignment"), processChanges
    });
    const recordingId = nextRevision.recordingId;
    const workspaceContext = reconcileWorkspaceContext(options.workspaceContext, stepMap);
    const result = {
      regenerationId: stableId("regeneration", [REGENERATION_VERSION, recordingId,
        options.previousDerivedRevision?.derivedRevisionId || "", nextRevision.derivedRevisionId]),
      schemaVersion: SCHEMA_VERSION, regenerationVersion: REGENERATION_VERSION,
      recordingId, sourceCanonicalRevision: options.sourceCanonicalRevision ?? null,
      previousDerivedRevision: options.previousDerivedRevision?.derivedRevisionId || null,
      newDerivedRevision: nextRevision.derivedRevisionId,
      startedAt: options.startedAt || null, completedAt: options.completedAt || null,
      status: options.dryRun ? "preview" : "ready", generatedChanges: {
        added: changeSet.addedGeneratedSteps.length,
        removed: changeSet.removedGeneratedSteps.length,
        changed: changeSet.changedGeneratedSteps.length },
      preservedOverrides, unresolvedOverrides, warnings: unresolvedOverrides.map(item => ({
        code: "unresolved-consultant-state", unresolvedOverrideId: item.unresolvedOverrideId
      })), diagnostics, futureFields: clone(object(options.futureFields))
    };
    const preview = { result, derivedRevision: nextRevision, freshGeneratedState,
      reconciledUserState, resolvedRegeneratedProject: {
        generatedState: freshGeneratedState, userState: reconciledUserState,
        derivedRevision: nextRevision, workspaceContext }, changeSet,
      previousDerivedRevision: clone(options.previousDerivedRevision || null),
      canonicalFingerprintBefore: stableId("canonical-fingerprint", [canonicalBefore]) };
    const canonicalEventIds = unique(array(options.canonicalRecording?.events).map(event =>
      event.eventId || event.id || event.eventNo));
    const validation = validate(preview, { processVersions: options.processVersions || [],
      historicalVersionsBefore: historicalBefore, canonicalEventIds });
    result.diagnostics = [...diagnostics, ...validation.diagnostics];
    if (!validation.valid) result.status = "invalid";
    return deepFreeze({ ...preview, result: deepFreeze(result), validation });
  }

  function apply(preview, adapter) {
    if (!preview?.validation?.valid) return deepFreeze({ applied: false,
      status: "validation-failed", activeDerivedRevisionId:
        preview?.previousDerivedRevision?.derivedRevisionId || null,
      diagnostics: preview?.validation?.diagnostics || [] });
    if (!adapter || typeof adapter.commit !== "function") {
      throw new TypeError("Atomic regeneration apply requires a commit adapter.");
    }
    try {
      const receipt = adapter.commit(deepFreeze({
        expectedActiveRevisionId: preview.previousDerivedRevision?.derivedRevisionId || null,
        nextDerivedRevision: preview.derivedRevision,
        resolvedProject: preview.resolvedRegeneratedProject,
        unresolvedOverrides: preview.result.unresolvedOverrides
      }));
      return deepFreeze({ applied: true, status: "applied",
        activeDerivedRevisionId: preview.derivedRevision.derivedRevisionId,
        previousDerivedRevisionId: preview.previousDerivedRevision?.derivedRevisionId || null,
        receipt: clone(receipt || null) });
    } catch (error) {
      return deepFreeze({ applied: false, status: "apply-failed",
        activeDerivedRevisionId: preview.previousDerivedRevision?.derivedRevisionId || null,
        previousDerivedRevisionId: preview.previousDerivedRevision?.derivedRevisionId || null,
        diagnostics: [{ code: "atomic-commit-failed", severity: "error",
          message: String(error?.message || "Regeneration commit failed.") }] });
    }
  }

  function regenerationAvailable(currentRevision, availableVersions) {
    const current = object(currentRevision?.pipelineVersions);
    const available = pipelineVersions(availableVersions);
    const changedComponents = PIPELINE_COMPONENTS.filter(key =>
      String(current[key] || "unknown") !== available[key]);
    return deepFreeze({ available: changedComponents.length > 0, changedComponents,
      current: pipelineVersions(current), availableVersions: available });
  }

  function libraryMetadata(preview, appliedAt) {
    return deepFreeze({ derivedRevisionId: preview?.derivedRevision?.derivedRevisionId || "",
      derivedRevisionDate: appliedAt || preview?.result?.completedAt || "",
      regenerationVersion: REGENERATION_VERSION,
      pipelineVersions: clone(preview?.derivedRevision?.pipelineVersions || {}),
      processChanged: Boolean(preview?.changeSet?.processChanges?.summary?.changed),
      unresolvedOverrideCount: preview?.result?.unresolvedOverrides?.length || 0 });
  }

  return { PIPELINE_COMPONENTS, REGENERATION_VERSION, SCHEMA_VERSION,
    apply, deepFreeze, libraryMetadata, mapSteps, pipelineVersions, prepare,
    reconcileWorkspaceContext, regenerationAvailable, revision, stableId,
    stableStringify, validate };
});
