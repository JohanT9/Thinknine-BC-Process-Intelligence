const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../src/engine/knowledge-repository');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/knowledge-packs/index.json'), 'utf8'));
const packs = manifest.packs.filter(x => x.enabled).map(x => ({
  packId: x.packId,
  pack: JSON.parse(fs.readFileSync(path.join(root, 'src', x.file), 'utf8'))
}));
const imported = api.importRelease(manifest, packs);
assert.equal(imported.ok, true, JSON.stringify(imported.diagnostics));
const repository = api.createRepository(imported.snapshot);
const samples = [
  {
    locale: 'en-US', page: 'Project Planning Lines', field: 'Qty. To Transfer to Journal',
    create: 'Create Project Journal Lines', journal: 'Project Journal', post: 'Post',
    source: 'microsoft-learn-project-usage'
  },
  {
    locale: 'sv-SE', page: 'Projektplaneringsrader', field: 'Antal att överföra till journal',
    create: 'Skapa projektjournalrader', journal: 'Projektjournal', post: 'Bokför',
    source: 'microsoft-learn-project-usage-sv'
  },
  {
    locale: 'fr-FR', page: 'Lignes planning projet', field: 'Qté à transférer sur la feuille',
    create: 'Créer des lignes feuille projet', journal: 'Feuille projet', post: 'Valider',
    source: 'microsoft-learn-project-usage-fr'
  },
  {
    locale: 'de-DE', page: 'Projektplanungszeilen', field: 'In das Journal zu übertragende Menge',
    create: 'Projekt-Buch.-Blattzeilen erstellen', journal: 'Projekterfassung', post: 'Buchen',
    source: 'microsoft-learn-project-usage-de'
  },
  {
    locale: 'es-ES', page: 'Líneas de planificación de proyecto', field: 'Cdad. a transferir al diario',
    create: 'Crear líneas de diario de proyectos', journal: 'Diario de proyectos', post: 'Registrar',
    source: 'microsoft-learn-project-usage-es'
  },
  {
    locale: 'da-DK', page: 'Projektplanlægningslinjer', field: 'Antal, der skal overføres til kladde',
    create: 'Opret projektkladdelinjer', journal: 'Projektkladde', post: 'Bogfør',
    source: 'microsoft-learn-project-usage-da'
  },
  {
    locale: 'fi-FI', page: 'Projektin suunnittelurivit', field: 'Päiväkirjaan siirrettävä määrä',
    create: 'Luo projektipäiväkirjan rivit', journal: 'Projektipäiväkirja', post: 'Kirjaa',
    source: 'microsoft-learn-project-usage-fi'
  },
  {
    locale: 'nb-NO', page: 'Prosjektplanleggingslinjer', field: 'Ant. som skal overføres til kladd',
    create: 'Opprett prosjektkladdelinjer', journal: 'Prosjektkladd', post: 'Bokfør',
    source: 'microsoft-learn-project-usage-nb'
  }
];

for (const sample of samples) {
  const { locale, page, field, create, journal, post, source } = sample;
  const quantity = repository.resolveAction({ language: locale, context: { pageCaption: page, fieldCaption: field } });
  assert.equal(quantity.status, 'resolved', `${locale} project transfer quantity`);
  assert.equal(quantity.candidates[0].provenance.ruleId, 'Projects.SetQtyToTransferToJournal');
  assert.equal(quantity.candidates[0].provenance.language, locale);
  assert.ok(quantity.candidates[0].provenance.sourceRefs.some(x => x.sourceId === source), `${locale} usage source`);

  const created = repository.resolveAction({ language: locale, context: { pageCaption: page, actionCaption: create } });
  assert.equal(created.status, 'resolved', `${locale} create journal lines`);
  assert.equal(created.candidates[0].provenance.ruleId, 'Projects.CreateProjectJournalLines');
  assert.equal(created.candidates[0].provenance.language, locale);
  assert.ok(created.candidates[0].provenance.sourceRefs.some(x => x.sourceId === source), `${locale} create source`);

  const posted = repository.resolveAction({ language: locale, context: { pageCaption: journal, actionCaption: post } });
  assert.equal(posted.status, 'resolved', `${locale} post project journal`);
  assert.equal(posted.candidates[0].provenance.ruleId, 'Projects.PostProjectJournal');
  assert.equal(posted.candidates[0].provenance.language, locale);
  assert.ok(posted.candidates[0].provenance.sourceRefs.some(x => x.sourceId === source), `${locale} post source`);
}

console.log('Project usage transfer, journal-line creation, and posting match in all eight supported UI locales.');
