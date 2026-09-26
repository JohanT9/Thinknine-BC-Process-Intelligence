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

const createPeriodsSamples = [
  {locale:'en-US',page:'Accounting Periods',action:'Create Year'},
  {locale:'sv-SE',page:'Redovisningsperioder',action:'Skapa år'},
  {locale:'fr-FR',page:'Périodes comptables',action:'Créer exercice'},
  {locale:'de-DE',page:'Buchhaltungsperioden',action:'Jahr erstellen'},
  {locale:'es-ES',page:'Periodos contables',action:'Crear ejercicio'},
  {locale:'da-DK',page:'Regnskabsperioder',action:'Opret år'},
  {locale:'fi-FI',page:'Kirjanpitojaksot',action:'Luo vuosi'},
  {locale:'nb-NO',page:'Regnskapsperioder',action:'Opprett år'}
];
const createPeriodsRule = financePack.rules.find(x => x.ruleId === 'Finance.CreateAccountingPeriods');
for (const {locale,page,action} of createPeriodsSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} create accounting periods`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.CreateAccountingPeriods',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-accounting-periods-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(createPeriodsRule,locale);
  assert.ok(instruction,`localized accounting periods directive for ${locale}`);
  assert.match(instruction,/4-4-5/,`manual variable-length calendar warning for ${locale}`);
}
const wrongCreatePeriodsAction = repository.resolveAction({language:'en-US',
  context:{pageCaption:'Accounting Periods',actionCaption:'Close Year'}});
assert.ok(!wrongCreatePeriodsAction.candidates.some(x => x.provenance.ruleId === 'Finance.CreateAccountingPeriods'),
  'closing the year must not match period creation');

const budgetSamples = [
  {locale:'en-US',page:'G/L Budgets',action:'Edit Budget'},
  {locale:'sv-SE',page:'G/L-budgetar',action:'Redigera budget'},
  {locale:'fr-FR',page:'G/L Budgets',action:'Modifier budget'},
  {locale:'de-DE',page:'Sachkontenbudgets',action:'Buch.-Blatt bearbeiten'},
  {locale:'es-ES',page:'Presupuestos de G/L',action:'Editar presupuesto'},
  {locale:'da-DK',page:'Finansbudgetter',action:'Rediger budget'},
  {locale:'fi-FI',page:'KP-budjetit',action:'Muokkaa budjettia'},
  {locale:'nb-NO',page:'G/L-budsjetter',action:'Rediger budsjett'}
];
const budgetRule = financePack.rules.find(x => x.ruleId === 'Finance.EditGeneralLedgerBudget');
for (const {locale,page,action} of budgetSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} edit G/L budget`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.EditGeneralLedgerBudget',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-budgets-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(budgetRule,locale);
  assert.ok(instruction,`localized budget directive for ${locale}`);
  assert.match(instruction,/overwrite|skriver över|écrase|überschreibt|sobrescribe|overskriver|päälle|overskriver/i,
    `budget import replacement risk disclosed for ${locale}`);
}
const wrongBudgetAction = repository.resolveAction({language:'en-US',
  context:{pageCaption:'G/L Budgets',actionCaption:'Close Year'}});
assert.ok(!wrongBudgetAction.candidates.some(x => x.provenance.ruleId === 'Finance.EditGeneralLedgerBudget'),
  'closing a fiscal year must not match budget editing');

const currencyAdjustmentSamples = [
  {locale:'en-US',page:'Exch. Rates Adjustment',action:'Preview Posting'},
  {locale:'sv-SE',page:'Justera valutakurser',action:'Förhandsgranska bokföring'},
  {locale:'fr-FR',page:'Ajustement des taux de change',action:'Aperçu validation'},
  {locale:'de-DE',page:'Wechselkursregulierung',action:'Buchungsvorschau'},
  {locale:'es-ES',page:'Ajustar tipos de cambio',action:'Vista previa de registro'},
  {locale:'da-DK',page:'Justering af kursvalutaer',action:'Forhåndsversion'},
  {locale:'fi-FI',page:'Vaihtokurssien muutos',action:'Esikatsele kirjausta'},
  {locale:'nb-NO',page:'Valutakursjustering',action:'Forhåndsvis bokføring'}
];
const currencyAdjustmentRule = financePack.rules.find(x => x.ruleId === 'Finance.PreviewExchangeRateAdjustment');
for (const {locale,page,action} of currencyAdjustmentSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} preview currency adjustment`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.PreviewExchangeRateAdjustment',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-currency-adjustment-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(currencyAdjustmentRule,locale);
  assert.ok(instruction,`localized currency adjustment directive for ${locale}`);
  assert.match(instruction,/preview|förhandsgranska|prévisual|vorschau|vista previa|forhåndsvis|esikatsele/i,
    `preview before posting is explicit for ${locale}`);
}
const wrongCurrencyAction = repository.resolveAction({language:'en-US',
  context:{pageCaption:'Exch. Rates Adjustment',actionCaption:'OK'}});
assert.ok(!wrongCurrencyAction.candidates.some(x => x.provenance.ruleId === 'Finance.PreviewExchangeRateAdjustment'),
  'running the exchange adjustment must not resolve as preview');

const vatReportSamples = [
  {locale:'en-US',page:'VAT Returns',action:'Suggest Lines'},
  {locale:'sv-SE',page:'Momsreturer',action:'Föreslå rader'},
  {locale:'fr-FR',page:'Retours TVA',action:'Proposer lignes'},
  {locale:'de-DE',page:'Mehrwertsteuererklärungen',action:'Vorschlagszeilen'},
  {locale:'es-ES',page:'Devolución de IVA',action:'Proponer líneas'},
  {locale:'da-DK',page:'Momsangivelser',action:'Foreslå linjer'},
  {locale:'fi-FI',page:'ALV-palautukset',action:'Ehdota rivejä'},
  {locale:'nb-NO',page:'Mva-returer',action:'Foreslå linjer'}
];
const vatReportRule = financePack.rules.find(x => x.ruleId === 'Finance.SuggestVATReportLines');
for (const {locale,page,action} of vatReportSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} suggest VAT report lines`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.SuggestVATReportLines',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-vat-submission-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(vatReportRule,locale);
  assert.ok(instruction,`localized VAT report directive for ${locale}`);
  assert.match(instruction,/country|land|pays|Land|país|landsspecifikke|maakohtainen|landsspesifikke/i,
    `country-specific compliance boundary is disclosed for ${locale}`);
}
const wrongVATAction = repository.resolveAction({language:'en-US',
  context:{pageCaption:'VAT Returns',actionCaption:'Submit'}});
assert.ok(!wrongVATAction.candidates.some(x => x.provenance.ruleId === 'Finance.SuggestVATReportLines'),
  'submitting a VAT report must not resolve as suggesting lines');

const columnDefinitionSamples = [
  {locale:'en-US',page:'Column Definitions',action:'Edit Column Definition'},
  {locale:'sv-SE',page:'Kolumndefinitioner',action:'Redigera kolumndefinition'},
  {locale:'fr-FR',page:'D\u00e9finitions de colonne',action:'Modifier la d\u00e9finition de colonne'},
  {locale:'de-DE',page:'Spaltendefinitionen',action:'Spaltendefinition bearbeiten'},
  {locale:'es-ES',page:'Definiciones de columna',action:'Editar definici\u00f3n de columna'},
  {locale:'da-DK',page:'Kolonnedefinitioner',action:'Rediger kolonnedefinition'},
  {locale:'fi-FI',page:'Sarakem\u00e4\u00e4ritykset',action:'Muokkaa sarakem\u00e4\u00e4rityst\u00e4'},
  {locale:'nb-NO',page:'Kolonnedefinisjoner',action:'Rediger kolonnedefinisjon'}
];
const columnDefinitionRule = financePack.rules.find(x =>
  x.ruleId === 'Finance.EditFinancialReportColumnDefinition');
for (const {locale,page,action} of columnDefinitionSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} edit financial report column definition`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.EditFinancialReportColumnDefinition',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-column-definitions-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(columnDefinitionRule,locale);
  assert.ok(instruction,`localized financial report column definition directive for ${locale}`);
  assert.match(instruction,/version|versions|versionn|versioniert|versiones|versio|versjons/i,
    `lack of versioning is disclosed for ${locale}`);
  assert.match(instruction,/reports|\u00e9tats|Berichte|informes|rapporter|raportit/i,
    `affected financial reports are mentioned for ${locale}`);
}
const wrongColumnDefinitionAction = repository.resolveAction({language:'en-US',
  context:{pageCaption:'Column Definitions',actionCaption:'Delete'}});
assert.ok(!wrongColumnDefinitionAction.candidates.some(x =>
  x.provenance.ruleId === 'Finance.EditFinancialReportColumnDefinition'),
  'deleting a definition must not resolve as editing it');

const depreciationCalculationSamples = [
  {locale:'en-US',page:'Calculate Depreciation',action:'OK'},
  {locale:'sv-SE',page:'Beräkna avskrivning',action:'OK'},
  {locale:'fr-FR',page:'Calculer l\u2019amortissement',action:'OK'},
  {locale:'de-DE',page:'Abschreibung berechnen',action:'OK'},
  {locale:'es-ES',page:'Calcular depreciación',action:'Aceptar'},
  {locale:'da-DK',page:'Beregn afskrivning',action:'OK'},
  {locale:'fi-FI',page:'Laske poisto',action:'OK'},
  {locale:'nb-NO',page:'Beregn avskrivning',action:'OK'}
];
const depreciationCalculationRule = financePack.rules.find(x =>
  x.ruleId === 'Finance.CalculateFixedAssetDepreciation');
for (const {locale,page,action} of depreciationCalculationSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} calculate fixed-asset depreciation`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.CalculateFixedAssetDepreciation',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-depreciation-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(depreciationCalculationRule,locale);
  assert.ok(instruction,`localized depreciation calculation directive for ${locale}`);
  assert.match(instruction,/does not post|bokför dem inte|sans les comptabiliser|bucht sie aber nicht|no las registra|bogfører dem ikke|ei kirjaa|bokfører dem ikke/i,
    `calculation and posting are distinguished for ${locale}`);
}

const depreciationPostingSamples = [
  {locale:'en-US',page:'Fixed Asset G/L Journals',action:'Post'},
  {locale:'sv-SE',page:'Anl.tillg. redovisningsjournal',action:'Bokföra'},
  {locale:'fr-FR',page:'Feuille compta. immo',action:'Valider'},
  {locale:'de-DE',page:'Anlagen-Fibu Buch.-Blatt',action:'Buchen'},
  {locale:'es-ES',page:'A/F Diario general',action:'Registrar'},
  {locale:'da-DK',page:'Anlægsfinanskladder',action:'Bogfør'},
  {locale:'fi-FI',page:'Käyttöomaisuuden KP-päiväkirja',action:'Kirjaa'},
  {locale:'nb-NO',page:'AKTIVA-finansjournaler',action:'Bokfør'}
];
const depreciationPostingRule = financePack.rules.find(x =>
  x.ruleId === 'Finance.PostFixedAssetJournal');
for (const {locale,page,action} of depreciationPostingSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} post fixed-asset depreciation`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.PostFixedAssetJournal',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-depreciation-${locale.toLowerCase()}`),locale);
  assert.ok(knowledge.localizedInstruction(depreciationPostingRule,locale),
    `localized depreciation posting directive for ${locale}`);
}
const wrongDepreciationAction = repository.resolveAction({language:'en-US',
  context:{pageCaption:'Fixed Asset G/L Journals',actionCaption:'Calculate Depreciation'}});
assert.ok(!wrongDepreciationAction.candidates.some(x =>
  x.provenance.ruleId === 'Finance.PostFixedAssetJournal'),
  'calculation command must not resolve as fixed-asset journal posting');

const depreciationCancellationSamples = [
  {locale:'en-US',page:'Cancel FA Ledger Entries',action:'OK'},
  {locale:'sv-SE',page:'Rätta anl.transaktioner',action:'OK'},
  {locale:'fr-FR',page:'Annuler écriture comptable immo.',action:'OK'},
  {locale:'de-DE',page:'Anlagenposten stornieren',action:'OK'},
  {locale:'es-ES',page:'A/F Anular movs',action:'Aceptar'},
  {locale:'da-DK',page:'Annuller anlægsfinansposter',action:'OK'},
  {locale:'fi-FI',page:'Peruuta KO-tapahtumat',action:'OK'},
  {locale:'nb-NO',page:'Kanseller aktivaposter',action:'OK'}
];
const depreciationCancellationRule = financePack.rules.find(x =>
  x.ruleId === 'Finance.CancelFixedAssetDepreciation');
for (const {locale,page,action} of depreciationCancellationSamples) {
  const result = repository.resolveAction({language:locale,context:{pageCaption:page,actionCaption:action}});
  assert.equal(result.status,'resolved',`${locale} cancel incorrect depreciation entries`);
  assert.equal(result.candidates[0].provenance.ruleId,'Finance.CancelFixedAssetDepreciation',locale);
  assert.equal(result.candidates[0].provenance.language,locale);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x =>
    x.sourceId === `microsoft-learn-finance-depreciation-${locale.toLowerCase()}`),locale);
  const instruction = knowledge.localizedInstruction(depreciationCancellationRule,locale);
  assert.ok(instruction,`localized depreciation correction directive for ${locale}`);
  assert.match(instruction,/does not erase|raderar inte|ne supprime pas|löscht den gebuchten Verlauf nicht|no elimina|sletter ikke|ei poista/i,
    `correction does not silently erase posted history for ${locale}`);
}
const wrongDepreciationCorrection = repository.resolveAction({language:'en-US',
  context:{pageCaption:'Cancel FA Ledger Entries',actionCaption:'Post'}});
assert.ok(!wrongDepreciationCorrection.candidates.some(x =>
  x.provenance.ruleId === 'Finance.CancelFixedAssetDepreciation'),
  'posting must not resolve as cancellation of depreciation entries');

const sourceTopics = [
  'chart-accounts', 'dimensions', 'vat-setup', 'vat-submission', 'finance-reports', 'accounting-periods', 'budgets',
  'year-close', 'fixed-assets', 'depreciation', 'cost-accounting', 'currencies', 'currency-adjustment', 'consolidation',
  'column-definitions'
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

console.log('Finance directives for chart, posting, dimensions, accounting periods, budgets, currency adjustment, VAT report lines, financial report columns, fixed-asset depreciation/correction, and year-end resolve in all eight supported UI locales.');
