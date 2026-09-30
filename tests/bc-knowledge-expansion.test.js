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
const fixtures = require('./fixtures/bc-expansion-captions.json');
const imported = repositoryApi.importRelease(manifest, packs.map(pack => ({packId:pack.packId,pack})));
assert.equal(imported.ok, true, JSON.stringify(imported.diagnostics));
const repository = repositoryApi.createRepository(imported.snapshot);
const rules = knowledge.rules(packs);
const added = rules.filter(r => r.ruleId.startsWith('BCExpansion.'));
assert.equal(added.length, 38);
assert.equal(new Set(added.map(r => r.packId)).size, 10);
const assemblyPack=packs.find(p=>p.packId==='bc-assembly');
const assemblyPolicy=assemblyPack.rules.find(r=>r.ruleId==='BCAssembly.AssemblyPolicyContext');
assert.deepEqual(assemblyPolicy.verifiedRuntimeLocales,['en-US','sv-SE']);
assert.deepEqual(assemblyPack.sourceLocaleGaps['microsoft-learn-assembly-policy-fi-fi'],['fi-FI']);
assert.match(assemblyPolicy.localizedExplanations['sv-SE'],/en-till-en/i);
assert.match(assemblyPolicy.localizedExplanations['sv-SE'],/lager/i);
assert.match(assemblyPolicy.localizedExplanations['sv-SE'],/försäljningsorder/i);
assert.ok(assemblyPolicy.sourceIds.length===8);
assert.notEqual(assemblyPolicy.localizedExplanations['en-US'],assemblyPolicy.localizedExplanations['sv-SE']);
assert.notEqual(knowledge.apply([{taskId:'wrong-assembly-policy',pageCaption:'Sales Order',fieldCaption:'Assembly Policy'}],packs).tasks[0].contextualExplanationRuleId,'BCAssembly.AssemblyPolicyContext');
const microsoft365Pack=packs.find(p=>p.packId==='bc-microsoft365');
const approvalsPack=packs.find(p=>p.packId==='bc-approvals');
for(const ruleId of ['BCExpansion.ApproveRequest','BCExpansion.RejectRequest','BCExpansion.DelegateRequest','BCExpansion.SendApproval','BCExpansion.CancelApproval']){
  const rule=approvalsPack.rules.find(r=>r.ruleId===ruleId);
  for(const locale of locales) assert.ok(rule.localizedExplanations[locale].length>250,`${ruleId} ${locale} should describe its workflow context`);
}
const sendApprovalRule=approvalsPack.rules.find(r=>r.ruleId==='BCExpansion.SendApproval');
const cancelApprovalRule=approvalsPack.rules.find(r=>r.ruleId==='BCExpansion.CancelApproval');
for(const [rule,page,action] of [
  [sendApprovalRule,'Purchase Order','Send Approval Request'],
  [cancelApprovalRule,'Inköpsorder','Avbryt godkännandebegäran']
]) assert.ok(knowledge.score(rule,{pageCaption:page,actionCaption:action,entity:'',context:{}})>0);
for(const [rule,page,action] of [
  [sendApprovalRule,'Item List','Send Approval Request'],
  [cancelApprovalRule,'Item Journal','Cancel Approval Request']
]) assert.equal(knowledge.score(rule,{pageCaption:page,actionCaption:action,entity:'',context:{}}),0,
  `${rule.ruleId} must remain within supported document contexts`);
const bankPack=packs.find(p=>p.packId==='bc-bank-reconciliation');
for(const ruleId of ['BCExpansion.ImportStatement','BCExpansion.MatchAutomatically','BCExpansion.MatchManually']){
  const rule=bankPack.rules.find(r=>r.ruleId===ruleId);
  for(const locale of locales) assert.ok(rule.localizedExplanations[locale].length>300,
    `${ruleId} ${locale} should cover the reconciliation decision context`);
}
const inventoryPack=packs.find(p=>p.packId==='bc-inventory');
for(const ruleId of ['BCExpansion.CalculateInventory','BCExpansion.CountedQuantity','BCExpansion.PostPhysicalInventory']){
  const rule=inventoryPack.rules.find(r=>r.ruleId===ruleId);
  const minimum=ruleId==='BCExpansion.CalculateInventory'?140:180;
  for(const locale of locales) assert.ok(rule.localizedExplanations[locale].length>minimum,
    `${ruleId} ${locale} should distinguish counted values from posted adjustments`);
}
assert.match(inventoryPack.rules.find(r=>r.ruleId==='BCExpansion.PostPhysicalInventory').localizedExplanations['sv-SE'],/skillnader mellan beräknat och faktiskt inventerat/i);
assert.match(inventoryPack.rules.find(r=>r.ruleId==='BCExpansion.PostPhysicalInventory').localizedExplanations['sv-SE'],/distributionslager har ett separat/i);
for(const [ruleId,page,action,locale] of [
  ['BCExpansion.OpenExcel','Purchase Orders','Open in Excel','en-US'],
  ['BCExpansion.EditExcel','Inköpsorder','Redigera i Excel','sv-SE'],
  ['BCExpansion.ShareTeams','Purchase Order','Dela till Teams','sv-SE'],
  ['BCExpansion.OpenOneDrive','Purchase Invoice','Öppna i OneDrive','sv-SE'],
  ['BCExpansion.InstallOutlook','Configure Outlook','Install to my Outlook','en-US']]) {
  const task=knowledge.apply([{taskId:'m365:'+ruleId,pageCaption:page,actionCaption:action,language:locale}],packs).tasks[0];
  assert.equal(task.contextualExplanationRuleId,ruleId,`${ruleId} should resolve with page and action context`);
  assert.ok(task.contextualExplanations[locale]);
}
for(const [ruleId,page,action] of [
  ['BCExpansion.ShareTeams','Configure Outlook','Share to Teams'],
  ['BCExpansion.OpenOneDrive','Configure Outlook','Open in OneDrive']]) {
  const task=knowledge.apply([{taskId:'wrong:'+ruleId,pageCaption:page,actionCaption:action}],packs).tasks[0];
  assert.notEqual(task.contextualExplanationRuleId,ruleId,`${ruleId} must not match an unrelated configuration page`);
}
assert.match(microsoft365Pack.rules.find(r=>r.ruleId==='BCExpansion.OpenExcel').localizedExplanations['sv-SE'],/publiceras inte tillbaka/i);
assert.match(microsoft365Pack.rules.find(r=>r.ruleId==='BCExpansion.EditExcel').localizedExplanations['sv-SE'],/publiceras tillbaka/i);
const oneDrive=microsoft365Pack.rules.find(r=>r.ruleId==='BCExpansion.OpenOneDrive');
for(const locale of locales){
  const explanation=oneDrive.localizedExplanations[locale];
  assert.ok(explanation.length>250,`${locale} OneDrive explanation should capture file-copy context`);
}
assert.match(oneDrive.localizedExplanations['en-US'],/copies the selected file/i);
assert.match(oneDrive.localizedExplanations['en-US'],/separate Share action/i);
assert.match(oneDrive.localizedExplanations['sv-SE'],/kopierar den valda filen/i);
assert.match(oneDrive.localizedExplanations['sv-SE'],/separata åtgärden Dela/i);
const edocumentPack=packs.find(p=>p.packId==='bc-electronic-documents');
const edocumentLogs=edocumentPack.rules.find(r=>r.ruleId==='BCExpansion.ViewLogs');
for(const locale of locales){
  const explanation=edocumentLogs.localizedExplanations[locale];
  assert.ok(explanation.length>300,`${locale} e-document communication logs should explain diagnostic context`);
  assert.match(explanation,/XML|xml/i,`${locale} includes a file-inspection next step`);
}
const hrPack=packs.find(p=>p.packId==='bc-human-resources');
const absenceEntry=hrPack.rules.find(r=>r.ruleId==='BCExpansion.RegisterAbsence');
const employeeTemplate=hrPack.rules.find(r=>r.ruleId==='BCExpansion.ApplyEmployeeTemplate');
for(const locale of locales){
  assert.ok(absenceEntry.localizedExplanations[locale].length>260,`${locale} absence-entry explanation should capture HR context`);
  assert.ok(employeeTemplate.localizedExplanations[locale].length>280,`${locale} template explanation should describe affected personnel records`);
}
assert.match(absenceEntry.localizedExplanations['sv-SE'],/beviljar inte ledighet/i);
assert.match(employeeTemplate.localizedExplanations['sv-SE'],/ersätta personaluppgifter/i);
const sustainabilityPack=packs.find(p=>p.packId==='bc-sustainability');
const sustainabilityRules=sustainabilityPack.rules.filter(r=>r.ruleId.startsWith('Sustainability.'));
assert.equal(sustainabilityRules.length,4);
for(const rule of sustainabilityRules){
  assert.deepEqual(rule.verifiedRuntimeLocales,['en-US','sv-SE']);
  assert.match(rule.localizedExplanations['sv-SE'],/journal|konto|underkategori|faktor/i);
  assert.ok(rule.sourceIds.includes('microsoft-learn-expansion-finance-sustainability-accounts-ledger-en-us'));
  assert.ok(rule.sourceIds.includes('microsoft-learn-expansion-finance-sustainability-accounts-ledger-sv-se'));
}
const collectGL=sustainabilityRules.find(r=>r.ruleId==='Sustainability.CollectAmountFromGLEntries');
assert.ok(collectGL);
assert.ok(collectGL.sourceIds.includes('microsoft-learn-expansion-finance-sustainability-journal-en-us'));
assert.ok(collectGL.sourceIds.includes('microsoft-learn-expansion-finance-sustainability-journal-sv-se'));
assert.match(collectGL.localizedExplanations['sv-SE'],/absolutvärden/i);
for (const rule of added) {
  assert.deepEqual(Object.keys(rule.localizedExplanations).sort(), locales, rule.ruleId);
  const expectedRuntimeLocales = rule.verifiedRuntimeLocales || locales;
  assert.deepEqual([...new Set(fixtures.filter(f => f.ruleId === rule.ruleId).map(f => f.locale))].sort(), expectedRuntimeLocales);
  assert.equal(new Set(Object.values(rule.localizedExplanations)).size, locales.length, 'no English text fallback');
  assert.ok(Object.values(rule.localizedExplanations).every(t => t.length > 70 && !/[\uFFFD]/u.test(t)));
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

  const rule = rules.find(r=>r.ruleId===ruleId);
  assert.equal(knowledge.score(rule,{...observed,pageCaption:'',entity:'',context:{}}),0,'no page evidence');
  assert.equal(knowledge.score(rule,{...observed,actionCaption:'Unrelated action',fieldCaption:'Unrelated field'}),0,'no control evidence');
  if (!rule.match.pagePatterns.includes('^.+$') && !rule.match.pagePatterns.some(p=>p.startsWith('^(?!')) && !['BCExpansion.OpenExcel','BCExpansion.EditExcel'].includes(rule.ruleId)) {
    assert.equal(knowledge.score(rule,{...observed,pageCaption:'Unrelated page',entity:'',context:{}}),0,'wrong page');
  }
}
// Independent, hand-picked boundary cases: common captions cannot leak between domains.
for (const [page,field] of [['Sales Order','Quantity'],['Purchase Order','Quantity'],['Assembly Order','Quantity'],['Item Journal','Quantity']]) {
  const task=knowledge.apply([{taskId:'quantity',pageCaption:page,fieldCaption:field}],packs).tasks[0];
  assert.notEqual(task.contextualExplanationRuleId,'BCExpansion.CountedQuantity');
  assert.notEqual(task.contextualExplanationRuleId,'BCExpansion.QuantityToAssemble');
}
for(const [pageId,pageCaption,actionCaption,expected] of [['379','Bank Acc. Reconciliation','Match Automatically','BCExpansion.MatchAutomatically'],['379','Bank Acc. Reconciliation','Import Bank Statement','BCExpansion.ImportStatement']]){
  assert.equal(knowledge.apply([{taskId:'bank-page-id',pageId,pageCaption,actionCaption}],packs).tasks[0].contextualExplanationRuleId,expected,
    'bank reconciliation action remains bound to its standard page ID');
}
assert.notEqual(knowledge.apply([{taskId:'payment',pageCaption:'Payment Reconciliation Journal',actionCaption:'Post'}],packs).tasks[0].knowledgeRule,'BCExpansion.PostReconciliation');
assert.notEqual(knowledge.apply([{taskId:'whse',pageCaption:'Warehouse Physical Inventory Journal',actionCaption:'Post'}],packs).tasks[0].knowledgeRule,'BCExpansion.PostPhysicalInventory');
for (const [page,action,expected] of [
  ['Sustainability Account Categories','New','Sustainability.CreateAccountCategory'],
  ['Kategorier för hållbarhetskonto','Ny','Sustainability.CreateAccountCategory'],
  ['Sustainability Account Subcategories','New','Sustainability.CreateAccountSubcategory'],
  ['Underkategorier för hållbarhetskonto','Ny','Sustainability.CreateAccountSubcategory']]) {
  const task=knowledge.apply([{taskId:'sustainability-setup',pageCaption:page,actionCaption:action}],packs).tasks[0];
  assert.equal(task.contextualExplanationRuleId,expected);
}
for (const [page,action,locale] of [
  ['Sustainability Journal','Collect Amount from G/L Entries','en-US'],
  ['Hållbarhetsjournal','Samla in belopp från huvudbokstransaktioner','sv-SE']]) {
  const task=knowledge.apply([{taskId:'sustainability-gl-collect',pageCaption:page,actionCaption:action,language:locale}],packs).tasks[0];
  assert.equal(task.contextualExplanationRuleId,'Sustainability.CollectAmountFromGLEntries');
}
assert.notEqual(knowledge.apply([{taskId:'wrong-collect',pageCaption:'General Journal',actionCaption:'Collect Amount from G/L Entries'}],packs).tasks[0].contextualExplanationRuleId,'Sustainability.CollectAmountFromGLEntries');
for (const [page,field,locale] of [['Purchase Order','Sustainability Account No.','en-US'],['Purchase Invoice','Emission CO2','en-US'],['Inköpsorder','Hållbarhetskontonr.','sv-SE'],['Inköpsfaktura','Utsläpp CO2','sv-SE']]) {
  const task=knowledge.apply([{taskId:'purchase-emissions',pageCaption:page,fieldCaption:field,language:locale}],packs).tasks[0];
  assert.equal(task.contextualExplanationRuleId,'Sustainability.EnterPurchaseDocumentEmissions');
}
assert.notEqual(knowledge.apply([{taskId:'wrong-purchase-emissions',pageCaption:'Sales Order',fieldCaption:'Sustainability Account No.'}],packs).tasks[0].contextualExplanationRuleId,'Sustainability.EnterPurchaseDocumentEmissions');
assert.equal(knowledge.apply([{taskId:'wrong-new',pageCaption:'Purchase Orders',actionCaption:'New'}],packs).tasks[0].contextualExplanationRuleId,'Purchase.CreatePurchaseOrderFromList');
const trackingPack=packs.find(p=>p.packId==='bc-inventory-tracking');
const reclassifyTracking=trackingPack.rules.find(r=>r.ruleId==='InventoryTracking.ReclassifyLotOrSerialNumber');
assert.deepEqual(reclassifyTracking.verifiedRuntimeLocales,['en-US','sv-SE']);
for(const locale of locales){
  const explanation=reclassifyTracking.localizedExplanations[locale];
  assert.match(explanation,/entire lot|hela partiet|lot entier|ganze Charge|lote completo|hele lotten|koko erä|hele partiet/i,
    `${locale} explains the whole-lot date-change constraint`);
  assert.match(explanation,/blank|tomt|vide|leer|vacía|tom|tyhjä|tom/i,
    `${locale} warns that a blank new expiration date clears it`);
  assert.match(explanation,/information cards|Informationskort|fiches d’informations|Infokarten|fichas informativas|Informationskort|Tietokortilla|Informasjonskort/i,
    `${locale} distinguishes info-card edits from reclassification`);
}
assert.equal(knowledge.score(reclassifyTracking,{pageCaption:'Item Reclassification Journals',actionCaption:'Post',entity:'',context:{}}),0,
  'editing tracking lines must not steal journal posting');
assert.equal(knowledge.score(reclassifyTracking,{pageCaption:'Item Tracking Lines',actionCaption:'Assign Lot No.',entity:'',context:{}}),0,
  'item reclassification details must not leak into inbound lot assignment');
// Legacy recordings containing a page ID and a company name still resolve a known page.
for(const [pageId,actionCaption,expected]of [['900','Post','BCExpansion.PostOrder'],['379','Match Automatically','BCExpansion.MatchAutomatically'],['5740','Post','BCExpansion.PostTransfer']]) {
  assert.equal(knowledge.apply([{taskId:pageId,pageId,pageCaption:'Company name',actionCaption}],packs).tasks[0].contextualExplanationRuleId,expected);
}
// The same new sourced text reaches the Word document only through explicit per-step opt-in.
for(const locale of locales){
  const sample=fixtures.find(f=>f.ruleId==='BCExpansion.CountedQuantity'&&f.locale===locale);
  const task=knowledge.apply([{taskId:'export',...sample,language:locale,instruction:'Recorded count 300'}],packs).tasks[0];
  for(const enabled of [false,true]) {
    const review={sessionId:'expansion',sessionName:'Knowledge coverage',tasks:[{...task,includeKnowledgeExplanationInWord:enabled}]};
    const doc=projector.project(review,{session:{id:'expansion',settings:{documentLanguage:locale}}}).document;
    const step=doc.sections.find(s=>s.kind==='workflow').blocks.find(b=>b.kind==='step');
    const explanation=step.blocks.find(b=>b.blockId?.startsWith('block:knowledge-explanation:'));
    assert.equal(Boolean(explanation),enabled,`${locale} export opt-in`);
    if(enabled){
      assert.equal(explanation.blocks[0].text,task.contextualExplanations[locale]);
      assert.ok(explanation.blocks[1].text.toLowerCase().includes('/'+locale.toLowerCase()+'/'));
    }
  }
}
console.log(`BC expansion: ${added.length} rules across ten areas; ${fixtures.length} localized runtime/repository/legacy cases; Word opt-in verified in ${locales.length} languages.`);
