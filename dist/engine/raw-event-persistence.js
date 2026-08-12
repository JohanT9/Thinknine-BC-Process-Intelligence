(function (root, factory) {
  const canonical = typeof module === "object" && module.exports
    ? require("./canonical-recording") : root.T9CanonicalRecording;
  const api = factory(canonical);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RawEventPersistence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (canonical) {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function createRawStore(adapter) {
    if (!adapter?.load || !adapter?.save) throw new TypeError(
      "A raw recording load/save adapter is required."
    );
    let writes = Promise.resolve();
    let pendingWrites = 0;
    const failures = [];

    function enqueue(recordingId, operation, operationType) {
      pendingWrites += 1;
      const result = writes.then(async () => {
        const current = await adapter.load(recordingId);
        const outcome = await operation(current);
        const next = outcome?.stored === undefined ? outcome : outcome.stored;
        if (next !== current) await adapter.save(next);
        return clone(outcome?.stored === undefined ? next : outcome.result);
      });
      const tracked = result.catch(error => {
        failures.push({ code: "raw-event-write-failure", recordingId,
          operationType, message: String(error?.message || error) });
        throw error;
      }).finally(() => { pendingWrites -= 1; });
      writes = tracked.catch(() => {});
      return tracked;
    }

    return {
      create(recordingId, startedAt = new Date().toISOString()) {
        return enqueue(recordingId, current => current || {
          schemaVersion: 1, recordingId, startedAt, events: [], diagnostics: []
        }, "create");
      },
      appendRawEvent(recordingId, sourceEvent, options = {}) {
        return enqueue(recordingId, current => {
          if (!current) throw new Error(`Raw recording not found: ${recordingId}`);
          if (!sourceEvent || typeof sourceEvent !== "object" ||
              Array.isArray(sourceEvent) || !sourceEvent.type ||
              !sourceEvent.sourceEventId) throw new TypeError(
            "A raw event with type and sourceEventId is required."
          );
          const duplicate = current.events.find(item =>
            item.sourceEventId === sourceEvent.sourceEventId
          );
          if (duplicate) return { stored: current, result: {
            status: "duplicate", event: duplicate
          } };
          const maxEvents = Number.isFinite(options.maxEvents)
            ? Math.max(0, options.maxEvents) : 20000;
          if (current.events.length >= maxEvents) {
            const diagnostics = [...(current.diagnostics || [])];
            if (!diagnostics.some(item => item.code === "raw-event-limit-reached")) {
              diagnostics.push({ code: "raw-event-limit-reached", severity: "error",
                maxEvents, rejectedSourceEventId: sourceEvent.sourceEventId,
                occurredAt: sourceEvent.timestamp || new Date().toISOString() });
            }
            const stored = { ...current, truncated: true, diagnostics };
            return { stored, result: { status: "truncated", event: null,
              diagnostic: diagnostics.at(-1) } };
          }
          const event = clone({ ...sourceEvent, recordingId,
            acceptedSequence: current.events.length + 1 });
          return { stored: { ...current, events: [...current.events, event] },
            result: { status: "appended", event } };
        }, "append-raw-event");
      },
      load(recordingId) { return enqueue(recordingId, current => current, "load"); },
      flush() { return writes; },
      diagnostics() { return { pendingWrites,
        failures: failures.map(item => ({ ...item })) }; }
    };
  }

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

  return { createRawStore, createStore };
});
