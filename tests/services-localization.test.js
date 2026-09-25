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
const knowledge = require('../src/engine/knowledge-domain');
const servicePack = packs.find(x => x.packId === 'bc-services').pack;
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

const orderCases = [
  {locale:'en-US',orders:'Service Orders',order:'Service Order',new:'New',customer:'Customer No.',source:'microsoft-learn-service-create-order'},
  {locale:'sv-SE',orders:'Tjänstbeställningar',order:'Tjänstbeställningar',new:'Ny',customer:'Kundnr',source:'microsoft-learn-service-create-order-sv'},
  {locale:'fr-FR',orders:'Commandes de service',order:'Commande service',new:'Nouveau',customer:'N° client',source:'microsoft-learn-service-create-order-fr'},
  {locale:'de-DE',orders:'Serviceaufträge',order:'Serviceauftrag',new:'Neu',customer:'Debitorennr.',source:'microsoft-learn-service-create-order-de'},
  {locale:'es-ES',orders:'Pedidos de servicio',order:'Pedido servicio',new:'Nuevo',customer:'N.º cliente',source:'microsoft-learn-service-create-order-es'},
  {locale:'da-DK',orders:'Serviceordrer',order:'Serviceordre',new:'Ny',customer:'Debitornr.',source:'microsoft-learn-service-create-order-da'},
  {locale:'fi-FI',orders:'Huoltotilaukset',order:'Huoltotilaus',new:'Uusi',customer:'Asiakasnro',source:'microsoft-learn-service-create-order-fi'},
  {locale:'nb-NO',orders:'Serviceordrer',order:'Serviceordre',new:'Ny',customer:'Kundenr.',source:'microsoft-learn-service-create-order-nb'}
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

for (const sample of orderCases) {
  const {locale,orders,order,new:newAction,customer,source} = sample;
  const created = repository.resolveAction({language:locale,context:{pageCaption:orders,actionCaption:newAction}});
  assert.equal(created.status,'resolved',`${locale} create service order`);
  assert.equal(created.candidates[0].provenance.ruleId,'Services.CreateServiceOrder');
  assert.ok(created.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===source));

  const selected = repository.resolveAction({language:locale,context:{pageCaption:order,fieldCaption:customer}});
  assert.equal(selected.status,'resolved',`${locale} select service order customer`);
  assert.equal(selected.candidates[0].provenance.ruleId,'Services.SelectServiceOrderCustomer');
  assert.ok(selected.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===source));

  const input = {taskId:'service-customer-'+locale,taskType:'RunAction',pageCaption:order,fieldCaption:customer,language:locale};
  const matched = knowledge.match(input,knowledge.rules([servicePack]));
  assert.equal(matched.rule.ruleId,'Services.SelectServiceOrderCustomer',locale);
  assert.ok(knowledge.localizedInstruction(matched.rule,locale),`localized service customer guidance for ${locale}`);
  assert.ok(matched.rule.sourceIds.includes(source));
}

console.log('Service task worksheet, service-order creation/customer selection, quantity entry, and posting match in all eight supported UI locales.');
