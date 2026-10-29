(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TenantLicense = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const KEY = "t9TenantLicenseV1";
  const CONSENT_KEY = "t9TenantLicenseNoticeV1";
  const NEGATIVE_CACHE_MS = 30 * 1000;
  // An idle license service takes about 20 seconds to start; a shorter limit makes the first
  // check of every browser session fail.
  const CHECK_TIMEOUT_MS = 30 * 1000;
  function tenantFromUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password ||
          url.hostname !== "businesscentral.dynamics.com") return "";
      const tenant = url.pathname.split("/").filter(Boolean)[0] || "";
      return GUID.test(tenant) ? tenant.toLowerCase() : "";
    } catch { return ""; }
  }
  function create({ storage, fetcher, config, version, authenticatedTrial, now = Date.now,
    uuid = () => crypto.randomUUID() }) {
    const pending = new Map();
    const pendingTrials = new Map();
    let queue = Promise.resolve();
    let storageWriteQueue = Promise.resolve();
    let installationPromise = null;
    function updateStoredLicense(update) {
      const operation = storageWriteQueue.then(async () => {
        const latest = (await storage.get(KEY))[KEY] || {};
        const next = update(latest);
        await storage.set({ [KEY]: next });
        return next;
      });
      storageWriteQueue = operation.catch(() => {});
      return operation;
    }
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
        throw new Error("license.acceptBeforeRecording");
      }
      const tenantId = tenantFromUrl(url);
      if (!tenantId) throw new Error("license.tenantUrlRequired");
      if (pending.has(tenantId)) return pending.get(tenantId);
      const operation = queue.then(() => verify(tenantId, options.force === true));
      queue = operation.catch(() => {});
      pending.set(tenantId, operation);
      try { return await operation; } finally { pending.delete(tenantId); }
    }
    function checkedEndpoint(value) {
      const endpoint = new URL(value);
      if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
          endpoint.search || endpoint.hash) throw new Error("license.invalidEndpoint");
      return endpoint;
    }
    async function identity() {
      const stored = (await storage.get(KEY))[KEY] || {};
      if (GUID.test(stored.installationId || "")) {
        return { stored, installationId: stored.installationId };
      }
      if (!installationPromise) {
        installationPromise = updateStoredLicense(latest => ({ ...latest,
          installationId: GUID.test(latest.installationId || "")
            ? latest.installationId : uuid() }))
          .then(value => ({ stored: value, installationId: value.installationId }))
          .finally(() => { installationPromise = null; });
      }
      return installationPromise;
    }
    async function installationId() { return (await identity()).installationId; }
    async function verify(tenantId, force = false) {
      const endpoint = checkedEndpoint(config.endpoint);
      const { stored, installationId } = await identity();
      const cached = stored.tenants?.[tenantId];
      const checkedAt = Number(cached?.checkedAt) || 0;
      const cacheMatchesEndpoint = cached?.endpoint === endpoint.href &&
        checkedAt <= now();
      const activeCacheFresh = cached?.allowed === true &&
        Number(cached.expiresAt) > now() && Number(cached.refreshAt) > now();
      const negativeCacheFresh = cached?.allowed !== true &&
        now() - checkedAt < NEGATIVE_CACHE_MS;
      if (!force && cacheMatchesEndpoint && (activeCacheFresh || negativeCacheFresh)) {
        return { ...cached, allowed: cached.allowed === true &&
          Number(cached.expiresAt) > now() };
      }
      // Never include URL, company, user identity, screenshots or recording data.
      let response;
      try {
        response = await fetcher(endpoint.href, {
          method: "POST", credentials: "omit", redirect: "error",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
          body: JSON.stringify({ installationId, tenantId, version })
        });
      } catch (cause) {
        const error = new Error("license.serviceUnavailable");
        error.code = cause?.name === "TimeoutError" ? "license-service-timeout" :
          "license-service-unreachable";
        throw error;
      }
      if (!response.ok) throw new Error("license.serviceUnavailable");
      const result = await response.json();
      const expiresAt = Date.parse(result.expiresAt);
      if (result.tenantId !== tenantId || typeof result.allowed !== "boolean" ||
          !Number.isFinite(expiresAt)) throw new Error("license.invalidResponse");
      const timestamp = now();
      const entry = { allowed: result.allowed && expiresAt > timestamp,
        trialAvailable: result.trialAvailable === true,
        licenseStatus: ["active", "expired", "blocked", "unregistered"].includes(result.licenseStatus)
          ? result.licenseStatus : result.allowed ? "active" : "unregistered",
        licenseType: ["standard", "trial"].includes(result.licenseType)
          ? result.licenseType : "",
        checkedAt: timestamp, expiresAt, endpoint: endpoint.href,
        refreshAt: Math.min(expiresAt, timestamp + 60 * 60 * 1000) };
      await updateStoredLicense(latest => ({ ...latest, installationId,
        tenants: { ...latest.tenants, [tenantId]: entry } }));
      return entry;
    }
    async function requestTrial(url) {
      if (!config.enabled) return { allowed: true, mode: "disabled" };
      if ((await information()).requiresAcceptance) throw new Error("license.acceptBeforeTrial");
      const tenantId = tenantFromUrl(url);
      if (!tenantId) throw new Error("license.trialTenantUrlRequired");
      if (pendingTrials.has(tenantId)) return pendingTrials.get(tenantId);
      const operation = activateTrial(tenantId);
      pendingTrials.set(tenantId, operation);
      try { return await operation; } finally { pendingTrials.delete(tenantId); }
    }
    async function activateTrial(tenantId) {
      if (typeof authenticatedTrial !== "function") throw new Error("license.trialSignInRequired");
      const { installationId } = await identity();
      const result = await authenticatedTrial({ tenantId, installationId, version });
      const expiresAt = Date.parse(result.expiresAt);
      if (result.tenantId !== tenantId || result.allowed !== true || !Number.isFinite(expiresAt) ||
          expiresAt <= now()) {
        throw new Error("license.invalidTrialResponse");
      }
      const timestamp = now();
      const entry = { allowed: expiresAt > timestamp, trialAvailable: false, checkedAt: timestamp,
        licenseStatus: "active", licenseType: "trial", expiresAt, endpoint: config.endpoint,
        refreshAt: Math.min(expiresAt, timestamp + 3600000) };
      await updateStoredLicense(latest => ({ ...latest, installationId,
        tenants: { ...latest.tenants, [tenantId]: entry } }));
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
  return Object.freeze({ create, tenantFromUrl, CHECK_TIMEOUT_MS });
});
