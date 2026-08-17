(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const selectionEngine = typeof module === "object" && module.exports
    ? require("../engine/screenshot-selection-engine")
    : root.T9ScreenshotSelectionEngine;
  const api = factory(semantic, selectionEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotIntelligence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (semantic,
  selectionEngine) {
  const CANDIDATE_SCHEMA_VERSION = "1.0.0";
  const cache = new WeakMap();

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value : {};
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function pageKey(value = {}) {
    return value.pageIdentity ||
      (value.pageObjectId ? `bc:page:${value.pageObjectId}` : "") ||
      value.pageId || value.legacyPageId || value.id ||
      value.pageCaption || value.caption || "";
  }

  function normalizeCandidate(value = {}) {
    const input = clone(object(value));
    return semantic.deepFreeze({
      ...input,
      candidateSchemaVersion: text(input.candidateSchemaVersion) ||
        CANDIDATE_SCHEMA_VERSION,
      screenshotRef: text(input.screenshotRef),
      sourceEventId: input.sourceEventId === undefined ||
        input.sourceEventId === null ? "" : String(input.sourceEventId),
      taskId: text(input.taskId),
      capturedAt: text(input.capturedAt),
      dimensions: { ...object(input.dimensions) },
      viewport: { ...object(input.viewport) },
      target: { ...object(input.target) },
      uiState: { ...object(input.uiState) },
      stability: { ...object(input.stability) },
      annotationRefs: Array.isArray(input.annotationRefs)
        ? clone(input.annotationRefs) : []
    });
  }

  function normalizeCandidates(values = []) {
    return semantic.deepFreeze((Array.isArray(values) ? values : [])
      .map(normalizeCandidate).filter(candidate => candidate.screenshotRef));
  }

  function fromEvents(options = {}) {
    const events = Array.isArray(options.events) ? options.events : [];
    const imagePaths = object(options.imagePaths);
    const tasks = Array.isArray(options.tasks) ? options.tasks : [];
    const eventById = new Map(events.map(event => [String(event.eventNo), event]));
    const taskByScreenshot = new Map();
    const taskByEvent = new Map();
    for (const task of tasks) {
      const screenshots = task.screenshots?.length
        ? task.screenshots : task.screenshot ? [task.screenshot] : [];
      for (const ref of screenshots) {
        if (!taskByScreenshot.has(ref)) taskByScreenshot.set(ref, task);
      }
      for (const eventId of task.sourceEventNos || []) {
        const key = String(eventId);
        if (!taskByEvent.has(key)) taskByEvent.set(key, task);
      }
    }
    return normalizeCandidates(Object.entries(imagePaths)
      .filter(([eventId, ref]) => taskByScreenshot.has(ref) ||
        taskByEvent.has(String(eventId)))
      .map(([eventId, ref]) => {
      const event = object(eventById.get(String(eventId)));
      const task = taskByScreenshot.get(ref) || taskByEvent.get(String(eventId));
      return {
        screenshotRef: ref,
        screenshotAssetId:
          event.canonicalScreenshotAssetId ||
          event.normalizedInteraction?.screenshotAssetId || ref,
        sourceEventId: eventId,
        canonicalSourceEventId:
          event.canonicalSourceEventId ||
          event.normalizedInteraction?.sourceEventId || "",
        normalizedEventId:
          event.normalizedInteraction?.normalizedEventId || "",
        normalizedKind: event.normalizedInteraction?.kind || "",
        taskId: task?.taskId || "",
        capturedAt: event.timestamp || "",
        interactionType: event.category || event.type || "",
        target: {
          role: event.role || "",
          controlType: event.controlType || "",
          automationId: event.automationId || "",
          label: event.label || event.fieldName || ""
        },
        uiState: {
          pageId: event.pageId || "",
          pageCaption: event.pageCaption || "",
          ...(event.normalizedInteraction?.pageIdentification || {})
        }
      };
    }));
  }

  function addSignal(state, condition, points, reason, rejectedReason) {
    if (condition === true) {
      state.score += points;
      state.reasons.push(reason);
      state.informative = true;
    } else if (condition === false && rejectedReason) {
      state.score -= Math.abs(points);
      state.rejectedReasons.push(rejectedReason);
      state.informative = true;
    }
  }

  function evaluate(candidate, context = {}) {
    const state = { score: 0, reasons: [], rejectedReasons: [], informative: false };
    const ui = candidate.uiState;
    const target = candidate.target;
    const stability = candidate.stability;
    addSignal(state, target.visible, 30, "target-visible", "target-not-visible");
    addSignal(state, target.obscured === undefined ? undefined : !target.obscured,
      25, "target-unobstructed", "target-obscured");
    addSignal(state, stability.stable, 20, "stable-ui-state", "unstable-ui-state");
    addSignal(state, ui.dialogComplete, 20, "complete-dialog", "incomplete-dialog");
    for (const [property, reason] of [
      ["loading", "loading-state"], ["spinner", "spinner-visible"],
      ["tooltipVisible", "tooltip-visible"],
      ["transientNotification", "transient-notification"],
      ["partialMenu", "partial-menu"], ["hoverState", "temporary-hover"],
      ["pointerObscuresTarget", "pointer-obscures-target"]
    ]) {
      if (ui[property] === true) {
        state.score -= property === "loading" || property === "spinner" ? 40 : 15;
        state.rejectedReasons.push(reason);
        state.informative = true;
      }
    }
    const width = Number(candidate.dimensions.width);
    const height = Number(candidate.dimensions.height);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      state.informative = true;
      if (width >= 1024 && height >= 576) {
        state.score += 10;
        state.reasons.push("sufficient-resolution");
      } else {
        state.score -= 10;
        state.rejectedReasons.push("low-resolution");
      }
    }
    if (candidate.annotationRefs.length) {
      state.score += 35;
      state.reasons.push("useful-annotations");
      state.informative = true;
    }
    const sourceIds = new Set((context.sourceEventIds || []).map(String));
    if (candidate.sourceEventId && sourceIds.size) {
      state.informative = true;
      if (sourceIds.has(candidate.sourceEventId)) {
        state.score += 15;
        state.reasons.push("matching-source-event");
      } else {
        state.score -= 20;
        state.rejectedReasons.push("mismatched-source-event");
      }
    }
    if (candidate.interactionType === "dialog") {
      state.score += context.profileTone === "concise" ? 2 : 8;
      state.reasons.push("dialog-state");
      state.informative = true;
    }
    const profilePreference = {
      concise: "focused", explanatory: "overview", professional: "overview",
      precise: "precise", diagnostic: "diagnostic"
    }[context.profileTone];
    if (profilePreference && ui.context === profilePreference) {
      state.score += 8;
      state.reasons.push(`profile-${profilePreference}-context`);
      state.informative = true;
    }
    if (context.previousPageId && pageKey(candidate.uiState) === context.previousPageId) {
      state.score += 3;
      state.reasons.push("visual-continuity");
      state.informative = true;
    }
    return semantic.deepFreeze({ candidate, ...state });
  }

  function imagesInStep(step) {
    return (step.blocks || []).filter(block => block.kind === "image");
  }

  function manualReference(step) {
    return step.screenshotSelection?.mode === "manual"
      ? text(step.screenshotSelection.screenshotRef) : "";
  }

  function nearDuplicate(left, right) {
    if (!left.sourceEventId || left.sourceEventId !== right.sourceEventId) {
      return false;
    }
    const signature = candidate => JSON.stringify([
      candidate.target.automationId || candidate.target.label || "",
      candidate.dimensions.width || null, candidate.dimensions.height || null,
      pageKey(candidate.uiState), candidate.uiState.signature || ""
    ]);
    const value = signature(left);
    return value !== JSON.stringify(["", null, null, "", ""]) &&
      value === signature(right);
  }

  function selectStep(step, candidateByRef, context) {
    const images = imagesInStep(step);
    const refs = images.map(image => image.sourceRef?.screenshotRef).filter(Boolean);
    const uniqueRefs = [...new Set(refs)];
    const exactDuplicate = refs.length > uniqueRefs.length;
    const manual = manualReference(step);
    const explanation = {
      taskId: step.sourceRef?.taskId || "",
      previousScreenshotRef: refs[0] || null,
      selectedScreenshotRef: null,
      manualSelectionPreserved: false,
      candidates: [], reasons: [], rejectedReasons: {}
    };
    explanation.candidates = uniqueRefs.map(ref => {
      const image = images.find(item => item.sourceRef?.screenshotRef === ref);
      return { screenshotRef: ref, score: null, reasons: [], rejectedReasons: [],
        metadata: normalizeCandidate({ ...(candidateByRef.get(ref) || {}),
          screenshotRef: ref,
          annotationRefs: image?.annotationRefs || [] }) };
    });
    if (refs.length <= 1) {
      explanation.selectedScreenshotRef = refs[0] || null;
      explanation.reasons = refs.length ? ["single-candidate"] : [];
      return { step: clone(step), explanation, changed: false };
    }
    const annotated = images.filter(image => image.annotationRefs?.length);
    const annotatedRefs = [...new Set(annotated.map(image =>
      image.sourceRef?.screenshotRef).filter(Boolean))];
    if (manual && uniqueRefs.includes(manual)) {
      explanation.selectedScreenshotRef = manual;
      explanation.manualSelectionPreserved = true;
      explanation.reasons = ["manual-selection"];
      if (annotatedRefs.some(ref => ref !== manual)) {
        explanation.reasons.push("annotation-preservation-fallback");
        return { step: clone(step), explanation, changed: false };
      }
      return { step: keepImage(step, manual), explanation,
        changed: refs.some(ref => ref !== manual) };
    }
    if (manual) {
      explanation.reasons = ["manual-selection-unavailable-fallback"];
      return { step: clone(step), explanation, changed: false };
    }
    if (uniqueRefs.length === 1) {
      explanation.selectedScreenshotRef = uniqueRefs[0];
      explanation.reasons = ["exact-duplicate"];
      return { step: keepImage(step, uniqueRefs[0]), explanation,
        changed: refs.length > 1 };
    }
    if (annotatedRefs.length > 1) {
      explanation.reasons = ["annotation-preservation-fallback"];
      return { step: clone(step), explanation, changed: false };
    }
    if (!annotatedRefs.length && uniqueRefs.some(ref => !candidateByRef.has(ref))) {
      explanation.reasons = ["incomplete-metadata-fallback"];
      return { step: clone(step), explanation, changed: false };
    }
    const evaluations = uniqueRefs.map((ref, index) => {
      const metadata = candidateByRef.get(ref);
      const image = images.find(item => item.sourceRef?.screenshotRef === ref);
      const candidate = normalizeCandidate({ ...(metadata || {}),
        screenshotRef: ref,
        taskId: step.sourceRef?.taskId || metadata?.taskId || "",
        annotationRefs: image?.annotationRefs || metadata?.annotationRefs || [] });
      return { ...evaluate(candidate, context), index };
    });
    explanation.candidates = evaluations.map(item => ({
      screenshotRef: item.candidate.screenshotRef,
      score: item.score,
      reasons: [...item.reasons],
      rejectedReasons: [...item.rejectedReasons],
      metadata: item.candidate
    }));
    const informative = evaluations.some(item => item.informative);
    if (!informative) {
      explanation.reasons = ["insufficient-metadata-fallback"];
      return { step: clone(step), explanation, changed: false };
    }
    const ranked = [...evaluations].sort((left, right) =>
      right.score - left.score || left.index - right.index);
    if (!annotatedRefs.length && ranked[0].score === ranked[1].score) {
      if (ranked.every(item => nearDuplicate(ranked[0].candidate,
        item.candidate))) {
        const selected = ranked[0];
        explanation.selectedScreenshotRef = selected.candidate.screenshotRef;
        explanation.reasons = ["near-duplicate-stable-order"];
        for (const item of ranked.slice(1)) {
          explanation.rejectedReasons[item.candidate.screenshotRef] =
            ["near-duplicate"];
        }
        return { step: keepImage(step, selected.candidate.screenshotRef),
          explanation, changed: true };
      }
      explanation.reasons = ["equivalent-candidates-fallback"];
      return { step: clone(step), explanation, changed: false };
    }
    const selected = annotatedRefs[0]
      ? evaluations.find(item => item.candidate.screenshotRef === annotatedRefs[0])
      : ranked[0];
    explanation.selectedScreenshotRef = selected.candidate.screenshotRef;
    explanation.reasons = [...selected.reasons];
    for (const item of evaluations) {
      if (item === selected) continue;
      explanation.rejectedReasons[item.candidate.screenshotRef] =
        item.rejectedReasons.length ? [...item.rejectedReasons] :
          [`lower-priority-than:${selected.candidate.screenshotRef}`];
    }
    return { step: keepImage(step, selected.candidate.screenshotRef), explanation,
      changed: refs.some(ref => ref !== selected.candidate.screenshotRef) };
  }

  function keepImage(step, screenshotRef) {
    let kept = false;
    return { ...clone(step), blocks: (step.blocks || []).filter(block => {
      if (block.kind !== "image") return true;
      if (!kept && block.sourceRef?.screenshotRef === screenshotRef) {
        kept = true;
        return true;
      }
      return false;
    }) };
  }

  function selectStepWithEngine(step, candidateByRef, context) {
    const images = imagesInStep(step);
    const refs = images.map(image => image.sourceRef?.screenshotRef).filter(Boolean);
    const uniqueRefs = [...new Set(refs)];
    const exactDuplicate = refs.length > uniqueRefs.length;
    const stepGroup = step.interaction?.stepGroups?.[0] || null;
    const candidates = uniqueRefs.map(ref => {
      const image = images.find(item => item.sourceRef?.screenshotRef === ref);
      const metadata = candidateByRef.get(ref) || {};
      return selectionEngine.normalizeCandidate({ ...metadata,
        screenshotAssetId: metadata.screenshotAssetId || ref,
        screenshotRef: ref,
        sourceEventId: metadata.canonicalSourceEventId || metadata.sourceEventId,
        annotationRefs: image?.annotationRefs || metadata.annotationRefs || []
      });
    });
    const manualRef = manualReference(step);
    const manualCandidate = candidates.find(candidate =>
      candidate.screenshotRef === manualRef || candidate.screenshotAssetId === manualRef);
    const existingCandidate = candidates.find(candidate =>
      candidate.screenshotRef === refs[0]);
    const incomplete = uniqueRefs.some(ref => !candidateByRef.has(ref));
    const result = selectionEngine.select({ stepGroup,
      candidates: semantic.deepFreeze(candidates),
      manualOverride: manualCandidate?.screenshotAssetId || manualRef,
      existingSelection: existingCandidate?.screenshotAssetId,
      profile: context.profile || {},
      previousPageId: context.previousPageId });
    const selectedCandidate = candidates.find(candidate =>
      candidate.screenshotAssetId === result.selectedScreenshotAssetId);
    const selectedRef = selectedCandidate?.screenshotRef || null;
    const equivalentFallback = uniqueRefs.length > 1 &&
      result.selectionReasons.includes("existing-selection-fallback");
    let reasons = [...result.selectionReasons];
    if (refs.length === 1) reasons = ["single-candidate"];
    else if (exactDuplicate) reasons = ["exact-duplicate"];
    else if (manualRef && result.selectionMode === "manual") reasons =
      ["manual-selection", ...(result.preserveAllAnnotated
        ? ["annotation-preservation-fallback"] : [])];
    else if (manualRef && !manualCandidate) reasons =
      ["manual-selection-unavailable-fallback"];
    else if (result.preserveAllAnnotated) reasons =
      ["annotation-preservation-fallback"];
    else if (incomplete && !manualRef) reasons = ["incomplete-metadata-fallback"];
    else if (result.selectionReasons.includes("near-duplicate-stable-order"))
      reasons = ["near-duplicate-stable-order"];
    else if ((!selectedRef || equivalentFallback) && uniqueRefs.length > 1) reasons =
      ["equivalent-candidates-fallback"];
    const keepAll = result.preserveAllAnnotated ||
      (manualRef && !manualCandidate) ||
      (incomplete && !manualRef && !exactDuplicate) ||
      (equivalentFallback &&
        !result.selectionReasons.includes("near-duplicate-stable-order")) ||
      (!selectedRef && uniqueRefs.length > 1);
    const explanation = {
      selectionId: result.selectionId,
      selectionVersion: result.selectionVersion,
      taskId: step.sourceRef?.taskId || "",
      stepGroupId: result.stepGroupId,
      previousScreenshotRef: refs[0] || null,
      selectedScreenshotRef: selectedRef,
      selectedScreenshotAssetId: result.selectedScreenshotAssetId,
      manualSelectionPreserved: result.selectionMode === "manual",
      selectionMode: result.selectionMode,
      selectionResult: result,
      candidateScreenshotAssetIds: result.candidateScreenshotAssetIds,
      sourceEventIds: result.sourceEventIds,
      candidates: candidates.map(candidate => ({ screenshotRef: candidate.screenshotRef,
        score: null, reasons: [], rejectedReasons: [], metadata: candidate })),
      reasons,
      rejectedReasons: Object.fromEntries(result.rejectedCandidates.map(item => {
        const candidate = candidates.find(value =>
          value.screenshotAssetId === item.screenshotAssetId);
        return [candidate?.screenshotRef || item.screenshotAssetId, item.reasons];
      }))
    };
    return { step: keepAll || !selectedRef ? clone(step) : keepImage(step, selectedRef),
      explanation, changed: !keepAll && refs.some(ref => ref !== selectedRef) };
  }

  function profileTone(profile) {
    return profile?.language?.tone || "professional";
  }

  function select(document, options = {}) {
    const candidateInput = options.candidates;
    const candidates = normalizeCandidates(candidateInput);
    const profile = options.profile || {};
    const cacheable = Object.isFrozen(document) && candidateInput &&
      typeof candidateInput === "object" && Object.isFrozen(candidateInput);
    const key = `${profile.profileId || "business-process"}:${profileTone(profile)}`;
    const cached = cacheable ? cache.get(document)?.get(candidateInput)?.get(key) : null;
    if (cached) return cached;
    const normalized = semantic.normalize(document);
    const candidateByRef = new Map(candidates.map(candidate =>
      [candidate.screenshotRef, candidate]));
    const selections = [];
    let previousPageId = "";
    const sections = normalized.sections.map(section => ({ ...clone(section),
      blocks: section.blocks.map(block => {
        if (block.kind !== "step") return clone(block);
        const sourceEventIds = Array.isArray(block.sourceRef?.sourceEventIds)
          ? block.sourceRef.sourceEventIds : [];
        const result = selectStepWithEngine(block, candidateByRef, {
          sourceEventIds, previousPageId, profileTone: profileTone(profile),
          profile
        });
        selections.push(result.explanation);
        const selectedCandidate = candidateByRef.get(
          result.explanation.selectedScreenshotRef
        );
        previousPageId = pageKey(selectedCandidate?.uiState) || previousPageId;
        return result.step;
      })
    }));
    const result = semantic.deepFreeze({
      document: semantic.normalize({ ...clone(normalized), sections }),
      selections
    });
    if (cacheable) {
      const byCandidates = cache.get(document) || new WeakMap();
      const byProfile = byCandidates.get(candidateInput) || new Map();
      byProfile.set(key, result);
      byCandidates.set(candidateInput, byProfile);
      cache.set(document, byCandidates);
    }
    return result;
  }

  return {
    CANDIDATE_SCHEMA_VERSION,
    evaluate,
    fromEvents,
    normalizeCandidate,
    normalizeCandidates,
    select
  };
});
