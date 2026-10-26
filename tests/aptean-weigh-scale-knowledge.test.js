const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const knowledge = require("../src/engine/knowledge-domain");
const registry = require("../src/engine/language-registry");

const packDir = path.join(__dirname, "..", "src", "knowledge-packs");
const read = name => JSON.parse(fs.readFileSync(path.join(packDir, name), "utf8"));
const pack = read("aptean-weigh-scale.json");
const warehouse = read("warehouse.json");
const index = read("index.json");
const allPacks = index.packs.filter(item => item.enabled)
  .map(item => read(path.basename(item.file)));
const locales = registry.supported("ui").map(item => item.locale).sort();

// The Aptean weigh-scale knowledge is its own section, outside the Microsoft packs.
assert.ok(index.packs.some(item => item.packId === "aptean-weigh-scale" && item.enabled));
assert.equal(pack.packId, "aptean-weigh-scale");
assert.deepEqual(pack.modules.map(module => module.code), ["WSC", "SCI", "WBR"]);
assert.ok(pack.documentationGaps.length >= 3, "unverified captions and sources are recorded");
assert.ok(!warehouse.sources.some(source => /apteancloud/u.test(source.sourceUri)),
  "the Microsoft warehouse pack no longer carries Aptean sources");
assert.ok(!warehouse.rules.some(rule => /Weight|HandlingUnit|DeliveryUnit/u.test(rule.ruleId) &&
  rule.ruleId.startsWith("Observed.Warehouse.")), "weigh-scale rules moved out of the warehouse pack");

// Stable IDs: rules that recordings may reference keep their IDs.
for (const ruleId of ["Observed.Warehouse.RegisterWeight", "Observed.Warehouse.ManualWeight",
  "Observed.Warehouse.EnterScaleWeight", "Observed.Warehouse.SaveWeightRegistration",
  "Observed.Warehouse.SelectHandlingUnitCode", "Observed.Warehouse.SelectDeliveryUnitCode",
  "Observed.Warehouse.SetDeliveryUnitCount", "Observed.Warehouse.CreateHandlingUnit"]) {
  assert.ok(pack.rules.some(rule => rule.ruleId === ruleId), `${ruleId} keeps its ID`);
}

const sourceById = new Map(pack.sources.map(source => [source.sourceId, source]));
for (const source of pack.sources) {
  assert.match(source.sourceUri, /^https:\/\/erpdocs\.apteancloud\.com\/bc\/docs\/(?:WSC|SCI|WBR)\//u,
    `${source.sourceId} points to a public Aptean article`);
  assert.equal(source.sourceType, "vendor-documentation");
  assert.match(source.accessedDate, /^\d{4}-\d{2}-\d{2}$/u);
  assert.ok(source.fields.length, `${source.sourceId} records what the article states`);
}
for (const rule of pack.rules) {
  const sources = rule.sourceIds.map(id => sourceById.get(id));
  assert.ok(sources.every(Boolean), `${rule.ruleId} cites only sources in this pack`);
  const explanations = knowledge.localizedExplanations({ ...rule, sourceRefs: sources });
  assert.deepEqual(Object.keys(explanations).sort(), locales, `${rule.ruleId} covers every UI language`);
  if (!rule.ruleId.startsWith("Observed.")) {
    assert.equal(new Set(Object.values(explanations)).size, locales.length,
      `${rule.ruleId} has a distinct translation per language`);
    // New rules match only captions that the cited Aptean articles document.
    const documented = new Set(sources.flatMap(source => source.documentedCaptions));
    for (const pattern of rule.match.actionPatterns) {
      const caption = pattern.replace(/^\^|\$$/gu, "").replace(/\\\.\?/gu, ".").replace(/\\/gu, "");
      assert.ok(documented.has(caption), `${rule.ruleId} matches documented caption ${caption}`);
    }
  }
}

function resolve(task) {
  return knowledge.apply([{ taskId: "t", taskType: "RunAction", language: "en-US", ...task }],
    allPacks).tasks[0].knowledgeRule;
}
assert.equal(resolve({ pageCaption: "Weigh Scale Registration", actionCaption: "Get Weight" }),
  "AptWeighScale.GetWeight");
assert.equal(resolve({ pageCaption: "Weighbridge Ticket", actionCaption: "Get Weight" }),
  "AptWeighbridge.GetWeight", "the same caption on the weighbridge ticket is a different action");
assert.equal(resolve({ pageCaption: "Weigh Scale Registration", actionCaption: "Fill Weight Manually" }),
  "AptWeighScale.FillWeightManually");
assert.equal(resolve({ pageCaption: "Weigh Scale Registration", actionCaption: "Save" }),
  "AptWeighScale.SaveRegistration");
assert.notEqual(resolve({ pageCaption: "Sales Order", actionCaption: "Save" }),
  "AptWeighScale.SaveRegistration", "Save elsewhere is not a weigh-scale registration");
assert.equal(resolve({ pageCaption: "Warehouse Shipment", actionCaption: "Register Weight" }),
  "AptWeighScale.RegisterWeightShipment");
assert.equal(resolve({ pageId: "5768", pageCaption: "Warehouse Receipt", entity: "WarehouseReceipt",
  actionCaption: "Register Weight" }), "Observed.Warehouse.RegisterWeight");
assert.equal(resolve({ pageCaption: "Warehouse Receipt", actionCaption: "Transfer Weigh Scale Entries" }),
  "AptWeighScale.TransferWeighScaleEntries");
assert.equal(resolve({ pageCaption: "Weighbridge Ticket", actionCaption: "Post Quantity To Receive" }),
  "AptWeighbridge.PostQuantityToReceive");

const posted = knowledge.apply([{ taskId: "p", taskType: "RunAction", language: "sv-SE",
  pageCaption: "Weighbridge Ticket", actionCaption: "Create Inbound Register" }], allPacks).tasks[0];
assert.equal(posted.contextualExplanationBasis, "vendor-documentation");
assert.match(posted.contextualExplanations["sv-SE"], /Inbound Registered/u);
assert.ok(posted.contextualExplanationSources.every(source =>
  source.sourceUri.includes("/bc/docs/WBR/")));

console.log(`Aptean weigh scale knowledge tests passed (${pack.rules.length} rules, ${pack.sources.length} sources).`);
