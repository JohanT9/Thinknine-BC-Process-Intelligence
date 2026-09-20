const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
function validUsage(value, now) {
  return value && Object.keys(value).sort().join() === "createdAt,documentId,kind" &&
    ["process-document", "bug-report"].includes(value.kind) &&
    /^[a-f0-9]{64}$/.test(value.documentId) && typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt)) && Date.parse(value.createdAt) <= now + 300000 &&
    new Date(value.createdAt).toISOString() === value.createdAt;
}
function createDocumentUsage({ dataDirectory, storage, now = Date.now }) {
  const file = path.join(dataDirectory, "document-usage.json");
  let writes = Promise.resolve();
  async function read() {
    if (storage) return storage.readMap("documentUsage");
    try { return JSON.parse(await fs.readFile(file, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return {}; throw error; }
  }
  function record(identity, value) {
    const key = value.kind + ":" + value.documentId;
    const mutate = current => current[key] ? { value: { accepted: true, duplicate: true } }
      : { updated: { ...current, [key]: { ...value, entraTenantId: identity.tid,
        objectId: identity.oid, name: identity.name || "", email: identity.preferredUsername || "" } },
        value: { accepted: true, duplicate: false } };
    if (storage) return storage.mutateMap("documentUsage", mutate);
    const pending = writes.then(async () => {
      const result = mutate(await read());
      if (result.updated) {
        const temporary = file + "." + crypto.randomUUID() + ".tmp";
        await fs.writeFile(temporary, JSON.stringify(result.updated), { mode: 0o600 });
        await fs.rename(temporary, file);
      }
      return result.value;
    });
    writes = pending.catch(() => {}); return pending;
  }
  async function summary() {
    await writes;
    const timestamp = now();
    const users = new Map();
    for (const event of Object.values(await read())) {
      const id = event.entraTenantId + ":" + event.objectId;
      if (!users.has(id)) users.set(id, { entraTenantId: event.entraTenantId,
        objectId: event.objectId, name: event.name, email: event.email,
        lastCreatedAt: event.createdAt, periods: Object.fromEntries(["all", "7", "30", "90"]
          .map(period => [period, { documents: 0, reports: 0 }])) });
      const user = users.get(id);
      if (event.createdAt > user.lastCreatedAt) user.lastCreatedAt = event.createdAt;
      for (const period of ["all", "7", "30", "90"]) {
        if (period === "all" || Date.parse(event.createdAt) >= timestamp - Number(period) * 86400000) {
          user.periods[period][event.kind === "process-document" ? "documents" : "reports"]++;
        }
      }
    }
    return [...users.values()].sort((a,b) => b.lastCreatedAt.localeCompare(a.lastCreatedAt));
  }
  return { record, summary };
}
module.exports = { createDocumentUsage, validUsage };
