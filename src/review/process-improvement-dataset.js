(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessImprovementDataset = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.0.0";
  const freeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  };
  const increment = (target, key) => {
    const normalized = String(key || "").trim();
    if (normalized) target[normalized] = (target[normalized] || 0) + 1;
  };
  const sortedObject = value => Object.fromEntries(Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right)));
  const feedbackEntries = review => {
    const history = Array.isArray(review?.commandHistory)
      ? review.commandHistory.slice(0, review.historyIndex) : [];
    return history.map(entry => entry?.metadata?.correctionFeedback)
      .filter(Boolean);
  };

  function create(reviews = []) {
    const byProcessCode = {};
    const byAffectedField = {};
    const byCommandType = {};
    let correctionCount = 0;
    let engineAttributedCorrectionCount = 0;
    (Array.isArray(reviews) ? reviews : []).forEach(review => {
      feedbackEntries(review).forEach(entry => {
        correctionCount += 1;
        increment(byCommandType, entry.commandType);
        (entry.affectedFields || []).forEach(field =>
          increment(byAffectedField, field));
        if (entry.engineAttributed) engineAttributedCorrectionCount += 1;
        (entry.processFindingCodes || []).forEach(code =>
          increment(byProcessCode, code));
      });
    });
    const prioritizedCodes = Object.entries(byProcessCode)
      .map(([code, corrections]) => ({ code, corrections }))
      .sort((left, right) => right.corrections - left.corrections ||
        left.code.localeCompare(right.code));
    return freeze({ schemaVersion: 1, datasetVersion: VERSION,
      scope: "local-aggregate", contentIncluded: false,
      identityIncluded: false, correctionCount,
      engineAttributedCorrectionCount,
      unattributedCorrectionCount:
        correctionCount - engineAttributedCorrectionCount,
      byProcessCode: sortedObject(byProcessCode),
      byAffectedField: sortedObject(byAffectedField),
      byCommandType: sortedObject(byCommandType), prioritizedCodes });
  }

  return { VERSION, create };
});
