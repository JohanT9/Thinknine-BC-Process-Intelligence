(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TenantLicense = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const KEY = "t9TenantLicenseV1";
  const CONSENT_KEY = "t9TenantLicenseNoticeV1";
  function tenantFromUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password ||
          url.hostname !== "businesscentral.dynamics.com") return "";
      const tenant = url.pathname.split("/").filter(Boolean)[0] || "";
      return GUID.test(tenant) ? tenant.toLowerCase() : "";
    } catch { return ""; }
  }
  function create({ storage, fetcher, config, version, now = Date.now,
    uuid = () => crypto.randomUUID() }) {
    const pending = new Map();
    let queue = Promise.resolve();
    async function information() {
      const accepted = (await storage.get(CONSENT_KEY))[CONSENT_KEY];
      return { enabled: config.enabled, endpoint: config.endpoint,
        requiresAcceptance: Boolean(config.enabled && accepted?.endpoint !== config.endpoint) };
    }
    async function summaries() {
      const stored = (await storage.get(KEY))[KEY] || {};
      return Object.entries(stored.tenants || {}).map(([tenantId, entry]) => {
        const expired = Number(entry.expiresAt) <= now();
        return { tenantId, allowed: entry.allowed === true && !expired,
          trialAvailable: entry.trialAvailable === true,
          licenseStatus: expired && entry.licenseStatus === "active"
            ? "expired" : entry.licenseStatus || (entry.allowed ? "active" : "unregistered"),
          licenseType: entry.licenseType || "", expiresAt: Number(entry.expiresAt) || 0,
          checkedAt: Number(entry.checkedAt) || 0 };
      }).sort((a, b) => b.checkedAt - a.checkedAt);
    }
    async function acceptNotice() {
      await storage.set({ [CONSENT_KEY]: { endpoint: config.endpoint,
        acceptedAt: new Date(now()).toISOString() } });
    }
    async function check(url, options = {}) {
      if (!config.enabled) return { allowed: true, mode: "disabled" };
      if ((await information()).requiresAcceptance) {
        throw new Error("Bekräfta licensregistreringen i tilläggets popup innan du startar inspelningen.");
      }
      const tenantId = tenantFromUrl(url);
      if (!tenantId) throw new Error("Licensen kräver en Business Central-adress med tenant-ID.");
      if (pending.has(tenantId)) return pending.get(tenantId);
      const operation = queue.then(() => verify(tenantId, options.force === true));
      queue = operation.catch(() => {});
      pending.set(tenantId, operation);
      try { return await operation; } finally { pending.delete(tenantId); }
    }
    function checkedEndpoint(value) {
      const endpoint = new URL(value);
      if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
          endpoint.search || endpoint.hash) throw new Error("Ogiltig HTTPS-adress för licenstjänsten.");
      return endpoint;
    }
    async function identity() {
      const stored = (await storage.get(KEY))[KEY] || {};
      return { stored, installationId: GUID.test(stored.installationId || "")
        ? stored.installationId : uuid() };
    }
    async function installationId() { return (await identity()).installationId; }
    async function verify(tenantId, force = false) {
      const endpoint = checkedEndpoint(config.endpoint);
      const { stored, installationId } = await identity();
      const cached = stored.tenants?.[tenantId];
      if (!force && cached && cached.checkedAt <= now() && cached.refreshAt > now() &&
          cached.expiresAt > now() && cached.endpoint === endpoint.href &&
          cached.allowed === true) return cached;
      // Never include URL, company, user identity, screenshots or recording data.
      const response = await fetcher(endpoint.href, {
        method: "POST", credentials: "omit", redirect: "error",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ installationId, tenantId, version })
      });
      if (!response.ok) throw new Error("Licenstjänsten kunde inte nås. Försök igen senare.");
      const result = await response.json();
      const expiresAt = Date.parse(result.expiresAt);
      if (result.tenantId !== tenantId || typeof result.allowed !== "boolean" ||
          !Number.isFinite(expiresAt)) throw new Error("Licenstjänsten gav ett ogiltigt svar.");
      const timestamp = now();
      const entry = { allowed: result.allowed && expiresAt > timestamp,
        trialAvailable: result.trialAvailable === true,
        licenseStatus: ["active", "expired", "blocked", "unregistered"].includes(result.licenseStatus)
          ? result.licenseStatus : result.allowed ? "active" : "unregistered",
        licenseType: ["standard", "trial"].includes(result.licenseType)
          ? result.licenseType : "",
        checkedAt: timestamp, expiresAt, endpoint: endpoint.href,
        refreshAt: Math.min(expiresAt, timestamp + 60 * 60 * 1000) };
      // Re-read so concurrent checks for different tenants do not overwrite each other.
      const latest = (await storage.get(KEY))[KEY] || {};
      await storage.set({ [KEY]: { installationId,
        tenants: { ...latest.tenants, [tenantId]: entry } } });
      return entry;
    }
    async function requestTrial(url, email) {
      if (!config.enabled) return { allowed: true, mode: "disabled" };
      if ((await information()).requiresAcceptance) throw new Error("Bekräfta licensregistreringen innan du begär en testlicens.");
      const tenantId = tenantFromUrl(url);
      if (!tenantId) throw new Error("Testlicensen kräver en Business Central-adress med tenant-ID.");
      const address = String(email || "").trim().toLowerCase();
      if (address.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(address)) {
        throw new Error("Ange en giltig e-postadress.");
      }
      const endpoint = checkedEndpoint(config.trialEndpoint);
      const { stored, installationId } = await identity();
      const response = await fetcher(endpoint.href, { method: "POST", credentials: "omit",
        redirect: "error", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000), body: JSON.stringify({
          email: address, installationId, tenantId, version }) });
      if (!response.ok) {
        if (response.status === 409) throw new Error("Denna tenant har redan använt eller fått en testlicens.");
        throw new Error("Testlicensen kunde inte skapas. Försök igen senare.");
      }
      const result = await response.json(); const expiresAt = Date.parse(result.expiresAt);
      if (result.tenantId !== tenantId || result.allowed !== true || !Number.isFinite(expiresAt)) {
        throw new Error("Licenstjänsten gav ett ogiltigt svar.");
      }
      const timestamp = now();
      const entry = { allowed: expiresAt > timestamp, trialAvailable: false, checkedAt: timestamp,
        licenseStatus: "active", licenseType: "trial", expiresAt, endpoint: config.endpoint,
        refreshAt: Math.min(expiresAt, timestamp + 3600000) };
      await storage.set({ [KEY]: { installationId,
        tenants: { ...stored.tenants, [tenantId]: entry } } });
      return entry;
    }
    async function requireLicense(url) {
      const result = await check(url);
      if (!result.allowed) throw new Error("Denna Business Central-tenant saknar en aktiv BC Process Studio-licens.");
      return result;
    }
    return Object.freeze({ check, requestTrial, requireLicense, information,
      summaries, installationId, acceptNotice });
  }
  return Object.freeze({ create, tenantFromUrl });
});
