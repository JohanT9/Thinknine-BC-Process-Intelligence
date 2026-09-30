const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const repositoryApi=require('../src/engine/knowledge-repository');
const knowledge=require('../src/engine/knowledge-domain');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/knowledge-packs/index.json'),'utf8'));
const packs=manifest.packs.filter(x=>x.enabled).map(x=>({
  packId:x.packId,pack:JSON.parse(fs.readFileSync(path.join(root,'src',x.file),'utf8'))
}));
const imported=repositoryApi.importRelease(manifest,packs);
assert.equal(imported.ok,true,JSON.stringify(imported.diagnostics));
const repository=repositoryApi.createRepository(imported.snapshot);
const knowledgePacks=packs.map(x=>x.pack);
const pack=knowledgePacks.find(x=>x.packId==='bc-contact-marketing');
const rule=pack.rules.find(x=>x.ruleId==='ContactMarketing.UpdateOpportunityStage');
const campaignRule=pack.rules.find(x=>x.ruleId==='ContactMarketing.CreateCampaign');
assert.ok(rule);
assert.ok(campaignRule);
assert.deepEqual(Object.keys(rule.localizedExplanations).sort(),['da-DK','de-DE','en-US','es-ES','fi-FI','fr-FR','nb-NO','sv-SE']);
assert.deepEqual(rule.verifiedRuntimeLocales,['en-US','sv-SE']);
for(const [locale,page,action] of [
 ['en-US','Opportunity List','Update'], ['sv-SE','Affärsmöjlighetslista','Uppdatera']
]) {
 const result=repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
 assert.equal(result.status,'resolved',`${locale} opportunity stage update`);
 assert.equal(result.candidates[0].provenance.ruleId,rule.ruleId,locale);
 assert.ok(result.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===`contact-marketing-opportunities-${locale.toLowerCase()}`));
 const task=knowledge.apply([{taskId:'opp-'+locale,language:locale,pageCaption:page,actionCaption:action}],knowledgePacks).tasks[0];
 assert.equal(task.contextualExplanationRuleId,rule.ruleId);
 assert.ok(task.contextualExplanations[locale]);
}
for(const [page,action] of [
 ['Opportunities','Close'], ['Opportunity List','Delete'], ['Sales Quotes','Update'], ['Affärsmöjlighetslista','Stäng']
]) assert.equal(knowledge.score(rule,{pageCaption:page,actionCaption:action,entity:'',context:{}}),0,`${page} / ${action}`);
for(const locale of Object.keys(rule.localizedExplanations)) {
 const text=rule.localizedExplanations[locale];
 assert.match(text,/does not close|stänger inte|ne clôt pas|weder geschlossen|no cierra|lukker ikke|ei sulje/i,locale);
 assert.match(text,/Next or Previous|Nästa eller Föregående|Suivant ou Précédent|Weiter oder Zurück|Siguiente o Anterior|Næste eller Forrige|Seuraava tai Edellinen|Neste eller Forrige/i,locale);
}
assert.deepEqual(campaignRule.verifiedRuntimeLocales,['en-US','sv-SE']);
assert.deepEqual(Object.keys(campaignRule.localizedExplanations).sort(),['da-DK','de-DE','en-US','es-ES','fi-FI','fr-FR','nb-NO','sv-SE']);
for(const [locale,page,action] of [['en-US','Campaigns','New'],['sv-SE','Kampanjer','Ny']]) {
 const result=repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
 assert.equal(result.status,'resolved',`${locale} campaign creation`);
 assert.equal(result.candidates[0].provenance.ruleId,campaignRule.ruleId,locale);
 assert.ok(result.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===`contact-marketing-campaigns-${locale.toLowerCase()}`));
 const task=knowledge.apply([{taskId:'campaign-'+locale,language:locale,pageCaption:page,actionCaption:action}],knowledgePacks).tasks[0];
 assert.equal(task.contextualExplanationRuleId,campaignRule.ruleId);
 assert.ok(task.contextualExplanations[locale]);
}
for(const [page,action] of [['Segments','New'],['Segment','New'],['Campaigns','Delete'],['Contacts','New'],['Kampanjer','Ta bort']])
 assert.equal(knowledge.score(campaignRule,{pageCaption:page,actionCaption:action,entity:'',context:{}}),0,`${page} / ${action}`);
for(const locale of Object.keys(campaignRule.localizedExplanations)) {
 const text=campaignRule.localizedExplanations[locale];
 assert.match(text,/separate segment|separat segment|segment distinct|separaten Segment|segmento independiente|separat segment|erillisessä segmentissä|eget segment/i,locale);
 assert.match(text,/does not select recipients|väljer inte mottagare|ne sélectionne pas|weder ausgewählt|no selecciona destinatarios|vælger ikke modtagere|ei valitse vastaanottajia|velger ikke mottakere/i,locale);
}
console.log('Contact & Marketing opportunity stage update: localized context and close/quote boundaries verified.');
