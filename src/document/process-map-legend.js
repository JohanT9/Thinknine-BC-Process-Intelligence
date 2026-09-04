(function (root, factory) {
  const visualGrammar = typeof module === "object" && module.exports
    ? require("./process-visual-grammar") : root.T9ProcessVisualGrammar;
  const routeGrammar = typeof module === "object" && module.exports
    ? require("./process-route-grammar") : root.T9ProcessRouteGrammar;
  const api = factory(visualGrammar, routeGrammar);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapLegend = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
  function (visualGrammar, routeGrammar) {
  "use strict";
  const VERSION = "1.0.0";
  const STATUS_LABELS = Object.freeze({
    sv: Object.freeze({ observed: "Observerat", suggested: "Föreslaget",
      conditional: "Villkorligt", customerSpecific: "Kundunikt", reference: "Referens" }),
    en: Object.freeze({ observed: "Observed", suggested: "Suggested",
      conditional: "Conditional", customerSpecific: "Customer-specific", reference: "Reference" })
  });
  function unique(items, key) { const seen = new Set(); return items.filter(item => {
    const value = item[key]; if (seen.has(value)) return false; seen.add(value); return true;
  }); }
  function create(model = {}, locale = "sv-SE") {
    const english = String(locale).toLowerCase().startsWith("en");
    const nodes = unique((model.nodes || []).map(node => {
      const visual = visualGrammar.presentationFor(node, locale);
      return Object.freeze({ kind: visual.kind, shape: visual.shape,
        label: visual.label || (english ? "Action" : "Åtgärd") });
    }), "kind");
    const routes = unique((model.transitions || model.relationships || []).map(relationship => {
      const visual = routeGrammar.presentationFor(relationship, locale);
      return Object.freeze({ kind: visual.kind, line: visual.line,
        label: routeGrammar.LABELS[english ? "en" : "sv"][visual.kind] ||
          (english ? "Flow" : "Flöde") });
    }), "kind");
    const statuses = unique((model.nodes || []).map(node => node?.metadata?.semanticStatus)
      .filter(Boolean).map(status => Object.freeze({ status,
        label: STATUS_LABELS[english ? "en" : "sv"][status] || status })), "status");
    return Object.freeze({ version: VERSION, title: english ? "Legend" : "Teckenförklaring",
      nodes: Object.freeze(nodes), routes: Object.freeze(routes),
      statuses: Object.freeze(statuses) });
  }
  return { VERSION, STATUS_LABELS, create };
});
