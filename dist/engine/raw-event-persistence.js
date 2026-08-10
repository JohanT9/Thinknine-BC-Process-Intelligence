(function (root, factory) {
  const canonical = typeof module === "object" && module.exports
    ? require("./canonical-recording") : root.T9CanonicalRecording;
  const api = factory(canonical);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RawEventPersistence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (canonical) {
  "use strict";

  function createStore(adapter) {
    if (!adapter?.load || !adapter?.save) throw new TypeError("A load/save adapter is required.");
    let writes = Promise.resolve();

    function enqueue(recordingId, operation) {
      const result = writes.then(async () => {
        const current = await adapter.load(recordingId);
        const next = await operation(current);
        if (next !== current) await adapter.save(next);
        return next;
      });
      writes = result.catch(() => {});
      return result;
    }

    return {
      create(recording) {
        return enqueue(recording.id, () => recording);
      },
      append(recordingId, rawEvent, identification = null) {
        return enqueue(recordingId, current => {
          if (!current) throw new Error(`Recording not found: ${recordingId}`);
          return canonical.addEvent(current, rawEvent, identification);
        });
      },
      associateScreenshot(recordingId, eventId, dataUrl, createdAt) {
        return enqueue(recordingId, current => {
          if (!current) throw new Error(`Recording not found: ${recordingId}`);
          return canonical.addScreenshot(current, eventId, dataUrl, createdAt);
        });
      },
      finalize(recordingId, finishedAt) {
        return enqueue(recordingId, current => {
          if (!current) throw new Error(`Recording not found: ${recordingId}`);
          return canonical.finish(current, finishedAt);
        });
      },
      flush() { return writes; }
    };
  }

  return { createStore };
});
