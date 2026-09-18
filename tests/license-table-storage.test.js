const assert = require("node:assert/strict");
const { createTableStorage, TABLES } = require("../services/licensing/table-storage.js");

class FakeTableClient {
  constructor(table) { this.table = table; }
  async createTable() {}
  async *listEntities() { for (const value of this.table.values()) yield { ...value }; }
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
  const event = { id: "event-1", occurredAt: "2026-09-18T12:00:00Z", action: "saved" };
  await storage.append("audit", event);
  assert.deepEqual(await storage.readList("audit", 10), [event]);
  await assert.rejects(storage.importMap("tenants", {}), /not empty/);
  await assert.rejects(createTableStorage({ accountUrl: "http://invalid.example" }), /HTTPS endpoint/);
  console.log("License Azure Table Storage tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
