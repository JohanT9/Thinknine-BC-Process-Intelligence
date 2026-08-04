(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.entityMemory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const entityPatterns = [
    ["SalesOrder", [/förs\.?\s*order/i, /försäljningsorder/i, /sales order/i]],
    ["PurchaseOrder", [/inköpsorder/i, /purchase order/i]],
    ["PostedSalesInvoice", [/bokförd.*försäljningsfaktura/i, /posted sales invoice/i]],
    ["Customer", [/kund/i, /customer/i]],
    ["Vendor", [/leverantör/i, /vendor/i]],
    ["Item", [/artikel/i, /item/i]],
    ["WarehouseReceipt", [/distlagerinleverans/i, /warehouse receipt/i]],
    ["WarehouseShipment", [/distlagerutleverans/i, /warehouse shipment/i]],
    ["ProductionOrder", [/produktionsorder/i, /production order/i]],
    ["QualityCheck", [/quality.*check/i, /qc.*check/i, /kvalitetskontroll/i]],
    ["Claim", [/reklamation/i, /claim/i]]
  ];

  function detectEntity(text) {
    const value = String(text || "");
    for (const [entity, patterns] of entityPatterns) {
      if (patterns.some(pattern => pattern.test(value))) return entity;
    }
    return "";
  }

  function recordValue(event) {
    const caption = String(event?.label || event?.selectedCaption || "");
    const quoted = caption.match(/["“](.+?)["”]/);
    if (quoted) return quoted[1];
    const trailing = caption.match(/(?:open record|öppna post(?:en)?)\s+([A-Z0-9._/-]+)$/i);
    return trailing ? trailing[1] : "";
  }

  function build(events) {
    const entities = [];
    let active = null;

    for (const event of events || []) {
      const page = event.context?.currentPageCaption || event.pageCaption || "";
      const entity = event.context?.currentEntity || detectEntity(page);
      const value = recordValue(event);

      if (entity && (!active || active.entity !== entity || (value && active.recordValue !== value))) {
        active = {
          nodeId: `${entity}-${entities.length + 1}`,
          entity,
          recordValue: value,
          firstEventNo: event.eventNo,
          lastEventNo: event.eventNo,
          pageCaptions: page ? [page] : [],
          operations: []
        };
        entities.push(active);
      }

      if (active) {
        active.lastEventNo = event.eventNo;
        if (page && !active.pageCaptions.includes(page)) active.pageCaptions.push(page);
      }
    }

    return entities;
  }

  return { build, detectEntity, recordValue };
});
