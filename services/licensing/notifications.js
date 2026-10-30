const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;
// The daily summary lists licenses that expired within, or end within, this many days and
// marks those that end within SOON_DAYS, the limit the admin view calls expiring.
const DIGEST_DAYS = 30;
const SOON_DAYS = 7;

function createNotifier({ dataDirectory, webhookUrl = "", webhookToken = "",
  recipient = "", fetcher = fetch, now = Date.now, onDelivery = async () => {},
  storage = null, adminUrl = "", digestHour = 8, digestTimeZone = "Europe/Stockholm" }) {
  const stateFile = path.join(dataDirectory, "notification-state.json");
  let endpoint = null;
  if (webhookUrl) {
    endpoint = new URL(webhookUrl);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      throw new Error("LICENSE_NOTIFICATION_WEBHOOK_URL must be an HTTPS URL without credentials.");
    }
  }
  if (recipient && !EMAIL.test(recipient)) {
    throw new Error("LICENSE_NOTIFICATION_RECIPIENT must be a valid email address.");
  }
  async function state() {
    if (storage) return storage.readMap("notifications");
    try {
      const value = JSON.parse(await fs.readFile(stateFile, "utf8"));
      return value && !Array.isArray(value) && typeof value === "object" ? value : {};
    } catch (error) { if (error.code === "ENOENT") return {}; throw error; }
  }
  async function remember(value) {
    if (storage) return storage.mutateMap("notifications", current => ({ updated: { ...current, ...value } }));
    const temporary = `${stateFile}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, stateFile);
  }
  let queue = Promise.resolve();
  function send(event) {
    const operation = queue.then(async () => {
      if (!endpoint || !recipient) return { sent: false, configured: false };
      const sent = await state();
      if (sent[event.id]) return { sent: false, duplicate: true };
      const response = await fetcher(endpoint.href, { method: "POST", credentials: "omit",
        redirect: "error", signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json",
          ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}) },
        body: JSON.stringify({ to: recipient, subject: event.subject, text: event.text,
          eventType: event.type, entityId: event.entityId, occurredAt: new Date(now()).toISOString() }) });
      if (!response.ok) throw new Error(`notification-webhook-${response.status}`);
      sent[event.id] = new Date(now()).toISOString();
      await remember(sent);
      try { await onDelivery({ ...event, deliveredAt: sent[event.id], success: true }); }
      catch (error) { console.error("Notification audit failed:", error.message); }
      return { sent: true };
    });
    queue = operation.catch(error => {
      console.error("License notification failed:", error.message);
      return onDelivery({ ...event, deliveredAt: new Date(now()).toISOString(),
        success: false, error: error.message }).catch(() => {});
    });
    return operation;
  }
  // One daily summary of every license that has expired recently or ends soon, sent once a day
  // from the configured local hour. It replaces one reminder per license.
  function localDay(timestamp) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", { timeZone: digestTimeZone,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
  }
  function expiringLicenses(tenants, consultants, timestamp) {
    const organizations = new Map();
    for (const [id, entry] of Object.entries(consultants || {})) {
      const tenantId = id.split(":")[0];
      if (!organizations.has(tenantId) || id.endsWith(":00000000-0000-0000-0000-000000000000")) {
        organizations.set(tenantId, entry);
      }
    }
    // Days are counted in calendar days of the summary's time zone, so tomorrow is one day away.
    const calendarDay = value => Date.parse(`${localDay(value).date}T00:00:00Z`);
    const today = calendarDay(timestamp);
    return [
      ...Object.entries(tenants || {}).map(([id, entry]) => ({ id, entry, kind: "tenant" })),
      ...[...organizations].map(([id, entry]) => ({ id, entry, kind: "consultant" }))
    ].filter(item => item.entry.enabled).map(item => ({ ...item,
      expired: Date.parse(item.entry.expiresAt) <= timestamp,
      days: Math.round((calendarDay(Date.parse(item.entry.expiresAt)) - today) / 86400000) }))
      .filter(item => item.days > -DIGEST_DAYS && item.days <= DIGEST_DAYS)
      .sort((a, b) => Date.parse(a.entry.expiresAt) - Date.parse(b.entry.expiresAt));
  }
  function digestText(items, date) {
    const utc = value => new Date(value).toISOString().slice(0, 16).replace("T", " ") + " UTC";
    const relative = days => days === 0 ? "i dag" : days === 1 ? "i morgon" : days === -1 ? "i går"
      : days > 0 ? `om ${days} dagar` : `för ${-days} dagar sedan`;
    const line = item => {
      const kind = item.kind === "consultant" ? "konsultföretag"
        : item.entry.licenseType === "trial" ? "kundföretag, testlicens" : "kundföretag, ordinarie licens";
      const when = `${item.expired ? "gick ut" : "går ut"} ${utc(item.entry.expiresAt)} (${relative(item.days)})`;
      return `- ${item.entry.name || "Namnlöst företag"} – ${kind} – ${when} – ID ${item.id}`;
    };
    const groups = [["Har gått ut", items.filter(item => item.expired)],
      [`Inom ${SOON_DAYS} dagar`, items.filter(item => !item.expired && item.days <= SOON_DAYS)],
      [`Inom ${DIGEST_DAYS} dagar`, items.filter(item => !item.expired && item.days > SOON_DAYS)]]
      .filter(([, group]) => group.length);
    return [`Licenser som har gått ut eller går ut inom ${DIGEST_DAYS} dagar, ${date}.`, "",
      ...groups.flatMap(([title, group]) => [`${title} (${group.length})`, ...group.map(line), ""]),
      ...(adminUrl ? [`Förläng eller spärra licenserna i licensadministrationen: ${adminUrl}`]
        : ["Förläng eller spärra licenserna i licensadministrationen."])].join("\n");
  }
  // Whether today's summary is due: after the hour and not yet sent. Checked before licenses are read.
  async function due() {
    if (!endpoint || !recipient) return false;
    const today = localDay(now());
    return today.hour >= digestHour && !(await state())[`expiry-digest:${today.date}`];
  }
  async function scan(tenants, consultants) {
    const timestamp = now();
    const today = localDay(timestamp);
    if (today.hour < digestHour) return { sent: false, reason: "before-digest-hour" };
    const items = expiringLicenses(tenants, consultants, timestamp);
    if (!items.length) return { sent: false, reason: "nothing-expiring" };
    return send({ id: `expiry-digest:${today.date}`, type: "license-expiry-digest", entityId: today.date,
      subject: `BC Process Studio: ${items.length} ${items.length === 1 ? "licens har gått ut eller går ut snart"
        : "licenser har gått ut eller går ut snart"}`,
      text: digestText(items, today.date) });
  }
  return Object.freeze({ send, scan, due, configured: Boolean(endpoint && recipient) });
}

module.exports = { createNotifier, DIGEST_DAYS, SOON_DAYS };
