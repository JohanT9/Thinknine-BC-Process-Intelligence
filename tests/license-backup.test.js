const assert = require("node:assert/strict");
const { createBackup, FORMAT, checksum } = require("../services/licensing/backup.js");

async function main() {
  let clock = Date.parse("2026-10-30T10:00:00Z");
  const data = { tenants: { a: { name: "A" }, b: { name: "B" } }, audit: [{ id: 1 }] };
  const requests = [];
  let answer = 201;
  let status = null;
  const results = [];
  const backup = createBackup({ collect: async () => data, storageMode: "azure-table", now: () => clock,
    accountUrl: "https://licensestore.table.core.windows.net", container: "license-backups",
    credential: { getToken: async scope => { assert.equal(scope, "https://storage.azure.com/.default"); return { token: "t" }; } },
    fetcher: async (url, options) => { requests.push({ url, options }); return { ok: answer < 300, status: answer }; },
    readStatus: async () => status, writeStatus: async value => { status = value; },
    onResult: result => results.push(result) });
  assert.equal(backup.configured, true);

  const exported = await backup.exportData();
  assert.equal(exported.format, FORMAT);
  assert.deepEqual(exported.counts, { tenants: 2, audit: 1 });
  assert.equal(exported.checksum, checksum(data));
  assert.deepEqual(exported.data, data);

  // The day's copy is written once, to the blob endpoint of the table account, never overwritten.
  assert.deepEqual(await backup.runIfDue(), { created: true, name: "licenses-2026-10-30.json" });
  assert.equal(requests[0].url, "https://licensestore.blob.core.windows.net/license-backups/licenses-2026-10-30.json");
  assert.equal(requests[0].options.method, "PUT");
  assert.equal(requests[0].options.headers["If-None-Match"], "*");
  assert.equal(requests[0].options.headers.Authorization, "Bearer t");
  assert.equal(JSON.parse(requests[0].options.body).checksum, checksum(data));
  assert.equal(status.lastBlob, "licenses-2026-10-30.json");
  assert.equal(status.error, "");
  assert.deepEqual(await backup.runIfDue(), { skipped: "exists", name: "licenses-2026-10-30.json" });
  assert.equal(requests.length, 1, "a written day is not exported again");

  // Another day: a blob written by another instance counts as done; a failure is recorded.
  clock += 86400000;
  answer = 409;
  assert.equal((await backup.runIfDue()).skipped, "exists");
  clock += 86400000;
  answer = 403;
  const failed = await backup.runIfDue();
  assert.equal(failed.failed, true);
  assert.match(status.error, /HTTP 403/);
  assert.equal(status.lastBlob, "licenses-2026-10-30.json", "the last good copy stays known");
  assert.deepEqual(results.map(result => result.success), [true, false]);

  const off = createBackup({ collect: async () => data, storageMode: "file" });
  assert.equal(off.configured, false);
  assert.deepEqual(await off.runIfDue(), { skipped: "not-configured" });
  assert.equal(typeof off.start(), "function");
  console.log("License backup tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
