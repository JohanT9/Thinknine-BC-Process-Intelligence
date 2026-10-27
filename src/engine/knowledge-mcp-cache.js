(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeMcpCache = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "2";
  const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const TRANSIENT_FAILURE_TTL_MS = 2 * 60 * 1000;
  const MAX_ENTRIES = 200;
  const TRANSIENT_FAILURE_REASONS = new Set([
    "mcp-call-failed", "mcp-client-unavailable", "mcp-tool-unavailable",
    "invalid-mcp-response", "invalid-mcp-candidate"
  ]);

  function isTransientFailure(result) {
    return result?.status === "unresolved" &&
      TRANSIENT_FAILURE_REASONS.has(result.reason);
  }

  function validEntry(entry, now, ttlMs = DEFAULT_TTL_MS) {
    const entryTtl = Number.isFinite(entry?.ttlMs) && entry.ttlMs > 0
      ? Math.min(entry.ttlMs, ttlMs) : ttlMs;
    return entry && typeof entry === "object" && entry.version === VERSION &&
      Number.isFinite(entry.savedAt) && entry.savedAt <= now &&
      now - entry.savedAt < entryTtl && entry.result &&
      typeof entry.result === "object";
  }

  function read(cache, key, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
    const entry = cache && typeof cache === "object" ? cache[key] : null;
    return validEntry(entry, now, ttlMs) ? entry.result : null;
  }

  function write(cache, updates, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
    const next = {};
    for (const [key, entry] of Object.entries(cache || {})) {
      if (validEntry(entry, now, ttlMs)) next[key] = entry;
    }
    for (const update of Array.isArray(updates) ? updates : []) {
      if (typeof update?.key !== "string" || !update.key ||
          !update.result || typeof update.result !== "object") continue;
      next[update.key] = { version: VERSION, savedAt: now,
        ...(Number.isFinite(update.ttlMs) && update.ttlMs > 0
          ? { ttlMs: Math.min(update.ttlMs, ttlMs) } : {}),
        result: JSON.parse(JSON.stringify(update.result)) };
    }
    return Object.fromEntries(Object.entries(next)
      .sort((left, right) => right[1].savedAt - left[1].savedAt)
      .slice(0, MAX_ENTRIES));
  }

  return Object.freeze({ VERSION, DEFAULT_TTL_MS, TRANSIENT_FAILURE_TTL_MS,
    MAX_ENTRIES, isTransientFailure, read, write });
});
