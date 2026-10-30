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
  const notificationEvents = [];
  const notifier = { configured: true, scan: async () => {},
    send: async event => { notificationEvents.push(event); return { sent: true }; } };
  const server = await createService({ dataDirectory: directory, adminKey: key, notifier,
    entraValidator: async authorization => {
      if (authorization !== "Bearer signed-in") {
        const error = new Error("unauthorized"); error.status = 401; throw error;
      }
      return { tid: tenant, oid: second, name: "Trial User", preferredUsername: "trial@example.com" };
    } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (route, secret = key) => fetch(base + route, {
    headers: secret ? { Authorization: "Bearer " + secret } : {}
  });
  const save = value => fetch(base + "/admin/api/tenant", { method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(value) });
  const post = (route, value) => fetch(base + route, { method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(value) });
  const saveConsultant = value => fetch(base + "/admin/api/consultant", { method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(value) });
  try {
    assert.equal((await get("/admin/api/state", "")).status, 401);
    assert.equal((await get("/admin/api/state", "0".repeat(64))).status, 401);
    const page = await get("/admin", "");
    assert.equal(page.status, 200);
    assert.ok(page.headers.get("content-security-policy").includes("frame-ancestors 'none'"));
    assert.ok(!(await page.text()).includes(key));
    const oauthReturnPage = await get("/admin?code=test&state=test", "");
    assert.equal(oauthReturnPage.status, 200);
    assert.match(await oauthReturnPage.text(), /Administratörsåtkomst/);
    assert.equal((await get("/admin/../tenants.json", "")).status, 404);
    assert.equal((await get("/admin/admin.js", "")).status, 200);
    assert.equal((await get("/admin/admin-i18n.js", "")).status, 200);
    let state = await (await get("/admin/api/state")).json();
    assert.deepEqual(state.tenants, original);
    assert.equal(state.notificationConfigured, true);
    const testNotification = await fetch(base + "/admin/api/notification/test", { method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(testNotification.status, 200);
    assert.equal(notificationEvents[0].type, "notification-test");
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
      headers: { "Content-Type": "application/json", Authorization: "Bearer signed-in" },
      body: JSON.stringify({ tenantId: trialTenant, installationId: second, version: "4.7.0" }) });
    assert.equal(trialResponse.status, 200);
    state = await (await get("/admin/api/state")).json();
    assert.equal(state.tenants[trialTenant].licenseType, "trial");
    assert.ok(Date.parse(state.tenants[trialTenant].expiresAt) > Date.now() + 29 * 86400000);
    assert.ok(Date.parse(state.tenants[trialTenant].expiresAt) <= Date.now() + 30 * 86400000);
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
    // Deleted licenses are kept and can be restored with their users and trial claim.
    assert.equal(state.deletedLicenses.length, 2);
    const deletedTenant = state.deletedLicenses.find(item => item.entityId === tenant);
    const deletedTrial = state.deletedLicenses.find(item => item.entityId === trialTenant);
    assert.equal(deletedTenant.action, "tenant-deleted");
    assert.equal(deletedTenant.name, "Salico UAT");
    assert.equal(deletedTenant.deletedBy, "administrator-key");
    assert.ok(Date.parse(deletedTenant.purgeAfter) > Date.now() + 29 * 86400000);
    assert.equal(deletedTrial.action, "tenant-trial-reset");
    assert.equal(deletedTrial.restoresTrialClaim, true);
    assert.equal(deletedTrial.users, 1);
    assert.equal((await post("/admin/api/deleted/restore", { id: "not-an-id" })).status, 400);
    assert.equal((await post("/admin/api/deleted/restore", { id: deletedTrial.id, extra: 1 })).status, 400);
    const restored = await post("/admin/api/deleted/restore", { id: deletedTrial.id });
    assert.equal(restored.status, 200);
    state = await restored.json();
    assert.equal(state.tenants[trialTenant].licenseType, "trial");
    assert.equal(state.tenantUsers.filter(user => user.tenantId === trialTenant).length, 1);
    assert.deepEqual(state.deletedLicenses.map(item => item.id), [deletedTenant.id]);
    const checkAfterRestore = await (await fetch(base + "/v1/license/check", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        tenantId: trialTenant, installationId: second, version: "4.7.0" }) })).json();
    assert.equal(checkAfterRestore.allowed, true);
    assert.equal(checkAfterRestore.trialAvailable, false);
    assert.equal((await post("/admin/api/deleted/restore", { id: deletedTrial.id })).status, 404);
    // A license created again under the same ID is never overwritten by a restore.
    const recreated = await save({ ...edit, name: "Ny Salico", revision: state.revision });
    assert.equal(recreated.status, 200);
    state = await recreated.json();
    assert.equal((await post("/admin/api/deleted/restore", { id: deletedTenant.id })).status, 409);
    assert.equal((await (await get("/admin/api/state")).json()).tenants[tenant].name, "Ny Salico");
    const purged = await post("/admin/api/deleted/purge", { id: deletedTenant.id });
    assert.equal(purged.status, 200);
    state = await purged.json();
    assert.equal(state.deletedLicenses.length, 0);
    const staleDeletion = await fetch(base + "/admin/api/tenant", { method: "DELETE",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant, revision: "0".repeat(64) }) });
    assert.equal(staleDeletion.status, 409);
    state = await (await get("/admin/api/state")).json();
    assert.equal(state.deletedLicenses.length, 0);
    assert.equal(state.tenants[tenant].name, "Ny Salico");
    // Notes are optional: saved when sent, kept when omitted and removed when empty.
    const current = state.tenants[tenant];
    const tenantEdit = { tenantId: tenant, name: current.name, contactEmail: current.contactEmail,
      licenseType: current.licenseType, enabled: current.enabled, expiresAt: current.expiresAt };
    assert.equal((await save({ ...tenantEdit, notes: "x".repeat(2001), revision: state.revision })).status, 400);
    assert.equal((await save({ ...tenantEdit, notes: "bad\u0000", revision: state.revision })).status, 400);
    state = await (await save({ ...tenantEdit, notes: "  Avtal till 2027.\nKontakt: Anna  ",
      revision: state.revision })).json();
    assert.equal(state.tenants[tenant].notes, "Avtal till 2027.\nKontakt: Anna");
    state = await (await save({ ...tenantEdit, name: "Salico", revision: state.revision })).json();
    assert.equal(state.tenants[tenant].notes, "Avtal till 2027.\nKontakt: Anna");
    state = await (await save({ ...tenantEdit, notes: "", revision: state.revision })).json();
    assert.equal("notes" in state.tenants[tenant], false);
    // The download holds every dataset and is logged; it needs the administrator.
    assert.equal((await get("/admin/api/backup", "")).status, 401);
    const download = await get("/admin/api/backup");
    assert.equal(download.status, 200);
    assert.match(download.headers.get("content-disposition"), /attachment; filename="bc-process-studio-licenses-\d{4}-\d{2}-\d{2}\.json"/);
    const exported = await download.json();
    assert.equal(exported.format, "bc-process-studio-license-backup");
    assert.equal(exported.storage, "file");
    assert.equal(exported.data.tenants[tenant].name, "Ny Salico");
    assert.equal(exported.counts.tenants, Object.keys(exported.data.tenants).length);
    state = await (await get("/admin/api/state")).json();
    assert.equal(state.backup.configured, false);
    assert.ok(state.auditEvents.some(event => event.action === "backup-downloaded"));
    const consultant = { entraTenantId: tenant, objectId: second,
      name: "Consultant One", email: "consultant@example.com", enabled: true,
      expiresAt: "2027-12-31T23:59:59Z", revision: state.consultantRevision };
    const consultantSaved = await saveConsultant(consultant);
    assert.equal(consultantSaved.status, 200);
    state = await consultantSaved.json();
    assert.equal(state.consultants[`${tenant}:00000000-0000-0000-0000-000000000000`].name,
      "Consultant One");
    state = await (await saveConsultant({ ...consultant, objectId: "00000000-0000-0000-0000-000000000000",
      notes: "Partner sedan 2025", revision: state.consultantRevision })).json();
    state = await (await saveConsultant({ ...consultant, objectId: "00000000-0000-0000-0000-000000000000",
      enabled: false, revision: state.consultantRevision })).json();
    assert.equal(state.consultants[`${tenant}:00000000-0000-0000-0000-000000000000`].notes,
      "Partner sedan 2025", "omitted notes are kept");
    const consultantDeleted = await fetch(base + "/admin/api/consultant", { method: "DELETE",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ entraTenantId: tenant, objectId: "00000000-0000-0000-0000-000000000000",
        revision: state.consultantRevision }) });
    assert.equal(consultantDeleted.status, 200);
    state = await consultantDeleted.json();
    assert.deepEqual(state.consultants, {});
    const deletedConsultant = state.deletedLicenses.find(item => item.kind === "consultant");
    assert.equal(deletedConsultant.name, "Consultant One");
    state = await (await post("/admin/api/deleted/restore", { id: deletedConsultant.id })).json();
    assert.equal(state.consultants[`${tenant}:00000000-0000-0000-0000-000000000000`].name,
      "Consultant One");
    assert.ok(state.auditEvents.some(event => event.action === "consultant-restored"));
    assert.ok(state.auditEvents.some(event => event.action === "tenant-restored"));
    assert.ok(state.auditEvents.some(event => event.action === "deleted-license-purged"));
    assert.ok(state.auditEvents.some(event => event.action === "tenant-saved"));
    assert.ok(state.auditEvents.some(event => event.action === "tenant-trial-reset"));
    assert.ok(state.auditEvents.some(event => event.action === "consultant-saved"));
    await assert.rejects(createService({ dataDirectory: directory, adminKey: "weak" }), /64-character/);
    console.log("Tenant license admin protection, editing and conflict tests passed.");
  } finally { await new Promise(resolve => server.close(resolve)); }
  // Items older than the 30-day retention disappear the next time the state is read.
  const kept = await createService({ dataDirectory: directory, adminKey: key, notifier });
  await new Promise(resolve => kept.listen(0, "127.0.0.1", resolve));
  try {
    const keptBase = `http://127.0.0.1:${kept.address().port}`;
    const headers = { Authorization: "Bearer " + key, "Content-Type": "application/json" };
    let keptState = await (await fetch(keptBase + "/admin/api/state", { headers })).json();
    keptState = await (await fetch(keptBase + "/admin/api/tenant", { method: "DELETE", headers,
      body: JSON.stringify({ tenantId: tenant, revision: keptState.revision }) })).json();
    assert.equal(keptState.deletedLicenses.length, 1);
  } finally { await new Promise(resolve => kept.close(resolve)); }
  const later = await createService({ dataDirectory: directory, adminKey: key, notifier,
    now: () => Date.now() + 31 * 86400000 });
  await new Promise(resolve => later.listen(0, "127.0.0.1", resolve));
  try {
    const laterState = await (await fetch(`http://127.0.0.1:${later.address().port}/admin/api/state`, {
      headers: { Authorization: "Bearer " + key } })).json();
    assert.equal(laterState.deletedLicenses.length, 0);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, "deleted-licenses.json"), "utf8")), {});
  } finally { await new Promise(resolve => later.close(resolve)); }
  const disabled = await createService({ dataDirectory: directory });
  await new Promise(resolve => disabled.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${disabled.address().port}/admin/api/state`);
    assert.equal(response.status, 503);
  } finally { await new Promise(resolve => disabled.close(resolve)); }
  const entraAdmin = await createService({ dataDirectory: directory,
    entraAudience: tenant, entraClientId: tenant,
    entraValidator: async () => ({ tid: tenant, oid: second, name: "User", preferredUsername: "user@example.com" }),
    adminEntraValidator: async authorization => {
      if (authorization !== "Bearer entra-token") { const error = new Error("unauthorized"); error.status = 401; throw error; }
      return { tid: tenant, oid: second, name: "Admin User", preferredUsername: "admin@example.com" };
    } });
  await new Promise(resolve => entraAdmin.listen(0, "127.0.0.1", resolve));
  try {
    const entraBase = `http://127.0.0.1:${entraAdmin.address().port}`;
    const config = await (await fetch(entraBase + "/admin/api/auth/config")).json();
    assert.equal(config.enabled, true);
    assert.equal(config.clientId, tenant);
    assert.equal(config.requiredRole, "License.Administrator");
    assert.equal((await fetch(entraBase + "/admin/api/state")).status, 401);
    assert.equal((await fetch(entraBase + "/admin/api/state", {
      headers: { Authorization: "Bearer entra-token" } })).status, 200);
  } finally { await new Promise(resolve => entraAdmin.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
