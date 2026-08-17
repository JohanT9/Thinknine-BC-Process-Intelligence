(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9PageIdentity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function text(value) {
    return typeof value === "string" || typeof value === "number"
      ? String(value).trim() : "";
  }

  function normalizeNumericId(value) {
    const candidate = text(value);
    if (!/^[0-9]+$/.test(candidate)) return null;
    try {
      const normalized = BigInt(candidate);
      return normalized > 0n ? normalized.toString() : null;
    } catch {
      return null;
    }
  }

  function routePageObjectId(value) {
    const candidate = text(value);
    if (!candidate) return null;
    try {
      return normalizeNumericId(new URL(candidate).searchParams.get("page"));
    } catch {
      return null;
    }
  }

  function observedPageObjectId(raw = {}) {
    if (!text(raw.pageId)) return null;
    const legacyPageId = normalizeNumericId(raw.pageId);
    if (!legacyPageId) return null;
    for (const url of [raw.frameUrl, raw.topUrl]) {
      const routeId = routePageObjectId(url);
      if (routeId === legacyPageId) return routeId;
    }
    return null;
  }

  return { normalizeNumericId, observedPageObjectId, routePageObjectId };
});
