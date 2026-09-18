const crypto = require("node:crypto");
const { TableClient } = require("@azure/data-tables");
const { ManagedIdentityCredential } = require("@azure/identity");

const TABLES = Object.freeze({
  tenants: "LicenseTenants",
  claims: "LicenseTrialClaims",
  consultants: "LicenseConsultantCompanies",
  tenantUsers: "LicenseUsers",
  registrations: "LicenseInstallations",
  audit: "LicenseAuditEvents",
  notifications: "LicenseNotifications",
  metadata: "LicenseMetadata"
});
const PARTITION = "v1";
const clone = value => JSON.parse(JSON.stringify(value));
const escapeKey = value => Buffer.from(String(value), "utf8").toString("base64url");
const decodeKey = value => Buffer.from(value, "base64url").toString("utf8");
const conflict = error => [409, 412].includes(error?.statusCode);
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort()
    .map(key => [key, canonical(value[key])])) : value;
const checksum = value => crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

async function createTableStorage({ accountUrl, managedIdentityClientId = "",
  credential: suppliedCredential = null, clientFactory = null }) {
  if (!/^https:\/\/[a-z0-9]{3,24}\.table\.core\.windows\.net$/u.test(accountUrl)) {
    throw new Error("LICENSE_TABLE_ACCOUNT_URL must be an Azure Table HTTPS endpoint.");
  }
  const credential = suppliedCredential || new ManagedIdentityCredential(managedIdentityClientId || undefined);
  const clients = new Map();
  for (const [name, tableName] of Object.entries(TABLES)) {
    const client = clientFactory ? clientFactory(accountUrl, tableName, credential)
      : new TableClient(accountUrl, tableName, credential);
    try { await client.createTable(); }
    catch (error) { if (error.statusCode !== 409) throw error; }
    clients.set(name, client);
  }
  async function entries(name) {
    const result = [];
    for await (const entity of clients.get(name).listEntities({
      queryOptions: { filter: `PartitionKey eq '${PARTITION}'` }
    })) result.push(entity);
    return result;
  }
  async function readMap(name) {
    const result = {};
    for (const entity of await entries(name)) result[decodeKey(entity.rowKey)] = JSON.parse(entity.json);
    return result;
  }
  async function mutateMap(name, action) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const currentEntities = await entries(name);
      const current = {};
      const metadata = new Map();
      for (const entity of currentEntities) {
        const key = decodeKey(entity.rowKey); current[key] = JSON.parse(entity.json);
        metadata.set(key, entity.etag);
      }
      const result = await action(clone(current));
      if (!result?.updated) return result?.value;
      try {
        for (const key of Object.keys(current)) if (!(key in result.updated)) {
          await clients.get(name).deleteEntity(PARTITION, escapeKey(key), { etag: metadata.get(key) });
        }
        for (const [key, value] of Object.entries(result.updated)) {
          if (JSON.stringify(current[key]) === JSON.stringify(value)) continue;
          const entity = { partitionKey: PARTITION, rowKey: escapeKey(key), json: JSON.stringify(value) };
          if (metadata.has(key)) await clients.get(name).updateEntity(entity, "Replace", { etag: metadata.get(key) });
          else await clients.get(name).createEntity(entity);
        }
        return result.value;
      } catch (error) { if (!conflict(error) || attempt === 4) throw error; }
    }
  }
  async function append(name, value) {
    const timestamp = Date.parse(value.occurredAt || value.registeredAt) || Date.now();
    const reverse = String(9999999999999 - timestamp).padStart(13, "0");
    const key = `${reverse}-${value.id || crypto.randomUUID()}`;
    await clients.get(name).createEntity({ partitionKey: PARTITION,
      rowKey: escapeKey(key), json: JSON.stringify(value) });
    return value;
  }
  async function readList(name, limit = 500) {
    const values = (await entries(name)).map(entity => JSON.parse(entity.json));
    return values.sort((a, b) => String(b.occurredAt || b.registeredAt || "")
      .localeCompare(String(a.occurredAt || a.registeredAt || ""))).slice(0, limit);
  }
  async function importMap(name, values) {
    if ((await entries(name)).length) throw new Error(`Azure table ${TABLES[name]} is not empty.`);
    for (const [key, value] of Object.entries(values)) await clients.get(name).createEntity({
      partitionKey: PARTITION, rowKey: escapeKey(key), json: JSON.stringify(value) });
    const imported = await readMap(name);
    if (Object.keys(imported).length !== Object.keys(values).length || checksum(imported) !== checksum(values)) {
      throw new Error(`Migration verification failed for ${name}.`);
    }
    return { count: Object.keys(values).length, checksum: checksum(values) };
  }
  async function importList(name, values) {
    if ((await entries(name)).length) throw new Error(`Azure table ${TABLES[name]} is not empty.`);
    for (const value of values) await append(name, value);
    const imported = await readList(name, values.length + 1);
    const ordered = list => [...list].sort((a, b) => String(a.id || a.occurredAt || a.registeredAt)
      .localeCompare(String(b.id || b.occurredAt || b.registeredAt)));
    if (imported.length !== values.length || checksum(ordered(imported)) !== checksum(ordered(values))) {
      throw new Error(`Migration verification failed for ${name}.`);
    }
    return { count: values.length, checksum: checksum(ordered(values)) };
  }
  return Object.freeze({ readMap, mutateMap, append, readList, importMap, importList,
    tables: TABLES, mode: "table" });
}

module.exports = { createTableStorage, TABLES };
