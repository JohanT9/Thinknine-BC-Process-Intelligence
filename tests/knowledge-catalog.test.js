const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const knowledgeRepository = require("../src/engine/knowledge-repository");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root,
  "src/knowledge-packs/index.json"), "utf8"));
const packs = manifest.packs.filter(item => item.enabled).map(descriptor => ({
  packId: descriptor.packId,
  pack: JSON.parse(fs.readFileSync(path.join(root, "src", descriptor.file), "utf8"))
}));
const imported = knowledgeRepository.importRelease(manifest, packs);
assert.equal(imported.ok, true, JSON.stringify(imported.diagnostics));
assert.equal(imported.diagnostics.some(item => item.code === "conflicting-page-definitions"), false,
  "shared BC 21 and process-pack pages should keep a consistent semantic identity");
assert.equal(imported.snapshot.objects.length, 253,
  "the catalog should include 182 BC 21 page records, 49 BC 28 references, process-pack page identities, and existing current records");
assert.equal(new Set(imported.snapshot.objects.filter(item => item.objectType === "page")
  .map(item => item.objectId)).size, 202,
"the versioned BC 21 snapshot and BC 28 application references should cover 203 distinct page IDs");
const repository = knowledgeRepository.createRepository(imported.snapshot);
const historicalSalesOrder = repository.lookupObject({ objectType: "page", objectId: "42",
  appVersion: "21.0.0" });
assert.equal(historicalSalesOrder.status, "resolved",
  "identical BC 21 records in the sales pack and public snapshot should collapse into one match");
assert.equal(historicalSalesOrder.candidates[0].provenance.sourceRefs.some(source =>
  source.sourceId === "microsoft-learn-bc21-actionbar-pages"), true,
"collapsed duplicate results should preserve both official and product-pack provenance");
const historicalCustomerList = repository.lookupObject({ objectType: "page", objectId: "22",
  appVersion: "21.0.0" });
assert.equal(historicalCustomerList.status, "resolved");
assert.equal(historicalCustomerList.candidates[0].displayName, "Customer List");
assert.equal(historicalCustomerList.candidates[0].provenance.sourceRefs[0].sourceUri,
  "https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-pages-action-bar-improvements");
const currentCustomers = repository.lookupObject({ objectType: "page", objectId: "22",
  appVersion: "28.5.0" });
assert.equal(currentCustomers.status, "resolved");
assert.equal(currentCustomers.candidates[0].displayName, "Customers");
assert.equal(currentCustomers.candidates[0].pageType, "list");
assert.equal(currentCustomers.candidates[0].sourceTable, "Microsoft.Sales.Customer.Customer");
assert.equal(currentCustomers.candidates[0].provenance.sourceRefs[0].sourceUri,
  "https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/page/microsoft.sales.customer.customer-list");
assert.equal(repository.lookupObject({ objectType: "page", objectId: "22" })
  .candidates[0].displayName, "Customers", "versionless lookup should prefer the latest documented version");
assert.equal(repository.lookupObject({ objectType: "page", objectId: "22",
  appVersion: "26.0.0" }).status, "unresolved",
"the catalog should not assert a documented caption for BC 26 without a matching source");
for (const [objectId, caption, sourceId] of [
  ["9300", "Sales Quotes", "microsoft-learn-bc28-9300"],
  ["7332", "Warehouse Receipts", "microsoft-learn-bc28-7332"],
  ["9326", "Released Production Orders", "microsoft-learn-bc28-9326"],
  ["16", "Chart of Accounts", "microsoft-learn-bc28-16"],
  ["388", "Bank Account Reconciliations", "microsoft-learn-bc28-388"]
]) {
  const match = repository.lookupObject({ objectType: "page", objectId, appVersion: "28.0.0" });
  assert.equal(match.status, "resolved");
  assert.equal(match.candidates[0].displayName, caption);
  assert.equal(match.candidates[0].provenance.sourceRefs[0].sourceId, sourceId);
}
assert.equal(repository.lookupObject({ objectType: "page", objectId: "22",
  appVersion: "20.0.0" }).status, "unresolved",
  "the BC 21.0 snapshot should not claim compatibility with earlier versions");
assert.equal(repository.lookupObject({ objectType: "page", objectId: "999999" }).status,
  "unresolved");
for (const [context, expectedRule, sourceId] of [
  [{ pageCaption: "Sales Order", fieldCaption: "Qty. to Ship" }, "Sales.SetQtyToShip", "microsoft-learn-sales-order-process"],
  [{ pageCaption: "Purchase Order", fieldCaption: "Qty. to Receive" }, "Purchase.SetQtyToReceive", "microsoft-learn-purchase-recording"],
  [{ pageCaption: "Inventory Pick", fieldCaption: "Qty. to Handle" }, "Warehouse.SetQtyToHandlePick", "microsoft-learn-inventory-picks"],
  [{ pageCaption: "Inventory Pick", actionCaption: "Post" }, "Warehouse.PostInventoryPick", "microsoft-learn-inventory-picks"],
  [{ pageCaption: "Warehouse Put-away", actionCaption: "Register Put-Away" }, "Warehouse.RegisterPutAway", "microsoft-learn-advanced-receiving-putaway"],
  [{ pageCaption: "Warehouse Receipt", fieldCaption: "Qty. to Receive" }, "Warehouse.SetQtyToReceive", "microsoft-learn-advanced-receiving-putaway"],
  [{ pageCaption: "Warehouse Receipt", actionCaption: "Post Receipt" }, "Warehouse.PostReceiptAction", "microsoft-learn-advanced-receiving-putaway"],
  [{ pageCaption: "Production Journal", actionCaption: "Post" }, "Manufacturing.PostProductionJournal", "microsoft-learn-production-journal"],
  [{ pageCaption: "Production Journal", fieldCaption: "Consumption Quantity" }, "Manufacturing.EnterConsumptionQuantity", "microsoft-learn-production-journal"],
  [{ pageCaption: "Production Journal", fieldCaption: "Output Quantity" }, "Manufacturing.EnterOutputQuantity", "microsoft-learn-production-journal"],
  [{ pageCaption: "Sales Order", fieldCaption: "Quantity" }, "Sales.SetSalesLineQuantity", "microsoft-learn-sales-order-process"],
  [{ pageCaption: "Purchase Order", fieldCaption: "Quantity" }, "Purchase.SetPurchaseLineQuantity", "microsoft-learn-purchase-recording"],
  [{ pageCaption: "Förs.order", fieldCaption: "Ant. att utleverera" }, "Sales.SetQtyToShip", "microsoft-learn-sales-order-process-sv"],
  [{ pageCaption: "Inköpsorder", fieldCaption: "Inlevereras antal" }, "Purchase.SetQtyToReceive", "microsoft-learn-purchase-recording-sv"],
  [{ pageCaption: "Lagerplockning", fieldCaption: "Ant. att hantera" }, "Warehouse.SetQtyToHandlePick", "microsoft-learn-inventory-picks-sv"],
  [{ pageCaption: "Dist.lager inleverans", actionCaption: "Bokföra inleverans" }, "Warehouse.PostReceiptAction", "microsoft-learn-advanced-receiving-putaway-sv"],
  [{ pageCaption: "Dist.lager artikelinförsel", actionCaption: "Registrera artikelinförsel" }, "Warehouse.RegisterPutAway", "microsoft-learn-warehouse-putaways-sv"],
  [{ pageCaption: "Produktionsjournal", fieldCaption: "Förbrukningskvantitet" }, "Manufacturing.EnterConsumptionQuantity", "microsoft-learn-production-journal-sv"],
  [{ pageCaption: "Produktionsjournal", fieldCaption: "Utflöde antal" }, "Manufacturing.EnterOutputQuantity", "microsoft-learn-production-journal-sv"]
,
  [{ pageCaption: "Sales Return Order", actionCaption: "Get Posted Document Lines to Reverse" }, "Sales.GetPostedLinesToReverse", "microsoft-learn-sales-return-orders"],
  [{ pageCaption: "Förs.ret.order", actionCaption: "Hämta bokförda dokumentrader som ska återföras" }, "Sales.GetPostedLinesToReverse", "microsoft-learn-sales-return-orders-sv"],
  [{ pageCaption: "Sales Return Order", fieldCaption: "Return Reason Code" }, "Sales.SetReturnReasonCode", "microsoft-learn-sales-return-orders"],
  [{ pageCaption: "Försäljningsreturorder", actionCaption: "Bokföra" }, "Sales.PostSalesReturnOrder", "microsoft-learn-sales-return-orders-sv"],
  [{ pageCaption: "Posted Sales Invoices", actionCaption: "Create Corrective Credit Memo" }, "Sales.CreateCorrectiveCreditMemo", "microsoft-learn-sales-returns"],
  [{ pageCaption: "Försäljningskreditnota", actionCaption: "Koppla transaktioner" }, "Sales.ApplyCreditMemoEntries", "microsoft-learn-sales-returns-sv"],
  [{ pageCaption: "Purchase Return Order", actionCaption: "Get Posted Document Lines to Reverse" }, "Purchase.GetPostedLinesToReverse", "microsoft-learn-purchase-returns"],
  [{ pageCaption: "Inköpsreturbeställningar", fieldCaption: "Returorsakskod" }, "Purchase.SetReturnReasonCode", "microsoft-learn-purchase-returns-sv"],
  [{ pageCaption: "Purchase Return Order", actionCaption: "Post" }, "Purchase.PostPurchaseReturnOrder", "microsoft-learn-purchase-returns"],
  [{ pageCaption: "Posted Purchase Invoices", actionCaption: "Create Corrective Credit Memo" }, "Purchase.CreateCorrectiveCreditMemo", "microsoft-learn-purchase-returns"],
  [{ pageCaption: "Inköpskreditnota", actionCaption: "Koppla transaktioner" }, "Purchase.ApplyCreditMemoEntries", "microsoft-learn-purchase-returns-sv"],
  [{ pageCaption: "Sales Credit Memo", actionCaption: "Copy from Document" }, "Sales.CopyToCreditMemo", "microsoft-learn-sales-returns"],
  [{ pageCaption: "Försäljningskreditnota", actionCaption: "Bokföra" }, "Sales.PostSalesCreditMemo", "microsoft-learn-sales-returns-sv"],
  [{ pageCaption: "Posted Sales Invoices", actionCaption: "Cancel" }, "Sales.CancelUnpaidPostedInvoice", "microsoft-learn-sales-returns"],
  [{ pageCaption: "Purchase Credit Memo", actionCaption: "Apply Entries" }, "Purchase.ApplyCreditMemoEntries", "microsoft-learn-purchase-returns"],
  [{ pageCaption: "Inköpskreditnota", actionCaption: "Kopiera från dokument" }, "Purchase.CopyToCreditMemo", "microsoft-learn-purchase-returns-sv"],
  [{ pageCaption: "Purchase Credit Memo", actionCaption: "Post" }, "Purchase.PostPurchaseCreditMemo", "microsoft-learn-purchase-returns"],
  [{ pageCaption: "Cash Receipt Journal", actionCaption: "Post" }, "CashManagement.PostCashReceiptJournal", "microsoft-learn-customer-payments"],
  [{ pageCaption: "Kassakvittojournaler", actionCaption: "Koppla transaktioner" }, "CashManagement.ApplyCustomerEntries", "microsoft-learn-customer-payments-sv"],
  [{ pageCaption: "Payment Journal", actionCaption: "Suggest Vendor Payments" }, "CashManagement.SuggestVendorPayments", "microsoft-learn-vendor-payments"],
  [{ pageCaption: "Betalningsjournaler", actionCaption: "Bokför" }, "CashManagement.PostPaymentJournal", "microsoft-learn-payment-journal-sv"],
  [{ pageCaption: "Payment Reconciliation Journal", actionCaption: "Apply Automatically" }, "CashManagement.ApplyPaymentsAutomatically", "microsoft-learn-payment-reconciliation"],
  [{ pageCaption: "Betalningsavstämningsjournal", actionCaption: "Koppla automatiskt" }, "CashManagement.ApplyPaymentsAutomatically", "microsoft-learn-payment-reconciliation-sv"],
  [{ pageCaption: "Payment Reconciliation Journal", actionCaption: "Apply Manually" }, "CashManagement.ApplyPaymentsManually", "microsoft-learn-payment-reconciliation-review"]]) {
  const result = repository.resolveAction({ context });
  assert.equal(result.status, "resolved", `${JSON.stringify(context)} should resolve`);
  assert.equal(result.candidates[0].provenance.ruleId, expectedRule);
  assert.equal(result.candidates[0].provenance.sourceRefs.some(source => source.sourceId === sourceId), true,
    `${expectedRule} should expose its Microsoft Learn source`);
}
for (const [objectId, appVersion, expectedPack] of [["6630","21.4.0","bc-sales"],["9304","28.0.0","bc-sales"],["143","28.0.0","bc-sales"],["44","28.0.0","bc-sales"],["6640","21.4.0","bc-purchase"],["9311","28.0.0","bc-purchase"],["146","28.0.0","bc-purchase"],["52","28.0.0","bc-purchase"],["9309","28.0.0","bc-purchase"]]) { const page=repository.lookupObject({objectType:"page",objectId,appVersion}); assert.equal(page.status,"resolved",`page ${objectId} should resolve for BC ${appVersion}`); assert.equal(page.candidates.some(c=>(c.provenance.packIds||[c.provenance.packId]).includes(expectedPack)),true,`page ${objectId} should carry its process pack identity`); }
for(const objectId of ["143","146"]) assert.equal(repository.lookupObject({objectType:"page",objectId,appVersion:"26.0.0"}).status,"unresolved",`page ${objectId} should remain unknown for undocumented BC 26`);
const cashManagementPack = packs.find(item => item.packId === "bc-cash-management").pack;
for (const locale of ["en-US", "sv-SE", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"]) {
  const source = cashManagementPack.sources.find(item => item.sourceId ===
    `microsoft-learn-bank-reconciliation-${locale.toLowerCase()}`);
  assert.ok(source, `bank account reconciliation source exists for ${locale}`);
  assert.equal(source.sourceUri,
    `https://learn.microsoft.com/${locale.toLowerCase()}/dynamics365/business-central/bank-how-reconcile-bank-accounts-separately`,
    `localized official bank reconciliation source for ${locale}`);
  assert.ok(source.fields.some(field => /distinct from payment reconciliation journal/.test(field)),
    `separate bank reconciliation workflow is documented for ${locale}`);
  assert.ok(source.fields.some(field => /Test Report and resolve Difference values before posting/.test(field)),
    `pre-post reconciliation controls are documented for ${locale}`);
  assert.ok(source.fields.some(field => /Avoid direct G\/L posting/.test(field)),
    `bank ledger and G/L linkage warning is documented for ${locale}`);
}
const scopedReturn=repository.resolveAction({objectRef:{objectId:"6630",appVersion:"21.4.0"},context:{pageCaption:"Sales Return Order",actionCaption:"Post"}}); assert.equal(scopedReturn.status,"resolved"); assert.equal(scopedReturn.candidates[0].provenance.ruleId,"Sales.PostSalesReturnOrder"); assert.equal(scopedReturn.candidates[0].provenance.sourceRefs.some(source=>source.sourceId==="microsoft-learn-sales-return-orders"),true);
for(const [objectId,appVersion,expectedPack] of [["255","21.0.0","bc-cash-management"],["255","28.0.0","bc-cash-management"],["256","21.0.0","bc-cash-management"],["256","28.0.0","bc-cash-management"],["1290","28.0.0","bc-cash-management"]]){const page=repository.lookupObject({objectId,appVersion});assert.equal(page.status,"resolved");assert.equal(page.candidates.some(c=>(c.provenance.packIds||[c.provenance.packId]).includes(expectedPack)),true);}
assert.equal(repository.lookupObject({objectId:"256",appVersion:"26.0.0"}).status,"unresolved","payment-journal identity should stay unknown in undocumented BC 26");
const scopedPayments=repository.resolveAction({objectRef:{objectId:"1290",appVersion:"28.4.0"},context:{pageCaption:"Payment Reconciliation Journal",actionCaption:"Apply Automatically"}});assert.equal(scopedPayments.status,"resolved");assert.equal(scopedPayments.candidates[0].provenance.ruleId,"CashManagement.ApplyPaymentsAutomatically");
const multilingualSamples=[
  ["sv-SE","Förs.ret.order","Hämta bokförda dokumentrader som ska återföras","Sales.GetPostedLinesToReverse"],
  ["en-US","Sales Return Order","Get Posted Document Lines to Reverse","Sales.GetPostedLinesToReverse"],
  ["fr-FR","Commandes de retour des ventes","Afficher des lignes document validées à contrepasser","Sales.GetPostedLinesToReverse"],
  ["de-DE","Verkaufsrücklaufaufträge","Zu stornierende gebuchte Belegzeilen abrufen","Sales.GetPostedLinesToReverse"],
  ["es-ES","Pedidos de devolución de ventas","Revertir líneas documentos registrados","Sales.GetPostedLinesToReverse"],
  ["da-DK","Salgsreturvareordrer","Hent bogførte bilagslinjer, der skal tilbageføres","Sales.GetPostedLinesToReverse"],
  ["fi-FI","Myyntipalautustilaus","Hae peruutettavat kirjatut asiakirjarivit","Sales.GetPostedLinesToReverse"],
  ["nb-NO","Ordreretur for salg","Hent bokførte dokumentlinjer som skal tilbakeføres","Sales.GetPostedLinesToReverse"]
];
for(const [locale,pageCaption,actionCaption,ruleId] of multilingualSamples){
  const found=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
  assert.equal(found.status,"resolved",`${locale} return action should resolve`);
  assert.equal(found.candidates[0].provenance.ruleId,ruleId,`${locale} should select the expected rule`);
  assert.equal(found.candidates[0].provenance.language,locale);
}
const multilingualPurchaseSamples=[
  ["sv-SE","Inköpsreturorder","Hämta bokförda dokumentrader för reversering"],
  ["en-US","Purchase Return Order","Get Posted Document Lines to Reverse"],
  ["fr-FR","Commandes de retour d'achat","Afficher des lignes document validées à contrepasser"],
  ["de-DE","Rückkauf-Aufträge","Zu stornierende gebuchte Belegzeilen abrufen"],
  ["es-ES","Pedidos de devolución de compra","Revertir líneas documentos registrados"],
  ["da-DK","Købsreturvareordrer","Hent bogførte bilagslinjer, der skal tilbageføres"],
  ["fi-FI","Ostopalautustilaukset","Hae peruutettavat kirjatut asiakirjarivit"],
  ["nb-NO","Kjøpsreturordrer","Hent bokførte dokumentlinjer som skal tilbakeføres"]
];
for(const [locale,pageCaption,actionCaption] of multilingualPurchaseSamples){
  const found=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
  assert.equal(found.status,"resolved",`${locale} purchase return action should resolve`);
  assert.equal(found.candidates[0].provenance.ruleId,"Purchase.GetPostedLinesToReverse");
  assert.equal(found.candidates[0].provenance.language,locale);
}
const multilingualPaymentSamples=[
  ["sv-SE","Betalningsjournaler","Föreslå leverantörsbetalningar"],
  ["en-US","Payment Journal","Suggest Vendor Payments"],
  ["fr-FR","Feuilles paiement","Proposer paiements fournisseur"],
  ["de-DE","Zahlungsausgangs Buch.-Blatt","Lieferantenzahlung vorschlagen"],
  ["es-ES","Diario de pagos","Proponer pagos a proveedor"],
  ["da-DK","Betalingskladder","Lav kreditorbetalingsforslag"],
  ["fi-FI","Maksupäiväkirjat","Ehdota toimittajamaksuja"],
  ["nb-NO","Utbetalingskladd","Betalingsforslag – leverandør"]
];
for(const [locale,pageCaption,actionCaption] of multilingualPaymentSamples){
  const found=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
  assert.equal(found.status,"resolved",`${locale} vendor payment suggestion should resolve`);
  assert.equal(found.candidates[0].provenance.ruleId,"CashManagement.SuggestVendorPayments");
  assert.equal(found.candidates[0].provenance.language,locale);
}
for(const pack of imported.snapshot.packs.filter(item=>["bc-sales","bc-purchase"].includes(item.packId)))for(const rule of pack.rules.filter(item=>/(Return|GetPosted|CreditMemo|Corrective|UnpaidPostedInvoice)/.test(item.ruleId)))
  for(const locale of ["sv-SE","en-US","fr-FR","de-DE","es-ES","da-DK","fi-FI","nb-NO"])
    assert.equal(rule.languages.includes(locale),true,`${rule.ruleId} should declare ${locale} coverage`);
console.log("BC catalog count, source traceability, return and cash-management rules, and version gates passed.");
