const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { createService } = require("../services/licensing/server.js");
const tenant = "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb";
const second = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const trialTenant = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "t9-license-admin-"));
  const file = path.join(directory, "tenants.json");
  const original = { [tenant]: { enabled: true, expiresAt: "2026-12-31T23:59:59Z" } };
  await fs.writeFile(file, JSON.stringify(original));
  const key = crypto.randomBytes(32).toString("hex");
  const server = await createService({ dataDirectory: directory, adminKey: key });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (route, secret = key) => fetch(base + route, {
    headers: secret ? { Authorization: "Bearer " + secret } : {}
  });
  const save = value => fetch(base + "/admin/api/tenant", { method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(value) });
  try {
    assert.equal((await get("/admin/api/state", "")).status, 401);
    assert.equal((await get("/admin/api/state", "0".repeat(64))).status, 401);
    const page = await get("/admin", "");
    assert.equal(page.status, 200);
    assert.ok(page.headers.get("content-security-policy").includes("frame-ancestors 'none'"));
    assert.ok(!(await page.text()).includes(key));
    assert.equal((await get("/admin/../tenants.json", "")).status, 404);
    assert.equal((await get("/admin/admin.js", "")).status, 200);
    let state = await (await get("/admin/api/state")).json();
    assert.deepEqual(state.tenants, original);
    const edit = { tenantId: tenant, name: "Salico UAT", contactEmail: "admin@example.com",
      licenseType: "standard", enabled: false,
      expiresAt: "2026-12-31T23:59:59Z", revision: state.revision };
    assert.equal((await save({ ...edit, tenantId: "__proto__" })).status, 400);
    assert.equal((await save({ ...edit, expiresAt: "2026-02-30T12:00:00Z" })).status, 400);
    assert.equal((await save({ ...edit, name: "x".repeat(101) })).status, 400);
    assert.equal((await save({ ...edit, secret: true })).status, 400);
    const saved = await save(edit);
    assert.equal(saved.status, 200);
    state = await saved.json();
    assert.equal(state.tenants[tenant].enabled, false);
    assert.equal(state.tenants[tenant].name, "Salico UAT");
    assert.equal(state.tenants[tenant].contactEmail, "admin@example.com");
    assert.equal(state.tenants[tenant].licenseType, "standard");
    assert.equal((await save({ ...edit, revision: state.revision,
      licenseType: "unsupported" })).status, 400);
    assert.deepEqual(JSON.parse(await fs.readFile(file + ".backup", "utf8")), original);
    assert.equal((await save(edit)).status, 409);
    const responses = await Promise.all([
      save({ ...edit, tenantId: second, revision: state.revision }),
      save({ ...edit, enabled: true, revision: state.revision })
    ]);
    assert.deepEqual(responses.map(value => value.status).sort(), [200, 409]);
    const result = await fetch(base + "/v1/license/check", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        tenantId: tenant, installationId: second, version: "4.7.0"
      }) });
    assert.equal(result.status, 200);
    state = await (await get("/admin/api/state")).json();
    assert.equal(state.registrations.length, 1);
    assert.equal(state.installationCount, 1);
    const trialResponse = await fetch(base + "/v1/license/trial", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        tenantId: trialTenant, installationId: second, version: "4.7.0",
        email: "trial@example.com"
      }) });
    assert.equal(trialResponse.status, 200);
    state = await (await get("/admin/api/state")).json();
    assert.equal(state.tenants[trialTenant].licenseType, "trial");
    const reset = await fetch(base + "/admin/api/tenant/reset", { method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: trialTenant, revision: state.revision }) });
    assert.equal(reset.status, 200);
    state = await reset.json();
    assert.equal(state.tenants[trialTenant], undefined);
    const checkAfterReset = await fetch(base + "/v1/license/check", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        tenantId: trialTenant, installationId: second, version: "4.7.0"
      }) });
    assert.equal((await checkAfterReset.json()).trialAvailable, true);
    const deletion = await fetch(base + "/admin/api/tenant", { method: "DELETE",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant, revision: state.revision }) });
    assert.equal(deletion.status, 200);
    state = await deletion.json();
    assert.equal(state.tenants[tenant], undefined);
    await assert.rejects(createService({ dataDirectory: directory, adminKey: "weak" }), /64-character/);
    console.log("Tenant license admin protection, editing and conflict tests passed.");
  } finally { await new Promise(resolve => server.close(resolve)); }
  const disabled = await createService({ dataDirectory: directory });
  await new Promise(resolve => disabled.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${disabled.address().port}/admin/api/state`);
    assert.equal(response.status, 503);
  } finally { await new Promise(resolve => disabled.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
