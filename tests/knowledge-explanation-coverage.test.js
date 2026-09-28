const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const catalog = require("../src/engine/knowledge-explanation-catalog");
const knowledge = require("../src/engine/knowledge-domain");

const packDir = path.join(__dirname, "..", "src", "knowledge-packs");
const packs = fs.readdirSync(packDir).filter(name => name.endsWith(".json"))
  .map(name => JSON.parse(fs.readFileSync(path.join(packDir, name), "utf8")))
  .filter(pack => pack.rules?.length);
const supportedLocales = ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES",
  "da-DK", "fi-FI", "nb-NO"];
let covered = 0;
for (const pack of packs) {
  for (const rule of pack.rules) {
    if (Number(rule.confidence) < knowledge.EXPLANATION_CONFIDENCE_THRESHOLD ||
        !rule.sourceIds?.length) continue;
    assert.ok(catalog.supports({ ...rule, sourceRefs: rule.sourceIds.map(id =>
      pack.sources?.find(source => source.sourceId === id)).filter(Boolean) }),
    `${rule.ruleId} has a complete localized explanation`);
    const localized = knowledge.localizedExplanations({ ...rule,
      sourceRefs: rule.sourceIds.map(id => pack.sources?.find(source =>
        source.sourceId === id)).filter(Boolean) });
    assert.deepEqual(Object.keys(localized).sort(), [...supportedLocales].sort(),
      `${rule.ruleId} covers all supported interface languages`);
    assert.ok(pack.sources.some(source => rule.sourceIds.includes(source.sourceId) &&
      /^https:\/\/learn\.microsoft\.com\//i.test(source.sourceUri || "")),
    `${rule.ruleId} has an official Microsoft Learn reference`);
    const refs = pack.sources.filter(source => rule.sourceIds.includes(source.sourceId));
    for (const locale of supportedLocales) {
      assert.ok(refs.some(source => source.sourceUri?.toLowerCase()
        .includes(`/${locale.toLowerCase()}/`)),
      `${rule.ruleId} has a localized ${locale} source`);
    }
    covered += 1;
  }
}
assert.ok(covered >= 100, `broad cross-area explanation coverage (${covered})`);

const cases = [
  ["purchase", { taskId: "purchase-release", pageCaption: "Purchase Order",
    entity: "PurchaseOrder", pageIdentificationConfidence: 1,
    actionCaption: "Release", language: "en-US" }, "Purchase.Release"],
  ["warehouse", { taskId: "warehouse-register", pageCaption: "Warehouse Pick",
    entity: "WarehousePick", pageIdentificationConfidence: 1,
    actionCaption: "Register Pick", language: "en-US" }, "Warehouse.RegisterPick"],
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

const cashPack = packs.find(pack => pack.packId === "bc-cash-management");
const cashRule = knowledge.rules([cashPack]).find(rule =>
  rule.ruleId === "CashManagement.SuggestVendorPayments");
const cashTask = { taskId: "cash-suggest", taskType: "RunAction",
  pageCaption: "Payment Journal", entity: "PaymentJournal",
  pageIdentificationConfidence: 1, actionCaption: "Suggest Vendor Payments" };
assert.equal(knowledge.explanationEligible(cashRule, cashTask,
  knowledge.rules([cashPack])), true,
"cash management suggestions receive explanations only on a unique exact match");

const ambiguous = knowledge.apply([{
  taskId: "ambiguous-confirmation", actionCaption: "Yes", language: "en-US"
}], packs.filter(pack => pack.packId === "bc-core").map(pack => ({ ...pack,
  rules: pack.rules.filter(rule => rule.ruleId === "Core.ConfirmYes") }))).tasks[0];
assert.equal(ambiguous?.contextualExplanations, undefined,
  "a confirmation prompt without decision context never receives a generated explanation");

console.log(`Knowledge explanation coverage passed (${covered} sourced rules, eight locales, seven BC areas).`);
