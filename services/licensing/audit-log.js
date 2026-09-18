const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function createAuditLog({ dataDirectory, now = Date.now, storage = null }) {
  const file = path.join(dataDirectory, "audit.jsonl");
  let writes = Promise.resolve();
  function log({ actor = "system", action, entityType, entityId, details = {} }) {
    const event = { id: crypto.randomUUID(), occurredAt: new Date(now()).toISOString(),
      actor, action, entityType, entityId, details };
    const operation = writes.then(() => storage
      ? storage.append("audit", event)
      : fs.appendFile(file, JSON.stringify(event) + "\n", { mode: 0o600 }));
    writes = operation.catch(() => {});
    return operation.then(() => event);
  }
  async function read(limit = 500) {
    await writes;
    if (storage) return storage.readList("audit", limit);
    try {
      const lines = (await fs.readFile(file, "utf8")).split("\n").filter(Boolean);
      return lines.slice(-limit).reverse().map(line => JSON.parse(line));
    } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  }
  return Object.freeze({ log, read });
}

module.exports = { createAuditLog };
