const assert = require("assert");
const engine = require("../src/document/semantic-interaction-engine");
const projector = require("../src/document/review-document-projector");

function select(fieldCaption, value, extra = {}) {
  return [{ taskId: `${fieldCaption}-field`, taskType: "ChangeField",
    fieldCaption, inputSources: ["focusout"], sourceEventNos: [1],
    screenshot: "lookup.png", future: { retained: true }, ...extra
  }, { taskId: `${fieldCaption}-row`, taskType: "Select",
    selectedCaption: `Välj posten "${value}"`, sourceEventNos: [2],
    screenshot: "selected.png", annotationRefs: [{ annotationId: "ann-1" }]
  }];
}

function only(values, expectedType, expectedText) {
  const result = engine.processInteractions(values);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].actionType, expectedType);
  assert.strictEqual(result[0].displayText, expectedText);
  return result[0];
}

const customer = only(select("Kundnr", "1033"), "SelectCustomer",
  "Välj **1033** i **Kundnr**.");
const customerSearchThenNumber = only([{
  taskId: "customer-search", taskType: "SelectCustomer",
  fieldCaption: "Kundnr", instructionValue: "iberi",
  instruction: "Välj kunden iberi."
}, { taskId: "customer-number", taskType: "Select",
  selectedCaption: "905", instruction: "Välj 905."
}], "SelectCustomer", "Välj **905** i **Kundnr**.");
assert.strictEqual(customerSearchThenNumber.selectedValue, "905");
const embeddedCustomerNumber = only([{
  taskId: "customer-search-embedded", taskType: "SelectCustomer",
  fieldCaption: "Kundnr", instructionValue: "iberi",
  instruction: "Välj kund iberi."
}, { taskId: "customer-number-embedded", taskType: "RunAction",
  actionCaption: 'Nr, sorterade i Stigande order Välj posten "905"',
  instruction: 'Välj "Nr, sorterade i Stigande order Välj posten "905"".'
}], "SelectCustomer", "Välj **905** i **Kundnr**.");
assert.strictEqual(embeddedCustomerNumber.selectedValue, "905");
const englishSortedRecord = only([{
  taskId: "sales-order-row", taskType: "RunAction",
  pageCaption: "Sales Orders",
  actionCaption: 'No., sorted in Ascending order Open record "SO100049".',
  instruction: 'Välj No., sorted in Ascending order Open record "SO100049".'
}], "SelectRecord", "Välj försäljningsordern **SO100049**.");
assert.strictEqual(englishSortedRecord.selectedValue, "SO100049");
assert.strictEqual(englishSortedRecord.rawInteractions[0].actionCaption,
  'No., sorted in Ascending order Open record "SO100049".');
const swedishSortedRecord = only([{
  taskId: "sales-order-row-sv", taskType: "Select",
  actionCaption: 'Nr, sorterade i Stigande ordning Öppna posten "SO100050".'
}], "SelectRecord", "Välj försäljningsordern **SO100050**.");
const unknownSortedRecord = only([{
  taskId: "unknown-row", taskType: "RunAction",
  actionCaption: 'No., sorted in Ascending order Open record "X100050".'
}], "SelectRecord", "Välj posten **X100050**.");
assert.strictEqual(unknownSortedRecord.selectedValue, "X100050");
const purchaseOrderContext = only([{
  taskId: "purchase-order-row", taskType: "RunAction",
  identifications: [{ page: { caption: "Purchase Orders" } }],
  actionCaption: 'No., sorted in Descending order Open record "PO100004".'
}], "SelectRecord", "Välj inköpsordern **PO100004**.");
const itemNumberEntry = only([{
  taskId: "item-search", taskType: "EnterFieldValue",
  fieldCaption: "Sortera efter Nr", instructionValue: "30043",
  instruction: 'Ange 30043 i "Sortera efter Nr".'
}, { taskId: "item-row", taskType: "RunAction",
  instruction: 'Välj "Nr, sorterade i Stigande order Välj posten "30043"".'
}, { taskId: "item-result", taskType: "EnterFieldValue",
  fieldCaption: "Sortera efter Nr", instructionValue: "30043",
  instruction: 'Ange 30043 i "Sortera efter Nr".'
}], "EnterItemNumber", "Ange __30043__ i **Artikel Nr**.");
assert.strictEqual(itemNumberEntry.inputInteractionCount, 3);
const redundantSortedSelection = engine.consolidateInteractions([{
  taskId: "number-entry", taskType: "EnterFieldValue",
  fieldCaption: "Nr", instructionValue: "30043",
  screenshot: "number-entered.png", sourceEventIds: ["number-entered"]
}, {
  taskId: "number-result", taskType: "RunAction",
  actionCaption: 'Nr, sorterade i Stigande order Välj posten "30043"',
  screenshot: "selected-record.png", sourceEventIds: ["selected-record"]
}]);
assert.strictEqual(redundantSortedSelection.length, 1);
assert.strictEqual(redundantSortedSelection[0].instruction,
  "Ange __30043__ i **Nr**.");
assert.strictEqual(redundantSortedSelection[0].screenshot,
  "selected-record.png");
assert.deepStrictEqual(redundantSortedSelection[0].sourceEventIds,
  ["number-entered", "selected-record"]);
const partialItemNumberSelection = engine.consolidateInteractions([{
  taskId: "partial-number-entry", taskType: "EnterFieldValue",
  fieldCaption: "Nr", instructionValue: "3004",
  screenshot: "partial-number.png", sourceEventIds: ["partial-number"]
}, {
  taskId: "complete-number-result", taskType: "RunAction",
  actionCaption: 'Nr, sorterade i Stigande order Välj posten "30043"',
  screenshot: "complete-number.png", sourceEventIds: ["complete-number"]
}]);
assert.strictEqual(partialItemNumberSelection.length, 1);
assert.strictEqual(partialItemNumberSelection[0].instruction,
  "Ange __30043__ i **Nr**.");
assert.strictEqual(partialItemNumberSelection[0].instructionValue, "30043");
assert.strictEqual(partialItemNumberSelection[0].screenshot,
  "complete-number.png");
assert.deepStrictEqual(partialItemNumberSelection[0].sourceEventIds,
  ["partial-number", "complete-number"]);
const differentSortedSelection = engine.consolidateInteractions([{
  taskType: "EnterFieldValue", fieldCaption: "Nr", instructionValue: "3004"
}, {
  taskType: "RunAction",
  actionCaption: 'Nr, sorterade i Stigande order Välj posten "40001"'
}]);
assert.strictEqual(differentSortedSelection.length, 2,
  "an unrelated selected number must not replace the entered value");
const redundantSearchInput = engine.processInteractions([{
  taskId: "search-complete", taskType: "SearchAndOpenPage",
  searchCaption: "Search", searchFieldCaption: "Tell me what you want to do.",
  instructionValue: "sales order", resultCaption: "Sales Orders",
  sourceEventIds: ["search-open", "search-result"],
  screenshot: "search-result.png", preferredSourceEventId: "search-result"
}, {
  taskId: "search-input-duplicate", taskType: "EnterFieldValue",
  fieldCaption: "Tell me what you want to do.", instructionValue: "sales order",
  sourceEventIds: ["search-input"], screenshot: "search-input.png"
}]);
assert.strictEqual(redundantSearchInput.length, 1,
  "a complete search flow must absorb its repeated field-entry step");
assert.strictEqual(redundantSearchInput[0].actionType, "SearchAndOpenPage");
assert.strictEqual(redundantSearchInput[0].inputInteractionCount, 2);
assert.deepStrictEqual(redundantSearchInput[0].sourceEventIds,
  ["search-open", "search-result", "search-input"]);
assert.strictEqual(redundantSearchInput[0].preferredScreenshotRef,
  "search-result.png");
const genericSearchInput = engine.processInteractions([{
  taskType: "SearchAndOpenPage", searchCaption: "Search",
  resultCaption: "Sales Orders", screenshot: "result.png"
}, { taskType: "EnterFieldValue",
  fieldCaption: "Tell me what you want to do.", value: "sales order" }]);
assert.strictEqual(genericSearchInput.length, 1);
assert.strictEqual(genericSearchInput[0].selectedValue, "sales order");
assert.strictEqual(genericSearchInput[0].targetField,
  "Tell me what you want to do.");
assert.strictEqual(engine.processInteractions([{
  taskType: "SearchAndOpenPage", resultCaption: "Customers",
  searchFieldCaption: "Tell me what you want to do.",
  instructionValue: "customer", resultCaption: "Customers"
}, { taskType: "EnterFieldValue",
  fieldCaption: "Tell me what you want to do.",
  instructionValue: "vendor" }]).length, 2,
"different search values must remain separate interactions");
const menuPath = only([{
  taskId: "row", taskType: "RunAction", actionCaption: "Välj rad",
  sourceEventIds: ["event-row"], screenshot: "row.png"
}, {
  taskId: "related", taskType: "RunAction", actionCaption: "Relaterad information",
  sourceEventIds: ["event-related"], screenshot: "related.png"
}, {
  taskId: "discount", taskType: "RunAction",
  actionCaption: "Tillämpat försäljningspris och rabatt",
  sourceEventIds: ["event-discount"], screenshot: "discount.png"
}], "RunActionPath", "Välj **rad** → **Relaterad information** → " +
  "**Tillämpat försäljningspris och rabatt**.");
assert.deepStrictEqual(menuPath.sourceEventIds,
  ["event-row", "event-related", "event-discount"]);
assert.deepStrictEqual(menuPath.actionPath,
  ["rad", "Relaterad information",
    "Tillämpat försäljningspris och rabatt"]);
assert.strictEqual(menuPath.screenshotRefs.at(-1), "discount.png");
assert.strictEqual(menuPath.inputInteractionCount, 3);
const purchaseManualPriceResult = engine.processInteractions([{
  taskId: "purchase-row", taskType: "RunAction", actionCaption: "Rad",
  sourceEventIds: ["event-purchase-row"], screenshot: "row-menu.png"
}, {
  taskId: "purchase-price", taskType: "RunAction",
  actionCaption: "Tillämpat inköpspris och rabatt",
  sourceEventIds: ["event-purchase-price"], screenshot: "price-page.png"
}, {
  taskId: "purchase-manual-price", taskType: "RunAction",
  actionCaption: "Manuellt pris...",
  sourceEventIds: ["event-purchase-manual-price"]
}, {
  taskId: "direct-unit-cost", taskType: "EnterFieldValue",
  fieldCaption: "Direkt styckkostnad", value: "15",
  sourceEventIds: ["event-direct-unit-cost"],
  screenshot: "manual-price-dialog.png"
}]);
assert.strictEqual(purchaseManualPriceResult.length, 2);
const purchaseManualPricePath = purchaseManualPriceResult[0];
assert.strictEqual(purchaseManualPricePath.actionType, "RunActionPath");
assert.strictEqual(purchaseManualPricePath.displayText,
  "Välj **Rad** → **Tillämpat inköpspris och rabatt** → **Manuellt pris**.");
assert.deepStrictEqual(purchaseManualPricePath.sourceEventIds, [
  "event-purchase-row", "event-purchase-price", "event-purchase-manual-price"
]);
assert.strictEqual(purchaseManualPricePath.inputInteractionCount, 3);
assert.strictEqual(purchaseManualPricePath.preferredSourceEventId,
  "event-purchase-manual-price");
assert.strictEqual(purchaseManualPricePath.preferredScreenshotRef,
  "manual-price-dialog.png");
const manualPricePath = only([{
  taskId: "actions", taskType: "RunAction", actionCaption: "Åtgärder",
  sourceEventIds: ["event-actions"], screenshot: "actions.png"
}, {
  taskId: "function", taskType: "RunAction", actionCaption: "Funktion",
  sourceEventIds: ["event-function"], screenshot: "manual-price-visible.png"
}, {
  taskId: "manual-price", taskType: "RunAction", actionCaption: "Manuellt pris",
  sourceEventIds: ["event-manual-price"], screenshot: "menu-closed.png"
}], "RunActionPath", "Välj **Åtgärder** → **Funktion** → **Manuellt pris**.");
assert.strictEqual(manualPricePath.preferredSourceEventId, "event-function");
assert.strictEqual(manualPricePath.preferredScreenshotRef,
  "manual-price-visible.png");
assert.deepStrictEqual(manualPricePath.actionPath,
  ["Åtgärder", "Funktion", "Manuellt pris"]);
assert.strictEqual(engine.consolidateInteractions(
  manualPricePath.rawInteractions)[0].screenshot, "manual-price-visible.png");
const manualPriceWithoutFunctionCapture = only([{
  taskId: "actions-short", taskType: "RunAction", actionCaption: "Åtgärder",
  sourceEventIds: ["event-actions-short"], screenshot: "actions-short.png"
}, {
  taskId: "manual-price-short", taskType: "RunAction",
  actionCaption: "Manuellt pris...",
  sourceEventIds: ["event-manual-price-short"],
  screenshot: "manual-price-focused.png"
}], "RunActionPath", "Välj **Åtgärder** → **Manuellt pris**.");
assert.deepStrictEqual(manualPriceWithoutFunctionCapture.sourceEventIds,
  ["event-actions-short", "event-manual-price-short"]);
assert.strictEqual(manualPriceWithoutFunctionCapture.preferredSourceEventId,
  "event-manual-price-short");
assert.strictEqual(manualPriceWithoutFunctionCapture.preferredScreenshotRef,
  "manual-price-focused.png");
const duplicatedManualPriceCapture = only([{
  taskId: "actions-duplicate", taskType: "RunAction", actionCaption: "Åtgärder",
  sourceEventIds: ["event-actions-duplicate"], screenshot: "actions.png"
}, {
  taskId: "function-duplicate", taskType: "RunAction", actionCaption: "Funktion",
  sourceEventIds: ["event-function-duplicate"], screenshot: "menu-focused.png"
}, {
  taskId: "manual-price-duplicate-1", taskType: "RunAction",
  actionCaption: "Manuellt pris",
  sourceEventIds: ["event-manual-price-duplicate-1"], screenshot: "clicked.png"
}, {
  taskId: "manual-price-duplicate-2", taskType: "RunAction",
  actionCaption: "Manuellt pris...",
  sourceEventIds: ["event-manual-price-duplicate-2"], screenshot: "result.png"
}], "RunActionPath", "Välj **Åtgärder** → **Funktion** → **Manuellt pris**.");
assert.strictEqual(duplicatedManualPriceCapture.inputInteractionCount, 4);
assert.deepStrictEqual(duplicatedManualPriceCapture.sourceEventIds, [
  "event-actions-duplicate", "event-function-duplicate",
  "event-manual-price-duplicate-1", "event-manual-price-duplicate-2"
]);
assert.strictEqual(duplicatedManualPriceCapture.preferredScreenshotRef,
  "menu-focused.png");
const duplicatedReducedCapture = engine.processInteractions([{
  taskType: "RunAction", actionCaption: "Åtgärder",
  sourceEventIds: ["event-actions-reduced"]
}, {
  taskType: "RunAction", actionCaption: "Manuellt pris",
  sourceEventIds: ["event-manual-price-reduced-1"], screenshot: "focused.png"
}, {
  taskType: "RunAction", actionCaption: "Manuellt pris...",
  sourceEventIds: ["event-manual-price-reduced-2"], screenshot: "after.png"
}]);
assert.strictEqual(duplicatedReducedCapture.length, 1);
assert.strictEqual(duplicatedReducedCapture[0].inputInteractionCount, 3);
assert.strictEqual(duplicatedReducedCapture[0].preferredScreenshotRef,
  "focused.png");
const unrelatedBetweenMenuActions = engine.processInteractions([{
  taskType: "RunAction", actionCaption: "Åtgärder"
}, {
  taskType: "RunAction", actionCaption: "Bokför"
}, {
  taskType: "RunAction", actionCaption: "Manuellt pris"
}]);
assert.strictEqual(unrelatedBetweenMenuActions.length, 2);
assert.strictEqual(unrelatedBetweenMenuActions[0].displayText,
  "V\u00e4lj **\u00c5tg\u00e4rder** \u2192 **Bokf\u00f6r**.");
assert.strictEqual(unrelatedBetweenMenuActions[1].displayText,
  "V\u00e4lj **Manuellt pris**.");
const genericMenuPath = only([{
  taskId: "actions-post", taskType: "RunAction", actionCaption: "\u00c5tg\u00e4rder",
  pageContext: { pageIdentity: "bc:page:42" },
  sourceEventIds: ["event-actions-post"], screenshot: "post-menu.png"
}, {
  taskId: "posting", taskType: "RunAction", actionCaption: "Bokf\u00f6ring",
  pageContext: { pageIdentity: "bc:page:42" },
  sourceEventIds: ["event-posting"], screenshot: "after-post.png"
}], "RunActionPath", "V\u00e4lj **\u00c5tg\u00e4rder** \u2192 **Bokf\u00f6ring**.");
assert.deepStrictEqual(genericMenuPath.sourceEventIds,
  ["event-actions-post", "event-posting"]);
assert.strictEqual(genericMenuPath.preferredScreenshotRef, "post-menu.png");
assert.strictEqual(genericMenuPath.preferredSourceEventId, "event-posting");
assert.deepStrictEqual(genericMenuPath.actionPath,
  ["Åtgärder", "Bokföring"]);
const customerActionGroupCase = only([{
  taskType: "RunAction", actionCaption: "Custom command",
  uiHierarchy: [{ type: "ActionGroup", caption: "Customer actions" }]
}], "RunActionPath", "V\u00e4lj **Customer actions** \u2192 **Custom command**.");
assert.deepStrictEqual(customerActionGroupCase.actionPath,
  ["Customer actions", "Custom command"]);
const ordinaryActionsRemainSeparate = engine.processInteractions([{
  taskType: "RunAction", actionCaption: "Redigera"
}, { taskType: "RunAction", actionCaption: "Ta bort" }]);
assert.strictEqual(ordinaryActionsRemainSeparate.length, 2);
assert.ok(!ordinaryActionsRemainSeparate.some(value =>
  value.actionType === "RunActionPath"));
only([{ taskType: "Dialog", actionCaption: "Calculate and replace" }],
  "RunDialogAction",
  "V\u00e4lj **Calculate and replace** i dialogrutan.");
const crossPageMenuActions = engine.processInteractions([{
  taskType: "RunAction", actionCaption: "\u00c5tg\u00e4rder",
  pageContext: { pageIdentity: "bc:page:42" }
}, { taskType: "RunAction", actionCaption: "Bokf\u00f6ring",
  pageContext: { pageIdentity: "bc:page:43" }
}]);
assert.strictEqual(crossPageMenuActions.length, 2);
assert.ok(!crossPageMenuActions.some(value =>
  value.actionType === "RunActionPath"));
const duplicatedActionObservation = only([{
  taskId: "post-action", taskType: "RunAction", actionCaption: "Bokför",
  interactionId: "interaction:post", sourceEventIds: ["post-click"],
  screenshot: "post-click.png",
  capturePacket: { interactionId: "interaction:post",
    interactionIds: ["interaction:post"], packetId: "packet:post-click" }
}, {
  taskId: "post-result", taskType: "RunAction", actionCaption: "Bokför",
  interactionId: "interaction:post", sourceEventIds: ["post-result"],
  screenshot: "post-result.png",
  capturePacket: { interactionId: "interaction:post",
    interactionIds: ["interaction:post"], packetId: "packet:post-result" }
}, {
  taskId: "post-status", taskType: "RunAction", actionCaption: "Bokför",
  interactionId: "interaction:post", sourceEventIds: ["post-status"],
  screenshot: "post-status.png",
  capturePacket: { interactionId: "interaction:post",
    interactionIds: ["interaction:post"], packetId: "packet:post-status" }
}], "RunAction", "Välj **Bokför**.");
assert.strictEqual(duplicatedActionObservation.ruleId,
  "duplicate-action-observation");
assert.deepStrictEqual(duplicatedActionObservation.sourceEventIds,
  ["post-click", "post-result", "post-status"]);
assert.deepStrictEqual(duplicatedActionObservation.screenshotRefs,
  ["post-click.png", "post-result.png", "post-status.png"]);
assert.strictEqual(duplicatedActionObservation.capturePackets.length, 3);
assert.strictEqual(duplicatedActionObservation.interactionId,
  "interaction:post");
assert.strictEqual(engine.processInteractions([{
  taskType: "RunAction", actionCaption: "Bokför",
  interactionId: "interaction:post-first"
}, {
  taskType: "RunAction", actionCaption: "Bokför",
  interactionId: "interaction:post-second"
}]).length, 2, "two deliberate actions must remain separate");
assert.strictEqual(engine.processInteractions([{
  taskType: "RunAction", actionCaption: "Bokför",
  interactionId: "interaction:changed-caption"
}, {
  taskType: "RunAction", actionCaption: "Förhandsgranska",
  interactionId: "interaction:changed-caption"
}]).length, 2, "different business actions must remain separate");
const closeDialog = engine.processInteractions([{
  taskId: "dialog", taskType: "RunAction", actionCaption: "Öppna information",
  sourceEventIds: ["event-dialog"], screenshot: "dialog-open.png"
}, {
  taskId: "close", taskType: "RunAction", actionCaption: "Stäng",
  sourceEventIds: ["event-close"], screenshot: "dialog-closed.png"
}])[1];
assert.strictEqual(closeDialog.actionType, "CloseDialog");
assert.strictEqual(closeDialog.displayText, "Välj **Stäng**.");
assert.deepStrictEqual(closeDialog.sourceEventIds, ["event-close"]);
assert.strictEqual(closeDialog.preferredSourceEventId, "event-dialog");
assert.strictEqual(closeDialog.preferredScreenshotRef, "dialog-open.png");
assert.deepStrictEqual(customer.sourceEventNos, [1, 2]);
assert.deepStrictEqual(customer.screenshotRefs, ["lookup.png", "selected.png"]);
assert.deepStrictEqual(customer.annotationRefs, [{ annotationId: "ann-1" }]);
assert.deepStrictEqual(customer.rawInteractions[0].future, { retained: true });
only(select("Artikelnr", "136"), "SelectItem", "Välj artikel **136**.");
only(select("Leverantörsnr", "V-10"), "SelectVendor",
  "Välj leverantör **V-10**.");
only(select("Lagerställekod", "BLÅ"), "SelectLocation",
  "Välj lagerställe **BLÅ**.");
only(select("Dimensionsvärde", "SALES"), "SelectDimension",
  "Välj dimensionsvärde **SALES**.");
only([{ taskId: "quantity", taskType: "ChangeField", fieldCaption: "Antal",
  value: "500", inputSources: ["input"] }], "EnterQuantity",
"Ange __500__ i **Antal**.");
only([{ taskId: "date", taskType: "ChangeField", fieldCaption: "Bokföringsdatum",
  value: "2026-08-06", inputSources: ["input"] }], "SelectDate",
"Ange __2026-08-06__ i **Bokföringsdatum**.");
only([{ taskId: "option", taskType: "SelectOption", fieldCaption: "Status",
  value: "Öppen" }], "SelectOption", "Välj **Öppen** i **Status**.");
only([{ taskId: "record", taskType: "Select", selectedCaption: "30043" }],
  "SelectRecord", "Välj posten **30043**.");
only([{ taskId: "enable", taskType: "Checkbox", fieldCaption: "Spärrad",
  value: true }], "EnableCheckbox", "Aktivera **Spärrad**.");
only([{ taskId: "disable", taskType: "Checkbox", fieldCaption: "Spärrad",
  value: false }], "DisableCheckbox", "Inaktivera **Spärrad**.");
only([{ taskId: "lookup", taskType: "RunAction",
  actionCaption: "Välj ett värde för Betalningsvillkor"
}, { taskId: "lookup-row", taskType: "Select",
  selectedCaption: 'Välj posten "30D"' }], "SelectLookupValue",
"Välj värde **30D**.");
only([{ taskId: "field", taskType: "ChangeField", fieldCaption: "Referens",
  value: "ABC", inputSources: ["input"], unknown: { version: 2 } }],
"EnterFieldValue", "Ange __ABC__ i **Referens**.");
const sortedFieldEntry = engine.consolidateInteractions([{
  taskId: "sorted-number", taskType: "EnterFieldValue",
  fieldCaption: "Sortera efter Nr", value: "30043", inputSources: ["input"]
}])[0];
assert.strictEqual(sortedFieldEntry.instruction, "Ange __30043__ i **Nr**.");
assert.strictEqual(sortedFieldEntry.fieldCaption, "Nr");
const fieldAdapter = engine.consolidateInteractions([{
  taskId: "field-roundtrip", taskType: "ChangeField",
  fieldCaption: "Referens", value: "ABC", inputSources: ["input"]
}])[0];
assert.strictEqual(engine.consolidateInteractions([fieldAdapter])[0].instruction,
  "Ange __ABC__ i **Referens**.");

const fieldLandingSequence = [{ taskId: "number-focus",
  taskType: "ChangeField", fieldCaption: "Sortera efter Nr",
  inputSources: ["focusout"], sourceEventNos: [10]
}, { taskId: "number-row", taskType: "Select",
  selectedCaption: 'Välj posten "136"', sourceEventNos: [11]
}, { taskId: "number-result", taskType: "ChangeField",
  fieldCaption: "Sortera efter Nr", value: "136",
  inputSources: ["focusout"], sourceEventNos: [12]
}, { taskId: "vendor-empty", taskType: "SelectVendor",
  fieldCaption: "Leverantör", instruction: "Välj leverantör.",
  inputSources: ["focusout"], sourceEventNos: [13]
}, { taskId: "tour-focus", taskType: "ChangeField",
  fieldCaption: "Sortera efter Tur Nr", inputSources: ["focusout"],
  sourceEventNos: [14]
}, { taskId: "quantity-value", taskType: "ChangeField",
  fieldCaption: "Sortera efter Antal", value: "500",
  inputSources: ["focusout"], sourceEventNos: [15] }];
const visibleFieldActions = engine.consolidateInteractions(fieldLandingSequence);
assert.strictEqual(visibleFieldActions.length, 2);
assert.strictEqual(visibleFieldActions[0].instruction,
  "Välj Nr **136**.");
assert.deepStrictEqual(visibleFieldActions[0].sourceEventNos, [10, 11, 12]);
assert.strictEqual(visibleFieldActions[1].instruction,
  "Ange __500__ i **Antal**.");
const allFieldActions = engine.processInteractions(fieldLandingSequence);
assert.strictEqual(allFieldActions.filter(value => value.hidden).length, 2);
assert.deepStrictEqual(allFieldActions.filter(value => value.hidden)
  .flatMap(value => value.sourceEventNos), [13, 14]);
const focusProjection = projector.project({ sessionId: "focus-session",
  sessionName: "Focus", tasks: fieldLandingSequence }).document;
const focusDocument = engine.processDocument(focusProjection);
const focusWorkflow = focusDocument.sections.find(value =>
  value.kind === "workflow");
assert.strictEqual(focusWorkflow.blocks.filter(value =>
  value.kind === "step").length, 2);
assert.deepStrictEqual(focusWorkflow.suppressedInteractions.flatMap(value =>
  value.sourceEventNos), ["13", "14"]);

const original = select("Kundnr", "1033");
const before = JSON.stringify(original);
const first = engine.processInteractions(original);
const second = engine.processInteractions(original);
assert.strictEqual(JSON.stringify(original), before, "rules must not mutate input");
assert.deepStrictEqual(first, second, "rules must be deterministic");
assert.ok(Object.isFrozen(first));
assert.ok(Object.isFrozen(first[0].rawInteractions));
const adapted = engine.consolidateInteractions(original)[0];
const roundTrip = engine.processInteractions([{
  ...adapted,
  semanticActionModel: { ...adapted.semanticActionModel,
    futureVersionField: { schema: 9 } }
}])[0];
assert.strictEqual(roundTrip.actionId, adapted.semanticActionModel.actionId);
assert.deepStrictEqual(roundTrip.futureVersionField, { schema: 9 });
assert.deepStrictEqual(roundTrip.rawInteractions, original);

const fallback = [{ taskId: "unknown", taskType: "FutureAction",
  instruction: "Behåll framtida åtgärd.", future: { schema: 9 } }];
assert.deepStrictEqual(engine.consolidateInteractions(fallback)[0], fallback[0]);

function testRule(ruleId, priority, displayText) {
  const rule = { ruleId, priority, match: () => true,
    consolidate: context => ({ consumed: 1, action: Object.freeze({
      actionId: ruleId, actionType: ruleId, displayText,
      rawInteractions: [context.interactions[context.index]],
      sourceTaskIds: [], sourceStepNos: [], sourceEventNos: [],
      screenshotRefs: [], annotationRefs: []
    }) }) };
  return Object.freeze(rule);
}
assert.strictEqual(engine.processInteractions(fallback, [
  testRule("generic", 10, "generic"), testRule("specific", 100, "specific")
])[0].displayText, "specific");
assert.strictEqual(engine.processInteractions(fallback, [
  testRule("equal-a", 50, "a"), testRule("equal-b", 50, "b")
])[0].passthrough, true, "equal priority conflicts must preserve input");

const review = { sessionId: "session", sessionName: "Test",
  tasks: [{ taskId: "customer-1", taskType: "SelectCustomer",
    fieldCaption: "Kundnr", value: "1033", instruction: "Tekniskt kundval.",
    sourceEventNos: [7], screenshot: "customer.png",
    semanticActionMetadata: { futureSchemaField: "preserved" } }],
  annotations: { screenshotSets: [{ screenshotRef: "customer.png", items: [{
    annotationId: "annotation-1", type: "future"
  }] }] } };
const projected = projector.project(review).document;
const projectedBefore = JSON.stringify(projected);
const document = engine.processDocument(projected);
assert.strictEqual(engine.processDocument(projected), document,
  "an immutable document revision should be processed once");
assert.strictEqual(JSON.stringify(projected), projectedBefore);
const step = document.sections.find(value => value.kind === "workflow")
  .blocks.find(value => value.kind === "step");
assert.strictEqual(step.blocks.find(value => value.kind === "paragraph").text,
  "Välj **1033** i **Kundnr**.");
assert.strictEqual(step.semanticAction.futureSchemaField, "preserved");
assert.deepStrictEqual(step.semanticAction.sourceEventNos, ["7"]);
assert.deepStrictEqual(step.blocks.find(value => value.kind === "image")
  .annotationRefs, [{ annotationId: "annotation-1",
    screenshotRef: "customer.png" }]);
assert.ok(document.provenance.transformations.includes(
  "semantic-interaction-rules"));

console.log("Semantic Interaction Rules Engine behaviour tests passed.");

const pageSelection = {taskId:'tell-me-result',taskType:'Select',selectedCaption:'Sales Orders Lists \uEDFF',targetControl:{role:'gridcell'},sourceEventIds:['search-result']};
only([pageSelection], 'OpenPage', 'Välj **Sales Orders**.');
only([{...pageSelection,selectedCaption:'Customer Lists'}], 'SelectRecord', 'Välj posten **Customer Lists**.');
assert.equal(pageSelection.selectedCaption,'Sales Orders Lists \uEDFF');

const recordedCustomer = only([{taskId:'customer-lookup',taskType:'RunAction',actionCaption:'Choose a value for Customer Name'},
  {taskId:'customer-choice',taskType:'Select',selectedCaption:'No., sorted in Ascending order Select record "C0011"'}],
  'SelectCustomer','Välj **C0011** i **Customer Name**.');
assert.equal(recordedCustomer.targetField,'Customer Name');
const language = require('../src/document/document-language');
const registry = require('../src/engine/language-registry');
for(const locale of registry.supported('document').map(item=>item.locale)) {
  const translated=language.translateInstruction(recordedCustomer.displayText,locale);
  assert.ok(translated.includes('Customer Name'),locale+' preserves captured field');
  assert.ok(translated.includes('C0011'),locale+' preserves selected customer');
}

for (const fieldCaption of ["Sort on 'Quantity'", 'Sort by "Quantity"', 'Quantity']) {
  const input = {taskId:'quantity-caption',taskType:'EnterFieldValue',fieldCaption,value:'500',inputSources:['input']};
  const before = JSON.stringify(input);
  const output = only([input], 'EnterQuantity', 'Ange __500__ i **Quantity**.');
  assert.equal(output.targetField, 'Quantity');
  assert.equal(JSON.stringify(input), before);
  for (const locale of registry.supported('document').map(item=>item.locale)) {
    const translated = language.translateInstruction(output.displayText, locale);
    assert.ok(translated.includes('Quantity') && translated.includes('500'));
    assert.ok(!translated.includes('Sort on'));
  }
}
only([{taskId:'literal-caption',taskType:'EnterFieldValue',fieldCaption:"Customer's reference",value:'ABC'}],
  'EnterFieldValue', "Ange __ABC__ i **Customer's reference**.");

const lookupPair = [{taskId:'lookup-open',taskType:'RunAction',fieldCaption:'Choose a value for No.',screenshot:'open.png',sourceEventNos:[57]},
  {taskId:'lookup-selected',taskType:'SelectRecord',selectedCaption:'0015',screenshot:'selected.png',sourceEventNos:[60]}];
const lookupBefore=JSON.stringify(lookupPair);
const lookupMerged=only(lookupPair,'SelectLookupValue','Välj **0015** i **No.**.');
assert.equal(lookupMerged.preferredScreenshotRef,'selected.png');
assert.deepEqual(lookupMerged.sourceEventNos,[57,60]);
assert.equal(JSON.stringify(lookupPair),lookupBefore);
assert.equal(engine.processInteractions(lookupPair.map((item,index)=>({...item,pageId:String(index)}))).length,2);
for(const locale of registry.supported('document').map(item=>item.locale)) {
  const translated=language.translateInstruction(lookupMerged.displayText,locale);
  assert.ok(translated.includes('0015') && translated.includes('No.'));
}

for (const type of ['Item','Resource','G/L Account','Fixed Asset','Custom Type']) {
  const pair=lookupPair.map(item=>({...item}));
  pair[0].rowTypeContext={schemaVersion:1,source:'same-row-type',caption:'Type',value:type};
  const output=only(pair,'SelectLookupValue',`Välj **0015** i **No.** (**${type}**).`);
  assert.equal(output.rowTypeContext.value,type);
  if(type==='Item') assert.equal(output.selectedEntity,'Item');
  for(const locale of registry.supported('document').map(item=>item.locale))
    assert.ok(language.translateInstruction(output.displayText,locale).includes(type));
}

const separateSelections=[
  {taskId:'customer-start',taskType:'RunAction',fieldCaption:'Choose a value for Customer Name'},
  {taskId:'customer-selected',taskType:'Select',selectedCaption:'Select record "C0011"',screenshot:'customer.png'},
  {taskId:'item-selected',taskType:'Select',selectedCaption:'Select record "0011"',screenshot:'item-one.png'},
  ...lookupPair
];
const selectionsBefore=JSON.stringify(separateSelections);
const separated=engine.processInteractions(separateSelections);
assert.equal(separated[0].selectedValue,'C0011');
assert.ok(!separated[0].screenshotRefs.includes('item-one.png'));
assert.ok(!separated[0].screenshotRefs.includes('selected.png'));
assert.ok(separated.some(action=>action.selectedValue==='0015' && action.targetField==='No.'));
assert.equal(JSON.stringify(separateSelections),selectionsBefore);
const missingCustomer=engine.processInteractions([separateSelections[0],...lookupPair]);
assert.ok(!missingCustomer.some(action=>action.actionType==='SelectCustomer' && action.selectedValue==='0015'));

const lineMenu=['Line','Related Information','Applied Sales Price and Discount'].map((actionCaption,index)=>({
  taskId:'line-menu-'+index,taskType:'RunAction',actionCaption,pageId:'42',screenshot:'menu-'+index+'.png',sourceEventNos:[index+1]}));
const linePath=only(lineMenu,'RunActionPath','Välj **Line** → **Related Information** → **Applied Sales Price and Discount**.');
assert.deepEqual(linePath.actionPath,lineMenu.map(item=>item.actionCaption));
assert.deepEqual(linePath.sourceEventNos,[1,2,3]);
assert.equal(linePath.preferredScreenshotRef,'menu-1.png');
assert.ok(engine.processInteractions(lineMenu.map((item,index)=>({...item,pageId:String(index)}))).length>1);
for(const locale of registry.supported('document').map(item=>item.locale)) {
  const translated=language.translateInstruction(linePath.displayText,locale);
  for(const item of lineMenu) assert.ok(translated.includes(item.actionCaption));
}

const englishManual=['Actions','Functions','Manual Price...'].map((actionCaption,index)=>({taskId:'manual-en-'+index,taskType:'RunAction',actionCaption}));
const manualEnglish=only(englishManual,'RunActionPath','Välj **Actions** → **Functions** → **Manual Price**.');
for(const locale of registry.supported('document').map(item=>item.locale)) {
  const translated=language.translateInstruction(manualEnglish.displayText,locale);
  for(const caption of ['Actions','Functions','Manual Price']) assert.ok(translated.includes(caption));
}

const confirmedField=[{taskId:'price-input',taskType:'EnterFieldValue',fieldCaption:'Unit Price',value:'[belopp]',screenshot:'price-dialog.png'},
  {taskId:'dialog-surface',taskType:'RunAction',actionCaption:'Change Applied Unit Price',targetControl:{role:'dialog'}},
  {taskId:'dialog-ok',taskType:'RunAction',actionCaption:'OK',uiHierarchy:[{type:'dialog'}],screenshot:'after-dialog.png'}];
const confirmed=only(confirmedField,'EnterFieldValue','Ange **Unit Price**. Välj **OK**.');
assert.equal(confirmed.preferredScreenshotRef,'price-dialog.png');
assert.equal(confirmed.selectedValue,'');
assert.ok(engine.processInteractions(confirmedField.map((item,index)=>index===2?{...item,actionCaption:'Cancel'}:item)).length>1);
for(const locale of registry.supported('document').map(item=>item.locale)) {
  const translated=language.translateInstruction(confirmed.displayText,locale);
  assert.ok(translated.includes('Unit Price') && translated.includes('OK'));
  if(locale!=='sv-SE') assert.ok(!translated.includes('Ange ') && !translated.includes('Välj '));
}
