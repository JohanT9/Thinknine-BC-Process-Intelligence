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

const dimensionSamples = [
  {locale:'en-US',page:'General Ledger Setup',action:'Change Global Dimensions'},
  {locale:'sv-SE',page:'Redovisningsinställningar',action:'Ändra globala dimensioner'},
  {locale:'fr-FR',page:'Paramètres comptabilité',action:'Modifier les dimensions globales'},
  {locale:'de-DE',page:'Einrichtung der Finanzbuchhaltung',action:'Globale Dimensionen ändern'},
  {locale:'es-ES',page:'Configuración de contabilidad',action:'Cambiar dimensiones globales'},
  {locale:'da-DK',page:'Regnskabsopsætning',action:'Rediger globale dimensioner'},
  {locale:'fi-FI',page:'Pääkirjanpidon asetukset',action:'Muuta globaali dimensio'},
  {locale:'nb-NO',page:'Finansoppsett',action:'Endre globale dimensjoner'}
];
const chartSamples = [
  {locale:'en-US',page:'Chart of Accounts',action:'Indent Chart of Accounts'},
  {locale:'sv-SE',page:'Kontoplan',action:'Indrag av kontoplan'},
  {locale:'fr-FR',page:'Plan comptable',action:'Indenter plan comptable'},
  {locale:'de-DE',page:'Kontenplan',action:'Kontenplan einrücken'},
  {locale:'es-ES',page:'Plan de cuentas',action:'Test plan de cuentas'},
  {locale:'da-DK',page:'Kontoplan',action:'Indryk kontoplan'},
  {locale:'fi-FI',page:'Tilikartta',action:'Sisennä tilikartta'},
  {locale:'nb-NO',page:'Kontoplan',action:'Innrykk kontoplan'}
];
const chartRule = financePack.rules.find(x => x.ruleId === 'Finance.IndentChartOfAccounts');
for (const {locale,page,action} of chartSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} indent chart of accounts`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.IndentChartOfAccounts',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-chart-accounts-${locale.toLowerCase()}`),locale);
  assert.ok(knowledge.localizedInstruction(chartRule,locale),`localized chart directive for ${locale}`);
}
const wrongChartAction = repository.resolveAction({language:'en-US',
  context:{pageCaption:'Chart of Accounts',actionCaption:'Delete'}});
assert.ok(!wrongChartAction.candidates.some(x => x.provenance.ruleId === 'Finance.IndentChartOfAccounts'),
  'account deletion must not match chart indentation');

const dimensionRule = financePack.rules.find(x => x.ruleId === 'Finance.ChangeGlobalDimensions');
for (const {locale,page,action} of dimensionSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} change global dimensions`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.ChangeGlobalDimensions',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-dimensions-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(dimensionRule,locale);
  assert.ok(instruction,`localized dimension directive for ${locale}`);
  assert.match(instruction,/performance|prestanda|performances|Leistung|rendimiento|ydeevnen|suorituskyky|ytelsen/i,
    `dimension update risk is disclosed for ${locale}`);
}

for (const sample of dimensionSamples) {
  const wrongAction = repository.resolveAction({language:sample.locale,
    context:{pageCaption:sample.page,actionCaption:'Change Dimensions'}});
  assert.ok(!wrongAction.candidates.some(x => x.provenance.ruleId === 'Finance.ChangeGlobalDimensions'),
    `shortcut dimension change must not match global dimension rule for ${sample.locale}`);
}

const yearEndSamples = [
  {locale:'en-US',page:'Accounting Periods',action:'Close Year'},
  {locale:'sv-SE',page:'Redovisningsperioder',action:'Stäng år'},
  {locale:'fr-FR',page:'Périodes comptables',action:'Clôturer exercice'},
  {locale:'de-DE',page:'Buchhaltungsperioden',action:'Jahr beenden'},
  {locale:'es-ES',page:'Periodos contables',action:'Cerrar ejercicio'},
  {locale:'da-DK',page:'Regnskabsperioder',action:'Afslut år'},
  {locale:'fi-FI',page:'Kirjanpitojaksot',action:'Sulje vuosi'},
  {locale:'nb-NO',page:'Regnskapsperioder',action:'Lukk år'}
];
const yearEndRule = financePack.rules.find(x => x.ruleId === 'Finance.CloseFiscalYear');
for (const {locale,page,action} of yearEndSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} close fiscal year`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.CloseFiscalYear',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-accounting-periods-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(yearEndRule,locale);
  assert.ok(instruction,`localized year-end directive for ${locale}`);
  assert.match(instruction,/at least|minst|mindst|au moins|mindestens|al menos|vähintään/i,
    `open fiscal year requirement is disclosed for ${locale}`);
}
const wrongYearEnd = repository.resolveAction({language:'en-US',
  context:{pageCaption:'Accounting Periods',actionCaption:'Create Year'}});
assert.ok(!wrongYearEnd.candidates.some(x => x.provenance.ruleId === 'Finance.CloseFiscalYear'),
  'creating accounting periods must not match close fiscal year');

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

console.log('Finance chart, posting, dimension-change, and year-end directives resolve in all eight supported UI locales.');
