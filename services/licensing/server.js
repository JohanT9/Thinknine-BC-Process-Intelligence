const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { createAdmin } = require("./admin.js");
const { createEntraValidator } = require("./entra-validator.js");
const { createNotifier } = require("./notifications.js");
const { createDocumentUsage, validUsage } = require("./document-usage.js");
const { createAuditLog } = require("./audit-log.js");
const { createTableStorage } = require("./table-storage.js");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;
const MAX_BODY = 2048;
const ORGANIZATION_OBJECT_ID = "00000000-0000-0000-0000-000000000000";
const exact = (v, keys) => v && !Array.isArray(v) && Object.keys(v).sort().join() === [...keys].sort().join();
function validRequest(v) {
  return exact(v, ["installationId", "tenantId", "version"]) && GUID.test(v.installationId) &&
    GUID.test(v.tenantId) && typeof v.version === "string" && /^\d+\.\d+\.\d+$/.test(v.version);
}
function email(value) {
  const result = typeof value === "string" ? value.trim().toLowerCase() : "";
  return result.length <= 254 && EMAIL.test(result) && !/[\u0000-\u001f\u007f]/.test(result) ? result : "";
}
function validTrialRequest(v) {
  return exact(v, ["email", "installationId", "tenantId", "version"]) &&
    validRequest({ installationId: v.installationId, tenantId: v.tenantId, version: v.version }) && Boolean(email(v.email));
}
function validConsultantRegistration(v) {
  return exact(v, ["installationId", "version"]) && GUID.test(v.installationId) &&
    typeof v.version === "string" && /^\d+\.\d+\.\d+$/.test(v.version);
}

async function createService({ dataDirectory, now = Date.now, rateLimit = 120,
  initializeRegistry = false, adminKey = "", entraAudience = "",
  entraScope = "License.Check", fetcher = fetch, entraValidator = null,
  entraClientId = "", entraAdminRole = "License.Administrator", adminEntraValidator = null,
  notificationWebhookUrl = "", notificationWebhookToken = "",
  notificationRecipient = "", notifier = null, tableAccountUrl = "",
  managedIdentityClientId = "", migrateFromFiles = false }) {
  await fs.mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const registryFile = path.join(dataDirectory, "tenants.json");
  const claimsFile = path.join(dataDirectory, "trial-claims.json");
  const registrationsFile = path.join(dataDirectory, "registrations.jsonl");
  const consultantsFile = path.join(dataDirectory, "consultants.json");
  const tenantUsersFile = path.join(dataDirectory, "tenant-users.json");
  for (const file of initializeRegistry ? [registryFile, claimsFile, consultantsFile, tenantUsersFile]
    : [claimsFile, consultantsFile, tenantUsersFile]) {
    try { await fs.writeFile(file, "{}\n", { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  const storage = tableAccountUrl ? await createTableStorage({ accountUrl: tableAccountUrl,
    managedIdentityClientId }) : null;
  async function optionalJson(file) {
    try { return JSON.parse(await fs.readFile(file, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return {}; throw error; }
  }
  async function optionalLines(file) {
    try { return (await fs.readFile(file, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line)); }
    catch (error) { if (error.code === "ENOENT") return []; throw error; }
  }
  if (storage && migrateFromFiles) {
    const metadata = await storage.readMap("metadata");
    if (!metadata["file-v1-complete"]) {
      const verification = {};
      verification.tenants = await storage.importMap("tenants", await optionalJson(registryFile));
      verification.claims = await storage.importMap("claims", await optionalJson(claimsFile));
      verification.consultants = await storage.importMap("consultants", await optionalJson(consultantsFile));
      verification.documentUsage = await storage.importMap("documentUsage", await optionalJson(path.join(dataDirectory, "document-usage.json")));
      verification.tenantUsers = await storage.importMap("tenantUsers", await optionalJson(tenantUsersFile));
      const registrations = await optionalLines(registrationsFile);
      verification.registrations = await storage.importMap("registrations", Object.fromEntries(registrations.map(value =>
        [`${value.installationId}:${value.tenantId}`, value])));
      verification.audit = await storage.importList("audit", await optionalLines(path.join(dataDirectory, "audit.jsonl")));
      verification.notifications = await storage.importMap("notifications", await optionalJson(path.join(dataDirectory, "notification-state.json")));
      await storage.mutateMap("metadata", current => ({ updated: { ...current,
        "file-v1-complete": { completedAt: new Date(now()).toISOString(), source: dataDirectory,
          verification } } }));
    }
  }
  async function registry() {
    const value = storage ? await storage.readMap("tenants")
      : JSON.parse(await fs.readFile(registryFile, "utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid tenant registry");
    for (const [id, entry] of Object.entries(value)) if (!GUID.test(id) || !entry ||
      typeof entry.enabled !== "boolean" || !Number.isFinite(Date.parse(entry.expiresAt))) throw new Error("Invalid tenant license entry");
    return value;
  }
  async function claims() {
    const value = storage ? await storage.readMap("claims")
      : JSON.parse(await fs.readFile(claimsFile, "utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid trial claim registry");
    for (const [id, claim] of Object.entries(value)) if (!GUID.test(id) || !claim ||
      !/^[0-9a-f]{64}$/.test(claim.emailHash || "") || !GUID.test(claim.installationId || "") ||
      !Number.isFinite(Date.parse(claim.requestedAt)) || !Number.isFinite(Date.parse(claim.expiresAt))) throw new Error("Invalid trial claim");
    return value;
  }
  async function consultants() {
    const value = storage ? await storage.readMap("consultants")
      : JSON.parse(await fs.readFile(consultantsFile, "utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid consultant registry");
    for (const [id, entry] of Object.entries(value)) if (!/^[0-9a-f-]{36}:[0-9a-f-]{36}$/.test(id) ||
      !entry || typeof entry.enabled !== "boolean" || !Number.isFinite(Date.parse(entry.expiresAt))) {
      throw new Error("Invalid consultant license entry");
    }
    return value;
  }
  async function tenantUsers() {
    const value = storage ? await storage.readMap("tenantUsers")
      : JSON.parse(await fs.readFile(tenantUsersFile, "utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid tenant user registry");
    return value;
  }
  async function atomicWrite(file, value, backup = false) {
    if (backup) await fs.copyFile(file, file + ".backup");
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, file);
  }
  await registry(); await claims(); await consultants(); await tenantUsers();
  const audit = createAuditLog({ dataDirectory, now, storage });
  const recordAudit = event => audit.log(event)
    .catch(error => console.error("License audit failed:", error.message));
  const notifications = notifier || createNotifier({ dataDirectory,
    webhookUrl: notificationWebhookUrl, webhookToken: notificationWebhookToken,
    recipient: notificationRecipient, fetcher, now, storage,
    onDelivery: event => recordAudit({ actor: "system", action: event.success
      ? "notification-sent" : "notification-failed", entityType: "notification",
    entityId: event.entityId, details: { eventType: event.type,
      ...(event.success ? {} : { error: event.error }) } }) });
  const validateEntra = entraValidator || createEntraValidator({ audience: entraAudience,
    requiredScope: entraScope, fetcher, now });
  const validateAdminEntra = adminEntraValidator || createEntraValidator({ audience: entraAudience,
    requiredScope: entraScope, requiredRole: entraAdminRole, fetcher, now });
  let registryWrites = Promise.resolve();
  function mutateRegistry(action) {
    if (storage) return storage.mutateMap("tenants", action);
    const operation = registryWrites.then(async () => {
      const result = await action(await registry());
      if (result?.updated) await atomicWrite(registryFile, result.updated, true);
      return result?.value;
    });
    registryWrites = operation.catch(() => {}); return operation;
  }
  let consultantWrites = Promise.resolve();
  function mutateConsultants(action) {
    if (storage) return storage.mutateMap("consultants", action);
    const operation = consultantWrites.then(async () => {
      const result = await action(await consultants());
      if (result?.updated) await atomicWrite(consultantsFile, result.updated, true);
      return result?.value;
    });
    consultantWrites = operation.catch(() => {}); return operation;
  }
  let tenantUserWrites = Promise.resolve();
  function mutateTenantUsers(action) {
    if (storage) return storage.mutateMap("tenantUsers", action);
    const operation = tenantUserWrites.then(async () => {
      const result = await action(await tenantUsers());
      if (result?.updated) await atomicWrite(tenantUsersFile, result.updated, true);
      return result?.value;
    });
    tenantUserWrites = operation.catch(() => {}); return operation;
  }
  async function registrationEntries() {
    if (storage) return Object.values(await storage.readMap("registrations"))
      .sort((a, b) => String(a.registeredAt).localeCompare(String(b.registeredAt)));
    return optionalLines(registrationsFile);
  }
  const seen = new Set();
  try {
    for (const item of await registrationEntries()) {
      if (!GUID.test(item.installationId) || !GUID.test(item.tenantId)) throw new Error("Invalid registration log");
      seen.add(`${item.installationId}:${item.tenantId}`);
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  let registrationWrites = Promise.resolve();
  function register(v) {
    const operation = registrationWrites.then(async () => {
      const key = `${v.installationId}:${v.tenantId}`; if (seen.has(key)) return;
      const entry = { installationId: v.installationId,
        tenantId: v.tenantId, version: v.version, registeredAt: new Date(now()).toISOString(),
        event: "installation-tenant-registered" };
      if (storage) await storage.mutateMap("registrations", current => current[key]
        ? { value: current[key] } : { updated: { ...current, [key]: entry }, value: entry });
      else await fs.appendFile(registrationsFile, JSON.stringify(entry) + "\n", { mode: 0o600 });
      seen.add(key);
    });
    registrationWrites = operation.catch(() => {}); return operation;
  }
  let trialWrites = Promise.resolve();
  function deleteTrialClaim(tenantId) {
    const operation = trialWrites.then(async () => {
      if (storage) return storage.mutateMap("claims", allClaims => {
        if (!allClaims[tenantId]) return {};
        const updated = { ...allClaims }; delete updated[tenantId]; return { updated };
      });
      const allClaims = await claims(); if (!allClaims[tenantId]) return;
      const updated = { ...allClaims }; delete updated[tenantId];
      await atomicWrite(claimsFile, updated, true);
    });
    trialWrites = operation.catch(() => {});
    return operation;
  }
  function requestTrial(v) {
    const operation = trialWrites.then(async () => {
      const normalizedEmail = email(v.email);
      const emailHash = crypto.createHash("sha256").update(normalizedEmail).digest("hex");
      const allClaims = await claims(); const existing = allClaims[v.tenantId];
      if (existing) {
        const error = new Error("trial-already-used"); error.status = 409; throw error;
      }
      const requestedAt = new Date(now()).toISOString();
      const expiresAt = new Date(now() + 30 * 86400000).toISOString();
      const claim = { installationId: v.installationId, emailHash, requestedAt, expiresAt };
      if (storage) await storage.mutateMap("claims", current => {
        if (current[v.tenantId]) { const error = new Error("trial-already-used"); error.status = 409; throw error; }
        return { updated: { ...current, [v.tenantId]: claim } };
      });
      else await atomicWrite(claimsFile, { ...allClaims, [v.tenantId]: claim });
      const license = await mutateRegistry(current => {
        if (current[v.tenantId]) { const error = new Error("tenant-already-registered"); error.status = 409; throw error; }
        const entry = { name: "Testlicens", contactEmail: normalizedEmail, emailVerified: false,
          licenseType: "trial", trialStartedAt: requestedAt, enabled: true, expiresAt };
        return { updated: { ...current, [v.tenantId]: entry }, value: entry };
      });
      void notifications.send({ id: `new-trial:${v.tenantId}:${requestedAt}`,
        type: "trial-requested", entityId: v.tenantId,
        subject: "BC Process Studio: ny testlicens",
        text: `En ny 30-dagars testlicens har skapats för tenant ${v.tenantId} (${normalizedEmail}).` })
        .catch(() => {});
      void recordAudit({ actor: "public-api", action: "trial-created", entityType: "tenant",
        entityId: v.tenantId, details: { licenseType: "trial", expiresAt } });
      await register(v); return license;
    });
    trialWrites = operation.catch(() => {}); return operation;
  }
  const buckets = new Map();
  function throttled(address) {
    const minute = Math.floor(now() / 60000);
    for (const [key, value] of buckets) if (value.minute !== minute) buckets.delete(key);
    if (!buckets.has(address) && buckets.size >= 10000) return true;
    const bucket = buckets.get(address) || { minute, count: 0 }; bucket.count++;
    buckets.set(address, bucket); return bucket.count > rateLimit;
  }
  const usage = createDocumentUsage({ dataDirectory, storage, now });
  const admin = createAdmin({ dataDirectory, registry, mutateRegistry,
    consultants, mutateConsultants,
    tenantUsers, mutateTenantUsers, registrations: registrationEntries,
    deleteTrialClaim, now, adminKey, notificationConfigured: notifications.configured,
    auditEvents: audit.read, recordAudit, usageSummary: usage.summary,
    validateAdminEntra, entraClientId: entraClientId || entraAudience.replace(/^api:\/\//, ""),
    entraScope: entraAudience ? `${entraAudience.startsWith("api://") ? entraAudience : `api://${entraAudience}`}/${entraScope}` : "",
    entraAdminRole,
    sendTestNotification: () => notifications.send({
      id: `test:${new Date(now()).toISOString()}:${crypto.randomUUID()}`,
      type: "notification-test", entityId: "admin",
      subject: "BC Process Studio: test av licensnotifiering",
      text: `Testmeddelande från licensadministrationen ${new Date(now()).toISOString()}.`
    }) });
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://license.local").pathname;
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return admin(request, response);
    const reply = (status, value) => { response.writeHead(status, { "Content-Type": "application/json",
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); response.end(JSON.stringify(value)); };
    if (request.url === "/health" && request.method === "GET") {
      try { await registry(); await claims(); return reply(200, { status: "ok",
        storage: storage ? "azure-table" : "file" }); }
      catch { return reply(503, { status: "unavailable" }); }
    }
    if (!["/v1/license/usage", "/v1/license/check", "/v1/license/trial", "/v1/license/user/register", "/v1/license/consultant/check",
      "/v1/license/consultant/register"].includes(request.url)) return reply(404, { error: "not-found" });
    if (request.method !== "POST") return reply(405, { error: "method-not-allowed" });
    if (throttled(request.socket.remoteAddress)) return reply(429, { error: "rate-limit" });
    if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json") return reply(415, { error: "json-required" });
    try {
      let body = "", size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > MAX_BODY) {
        reply(413, { error: "body-too-large" }); request.resume(); return; } body += chunk.toString("utf8"); }
      let value; try { value = JSON.parse(body); } catch { return reply(400, { error: "invalid-json" }); }
      if (request.url === "/v1/license/usage") {
        if (!validUsage(value, now())) return reply(400, { error: "invalid-request" });
        try {
          const identity = await validateEntra(request.headers.authorization || "");
          const licenses = await consultants();
          const consultant = licenses[identity.tid + ":" + ORGANIZATION_OBJECT_ID] ||
            licenses[identity.tid + ":" + identity.oid];
          const active = license => license?.enabled && Date.parse(license.expiresAt) > now();
          const tenants = await registry();
          const registered = Object.values(await tenantUsers()).some(user =>
            user.entraTenantId === identity.tid && user.objectId === identity.oid && active(tenants[user.tenantId]));
          if (!active(consultant) && !registered) return reply(403, { error: "license-inactive" });
          return reply(200, await usage.record(identity, value));
        } catch (error) { return reply(error.status || 503, { error: error.message }); }
      }
      if (request.url === "/v1/license/user/register") {
        if (!validRequest(value)) return reply(400, { error: "invalid-request" });
        try {
          const identity = await validateEntra(request.headers.authorization || "");
          const tenantEntry = (await registry())[value.tenantId];
          if (!tenantEntry?.enabled || Date.parse(tenantEntry.expiresAt) <= now()) {
            return reply(403, { error: "tenant-license-inactive" });
          }
          const id = `${value.tenantId}:${identity.tid}:${identity.oid}`;
          const timestamp = new Date(now()).toISOString();
          const registration = await mutateTenantUsers(current => {
            const existing = current[id] || {};
            const updatedEntry = { tenantId: value.tenantId, entraTenantId: identity.tid,
              objectId: identity.oid, name: identity.name,
              email: email(identity.preferredUsername), installationId: value.installationId,
              version: value.version, firstSeenAt: existing.firstSeenAt || timestamp,
              lastSeenAt: timestamp };
            return { updated: { ...current, [id]: updatedEntry },
              value: { entry: updatedEntry, created: !current[id] } };
          });
          const entry = registration.entry;
          if (registration.created) void recordAudit({ actor: "microsoft-entra",
            action: "tenant-user-connected", entityType: "tenant", entityId: value.tenantId,
            details: { entraTenantId: identity.tid, objectId: identity.oid, name: identity.name } });
          return reply(200, { registered: true, tenantId: entry.tenantId,
            name: entry.name, email: entry.email });
        } catch (error) { return reply(error.status || 503, { error: error.message }); }
      }
      if (request.url === "/v1/license/consultant/register") {
        if (!validConsultantRegistration(value)) return reply(400, { error: "invalid-request" });
        try {
          const identity = await validateEntra(request.headers.authorization || "");
          const id = `${identity.tid}:${identity.oid}`;
          const organizationId = `${identity.tid}:${ORGANIZATION_OBJECT_ID}`;
          const result = await mutateConsultants(current => {
            const identityEmail = email(identity.preferredUsername);
            const inherited = current[organizationId] || Object.entries(current)
              .find(([key]) => key.startsWith(`${identity.tid}:`))?.[1];
            const organization = inherited || { name: identityEmail.split("@")[1] || "Nytt konsultföretag",
              email: identityEmail, enabled: false,
              expiresAt: new Date(now() + 365 * 86400000).toISOString(),
              requestedAt: new Date(now()).toISOString() };
            const user = { ...organization, name: identity.name || current[id]?.name || "",
              email: identityEmail || current[id]?.email || "", lastSeenAt: new Date(now()).toISOString() };
            return { updated: { ...current, [organizationId]: organization, [id]: user },
              value: { entry: organization, created: !inherited } };
          });
          const entry = result.entry;
          if (result.created) void notifications.send({
            id: `new-consultant:${identity.tid}:${entry.requestedAt}`,
            type: "consultant-requested", entityId: identity.tid,
            subject: "BC Process Studio: ny konsultlicens väntar",
            text: `${entry.name || identity.name || identity.tid} (${entry.email || "ingen e-post"}) väntar på aktivering.`
          }).catch(() => {});
          if (result.created) void recordAudit({ actor: "microsoft-entra",
            action: "consultant-requested", entityType: "consultant", entityId: identity.tid,
            details: { name: entry.name, expiresAt: entry.expiresAt } });
          const allowed = Boolean(entry.enabled && Date.parse(entry.expiresAt) > now());
          return reply(200, { allowed, status: allowed ? "active" : entry.enabled ? "expired" : "pending",
            expiresAt: entry.expiresAt, licenseType: "consultant", consultantName: entry.name });
        } catch (error) { return reply(error.status || 503, { error: error.message }); }
      }
      if (request.url === "/v1/license/consultant/check") {
        if (!validRequest(value)) return reply(400, { error: "invalid-request" });
        try {
          const identity = await validateEntra(request.headers.authorization || "");
          const allConsultants = await consultants();
          const entry = allConsultants[`${identity.tid}:${ORGANIZATION_OBJECT_ID}`] ||
            allConsultants[`${identity.tid}:${identity.oid}`];
          const allowed = Boolean(entry?.enabled && Date.parse(entry.expiresAt) > now());
          const status = !entry ? "unregistered" : !entry.enabled
            ? (entry.requestedAt ? "pending" : "blocked")
            : allowed ? "active" : "expired";
          return reply(200, { allowed, status,
            expiresAt: entry?.expiresAt || new Date(now() + 60000).toISOString(),
            licenseType: "consultant", consultantName: entry?.name || identity.name,
            targetTenantId: value.tenantId });
        } catch (error) { return reply(error.status || 503, { error: error.message }); }
      }
      if (request.url.endsWith("/trial")) {
        if (!validTrialRequest(value)) return reply(400, { error: "invalid-request" });
        try { const license = await requestTrial({ ...value, email: email(value.email) });
          return reply(200, { tenantId: value.tenantId, allowed: true, expiresAt: license.expiresAt });
        } catch (error) { if (error.status === 409) return reply(409, { error: error.message }); throw error; }
      }
      if (!validRequest(value)) return reply(400, { error: "invalid-request" });
      const tenants = await registry(), entry = tenants[value.tenantId];
      const allowed = Boolean(entry?.enabled && Date.parse(entry.expiresAt) > now());
      const licenseStatus = !entry ? "unregistered" : !entry.enabled ? "blocked"
        : Date.parse(entry.expiresAt) <= now() ? "expired" : "active";
      const trialAvailable = !entry && !(await claims())[value.tenantId];
      await register(value);
      return reply(200, { tenantId: value.tenantId, allowed, trialAvailable,
        licenseStatus, licenseType: entry ? (entry.licenseType || "standard") : null,
        expiresAt: entry ? entry.expiresAt : new Date(now() + 60000).toISOString() });
    } catch { return reply(503, { error: "service-unavailable" }); }
  });
  const scanNotifications = () => Promise.all([registry(), consultants()])
    .then(([tenantLicenses, consultantLicenses]) => notifications.scan(tenantLicenses, consultantLicenses))
    .catch(error => console.error("License notification scan failed:", error.message));
  void scanNotifications();
  const notificationTimer = setInterval(scanNotifications, 6 * 60 * 60 * 1000);
  notificationTimer.unref();
  server.on("close", () => clearInterval(notificationTimer));
  server.requestTimeout = 10000; server.headersTimeout = 10000; return server;
}

if (require.main === module) {
  const dataDirectory = process.env.LICENSE_DATA_DIRECTORY;
  if (!dataDirectory || !path.isAbsolute(dataDirectory)) {
    console.error("Set LICENSE_DATA_DIRECTORY to an absolute private data directory."); process.exitCode = 1;
  } else createService({ dataDirectory, initializeRegistry: true,
    adminKey: process.env.LICENSE_ADMIN_KEY || "",
    entraAudience: process.env.LICENSE_ENTRA_AUDIENCE || "",
    entraClientId: process.env.LICENSE_ENTRA_CLIENT_ID || "",
    entraScope: process.env.LICENSE_ENTRA_SCOPE || "License.Check",
    entraAdminRole: process.env.LICENSE_ENTRA_ADMIN_ROLE || "License.Administrator",
    notificationWebhookUrl: process.env.LICENSE_NOTIFICATION_WEBHOOK_URL || "",
    notificationWebhookToken: process.env.LICENSE_NOTIFICATION_WEBHOOK_TOKEN || "",
    notificationRecipient: process.env.LICENSE_NOTIFICATION_RECIPIENT || "",
    tableAccountUrl: process.env.LICENSE_TABLE_ACCOUNT_URL || "",
    managedIdentityClientId: process.env.LICENSE_MANAGED_IDENTITY_CLIENT_ID || "",
    migrateFromFiles: process.env.LICENSE_STORAGE_MIGRATE_FROM_FILES === "true" }).then(server => {
    const cloud = Boolean(process.env.WEBSITE_SITE_NAME);
    server.listen(Number(process.env.PORT || process.env.LICENSE_PORT) || 8787,
      cloud ? "0.0.0.0" : "127.0.0.1", () => console.log("License service started (HTTPS provided by deployment gateway)."));
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createService, validRequest, validTrialRequest,
  validConsultantRegistration };
