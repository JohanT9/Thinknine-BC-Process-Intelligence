(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotSelectionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const SELECTION_VERSION = "1.4.0";
  const CAPTURE_ROLE_VERSION = "1.0.0";
  const ROLE_INTENT_VERSION = "1.0.0";
  const QUALITY_VERSION = "1.0.0";
  const CAPTURE_ROLES = Object.freeze(["menu-open", "selection-visible",
    "result-visible", "dialog-before-close", "dialog-closed", "action-visible",
    "focus-only", "before-value", "context"]);
  const cache = new WeakMap();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
  function text(value) { return value == null ? "" : String(value).trim(); }
  function pageKey(value = {}) { return value.pageIdentity ||
    (value.pageObjectId ? `bc:page:${value.pageObjectId}` : "") ||
    value.id || value.pageId || value.legacyPageId ||
    value.caption || value.pageCaption || ""; }
  function candidateId(value) { return text(value.screenshotAssetId || value.screenshotRef); }
  function classifyCaptureRole(value = {}) {
    const explicit = text(value.captureRole);
    if (CAPTURE_ROLES.includes(explicit)) return explicit;
    const kind = text(value.normalizedKind || value.kind);
    const ui = value.uiState || {};
    if (ui.dialogClosed === true || kind === "dialog-close") return "dialog-closed";
    if (ui.dialogComplete === true && ["dialog-action", "activation"].includes(kind)) {
      return "dialog-before-close";
    }
    if (ui.beforeValue === true || value.capturePhase === "before-value") {
      return "before-value";
    }
    if (ui.focusOnly === true || kind === "focus-transition") return "focus-only";
    if (["row-selection", "selection-change"].includes(kind) ||
        ui.selectedOptionVisible === true) return "selection-visible";
    if (ui.menuOpen === true || ui.lookupOpen === true || kind === "lookup-open") {
      return "menu-open";
    }
    if (["value-change", "toggle-change", "navigation"].includes(kind) ||
        ui.resultVisible === true) return "result-visible";
    if (["activation", "dialog-action"].includes(kind)) return "action-visible";
    return "context";
  }
  function normalizeCandidate(value = {}) {
    const input = clone(value);
    const captureRole = classifyCaptureRole(input);
    return freeze({ ...input, screenshotAssetId: candidateId(input),
      screenshotRef: text(input.screenshotRef || input.screenshotAssetId),
      sourceEventId: text(input.sourceEventId), normalizedEventId: text(input.normalizedEventId),
      normalizedKind: text(input.normalizedKind || input.kind),
      page: { ...(input.page || input.uiState || {}) },
      control: { ...(input.control || input.target || {}) },
      uiState: { ...(input.uiState || {}) }, stability: { ...(input.stability || {}) },
      captureRole, captureRoleVersion: CAPTURE_ROLE_VERSION,
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
  function applyCapturePacketEvidence(candidates, stepGroup) {
    const packet = stepGroup?.capturePacket;
    const evidence = Array.isArray(packet?.screenshotEvidence)
      ? packet.screenshotEvidence : [];
    if (!evidence.length && !packet?.preferredScreenshotAssetId) {
      return candidates;
    }
    const byAsset = new Map(evidence.map(item => [text(item?.assetId), item]));
    return freeze(candidates.map(candidate => {
      const item = byAsset.get(candidateId(candidate));
      const preferred = candidateId(candidate) ===
        text(packet?.preferredScreenshotAssetId);
      if (!item && !preferred) return candidate;
      return freeze({ ...candidate,
        packetEvidenceRole: text(item?.role) || null,
        packetEvidencePreferred: preferred,
        packetEvidenceVersion: text(packet?.packetVersion) || null
      });
    }));
  }
  function profilePreference(profile = {}) {
    const id = text(profile.profileId); const tone = text(profile.language?.tone);
    if (id === "quick-reference" || tone === "concise") return "focused";
    if (id === "sop" || tone === "precise") return "precise";
    if (id === "training-guide" || tone === "explanatory") return "overview";
    if (id === "troubleshooting-guide" || tone === "diagnostic") return "diagnostic";
    return "overview";
  }
  function semanticType(value = {}) {
    return text(value.actionType || value.semanticAction || value.taskType);
  }
  function roleIntent(stepGroup, semanticAction = {}) {
    const actionType = semanticType(semanticAction);
    const result = semanticAction.resultVerification ||
      semanticAction.capturePacket?.resultVerification || {};
    const hasResult = ["verified", "error"].includes(text(result.status));
    let preferredRoles = [];
    if (["SelectCustomer", "SelectItem", "SelectVendor", "SelectRecord",
      "SelectLookupValue"].includes(actionType)) preferredRoles = ["selection-visible"];
    else if (["EnterFieldValue", "ChangeField", "SelectOption", "ToggleField",
      "SearchAndOpenPage"].includes(actionType)) preferredRoles = ["result-visible"];
    else if (["ConfirmDialog", "ChooseDialogAction"].includes(actionType)) {
      preferredRoles = ["dialog-before-close"];
    } else if (actionType === "RunAction") {
      preferredRoles = [hasResult ? "result-visible" : "action-visible"];
    }
    if (!preferredRoles.length) {
      const kind = text(stepGroup?.groupKind);
      if (["field-edit", "toggle-interaction", "navigation"].includes(kind)) {
        preferredRoles = ["result-visible"];
      } else if (kind === "dialog-interaction") {
        preferredRoles = ["dialog-before-close"];
      } else if (kind === "lookup-interaction") {
        preferredRoles = [stepGroup?.primaryNormalizedEvent?.kind === "row-selection"
          ? "selection-visible" : "result-visible"];
      } else if (kind === "action") preferredRoles = ["action-visible"];
    }
    return freeze({ version: ROLE_INTENT_VERSION,
      source: actionType ? "semantic-action" : "step-group",
      actionType: actionType || null, preferredRoles,
      strict: Boolean(actionType && preferredRoles.length),
      rejectedRoles: preferredRoles.includes("dialog-before-close")
        ? ["dialog-closed"] : [] });
  }
  function satisfiesRole(candidate, role) {
    if (candidate.captureRole === role) return true;
    return role === "result-visible" && candidate.packetEvidenceRole === "result";
  }
  function add(state, condition, points, reason, rejected) {
    if (condition === true) { state.score += points; state.reasons.push(reason); state.informative = true; }
    else if (condition === false && rejected) { state.score -= Math.abs(points); state.rejected.push(rejected); state.informative = true; }
  }
  function evaluate(candidate, stepGroup, profile, context = {}) {
    const state = { score: 0, reasons: [], rejected: [], informative: false };
    const primary = stepGroup?.primaryNormalizedEvent || {};
    const role = candidate.captureRole;
    const intent = context.roleIntent || roleIntent(stepGroup);
    const sourceIds = new Set(stepGroup?.sourceEventIds || []);
    if (candidate.packetEvidenceRole === "result") add(state, true, 50,
      "capture-packet-result", null);
    if (candidate.packetEvidenceRole === "interaction") add(state, true, 15,
      "capture-packet-interaction", null);
    if (candidate.packetEvidenceRole === "supporting") {
      state.score -= 20; state.rejected.push("capture-packet-supporting");
      state.informative = true;
    }
    if (candidate.packetEvidencePreferred === true) add(state, true,
      intent.strict && intent.preferredRoles.length &&
        !intent.preferredRoles.some(value => satisfiesRole(candidate, value))
        ? 20 : 140, "capture-packet-preferred", null);
    if (intent.strict && intent.preferredRoles.some(value =>
      satisfiesRole(candidate, value))) {
      add(state, true, 100, `role-intent:${intent.preferredRoles[0]}`, null);
    } else if (intent.strict && intent.preferredRoles.length) {
      state.score -= 100;
      state.rejected.push(`role-intent-mismatch:${intent.preferredRoles[0]}`);
      state.informative = true;
    }
    if (intent.strict && intent.rejectedRoles.includes(role)) {
      state.score -= 150; state.rejected.push(`role-intent-rejected:${role}`);
      state.informative = true;
    }
    add(state, candidate.sourceEventId && candidate.sourceEventId === stepGroup?.primarySourceEventId,
      70, "primary-event", "supporting-event");
    add(state, candidate.sourceEventId && sourceIds.has(candidate.sourceEventId),
      15, "step-group-source", "outside-step-group");
    const groupControl = stepGroup?.controlContext?.identity?.value || stepGroup?.controlContext?.caption;
    const candidateControl = candidate.control.identity?.value || candidate.control.automationId || candidate.control.caption || candidate.control.label;
    if (groupControl && candidateControl) add(state, groupControl === candidateControl,
      30, "same-control", "mismatched-control");
    const groupPage = pageKey(stepGroup?.pageContext);
    const candidatePage = pageKey(candidate.page);
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
    if (role === "focus-only") {
      state.score -= 130; state.rejected.push("focus-only-state");
      state.informative = true;
    }
    if (role === "before-value") {
      state.score -= 150; state.rejected.push("before-value-state");
      state.informative = true;
    }
    const kind = stepGroup?.groupKind;
    if (kind === "field-edit" && role === "result-visible") add(state, true,
      35, "role-result-visible", null);
    if (kind === "toggle-interaction" && role === "result-visible") add(state,
      true, 45, "role-result-visible", null);
    if (kind === "action" && role === "action-visible") add(state, true,
      40, "role-action-visible", null);
    if (kind === "action" && role === "selection-visible") add(state, true,
      55, "role-selection-visible", null);
    if (kind === "navigation" && role === "result-visible") add(state, true,
      50, "role-result-visible", null);
    if (kind === "dialog-interaction") {
      if (role === "dialog-before-close") add(state, true, 95,
        "role-dialog-before-close", null);
      if (role === "dialog-closed") {
        state.score -= 55; state.rejected.push("role-dialog-closed");
        state.informative = true;
      }
    }
    if (candidate.interactionType === "dialog") add(state, true,
      profilePreference(profile) === "focused" ? 2 : 8,
      "dialog-state", null);
    if (kind === "lookup-interaction") {
      if (role === "selection-visible") add(state, true, 55,
        "role-selection-visible", null);
      if (role === "result-visible") add(state, true, 45,
        "role-result-visible", null);
      if (role === "menu-open") add(state, true, 20,
        "role-menu-open", null);
    }
    const preference = profilePreference(profile);
    if (candidate.uiState.context === preference) add(state, true, 8,
      `profile-${preference}-context`, null);
    if (context.previousPageId &&
        pageKey(candidate.page) === context.previousPageId) {
      add(state, true, 3, "visual-continuity", null);
    }
    return freeze({ candidate, ...state });
  }
  function fingerprint(stepGroup, candidates, manual, profile, previousPageId,
    intent) {
    const parts = [SELECTION_VERSION, stepGroup?.stepGroupId || "legacy",
      profile?.profileId || "business-process", manual || "automatic",
      previousPageId || "no-previous-page",
      JSON.stringify(intent),
      ...candidates.map(candidate => JSON.stringify([
        candidateId(candidate), candidate.sourceEventId,
        candidate.normalizedEventId, candidate.normalizedKind,
        candidate.captureRole,
        candidate.packetEvidenceRole, candidate.packetEvidencePreferred,
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
      pageKey(candidate.page),
      candidate.uiState.signature || ""
    ]);
    const value = signature(left);
    return value !== JSON.stringify(["", null, null, "", ""]) &&
      value === signature(right);
  }
  function qualitySummary(evaluations, selected, mode, reasons) {
    const ranked = [...evaluations].sort((left, right) =>
      right.score - left.score || left.index - right.index);
    const selectedEvaluation = evaluations.find(item =>
      candidateId(item.candidate) === selected);
    const runnerUp = ranked.find(item => item !== selectedEvaluation) || null;
    const selectedScore = selectedEvaluation?.score ?? null;
    const runnerUpScore = runnerUp?.score ?? null;
    const scoreMargin = selectedScore === null || runnerUpScore === null
      ? null : selectedScore - runnerUpScore;
    let qualityLevel = "unresolved";
    let reviewRecommended = true;
    let qualityReason = "no-selected-candidate";
    if (selected && mode === "manual") {
      qualityLevel = "manual";
      reviewRecommended = false;
      qualityReason = "consultant-selected";
    } else if (selected && mode === "annotation-safe") {
      qualityLevel = "protected";
      reviewRecommended = false;
      qualityReason = "annotation-preserved";
    } else if (selected && mode === "fallback") {
      qualityLevel = "low";
      qualityReason = "fallback-selection";
    } else if (selected && selectedScore !== null &&
        selectedScore >= 80 && (scoreMargin === null || scoreMargin >= 40)) {
      qualityLevel = "high";
      reviewRecommended = false;
      qualityReason = "clear-evidence-margin";
    } else if (selected && selectedScore !== null && selectedScore >= 20 &&
        (scoreMargin === null || scoreMargin >= 10)) {
      qualityLevel = "medium";
      reviewRecommended = false;
      qualityReason = "sufficient-evidence-margin";
    } else if (selected) {
      qualityLevel = "low";
      qualityReason = "weak-or-close-evidence";
    }
    if (reasons.includes("near-duplicate-stable-order") && selected) {
      qualityLevel = "medium";
      reviewRecommended = false;
      qualityReason = "equivalent-visual-evidence";
    }
    return freeze({ qualityVersion: QUALITY_VERSION, qualityLevel,
      reviewRecommended, qualityReason, selectedScore, runnerUpScore,
      scoreMargin });
  }
  function select(options = {}) {
    const stepGroup = options.stepGroup || null;
    const inputCandidates = options.candidates;
    const candidates = applyCapturePacketEvidence(
      normalizeCandidates(inputCandidates), stepGroup
    );
    const allowed = new Set(stepGroup?.screenshotAssetIds || []);
    const sourceIds = new Set(stepGroup?.sourceEventIds || []);
    const scoped = stepGroup ? candidates.filter(candidate =>
      allowed.has(candidate.screenshotAssetId) || sourceIds.has(candidate.sourceEventId)
    ) : candidates;
    const manual = text(options.manualOverride?.screenshotAssetId ||
      options.manualOverride?.screenshotRef || options.manualOverride);
    const existing = text(options.existingSelection);
    const profile = options.profile || {};
    const intent = roleIntent(stepGroup, options.semanticAction || {});
    const idFingerprint = fingerprint(stepGroup, scoped, manual, profile,
      options.previousPageId, intent);
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
        previousPageId: options.previousPageId, roleIntent: intent
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
    const quality = qualitySummary(evaluations, selected, mode, reasons);
    const candidateEvaluations = evaluations.map(item => ({
      screenshotAssetId: candidateId(item.candidate),
      selected: candidateId(item.candidate) === selected,
      score: item.score,
      reasons: [...item.reasons],
      rejectedReasons: [...item.rejected]
    }));
    const result = freeze({
      selectionId: `screenshot-selection:${idFingerprint}`,
      schemaVersion: SCHEMA_VERSION, selectionVersion: SELECTION_VERSION,
      captureRoleVersion: CAPTURE_ROLE_VERSION,
      roleIntentVersion: ROLE_INTENT_VERSION, roleIntent: clone(intent),
      stepGroupId: stepGroup?.stepGroupId || "", selectedScreenshotAssetId: selected,
      candidateScreenshotAssetIds: ids, sourceEventIds: clone(stepGroup?.sourceEventIds || []),
      primaryEventId: stepGroup?.primaryEventId || "", selectionMode: mode,
      selectedCaptureRole: selected ? scoped.find(candidate =>
        candidateId(candidate) === selected)?.captureRole || null : null,
      selectedPacketEvidenceRole: selected ? scoped.find(candidate =>
        candidateId(candidate) === selected)?.packetEvidenceRole || null : null,
      selectionReasons: [...new Set(reasons)], rejectedCandidates,
      candidateEvaluations, ...quality,
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
  return { SCHEMA_VERSION, SELECTION_VERSION, CAPTURE_ROLE_VERSION,
    ROLE_INTENT_VERSION, QUALITY_VERSION,
    CAPTURE_ROLES, classifyCaptureRole, evaluate, normalizeCandidate,
    normalizeCandidates, applyCapturePacketEvidence, roleIntent,
    normalizeSelection, select };
});
