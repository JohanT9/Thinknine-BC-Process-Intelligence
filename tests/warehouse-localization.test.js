const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const repositoryApi = require('../src/engine/knowledge-repository');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/knowledge-packs/index.json'), 'utf8'));
const packs = manifest.packs.filter(x => x.enabled).map(x => ({packId:x.packId,pack:JSON.parse(fs.readFileSync(path.join(root,'src',x.file),'utf8'))}));
const imported = repositoryApi.importRelease(manifest,packs);
assert.equal(imported.ok,true,JSON.stringify(imported.diagnostics));
const repository = repositoryApi.createRepository(imported.snapshot);
const samples = [
  ['sv-SE','Lagerplockning','Ant. att hantera','Warehouse.SetQtyToHandlePick','microsoft-learn-inventory-picks-sv'],
  ['en-US','Inventory Pick','Qty. to Handle','Warehouse.SetQtyToHandlePick','microsoft-learn-inventory-picks'],
  ['fr-FR','Prélèvement stock','Quantité à traiter','Warehouse.SetQtyToHandlePick','microsoft-learn-inventory-picks-fr'],
  ['de-DE','Lagerkommissionierung','Zu verarbeitende Menge','Warehouse.SetQtyToHandlePick','microsoft-learn-inventory-picks-de'],
  ['es-ES','Selector de inventario','Cdad. a manipular','Warehouse.SetQtyToHandlePick','microsoft-learn-inventory-picks-es'],
  ['da-DK','Pluk (lager)','Håndteringsantal','Warehouse.SetQtyToHandlePick','microsoft-learn-inventory-picks-da'],
  ['fi-FI','Varaston poiminta','Käsiteltävä määrä','Warehouse.SetQtyToHandlePick','microsoft-learn-inventory-picks-fi'],
  ['nb-NO','Lagerplukking','Ant. som skal håndt','Warehouse.SetQtyToHandlePick','microsoft-learn-inventory-picks-nb']
];
for (const [locale,pageCaption,fieldCaption,ruleId,sourceId] of samples) {
  const found=repository.resolveAction({language:locale,context:{pageCaption,fieldCaption}});
  assert.equal(found.status,'resolved',`${locale} inventory-pick quantity should resolve`);
  assert.equal(found.candidates[0].provenance.ruleId,ruleId);
  assert.equal(found.candidates[0].provenance.language,locale);
  assert.ok(found.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===sourceId),`${locale} should cite localized Microsoft Learn evidence`);
}
const pickPostSamples=[
 ['sv-SE','Lagerplockning','Bokför'],['en-US','Inventory Pick','Post'],
 ['fr-FR','Prélèvement stock','Valider'],['de-DE','Lagerkommissionierung','Posten'],
 ['es-ES','Selector de inventario','Registrar'],['da-DK','Pluk (lager)','Bogfør'],
 ['fi-FI','Varaston poiminta','Kirjaa'],['nb-NO','Lagerplukking','Bokfør']
];
for(const [locale,pageCaption,actionCaption] of pickPostSamples){
 const found=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
 assert.equal(found.status,'resolved',locale+' inventory-pick posting should resolve');
 assert.equal(found.candidates[0].provenance.ruleId,'Warehouse.PostInventoryPick');
 assert.equal(found.candidates[0].provenance.language,locale);
}
const receiveQuantitySamples=[
 ['sv-SE','Dist.lager inleverans','Ant. att inlevereras'],['en-US','Warehouse Receipt','Qty. to Receive'],
 ['fr-FR','Réception entrepôt','Quantité à recevoir'],['de-DE','Lagerort-Eingang','Zu empfangende Menge'],
 ['es-ES','Recep. almacén','Cdad. a recibir'],['da-DK','Lagermodtagelse','Modtag (antal)'],
 ['fi-FI','F. varastoinnin vastaanotto','Vastaanotettava määrä'],['nb-NO','Lagermottak','Antall som skal mottas']
];
for(const [locale,pageCaption,fieldCaption] of receiveQuantitySamples){
 const found=repository.resolveAction({language:locale,context:{pageCaption,fieldCaption}});
 assert.equal(found.status,'resolved',locale+' warehouse-receipt quantity should resolve');
 assert.equal(found.candidates[0].provenance.ruleId,'Warehouse.SetQtyToReceive');
 assert.equal(found.candidates[0].provenance.language,locale);
}
const operational = [
  ['sv-SE','Dist.lager inleverans','Bokför inleverans','Warehouse.PostReceiptAction','microsoft-learn-advanced-receiving-putaway-sv'],
  ['en-US','Warehouse Receipt','Post Receipt','Warehouse.PostReceiptAction','microsoft-learn-advanced-receiving-putaway'],
  ['fr-FR','Réception entrepôt','Valider réception','Warehouse.PostReceiptAction','microsoft-learn-advanced-receiving-putaway-fr'],
  ['de-DE','Lagerort-Eingang','Wareneingang buchen','Warehouse.PostReceiptAction','microsoft-learn-advanced-receiving-putaway-de'],
  ['es-ES','Recep. almacén','Registrar recepción','Warehouse.PostReceiptAction','microsoft-learn-advanced-receiving-putaway-es'],
  ['da-DK','Lagermodtagelse','Bogfør modtagelse','Warehouse.PostReceiptAction','microsoft-learn-advanced-receiving-putaway-da'],
  ['fi-FI','F. varastoinnin vastaanotto','Kirjaa vastaanotto','Warehouse.PostReceiptAction','microsoft-learn-advanced-receiving-putaway-fi'],
  ['nb-NO','Lagermottak','Bokfør mottak','Warehouse.PostReceiptAction','microsoft-learn-advanced-receiving-putaway-nb'],
  ['sv-SE','Dist.lager artikelinförsel','Registrera artikelinförsel','Warehouse.RegisterPutAway','microsoft-learn-warehouse-putaways-sv'],
  ['en-US','Warehouse Put-away','Register Put-Away','Warehouse.RegisterPutAway','microsoft-learn-advanced-receiving-putaway'],
  ['fr-FR','Rangement entrepôt','Valider rangement','Warehouse.RegisterPutAway','microsoft-learn-warehouse-putaways-fr'],
  ['de-DE','Lagereinlagerung','Einlagerung registrieren','Warehouse.RegisterPutAway','microsoft-learn-warehouse-putaways-de'],
  ['es-ES','Almacenamiento de almacén','Registrar ubicación','Warehouse.RegisterPutAway','microsoft-learn-warehouse-putaways-es'],
  ['da-DK','Læg-på-lager (lager)','Registrer læg-på-lager','Warehouse.RegisterPutAway','microsoft-learn-warehouse-putaways-da'],
  ['fi-FI','Varaston hyllytys','Rekisteröi hyllytys','Warehouse.RegisterPutAway','microsoft-learn-warehouse-putaways-fi'],
  ['nb-NO','Lagerplassering','Registrer plassering','Warehouse.RegisterPutAway','microsoft-learn-warehouse-putaways-nb']
];
for (const [locale,pageCaption,actionCaption,ruleId,sourceId] of operational) {
  const found=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
  assert.equal(found.status,'resolved',`${locale} ${ruleId} should resolve`);
  assert.equal(found.candidates[0].provenance.ruleId,ruleId);
  assert.equal(found.candidates[0].provenance.language,locale);
  assert.ok(found.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===sourceId),`${locale} should cite a localized source`);
}
for (const ruleId of ['Warehouse.SetQtyToHandlePick','Warehouse.PostInventoryPick','Warehouse.SetQtyToReceive','Warehouse.PostReceiptAction','Warehouse.RegisterPutAway']) {
 const rule=imported.snapshot.packs.find(x=>x.packId==='bc-warehouse').rules.find(x=>x.ruleId===ruleId);
 for(const locale of ['sv-SE','en-US','fr-FR','de-DE','es-ES','da-DK','fi-FI','nb-NO']) assert.ok(rule.languages.includes(locale),`${ruleId} should declare ${locale}`);
}
const availabilitySamples = [
  ['sv-SE','Artikelkort','Händelse','Period','Lagerställe','Artiklar per lagerställe','Artikeldisposition per strukturnivå','Variant','sv'],
  ['en-US','Item Card','Event','Period','Location','Items by Location','Item Availability by BOM Level','Variant',''],
  ['fr-FR','Fiche article','Événement','Période','Magasin','Articles par magasin','Disponibilité article par niveau de nomenclature','Variante','fr'],
  ['de-DE','Artikelkarte','Ereignis','Periode','Lagerplatz','Artikel nach Lagerort','Artikelverfügbarkeit nach Stücklistenebene','Variante','de'],
  ['es-ES','Ficha de producto','Evento','Periodo','Almacén','Productos por almacén','Disponibilidad producto por nivel L.M.','Variante','es'],
  ['da-DK','Varekort','Hændelse','Periode','Lokation','Varer pr. lokation','Varedisponering pr. styklisteniveau','Variant','da'],
  ['fi-FI','Nimikkeen kortti','Tapahtuma','Jakso','Sijainti','Nimikkeet sijainneittain','Nimikkeen saatavuus tuoterakennetason mukaan','Variantti','fi'],
  ['nb-NO','Varekort','Hendelse','Periode','Lokasjon','Varer per lokasjon','Varetilgjengelighet etter stykklistenivå','Variant','nb']
];
const availabilityRules = [
  'Warehouse.ViewAvailabilityByEvent','Warehouse.ViewAvailabilityByPeriod','Warehouse.ViewAvailabilityByLocation',
  'Warehouse.ViewItemsByLocation','Warehouse.ViewAvailabilityByBOMLevel','Warehouse.ViewAvailabilityByVariant'
];
for (const [locale,pageCaption,event,period,location,items,bom,variant,sourceSuffix] of availabilitySamples) {
  const sourceId = `microsoft-learn-item-availability${sourceSuffix ? `-${sourceSuffix}` : ''}`;
  for (const [actionCaption,ruleId] of [
    [event,'Warehouse.ViewAvailabilityByEvent'],[period,'Warehouse.ViewAvailabilityByPeriod'],
    [location,'Warehouse.ViewAvailabilityByLocation'],[items,'Warehouse.ViewItemsByLocation'],
    [bom,'Warehouse.ViewAvailabilityByBOMLevel'],[variant,'Warehouse.ViewAvailabilityByVariant']
  ]) {
    const found=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
    assert.equal(found.status,'resolved',`${locale} ${actionCaption} should resolve`);
    assert.equal(found.candidates[0].provenance.ruleId,ruleId,`${locale} ${actionCaption} should map to ${ruleId}`);
    assert.equal(found.candidates[0].provenance.language,locale);
    assert.ok(found.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===sourceId),`${locale} should cite its localized Microsoft Learn source`);
  }
}
const createPickSamples=[
 ['sv-SE','Skapa lagerartikelinförsel/plocka','microsoft-learn-inventory-picks-sv'],
 ['en-US','Create Inventory Put-away/Pick','microsoft-learn-inventory-picks'],
 ['fr-FR','Créer prélèv./rangement stock','microsoft-learn-inventory-picks-fr'],
 ['de-DE','Lagereinlagerung/Kommissionierung erstellen','microsoft-learn-inventory-picks-de'],
 ['es-ES','Crear ubicac. invent./picking','microsoft-learn-inventory-picks-es'],
 ['da-DK','Opret læg-på-lager/pluk (lager)','microsoft-learn-inventory-picks-da'],
 ['fi-FI','Luo varaston hyllytys tai poiminta','microsoft-learn-inventory-picks-fi'],
 ['nb-NO','Opprett lagerplassering/-plukking','microsoft-learn-inventory-picks-nb']
];
for(const [locale,actionCaption,sourceId] of createPickSamples){
 const found=repository.resolveAction({language:locale,context:{actionCaption}});
 assert.equal(found.status,'resolved',`${locale} create pick should resolve`);
 assert.equal(found.candidates[0].provenance.ruleId,'Warehouse.CreatePick');
 assert.equal(found.candidates[0].provenance.language,locale);
 assert.ok(found.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===sourceId),`${locale} create pick should cite localized Microsoft Learn evidence`);
}
const registerPickSamples=[
 ['en-US','Warehouse Picks','Register Pick','microsoft-learn-warehouse-pick-shipment'],
 ['sv-SE','Lagerval','Registrera plockning','microsoft-learn-warehouse-pick-shipment-sv'],
 ['fr-FR','Les sélections de l’entrepôt','Enregistrer prélèvement','microsoft-learn-warehouse-pick-shipment-fr'],
 ['de-DE','Lagerauswahl','Kommissionierung registrieren','microsoft-learn-warehouse-pick-shipment-de'],
 ['es-ES','Selecciones de Almacén','Registrar picking','microsoft-learn-warehouse-pick-shipment-es'],
 ['da-DK','Lagerpluk','Registrer pluk','microsoft-learn-warehouse-pick-shipment-da'],
 ['fi-FI','Varaston valinnat','Rekisteröi poiminta','microsoft-learn-warehouse-pick-shipment-fi'],
 ['nb-NO','Lagervalg','Registrer plukk','microsoft-learn-warehouse-pick-shipment-nb']
];
for(const [locale,pageCaption,actionCaption,sourceId] of registerPickSamples){
 const found=repository.resolveAction({language:locale,context:{pageCaption,actionCaption}});
 assert.equal(found.status,'resolved',`${locale} warehouse Register Pick should resolve`);
 assert.equal(found.candidates[0].provenance.ruleId,'Warehouse.RegisterPick');
 assert.equal(found.candidates[0].provenance.language,locale);
 assert.ok(found.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===sourceId),`${locale} Register Pick should cite localized source`);
 const wrongPage=repository.resolveAction({language:locale,context:{pageCaption:'Sales Order',actionCaption}});
 assert.notEqual(wrongPage.status,'resolved',`${locale} warehouse Register Pick must require warehouse-pick context`);
}
for (const ruleId of [...availabilityRules,'Warehouse.SetQtyToHandlePick','Warehouse.PostInventoryPick','Warehouse.SetQtyToReceive','Warehouse.PostReceiptAction','Warehouse.RegisterPutAway','Warehouse.RegisterPick']) {
 const rule=imported.snapshot.packs.find(x=>x.packId==='bc-warehouse').rules.find(x=>x.ruleId===ruleId);
 for(const locale of ['sv-SE','en-US','fr-FR','de-DE','es-ES','da-DK','fi-FI','nb-NO']) assert.ok(rule.languages.includes(locale),`${ruleId} should declare ${locale}`);
}
const createPickRule=imported.snapshot.packs.find(x=>x.packId==='bc-warehouse').rules.find(x=>x.ruleId==='Warehouse.CreatePick');
for(const locale of ['sv-SE','en-US','fr-FR','de-DE','es-ES','da-DK','fi-FI','nb-NO']) assert.ok(createPickRule.languages.includes(locale),`Warehouse.CreatePick should declare ${locale}`);
console.log('Warehouse pick creation, receiving, put-away and documented item-availability matching passes across all eight supported locales.');
