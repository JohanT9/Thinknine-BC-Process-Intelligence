const assert=require('node:assert/strict');
const fs=require('fs');
const pack=JSON.parse(fs.readFileSync('src/knowledge-packs/core.json','utf8'));
const salesPack=JSON.parse(fs.readFileSync('src/knowledge-packs/sales.json','utf8'));
const knowledge=require('../src/engine/knowledge-domain');
const pipeline=require('../src/engine/session-interpretation-pipeline');
const manifest=JSON.parse(fs.readFileSync('src/knowledge-packs/index.json','utf8'));
const all=manifest.packs.filter(x=>x.enabled).map(x=>JSON.parse(fs.readFileSync('src/'+x.file,'utf8')));
const cases=[
 ['sv-SE','Sök'],['en-US','Search'],['fr-FR','Rechercher'],['de-DE','Suchen'],
 ['es-ES','Buscar'],['da-DK','Søg'],['fi-FI','Haku'],['nb-NO','Søk']
];
const createCases=[
 ['sv-SE','Ny','microsoft-learn-keyboard-shortcuts-sv'],
 ['en-US','New','microsoft-learn-keyboard-shortcuts'],
 ['fr-FR','Nouveau','microsoft-learn-keyboard-shortcuts-fr'],
 ['de-DE','Neu','microsoft-learn-keyboard-shortcuts-de'],
 ['es-ES','Nuevo','microsoft-learn-keyboard-shortcuts-es'],
 ['da-DK','Ny','microsoft-learn-keyboard-shortcuts-da'],
 ['fi-FI','Uusi','microsoft-learn-keyboard-shortcuts-fi'],
 ['nb-NO','Ny','microsoft-learn-keyboard-shortcuts-nb']
];
for(const [language,caption] of cases){
 const result=knowledge.apply([{taskId:language,taskType:'RunAction',actionCaption:caption,language}], [pack]);
 const task=result.tasks[0];
 assert.equal(task.knowledgeRule,'Core.SearchAndOpenPage',language);
 assert.ok(task.userDirective,language+' should produce a directive');
 assert.equal(task.userDirective,pack.rules.find(x=>x.ruleId==='Core.SearchAndOpenPage').localizedInstructions[language]);
 assert.ok(task.userDirectiveSourceIds.some(sourceId=>pack.sources.some(source=>source.sourceId===sourceId)));
}
for(const [language,caption,sourceId] of createCases){
 const result=knowledge.apply([{taskId:'create-'+language,taskType:'RunAction',actionCaption:caption,language}], [pack]);
 const task=result.tasks[0];
 const rule=pack.rules.find(x=>x.ruleId==='Core.CreateNew');
 assert.equal(task.knowledgeRule,'Core.CreateNew',language);
 assert.equal(task.userDirective,rule.localizedInstructions[language]);
 assert.ok(task.userDirectiveSourceIds.includes(sourceId),language);
}
for(const [language,yes,no] of [
 ['sv-SE','Ja','Nej'],['en-US','Yes','No'],['fr-FR','Oui','Non'],
 ['de-DE','Ja','Nein'],['es-ES','Sí','No'],['da-DK','Ja','Nej'],
 ['fi-FI','Kyllä','Ei'],['nb-NO','Ja','Nei']
]){
 for(const [caption,ruleId] of [[yes,'Core.ConfirmYes'],[no,'Core.ConfirmNo']]){
  const task=knowledge.apply([{taskId:ruleId+language,taskType:'RunAction',actionCaption:caption,language}], [pack]).tasks[0];
  assert.equal(task.knowledgeRule,ruleId,language+' '+caption);
  assert.equal(task.userDirective,undefined,'confirmation must not be advised generically');
  assert.ok(task.userDirectiveSourceIds===undefined);
 }
}
const rule=pack.rules.find(x=>x.ruleId==='Core.SearchAndOpenPage');
assert.deepEqual(Object.keys(rule.localizedInstructions).sort(),cases.map(x=>x[0]).sort());
assert.equal(new Set(rule.sourceIds).size,8);
for(const sourceId of rule.sourceIds)assert.ok(pack.sources.some(source=>source.sourceId===sourceId),sourceId);
const fiGroup={stepGroupId:'directive-fi',recordingId:'directive-test',groupKind:'action',
 primaryNormalizedEvent:{pageIdentification:{pageCaption:'Roolikeskus'},actionIdentification:{caption:'Haku'},controlIdentification:{}},
 pageContext:{pageCaption:'Roolikeskus'},actionContext:{caption:'Haku'},controlContext:{},
 sourceEventIds:[],normalizedEventIds:[],evidence:[],guidance:{}};
const interpreted=pipeline.interpret({language:'fi-FI',session:{id:'directive-test'},events:[],stepGroups:[fiGroup],knowledgePacks:all});
const directive=interpreted.businessTasks.find(task=>task.userDirective?.includes('Valitse Haku') || task.userDirective?.includes('Haku (Alt+Q)'));
assert.ok(directive,'the recording pipeline should apply the localized core search directive');
assert.equal(directive.userDirective,rule.localizedInstructions['fi-FI']);
assert.ok(directive.userDirectiveSourceIds.includes('microsoft-learn-ui-search-fi'));
assert.ok(directive.instruction.startsWith('Välj **Haku**'),'the recorded-step instruction should stay intact');
assert.notEqual(directive.instruction,directive.userDirective,'the directive must remain separate from the observed-step instruction');
console.log('Core search user directives resolve and stay localized across all eight UI languages, including session interpretation.');

const salesExplanationCases=[
 ['sv-SE','Försäljningsorder','Släpp','Bokför'],
 ['en-US','Sales Order','Release','Post'],
 ['fr-FR','Commande vente','Lancer','Valider'],
 ['de-DE','Verkaufsauftrag','Freigabe','Buchen'],
 ['es-ES','Pedido de venta','Liberar','Registrar'],
 ['da-DK','Salgsordre','Frigiv','Bogfør'],
 ['fi-FI','Myyntitilaus','Vapauta','Kirjaa'],
 ['nb-NO','Ordre','Frigi','Bokfør']
];
for(const [language,pageCaption,releaseCaption,postCaption] of salesExplanationCases){
 for(const [actionCaption,ruleId] of [[releaseCaption,'Sales.Release'],[postCaption,'Sales.Post']]){
  const input={taskId:`${ruleId}-${language}`,taskType:'RunAction',pageCaption,
   actionCaption,language,description:`Choose ${actionCaption}.`};
  const untouched=JSON.stringify(input);
  const task=knowledge.apply([input],[salesPack]).tasks[0];
  const rule=salesPack.rules.find(item=>item.ruleId===ruleId);
  assert.equal(task.knowledgeRule,ruleId,`${language} ${ruleId} resolves`);
  assert.ok(task.contextualExplanations?.[language],`${language} ${ruleId} has a localized explanation`);
  assert.ok(task.contextualExplanationSourceIds.includes(rule.sourceIds[0]),`${language} ${ruleId} carries source traceability`);
  assert.equal(task.description,input.description,'explanation does not rewrite the recorded step text');
  assert.equal(JSON.stringify(input),untouched,'knowledge enrichment leaves the input recording task unchanged');
 }
}
const legacyRelease={taskId:'legacy-release',taskType:'RunAction',
 pageCaption:'Advance',entity:'SalesOrder',pageIdentificationConfidence:1,
 actionCaption:'Release',language:'sv-SE'};
const legacyReleaseTask=knowledge.apply([legacyRelease],[salesPack]).tasks[0];
assert.equal(legacyReleaseTask.knowledgeRule,'Sales.Release',
 'the identified SalesOrder entity must resolve a generic legacy page caption');
assert.ok(legacyReleaseTask.contextualExplanations?.['sv-SE'],
 'previously recorded release actions get their localized explanation');
const conflictingEntity=knowledge.apply([{...legacyRelease,taskId:'wrong-entity',
 entity:'PurchaseOrder'}],[salesPack]).tasks[0];
assert.notEqual(conflictingEntity.knowledgeRule,'Sales.Release',
 'an entity conflicting with the sales rule must never receive its suggestion');
const weakRulePack={...salesPack,rules:salesPack.rules.map(item=>item.ruleId==='Sales.Release'
 ? {...item,confidence:0.84}:item)};
const weakExplanation=knowledge.apply([{...legacyRelease,taskId:'weak-explanation'}],[weakRulePack]).tasks[0];
assert.equal(weakExplanation.contextualExplanations,undefined,
 'a rule below 85 percent confidence never supplies a process explanation');
const reviewableRulePack={...salesPack,rules:salesPack.rules.map(item=>item.ruleId==='Sales.Release'
 ? {...item,confidence:0.90}:item)};
const reviewableExplanation=knowledge.apply([{...legacyRelease,taskId:'reviewable-explanation'}],[reviewableRulePack]).tasks[0];
assert.ok(reviewableExplanation.contextualExplanations?.['sv-SE'],
 'a source-backed, uniquely matched explanation at 90 percent is shown for human review');
const ambiguousPack={...salesPack,rules:[...salesPack.rules,
 {...salesPack.rules.find(item=>item.ruleId==='Sales.Release'),ruleId:'Sales.Release.Ambiguous'}]};
const ambiguousExplanation=knowledge.apply([{...legacyRelease,taskId:'ambiguous-explanation'}],[ambiguousPack]).tasks[0];
assert.equal(ambiguousExplanation.contextualExplanations,undefined,
 'an ambiguous rule match never supplies a process explanation');
console.log('Sales process explanations remain separate from recorded instructions and are sourced/localized in all eight supported languages.');
