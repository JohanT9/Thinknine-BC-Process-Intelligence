const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const knowledge = require('../src/engine/knowledge-domain');
const repositoryApi = require('../src/engine/knowledge-repository');
const pipeline = require('../src/engine/session-interpretation-pipeline');
const projector = require('../src/document/review-document-projector');
const locales = require('../src/engine/language-registry').supported().map(x => x.locale).sort();
const manifest = require('../src/knowledge-packs/index.json');
const packs = manifest.packs.filter(p => p.enabled).map(p =>
  JSON.parse(fs.readFileSync(path.join(root, 'src', p.file), 'utf8')));
const fixtures = require('./fixtures/quality-management-captions.json');
const imported = repositoryApi.importRelease(manifest, packs.map(pack => ({packId:pack.packId,pack})));
assert.equal(imported.ok, true, JSON.stringify(imported.diagnostics));
const repository = repositoryApi.createRepository(imported.snapshot);
const rules = knowledge.rules(packs);
const fixtureRuleIds = new Set(fixtures.map(f => f.ruleId));
const added = rules.filter(r => fixtureRuleIds.has(r.ruleId));
assert.equal(added.length, 9);
assert.equal(new Set(added.map(r => r.packId)).size, 1);
const copiedTemplate=added.find(r=>r.ruleId==='QualityManagement.CopyInspectionTemplate');
for(const locale of locales){
  assert.ok(copiedTemplate.localizedExplanations[locale].length>300,
    `${locale} template-copy explanation should capture template setup context`);
}
assert.match(copiedTemplate.localizedExplanations['en-US'],/sample size/i);
assert.match(copiedTemplate.localizedExplanations['en-US'],/does not copy existing inspection records or results/i);
assert.match(copiedTemplate.localizedExplanations['sv-SE'],/provstorlek/i);
assert.match(copiedTemplate.localizedExplanations['sv-SE'],/kopierar inte befintliga inspektionsposter eller resultat/i);
for (const rule of added) {
  assert.deepEqual(Object.keys(rule.localizedExplanations).sort(), locales, rule.ruleId);
  const expectedRuntimeLocales = rule.verifiedRuntimeLocales || locales;
  assert.deepEqual([...new Set(fixtures.filter(f => f.ruleId === rule.ruleId).map(f => f.locale))].sort(), expectedRuntimeLocales);
  assert.equal(new Set(Object.values(rule.localizedExplanations)).size, locales.length, 'no English text fallback');
  assert.ok(Object.values(rule.localizedExplanations).every(t => t.length > 70 && !/[\uFFFD]/u.test(t)));
}
for (const [locale, pageCaption, actionCaption] of [
  ['en-US', 'Purchase Order', 'Create Inspection'],
  ['en-US', 'Production Order', 'Create Inspection'],
  ['sv-SE', 'Inköpsorder', 'Skapa inspektion från raden'],
  ['sv-SE', 'Produktionsorder', 'Skapa inspektion från raden']
]) {
  const result = repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
  assert.equal(result.status,'resolved');
  assert.equal(result.candidates[0].provenance.ruleId,'QualityManagement.CreateInspectionFromSourceLine');
}
for (const [locale,pageCaption,actionCaption] of [
  ['en-US','Purchase Order','Show Inspections for Item and Document'],
  ['sv-SE','Inköpsorder','Visa inspektioner för objekt och dokument']
]) {
  const result=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
  assert.equal(result.status,'resolved');
  assert.equal(result.candidates[0].provenance.ruleId,'QualityManagement.ShowPurchaseOrderInspections');
}
for(const [pageCaption,actionCaption] of [
  ['Purchase Orders','Show Inspections for Item and Document'],
  ['Sales Order','Show Inspections for Item and Document'],
  ['Purchase Order','Post']
]) {
  assert.equal(knowledge.score(added.find(r=>r.ruleId==='QualityManagement.ShowPurchaseOrderInspections'),
    {pageCaption,actionCaption,entity:'',context:{}}),0,`${pageCaption} / ${actionCaption} must not match inspection navigation`);
}
for(const [locale,pageCaption,actionCaption,ruleId] of [
  ['en-US','Quality Inspection','Move Inventory','QualityManagement.MoveFailedInspectionInventory'],
  ['sv-SE','Kvalitetsinspektion','Flytta lager','QualityManagement.MoveFailedInspectionInventory'],
  ['en-US','Quality Inspection','Create Negative Adjustment','QualityManagement.CreateNegativeAdjustmentFromInspection'],
  ['sv-SE','Kvalitetsinspektion','Skapa negativ justering','QualityManagement.CreateNegativeAdjustmentFromInspection'],
  ['en-US','Quality Inspection','Change Item Tracking','QualityManagement.ChangeTrackingFromInspection'],
  ['sv-SE','Kvalitetsinspektion','Spåra ändringsobjekt','QualityManagement.ChangeTrackingFromInspection']
]) {
  const result=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
  assert.equal(result.status,'resolved');
  assert.equal(result.candidates[0].provenance.ruleId,ruleId);
}
for(const [pageCaption,actionCaption] of [
  ['Purchase Order','Move Inventory'],
  ['Item Journal','Create Negative Adjustment'],
  ['Item Tracking Lines','Change Item Tracking'],
  ['Quality Inspection Templates','Move Inventory']
]) {
  for(const ruleId of ['QualityManagement.MoveFailedInspectionInventory','QualityManagement.CreateNegativeAdjustmentFromInspection','QualityManagement.ChangeTrackingFromInspection']) {
    assert.equal(knowledge.score(added.find(r=>r.ruleId===ruleId),{pageCaption,actionCaption,entity:'',context:{}}),0,
      `${pageCaption} / ${actionCaption} must not match ${ruleId}`);
  }
}
for (const [pageCaption, actionCaption] of [
  ['Purchase Order','Post'], ['Production Order','Post'], ['Item Journal','Create Inspection'], ['Quality Inspection Templates','Create Inspection']
]) {
  assert.equal(knowledge.score(added.find(r=>r.ruleId==='QualityManagement.CreateInspectionFromSourceLine'),
    {pageCaption,actionCaption,entity:'',context:{}}),0,`${pageCaption} / ${actionCaption} must not match source-line creation`);
}
for (const sample of fixtures) {
  const {ruleId,locale,pageCaption,actionCaption,fieldCaption,sourceId} = sample;
  const observed = {taskId:ruleId+locale, taskType:fieldCaption?'ChangeField':'RunAction',
    pageCaption, actionCaption, fieldCaption, language:locale, confidence:0.53,
    instruction:'User-edited recorded instruction: 300', value:'300',
    screenshots:['screenshots/original.png'], sourceEventIds:['event:original'],
    includeKnowledgeExplanationInWord:false};
  const before = JSON.stringify(observed);
  const result = repository.resolveAction({language:locale,context:{pageCaption,actionCaption,fieldCaption}});
  assert.equal(result.status, 'resolved', `${ruleId} ${locale}`);
  assert.equal(result.candidates[0].provenance.ruleId, ruleId, `${ruleId} ${locale} repository winner`);
  const enriched = knowledge.apply([observed], packs).tasks[0];
  assert.equal(enriched.contextualExplanationRuleId, ruleId, `${ruleId} ${locale} visible explanation`);
  assert.ok(enriched.contextualExplanations[locale]);
  assert.ok(enriched.contextualExplanationSources.some(s=>s.sourceId===sourceId));
  assert.equal(enriched.instruction, observed.instruction);
  assert.equal(enriched.value, observed.value);
  assert.deepEqual(enriched.screenshots, observed.screenshots);
  assert.equal(JSON.stringify(observed), before, 'input is immutable');
  const legacy = pipeline.enrichCompatibilityExplanations([observed], packs)[0];
  assert.equal(legacy.contextualExplanationRuleId, ruleId, `${ruleId} ${locale} saved recording`);
  assert.equal(legacy.confidence, 0.53, 'explanation does not rewrite recording confidence');
  assert.equal(legacy.instruction, observed.instruction);
  assert.equal(legacy.includeKnowledgeExplanationInWord, false);

  const rule = added.find(r=>r.ruleId===ruleId);
  assert.equal(knowledge.score(rule,{...observed,pageCaption:'',entity:'',context:{}}),0,'no page evidence');
  assert.equal(knowledge.score(rule,{...observed,actionCaption:'Unrelated action',fieldCaption:'Unrelated field'}),0,'no control evidence');
  if (!rule.match.pagePatterns.includes('^.+$')) {
    assert.equal(knowledge.score(rule,{...observed,pageCaption:'Unrelated page',entity:'',context:{}}),0,'wrong page');
  }
}

for (const pageCaption of ['Purchase Orders','Inköpsorder','Quality Checks','Kvalitetskontroller','Quality Inspections','']) {
 for (const actionCaption of ['New','Ny','Copy Template']) {
  const task=knowledge.apply([{taskId:'boundary',pageCaption,actionCaption}],packs).tasks[0];
  assert.ok(!String(task.contextualExplanationRuleId).startsWith('QualityManagement.'),pageCaption);
 }
}
assert.ok(!rules.some(rule => rule.ruleId === 'QualityManagement.CreatePurchaseReceiptInspection'),
  'receipt-triggered inspection generation is a conditional posting side effect, not a separate user action');
for (const [locale,pageCaption,actionCaption] of [
  ['en-US','Purchase Order','Post'],['sv-SE','Inköpsorder','Bokför']
]) {
  const result=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
  assert.equal(result.status,'resolved');
  assert.equal(result.candidates[0].provenance.ruleId,'Purchase.Post',
    'standard purchase posting retains the correct action context');
  assert.ok(result.candidates[0].provenance.sourceRefs.some(source =>
    source.sourceId === `purchase-qms-receipt-${locale.toLowerCase()}`),
    'purchase posting explanation cites the conditional QMS effect');
}
const purchasePost=rules.find(rule=>rule.ruleId==='Purchase.Post');
const purchasePostExplanations=knowledge.localizedExplanations(purchasePost);
assert.deepEqual(Object.keys(purchasePostExplanations).sort(),locales,
  'conditional receipt-inspection context is explained in all supported locales');
assert.match(purchasePostExplanations['sv-SE'],/Om Quality Management är installerat/);
assert.match(purchasePostExplanations['en-US'],/If Quality Management is installed/);

const warehouseReceiptCreate = rules.find(rule=>rule.ruleId==='Observed.Purchase.CreateWarehouseReceipt');
const warehouseReceiptPost = rules.find(rule=>rule.ruleId==='Warehouse.PostReceiptAction');
assert.ok(warehouseReceiptCreate && warehouseReceiptPost);
for (const locale of locales) {
  assert.ok(warehouseReceiptCreate.localizedExplanations[locale], `${locale} warehouse receipt creation context`);
  assert.ok(warehouseReceiptPost.localizedExplanations[locale], `${locale} warehouse receipt posting context`);
  assert.equal(warehouseReceiptCreate.sourceIds.filter(id=>id.startsWith('microsoft-learn-qms-purchase-receipt-warehouse-')).length, 8);
  assert.equal(warehouseReceiptPost.sourceIds.filter(id=>id.startsWith('microsoft-learn-qms-purchase-receipt-warehouse-')).length, 8);
}
assert.match(warehouseReceiptCreate.localizedExplanations['en-US'],/does not post the receipt/i);
assert.match(warehouseReceiptCreate.localizedExplanations['sv-SE'],/bokför inte inleveransen/i);
assert.match(warehouseReceiptPost.localizedExplanations['en-US'],/creates quality inspections/i);
assert.match(warehouseReceiptPost.localizedExplanations['sv-SE'],/skapar bokföringen även kvalitetsinspektioner/i);
assert.equal(warehouseReceiptPost.localizedExplanations['en-US'].includes('Microsoft Quality Management is installed'),true);
assert.ok(!knowledge.score(warehouseReceiptPost,{pageCaption:'Purchase Order',actionCaption:'Post',entity:'',context:{}}),
  'warehouse receipt posting explanation must not replace standard purchase order posting');
assert.equal(warehouseReceiptPost.sourceIds.filter(id=>id.startsWith('microsoft-learn-qms-purchase-receipt-warehouse-')).length,8);
const assemblyOutputPost=rules.find(rule=>rule.ruleId==='BCExpansion.PostOrder');
assert.ok(assemblyOutputPost);
assert.deepEqual(Object.keys(assemblyOutputPost.localizedExplanations).sort(),locales);
assert.ok(assemblyOutputPost.sourceIds.includes('microsoft-learn-assembly-qms-trigger-en-us'));
assert.ok(assemblyOutputPost.sourceIds.includes('microsoft-learn-assembly-qms-trigger-sv-se'));
const assemblyPost=repository.resolveAction({language:'en-US',context:{pageCaption:'Assembly Order',actionCaption:'Post'}});
assert.equal(assemblyPost.status,'resolved');
assert.equal(assemblyPost.candidates[0].provenance.ruleId,'BCExpansion.PostOrder');
assert.match(assemblyOutputPost.localizedExplanations['en-US'],/cannot post its output directly/i,
  'linked assemble-to-order has a distinct sales-shipment posting path');
assert.match(assemblyOutputPost.localizedExplanations['sv-SE'],/kan utflödet inte bokföras direkt/);
assert.match(assemblyOutputPost.localizedExplanations['en-US'],/Assembly Trigger is set to When Output is posted/);
const qmsWarehouseSources = packs.find(pack=>pack.packId==='bc-warehouse').sources
  .filter(source=>source.sourceId.startsWith('microsoft-learn-qms-purchase-receipt-warehouse-'));
assert.equal(qmsWarehouseSources.length,8);
for (const source of qmsWarehouseSources) {
  assert.match(source.sourceUri,/learn\.microsoft\.com\/[a-z]{2}-[a-z]{2}/);
  assert.match(source.appliesTo,/tenant version and installed extension remain unverified/i);
}
console.log('Quality Management: localized runtime, repository and legacy cases; context boundaries verified.');
