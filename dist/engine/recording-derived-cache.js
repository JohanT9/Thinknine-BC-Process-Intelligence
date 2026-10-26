(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RecordingDerivedCache = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create({ maxEntries = 4, maxEvents = 10000,
    ttlMs = 5 * 60 * 1000, now = Date.now } = {}) {
    const entries = new Map();
    function revisionKey(recording, configurationRevision = "") {
      const id = String(recording?.id || recording?.recordingId || "");
      if (!id) return "";
      return [id, String(recording?.updatedAt || ""),
        String(recording?.events?.length || 0),
        String(recording?.assets?.length || 0),
        String(configurationRevision || "")].join("\u001f");
    }
    function prune() {
      const timestamp = now();
      for (const [id, entry] of entries) {
        if (entry.expiresAt <= timestamp) entries.delete(id);
      }
      while (entries.size > Math.max(1, maxEntries)) {
        entries.delete(entries.keys().next().value);
      }
    }
    function get(recording, configurationRevision) {
      prune();
      const id = String(recording?.id || recording?.recordingId || "");
      const currentKey = revisionKey(recording, configurationRevision);
      const entry = entries.get(id);
      if (!entry || entry.revisionKey !== currentKey) return null;
      entries.delete(id);
      entries.set(id, entry);
      return entry.value;
    }
    function set(recording, value, configurationRevision) {
      prune();
      const id = String(recording?.id || recording?.recordingId || "");
      const count = Array.isArray(recording?.events) ? recording.events.length : 0;
      if (!id || !value || count > maxEvents) return false;
      entries.delete(id);
      entries.set(id, { revisionKey: revisionKey(recording,
        configurationRevision), value, expiresAt: now() + ttlMs });
      prune();
      return entries.has(id);
    }
    function invalidate(recordingId) {
      return entries.delete(String(recordingId || ""));
    }
    function clear() { entries.clear(); }
    return Object.freeze({ clear, get, invalidate, set, size: () => entries.size });
  }
  return Object.freeze({ create });
});
