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
    locale: 'en-US', page: 'Project Planning Lines', field: 'Qty. To Transfer to Journal', timeSheet: 'Time Sheets', createTimeLines: 'Create lines from project planning', projectJournals: 'Project Journals', suggestTimeLines: 'Suggest Lines from Time Sheets', timeSheetSource: 'microsoft-learn-project-timesheets',
    create: 'Create Project Journal Lines', journal: 'Project Journal', post: 'Post',
    source: 'microsoft-learn-project-usage', invoiceSource: 'microsoft-learn-project-invoice', walkthroughSource: 'microsoft-learn-project-walkthrough', taskLines: 'Project Task Lines', planningLines: 'Project Planning Lines', invoiceQty: 'Qty. To Transfer to Invoice', projectInvoice: 'Create Project Sales Invoice'
  },
  {
    locale: 'sv-SE', page: 'Projektplaneringsrader', field: 'Antal att överföra till journal', timeSheet: 'Tidrapporter', createTimeLines: 'Skapa rader från projektplanering', projectJournals: 'Projektjournaler', suggestTimeLines: 'Föreslå rader från tidrapporter', timeSheetSource: 'microsoft-learn-project-timesheets-sv',
    create: 'Skapa projektjournalrader', journal: 'Projektjournal', post: 'Bokför',
    source: 'microsoft-learn-project-usage-sv', invoiceSource: 'microsoft-learn-project-invoice-sv', walkthroughSource: 'microsoft-learn-project-walkthrough-sv', taskLines: 'Projektaktivitetsrader', planningLines: 'Projektplaneringsrader', invoiceQty: 'Antal att överföra till faktura', projectInvoice: 'Skapa försäljningsfaktura för projekt'
  },
  {
    locale: 'fr-FR', page: 'Lignes planning projet', field: 'Qté à transférer sur la feuille', timeSheet: 'Feuilles de temps', createTimeLines: 'Créer des lignes à partir du planning projet', projectJournals: 'Journaux projet', suggestTimeLines: 'Proposer des lignes à partir des feuilles de temps', timeSheetSource: 'microsoft-learn-project-timesheets-fr',
    create: 'Créer des lignes feuille projet', journal: 'Feuille projet', post: 'Valider',
    source: 'microsoft-learn-project-usage-fr', invoiceSource: 'microsoft-learn-project-invoice-fr', walkthroughSource: 'microsoft-learn-project-walkthrough-fr', taskLines: 'Lignes de tâches du projet', planningLines: 'Project Planning Lines', invoiceQty: 'Qté à transférer à facturer', projectInvoice: 'Créer une facture vente projet'
  },
  {
    locale: 'de-DE', page: 'Projektplanungszeilen', field: 'In das Journal zu übertragende Menge', timeSheet: 'Arbeitszeittabellen', createTimeLines: 'Zeilen anhand der Projektplanung erstellen', projectJournals: 'Project Journals', suggestTimeLines: 'Zeilen von Arbeitszeittabellen vorschlagen', timeSheetSource: 'microsoft-learn-project-timesheets-de',
    create: 'Projekt-Buch.-Blattzeilen erstellen', journal: 'Projekterfassung', post: 'Buchen',
    source: 'microsoft-learn-project-usage-de', invoiceSource: 'microsoft-learn-project-invoice-de', walkthroughSource: 'microsoft-learn-project-walkthrough-de', taskLines: 'Projektaufgabenzeilen', planningLines: 'Projektplanungszeilen', invoiceQty: 'In Rechnung zu übertragende Menge', projectInvoice: 'Projektverkaufsrechnung erstellen'
  },
  {
    locale: 'es-ES', page: 'Líneas de planificación de proyecto', field: 'Cdad. a transferir al diario', timeSheet: 'Hojas de tiempo', createTimeLines: 'Crear líneas de planificación de proyecto', projectJournals: 'Project Journals', suggestTimeLines: 'Sugerir líneas de hojas de horas', timeSheetSource: 'microsoft-learn-project-timesheets-es',
    create: 'Crear líneas de diario de proyectos', journal: 'Diario de proyectos', post: 'Registrar',
    source: 'microsoft-learn-project-usage-es', invoiceSource: 'microsoft-learn-project-invoice-es', walkthroughSource: 'microsoft-learn-project-walkthrough-es', taskLines: 'Líneas de tareas del proyecto', planningLines: 'Líneas planificación proyecto', invoiceQty: 'Cdad. para transferir a factura', projectInvoice: 'Crear factura de venta de proyecto'
  },
  {
    locale: 'da-DK', page: 'Projektplanlægningslinjer', field: 'Antal, der skal overføres til kladde', timeSheet: 'Timesedler', createTimeLines: 'Opret linjer fra projektplanlægning', projectJournals: 'Project Journals', suggestTimeLines: 'Foreslå linjer fra timesedler', timeSheetSource: 'microsoft-learn-project-timesheets-da',
    create: 'Opret projektkladdelinjer', journal: 'Projektkladde', post: 'Bogfør',
    source: 'microsoft-learn-project-usage-da', invoiceSource: 'microsoft-learn-project-invoice-da', walkthroughSource: 'microsoft-learn-project-walkthrough-da', taskLines: 'Project Opgavelinjer', planningLines: 'Projektplanlægningslinjer', invoiceQty: 'Antal til overførsel til faktura', projectInvoice: 'Opret projektsalgsfaktura'
  },
  {
    locale: 'fi-FI', page: 'Projektin suunnittelurivit', field: 'Päiväkirjaan siirrettävä määrä', timeSheet: 'Aikaraportit', createTimeLines: 'Luo rivejä projektin suunnittelusta', projectJournals: 'Projektipäiväkirjat', suggestTimeLines: 'Ehdota rivejä aikaraporteista', timeSheetSource: 'microsoft-learn-project-timesheets-fi',
    create: 'Luo projektipäiväkirjan rivit', journal: 'Projektipäiväkirja', post: 'Kirjaa',
    source: 'microsoft-learn-project-usage-fi', invoiceSource: 'microsoft-learn-project-invoice-fi', walkthroughSource: 'microsoft-learn-project-walkthrough-fi', taskLines: 'Project Task Lines', planningLines: 'Project Suunnittelurivit', invoiceQty: 'Laskuun siirrettävä määrä', projectInvoice: 'Luo projektin myyntilasku'
  },
  {
    locale: 'nb-NO', page: 'Prosjektplanleggingslinjer', field: 'Ant. som skal overføres til kladd', timeSheet: 'Timelister', createTimeLines: 'Opprett linjer fra prosjektplanlegging', projectJournals: 'Prosjektjournaler', suggestTimeLines: 'Foreslå linjer fra timelister', timeSheetSource: 'microsoft-learn-project-timesheets-nb',
    create: 'Opprett prosjektkladdelinjer', journal: 'Prosjektkladd', post: 'Bokfør',
    source: 'microsoft-learn-project-usage-nb', invoiceSource: 'microsoft-learn-project-invoice-nb', walkthroughSource: 'microsoft-learn-project-walkthrough-nb', taskLines: 'Prosjektoppgavelinjer', planningLines: 'Project Planning Lines', invoiceQty: 'Ant. som skal overføres til faktura', projectInvoice: 'Opprett salgsfaktura for prosjekt'
  }
];

for (const sample of samples) {
  const { locale, page, field, create, journal, post, source, invoiceSource, walkthroughSource, taskLines, planningLines, invoiceQty, projectInvoice, timeSheet, createTimeLines, projectJournals, suggestTimeLines, timeSheetSource } = sample;
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

  const openedPlanning = repository.resolveAction({ language: locale, context: { pageCaption: taskLines, actionCaption: planningLines } });
  assert.equal(openedPlanning.status, 'resolved', `${locale} open project planning lines`);
  assert.equal(openedPlanning.candidates[0].provenance.ruleId, 'Projects.OpenProjectPlanningLines');
  assert.equal(openedPlanning.candidates[0].provenance.language, locale);
  assert.ok(openedPlanning.candidates[0].provenance.sourceRefs.some(x => x.sourceId === walkthroughSource), `${locale} planning walkthrough source`);

  const localizedPlanningPage = locale === 'en-US' ? planningLines : ({ 'sv-SE': 'Projektplaneringsrader', 'fr-FR': 'Lignes planning projet', 'de-DE': 'Projektplanungszeilen', 'es-ES': 'Líneas planificación proyecto', 'da-DK': 'Projektplanlægningslinjer', 'fi-FI': 'Projektin suunnittelurivit', 'nb-NO': 'Prosjektplanleggingslinjer' })[locale];
  const invoiceQuantity = repository.resolveAction({ language: locale, context: { pageCaption: localizedPlanningPage, fieldCaption: invoiceQty } });
  assert.equal(invoiceQuantity.status, 'resolved', `${locale} project invoice quantity`);
  assert.equal(invoiceQuantity.candidates[0].provenance.ruleId, 'Projects.SetQtyToTransferToInvoice');
  assert.equal(invoiceQuantity.candidates[0].provenance.language, locale);
  assert.ok(invoiceQuantity.candidates[0].provenance.sourceRefs.some(x => x.sourceId === invoiceSource), `${locale} invoice source`);

  const projectInvoiceAction = repository.resolveAction({ language: locale, context: { pageCaption: 'Projects', actionCaption: projectInvoice } });
  assert.equal(projectInvoiceAction.status, 'resolved', `${locale} create project sales invoice`);
  assert.equal(projectInvoiceAction.candidates[0].provenance.ruleId, 'Projects.CreateProjectSalesInvoice');
  assert.equal(projectInvoiceAction.candidates[0].provenance.language, locale);
  assert.ok(projectInvoiceAction.candidates[0].provenance.sourceRefs.some(x => x.sourceId === invoiceSource), `${locale} invoice creation source`);

  const createdTimeLines = repository.resolveAction({ language: locale, context: { pageCaption: timeSheet, actionCaption: createTimeLines } });
  assert.equal(createdTimeLines.status, 'resolved', `${locale} create time sheet lines from planning`);
  assert.equal(createdTimeLines.candidates[0].provenance.ruleId, 'Projects.CreateTimeSheetLinesFromPlanning');
  assert.equal(createdTimeLines.candidates[0].provenance.language, locale);
  assert.ok(createdTimeLines.candidates[0].provenance.sourceRefs.some(x => x.sourceId === timeSheetSource), `${locale} time sheet creation source`);

  const suggestedTimeLines = repository.resolveAction({ language: locale, context: { pageCaption: projectJournals, actionCaption: suggestTimeLines } });
  assert.equal(suggestedTimeLines.status, 'resolved', `${locale} suggest approved time sheet lines`);
  assert.equal(suggestedTimeLines.candidates[0].provenance.ruleId, 'Projects.SuggestApprovedTimeSheetLinesToProjectJournal');
  assert.equal(suggestedTimeLines.candidates[0].provenance.language, locale);
  assert.ok(suggestedTimeLines.candidates[0].provenance.sourceRefs.some(x => x.sourceId === timeSheetSource), `${locale} time sheet journal source`);
}

console.log('Project usage, planning, invoicing, and time-sheet actions match in all eight supported UI locales.');
