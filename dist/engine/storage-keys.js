(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9StorageKeys = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SESSION_PREFIX = "t9_session_";
  const EVENT_PREFIX = "t9_events_";
  const SCREENSHOT_PREFIX = "t9_screenshots_";
  const REVIEW_PREFIX = "t9_review_";

  function sessionDataKeys(sessionId) {
    return [
      SESSION_PREFIX + sessionId,
      EVENT_PREFIX + sessionId,
      SCREENSHOT_PREFIX + sessionId,
      REVIEW_PREFIX + sessionId
    ];
  }

  return {
    EVENT_PREFIX,
    REVIEW_PREFIX,
    SCREENSHOT_PREFIX,
    SESSION_PREFIX,
    sessionDataKeys
  };
});
