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
        ["input", "change"].includes(event.inputSource) && hasValue(event)) {
      return FIELD_INPUT;
    }
    return event?.category || "";
  }

  function shouldCapture(settings = {}, event = {}) {
    if (!settings.captureScreenshots) return false;
    const mode = settings.screenshotMode || "important";
    if (mode === "none") return false;
    const captureCategory = category(event);
    if (captureCategory === FIELD_INPUT) return true;
    if (mode === "all") {
      return ["action", "dialog", "navigation"].includes(captureCategory);
    }
    return ["action", "dialog"].includes(captureCategory);
  }

  function canReuse(existing, candidate) {
    if (existing?.category === FIELD_INPUT || candidate?.category === FIELD_INPUT) {
      return existing?.category === FIELD_INPUT &&
        candidate?.category === FIELD_INPUT &&
        existing.captureKey === candidate.captureKey;
    }
    return true;
  }

  return { FIELD_INPUT, canReuse, category, shouldCapture };
});
