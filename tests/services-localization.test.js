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
  {locale:'en-US',tasks:'Service Tasks',open:'Item Worksheet',worksheet:'Service Item Worksheet',quantity:'Quantity',order:'Service Order',post:'Post',work:'microsoft-learn-service-tasks',posting:'microsoft-learn-service-posting'},
  {locale:'sv-SE',tasks:'Tjänstuppgifter',open:'Artikelkalkylark',worksheet:'Serviceartikeldokument',quantity:'Antal',order:'Tjänstbeställningar',post:'Inlägg',work:'microsoft-learn-service-tasks-sv',posting:'microsoft-learn-service-posting-sv'},
  {locale:'fr-FR',tasks:'Tâches de service',open:'Feuille activité article',worksheet:'Feuille de calcul des articles de service',quantity:'Quantité',order:'Commande service',post:'Valider',work:'microsoft-learn-service-tasks-fr',posting:'microsoft-learn-service-posting-fr'},
  {locale:'de-DE',tasks:'Dienstaufgaben',open:'Artikel-Arbeitsblatt',worksheet:'Servicearbeitsblatt',quantity:'Menge',order:'Serviceauftrag',post:'Post',work:'microsoft-learn-service-tasks-de',posting:'microsoft-learn-service-posting-de'},
  {locale:'es-ES',tasks:'Tareas de servicio',open:'Hoja de producto',worksheet:'Hoja de trabajo de artículo de servicio',quantity:'Cantidad',order:'Pedido servicio',post:'Registrar',work:'microsoft-learn-service-tasks-es',posting:'microsoft-learn-service-posting-es'},
  {locale:'da-DK',tasks:'Serviceopgaver',open:'Varekladde',worksheet:'Serviceartikelkladde',quantity:'Antal',order:'Serviceordre',post:'Indlæg',work:'microsoft-learn-service-tasks-da',posting:'microsoft-learn-service-posting-da'},
  {locale:'fi-FI',tasks:'Palvelutehtävät',open:'Nimikkeen työkirja',worksheet:'Huoltonimikkeen työkirja',quantity:'Määrä',order:'Huoltotilaus',post:'Julkaisu',work:'microsoft-learn-service-tasks-fi',posting:'microsoft-learn-service-posting-fi'},
  {locale:'nb-NO',tasks:'Tjenesteoppgaver',open:'Arbeidsordre',worksheet:'Servicevareskjema',quantity:'Antall',order:'Serviceordre',post:'Publiser',work:'microsoft-learn-service-tasks-nb',posting:'microsoft-learn-service-posting-nb'}
];

for (const sample of samples) {
  const {locale,tasks,open,worksheet,quantity,order,post,work,posting} = sample;
  const opened = repository.resolveAction({language:locale,context:{pageCaption:tasks,actionCaption:open}});
  assert.equal(opened.status,'resolved',`${locale} open service-item worksheet`);
  assert.equal(opened.candidates[0].provenance.ruleId,'Services.OpenServiceItemWorksheet');
  assert.equal(opened.candidates[0].provenance.language,locale);
  assert.ok(opened.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===work));

  const entered = repository.resolveAction({language:locale,context:{pageCaption:worksheet,fieldCaption:quantity}});
  assert.equal(entered.status,'resolved',`${locale} enter service item quantity`);
  assert.equal(entered.candidates[0].provenance.ruleId,'Services.SetServiceItemWorksheetQuantity');
  assert.equal(entered.candidates[0].provenance.language,locale);
  assert.ok(entered.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===work));

  const posted = repository.resolveAction({language:locale,context:{pageCaption:order,actionCaption:post}});
  assert.equal(posted.status,'resolved',`${locale} post service order`);
  assert.equal(posted.candidates[0].provenance.ruleId,'Services.PostServiceOrder');
  assert.equal(posted.candidates[0].provenance.language,locale);
  assert.ok(posted.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===posting));
}

console.log('Service task worksheet, quantity entry, and service-order posting match in all eight supported UI locales.');
