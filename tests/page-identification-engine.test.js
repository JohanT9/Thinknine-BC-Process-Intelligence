const assert = require("assert");
const engine = require("../src/engine/page-identification-engine");

const baseDefinition = {
  ruleId: "Sales.Order",
  pageObjectId: "42",
  entity: "SalesOrder",
  pageType: "document",
  tableId: "36",
  recordType: "SalesOrder",
  documentType: "sales-order",
  captionRules: [
    { locale: "sv-SE", pattern: "^Försäljningsorder$" },
    { locale: "en-US", pattern: "^Sales Order$" }
  ],
  futureDefinitionField: { retained: true }
};
const salesPack = { packId: "sales", priority: 200,
  pageDefinitions: [baseDefinition], rules: [{ ruleId: "Existing.Rule" }] };

assert.strictEqual(engine.normalizePageObjectId(42), "42");
assert.strictEqual(engine.normalizePageObjectId("00042"), "42");
assert.strictEqual(engine.normalizePageObjectId("SalesOrder"), null);

const input = { pageObjectId: 42, pageCaption: "Försäljningsorder",
  locale: "sv-SE", futureContext: { retained: true } };
const inputSnapshot = JSON.stringify(input);
const exact = engine.resolvePageIdentity(Object.freeze(input), [salesPack]);
assert.strictEqual(JSON.stringify(input), inputSnapshot);
assert.deepStrictEqual(exact, {
  pageIdentity: "bc:page:42", pageObjectId: "42",
  pageCaption: "Försäljningsorder",
  entity: "SalesOrder", pageType: "document", tableId: "36",
  recordType: "SalesOrder", documentType: "sales-order",
  source: "page-object-id", provider: "sales", ruleId: "Sales.Order",
  confidence: 1
});
assert.ok(Object.isFrozen(exact));
assert.deepStrictEqual(engine.identifyPage(input, { knowledgePacks: [salesPack] }), exact);
assert.strictEqual(engine.getPageDefinition("42", [salesPack]).ruleId,
  "Sales.Order");

const caption = engine.resolvePageIdentity({ pageCaption: "Sales Order",
  locale: "en-US" }, [salesPack]);
assert.strictEqual(caption.source, "caption-rule");
assert.strictEqual(caption.entity, "SalesOrder");
assert.strictEqual(caption.confidence, 0.75);
assert.strictEqual(caption.tableId, undefined,
  "Caption confidence must not supply table identity.");
assert.strictEqual(caption.recordType, undefined,
  "Caption confidence must not supply record identity.");

const unknown = engine.resolvePageIdentity({ pageObjectId: "999999",
  pageCaption: "Custom Page" }, [salesPack]);
assert.deepStrictEqual(unknown, { pageIdentity: "bc:page:999999",
  pageObjectId: "999999",
  pageCaption: "Custom Page", source: "runtime-metadata", confidence: 0.6 });
const missing = engine.resolvePageIdentity({}, [salesPack]);
assert.deepStrictEqual(missing, { pageIdentity: "bc:observed:unknown",
  source: "generic-fallback", confidence: 0.25 });
const genericCaption = engine.resolvePageIdentity({ pageCaption: "Unknown" }, [salesPack]);
assert.strictEqual(genericCaption.pageIdentity.startsWith("bc:observed:"), true);
assert.deepStrictEqual({ ...genericCaption, pageIdentity: "stable" }, {
  pageIdentity: "stable", pageCaption: "Unknown",
  source: "generic-fallback", confidence: 0.25 });

const highPriority = { packId: "customer", priority: 500, pageDefinitions: [{
  ...baseDefinition, ruleId: "Customer.Override", entity: "CustomerOrder"
}] };
const prioritized = engine.resolvePageIdentity({ pageObjectId: "42" },
  [salesPack, highPriority]);
assert.strictEqual(prioritized.entity, "CustomerOrder");
assert.strictEqual(prioritized.provider, "customer");
assert.ok(prioritized.diagnostics.some(item =>
  item.code === "conflicting-page-definitions"));

const equalConflict = { packId: "equal", priority: 200, pageDefinitions: [{
  ...baseDefinition, ruleId: "Equal.Conflict", entity: "ConflictingEntity"
}] };
const conflicted = engine.resolvePageIdentity({ pageObjectId: "42",
  pageCaption: "Sales Order" }, [salesPack, equalConflict]);
assert.strictEqual(conflicted.source, "runtime-metadata");
assert.strictEqual(conflicted.entity, undefined);
assert.ok(conflicted.diagnostics.some(item =>
  item.code === "ambiguous-page-identification"));

const ambiguousCaption = engine.resolvePageIdentity({ pageCaption: "Shared",
  locale: "en-US" }, [{ packId: "one", priority: 100, pageDefinitions: [{
  ruleId: "One.Shared", entity: "One", pageType: "card",
  captionRules: [{ locale: "en-US", pattern: "^Shared$" }]
}, {
  ruleId: "Two.Shared", entity: "Two", pageType: "card",
  captionRules: [{ locale: "en-US", pattern: "^Shared$" }]
}] }]);
assert.strictEqual(ambiguousCaption.source, "generic-fallback");
assert.strictEqual(ambiguousCaption.entity, undefined);
assert.ok(ambiguousCaption.diagnostics.some(item =>
  item.code === "ambiguous-page-identification"));

const duplicate = engine.validateKnowledgePacks([{ packId: "duplicate",
  pageDefinitions: [baseDefinition, { ...baseDefinition, ruleId: "Duplicate" }] }]);
assert.ok(duplicate.diagnostics.some(item =>
  item.code === "duplicate-page-object-id"));

for (const [definition, code] of [
  [{ pageObjectId: "42" }, "missing-page-rule-id"],
  [{ ruleId: "Missing.Provider", pageObjectId: "42" }, "missing-page-provider"],
  [{ ruleId: "Bad.Id", pageObjectId: "4x" }, "invalid-page-object-id"],
  [{ ruleId: "Bad.Type", pageObjectId: "42", pageType: "mystery" }, "invalid-page-type"],
  [{ ruleId: "Bad.Entity", pageObjectId: "42", entity: "36" }, "numeric-entity"],
  [{ ruleId: "Bad.Table", pageObjectId: "42", tableId: "x" }, "invalid-table-id"]
]) {
  const result = engine.validatePageDefinition(definition);
  assert.strictEqual(result.valid, false);
  assert.ok(result.diagnostics.some(item => item.code === code));
}

const preserved = engine.validatePageDefinition(baseDefinition,
  { packId: "sales", packPriority: 200 });
assert.strictEqual(preserved.valid, true);
assert.deepStrictEqual(preserved.definition.futureDefinitionField, { retained: true });
assert.strictEqual(JSON.stringify(baseDefinition).includes("futureDefinitionField"), true);

const rulesOnly = engine.resolvePageIdentity({ pageObjectId: "42" }, [{
  packId: "legacy-rules-only", priority: 100, rules: [{ ruleId: "Legacy" }]
}]);
assert.strictEqual(rulesOnly.source, "runtime-metadata");
assert.strictEqual(rulesOnly.entity, undefined);

assert.deepStrictEqual(engine.resolvePageIdentity(input, [salesPack]), exact,
  "Repeated resolution must be deterministic.");

console.log("Page Identification Engine tests passed.");
