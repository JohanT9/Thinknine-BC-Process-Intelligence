const crypto = require("node:crypto");

// A full export of every license dataset. The same export is downloaded from the admin view and
// written once a day to Azure Blob Storage, where a lifecycle rule removes old copies.
const FORMAT = "bc-process-studio-license-backup";
const SCHEMA_VERSION = 1;
const BLOB_API_VERSION = "2023-11-03";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
// A new role assignment can take a few minutes to apply after the setup restarts the service.
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;
const STATUS_KEY = "backup-status";

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort()
    .map(key => [key, canonical(value[key])])) : value;
const checksum = value => crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const countOf = value => Array.isArray(value) ? value.length
  : value && typeof value === "object" ? Object.keys(value).length : 0;

function createBackup({ collect, storageMode, now = Date.now, accountUrl = "", container = "license-backups",
  credential = null, fetcher = fetch, readStatus = async () => null, writeStatus = async () => {},
  onResult = () => {} }) {
  async function exportData() {
    const data = await collect();
    const counts = Object.fromEntries(Object.entries(data).map(([name, value]) => [name, countOf(value)]));
    return { format: FORMAT, schemaVersion: SCHEMA_VERSION, createdAt: new Date(now()).toISOString(),
      storage: storageMode, counts, checksum: checksum(data), data };
  }
  const blobAccountUrl = accountUrl.replace(".table.core.windows.net", ".blob.core.windows.net");
  const configured = Boolean(credential && /^https:\/\/[a-z0-9]{3,24}\.blob\.core\.windows\.net$/u.test(blobAccountUrl) &&
    /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u.test(container));
  const blobName = timestamp => `licenses-${new Date(timestamp).toISOString().slice(0, 10)}.json`;

  // Writes today's copy unless it already exists; an existing blob is never overwritten.
  async function runIfDue() {
    if (!configured) return { skipped: "not-configured" };
    const name = blobName(now());
    const attemptedAt = new Date(now()).toISOString();
    if ((await readStatus().catch(() => null))?.lastBlob === name) return { skipped: "exists", name };
    try {
      const backup = await exportData();
      const token = await credential.getToken("https://storage.azure.com/.default");
      const response = await fetcher(`${blobAccountUrl}/${container}/${name}`, { method: "PUT",
        headers: { Authorization: `Bearer ${token.token}`, "x-ms-version": BLOB_API_VERSION,
          "x-ms-blob-type": "BlockBlob", "Content-Type": "application/json", "If-None-Match": "*" },
        body: JSON.stringify(backup), signal: AbortSignal.timeout(60000) });
      if (response.status === 409) return { skipped: "exists", name };
      if (!response.ok) throw new Error(`Blob Storage answered HTTP ${response.status}`);
      const status = { ...(await readStatus() || {}), lastAttemptAt: attemptedAt, lastSuccessAt: attemptedAt,
        lastBlob: name, counts: backup.counts, checksum: backup.checksum, error: "" };
      await writeStatus(status);
      onResult({ success: true, name, counts: backup.counts });
      return { created: true, name };
    } catch (error) {
      const message = String(error?.message || error).slice(0, 300);
      await writeStatus({ ...(await readStatus().catch(() => null) || {}), lastAttemptAt: attemptedAt,
        lastFailureAt: attemptedAt, error: message }).catch(() => {});
      onResult({ success: false, name, error: message });
      return { failed: true, name, error: message };
    }
  }
  function start() {
    if (!configured) return () => {};
    const run = () => runIfDue().catch(() => {});
    const first = setTimeout(run, FIRST_RUN_DELAY_MS); first.unref();
    const timer = setInterval(run, CHECK_INTERVAL_MS); timer.unref();
    return () => { clearTimeout(first); clearInterval(timer); };
  }
  async function status() { return { configured, container, ...(await readStatus() || {}) }; }
  return Object.freeze({ exportData, runIfDue, start, status, configured, blobName });
}

module.exports = { createBackup, FORMAT, SCHEMA_VERSION, STATUS_KEY, checksum };
