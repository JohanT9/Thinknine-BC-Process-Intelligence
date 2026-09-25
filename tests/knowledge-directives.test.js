const assert=require('node:assert/strict');
const fs=require('fs');
const pack=JSON.parse(fs.readFileSync('src/knowledge-packs/core.json','utf8'));
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
