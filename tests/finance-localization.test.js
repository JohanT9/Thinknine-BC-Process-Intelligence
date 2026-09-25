const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const repositoryApi = require('../src/engine/knowledge-repository');
const knowledge = require('../src/engine/knowledge-domain');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/knowledge-packs/index.json'), 'utf8'));
const packs = manifest.packs.filter(x => x.enabled).map(x => ({
  packId: x.packId,
  pack: JSON.parse(fs.readFileSync(path.join(root, 'src', x.file), 'utf8'))
}));
const imported = repositoryApi.importRelease(manifest, packs);
assert.equal(imported.ok, true, JSON.stringify(imported.diagnostics));
const repository = repositoryApi.createRepository(imported.snapshot);
const financePack = packs.find(x => x.packId === 'bc-finance').pack;
const rule = financePack.rules.find(x => x.ruleId === 'Finance.PostGeneralJournal');
const samples = [
  {locale:'en-US',page:'General Journals',post:'Post',source:'microsoft-learn-general-journals'},
  {locale:'sv-SE',page:'Redovisningsjournaler',post:'Bokföra',source:'microsoft-learn-general-journals-sv'},
  {locale:'fr-FR',page:'Feuilles comptabilité',post:'Valider',source:'microsoft-learn-general-journals-fr'},
  {locale:'de-DE',page:'Fibu Buch.-Blätter',post:'Buchen',source:'microsoft-learn-general-journals-de'},
  {locale:'es-ES',page:'Diarios generales',post:'Registrar',source:'microsoft-learn-general-journals-es'},
  {locale:'da-DK',page:'Finanskladder',post:'Bogfør',source:'microsoft-learn-general-journals-da'},
  {locale:'fi-FI',page:'Yleinen päiväkirja',post:'Kirjaa',source:'microsoft-learn-general-journals-fi'},
  {locale:'nb-NO',page:'Generelle journaler',post:'Bokfør',source:'microsoft-learn-general-journals-nb'}
];

for (const {locale,page,post,source} of samples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:post}});
  assert.equal(result.status,'resolved',`${locale} post general journal`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.PostGeneralJournal',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===source),locale);
  assert.ok(knowledge.localizedInstruction(rule,locale),`localized finance directive for ${locale}`);
  assert.ok(rule.sourceIds.includes(source),locale);
}

const sourceTopics = [
  'chart-accounts', 'dimensions', 'vat-setup', 'finance-reports', 'accounting-periods',
  'year-close', 'fixed-assets', 'depreciation', 'cost-accounting', 'currencies', 'consolidation'
];
for (const topic of sourceTopics) {
  for (const locale of samples.map(sample => sample.locale)) {
    const source = financePack.sources.find(item => item.sourceId ===
      `microsoft-learn-finance-${topic}-${locale.toLowerCase()}`);
    assert.ok(source, `finance source ${topic} for ${locale}`);
    assert.ok(source.sourceUri.startsWith(`https://learn.microsoft.com/${locale.toLowerCase()}/`),
      `localized official source URL for ${topic}/${locale}`);
    assert.ok(source.fields.length > 0, `indexed scope for ${topic}/${locale}`);
  }
}

const unrelated = repository.resolveAction({language:'en-US',context:{pageCaption:'Payment Journal',actionCaption:'Post'}});
assert.ok(!unrelated.candidates.some(x=>x.provenance.ruleId==='Finance.PostGeneralJournal'),
  'general journal posting rule must not match the specialized payment journal');

console.log('General journal posting and localized finance guidance resolve in all eight supported UI locales.');
