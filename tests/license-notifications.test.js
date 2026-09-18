const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createNotifier } = require("../services/licensing/notifications.js");
const { buildActions } = require("../services/licensing/admin.js");

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "t9-license-notifications-"));
  const timestamp = Date.parse("2026-09-18T12:00:00Z");
  const requests = [];
  const notifier = createNotifier({ dataDirectory: directory,
    webhookUrl: "https://notifications.example.test/license", webhookToken: "secret",
    recipient: "admin@example.com", now: () => timestamp,
    fetcher: async (url, options) => { requests.push({ url, options }); return { ok: true }; } });
  const event = { id: "trial:tenant-1", type: "trial-requested", entityId: "tenant-1",
    subject: "New trial", text: "A trial was created." };
  assert.deepEqual(await notifier.send(event), { sent: true });
  assert.deepEqual(await notifier.send(event), { sent: false, duplicate: true });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.headers.Authorization, "Bearer secret");
  assert.equal(JSON.parse(requests[0].options.body).to, "admin@example.com");

  await notifier.scan({ tenant: { name: "Trial customer", enabled: true,
    expiresAt: "2026-10-18T12:00:00Z" } }, {});
  assert.equal(requests.length, 2);
  assert.equal(JSON.parse(requests[1].options.body).eventType, "license-expiring");
  await notifier.scan({ tenant: { name: "Trial customer", enabled: true,
    expiresAt: "2026-10-18T12:00:00Z" } }, {});
  assert.equal(requests.length, 2);

  const actions = buildActions({
    pending: { name: "Pending", enabled: false, requestedAt: "2026-09-18T10:00:00Z",
      expiresAt: "2026-10-18T10:00:00Z" },
    expiring: { name: "Expiring", enabled: true, expiresAt: "2026-09-28T12:00:00Z" },
    later: { name: "Later", enabled: true, expiresAt: "2027-09-18T12:00:00Z" }
  }, {}, timestamp);
  assert.deepEqual(actions.map(item => item.actionType), ["pending", "expiring"]);
  assert.equal(actions[1].daysRemaining, 10);

  const disabled = createNotifier({ dataDirectory: directory, now: () => timestamp,
    fetcher: async () => { throw new Error("must not run"); } });
  assert.deepEqual(await disabled.send(event), { sent: false, configured: false });
  assert.throws(() => createNotifier({ dataDirectory: directory,
    webhookUrl: "http://example.test", recipient: "admin@example.com" }), /HTTPS URL/);
  console.log("License notification tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
