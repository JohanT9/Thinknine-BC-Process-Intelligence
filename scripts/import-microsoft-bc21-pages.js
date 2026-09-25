const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = "https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-pages-action-bar-improvements";
const sourceId = "microsoft-learn-bc21-actionbar-pages";
const rows = `
4|Payment Terms|List
5|Currencies|List
7|Customer Price Groups|List
11|Shipment methods|List
14|Salespersons/Purchasers|List
20|General Ledger Entries|List
21|Customer Card|Card
22|Customer List|List
25|Customer Ledger Entries|List
26|Vendor Card|Card
27|Vendor List|List
29|Vendor Ledger Entries|List
30|Item Card|Card
31|Item List|List
36|Assembly BOM|List
38|Item Ledger Entries|List
39|General Journal|Worksheet
40|Item Journal|Worksheet
41|Sales Quote|Document
42|Sales Order|Document
43|Sales Invoice|Document
44|Sales Credit Memo|Document
49|Purchase Quote|Document
50|Purchase Order|Document
51|Purchase Invoice|Document
52|Purchase Credit Memo|Document
76|Resource Card|Card
77|Resource List|List
88|Job Card|Document
92|Job Ledger Entries|List
103|Account Schedule Names|List
104|Account Schedule|Worksheet
113|Budget|ListPlus
121|G/L Budget Names|List
130|Posted Sales Shipment|Document
132|Posted Sales Invoice|Document
134|Posted Sales Credit Memo|Document
136|Posted Purchase Receipt|Document
138|Posted Purchase Invoice|Document
142|Posted Sales Shipments|List
143|Posted Sales Invoices|List
144|Posted Sales Credit Memos|List
145|Posted Purchase Receipts|List
146|Posted Purchase Invoices|List
179|Reverse Entries|List
189|Incoming Document|Document
190|Incoming Documents|List
201|Job Journal|Worksheet
232|Apply Customer Entries|Worksheet
233|Apply Vendor Entries|Worksheet
251|General Journal Batches|List
253|Sales Journal|Worksheet
254|Purchase Journal|Worksheet
255|Cash Receipt Journal|Worksheet
256|Payment Journal|Worksheet
262|Item Journal Batches|List
283|Recurring General Journal|Worksheet
291|Req. Worksheet|Worksheet
344|Navigate|Worksheet
372|Bank Account Ledger Entries|List
379|Bank Acc. Reconciliation|ListPlus
392|Phys. Inventory Journal|Worksheet
393|Item Reclass. Journal|Worksheet
408|G/L Balance by Dimension|Card
428|Shipping Agents|List
434|Reminder|Document
436|Reminder List|List
490|Acc. Schedule Overview|List
498|Reservation|Worksheet
507|Blanket Sales Order|Document
509|Blanket Purchase Order|Document
516|Sales Lines|List
518|Purchase Lines|List
521|Application Worksheet|Worksheet
554|Analysis by Dimensions|Card
556|Analysis View List|List
573|Detailed Cust. Ledg. Entries|List
574|Detailed Vendor Ledg. Entries|List
610|IC General Journal|Worksheet
615|IC Inbox Transactions|Worksheet
623|Unapply Customer Entries|Worksheet
624|Unapply Vendor Entries|Worksheet
654|Requests to Approve|List
658|Approval Entries|List
672|Job Queue Entries|List
673|Job Queue Entry Card|Card
790|G/L Account Categories|List
900|Assembly Order|Document
902|Assembly Orders|List
914|Assemble-to-Order Lines|Worksheet
950|Time Sheet|Worksheet
951|Time Sheet List|List
952|Manager Time Sheet|Worksheet
953|Manager Time Sheet List|List
954|Manager Time Sheet by Job|Worksheet
973|Time Sheet Card|Document
981|Payment Registration|Worksheet
1007|Job Planning Lines|List
1020|Job G/L Journal|Worksheet
1173|Document Attachment Details|List
1290|Payment Reconciliation Journal|Worksheet
1292|Payment Application|Worksheet
1294|Pmt. Reconciliation Journals|List
1345|Sales Price and Line Discounts|List
1500|Workflows|List
1801|Assisted Setup|List
5050|Contact Card|ListPlus
5052|Contact List|List
5116|Salespersons/Purchasers Card|Card
5123|Opportunity List|List
5124|Opportunity Card|Card
5335|Integration Table Mapping List|List
5400|Item Unit Group List|List
5404|Item Unit of Measure|List
5406|Prod. Order Line List|List
5510|Production Journal|Worksheet
5522|Order Planning|Worksheet
5601|Fixed Asset List|List
5604|FA Ledger Entries|List
5628|Fixed Asset G/L Journal|Worksheet
5629|Fixed Asset Journal|Worksheet
5740|Transfer Order|Document
5742|Transfer Orders|List
5768|Warehouse Receipt|Document
5770|Warehouse Put-away|Document
5774|Warehouse Activity List|List
5779|Warehouse Pick|Document
5785|Warehouse Activity Lines|List
5802|Value Entries|List
5803|Revaluation Journal|Worksheet
5805|Item Charge Assignment (Purch)|Worksheet
5875|Physical Inventory Order|Document
5900|Service Order|Document
5933|Service Invoice|Document
5978|Posted Service Invoice|Document
6050|Service Contract|Document
6510|Item Tracking Lines|Worksheet
6520|Item Tracing|Worksheet
6630|Sales Return Order|Document
6640|Purchase Return Order|Document
7016|Sales Price List|ListPlus
7315|Warehouse Movement|Document
7324|Whse. Item Journal|Worksheet
7326|Whse. Phys. Invt. Journal|Worksheet
7330|Posted Whse. Receipt|Document
7335|Warehouse Shipment|Document
7337|Posted Whse. Shipment|Document
7341|Whse. Shipment Lines|List
7342|Whse. Receipt Lines|List
7345|Pick Worksheet|Worksheet
7351|Movement Worksheet|Worksheet
7365|Whse. Reclassification Journal|Worksheet
7375|Inventory Put-away|Document
7377|Inventory Pick|Document
7382|Inventory Movement|Document
8614|Config. Package Card|Document
8615|Config. Packages|List
8624|Config. Package Fields|List
8626|Config. Package Records|Worksheet
8632|Config. Worksheet|List
9170|Profile Card|Card
9300|Sales Quotes|List
9301|Sales Invoice List|List
9302|Sales Credit Memos|List
9305|Sales Order List|List
9307|Purchase Order List|List
9308|Purchase Invoices|List
9620|Page Fields|List
9650|Custom Report Layouts|List
9652|Report Layout Selection|List
9802|Permission Sets|List
9807|User Card|Card
99000813|Planned Production Order|Document
99000818|Prod. Order Components|List
99000822|Order Tracking|Worksheet
99000823|Output Journal|Worksheet
99000829|Firm Planned Prod. Order|Document
99000831|Released Production Order|Document
99000846|Consumption Journal|Worksheet
99000852|Planning Worksheet|Worksheet
99000883|Sales Order Planning|List
99000886|Subcontracting Worksheet|Worksheet
`.trim().split("\n").map(line => {
  const [id, caption, rawType] = line.split("|");
  return { id, caption, pageType: rawType === "ListPlus" ? "listPlus" : rawType.toLowerCase() };
});
const currentReferences = [
  ["21", "Customer Card", "card", "Customer", "Microsoft.Sales.Customer.Customer", "Provides detailed view and management of an individual customer's master data.", "Customer Card", "microsoft.sales.customer.customer-card"],
  ["22", "Customers", "list", "Customer", "Microsoft.Sales.Customer.Customer", "Overview of registered customers, their balances, and sales statistics.", "Customer List", "microsoft.sales.customer.customer-list"],
  ["26", "Vendor Card", "card", "Vendor", "Microsoft.Purchases.Vendor.Vendor", "Manage vendor information and agreed business terms, including payment terms, prices, and discounts.", "Vendor Card", "microsoft.purchases.vendor.vendor-card"],
  ["27", "Vendors", "list", "Vendor", "Microsoft.Purchases.Vendor.Vendor", "Overview of registered vendors that goods and services are purchased from.", "Vendor List", "microsoft.purchases.vendor.vendor-list"],
  ["30", "Item Card", "card", "Item", "Microsoft.Inventory.Item.Item", "Manage item information, pricing, replenishment, inventory, costing, and posting settings.", "Item Card", "microsoft.inventory.item.item-card"],
  ["31", "Items", "list", "Item", "Microsoft.Inventory.Item.Item", "Overview of products and services bought and sold, including default prices and inventory tracking.", "Item List", "microsoft.inventory.item.item-list"],
  ["42", "Sales Order", "document", "SalesOrder", 'Microsoft.Sales.Document."Sales Header"', "Create an order with sales lines, then ship or invoice it when ready.", "Sales Order", "microsoft.sales.document.sales-order"],
  ["43", "Sales Invoice", "document", "SalesInvoice", 'Microsoft.Sales.Document."Sales Header"', "Manage a sales invoice before posting; an unposted invoice can be reopened from the ongoing invoices list.", "Sales Invoice", "microsoft.sales.document.sales-invoice"],
  ["50", "Purchase Order", "document", "PurchaseOrder", 'Microsoft.Purchases.Document."Purchase Header"', "Create and manage a purchase order for goods and services.", "Purchase Order", "microsoft.purchases.document.purchase-order"],
  ["51", "Purchase Invoice", "document", "PurchaseInvoice", 'Microsoft.Purchases.Document."Purchase Header"', "Manage a purchase invoice before posting vendor bills and payable entries.", "Purchase Invoice", "microsoft.purchases.document.purchase-invoice"],
  ["9301", "Sales Invoices", "list", "SalesInvoice", 'Microsoft.Sales.Document."Sales Header"', "Sales invoices remain in this list until finalized and posted.", "Sales Invoice List", "microsoft.sales.document.sales-invoice-list"],
  ["9305", "Sales Orders", "list", "SalesOrder", 'Microsoft.Sales.Document."Sales Header"', "Manage sales orders used for partial shipments, drop shipments, or prepayments.", "Sales Order List", "microsoft.sales.document.sales-order-list"],
  ["9307", "Purchase Orders", "list", "PurchaseOrder", 'Microsoft.Purchases.Document."Purchase Header"', "Track purchase orders through ordering, receipt, and posting.", "Purchase Order List", "microsoft.purchases.document.purchase-order-list"],
  ["9308", "Purchase Invoices", "list", "PurchaseInvoice", 'Microsoft.Purchases.Document."Purchase Header"', "Create, manage, and post purchase invoices to record vendor bills and update payable, inventory, and financial records.", "Purchase Invoices", "microsoft.purchases.document.purchase-invoices"],
  ["9300", "Sales Quotes", "list", "SalesQuote", 'Microsoft.Sales.Document."Sales Header"', "Offer customers pricing and terms for what you sell. Quotes stay in this list until they're converted to an order or invoice, or deleted.", "Sales Quotes", "microsoft.sales.document.sales-quotes"],
  ["41", "Sales Quote", "document", "SalesQuote", 'Microsoft.Sales.Document."Sales Header"', "You can update, send, and resend a quote as needed. If the quote is accepted, the details will transfer to the sales order or invoice you create from it.", "Sales Quote", "microsoft.sales.document.sales-quote"],
  ["9302", "Sales Credit Memos", "list", "SalesCreditMemo", 'Microsoft.Sales.Document."Sales Header"', "Create, manage, and post sales credit memos to process customer refunds, returns, cancellations, and allowances.", "Sales Credit Memos", "microsoft.sales.document.sales-credit-memos"],
  ["9304", "Sales Return Orders", "list", "SalesReturnOrder", 'Microsoft.Sales.Document."Sales Header"', "Use a sales return order to track receipt and potential refund of items returned by a customer.", "Sales Return Order List", "microsoft.sales.document.sales-return-order-list"],
  ["143", "Posted Sales Invoices", "list", "PostedSalesInvoice", 'Microsoft.Sales.History."Sales Invoice Header"', "Lists posted sales invoices for viewing, printing, and navigation.", "Posted Sales Invoices", "microsoft.sales.history.posted-sales-invoices"],
  ["142", "Posted Sales Shipments", "list", "PostedSalesShipment", 'Microsoft.Sales.History."Sales Shipment Header"', "Review posted sales shipments and their customer and shipping details.", "Posted Sales Shipments", "microsoft.sales.history.posted-sales-shipments"],
  ["144", "Posted Sales Credit Memos", "list", "PostedSalesCreditMemo", 'Microsoft.Sales.History."Sales Cr.Memo Header"', "Review posted sales credit memos and related customer transactions.", "Posted Sales Credit Memos", "microsoft.sales.history.posted-sales-credit-memos"],
  ["9306", "Purchase Quotes", "list", "PurchaseQuote", 'Microsoft.Purchases.Document."Purchase Header"', "Create, manage, and track vendor purchase quotes before converting accepted quotes into purchase orders.", "Purchase Quotes", "microsoft.purchases.document.purchase-quotes"],
  ["9311", "Purchase Return Orders", "list", "PurchaseReturnOrder", 'Microsoft.Purchases.Document."Purchase Header"', "Create and manage purchase return orders to process returns to vendors and reverse posted costs.", "Purchase Return Order List", "microsoft.purchases.document.purchase-return-order-list"],
  ["146", "Posted Purchase Invoices", "list", "PostedPurchaseInvoice", 'Microsoft.Purchases.History."Purch. Inv. Header"', "Review posted purchase invoices and recorded vendor bills.", "Posted Purchase Invoices", "microsoft.purchases.history.posted-purchase-invoices"],
  ["145", "Posted Purchase Receipts", "list", "PostedPurchaseReceipt", 'Microsoft.Purchases.History."Purch. Rcpt. Header"', "Review posted purchase receipts and completed purchase deliveries.", "Posted Purchase Receipts", "microsoft.purchases.history.posted-purchase-receipts"],
  ["33", "Customers", "list", "Customer", "Microsoft.Sales.Customer.Customer", "Provides a simplified lookup page for selecting customers.", "Customer Lookup", "microsoft.sales.customer.customer-lookup"],
  ["34", "Vendors", "list", "Vendor", "Microsoft.Purchases.Vendor.Vendor", "Provides a simplified lookup page for selecting vendors.", "Vendor Lookup", "microsoft.purchases.vendor.vendor-lookup"],
  ["5401", "Item Variants", "list", "ItemVariant", 'Microsoft.Inventory.Item."Item Variant"', "View and select item variants defined for inventory items.", "Item Variants", "microsoft.inventory.item.item-variants"],
  ["5730", "Item Categories", "list", "ItemCategory", 'Microsoft.Inventory.Item."Item Category"', "Organize item categories and classify inventory consistently.", "Item Categories", "microsoft.inventory.item.item-categories"],
  ["7332", "Warehouse Receipts", "list", "WarehouseReceipt", 'Microsoft.Warehouse.Document."Warehouse Receipt Header"', "Manage and post receipts from purchase orders and other source documents, adjust quantities, and assign bins and locations.", "Warehouse Receipts", "microsoft.warehouse.document.warehouse-receipts"],
  ["5768", "Warehouse Receipt", "document", "WarehouseReceipt", 'Microsoft.Warehouse.Document."Warehouse Receipt Header"', "Manage a warehouse receipt document for receiving items.", "Warehouse Receipt", "microsoft.warehouse.document.warehouse-receipt"],
  ["7335", "Warehouse Shipment", "document", "WarehouseShipment", 'Microsoft.Warehouse.Document."Warehouse Shipment Header"', "Manage a warehouse shipment document for outbound goods.", "Warehouse Shipment", "microsoft.warehouse.document.warehouse-shipment"],
  ["7339", "Warehouse Shipments", "list", "WarehouseShipment", 'Microsoft.Warehouse.Document."Warehouse Shipment Header"', "View warehouse shipments prepared for outbound processing.", "Warehouse Shipment List", "microsoft.warehouse.document.warehouse-shipment-list"],
  ["5774", "Warehouse Activity List", "list", "WarehouseActivity", 'Microsoft.Warehouse.Activity."Warehouse Activity Header"', "View warehouse activity documents and their status.", "Warehouse Activity List", "microsoft.warehouse.activity.warehouse-activity-list"],
  ["9312", "Warehouse Put-aways", "list", "WarehousePutAway", 'Microsoft.Warehouse.Activity."Warehouse Activity Header"', "View warehouse put-away activities for placing received items into storage.", "Warehouse Put-aways", "microsoft.warehouse.activity.warehouse-put-aways"],
  ["9313", "Warehouse Picks", "list", "WarehousePick", 'Microsoft.Warehouse.Activity."Warehouse Activity Header"', "Manage item picking for warehouse shipments using assigned pick instructions.", "Warehouse Picks", "microsoft.warehouse.activity.warehouse-picks"],
  ["9316", "Inventory Picks", "list", "InventoryPick", 'Microsoft.Warehouse.Activity."Warehouse Activity Header"', "Create and manage inventory picks for outbound source documents.", "Inventory Picks", "microsoft.warehouse.activity.inventory-picks"],
  ["99000815", "Production Order List", "list", "ProductionOrder", 'Microsoft.Manufacturing.Document."Production Order"', "View production orders in the system.", "Production Order List", "microsoft.manufacturing.document.production-order-list"],
  ["9326", "Released Production Orders", "list", "ProductionOrder", 'Microsoft.Manufacturing.Document."Production Order"', "Track and monitor released production orders and their progress.", "Released Production Orders", "microsoft.manufacturing.document.released-production-orders"],
  ["99000831", "Released Production Order", "document", "ProductionOrder", 'Microsoft.Manufacturing.Document."Production Order"', "Manage a released production order.", "Released Production Order", "microsoft.manufacturing.document.released-production-order"],
  ["16", "Chart of Accounts", "list", "GLAccount", 'Microsoft.Finance.GeneralLedger.Account."G/L Account"', "The chart of accounts is the core of the financials. It's used to group income and expenses in the income statement and balance sheet.", "Chart of Accounts", "microsoft.finance.generalledger.account.chart-of-accounts"],
  ["20", "General Ledger Entries", "list", "GLEntry", 'Microsoft.Finance.GeneralLedger.Ledger."G/L Entry"', "View posted general ledger transactions and accounting entries.", "General Ledger Entries", "microsoft.finance.generalledger.ledger.general-ledger-entries"],
  ["39", "General Journals", "worksheet", "GeneralJournal", 'Microsoft.Finance.GeneralLedger.Journal."Gen. Journal Line"', "Enter and post general journal transactions.", "General Journal", "microsoft.finance.generalledger.journal.general-journal"],
  ["118", "General Ledger Setup", "card", "GeneralLedgerSetup", 'Microsoft.Finance.GeneralLedger.Setup."General Ledger Setup"', "Configure core general ledger parameters, posting controls, currency, VAT, and dimensions.", "General Ledger Setup", "microsoft.finance.generalledger.setup.general-ledger-setup"],
  ["256", "Payment Journals", "worksheet", "PaymentJournal", 'Microsoft.Finance.GeneralLedger.Journal."Gen. Journal Line"', "Prepare and post payments, including payment file export and check processing.", "Payment Journal", "microsoft.finance.generalledger.journal.payment-journal"],
  ["370", "Bank Account Card", "card", "BankAccount", 'Microsoft.Bank.BankAccount."Bank Account"', "Manage bank account master data and payment configuration.", "Bank Account Card", "microsoft.bank.bankaccount.bank-account-card"],
  ["371", "Bank Accounts", "list", "BankAccount", 'Microsoft.Bank.BankAccount."Bank Account"', "View and manage bank accounts, their balances, reconciliations, and statement imports.", "Bank Account List", "microsoft.bank.bankaccount.bank-account-list"],
  ["372", "Bank Account Ledger Entries", "list", "BankAccountLedgerEntry", 'Microsoft.Bank.Ledger."Bank Account Ledger Entry"', "View posted bank transactions and navigate to related documents and reconciliation details.", "Bank Account Ledger Entries", "microsoft.bank.ledger.bank-account-ledger-entries"],
  ["388", "Bank Account Reconciliations", "list", "BankAccountReconciliation", 'Microsoft.Bank.Reconciliation."Bank Acc. Reconciliation"', "Reconcile imported bank statement lines with internal ledger entries using automated suggestions and manual review.", "Bank Acc. Reconciliation List", "microsoft.bank.reconciliation.bank-acc.-reconciliation-list"]
].map(([id, caption, pageType, entity, sourceTable, description, pageName, docSlug]) => ({
  id, caption, pageType, entity, sourceTable, description, pageName,
  sourceId: `microsoft-learn-bc28-${id}`,
  sourceUri: `https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/page/${docSlug}`
}));
const packPath = path.join(root, "src/knowledge-packs/bc-standard-pages.json");
const indexPath = path.join(root, "src/knowledge-packs/index.json");
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const currentById = new Map(currentReferences.map(item => [item.id, item]));
const versionedExisting = new Map([["bc-core", new Set(["21", "30"])],
  ["bc-sales", new Set(["42"])], ["bc-purchase", new Set(["50"])]]);
for (const descriptor of index.packs.filter(item =>
  !["bc-standard-pages", "bc-application-reference-28"].includes(item.packId))) {
  const expectedIds = versionedExisting.get(descriptor.packId);
  if (!expectedIds) continue;
  const packFile = path.join(root, "src", descriptor.file);
  const pack = JSON.parse(fs.readFileSync(packFile, "utf8"));
  let changed = false;
  for (const page of pack.pageDefinitions || []) if (expectedIds.has(String(page.pageObjectId))) {
    page.compatibility = { minAppVersion: "21.0.0", maxAppVersion: "21.99.99" };
    page.entity = currentById.get(String(page.pageObjectId))?.entity || page.entity;
    page.sourceIds = [...new Set([...(page.sourceIds || []), sourceId])];
    changed = true;
  }
  for (const page of pack.pageDefinitions || []) {
    const current = currentById.get(String(page.pageObjectId));
    if (!current) continue;
    for (const field of ["entity", "pageType", "tableId", "recordType", "documentType"]) {
      if (current[field] !== undefined && page[field] !== current[field]) {
        page[field] = current[field]; changed = true;
      }
    }
  }
  if (changed) {
    pack.version = "2.1.0";
    pack.sources = [...(pack.sources || []).filter(item => item.sourceId !== sourceId), {
      sourceId, title: "Pages with Action Bar Improvements", sourceType: "microsoft-learn",
      sourceUri: source, appliesTo: "Business Central 2022 release wave 2 (version 21.0)",
      publishedDate: "2022-11-09", accessedDate: "2026-09-25",
      fields: ["pageObjectId", "caption", "pageType"] }];
    fs.writeFileSync(packFile, `${JSON.stringify(pack, null, 2)}\n`);
  }
}
const existingIds = new Set(index.packs.filter(item =>
  !["bc-standard-pages", "bc-application-reference-28"].includes(item.packId)).flatMap(descriptor => {
  const pack = JSON.parse(fs.readFileSync(path.join(root, "src", descriptor.file), "utf8"));
  return (pack.pageDefinitions || []).map(page => String(page.pageObjectId));
}));
const basePages = index.packs.filter(item =>
  !["bc-standard-pages", "bc-application-reference-28"].includes(item.packId))
  .flatMap(item => JSON.parse(fs.readFileSync(path.join(root, "src", item.file), "utf8")).pageDefinitions || []);
const pageDefinitions = rows.map(row => {
  const existing = basePages.find(page => String(page.pageObjectId) === row.id);
  if (existing) return { ...existing, ruleId: `MicrosoftBC21.Page${row.id}`,
    compatibility: { minAppVersion: "21.0.0", maxAppVersion: "21.99.99" },
    sourceIds: [sourceId],
    sourceTable: currentById.get(row.id)?.sourceTable || existing.sourceTable,
    description: currentById.get(row.id)?.description || existing.description };
  return {
    ruleId: `MicrosoftBC21.Page${row.id}`,
    pageObjectId: row.id,
    entity: currentById.get(row.id)?.entity || "",
    pageType: row.pageType,
    localizedCaptions: { "en-US": [row.caption] },
    captionRules: [{ locale: "en-US", pattern: `^${row.caption.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}$` }],
    objectVerification: "declared",
    compatibility: { minAppVersion: "21.0.0", maxAppVersion: "21.99.99" },
    sourceIds: [sourceId]
  };
});
const bc21Pack = {
  packId: "bc-standard-pages",
  name: "Business Central standard pages (BC 21 snapshot)",
  version: "1.0.0",
  priority: 110,
  sources: [{ sourceId, title: "Pages with Action Bar Improvements",
    sourceType: "microsoft-learn", sourceUri: source,
    appliesTo: "Business Central 2022 release wave 2 (version 21.0)",
    publishedDate: "2022-11-09", accessedDate: "2026-09-25",
    fields: ["pageObjectId", "caption", "pageType"],
    notes: "This documents a version-scoped set of pages, not the complete current page catalog." }],
  pageDefinitions,
  rules: []
};
const bc28Pack = {
  packId: "bc-application-reference-28",
  name: "Business Central Base Application reference (version 28)",
  version: "1.0.0",
  priority: 250,
  sources: currentReferences.map(item => ({ sourceId: item.sourceId,
      title: `Page ${item.id} ${item.pageName}`, sourceType: "microsoft-learn-application-reference",
      sourceUri: item.sourceUri, appliesTo: "Business Central 2026 release wave 1 (version 28.x)",
      accessedDate: "2026-09-25", fields: ["pageObjectId", "caption", "pageType",
        "sourceTable", "description"] })),
  pageDefinitions: currentReferences.map(item => ({
    ruleId: `MicrosoftBC28.Page${item.id}`,
    pageObjectId: item.id,
    entity: item.entity,
    pageType: item.pageType,
    sourceTable: item.sourceTable,
    description: item.description,
    localizedCaptions: { "en-US": [item.caption] },
    captionRules: [{ locale: "en-US", pattern: `^${item.caption.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}$` }],
    objectVerification: "declared",
    compatibility: { minAppVersion: "28.0.0", maxAppVersion: "28.99.99" },
    sourceIds: [item.sourceId]
  })),
  rules: []
};
const currentDefinitions = new Map(bc28Pack.pageDefinitions.map(page => [String(page.pageObjectId), page]));
for (const descriptor of index.packs.filter(item =>
  !["bc-standard-pages", "bc-application-reference-28"].includes(item.packId))) {
  const packPath = path.join(root, "src", descriptor.file);
  const existingPack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  let changed = false;
  for (const page of existingPack.pageDefinitions || []) {
    const reference = currentDefinitions.get(String(page.pageObjectId));
    if (!reference) continue;
    for (const field of ["entity", "pageType", "tableId", "recordType", "documentType"]) {
      if (reference[field] !== undefined && page[field] !== reference[field]) {
        page[field] = reference[field]; changed = true;
      }
    }
  }
  if (changed) {
    existingPack.version = "2.2.0";
    fs.writeFileSync(packPath, `${JSON.stringify(existingPack, null, 2)}\n`);
  }
}
fs.writeFileSync(packPath, `${JSON.stringify(bc21Pack, null, 2)}\n`);
const currentPackPath = path.join(root, "src/knowledge-packs/bc-application-reference-28.json");
fs.writeFileSync(currentPackPath, `${JSON.stringify(bc28Pack, null, 2)}\n`);
const outputPacks = [bc21Pack, bc28Pack];
for (const item of outputPacks) if (!index.packs.some(existing => existing.packId === item.packId)) {
  index.packs.push({ packId: item.packId, file: `knowledge-packs/${item.packId}.json`, enabled: true });
}
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(JSON.stringify({ bc21DocumentedPageCount: rows.length,
  bc21AddedPageCount: pageDefinitions.length, bc28ReferenceCount: currentReferences.length,
  packPaths: [packPath, currentPackPath] }, null, 2));
