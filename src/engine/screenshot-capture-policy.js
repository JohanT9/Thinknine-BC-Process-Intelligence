(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotCapturePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FIELD_INPUT = "field-input";

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

  return { FIELD_INPUT, canReuse, captureKey, category, shouldCapture };
});
