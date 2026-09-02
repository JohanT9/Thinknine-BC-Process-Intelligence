(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BusinessCentralDocumentLifecycleSeed = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const variants = [
    ["variant:no-warehouse", "No Warehouse Handling"],
    ["variant:basic-warehouse", "Basic Warehouse"],
    ["variant:advanced-warehouse", "Advanced Warehouse"],
    ["variant:direct-shipment", "Direct Shipment"],
    ["variant:drop-shipment", "Drop Shipment"],
    ["variant:make-to-stock", "Make to Stock"],
    ["variant:make-to-order", "Make to Order"]
  ].map(([id, name]) => ({ id, name }));
  const stage = (id, name, documentId = null, options = {}) => ({ id, name,
    stageType: options.stageType || (documentId ? "document" : "state"), documentId,
    optional: Boolean(options.optional), metadata: options.metadata || {} });
  const transition = (fromStageId, toStageId, relationshipType, options = {}) => ({
    id: `transition:${fromStageId}:${relationshipType}:${toStageId}`,
    fromStageId, toStageId, relationshipType, optional: Boolean(options.optional),
    variantIds: options.variantIds || [], alternativeGroup: options.alternativeGroup || null });
  const salesStages = [stage("sales:quote", "Quote", "document:sales-quote", { optional: true }),
    stage("sales:order", "Sales Order", "document:sales-order"),
    stage("sales:drop-purchase", "Drop Shipment Purchase Order", "document:purchase-order", { optional: true }),
    stage("sales:shipment", "Warehouse Shipment", "document:warehouse-shipment", { optional: true }),
    stage("sales:pick", "Warehouse Pick", "document:warehouse-pick", { optional: true }),
    stage("sales:posted-shipment", "Posted Warehouse Shipment", "document:posted-sales-shipment", { optional: true }),
    stage("sales:invoice", "Sales Invoice", "document:sales-invoice", { optional: true }),
    stage("sales:posted-invoice", "Posted Sales Invoice", "document:posted-sales-invoice", { optional: true })];
  const purchaseStages = [stage("purchase:order", "Purchase Order", "document:purchase-order"),
    stage("purchase:receipt", "Warehouse Receipt", "document:warehouse-receipt", { optional: true }),
    stage("purchase:put-away", "Warehouse Put-away", "document:warehouse-put-away", { optional: true }),
    stage("purchase:posted-receipt", "Posted Warehouse Receipt", "document:posted-warehouse-receipt", { optional: true }),
    stage("purchase:invoice", "Purchase Invoice", "document:purchase-invoice", { optional: true }),
    stage("purchase:posted-invoice", "Posted Purchase Invoice", "document:posted-purchase-invoice", { optional: true })];
  const productionStages = [stage("production:planned", "Planned Production Order", "document:planned-production-order", { optional: true }),
    stage("production:firm-planned", "Firm Planned Production Order", "document:firm-planned-production-order", { optional: true }),
    stage("production:released", "Released Production Order", "document:production-order"),
    stage("production:consumption", "Consumption", "document:production-journal", { stageType: "action" }),
    stage("production:output", "Output", "document:production-journal", { stageType: "action" }),
    stage("production:finished", "Finished Production Order", "document:finished-production-order")];
  const transferStages = [stage("transfer:order", "Transfer Order", "document:transfer-order"),
    stage("transfer:shipment", "Warehouse Shipment", "document:warehouse-shipment", { optional: true }),
    stage("transfer:posted-shipment", "Posted Transfer Shipment", "document:transfer-shipment"),
    stage("transfer:in-transit", "In-Transit", null, { stageType: "state" }),
    stage("transfer:receipt", "Warehouse Receipt", "document:warehouse-receipt", { optional: true }),
    stage("transfer:posted-receipt", "Posted Transfer Receipt", "document:transfer-receipt")];
  const all = ids => ids;
  const lifecycle = (id, name, bcProcessIds, stages, transitions, lifecycleVariants,
    stateModels = []) => ({ id, name, bcProcessIds, stages, transitions,
      variants: lifecycleVariants, stateModels });
  const catalog = {
    schemaVersion: "1.0.0", catalogId: "bc-document-lifecycles",
    variants,
    lifecycles: [
      lifecycle("lifecycle:sales", "Sales Document Lifecycle",
        ["bc-process:order-to-cash:standard-sales-order", "bc-process:warehouse:outbound-pick-shipment"], salesStages,
        [transition("sales:quote", "sales:order", "creates", { optional: true }),
          transition("sales:order", "sales:shipment", "fulfilledBy", { variantIds: all(["variant:basic-warehouse", "variant:advanced-warehouse", "variant:direct-shipment"]) }),
          transition("sales:shipment", "sales:pick", "fulfilledBy", { variantIds: ["variant:advanced-warehouse"] }),
          transition("sales:shipment", "sales:posted-shipment", "postedAs", { variantIds: ["variant:basic-warehouse", "variant:direct-shipment"] }),
          transition("sales:pick", "sales:posted-shipment", "postedAs", { variantIds: ["variant:advanced-warehouse"] }),
          transition("sales:order", "sales:invoice", "creates", { variantIds: ["variant:no-warehouse"] }),
          transition("sales:order", "sales:drop-purchase", "creates", { variantIds: ["variant:drop-shipment"] }),
          transition("sales:drop-purchase", "sales:invoice", "derivedFrom", { variantIds: ["variant:drop-shipment"] }),
          transition("sales:posted-shipment", "sales:invoice", "derivedFrom", { optional: true }),
          transition("sales:invoice", "sales:posted-invoice", "postedAs", { optional: true })],
        [{ variantId: "variant:no-warehouse", stageIds: ["sales:order", "sales:invoice", "sales:posted-invoice"] },
          { variantId: "variant:basic-warehouse", stageIds: ["sales:order", "sales:shipment", "sales:posted-shipment", "sales:invoice", "sales:posted-invoice"] },
          { variantId: "variant:advanced-warehouse", stageIds: ["sales:order", "sales:shipment", "sales:pick", "sales:posted-shipment", "sales:invoice", "sales:posted-invoice"] },
          { variantId: "variant:direct-shipment", stageIds: ["sales:order", "sales:shipment", "sales:posted-shipment"] },
          { variantId: "variant:drop-shipment", stageIds: ["sales:order", "sales:drop-purchase", "sales:invoice", "sales:posted-invoice"] }],
        [{ documentId: "document:sales-order", states: ["Open", "Released", "Reopened", "Posted"],
          transitions: [["Open", "Released"], ["Released", "Reopened"], ["Reopened", "Released"], ["Released", "Posted"]] }]),
      lifecycle("lifecycle:purchase", "Purchase Document Lifecycle",
        ["bc-process:source-to-pay:standard-purchase-order", "bc-process:warehouse:inbound-receipt-put-away"], purchaseStages,
        [transition("purchase:order", "purchase:receipt", "fulfilledBy", { variantIds: ["variant:basic-warehouse", "variant:advanced-warehouse"] }),
          transition("purchase:receipt", "purchase:put-away", "fulfilledBy", { variantIds: ["variant:advanced-warehouse"] }),
          transition("purchase:receipt", "purchase:posted-receipt", "postedAs", { variantIds: ["variant:basic-warehouse"] }),
          transition("purchase:put-away", "purchase:posted-receipt", "postedAs", { variantIds: ["variant:advanced-warehouse"] }),
          transition("purchase:order", "purchase:invoice", "creates", { variantIds: ["variant:no-warehouse"] }),
          transition("purchase:posted-receipt", "purchase:invoice", "derivedFrom", { optional: true }),
          transition("purchase:invoice", "purchase:posted-invoice", "postedAs", { optional: true })],
        [{ variantId: "variant:no-warehouse", stageIds: ["purchase:order", "purchase:invoice", "purchase:posted-invoice"] },
          { variantId: "variant:basic-warehouse", stageIds: ["purchase:order", "purchase:receipt", "purchase:posted-receipt", "purchase:invoice", "purchase:posted-invoice"] },
          { variantId: "variant:advanced-warehouse", stageIds: ["purchase:order", "purchase:receipt", "purchase:put-away", "purchase:posted-receipt", "purchase:invoice", "purchase:posted-invoice"] }]),
      lifecycle("lifecycle:production", "Production Document Lifecycle",
        ["bc-process:production:released-production-order"], productionStages,
        [transition("production:planned", "production:firm-planned", "creates", { optional: true }),
          transition("production:firm-planned", "production:released", "derivedFrom", { optional: true }),
          transition("production:released", "production:consumption", "consumedBy"),
          transition("production:consumption", "production:output", "produces"),
          transition("production:output", "production:finished", "produces")],
        [{ variantId: "variant:make-to-stock", stageIds: productionStages.map(item => item.id) },
          { variantId: "variant:make-to-order", stageIds: ["production:released", "production:consumption", "production:output", "production:finished"] }]),
      lifecycle("lifecycle:transfer", "Transfer Document Lifecycle",
        ["bc-process:transfers:standard-transfer-order"], transferStages,
        [transition("transfer:order", "transfer:shipment", "fulfilledBy", { variantIds: ["variant:basic-warehouse", "variant:advanced-warehouse"] }),
          transition("transfer:order", "transfer:posted-shipment", "postedAs", { variantIds: ["variant:no-warehouse"] }),
          transition("transfer:shipment", "transfer:posted-shipment", "postedAs", { optional: true }),
          transition("transfer:posted-shipment", "transfer:in-transit", "creates"),
          transition("transfer:in-transit", "transfer:receipt", "fulfilledBy", { variantIds: ["variant:basic-warehouse", "variant:advanced-warehouse"] }),
          transition("transfer:in-transit", "transfer:posted-receipt", "postedAs", { variantIds: ["variant:no-warehouse"] }),
          transition("transfer:receipt", "transfer:posted-receipt", "postedAs", { optional: true })],
        [{ variantId: "variant:no-warehouse", stageIds: ["transfer:order", "transfer:posted-shipment", "transfer:in-transit", "transfer:posted-receipt"] },
          { variantId: "variant:basic-warehouse", stageIds: transferStages.map(item => item.id) },
          { variantId: "variant:advanced-warehouse", stageIds: transferStages.map(item => item.id) }])
    ], metadata: { product: "Microsoft Dynamics 365 Business Central",
      representativeNotMandatory: true, configurable: true }
  };
  return { catalog };
});
