(function (root, factory) {
  const captions = typeof module === "object" && module.exports
    ? require("./bc-client-captions") : root.T9BCClientCaptions;
  const api = factory(captions);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotCapturePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (captions) {
  const FIELD_INPUT = "field-input";
  // A status message the client only reads to screen readers (saving, sorting, row counts,
  // suggestions) shows nothing new and gets no screenshot of its own.
  const ANNOUNCEMENT = "announcement";

  function hasValue(event) {
    return event?.value !== undefined && event?.value !== null &&
      String(event.value).trim() !== "";
  }

  function category(event) {
    if (event?.type === "field-change" &&
        (["input", "change"].includes(event.inputSource) ||
          (event.inputSource === "focusout" &&
            event.previousValue !== event.value)) && hasValue(event)) {
      return FIELD_INPUT;
    }
    if (event?.type === "status-message" && captions?.isAnnouncement(
      event.accessibleName || event.label || event.text || "")) return ANNOUNCEMENT;
    if (event?.type === "click" && event.pointerTarget === true &&
        String(event.accessibleName || event.label || "").trim()) return "action";
    return event?.category || "";
  }

  function shouldCapture(settings = {}, event = {}) {
    if (!settings.captureScreenshots) return false;
    const mode = settings.screenshotMode || "important";
    if (mode === "none") return false;
    const captureCategory = category(event);
    if (captureCategory === FIELD_INPUT) return true;
    if (captureCategory === "result") return true;
    if (mode === "all") {
      return ["action", "dialog", "navigation"].includes(captureCategory);
    }
    return ["action", "dialog"].includes(captureCategory);
  }

  function captureKey(event = {}) {
    const field = String(event.fieldName || "").trim();
    const interaction = String(event.interactionId || "").trim();
    if (!field || !interaction) return "";
    const page = String(event.pageObjectId || event.pageId ||
      event.pageCaption || event.documentTitle || "").trim();
    const control = String(event.fieldId || event.controlId ||
      event.automationId || event.target?.automationId ||
      event.target?.id || "").trim();
    return JSON.stringify([interaction, page, field, control]);
  }

  function canReuse(existing, candidate) {
    return existing?.category === FIELD_INPUT &&
      candidate?.category === FIELD_INPUT &&
      Boolean(String(existing.captureKey || "").trim()) &&
      String(existing.captureKey) === String(candidate.captureKey || "");
  }

  return { ANNOUNCEMENT, FIELD_INPUT, canReuse, captureKey, category, shouldCapture };
});
