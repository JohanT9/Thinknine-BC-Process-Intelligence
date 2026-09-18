const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;

function createNotifier({ dataDirectory, webhookUrl = "", webhookToken = "",
  recipient = "", fetcher = fetch, now = Date.now, onDelivery = async () => {},
  storage = null }) {
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
  async function scan(tenants, consultants) {
    const thresholds = [30, 14, 3];
    const organizations = new Map();
    for (const [id, entry] of Object.entries(consultants || {})) {
      const tenantId = id.split(":")[0];
      if (!organizations.has(tenantId) || id.endsWith(":00000000-0000-0000-0000-000000000000")) {
        organizations.set(tenantId, entry);
      }
    }
    const entries = [
      ...Object.entries(tenants || {}).map(([id, entry]) => ({ id, entry, kind: "tenant" })),
      ...[...organizations].map(([id, entry]) => ({ id, entry, kind: "consultant" }))
    ];
    for (const item of entries) {
      if (!item.entry.enabled) continue;
      const days = Math.ceil((Date.parse(item.entry.expiresAt) - now()) / 86400000);
      const threshold = thresholds.find(value => days > 0 && days <= value);
      if (threshold) await send({ id: `expiry:${item.kind}:${item.id}:${threshold}`,
        type: "license-expiring", entityId: item.id,
        subject: `BC Process Studio: licens löper ut inom ${threshold} dagar`,
        text: `${item.entry.name || item.id} löper ut ${item.entry.expiresAt}.` });
      else if (days <= 0) await send({ id: `expired:${item.kind}:${item.id}:${item.entry.expiresAt}`,
        type: "license-expired", entityId: item.id,
        subject: "BC Process Studio: licens har gått ut",
        text: `${item.entry.name || item.id} gick ut ${item.entry.expiresAt}.` });
    }
  }
  return Object.freeze({ send, scan, configured: Boolean(endpoint && recipient) });
}

module.exports = { createNotifier };
