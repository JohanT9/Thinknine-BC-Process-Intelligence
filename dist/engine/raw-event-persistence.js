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
    let pendingWrites = 0;
    const failures = [];

    function enqueue(recordingId, operation, operationType) {
      pendingWrites += 1;
      const result = writes.then(async () => {
        let phase = "load";
        try {
          const current = await adapter.load(recordingId);
          phase = "operation";
          const next = await operation(current);
          if (next !== current) {
            phase = "save";
            await adapter.save(next);
          }
          return next;
        } catch (error) {
          error.canonicalWritePhase = phase;
          throw error;
        }
      });
      const tracked = result.catch(error => {
        failures.push({ code: "canonical-write-failure", recordingId,
          operationType, phase: error.canonicalWritePhase || "unknown",
          message: String(error?.message || error) });
        throw error;
      }).finally(() => { pendingWrites -= 1; });
      writes = tracked.catch(() => {});
      return tracked;
    }

    return {
      create(recording) {
        return enqueue(recording.id, () => recording, "create");
      },
      append(recordingId, rawEvent, identification = null) {
        return enqueue(recordingId, current => {
          if (!current) throw new Error(`Recording not found: ${recordingId}`);
          return canonical.addEvent(current, rawEvent, identification);
        }, "append-event");
      },
      associateScreenshot(recordingId, eventId, dataUrl, createdAt) {
        return enqueue(recordingId, current => {
          if (!current) throw new Error(`Recording not found: ${recordingId}`);
          return canonical.addScreenshot(current, eventId, dataUrl, createdAt);
        }, "associate-screenshot");
      },
      finalize(recordingId, finishedAt) {
        if (failures.some(item => item.recordingId === recordingId &&
            ["load", "save"].includes(item.phase))) {
          return Promise.reject(new Error(
            "Canonical persistence has failed writes; recording cannot be finalized."
          ));
        }
        return enqueue(recordingId, current => {
          if (!current) throw new Error(`Recording not found: ${recordingId}`);
          return canonical.finish(current, finishedAt);
        }, "finalize");
      },
      flush() { return writes; },
      diagnostics() { return { pendingWrites, failures: failures.map(value =>
        ({ ...value })) }; }
    };
  }

  return { createStore };
});
