const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ORGANIZATION_OBJECT_ID = "00000000-0000-0000-0000-000000000000";
const hash = value => crypto.createHash("sha256").update(value).digest();

function buildActions(tenants, consultants, timestamp) {
  const organizations = new Map();
  for (const [id, license] of Object.entries(consultants || {})) {
    const [tenantId, objectId] = id.split(":");
    if (!organizations.has(tenantId) || objectId === ORGANIZATION_OBJECT_ID) {
      organizations.set(tenantId, license);
    }
  }
  const licenses = [
    ...Object.entries(tenants || {}).map(([id, license]) => ({ id, license, kind: "tenant" })),
    ...[...organizations].map(([id, license]) => ({ id, license, kind: "consultant" }))
  ];
  const actions = [];
  for (const { id, license, kind } of licenses) {
    const expires = Date.parse(license.expiresAt);
    const daysRemaining = Math.ceil((expires - timestamp) / 86400000);
    let actionType = "";
    if (!license.enabled && license.requestedAt) actionType = "pending";
    else if (license.enabled && daysRemaining <= 0) actionType = "expired";
    else if (license.enabled && daysRemaining <= 30) actionType = "expiring";
    if (actionType) actions.push({ id, kind, name: license.name || id, actionType,
      expiresAt: license.expiresAt, daysRemaining });
  }
  const priority = { pending: 0, expired: 1, expiring: 2 };
  return actions.sort((a, b) => priority[a.actionType] - priority[b.actionType] ||
    a.daysRemaining - b.daysRemaining || a.name.localeCompare(b.name));
}

function createAdmin({ dataDirectory, registry, mutateRegistry, deleteTrialClaim,
  consultants, mutateConsultants, tenantUsers, mutateTenantUsers, registrations = null, now, adminKey = "",
  usageSummary = async () => [], notificationConfigured = false, auditEvents = async () => [], recordAudit = async () => {},
  sendTestNotification = async () => ({ sent: false, configured: false }),
  validateAdminEntra = null, entraClientId = "", entraScope = "", entraAdminRole = "License.Administrator" }) {
  if (adminKey && !/^[0-9a-f]{64}$/i.test(adminKey)) {
    throw new Error("LICENSE_ADMIN_KEY must be a random 64-character hexadecimal key.");
  }
  const keyHash = adminKey ? hash(adminKey) : null;
  const registrationsFile = path.join(dataDirectory, "registrations.jsonl");
  const attempts = new Map();
  const assets = new Map([
    ["/admin", ["admin.html", "text/html; charset=utf-8"]],
    ["/admin/", ["admin.html", "text/html; charset=utf-8"]],
    ["/admin/admin.js", ["admin-ui.js", "text/javascript; charset=utf-8"]],
    ["/admin/admin.css", ["admin.css", "text/css; charset=utf-8"]]
  ]);
  function limited(address) {
    const minute = Math.floor(now() / 60000);
    for (const [key, entry] of attempts) if (entry.minute !== minute) attempts.delete(key);
    if (!attempts.has(address) && attempts.size >= 10000) return true;
    const entry = attempts.get(address) || { minute, count: 0 };
    attempts.set(address, entry);
    return ++entry.count > 60;
  }
  async function snapshot() {
    const tenants = await registry();
    const revision = hash(JSON.stringify(tenants)).toString("hex");
    const consultantLicenses = await consultants();
    const consultantRevision = hash(JSON.stringify(consultantLicenses)).toString("hex");
    const users = await tenantUsers();
    const events = await auditEvents(500);
    let registrationItems = [];
    if (registrations) registrationItems = await registrations();
    else try {
      registrationItems = (await fs.readFile(registrationsFile, "utf8"))
        .split("\n").filter(Boolean).map(line => JSON.parse(line));
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    return { revision, tenants, consultants: consultantLicenses, consultantRevision,
      actions: buildActions(tenants, consultantLicenses, now()), notificationConfigured,
      auditEvents: events, documentUsage: await usageSummary(),
      tenantUsers: Object.values(users).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)).slice(0, 1000),
      installationCount: registrationItems.length,
      registrations: registrationItems.slice(-500).reverse() };
  }
  async function handle(request, response) {
    const pathname = new URL(request.url, "http://license.local").pathname;
    const headers = {
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://login.microsoftonline.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    };
    function reply(status, value) {
      response.writeHead(status, { ...headers, "Content-Type": "application/json" });
      response.end(JSON.stringify(value));
    }
    try {
      const asset = assets.get(pathname);
      if (asset && request.method === "GET") {
        const bytes = await fs.readFile(path.join(__dirname, asset[0]));
        response.writeHead(200, { ...headers, "Content-Type": asset[1] });
        return response.end(bytes);
      }
      if (!pathname.startsWith("/admin/api/")) return reply(404, { error: "not-found" });
      if (pathname === "/admin/api/auth/config" && request.method === "GET") {
        return reply(200, { enabled: Boolean(entraClientId && entraScope), clientId: entraClientId,
          scope: entraScope, requiredRole: entraAdminRole, fallbackKeyEnabled: Boolean(keyHash) });
      }
      if (!keyHash && !(entraClientId && entraScope && validateAdminEntra)) {
        return reply(503, { error: "admin-not-configured" });
      }
      if (limited(request.socket.remoteAddress)) return reply(429, { error: "rate-limit" });
      const authorization = request.headers.authorization || "";
      const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      let adminActor = "";
      if (keyHash && supplied.length === 64 && /^[0-9a-f]{64}$/i.test(supplied) &&
          crypto.timingSafeEqual(hash(supplied), keyHash)) {
        adminActor = "administrator-key";
      } else if (entraClientId && entraScope && validateAdminEntra) {
        try {
          const identity = await validateAdminEntra(authorization);
          adminActor = `entra:${identity.preferredUsername || identity.oid}`;
        } catch { return reply(401, { error: "unauthorized" }); }
      } else {
        return reply(401, { error: "unauthorized" });
      }
      // No cookies, no CORS and no key in URL or browser persistent storage.
      if (pathname === "/admin/api/knowledge-access" && request.method === "GET") {
        return reply(200, { authorized: adminActor.startsWith("entra:") });
      }
      if (pathname === "/admin/api/state" && request.method === "GET") {
        return reply(200, await snapshot());
      }
      const saveConsultant = pathname === "/admin/api/consultant" && request.method === "POST";
      const deleteConsultant = pathname === "/admin/api/consultant" && request.method === "DELETE";
      const saveTenant = pathname === "/admin/api/tenant" && request.method === "POST";
      const deleteTenant = pathname === "/admin/api/tenant" && request.method === "DELETE";
      const resetTenant = pathname === "/admin/api/tenant/reset" && request.method === "POST";
      const testNotification = pathname === "/admin/api/notification/test" && request.method === "POST";
      if (!saveTenant && !deleteTenant && !resetTenant && !saveConsultant && !deleteConsultant && !testNotification) {
        return reply(405, { error: "method-not-allowed" });
      }
      if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
        return reply(415, { error: "json-required" });
      }
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 2048) { reply(413, { error: "body-too-large" }); request.resume(); return; }
        chunks.push(chunk);
      }
      let value;
      try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { return reply(400, { error: "invalid-json" }); }
      if (testNotification) {
        if (!value || Array.isArray(value) || Object.keys(value).length) {
          return reply(400, { error: "invalid-request" });
        }
        if (!notificationConfigured) return reply(409, { error: "notification-not-configured" });
        const result = await sendTestNotification();
        if (!result.sent) return reply(503, { error: "notification-failed" });
        return reply(200, await snapshot());
      }
      if (saveConsultant || deleteConsultant) {
        const baseValid = value && !Array.isArray(value) && GUID.test(value.entraTenantId || "") &&
          GUID.test(value.objectId || "") && /^[0-9a-f]{64}$/.test(value.revision || "");
        const expected = deleteConsultant ? "entraTenantId,objectId,revision"
          : "email,enabled,entraTenantId,expiresAt,name,objectId,revision";
        if (!baseValid || Object.keys(value).sort().join(",") !== expected ||
            (!deleteConsultant && (typeof value.name !== "string" || value.name.length > 100 ||
              typeof value.email !== "string" || value.email.length > 254 ||
              typeof value.enabled !== "boolean" || !Number.isFinite(Date.parse(value.expiresAt))))) {
          return reply(400, { error: "invalid-request" });
        }
        const result = await mutateConsultants(current => {
          const currentRevision = hash(JSON.stringify(current)).toString("hex");
          if (currentRevision !== value.revision) return { value: { conflict: true } };
          const updated = { ...current };
          if (deleteConsultant) {
            for (const key of Object.keys(updated)) if (key.startsWith(`${value.entraTenantId}:`)) delete updated[key];
          } else {
            const organization = { name: value.name.trim(), email: value.email.trim().toLowerCase(),
              enabled: value.enabled, expiresAt: new Date(value.expiresAt).toISOString() };
            updated[`${value.entraTenantId}:${ORGANIZATION_OBJECT_ID}`] = organization;
            for (const [key, entry] of Object.entries(updated)) {
              if (key.startsWith(`${value.entraTenantId}:`) && key !== `${value.entraTenantId}:${ORGANIZATION_OBJECT_ID}`) {
                updated[key] = { ...entry, enabled: organization.enabled, expiresAt: organization.expiresAt };
              }
            }
          }
          return { updated, value: {} };
        });
        if (result.conflict) return reply(409, { error: "registry-changed" });
        void recordAudit({ actor: adminActor,
          action: deleteConsultant ? "consultant-deleted" : "consultant-saved",
          entityType: "consultant", entityId: value.entraTenantId,
          details: deleteConsultant ? {} : { name: value.name.trim(), enabled: value.enabled,
            expiresAt: new Date(value.expiresAt).toISOString() } });
        return reply(200, await snapshot());
      }
      if (deleteTenant || resetTenant) {
        if (!value || Array.isArray(value) ||
            Object.keys(value).sort().join(",") !== "revision,tenantId" ||
            !GUID.test(value.tenantId) || typeof value.revision !== "string" ||
            !/^[0-9a-f]{64}$/.test(value.revision)) return reply(400, { error: "invalid-request" });
        const result = await mutateRegistry(async tenants => {
          const currentRevision = hash(JSON.stringify(tenants)).toString("hex");
          if (currentRevision !== value.revision) return { value: { conflict: true } };
          if (!tenants[value.tenantId]) return { value: { missing: true } };
          const updated = { ...tenants }; delete updated[value.tenantId];
          return { updated, value: {} };
        });
        if (result.conflict) return reply(409, { error: "registry-changed" });
        if (result.missing) return reply(404, { error: "not-found" });
        await mutateTenantUsers(users => ({ updated: Object.fromEntries(
          Object.entries(users).filter(([, user]) => user.tenantId !== value.tenantId)) }));
        if (resetTenant) await deleteTrialClaim(value.tenantId);
        void recordAudit({ actor: adminActor, action: resetTenant
          ? "tenant-trial-reset" : "tenant-deleted", entityType: "tenant",
        entityId: value.tenantId, details: {} });
        return reply(200, await snapshot());
      }
      if (!value || Array.isArray(value) ||
          Object.keys(value).sort().join(",") !== "contactEmail,enabled,expiresAt,licenseType,name,revision,tenantId" ||
          !GUID.test(value.tenantId) || typeof value.enabled !== "boolean" ||
          typeof value.name !== "string" || value.name.length > 100 ||
          /[\u0000-\u001f]/.test(value.name) ||
          typeof value.contactEmail !== "string" || value.contactEmail.length > 254 ||
          (value.contactEmail && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(value.contactEmail)) ||
          !["standard", "trial"].includes(value.licenseType) ||
          typeof value.revision !== "string" || !/^[0-9a-f]{64}$/.test(value.revision) ||
          typeof value.expiresAt !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.expiresAt) ||
          !Number.isFinite(Date.parse(value.expiresAt)) ||
          new Date(value.expiresAt).toISOString().slice(0, 19) !== value.expiresAt.slice(0, 19)) {
        return reply(400, { error: "invalid-request" });
      }
      const result = await mutateRegistry(async tenants => {
        const currentRevision = hash(JSON.stringify(tenants)).toString("hex");
        if (currentRevision !== value.revision) return { value: { conflict: true } };
        return { updated: { ...tenants, [value.tenantId]: {
          ...tenants[value.tenantId], name: value.name.trim(),
          contactEmail: value.contactEmail.trim().toLowerCase(),
          licenseType: value.licenseType,
          enabled: value.enabled, expiresAt: new Date(value.expiresAt).toISOString()
        } }, value: {} };
      });
      if (result.conflict) return reply(409, { error: "registry-changed" });
      void recordAudit({ actor: adminActor, action: "tenant-saved",
        entityType: "tenant", entityId: value.tenantId,
        details: { name: value.name.trim(), licenseType: value.licenseType,
          enabled: value.enabled, expiresAt: new Date(value.expiresAt).toISOString() } });
      return reply(200, await snapshot());
    } catch { return reply(503, { error: "service-unavailable" }); }
  }
  return handle;
}
module.exports = { createAdmin, buildActions };
