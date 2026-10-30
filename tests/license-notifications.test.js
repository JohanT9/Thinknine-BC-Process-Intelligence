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

  // One summary a day from 08:00 Swedish time lists every expired or expiring license.
  let clock = Date.parse("2026-09-18T05:30:00Z"); // 07:30 in Stockholm (summer time)
  const digestRequests = [];
  const digest = createNotifier({ dataDirectory: await fs.mkdtemp(path.join(os.tmpdir(), "t9-license-digest-")),
    webhookUrl: "https://notifications.example.test/license", recipient: "admin@example.com",
    now: () => clock, adminUrl: "https://licenses.example.test/admin#licenser",
    fetcher: async (url, options) => { digestRequests.push(JSON.parse(options.body)); return { ok: true }; } });
  const tenants = {
    soon: { name: "Fabrikam", enabled: true, licenseType: "trial", expiresAt: "2026-09-21T10:00:00Z" },
    month: { name: "Contoso", enabled: true, licenseType: "standard", expiresAt: "2026-10-10T10:00:00Z" },
    expired: { name: "Adatum", enabled: true, expiresAt: "2026-09-10T10:00:00Z" },
    longAgo: { name: "Old", enabled: true, expiresAt: "2026-01-01T10:00:00Z" },
    blocked: { name: "Blocked", enabled: false, expiresAt: "2026-09-20T10:00:00Z" },
    later: { name: "Later", enabled: true, expiresAt: "2027-09-18T12:00:00Z" } };
  const consultants = { "c1:00000000-0000-0000-0000-000000000000": { name: "Konsult AB", enabled: true,
    expiresAt: "2026-09-19T10:00:00Z" }, "c1:user": { name: "Consultant user", enabled: true,
    expiresAt: "2026-09-19T10:00:00Z" } };
  assert.equal(await digest.due(), false, "not before 08:00");
  assert.deepEqual(await digest.scan(tenants, consultants), { sent: false, reason: "before-digest-hour" });
  clock = Date.parse("2026-09-18T06:05:00Z"); // 08:05 in Stockholm
  assert.equal(await digest.due(), true);
  assert.deepEqual(await digest.scan(tenants, consultants), { sent: true });
  assert.equal(digestRequests.length, 1, "one email for all licenses");
  const mail = digestRequests[0];
  assert.equal(mail.eventType, "license-expiry-digest");
  assert.equal(mail.subject, "BC Process Studio: 4 licenser har gått ut eller går ut snart");
  const lines = mail.text.split("\n");
  assert.equal(lines[0], "Licenser som har gått ut eller går ut inom 30 dagar, 2026-09-18.");
  assert.ok(lines.includes("Har gått ut (1)"));
  assert.ok(lines.includes("Inom 7 dagar (2)"));
  assert.ok(lines.includes("Inom 30 dagar (1)"));
  assert.ok(mail.text.indexOf("Konsult AB") < mail.text.indexOf("Fabrikam"), "soonest first");
  assert.match(mail.text, /- Adatum – kundföretag, ordinarie licens – gick ut 2026-09-10 10:00 UTC \(för 8 dagar sedan\) – ID expired/);
  assert.match(mail.text, /- Fabrikam – kundföretag, testlicens – går ut 2026-09-21 10:00 UTC \(om 3 dagar\) – ID soon/);
  assert.match(mail.text, /- Konsult AB – konsultföretag – går ut 2026-09-19 10:00 UTC \(i morgon\) – ID c1/);
  assert.ok(!/Old|Blocked|Later|Consultant user/.test(mail.text), "only enabled licenses within 30 days, one per company");
  assert.ok(lines.at(-1).endsWith("https://licenses.example.test/admin#licenser"));
  assert.equal(await digest.due(), false, "sent once a day");
  assert.deepEqual(await digest.scan(tenants, consultants), { sent: false, duplicate: true });
  clock = Date.parse("2026-09-19T07:00:00Z");
  assert.equal(await digest.due(), true, "the next day is due again");
  assert.deepEqual(await digest.scan({ later: tenants.later }, {}), { sent: false, reason: "nothing-expiring" });
  assert.equal(digestRequests.length, 1, "no email when nothing expires");
  // Winter time: 08:00 in Stockholm is 07:00 UTC.
  clock = Date.parse("2026-12-01T06:59:00Z");
  assert.equal(await digest.due(), false);
  clock = Date.parse("2026-12-01T07:00:00Z");
  assert.equal(await digest.due(), true);

  const actions = buildActions({
    pending: { name: "Pending", enabled: false, requestedAt: "2026-09-18T10:00:00Z",
      expiresAt: "2026-10-18T10:00:00Z" },
    expiring: { name: "Expiring", enabled: true, expiresAt: "2026-09-25T12:00:00Z" },
    tenDays: { name: "Ten days", enabled: true, expiresAt: "2026-09-28T12:00:00Z" },
    later: { name: "Later", enabled: true, expiresAt: "2027-09-18T12:00:00Z" }
  }, {}, timestamp);
  // Only a license that ends within seven days needs action.
  assert.deepEqual(actions.map(item => item.actionType), ["pending", "expiring"]);
  assert.equal(actions[1].daysRemaining, 7);

  const disabled = createNotifier({ dataDirectory: directory, now: () => timestamp,
    fetcher: async () => { throw new Error("must not run"); } });
  assert.deepEqual(await disabled.send(event), { sent: false, configured: false });
  assert.throws(() => createNotifier({ dataDirectory: directory,
    webhookUrl: "http://example.test", recipient: "admin@example.com" }), /HTTPS URL/);
  console.log("License notification tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
