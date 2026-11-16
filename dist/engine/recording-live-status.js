(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RecordingLiveStatus = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Business Central draws icons with characters from a private font; outside the page they show
  // as empty squares, so they are left out, as in the documents, along with invisible format marks.
  function text(value, max = 120) {
    return String(value || "").replace(/[\p{Cf}\p{Co}]+/gu, "").replace(/\s+/g, " ").trim()
      .slice(0, max);
  }

  function nonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  // What the user did, as opposed to what followed from it: a click or shortcut, a field that
  // was filled in, or a choice. Focus changes, pages loading, dialogs and status messages are
  // recorded too, but they are not steps of their own. Markers apply to the same steps.
  const STEP_CATEGORIES = new Set(["action", "field", "selection"]);
  const MAX_RECENT_STEPS = 5;
  function isUserStep(event) {
    return Boolean(event?.interactionId) && STEP_CATEGORIES.has(String(event.category || ""));
  }

  // A search result in Business Central ends with its category and an icon, such as
  // "Släppta produktionsorder Listor" and an icon character. The documents name the page alone,
  // and so does the panel. Only a name that ends with the icon is a search result.
  const RESULT_CATEGORY = /\s+(?:listor|lists|lister|listen|listes|listas|luettelot)\s*[\uE000-\uF8FF]+\s*$/iu;
  function withoutResultCategory(value) {
    return String(value || "").replace(RESULT_CATEGORY, "");
  }

  // A name as the user reads it: without a search result's category, the sort order the client
  // adds for screen readers (in every language it has) and icon characters.
  function stepName(value) {
    const captions = typeof globalThis !== "undefined" ? globalThis.T9BCClientCaptions : null;
    const sorted = withoutResultCategory(value);
    return text(captions?.withoutSorting ? captions.withoutSorting(sorted) : sorted, 100);
  }

  // A row of a list is named after the record it holds, in quotes at the end of its name, such
  // as Välj posten "3" or Choisir l'enregistrement « 3 ». The record is what the user chose.
  // Some languages put the verb last, as in Datensatz "3" auswählen; that is only read so on a
  // row that carried its column's sort order, so a button such as Visa "Order" kort is left alone.
  const QUOTED_RECORD = /["“”„«‹'‘’]\s*([^"“”„«»‹›]{1,80}?)\s*["“”»›'’]\s*$/u;
  const QUOTED_RECORD_THEN_VERB = /["“”„«‹'‘’]\s*([^"“”„«»‹›]{1,80}?)\s*["“”»›'’](?:\s+\p{L}+){1,2}\s*$/u;
  function chosenRecord(event) {
    if (event?.category === "field") return "";
    const name = String(event?.label || event?.actionCaption || event?.controlCaption || "");
    const captions = typeof globalThis !== "undefined" ? globalThis.T9BCClientCaptions : null;
    const sorted = Boolean(captions?.withoutSorting) &&
      captions.withoutSorting(name) !== name.replace(/\s+/gu, " ").trim();
    return text((name.match(QUOTED_RECORD) || (sorted && name.match(QUOTED_RECORD_THEN_VERB)))?.[1], 80);
  }

  // The latest steps, oldest first. Only names are kept, never field values. Further changes
  // to the same field or control replace its step rather than adding one.
  function addStep(steps, event) {
    const list = Array.isArray(steps) ? steps.slice(-MAX_RECENT_STEPS) : [];
    if (!isUserStep(event)) return list;
    const entry = {
      interactionId: text(event.interactionId, 120),
      type: text(event.type, 60),
      category: text(event.category, 60),
      actionCaption: stepName(event.actionCaption),
      fieldName: stepName(event.fieldName),
      controlCaption: stepName(event.controlCaption),
      label: stepName(event.label),
      record: chosenRecord(event),
      pageCaption: text(event.pageCaption, 100),
      capturedAt: text(event.timestamp || event.capturedAt, 40)
    };
    if (list.at(-1)?.interactionId === entry.interactionId) list[list.length - 1] = entry;
    else list.push(entry);
    return list.slice(-MAX_RECENT_STEPS);
  }

  function latestAction(lastEvent) {
    if (!lastEvent) return null;
    return {
      type: text(lastEvent.type, 60),
      category: text(lastEvent.category, 60),
      label: text(lastEvent.actionCaption || lastEvent.fieldName ||
        lastEvent.controlCaption || lastEvent.label, 100),
      ...(lastEvent.interactionId ? { interactionId: text(lastEvent.interactionId, 120) } : {}),
      ...(lastEvent.record ? { record: text(lastEvent.record, 80) } : {}),
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
      recentSteps: [],
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
      // The latest steps the user took, oldest first; the last one is what a marker applies to.
      steps: (Array.isArray(sessionDebug.recentSteps) ? sessionDebug.recentSteps : [])
        .map(latestAction).filter(Boolean),
      screenshots,
      warnings
    };
  }

  return { addStep, derive, freshSessionDebug, incrementEventCounts, isUserStep, latestAction,
    persistenceFailure };
});
