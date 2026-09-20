const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createService } = require("../services/licensing/server.js");
const tid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const oid = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const tenant = "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb";
async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bc-usage-service-"));
  const now = () => Date.parse("2026-10-20T12:00:00.000Z");
  const adminKey = "1".repeat(64);
  const server = await createService({ dataDirectory: directory, now, initializeRegistry: true, adminKey,
    entraValidator: async authorization => {
      if (authorization !== "Bearer user") throw Object.assign(Error("unauthorized"), { status: 401 });
      return { tid, oid, name: "User", preferredUsername: "user@example.com" };
    } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const event = { kind: "process-document", documentId: "a".repeat(64), createdAt: new Date(now()).toISOString() };
  const post = (body, token = "user", route = "/v1/license/usage") => fetch(base + route, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(body) });
  try {
    assert.equal((await post(event, "")).status, 401);
    assert.equal((await post(event)).status, 403);
    const active = { enabled: true, expiresAt: "2027-01-01T00:00:00.000Z" };
    await fs.writeFile(path.join(directory, "consultants.json"), JSON.stringify({ [`${tid}:${oid}`]: active }));
    assert.equal((await post({ ...event, objectId: "spoofed" })).status, 400);
    assert.equal((await post({ ...event, content: "private" })).status, 400);
    const responses = await Promise.all([post(event), post(event), post(event)]);
    assert.ok(responses.every(response => response.status === 200));
    const replies = await Promise.all(responses.map(response => response.json()));
    assert.equal(replies.filter(response => !response.duplicate).length, 1);
    assert.equal((await fetch(base + "/admin/api/state")).status, 401);
    let snapshot = await (await fetch(base + "/admin/api/state", { headers: { Authorization: "Bearer " + adminKey } })).json();
    assert.equal(snapshot.documentUsage[0].periods.all.documents, 1);
    assert.equal(snapshot.documentUsage[0].objectId, oid);
    assert.equal(snapshot.documentUsage[0].email, "user@example.com");
    assert.ok(!JSON.stringify(snapshot.documentUsage).includes(event.documentId));
    await fs.writeFile(path.join(directory, "consultants.json"), "{}");
    await fs.writeFile(path.join(directory, "tenants.json"), JSON.stringify({ [tenant]: active }));
    assert.equal((await post({ tenantId: tenant, installationId: oid, version: "4.7.0" }, "user", "/v1/license/user/register")).status, 200);
    assert.equal((await post({ ...event, kind: "bug-report", documentId: "b".repeat(64) })).status, 200);
    snapshot = await (await fetch(base + "/admin/api/state", { headers: { Authorization: "Bearer " + adminKey } })).json();
    assert.deepEqual(snapshot.documentUsage[0].periods.all, { documents: 1, reports: 1 });
    await fs.writeFile(path.join(directory, "tenants.json"), JSON.stringify({ [tenant]: { ...active, enabled: false } }));
    assert.equal((await post({ ...event, documentId: "c".repeat(64) })).status, 403);
    console.log("Document usage endpoint authentication, license checks, deduplication and admin tests passed.");
  } finally { await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
