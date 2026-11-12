const assert = require("node:assert/strict");
const { createTableStorage, TABLES } = require("../services/licensing/table-storage.js");

class FakeTableClient {
  constructor(table) { this.table = table; }
  async createTable() {}
  async *listEntities() { for (const value of this.table.values()) yield { ...value }; }
  async getEntity(partitionKey, rowKey) {
    const value = this.table.get(`${partitionKey}:${rowKey}`);
    if (!value) { const error = new Error("not found"); error.statusCode = 404; throw error; }
    return { ...value };
  }
  async createEntity(entity) {
    const key = `${entity.partitionKey}:${entity.rowKey}`;
    if (this.table.has(key)) { const error = new Error("conflict"); error.statusCode = 409; throw error; }
    this.table.set(key, { ...entity, etag: "1" });
  }
  async updateEntity(entity, mode, options) {
    assert.equal(mode, "Replace");
    const key = `${entity.partitionKey}:${entity.rowKey}`;
    const current = this.table.get(key);
    if (!current || current.etag !== options.etag) { const error = new Error("conflict"); error.statusCode = 412; throw error; }
    this.table.set(key, { ...entity, etag: String(Number(current.etag) + 1) });
  }
  async deleteEntity(partitionKey, rowKey, options) {
    const key = `${partitionKey}:${rowKey}`;
    const current = this.table.get(key);
    if (!current || current.etag !== options.etag) { const error = new Error("conflict"); error.statusCode = 412; throw error; }
    this.table.delete(key);
  }
}

async function main() {
  const tables = new Map(Object.values(TABLES).map(name => [name, new Map()]));
  const storage = await createTableStorage({
    accountUrl: "https://thinkninelicenses.table.core.windows.net",
    credential: {}, clientFactory: (url, name) => new FakeTableClient(tables.get(name))
  });
  await storage.importMap("tenants", { tenant1: { enabled: true } });
  assert.deepEqual(await storage.readMap("tenants"), { tenant1: { enabled: true } });
  await storage.mutateMap("tenants", current => ({ updated: { ...current,
    tenant1: { enabled: false }, tenant2: { enabled: true } }, value: "saved" }));
  assert.deepEqual(await storage.readMap("tenants"), {
    tenant1: { enabled: false }, tenant2: { enabled: true } });
  await storage.mutateMap("tenants", current => {
    delete current.tenant1; return { updated: current };
  });
  assert.deepEqual(await storage.readMap("tenants"), { tenant2: { enabled: true } });
  // A license check reads its one entry without listing the table.
  const tenantRows = tables.get(TABLES.tenants);
  const listAll = FakeTableClient.prototype.listEntities;
  let tenantsListed = 0;
  FakeTableClient.prototype.listEntities = function (...args) {
    if (this.table === tenantRows) tenantsListed += 1;
    return listAll.apply(this, args);
  };
  try {
    assert.deepEqual(await storage.readOne("tenants", "tenant2"), { enabled: true });
    assert.equal(await storage.readOne("tenants", "tenant1"), undefined);
    assert.equal(tenantsListed, 0, "reading one entry does not list the table");
  } finally { FakeTableClient.prototype.listEntities = listAll; }
  const event = { id: "event-1", occurredAt: "2026-09-18T12:00:00Z", action: "saved" };
  await storage.append("audit", event);
  assert.deepEqual(await storage.readList("audit", 10), [event]);
  await assert.rejects(storage.importMap("tenants", {}), /not empty/);
  await assert.rejects(createTableStorage({ accountUrl: "http://invalid.example" }), /HTTPS endpoint/);
  const { createDocumentUsage } = require("../services/licensing/document-usage.js");
  const usage = createDocumentUsage({ dataDirectory: ".", storage,
    now: () => Date.parse("2026-10-20T12:00:00.000Z") });
  const identity = { tid: "tenant", oid: "user" };
  const document = { kind: "process-document", documentId: "a".repeat(64),
    createdAt: "2026-10-20T12:00:00.000Z" };
  const results = await Promise.all([usage.record(identity, document), usage.record(identity, document)]);
  assert.equal(results.filter(result => !result.duplicate).length, 1);
  await Promise.all([usage.record(identity, { ...document, documentId: "b".repeat(64) }),
    usage.record(identity, { ...document, kind: "bug-report" })]);
  assert.deepEqual((await usage.summary())[0].periods.all, { documents: 2, reports: 1 });
  assert.equal(Object.keys(await storage.readMap("documentUsage")).length, 3);
  // Recording a document writes one row and does not read the table, however large it is.
  const usageRows = tables.get(TABLES.documentUsage);
  const list = FakeTableClient.prototype.listEntities;
  let usageListed = 0;
  FakeTableClient.prototype.listEntities = function (...args) {
    if (this.table === usageRows) usageListed += 1;
    return list.apply(this, args);
  };
  try {
    assert.deepEqual(await usage.record(identity, { ...document, documentId: "c".repeat(64) }),
      { accepted: true, duplicate: false });
    assert.deepEqual(await usage.record(identity, { ...document, documentId: "c".repeat(64) }),
      { accepted: true, duplicate: true });
    assert.equal(usageListed, 0, "the usage table is not listed to record a document");
  } finally { FakeTableClient.prototype.listEntities = list; }
  // The license service checks a license with table storage without listing the tenant or
  // trial claim tables.
  const fs = require("node:fs/promises");
  const os = require("node:os");
  const path = require("node:path");
  const { createService } = require("../services/licensing/server.js");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "t9-license-table-"));
  const licensed = "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb";
  const unlicensed = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  await fs.writeFile(path.join(directory, "tenants.json"), JSON.stringify({ [licensed]: {
    enabled: true, expiresAt: "2099-12-31T23:59:59Z" } }));
  const serviceTables = new Map(Object.values(TABLES).map(name => [name, new Map()]));
  const server = await createService({ dataDirectory: directory, migrateFromFiles: true,
    tableAccountUrl: "https://thinkninelicenses.table.core.windows.net",
    tableClientFactory: (url, name) => new FakeTableClient(serviceTables.get(name)),
    entraValidator: async () => ({ tid: unlicensed, oid: unlicensed }) });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const watched = [serviceTables.get(TABLES.tenants), serviceTables.get(TABLES.claims)];
  let licenseTablesListed = 0;
  FakeTableClient.prototype.listEntities = function (...args) {
    if (watched.includes(this.table)) licenseTablesListed += 1;
    return list.apply(this, args);
  };
  try {
    const check = tenantId => fetch(`http://127.0.0.1:${server.address().port}/v1/license/check`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, installationId: unlicensed, version: "4.7.0" }) })
      .then(response => response.json());
    const active = await check(licensed);
    assert.equal(active.allowed, true);
    assert.equal(active.licenseStatus, "active");
    const missing = await check(unlicensed);
    assert.equal(missing.allowed, false);
    assert.equal(missing.trialAvailable, true);
    assert.equal(licenseTablesListed, 0, "a license check does not list the license tables");
  } finally {
    FakeTableClient.prototype.listEntities = list;
    await new Promise(resolve => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
  console.log("License Azure Table Storage and concurrent document usage tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
