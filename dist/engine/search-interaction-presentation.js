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
      event?.type === "click" && event?.category === "selection");
    const firstEventNo = Number(events[0]?.eventNo);
    const selectionEventNo = Number(selection?.eventNo);

    // Screenshot capture may be associated with a technical event that the
    // interpretation stream correctly filters out. Consider every persisted
    // capture inside the search boundary, not only instructional events.
    if (Number.isFinite(firstEventNo) && Number.isFinite(selectionEventNo)) {
      const resultState = Object.keys(screenshots)
        .map(Number)
        .filter(eventNo => Number.isFinite(eventNo) &&
          eventNo >= firstEventNo && eventNo <= selectionEventNo)
        .sort((left, right) => right - left)
        .find(eventNo => screenshots[eventNo]);
      if (resultState !== undefined) return screenshots[resultState];
    }

    const stableSearchState = [...events].reverse().find(event =>
      event?.category !== "navigation" && screenshots[event.eventNo]);
    if (stableSearchState) return screenshots[stableSearchState.eventNo];

    return [...events].reverse()
      .map(event => screenshots[event?.eventNo])
      .find(Boolean) || null;
  }

  return { visibleResultCaption, screenshotForResult };
});
