const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createService } = require("../services/licensing/server.js");
const tenant = "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb";
const unknown = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "t9-license-service-"));
  const registry = path.join(directory, "tenants.json");
  const timestamp = Date.parse("2026-09-15T12:00:00Z");
  await fs.writeFile(registry, JSON.stringify({ [tenant]: {
    enabled: true, expiresAt: "2026-12-31T23:59:59Z"
  } }));
  const server = await createService({ dataDirectory: directory, now: () => timestamp });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/v1/license/check`;
  const trialEndpoint = `http://127.0.0.1:${server.address().port}/v1/license/trial`;
  const value = { tenantId: tenant, installationId: unknown, version: "4.7.0" };
  const post = body => fetch(endpoint, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  try {
    assert.equal((await (await post(value)).json()).allowed, true);
    await Promise.all([post(value), post(value), post(value)]);
    const records = await fs.readFile(path.join(directory, "registrations.jsonl"), "utf8");
    assert.equal(records.trim().split("\n").length, 1);
    const unknownCheck = await (await post({ ...value, tenantId: unknown })).json();
    assert.equal(unknownCheck.allowed, false);
    assert.equal(unknownCheck.trialAvailable, true);
    const trialRequest = { ...value, tenantId: unknown, email: "User@Example.com" };
    const trial = await fetch(trialEndpoint, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(trialRequest) });
    assert.equal(trial.status, 200);
    assert.equal((await trial.json()).allowed, true);
    const tenantsAfterTrial = JSON.parse(await fs.readFile(registry, "utf8"));
    assert.equal(tenantsAfterTrial[unknown].contactEmail, "user@example.com");
    assert.equal(tenantsAfterTrial[unknown].licenseType, "trial");
    assert.equal((await fetch(trialEndpoint, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(trialRequest) })).status, 409);
    delete tenantsAfterTrial[unknown];
    await fs.writeFile(registry, JSON.stringify(tenantsAfterTrial));
    const afterDelete = await (await post({ ...value, tenantId: unknown })).json();
    assert.equal(afterDelete.allowed, false);
    assert.equal(afterDelete.trialAvailable, false);
    assert.equal((await fetch(trialEndpoint, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(trialRequest) })).status, 409);
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
