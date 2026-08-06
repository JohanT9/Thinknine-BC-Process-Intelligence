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
  "Välj kund **1033**.");
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
  "Välj kund **1033**.");
assert.strictEqual(step.semanticAction.futureSchemaField, "preserved");
assert.deepStrictEqual(step.semanticAction.sourceEventNos, ["7"]);
assert.deepStrictEqual(step.blocks.find(value => value.kind === "image")
  .annotationRefs, [{ annotationId: "annotation-1",
    screenshotRef: "customer.png" }]);
assert.ok(document.provenance.transformations.includes(
  "semantic-interaction-rules"));

console.log("Semantic Interaction Rules Engine behaviour tests passed.");
