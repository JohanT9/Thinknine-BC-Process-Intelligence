(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BusinessCentralProcessTaxonomySeed = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const domains = [
    ["domain:order-to-cash", "Order to Cash"],
    ["domain:source-to-pay", "Source to Pay"],
    ["domain:forecast-to-plan", "Forecast to Plan"],
    ["domain:plan-to-produce", "Plan to Produce"],
    ["domain:inventory-to-deliver", "Inventory to Deliver"],
    ["domain:record-to-report", "Record to Report"],
    ["domain:returns", "Returns"], ["domain:transfers", "Transfers"],
    ["domain:assembly", "Assembly"], ["domain:item-tracking", "Item Tracking"],
    ["domain:quality-management", "Quality Management"],
    ["domain:warehouse-management", "Warehouse Management"]
  ].map(([id, name]) => ({ id, name, namespace: "bc",
    description: `${name} processes in Microsoft Dynamics 365 Business Central.` }));

  const documents = [
    ["document:sales-quote", "Sales Quote", "quote", ["41"], ["36", "37"]],
    ["document:sales-order", "Sales Order", "order", ["42"], ["36", "37"]],
    ["document:warehouse-shipment", "Warehouse Shipment", "warehouse-document", ["7335"], ["7320", "7321"]],
    ["document:warehouse-pick", "Warehouse Pick", "warehouse-activity", ["7345"], ["5766", "5767"]],
    ["document:posted-sales-shipment", "Posted Sales Shipment", "posted-document", ["130"], ["110", "111"]],
    ["document:sales-invoice", "Sales Invoice", "invoice", ["43"], ["36", "37"]],
    ["document:posted-sales-invoice", "Posted Sales Invoice", "posted-document", ["132"], ["112", "113"]],
    ["document:purchase-order", "Purchase Order", "order", ["50"], ["38", "39"]],
    ["document:warehouse-receipt", "Warehouse Receipt", "warehouse-document", ["7332"], ["7316", "7317"]],
    ["document:warehouse-put-away", "Warehouse Put-away", "warehouse-activity", ["7340"], ["5766", "5767"]],
    ["document:posted-purchase-receipt", "Posted Purchase Receipt", "posted-document", ["136"], ["120", "121"]],
    ["document:posted-warehouse-receipt", "Posted Warehouse Receipt", "posted-document", ["7333"], ["7318", "7319"]],
    ["document:purchase-invoice", "Purchase Invoice", "invoice", ["51"], ["38", "39"]],
    ["document:posted-purchase-invoice", "Posted Purchase Invoice", "posted-document", ["138"], ["122", "123"]],
    ["document:transfer-order", "Transfer Order", "order", ["5740"], ["5740", "5741"]],
    ["document:transfer-shipment", "Posted Transfer Shipment", "posted-document", ["5742"], ["5744", "5745"]],
    ["document:transfer-receipt", "Posted Transfer Receipt", "posted-document", ["5746"], ["5746", "5747"]],
    ["document:production-order", "Production Order", "manufacturing-order", ["99000831"], ["5405", "5406", "5407"]],
    ["document:planned-production-order", "Planned Production Order", "manufacturing-order", [], ["5405", "5406", "5407"]],
    ["document:firm-planned-production-order", "Firm Planned Production Order", "manufacturing-order", [], ["5405", "5406", "5407"]],
    ["document:finished-production-order", "Finished Production Order", "posted-document", [], ["5405", "5406", "5407"]],
    ["document:production-journal", "Production Journal", "journal", ["99000832"], ["83"]],
    ["document:assembly-order", "Assembly Order", "assembly-order", ["900"], ["900", "901"]],
    ["document:planning-worksheet", "Planning Worksheet", "worksheet", ["99000852"], ["246"]]
  ].map(([id, name, documentType, pageIds, tableIds]) => ({
    id, name, documentType, pageIds, tableIds
  }));

  const definitions = [
    { domainId: "domain:order-to-cash", businessId: "business-process:sales-order-processing",
      businessName: "Sales Order Processing", processId: "bc-process:order-to-cash:standard-sales-order",
      processName: "Sales Order → Warehouse Shipment → Warehouse Pick → Posted Shipment → Sales Invoice",
      documentIds: ["document:sales-order", "document:warehouse-shipment",
        "document:warehouse-pick", "document:posted-sales-shipment", "document:sales-invoice"],
      steps: [
        ["create-sales-order", "Create Sales Order", [["open-sales-orders", "Open Sales Orders", "open"], ["select-new", "Select New", "invoke"], ["select-customer", "Select Customer", "select"], ["add-item", "Add Item", "enter"], ["enter-quantity", "Enter Quantity", "enter"]]],
        ["release-sales-order", "Release Sales Order", [["select-release", "Select Release", "invoke"]]],
        ["create-warehouse-shipment", "Create Warehouse Shipment", [["create-warehouse-document", "Create Warehouse Shipment", "invoke"]]],
        ["create-pick", "Create Pick", [["create-pick", "Create Pick", "invoke"]]],
        ["register-pick", "Register Pick", [["register-pick", "Register Pick", "invoke"]]],
        ["post-shipment", "Post Shipment", [["post-shipment", "Post Shipment", "post"]]],
        ["post-sales-invoice", "Post Sales Invoice", [["post-invoice", "Post Sales Invoice", "post"]]]
      ] },
    { domainId: "domain:source-to-pay", businessId: "business-process:purchase-to-pay",
      businessName: "Purchase to Pay", processId: "bc-process:source-to-pay:standard-purchase-order",
      processName: "Purchase Order → Warehouse Receipt → Put-away → Posted Receipt → Purchase Invoice",
      documentIds: ["document:purchase-order", "document:warehouse-receipt",
        "document:warehouse-put-away", "document:posted-purchase-receipt", "document:purchase-invoice"],
      steps: [
        ["create-purchase-order", "Create Purchase Order", [["open-purchase-orders", "Open Purchase Orders", "open"], ["select-vendor", "Select Vendor", "select"], ["add-purchase-line", "Add Item and Quantity", "enter"]]],
        ["release-purchase-order", "Release Purchase Order", [["release-purchase-order", "Select Release", "invoke"]]],
        ["receive-purchase-order", "Receive Purchase Order", [["post-receipt", "Post Receipt", "post"]]],
        ["register-put-away", "Register Put-away", [["register-put-away", "Register Put-away", "invoke"]]],
        ["post-purchase-invoice", "Post Purchase Invoice", [["post-purchase-invoice", "Post Purchase Invoice", "post"]]]
      ] },
    { domainId: "domain:warehouse-management", businessId: "business-process:warehouse-inbound",
      businessName: "Warehouse Inbound", processId: "bc-process:warehouse:inbound-receipt-put-away",
      processName: "Warehouse Receipt → Warehouse Put-away → Registered Put-away",
      documentIds: ["document:warehouse-receipt", "document:warehouse-put-away"],
      steps: [
        ["create-warehouse-receipt", "Create Warehouse Receipt", [["open-warehouse-receipts", "Open Warehouse Receipts", "open"], ["get-source-documents", "Get Source Documents", "invoke"]]],
        ["post-warehouse-receipt", "Post Warehouse Receipt", [["post-warehouse-receipt", "Post Receipt", "post"]]],
        ["register-warehouse-put-away", "Register Warehouse Put-away", [["open-put-away", "Open Warehouse Put-away", "open"], ["register-put-away", "Register Put-away", "invoke"]]]
      ] },
    { domainId: "domain:warehouse-management", businessId: "business-process:warehouse-outbound",
      businessName: "Warehouse Outbound", processId: "bc-process:warehouse:outbound-pick-shipment",
      processName: "Warehouse Shipment → Warehouse Pick → Registered Pick → Posted Shipment",
      documentIds: ["document:warehouse-shipment", "document:warehouse-pick", "document:posted-sales-shipment"],
      steps: [
        ["create-warehouse-shipment", "Create Warehouse Shipment", [["open-warehouse-shipments", "Open Warehouse Shipments", "open"], ["get-source-documents", "Get Source Documents", "invoke"]]],
        ["create-warehouse-pick", "Create Warehouse Pick", [["create-pick", "Create Pick", "invoke"]]],
        ["register-warehouse-pick", "Register Warehouse Pick", [["register-pick", "Register Pick", "invoke"]]],
        ["post-warehouse-shipment", "Post Warehouse Shipment", [["post-shipment", "Post Shipment", "post"]]]
      ] },
    { domainId: "domain:transfers", businessId: "business-process:transfer-order",
      businessName: "Transfer Order", processId: "bc-process:transfers:standard-transfer-order",
      processName: "Transfer Order → Transfer Shipment → In-transit → Transfer Receipt",
      documentIds: ["document:transfer-order", "document:transfer-shipment", "document:transfer-receipt"],
      steps: [
        ["create-transfer-order", "Create Transfer Order", [["open-transfer-orders", "Open Transfer Orders", "open"], ["select-locations", "Select Transfer-from and Transfer-to Codes", "select"], ["add-transfer-line", "Add Item and Quantity", "enter"]]],
        ["post-transfer-shipment", "Post Transfer Shipment", [["post-transfer-shipment", "Post Shipment", "post"]]],
        ["post-transfer-receipt", "Post Transfer Receipt", [["post-transfer-receipt", "Post Receipt", "post"]]]
      ] },
    { domainId: "domain:plan-to-produce", businessId: "business-process:production",
      businessName: "Production", processId: "bc-process:production:released-production-order",
      processName: "Production Order → Components → Output → Finished Production Order",
      documentIds: ["document:production-order", "document:production-journal"],
      steps: [
        ["create-production-order", "Create Production Order", [["open-production-orders", "Open Released Production Orders", "open"], ["select-item", "Select Source Item", "select"], ["refresh-production-order", "Refresh Production Order", "invoke"]]],
        ["post-consumption", "Post Component Consumption", [["open-production-journal", "Open Production Journal", "open"], ["post-consumption", "Post Consumption", "post"]]],
        ["post-output", "Post Output", [["enter-output", "Enter Output Quantity", "enter"], ["post-output", "Post Output", "post"]]],
        ["finish-production-order", "Finish Production Order", [["change-status-finished", "Change Status to Finished", "invoke"]]]
      ] },
    { domainId: "domain:assembly", businessId: "business-process:assembly",
      businessName: "Assembly", processId: "bc-process:assembly:assemble-to-stock",
      processName: "Assembly Order → Component Consumption → Assembly Output",
      documentIds: ["document:assembly-order"],
      steps: [
        ["create-assembly-order", "Create Assembly Order", [["open-assembly-orders", "Open Assembly Orders", "open"], ["select-assembly-item", "Select Assembly Item", "select"], ["enter-assembly-quantity", "Enter Quantity to Assemble", "enter"]]],
        ["post-assembly-order", "Post Assembly Order", [["post-assembly", "Post Assembly Order", "post"]]]
      ] },
    { domainId: "domain:forecast-to-plan", businessId: "business-process:planning",
      businessName: "Planning", processId: "bc-process:planning:planning-worksheet",
      processName: "Demand → Calculate Regenerative Plan → Action Messages → Supply Orders",
      documentIds: ["document:planning-worksheet", "document:purchase-order", "document:production-order"],
      steps: [
        ["open-planning-worksheet", "Open Planning Worksheet", [["open-planning-worksheet", "Open Planning Worksheet", "open"]]],
        ["calculate-plan", "Calculate Regenerative Plan", [["calculate-regenerative-plan", "Calculate Regenerative Plan", "invoke"], ["enter-planning-horizon", "Enter Planning Horizon", "enter"]]],
        ["review-action-messages", "Review Action Messages", [["review-action-message", "Review Action Message", "review"]]],
        ["carry-out-action-message", "Carry Out Action Message", [["carry-out-action-message", "Carry Out Action Message", "invoke"]]]
      ] }
  ];

  const businessProcesses = definitions.map(value => ({ id: value.businessId,
    name: value.businessName, domainId: value.domainId }));
  const processSteps = [];
  const actions = [];
  const bcProcesses = [];
  const relationships = [];
  const documentsById = new Map(documents.map(document => [document.id, document]));
  for (const definition of definitions) {
    const stepIds = definition.steps.map(step => `step:${definition.processId.slice(11)}:${step[0]}`);
    definition.steps.forEach((step, sequence) => {
      const stepId = stepIds[sequence];
      const actionIds = step[2].map(action => `action:${definition.processId.slice(11)}:${action[0]}`);
      processSteps.push({ id: stepId, name: step[1], bcProcessId: definition.processId,
        sequence, actionIds, documentIds: definition.documentIds });
      const pageIds = [...new Set(definition.documentIds.flatMap(documentId =>
        documentsById.get(documentId)?.pageIds || []))];
      step[2].forEach((action, actionIndex) => actions.push({ id: actionIds[actionIndex],
        name: action[1], processStepId: stepId, actionType: action[2], pageIds,
        bcActionNames: ["invoke", "post"].includes(action[2]) ? [action[1]] : [],
        controlNames: ["select", "enter"].includes(action[2]) ? [action[1]] : [] }));
      if (sequence) {
        relationships.push({ id: `relationship:${stepIds[sequence - 1]}:precedes:${stepId}`,
          name: `${definition.steps[sequence - 1][1]} precedes ${step[1]}`,
          relationshipType: "precedes", fromEntityId: stepIds[sequence - 1], toEntityId: stepId });
        relationships.push({ id: `relationship:${stepId}:follows:${stepIds[sequence - 1]}`,
          name: `${step[1]} follows ${definition.steps[sequence - 1][1]}`,
          relationshipType: "follows", fromEntityId: stepId, toEntityId: stepIds[sequence - 1] });
      }
    });
    bcProcesses.push({ id: definition.processId, name: definition.processName,
      businessProcessId: definition.businessId, processStepIds: stepIds,
      documentIds: definition.documentIds });
  }

  const relationship = (id, type, fromEntityId, toEntityId, name) =>
    relationships.push({ id: `relationship:${id}`, name, relationshipType: type,
      fromEntityId, toEntityId });
  relationship("sales-order:creates:shipment", "creates", "document:sales-order",
    "document:warehouse-shipment", "Sales Order creates Warehouse Shipment");
  relationship("sales-order:releases:shipment", "releases",
    "step:order-to-cash:standard-sales-order:release-sales-order",
    "document:sales-order", "Release Sales Order releases Sales Order");
  relationship("shipment:posts:posted-shipment", "posts", "document:warehouse-shipment",
    "document:posted-sales-shipment", "Warehouse Shipment posts Posted Sales Shipment");
  relationship("production:consumes:components", "consumes",
    "step:production:released-production-order:post-consumption",
    "document:production-journal", "Production consumes components through Production Journal");
  relationship("production:produces:output", "produces",
    "step:production:released-production-order:post-output",
    "document:production-order", "Production output produces finished inventory");
  relationship("planning:references:purchase", "references", "document:planning-worksheet",
    "document:purchase-order", "Planning Worksheet references Purchase Orders");
  relationship("planning:branches:production", "branches_to",
    "step:planning:planning-worksheet:carry-out-action-message",
    "step:production:released-production-order:create-production-order",
    "Planning action message branches to Production");
  relationship("transfer:returns:order", "returns_to",
    "step:transfers:standard-transfer-order:post-transfer-receipt",
    "step:transfers:standard-transfer-order:create-transfer-order",
    "Transfer receipt returns control to Transfer Order processing");

  const variants = [
    ["variant:otc:ship-and-invoice", "bc-process:order-to-cash:standard-sales-order", "Ship and Invoice Together", { warehouseHandling: false }],
    ["variant:purchase:direct-receipt", "bc-process:source-to-pay:standard-purchase-order", "Direct Receipt and Invoice", { warehouseHandling: false }],
    ["variant:warehouse:bins-and-directed-put-away", "bc-process:warehouse:inbound-receipt-put-away", "Directed Put-away and Pick", { directedPutAwayAndPick: true }],
    ["variant:warehouse:advanced-outbound", "bc-process:warehouse:outbound-pick-shipment", "Advanced Warehouse", { directedPutAwayAndPick: true }],
    ["variant:production:make-to-order", "bc-process:production:released-production-order", "Make-to-Order", { manufacturingPolicy: "make-to-order" }],
    ["variant:planning:requisition-worksheet", "bc-process:planning:planning-worksheet", "Requisition Worksheet", { worksheet: "requisition" }]
  ].map(([id, bcProcessId, name, conditions]) => ({ id, bcProcessId, name, conditions,
    processStepIds: processSteps.filter(step => step.bcProcessId === bcProcessId)
      .map(step => step.id) }));
  bcProcesses.forEach(process => { process.variantIds = variants
    .filter(variant => variant.bcProcessId === process.id).map(variant => variant.id); });

  const seed = Object.freeze({ schemaVersion: "1.0.0",
    taxonomyId: "bc-process-taxonomy", name: "Business Central Process Taxonomy",
    domains, businessProcesses, bcProcesses, processSteps, documents, actions,
    relationships, variants, metadata: { product: "Microsoft Dynamics 365 Business Central",
      seedVersion: "1.0.0", extensible: true } });

  return { seed };
});
