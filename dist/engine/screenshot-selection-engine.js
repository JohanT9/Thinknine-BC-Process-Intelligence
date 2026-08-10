(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotSelectionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const SELECTION_VERSION = "1.0.0";
  const cache = new WeakMap();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
  function text(value) { return value == null ? "" : String(value).trim(); }
  function candidateId(value) { return text(value.screenshotAssetId || value.screenshotRef); }
  function normalizeCandidate(value = {}) {
    const input = clone(value);
    return freeze({ ...input, screenshotAssetId: candidateId(input),
      screenshotRef: text(input.screenshotRef || input.screenshotAssetId),
      sourceEventId: text(input.sourceEventId), normalizedEventId: text(input.normalizedEventId),
      normalizedKind: text(input.normalizedKind || input.kind),
      page: { ...(input.page || input.uiState || {}) },
      control: { ...(input.control || input.target || {}) },
      uiState: { ...(input.uiState || {}) }, stability: { ...(input.stability || {}) },
      annotationRefs: Array.isArray(input.annotationRefs) ? clone(input.annotationRefs) : [] });
  }
  function normalizeCandidates(values = []) {
    const seen = new Set(); const output = [];
    for (const value of Array.isArray(values) ? values : []) {
      const candidate = normalizeCandidate(value); const id = candidateId(candidate);
      if (!id || seen.has(id)) continue;
      seen.add(id); output.push(candidate);
    }
    return freeze(output);
  }
  function profilePreference(profile = {}) {
    const id = text(profile.profileId); const tone = text(profile.language?.tone);
    if (id === "quick-reference" || tone === "concise") return "focused";
    if (id === "sop" || tone === "precise") return "precise";
    if (id === "training-guide" || tone === "explanatory") return "overview";
    if (id === "troubleshooting-guide" || tone === "diagnostic") return "diagnostic";
    return "overview";
  }
  function add(state, condition, points, reason, rejected) {
    if (condition === true) { state.score += points; state.reasons.push(reason); state.informative = true; }
    else if (condition === false && rejected) { state.score -= Math.abs(points); state.rejected.push(rejected); state.informative = true; }
  }
  function evaluate(candidate, stepGroup, profile, context = {}) {
    const state = { score: 0, reasons: [], rejected: [], informative: false };
    const primary = stepGroup?.primaryNormalizedEvent || {};
    const sourceIds = new Set(stepGroup?.sourceEventIds || []);
    add(state, candidate.sourceEventId && candidate.sourceEventId === stepGroup?.primarySourceEventId,
      70, "primary-event", "supporting-event");
    add(state, candidate.sourceEventId && sourceIds.has(candidate.sourceEventId),
      15, "step-group-source", "outside-step-group");
    const groupControl = stepGroup?.controlContext?.identity?.value || stepGroup?.controlContext?.caption;
    const candidateControl = candidate.control.identity?.value || candidate.control.automationId || candidate.control.caption || candidate.control.label;
    if (groupControl && candidateControl) add(state, groupControl === candidateControl,
      30, "same-control", "mismatched-control");
    const groupPage = stepGroup?.pageContext?.id || stepGroup?.pageContext?.caption;
    const candidatePage = candidate.page.id || candidate.page.pageId || candidate.page.caption || candidate.page.pageCaption;
    if (groupPage && candidatePage) add(state, groupPage === candidatePage,
      15, "same-page", "stale-page-context");
    add(state, candidate.control.visible, 12, "target-visible", "target-not-visible");
    add(state, candidate.control.obscured === undefined ? undefined : !candidate.control.obscured,
      10, "target-unobstructed", "target-obscured");
    add(state, candidate.stability.stable, 12, "stable-ui-state", "unstable-ui-state");
    add(state, candidate.uiState.dialogComplete, 12,
      "complete-dialog", "incomplete-dialog");
    const width = Number(candidate.dimensions?.width);
    const height = Number(candidate.dimensions?.height);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      add(state, width >= 1024 && height >= 576, 6,
        "sufficient-resolution", "low-resolution");
    }
    for (const [property, reason] of [["loading", "loading-state"],
      ["spinner", "spinner-visible"], ["tooltipVisible", "tooltip-visible"],
      ["transientNotification", "transient-notification"],
      ["hoverState", "temporary-hover"]]) {
      if (candidate.uiState[property] === true) { state.score -= property === "loading" || property === "spinner" ? 40 : 12; state.rejected.push(reason); state.informative = true; }
    }
    const kind = stepGroup?.groupKind;
    if (kind === "field-edit" && candidate.normalizedKind === "value-change") add(state, true, 35, "committed-value", null);
    if (kind === "toggle-interaction" && candidate.normalizedKind === "toggle-change") add(state, true, 45, "confirmed-toggle-state", null);
    if (kind === "action" && candidate.normalizedKind === "activation") add(state, true, 40, "action-invocation", null);
    if (candidate.interactionType === "dialog") add(state, true,
      profilePreference(profile) === "focused" ? 2 : 8,
      "dialog-state", null);
    if (kind === "lookup-interaction") {
      const lookupPoints = { "row-selection": 55, "value-change": 45,
        "selection-change": 40, "lookup-open": 20 }[candidate.normalizedKind] || 0;
      if (lookupPoints) add(state, true, lookupPoints,
        candidate.normalizedKind === "row-selection" ? "selected-row" :
          candidate.normalizedKind === "value-change" ? "resulting-field-value" :
            candidate.normalizedKind === "lookup-open" ? "lookup-open-state" : "selected-value", null);
    }
    const preference = profilePreference(profile);
    if (candidate.uiState.context === preference) add(state, true, 8,
      `profile-${preference}-context`, null);
    if (context.previousPageId &&
        (candidate.page.id || candidate.page.pageId) === context.previousPageId) {
      add(state, true, 3, "visual-continuity", null);
    }
    return freeze({ candidate, ...state });
  }
  function fingerprint(stepGroup, candidates, manual, profile, previousPageId) {
    const parts = [SELECTION_VERSION, stepGroup?.stepGroupId || "legacy",
      profile?.profileId || "business-process", manual || "automatic",
      previousPageId || "no-previous-page",
      ...candidates.map(candidate => JSON.stringify([
        candidateId(candidate), candidate.sourceEventId,
        candidate.normalizedEventId, candidate.normalizedKind,
        candidate.annotationRefs.map(item => item.annotationId || item.id || ""),
        candidate.stability.stable, candidate.uiState.context,
        candidate.uiState.loading, candidate.uiState.spinner
      ]))];
    return parts.map(value => `${String(value).length}:${value}`).join("|");
  }
  function nearDuplicate(left, right) {
    if (!left.sourceEventId || left.sourceEventId !== right.sourceEventId) return false;
    const signature = candidate => JSON.stringify([
      candidate.control.identity?.value || candidate.control.automationId ||
        candidate.control.caption || candidate.control.label || "",
      candidate.dimensions?.width || null, candidate.dimensions?.height || null,
      candidate.page.id || candidate.page.pageId || "",
      candidate.uiState.signature || ""
    ]);
    const value = signature(left);
    return value !== JSON.stringify(["", null, null, "", ""]) &&
      value === signature(right);
  }
  function select(options = {}) {
    const stepGroup = options.stepGroup || null;
    const inputCandidates = options.candidates;
    const candidates = normalizeCandidates(inputCandidates);
    const allowed = new Set(stepGroup?.screenshotAssetIds || []);
    const sourceIds = new Set(stepGroup?.sourceEventIds || []);
    const scoped = stepGroup ? candidates.filter(candidate =>
      allowed.has(candidate.screenshotAssetId) || sourceIds.has(candidate.sourceEventId)
    ) : candidates;
    const manual = text(options.manualOverride?.screenshotAssetId ||
      options.manualOverride?.screenshotRef || options.manualOverride);
    const existing = text(options.existingSelection);
    const profile = options.profile || {};
    const idFingerprint = fingerprint(stepGroup, scoped, manual, profile,
      options.previousPageId);
    if (stepGroup && Object.isFrozen(stepGroup) && inputCandidates &&
        Object.isFrozen(inputCandidates)) {
      const cached = cache.get(stepGroup)?.get(inputCandidates)?.get(idFingerprint);
      if (cached) return cached;
    }
    const ids = scoped.map(candidateId);
    const annotated = scoped.filter(candidate => candidate.annotationRefs.length);
    let selected = null; let mode = "automatic"; let fallbackUsed = false;
    let reasons = []; let preserveAllAnnotated = false;
    let preserveExistingCandidates = false;
    if (manual && ids.includes(manual)) {
      selected = manual; mode = "manual"; reasons = ["manual-override"];
      if (annotated.some(candidate => candidateId(candidate) !== manual)) {
        preserveAllAnnotated = true; reasons.push("annotation-preservation");
      }
    } else if (manual) {
      mode = "fallback"; fallbackUsed = true;
      reasons = ["manual-override-unavailable"];
      preserveExistingCandidates = true;
    }
    if (!selected && !preserveExistingCandidates && annotated.length === 1) {
      selected = candidateId(annotated[0]); mode = "annotation-safe";
      reasons = ["annotation-preservation"];
    } else if (!selected && !preserveExistingCandidates && annotated.length > 1) {
      preserveAllAnnotated = true; mode = "annotation-safe";
      selected = ids.includes(existing) && annotated.some(candidate =>
        candidateId(candidate) === existing) ? existing : null;
      reasons = ["multiple-annotated-candidates-preserved"];
    }
    const evaluations = scoped.map((candidate, index) => ({
      ...evaluate(candidate, stepGroup, profile, {
        previousPageId: options.previousPageId
      }), index
    }));
    if (!selected && !preserveAllAnnotated && !preserveExistingCandidates &&
        evaluations.length) {
      const informative = evaluations.some(item => item.informative);
      const ranked = [...evaluations].sort((left, right) =>
        right.score - left.score || left.index - right.index);
      if (informative && (ranked.length === 1 || ranked[0].score !== ranked[1].score)) {
        selected = candidateId(ranked[0].candidate);
        reasons = [...reasons, ...ranked[0].reasons];
      } else if (ranked.length > 1 && ranked.every(item =>
        nearDuplicate(ranked[0].candidate, item.candidate))) {
        selected = candidateId(ranked[0].candidate);
        reasons = [...reasons, "near-duplicate-stable-order"];
      } else if (ids.includes(existing)) {
        selected = existing; mode = "fallback"; fallbackUsed = true;
        reasons = [...reasons, "existing-selection-fallback"];
      } else if (stepGroup?.primarySourceEventId) {
        const primary = scoped.find(candidate =>
          candidate.sourceEventId === stepGroup.primarySourceEventId);
        if (primary) { selected = candidateId(primary); mode = "fallback";
          fallbackUsed = true; reasons = [...reasons, "primary-event-fallback"]; }
      } else if (scoped.length === 1) {
        selected = candidateId(scoped[0]); mode = "fallback";
        fallbackUsed = true; reasons = [...reasons, "single-candidate-fallback"];
      }
    }
    if (!selected && !preserveAllAnnotated && !preserveExistingCandidates)
      reasons = [...reasons, "no-valid-candidate"];
    const rejectedCandidates = evaluations.filter(item =>
      candidateId(item.candidate) !== selected).map(item => ({
        screenshotAssetId: candidateId(item.candidate),
        reasons: item.rejected.length ? [...item.rejected] : selected
          ? [`lower-priority-than:${selected}`] : ["not-selected"]
      }));
    const result = freeze({
      selectionId: `screenshot-selection:${idFingerprint}`,
      schemaVersion: SCHEMA_VERSION, selectionVersion: SELECTION_VERSION,
      stepGroupId: stepGroup?.stepGroupId || "", selectedScreenshotAssetId: selected,
      candidateScreenshotAssetIds: ids, sourceEventIds: clone(stepGroup?.sourceEventIds || []),
      primaryEventId: stepGroup?.primaryEventId || "", selectionMode: mode,
      selectionReasons: [...new Set(reasons)], rejectedCandidates,
      manualOverride: manual || null, fallbackUsed, preserveAllAnnotated,
      preserveExistingCandidates
    });
    if (stepGroup && Object.isFrozen(stepGroup) && inputCandidates &&
        Object.isFrozen(inputCandidates)) {
      const byCandidates = cache.get(stepGroup) || new WeakMap();
      const byFingerprint = byCandidates.get(inputCandidates) || new Map();
      byFingerprint.set(idFingerprint, result); byCandidates.set(inputCandidates, byFingerprint);
      cache.set(stepGroup, byCandidates);
    }
    return result;
  }
  function normalizeSelection(value) { if (!value || Number(value.schemaVersion) !== SCHEMA_VERSION) throw new Error("Unsupported Screenshot Selection schema."); return freeze(clone(value)); }
  return { SCHEMA_VERSION, SELECTION_VERSION, evaluate, normalizeCandidate,
    normalizeCandidates, normalizeSelection, select };
});
