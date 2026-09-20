const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { create } = require("../src/engine/document-usage.js");
const { createDocumentUsage, validUsage } = require("../services/licensing/document-usage.js");
const { create: createLicense } = require("../src/engine/consultant-license.js");
const timestamp = Date.parse("2026-10-20T12:00:00.000Z");
const date = days => new Date(timestamp - days * 86400000).toISOString();
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
const profileA = { tenantId: "tenant-a", objectId: "user-a" };
const profileB = { tenantId: "tenant-a", objectId: "user-b" };
function memory() {
  let values = {};
  return {
    get: async key => structuredClone({ [key]: values[key] }),
    set: async patch => { values = { ...values, ...structuredClone(patch) }; },
    remove: async key => { delete values[key]; }
  };
}
async function main() {
  const storage = memory();
  let profile = profileA;
  let offline = true;
  const delivered = [];
  const options = { storage, digest, account: async () => profile, now: () => date(0),
    send: async (event, owner) => {
      if (offline) throw Error("offline");
      delivered.push({ event, owner });
    } };
  let client = create(options);
  await Promise.all(Array.from({ length: 5 }, () => client.enqueue("process-document", "document-1")));
  await assert.rejects(client.flush(), /offline/);
  client = create(options); // Restart with durable pending data.
  profile = profileB;
  offline = false;
  await client.flush();
  assert.equal(delivered.length, 0, "never send another account's pending event");
  await client.enqueue("bug-report", "report-1");
  await Promise.all([client.flush(), client.flush()]);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].owner, "tenant-a:user-b");
  profile = profileA;
  await client.flush();
  await client.enqueue("process-document", "document-1");
  await client.flush();
  assert.equal(delivered.length, 2, "repeat saves and restarts must not count again");
  assert.deepEqual(Object.keys(delivered[1].event).sort(), ["createdAt", "documentId", "kind"]);
  assert.equal(delivered[1].event.documentId, digest("document-1"));
  assert.ok(!JSON.stringify(delivered).includes("document-1"));
  profile = null;
  await client.enqueue("process-document", "signed-out");
  profile = profileA;
  await client.flush();
  assert.equal(delivered.length, 2);
  // A document added during a flush is retained for the next retry.
  let release;
  const blocked = create({ ...options, send: async () => new Promise(resolve => { release = resolve; }) });
  await blocked.enqueue("bug-report", "report-2");
  const pending = blocked.flush();
  while (!release) await new Promise(resolve => setImmediate(resolve));
  await blocked.enqueue("bug-report", "report-3");
  release(); await pending;
  await client.flush();
  assert.equal(delivered.at(-1).event.documentId, digest("report-3"));

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bc-document-usage-"));
  const server = createDocumentUsage({ dataDirectory: directory, now: () => timestamp });
  const userA = { tid: "tenant-a", oid: "user-a", name: "Alice", preferredUsername: "alice@example.com" };
  const userB = { ...userA, oid: "user-b", name: "Bob" };
  const event = (kind, id, days) => ({ kind, documentId: digest(id), createdAt: date(days) });
  const first = event("process-document", "1", 0);
  assert.equal(validUsage(first, timestamp), true);
  for (const invalid of [{ ...first, title: "private" }, { ...first, objectId: "spoof" },
    { ...first, documentId: "raw-id" }, { ...first, kind: "export" },
    { ...first, createdAt: date(-1) }, { ...first, createdAt: "not-a-date" },
    { ...first, createdAt: "2026-10-20T14:00:00+02:00" }]) assert.equal(validUsage(invalid, timestamp), false);
  const replies = await Promise.all(Array.from({ length: 6 }, () => server.record(userA, first)));
  assert.equal(replies.filter(r => !r.duplicate).length, 1);
  assert.equal((await server.record(userB, first)).duplicate, true, "replay cannot reassign ownership");
  for (const days of [7, 30, 90, 91]) await server.record(userA, event("bug-report", String(days), days));
  await server.record(userB, event("process-document", "b", 2));
  const restarted = createDocumentUsage({ dataDirectory: directory, now: () => timestamp });
  const summaries = await restarted.summary();
  assert.equal(summaries.length, 2);
  assert.deepEqual(summaries[0].periods, {
    all: { documents: 1, reports: 4 }, "7": { documents: 1, reports: 1 },
    "30": { documents: 1, reports: 2 }, "90": { documents: 1, reports: 3 }
  });
  assert.equal(summaries[0].lastCreatedAt, date(0));
  assert.ok(!JSON.stringify(summaries).includes("documentId"));

  const licenseStorage = memory();
  const licenseKey = "t9ConsultantLicenseV1";
  await licenseStorage.set({ [licenseKey]: { profile: profileA, accessToken: "token-a", expiresAt: timestamp + 3600000 } });
  const requests = [];
  const license = createLicense({ storage: licenseStorage, now: () => timestamp,
    config: { endpoint: "https://license.example/v1/license/consultant/check" },
    fetcher: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ accepted: true }) }; } });
  await license.recordUsage(first, "tenant-a:user-a");
  assert.equal(requests[0].url, "https://license.example/v1/license/usage");
  assert.equal(requests[0].options.headers.Authorization, "Bearer token-a");
  assert.deepEqual(JSON.parse(requests[0].options.body), first);
  await licenseStorage.set({ [licenseKey]: { profile: profileB, accessToken: "token-b", expiresAt: timestamp + 3600000 } });
  await assert.rejects(license.recordUsage(first, "tenant-a:user-a"), /Account changed/);
  assert.equal(requests.length, 1);

  // Render the real admin statistics with a minimal DOM: periods, search, escaping and deduplication.
  const elements = new Map();
  const element = () => ({ children: [], value: "", hidden: false,
    append(child) { this.children.push(child); }, replaceChildren() { this.children = []; }, addEventListener() {} });
  for (const id of ["documentUsage", "usagePeriod", "usageSearch", "usageEmpty"]) elements.set(id, element());
  elements.get("usagePeriod").value = "30";
  const source = await fs.readFile(path.join(__dirname, "../services/licensing/admin-ui.js"), "utf8");
  const context = { $: id => elements.get(id), document: { createElement: element },
    state: { tenantUsers: [{ entraTenantId: "tenant-a", objectId: "user-a", name: "Alice" }],
      consultants: { "tenant-a:00000000-0000-0000-0000-000000000000": { name: "Organization" } },
      documentUsage: summaries.map(s => ({ ...s, name: s.objectId === "user-a" ? "<script>Alice</script>" : s.name })) },
    cell: (row, value) => { const td = element(); td.textContent = value; row.append(td); } };
  vm.runInNewContext(source.slice(source.indexOf("function renderDocumentUsage()")), context);
  vm.runInNewContext("renderDocumentUsage()", context);
  assert.equal(elements.get("documentUsage").children.length, 2);
  assert.equal(elements.get("documentUsage").children[0].children[0].textContent, "<script>Alice</script>");
  assert.equal(elements.get("documentUsage").children[0].children[5].textContent, "2");
  elements.get("usagePeriod").value = "all";
  elements.get("usageSearch").value = "alice";
  vm.runInNewContext("renderDocumentUsage()", context);
  assert.equal(elements.get("documentUsage").children[0].children[5].textContent, "4");
  elements.get("usageSearch").value = "no-match";
  vm.runInNewContext("renderDocumentUsage()", context);
  assert.equal(elements.get("documentUsage").children.length, 0);
  assert.equal(elements.get("usageEmpty").hidden, false);
  console.log("Document usage queue, persistence, periods, identity and admin rendering tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
