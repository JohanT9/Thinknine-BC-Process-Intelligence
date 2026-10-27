(function (root, factory) {
  const tenantLicense = typeof module === "object" && module.exports
    ? require("./tenant-license") : root.T9TenantLicense;
  const api = factory(tenantLicense);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RecordingLicenseGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (tenantLicense) {
  "use strict";

  const DEFAULT_RECHECK_MS = 30_000;

  function create({ validate, tenantFromUrl = tenantLicense.tenantFromUrl,
    now = Date.now, recheckMs = DEFAULT_RECHECK_MS } = {}) {
    if (typeof validate !== "function") throw new TypeError(
      "A recording license validator is required."
    );
    const checks = new Map();

    async function check({ recordingId, licenseTenantId, url }) {
      const currentTenant = tenantFromUrl(url);
      if (!currentTenant || currentTenant !== String(licenseTenantId || "").toLowerCase()) {
        throw new Error("Tenant har ändrats. Stoppa inspelningen och starta en ny i rätt tenant.");
      }
      const key = `${String(recordingId || "")}:${currentTenant}`;
      const existing = checks.get(key);
      if (existing?.pending) return existing.pending;
      if (existing && existing.checkedAt + recheckMs > now()) {
        if (existing.error) throw existing.error;
        return existing.result;
      }

      const entry = { checkedAt: 0, pending: null, result: undefined, error: null };
      const pending = Promise.resolve().then(() => validate(url)).then(result => {
        entry.checkedAt = now();
        entry.result = result;
        entry.pending = null;
        return result;
      }, error => {
        entry.checkedAt = now();
        entry.error = error;
        entry.pending = null;
        throw error;
      });
      entry.pending = pending;
      checks.set(key, entry);
      if (checks.size > 128) {
        const oldest = [...checks.entries()]
          .filter(([, value]) => !value.pending)
          .sort((a, b) => a[1].checkedAt - b[1].checkedAt)[0];
        if (oldest) checks.delete(oldest[0]);
      }
      return pending;
    }

    function clear(recordingId) {
      const prefix = `${String(recordingId || "")}:`;
      for (const key of checks.keys()) {
        if (key.startsWith(prefix)) checks.delete(key);
      }
    }

    return Object.freeze({ check, clear });
  }

  return Object.freeze({ DEFAULT_RECHECK_MS, create });
});
