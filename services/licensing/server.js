const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { createAdmin } = require("./admin.js");
const { createEntraValidator } = require("./entra-validator.js");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;
const MAX_BODY = 2048;
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

async function createService({ dataDirectory, now = Date.now, rateLimit = 120,
  initializeRegistry = false, adminKey = "", entraAudience = "",
  entraScope = "License.Check", fetcher = fetch }) {
  await fs.mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const registryFile = path.join(dataDirectory, "tenants.json");
  const claimsFile = path.join(dataDirectory, "trial-claims.json");
  const registrationsFile = path.join(dataDirectory, "registrations.jsonl");
  const consultantsFile = path.join(dataDirectory, "consultants.json");
  for (const file of initializeRegistry ? [registryFile, claimsFile, consultantsFile]
    : [claimsFile, consultantsFile]) {
    try { await fs.writeFile(file, "{}\n", { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  async function registry() {
    const value = JSON.parse(await fs.readFile(registryFile, "utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid tenant registry");
    for (const [id, entry] of Object.entries(value)) if (!GUID.test(id) || !entry ||
      typeof entry.enabled !== "boolean" || !Number.isFinite(Date.parse(entry.expiresAt))) throw new Error("Invalid tenant license entry");
    return value;
  }
  async function claims() {
    const value = JSON.parse(await fs.readFile(claimsFile, "utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid trial claim registry");
    for (const [id, claim] of Object.entries(value)) if (!GUID.test(id) || !claim ||
      !/^[0-9a-f]{64}$/.test(claim.emailHash || "") || !GUID.test(claim.installationId || "") ||
      !Number.isFinite(Date.parse(claim.requestedAt)) || !Number.isFinite(Date.parse(claim.expiresAt))) throw new Error("Invalid trial claim");
    return value;
  }
  async function consultants() {
    const value = JSON.parse(await fs.readFile(consultantsFile, "utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid consultant registry");
    for (const [id, entry] of Object.entries(value)) if (!/^[0-9a-f-]{36}:[0-9a-f-]{36}$/.test(id) ||
      !entry || typeof entry.enabled !== "boolean" || !Number.isFinite(Date.parse(entry.expiresAt))) {
      throw new Error("Invalid consultant license entry");
    }
    return value;
  }
  async function atomicWrite(file, value, backup = false) {
    if (backup) await fs.copyFile(file, file + ".backup");
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, file);
  }
  await registry(); await claims(); await consultants();
  const validateEntra = createEntraValidator({ audience: entraAudience,
    requiredScope: entraScope, fetcher, now });
  let registryWrites = Promise.resolve();
  function mutateRegistry(action) {
    const operation = registryWrites.then(async () => {
      const result = await action(await registry());
      if (result?.updated) await atomicWrite(registryFile, result.updated, true);
      return result?.value;
    });
    registryWrites = operation.catch(() => {}); return operation;
  }
  let consultantWrites = Promise.resolve();
  function mutateConsultants(action) {
    const operation = consultantWrites.then(async () => {
      const result = await action(await consultants());
      if (result?.updated) await atomicWrite(consultantsFile, result.updated, true);
      return result?.value;
    });
    consultantWrites = operation.catch(() => {}); return operation;
  }
  const seen = new Set();
  try {
    for (const line of (await fs.readFile(registrationsFile, "utf8")).split("\n").filter(Boolean)) {
      const item = JSON.parse(line);
      if (!GUID.test(item.installationId) || !GUID.test(item.tenantId)) throw new Error("Invalid registration log");
      seen.add(`${item.installationId}:${item.tenantId}`);
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  let registrationWrites = Promise.resolve();
  function register(v) {
    const operation = registrationWrites.then(async () => {
      const key = `${v.installationId}:${v.tenantId}`; if (seen.has(key)) return;
      await fs.appendFile(registrationsFile, JSON.stringify({ installationId: v.installationId,
        tenantId: v.tenantId, version: v.version, registeredAt: new Date(now()).toISOString(),
        event: "installation-tenant-registered" }) + "\n", { mode: 0o600 });
      seen.add(key);
    });
    registrationWrites = operation.catch(() => {}); return operation;
  }
  let trialWrites = Promise.resolve();
  function deleteTrialClaim(tenantId) {
    const operation = trialWrites.then(async () => {
      const allClaims = await claims();
      if (!allClaims[tenantId]) return;
      const updated = { ...allClaims };
      delete updated[tenantId];
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
      await atomicWrite(claimsFile, { ...allClaims, [v.tenantId]: {
        installationId: v.installationId, emailHash, requestedAt, expiresAt } });
      const license = await mutateRegistry(current => {
        if (current[v.tenantId]) { const error = new Error("tenant-already-registered"); error.status = 409; throw error; }
        const entry = { name: "Testlicens", contactEmail: normalizedEmail, emailVerified: false,
          licenseType: "trial", trialStartedAt: requestedAt, enabled: true, expiresAt };
        return { updated: { ...current, [v.tenantId]: entry }, value: entry };
      });
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
  const admin = createAdmin({ dataDirectory, registry, mutateRegistry,
    consultants, mutateConsultants,
    deleteTrialClaim, now, adminKey });
  const server = http.createServer(async (request, response) => {
    if (request.url === "/admin" || request.url.startsWith("/admin/")) return admin(request, response);
    const reply = (status, value) => { response.writeHead(status, { "Content-Type": "application/json",
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); response.end(JSON.stringify(value)); };
    if (request.url === "/health" && request.method === "GET") {
      try { await registry(); await claims(); return reply(200, { status: "ok" }); }
      catch { return reply(503, { status: "unavailable" }); }
    }
    if (!["/v1/license/check", "/v1/license/trial", "/v1/license/consultant/check"].includes(request.url)) return reply(404, { error: "not-found" });
    if (request.method !== "POST") return reply(405, { error: "method-not-allowed" });
    if (throttled(request.socket.remoteAddress)) return reply(429, { error: "rate-limit" });
    if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json") return reply(415, { error: "json-required" });
    try {
      let body = "", size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > MAX_BODY) {
        reply(413, { error: "body-too-large" }); request.resume(); return; } body += chunk.toString("utf8"); }
      let value; try { value = JSON.parse(body); } catch { return reply(400, { error: "invalid-json" }); }
      if (request.url === "/v1/license/consultant/check") {
        if (!validRequest(value)) return reply(400, { error: "invalid-request" });
        try {
          const identity = await validateEntra(request.headers.authorization || "");
          const entry = (await consultants())[`${identity.tid}:${identity.oid}`];
          const allowed = Boolean(entry?.enabled && Date.parse(entry.expiresAt) > now());
          return reply(200, { allowed, expiresAt: entry?.expiresAt || new Date(now() + 60000).toISOString(),
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
  server.requestTimeout = 10000; server.headersTimeout = 10000; return server;
}

if (require.main === module) {
  const dataDirectory = process.env.LICENSE_DATA_DIRECTORY;
  if (!dataDirectory || !path.isAbsolute(dataDirectory)) {
    console.error("Set LICENSE_DATA_DIRECTORY to an absolute private data directory."); process.exitCode = 1;
  } else createService({ dataDirectory, initializeRegistry: true,
    adminKey: process.env.LICENSE_ADMIN_KEY || "",
    entraAudience: process.env.LICENSE_ENTRA_AUDIENCE || "",
    entraScope: process.env.LICENSE_ENTRA_SCOPE || "License.Check" }).then(server => {
    const cloud = Boolean(process.env.WEBSITE_SITE_NAME);
    server.listen(Number(process.env.PORT || process.env.LICENSE_PORT) || 8787,
      cloud ? "0.0.0.0" : "127.0.0.1", () => console.log("License service started (HTTPS provided by deployment gateway)."));
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createService, validRequest, validTrialRequest };
