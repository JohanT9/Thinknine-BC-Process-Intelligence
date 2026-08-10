(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CanonicalRecording = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function eventType(type) {
    return ({ "page-state": "pageOpened", "field-change": "fieldChanged", dialog: "dialogOpened" })[type] || type || "other";
  }
  function canonicalEvent(sessionId, source = {}, index = 0) {
    const eventNo = source.eventNo || index + 1;
    const sourceEventId = source.sourceEventId || source.captureId || null;
    const event = {
      id: source.id || (sourceEventId
        ? `${sessionId}:event:${sourceEventId}`
        : `${sessionId}:event:${eventNo}`),
      recordingId: sessionId,
      schemaVersion: SCHEMA_VERSION,
      sequence: index + 1,
      timestamp: source.timestamp || new Date(0).toISOString(),
      capturedAt: source.timestamp || new Date(0).toISOString(),
      type: eventType(source.type),
      source: {
        type: source.source || "legacy-recorder",
        eventId: sourceEventId || undefined,
        sequence: source.sourceSequence ?? undefined,
        frameId: source.sourceFrameId || undefined,
        frameSequence: source.frameSequence ?? source.sourceSequence ?? undefined
      },
      raw: clone(source)
    };
    if (source.pageId || source.pageCaption || source.frameUrl) event.page = { id: source.pageId || undefined, name: source.pageCaption || undefined, url: source.frameUrl || undefined };
    if (source.pageId || source.pageCaption) event.businessCentral = { pageId: source.pageId || undefined, pageName: source.pageCaption || undefined };
    if (source.fieldName || source.label || source.role) event.control = { name: source.fieldName || source.label || undefined, role: source.role || undefined };
    if (source.category || source.inputSource || source.key) event.action = { category: source.category || undefined, inputSource: source.inputSource || undefined, key: source.key || undefined };
    if (Object.prototype.hasOwnProperty.call(source, "value")) event.value = clone(source.value);
    if (Object.prototype.hasOwnProperty.call(source, "previousValue")) event.previousValue = clone(source.previousValue);
    if (source.target) event.target = clone(source.target);
    else if (source.automationId || source.controlType) event.target = {
      automationId: source.automationId || undefined,
      controlType: source.controlType || undefined
    };
    if (source.label || source.role) event.accessibleTarget = {
      name: source.label || source.fieldName || undefined,
      role: source.role || undefined
    };
    if (source.clientX != null || source.clientY != null) event.coordinates = {
      x: source.clientX ?? undefined,
      y: source.clientY ?? undefined
    };
    if (source.frameUrl || source.topUrl || source.frameDepth != null) event.frame = {
      id: source.sourceFrameId || undefined,
      url: source.frameUrl || undefined,
      topUrl: source.topUrl || undefined,
      depth: source.frameDepth ?? undefined
    };
    if (source.selector) event.selector = source.selector;
    if (source.screenshotAssetId) event.screenshotAssetId = source.screenshotAssetId;
    return event;
  }
  function metadataFromSession(session = {}) {
    return { title: session.name || undefined, startedAt: session.startedAt || new Date(0).toISOString(), finishedAt: session.completedAt || session.finishedAt || undefined, sourceApplication: session.sourceApplication || "Microsoft Dynamics 365 Business Central", sourceUrl: session.sourceUrl || undefined, businessCentral: clone(session.businessCentral || { environment: session.settings?.environmentName || undefined }), recordingPurpose: session.recordingPurpose || session.purpose || undefined };
  }
  function assetFor(sessionId, eventNo, value) {
    return { id: `${sessionId}:screenshot:${eventNo}`, type: "screenshot", path: `screenshots/${String(eventNo).padStart(6, "0")}.png`, mimeType: /^data:([^;,]+)/.exec(String(value || ""))?.[1] || "image/png", metadata: { legacyEventNo: Number(eventNo) } };
  }
  function create(options = {}) {
    const now = options.startedAt || new Date().toISOString();
    const session = options.legacySession || { id: options.id, name: options.title, purpose: options.recordingPurpose, startedAt: now, completedAt: options.finishedAt, updatedAt: options.updatedAt || now, settings: clone(options.settings || {}) };
    return { id: options.id, schemaVersion: SCHEMA_VERSION, metadata: metadataFromSession(session), events: [], assets: [], createdAt: now, updatedAt: options.updatedAt || now, compatibility: { session: clone(session) } };
  }
  function fromLegacy(session, events = [], screenshots = {}) {
    const result = create({ id: session.id, startedAt: session.startedAt, updatedAt: session.updatedAt, legacySession: session });
    result.events = events.map((event, index) => canonicalEvent(session.id, event, index));
    result.assets = Object.entries(screenshots).map(([eventNo, value]) => assetFor(session.id, eventNo, value));
    const assets = new Map(result.assets.map(asset => [asset.metadata.legacyEventNo, asset.id]));
    result.events.forEach(event => { const id = assets.get(Number(event.raw?.eventNo)); if (id) event.screenshotAssetId = id; });
    return result;
  }
  function normalize(input, legacy = {}) {
    if (!input || input.schemaVersion == null) return (!legacy.session && !input) ? null : fromLegacy(legacy.session || input, legacy.events, legacy.screenshots);
    if (Number(input.schemaVersion) !== SCHEMA_VERSION) throw new Error(`Unsupported recording schema: ${input.schemaVersion}`);
    const result = clone(input); result.events = Array.isArray(result.events) ? result.events : []; result.assets = Array.isArray(result.assets) ? result.assets : []; result.metadata ||= {}; return result;
  }
  function addEvent(recording, source) {
    if (!source || typeof source !== "object" || Array.isArray(source) || !source.type) throw new TypeError("A raw event with a type is required.");
    const sourceId = source.sourceEventId || source.captureId;
    if (sourceId && recording.events?.some(event => event.source?.eventId === sourceId)) return recording;
    const result = normalize(recording);
    if (result.metadata.finishedAt) throw new Error("Completed recording evidence is immutable.");
    result.events.push(canonicalEvent(result.id, source, result.events.length));
    result.updatedAt = source.timestamp || new Date().toISOString();
    return result;
  }
  function addScreenshot(recording, eventReference, dataUrl, createdAt = new Date().toISOString()) {
    const result = normalize(recording);
    if (result.metadata.finishedAt) throw new Error("Completed recording evidence is immutable.");
    const event = result.events.find(item =>
      item.id === eventReference || Number(item.raw?.eventNo) === Number(eventReference)
    );
    if (!event) return result;
    const eventNo = event.raw?.eventNo || event.sequence;
    const asset = { ...assetFor(result.id, eventNo, dataUrl), createdAt };
    const existing = result.assets.findIndex(item => item.id === asset.id);
    if (existing >= 0) result.assets[existing] = asset; else result.assets.push(asset);
    event.screenshotAssetId = asset.id;
    result.updatedAt = createdAt;
    return result;
  }
  function finish(recording, finishedAt) { if (recording.metadata?.finishedAt) { if (recording.metadata.finishedAt === finishedAt) return recording; throw new Error("Completed recording evidence is immutable."); } const result = normalize(recording); result.metadata.finishedAt = finishedAt; result.updatedAt = finishedAt; if (result.compatibility?.session) Object.assign(result.compatibility.session, { completedAt: finishedAt, updatedAt: finishedAt, status: "completed" }); return result; }
  function legacyView(recording) { const value = normalize(recording); const session = clone(value.compatibility?.session || {}); Object.assign(session, { id: value.id, name: session.name || value.metadata.title, purpose: session.purpose || value.metadata.recordingPurpose || "", startedAt: session.startedAt || value.metadata.startedAt, completedAt: session.completedAt || value.metadata.finishedAt || null, updatedAt: value.updatedAt, eventCount: value.events.length }); return { session, events: value.events.map(event => clone(event.raw || { id: event.id, timestamp: event.timestamp, type: event.type })) }; }
  return { SCHEMA_VERSION, addEvent, addScreenshot, create, finish, fromLegacy, legacyView, normalize };
});
