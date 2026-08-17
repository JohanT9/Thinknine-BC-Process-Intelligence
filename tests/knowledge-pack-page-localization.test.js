const assert = require("assert");
const engine = require("../src/engine/page-identification-engine");
const memory = require("../src/engine/entity-memory");
const sales = require("../src/knowledge-packs/sales.json");
const apteanRules = require("../src/knowledge-packs/aptean-fb.json");

const localized = [sales, apteanRules];
for (const [locale, caption, alias] of [
  ["en-US", "  SALES ORDER. ", "Sales Order"],
  ["sv-SE", "Försäljningsorder", "Försäljningsorder"],
  ["da-DK", "Salgsordre", "Salgsordre"]
]) {
  const result = engine.resolvePageIdentity({ pageCaption: caption, locale }, localized);
  assert.equal(result.entity, "SalesOrder");
  assert.equal(result.source, "caption-rule");
  assert.equal(result.provider, "bc-sales");
  assert.equal(result.matchedLocale, locale);
  assert.equal(result.matchedAlias, alias);
  assert.ok(result.matchedRule);
  assert.equal(result.tableId, undefined);
  assert.equal(result.recordType, undefined);
  assert.equal(result.pageCaption, caption.trim(), "observed caption must be preserved");
}

for (const caption of ["Tenant Sales Order", "Sales Order - Customer A"]) {
  const result = engine.resolvePageIdentity({ pageCaption: caption,
    locale: "en-US" }, [{ ...sales, pageDefinitions:
      sales.pageDefinitions.map(definition => ({ ...definition, captionRules: [] })) }]);
  assert.equal(result.source, "generic-fallback",
    "customer prefix/suffix must not match an exact localized alias");
}

const ambiguous = engine.resolvePageIdentity({ pageCaption: "Shared Page",
  locale: "en-US" }, [{ packId: "ambiguous", priority: 100, pageDefinitions: [
  { ruleId: "One", entity: "One", localizedCaptions: { "en-US": ["Shared Page"] } },
  { ruleId: "Two", entity: "Two", localizedCaptions: { "en-US": ["Shared Page"] } }
] }]);
assert.equal(ambiguous.source, "generic-fallback");
assert.equal(ambiguous.entity, undefined);
assert.ok(ambiguous.diagnostics.some(item =>
  item.code === "ambiguous-page-identification"));

const verifiedAptean = { packId: "aptean-fb", priority: 300, rules: apteanRules.rules,
  pageDefinitions: [{ ruleId: "Aptean.VerifiedQualityControl", pageObjectId: "70001",
    entity: "QualityCheck", pageType: "list", provider: "aptean-fb",
    verification: { source: "extension-metadata",
      evidence: "sanitized-test-extension-metadata:quality-control" },
    localizedCaptions: { "en-US": ["Quality Control"],
      "sv-SE": ["Kvalitetskontroll"], "da-DK": ["Kvalitetskontrol"] } }] };
const apteanExact = engine.resolvePageIdentity({ pageObjectId: "70001",
  pageCaption: "Misleading Customer Page" }, [verifiedAptean]);
assert.equal(apteanExact.entity, "QualityCheck");
assert.equal(apteanExact.provider, "aptean-fb");
assert.equal(apteanExact.source, "page-object-id");
const unknownAptean = engine.resolvePageIdentity({ pageObjectId: "70002",
  pageCaption: "Aptean Custom Page" }, [verifiedAptean]);
assert.equal(unknownAptean.source, "runtime-metadata");
assert.equal(unknownAptean.entity, undefined);

const unverifiedAptean = engine.validateKnowledgePacks([{ packId: "aptean-fb",
  pageDefinitions: [{ ruleId: "Aptean.Guessed", pageObjectId: "70003",
    entity: "Claim" }] }]);
assert.ok(unverifiedAptean.diagnostics.some(item =>
  item.code === "unverified-aptean-page-object-id"));
assert.equal(unverifiedAptean.definitions.length, 0);

const standard = { packId: "microsoft", priority: 100, pageDefinitions: [{
  ruleId: "Microsoft.Standard", pageObjectId: "42", entity: "SalesOrder"
}] };
const explicitCustomer = { packId: "customer-acme", priority: 600,
  pageDefinitions: [{ ruleId: "Acme.SalesOrder", pageObjectId: "42",
    entity: "AcmeSalesOrder", provider: "customer-acme",
    override: { targetRuleId: "Microsoft.Standard", targetProvider: "microsoft",
      reason: "Tenant extension replaces the standard page object.", priority: 600 }
  }] };
const overridden = engine.resolvePageIdentity({ pageObjectId: "42" },
  [standard, explicitCustomer]);
assert.equal(overridden.entity, "AcmeSalesOrder");
assert.equal(overridden.provider, "customer-acme");
assert.equal(overridden.override.reason,
  "Tenant extension replaces the standard page object.");

const invalidOverride = { ...explicitCustomer, pageDefinitions: [{
  ...explicitCustomer.pageDefinitions[0], override: {
    targetRuleId: "Microsoft.Standard", reason: "Missing provider", priority: 600
  } }] };
const invalidValidation = engine.validateKnowledgePacks([standard, invalidOverride]);
assert.ok(invalidValidation.diagnostics.some(item =>
  item.code === "invalid-page-override"));
const invalidResult = engine.resolvePageIdentity({ pageObjectId: "42" },
  [standard, invalidOverride]);
assert.equal(invalidResult.entity, "SalesOrder");

const silentConflict = { packId: "conflict", priority: 900, pageDefinitions: [{
  ruleId: "Conflict.Page", pageObjectId: "42", entity: "WrongEntity"
}] };
const conflict = engine.resolvePageIdentity({ pageObjectId: "42" },
  [standard, silentConflict]);
assert.equal(conflict.source, "runtime-metadata");
assert.equal(conflict.entity, undefined);
assert.ok(conflict.diagnostics.some(item =>
  item.code === "ambiguous-page-identification"));

engine.configureKnowledgePacks([sales]);
const continuity = memory.build([
  { sequence: 1, pageIdentification: engine.resolvePageIdentity({
    pageCaption: "Sales Order", locale: "en-US" }, [sales]) },
  { sequence: 2, pageIdentification: engine.resolvePageIdentity({
    pageCaption: "Unknown Extension" }, [sales]) }
]);
assert.equal(continuity.length, 1);
assert.equal(continuity[0].entity, "SalesOrder");
assert.equal(continuity[0].lastEventNo, 2);

(async () => {
  const index = { packs: [
    { file: "sales.json", packId: "bc-sales", enabled: true },
    { file: "customer.local.json", packId: "customer-local", optional: true },
    { file: "broken.json", packId: "broken", enabled: true }
  ] };
  const loaded = await engine.loadKnowledgePacks({ indexUrl: "index.json",
    resolveUrl: value => value, fetchJson: async value => {
      if (value === "index.json") return index;
      if (value === "sales.json") return sales;
      throw new Error("not available");
    } });
  assert.equal(loaded.packs.length, 1);
  assert.ok(loaded.validation.diagnostics.some(item =>
    item.code === "optional-knowledge-pack-unavailable"));
  assert.ok(loaded.validation.diagnostics.some(item =>
    item.code === "knowledge-pack-load-failed"));
  assert.equal(engine.resolvePageIdentity({ pageObjectId: "99999" }).source,
    "runtime-metadata", "one failed pack must not block identification/recording");
  console.log("Knowledge Pack localization and customer extension tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
