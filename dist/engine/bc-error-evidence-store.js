(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BcErrorEvidenceStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function create({ storage, prefix, indexPrefix = `${prefix}index_` } = {}) {
    if (!storage?.get || !storage?.set || !storage?.remove || !prefix) {
      throw new TypeError("Evidence storage and a key prefix are required.");
    }
    const indexCache = new Map();
    const queues = new Map();
    const indexKey = recordingId => `${indexPrefix}${recordingId}`;
    const itemKey = evidenceId => `${prefix}${evidenceId}`;

    function enqueue(recordingId, operation) {
      const previous = queues.get(recordingId) || Promise.resolve();
      const current = previous.then(operation);
      const tail = current.catch(() => {});
      queues.set(recordingId, tail);
      return current.finally(() => {
        if (queues.get(recordingId) === tail) queues.delete(recordingId);
      });
    }

    async function readIndex(recordingId) {
      if (indexCache.has(recordingId)) return [...indexCache.get(recordingId)];
      const key = indexKey(recordingId);
      const data = await storage.get(key);
      const ids = Array.isArray(data?.[key])
        ? [...new Set(data[key].filter(value => typeof value === "string" && value))]
        : null;
      if (ids) {
        indexCache.set(recordingId, ids);
        return [...ids];
      }
      // Older versions stored evidence without a per-recording index. Scan once,
      // then persist an index so subsequent reads are proportional to this report.
      let all;
      if (typeof storage.getKeys === "function") {
        const candidateKeys = (await storage.getKeys()).filter(key =>
          key.startsWith(prefix) && !key.startsWith(indexPrefix));
        all = await storage.get(candidateKeys);
      } else {
        all = await storage.get(null);
      }
      const legacyIds = Object.entries(all || {})
        .filter(([key, value]) => key.startsWith(prefix) &&
          !key.startsWith(indexPrefix) && value?.recordingId === recordingId)
        .map(([, value]) => String(value.errorEvidenceId || ""))
        .filter(Boolean);
      const unique = [...new Set(legacyIds)];
      indexCache.set(recordingId, unique);
      await storage.set({ [key]: unique });
      return [...unique];
    }

    function save(evidence) {
      const recordingId = String(evidence?.recordingId || "");
      const evidenceId = String(evidence?.errorEvidenceId || "");
      if (!recordingId || !evidenceId) {
        throw new TypeError("Evidence and recording IDs are required.");
      }
      return enqueue(recordingId, async () => {
        const ids = await readIndex(recordingId);
        if (!ids.includes(evidenceId)) ids.push(evidenceId);
        indexCache.set(recordingId, ids);
        await storage.set({
          [itemKey(evidenceId)]: evidence,
          [indexKey(recordingId)]: ids
        });
        return evidence;
      });
    }

    function initialize(recordingId) {
      const id = String(recordingId || "");
      if (!id) throw new TypeError("A recording ID is required.");
      return enqueue(id, async () => {
        const key = indexKey(id);
        const data = await storage.get(key);
        const existing = data?.[key];
        if (Array.isArray(existing)) {
          indexCache.set(id, [...new Set(existing.filter(value =>
            typeof value === "string" && value))]);
          return false;
        }
        indexCache.set(id, []);
        await storage.set({ [key]: [] });
        return true;
      });
    }

    function list(recordingId) {
      const id = String(recordingId || "");
      return enqueue(id, async () => {
        const ids = await readIndex(id);
        if (!ids.length) return [];
        const data = await storage.get(ids.map(itemKey));
        return ids.map(item => data?.[itemKey(item)])
          .filter(value => value?.recordingId === id);
      });
    }

    function remove(recordingId) {
      const id = String(recordingId || "");
      return enqueue(id, async () => {
        const ids = await readIndex(id);
        await storage.remove([...ids.map(itemKey), indexKey(id)]);
        indexCache.delete(id);
        return ids.length;
      });
    }

    return Object.freeze({ initialize, save, list, remove });
  }

  return Object.freeze({ create });
});
