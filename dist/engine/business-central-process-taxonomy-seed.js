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

  const documentAliases = {
    "document:sales-order": ["Försäljningsorder"],
    "document:warehouse-shipment": ["Lagerutleverans", "Distributionslagerutleverans"],
    "document:warehouse-pick": ["Lagerplockning", "Distributionslagerplockning"],
    "document:purchase-order": ["Inköpsorder"],
    "document:warehouse-receipt": ["Lagerinleverans", "Distributionslagerinleverans"],
    "document:warehouse-put-away": ["Lagerinlagring", "Distributionslagerinlagring"],
    "document:posted-warehouse-shipment": ["Bokförd lagerutleverans", "Bokförd distributionslagerutleverans"],
    "document:posted-warehouse-receipt": ["Bokförd lagerinleverans", "Bokförd distributionslagerinleverans"],
    "document:purchase-invoice": ["Inköpsfaktura"],
    "document:transfer-order": ["Överföringsorder"],
    "document:production-order": ["Produktionsorder"],
    "document:assembly-order": ["Monteringsorder"],
    "document:planning-worksheet": ["Planeringsförslag"],
    "document:sales-return-order": ["Försäljningsreturorder"],
    "document:purchase-return-order": ["Inköpsreturorder"],
    "document:return-receipt": ["Bokförd returinleverans"],
    "document:return-shipment": ["Bokförd returleverans"],
    "document:sales-credit-memo": ["Försäljningskreditnota"],
    "document:posted-sales-credit-memo": ["Bokförd försäljningskreditnota"],
    "document:purchase-credit-memo": ["Inköpskreditnota"],
    "document:posted-purchase-credit-memo": ["Bokförd inköpskreditnota"],
    "document:inventory-movement": ["Lagerflyttning", "Inventeringsflyttning"],
    "document:warehouse-movement": ["Distributionslagerflyttning"],
    "document:inventory-pick": ["Lagerplockning"],
    "document:inventory-put-away": ["Lagerinförsel"],
    "document:posted-inventory-pick": ["Bokförd lagerplockning"],
    "document:posted-inventory-put-away": ["Bokförd lagerinförsel"],
    "document:item-tracking-lines": ["Artikelspårningsrader"],
    "document:general-journal": ["Redovisningsjournal", "Redovisningsjournaler"],
    "document:item-journal": ["Artikeljournal", "Artikeljournaler"],
    "document:item-reclassification-journal": ["Artikelomklassificeringsjournal"],
    "document:physical-inventory-journal": ["Inventeringsjournal"]
  };
  const primaryDomainByDocumentId = new Map([
    ["domain:order-to-cash", ["sales-quote", "sales-order", "sales-invoice",
      "posted-sales-invoice", "posted-sales-shipment"]],
    ["domain:source-to-pay", ["purchase-order", "purchase-invoice",
      "posted-purchase-invoice", "posted-purchase-receipt"]],
    ["domain:warehouse-management", ["warehouse-movement", "inventory-pick",
      "inventory-put-away", "posted-inventory-pick", "posted-inventory-put-away",
      "posted-warehouse-shipment", "posted-warehouse-receipt"]],
    ["domain:transfers", ["transfer-order", "transfer-shipment", "transfer-receipt"]],
    ["domain:plan-to-produce", ["production-order", "planned-production-order",
      "firm-planned-production-order", "finished-production-order", "production-journal"]],
    ["domain:assembly", ["assembly-order"]],
    ["domain:forecast-to-plan", ["planning-worksheet"]],
    ["domain:returns", ["sales-return-order", "purchase-return-order", "return-receipt",
      "return-shipment", "sales-credit-memo", "posted-sales-credit-memo",
      "purchase-credit-memo", "posted-purchase-credit-memo"]],
    ["domain:inventory-to-deliver", ["inventory-movement", "item-journal",
      "item-reclassification-journal", "physical-inventory-journal"]],
    ["domain:item-tracking", ["item-tracking-lines"]],
    ["domain:record-to-report", ["general-journal"]]
  ].flatMap(([domainId, documentIds]) => documentIds.map(documentId =>
    [`document:${documentId}`, domainId])));
  const view = (pageObjectId, viewType, name) => ({
    pageObjectId: String(pageObjectId), viewType, name
  });
  const documents = [
    ["document:sales-quote", "Sales Quote", "quote", [view(41, "document", "Sales Quote"), view(9300, "list", "Sales Quotes")], ["36", "37"]],
    ["document:sales-order", "Sales Order", "order", [view(42, "document", "Sales Order"), view(9305, "list", "Sales Order List")], ["36", "37"]],
    ["document:warehouse-shipment", "Warehouse Shipment", "warehouse-document", [view(7335, "document", "Warehouse Shipment"), view(7339, "list", "Warehouse Shipment List")], ["7320", "7321"]],
    ["document:warehouse-pick", "Warehouse Pick", "warehouse-activity", [view(5779, "document", "Warehouse Pick"), view(9313, "list", "Warehouse Picks"), view(7345, "worksheet", "Pick Worksheet")], ["5766", "5767"]],
    ["document:posted-sales-shipment", "Posted Sales Shipment", "posted-document", [view(130, "posted-card", "Posted Sales Shipment"), view(142, "posted-list", "Posted Sales Shipments")], ["110", "111"]],
    ["document:sales-invoice", "Sales Invoice", "invoice", [view(43, "document", "Sales Invoice"), view(9301, "list", "Sales Invoice List")], ["36", "37"]],
    ["document:posted-sales-invoice", "Posted Sales Invoice", "posted-document", [view(132, "posted-card", "Posted Sales Invoice"), view(143, "posted-list", "Posted Sales Invoices")], ["112", "113"]],
    ["document:purchase-order", "Purchase Order", "order", [view(50, "document", "Purchase Order"), view(9307, "list", "Purchase Order List")], ["38", "39"]],
    ["document:warehouse-receipt", "Warehouse Receipt", "warehouse-document", [view(5768, "document", "Warehouse Receipt"), view(7332, "list", "Warehouse Receipts")], ["7316", "7317"]],
    ["document:warehouse-put-away", "Warehouse Put-away", "warehouse-activity", [view(5770, "document", "Warehouse Put-away"), view(9312, "list", "Warehouse Put-aways"), view(7352, "worksheet", "Put-away Worksheet")], ["5766", "5767"]],
    ["document:posted-purchase-receipt", "Posted Purchase Receipt", "posted-document", [view(136, "posted-card", "Posted Purchase Receipt"), view(145, "posted-list", "Posted Purchase Receipts")], ["120", "121"]],
    ["document:posted-warehouse-receipt", "Posted Warehouse Receipt", "posted-document", [view(7330, "posted-card", "Posted Warehouse Receipt"), view(7333, "posted-list", "Posted Warehouse Receipts")], ["7318", "7319"]],
    ["document:posted-warehouse-shipment", "Posted Warehouse Shipment", "posted-document", [view(7337, "posted-card", "Posted Warehouse Shipment"), view(7340, "posted-list", "Posted Warehouse Shipments")], ["7322", "7323"]],
    ["document:purchase-invoice", "Purchase Invoice", "invoice", [view(51, "document", "Purchase Invoice"), view(9308, "list", "Purchase Invoices")], ["38", "39"]],
    ["document:posted-purchase-invoice", "Posted Purchase Invoice", "posted-document", [view(138, "posted-card", "Posted Purchase Invoice"), view(146, "posted-list", "Posted Purchase Invoices")], ["122", "123"]],
    ["document:transfer-order", "Transfer Order", "order", [view(5740, "document", "Transfer Order"), view(5742, "list", "Transfer Orders")], ["5740", "5741"]],
    ["document:transfer-shipment", "Posted Transfer Shipment", "posted-document", [view(5744, "posted-card", "Posted Transfer Shipment"), view(5752, "posted-list", "Posted Transfer Shipments")], ["5744", "5745"]],
    ["document:transfer-receipt", "Posted Transfer Receipt", "posted-document", [view(5746, "posted-card", "Posted Transfer Receipt"), view(5753, "posted-list", "Posted Transfer Receipts")], ["5746", "5747"]],
    ["document:production-order", "Production Order", "manufacturing-order", [view(99000831, "document", "Released Production Order"), view(9326, "list", "Released Production Orders")], ["5405", "5406", "5407"]],
    ["document:planned-production-order", "Planned Production Order", "manufacturing-order", [view(99000813, "document", "Planned Production Order"), view(9324, "list", "Planned Production Orders")], ["5405", "5406", "5407"]],
    ["document:firm-planned-production-order", "Firm Planned Production Order", "manufacturing-order", [view(99000829, "document", "Firm Planned Production Order"), view(9325, "list", "Firm Planned Production Orders")], ["5405", "5406", "5407"]],
    ["document:finished-production-order", "Finished Production Order", "posted-document", [view(99000867, "posted-card", "Finished Production Order"), view(9327, "posted-list", "Finished Production Orders")], ["5405", "5406", "5407"]],
    ["document:production-journal", "Production Journal", "journal", [view(99000832, "journal", "Production Journal")], ["83"]],
    ["document:assembly-order", "Assembly Order", "assembly-order", [view(900, "document", "Assembly Order"), view(902, "list", "Assembly Orders")], ["900", "901"]],
    ["document:planning-worksheet", "Planning Worksheet", "worksheet", [view(99000852, "worksheet", "Planning Worksheet")], ["246"]],
    ["document:sales-return-order", "Sales Return Order", "return-order", [view(6630, "document", "Sales Return Order"), view(9304, "list", "Sales Return Order List")], ["36", "37"]],
    ["document:purchase-return-order", "Purchase Return Order", "return-order", [view(6640, "document", "Purchase Return Order"), view(9311, "list", "Purchase Return Order List")], ["38", "39"]],
    ["document:return-receipt", "Posted Return Receipt", "posted-document", [view(6660, "posted-card", "Posted Return Receipt"), view(6662, "posted-list", "Posted Return Receipts")], ["6660", "6661"]],
    ["document:return-shipment", "Posted Return Shipment", "posted-document", [view(6650, "posted-card", "Posted Return Shipment"), view(6652, "posted-list", "Posted Return Shipments")], ["6650", "6651"]],
    ["document:sales-credit-memo", "Sales Credit Memo", "credit-memo", [view(44, "document", "Sales Credit Memo"), view(9302, "list", "Sales Credit Memos")], ["36", "37"]],
    ["document:posted-sales-credit-memo", "Posted Sales Credit Memo", "posted-document", [view(134, "posted-card", "Posted Sales Credit Memo"), view(144, "posted-list", "Posted Sales Credit Memos")], ["114", "115"]],
    ["document:purchase-credit-memo", "Purchase Credit Memo", "credit-memo", [view(52, "document", "Purchase Credit Memo"), view(9309, "list", "Purchase Credit Memos")], ["38", "39"]],
    ["document:posted-purchase-credit-memo", "Posted Purchase Credit Memo", "posted-document", [view(140, "posted-card", "Posted Purchase Credit Memo"), view(147, "posted-list", "Posted Purchase Credit Memos")], ["124", "125"]],
    ["document:inventory-movement", "Inventory Movement", "warehouse-activity", [view(7382, "document", "Inventory Movement"), view(9330, "list", "Inventory Movements")], ["5766", "5767"]],
    ["document:warehouse-movement", "Warehouse Movement", "warehouse-activity", [view(7315, "document", "Warehouse Movement"), view(9314, "list", "Warehouse Movements")], ["5766", "5767"]],
    ["document:inventory-pick", "Inventory Pick", "inventory-activity", [view(7377, "document", "Inventory Pick"), view(9316, "list", "Inventory Picks")], ["5766", "5767"]],
    ["document:inventory-put-away", "Inventory Put-away", "inventory-activity", [view(7375, "document", "Inventory Put-away"), view(9315, "list", "Inventory Put-aways")], ["5766", "5767"]],
    ["document:posted-inventory-pick", "Posted Inventory Pick", "posted-document", [view(7392, "posted-card", "Posted Inventory Pick"), view(7395, "posted-list", "Posted Inventory Picks")], ["7342", "7343"]],
    ["document:posted-inventory-put-away", "Posted Inventory Put-away", "posted-document", [view(7390, "posted-card", "Posted Inventory Put-away"), view(7394, "posted-list", "Posted Inventory Put-aways")], ["7340", "7341"]],
    ["document:item-tracking-lines", "Item Tracking Lines", "worksheet", [view(6510, "worksheet", "Item Tracking Lines")], []],
    ["document:general-journal", "General Journal", "journal", [view(39, "worksheet", "General Journal")], ["81"]],
    ["document:item-journal", "Item Journal", "journal", [view(40, "worksheet", "Item Journal")], ["83"]],
    ["document:item-reclassification-journal", "Item Reclassification Journal", "journal", [view(393, "worksheet", "Item Reclass. Journal")], ["83"]],
    ["document:physical-inventory-journal", "Physical Inventory Journal", "journal", [view(392, "worksheet", "Phys. Inventory Journal")], ["83"]]
  ].map(([id, name, documentType, pageViews, tableIds]) => ({
    id, name, documentType, primaryDomainId: primaryDomainByDocumentId.get(id) || null, pageViews,
    pageIds: pageViews.map(item => item.pageObjectId), tableIds,
    aliases: documentAliases[id] || []
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
      documentIds: ["document:warehouse-shipment", "document:warehouse-pick",
        "document:posted-warehouse-shipment"],
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
      ] },
    { domainId: "domain:returns", businessId: "business-process:sales-returns",
      businessName: "Sales Returns", processId: "bc-process:returns:sales-return-order",
      processName: "Sales Return Order → Receive Return → Post Credit",
      documentIds: ["document:sales-return-order", "document:return-receipt",
        "document:sales-credit-memo", "document:posted-sales-credit-memo"],
      steps: [
        ["create-sales-return", "Create Sales Return Order", [["open-sales-returns", "Open Sales Return Orders", "open"], ["enter-return-lines", "Enter Return Lines", "enter"]]],
        ["receive-sales-return", "Receive Sales Return", [["receive-return", "Receive Return", "invoke"]]],
        ["post-sales-return", "Post Sales Return", [["post-sales-return", "Post Sales Return", "post"]]]
      ] },
    { domainId: "domain:returns", businessId: "business-process:purchase-returns",
      businessName: "Purchase Returns", processId: "bc-process:returns:purchase-return-order",
      processName: "Purchase Return Order → Ship Return → Post Credit",
      documentIds: ["document:purchase-return-order", "document:return-shipment",
        "document:purchase-credit-memo", "document:posted-purchase-credit-memo"],
      steps: [
        ["create-purchase-return", "Create Purchase Return Order", [["open-purchase-returns", "Open Purchase Return Orders", "open"], ["enter-return-lines", "Enter Return Lines", "enter"]]],
        ["ship-purchase-return", "Ship Purchase Return", [["ship-return", "Ship Return", "invoke"]]],
        ["post-purchase-return", "Post Purchase Return", [["post-purchase-return", "Post Purchase Return", "post"]]]
      ] },
    { domainId: "domain:inventory-to-deliver", businessId: "business-process:inventory-movement",
      businessName: "Inventory Movement", processId: "bc-process:inventory:inventory-movement",
      processName: "Inventory Movement → Register Movement",
      documentIds: ["document:inventory-movement"],
      steps: [
        ["create-inventory-movement", "Create Inventory Movement", [["open-inventory-movements", "Open Inventory Movements", "open"], ["enter-movement-lines", "Enter Movement Lines", "enter"]]],
        ["register-inventory-movement", "Register Inventory Movement", [["register-movement", "Register Movement", "invoke"]]]
      ] },
    { domainId: "domain:warehouse-management", businessId: "business-process:warehouse-movement",
      businessName: "Warehouse Movement", processId: "bc-process:warehouse:warehouse-movement",
      processName: "Warehouse Movement → Register Movement",
      documentIds: ["document:warehouse-movement"],
      steps: [
        ["create-warehouse-movement", "Create Warehouse Movement", [["open-warehouse-movements", "Open Warehouse Movements", "open"], ["enter-movement-lines", "Enter Movement Lines", "enter"]]],
        ["register-warehouse-movement", "Register Warehouse Movement", [["register-movement", "Register Movement", "invoke"]]]
      ] },
    { domainId: "domain:warehouse-management", businessId: "business-process:inventory-pick",
      businessName: "Basic Warehouse Outbound", processId: "bc-process:warehouse:inventory-pick",
      processName: "Inventory Pick → Post Pick and Shipment → Posted Inventory Pick",
      documentIds: ["document:inventory-pick", "document:posted-inventory-pick"],
      steps: [
        ["create-inventory-pick", "Create Inventory Pick", [["open-inventory-picks", "Open Inventory Picks", "open"], ["get-source-document", "Get Source Document", "invoke"]]],
        ["post-inventory-pick", "Post Inventory Pick", [["post-inventory-pick", "Post Inventory Pick and Shipment", "post"]]]
      ] },
    { domainId: "domain:warehouse-management", businessId: "business-process:inventory-put-away",
      businessName: "Basic Warehouse Inbound", processId: "bc-process:warehouse:inventory-put-away",
      processName: "Inventory Put-away → Post Receipt and Put-away → Posted Inventory Put-away",
      documentIds: ["document:inventory-put-away", "document:posted-inventory-put-away"],
      steps: [
        ["create-inventory-put-away", "Create Inventory Put-away", [["open-inventory-put-aways", "Open Inventory Put-aways", "open"], ["get-source-document", "Get Source Document", "invoke"]]],
        ["post-inventory-put-away", "Post Inventory Put-away", [["post-inventory-put-away", "Post Receipt and Put-away", "post"]]]
      ] },
    { domainId: "domain:item-tracking", businessId: "business-process:item-tracking",
      businessName: "Item Tracking", processId: "bc-process:item-tracking:assign-tracking",
      processName: "Item Tracking Lines → Assign Lot or Serial Number",
      documentIds: ["document:item-tracking-lines"],
      steps: [
        ["open-item-tracking", "Open Item Tracking Lines", [["open-item-tracking", "Open Item Tracking Lines", "open"]]],
        ["assign-item-tracking", "Assign Item Tracking", [["assign-lot-serial", "Assign Lot or Serial Number", "enter"]]]
      ] },
    { domainId: "domain:record-to-report", businessId: "business-process:general-journal",
      businessName: "General Journal Posting", processId: "bc-process:record-to-report:general-journal",
      processName: "General Journal → Validate Entries → Post Journal",
      documentIds: ["document:general-journal"],
      steps: [
        ["enter-general-journal", "Enter General Journal", [["open-general-journal", "Open General Journal", "open"], ["enter-journal-lines", "Enter Journal Lines", "enter"]]],
        ["post-general-journal", "Post General Journal", [["post-journal", "Post Journal", "post"]]]
      ] },
    { domainId: "domain:inventory-to-deliver", businessId: "business-process:item-adjustment",
      businessName: "Item Adjustment", processId: "bc-process:inventory:item-journal",
      processName: "Item Journal → Enter Adjustment → Post Journal",
      documentIds: ["document:item-journal"],
      steps: [
        ["enter-item-journal", "Enter Item Journal", [["open-item-journal", "Open Item Journal", "open"], ["enter-adjustment", "Enter Item Adjustment", "enter"]]],
        ["post-item-journal", "Post Item Journal", [["post-item-journal", "Post Item Journal", "post"]]]
      ] },
    { domainId: "domain:inventory-to-deliver", businessId: "business-process:item-reclassification",
      businessName: "Item Reclassification", processId: "bc-process:inventory:item-reclassification",
      processName: "Item Reclassification Journal → Enter Reclassification → Post",
      documentIds: ["document:item-reclassification-journal"],
      steps: [
        ["enter-item-reclassification", "Enter Item Reclassification", [["open-item-reclassification", "Open Item Reclassification Journal", "open"], ["enter-reclassification", "Enter Reclassification", "enter"]]],
        ["post-item-reclassification", "Post Reclassification", [["post-reclassification", "Post Reclassification", "post"]]]
      ] },
    { domainId: "domain:inventory-to-deliver", businessId: "business-process:physical-inventory",
      businessName: "Physical Inventory", processId: "bc-process:inventory:physical-inventory",
      processName: "Physical Inventory Journal → Record Count → Post Differences",
      documentIds: ["document:physical-inventory-journal"],
      steps: [
        ["calculate-physical-inventory", "Calculate Physical Inventory", [["open-physical-inventory", "Open Physical Inventory Journal", "open"], ["calculate-inventory", "Calculate Inventory", "invoke"]]],
        ["record-physical-count", "Record Physical Count", [["enter-physical-count", "Enter Physical Count", "enter"]]],
        ["post-physical-inventory", "Post Inventory Differences", [["post-physical-inventory", "Post Inventory Differences", "post"]]]
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
  relationship("warehouse-shipment:posts:posted-warehouse-shipment", "posts",
    "document:warehouse-shipment", "document:posted-warehouse-shipment",
    "Warehouse Shipment posts Posted Warehouse Shipment");
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
