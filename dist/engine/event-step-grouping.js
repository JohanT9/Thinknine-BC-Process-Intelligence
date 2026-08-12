(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9EventStepGrouping = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const GROUPING_VERSION = "1.0.0";
  const cache = new WeakMap();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
  function identity(control = {}) { return control.identity?.value || control.controlId || control.fieldId || ""; }
  function controlKey(event) { return identity(event.controlIdentification) || event.controlIdentification?.caption || event.normalizedEventId; }
  function pageKey(event) { const page = event.pageIdentification || {}; return page.id || page.name || page.caption || ""; }
  function selectedValue(event) { return event.selection?.value ?? event.selection?.key ?? event.selection?.caption ?? event.value?.normalized; }
  function isLookupOrigin(event) { return event?.kind === "activation" &&
    event.controlIdentification?.controlType === "lookup"; }
  function isRowSelection(event) { return event?.kind === "selection-change" &&
    ["listRow", "repeaterCell"].includes(
      event.controlIdentification?.controlType || event.controlIdentification?.type
    ); }
  function unique(values) { return [...new Set(values.filter(Boolean))]; }
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
  function makeGroup(recordingId, events, reasons, sequence) {
    const primary = [...events].reverse().find(event => ["value-change", "toggle-change", "selection-change", "activation", "dialog-open", "dialog-close", "navigation"].includes(event.kind)) || events.at(-1);
    const sourceEventIds = unique(events.flatMap(event => event.sourceEventIds || [event.sourceEventId]));
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
      screenshotAssetIds: unique(events.flatMap(event =>
        event.screenshotAssetIds || (event.screenshotAssetId
          ? [event.screenshotAssetId] : []))),
      frameContexts: events.map(event => clone(event.frameContext || {})),
      primaryNormalizedEvent: clone(primary),
      supportingNormalizedEventIds: events.filter(event => event !== primary).map(event => event.normalizedEventId),
      evidence: events.map(event => ({ normalizedEventId: event.normalizedEventId,
        kind: event.kind })), status: "candidate"
    });
  }
  function isNoise(event) { return event.kind === "focus-transition" || ["scroll", "mousemove", "mouseover", "pointermove"].includes(event.rawEventType); }
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
  function group(normalizedRecording) {
    if (cache.has(normalizedRecording)) return cache.get(normalizedRecording);
    const groups = []; const supportingEvents = []; const assignments = new Map();
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
      if (isNoise(event)) { emit(); supportingEvents.push(freeze({ normalizedEventId: event.normalizedEventId, classification: "noise", reason: "non-step-mechanic" })); assignments.set(event.normalizedEventId, "supporting"); continue; }
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
      if (["activation", "navigation", "dialog-open", "dialog-close", "unknown", "key-command"].includes(event.kind) && !isLookupOrigin(event)) emit();
    }
    emit();
    const unassignedMeaningfulEventIds = (normalizedRecording.events || [])
      .filter(event => !assignments.has(event.normalizedEventId) && !isNoise(event))
      .map(event => event.normalizedEventId);
    const result = freeze({ schemaVersion: SCHEMA_VERSION,
      groupingVersion: GROUPING_VERSION, recordingId: normalizedRecording.recordingId,
      groups, supportingEvents, diagnostics: {
        assignedEventCount: assignments.size,
        inputEventCount: normalizedRecording.events?.length || 0,
        unassignedMeaningfulEventIds
      } });
    if (normalizedRecording && typeof normalizedRecording === "object") cache.set(normalizedRecording, result);
    return result;
  }
  function normalizeStepGroup(value) { if (!value || Number(value.schemaVersion) !== SCHEMA_VERSION) throw new Error("Unsupported Step Group schema."); return freeze(clone(value)); }
  return { GROUPING_VERSION, SCHEMA_VERSION, group, normalizeStepGroup };
});
