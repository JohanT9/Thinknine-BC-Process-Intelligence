(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SearchInteractionPresentation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function visibleResultCaption(value) {
    // BC combines the visible caption and result-type column in the accessible
    // name. Documentation should reproduce the visible action caption only.
    return clean(value).replace(/\s+(?:Listor|Lists)\b.*$/iu, "").trim();
  }

  function screenshotForResult(events = [], screenshots = {}) {
    const selection = [...events].reverse().find(event =>
      event?.type === "click" && event?.category === "selection" &&
      screenshots[event.eventNo]);
    if (selection) return screenshots[selection.eventNo];

    const stableSearchState = [...events].reverse().find(event =>
      event?.category !== "navigation" && screenshots[event.eventNo]);
    if (stableSearchState) return screenshots[stableSearchState.eventNo];

    return [...events].reverse()
      .map(event => screenshots[event?.eventNo])
      .find(Boolean) || null;
  }

  return { visibleResultCaption, screenshotForResult };
});
