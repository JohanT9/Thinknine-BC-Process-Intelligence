(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapLabels = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const EN_NODE_TITLES = Object.freeze({
    "document:sales-quote": "Sales Quote", "document:sales-order": "Sales Order",
    "document:warehouse-shipment": "Warehouse Shipment",
    "document:warehouse-pick": "Warehouse Pick",
    "document:posted-sales-shipment": "Posted Sales Shipment",
    "document:sales-invoice": "Sales Invoice",
    "document:posted-sales-invoice": "Posted Sales Invoice",
    "document:purchase-order": "Purchase Order",
    "document:warehouse-receipt": "Warehouse Receipt",
    "document:warehouse-put-away": "Warehouse Put-away",
    "document:posted-purchase-receipt": "Posted Purchase Receipt",
    "document:posted-warehouse-receipt": "Posted Warehouse Receipt",
    "document:purchase-invoice": "Purchase Invoice",
    "document:posted-purchase-invoice": "Posted Purchase Invoice",
    "document:transfer-order": "Transfer Order",
    "document:transfer-shipment": "Posted Transfer Shipment",
    "document:transfer-receipt": "Posted Transfer Receipt",
    "document:production-order": "Production Order",
    "document:planned-production-order": "Planned Production Order",
    "document:firm-planned-production-order": "Firm Planned Production Order",
    "document:finished-production-order": "Finished Production Order",
    "document:production-journal": "Production Journal",
    "document:assembly-order": "Assembly Order",
    "document:planning-worksheet": "Planning Worksheet"
  });
  const SV_NODE_TITLES = Object.freeze({
    "Sales Order Processing": "Försäljningsorderhantering",
    "Purchase to Pay": "Inköp till betalning",
    "Warehouse Inbound": "Inleverans till lager",
    "Warehouse Outbound": "Utleverans från lager",
    "Transfer Order": "Överföringsorder",
    "Production": "Produktion",
    "Assembly": "Montering",
    "Planning": "Planering",
    "document:sales-quote": "Försäljningsoffert",
    "document:purchase-order": "Inköpsorder",
    "document:purchase-invoice": "Inköpsfaktura",
    "document:posted-purchase-invoice": "Bokförd inköpsfaktura",
    "document:sales-order": "Försäljningsorder",
    "document:sales-invoice": "Försäljningsfaktura",
    "document:warehouse-receipt": "Lagerinleverans",
    "document:warehouse-shipment": "Lagerutleverans",
    "document:warehouse-pick": "Lagerplockning",
    "document:warehouse-put-away": "Lagerinlagring",
    "document:posted-purchase-receipt": "Bokförd inköpsinleverans",
    "document:posted-warehouse-receipt": "Bokförd lagerinleverans",
    "document:transfer-order": "Överföringsorder",
    "document:transfer-shipment": "Bokförd överföringsutleverans",
    "document:transfer-receipt": "Bokförd överföringsinleverans",
    "document:posted-sales-shipment": "Bokförd försäljningsleverans",
    "document:posted-sales-invoice": "Bokförd försäljningsfaktura",
    "document:production-order": "Produktionsorder",
    "document:planned-production-order": "Planerad produktionsorder",
    "document:firm-planned-production-order": "Fast planerad produktionsorder",
    "document:finished-production-order": "Avslutad produktionsorder",
    "document:production-journal": "Produktionsjournal",
    "document:assembly-order": "Monteringsorder",
    "document:planning-worksheet": "Planeringsförslag",
    "Create": "Skapa", "Release": "Frisläpp", "Receive": "Ta emot",
    "Invoice": "Fakturera", "Post": "Bokför", "Ship": "Leverera",
    "Pick": "Plocka", "Register": "Registrera", "Consume": "Förbruka",
    "Output": "Utflöde", "Transfer": "Överför", "Unknown step": "Okänt steg"
  });
  const EN_DOCUMENT_IDS_BY_TITLE = Object.freeze(Object.fromEntries(
    Object.entries(EN_NODE_TITLES).map(([id, title]) => [title, id])));
  function english(locale) { return String(locale || "").toLowerCase().startsWith("en"); }
  function nodeTitle(node, locale) { const title = String(node?.title || "");
    if (english(locale)) return EN_NODE_TITLES[title] || title;
    const taxonomyId = EN_DOCUMENT_IDS_BY_TITLE[title];
    return SV_NODE_TITLES[title] || SV_NODE_TITLES[taxonomyId] || title; }
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
  return { EN_DOCUMENT_IDS_BY_TITLE, EN_NODE_TITLES, SV_NODE_TITLES,
    handoffTitle, nodeTitle, roleTitle, statusTitle };
});
