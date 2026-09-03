(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapTheme = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DEFAULT_THEME_ID = "business-central";
  const THEMES = Object.freeze({
    "business-central": Object.freeze({ id: "business-central",
      labels: Object.freeze({ sv: "Business Central", en: "Business Central" }),
      palette: Object.freeze({ background: "#ffffff", text: "#172b3a", edge: "#49657a",
        lane: "#f4f8fb", laneBorder: "#c8d5df", brandFill: "#eaf3f8", brand: "#31566f",
        documentFill: "#eef8fd", document: "#2878a5", postedFill: "#eef8f0",
        posted: "#347447", decisionFill: "#fff4ce", decision: "#7a5b00",
        systemFill: "#f6f2ff", system: "#66558f", manualFill: "#fff8ef", manual: "#8a5a2b" }) }),
    neutral: Object.freeze({ id: "neutral", labels: Object.freeze({ sv: "Neutral", en: "Neutral" }),
      palette: Object.freeze({ background: "#ffffff", text: "#24313d", edge: "#64717d",
        lane: "#f5f6f7", laneBorder: "#d4d8dc", brandFill: "#f1f4f6", brand: "#52606d",
        documentFill: "#f7f8f9", document: "#667785", postedFill: "#f1f6f2",
        posted: "#587260", decisionFill: "#f8f5eb", decision: "#756a49",
        systemFill: "#f5f3f7", system: "#716879", manualFill: "#f7f4f1", manual: "#786858" }) }),
    monochrome: Object.freeze({ id: "monochrome",
      labels: Object.freeze({ sv: "Monokrom", en: "Monochrome" }),
      palette: Object.freeze({ background: "#ffffff", text: "#111111", edge: "#333333",
        lane: "#f2f2f2", laneBorder: "#777777", brandFill: "#eeeeee", brand: "#222222",
        documentFill: "#ffffff", document: "#333333", postedFill: "#e8e8e8",
        posted: "#222222", decisionFill: "#f5f5f5", decision: "#222222",
        systemFill: "#ffffff", system: "#444444", manualFill: "#f2f2f2", manual: "#333333" }) })
  });
  function normalize(value) { return Object.hasOwn(THEMES, value) ? value : DEFAULT_THEME_ID; }
  function resolve(value) { return THEMES[normalize(value)]; }
  function list(locale = "sv-SE") { const language = String(locale).toLowerCase().startsWith("en")
    ? "en" : "sv"; return Object.values(THEMES).map(theme => Object.freeze({
      id: theme.id, label: theme.labels[language]
    })); }
  return { DEFAULT_THEME_ID, THEMES, list, normalize, resolve };
});
