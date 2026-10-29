(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RecordingLiveStatus = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function text(value, max = 120) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function nonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function latestAction(lastEvent) {
    if (!lastEvent) return null;
    return {
      type: text(lastEvent.type, 60),
      category: text(lastEvent.category, 60),
      label: text(lastEvent.actionCaption || lastEvent.fieldName ||
        lastEvent.controlCaption, 100),
      pageCaption: text(lastEvent.pageCaption, 100),
      capturedAt: text(lastEvent.capturedAt, 40),
      hasAccessibleLabel: Boolean(lastEvent.hasAccessibleLabel)
    };
  }

  function incrementEventCounts(current = {}, event = {}) {
    const eventTypeCounts = { ...(current.eventTypeCounts || {}) };
    const eventCategoryCounts = { ...(current.eventCategoryCounts || {}) };
    const type = text(event.type, 60) || "other";
    const category = text(event.category, 60) || "other";
    eventTypeCounts[type] = nonNegative(eventTypeCounts[type]) + 1;
    eventCategoryCounts[category] = nonNegative(eventCategoryCounts[category]) + 1;
    return { eventTypeCounts, eventCategoryCounts };
  }

  function persistenceFailure({ rawEventPersisted = false,
    canonicalEventPersisted = false, occurredAt = new Date().toISOString() } = {}) {
    const operation = !rawEventPersisted ? "raw-event-write" :
      !canonicalEventPersisted ? "raw-to-canonical-event" : "event-evidence-update";
    return { status: "persistence-error", occurredAt, operation };
  }

  function freshSessionDebug(activeSessionId) {
    return {
      activeSessionId: String(activeSessionId || ""), eventCount: 0, lastEvent: null,
      lastError: null, screenshotStats: { requested: 0, captured: 0, reused: 0,
        dropped: 0, errors: 0 }, screenshotQueueLength: 0, lastScreenshotAt: null,
      lastScreenshotError: null, recordingHealth: null, captureSequence: {}
    };
  }

  function derive({ session = null, debug = {}, connected = false } = {}) {
    const sessionId = String(session?.id || "");
    const debugBelongsToSession = !sessionId ||
      String(debug.activeSessionId || "") === sessionId;
    const sessionDebug = debugBelongsToSession ? debug : {};
    const eventCount = nonNegative(session?.eventCount ?? sessionDebug.eventCount);
    const screenshotStats = sessionDebug.screenshotStats || {};
    const screenshots = {
      requested: nonNegative(screenshotStats.requested),
      captured: nonNegative(screenshotStats.captured),
      pending: nonNegative(sessionDebug.screenshotQueueLength),
      errors: nonNegative(screenshotStats.errors),
      dropped: nonNegative(screenshotStats.dropped),
      lastCapturedAt: text(sessionDebug.lastScreenshotAt, 40)
    };
    const warnings = [];

    if (sessionDebug.recordingHealth?.status === "license-error") {
      warnings.push({ code: "license-blocked",
        message: "Licensen eller tenantkontexten hindrar fortsatt inspelning." });
    }
    if (sessionDebug.recordingHealth?.status === "persistence-error") {
      warnings.push({ code: "capture-write-error",
        message: "En inspelningshändelse kunde inte sparas säkert. Inspelningen kan vara ofullständig." });
    }
    // Numbers a frame used that never arrived: events not delivered yet, or lost.
    const missingEvents = Object.values(sessionDebug.captureSequence || {}).reduce(
      (total, frame) => total + Math.max(0, nonNegative(frame?.max) - nonNegative(frame?.count)), 0);
    if (missingEvents > 0) {
      warnings.push({ code: "events-missing", count: missingEvents,
        message: "Några händelser har inte kommit fram. Inspelningen kan vara ofullständig." });
    }
    if (sessionDebug.recordingHealth?.status === "truncated") {
      warnings.push({ code: "recording-truncated",
        message: "Maximalt antal händelser har uppnåtts." });
    }
    if (!connected) warnings.push({ code: "bc-not-connected",
      message: "Kontakten med Business Central är inte bekräftad." });
    if (eventCount === 0) warnings.push({ code: "no-events-yet",
      message: "Inga användarhändelser har registrerats ännu." });
    if (screenshots.errors > 0 || sessionDebug.lastScreenshotError) {
      warnings.push({ code: "screenshot-error",
        message: "Minst en skärmbild kunde inte tas." });
    } else if (screenshots.dropped > 0 &&
        session?.settings?.captureScreenshots !== false &&
        session?.settings?.screenshotMode !== "none") {
      warnings.push({ code: "screenshot-dropped",
        message: "Några skärmbilder kunde inte sparas. Vissa steg kan sakna bild." });
    } else if (eventCount > 0 && session?.settings?.captureScreenshots !== false &&
        screenshots.captured === 0 && screenshots.pending === 0) {
      warnings.push({ code: "no-screenshots-yet",
        message: "Händelser registreras, men ingen skärmbild har sparats ännu." });
    }
    return {
      eventCount,
      connected: Boolean(connected),
      context: {
        environmentName: text(session?.settings?.environmentName, 100),
        companyName: text(session?.settings?.companyName, 100)
      },
      latestAction: latestAction(sessionDebug.lastEvent),
      screenshots,
      warnings
    };
  }

  return { derive, freshSessionDebug, incrementEventCounts, latestAction,
    persistenceFailure };
});
