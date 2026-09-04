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

  function freshSessionDebug(activeSessionId) {
    return {
      activeSessionId: String(activeSessionId || ""), eventCount: 0, lastEvent: null,
      lastError: null, screenshotStats: { requested: 0, captured: 0, reused: 0,
        dropped: 0, errors: 0 }, screenshotQueueLength: 0, lastScreenshotAt: null,
      lastScreenshotError: null, recordingHealth: null
    };
  }

  function derive({ session = null, debug = {}, connected = false } = {}) {
    const eventCount = nonNegative(session?.eventCount ?? debug.eventCount);
    const screenshotStats = debug.screenshotStats || {};
    const screenshots = {
      requested: nonNegative(screenshotStats.requested),
      captured: nonNegative(screenshotStats.captured),
      pending: nonNegative(debug.screenshotQueueLength),
      errors: nonNegative(screenshotStats.errors),
      lastCapturedAt: text(debug.lastScreenshotAt, 40)
    };
    const warnings = [];

    if (!connected) warnings.push({ code: "bc-not-connected",
      message: "Kontakten med Business Central är inte bekräftad." });
    if (eventCount === 0) warnings.push({ code: "no-events-yet",
      message: "Inga användarhändelser har registrerats ännu." });
    if (screenshots.errors > 0 || debug.lastScreenshotError) {
      warnings.push({ code: "screenshot-error",
        message: "Minst en skärmbild kunde inte tas." });
    } else if (eventCount > 0 && session?.settings?.captureScreenshots !== false &&
        screenshots.captured === 0 && screenshots.pending === 0) {
      warnings.push({ code: "no-screenshots-yet",
        message: "Händelser registreras, men ingen skärmbild har sparats ännu." });
    }
    if (debug.recordingHealth?.status === "truncated") {
      warnings.push({ code: "recording-truncated",
        message: "Maximalt antal händelser har uppnåtts." });
    }

    return {
      eventCount,
      connected: Boolean(connected),
      context: {
        environmentName: text(session?.settings?.environmentName, 100),
        companyName: text(session?.settings?.companyName, 100)
      },
      latestAction: latestAction(debug.lastEvent),
      screenshots,
      warnings
    };
  }

  return { derive, freshSessionDebug, latestAction };
});
