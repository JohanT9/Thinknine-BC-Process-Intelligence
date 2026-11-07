// Localized Business Central captions taken from Microsoft's own translation files (see the
// fixture's source) must be recognized in every interface language exactly as the English
// captions of the same objects are: the same rule wins, unless two different actions share
// one translation in a language, which is then reported as ambiguous instead of guessed.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const knowledge = require("../src/engine/knowledge-domain");
const repositoryApi = require("../src/engine/knowledge-repository");
const languages = require("../src/engine/language-registry");

const root = path.resolve(__dirname, "..");
const manifest = require("../src/knowledge-packs/index.json");
const packs = manifest.packs.filter(item => item.enabled).map(item =>
  JSON.parse(fs.readFileSync(path.join(root, "src", item.file), "utf8")));
const imported = repositoryApi.importRelease(manifest, packs.map(pack => ({ packId: pack.packId, pack })));
assert.equal(imported.ok, true, JSON.stringify(imported.diagnostics));
const repository = repositoryApi.createRepository(imported.snapshot);
const rules = knowledge.rules(packs);
const fixture = require("./fixtures/knowledge-localized-captions.json");
const locales = languages.supported().map(item => item.locale).sort();

assert.match(fixture.source, /Business Central 28\.1\.\d+\.\d+ .*translation files/u);
assert.ok(fixture.cases.length >= 800, "the fixture covers the sourced rules");
const byRule = new Map();
for (const item of fixture.cases) {
  assert.ok(item.pageUnit && (item.actionCaption || item.fieldCaption ? item.controlUnit : true),
    `${item.ruleId} ${item.locale} names its translation units`);
  if (!byRule.has(item.ruleId)) byRule.set(item.ruleId, new Map());
  byRule.get(item.ruleId).set(item.locale, item);
}
const key = item => [item.locale, item.pageCaption, item.actionCaption || "", item.fieldCaption || ""]
  .join("\u001f").toLowerCase();
const sharedCaptions = new Map();
fixture.cases.forEach(item => {
  if (!sharedCaptions.has(key(item))) sharedCaptions.set(key(item), new Set());
  sharedCaptions.get(key(item)).add(item.ruleId);
});
const context = item => ({ pageCaption: item.pageCaption, actionCaption: item.actionCaption,
  fieldCaption: item.fieldCaption });

let resolved = 0;
for (const [ruleId, cases] of byRule) {
  const rule = rules.find(item => item.ruleId === ruleId);
  assert.ok(rule, `${ruleId} exists`);
  assert.deepEqual([...cases.keys()].sort(), locales, `${ruleId} has a case in every language`);
  if (rule.verifiedRuntimeLocales) {
    assert.deepEqual([...rule.verifiedRuntimeLocales].sort(), locales,
      `${ruleId} lists every language it is verified in`);
  }
  const english = repository.resolveAction({ language: "en-US", context: context(cases.get("en-US")) });
  const englishWinner = english.status === "resolved" ? english.candidates[0].provenance.ruleId : "";
  for (const [locale, item] of cases) {
    assert.ok(knowledge.score(rule, { ...context(item), language: locale }, packs) > 0,
      `${ruleId} ${locale} matches ${item.pageCaption} / ${item.actionCaption || item.fieldCaption || ""}`);
    const result = repository.resolveAction({ language: locale, context: context(item) });
    if (sharedCaptions.get(key(item)).size > 1) {
      const shared = sharedCaptions.get(key(item));
      assert.ok(result.status === "ambiguous" || (result.status === "resolved" &&
        shared.has(result.candidates[0].provenance.ruleId)),
        `${ruleId} ${locale} shares its captions with ${[...shared].join(", ")}`);
      continue;
    }
    assert.equal(result.status, english.status, `${ruleId} ${locale} resolves as in English`);
    if (englishWinner) {
      assert.equal(result.candidates[0].provenance.ruleId, englishWinner, `${ruleId} ${locale} winner`);
      resolved++;
    }
  }
}
// Business Central's own captions replace earlier guesses where they differ: the cost
// accounting transfer batch job is recognized by its product caption.
const transfer = repository.resolveAction({ language: "sv-SE", context: {
  pageCaption: "Överför redovisningstransaktioner till kostnadsredovisning", actionCaption: "Ja" } });
assert.ok(["resolved", "ambiguous"].includes(transfer.status));
assert.ok(rules.find(item => item.ruleId === "CostAccounting.TransferGeneralLedgerEntries")
  .match.pagePatterns.includes("^Överför redovisningstransaktioner till kostnadsredovisning$"));
// A caption from another language does not match a rule by accident in an unrelated page.
const unrelated = repository.resolveAction({ language: "de-DE", context: {
  pageCaption: "Nicht verwandte Seite", actionCaption: "Lagerkommissionierung erstellen" } });
assert.notEqual(unrelated.status === "resolved" && unrelated.candidates[0].provenance.ruleId,
  "Projects.CreateProjectInventoryPick");
console.log(`Localized caption tests passed (${byRule.size} rules, ${fixture.cases.length} cases, ${resolved} resolved as in English).`);
