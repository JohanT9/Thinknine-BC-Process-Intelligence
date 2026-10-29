(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CaptureSequence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Each frame numbers the events of a recording from 1 (sourceSequence). A number that never
  // arrived is an event the recording lost, for example while the browser had stopped the
  // extension's background worker. Older recordings numbered a frame's events across
  // recordings; only events numbered per recording (sequenceScope) are counted.
  const sequenceOf = event => {
    if (event?.captureProvenance?.sequenceScope !== "recording") return 0;
    const value = Number(event?.sourceSequence ?? event?.captureProvenance?.localSequence);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  };
  const frameOf = event => String(event?.sourceFrameId ||
    event?.captureProvenance?.frameInstanceId || "");

  // A running count per frame, updated for every newly stored event.
  function track(state = {}, event = {}) {
    const frame = frameOf(event); const sequence = sequenceOf(event);
    if (!frame || !sequence) return state;
    const current = state[frame] || { max: 0, count: 0 };
    return { ...state, [frame]: { max: Math.max(current.max, sequence),
      count: current.count + 1 } };
  }

  function missingCount(state = {}) {
    return Object.values(state || {}).reduce((total, frame) =>
      total + Math.max(0, Number(frame?.max || 0) - Number(frame?.count || 0)), 0);
  }

  // The gaps in stored events, for diagnostics: per frame the numbers that never arrived.
  function gaps(events = [], { limit = 20 } = {}) {
    const frames = new Map();
    for (const event of events) {
      const frame = frameOf(event); const sequence = sequenceOf(event);
      if (!frame || !sequence) continue;
      if (!frames.has(frame)) frames.set(frame, new Set());
      frames.get(frame).add(sequence);
    }
    const byFrame = [];
    for (const [frameId, received] of frames) {
      const max = Math.max(...received);
      const missing = [];
      for (let sequence = 1; sequence <= max; sequence += 1) {
        if (!received.has(sequence)) missing.push(sequence);
      }
      if (missing.length) byFrame.push({ frameId, received: received.size, max,
        missingCount: missing.length, missing: missing.slice(0, limit) });
    }
    return { missingCount: byFrame.reduce((total, frame) => total + frame.missingCount, 0),
      frames: byFrame };
  }

  return Object.freeze({ gaps, missingCount, track });
});
