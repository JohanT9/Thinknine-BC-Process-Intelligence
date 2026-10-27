(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessRouteGrammar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.0.0";
  const ROUTES = Object.freeze({
    sequence: { kind: "sequence", line: "solid", tone: "neutral", marker: "arrow" },
    branch: { kind: "branch", line: "solid", tone: "decision", marker: "arrow" },
    conditional: { kind: "conditional", line: "solid", tone: "decision", marker: "arrow" },
    conditionalBranch: { kind: "conditional", line: "solid", tone: "decision", marker: "arrow" },
    alternate: { kind: "alternate", line: "dashed", tone: "alternative", marker: "arrow" },
    loop: { kind: "loop", line: "dashed", tone: "return", marker: "return" },
    return: { kind: "return", line: "dashed", tone: "return", marker: "return" },
    returnsTo: { kind: "return", line: "dashed", tone: "return", marker: "return" },
    branchesTo: { kind: "branch", line: "solid", tone: "decision", marker: "arrow" },
    documentCreation: { kind: "creates", line: "dotted", tone: "document", marker: "arrow" },
    creates: { kind: "creates", line: "dotted", tone: "document", marker: "arrow" },
    documentPosting: { kind: "posts", line: "double", tone: "posting", marker: "arrow" },
    posts: { kind: "posts", line: "double", tone: "posting", marker: "arrow" }
  });
  const LABELS = Object.freeze({
    sv: { sequence: "Nästa", branch: "Gren", conditional: "Villkor",
      alternate: "Alternativ", loop: "Upprepa", return: "Tillbaka",
      creates: "Skapar", posts: "Bokför som", unknown: "Flöde" },
    en: { sequence: "Next", branch: "Branch", conditional: "Condition",
      alternate: "Alternative", loop: "Repeat", return: "Return",
      creates: "Creates", posts: "Posts as", unknown: "Flow" }
  });

  function labelFor(kind, locale) {
    const english = LABELS.en[kind] || LABELS.en.unknown;
    const fallback = String(locale).toLowerCase().startsWith("sv")
      ? LABELS.sv[kind] || LABELS.sv.unknown : english;
    return globalThis.T9UiI18n?.translate?.(`processRoute.${kind}`, locale) ||
      globalThis.T9UiI18n?.translateStaticText?.(english, locale) || fallback;
  }

  function presentationFor(relationship = {}, locale = "sv-SE") {
    const sourceType = relationship.transitionType || relationship.relationshipType || "sequence";
    const route = ROUTES[sourceType] || {
      kind: "unknown", line: "solid", tone: "neutral", marker: "arrow"
    };
    return Object.freeze({ version: VERSION, sourceType, ...route,
      label: String(relationship.label || relationship.condition ||
        labelFor(route.kind, locale)) });
  }

  return { LABELS, ROUTES, VERSION, labelFor, presentationFor };
});
