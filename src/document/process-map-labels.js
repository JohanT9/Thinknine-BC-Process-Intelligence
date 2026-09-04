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
  return { SV_NODE_TITLES, nodeTitle, statusTitle };
});
