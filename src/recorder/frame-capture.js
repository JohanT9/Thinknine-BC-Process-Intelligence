(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9FrameCapture = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CONTRACT_VERSION = "1.0.0";
  const MESSAGE_TYPES = Object.freeze({
    READY: "T9_FRAME_RECORDER_READY",
    UNAVAILABLE: "T9_FRAME_RECORDER_UNAVAILABLE",
    EVENT: "T9_FRAME_INTERACTION_EVENT",
    STOPPED: "T9_FRAME_RECORDER_STOPPED"
  });

  function text(value, max = 1000) {
    return typeof value === "string" ? value.slice(0, max) : "";
  }

  function finite(value) {
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function bounds(value) {
    if (!value || typeof value !== "object") return null;
    const result = {
      x: finite(value.x), y: finite(value.y), width: finite(value.width),
      height: finite(value.height)
    };
    return Object.values(result).every(item => item !== null) ? result : null;
  }

  function normalizeEvent(value = {}) {
    if (!value || typeof value !== "object") return null;
    const timestamp = text(value.captureTimestamp || value.timestamp, 40);
    const localSequence = Number(value.localSequence);
    const sourceEventId = text(value.sourceEventId, 180);
    if (!sourceEventId || !timestamp || !Number.isInteger(localSequence) ||
        localSequence < 1 || !text(value.type, 80)) return null;
    return {
      ...value,
      contractVersion: CONTRACT_VERSION,
      sourceEventId,
      captureTimestamp: timestamp,
      timestamp,
      localSequence,
      localBounds: bounds(value.localBounds),
      topViewportBounds: bounds(value.topViewportBounds)
    };
  }

  function frameContext(sender = {}, message = {}) {
    const frameId = Number.isInteger(sender.frameId) ? sender.frameId : 0;
    return {
      tabId: Number.isInteger(sender.tab?.id) ? sender.tab.id : null,
      frameId,
      parentFrameId: Number.isInteger(message.parentFrameId)
        ? message.parentFrameId : null,
      documentId: text(sender.documentId, 180),
      frameUrl: text(sender.url || message.frameUrl, 2000),
      topFrameUrl: text(message.topFrameUrl, 2000),
      frameOrigin: text(sender.origin || message.frameOrigin, 500),
      frameDepth: Number.isInteger(message.frameDepth) ? message.frameDepth : 0
    };
  }

  function diagnosticUrl(value) {
    try {
      const url = new URL(text(value, 2000));
      return `${url.origin}${url.pathname}`;
    } catch {
      return text(value, 500).split(/[?#]/u)[0];
    }
  }

  function validateMessage(message, sender, state, seen = new Set()) {
    if (!message || message.type !== MESSAGE_TYPES.EVENT) {
      return { valid: false, reason: "unsupported-message" };
    }
    const event = normalizeEvent(message.event);
    const frame = frameContext(sender, message);
    if (!event) return { valid: false, reason: "malformed-event" };
    if (!state?.recording || !state.sessionId) {
      return { valid: false, reason: "inactive-session" };
    }
    if (message.sessionId !== state.sessionId) {
      return { valid: false, reason: "stale-session" };
    }
    if (frame.tabId !== state.tabId) {
      return { valid: false, reason: "inactive-tab" };
    }
    const identity = `${frame.tabId}:${frame.frameId}:${event.sourceEventId}`;
    if (seen.has(identity)) return { valid: false, reason: "duplicate-event" };
    return { valid: true, identity, event: { ...event, ...frame,
      eventSource: text(event.eventSource, 80) || "frame-dom" } };
  }

  function compare(left, right) {
    const time = Date.parse(left.captureTimestamp || left.timestamp) || 0;
    const otherTime = Date.parse(right.captureTimestamp || right.timestamp) || 0;
    return time - otherTime ||
      (Number(left.localSequence) || 0) - (Number(right.localSequence) || 0) ||
      (Number(left.frameId) || 0) - (Number(right.frameId) || 0) ||
      text(left.sourceEventId).localeCompare(text(right.sourceEventId));
  }

  function merge(values = []) {
    return [...values].sort(compare);
  }

  function topViewportBounds(localValue, frameOffsets = []) {
    const local = bounds(localValue);
    if (!local || !Array.isArray(frameOffsets)) return null;
    let x = local.x;
    let y = local.y;
    for (const offsetValue of frameOffsets) {
      const offset = bounds(offsetValue);
      if (!offset) return null;
      x += offset.x;
      y += offset.y;
    }
    return { x, y, width: local.width, height: local.height };
  }

  function effectiveTarget(event) {
    const path = typeof event?.composedPath === "function"
      ? event.composedPath() : [];
    return path.find(value => value?.nodeType === 1) || event?.target || null;
  }

  return { CONTRACT_VERSION, MESSAGE_TYPES, compare, diagnosticUrl, effectiveTarget,
    frameContext, merge, normalizeEvent, topViewportBounds, validateMessage };
});
