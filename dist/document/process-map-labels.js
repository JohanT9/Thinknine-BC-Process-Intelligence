(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapLabels = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SV_NODE_TITLES = Object.freeze({
    "document:purchase-order": "Inköpsorder",
    "document:purchase-invoice": "Inköpsfaktura",
    "document:posted-purchase-invoice": "Bokförd inköpsfaktura",
    "document:sales-order": "Försäljningsorder",
    "document:sales-invoice": "Försäljningsfaktura",
    "document:warehouse-receipt": "Lagerinleverans",
    "document:warehouse-shipment": "Lagerutleverans",
    "document:warehouse-pick": "Lagerplockning",
    "document:warehouse-put-away": "Lagerinlagring",
    "document:transfer-order": "Överföringsorder",
    "Create": "Skapa", "Release": "Frisläpp", "Receive": "Ta emot",
    "Invoice": "Fakturera", "Post": "Bokför", "Unknown step": "Okänt steg"
  });
  function english(locale) { return String(locale || "").toLowerCase().startsWith("en"); }
  function nodeTitle(node, locale) { const title = String(node?.title || "");
    return english(locale) ? title : (SV_NODE_TITLES[title] || title); }
  function statusTitle(status, locale) { const labels = english(locale) ? {
    observed: "Observed", suggested: "Reference suggestion", conditional: "Conditional",
    customerSpecific: "Customer-specific", reference: "Reference"
  } : { observed: "Observerat", suggested: "Referensförslag", conditional: "Villkorligt",
    customerSpecific: "Kundunikt", reference: "Referens" };
    return labels[status] || status;
  }
  function roleTitle(role, locale) { const id = String(role?.id || role || "");
    const labels = english(locale) ? { purchasing: "Purchasing", warehouse: "Warehouse",
      sales: "Sales", production: "Production", finance: "Finance", system: "System" } : {
      purchasing: "Inköp", warehouse: "Lager", sales: "Försäljning",
      production: "Produktion", finance: "Ekonomi", system: "System" };
    return labels[id] || String(role?.name || id);
  }
  function handoffTitle(handoff, locale) { if (!handoff?.from || !handoff?.to) return "";
    return `${roleTitle(handoff.from, locale)} → ${roleTitle(handoff.to, locale)}`; }
  return { SV_NODE_TITLES, handoffTitle, nodeTitle, roleTitle, statusTitle };
});
