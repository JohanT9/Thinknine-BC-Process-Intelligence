const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../src/engine/knowledge-repository');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/knowledge-packs/index.json'),'utf8'));
const packs=manifest.packs.filter(x=>x.enabled).map(x=>({packId:x.packId,pack:JSON.parse(fs.readFileSync(path.join(root,'src',x.file),'utf8'))}));
const imported=api.importRelease(manifest,packs);assert.equal(imported.ok,true,JSON.stringify(imported.diagnostics));
const repo=api.createRepository(imported.snapshot);
const locales=['sv-SE','en-US','fr-FR','de-DE','es-ES','da-DK','fi-FI','nb-NO'];
const sales=[
 ['sv-SE','Förs.order','Ant. att utleverera','Kvantitet','Bokför','microsoft-learn-sales-order-process-sv'],
 ['en-US','Sales Order','Qty. to Ship','Quantity','Post','microsoft-learn-sales-order-process'],
 ['fr-FR','Commande vente','Qté à expédier','Quantité','Valider','microsoft-learn-sales-order-process-fr'],
 ['de-DE','Verkaufsauftrag','Menge für Versand','Menge','Buchen','microsoft-learn-sales-order-process-de'],
 ['es-ES','Pedido de venta','Cantidad a enviar','Cantidad','Registrar','microsoft-learn-sales-order-process-es'],
 ['da-DK','Salgsordre','Lever antal','Antal','Bogfør','microsoft-learn-sales-order-process-da'],
 ['fi-FI','Myyntitilaus','Toimitettava määrä','Määrä','Kirjaa','microsoft-learn-sales-order-process-fi'],
 ['nb-NO','Ordre','Levere (antall)','Antall','Bokfør','microsoft-learn-sales-order-process-nb']
];
for(const [locale,page,ship,quantity,post,source] of sales){
 for(const [field,ruleId] of [[ship,'Sales.SetQtyToShip'],[quantity,'Sales.SetSalesLineQuantity']]){
  const result=repo.resolveAction({language:locale,context:{pageCaption:page,fieldCaption:field}});
  assert.equal(result.status,'resolved',`${locale} ${ruleId}`);assert.equal(result.candidates[0].provenance.ruleId,ruleId);
  assert.equal(result.candidates[0].provenance.language,locale);assert.ok(result.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===source));
 }
 const posted=repo.resolveAction({language:locale,context:{pageCaption:page,actionCaption:post}});
 assert.equal(posted.status,'resolved',`${locale} sales post`);assert.equal(posted.candidates[0].provenance.ruleId,'Sales.Post');
}
const salesAux=[
 ['sv-SE','Förs.order','Nr.','Kundens namn','Släpp','microsoft-learn-sales-order-process-sv'],
 ['en-US','Sales Order','No.','Customer Name','Release','microsoft-learn-sales-order-process'],
 ['fr-FR','Commande vente','N°','Nom client','Lancer','microsoft-learn-sales-order-process-fr'],
 ['de-DE','Verkaufsauftrag','Nr.','Kundenname','Freigabe','microsoft-learn-sales-order-process-de'],
 ['es-ES','Pedido de venta','N.º','Nombre del cliente','Liberar','microsoft-learn-sales-order-process-es'],
 ['da-DK','Salgsordre','Nr.','Kundenavn','Frigiv','microsoft-learn-sales-order-process-da'],
 ['fi-FI','Myyntitilaus','Nro.','Asiakkaan nimi','Vapauta','microsoft-learn-sales-order-process-fi'],
 ['nb-NO','Ordre','Nr.','Kundenavn','Frigi','microsoft-learn-sales-order-process-nb']
];
for(const [locale,page,itemField,customerField,release,source] of salesAux){
 for(const [field,ruleId] of [[itemField,'Sales.SelectSalesLineItem'],[customerField,'Sales.SelectCustomer']]){
  const result=repo.resolveAction({language:locale,context:{pageCaption:page,fieldCaption:field}});
  assert.equal(result.status,'resolved',locale+' '+ruleId);assert.equal(result.candidates[0].provenance.ruleId,ruleId);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===source));
 }
 const result=repo.resolveAction({language:locale,context:{pageCaption:page,actionCaption:release}});
 assert.equal(result.status,'resolved',locale+' sales release');assert.equal(result.candidates[0].provenance.ruleId,'Sales.Release');
}
const purchase=[
 ['sv-SE','Inköpsorder','Inlevereras antal','Kvantitet','Bokför','microsoft-learn-purchase-recording-sv'],
 ['en-US','Purchase Order','Qty. to Receive','Quantity','Post','microsoft-learn-purchase-recording'],
 ['fr-FR','Commande achat','Qté à recevoir','Quantité','Valider','microsoft-learn-purchase-recording-fr'],
 ['de-DE','Bestellung','Menge akt. Lieferung','Menge','Buchen','microsoft-learn-purchase-recording-de'],
 ['es-ES','Pedido de compra','Cantidad a recibir','Cantidad','Registrar','microsoft-learn-purchase-recording-es'],
 ['da-DK','Indkøbsordre','Modtag (antal)','Antal','Bogfør','microsoft-learn-purchase-recording-da'],
 ['fi-FI','Ostotilaus','Vastaanotettava määrä','Määrä','Kirjaa','microsoft-learn-purchase-recording-fi'],
 ['nb-NO','Bestilling','Motta (antall)','Antall','Bokfør','microsoft-learn-purchase-recording-nb']
];
const purchaseAux=[
 ['sv-SE','Inköpsorder','Artikelnr','Leverantörsnamn','Släpp','microsoft-learn-purchase-recording-sv'],
 ['en-US','Purchase Order','Item No.','Vendor Name','Release','microsoft-learn-purchase-recording'],
 ['fr-FR','Commande achat','N° article','Nom fournisseur','Lancer','microsoft-learn-purchase-recording-fr'],
 ['de-DE','Bestellung','Positionsnummer','Kreditorenname','Freigabe','microsoft-learn-purchase-recording-de'],
 ['es-ES','Pedido de compra','N.º producto','Nombre del proveedor','Liberar','microsoft-learn-purchase-recording-es'],
 ['da-DK','Indkøbsordre','Varenr.','Kreditornavn','Frigiv','microsoft-learn-purchase-recording-da'],
 ['fi-FI','Ostotilaus','Nimikkeen nro','Toimittajan nimi','Vapauta','microsoft-learn-purchase-recording-fi'],
 ['nb-NO','Bestilling','Varenr.','Leverandørnavn','Frigi','microsoft-learn-purchase-recording-nb']
];
for(const [locale,page,itemField,vendorField,release,source] of purchaseAux){
 for(const [field,ruleId] of [[itemField,'Purchase.SelectPurchaseLineItem'],[vendorField,'Purchase.SelectVendor']]){
  const result=repo.resolveAction({language:locale,context:{pageCaption:page,fieldCaption:field}});
  assert.equal(result.status,'resolved',locale+' '+ruleId);assert.equal(result.candidates[0].provenance.ruleId,ruleId);
  assert.ok(result.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===source));
 }
 const result=repo.resolveAction({language:locale,context:{pageCaption:page,actionCaption:release}});
 assert.equal(result.status,'resolved',locale+' purchase release');assert.equal(result.candidates[0].provenance.ruleId,'Purchase.Release');
}
for(const [locale,page,receive,quantity,post,source] of purchase){
 for(const [field,ruleId] of [[receive,'Purchase.SetQtyToReceive'],[quantity,'Purchase.SetPurchaseLineQuantity']]){
  const result=repo.resolveAction({language:locale,context:{pageCaption:page,fieldCaption:field}});
  assert.equal(result.status,'resolved',`${locale} ${ruleId}`);assert.equal(result.candidates[0].provenance.ruleId,ruleId);
  assert.equal(result.candidates[0].provenance.language,locale);assert.ok(result.candidates[0].provenance.sourceRefs.some(x=>x.sourceId===source));
 }
 const posted=repo.resolveAction({language:locale,context:{pageCaption:page,actionCaption:post}});
 assert.equal(posted.status,'resolved',`${locale} purchase post`);assert.equal(posted.candidates[0].provenance.ruleId,'Purchase.Post');
}
for(const packId of ['bc-sales','bc-purchase'])for(const rule of imported.snapshot.packs.find(x=>x.packId===packId).rules.filter(x=>x.languages?.includes('fr-FR')||x.sourceIds?.some(id=>/order-process-|purchase-recording-/.test(id))))for(const locale of locales)assert.ok(rule.languages.includes(locale),`${rule.ruleId} ${locale}`);
console.log('Sales and purchase line, shipment/receipt quantity, and posting rules resolve in all eight supported locales.');
