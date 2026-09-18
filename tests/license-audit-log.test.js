const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createAuditLog } = require("../services/licensing/audit-log.js");

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "t9-license-audit-"));
  let timestamp = Date.parse("2026-09-18T12:00:00Z");
  const audit = createAuditLog({ dataDirectory: directory, now: () => timestamp });
  await audit.log({ actor: "administrator", action: "tenant-saved",
    entityType: "tenant", entityId: "tenant-1", details: { enabled: true } });
  timestamp += 1000;
  await audit.log({ actor: "system", action: "notification-sent",
    entityType: "notification", entityId: "tenant-1", details: { eventType: "license-expiring" } });
  const events = await audit.read(10);
  assert.equal(events.length, 2);
  assert.equal(events[0].action, "notification-sent");
  assert.equal(events[1].details.enabled, true);
  assert.match(events[0].id, /^[0-9a-f-]{36}$/);
  const raw = await fs.readFile(path.join(directory, "audit.jsonl"), "utf8");
  assert.equal(raw.trim().split("\n").length, 2);
  console.log("License audit log tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
