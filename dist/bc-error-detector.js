(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BcErrorDetector = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DETAIL_LABELS = ["copy details", "copy error details", "kopiera information",
    "kopiera detaljer", "kopiér oplysninger", "kopiér detaljer"];
  const ERROR_LABELS = ["error", "something went wrong", "fel", "ett fel uppstod",
    "fejl", "der opstod en fejl"];
  const normalizeText = value => String(value || "").normalize("NFKC")
    .toLocaleLowerCase().replace(/\s+/gu, " ").trim();
  const includesLabel = (text, labels) => labels.some(label =>
    normalizeText(text).includes(label));

  function classifySnapshot(snapshot = {}) {
    const role = normalizeText(snapshot.role);
    const semanticDialog = role === "alertdialog" ||
      (role === "dialog" && Boolean(snapshot.modal));
    const errorSemantic = role === "alert" || snapshot.ariaInvalid === true ||
      includesLabel(snapshot.accessibleName, ERROR_LABELS);
    const detailsAvailable = Boolean(snapshot.detailsText) ||
      (snapshot.actions || []).some(action => includesLabel(action, DETAIL_LABELS));
    const detected = semanticDialog && (errorSemantic || detailsAvailable ||
      snapshot.liveAssertive === true);
    return { detected, surface: role === "alertdialog" ? "alert-dialog" :
      detected ? "modal-dialog" : "unsupported", detailsAvailable,
    confidence: detected ? (role === "alertdialog" ? 1 : 0.85) : 0 };
  }

  function lifecycleKey(snapshot = {}) {
    return [snapshot.frameInstanceId || "frame", snapshot.elementIdentity || "dialog",
      snapshot.openedAt || "open"].join(":");
  }

  return { DETAIL_LABELS, ERROR_LABELS, classifySnapshot, lifecycleKey,
    normalizeText };
});
