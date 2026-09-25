const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../src/engine/knowledge-repository');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/knowledge-packs/index.json'), 'utf8'));
const packs = manifest.packs.filter(x => x.enabled).map(x => ({ packId: x.packId, pack: JSON.parse(fs.readFileSync(path.join(root, 'src', x.file), 'utf8')) }));
const imported = api.importRelease(manifest, packs);
assert.equal(imported.ok, true, JSON.stringify(imported.diagnostics));
const repository = api.createRepository(imported.snapshot);
const samples = [
  ['sv-SE', 'Produktionsjournal', 'Utflöde antal', 'Bokför', 'microsoft-learn-production-journal-sv'],
  ['en-US', 'Production Journal', 'Output Quantity', 'Post', 'microsoft-learn-production-journal'],
  ['fr-FR', 'Journal de production', 'Quantité produite', 'Publier', 'microsoft-learn-production-journal-fr'],
  ['de-DE', 'Produktions-Buch.-Blatt', 'Ausgabemenge', 'Buchen', 'microsoft-learn-production-journal-de'],
  ['es-ES', 'Diario de producción', 'Cantidad salida', 'Publicar', 'microsoft-learn-production-journal-es'],
  ['da-DK', 'Produktionskladde', 'Output Mængde', 'Bogfør', 'microsoft-learn-production-journal-da'],
  ['fi-FI', 'Tuotantopäiväkirja', 'Tuotoksen määrä', 'Kirjaa', 'microsoft-learn-production-journal-fi'],
  ['nb-NO', 'Produksjonsjournal', 'Avgangsantall', 'Bokfør', 'microsoft-learn-production-journal-nb']
];
const consumptionCaptions = [
  ['sv-SE', 'Produktionsjournal', 'Förbrukningskvantitet', 'microsoft-learn-production-journal-sv'],
  ['en-US', 'Production Journal', 'Consumption Quantity', 'microsoft-learn-production-journal'],
  ['fr-FR', 'Journal de production', 'Quantité consommée', 'microsoft-learn-production-bom-fr'],
  ['de-DE', 'Produktions-Buch.-Blatt', 'Verbrauchsmenge', 'microsoft-learn-production-bom-de'],
  ['es-ES', 'Diario de producción', 'Consumo (cantidad)', 'microsoft-learn-production-bom-es'],
  ['da-DK', 'Produktionskladde', 'Forbrugsantal', 'microsoft-learn-production-bom-da'],
  ['fi-FI', 'Tuotantopäiväkirja', 'Kulutusmäärä', 'microsoft-learn-production-bom-fi'],
  ['nb-NO', 'Produksjonsjournal', 'Forbruksantall', 'microsoft-learn-production-bom-nb']
];
for (const [locale, pageCaption, outputCaption, postCaption, sourceId] of samples) {
  const output = repository.resolveAction({ language: locale, context: { pageCaption, fieldCaption: outputCaption } });
  assert.equal(output.status, 'resolved', `${locale} output quantity`);
  assert.equal(output.candidates[0].provenance.ruleId, 'Manufacturing.EnterOutputQuantity');
  assert.equal(output.candidates[0].provenance.language, locale);
  assert.ok(output.candidates[0].provenance.sourceRefs.some(x => x.sourceId === sourceId), `${locale} output source`);

  const posted = repository.resolveAction({ language: locale, context: { pageCaption, actionCaption: postCaption } });
  assert.equal(posted.status, 'resolved', `${locale} production journal post`);
  assert.equal(posted.candidates[0].provenance.ruleId, 'Manufacturing.PostProductionJournal');
  assert.equal(posted.candidates[0].provenance.language, locale);
  assert.ok(posted.candidates[0].provenance.sourceRefs.some(x => x.sourceId === sourceId), `${locale} journal source`);
}
for (const [locale, pageCaption, fieldCaption, sourceId] of consumptionCaptions) {
  const consumption = repository.resolveAction({ language: locale, context: { pageCaption, fieldCaption } });
  assert.equal(consumption.status, 'resolved', `${locale} consumption quantity`);
  assert.equal(consumption.candidates[0].provenance.ruleId, 'Manufacturing.EnterConsumptionQuantity');
  assert.equal(consumption.candidates[0].provenance.language, locale);
  assert.ok(consumption.candidates[0].provenance.sourceRefs.some(x => x.sourceId === sourceId), `${locale} consumption source`);
}
const manufacturing = imported.snapshot.packs.find(x => x.packId === 'bc-manufacturing');
for (const ruleId of ['Manufacturing.PostProductionJournal', 'Manufacturing.EnterOutputQuantity', 'Manufacturing.EnterConsumptionQuantity']) {
  const rule = manufacturing.rules.find(x => x.ruleId === ruleId);
  for (const [locale] of samples) assert.ok(rule.languages.includes(locale), `${ruleId} declares ${locale}`);
}
console.log('Production journal posting, output quantity, and consumption quantity matching passes in all eight supported UI locales.');
