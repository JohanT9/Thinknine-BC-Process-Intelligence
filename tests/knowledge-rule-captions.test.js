// The knowledge rules know Business Central's own captions of their pages, actions and fields in
// every registered language, and their AL names (engine/knowledge-captions.js,
// knowledge-packs/generated/bc-rule-captions.json): a step recorded in any language, or one known
// only by its AL identity, finds the same rule as in English, while a caption on an unrelated page
// does not. An app the user adds under Settings gives its own pages' captions the same way.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const JSZip = require("jszip");
const repositoryApi = require("../src/engine/knowledge-repository");
const knowledge = require("../src/engine/knowledge-domain");
const captions = require("../src/engine/knowledge-captions");
const appErrors = require("../src/bug-report/app-errors");
const languages = require("../src/engine/language-registry");

const root = path.resolve(__dirname, "..");
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, "src", file), "utf8"));
const table = readJson("document/bc-captions.json");
const generated = readJson("knowledge-packs/generated/bc-rule-captions.json");
const locales = languages.supported().map(item => item.locale);

(async () => {
  // The generated file matches the caption table it was built from, in every language.
  assert.equal(generated.schema, 1);
  assert.equal(generated.version, table.version);
  assert.deepEqual([...generated.locales].sort(), [...locales].sort());

  const load = apps => repositoryApi.load({ indexUrl: "knowledge-packs/index.json",
    fetchJson: async url => readJson(url), apps });
  const loaded = await load();
  assert.equal(loaded.ok, true, JSON.stringify(loaded.diagnostics));
  const packs = loaded.snapshot.packs;
  const rules = knowledge.rules(packs);
  const withCaptions = rules.filter(rule => rule.bcCaptions);
  assert.ok(withCaptions.length >= 200, `most rules know Microsoft's captions (${withCaptions.length})`);

  // Without the generated file the packs load as written.
  const plain = await repositoryApi.load({ indexUrl: "knowledge-packs/index.json",
    fetchJson: async url => { if (url.includes("generated")) throw new Error("missing"); return readJson(url); } });
  assert.equal(plain.ok, true);
  assert.equal(knowledge.rules(plain.snapshot.packs).some(rule => rule.bcCaptions), false);

  const row = key => table.rows[table.keys[key]];
  const winner = task => knowledge.match(task, rules, packs)?.rule.ruleId || "";

  // Every rule with Microsoft's page and action: the page and action as Business Central names
  // them in each language find the rule, and so do their AL names alone.
  let checked = 0;
  for (const rule of withCaptions) {
    const page = rule.bcCaptions.page?.keys[0];
    const action = rule.bcCaptions.action?.keys.find(key => !key.includes("|*|") &&
      key.startsWith(`a|${page?.slice(2)}|`));
    if (!page || !action || rule.match.fieldPatterns.length || rule.match.automationIdPatterns.length) continue;
    locales.forEach(locale => {
      const position = table.locales.indexOf(locale);
      const pageCaption = row(page)[position];
      const actionCaption = row(action)[position];
      if (!pageCaption || !actionCaption) return;
      assert.ok(knowledge.score(rule, { taskType: rule.taskType, pageCaption, actionCaption, language: locale }, packs) > 0,
        `${rule.ruleId} ${locale}: "${pageCaption}" / "${actionCaption}"`);
      checked += 1;
    });
    assert.ok(knowledge.score(rule, { taskType: rule.taskType, pageCaption: "?", actionCaption: "?",
      language: "fi-FI", semanticActionModel: { captionKeys: { page, action } } }, packs) > 0,
    `${rule.ruleId} is found by its AL names ${page} and ${action}`);
    checked += 1;
  }
  assert.ok(checked >= 300, `page and action captions checked (${checked})`);

  // Business Central's own words where the written patterns had other ones.
  assert.equal(winner({ taskType: "RunAction", pageCaption: "Verkaufsauftrag", actionCaption: "Freigeben", language: "de-DE" }),
    "Sales.Release");
  assert.equal(winner({ taskType: "RunAction", pageCaption: "Pedido venta", actionCaption: "Lanzar", language: "es-ES" }),
    "Sales.Release");
  assert.equal(winner({ taskType: "SetField", pageCaption: "Salgsordre", fieldCaption: "Debitornavn", language: "da-DK" }),
    "Sales.SelectCustomer");
  assert.equal(winner({ taskType: "SetField", pageCaption: "?", fieldCaption: "?", language: "fi-FI",
    semanticActionModel: { captionKeys: { page: "p|Sales Order", field: "f|Sales Order|Sell-to Customer No." } } }),
  "Sales.SelectCustomer");

  // An action's caption counts on its own page: in German, Lagerkommissionierung erstellen is
  // Create Inventory Pick on the project card and Create Warehouse Pick on the project list.
  assert.equal(winner({ taskType: "RunAction", pageCaption: "Projektkarte",
    actionCaption: "Lagerkommissionierung erstellen", language: "de-DE" }), "Projects.CreateProjectInventoryPick");
  const warehousePick = rules.find(rule => rule.ruleId === "Projects.CreateProjectWarehousePick");
  assert.equal(knowledge.score(warehousePick, { taskType: "RunAction", pageCaption: "Projektkarte",
    actionCaption: "Lagerkommissionierung erstellen", language: "de-DE" }, packs), 0);

  // A caption does not reach past the rule's pages, and an AL name that means something else on
  // other pages (Action21, Type) does not stand for the rule everywhere.
  const release = rules.find(rule => rule.ruleId === "Sales.Release");
  assert.equal(knowledge.score(release, { taskType: "RunAction", pageCaption: "Nicht verwandte Seite",
    actionCaption: "Freigeben", language: "de-DE" }, packs), 0);
  for (const rule of withCaptions) {
    for (const kind of ["action", "field"]) {
      for (const key of rule.bcCaptions[kind]?.keys || []) {
        assert.doesNotMatch(key, /\|\*\|(?:Action|Control|Category_Category)\d+$/u, `${rule.ruleId} ${key}`);
      }
    }
  }

  // A partner app the user added: its own pages' captions in each language it is translated to.
  // The app and its Swedish captions are made up for the test.
  const unit = (id, note, source, target) => `<trans-unit id="${id}"><source>${source}</source>` +
    (target ? `<target>${target}</target>` : "") + `<note from="Xliff Generator" annotates="general">${note}</note></trans-unit>`;
  const xlf = sv => `<?xml version="1.0" encoding="utf-8"?><xliff version="1.2"><file target-language="${sv ? "sv-SE" : "en-US"}"><body><group id="body">` +
    unit("Page 1", "Page Harvest Order - Property Caption", "Harvest Order", sv && "Testskördeorder") +
    unit("Page 2", "Page Harvest Order - Action CreatePurchaseContract - Property Caption", "Create Purchase &amp;Contract", sv && "Skapa test&amp;kontrakt") +
    "</group></body></file></xliff>";
  const zip = new JSZip();
  zip.file("NavxManifest.xml", `<Package><App Id="2" Name="Test Harvest App" Publisher="Test Partner" Version="1.0.0.0" /></Package>`);
  zip.file("Translations/Harvest.g.xlf", xlf(false));
  zip.file("Translations/Harvest.sv-SE.xlf", xlf(true));
  zip.file("src/HarvestOrder.Page.al", `page 50200 "Harvest Order"\n{\n    actions\n    {\n        area(Processing)\n        {\n            action(CreatePurchaseContract)\n            {\n            }\n        }\n    }\n}\n`);
  const data = await zip.generateAsync({ type: "uint8array" });
  const app = await appErrors.readUserApp(data, { locales, fileName: "Harvest.app" });
  assert.equal(app.errorCount, 0);
  assert.equal(app.captionCount, 2);
  assert.deepEqual(app.captions.locales.slice(0, 2), ["en-US", "sv-SE"]);
  assert.deepEqual(app.captions.rows[app.captions.keys["a|Harvest Order|CreatePurchaseContract"]].slice(0, 2),
    ["Create Purchase Contract", "Skapa testkontrakt"]);

  const ruleId = "Aptean.CreatePurchaseContractFromHarvest";
  const swedish = { taskType: "RunAction", pageCaption: "Testskördeorder", actionCaption: "Skapa testkontrakt", language: "sv-SE" };
  const before = rules.find(rule => rule.ruleId === ruleId);
  assert.equal(knowledge.score(before, swedish, packs), 0, "the written English patterns alone do not know the Swedish captions");
  const withApp = await load([app]);
  assert.equal(withApp.ok, true);
  const appRules = knowledge.rules(withApp.snapshot.packs);
  const after = appRules.find(rule => rule.ruleId === ruleId);
  assert.deepEqual(after.appCaptions.action.keys, ["a|Harvest Order|CreatePurchaseContract"]);
  assert.ok(knowledge.score(after, swedish, withApp.snapshot.packs) > 0, "the app's Swedish captions find its rule");
  assert.ok(knowledge.score(after, { taskType: "RunAction", pageCaption: "?", actionCaption: "?", language: "en-US",
    semanticActionModel: { captionKeys: { page: "p|Harvest Order", action: "a|Harvest Order|CreatePurchaseContract" } } },
  withApp.snapshot.packs) > 0, "the app's AL names find its rule");

  // The settings' storage gives the apps with captions; a stored app without them is left out.
  const storage = { get: async key => ({ [key]: { version: 1, apps: [app, { name: "old", table: {} }] } }) };
  assert.deepEqual((await captions.loadUserApps(storage)).map(item => item.name), ["Test Harvest App"]);
  assert.deepEqual(await captions.loadUserApps({ get: async () => { throw new Error("denied"); } }), []);

  console.log(`Knowledge rule captions verified: ${withCaptions.length} rules, ${checked} page and action checks in ${locales.length} languages, user app captions.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
