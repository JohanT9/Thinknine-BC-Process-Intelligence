const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createService } = require("../services/licensing/server.js");
const tenant = "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb";
const unknown = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const otherInstallation = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "t9-license-service-"));
  const registry = path.join(directory, "tenants.json");
  const timestamp = Date.parse("2026-09-15T12:00:00Z");
  await fs.writeFile(registry, JSON.stringify({ [tenant]: {
    enabled: true, expiresAt: "2026-12-31T23:59:59Z"
  } }));
  const server = await createService({ dataDirectory: directory, now: () => timestamp,
    entraValidator: async authorization => {
      if (authorization !== "Bearer signed-in") {
        const error = new Error("unauthorized"); error.status = 401; throw error;
      }
      return { tid: unknown, oid: otherInstallation,
        name: "Tenant User", preferredUsername: "user@example.com" };
    } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/v1/license/check`;
  const trialEndpoint = `http://127.0.0.1:${server.address().port}/v1/license/trial`;
  const userEndpoint = `http://127.0.0.1:${server.address().port}/v1/license/user/register`;
  const extensionOrigin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";
  const edgeExtensionOrigin = "extension://abcdefghijklmnopabcdefghijklmnop";
  const value = { tenantId: tenant, installationId: unknown, version: "4.7.0" };
  const post = body => fetch(endpoint, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  try {
    const preflight = await fetch(trialEndpoint, { method: "OPTIONS", headers: {
      Origin: extensionOrigin, "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type" } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), extensionOrigin);
    assert.equal(preflight.headers.get("access-control-allow-methods"), "POST, OPTIONS");
    assert.equal(preflight.headers.get("access-control-allow-headers"), "Authorization, Content-Type");
    const edgePreflight = await fetch(trialEndpoint, { method: "OPTIONS", headers: {
      Origin: edgeExtensionOrigin, "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type" } });
    assert.equal(edgePreflight.status, 204);
    assert.equal(edgePreflight.headers.get("access-control-allow-origin"), edgeExtensionOrigin);
    const blockedPreflight = await fetch(trialEndpoint, { method: "OPTIONS", headers: {
      Origin: "https://example.com", "Access-Control-Request-Method": "POST" } });
    assert.equal(blockedPreflight.status, 403);
    assert.equal((await (await post(value)).json()).allowed, true);
    const userRegistration = await fetch(userEndpoint, { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer signed-in" },
      body: JSON.stringify(value) });
    assert.equal(userRegistration.status, 200);
    assert.equal((await userRegistration.json()).email, "user@example.com");
    const tenantUsers = JSON.parse(await fs.readFile(path.join(directory, "tenant-users.json"), "utf8"));
    const registeredUser = Object.values(tenantUsers)[0];
    assert.equal(registeredUser.tenantId, tenant);
    assert.equal(registeredUser.name, "Tenant User");
    assert.equal(registeredUser.firstSeenAt, registeredUser.lastSeenAt);
    await Promise.all([post(value), post(value), post(value)]);
    assert.equal((await (await post({ ...value,
      installationId: otherInstallation })).json()).allowed, true);
    const records = await fs.readFile(path.join(directory, "registrations.jsonl"), "utf8");
    assert.equal(records.trim().split("\n").length, 2);
    const unknownCheck = await (await post({ ...value, tenantId: unknown })).json();
    assert.equal(unknownCheck.allowed, false);
    assert.equal(unknownCheck.trialAvailable, true);
    const trialRequest = { ...value, tenantId: unknown };
    const unauthorizedTrial = await fetch(trialEndpoint, { method: "POST",
      headers: { Origin: extensionOrigin, "Content-Type": "application/json" },
      body: JSON.stringify(trialRequest) });
    assert.equal(unauthorizedTrial.status, 401);
    assert.equal(unauthorizedTrial.headers.get("access-control-allow-origin"), extensionOrigin);
    const trial = await fetch(trialEndpoint, { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer signed-in" },
      body: JSON.stringify(trialRequest) });
    assert.equal(trial.status, 200);
    assert.equal((await trial.json()).allowed, true);
    const tenantsAfterTrial = JSON.parse(await fs.readFile(registry, "utf8"));
    assert.equal(tenantsAfterTrial[unknown].contactEmail, "user@example.com");
    assert.equal(tenantsAfterTrial[unknown].licenseType, "trial");
    const usersAfterTrial = JSON.parse(await fs.readFile(path.join(directory, "tenant-users.json"), "utf8"));
    assert.ok(Object.values(usersAfterTrial).some(user => user.tenantId === unknown &&
      user.email === "user@example.com"));
    assert.equal((await fetch(trialEndpoint, { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer signed-in" },
      body: JSON.stringify(trialRequest) })).status, 409);
    const noEmailTenant = "cccccccc-dddd-eeee-ffff-000000000000";
    const noEmailTrial = await fetch(trialEndpoint, { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer signed-in" },
      body: JSON.stringify({ ...value, tenantId: noEmailTenant }) });
    assert.equal(noEmailTrial.status, 200);
    const registryAfterNoEmail = JSON.parse(await fs.readFile(registry, "utf8"));
    assert.equal(registryAfterNoEmail[noEmailTenant].licenseType, "trial");
    assert.equal(registryAfterNoEmail[noEmailTenant].contactEmail, "user@example.com");
    delete tenantsAfterTrial[unknown];
    await fs.writeFile(registry, JSON.stringify(tenantsAfterTrial));
    const afterDelete = await (await post({ ...value, tenantId: unknown })).json();
    assert.equal(afterDelete.allowed, false);
    assert.equal(afterDelete.trialAvailable, false);
    assert.equal((await fetch(trialEndpoint, { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer signed-in" },
      body: JSON.stringify(trialRequest) })).status, 409);
    assert.equal((await post({ ...value, company: "private" })).status, 400);
    assert.equal((await post({ ...value, tenantId: "invalid" })).status, 400);
    assert.equal((await post({ ...value, version: "x".repeat(3000) })).status, 413);
    await fs.writeFile(registry, JSON.stringify({ [tenant]: {
      enabled: false, expiresAt: "2026-12-31T23:59:59Z"
    } }));
    assert.equal((await (await post(value)).json()).allowed, false);
    await fs.writeFile(registry, JSON.stringify({ [tenant]: {
      enabled: true, expiresAt: "2020-01-01T00:00:00Z"
    } }));
    assert.equal((await (await post(value)).json()).allowed, false);
    await fs.writeFile(registry, "invalid");
    assert.equal((await post(value)).status, 503);
    console.log("Tenant license service tests passed.");
  } finally {
    await new Promise(resolve => server.close(resolve));
    // Test data intentionally retained in the OS temp directory for diagnosis.
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
