(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9StorageKeys = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SESSION_PREFIX = "t9_session_";
  const RECORDING_PREFIX = "t9_recording_";
  const RAW_RECORDING_PREFIX = "t9_raw_recording_";
  const EVENT_PREFIX = "t9_events_";
  const SCREENSHOT_PREFIX = "t9_screenshots_";
  const SCREENSHOT_ASSET_PREFIX = "t9_screenshot_asset_";
  const SCREENSHOT_BLOB_PREFIX = "t9_screenshot_blob_";
  const SCREENSHOT_MANIFEST_PREFIX = "t9_screenshot_manifest_";
  const REVIEW_PREFIX = "t9_review_";
  // Not "t9_review_progress_": everything under REVIEW_PREFIX is read as a review.
  const REVIEW_PROGRESS_PREFIX = "t9_progress_";
  const DOCUMENT_LIBRARY_KEY = "t9_document_library";
  // The library's folder tree (document/document-folders.js).
  const DOCUMENT_FOLDERS_KEY = "t9_document_folders";
  // The latest library import (document/library-transfer.js) and the entries it replaced,
  // kept so that it can be undone. Not under any document prefix, so never exported.
  const LIBRARY_IMPORT_UNDO_KEY = "t9_library_import_undo";
  const LIBRARY_IMPORT_UNDO_ENTRY_PREFIX = "t9_library_import_undo_entry_";
  const BUG_REPORT_PREFIX = "t9_bug_report_";
  const BC_ERROR_EVIDENCE_PREFIX = "t9_bc_error_evidence_";
  // One entry per test run, keyed by its own id; each names the recording it tests.
  const TEST_RUN_PREFIX = "t9_test_run_";

  function sessionDataKeys(sessionId) {
    return [
      SESSION_PREFIX + sessionId,
      RECORDING_PREFIX + sessionId,
      RAW_RECORDING_PREFIX + sessionId,
      EVENT_PREFIX + sessionId,
      SCREENSHOT_PREFIX + sessionId,
      SCREENSHOT_MANIFEST_PREFIX + sessionId,
      REVIEW_PREFIX + sessionId,
      REVIEW_PROGRESS_PREFIX + sessionId
    ];
  }

  return {
    BUG_REPORT_PREFIX,
    BC_ERROR_EVIDENCE_PREFIX,
    TEST_RUN_PREFIX,
    EVENT_PREFIX,
    DOCUMENT_LIBRARY_KEY,
    DOCUMENT_FOLDERS_KEY,
    LIBRARY_IMPORT_UNDO_KEY,
    LIBRARY_IMPORT_UNDO_ENTRY_PREFIX,
    REVIEW_PREFIX,
    REVIEW_PROGRESS_PREFIX,
    RECORDING_PREFIX,
    RAW_RECORDING_PREFIX,
    SCREENSHOT_PREFIX,
    SCREENSHOT_ASSET_PREFIX,
    SCREENSHOT_BLOB_PREFIX,
    SCREENSHOT_MANIFEST_PREFIX,
    SESSION_PREFIX,
    sessionDataKeys
  };
});
