(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9EventLogStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const FORMAT = "chunked-v1";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function create({ storage, prefix, batchSize = 250, maxSnapshots = 3,
    maxCachedEvents = 30000, snapshotTtlMs = 5 * 60 * 1000,
    now = Date.now } = {}) {
    if (!storage?.get || !storage?.set || !storage?.remove || !prefix) {
      throw new TypeError("Event log storage and a key prefix are required.");
    }
    const snapshots = new Map();
    let queue = Promise.resolve();

    function headerKey(recordingId) { return prefix + recordingId; }
    function eventKey(recordingId, sequence) {
      return `${prefix}${recordingId}:event:${String(sequence).padStart(8, "0")}`;
    }
    function snapshotFor(recordingId) {
      const entry = snapshots.get(recordingId);
      if (!entry) return null;
      if (entry.expiresAt <= now()) {
        snapshots.delete(recordingId);
        return null;
      }
      snapshots.delete(recordingId);
      snapshots.set(recordingId, entry);
      return entry;
    }
    function remember(recordingId, recording, revision) {
      const events = Array.isArray(recording?.events) ? recording.events : [];
      if (!recording || events.length > maxCachedEvents) {
        snapshots.delete(recordingId);
        return false;
      }
      snapshots.delete(recordingId);
      snapshots.set(recordingId, { recording, revision,
        eventCount: events.length, expiresAt: now() + snapshotTtlMs });
      let cachedEvents = [...snapshots.values()].reduce((total, entry) =>
        total + entry.eventCount, 0);
      while (snapshots.size > Math.max(1, maxSnapshots) ||
          cachedEvents > maxCachedEvents) {
        const oldestId = snapshots.keys().next().value;
        cachedEvents -= snapshots.get(oldestId)?.eventCount || 0;
        snapshots.delete(oldestId);
      }
      return snapshots.has(recordingId);
    }
    function snapshotRevision(header) {
      try { return JSON.stringify(header || null); }
      catch { return ""; }
    }
    function enqueue(operation) {
      const result = queue.then(operation);
      queue = result.catch(() => {});
      return result;
    }

    async function read(recordingId) {
      const key = headerKey(recordingId);
      const data = await storage.get(key);
      const header = data?.[key];
      if (!header) {
        snapshots.delete(recordingId);
        return null;
      }
      const revision = snapshotRevision(header);
      const cached = snapshotFor(recordingId);
      if (cached && cached.revision === revision) {
        return clone(cached.recording);
      }
      if (header.eventStorageFormat !== FORMAT) {
        remember(recordingId, header, revision);
        return clone(header);
      }
      const count = Number(header.eventCount);
      if (!Number.isInteger(count) || count < 0 || count > 100000) {
        throw new Error(`Invalid event log count for recording ${recordingId}.`);
      }
      const events = [];
      for (let offset = 0; offset < count; offset += batchSize) {
        const end = Math.min(count, offset + batchSize);
        const keys = Array.from({ length: end - offset }, (_, index) =>
          eventKey(recordingId, offset + index + 1));
        const batch = await storage.get(keys);
        for (const itemKey of keys) {
          if (!batch?.[itemKey]) throw new Error(`Missing persisted event: ${itemKey}`);
          events.push(batch[itemKey]);
        }
      }
      const recording = { ...header, events };
      remember(recordingId, recording, revision);
      return clone(recording);
    }

    function load(recordingId) {
      return enqueue(() => read(recordingId));
    }

    function save(recording) {
      return enqueue(async () => {
        const recordingId = String(recording?.recordingId || recording?.id || "");
        if (!recordingId || !Array.isArray(recording.events)) {
          throw new TypeError("A recording ID and event array are required.");
        }
        const cached = snapshotFor(recordingId);
        const previous = cached ? cached.recording : await read(recordingId);
        const previousEvents = previous?.events || [];
        const legacy = previous && previous.eventStorageFormat !== FORMAT;
        const writeAllEvents = Boolean(legacy);
        const patch = {};
        if (writeAllEvents || recording.events.length < previousEvents.length) {
          recording.events.forEach((event, index) => {
            patch[eventKey(recordingId, index + 1)] = event;
          });
        } else if (recording.events.length > previousEvents.length) {
          for (let index = previousEvents.length; index < recording.events.length; index += 1) {
            patch[eventKey(recordingId, index + 1)] = recording.events[index];
          }
        } else {
          for (let index = 0; index < recording.events.length; index += 1) {
            const before = previousEvents[index];
            const after = recording.events[index];
            if (!before || before.id !== after?.id ||
                before.screenshotAssetId !== after?.screenshotAssetId) {
              patch[eventKey(recordingId, index + 1)] = after;
            }
          }
        }
        const { events, ...header } = recording;
        patch[headerKey(recordingId)] = { ...header,
          eventStorageFormat: FORMAT, eventCount: events.length };
        await storage.set(patch);
        if (previousEvents.length > events.length) {
          const obsolete = Array.from({ length: previousEvents.length - events.length },
            (_, index) => eventKey(recordingId, events.length + index + 1));
          for (let offset = 0; offset < obsolete.length; offset += batchSize) {
            await storage.remove(obsolete.slice(offset, offset + batchSize));
          }
        }
        const saved = { ...header, eventStorageFormat: FORMAT,
          eventCount: events.length, events };
        remember(recordingId, saved, snapshotRevision({ ...header,
          eventStorageFormat: FORMAT, eventCount: events.length }));
      });
    }

    function remove(recordingId) {
      return enqueue(async () => {
        const key = headerKey(recordingId);
        const cached = snapshotFor(recordingId);
        let header = cached?.recording || null;
        if (!cached) {
          const data = await storage.get(key);
          header = data?.[key] || null;
        }
        const count = Number(header?.eventCount ?? header?.events?.length);
        const validCount = Number.isInteger(count) && count >= 0 && count <= 100000;
        let keys;
        if (typeof storage.getKeys === "function") {
          keys = (await storage.getKeys()).filter(itemKey =>
            itemKey === key || itemKey.startsWith(`${key}:event:`));
        } else if (header?.eventStorageFormat === FORMAT && validCount) {
          keys = [key, ...Array.from({ length: count }, (_, index) =>
            eventKey(recordingId, index + 1))];
        } else {
          // If the header is missing or damaged, enumerate persisted keys as a
          // last-resort recovery path so orphaned event chunks remain removable.
          const all = await storage.get(null);
          keys = [key, ...Object.keys(all || {}).filter(itemKey =>
            itemKey.startsWith(`${key}:event:`))];
        }
        for (let offset = 0; offset < keys.length; offset += batchSize) {
          await storage.remove(keys.slice(offset, offset + batchSize));
        }
        snapshots.delete(recordingId);
        return validCount ? count : keys.filter(itemKey =>
          itemKey.startsWith(`${key}:event:`)).length;
      });
    }

    function release(recordingId) {
      snapshots.delete(recordingId);
    }

    return Object.freeze({ load, save, remove, release });
  }

  return Object.freeze({ create });
});
