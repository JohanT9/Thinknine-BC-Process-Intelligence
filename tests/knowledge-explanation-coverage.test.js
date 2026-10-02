const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const catalog = require("../src/engine/knowledge-explanation-catalog");
const knowledge = require("../src/engine/knowledge-domain");
const sessionPipeline = require("../src/engine/session-interpretation-pipeline");

const packDir = path.join(__dirname, "..", "src", "knowledge-packs");
const packs = fs.readdirSync(packDir).filter(name => name.endsWith(".json"))
  .map(name => JSON.parse(fs.readFileSync(path.join(packDir, name), "utf8")))
  .filter(pack => pack.rules?.length);
const supportedLocales = ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES",
  "da-DK", "fi-FI", "nb-NO"];
let covered = 0;
for (const pack of packs) {
  for (const rule of pack.rules) {
    if (!rule.sourceIds?.length) continue;
    assert.ok(catalog.supports({ ...rule, sourceRefs: rule.sourceIds.map(id =>
      pack.sources?.find(source => source.sourceId === id)).filter(Boolean) }),
    `${rule.ruleId} has a complete localized explanation`);
    const localized = knowledge.localizedExplanations({ ...rule,
      sourceRefs: rule.sourceIds.map(id => pack.sources?.find(source =>
        source.sourceId === id)).filter(Boolean) });
    assert.deepEqual(Object.keys(localized).sort(), [...supportedLocales].sort(),
      `${rule.ruleId} covers all supported interface languages`);
    const refs = pack.sources.filter(source => rule.sourceIds.includes(source.sourceId));
    if (pack.packId === "aptean-fb") {
      assert.ok(refs.some(source => source.sourceUri?.startsWith("https://erpdocs.apteancloud.com/bc/docs/")),
        `${rule.ruleId} has an official Aptean documentation reference`);
    } else {
      assert.ok(refs.some(source => /^https:\/\/learn\.microsoft\.com\//i.test(source.sourceUri || "")),
        `${rule.ruleId} has an official Microsoft Learn reference`);
      for (const locale of supportedLocales) {
        assert.ok(refs.some(source => source.sourceUri?.toLowerCase()
          .includes(`/${locale.toLowerCase()}/`)) || refs.every(source =>
          pack.sourceLocaleGaps?.[source.sourceId]?.includes(locale)),
        `${rule.ruleId} has a localized ${locale} source`);
      }
    }
    covered += 1;
  }
}
assert.ok(covered >= 100, `broad cross-area explanation coverage (${covered})`);

const itemSelectionRule = knowledge.rules(packs).find(rule =>
  rule.ruleId === "Sales.SelectSalesLineItem");
const itemSelectionExplanation = knowledge.localizedExplanations(itemSelectionRule);
assert.deepEqual(Object.keys(itemSelectionExplanation).sort(),
  [...supportedLocales].sort(),
  "sales item selection explanation covers all supported UI languages");
assert.match(itemSelectionExplanation["sv-SE"], /artikel/i);
assert.match(itemSelectionExplanation["sv-SE"], /pris och rabatt/i);
assert.doesNotMatch(itemSelectionExplanation["sv-SE"], /kund, leverantör eller artikel/i,
  "a known item-selection step should not use the generic customer/vendor/item explanation");
const customerSelectionRule = knowledge.rules(packs).find(rule =>
  rule.ruleId === "Sales.SelectCustomer");
const customerSelectionExplanation = knowledge.localizedExplanations(customerSelectionRule);
assert.deepEqual(Object.keys(customerSelectionExplanation).sort(),
  [...supportedLocales].sort(),
  "sales customer selection explanation covers all supported UI languages");
assert.match(customerSelectionExplanation["sv-SE"], /kundnumret kopplar/i);
assert.match(customerSelectionExplanation["sv-SE"], /kundkortet/i);
assert.doesNotMatch(customerSelectionExplanation["sv-SE"], /leverantör eller artikel/i,
  "a known customer-selection step should use customer-specific text");

const cases = [
  ["purchase", { taskId: "purchase-release", pageCaption: "Purchase Order",
    entity: "PurchaseOrder", pageIdentificationConfidence: 1,
    actionCaption: "Release", language: "en-US" }, "Purchase.Release"],
  ["warehouse", { taskId: "warehouse-register", pageCaption: "Warehouse Pick",
    entity: "WarehousePick", pageIdentificationConfidence: 1,
    actionCaption: "Register Pick", language: "en-US" }, "Warehouse.RegisterPick"],
  ["warehouse receipt", { taskId: "warehouse-receipt-post", taskType: "RunAction",
    pageCaption: "Warehouse Receipt", entity: "WarehouseReceipt",
    pageIdentificationConfidence: 1, actionCaption: "Post", language: "en-US" },
    "Warehouse.PostReceipt"],
  ["warehouse shipment", { taskId: "warehouse-shipment-post", taskType: "RunAction",
    pageCaption: "Warehouse Shipment", entity: "WarehouseShipment",
    pageIdentificationConfidence: 1, actionCaption: "Post", language: "en-US" },
    "Warehouse.PostShipment"],
  ["manufacturing", { taskId: "manufacturing-replan",
    pageCaption: "Production Order", entity: "ProductionOrder",
    pageIdentificationConfidence: 1, actionCaption: "Replan", language: "en-US" },
    "Manufacturing.ReplanProductionOrder"],
  ["projects", { taskId: "project-journal", pageCaption: "Project Planning Lines",
    entity: "ProjectJournal", pageIdentificationConfidence: 1,
    actionCaption: "Create Project Journal Lines", language: "en-US" },
    "Projects.CreateProjectJournalLines"],
  ["finance", { taskId: "finance-forecast", pageCaption: "Cash Flow Forecast",
    entity: "CashFlowForecast", pageIdentificationConfidence: 1,
    actionCaption: "Recalculate Forecast", language: "en-US" },
    "Finance.RecalculateCashFlowForecast"],
  ["services", { taskId: "service-post", pageCaption: "Service Order",
    entity: "ServiceOrder", pageIdentificationConfidence: 1,
    actionCaption: "Post", language: "en-US" }, "Services.PostServiceOrder"]
];
const allPacks = packs.map(pack => pack);
for (const [, task, expectedRuleId] of cases) {
  const result = knowledge.apply([{ taskType: "RunAction",
    sourceEventIds: [`source:${task.taskId}`], ...task }], allPacks).tasks[0];
  assert.equal(result.knowledgeRule, expectedRuleId, `${expectedRuleId} resolves`);
  assert.ok(result.contextualExplanations?.[task.language],
    `${expectedRuleId} gets a localized explanation`);
  assert.ok(result.contextualExplanationSources.some(source =>
    /^https:\/\/learn\.microsoft\.com\//i.test(source.sourceUri || "")),
  `${expectedRuleId} explanation is traceable`);
}

const servicePack = packs.find(pack => pack.packId === "bc-services");
const serviceRules = knowledge.rules([servicePack]);
for (const [ruleId, task] of [
  ["Services.AllocateServiceResource", { taskType: "RunAction",
    pageCaption: "Service Order", entity: "ServiceOrder",
    actionCaption: "Allocate Resource", language: "sv-SE" }],
  ["Services.ChangeRepairStatus", { taskType: "ChangeField",
    pageCaption: "Service Order", entity: "ServiceOrder",
    fieldCaption: "Repair Status Code", language: "sv-SE" }]
]) {
  const found = knowledge.match(task, serviceRules);
  assert.equal(found?.rule.ruleId, ruleId, `${ruleId} resolves from its specific observed control`);
  assert.equal(knowledge.explanationEligible(found.rule, task, serviceRules), true,
    `${ruleId} explanation remains uniquely eligible`);
}
assert.match(knowledge.localizedExplanations(serviceRules.find(rule =>
  rule.ruleId === "Services.AllocateServiceResource"))["sv-SE"], /Aktiv betyder/);
assert.match(knowledge.localizedExplanations(serviceRules.find(rule =>
  rule.ruleId === "Services.ChangeRepairStatus"))["sv-SE"], /lagerhanteringen/);

const cashPack = packs.find(pack => pack.packId === "bc-cash-management");
const cashRule = knowledge.rules([cashPack]).find(rule =>
  rule.ruleId === "CashManagement.SuggestVendorPayments");
const cashTask = { taskId: "cash-suggest", taskType: "RunAction",
  pageCaption: "Payment Journal", entity: "PaymentJournal",
  pageIdentificationConfidence: 1, actionCaption: "Suggest Vendor Payments" };
assert.equal(knowledge.explanationEligible(cashRule, cashTask,
  knowledge.rules([cashPack])), true,
"cash management suggestions receive explanations only on a unique exact match");

const salesRecordingSteps = [
  { taskId: "sales-new", kind: "action", taskType: "CreateNew", actionCaption: "Ny",
    pageObjectId: "9305", pageCaption: "Förs.order", entity: "SalesOrder",
    language: "sv-SE", sourceEventIds: ["event:new"] },
  { taskId: "sales-customer", kind: "field-edit", semanticAction: "SelectCustomer",
    taskType: "SelectCustomer", actionCaption: "Kundnr",
    fieldCaption: "Kundnr", pageObjectId: "42", language: "sv-SE",
    sourceEventIds: ["event:customer"] },
  { taskId: "sales-item", kind: "field-edit", semanticAction: "SelectItem",
    taskType: "SelectItem", actionCaption: "Nr",
    fieldCaption: "Nr", pageObjectId: "42", language: "sv-SE",
    sourceEventIds: ["event:item"] },
  { taskId: "sales-quantity", kind: "field-edit", semanticAction: "EnterQuantity",
    taskType: "EnterQuantity", actionCaption: "Antal",
    fieldCaption: "Antal", pageObjectId: "42", language: "sv-SE",
    sourceEventIds: ["event:quantity"] }
];
const availableSalesRules = knowledge.rules(packs);
const refinedRuleIds = [
  "Sales.OpenSalesOrder", "Purchase.OpenPurchaseOrder",
  "Manufacturing.OpenProductionOrder", "Manufacturing.SelectItem",
  "Warehouse.OpenReceipt", "Warehouse.OpenShipment", "Warehouse.PostReceipt",
  "Warehouse.PostShipment",
  "Purchase.SetPurchaseLineQuantity", "Sales.SetQtyToShip",
  "Purchase.SetQtyToReceive", "Projects.SetQtyToTransferToJournal",
  "Projects.SetQtyToTransferToInvoice", "Warehouse.SetQtyToHandlePick",
  "Warehouse.SetQtyToReceive", "Purchase.SelectVendor",
  "Purchase.SelectPurchaseLineItem", "Manufacturing.SelectItem",
  "Warehouse.SelectLocation", "Warehouse.SelectBin",
  "Services.AllocateServiceResource", "Services.ChangeRepairStatus"
];
for (const ruleId of refinedRuleIds) {
  const rule = availableSalesRules.find(candidate => candidate.ruleId === ruleId);
  assert.ok(rule, `${ruleId} remains present in the curated knowledge packs`);
  const explanations = knowledge.localizedExplanations(rule);
  assert.ok(explanations, `${ruleId} has a contextual explanation`);
  assert.deepEqual(Object.keys(explanations).sort(), [...supportedLocales].sort(),
    `${ruleId} explanation covers all supported UI languages`);
  assert.ok(rule.sourceRefs?.some(source =>
    /^https:\/\/learn\.microsoft\.com\//i.test(source.sourceUri || "")),
  `${ruleId} explanation remains tied to Microsoft Learn sources`);
  assert.deepEqual([...rule.languages].sort(), [...supportedLocales].sort(),
    `${ruleId} explicitly supports every interface locale`);
}
assert.match(knowledge.localizedExplanations(availableSalesRules.find(rule =>
  rule.ruleId === "Purchase.SetPurchaseLineQuantity"))["sv-SE"],
/totala mängden som beställs/);
assert.match(knowledge.localizedExplanations(availableSalesRules.find(rule =>
  rule.ruleId === "Sales.SetQtyToShip"))["sv-SE"],
/inte orderradens totala Antal/);
assert.match(knowledge.localizedExplanations(availableSalesRules.find(rule =>
  rule.ruleId === "Projects.SetQtyToTransferToJournal"))["sv-SE"],
/Överföringen bokför inte journalen/);
assert.doesNotMatch(knowledge.localizedExplanations(availableSalesRules.find(rule =>
  rule.ruleId === "Warehouse.SelectBin"))["sv-SE"],
/kund, leverantör eller artikel/);
const salesStepRuleIds = ["Sales.CreateSalesOrderFromList", "Sales.SelectCustomer",
  "Sales.SelectSalesLineItem", "Sales.SetSalesLineQuantity"];
salesRecordingSteps.forEach((task, index) => {
  const resolved = knowledge.pageEvidence(task, packs);
  const found = knowledge.match(resolved, availableSalesRules);
  assert.equal(found?.rule.ruleId, salesStepRuleIds[index],
    `${task.taskType} resolves against its verified standard page object ID`);
  assert.ok(knowledge.explanationEligible(found.rule, resolved, availableSalesRules),
    `${task.taskType} explanation is an exact eligible match`);
  assert.ok(knowledge.localizedExplanations(found.rule)?.["sv-SE"] &&
    found.rule.sourceRefs?.some(source =>
      /^https:\/\/learn\.microsoft\.com\//i.test(source.sourceUri || "")),
  `${task.taskType} explanation stays localized and Microsoft Learn sourced`);
  if (task.taskType === "CreateNew") {
    const explanation = knowledge.localizedExplanations(found.rule, resolved);
    assert.match(explanation["sv-SE"], /öppnar Ny en ny försäljningsorder/,
      "known Sales New action keeps its module-specific explanation");
    assert.equal(catalog.basis(found.rule, resolved), "microsoft-learn",
      "known Sales New explanation retains its Microsoft Learn provenance");
    for (const locale of supportedLocales) {
      assert.ok(explanation[locale], "known Sales New explanation is localized in " + locale);
    }
  }
});
const fallbackCreate = { taskType: "CreateNew", semanticAction: "CreateNew" };
assert.match(catalog.localized(fallbackCreate, { pageCaption: "Anpassad sida" })["sv-SE"],
  /Anpassad sida/, "unknown pages keep the page-context fallback");
assert.equal(catalog.basis(fallbackCreate, { pageCaption: "Anpassad sida" }), "page-context");
const wrongPageCreate = knowledge.match({ taskType: "CreateNew",
  semanticAction: "CreateNew", actionCaption: "Ny", pageObjectId: "42",
  pageCaption: "Förs.order", entity: "SalesOrder", language: "sv-SE" },
availableSalesRules);
assert.equal(wrongPageCreate?.rule.ruleId, "Core.CreateNew",
  "a sales order-specific New explanation requires the Sales Orders list page ID");
const createSalesOrderRule = availableSalesRules.find(rule =>
  rule.ruleId === "Sales.CreateSalesOrderFromList");
assert.deepEqual(createSalesOrderRule.match.pageObjectIds, ["9305"]);
assert.match(knowledge.localizedExplanations(createSalesOrderRule)["sv-SE"],
  /ny försäljningsorder/);
assert.match(knowledge.localizedExplanations(createSalesOrderRule)["en-US"],
  /Sales Orders list, New opens a new sales order/);
assert.equal(itemSelectionRule.semanticAction, "SelectItem");
assert.match(itemSelectionExplanation["sv-SE"], /Artikelnumret kopplar/,
  "a SelectItem rule receives an item-specific explanation");
assert.match(itemSelectionExplanation["en-US"], /item number links the sales line/,
  "the item-specific explanation remains localized in English");

const ambiguous = knowledge.apply([{
  taskId: "ambiguous-confirmation", actionCaption: "Yes", language: "en-US"
}], packs.filter(pack => pack.packId === "bc-core").map(pack => ({ ...pack,
  rules: pack.rules.filter(rule => rule.ruleId === "Core.ConfirmYes") }))).tasks[0];
assert.equal(ambiguous?.contextualExplanations, undefined,
  "a confirmation prompt without decision context never receives a generated explanation");

const legacyRelease = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-release-fallback", taskType: "ReleaseDocument",
  semanticAction: "ReleaseDocument", pageCaption: "Sales Order",
  language: "en-US", confidence: 0.53
}], packs).at(0);
assert.equal(legacyRelease.contextualExplanationRuleId, "Sales.Release",
  "the legacy compatibility path resolves a known Sales Order release action");
assert.ok(legacyRelease.contextualExplanations?.["en-US"],
  "legacy releases receive a sourced explanation independently of the generic step score");
assert.equal(legacyRelease.confidence, 0.53,
  "explanation matching does not rewrite the recorded step classification confidence");

const legacyQuantity = knowledge.apply([{
  taskId: "EnterQuantity-005", taskNo: 5, taskType: "EnterQuantity",
  semanticAction: "EnterQuantity", pageId: "42", pageCaption: "Salico UAT",
  actionCaption: "Sortera efter Antal", fieldCaption: "Antal",
  language: "sv-SE", confidence: 0.53
}], packs).tasks[0];
assert.equal(legacyQuantity.knowledgeRule, "Sales.SetSalesLineQuantity",
  "legacy pageId resolves to the official Sales Order page when pageCaption is the company name");
assert.ok(legacyQuantity.contextualExplanations?.["sv-SE"],
  "legacy quantity entries receive a sourced explanation");
assert.match(legacyQuantity.contextualExplanations["sv-SE"],
  /totala mängden på försäljningsraden/,
  "sales-line quantity explains the order total, not the quantity shipped or invoiced");
assert.match(legacyQuantity.contextualExplanations["sv-SE"],
  /Antal att leverera och Antal att fakturera är separata fält/);
assert.doesNotMatch(legacyQuantity.contextualExplanations["sv-SE"],
  /mottagning, hantering, förbrukning/,
  "sales-line quantity no longer uses the broad generic quantity explanation");
assert.equal(Object.keys(legacyQuantity.contextualExplanations).length, 8,
  "the sales-line quantity explanation is available in all supported locales");

const legacyQuantityFallback = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-quantity-fallback", taskNo: 5, taskType: "EnterQuantity",
  semanticAction: "EnterQuantity", pageId: "42", pageCaption: "Salico UAT",
  actionCaption: "Sortera efter Antal", fieldCaption: "Antal",
  language: "sv-SE", confidence: 0.53
}], packs)[0];
assert.equal(legacyQuantityFallback.contextualExplanationRuleId,
  "Sales.SetSalesLineQuantity",
  "compatibility explanation fallback resolves pageId before matching rules");
assert.equal(legacyQuantityFallback.confidence, 0.53,
  "legacy quantity explanation does not rewrite observed classification confidence");

const legacyPurchaseVendor = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-purchase-vendor", kind: "field-edit", taskType: "SelectVendor",
  semanticAction: "SelectVendor", pageId: "50", pageCaption: "Contoso Ltd.",
  fieldCaption: "Vendor No.", entity: "Vendor", language: "en-US",
  sourceEventIds: ["legacy-event:vendor"]
}], packs)[0];
assert.equal(legacyPurchaseVendor.contextualExplanationRuleId,
  "Purchase.SelectVendor",
  "legacy field steps can recover sourced explanations without an action caption");
assert.match(legacyPurchaseVendor.contextualExplanations["en-US"],
  /vendor number links the purchase document/);

const legacyPurchaseItem = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-purchase-item", kind: "field-edit",
  taskType: "SelectItem", semanticAction: "SelectItem", pageId: "50",
  pageCaption: "Contoso Ltd.", fieldCaption: "",
  semanticActionModel: { rawInteractions: [{ kind: "field-edit",
    fieldCaption: "Nr", targetControl: { caption: "Nr" } }] },
  entity: "PurchaseOrderLine", language: "sv-SE"
}], packs)[0];
assert.equal(legacyPurchaseItem.contextualExplanationRuleId,
  "Purchase.SelectPurchaseLineItem",
  "old purchase steps recover the item-number caption from raw control evidence");
assert.match(legacyPurchaseItem.contextualExplanations["sv-SE"],
  /Artikelnumret kopplar inköpsraden/);

const legacyPurchaseCost = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-purchase-cost", kind: "field-edit",
  taskType: "EnterFieldValue", semanticAction: "EnterFieldValue", pageId: "50",
  pageCaption: "Contoso Ltd.", fieldCaption: "",
  semanticActionModel: { rawInteractions: [{ kind: "field-edit",
    fieldCaption: "Direkt styckkostnad",
    targetControl: { caption: "Direkt styckkostnad" } }] },
  entity: "PurchaseOrderLine", language: "sv-SE"
}], packs)[0];
assert.equal(legacyPurchaseCost.contextualExplanationRuleId,
  "Purchase.SetDirectUnitCost",
  "old purchase cost steps recover the direct unit cost field from raw evidence");
assert.match(legacyPurchaseCost.contextualExplanations["sv-SE"],
  /inköpspriset per enhet/);

const legacyPurchaseDropdownItem = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-purchase-dropdown-item", taskType: "SelectRecord",
  semanticAction: "SelectRecord", pageId: "50", pageCaption: "Contoso Ltd.",
  actionCaption: 'Nr, sorterade i Stigande order Välj posten "30043"',
  selectedCaption: "30043", entity: "PurchaseOrderLine", language: "sv-SE"
}], packs)[0];
assert.equal(legacyPurchaseDropdownItem.contextualExplanationRuleId,
  "Purchase.SelectPurchaseLineItemFromLookup",
  "purchase item dropdown choices use their recorded Nr column context");

const legacyManualPurchasePrice = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-manual-purchase-price", taskType: "RunActionPath",
  semanticAction: "RunActionPath", pageId: "50", pageCaption: "Contoso Ltd.",
  actionCaption: "Manuellt pris...", entity: "PurchaseOrderLine",
  language: "sv-SE"
}], packs)[0];
assert.equal(legacyManualPurchasePrice.contextualExplanationRuleId,
  "Purchase.OpenManualPurchasePrice",
  "the captured Manual Price action path receives purchase-specific context");

const legacyPurchaseList = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-purchase-list-search", taskType: "SelectRecord",
  semanticAction: "SelectRecord", pageCaption: "Dynamics 365 Business Central (UAT)",
  actionCaption: "Inköpsorder Listor ", fieldCaption: "Inköpsorder Listor ",
  language: "sv-SE"
}], packs)[0];
assert.equal(legacyPurchaseList.contextualExplanationRuleId,
  "Purchase.OpenPurchaseOrderListFromSearch",
  "the exact Tell Me result identifies the purchase-order list navigation");

const unrelatedPurchaseIcon = sessionPipeline.enrichCompatibilityExplanations([{
  taskId: "legacy-purchase-icon", taskType: "RunAction", pageId: "50",
  pageCaption: "Purchase Order", actionCaption: "", language: "sv-SE"
}], packs)[0];
assert.equal(unrelatedPurchaseIcon.contextualExplanationRuleId, undefined,
  "an unlabeled icon does not receive an inferred explanation");

const newPurchaseOrder = knowledge.apply([{ taskId: "new-purchase-order", taskType: "CreateNew", pageCaption: "Inköpsorder", actionCaption: "Ny.", entity: "PurchaseOrder", context: { currentEntity: "PurchaseOrder", currentPageCaption: "Inköpsorder" }, language: "sv-SE" }], allPacks).tasks[0];
assert.equal(newPurchaseOrder.knowledgeRule, "Purchase.CreatePurchaseOrderFromList", "new purchase order explanation is specific to the purchase list");
assert.match(newPurchaseOrder.contextualExplanations["sv-SE"], /ny inköpsorder/i);
assert.ok(newPurchaseOrder.contextualExplanationSources.some(source => source.sourceId === "microsoft-learn-purchase-recording-sv"), "new purchase order explanation cites the purchase process source");
for (const [language, pageCaption, actionCaption] of [
  ["sv-SE", "Inköpsorder", "Ny"], ["en-US", "Purchase Order", "New"],
  ["fr-FR", "Commande achat", "Nouveau"], ["de-DE", "Bestellung", "Neu"],
  ["es-ES", "Pedido de compra", "Nuevo"], ["da-DK", "Indkøbsordre", "Ny"],
  ["fi-FI", "Ostotilaus", "Uusi"], ["nb-NO", "Bestilling", "Ny"]
]) {
  const result = knowledge.apply([{ taskId: `new-purchase-order-${language}`, taskType: "CreateNew", pageCaption, actionCaption, entity: "PurchaseOrder", context: { currentEntity: "PurchaseOrder", currentPageCaption: pageCaption }, language }], allPacks).tasks[0];
  assert.equal(result.knowledgeRule, "Purchase.CreatePurchaseOrderFromList", `${language} New on purchase list matches specifically`);
  assert.ok(result.contextualExplanations?.[language], `${language} purchase-order explanation is localized`);
}

const genericCreateNewCases = [
  ["ProductionOrder", "Production Orders", /produktionsorder/i],
  ["AssemblyOrder", "Assembly Orders", /monteringsorder/i],
  ["TransferOrder", "Transfer Orders", /transferorder/i],
  ["ServiceOrder", "Service Orders", /serviceorder/i],
  ["QualityCheck", "Quality Check", /kvalitetskontroll/i],
  ["UnknownEntity", "Custom BC workspace", /Custom BC workspace/i]
];
for (const [entity, pageCaption, pattern] of genericCreateNewCases) {
  const result = knowledge.apply([{ taskId: "generic-new-" + entity, taskType: "CreateNew", actionCaption: "Ny", pageCaption, entity, context: { currentEntity: entity, currentPageCaption: pageCaption }, language: "sv-SE" }], allPacks).tasks[0];
  assert.ok(result.knowledgeRule, entity + " resolves to a New action rule");
  assert.ok(["page-context", "microsoft-learn", "authored-process"].includes(result.contextualExplanationBasis), entity + " explanation has a declared basis");
  assert.match(result.contextualExplanations?.["sv-SE"] || "", pattern, "New explanation identifies relevant page or record type");
  if (result.contextualExplanationBasis === "page-context") assert.deepEqual(result.contextualExplanationSources, [], "page-context explanation has no unrelated Learn citation");
}
const noContextNew = knowledge.apply([{ taskId: "new-without-context", taskType: "CreateNew", actionCaption: "Ny", language: "sv-SE" }], allPacks).tasks[0];
assert.equal(noContextNew.contextualExplanations, undefined, "New without identified page or entity gets no generic filler explanation");

const observedWorkflowCases = [
  ["Observed.Purchase.CreateWarehouseReceipt", "50", "PurchaseOrder", "RunAction", "Skapa dist.lagerinleverans", ""],
  ["Observed.Warehouse.RegisterWeight", "5768", "WarehouseReceipt", "RunAction", "Registrera vikt", ""],
  ["Observed.Warehouse.CreateHandlingUnit", "5768", "WarehouseReceipt", "RunAction", "Skapa Lastbärare", ""],
  ["Observed.Warehouse.ManualWeight", "5768", "WarehouseReceipt", "RunAction", "Manuell Vikt", ""],
  ["Observed.Warehouse.EnterScaleWeight", "5768", "WarehouseReceipt", "EnterFieldValue", "Vikt från våg", "Vikt från våg"],
  ["Observed.Warehouse.SaveWeightRegistration", "5768", "WarehouseReceipt", "RunActionPath", "Spara och stäng", ""]
];
const authoredProcessRuleIds = [

  "Core.NavigateBack", "Core.EditRecord",
  "Core.DeleteRecord", "Core.Lookup", "Core.ChangeDate"
];
for (const ruleId of authoredProcessRuleIds) {
  const rule = knowledge.rules(allPacks).find(item => item.ruleId === ruleId);
  assert.ok(rule, `${ruleId} is registered`);
  assert.equal(catalog.basis(rule), "authored-process", `${ruleId} is identified as a general authored explanation`);
  assert.ok(!(rule.sourceRefs || []).some(source => String(source.sourceUri || "").startsWith("https://learn.microsoft.com/")), `${ruleId} has no Microsoft Learn attribution`);
  const localized = knowledge.localizedExplanations(rule);
  assert.deepEqual(Object.keys(localized).sort(), [...supportedLocales].sort(), `${ruleId} is localized`);
}
for (const ruleId of ["Aptean.CreateCommodityReceiptFromHarvestOrder", "Aptean.CreatePurchaseContractFromHarvest", "Aptean.CreateDayForecastFromHarvestOrder", "Aptean.CreatePurchaseOrdersFromForecastWorksheet", "Aptean.CreateHarvestOrder", "Aptean.CreatePurchaseOrderFromWeekForecast", "Aptean.SetPurchaseClaimActionType", "Aptean.PostQualityAction", "Aptean.AnswerQualityCheckLine", "Aptean.CreateQCCheck", "Aptean.CreateInventoryQCTrigger", "Aptean.ScheduleInventoryQC", "Aptean.CreateNonConformanceFromQC", "Aptean.CreateCustomerNonConformance", "Aptean.CreatePurchaseClaim", "Aptean.CreateClaim", "Aptean.ReleaseAndCreatePurchaseClaim", "Aptean.ReleaseCreateAndPostPurchaseClaim", "Aptean.ChangeLotInspectionStatus", "Aptean.GenerateInspectionStatusWorksheetLines", "Aptean.ApplyInspectionStatusFromWorksheet", "Aptean.RegisterConsumption", "Aptean.CorrectConsumption", "Aptean.RegisterOutput", "Aptean.PostGrowerSettlement", "Aptean.CreateTradeStatement", "Aptean.PackSalesOrder", "Aptean.PostPackAndShip", "Aptean.ProcessEDIMessage", "Aptean.ProcessAIPEvents", "Aptean.SendOrderToTLx"]) {
  const rule = knowledge.rules(allPacks).find(item => item.ruleId === ruleId);
  assert.equal(catalog.basis(rule), "vendor-documentation", `${ruleId} is attributed to Aptean product documentation`);
}
const apteanAddOnCases = [
 ["Aptean.CreateCommodityReceiptFromHarvestOrder",{taskType:"RunAction",pageCaption:"Harvest Order",actionCaption:"Create Commodity Receipts"}],
 ["Aptean.CreatePurchaseContractFromHarvest",{taskType:"RunAction",pageCaption:"Harvest Planning",actionCaption:"Create Purchase Contract"}],
 ["Aptean.CreateDayForecastFromHarvestOrder",{taskType:"RunAction",pageCaption:"Harvest Order",actionCaption:"Create Day Forecast"}],
 ["Aptean.CreatePurchaseOrdersFromForecastWorksheet",{taskType:"RunAction",pageCaption:"Forecast Approval Worksheet",actionCaption:"Create Purchase Order"}],
  ["Aptean.CreateHarvestOrder", {taskType:"CreateNew",pageCaption:"Harvest Orders",actionCaption:"New"}],
  ["Aptean.CreatePurchaseOrderFromWeekForecast", {taskType:"RunAction",pageCaption:"Week Forecast",actionCaption:"Create Purchase Order"}],
  ["Aptean.SetPurchaseClaimActionType", {taskType:"ChangeField",pageCaption:"Purchase Claim",fieldCaption:"Action Type"}],
  ["Aptean.AnswerQualityCheckLine", { taskType: "ChangeField", pageCaption: "Quality Control Check", fieldCaption: "Answer" }],
  ["Aptean.PostQualityAction", { taskType: "RunAction", pageCaption: "Quality Control Action", actionCaption: "Post" }],
  ["Aptean.CreateCustomerNonConformance", { taskType: "CreateNew", pageCaption: "Customer Non-Conformances", actionCaption: "New" }],
  ["Aptean.CreatePurchaseClaim", { taskType: "CreateNew", pageCaption: "Purchase Claims", actionCaption: "New" }],
  ["Aptean.CreateClaim", { taskType: "RunAction", pageCaption: "Posted Sales Claim", actionCaption: "Create Purchase Claim" }],
  ["Aptean.ReleaseAndCreatePurchaseClaim", { taskType: "RunAction", pageCaption: "Purchase Claim", actionCaption: "Release & Create" }],
  ["Aptean.ReleaseCreateAndPostPurchaseClaim", { taskType: "RunAction", pageCaption: "Purchase Claim", actionCaption: "Release & Create & Post" }],
  ["Aptean.ChangeLotInspectionStatus", { taskType: "RunAction", pageCaption: "Lot No. Information List", actionCaption: "Change Inspection Status" }],
  ["Aptean.GenerateInspectionStatusWorksheetLines", { taskType: "RunAction", pageCaption: "Inspection Status Change Worksheet", actionCaption: "Generate Lines" }],
  ["Aptean.ApplyInspectionStatusFromWorksheet", { taskType: "RunAction", pageCaption: "Inspection Status Change Worksheet", actionCaption: "Change Inspection Status" }],
  ["Aptean.RegisterConsumption", { taskType: "RunAction", pageCaption: "Inputs", actionCaption: "+ Input" }],
  ["Aptean.CorrectConsumption", { taskType: "RunAction", pageCaption: "Inputs", actionCaption: "Correct Consumption" }],
  ["Aptean.RegisterOutput", { taskType: "RunAction", pageCaption: "Outputs", actionCaption: "+ Output" }],
  ["Aptean.PostGrowerSettlement", { taskType: "RunAction", pageCaption: "Settlements", actionCaption: "Post" }],
  ["Aptean.CreateTradeStatement", { taskType: "RunAction", pageCaption: "Trade Statements", actionCaption: "Create Trade Statement" }],
  ["Aptean.PackSalesOrder", { taskType: "RunAction", pageCaption: "Sales Packaging", actionCaption: "Pack All" }],
  ["Aptean.PostPackAndShip", { taskType: "RunAction", pageCaption: "Shipping Batch", actionCaption: "Post" }],
  ["Aptean.ProcessEDIMessage", { taskType: "RunAction", pageCaption: "EDI Messages", actionCaption: "Process" }],
  ["Aptean.ProcessAIPEvents", { taskType: "RunAction", pageCaption: "AIP Connection Setup", actionCaption: "Process Events" }],
  ["Aptean.SendOrderToTLx", { taskType: "RunAction", pageCaption: "Sales Order", actionCaption: "Send to TLx" }]
];
for (const [ruleId, task] of apteanAddOnCases) {
  const result = knowledge.apply([{ taskId: `aptean-${ruleId}`, pageIdentificationConfidence: 1,
    language: "sv-SE", ...task }], allPacks).tasks[0];
  assert.equal(result.knowledgeRule, ruleId, `${ruleId} resolves only in its documented page/action context`);
  assert.ok(result.contextualExplanations?.["sv-SE"], `${ruleId} provides its localized explanation`);
  assert.equal(catalog.basis(knowledge.rules(allPacks).find(rule => rule.ruleId === ruleId)),
    "vendor-documentation", `${ruleId} identifies Aptean as its source`);
}
const genericClaimCreate = knowledge.apply([{ taskId: "generic-claim-create", taskType: "RunAction",
  actionCaption: "Create Claim", language: "sv-SE" }], allPacks).tasks[0];
assert.equal(genericClaimCreate.contextualExplanations, undefined,
  "a generic Create Claim action without page context receives no Aptean explanation");
const wrongClaimContext = knowledge.apply([{ taskId: "wrong-claim-context", taskType: "CreateNew",
  pageIdentificationConfidence: 1, pageCaption: "Purchase Order", actionCaption: "New", language: "sv-SE" }], allPacks).tasks[0];
assert.notEqual(wrongClaimContext.knowledgeRule, "Aptean.CreatePurchaseClaim",
  "purchase-claim creation does not match New on a standard purchase order");
const inventoryTriggerNew = knowledge.apply([{ taskId: "aptean-inventory-trigger", taskType: "CreateNew", pageIdentificationConfidence: 1, pageCaption: "Quality Control Triggers", actionCaption: "New", language: "sv-SE" }], allPacks).tasks[0];
assert.equal(inventoryTriggerNew.knowledgeRule, "Aptean.CreateInventoryQCTrigger", "New is explained as a QC inventory trigger only in that page context");
const genericNew = knowledge.apply([{ taskId: "generic-new", taskType: "CreateNew", actionCaption: "New", language: "sv-SE" }], allPacks).tasks[0];
assert.equal(genericNew.contextualExplanations, undefined, "New without page context does not receive an action explanation");
const scheduleInventoryQC = knowledge.apply([{ taskId: "aptean-schedule-inventory-qc", taskType: "RunAction", pageIdentificationConfidence: 1, pageCaption: "Quality Control Setup", actionCaption: "Schedule Inventory Quality Checks", language: "sv-SE" }], allPacks).tasks[0];
assert.equal(scheduleInventoryQC.knowledgeRule, "Aptean.ScheduleInventoryQC", "inventory QC scheduling requires the setup page and specific action");
const createNonConformance = knowledge.apply([{ taskId: "aptean-create-nc", taskType: "RunAction", pageIdentificationConfidence: 1, pageCaption: "Posted Quality Control Check", actionCaption: "Create Internal Non Conformance Document", language: "sv-SE" }], allPacks).tasks[0];
assert.equal(createNonConformance.knowledgeRule, "Aptean.CreateNonConformanceFromQC", "non-conformance creation requires a posted Aptean QC check context");
for (const [ruleId, pageId, entity, taskType, actionCaption, fieldCaption] of observedWorkflowCases) {
  const rule = knowledge.rules(allPacks).find(item => item.ruleId === ruleId);
  assert.ok(rule, `${ruleId} is registered`);
  assert.ok(catalog.isAuthored(rule), `${ruleId} is marked as authored from observed workflow`);
  const localized = knowledge.localizedExplanations(rule);
  assert.deepEqual(Object.keys(localized).sort(), [...supportedLocales].sort(), `${ruleId} is localized`);
  const result = knowledge.apply([{ taskId: `observed-${ruleId}`, taskType, pageId, pageCaption: "Salico UAT", entity, actionCaption, fieldCaption, language: "sv-SE", context: { currentEntity: entity } }], allPacks).tasks[0];
  assert.equal(result.knowledgeRule, ruleId, `${ruleId} matches its observed action`);
  assert.equal(result.contextualExplanationBasis, "observed-workflow", `${ruleId} declares non-Learn provenance`);
  assert.ok(result.contextualExplanations?.["sv-SE"], `${ruleId} supplies a Swedish explanation`);
  if (ruleId === "Observed.Purchase.CreateWarehouseReceipt") {
    assert.equal(result.contextualExplanationSources.length, 8, `${ruleId} cites localized warehouse Quality Management evidence`);
  } else {
    assert.deepEqual(result.contextualExplanationSources, [], `${ruleId} does not imply a Microsoft Learn source`);
  }
}
const observedReceipt = knowledge.apply([{ taskId: "observed-word", taskType: "RunAction", pageId: "5768", entity: "WarehouseReceipt", actionCaption: "Registrera vikt", language: "sv-SE", instruction: "Registrera uppmätt vikt" }], allPacks).tasks[0];
const projector = require("../src/document/review-document-projector");
for (const include of [false, true]) {
  const review = { sessionId: "observed-workflow", tasks: [{ ...observedReceipt, includeKnowledgeExplanationInWord: include }] };
  const document = projector.project(review, { session: { id: "observed-workflow", settings: { documentLanguage: "sv-SE" } } }).document;
  const step = document.sections.find(section => section.kind === "workflow").blocks.find(block => block.kind === "step");
  const explanation = step.blocks.find(block => block.blockId?.startsWith("block:knowledge-explanation:"));
  assert.equal(Boolean(explanation), include, "authored explanation obeys the Word opt-in");
  if (include) assert.match(explanation.label, /observerat arbetsflöde/i);
}
const vendorDocDocument = projector.project({ sessionId: "aptean-vendor-doc", tasks: [{ ...scheduleInventoryQC, includeKnowledgeExplanationInWord: true }] }, { session: { id: "aptean-vendor-doc", settings: { documentLanguage: "sv-SE" } } }).document;
const vendorDocStep = vendorDocDocument.sections.find(section => section.kind === "workflow").blocks.find(block => block.kind === "step");
const vendorDocCallout = vendorDocStep.blocks.find(block => block.blockId?.startsWith("block:knowledge-explanation:"));
assert.equal(vendorDocCallout.label, "Apteans produktdokumentation", "Word export identifies the vendor source provenance");
assert.ok(vendorDocCallout.blocks.some(block => block.text?.includes("erpdocs.apteancloud.com")), "Word export retains the Aptean source URL");const pageContextNew = knowledge.apply([{ taskId: "contextual-new-word", taskType: "CreateNew", actionCaption: "Ny", pageCaption: "Production Orders", entity: "ProductionOrder", context: { currentEntity: "ProductionOrder", currentPageCaption: "Production Orders" }, language: "sv-SE" }], allPacks).tasks[0];
const pageContextDocument = projector.project({ sessionId: "page-context-new", tasks: [{ ...pageContextNew, includeKnowledgeExplanationInWord: true }] }, { session: { id: "page-context-new", settings: { documentLanguage: "sv-SE" } } }).document;
const pageContextStep = pageContextDocument.sections.find(section => section.kind === "workflow").blocks.find(block => block.kind === "step");
const pageContextCallout = pageContextStep.blocks.find(block => block.blockId?.startsWith("block:knowledge-explanation:"));
assert.equal(pageContextCallout.label, "Förklaring utifrån sidkontext", "Word export identifies explanations generated from page context");
assert.ok(!pageContextStep.blocks.some(block => block.blockId?.startsWith("block:knowledge-explanation-source:")), "Word export adds no unrelated Learn citation for page-context text");

console.log(`Knowledge explanation coverage passed (${covered} sourced rules and observed workflow coverage in eight locales).`);

for (const task of [{ taskId: "generic-register-consumption", taskType: "RegisterConsumption", actionCaption: "Register Consumption" }, { taskId: "generic-register-output", taskType: "RegisterOutput", actionCaption: "Register Output" }, { taskId: "wrong-page-output", taskType: "RunAction", pageCaption: "Purchase Order", actionCaption: "+ Output" }]) { const result = knowledge.apply([{ pageIdentificationConfidence: 1, language: "en-US", ...task }], allPacks).tasks[0]; assert.ok(!["Aptean.RegisterConsumption", "Aptean.RegisterOutput"].includes(result.knowledgeRule), "SFP registration explanations require documented page and action context"); }
const consumptionText = knowledge.localizedExplanations(knowledge.rules(allPacks).find(rule => rule.ruleId === "Aptean.RegisterConsumption"))["en-US"]; assert.match(consumptionText, /not a purchase receipt/i); const outputText = knowledge.localizedExplanations(knowledge.rules(allPacks).find(rule => rule.ruleId === "Aptean.RegisterOutput"))["en-US"]; assert.match(outputText, /intermediate operation records capacity only/i);

const aipOnEdi = knowledge.apply([{ taskId: "aip-edi-boundary", taskType: "RunAction", pageIdentificationConfidence: 1, pageCaption: "EDI Messages", actionCaption: "Process Events", language: "en-US" }], allPacks).tasks[0]; assert.notEqual(aipOnEdi.knowledgeRule, "Aptean.ProcessAIPEvents", "AIP event processing requires its own page context");

const qcListNew = knowledge.apply([{ taskId: "qc-list-new", taskType: "CreateNew", pageIdentificationConfidence: 1, pageCaption: "Quality Control Checks", actionCaption: "New", language: "en-US" }], allPacks).tasks[0]; assert.notEqual(qcListNew.knowledgeRule, "Aptean.CreateQCCheck", "quality check creation from list is withheld until exact list action/page context is documented");

for (const task of [
  {taskType:"ChangeField",pageCaption:"Purchase Order",fieldCaption:"Answer"},
  {taskType:"RunAction",pageCaption:"Quality Control Check",actionCaption:"Post"},
  {taskType:"RunAction",pageCaption:"Quality Control Action",actionCaption:"Release"}
]) { const result=knowledge.apply([{taskId:"qca-negative-"+task.pageCaption+task.actionCaption, pageIdentificationConfidence:1, language:"en-US", ...task}],allPacks).tasks[0]; assert.ok(!["Aptean.AnswerQualityCheckLine","Aptean.PostQualityAction"].includes(result.knowledgeRule), "Quality Control explanation requires its documented page and control"); }

for(const task of [{taskType:"CreateNew",pageCaption:"Purchase Orders",actionCaption:"New"},{taskType:"RunAction",pageCaption:"Harvest Orders",actionCaption:"Create Purchase Order"},{taskType:"ChangeField",pageCaption:"Purchase Order",fieldCaption:"Action Type"}]){const result=knowledge.apply([{taskId:"add-on-boundary-"+task.pageCaption,pageIdentificationConfidence:1,language:"en-US",...task}],allPacks).tasks[0];assert.ok(!["Aptean.CreateHarvestOrder","Aptean.CreatePurchaseOrderFromWeekForecast","Aptean.SetPurchaseClaimActionType"].includes(result.knowledgeRule),"Aptean harvest/claim rules require matching page context");}

for(const task of [{taskType:"RunAction",pageCaption:"Purchase Order",actionCaption:"Create Day Forecast"},{taskType:"RunAction",pageCaption:"Harvest Order",actionCaption:"Create Purchase Order"},{taskType:"RunAction",pageCaption:"Week Forecast",actionCaption:"Create Purchase Order"}]){const result=knowledge.apply([{taskId:"chp-boundary-"+task.pageCaption+task.actionCaption,pageIdentificationConfidence:1,language:"en-US",...task}],allPacks).tasks[0];assert.notEqual(result.knowledgeRule,"Aptean.CreateDayForecastFromHarvestOrder","forecast-creation guidance requires its documented page/action");if(task.pageCaption==="Harvest Order")assert.notEqual(result.knowledgeRule,"Aptean.CreatePurchaseOrdersFromForecastWorksheet");}

for(const [pageCaption,actionCaption,ruleId] of [["Item Tracing","Trace","InventoryTracking.TraceSerialOrLot"],["Find Entries","Find","InventoryTracking.FindAllSerialOrLotEntries"]]){const result=knowledge.apply([{taskId:"tracking-"+ruleId,taskType:"RunAction",pageIdentificationConfidence:1,pageCaption,actionCaption,entity:"InventoryTracking",language:"sv-SE"}],allPacks).tasks[0];assert.equal(result.knowledgeRule,ruleId,"serial/lot tracing scenario resolves in its exact page and action context");assert.ok(result.contextualExplanations?.["sv-SE"]);}
for(const task of [{pageCaption:"Item Tracing",actionCaption:"Find"},{pageCaption:"Find Entries",actionCaption:"Trace"},{pageCaption:"Purchase Order",actionCaption:"Trace"}]){const result=knowledge.apply([{taskId:"tracking-boundary-"+task.pageCaption+task.actionCaption,taskType:"RunAction",pageIdentificationConfidence:1,entity:"InventoryTracking",language:"en-US",...task}],allPacks).tasks[0];assert.ok(!["InventoryTracking.TraceSerialOrLot","InventoryTracking.FindAllSerialOrLotEntries"].includes(result.knowledgeRule),"item trace guidance requires its specific page/action pair");}

for(const task of [{taskType:"RunAction",pageCaption:"Purchase Order",actionCaption:"Create Commodity Receipts"},{taskType:"RunAction",pageCaption:"Purchase Order",actionCaption:"Create Purchase Contract",entity:"HarvestOrder"}]){const result=knowledge.apply([{taskId:"chp-integration-boundary-"+task.pageCaption,pageIdentificationConfidence:1,language:"en-US",...task}],allPacks).tasks[0];assert.ok(!["Aptean.CreateCommodityReceiptFromHarvestOrder","Aptean.CreatePurchaseContractFromHarvest"].includes(result.knowledgeRule),"harvest follow-up actions require a matching source page/entity");}
