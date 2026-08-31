(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9EventStepGrouping = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const GROUPING_VERSION = "1.6.0";
  const CAPTURE_PACKET_VERSION = "1.4.0";
  const RESULT_VERIFICATION_VERSION = "1.1.0";
  const cache = new WeakMap();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
  function identity(control = {}) { return control.identity?.value || control.controlId || control.fieldId || ""; }
  function controlKey(event) { return identity(event.controlIdentification) || event.controlIdentification?.caption || event.normalizedEventId; }
  function pageKey(event) { const page = event.pageIdentification || {}; return page.pageIdentity ||
    (page.pageObjectId ? `bc:page:${page.pageObjectId}` : "") ||
    page.id || page.pageId || page.legacyPageId || page.name ||
    page.pageCaption || page.caption || ""; }
  function selectedValue(event) { return event.selection?.value ?? event.selection?.key ?? event.selection?.caption ?? event.value?.normalized; }
  function actionKey(event) { const action = event?.actionIdentification || {};
    return action.actionIdentity || action.identity?.value || action.actionId ||
      action.caption || controlKey(event); }
  function elapsed(first, second) { const start = Date.parse(first?.timestamp || "");
    const end = Date.parse(second?.timestamp || "");
    return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0; }
  function isLookupOrigin(event) { return event?.kind === "activation" &&
    event.controlIdentification?.controlType === "lookup"; }
  function isRowSelection(event) { return event?.kind === "selection-change" &&
    ["listRow", "repeaterCell"].includes(
      event.controlIdentification?.controlType || event.controlIdentification?.type
    ); }
  function unique(values) { return [...new Set(values.filter(Boolean))]; }
  function interactionIds(events) { return unique(events.flatMap(event =>
    event.interactionIds || [event.interactionId])); }
  function sameRecordedInteraction(events, event) {
    const pendingIds = interactionIds(events);
    const nextIds = interactionIds([event]);
    return pendingIds.length === 1 && nextIds.length === 1 &&
      pendingIds[0] === nextIds[0];
  }
  function conflictingRecordedInteraction(events, event) {
    const pendingIds = interactionIds(events);
    const nextIds = interactionIds([event]);
    return pendingIds.length > 0 && nextIds.length > 0 &&
      !nextIds.some(id => pendingIds.includes(id));
  }
  function groupId(sourceIds) { return `step-group:${GROUPING_VERSION}:${sourceIds.map(id => `${id.length}:${id}`).join("|")}`; }
  function groupKind(events) {
    const kinds = new Set(events.map(event => event.kind));
    if (events.some(isLookupOrigin)) return "lookup-interaction";
    if (kinds.has("toggle-change")) return "toggle-interaction";
    if (kinds.has("selection-change")) return "selection";
    if (kinds.has("value-change")) return "field-edit";
    if (kinds.has("dialog-action")) return "dialog-interaction";
    if (events.some(isRowSelection)) return "row-interaction";
    if (kinds.has("activation")) return "action";
    if (kinds.has("navigation")) return "navigation";
    return "unknown";
  }
  function outcomeEvents(events) { return events.filter(event =>
    ["dialog-open", "dialog-close", "navigation", "value-change",
      "selection-change", "toggle-change", "status-message",
      "error-outcome"].includes(event.kind)); }
  function interactionEvents(events) { return events.filter(event =>
    ["activation", "key-command", "dialog-action"].includes(event.kind)); }
  function evidenceRole(event, interaction, outcomes) {
    if (outcomes.includes(event)) return "result";
    if (event === interaction) return "interaction";
    return "supporting";
  }
  function primaryEvent(events) {
    if (events.some(event => event.kind === "activation") &&
        !events.some(isLookupOrigin) && outcomeEvents(events).length) {
      return events.find(event => event.kind === "activation");
    }
    return [...events].reverse().find(event => ["value-change", "toggle-change",
      "selection-change", "activation", "dialog-open", "dialog-close",
      "navigation", "error-outcome"].includes(event.kind)) || events.at(-1);
  }
  function observedCaption(event, type) {
    if (type === "page") return event.pageIdentification?.pageCaption ||
      event.pageIdentification?.caption || event.pageIdentification?.name || "";
    return event.controlIdentification?.caption ||
      event.actionIdentification?.caption || "";
  }
  function outcomeDescription(event) {
    const pageCaption = observedCaption(event, "page");
    const controlCaption = observedCaption(event, "control");
    switch (event.kind) {
      case "navigation": return pageCaption
        ? `Sidan ${pageCaption} \u00f6ppnades.` : "En ny sida \u00f6ppnades.";
      case "dialog-open": return pageCaption
        ? `Dialogrutan ${pageCaption} \u00f6ppnades.` : "En dialogruta \u00f6ppnades.";
      case "dialog-close": return "Dialogrutan st\u00e4ngdes.";
      case "value-change": return controlCaption
        ? `${controlCaption} uppdaterades.` : "F\u00e4ltv\u00e4rdet uppdaterades.";
      case "selection-change": return controlCaption
        ? `Ett val registrerades i ${controlCaption}.` : "Ett val registrerades.";
      case "toggle-change": return controlCaption
        ? `${controlCaption} ${event.state?.checked ? "aktiverades" : "inaktiverades"}.`
        : `Alternativet ${event.state?.checked ? "aktiverades" : "inaktiverades"}.`;
      case "status-message": return "Business Central visade ett statusmeddelande.";
      case "error-outcome": return "Business Central visade ett fel.";
      default: return "";
    }
  }
  function resultVerification(outcomes) {
    const values = outcomes.map(event => ({
      kind: event.kind,
      normalizedEventId: event.normalizedEventId,
      sourceEventIds: unique(event.sourceEventIds || [event.sourceEventId]),
      ...(observedCaption(event, "page")
        ? { pageCaption: observedCaption(event, "page") } : {}),
      ...(observedCaption(event, "control")
        ? { controlCaption: observedCaption(event, "control") } : {}),
      ...(event.kind === "toggle-change" && event.state?.checked != null
        ? { checked: Boolean(event.state.checked) } : {}),
      description: outcomeDescription(event)
    }));
    const error = values.find(value => value.kind === "error-outcome");
    const primary = error || values.at(-1) || null;
    return {
      version: RESULT_VERIFICATION_VERSION,
      status: error ? "error" : primary ? "verified" : "unverified",
      primaryOutcome: primary?.kind || null,
      outcomes: values,
      summary: primary?.description || "Resultatet kunde inte verifieras automatiskt.",
      expectedResultSuggestion: primary?.description || "",
      sourceEventIds: unique(values.flatMap(value => value.sourceEventIds))
    };
  }
  function capturePacket(events, primary, screenshots) {
    const recordedInteractionIds = interactionIds(events);
    const explicitInteractions = interactionEvents(events);
    const interaction = explicitInteractions[0] || primary;
    const observedOutcomes = outcomeEvents(events).filter(event =>
      !explicitInteractions.includes(event));
    const outcomes = observedOutcomes.length ? observedOutcomes :
      primary && primary !== interaction ? [primary] :
        primary && ["value-change", "selection-change", "toggle-change",
          "navigation", "dialog-open", "dialog-close", "status-message",
          "error-outcome"].includes(primary.kind)
          ? [primary] : [];
    const screenshotEvents = events.filter(event =>
      event?.screenshotAssetId || event?.screenshotAssetIds?.length);
    const resultScreenshotEvent = [...outcomes].reverse().find(event =>
      event?.screenshotAssetId || event?.screenshotAssetIds?.length);
    const interactionScreenshotEvent = [...explicitInteractions].reverse()
      .find(event => event?.screenshotAssetId || event?.screenshotAssetIds?.length);
    const preferredScreenshotEvent = resultScreenshotEvent ||
      interactionScreenshotEvent || screenshotEvents.at(-1);
    const preferredScreenshotAssetId = preferredScreenshotEvent
      ? (preferredScreenshotEvent.screenshotAssetIds ||
          [preferredScreenshotEvent.screenshotAssetId]).filter(Boolean).at(-1)
      : screenshots.at(-1) || null;
    const missing = [];
    if (!primary) missing.push("interaction");
    if (!outcomes.length) missing.push("result");
    if (!screenshots.length) missing.push("screenshot");
    return {
      packetVersion: CAPTURE_PACKET_VERSION,
      interactionId: recordedInteractionIds.length === 1
        ? recordedInteractionIds[0] : null,
      interactionIds: recordedInteractionIds,
      interactionIdentitySource: recordedInteractionIds.length === 1
        ? "recorder" : "compatibility-grouping",
      interactionEventId: interaction?.normalizedEventId || null,
      interactionEventIds: explicitInteractions.length
        ? explicitInteractions.map(event => event.normalizedEventId)
        : interaction ? [interaction.normalizedEventId] : [],
      interactionSourceEventIds: unique(interaction?.sourceEventIds ||
        [interaction?.sourceEventId]),
      resultEventIds: outcomes.map(event => event.normalizedEventId),
      resultSourceEventIds: unique(outcomes.flatMap(event =>
        event.sourceEventIds || [event.sourceEventId])),
      screenshotAssetIds: screenshots,
      screenshotEvidence: screenshotEvents.flatMap(event =>
        (event.screenshotAssetIds || [event.screenshotAssetId]).filter(Boolean)
          .map(assetId => ({ assetId,
            normalizedEventId: event.normalizedEventId,
            sourceEventId: event.sourceEventId || null,
            role: evidenceRole(event, interaction, outcomes) }))),
      preferredScreenshotAssetId,
      preferredScreenshotRole: preferredScreenshotEvent
        ? evidenceRole(preferredScreenshotEvent, interaction, outcomes) : null,
      preferredSourceEventId: preferredScreenshotEvent?.sourceEventId || null,
      resultVerification: resultVerification(outcomes),
      completeness: missing.length ? "partial" : "complete",
      missing
    };
  }
  function makeGroup(recordingId, events, reasons, sequence) {
    const primary = primaryEvent(events);
    const sourceEventIds = unique(events.flatMap(event => event.sourceEventIds || [event.sourceEventId]));
    const screenshotAssetIds = unique(events.flatMap(event =>
      event.screenshotAssetIds || (event.screenshotAssetId
        ? [event.screenshotAssetId] : [])));
    const packet = capturePacket(events, primary, screenshotAssetIds);
    const resultIds = new Set(packet.resultEventIds);
    return freeze({
      stepGroupId: groupId(sourceEventIds), schemaVersion: SCHEMA_VERSION,
      groupingVersion: GROUPING_VERSION, recordingId, sourceEventIds,
      normalizedEventIds: events.map(event => event.normalizedEventId),
      normalizedEvents: clone(events),
      startTimestamp: events[0].timestamp, endTimestamp: events.at(-1).timestamp,
      sequence, primaryEventId: primary.normalizedEventId,
      primarySourceEventId: primary.sourceEventId,
      pageContext: clone(primary.pageIdentification || {}),
      controlContext: clone(primary.controlIdentification || {}),
      actionContext: clone(primary.actionIdentification),
      groupKind: groupKind(events), groupingReason: unique(reasons),
      screenshotAssetIds,
      capturePacket: packet,
      frameContexts: events.map(event => clone(event.frameContext || {})),
      primaryNormalizedEvent: clone(primary),
      supportingNormalizedEventIds: events.filter(event => event !== primary).map(event => event.normalizedEventId),
      evidence: events.map(event => ({ normalizedEventId: event.normalizedEventId,
        kind: event.kind, interactionId: event.interactionId || null,
        role: resultIds.has(event.normalizedEventId)
          ? "result" : event.normalizedEventId === packet.interactionEventId
            ? "interaction" : "supporting" })),
      interactionIds: interactionIds(events), status: "candidate"
    });
  }
  function isNoise(event) { return event.kind === "focus-transition" || ["scroll", "mousemove", "mouseover", "pointermove"].includes(event.rawEventType); }
  function isUnclassifiedMechanic(event) { return event.kind === "unknown"; }
  function isCommit(kind) { return ["value-change", "selection-change", "toggle-change", "row-selection"].includes(kind); }
  function canContinueField(events, event) {
    const last = events.at(-1);
    if (!last || !isCommit(last.kind) || !isCommit(event.kind)) return false;
    if (pageKey(last) !== pageKey(event) || controlKey(last) !== controlKey(event)) return false;
    const lastFrame = last.frameContext?.frameId;
    const nextFrame = event.frameContext?.frameId;
    if (lastFrame !== nextFrame &&
        (!identity(last.controlIdentification) ||
          identity(last.controlIdentification) !== identity(event.controlIdentification))) {
      return false;
    }
    if (["change", "focusout"].includes(last.subtype) && event.subtype === "input") return false;
    return true;
  }
  function lookupCanClose(events, event) {
    const origin = events[0];
    if (!isLookupOrigin(origin) || event.kind !== "value-change") return false;
    const originId = identity(origin.controlIdentification);
    if (!originId || originId !== identity(event.controlIdentification)) return false;
    const row = [...events].reverse().find(isRowSelection);
    if (!row) return false;
    const selected = selectedValue(row); const committed = event.value?.normalized;
    return selected != null && committed != null && String(selected) === String(committed);
  }
  function sameActivation(events, event) {
    const origin = events?.[0];
    return origin?.kind === "activation" && event.kind === "activation" &&
      pageKey(origin) === pageKey(event) && actionKey(origin) === actionKey(event) &&
      elapsed(origin, event) <= 1200;
  }
  function isActionOutcome(events, event) {
    const origin = events?.[0];
    if (origin?.kind !== "activation") return false;
    if (["dialog-open", "dialog-close", "navigation", "status-message",
      "error-outcome"].includes(event.kind)) return true;
    if (["value-change", "selection-change", "toggle-change"].includes(event.kind)) {
      return pageKey(origin) === pageKey(event) &&
        (controlKey(origin) === controlKey(event) || Boolean(
          event.screenshotAssetId || event.screenshotAssetIds?.length));
    }
    return false;
  }
  function group(normalizedRecording) {
    if (cache.has(normalizedRecording)) return cache.get(normalizedRecording);
    const groups = []; const guidanceEvents = []; const supportingEvents = [];
    const assignments = new Map();
    let pending = null;
    const emit = () => {
      if (!pending) return;
      const value = makeGroup(normalizedRecording.recordingId, pending.events,
        pending.reasons, groups.length + 1);
      groups.push(value);
      value.normalizedEventIds.forEach(id => assignments.set(id, value.stepGroupId));
      pending = null;
    };
    for (const event of normalizedRecording.events || []) {
      if (event.kind === "capture-guidance") {
        emit(); guidanceEvents.push(event);
        supportingEvents.push(freeze({ normalizedEventId: event.normalizedEventId,
          classification: "guidance", reason: "explicit-recording-guidance" }));
        assignments.set(event.normalizedEventId, "supporting");
        continue;
      }
      if (pending && sameRecordedInteraction(pending.events, event)) {
        pending.events.push(event);
        pending.reasons.push(isNoise(event) || isUnclassifiedMechanic(event)
          ? "recorder-interaction-supporting-evidence"
          : "recorder-interaction-id");
        continue;
      }
      if (pending && conflictingRecordedInteraction(pending.events, event)) emit();
      if (!pending && event.kind === "status-message") {
        supportingEvents.push(freeze({ normalizedEventId: event.normalizedEventId,
          classification: "result", reason: "orphan-status-message" }));
        assignments.set(event.normalizedEventId, "supporting");
        continue;
      }
      if (isNoise(event)) { emit(); supportingEvents.push(freeze({ normalizedEventId: event.normalizedEventId, classification: "noise", reason: "non-step-mechanic" })); assignments.set(event.normalizedEventId, "supporting"); continue; }
      if (isUnclassifiedMechanic(event)) { emit(); supportingEvents.push(freeze({
        normalizedEventId: event.normalizedEventId, classification: "unclassified",
        reason: "no-documentable-interaction" }));
      assignments.set(event.normalizedEventId, "supporting"); continue; }
      if (isLookupOrigin(pending?.events[0])) {
        const lookupOrigin = pending.events[0];
        const sameLookupPage = pageKey(event) === pageKey(lookupOrigin) || event.pageIdentification?.modal;
        const candidateEvents = [...pending.events, event];
        const finalLookupValue = lookupCanClose(candidateEvents, event);
        const supportingLookupEvent = sameLookupPage &&
          (["activation", "key-command", "selection-change"].includes(event.kind) ||
            (event.kind === "value-change" &&
              (event.pageIdentification?.modal || finalLookupValue)));
        if (supportingLookupEvent) {
          pending.events.push(event); pending.reasons.push(isRowSelection(event) ? "selected-record" : "lookup-supporting-mechanic");
          if (finalLookupValue) {
            pending.reasons.push("resulting-control-value-match");
            emit();
          }
          continue;
        }
        emit();
      }
      if (pending && sameActivation(pending.events, event)) {
        pending.events.push(event);
        pending.reasons.push("duplicate-activation", "same-control-action-window");
        continue;
      }
      if (pending && isActionOutcome(pending.events, event)) {
        pending.events.push(event);
        pending.reasons.push("observed-action-result");
        continue;
      }
      if (pending && canContinueField(pending.events, event)) {
        pending.events.push(event); pending.reasons.push("same-control", "committed-edit-sequence");
        continue;
      }
      emit();
      const reason = isLookupOrigin(event) ? "lookup-origin" :
        event.kind === "navigation" ? "page-boundary" :
        event.kind === "activation" ? "committed-action" :
        isCommit(event.kind) ? "committed-interaction" : "conservative-single-event";
      pending = { events: [event], reasons: [reason] };
      if (["navigation", "dialog-open", "dialog-close", "key-command"].includes(event.kind) && !isLookupOrigin(event)) emit();
    }
    emit();
    const unassignedMeaningfulEventIds = (normalizedRecording.events || [])
      .filter(event => !assignments.has(event.normalizedEventId) && !isNoise(event))
      .map(event => event.normalizedEventId);
    const resolvedGroups = groups.map(group => {
      const directives = guidanceEvents.filter(event => {
        const targetInteractionId = event.guidance?.targetInteractionId;
        return Boolean(targetInteractionId &&
          group.interactionIds?.includes(targetInteractionId)) ||
          group.sourceEventIds.includes(event.guidance?.targetSourceEventId);
      });
      if (!directives.length) return group;
      const kinds = new Set(directives.map(event => event.guidance?.kind));
      const requestedImage = [...directives].reverse().map(event =>
        event.guidance?.preferredScreenshotAssetId).find(Boolean);
      const preferredImage = group.screenshotAssetIds.includes(requestedImage)
        ? requestedImage : group.capturePacket?.preferredScreenshotAssetId;
      const preferredEvent = preferredImage ? group.normalizedEvents.find(event =>
        (event.screenshotAssetIds || [event.screenshotAssetId]).includes(preferredImage)) : null;
      return freeze({ ...clone(group),
        capturePacket: { ...clone(group.capturePacket),
          preferredScreenshotAssetId: preferredImage || null,
          preferredSourceEventId: preferredEvent?.sourceEventId ||
            group.capturePacket?.preferredSourceEventId || null },
        guidance: {
          important: kinds.has("important"), ignored: kinds.has("ignore"),
          sectionBoundaryAfter: kinds.has("new-section"),
          preferredScreenshotAssetId: preferredImage || null,
          markerSourceEventIds: unique(directives.flatMap(event =>
            event.sourceEventIds || [event.sourceEventId]))
        }, status: kinds.has("ignore") ? "ignored" : group.status });
    });
    const result = freeze({ schemaVersion: SCHEMA_VERSION,
      groupingVersion: GROUPING_VERSION, recordingId: normalizedRecording.recordingId,
      groups: resolvedGroups, supportingEvents, diagnostics: {
        assignedEventCount: assignments.size,
        inputEventCount: normalizedRecording.events?.length || 0,
        unassignedMeaningfulEventIds
      } });
    if (normalizedRecording && typeof normalizedRecording === "object") cache.set(normalizedRecording, result);
    return result;
  }
  function normalizeStepGroup(value) { if (!value || Number(value.schemaVersion) !== SCHEMA_VERSION) throw new Error("Unsupported Step Group schema."); return freeze(clone(value)); }
  return { CAPTURE_PACKET_VERSION, GROUPING_VERSION, RESULT_VERIFICATION_VERSION,
    SCHEMA_VERSION, group,
    normalizeStepGroup };
});
