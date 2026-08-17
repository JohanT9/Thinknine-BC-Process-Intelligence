(function (root, factory) {
  const identification = typeof module === "object" && module.exports
    ? require("./bc-ui-identification") : root.T9BCUIIdentification;
  const pageIdentification = typeof module === "object" && module.exports
    ? require("./page-identification-engine") : root.T9PageIdentificationEngine;
  const api = factory(identification, pageIdentification);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9EventNormalization = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  identification, pageIdentification
) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const NORMALIZATION_VERSION = "2.0.0";
  const cache = new WeakMap();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
  function rawOf(event) { return event?.raw || event || {}; }
  function identificationFor(event, options = {}) {
    const raw = rawOf(event);
    const derived = identification.identify(raw, { eventId: event?.id || "",
      knowledgePacks: options.knowledgePacks });
    const existing = event?.identification || {};
    return { ...clone(existing),
      page: clone(derived.page), pageIdentity: clone(derived.pageIdentity),
      entityContext: clone(derived.entityContext),
      frameContext: { ...clone(derived.frameContext || {}),
        ...clone(existing.frameContext || {}) },
      control: clone(existing.control || derived.control),
      controlIdentity: clone(existing.controlIdentity || derived.controlIdentity),
      action: clone(existing.action || derived.action),
      actionIdentity: clone(existing.actionIdentity || derived.actionIdentity) };
  }
  function controlKey(event) { const id = event.identification || {}; const raw = rawOf(event); return id.controlIdentity?.controlIdentity || id.control?.identity?.value || raw.automationId || raw.fieldName || raw.label || event.id; }
  function mechanism(raw) { if (raw.inputSource === "keyboard" || /^(?:key|keydown)$/.test(raw.type)) return "keyboard"; if (raw.type === "click") return "pointer"; if (/pointer/.test(raw.type || "")) return "pointer"; if (/mouse/.test(raw.type || "")) return "mouse"; return "unknown"; }
  function valueModel(raw, identified) {
    if (!Object.prototype.hasOwnProperty.call(raw, "value")) return null;
    const model = { raw: clone(raw.value), normalized: clone(raw.value) };
    if (typeof raw.value === "string") model.display = raw.value;
    if (identified?.control?.type === "dateInput" && typeof raw.value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.value)) model.format = "iso-date";
    return model;
  }
  function classify(event, options = {}) {
    const raw = rawOf(event); const identified = identificationFor(event, options);
    const control = identified.control?.type || ""; const type = raw.type || "unknown";
    if (type === "click" && (control === "checkbox" || raw.checked != null)) return ["toggle-change", "verified-checked-state"];
    if (["dialog", "dialog-open"].includes(type)) return ["dialog-open", "observed-dialog-open"];
    if (type === "dialog-close") return ["dialog-close", "observed-dialog-close"];
    if ((type === "click" || /pointer|mouse/.test(type)) && control === "lookup") return ["activation", "identified-lookup-trigger"];
    if (["click", "key", "keydown"].includes(type) && identified.action && (type === "click" || ["Enter", " ", "Space"].includes(raw.key))) return ["activation", "identified-action-activation"];
    if (type === "click" && ["listRow", "repeaterCell"].includes(control)) return ["selection-change", "identified-row-selection"];
    if (["field-change", "change", "input"].includes(type) && (control === "checkbox" || typeof raw.value === "boolean" || raw.checked != null)) return ["toggle-change", "verified-checked-state"];
    if (["field-change", "change"].includes(type) && control === "option") return ["selection-change", "identified-option-change"];
    if (["field-change", "input", "change"].includes(type)) {
      if (raw.inputSource === "focusout" && raw.previousValue === raw.value) return [null, "unchanged-focusout"];
      if (raw.inputSource === "focusout" && raw.previousValue === undefined) return [null, "unverified-focusout"];
      return ["value-change", raw.inputSource === "focusout" ? "changed-value-on-focusout-fallback" : "browser-value-event"];
    }
    if (["focus", "focusin", "focusout"].includes(type)) return [null, "focus-only-no-change"];
    if (["navigation", "page-state"].includes(type)) return ["navigation", "observed-navigation"];
    if (["key", "keydown"].includes(type)) return ["key-command", "observed-key-command"];
    if (type === "click") return ["activation", "generic-activation"];
    return ["unknown", "unmapped-raw-event"];
  }
  function create(event, kind, reason, sources = [event], options = {}) {
    const raw = rawOf(event); const identified = identificationFor(event, options);
    const sourceIds = sources.map(item => item.id);
    const selection = raw.selectedValue != null || raw.selectedCaption || raw.selectedKey ? { value: clone(raw.selectedValue), caption: raw.selectedCaption || undefined, key: raw.selectedKey || undefined, transientIndex: raw.selectedIndex ?? undefined } : null;
    return freeze({
      normalizedEventId: `normalized:${sourceIds.map(id => `${id.length}:${id}`).join("|")}`,
      schemaVersion: SCHEMA_VERSION,
      normalizationVersion: NORMALIZATION_VERSION,
      sourceEventId: event.id, sourceEventIds: sourceIds, recordingId: event.recordingId,
      kind, subtype: raw.inputSource || raw.category || undefined,
      timestamp: event.timestamp, timestampRange: {
        start: sources[0]?.timestamp, end: sources.at(-1)?.timestamp
      }, sequence: event.sequence,
      frameContext: { ...clone(identified.frameContext || event.frame || {}),
        tabId: raw.tabId ?? undefined, browserFrameId: raw.browserFrameId ?? undefined,
        parentFrameId: raw.parentFrameId ?? undefined,
        documentId: raw.documentId || undefined, origin: raw.frameOrigin || undefined,
        localSequence: event.source?.sequence ?? raw.sourceSequence ?? undefined },
      pageIdentification: clone({ ...(identified.page || {}),
        ...(identified.pageIdentity || {}),
        legacyPageId: raw.pageId || identified.pageIdentity?.pageId || undefined,
        pageCaption: raw.pageCaption || identified.pageIdentity?.caption || undefined,
        documentTitle: raw.documentTitle || identified.pageIdentity?.documentTitle || undefined,
        frameUrl: raw.frameUrl || identified.frameContext?.frameUrl || undefined,
        topUrl: raw.topUrl || identified.frameContext?.topUrl || undefined,
        frameDepth: raw.frameDepth ?? identified.frameContext?.depth ?? undefined,
        controlAddIn: raw.controlAddIn ?? identified.frameContext?.controlAddIn ?? undefined }),
      controlIdentification: clone({ ...(identified.control || {}),
        ...(identified.controlIdentity || {}) }),
      actionIdentification: clone(identified.action || identified.actionIdentity
        ? { ...(identified.action || {}), ...(identified.actionIdentity || {}) }
        : null),
      containerIdentification: clone(identified.container),
      interaction: { mechanism: mechanism(raw), key: raw.key || undefined, code: raw.code || undefined,
        altKey: raw.altKey || undefined, ctrlKey: raw.ctrlKey || undefined,
        metaKey: raw.metaKey || undefined, shiftKey: raw.shiftKey || undefined,
        repeat: raw.repeat || undefined },
      value: valueModel(raw, identified),
      previousValue: Object.prototype.hasOwnProperty.call(raw, "previousValue") ? { raw: clone(raw.previousValue), normalized: clone(raw.previousValue) } : null,
      selection, state: raw.checked != null || typeof raw.value === "boolean" ? { checked: raw.checked ?? raw.value } : null,
      coordinates: { pointer: event.coordinates ? clone(event.coordinates) :
          raw.clientX != null ? { x: raw.clientX, y: raw.clientY } : undefined,
        localBounds: clone(raw.localBounds), topViewportBounds: clone(raw.topViewportBounds),
        devicePixelRatio: raw.devicePixelRatio ?? undefined,
        viewportScale: raw.viewportScale ?? undefined },
      screenshotAssetId: event.screenshotAssetId, source: clone(event.source || {}),
      screenshotAssetIds: [...new Set(sources.map(item =>
        item.screenshotAssetId).filter(Boolean))],
      evidence: [{ source: "normalization-rule", value: reason }],
      futureMetadata: clone(raw.futureMetadata || raw.futureRawMetadata),
      rawEventType: raw.type || "unknown"
    });
  }
  function canCoalesce(pending, event, kind) {
    if (!pending || pending.kind !== "value-change" || kind !== "value-change") return false;
    const previous = rawOf(pending.sources.at(-1)); const raw = rawOf(event);
    if (previous.inputSource === "focusout") return false;
    return controlKey(pending.sources[0]) === controlKey(event) &&
      ["input", "change", "focusout"].includes(raw.inputSource || raw.type);
  }
  function normalizeRecording(recording, options = {}) {
    const useCache = !options.knowledgePacks;
    const revision = useCache ? pageIdentification.configurationVersion() : null;
    const cached = useCache && recording && typeof recording === "object"
      ? cache.get(recording) : null;
    if (cached && cached.revision === revision) return cached.result;
    const events = []; let pending = null;
    const flush = () => { if (!pending) return; const owner = pending.sources.at(-1); events.push(create(owner, pending.kind, pending.reason, pending.sources, options)); pending = null; };
    for (const event of recording?.events || []) {
      const [kind, reason] = classify(event, options);
      if (!kind) { if (rawOf(event).type === "focus") flush(); continue; }
      if (kind === "value-change") {
        if (canCoalesce(pending, event, kind)) pending.sources.push(event);
        else { flush(); pending = { kind, reason, sources: [event] }; }
      } else { flush(); events.push(create(event, kind, reason, [event], options)); }
    }
    flush();
    const result = freeze({ schemaVersion: SCHEMA_VERSION,
      normalizationVersion: NORMALIZATION_VERSION,
      recordingId: recording?.id, events });
    if (useCache && recording && typeof recording === "object") cache.set(recording,
      { revision, result });
    return result;
  }
  function normalizeEvent(value) { if (!value || Number(value.schemaVersion) !== SCHEMA_VERSION) throw new Error("Unsupported normalized event schema."); return freeze(clone(value)); }
  return { NORMALIZATION_VERSION, SCHEMA_VERSION, classify, normalizeEvent,
    normalizeRecording };
});
