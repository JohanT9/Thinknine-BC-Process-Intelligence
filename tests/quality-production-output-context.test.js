const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'src/knowledge-packs/quality-management.json'), 'utf8'));
const knowledge = require('../src/engine/knowledge-domain');
const locales = require('../src/engine/language-registry').supported().map(x=>x.locale).sort();
const rule = pack.rules.find(r=>r.ruleId==='QualityManagement.PostProductionOutputWithInspection');
assert.ok(rule);
assert.deepEqual(Object.keys(rule.localizedExplanations).sort(),locales);
for(const locale of locales) assert.ok(rule.localizedExplanations[locale].length>200,locale);
for(const [language,pageCaption,actionCaption] of [
 ['en-US','Output Journal','Post'],['en-US','Production Journal','Post'],
 ['sv-SE','Utdatajournal','Publicera'],['sv-SE','Produktionsjournal','Publicera']
]) {
 const task=knowledge.apply([{taskId:language+pageCaption,pageCaption,actionCaption,language}],[pack]).tasks[0];
 assert.equal(task.contextualExplanationRuleId,rule.ruleId,`${pageCaption}/${actionCaption}`);
 assert.ok(task.contextualExplanations[language]);
 assert.ok(task.contextualExplanationSources.some(s=>s.sourceId.startsWith('microsoft-learn-expansion-qms-production-output-')));
}
for(const [pageCaption,actionCaption] of [['Purchase Orders','Post'],['Output Journal','New'],['Warehouse Movements','Register']]) {
 const task=knowledge.apply([{taskId:'boundary',pageCaption,actionCaption,language:'en-US'}],[pack]).tasks[0];
 assert.notEqual(task.contextualExplanationRuleId,rule.ruleId,`${pageCaption}/${actionCaption}`);
}
assert.match(rule.localizedExplanations['en-US'],/Premium experience/);
assert.match(rule.localizedExplanations['sv-SE'],/Premium-upplevelsen/);
console.log('Quality production output inspection context and eight localized explanations verified.');
