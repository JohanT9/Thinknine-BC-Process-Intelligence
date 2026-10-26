(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeExplanationCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const locales = ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"];
  const text = {
    serviceResourceAllocation: {
      "sv-SE": "Tilldelningen kopplar en resurs eller resursgrupp till en serviceuppgift och anger planerat datum och timmar. Statusen Aktiv betyder att arbetet är tilldelat, inte att det är utfört; registrerade arbetstimmar och reparationsstatus hanteras separat. Kontrollera tillgänglighet och serviceartikel.",
      "en-US": "This allocation assigns a resource or resource group to a service task and records the planned date and hours. Active means the work is assigned, not completed; actual resource hours and repair status are tracked separately. Check availability and the service item.",
      "fr-FR": "Cette affectation associe une ressource ou un groupe de ressources à une tâche de service et indique la date et les heures prévues. Le statut Actif signifie que le travail est affecté, pas qu’il est terminé ; les heures réellement enregistrées et le statut de réparation sont suivis séparément. Vérifiez la disponibilité et l’article de service.",
      "de-DE": "Diese Zuordnung weist einer Serviceaufgabe eine Ressource oder Ressourcengruppe sowie geplantes Datum und Stunden zu. Aktiv bedeutet, dass die Arbeit zugewiesen ist, nicht dass sie abgeschlossen wurde; tatsächliche Ressourcenstunden und Reparaturstatus werden getrennt erfasst. Prüfen Sie Verfügbarkeit und Serviceartikel.",
      "es-ES": "Esta asignación vincula un recurso o grupo de recursos a una tarea de servicio e indica la fecha y las horas previstas. Activo significa que el trabajo está asignado, no que se haya completado; las horas reales y el estado de reparación se registran por separado. Comprueba la disponibilidad y el producto de servicio.",
      "da-DK": "Allokeringen knytter en ressource eller ressourcegruppe til en serviceopgave og angiver planlagt dato og timer. Aktiv betyder, at arbejdet er tildelt, ikke at det er udført; registrerede timer og reparationsstatus håndteres separat. Kontrollér tilgængelighed og serviceartikel.",
      "fi-FI": "Kohdistus liittää resurssin tai resurssiryhmän palvelutehtävään ja määrittää suunnitellun päivämäärän ja tunnit. Aktiivinen tarkoittaa, että työ on kohdistettu, ei että se on tehty; toteutuneet resurssitunnit ja korjaustila käsitellään erikseen. Tarkista saatavuus ja huoltonimike.",
      "nb-NO": "Tildelingen knytter en ressurs eller ressursgruppe til en serviceoppgave og angir planlagt dato og timer. Aktiv betyr at arbeidet er tildelt, ikke at det er utført; registrerte timer og reparasjonsstatus håndteres separat. Kontroller tilgjengelighet og servicevare."
    },
    serviceRepairStatus: {
      "sv-SE": "Serviceorderns status sammanfattar reparationsstatusen för orderns serviceartiklar enligt företagets kopplingar och prioritetsordning. Den är separat från Frisläppningsstatus, som styr lagerhanteringen. En ändring av reparationsstatus kan därför påverka orderstatus utan att i sig visa att arbetet är bokfört eller avslutat.",
      "en-US": "The service order status summarizes the repair statuses of its service items according to the configured mappings and priorities. It is separate from Release Status, which controls warehouse handling. Changing a repair status can therefore affect the order status without itself proving that work was posted or completed.",
      "fr-FR": "Le statut de la commande de service résume les statuts de réparation de ses articles selon les correspondances et priorités configurées. Il est distinct du statut de lancement, qui détermine le traitement en entrepôt. Modifier un statut de réparation peut donc modifier le statut de la commande sans prouver que le travail est comptabilisé ou terminé.",
      "de-DE": "Der Serviceauftragsstatus fasst die Reparaturstatus der Serviceartikel gemäß den eingerichteten Zuordnungen und Prioritäten zusammen. Er ist getrennt vom Freigabestatus, der die Lagerabwicklung steuert. Eine Änderung des Reparaturstatus kann daher den Auftragsstatus beeinflussen, ohne zu belegen, dass die Arbeit gebucht oder abgeschlossen wurde.",
      "es-ES": "El estado del pedido de servicio resume los estados de reparación de sus productos de servicio según las correspondencias y prioridades configuradas. Es distinto del estado de lanzamiento, que controla la gestión del almacén. Cambiar un estado de reparación puede modificar el estado del pedido sin demostrar que el trabajo se haya registrado o completado.",
      "da-DK": "Serviceordrestatus opsummerer reparationsstatus for ordrens serviceartikler efter de konfigurerede tilknytninger og prioriteter. Den er adskilt fra frigivelsesstatus, som styrer lagerhåndteringen. En ændring af reparationsstatus kan derfor påvirke ordrestatus uden i sig selv at vise, at arbejdet er bogført eller afsluttet.",
      "fi-FI": "Huoltotilauksen tila kokoaa sen huoltonimikkeiden korjaustilat määritettyjen määritysten ja prioriteettien mukaan. Se on erillinen vapautustilasta, joka ohjaa varastonkäsittelyä. Korjaustilan muutos voi siksi vaikuttaa tilauksen tilaan osoittamatta, että työ olisi kirjattu tai valmis.",
      "nb-NO": "Serviceordrestatus oppsummerer reparasjonsstatusen for servicevarene i ordren etter de konfigurerte koblingene og prioritetene. Den er separat fra frigivelsesstatus, som styrer lagerhåndteringen. En endring av reparasjonsstatus kan derfor påvirke ordrestatus uten i seg selv å vise at arbeidet er bokført eller fullført."
    },
    open: {
      "sv-SE": "Steget öppnar den angivna Business Central-sidan eller relaterade listan. Att öppna sidan visar aktuella poster men ändrar inte i sig affärsdata.",
      "en-US": "This step opens the indicated Business Central page or related list. Opening the page displays current records but does not itself change business data.",
      "fr-FR": "Cette étape ouvre la page Business Central indiquée ou une liste associée. L’ouverture affiche les enregistrements actuels sans modifier les données métier.",
      "de-DE": "Dieser Schritt öffnet die angegebene Business Central-Seite oder eine zugehörige Liste. Das Öffnen zeigt aktuelle Datensätze an und ändert selbst keine Geschäftsdaten.",
      "es-ES": "Este paso abre la página indicada de Business Central o una lista relacionada. Abrirla muestra los registros actuales, pero no modifica por sí mismo los datos empresariales.",
      "da-DK": "Dette trin åbner den angivne Business Central-side eller en relateret liste. Siden viser aktuelle poster, men ændrer ikke i sig selv forretningsdata.",
      "fi-FI": "Tämä vaihe avaa määritetyn Business Central -sivun tai siihen liittyvän luettelon. Sivun avaaminen näyttää nykyiset tietueet mutta ei itsessään muuta liiketoimintatietoja.",
      "nb-NO": "Dette trinnet åpner den angitte Business Central-siden eller en relatert liste. Siden viser gjeldende poster, men endrer ikke forretningsdata i seg selv."
    },
    search: {
      "sv-SE": "Sökningen hittar en Business Central-sida eller post utifrån den angivna texten. Kontrollera att rätt sida eller post valts innan du fortsätter.",
      "en-US": "The search locates a Business Central page or record from the entered text. Confirm that the intended page or record is selected before continuing.",
      "fr-FR": "La recherche trouve une page ou un enregistrement Business Central à partir du texte saisi. Vérifiez que l’élément voulu est sélectionné avant de continuer.",
      "de-DE": "Die Suche findet anhand des eingegebenen Textes eine Business Central-Seite oder einen Datensatz. Prüfen Sie vor dem Fortfahren, ob das gewünschte Element ausgewählt ist.",
      "es-ES": "La búsqueda localiza una página o un registro de Business Central a partir del texto introducido. Comprueba que se ha seleccionado el elemento correcto antes de continuar.",
      "da-DK": "Søgningen finder en Business Central-side eller post ud fra den indtastede tekst. Kontrollér, at den ønskede side eller post er valgt, før du fortsætter.",
      "fi-FI": "Haku etsii Business Central -sivun tai tietueen annetun tekstin perusteella. Varmista ennen jatkamista, että valittuna on oikea sivu tai tietue.",
      "nb-NO": "Søket finner en Business Central-side eller post ut fra teksten du skrev inn. Kontroller at riktig side eller post er valgt før du fortsetter."
    },
    create: {
      "sv-SE": "Åtgärden skapar en ny post eller ett nytt dokumentutkast. Kontrollera obligatoriska fält och standardvärden innan du sparar eller bokför det.",
      "en-US": "The action creates a new record or document draft. Check required fields and default values before saving or posting it.",
      "fr-FR": "L’action crée un nouvel enregistrement ou un brouillon de document. Vérifiez les champs obligatoires et les valeurs par défaut avant de l’enregistrer ou de le valider.",
      "de-DE": "Die Aktion erstellt einen neuen Datensatz oder Dokumententwurf. Prüfen Sie Pflichtfelder und Standardwerte, bevor Sie ihn speichern oder buchen.",
      "es-ES": "La acción crea un registro nuevo o un borrador de documento. Revisa los campos obligatorios y los valores predeterminados antes de guardarlo o registrarlo.",
      "da-DK": "Handlingen opretter en ny post eller et dokumentkladde. Kontrollér obligatoriske felter og standardværdier, før du gemmer eller bogfører det.",
      "fi-FI": "Toiminto luo uuden tietueen tai asiakirjaluonnoksen. Tarkista pakolliset kentät ja oletusarvot ennen tallentamista tai kirjaamista.",
      "nb-NO": "Handlingen oppretter en ny post eller et dokumentutkast. Kontroller obligatoriske felt og standardverdier før du lagrer eller bokfører det."
    },
    release: {
      "sv-SE": "Släppet markerar dokumentet som klart för nästa arbetsmoment. Det bokför inte i sig dokumentrader eller skapar bokförda leverans-, mottagnings- eller fakturaposter.",
      "en-US": "Releasing marks the document as ready for the next workflow step. It does not itself post document lines or create posted shipment, receipt, or invoice entries.",
      "fr-FR": "La libération marque le document comme prêt pour l’étape suivante du processus. Elle ne comptabilise pas les lignes et ne crée pas à elle seule d’expédition, réception ou facture enregistrée.",
      "de-DE": "Die Freigabe kennzeichnet das Dokument als bereit für den nächsten Arbeitsschritt. Sie bucht selbst keine Zeilen und erstellt keine gebuchten Liefer-, Wareneingangs- oder Rechnungsposten.",
      "es-ES": "La liberación marca el documento como listo para el siguiente paso del flujo. Por sí sola no registra líneas ni crea movimientos de envío, recepción o factura registrados.",
      "da-DK": "Frigivelsen markerer dokumentet som klar til næste arbejdstrin. Den bogfører ikke i sig selv dokumentlinjer eller opretter bogførte leverancer, modtagelser eller fakturaer.",
      "fi-FI": "Vapautus merkitsee asiakirjan valmiiksi seuraavaa työnkulkua varten. Se ei itsessään kirjaa rivejä eikä luo kirjattuja lähetys-, vastaanotto- tai laskutustapahtumia.",
      "nb-NO": "Frigivelsen markerer dokumentet som klart for neste arbeidsflyttrinn. Den bokfører ikke dokumentlinjer eller oppretter bokførte leveranser, mottak eller fakturaer i seg selv."
    },
    reopen: {
      "sv-SE": "Återöppning gör dokumentet tillgängligt för ändring igen. Den återför inte redan bokförda poster; kontrollera dokumentstatus innan du redigerar.",
      "en-US": "Reopening makes the document available for editing again. It does not reverse entries that have already been posted; check the document status before editing.",
      "fr-FR": "La réouverture rend à nouveau le document modifiable. Elle n’annule pas les écritures déjà comptabilisées ; vérifiez le statut avant toute modification.",
      "de-DE": "Durch das erneute Öffnen kann das Dokument wieder bearbeitet werden. Bereits gebuchte Posten werden dadurch nicht rückgängig gemacht; prüfen Sie vorher den Dokumentstatus.",
      "es-ES": "Al reabrirlo, el documento vuelve a estar disponible para edición. No se revierten los movimientos ya registrados; comprueba el estado antes de modificarlo.",
      "da-DK": "Genåbning gør dokumentet tilgængeligt for redigering igen. Allerede bogførte poster tilbageføres ikke; kontrollér dokumentstatus før redigering.",
      "fi-FI": "Uudelleenavaus mahdollistaa asiakirjan muokkaamisen. Se ei peru jo kirjattuja tapahtumia; tarkista asiakirjan tila ennen muokkaamista.",
      "nb-NO": "Når dokumentet åpnes på nytt, kan det redigeres igjen. Allerede bokførte poster blir ikke reversert; kontroller dokumentstatus før du redigerer."
    },
    post: {
      "sv-SE": "Bokföring registrerar dokumentets rader i relevanta reskontror och huvudböcker. Beroende på dokumenttyp kan den även skapa bokförda leverans-, mottagnings- eller fakturadokument. Granska rader, belopp och dimensioner först.",
      "en-US": "Posting records the document lines in the relevant subledgers and general ledger. Depending on the document type, it can also create posted shipment, receipt, or invoice documents. Review lines, amounts, and dimensions first.",
      "fr-FR": "La comptabilisation enregistre les lignes dans les auxiliaires et le grand livre concernés. Selon le type de document, elle peut aussi créer des expéditions, réceptions ou factures enregistrées. Vérifiez d’abord les lignes, montants et dimensions.",
      "de-DE": "Die Buchung erfasst die Dokumentzeilen in den relevanten Nebenbüchern und im Hauptbuch. Je nach Dokumenttyp können gebuchte Lieferungen, Wareneingänge oder Rechnungen entstehen. Prüfen Sie zuerst Zeilen, Beträge und Dimensionen.",
      "es-ES": "El registro contabiliza las líneas en los auxiliares y el libro mayor correspondientes. Según el tipo de documento, también puede crear envíos, recepciones o facturas registrados. Revisa antes las líneas, los importes y las dimensiones.",
      "da-DK": "Bogføring registrerer dokumentlinjerne i de relevante underposter og finans. Afhængigt af dokumenttypen kan den også oprette bogførte leverancer, modtagelser eller fakturaer. Kontrollér først linjer, beløb og dimensioner.",
      "fi-FI": "Kirjaus tallentaa asiakirjan rivit asianomaisiin aputileihin ja pääkirjaan. Asiakirjatyypistä riippuen se voi myös luoda kirjattuja lähetys-, vastaanotto- tai laskuasiakirjoja. Tarkista ensin rivit, summat ja dimensiot.",
      "nb-NO": "Bokføring registrerer dokumentlinjene i relevante reskontroer og hovedboken. Avhengig av dokumenttypen kan den også opprette bokførte leveranser, mottak eller fakturaer. Kontroller linjer, beløp og dimensjoner først."
    },
    quantity: {
      "sv-SE": "Mängden anger hur stor del av raden som omfattas av det här arbetsmomentet. Fältet kan avse exempelvis leverans, mottagning, hantering, förbrukning, utfall eller fakturering; kontrollera fältnamnet och tidigare bokförd mängd.",
      "en-US": "The quantity specifies how much of the line is included in this operation. The field may refer to shipping, receiving, handling, consumption, output, or invoicing; check its caption and previously posted quantity.",
      "fr-FR": "La quantité indique quelle partie de la ligne est concernée par cette opération. Le champ peut correspondre à l’expédition, la réception, le traitement, la consommation, la production ou la facturation ; vérifiez son libellé et les quantités déjà comptabilisées.",
      "de-DE": "Die Menge gibt an, welcher Anteil der Zeile in diesem Vorgang berücksichtigt wird. Das Feld kann Lieferung, Wareneingang, Bearbeitung, Verbrauch, Output oder Rechnungsstellung betreffen; prüfen Sie Feldbezeichnung und bereits gebuchte Menge.",
      "es-ES": "La cantidad indica qué parte de la línea se incluye en esta operación. El campo puede referirse a envío, recepción, gestión, consumo, producción o facturación; comprueba su nombre y la cantidad ya registrada.",
      "da-DK": "Antallet angiver, hvor stor en del af linjen der indgår i denne handling. Feltet kan gælde levering, modtagelse, håndtering, forbrug, produktion eller fakturering; kontrollér feltets navn og allerede bogført antal.",
      "fi-FI": "Määrä ilmaisee, kuinka suuri osa rivistä sisältyy tähän toimintoon. Kenttä voi koskea toimitusta, vastaanottoa, käsittelyä, kulutusta, tuotosta tai laskutusta; tarkista kentän nimi ja jo kirjattu määrä.",
      "nb-NO": "Antallet angir hvor stor del av linjen som omfattes av denne handlingen. Feltet kan gjelde levering, mottak, håndtering, forbruk, produksjon eller fakturering; kontroller feltnavnet og tidligere bokført antall."
    },
    salesLineQuantity: {
      "sv-SE": "Antal anger den totala mängden på försäljningsraden – hur många enheter ordern gäller. Antal att leverera och Antal att fakturera är separata fält för leverans respektive fakturering. Kontrollera artikel, enhet och orderradens totalantal.",
      "en-US": "Quantity is the total quantity on the sales line—the number of units covered by the order. Qty. to Ship and Qty. to Invoice are separate fields for shipment and invoicing. Check the item, unit of measure, and line total.",
      "fr-FR": "La quantité correspond à la quantité totale de la ligne de vente, c’est-à-dire au nombre d’unités concernées par la commande. Qté à expédier et Qté à facturer sont des champs distincts. Vérifiez l’article, l’unité de mesure et le total de la ligne.",
      "de-DE": "Menge ist die Gesamtmenge der Verkaufszeile, also die Anzahl der Einheiten im Auftrag. Menge zu liefern und Menge zu fakturieren sind separate Felder für Lieferung und Fakturierung. Prüfen Sie Artikel, Einheit und Gesamtmenge der Zeile.",
      "es-ES": "Cantidad es la cantidad total de la línea de venta, es decir, el número de unidades del pedido. Cantidad a enviar y Cantidad a facturar son campos independientes. Comprueba el producto, la unidad de medida y el total de la línea.",
      "da-DK": "Antal er det samlede antal på salgslinjen, altså hvor mange enheder ordren omfatter. Antal til levering og Antal til fakturering er separate felter. Kontrollér varen, enheden og linjens samlede antal.",
      "fi-FI": "Määrä on myyntirivin kokonaismäärä eli tilauksen yksikkömäärä. Toimitettava määrä ja Laskutettava määrä ovat erillisiä kenttiä toimitukselle ja laskutukselle. Tarkista nimike, mittayksikkö ja rivin kokonaismäärä.",
      "nb-NO": "Antall er det samlede antallet på salgslinjen, altså hvor mange enheter ordren gjelder. Antall til levering og Antall til fakturering er separate felt. Kontroller varen, enheten og linjens totalantall."
    },
    purchaseLineQuantity: {
      "sv-SE": "Antal anger den totala mängden som beställs på inköpsraden. Antal att ta emot och Antal att fakturera är separata fält för mottagning respektive fakturering. Kontrollera artikel, enhet och beställt totalantal.",
      "en-US": "Quantity is the total amount ordered on the purchase line. Qty. to Receive and Qty. to Invoice are separate fields for receipt and invoicing. Check the item, unit of measure, and total ordered quantity.",
      "fr-FR": "La quantité correspond au total commandé sur la ligne d’achat. Qté à recevoir et Qté à facturer sont des champs distincts pour la réception et la facturation. Vérifiez l’article, l’unité de mesure et la quantité totale commandée.",
      "de-DE": "Menge ist die Gesamtmenge, die in der Einkaufszeile bestellt wird. Menge zu empfangen und Menge zu fakturieren sind separate Felder für Wareneingang und Fakturierung. Prüfen Sie Artikel, Einheit und bestellte Gesamtmenge.",
      "es-ES": "Cantidad es el total pedido en la línea de compra. Cantidad a recibir y Cantidad a facturar son campos independientes para la recepción y la facturación. Comprueba el producto, la unidad de medida y el total pedido.",
      "da-DK": "Antal er det samlede antal, der bestilles på købslinjen. Antal til modtagelse og Antal til fakturering er separate felter for modtagelse og fakturering. Kontrollér varen, enheden og det samlede bestilte antal.",
      "fi-FI": "Määrä on ostoriville tilattava kokonaismäärä. Vastaanotettava määrä ja Laskutettava määrä ovat erillisiä vastaanoton ja laskutuksen kenttiä. Tarkista nimike, mittayksikkö ja tilattu kokonaismäärä.",
      "nb-NO": "Antall er det samlede antallet som bestilles på kjøpslinjen. Antall som skal mottas og Antall til fakturering er separate felt for mottak og fakturering. Kontroller varen, enheten og samlet bestilt antall."
    },
    salesQtyToShip: {
      "sv-SE": "Antal att leverera anger hur många enheter av försäljningsraden som ska levereras nu. Det är en delleveransmängd, inte orderradens totala Antal; Antal att fakturera styrs separat. Kontrollera kvarvarande och tidigare levererad mängd.",
      "en-US": "Qty. to Ship is the number of units on the sales line to ship now. It can be a partial shipment and is not the line's total Quantity; Qty. to Invoice is controlled separately. Check the remaining and previously shipped quantities.",
      "fr-FR": "Qté à expédier indique le nombre d’unités de la ligne de vente à expédier maintenant. Il peut s’agir d’une livraison partielle, distincte de la quantité totale ; Qté à facturer est gérée séparément. Vérifiez les quantités restantes et déjà expédiées.",
      "de-DE": "Menge zu liefern gibt an, wie viele Einheiten der Verkaufszeile jetzt geliefert werden sollen. Dies kann eine Teillieferung sein und ist nicht die Gesamtmenge der Zeile; Menge zu fakturieren wird separat gesteuert. Prüfen Sie offene und bereits gelieferte Mengen.",
      "es-ES": "Cantidad a enviar indica cuántas unidades de la línea de venta se enviarán ahora. Puede ser un envío parcial y no es la Cantidad total de la línea; Cantidad a facturar se controla por separado. Comprueba las cantidades pendientes y ya enviadas.",
      "da-DK": "Antal til levering angiver, hvor mange enheder på salgslinjen der skal leveres nu. Det kan være en dellevering og er ikke linjens samlede Antal; Antal til fakturering styres separat. Kontrollér resterende og allerede leveret antal.",
      "fi-FI": "Toimitettava määrä kertoo, kuinka monta myyntirivin yksikköä toimitetaan nyt. Kyse voi olla osatoimituksesta, eikä se ole rivin kokonaismäärä; Laskutettava määrä määritetään erikseen. Tarkista jäljellä oleva ja jo toimitettu määrä.",
      "nb-NO": "Antall som skal leveres angir hvor mange enheter på salgslinjen som skal leveres nå. Det kan være en delleveranse og er ikke linjens totale Antall; Antall til fakturering styres separat. Kontroller gjenstående og allerede levert antall."
    },
    purchaseQtyToReceive: {
      "sv-SE": "Antal att ta emot anger hur många enheter av inköpsraden som registreras som mottagna nå. Det kan vara en delleverans och är inte inköpsradens totala Antal; fakturering hanteras separat. Stäm av mot faktiskt mottaget och återstående antal.",
      "en-US": "Qty. to Receive is the number of units on the purchase line being received now. It can be a partial receipt and is not the line's total Quantity; invoicing is handled separately. Compare it with the actual receipt and remaining quantity.",
      "fr-FR": "Qté à recevoir indique le nombre d’unités de la ligne d’achat reçues maintenant. Il peut s’agir d’une réception partielle, distincte de la quantité totale ; la facturation est gérée séparément. Comparez-la à la quantité réellement reçue et restante.",
      "de-DE": "Menge zu empfangen gibt an, wie viele Einheiten der Einkaufszeile jetzt eingehen. Dies kann ein Teillieferungseingang sein und ist nicht die Gesamtmenge der Zeile; die Fakturierung wird separat behandelt. Gleichen Sie die Menge mit dem tatsächlichen und verbleibenden Eingang ab.",
      "es-ES": "Cantidad a recibir indica cuántas unidades de la línea de compra se reciben ahora. Puede ser una recepción parcial y no es la Cantidad total de la línea; la facturación se gestiona por separado. Compárala con lo recibido realmente y con la cantidad pendiente.",
      "da-DK": "Antal til modtagelse angiver, hvor mange enheder på købslinjen der modtages nu. Det kan være en delvis modtagelse og er ikke linjens samlede Antal; fakturering håndteres separat. Sammenhold med det faktisk modtagne og resterende antal.",
      "fi-FI": "Vastaanotettava määrä kertoo, kuinka monta ostorivin yksikköä vastaanotetaan nyt. Kyse voi olla osavastaanotosta, eikä se ole rivin kokonaismäärä; laskutus käsitellään erikseen. Vertaa sitä tosiasiassa vastaanotettuun ja jäljellä olevaan määrään.",
      "nb-NO": "Antall som skal mottas angir hvor mange enheter på kjøpslinjen som mottas nå. Det kan være en delvis mottakelse og er ikke linjens totale Antall; fakturering håndteres separat. Sammenlign med faktisk mottatt og gjenstående antall."
    },
    projectJournalQuantity: {
      "sv-SE": "Antal att överföra till projektjournal anger hur mycket av projektplaneringsraden som ska föras över till journalen. Standardvärdet kan utgå från radens Antal; kontrollera radtyp, kvarvarande mängd och vad som redan överförts. Överföringen bokför inte journalen.",
      "en-US": "Qty. to Transfer to Journal specifies how much of the project planning line to transfer to the journal. The default can be based on the line Quantity; check the line type, remaining quantity, and what was already transferred. The transfer does not post the journal.",
      "fr-FR": "Qté à transférer au journal indique la quantité de la ligne de planification de projet à transférer au journal. La valeur par défaut peut être basée sur la quantité de la ligne ; vérifiez son type, le restant et les transferts précédents. Le transfert ne comptabilise pas le journal.",
      "de-DE": "Menge für Übertragung ins Projektjournal gibt an, welcher Anteil der Projektplanungszeile ins Journal übertragen wird. Der Standardwert kann auf der Zeilenmenge beruhen; prüfen Sie Zeilentyp, Restmenge und bereits übertragene Menge. Die Übertragung bucht das Journal nicht.",
      "es-ES": "Cantidad a transferir al diario indica qué parte de la línea de planificación del proyecto se transferirá al diario. El valor predeterminado puede basarse en la Cantidad de la línea; revisa el tipo, lo pendiente y lo ya transferido. La transferencia no registra el diario.",
      "da-DK": "Antal til overførsel til kladde angiver, hvor meget af projektplanlægningslinjen der overføres til kladden. Standardværdien kan være baseret på linjens Antal; kontrollér linjetype, resterende antal og tidligere overførsler. Overførslen bogfører ikke kladden.",
      "fi-FI": "Päiväkirjaan siirrettävä määrä määrittää, kuinka paljon projektin suunnittelurivistä siirretään päiväkirjaan. Oletusarvo voi perustua rivin määrään; tarkista rivin tyyppi, jäljellä oleva määrä ja aiemmat siirrot. Siirto ei kirjaa päiväkirjaa.",
      "nb-NO": "Antall som skal overføres til kladd angir hvor mye av prosjektplanleggingslinjen som overføres til kladden. Standardverdien kan bygge på linjens Antall; kontroller linjetype, gjenstående mengde og tidligere overføringer. Overføringen bokfører ikke kladden."
    },
    projectInvoiceQuantity: {
      "sv-SE": "Antal att överföra till faktura anger hur mycket av den fakturerbara projektplaneringsraden som ska tas med på en försäljningsfaktura eller kreditnota. Kontrollera fakturerbar radtyp, kvarvarande och redan fakturerad mängd innan fakturan skapas.",
      "en-US": "Qty. to Transfer to Invoice specifies how much of the billable project planning line to include on a sales invoice or credit memo. Check that the line is billable and review the remaining and previously invoiced quantities before creating the invoice.",
      "fr-FR": "Qté à transférer sur facture indique quelle quantité de la ligne de planification facturable inclure dans une facture ou un avoir de vente. Vérifiez que la ligne est facturable ainsi que les quantités restantes et déjà facturées avant de créer la facture.",
      "de-DE": "Menge für Übertragung in Rechnung gibt an, welcher Anteil der abrechenbaren Projektplanungszeile in eine Verkaufsrechnung oder Gutschrift übernommen wird. Prüfen Sie Abrechenbarkeit sowie offene und bereits fakturierte Mengen, bevor Sie die Rechnung erstellen.",
      "es-ES": "Cantidad a transferir a factura indica qué parte de la línea de planificación facturable del proyecto se incluirá en una factura o abono de venta. Comprueba que la línea sea facturable y revisa las cantidades pendientes y ya facturadas antes de crear la factura.",
      "da-DK": "Antal til overførsel til faktura angiver, hvor meget af den fakturerbare projektplanlægningslinje der medtages på en salgsfaktura eller kreditnota. Kontrollér, at linjen kan faktureres, og gennemgå resterende og allerede faktureret antal.",
      "fi-FI": "Laskulle siirrettävä määrä määrittää, kuinka paljon laskutettavasta projektin suunnittelurivistä sisällytetään myyntilaskuun tai hyvityslaskuun. Tarkista, että rivi on laskutettava, ja tarkista jäljellä oleva ja jo laskutettu määrä ennen laskun luontia.",
      "nb-NO": "Antall som skal overføres til faktura angir hvor mye av den fakturerbare prosjektplanleggingslinjen som tas med på en salgsfaktura eller kreditnota. Kontroller at linjen kan faktureres, og gjennomgå gjenstående og allerede fakturert antall."
    },
    warehousePickQuantity: {
      "sv-SE": "Antal att hantera anger hur många enheter som faktiskt plockas på den här lagerplockningsraden. Mängden kan delas mellan flera lagerplatser eller hanteras delvis. Kontrollera artikel, lagerplats och kvarvarande hantering innan plocket registreras.",
      "en-US": "Qty. to Handle is the number of units actually picked on this warehouse-pick line. The quantity can be split across bins or handled partially. Check the item, bin, and remaining work before registering the pick.",
      "fr-FR": "Qté à traiter indique le nombre d’unités réellement prélevées sur cette ligne de prélèvement. La quantité peut être répartie entre plusieurs emplacements ou traitée partiellement. Vérifiez l’article, l’emplacement et le travail restant avant d’enregistrer le prélèvement.",
      "de-DE": "Zu verarbeitende Menge gibt an, wie viele Einheiten in dieser Lagerkommissionierzeile tatsächlich entnommen werden. Die Menge kann auf mehrere Lagerplätze verteilt oder teilweise bearbeitet werden. Prüfen Sie Artikel, Lagerplatz und Restarbeit vor der Registrierung.",
      "es-ES": "Cantidad a manipular indica cuántas unidades se recogen realmente en esta línea de picking. La cantidad puede repartirse entre varias ubicaciones o gestionarse parcialmente. Comprueba el producto, la ubicación y el trabajo pendiente antes de registrar el picking.",
      "da-DK": "Håndteringsantal angiver, hvor mange enheder der faktisk plukkes på denne lagerpluklinje. Antallet kan fordeles på flere placeringer eller håndteres delvist. Kontrollér varen, placeringen og det resterende arbejde før registrering.",
      "fi-FI": "Käsiteltävä määrä kertoo, kuinka monta yksikköä tällä varastokeräilyn rivillä todella kerätään. Määrä voidaan jakaa useaan lokeroon tai käsitellä osittain. Tarkista nimike, lokero ja jäljellä oleva työ ennen keräilyn rekisteröintiä.",
      "nb-NO": "Antall som skal håndteres angir hvor mange enheter som faktisk plukkes på denne lagerplukklinjen. Antallet kan fordeles på flere lagerplasser eller håndteres delvis. Kontroller varen, lagerplassen og gjenstående arbeid før plukket registreres."
    },
    warehouseReceiptQuantity: {
      "sv-SE": "Antal att ta emot anger hur många enheter som registreras på den här lagerinleveransen nu. Jämför med det fysiskt mottagna och källradens återstående mängd; mottagning är ett separat moment från fakturering och eventuell inlagring.",
      "en-US": "Qty. to Receive is the number of units recorded on this warehouse receipt now. Compare it with the physical receipt and the source line's remaining quantity; receiving is separate from invoicing and any put-away work.",
      "fr-FR": "Qté à recevoir indique le nombre d’unités enregistrées sur cette réception d’entrepôt. Comparez-la à la réception physique et au restant de la ligne source ; la réception est distincte de la facturation et du rangement éventuel.",
      "de-DE": "Zu empfangende Menge gibt an, wie viele Einheiten jetzt in diesem Lagerwareneingang erfasst werden. Vergleichen Sie sie mit dem physischen Eingang und der Restmenge der Quellzeile; Wareneingang, Fakturierung und Einlagerung sind getrennte Vorgänge.",
      "es-ES": "Cantidad a recibir indica cuántas unidades se registran ahora en esta recepción de almacén. Compárala con lo recibido físicamente y con la cantidad pendiente de la línea de origen; la recepción es independiente de la facturación y de la ubicación posterior.",
      "da-DK": "Antal til modtagelse angiver, hvor mange enheder der registreres på denne lagermodtagelse nu. Sammenhold med den fysisk modtagne mængde og kildelinjens restantal; modtagelse er separat fra fakturering og eventuel placering.",
      "fi-FI": "Vastaanotettava määrä kertoo, kuinka monta yksikköä kirjataan tälle varastovastaanotolle nyt. Vertaa sitä fyysisesti vastaanotettuun määrään ja lähderivin jäljellä olevaan määrään; vastaanotto on erillinen laskutuksesta ja mahdollisesta hyllytyksestä.",
      "nb-NO": "Antall som skal mottas angir hvor mange enheter som registreres på denne lagermottakslinjen nå. Sammenlign med fysisk mottatt mengde og kildelinjens gjenstående antall; mottak er separat fra fakturering og eventuell bortsetting."
    },
    selectVendor: {
      "sv-SE": "Leverantörsnumret kopplar inköpsdokumentet till leverantörskortet. Business Central kan fylla i betalnings-, valuta-, mottagnings- och prisuppgifter från leverantören. Kontrollera att rätt leverantör valts och granska de föreslagna dokumentvärdena.",
      "en-US": "The vendor number links the purchase document to the vendor card. Business Central can populate payment, currency, receipt, and pricing details from the vendor. Verify the vendor and review the proposed document values.",
      "fr-FR": "Le numéro fournisseur associe le document d’achat à la fiche fournisseur. Business Central peut reprendre les informations de paiement, devise, réception et prix du fournisseur. Vérifiez le fournisseur sélectionné et les valeurs proposées.",
      "de-DE": "Die Kreditorennummer verknüpft den Einkaufsbeleg mit der Kreditorenkarte. Business Central kann Zahlungs-, Währungs-, Wareneingangs- und Preisdaten übernehmen. Prüfen Sie den Kreditor und die vorgeschlagenen Belegwerte.",
      "es-ES": "El número de proveedor vincula el documento de compra con la ficha del proveedor. Business Central puede completar datos de pago, divisa, recepción y precios. Comprueba el proveedor y los valores propuestos.",
      "da-DK": "Leverandørnummeret knytter købsdokumentet til leverandørkortet. Business Central kan hente betalings-, valuta-, modtagelses- og prisoplysninger fra leverandøren. Kontrollér leverandøren og de foreslåede dokumentværdier.",
      "fi-FI": "Toimittajanumero yhdistää ostoasiakirjan toimittajakorttiin. Business Central voi täyttää toimittajalta maksu-, valuutta-, vastaanotto- ja hintatietoja. Tarkista toimittaja ja ehdotetut asiakirjan arvot.",
      "nb-NO": "Leverandørnummeret knytter kjøpsdokumentet til leverandørkortet. Business Central kan hente betalings-, valuta-, mottaks- og prisopplysninger fra leverandøren. Kontroller leverandøren og de foreslåtte dokumentverdiene."
    },
    selectPurchaseItem: {
      "sv-SE": "Artikelnumret kopplar inköpsraden till artikeln som beställs. Kontrollera beskrivning, inköpsenhet, leverantörens artikelnummer och föreslaget pris innan du anger beställd mängd.",
      "en-US": "The item number links the purchase line to the item being ordered. Check the description, purchase unit of measure, vendor item number, and proposed price before entering the order quantity.",
      "fr-FR": "Le numéro d’article associe la ligne d’achat à l’article commandé. Vérifiez la description, l’unité d’achat, la référence fournisseur et le prix proposé avant de saisir la quantité commandée.",
      "de-DE": "Die Artikelnummer verknüpft die Einkaufszeile mit dem bestellten Artikel. Prüfen Sie Beschreibung, Einkaufseinheit, Kreditorenartikelnummer und vorgeschlagenen Preis, bevor Sie die Bestellmenge eingeben.",
      "es-ES": "El número de producto vincula la línea de compra con el producto que se pide. Comprueba la descripción, unidad de compra, referencia del proveedor y precio propuesto antes de introducir la cantidad pedida.",
      "da-DK": "Varenummeret knytter købslinjen til varen, der bestilles. Kontrollér beskrivelse, købsenhed, leverandørens varenummer og foreslået pris, før du angiver bestillingsantallet.",
      "fi-FI": "Nimikenumero yhdistää ostorivin tilattavaan nimikkeeseen. Tarkista kuvaus, ostoyksikkö, toimittajan nimikenumero ja ehdotettu hinta ennen tilausmäärän syöttämistä.",
      "nb-NO": "Varenummeret knytter kjøpslinjen til varen som bestilles. Kontroller beskrivelse, kjøpsenhet, leverandørens varenummer og foreslått pris før du angir bestilt antall."
    },
    purchaseDirectUnitCost: {
      "sv-SE": "Direkt styckkostnad anger inköpskostnaden per enhet på raden. När du ändrar den manuellt kan priset som hämtades från inköpsprislistan ersättas. Kontrollera avtalat pris, enhet, valuta, moms och radbelopp innan du bekräftar. Kontrollera även om pris och rabatt ska låsas.",
      "en-US": "Direct Unit Cost is the purchase cost per unit on the line. Changing it manually can replace the value retrieved from the purchase price list. Check the agreed price, unit of measure, currency, tax treatment, and line amount before confirming. Also check whether price and discount should be locked.",
      "fr-FR": "Le coût unitaire direct est le coût d’achat par unité sur la ligne. Sa modification manuelle peut remplacer le montant issu de la liste de prix d’achat. Avant de confirmer, vérifiez le prix convenu, l’unité, la devise, le traitement des taxes et le montant de la ligne. Vérifiez également si le prix et la remise doivent être verrouillés.",
      "de-DE": "Direkte Einzelkosten sind die Einkaufskosten je Einheit in der Zeile. Eine manuelle Änderung kann den aus der Einkaufspreisliste übernommenen Wert ersetzen. Prüfen Sie vor der Bestätigung den vereinbarten Preis, die Einheit, die Währung, die Steuerbehandlung und den Zeilenbetrag. Prüfen Sie auch, ob Preis und Rabatt gesperrt werden sollen.",
      "es-ES": "El coste unitario directo es el coste de compra por unidad de la línea. Si lo cambias manualmente, puedes sustituir el valor obtenido de la lista de precios de compra. Antes de confirmar, comprueba el precio acordado, la unidad, la divisa, el tratamiento fiscal y el importe de la línea. Comprueba también si deben bloquearse el precio y el descuento.",
      "da-DK": "Direkte enhedsomkostning er købsprisen pr. enhed på linjen. En manuel ændring kan erstatte værdien fra købsprislisten. Kontrollér den aftalte pris, enhed, valuta, momsbehandling og linjebeløb, før du bekræfter. Kontrollér også, om pris og rabat skal låses.",
      "fi-FI": "Suora yksikkökustannus on ostorivin kustannus yksikköä kohti. Manuaalinen muutos voi korvata ostohintaluettelosta haetun arvon. Tarkista sovittu hinta, yksikkö, valuutta, verokäsittely ja rivin summa ennen vahvistamista. Tarkista myös, pitääkö hinta ja alennus lukita.",
      "nb-NO": "Direkte enhetskostnad er innkjøpskostnaden per enhet på linjen. En manuell endring kan erstatte verdien som ble hentet fra innkjøpsprislisten. Kontroller avtalt pris, enhet, valuta, avgiftsbehandling og linjebeløp før du bekrefter. Kontroller også om pris og rabatt skal låses."
    },
    purchasePricing: {
      "sv-SE": "Beräknar och tillämpar inköpspris och radrabatt som gäller för inköpsraden. BC utgår från leverantör, artikel, antal, inköpsenhet, valuta och datum. Kontrollera direkt styckkostnad och rabatt på raden; åtgärden bokför inte inköpsordern.",
      "en-US": "Calculates and applies the purchase price and line discount that apply to the purchase line. Business Central uses the vendor, item, quantity, purchase unit, currency, and date. Check the line's direct unit cost and discount; this action does not post the order.",
      "fr-FR": "Calcule et applique le prix d’achat et la remise de ligne applicables. Business Central tient compte du fournisseur, de l’article, de la quantité, de l’unité d’achat, de la devise et de la date. Vérifiez le coût unitaire direct et la remise ; cette action ne comptabilise pas la commande.",
      "de-DE": "Berechnet und übernimmt den für die Einkaufszeile geltenden Einkaufspreis und Zeilenrabatt. Business Central berücksichtigt Kreditor, Artikel, Menge, Einkaufseinheit, Währung und Datum. Prüfen Sie direkte Einzelkosten und Rabatt; der Auftrag wird dadurch nicht gebucht.",
      "es-ES": "Calcula y aplica el precio de compra y el descuento de línea correspondientes. Business Central tiene en cuenta proveedor, producto, cantidad, unidad de compra, divisa y fecha. Comprueba el coste unitario directo y el descuento; esta acción no registra el pedido.",
      "da-DK": "Beregner og anvender den købspris og linjerabat, der gælder for købsserien. Business Central bruger leverandør, vare, antal, købsenhed, valuta og dato. Kontrollér direkte enhedsomkostning og rabat; handlingen bogfører ikke ordren.",
      "fi-FI": "Laskee ja käyttää ostoriville soveltuvaa ostohintaa ja rivialennusta. Business Central huomioi toimittajan, nimikkeen, määrän, ostoyksikön, valuutan ja päivämäärän. Tarkista suora yksikkökustannus ja alennus; toiminto ei kirjaa tilausta.",
      "nb-NO": "Beregner og bruker innkjøpsprisen og linjerabatten som gjelder for kjøpslinjen. Business Central bruker leverandør, vare, antall, kjøpsenhet, valuta og dato. Kontroller direkte enhetskostnad og rabatt; handlingen bokfører ikke ordren."
    },
    openPurchaseManualPrice: {
      "sv-SE": "Det här öppnar inköpsradens manuella prisdialog. Direkt styckkostnad och rabatt påverkar radbeloppet; kontrollera leverantörens villkor, artikel, enhet, valuta och datum innan du bekräftar.",
      "en-US": "This opens the purchase line's manual price dialog. Direct unit cost and discounts affect the line amount; check the vendor terms, item, unit, currency, and date before confirming.",
      "fr-FR": "Cette action ouvre la boîte de dialogue du prix manuel de la ligne d'achat. Le coût unitaire direct et les remises influent sur le montant de la ligne ; vérifiez les conditions fournisseur, l'article, l'unité, la devise et la date.",
      "de-DE": "Damit wird der Dialog für den manuellen Preis der Einkaufszeile geöffnet. Direkte Einzelkosten und Rabatte wirken sich auf den Zeilenbetrag aus; prüfen Sie vor der Bestätigung Kreditorenbedingungen, Artikel, Einheit, Währung und Datum.",
      "es-ES": "Esta acción abre el cuadro del precio manual de la línea de compra. El coste unitario directo y los descuentos afectan al importe de la línea; comprueba las condiciones del proveedor, el producto, la unidad, la divisa y la fecha antes de confirmar.",
      "da-DK": "Dette åbner dialogboksen for manuel pris på købsserien. Direkte enhedsomkostning og rabatter påvirker linjebeløbet; kontrollér leverandørvilkår, vare, enhed, valuta og dato, før du bekræfter.",
      "fi-FI": "Tämä avaa ostorivin manuaalisen hinnan valintaikkunan. Suora yksikkökustannus ja alennukset vaikuttavat rivin summaan. Tarkista toimittajan ehdot, nimike, yksikkö, valuutta ja päivämäärä ennen vahvistamista.",
      "nb-NO": "Dette åpner dialogboksen for manuell pris på kjøpslinjen. Direkte enhetskostnad og rabatter påvirker linjebeløpet; kontroller leverandørvilkår, vare, enhet, valuta og dato før du bekrefter."
    },
    openPurchaseOrderList: {
      "sv-SE": "Det här sökresultatet öppnar listan över inköpsorder. Därifrån kan du öppna en befintlig order eller skapa en ny; kontrollera att du fortsätter i rätt inköpsflöde.",
      "en-US": "This search result opens the Purchase Orders list. From there, you can open an existing order or create a new one; make sure you continue in the intended purchasing flow.",
      "fr-FR": "Ce résultat de recherche ouvre la liste des commandes achat. Vous pouvez y ouvrir une commande existante ou en créer une nouvelle ; vérifiez que vous poursuivez le flux d'achat prévu.",
      "de-DE": "Dieses Suchergebnis öffnet die Liste der Einkaufsbestellungen. Dort können Sie eine vorhandene Bestellung öffnen oder eine neue erstellen; achten Sie darauf, im vorgesehenen Einkaufsablauf fortzufahren.",
      "es-ES": "Este resultado de búsqueda abre la lista de pedidos de compra. Desde allí puedes abrir un pedido existente o crear uno nuevo; asegúrate de continuar en el flujo de compras previsto.",
      "da-DK": "Dette søgeresultat åbner listen over købsordrer. Herfra kan du åbne en eksisterende ordre eller oprette en ny; kontrollér, at du fortsætter i det tilsigtede indkøbsforløb.",
      "fi-FI": "Tämä hakutulos avaa ostotilausluettelon. Voit avata olemassa olevan tilauksen tai luoda uuden; varmista, että jatkat oikeassa ostotyönkulussa.",
      "nb-NO": "Dette søkeresultatet åpner listen over kjøpsordrer. Derfra kan du åpne en eksisterende ordre eller opprette en ny; kontroller at du fortsetter i riktig innkjøpsflyt."
    },
    warehouseOpenReceipt: {
      "sv-SE": "En lagerinlevering samlar artiklar som ska tas emot från källdokument. Mottagning och inlagring kan vara separata moment beroende på lagerställets inställningar. Kontrollera källdokument, artiklar och antal före registrering.",
      "en-US": "A warehouse receipt gathers items to receive from source documents. Receiving and put-away can be separate steps, depending on the location setup. Check source documents, items, and quantities before registering.",
      "fr-FR": "Une réception entrepôt regroupe les articles à recevoir depuis des documents source. La réception et le rangement peuvent être distincts selon le paramétrage de l'emplacement. Vérifiez les documents source, les articles et les quantités avant l'enregistrement.",
      "de-DE": "Ein Lagerwareneingang fasst Artikel aus Quelldokumenten zusammen. Wareneingang und Einlagerung können je nach Lagerorteinrichtung getrennte Schritte sein. Prüfen Sie Quelldokumente, Artikel und Mengen vor der Registrierung.",
      "es-ES": "Una recepción de almacén reúne los productos que se recibirán desde documentos de origen. La recepción y la ubicación pueden ser pasos separados según la configuración. Comprueba los documentos, productos y cantidades antes de registrar.",
      "da-DK": "En lagermodtagelse samler varer fra kildedokumenter. Modtagelse og placering kan være separate trin afhængigt af lokationsopsætningen. Kontrollér kildedokumenter, varer og antal før registrering.",
      "fi-FI": "Varastovastaanotto kokoaa lähdeasiakirjoista vastaanotettavat nimikkeet. Vastaanotto ja hyllytys voivat olla erillisiä vaiheita varaston asetusten mukaan. Tarkista asiakirjat, nimikkeet ja määrät ennen rekisteröintiä.",
      "nb-NO": "Et lagermottak samler varer fra kildedokumenter. Mottak og bortsetting kan være separate trinn avhengig av lagerstedets oppsett. Kontroller kildedokumenter, varer og antall før registrering."
    },
    warehouseOpenShipment: {
      "sv-SE": "En lagerutleverans samlar artiklar som ska plockas och skickas från källdokument. Plock och bokföring kan vara separata moment. Kontrollera källrader, lagerställe och hanterade antal.",
      "en-US": "A warehouse shipment gathers items to pick and ship from source documents. Picking and posting can be separate steps. Check the source lines, location, and handled quantities.",
      "fr-FR": "Une expédition entrepôt regroupe les articles à prélever et expédier depuis des documents source. Le prélèvement et la validation peuvent être distincts. Vérifiez les lignes source, l'emplacement et les quantités traitées.",
      "de-DE": "Ein Lagerausgang fasst Artikel aus Quelldokumenten zusammen, die kommissioniert und versendet werden sollen. Kommissionierung und Buchen können getrennte Schritte sein. Prüfen Sie Quellzeilen, Lagerort und bearbeitete Mengen.",
      "es-ES": "Un envío de almacén reúne los productos que se recogerán y enviarán desde documentos de origen. La preparación y el registro pueden ser pasos separados. Comprueba las líneas, la ubicación y las cantidades manipuladas.",
      "da-DK": "En lagerforsendelse samler varer fra kildedokumenter, der skal plukkes og sendes. Pluk og bogføring kan være separate trin. Kontrollér kildelinjer, lokation og håndterede antal.",
      "fi-FI": "Varastolähetys kokoaa lähdeasiakirjoista kerättävät ja lähetettävät nimikkeet. Keräily ja lähetyksen kirjaaminen voivat olla erillisiä vaiheita. Tarkista lähderivit, varasto ja käsitellyt määrät.",
      "nb-NO": "En lagerforsendelse samler varer fra kildedokumenter som skal plukkes og sendes. Plukk og bokføring kan være separate trinn. Kontroller kildelinjer, lagersted og håndterte antall."
    },
    warehousePostReceipt: {
      "sv-SE": "Bokföring av lagerinleveransen registrerar mottagna antal mot källdokumenten och påverkar lagersaldot. Inlagring kan ske samtidigt eller separat beroende på lagerinställningarna. Kontrollera faktiskt mottagna antal före bokföring.",
      "en-US": "Posting the warehouse receipt records received quantities against the source documents and updates inventory. Put-away may happen at the same time or separately, depending on setup. Verify actual received quantities before posting.",
      "fr-FR": "La validation de la réception entrepôt enregistre les quantités reçues sur les documents source et met à jour le stock. Le rangement peut être simultané ou séparé selon le paramétrage. Vérifiez les quantités reçues avant validation.",
      "de-DE": "Beim Buchen des Lagerwareneingangs werden empfangene Mengen den Quelldokumenten zugeordnet und der Bestand aktualisiert. Die Einlagerung kann gleichzeitig oder getrennt erfolgen. Prüfen Sie die tatsächlich empfangenen Mengen vor dem Buchen.",
      "es-ES": "Al registrar la recepción de almacén, las cantidades recibidas se aplican a los documentos de origen y se actualiza el inventario. La ubicación puede realizarse al mismo tiempo o por separado. Verifica las cantidades recibidas antes de registrar.",
      "da-DK": "Når lagermodtagelsen bogføres, registreres de modtagne antal på kildedokumenterne, og lagerbeholdningen opdateres. Placering kan ske samtidigt eller separat. Kontrollér de modtagne antal før bogføring.",
      "fi-FI": "Varastovastaanoton kirjaaminen kohdistaa vastaanotetut määrät lähdeasiakirjoihin ja päivittää varastosaldon. Hyllytys voi tapahtua samalla kertaa tai erikseen. Tarkista vastaanottomäärät ennen kirjaamista.",
      "nb-NO": "Når lagermottaket bokføres, registreres mottatte antall mot kildedokumentene og lagerbeholdningen oppdateres. Bortsetting kan skje samtidig eller separat. Kontroller mottatte antall før bokføring."
    },
    warehousePostShipment: {
      "sv-SE": "Bokföring av lagerutleveransen registrerar skickade antal mot källdokumenten och minskar lagersaldot. Plock kan ha hanterats separat. Kontrollera plockade antal och att rätt källrader ingår.",
      "en-US": "Posting the warehouse shipment records shipped quantities against the source documents and reduces inventory. Picking may have been handled separately. Check the picked quantities and included source lines.",
      "fr-FR": "La validation de l'expédition entrepôt enregistre les quantités expédiées sur les documents source et diminue le stock. Le prélèvement peut être séparé. Vérifiez les quantités prélevées et les lignes source incluses.",
      "de-DE": "Beim Buchen des Lagerausgangs werden versendete Mengen den Quelldokumenten zugeordnet und der Bestand verringert. Die Kommissionierung kann separat erfolgt sein. Prüfen Sie Mengen und Quelldokumentzeilen.",
      "es-ES": "Al registrar el envío de almacén, las cantidades enviadas se aplican a los documentos de origen y se reduce el inventario. La preparación puede haberse realizado por separado. Comprueba las cantidades y líneas incluidas.",
      "da-DK": "Når lagerforsendelsen bogføres, registreres de sendte antal på kildedokumenterne, og lagerbeholdningen reduceres. Pluk kan være udført separat. Kontrollér antal og kildelinjer.",
      "fi-FI": "Varastolähetyksen kirjaaminen kohdistaa lähetetyt määrät lähdeasiakirjoihin ja vähentää varastosaldoa. Keräily on voitu käsitellä erikseen. Tarkista määrät ja mukana olevat lähderivit.",
      "nb-NO": "Når lagerforsendelsen bokføres, registreres sendte antall mot kildedokumentene og lagerbeholdningen reduseres. Plukk kan være utført separat. Kontroller antall og kildelinjer."
    },
    openSalesOrder: {
      "sv-SE": "Försäljningsordern samlar kund, orderrader, leveransuppgifter och fakturaunderlag. Att öppna ordern bokför inte leverans eller faktura. Kontrollera kund, status och kvarvarande antal före ändringar eller bokföring.",
      "en-US": "The sales order brings together the customer, order lines, shipment details, and invoicing data. Opening it does not post a shipment or invoice. Check the customer, status, and remaining quantities before changing or posting it.",
      "fr-FR": "La commande vente regroupe le client, les lignes, les informations d'expédition et les données de facturation. Son ouverture ne valide ni expédition ni facture. Vérifiez le client, le statut et les quantités restantes avant toute modification ou validation.",
      "de-DE": "Der Verkaufsauftrag enthält Debitor, Auftragszeilen, Versandangaben und Rechnungsdaten. Das Öffnen bucht weder Lieferung noch Rechnung. Prüfen Sie Debitor, Status und Restmengen vor Änderungen oder dem Buchen.",
      "es-ES": "El pedido de venta reúne el cliente, las líneas, los datos de envío y la información de facturación. Abrirlo no registra el envío ni la factura. Comprueba el cliente, el estado y las cantidades pendientes antes de modificarlo o registrarlo.",
      "da-DK": "Salgsordren samler kunden, ordrelinjer, leveringsoplysninger og fakturagrundlag. Det bogfører ikke levering eller faktura at åbne ordren. Kontrollér kunden, status og resterende antal før ændringer eller bogføring.",
      "fi-FI": "Myyntitilaus kokoaa asiakkaan, tilausrivit, toimitustiedot ja laskutustiedot. Tilauksen avaaminen ei kirjaa toimitusta eikä laskua. Tarkista asiakas, tila ja jäljellä olevat määrät ennen muutoksia tai kirjaamista.",
      "nb-NO": "Salgsordren samler kunden, ordrelinjer, leveringsopplysninger og fakturagrunnlag. Åpning av ordren bokfører ikke levering eller faktura. Kontroller kunden, status og gjenstående antall før endringer eller bokføring."
    },
    openPurchaseOrder: {
      "sv-SE": "Inköpsordern samlar leverantör, beställda rader, mottagningsuppgifter och fakturaunderlag. Att öppna ordern tar inte emot eller fakturerar varorna. Kontrollera leverantör, status och kvarvarande antal före ändringar eller bokföring.",
      "en-US": "The purchase order brings together the vendor, ordered lines, receipt details, and invoicing data. Opening it does not receive or invoice the goods. Check the vendor, status, and remaining quantities before changing or posting it.",
      "fr-FR": "La commande achat regroupe le fournisseur, les lignes commandées, les informations de réception et les données de facturation. Son ouverture ne réceptionne ni ne facture les articles. Vérifiez le fournisseur, le statut et les quantités restantes avant toute modification ou validation.",
      "de-DE": "Die Einkaufsbestellung enthält Kreditor, Bestellzeilen, Wareneingangsdaten und Rechnungsinformationen. Das Öffnen bucht weder Wareneingang noch Rechnung. Prüfen Sie Kreditor, Status und Restmengen vor Änderungen oder dem Buchen.",
      "es-ES": "El pedido de compra reúne el proveedor, las líneas pedidas, los datos de recepción y la información de facturación. Abrirlo no recibe ni factura los artículos. Comprueba el proveedor, el estado y las cantidades pendientes antes de modificarlo o registrarlo.",
      "da-DK": "Købsordren samler leverandøren, bestillingslinjer, modtagelsesoplysninger og fakturagrundlag. Det modtager eller fakturerer ikke varerne at åbne ordren. Kontrollér leverandør, status og resterende antal før ændringer eller bogføring.",
      "fi-FI": "Ostotilaus kokoaa toimittajan, tilausrivit, vastaanottotiedot ja laskutustiedot. Tilauksen avaaminen ei vastaanota eikä laskuta tavaroita. Tarkista toimittaja, tila ja jäljellä olevat määrät ennen muutoksia tai kirjaamista.",
      "nb-NO": "Kjøpsordren samler leverandøren, bestilte linjer, mottaksopplysninger og fakturagrunnlag. Åpning av ordren mottar eller fakturerer ikke varene. Kontroller leverandør, status og gjenstående antall før endringer eller bokføring."
    },
    openProductionOrder: {
      "sv-SE": "Produktionsordern anger artikel, mängd, komponenter och operationer. En frisläppt order kan användas för att registrera förbrukning och utflöde, men frisläppning betyder inte i sig att material plockats eller arbetet startat. Kontrollera status och kvarvarande mängder.",
      "en-US": "The production order identifies the item and quantity to make, along with its components and operations. A released order can be used to record consumption and output, but release alone does not mean materials were picked or work started. Check status and remaining quantities.",
      "fr-FR": "L'ordre de fabrication indique l'article, la quantité, les composants et les opérations. Un ordre lancé permet d'enregistrer consommation et production, mais ne signifie pas que les composants ont été prélevés ou que le travail a commencé. Vérifiez le statut et les quantités restantes.",
      "de-DE": "Der Fertigungsauftrag legt Artikel, Menge, Komponenten und Arbeitsgänge fest. Für einen freigegebenen Auftrag können Verbrauch und Output erfasst werden; die Freigabe bedeutet nicht, dass Material entnommen oder die Arbeit begonnen wurde. Prüfen Sie Status und Restmengen.",
      "es-ES": "La orden de producción identifica el producto, la cantidad, los componentes y las operaciones. Una orden lanzada permite registrar consumo y producción, pero no significa que se hayan recogido materiales ni iniciado el trabajo. Comprueba el estado y las cantidades pendientes.",
      "da-DK": "Produktionsordren angiver varen, antallet, komponenterne og operationerne. En frigivet ordre kan bruges til at registrere forbrug og output, men betyder ikke, at materialer er plukket, eller arbejdet er startet. Kontrollér status og resterende antal.",
      "fi-FI": "Tuotantotilaus määrittää nimikkeen, määrän, komponentit ja työvaiheet. Vapautetulle tilaukselle voidaan kirjata kulutus ja valmistuminen, mutta vapautus ei tarkoita, että materiaalit olisi kerätty tai työ aloitettu. Tarkista tila ja jäljellä olevat määrät.",
      "nb-NO": "Produksjonsordren angir varen, antallet, komponentene og operasjonene. En frigitt ordre kan brukes til å registrere forbruk og produksjon, men betyr ikke at materialer er plukket eller arbeidet startet. Kontroller status og gjenstående antall."
    },
    selectProductionItem: {
      "sv-SE": "Artikelnumret anger vilken artikel som ska tillverkas på produktionsordern. Valet påverkar föreslagen produktionsstycklista, komponenter och planering. Kontrollera artikel och enhet innan produktionsmängd och datum fastställs.",
      "en-US": "The item number identifies what the production order will produce. The selection affects the suggested production BOM, components, and planning. Check the item and unit before setting production quantity and dates.",
      "fr-FR": "Le numéro d’article indique ce que l’ordre de fabrication doit produire. Le choix influe sur la nomenclature, les composants et la planification proposés. Vérifiez l’article et l’unité avant de définir la quantité et les dates de production.",
      "de-DE": "Die Artikelnummer legt fest, was der Fertigungsauftrag produziert. Die Auswahl wirkt sich auf vorgeschlagene Fertigungsstückliste, Komponenten und Planung aus. Prüfen Sie Artikel und Einheit, bevor Sie Fertigungsmenge und Termine festlegen.",
      "es-ES": "El número de producto identifica lo que fabricará la orden de producción. La selección afecta a la lista de materiales, los componentes y la planificación propuestos. Comprueba el producto y la unidad antes de definir cantidad y fechas.",
      "da-DK": "Varenummeret angiver, hvad produktionsordren skal fremstille. Valget påvirker den foreslåede produktionsstykliste, komponenter og planlægning. Kontrollér varen og enheden, før du fastsætter produktionsantal og datoer.",
      "fi-FI": "Nimikenumero määrittää, mitä tuotantotilaus valmistaa. Valinta vaikuttaa ehdotettuun tuotantorakenteeseen, komponentteihin ja suunnitteluun. Tarkista nimike ja yksikkö ennen tuotantomäärän ja päivämäärien määrittämistä.",
      "nb-NO": "Varenummeret angir hva produksjonsordren skal produsere. Valget påvirker foreslått produksjonsstykklist, komponenter og planlegging. Kontroller varen og enheten før produksjonsantall og datoer fastsettes."
    },
    selectLocation: {
      "sv-SE": "Lagerstället anger på vilken fysisk eller logisk plats lagret hanteras. Valet påverkar tillgänglighet, plock, mottagning och bokföring. Kontrollera att platsen stämmer med dokumentet och det aktuella lagret.",
      "en-US": "The location identifies the physical or logical site where inventory is handled. It affects availability, picking, receiving, and posting. Confirm it matches the document and the intended inventory site.",
      "fr-FR": "L’emplacement désigne le site physique ou logique où le stock est géré. Il influe sur la disponibilité, le prélèvement, la réception et la comptabilisation. Vérifiez qu’il correspond au document et au site prévu.",
      "de-DE": "Der Lagerort bezeichnet den physischen oder logischen Standort, an dem Bestand verwaltet wird. Er beeinflusst Verfügbarkeit, Kommissionierung, Wareneingang und Buchung. Prüfen Sie, ob er zum Beleg und vorgesehenen Standort passt.",
      "es-ES": "La ubicación identifica el sitio físico o lógico donde se gestiona el inventario. Afecta a la disponibilidad, el picking, la recepción y el registro. Confirma que coincide con el documento y el almacén previsto.",
      "da-DK": "Lokationen angiver det fysiske eller logiske sted, hvor lageret håndteres. Den påvirker tilgængelighed, pluk, modtagelse og bogføring. Kontrollér, at den passer til dokumentet og det tilsigtede lager.",
      "fi-FI": "Varasto määrittää fyysisen tai loogisen sijainnin, jossa varastoa käsitellään. Se vaikuttaa saatavuuteen, keräilyyn, vastaanottoon ja kirjaukseen. Varmista, että se vastaa asiakirjaa ja tarkoitettua varastoa.",
      "nb-NO": "Lokasjonen angir det fysiske eller logiske stedet der lageret håndteres. Den påvirker tilgjengelighet, plukk, mottak og bokføring. Kontroller at den stemmer med dokumentet og det aktuelle lageret."
    },
    selectBin: {
      "sv-SE": "Lagerplatsen anger var artikeln ligger inom det valda lagerstället. Den styr varifrån en vara plockas eller var den placeras vid inlagring. Kontrollera artikel, lagerställe och lagerplats mot den fysiska hanteringen.",
      "en-US": "The bin identifies where the item is located within the selected location. It determines where an item is picked from or put away to. Check the item, location, and bin against the physical warehouse work.",
      "fr-FR": "L’emplacement de stockage indique où se trouve l’article dans le site sélectionné. Il détermine d’où l’article est prélevé ou où il est rangé. Vérifiez l’article, le site et l’emplacement selon le travail physique en entrepôt.",
      "de-DE": "Der Lagerplatz gibt an, wo sich der Artikel innerhalb des gewählten Lagerorts befindet. Er bestimmt, woher entnommen oder wohin eingelagert wird. Prüfen Sie Artikel, Lagerort und Lagerplatz anhand der physischen Lagerarbeit.",
      "es-ES": "El contenedor identifica dónde está el producto dentro de la ubicación seleccionada. Determina de dónde se recoge o dónde se coloca. Comprueba el producto, la ubicación y el contenedor frente al trabajo físico del almacén.",
      "da-DK": "Placeringen angiver, hvor varen befinder sig inden for den valgte lokation. Den bestemmer, hvor varen plukkes fra eller lægges på plads. Kontrollér vare, lokation og placering mod det fysiske lagerarbejde.",
      "fi-FI": "Lokero määrittää, missä nimike sijaitsee valitussa varastossa. Se määrittää, mistä nimike kerätään tai mihin se hyllytetään. Tarkista nimike, varasto ja lokero fyysistä varastotyötä vasten.",
      "nb-NO": "Lagerplassen angir hvor varen befinner seg innenfor den valgte lokasjonen. Den bestemmer hvor varen plukkes fra eller settes på plass. Kontroller vare, lokasjon og lagerplass mot det fysiske lagerarbeidet."
    },
    select: {
      "sv-SE": "Valet kopplar dokumentet eller raden till en kund, leverantör eller artikel. Business Central kan då hämta standardvärden från grunddata och inställningar; kontrollera att rätt post och föreslagna värden används.",
      "en-US": "The selection links the document or line to a customer, vendor, or item. Business Central may then retrieve defaults from master data and setup; verify the selected record and proposed values.",
      "fr-FR": "La sélection associe le document ou la ligne à un client, fournisseur ou article. Business Central peut alors reprendre des valeurs par défaut des données de base et du paramétrage ; vérifiez l’enregistrement et les valeurs proposées.",
      "de-DE": "Die Auswahl verknüpft das Dokument oder die Zeile mit einem Debitor, Kreditor oder Artikel. Business Central kann Standardwerte aus Stammdaten und Einrichtung übernehmen; prüfen Sie den Datensatz und die vorgeschlagenen Werte.",
      "es-ES": "La selección vincula el documento o la línea con un cliente, proveedor o producto. Business Central puede recuperar valores predeterminados de los datos maestros y la configuración; verifica el registro y los valores propuestos.",
      "da-DK": "Valget knytter dokumentet eller linjen til en kunde, leverandør eller vare. Business Central kan hente standardværdier fra stamdata og opsætning; kontrollér den valgte post og de foreslåede værdier.",
      "fi-FI": "Valinta liittää asiakirjan tai rivin asiakkaaseen, toimittajaan tai nimikkeeseen. Business Central voi hakea oletusarvoja perustiedoista ja asetuksista; tarkista valittu tietue ja ehdotetut arvot.",
      "nb-NO": "Valget knytter dokumentet eller linjen til en kunde, leverandør eller vare. Business Central kan hente standardverdier fra grunndata og oppsett; kontroller valgt post og foreslåtte verdier."
    },
    createPurchaseOrder: {
      "sv-SE": "På inköpsorderlistan öppnar Ny en ny inköpsorder. Fyll sedan i leverantören och orderraderna. Att välja Ny bokför inte ordern; mottagning och fakturering hanteras i efterföljande steg.",
      "en-US": "From the Purchase Orders list, New opens a new purchase order. Then enter the vendor and purchase lines. Choosing New does not post the order; receiving and invoicing are handled in later steps.",
      "fr-FR": "Depuis la liste des commandes achat, Nouveau ouvre une nouvelle commande achat. Saisissez ensuite le fournisseur et les lignes. Le choix de Nouveau ne comptabilise pas la commande ; la réception et la facturation interviennent aux étapes suivantes.",
      "de-DE": "In der Liste der Einkaufsbestellungen öffnet Neu eine neue Bestellung. Geben Sie anschließend den Lieferanten und die Bestellzeilen ein. Neu bucht die Bestellung nicht; Wareneingang und Rechnungsstellung erfolgen in späteren Schritten.",
      "es-ES": "Desde la lista de pedidos de compra, Nuevo abre un pedido nuevo. Después, introduce el proveedor y las líneas de compra. Elegir Nuevo no registra el pedido; la recepción y la facturación se realizan en pasos posteriores.",
      "da-DK": "Fra købsordrelisten åbner Ny en ny købsordre. Angiv derefter leverandøren og købslinjerne. Valget Ny bogfører ikke ordren; modtagelse og fakturering håndteres i senere trin.",
      "fi-FI": "Ostotilausluettelossa Uusi avaa uuden ostotilauksen. Anna sen jälkeen toimittaja ja ostorivit. Uusi-valinta ei kirjaa tilausta; vastaanotto ja laskutus käsitellään myöhemmissä vaiheissa.",
      "nb-NO": "Fra innkjøpsordelisten åpner Ny en ny innkjøpsordre. Angi deretter leverandøren og ordrelinjene. Valget Ny bokfører ikke ordren; mottak og fakturering håndteres i senere trinn."
    },
    createSalesOrder: {
      "sv-SE": "P\u00e5 f\u00f6rs\u00e4ljningsorderlistan \u00f6ppnar Ny en ny f\u00f6rs\u00e4ljningsorder. D\u00e4refter fyller du i kunden och orderraderna. Att v\u00e4lja Ny bokf\u00f6r inte ordern; bokf\u00f6ring sker separat och skapar leverans- och fakturaposter.",
      "en-US": "From the Sales Orders list, New opens a new sales order. Next, enter the customer and sales lines. Choosing New does not post the order; posting is a separate step that creates shipment and invoice entries.",
      "fr-FR": "Depuis la liste des commandes, l\u2019action Nouveau ouvre une nouvelle commande de vente. Renseignez ensuite le client et les lignes. Le choix de Nouveau ne comptabilise pas la commande ; la comptabilisation est une \u00e9tape distincte qui cr\u00e9e les exp\u00e9ditions et les factures.",
      "de-DE": "In der Liste Verkaufsauftr\u00e4ge \u00f6ffnet Neu einen neuen Verkaufsauftrag. Geben Sie anschlie\u00dfend den Debitor und die Verkaufszeilen ein. Durch Neu wird der Auftrag nicht gebucht; die Buchung erfolgt separat und erstellt Lieferungs- und Rechnungsposten.",
      "es-ES": "Desde la lista de pedidos de venta, Nuevo abre un pedido nuevo. A continuaci\u00f3n, introduce el cliente y las l\u00edneas de venta. Elegir Nuevo no registra el pedido; el registro es un paso independiente que crea movimientos de env\u00edo y factura.",
      "da-DK": "Fra salgsordrelisten \u00e5bner Ny en ny salgsordre. Derefter angiver du kunden og salgslinjerne. Valget Ny bogf\u00f8rer ikke ordren; bogf\u00f8ring er et separat trin, der opretter leverings- og fakturaposter.",
      "fi-FI": "Myyntitilausluettelossa Uusi avaa uuden myyntitilauksen. T\u00e4yt\u00e4 seuraavaksi asiakas ja myyntirivit. Uuden valitseminen ei kirjaa tilausta; kirjaus tehd\u00e4\u00e4n erikseen, ja se luo toimitus- ja laskumerkinn\u00e4t.",
      "nb-NO": "Fra salgsordrelisten \u00e5pner Ny en ny salgsordre. Deretter fyller du ut kunden og salgslinjene. Valget Ny bokf\u00f8rer ikke ordren; bokf\u00f8ring er et eget trinn som oppretter leverings- og fakturaposter."
    },
    selectCustomer: {
      "sv-SE": "Kundnumret kopplar f\u00f6rs\u00e4ljningsordern till kundkortet. Business Central fyller andra orderf\u00e4lt med uppgifter och inst\u00e4llningar fr\u00e5n kunden. Kontrollera att r\u00e4tt kund valts och granska de f\u00f6reslagna leverans-, betalnings- och prisuppgifterna. Kundvalet bokf\u00f6r inte ordern.",
      "en-US": "The customer number links the sales order to the customer card. Business Central fills other order fields with information and settings from the customer. Verify that the intended customer was selected and review the proposed shipping, payment, and pricing details. Selecting a customer does not post the order.",
      "fr-FR": "Le num\u00e9ro client associe la commande au client. Business Central renseigne les autres champs de la commande avec les informations et param\u00e8tres du client. V\u00e9rifiez que le bon client est s\u00e9lectionn\u00e9 et contr\u00f4lez les informations propos\u00e9es pour la livraison, le paiement et le prix. La s\u00e9lection du client ne comptabilise pas la commande.",
      "de-DE": "Die Kundennummer verkn\u00fcpft den Verkaufsauftrag mit der Debitorenkarte. Business Central f\u00fcllt weitere Auftragsfelder mit Kundeninformationen und -einstellungen. Pr\u00fcfen Sie, ob der richtige Kunde ausgew\u00e4hlt ist, und kontrollieren Sie die vorgeschlagenen Liefer-, Zahlungs- und Preisdaten. Durch die Kundenauswahl wird der Auftrag nicht gebucht.",
      "es-ES": "El n\u00famero de cliente vincula el pedido de venta con la ficha del cliente. Business Central rellena otros campos del pedido con informaci\u00f3n y configuraci\u00f3n del cliente. Comprueba que se ha seleccionado el cliente correcto y revisa los datos propuestos de env\u00edo, pago y precios. Seleccionar un cliente no registra el pedido.",
      "da-DK": "Kundenummeret knytter salgsordren til kundekortet. Business Central udfylder andre ordreoplysninger med data og indstillinger fra kunden. Kontroll\u00e9r, at den rigtige kunde er valgt, og gennemg\u00e5 de foresl\u00e5ede oplysninger om levering, betaling og priser. Valget af kunde bogf\u00f8rer ikke ordren.",
      "fi-FI": "Asiakasnumero yhdist\u00e4\u00e4 myyntitilauksen asiakaskorttiin. Business Central t\u00e4ytt\u00e4\u00e4 muita tilauksen kentti\u00e4 asiakkaan tiedoilla ja asetuksilla. Varmista, ett\u00e4 valitsit oikean asiakkaan, ja tarkista ehdotetut toimitus-, maksu- ja hintatiedot. Asiakkaan valinta ei kirjaa tilausta.",
      "nb-NO": "Kundenummeret knytter salgsordren til kundekortet. Business Central fyller ut andre ordrefelt med informasjon og innstillinger fra kunden. Kontroller at riktig kunde er valgt, og gjennomgå foreslåtte opplysninger om levering, betaling og pris. Valg av kunde bokfører ikke ordren."
    },
    selectItem: {
      "sv-SE": "Artikelnumret kopplar f\u00f6rs\u00e4ljningsraden till den valda artikeln. Pris och rabatt kan bero p\u00e5 kund, artikel, enhet, antal och datum. Kontrollera att r\u00e4tt artikel valts och granska beskrivning, enhet, antal och pris. Valet bokf\u00f6r inte ordern.",
      "en-US": "The item number links the sales line to the selected item. Price and discount can depend on the customer, item, unit of measure, quantity, and dates. Verify that the intended item was selected and review the description, unit, quantity, and price. Selecting the item does not post the order.",
      "fr-FR": "Le num\u00e9ro d\u2019article associe la ligne de vente \u00e0 l\u2019article s\u00e9lectionn\u00e9. Le prix et la remise peuvent d\u00e9pendre du client, de l\u2019article, de l\u2019unit\u00e9, de la quantit\u00e9 et des dates. V\u00e9rifiez l\u2019article choisi ainsi que sa description, son unit\u00e9, la quantit\u00e9 et le prix. Cette s\u00e9lection ne comptabilise pas la commande.",
      "de-DE": "Die Artikelnummer verkn\u00fcpft die Verkaufszeile mit dem ausgew\u00e4hlten Artikel. Preis und Rabatt k\u00f6nnen von Debitor, Artikel, Einheit, Menge und Datum abh\u00e4ngen. Pr\u00fcfen Sie den ausgew\u00e4hlten Artikel sowie Beschreibung, Einheit, Menge und Preis. Durch die Auswahl wird der Auftrag nicht gebucht.",
      "es-ES": "El n\u00famero de producto vincula la l\u00ednea de venta con el producto seleccionado. El precio y el descuento pueden depender del cliente, el producto, la unidad, la cantidad y las fechas. Comprueba que se ha seleccionado el producto correcto y revisa la descripci\u00f3n, la unidad, la cantidad y el precio. Esta selecci\u00f3n no registra el pedido.",
      "da-DK": "Varenummeret knytter salgslinjen til den valgte vare. Pris og rabat kan afh\u00e6nge af kunde, vare, enhed, antal og datoer. Kontroll\u00e9r, at den rigtige vare er valgt, og gennemg\u00e5 beskrivelse, enhed, antal og pris. Valget bogf\u00f8rer ikke ordren.",
      "fi-FI": "Nimikenumero yhdist\u00e4\u00e4 myyntirivin valittuun nimikkeeseen. Hinta ja alennus voivat riippua asiakkaasta, nimikkeest\u00e4, yksik\u00f6st\u00e4, m\u00e4\u00e4r\u00e4st\u00e4 ja p\u00e4iv\u00e4m\u00e4\u00e4rist\u00e4. Varmista, ett\u00e4 valitsit oikean nimikkeen, ja tarkista kuvaus, yksikk\u00f6, m\u00e4\u00e4r\u00e4 ja hinta. Valinta ei kirjaa tilausta.",
      "nb-NO": "Varenummeret knytter salgslinjen til den valgte varen. Pris og rabatt kan avhenge av kunde, vare, enhet, antall og datoer. Kontroller at riktig vare er valgt, og gjennomg\u00e5 beskrivelse, enhet, antall og pris. Valget bokf\u00f8rer ikke ordren."
    },
    date: {
      "sv-SE": "Datumet styr när dokumentet eller raden förväntas hanteras. Ändringen kan påverka planering och förfallodatum men bokför inte dokumentet; kontrollera datumet mot överenskommelse och arbetsflöde.",
      "en-US": "The date controls when the document or line is expected to be handled. Changing it can affect planning and due dates but does not post the document; check it against the agreement and workflow.",
      "fr-FR": "La date indique quand le document ou la ligne doit être traité. Sa modification peut affecter la planification et les échéances, mais ne comptabilise pas le document ; vérifiez-la par rapport à l’accord et au processus.",
      "de-DE": "Das Datum legt fest, wann das Dokument oder die Zeile voraussichtlich bearbeitet wird. Eine Änderung kann Planung und Fälligkeiten beeinflussen, bucht das Dokument jedoch nicht; gleichen Sie es mit Vereinbarung und Ablauf ab.",
      "es-ES": "La fecha indica cuándo se espera gestionar el documento o la línea. Cambiarla puede afectar a la planificación y los vencimientos, pero no registra el documento; compárala con el acuerdo y el flujo.",
      "da-DK": "Datoen angiver, hvornår dokumentet eller linjen forventes håndteret. En ændring kan påvirke planlægning og forfaldsdatoer, men bogfører ikke dokumentet; kontrollér aftale og arbejdsforløb.",
      "fi-FI": "Päivämäärä määrittää, milloin asiakirja tai rivi on tarkoitus käsitellä. Muutos voi vaikuttaa suunnitteluun ja eräpäiviin mutta ei kirjaa asiakirjaa; tarkista se sopimuksesta ja työnkulusta.",
      "nb-NO": "Datoen angir når dokumentet eller linjen forventes behandlet. Endringen kan påvirke planlegging og forfallsdatoer, men bokfører ikke dokumentet; kontroller den mot avtalen og arbeidsflyten."
    },
    apply: {
      "sv-SE": "Tillämpningen kopplar en betalning eller kredit till öppna kund- eller leverantörsposter. Kopplingen påverkar återstående belopp och öppet saldo; kontrollera belopp, valuta och vilka poster som matchas innan du bokför.",
      "en-US": "Applying links a payment or credit to open customer or vendor entries. The application affects remaining amounts and open balances; verify amounts, currency, and matched entries before posting.",
      "fr-FR": "L’affectation associe un paiement ou un avoir à des écritures client ou fournisseur ouvertes. Elle modifie les montants restants et les soldes ouverts ; vérifiez les montants, la devise et les écritures rapprochées avant comptabilisation.",
      "de-DE": "Beim Ausgleichen wird eine Zahlung oder Gutschrift offenen Debitoren- oder Kreditorenposten zugeordnet. Dies beeinflusst Restbeträge und offene Salden; prüfen Sie Beträge, Währung und Zuordnung vor der Buchung.",
      "es-ES": "La aplicación vincula un pago o abono con movimientos abiertos de clientes o proveedores. Afecta a los importes pendientes y saldos abiertos; revisa importes, divisa y movimientos asociados antes de registrar.",
      "da-DK": "Udligningen knytter en betaling eller kreditnota til åbne debitor- eller kreditorposter. Den påvirker restbeløb og åbne saldi; kontrollér beløb, valuta og matchede poster før bogføring.",
      "fi-FI": "Kohdistus yhdistää maksun tai hyvityksen avoimiin asiakas- tai toimittajatapahtumiin. Se vaikuttaa jäljellä oleviin summiin ja avoimiin saldoihin; tarkista summat, valuutta ja kohdistetut tapahtumat ennen kirjausta.",
      "nb-NO": "Utlikningen knytter en betaling eller kreditnota til åpne kunde- eller leverandørposter. Den påvirker restbeløp og åpne saldoer; kontroller beløp, valuta og tilknyttede poster før bokføring."
    },
    suggest: {
      "sv-SE": "Förslaget skapar rader utifrån öppna poster och tillgängliga inställningar. Förslaget är inte en bokföring: granska mottagare, belopp, datum och betalningsinformation innan du godkänner eller bokför raderna.",
      "en-US": "The proposal creates lines from open entries and available setup. A proposal is not a posting: review payees, amounts, dates, and payment details before accepting or posting the lines.",
      "fr-FR": "La proposition crée des lignes à partir des écritures ouvertes et du paramétrage disponible. Elle ne constitue pas une comptabilisation : vérifiez les bénéficiaires, montants, dates et coordonnées de paiement avant validation.",
      "de-DE": "Der Vorschlag erstellt Zeilen anhand offener Posten und der verfügbaren Einrichtung. Ein Vorschlag ist keine Buchung: Prüfen Sie Empfänger, Beträge, Daten und Zahlungsangaben vor Übernahme oder Buchung.",
      "es-ES": "La propuesta crea líneas a partir de movimientos abiertos y de la configuración disponible. No es un registro contable: revisa beneficiarios, importes, fechas y datos de pago antes de aceptarla o registrarla.",
      "da-DK": "Forslaget opretter linjer ud fra åbne poster og tilgængelig opsætning. Et forslag er ikke en bogføring: kontrollér modtagere, beløb, datoer og betalingsoplysninger før godkendelse eller bogføring.",
      "fi-FI": "Ehdotus luo rivejä avointen tapahtumien ja käytettävissä olevien asetusten perusteella. Ehdotus ei ole kirjaus: tarkista saajat, summat, päivät ja maksutiedot ennen hyväksymistä tai kirjaamista.",
      "nb-NO": "Forslaget oppretter linjer ut fra åpne poster og tilgjengelige innstillinger. Et forslag er ikke en bokføring: kontroller mottakere, beløp, datoer og betalingsinformasjon før du godtar eller bokfører linjene."
    },
    recalculate: {
      "sv-SE": "Omberäkningen tar fram ett nytt förslag utifrån aktuella poster och inställningar. Resultatet kan skilja sig från tidigare beräkningar; granska antaganden, period och underlag innan resultatet används.",
      "en-US": "Recalculation produces an updated proposal from current entries and setup. Results may differ from earlier calculations; review assumptions, period, and source data before using them.",
      "fr-FR": "Le recalcul produit une proposition mise à jour à partir des écritures et du paramétrage actuels. Le résultat peut différer des calculs précédents ; vérifiez les hypothèses, la période et les données sources avant utilisation.",
      "de-DE": "Die Neuberechnung erstellt auf Grundlage aktueller Posten und Einrichtung einen aktualisierten Vorschlag. Ergebnisse können von früheren Berechnungen abweichen; prüfen Sie Annahmen, Zeitraum und Quelldaten.",
      "es-ES": "El recálculo genera una propuesta actualizada según los movimientos y la configuración actuales. El resultado puede diferir de cálculos anteriores; revisa supuestos, periodo y datos de origen antes de utilizarlo.",
      "da-DK": "Genberegningen opretter et opdateret forslag ud fra aktuelle poster og opsætning. Resultatet kan afvige fra tidligere beregninger; kontrollér forudsætninger, periode og kildedata.",
      "fi-FI": "Uudelleenlaskenta muodostaa päivitetyn ehdotuksen nykyisten tapahtumien ja asetusten perusteella. Tulos voi poiketa aiemmasta; tarkista oletukset, kausi ja lähdetiedot ennen käyttöä.",
      "nb-NO": "Omberegningen lager et oppdatert forslag basert på gjeldende poster og innstillinger. Resultatet kan avvike fra tidligere beregninger; kontroller forutsetninger, periode og kildedata før bruk."
    },
    suggestLines: {
      "sv-SE": "Funktionen tar fram rader utifrån tillgängliga poster och inställningar. Granska radtyp, belopp, datum och urval mot det avsedda arbetsflödet innan du använder förslaget.",
      "en-US": "This function proposes lines from available entries and setup. Check the line type, amounts, dates, and filters against the intended workflow before using the proposal.",
      "fr-FR": "Cette fonction propose des lignes à partir des écritures et du paramétrage disponibles. Vérifiez le type de ligne, les montants, les dates et les filtres avant d’utiliser la proposition.",
      "de-DE": "Diese Funktion schlägt anhand verfügbarer Posten und Einrichtung Zeilen vor. Prüfen Sie Zeilentyp, Beträge, Daten und Filter anhand des vorgesehenen Ablaufs, bevor Sie den Vorschlag verwenden.",
      "es-ES": "Esta función propone líneas a partir de los movimientos y la configuración disponibles. Revisa el tipo de línea, los importes, las fechas y los filtros antes de utilizar la propuesta.",
      "da-DK": "Funktionen foreslår linjer ud fra tilgængelige poster og opsætning. Kontrollér linjetype, beløb, datoer og filtre i forhold til arbejdsgangen, før du bruger forslaget.",
      "fi-FI": "Toiminto ehdottaa rivejä käytettävissä olevien tapahtumien ja asetusten perusteella. Tarkista rivin tyyppi, summat, päivämäärät ja suodattimet ennen ehdotuksen käyttöä.",
      "nb-NO": "Funksjonen foreslår linjer ut fra tilgjengelige poster og innstillinger. Kontroller linjetype, beløp, datoer og filtre mot arbeidsflyten før du bruker forslaget."
    },
    financeSetup: {
      "sv-SE": "Åtgärden ändrar ekonomisk konfiguration eller rapportdefinition. Ändringen kan påverka framtida bokföring, dimensioner eller rapportutfall; jämför befintlig inställning och testa resultatet innan den används brett.",
      "en-US": "This action changes financial setup or a report definition. It can affect future posting, dimensions, or report results; compare the existing setup and test the result before broad use.",
      "fr-FR": "Cette action modifie le paramétrage financier ou une définition de rapport. Elle peut affecter les comptabilisations, dimensions ou résultats futurs ; comparez le paramétrage et testez le résultat avant un déploiement large.",
      "de-DE": "Diese Aktion ändert die Finanzbuchhaltungseinrichtung oder eine Berichtdefinition. Sie kann künftige Buchungen, Dimensionen oder Berichtsergebnisse beeinflussen; vergleichen und testen Sie die Änderung vor der breiten Nutzung.",
      "es-ES": "Esta acción cambia la configuración financiera o una definición de informe. Puede afectar a futuros registros, dimensiones o resultados; compara la configuración y prueba el resultado antes de aplicarlo ampliamente.",
      "da-DK": "Handlingen ændrer finansopsætning eller en rapportdefinition. Den kan påvirke fremtidig bogføring, dimensioner eller rapportresultater; sammenlign opsætningen, og afprøv resultatet før bred anvendelse.",
      "fi-FI": "Toiminto muuttaa talousasetuksia tai raportin määritystä. Se voi vaikuttaa tuleviin kirjauksiin, dimensioihin tai raporttituloksiin; vertaa aiempiin asetuksiin ja testaa tulos ennen laajaa käyttöä.",
      "nb-NO": "Handlingen endrer økonomioppsett eller en rapportdefinisjon. Den kan påvirke fremtidig bokføring, dimensjoner eller rapportresultater; sammenlign oppsettet og test resultatet før bred bruk."
    },
    depreciation: {
      "sv-SE": "Avskrivningsförslaget beräknas från anläggningstillgångarnas avskrivningsbok och dess metoder, datum och återstående värden. Granska förslagsraderna och bokföringsdatum innan journalen bokförs.",
      "en-US": "The depreciation proposal is calculated from fixed-asset depreciation books, methods, dates, and remaining values. Review the proposal lines and posting date before posting the journal.",
      "fr-FR": "La proposition d’amortissement est calculée à partir des livres, méthodes, dates et valeurs restantes des immobilisations. Vérifiez les lignes proposées et la date avant de comptabiliser la feuille.",
      "de-DE": "Der Abschreibungsvorschlag basiert auf Anlagenbuchungsgruppen, Methoden, Daten und Restwerten. Prüfen Sie die Vorschlagszeilen und das Buchungsdatum vor dem Buchen des Anlagenjournals.",
      "es-ES": "La propuesta de amortización se calcula según los libros, métodos, fechas y valores pendientes del inmovilizado. Revisa las líneas propuestas y la fecha antes de registrar el diario.",
      "da-DK": "Afskrivningsforslaget beregnes ud fra anlæggenes afskrivningsbøger, metoder, datoer og restværdier. Kontrollér forslagslinjer og bogføringsdato, før anlægsfinanskladden bogføres.",
      "fi-FI": "Poisto-ohjelma lasketaan käyttöomaisuuden poistokirjojen, menetelmien, päivämäärien ja jäljellä olevien arvojen perusteella. Tarkista ehdotusrivit ja kirjauspäivä ennen päiväkirjan kirjaamista.",
      "nb-NO": "Avskrivningsforslaget beregnes fra anleggsmidlenes avskrivningsbøker, metoder, datoer og restverdier. Kontroller forslagslinjene og bokføringsdatoen før kladden bokføres."
    },
    production: {
      "sv-SE": "Åtgärden uppdaterar produktionsorderns planerade behov eller kapacitet utifrån aktuell stycklista, rutt och planeringsdata. Granska komponenter, datum och föreslagna orderrader innan ändringen godtas.",
      "en-US": "The action updates a production order’s planned requirements or capacity using current BOM, routing, and planning data. Review components, dates, and proposed order lines before accepting the change.",
      "fr-FR": "L’action met à jour les besoins ou capacités planifiés de l’ordre de fabrication selon la nomenclature, la gamme et les données de planification actuelles. Vérifiez composants, dates et lignes proposées.",
      "de-DE": "Die Aktion aktualisiert geplanten Bedarf oder Kapazität des Fertigungsauftrags anhand aktueller Stückliste, Arbeitsplan und Planungsdaten. Prüfen Sie Komponenten, Termine und vorgeschlagene Auftragszeilen.",
      "es-ES": "La acción actualiza las necesidades o la capacidad planificadas de la orden de producción según la lista de materiales, la ruta y los datos actuales. Revisa componentes, fechas y líneas propuestas.",
      "da-DK": "Handlingen opdaterer produktionsordrens planlagte behov eller kapacitet ud fra aktuel stykliste, rute og planlægningsdata. Kontrollér komponenter, datoer og foreslåede ordrelinjer.",
      "fi-FI": "Toiminto päivittää tuotantotilauksen suunnitellut tarpeet tai kapasiteetin nykyisen rakenteen, reitityksen ja suunnittelutietojen perusteella. Tarkista komponentit, päivämäärät ja ehdotetut rivit.",
      "nb-NO": "Handlingen oppdaterer produksjonsordrens planlagte behov eller kapasitet ut fra gjeldende stykklist, rute og planleggingsdata. Kontroller komponenter, datoer og foreslåtte ordrelinjer."
    },
    project: {
      "sv-SE": "Projektåtgärden flyttar planerad användning, tid eller material till nästa projektdokument eller journal. Kontrollera projektuppgift, resurs, mängd och överföringsmål; överföringen är inte samma sak som bokföring.",
      "en-US": "The project action transfers planned usage, time, or materials to the next project document or journal. Verify the project task, resource, quantity, and destination; transfer is not the same as posting.",
      "fr-FR": "L’action projet transfère l’utilisation, le temps ou les articles planifiés vers le document ou la feuille projet suivante. Vérifiez tâche, ressource, quantité et destination ; le transfert n’est pas une comptabilisation.",
      "de-DE": "Die Projektaktion überträgt geplanten Verbrauch, Zeit oder Material in das nächste Projektdokument oder -journal. Prüfen Sie Projektaufgabe, Ressource, Menge und Ziel; eine Übertragung ist keine Buchung.",
      "es-ES": "La acción del proyecto transfiere uso, tiempo o materiales planificados al siguiente documento o diario del proyecto. Verifica tarea, recurso, cantidad y destino; transferir no equivale a registrar.",
      "da-DK": "Projekthandlingen overfører planlagt forbrug, tid eller materialer til næste projektdokument eller -kladde. Kontrollér projektopgave, ressource, antal og destination; overførsel er ikke bogføring.",
      "fi-FI": "Projektitoiminto siirtää suunniteltua käyttöä, aikaa tai materiaalia seuraavaan projektiasiakirjaan tai päiväkirjaan. Tarkista projektitehtävä, resurssi, määrä ja kohde; siirto ei ole sama asia kuin kirjaus.",
      "nb-NO": "Prosjekthandlingen overfører planlagt forbruk, tid eller materialer til neste prosjektdokument eller kladd. Kontroller prosjektoppgave, ressurs, mengde og mål; overføring er ikke det samme som bokføring."
    },
    warehouse: {
      "sv-SE": "Lageråtgärden skapar, uppdaterar eller registrerar lagerarbete utifrån dokumentrader och lagerplatsens inställningar. Kontrollera artikel, lagerplats, hanterad mängd och kvarvarande arbete innan registrering eller bokföring.",
      "en-US": "The warehouse action creates, updates, or registers warehouse work from document lines and location setup. Check the item, location, handled quantity, and remaining work before registering or posting.",
      "fr-FR": "L’action entrepôt crée, met à jour ou enregistre le travail à partir des lignes document et du paramétrage du site. Vérifiez article, emplacement, quantité traitée et travail restant avant enregistrement ou comptabilisation.",
      "de-DE": "Die Lageraktion erstellt, aktualisiert oder registriert Lagerarbeit anhand von Dokumentzeilen und Lagerort-Einrichtung. Prüfen Sie Artikel, Lagerort, bearbeitete Menge und Restarbeit vor Registrierung oder Buchung.",
      "es-ES": "La acción de almacén crea, actualiza o registra trabajo de almacén según las líneas del documento y la configuración de ubicación. Revisa producto, ubicación, cantidad gestionada y trabajo pendiente antes de registrar.",
      "da-DK": "Lagerhandlingen opretter, opdaterer eller registrerer lagerarbejde ud fra dokumentlinjer og lokationsopsætning. Kontrollér vare, lokation, håndteret antal og resterende arbejde før registrering eller bogføring.",
      "fi-FI": "Varastotoiminto luo, päivittää tai rekisteröi varastotyötä asiakirjarivien ja varaston asetusten perusteella. Tarkista nimike, varasto, käsitelty määrä ja jäljellä oleva työ ennen rekisteröintiä tai kirjausta.",
      "nb-NO": "Lagerhandlingen oppretter, oppdaterer eller registrerer lagerarbeid ut fra dokumentlinjer og lokasjonsoppsett. Kontroller vare, lokasjon, håndtert antall og gjenstående arbeid før registrering eller bokføring."
    },
    getLines: {
      "sv-SE": "Åtgärden hämtar ursprungliga dokumentrader som underlag till det aktuella dokumentet. Kontrollera att rätt order, leverans eller mottagning kopplas och att rader inte tas med dubbelt.",
      "en-US": "The action retrieves source document lines for the current document. Verify the correct order, shipment, or receipt is linked and that lines are not included twice.",
      "fr-FR": "L’action récupère des lignes de document source pour le document actuel. Vérifiez la commande, l’expédition ou la réception liée et évitez d’ajouter deux fois les mêmes lignes.",
      "de-DE": "Die Aktion übernimmt Ursprungsbelegzeilen in das aktuelle Dokument. Prüfen Sie, ob der richtige Auftrag, Versand oder Wareneingang verknüpft ist und keine Zeilen doppelt übernommen werden.",
      "es-ES": "La acción recupera líneas de documentos de origen para el documento actual. Comprueba que se vincula el pedido, envío o recepción correcto y que no se duplican líneas.",
      "da-DK": "Handlingen henter kildedokumentlinjer ind i det aktuelle dokument. Kontrollér, at den korrekte ordre, levering eller modtagelse er knyttet, og at linjer ikke medtages dobbelt.",
      "fi-FI": "Toiminto hakee lähdeasiakirjan rivit nykyiseen asiakirjaan. Varmista, että oikea tilaus, lähetys tai vastaanotto on liitetty eikä rivejä tuoda kahteen kertaan.",
      "nb-NO": "Handlingen henter kildedokumentlinjer inn i det gjeldende dokumentet. Kontroller at riktig ordre, levering eller mottak er knyttet til, og at linjer ikke tas med dobbelt."
    },
    availability: {
      "sv-SE": "Tillgänglighetsvyn visar beräknat eller registrerat lager utifrån vald händelse, period, plats, variant eller stycklistenivå. Resultatet beror på filter och planerade transaktioner; kontrollera urval och datum.",
      "en-US": "The availability view shows calculated or recorded inventory by the selected event, period, location, variant, or BOM level. Results depend on filters and planned transactions; check the selection and date.",
      "fr-FR": "La vue disponibilité présente le stock calculé ou enregistré selon l’événement, la période, l’emplacement, la variante ou le niveau de nomenclature. Le résultat dépend des filtres et mouvements prévus ; vérifiez la sélection et la date.",
      "de-DE": "Die Verfügbarkeitsansicht zeigt berechneten oder gebuchten Bestand nach Ereignis, Zeitraum, Lagerort, Variante oder Stücklistenebene. Das Ergebnis hängt von Filtern und geplanten Bewegungen ab; prüfen Sie Auswahl und Datum.",
      "es-ES": "La vista de disponibilidad muestra el inventario calculado o registrado según evento, periodo, ubicación, variante o nivel de lista de materiales. El resultado depende de filtros y transacciones previstas; revisa selección y fecha.",
      "da-DK": "Tilgængelighedsvisningen viser beregnet eller registreret lager efter valgt hændelse, periode, lokation, variant eller stykliste-niveau. Resultatet afhænger af filtre og planlagte transaktioner; kontrollér valg og dato.",
      "fi-FI": "Saatavuusnäkymä näyttää lasketun tai kirjatun varaston valitun tapahtuman, kauden, varaston, variantin tai rakennetason mukaan. Tulos riippuu suodattimista ja suunnitelluista tapahtumista; tarkista valinta ja päivämäärä.",
      "nb-NO": "Tilgjengelighetsvisningen viser beregnet eller registrert lager etter valgt hendelse, periode, lokasjon, variant eller stykklistenivå. Resultatet avhenger av filtre og planlagte transaksjoner; kontroller valg og dato."
    },
    salesPrice: {
      "sv-SE": "Det här steget visar försäljningsradens tillämpade pris- och rabattunderlag. Business Central kan beräkna bästa pris utifrån kund, artikel, enhet, antal och giltighetsdatum. Kontrollera priset och rabatten mot ordern innan du fortsätter.",
      "en-US": "This step shows the sales line’s applied price and discount details. Business Central can calculate the best price from the customer, item, unit, quantity, and validity dates. Check the price and discount against the order before continuing.",
      "fr-FR": "Cette étape affiche les détails du prix et de la remise appliqués à la ligne de vente. Business Central peut calculer le meilleur prix selon le client, l’article, l’unité, la quantité et les dates de validité. Vérifiez le prix et la remise sur la commande avant de poursuivre.",
      "de-DE": "Dieser Schritt zeigt die angewendeten Preis- und Rabattdetails der Verkaufszeile. Business Central kann den besten Preis anhand von Debitor, Artikel, Einheit, Menge und Gültigkeitsdaten berechnen. Prüfen Sie Preis und Rabatt im Auftrag, bevor Sie fortfahren.",
      "es-ES": "Este paso muestra los detalles del precio y el descuento aplicados a la línea de venta. Business Central puede calcular el mejor precio según el cliente, el producto, la unidad, la cantidad y las fechas de validez. Comprueba el precio y el descuento en el pedido antes de continuar.",
      "da-DK": "Dette trin viser den anvendte pris og rabat for salgslinjen. Business Central kan beregne den bedste pris ud fra kunden, varen, enheden, antallet og gyldighedsdatoerne. Kontrollér prisen og rabatten på ordren, før du fortsætter.",
      "fi-FI": "Tässä vaiheessa näytetään myyntiriville sovellettu hinta ja alennus. Business Central voi laskea parhaan hinnan asiakkaan, nimikkeen, yksikön, määrän ja voimassaolopäivien perusteella. Tarkista hinta ja alennus tilaukselta ennen jatkamista.",
      "nb-NO": "Dette trinnet viser pris- og rabattdetaljene som er brukt på salgslinjen. Business Central kan beregne den beste prisen ut fra kunden, varen, enheten, antallet og gyldighetsdatoene. Kontroller prisen og rabatten på ordren før du fortsetter."
    },
    manualPrice: {
      "sv-SE": "Det här steget öppnar den manuella prisvägen för försäljningsraden. Om enhetspriset ändras påverkas radens belopp; tillämpliga pris- och rabattavtal beror på orderdata och inställningar. Kontrollera resultatet innan du bekräftar.",
      "en-US": "This step opens the manual pricing option for the sales line. Changing the unit price affects the line amount; applicable price and discount agreements depend on the order data and setup. Check the result before confirming.",
      "fr-FR": "Cette étape ouvre l’option de tarification manuelle de la ligne de vente. La modification du prix unitaire affecte le montant de la ligne ; les accords applicables dépendent des données de commande et du paramétrage. Vérifiez le résultat avant de confirmer.",
      "de-DE": "Dieser Schritt öffnet die manuelle Preisoption für die Verkaufszeile. Eine Änderung des Einzelpreises wirkt sich auf den Zeilenbetrag aus; anwendbare Vereinbarungen hängen von den Auftragsdaten und der Einrichtung ab. Prüfen Sie das Ergebnis vor der Bestätigung.",
      "es-ES": "Este paso abre la opción de precio manual para la línea de venta. Cambiar el precio unitario afecta al importe de la línea; los acuerdos aplicables dependen de los datos del pedido y de la configuración. Comprueba el resultado antes de confirmar.",
      "da-DK": "Dette trin åbner muligheden for manuel pris på salgslinjen. En ændring af enhedsprisen påvirker linjebeløbet; gældende aftaler afhænger af ordredata og opsætningen. Kontrollér resultatet, før du bekræfter.",
      "fi-FI": "Tässä vaiheessa avataan myyntirivin manuaalinen hinnoitteluvaihtoehto. Yksikköhinnan muuttaminen vaikuttaa rivin summaan; sovellettavat sopimukset riippuvat tilauksen tiedoista ja asetuksista. Tarkista tulos ennen vahvistamista.",
      "nb-NO": "Dette trinnet åpner alternativet for manuell pris på salgslinjen. En endring av enhetsprisen påvirker linjebeløpet; gjeldende avtaler avhenger av ordredataene og oppsettet. Kontroller resultatet før du bekrefter."
    },
    changePrice: {
      "sv-SE": "Det här steget ändrar försäljningsradens enhetspris. Business Central kan även tillämpa bästa pris eller radrabatt från kund- och artikelavtal beroende på antal, enhet och datum. Kontrollera beloppet och rabatten innan du fortsätter.",
      "en-US": "This step changes the sales line’s unit price. Business Central may also apply the best price or a line discount from customer and item agreements, depending on quantity, unit, and date. Check the amount and discount before continuing.",
      "fr-FR": "Cette étape modifie le prix unitaire de la ligne de vente. Business Central peut aussi appliquer le meilleur prix ou une remise de ligne issue des accords client et article, selon la quantité, l’unité et la date. Vérifiez le montant et la remise avant de poursuivre.",
      "de-DE": "Dieser Schritt ändert den Einzelpreis der Verkaufszeile. Business Central kann abhängig von Menge, Einheit und Datum auch den besten Preis oder einen Zeilenrabatt aus Debitoren- und Artikelvereinbarungen anwenden. Prüfen Sie Betrag und Rabatt, bevor Sie fortfahren.",
      "es-ES": "Este paso cambia el precio unitario de la línea de venta. Business Central también puede aplicar el mejor precio o un descuento de línea según los acuerdos con el cliente y el producto, la cantidad, la unidad y la fecha. Comprueba el importe y el descuento antes de continuar.",
      "da-DK": "Dette trin ændrer salgslinjens enhedspris. Business Central kan også anvende den bedste pris eller en linjerabat fra kunde- og vareaftaler afhængigt af antal, enhed og dato. Kontrollér beløbet og rabatten, før du fortsætter.",
      "fi-FI": "Tässä vaiheessa muutetaan myyntirivin yksikköhintaa. Business Central voi soveltaa myös parasta hintaa tai rivialennusta asiakkaan ja nimikkeen sopimusten perusteella määrän, yksikön ja päivämäärän mukaan. Tarkista summa ja alennus ennen jatkamista.",
      "nb-NO": "Dette trinnet endrer enhetsprisen på salgslinjen. Business Central kan også bruke beste pris eller linjerabatt fra kunde- og vareavtaler, avhengig av antall, enhet og dato. Kontroller beløpet og rabatten før du fortsetter."
    },
    cancelDepreciation: {
      "sv-SE": "Körningen avbryter felaktiga avskrivningstransaktioner och skapar poster i anläggningarnas felliggare. Kontrollera anläggning, avskrivningsbok, bokföringsdatum och belopp. Beräkna därefter rätt avskrivning och granska journalen innan den bokförs.",
      "en-US": "This batch job cancels incorrect depreciation entries and creates fixed asset error ledger entries. Verify the asset, depreciation book, posting date, and amount; then calculate the correct depreciation and review the journal before posting it.",
      "fr-FR": "Ce traitement annule les écritures d’amortissement incorrectes et crée des écritures d’erreur d’immobilisation. Vérifiez l’immobilisation, le livre d’amortissement, la date de comptabilisation et le montant. Recalculez ensuite l’amortissement correct et contrôlez le journal avant sa comptabilisation.",
      "de-DE": "Der Stapelverarbeitungsauftrag storniert fehlerhafte Abschreibungsbuchungen und erstellt Anlagenfehlerposten. Prüfen Sie Anlage, Abschreibungsbuch, Buchungsdatum und Betrag. Berechnen Sie danach die korrekte Abschreibung und prüfen Sie das Journal vor der Buchung.",
      "es-ES": "Este proceso por lotes cancela los movimientos de amortización incorrectos y crea movimientos de error de activos fijos. Comprueba el activo, el libro de amortización, la fecha de registro y el importe. Después, calcula la amortización correcta y revisa el diario antes de registrarlo.",
      "da-DK": "Denne batchkørsel annullerer forkerte afskrivningsposter og opretter fejlposter for anlægsaktiver. Kontrollér anlægsaktiv, afskrivningsbog, bogføringsdato og beløb. Beregn derefter den korrekte afskrivning, og gennemgå kladden, før den bogføres.",
      "fi-FI": "Tämä eräajo peruuttaa virheelliset poistotapahtumat ja luo käyttöomaisuuden virhekirjanpitotapahtumat. Tarkista käyttöomaisuushyödyke, poistokirja, kirjauspäivä ja summa. Laske sen jälkeen oikea poisto ja tarkista päiväkirja ennen kirjaamista.",
      "nb-NO": "Denne satsvise jobben annullerer feilaktige avskrivningsposter og oppretter feilposter i anleggsregnskapet. Kontroller anleggsmiddel, avskrivningsbok, bokføringsdato og beløp. Beregn deretter riktig avskrivning, og kontroller kladden før den bokføres."
    },
    returnReason: {
      "sv-SE": "Returorsakskoden anger varför artikeln returneras och gör orsaker jämförbara vid uppföljning. Kontrollera att koden stämmer med överenskommelsen och den aktuella raden. Koden bokför inte returen och avgör inte i sig kostnadsåterföring, kreditering eller vad som ska hända med artikeln.",
      "en-US": "The return reason code records why the item is being returned and makes return causes easier to compare. Verify that it matches the agreement and the current line. The code does not post the return or by itself determine cost reversal, credit, or the item's disposition.",
      "fr-FR": "Le code motif de retour indique pourquoi l’article est renvoyé et facilite la comparaison des motifs. Vérifiez qu’il correspond à l’accord et à la ligne concernée. Le code ne comptabilise pas le retour et ne détermine pas à lui seul la contrepassation du coût, l’avoir ou le devenir de l’article.",
      "de-DE": "Der Retourengrundcode dokumentiert, warum der Artikel zurückgegeben wird, und erleichtert den Vergleich der Rückgabegründe. Prüfen Sie, ob er zur Vereinbarung und zur aktuellen Zeile passt. Der Code bucht die Retoure nicht und bestimmt allein weder Kostenstorno noch Gutschrift oder weiteren Verbleib des Artikels.",
      "es-ES": "El código de motivo de devolución indica por qué se devuelve el producto y facilita comparar las causas. Comprueba que coincida con el acuerdo y la línea correspondiente. El código no registra la devolución ni determina por sí solo la reversión del coste, el abono o el destino del producto.",
      "da-DK": "Returårsagskoden angiver, hvorfor varen returneres, og gør returårsager lettere at sammenligne. Kontrollér, at koden stemmer med aftalen og den aktuelle linje. Koden bogfører ikke returneringen og afgør ikke i sig selv omkostningsreversering, kreditnota eller varens videre håndtering.",
      "fi-FI": "Palautuksen syykoodi kertoo, miksi nimike palautetaan, ja helpottaa syiden vertailua. Varmista, että koodi vastaa sopimusta ja kyseistä riviä. Koodi ei kirjaa palautusta eikä yksin ratkaise kustannusten oikaisua, hyvitystä tai nimikkeen jatkokäsittelyä.",
      "nb-NO": "Returårsakskoden angir hvorfor varen returneres, og gjør returårsakene enklere å sammenligne. Kontroller at koden stemmer med avtalen og den aktuelle linjen. Koden bokfører ikke returen og avgjør ikke i seg selv kostnadsreversering, kreditnota eller videre håndtering av varen."
    },
    action: {
      "sv-SE": "Åtgärden utför det namngivna arbetsmomentet i den identifierade Business Central-kontexten. Den exakta effekten beror på sidan, dokumentstatusen och inställningarna; kontrollera resultatet innan nästa steg.",
      "en-US": "The action performs the named operation in the identified Business Central context. Its exact effect depends on the page, document status, and setup; verify the result before continuing.",
      "fr-FR": "L’action exécute l’opération nommée dans le contexte Business Central identifié. Son effet exact dépend de la page, du statut du document et du paramétrage ; vérifiez le résultat avant de continuer.",
      "de-DE": "Die Aktion führt den benannten Vorgang im erkannten Business Central-Kontext aus. Die genaue Wirkung hängt von Seite, Dokumentstatus und Einrichtung ab; prüfen Sie das Ergebnis vor dem Fortfahren.",
      "es-ES": "La acción ejecuta la operación indicada en el contexto identificado de Business Central. Su efecto exacto depende de la página, el estado del documento y la configuración; comprueba el resultado antes de continuar.",
      "da-DK": "Handlingen udfører den navngivne funktion i den identificerede Business Central-kontekst. Den præcise virkning afhænger af siden, dokumentstatus og opsætning; kontrollér resultatet før du fortsætter.",
      "fi-FI": "Toiminto suorittaa nimetyn toimenpiteen tunnistetussa Business Central -kontekstissa. Tarkka vaikutus riippuu sivusta, asiakirjan tilasta ja asetuksista; tarkista tulos ennen jatkamista.",
      "nb-NO": "Handlingen utfører den navngitte operasjonen i den identifiserte Business Central-konteksten. Den nøyaktige virkningen avhenger av siden, dokumentstatus og oppsett; kontroller resultatet før du fortsetter."
    }
  };
  const direct = {
    OpenRecord: "open", OpenRelatedLines: "open", OpenWorksheet: "open",
    ViewList: "open", SearchAndOpenPage: "search", CreateNew: "create",
    CreateCreditMemo: "create", CreateSalesInvoice: "create",
    CreatePurchaseOrders: "create", CreateTimeSheetLines: "create",
    CreateJournalLines: "create", ReleaseDocument: "release",
    ReopenDocument: "reopen", PostDocument: "post", PostJournal: "post",
    PostFixedAssetJournal: "post", PostServiceDocument: "post",
    EnterQuantity: "quantity", SelectCustomer: "select", SelectVendor: "select",
    SelectItem: "select", ChangeDate: "date", ChangeShipmentDate: "date",
    ApplyEntries: "apply", ApplyPayments: "apply",
    ReviewPaymentApplication: "apply", SuggestPayments: "suggest",
    SuggestJournalLines: "suggestLines", RecalculateCashFlowForecast: "recalculate",
    CalculateDepreciation: "depreciation", CalculateFixedAssetRevaluation: "depreciation",
    ChangeGlobalDimensions: "financeSetup", EditFinancialReportRowDefinition: "financeSetup",
    EditFinancialReportColumnDefinition: "financeSetup", EditBudget: "financeSetup",
    IndentChartOfAccounts: "financeSetup", ChangeDocumentStatus: "action",
    RunAction: "action", RunBatchJob: "action", ViewAvailability: "availability",
    GetOrderLines: "getLines", GetReceiptLines: "getLines",
    GetShipmentLines: "getLines", GetRelatedPlanningLines: "getLines"
  };
  const specific = {
    "Sales.CreateSalesOrderFromList": "createSalesOrder",
    "Purchase.CreatePurchaseOrderFromList": "createPurchaseOrder",
    "Sales.OpenSalesOrder": "openSalesOrder",
    "Sales.SetSalesLineQuantity": "salesLineQuantity",
    "Purchase.SetPurchaseLineQuantity": "purchaseLineQuantity",
    "Purchase.OpenPurchaseOrder": "openPurchaseOrder",
    "Sales.SetQtyToShip": "salesQtyToShip",
    "Purchase.SetQtyToReceive": "purchaseQtyToReceive",
    "Projects.SetQtyToTransferToJournal": "projectJournalQuantity",
    "Projects.SetQtyToTransferToInvoice": "projectInvoiceQuantity",
    "Warehouse.SetQtyToHandlePick": "warehousePickQuantity",
    "Warehouse.SetQtyToReceive": "warehouseReceiptQuantity",
    "Sales.SelectCustomer": "selectCustomer",
    "Sales.SelectSalesLineItem": "selectItem",
    "Sales.ViewSalesPriceDiscountDetails": "salesPrice",
    "Sales.OpenManualPrice": "manualPrice",
    "Sales.ChangeAppliedUnitPrice": "changePrice",
    "Sales.SetSalesLineUnitPrice": "changePrice",
    "Sales.SetReturnReasonCode": "returnReason",
    "Purchase.SelectVendor": "selectVendor",
    "Purchase.SelectPurchaseLineItem": "selectPurchaseItem",
    "Purchase.SelectPurchaseLineItemFromLookup": "selectPurchaseItem",
    "Purchase.ApplyPurchasePricesAndDiscounts": "purchasePricing",
    "Purchase.SetDirectUnitCost": "purchaseDirectUnitCost",
    "Purchase.SetReturnReasonCode": "returnReason",
    "Purchase.OpenManualPurchasePrice": "openPurchaseManualPrice",
    "Purchase.OpenPurchaseOrderListFromSearch": "openPurchaseOrderList",
    "Manufacturing.SelectItem": "selectProductionItem",
    "Manufacturing.OpenProductionOrder": "openProductionOrder",
    "Warehouse.SelectLocation": "selectLocation",
    "Warehouse.SelectBin": "selectBin",
    "Warehouse.OpenReceipt": "warehouseOpenReceipt",
    "Warehouse.OpenShipment": "warehouseOpenShipment",
    "Warehouse.PostReceipt": "warehousePostReceipt",
    "Warehouse.PostShipment": "warehousePostShipment",
    "Finance.CancelDepreciationEntries": "action",
    "Finance.CancelFixedAssetDepreciation": "cancelDepreciation",
    "Finance.CloseFiscalYear": "financeSetup",
    "Finance.CreateAccountingPeriods": "financeSetup",
    "Manufacturing.RefreshProductionOrder": "production",
    "Manufacturing.ReplanProductionOrder": "production",
    "Manufacturing.EnterConsumptionQuantity": "production",
    "Manufacturing.EnterOutputQuantity": "production",
    "Projects.CalculateRemainingUsage": "project",
    "Projects.CreateProjectInventoryPick": "project",
    "Projects.CreateProjectWarehousePick": "project",
    "Projects.CreateProjectSalesInvoice": "project",
    "Projects.CreateProjectJournalLines": "project",
    "Warehouse.CreatePick": "warehouse",
    "Warehouse.RegisterPick": "warehouse",
    "Warehouse.RegisterPutAway": "warehouse",
    "Warehouse.PostInventoryPick": "warehouse",
    "Warehouse.PostReceiptAction": "warehouse",
    "Purchase.GetPostedLinesToReverse": "getLines",
    "Sales.GetPostedLinesToReverse": "getLines",
    "Purchase.CreateCorrectiveCreditMemo": "create",
    "Sales.CreateCorrectiveCreditMemo": "create",
    "Purchase.CancelUnpaidPostedInvoice": "action",
    "Sales.CancelUnpaidPostedInvoice": "action",
    "Services.PostServiceOrder": "post",
    "Services.AllocateServiceResource": "serviceResourceAllocation",
    "Services.ChangeRepairStatus": "serviceRepairStatus",
    "Services.SetServiceItemWorksheetQuantity": "quantity",
    "CashManagement.ApplyPaymentsAutomatically": "apply",
    "CashManagement.ApplyPaymentsManually": "apply",
    "CashManagement.SuggestVendorPayments": "suggest",
    "CashManagement.PostCashReceiptJournal": "post",
    "CashManagement.PostPaymentJournal": "post",
    "CashManagement.PostPaymentReconciliationJournal": "post"
  };
  Object.assign(direct, {
    SuggestVATReportLines: "suggestLines",
    PreviewExchangeRateAdjustment: "action",
    CalculateFixedAssetRevaluation: "action",
    CalculateDepreciation: "depreciation",
    SelectSourceDocumentLines: "getLines",
    CreatePick: "warehouse",
    CreateWarehousePick: "warehouse",
    UpdateCapacity: "project",
    CopyDocument: "create",
    CancelInvoice: "action",
    ChangeDocumentStatus: "action"
  });

  const observedWorkflow = {
    "Observed.Purchase.CreateWarehouseReceipt": {
      "sv-SE": "Skapar en distributionslagerinleverans från inköpsordern så att mottagningen kan hanteras i lagerflödet. Kontrollera att rätt order och rader följer med.",
      "en-US": "Creates a warehouse receipt from the purchase order so receiving can continue in the warehouse workflow. Check that the intended order and lines are included.",
      "fr-FR": "Crée une réception d’entrepôt à partir de la commande achat afin de poursuivre la réception dans le flux de l’entrepôt. Vérifiez que la commande et les lignes voulues sont incluses.",
      "de-DE": "Erstellt aus dem Einkaufsauftrag einen Lagerwareneingang, damit der Empfang im Lagerablauf bearbeitet werden kann. Prüfen Sie, ob der richtige Auftrag und die richtigen Zeilen enthalten sind.",
      "es-ES": "Crea una recepción de almacén a partir del pedido de compra para continuar la recepción en el flujo del almacén. Comprueba que se incluyan el pedido y las líneas correctos.",
      "da-DK": "Opretter en lagerindlevering ud fra købsordren, så modtagelsen kan fortsætte i lagerarbejdsgangen. Kontrollér, at den rigtige ordre og de rigtige linjer er med.",
      "fi-FI": "Luo ostotilauksesta varastovastaanoton, jotta vastaanottoa voidaan jatkaa varaston työnkulussa. Tarkista, että oikea tilaus ja sen rivit ovat mukana.",
      "nb-NO": "Oppretter en lagerinngående levering fra innkjøpsordren, slik at mottaket kan fortsette i lagerflyten. Kontroller at riktig ordre og riktige linjer er med."
    },
    "Observed.Warehouse.RegisterWeight": {
      "sv-SE": "Öppnar viktregistreringen för artikeln på inleveransen. Registrera vikten som ska användas i den fortsatta mottagningen och kontrollera enheten.",
      "en-US": "Opens weight registration for the item on the receipt. Enter the weight used for the remaining receiving work and check the unit.",
      "fr-FR": "Ouvre l’enregistrement du poids de l’article sur la réception. Saisissez le poids utilisé pour poursuivre la réception et vérifiez l’unité.",
      "de-DE": "Öffnet die Gewichtserfassung für den Artikel im Wareneingang. Erfassen Sie das Gewicht für die weitere Warenannahme und prüfen Sie die Einheit.",
      "es-ES": "Abre el registro del peso del producto de la recepción. Introduce el peso que se utilizará para continuar la recepción y comprueba la unidad.",
      "da-DK": "Åbner vægtregistreringen for varen på indleveringen. Registrér den vægt, der skal bruges i den videre modtagelse, og kontrollér enheden.",
      "fi-FI": "Avaa vastaanoton nimikkeen painon kirjauksen. Syötä vastaanoton jatkossa käytettävä paino ja tarkista yksikkö.",
      "nb-NO": "Åpner vektregistreringen for varen på innleveringen. Registrer vekten som skal brukes videre i mottaket, og kontroller enheten."
    },
    "Observed.Warehouse.SelectHandlingUnitCode": {
      "sv-SE": "Fältet Lastbärarekod anger vilken typ av lastbärare som används i viktregistreringen. Kontrollera att den valda koden motsvarar emballaget eller pallen för mottagningen; valet i sig bokför inte inleveransen.",
      "en-US": "Handling Unit Code identifies the type of handling unit used in the weight registration. Check that the selected code matches the packaging or pallet for this receipt; selecting it does not post the receipt.",
      "fr-FR": "Le code d’unité de manutention indique le type d’unité utilisé dans l’enregistrement du poids. Vérifiez qu’il correspond à l’emballage ou à la palette de cette réception ; ce choix ne comptabilise pas la réception.",
      "de-DE": "Der Ladeeinheitencode gibt an, welcher Typ in der Gewichtserfassung verwendet wird. Prüfen Sie, ob der ausgewählte Code zur Verpackung oder Palette dieses Wareneingangs passt; die Auswahl bucht den Wareneingang nicht.",
      "es-ES": "El código de unidad de manipulación indica el tipo usado en el registro del peso. Comprueba que el código seleccionado corresponda al embalaje o palé de esta recepción; seleccionarlo no registra la recepción.",
      "da-DK": "Lasteenhedskoden angiver, hvilken type lasteenhed der bruges i vægtregistreringen. Kontrollér, at den valgte kode passer til emballagen eller pallen for denne modtagelse; valget bogfører ikke modtagelsen.",
      "fi-FI": "Käsittely-yksikön koodi ilmaisee painokirjauksessa käytettävän yksikön tyypin. Tarkista, että valittu koodi vastaa tämän vastaanoton pakkausta tai lavaa; valinta ei kirjaa vastaanottoa.",
      "nb-NO": "Håndteringsenhetskoden angir hvilken type håndteringsenhet som brukes i vektregistreringen. Kontroller at den valgte koden passer til emballasjen eller pallen for dette mottaket; valget bokfører ikke mottaket."
    },
    "Observed.Warehouse.SelectDeliveryUnitCode": {
      "sv-SE": "Leveransenhetskod väljer den enhet som används för lastbärarens leveransenheter. Kontrollera att koden och eventuell enhetsomräkning stämmer med mottagningens underlag innan du anger antalet.",
      "en-US": "Delivery Unit Code selects the unit used for the handling unit’s delivery units. Check the code and any unit conversion against the receiving documentation before entering the count.",
      "fr-FR": "Le code d’unité de livraison sélectionne l’unité utilisée pour les unités de livraison de l’unité de manutention. Vérifiez le code et toute conversion par rapport aux documents de réception avant de saisir le nombre.",
      "de-DE": "Der Liefereinheitencode legt die Einheit für die Liefereinheiten der Ladeeinheit fest. Prüfen Sie den Code und eine mögliche Einheitenumrechnung anhand der Empfangsunterlagen, bevor Sie die Anzahl eingeben.",
      "es-ES": "El código de unidad de entrega selecciona la unidad usada para las unidades de entrega de la unidad de manipulación. Comprueba el código y cualquier conversión con la documentación de recepción antes de indicar la cantidad.",
      "da-DK": "Leveringsenhedskoden vælger den enhed, der bruges til lasteenhedens leveringsenheder. Kontrollér koden og eventuel enhedsomregning mod modtagelsesgrundlaget, før du angiver antallet.",
      "fi-FI": "Toimitusyksikön koodi valitsee käsittely-yksikön toimitusyksiköissä käytettävän yksikön. Tarkista koodi ja mahdollinen yksikkömuunnos vastaanottoasiakirjoista ennen määrän syöttämistä.",
      "nb-NO": "Leveringsenhetskoden velger enheten som brukes for håndteringsenhetens leveringsenheter. Kontroller koden og eventuell enhetsomregning mot mottaksdokumentasjonen før du angir antallet."
    },
    "Observed.Warehouse.SetDeliveryUnitCount": {
      "sv-SE": "Antal leveransenheter anger hur många enheter av den valda leveranstypen som registreras på lastbäraren. Kontrollera antalet mot packlistan och beakta att det inte nödvändigtvis är samma sak som artikelns mottagna kvantitet.",
      "en-US": "Number of Delivery Units records how many units of the selected delivery type are assigned to the handling unit. Check the count against the packing list; it is not necessarily the same as the item quantity received.",
      "fr-FR": "Le nombre d’unités de livraison indique combien d’unités du type sélectionné sont affectées à l’unité de manutention. Vérifiez le nombre avec la liste de colisage ; il ne correspond pas nécessairement à la quantité d’articles réceptionnée.",
      "de-DE": "Anzahl Liefereinheiten erfasst, wie viele Einheiten des ausgewählten Liefertyps der Ladeeinheit zugeordnet sind. Prüfen Sie die Anzahl anhand der Packliste; sie entspricht nicht zwangsläufig der empfangenen Artikelmenge.",
      "es-ES": "Número de unidades de entrega indica cuántas unidades del tipo seleccionado se asignan a la unidad de manipulación. Comprueba el recuento con la lista de embalaje; no tiene por qué coincidir con la cantidad de artículos recibida.",
      "da-DK": "Antal leveringsenheder angiver, hvor mange enheder af den valgte leveringstype der registreres på lasteenheden. Kontrollér antallet mod pakkelisten; det er ikke nødvendigvis det samme som den modtagne varemængde.",
      "fi-FI": "Toimitusyksiköiden määrä kertoo, kuinka monta valitun tyypin yksikköä käsittely-yksikölle kirjataan. Tarkista määrä pakkausluettelosta; se ei välttämättä ole sama kuin vastaanotettujen nimikkeiden määrä.",
      "nb-NO": "Antall leveringsenheter angir hvor mange enheter av den valgte leveringstypen som registreres på håndteringsenheten. Kontroller antallet mot pakklisten; det er ikke nødvendigvis det samme som mottatt vareantall."
    },
    "Observed.Warehouse.CreateHandlingUnit": {
      "sv-SE": "Skapar en lastbärare för godset i mottagningen. Kontrollera lastbärartyp och antal innan uppgifterna sparas.",
      "en-US": "Creates a handling unit for the goods being received. Check the handling-unit type and quantity before saving.",
      "fr-FR": "Crée une unité de manutention pour les marchandises réceptionnées. Vérifiez son type et sa quantité avant l’enregistrement.",
      "de-DE": "Erstellt eine Ladeeinheit für die eingehenden Waren. Prüfen Sie vor dem Speichern den Typ und die Anzahl der Ladeeinheiten.",
      "es-ES": "Crea una unidad de manipulación para la mercancía recibida. Comprueba el tipo y la cantidad antes de guardar.",
      "da-DK": "Opretter en lasteenhed til varerne, der modtages. Kontrollér typen og antallet af lasteenheder, før du gemmer.",
      "fi-FI": "Luo käsittely-yksikön vastaanotettaville tavaroille. Tarkista yksikön tyyppi ja määrä ennen tallentamista.",
      "nb-NO": "Oppretter en håndteringsenhet for varene som mottas. Kontroller typen og antallet før du lagrer."
    },
    "Observed.Warehouse.ManualWeight": {
      "sv-SE": "Aktiverar manuell inmatning av fältet Vikt från våg för den valda inleveransraden. Ange vågens avläsning i konfigurerad enhet; vikt och artikelantal är separata uppgifter. Kontrollera artikel, parti eller lastbärare och enhet.",
      "en-US": "Enables manual entry in Weight from Scale for the selected receipt line. Enter the scale reading in the configured unit; weight and item quantity are separate values. Check the item, lot or license plate, and unit.",
      "fr-FR": "Permet la saisie manuelle du champ Poids de la balance pour la ligne de réception sélectionnée. Saisissez la lecture dans l’unité configurée ; poids et quantité d’articles sont distincts. Vérifiez l’article, le lot ou la plaque, et l’unité.",
      "de-DE": "Ermöglicht die manuelle Eingabe im Feld Waagengewicht für die ausgewählte Wareneingangszeile. Geben Sie den Waagenwert in der eingerichteten Einheit ein; Gewicht und Artikelmenge sind getrennte Werte. Prüfen Sie Artikel, Charge oder Lizenzplatte und Einheit.",
      "es-ES": "Permite introducir manualmente el valor de Peso de la báscula para la línea de recepción seleccionada. Introduce la lectura en la unidad configurada; el peso y la cantidad de artículos son valores distintos. Comprueba el artículo, lote o matrícula y unidad.",
      "da-DK": "Gør det muligt at indtaste værdien i Vægt fra vægt manuelt for den valgte modtagelseslinje. Angiv aflæsningen i den konfigurerede enhed; vægt og vareantal er separate værdier. Kontrollér varen, lotnummer eller licensplade og enheden.",
      "fi-FI": "Mahdollistaa Va'an paino -kentän manuaalisen syötön valitulle vastaanottoriville. Anna vaa'an lukema määritetyssä yksikössä; paino ja nimikemäärä ovat erillisiä arvoja. Tarkista nimike, erä tai lisenssikilpi ja yksikkö.",
      "nb-NO": "Gjør det mulig å angi verdien i Vekt fra vekt manuelt for den valgte mottakslinjen. Angi vektens avlesning i konfigurert enhet; vekt og vareantall er separate verdier. Kontroller varen, parti eller lisensplate og enheten."
    },
    "Observed.Warehouse.EnterScaleWeight": {
      "sv-SE": "Fältet tar emot den uppmätta vikten. Ange ett numeriskt värde i rätt enhet och kontrollera det mot vågens avläsning innan du sparar.",
      "en-US": "This field accepts the measured weight. Enter a numeric value in the correct unit and compare it with the scale reading before saving.",
      "fr-FR": "Ce champ reçoit le poids mesuré. Saisissez une valeur numérique dans la bonne unité et comparez-la à la lecture de la balance avant d’enregistrer.",
      "de-DE": "In diesem Feld wird das gemessene Gewicht erfasst. Geben Sie einen Zahlenwert in der richtigen Einheit ein und gleichen Sie ihn vor dem Speichern mit der Waagenanzeige ab.",
      "es-ES": "Este campo recibe el peso medido. Introduce un valor numérico en la unidad correcta y compáralo con la lectura de la báscula antes de guardar.",
      "da-DK": "Feltet modtager den målte vægt. Indtast en numerisk værdi i den rigtige enhed, og sammenlign den med vægtens aflæsning, før du gemmer.",
      "fi-FI": "Tähän kenttään syötetään mitattu paino. Anna numeerinen arvo oikeassa yksikössä ja vertaa sitä vaa'an lukemaan ennen tallentamista.",
      "nb-NO": "Dette feltet tar imot den målte vekten. Angi en tallverdi i riktig enhet, og sammenlign den med vektens avlesning før du lagrer."
    },
    "Observed.Warehouse.SaveWeightRegistration": {
      "sv-SE": "Registrerar vägningen som en viktpost kopplad till lagerinleveransraden, men bokför inte inleveransen. En post med status Väntande (Pending) måste överföras till artikelspårningen innan lagerinleveransen kan bokföras.",
      "en-US": "Saves the weighing as an entry linked to the warehouse receipt line; it does not post the receipt. An entry with Pending status must be transferred to item tracking before the warehouse receipt can be posted.",
      "fr-FR": "Enregistre la pesée comme une entrée liée à la ligne de réception entrepôt, sans comptabiliser la réception. Une entrée au statut En attente (Pending) doit être transférée au suivi des articles avant de pouvoir comptabiliser la réception.",
      "de-DE": "Speichert die Wägung als Eintrag zur Lagerzugangszeile, ohne den Wareneingang zu buchen. Ein Eintrag mit dem Status Ausstehend (Pending) muss vor der Buchung der Lagerzugangszeile in die Artikelverfolgung übertragen werden.",
      "es-ES": "Guarda el pesaje como un registro vinculado a la línea de recepción de almacén, pero no registra la recepción. Un registro con estado Pendiente (Pending) debe transferirse al seguimiento de productos antes de registrar la recepción.",
      "da-DK": "Gemmer vejningen som en post knyttet til lagerindleveringslinjen, men bogfører ikke modtagelsen. En post med statussen Afventer (Pending) skal overføres til varesporing, før lagerindleveringen kan bogføres.",
      "fi-FI": "Tallentaa punnituksen varastovastaanoton riviin liittyväksi merkinnäksi, mutta ei kirjaa vastaanottoa. Odottaa (Pending) -tilassa oleva merkintä on siirrettävä nimikeseurantaan ennen varastovastaanoton kirjaamista.",
      "nb-NO": "Lagrer veiingen som en post knyttet til lagerleveringslinjen, men bokfører ikke mottaket. En post med status Venter (Pending) må overføres til varesporing før lagerleveringen kan bokføres."
    }
  };
  Object.assign(observedWorkflow, {
    "Core.NavigateBack": text.action, "Core.EditRecord": text.action,
    "Core.DeleteRecord": text.action, "Core.Lookup": text.search,
    "Core.ChangeDate": text.date
  });
  // Aptean rules below are grounded in vendor documentation, not in customer
  // recordings. Keep them separate from observedWorkflow so the UI reports the
  // right provenance and the explanation describes the actual add-on action.
  const apteanSpecific = {
    "Aptean.CreatePurchaseContractFromHarvest": [
      "Skapar inköpskontrakt från valda skördeorder- eller planeringsrader. Kontrollera leverantör, säsong, kvantitet och kontraktsdatum; åtgärden skapar kontrakt men bokför inte mottagning.",
      "Creates purchase contracts from selected harvest-order or planning lines. Check vendor, season, quantity, and contract dates; this creates contracts but does not post a receipt.",
      "Crée des contrats d’achat à partir des lignes de récolte ou de planification sélectionnées. Vérifiez fournisseur, saison, quantité et dates ; aucune réception n’est comptabilisée.",
      "Erstellt Einkaufskontrakte aus ausgewählten Ernteauftrags- oder Planungszeilen. Prüfen Sie Lieferant, Saison, Menge und Vertragsdaten; ein Wareneingang wird nicht gebucht.",
      "Crea contratos de compra desde las líneas seleccionadas de cosecha o planificación. Comprueba proveedor, campaña, cantidad y fechas; no registra una recepción.",
      "Opretter købskontrakter fra valgte høstordre- eller planlægningslinjer. Kontrollér leverandør, sæson, antal og datoer; der bogføres ingen modtagelse.",
      "Luo ostosopimuksia valituista sadonkorjuutilauksen tai suunnittelun riveistä. Tarkista toimittaja, kausi, määrä ja päivämäärät; vastaanottoa ei kirjata.",
      "Oppretter innkjøpskontrakter fra valgte høsteordre- eller planleggingslinjer. Kontroller leverandør, sesong, antall og datoer; mottak bokføres ikke."
    ],
    "Aptean.CreateCommodityReceiptFromHarvestOrder": [
      "Skapar varumottagningar för de valda skördeorderraderna av typen handelsvara. Granska vilka handelsvaror och kvantiteter som får egna mottagningar; kontrollera dem innan fortsatt lagerhantering.",
      "Creates commodity receipts for selected harvest-order lines of commodity-item type. Review which commodities and quantities receive separate receipts before continuing warehouse processing.",
      "Crée des réceptions de marchandises pour les lignes sélectionnées de type produit marchand. Vérifiez les produits et quantités concernés avant de poursuivre le traitement en entrepôt.",
      "Erstellt Wareneingänge für ausgewählte Ernteauftragszeilen vom Typ Handelsware. Prüfen Sie betroffene Waren und Mengen vor der weiteren Lagerbearbeitung.",
      "Crea recepciones de mercancías para las líneas seleccionadas de tipo producto básico. Revisa qué productos y cantidades tendrán recepción propia antes de continuar en almacén.",
      "Opretter varemodtagelser for valgte høstordrelinjer af typen handelsvare. Gennemgå varer og antal, der får separate modtagelser, før lagerarbejdet fortsætter.",
      "Luo hyödykevastaannot valituille sadonkorjuutilauksen hyödykeriveille. Tarkista erillisen vastaanoton saavat hyödykkeet ja määrät ennen varastokäsittelyä.",
      "Oppretter varemottak for valgte høsteordrelinjer av typen handelsvare. Kontroller hvilke varer og mengder som får egne mottak før lagerarbeidet fortsetter."
    ],
    "Aptean.CreatePurchaseOrdersFromForecastWorksheet": [
      "Skapar inköpsorder från godkända prognosrader i planeringsjournalen. Kontrollera leverantör, artikel, datum och kvantitet på varje order; skapandet innebär inte att ordern är mottagen eller bokförd.",
      "Creates purchase orders from approved forecast worksheet lines. Check the vendor, item, date, and quantity on each order; creation does not mean the order is received or posted.",
      "Crée des commandes achat à partir des lignes de prévision approuvées. Vérifiez fournisseur, article, date et quantité ; la commande n’est ni réceptionnée ni comptabilisée par sa création.",
      "Erstellt Einkaufsbestellungen aus freigegebenen Prognosezeilen. Prüfen Sie Lieferant, Artikel, Datum und Menge; die Bestellung ist dadurch weder empfangen noch gebucht.",
      "Crea pedidos de compra a partir de líneas de previsión aprobadas. Comprueba proveedor, producto, fecha y cantidad; el pedido aún no está recibido ni registrado.",
      "Opretter købsordrer fra godkendte prognoselinjer. Kontrollér leverandør, vare, dato og antal; ordren er ikke dermed modtaget eller bogført.",
      "Luo ostotilauksia hyväksytyistä ennusteriveistä. Tarkista toimittaja, nimike, päivämäärä ja määrä; tilausta ei ole vastaanotettu tai kirjattu.",
      "Oppretter innkjøpsordrer fra godkjente prognoselinjer. Kontroller leverandør, vare, dato og antall; ordren er ikke mottatt eller bokført."
    ],
    "Aptean.CreateDayForecastFromHarvestOrder": [
      "Skapar en dagsprognos med utgångspunkt i skördeordern. Kontrollera prognosdatum, kvantiteter och källrader; dagsprognosen är planeringsunderlag och skapar inte i sig en inköpsorder.",
      "Creates a day forecast from the harvest order. Check forecast date, quantities, and source lines; the forecast is planning data and does not itself create a purchase order.",
      "Crée une prévision journalière à partir de l’ordre de récolte. Vérifiez date, quantités et lignes source ; cette prévision ne crée pas à elle seule une commande achat.",
      "Erstellt aus dem Ernteauftrag eine Tagesprognose. Prüfen Sie Datum, Mengen und Quellzeilen; die Prognose ist Planung und erstellt keine Einkaufsbestellung.",
      "Crea una previsión diaria desde la orden de cosecha. Comprueba fecha, cantidades y líneas de origen; la previsión no crea por sí sola un pedido de compra.",
      "Opretter en dagsprognose ud fra høstordren. Kontrollér dato, antal og kildelinjer; prognosen er planlægning og opretter ikke i sig selv en købsordre.",
      "Luo päivittäisen ennusteen sadonkorjuutilauksesta. Tarkista päivämäärä, määrät ja lähderivit; ennuste on suunnittelutieto eikä luo ostotilausta.",
      "Oppretter en dagsprognose fra høsteordren. Kontroller dato, mengder og kildelinjer; prognosen er planlegging og oppretter ikke en innkjøpsordre."
    ],
    "Aptean.CreatePurchaseOrderFromWeekForecast": [
      "Skapar en inköpsorder från veckoprognosen. Kontrollera att prognosen är öppen och att leverantör, artikel, leveransdatum och kvantitet stämmer; ordern behöver granskas och hanteras vidare separat.",
      "Creates a purchase order from the week forecast. Check that the forecast is open and that vendor, item, delivery date, and quantity are correct; review and process the order separately.",
      "Crée une commande achat depuis la prévision hebdomadaire. Vérifiez qu’elle est ouverte et contrôlez fournisseur, article, date et quantité ; traitez ensuite la commande séparément.",
      "Erstellt eine Einkaufsbestellung aus der Wochenprognose. Prüfen Sie, ob die Prognose offen ist, sowie Lieferant, Artikel, Lieferdatum und Menge; bearbeiten Sie die Bestellung anschließend separat.",
      "Crea un pedido de compra desde la previsión semanal. Comprueba que siga abierta y verifica proveedor, producto, fecha y cantidad; después procesa el pedido por separado.",
      "Opretter en købsordre fra ugeprognosen. Kontrollér, at prognosen er åben, og at leverandør, vare, leveringsdato og antal passer; behandl derefter ordren separat.",
      "Luo ostotilauksen viikkoennusteesta. Tarkista, että ennuste on avoin, sekä toimittaja, nimike, toimituspäivä ja määrä; käsittele tilausta sen jälkeen erikseen.",
      "Oppretter en innkjøpsordre fra ukeprognosen. Kontroller at prognosen er åpen og at leverandør, vare, leveringsdato og antall stemmer; behandle ordren separat etterpå."
    ],
    "Aptean.CreateHarvestOrder": [
      "Skapar en skördeorder för planerad råvaruanskaffning. Kontrollera leverantör eller odlare, säsong, artikel, planerad kvantitet och datum innan ordern används för prognoser eller kontrakt.",
      "Creates a harvest order for planned raw-material sourcing. Check the supplier or grower, season, item, planned quantity, and dates before using it for forecasts or contracts.",
      "Crée un ordre de récolte pour l’approvisionnement planifié. Vérifiez fournisseur ou producteur, saison, article, quantité prévue et dates avant de l’utiliser pour des prévisions ou contrats.",
      "Erstellt einen Ernteauftrag zur geplanten Rohstoffbeschaffung. Prüfen Sie Lieferant oder Erzeuger, Saison, Artikel, geplante Menge und Termine vor der Nutzung für Prognosen oder Verträge.",
      "Crea una orden de cosecha para el aprovisionamiento previsto. Comprueba proveedor o agricultor, campaña, producto, cantidad y fechas antes de usarla para previsiones o contratos.",
      "Opretter en høstordre til planlagt råvareindkøb. Kontrollér leverandør eller avler, sæson, vare, planlagt antal og datoer, før den bruges til prognoser eller kontrakter.",
      "Luo sadonkorjuutilauksen suunniteltua raaka-ainehankintaa varten. Tarkista toimittaja tai viljelijä, kausi, nimike, suunniteltu määrä ja päivämäärät ennen ennusteiden tai sopimusten luontia.",
      "Oppretter en høsteordre for planlagt råvareinnkjøp. Kontroller leverandør eller dyrker, sesong, vare, planlagt antall og datoer før den brukes til prognoser eller kontrakter."
    ],
    "Aptean.CreateQCCheck": [
      "Skapar en kvalitetskontroll, antingen fristående eller kopplad till vald källa beroende på var åtgärden startas. Kontrollera artikel, parti, kontrollplan och ansvarigt team. Resultat och eventuell frisläppning registreras separat.",
      "Creates a quality check, either standalone or linked to the selected source depending on where the action is started. Check item, lot, inspection plan, and responsible team. Results and any release are recorded separately.",
      "Crée un contrôle qualité, autonome ou lié à la source sélectionnée selon la page d’origine. Vérifiez article, lot, plan de contrôle et équipe responsable. Les résultats et la libération sont enregistrés séparément.",
      "Erstellt eine Qualitätsprüfung, je nach Ausgangsseite eigenständig oder mit der gewählten Quelle verknüpft. Prüfen Sie Artikel, Los, Prüfplan und zuständiges Team. Ergebnisse und Freigabe werden separat erfasst.",
      "Crea un control de calidad, independiente o vinculado al origen seleccionado según la página de inicio. Comprueba producto, lote, plan y equipo responsable. Los resultados y la liberación se registran aparte.",
      "Opretter en kvalitetskontrol, enten selvstændig eller knyttet til den valgte kilde afhængigt af startsiden. Kontrollér vare, parti, kontrolplan og ansvarligt team. Resultater og frigivelse registreres separat.",
      "Luo laaduntarkastuksen joko itsenäisenä tai valittuun lähteeseen liitettynä aloitussivun mukaan. Tarkista nimike, erä, tarkastussuunnitelma ja vastuutiimi. Tulokset ja vapautus kirjataan erikseen.",
      "Oppretter en kvalitetskontroll, enten frittstående eller knyttet til valgt kilde avhengig av startsiden. Kontroller vare, parti, kontrollplan og ansvarlig team. Resultater og frigivelse registreres separat."
    ],
    "Aptean.CreateInventoryQCTrigger": [
      "Skapar en regel för återkommande lagerkontroller. Kontrollera artikel- och partispårning, intervall, urvalsvillkor och kontrollplan; regeln är konfiguration och utför inte kontrollen direkt.",
      "Creates a rule for recurring inventory quality checks. Check item and lot tracking, interval, selection criteria, and inspection plan; this configures the schedule and does not perform a check immediately.",
      "Crée une règle de contrôles qualité récurrents du stock. Vérifiez suivi article/lot, intervalle, critères et plan ; la règle configure la planification sans lancer immédiatement un contrôle.",
      "Erstellt eine Regel für wiederkehrende Lagerprüfungen. Prüfen Sie Artikel- und Losverfolgung, Intervall, Auswahlkriterien und Prüfplan; die Regel startet keine sofortige Prüfung.",
      "Crea una regla para controles de calidad periódicos del inventario. Comprueba seguimiento, intervalo, criterios y plan; la regla configura la programación, no ejecuta un control inmediato.",
      "Opretter en regel for tilbagevendende lagerkontroller. Kontrollér varesporing, parti, interval, udvælgelse og kontrolplan; reglen konfigurerer planen, men udfører ikke straks en kontrol.",
      "Luo säännön toistuvalle varaston laatutarkastukselle. Tarkista nimike- ja eräseuranta, aikaväli, valintaperusteet ja tarkastussuunnitelma; sääntö ei suorita tarkastusta heti.",
      "Oppretter en regel for gjentakende lagerkontroller. Kontroller varesporing, parti, intervall, utvalgskriterier og kontrollplan; regelen setter opp planen, men utfører ikke kontrollen umiddelbart."
    ],
    "Aptean.ScheduleInventoryQC": [
      "Schemalägger återkommande kvalitetskontroller via jobbkö enligt konfigurerade regler. Kontrollera jobbköpostens status och körningstid; den här åtgärden betyder inte att kontrollerna redan är skapade eller utförda.",
      "Schedules recurring quality checks through the job queue using configured rules. Check the queue entry and run time; this action does not mean the checks have already been created or performed.",
      "Planifie les contrôles récurrents via la file de travaux selon les règles configurées. Vérifiez l’entrée et l’heure d’exécution ; les contrôles ne sont pas nécessairement créés ou réalisés maintenant.",
      "Plant wiederkehrende Qualitätsprüfungen über die Aufgabenwarteschlange gemäß den Regeln. Prüfen Sie Warteschlangeneintrag und Laufzeit; die Prüfungen sind damit noch nicht erstellt oder ausgeführt.",
      "Programa controles periódicos mediante la cola de trabajos según las reglas configuradas. Comprueba la entrada y hora de ejecución; los controles no necesariamente se han creado ni realizado aún.",
      "Planlægger tilbagevendende kvalitetskontroller via jobkøen efter opsatte regler. Kontrollér køpost og køretid; kontrollerne er ikke nødvendigvis oprettet eller udført endnu.",
      "Aikatauluttaa toistuvat laatutarkastukset työjonon kautta sääntöjen perusteella. Tarkista työjonon merkintä ja ajoaika; tarkastuksia ei välttämättä ole vielä luotu tai suoritettu.",
      "Planlegger gjentakende kvalitetskontroller via jobbkøen etter oppsatte regler. Kontroller køoppføringen og kjøretid; kontrollene er ikke nødvendigvis opprettet eller utført ennå."
    ],
    "Aptean.CreatePurchaseClaim": [
      "Skapar ett utkast till inköpsreklamation från inköpsflödet. Kontrollera mottagen och återstående kvantitet, reklamationsorsak samt om hanteringen ska vara kredit eller retur. Utkastet är inte frisläppt eller bokfört.",
      "Creates a draft purchase claim from the purchasing workflow. Check received and remaining quantities, claim reason, and whether the resolution is credit or return. The draft is not released or posted.",
      "Crée un brouillon de réclamation achat. Vérifiez quantités reçues et restantes, motif et traitement par avoir ou retour. Le brouillon n’est ni libéré ni comptabilisé.",
      "Erstellt einen Entwurf einer Einkaufsreklamation. Prüfen Sie empfangene und verbleibende Mengen, Reklamationsgrund und Gutschrift oder Rückgabe. Der Entwurf ist nicht freigegeben oder gebucht.",
      "Crea un borrador de reclamación de compra. Comprueba cantidades recibidas y pendientes, motivo y si se resolverá con abono o devolución. El borrador no está liberado ni registrado.",
      "Opretter et udkast til købsreklamation. Kontrollér modtaget og resterende antal, årsag og om løsningen er kredit eller retur. Udkastet er ikke frigivet eller bogført.",
      "Luo ostohyvitysvaatimuksen luonnoksen. Tarkista vastaanotetut ja jäljellä olevat määrät, syy sekä hyvitys- tai palautuskäsittely. Luonnosta ei ole vapautettu tai kirjattu.",
      "Oppretter et utkast til innkjøpsreklamasjon. Kontroller mottatt og gjenstående antall, årsak og om løsningen er kredit eller retur. Utkastet er ikke frigitt eller bokført."
    ],
    "Aptean.ReleaseAndCreatePurchaseClaim": [
      "Frisläpper reklamationen och skapar tillhörande inköpsdokument enligt reklamationstypen. Kontrollera artikel, återstående returkvantitet, leverantör och skapade dokument. Granska dokumentstatus innan du bedömer flödet som klart.",
      "Releases the claim and creates related purchase documents according to the claim type. Check item, remaining return quantity, vendor, and generated documents. Review document status before treating the workflow as complete.",
      "Libère la réclamation et crée les documents achat associés selon son type. Vérifiez article, quantité retournable restante, fournisseur et documents créés, puis contrôlez leur statut.",
      "Gibt die Reklamation frei und erstellt je nach Reklamationstyp zugehörige Einkaufsbelege. Prüfen Sie Artikel, verbleibende Rückgabemenge, Lieferant und Belege sowie deren Status.",
      "Libera la reclamación y crea los documentos de compra relacionados según su tipo. Comprueba producto, cantidad pendiente de devolución, proveedor y documentos; revisa su estado.",
      "Frigiver reklamationen og opretter tilhørende købsdokumenter efter reklamationstypen. Kontrollér vare, resterende returmængde, leverandør og oprettede dokumenter samt status.",
      "Vapauttaa vaatimuksen ja luo siihen liittyvät ostotositteet vaatimustyypin mukaan. Tarkista nimike, palautettavissa oleva määrä, toimittaja ja luodut tositteet sekä niiden tila.",
      "Frigir reklamasjonen og oppretter tilknyttede kjøpsdokumenter etter kravtypen. Kontroller vare, gjenstående returantall, leverandør og opprettede dokumenter samt status."
    ],
    "Aptean.ReleaseCreateAndPostPurchaseClaim": [
      "Frisläpper och försöker skapa samt bokföra reklamationen och relaterade inköpsdokument. Lagerkrav kan hindra att alla dokument bokförs; kontrollera varje dokument och bokföringsstatus efter bekräftelsen innan processen markeras som färdig.",
      "Releases the claim and attempts to create and post the claim and related purchase documents. Warehouse requirements can prevent all documents from posting; check each document and posting status after confirmation before marking the process complete.",
      "Libère la réclamation et tente de créer et comptabiliser les documents associés. Les exigences d’entrepôt peuvent empêcher certaines comptabilisations ; vérifiez chaque document et son statut après confirmation.",
      "Gibt die Reklamation frei und versucht, sie sowie zugehörige Einkaufsbelege zu erstellen und zu buchen. Lageranforderungen können Buchungen verhindern; prüfen Sie nach der Bestätigung jeden Belegstatus.",
      "Libera la reclamación e intenta crear y registrar los documentos relacionados. Los requisitos de almacén pueden impedir algunos registros; comprueba cada documento y estado tras confirmar.",
      "Frigiver reklamationen og forsøger at oprette og bogføre den samt relaterede købsdokumenter. Lagerkrav kan forhindre bogføring; kontrollér hvert dokument og status efter bekræftelsen.",
      "Vapauttaa vaatimuksen ja yrittää luoda sekä kirjata siihen liittyvät ostotositteet. Varastovaatimukset voivat estää kirjauksen; tarkista jokainen tosite ja tila vahvistuksen jälkeen.",
      "Frigir reklamasjonen og forsøker å opprette og bokføre den og relaterte kjøpsdokumenter. Lagerkrav kan hindre bokføring; kontroller hvert dokument og status etter bekreftelsen."
    ],
    "Aptean.RegisterConsumption": [
      "Öppnar registrering av insatsförbrukning för produktionsordern och dess komponenter. Kontrollera komponent, förbrukad mängd, lagerställe och parti/spårning. Att öppna registreringen betyder inte att förbrukningen är sparad eller bokförd.",
      "Opens input-consumption registration for the production order and its components. Check component, consumed quantity, location, and lot tracking. Opening the entry does not mean consumption has been saved or posted.",
      "Ouvre la saisie de consommation des composants de l’ordre de fabrication. Vérifiez composant, quantité, emplacement et lot ; l’ouverture ne signifie pas que la consommation est enregistrée ou comptabilisée.",
      "Öffnet die Erfassung des Komponentenverbrauchs für den Fertigungsauftrag. Prüfen Sie Komponente, Menge, Lagerort und Losverfolgung. Das Öffnen speichert oder bucht den Verbrauch nicht.",
      "Abre el registro del consumo de componentes de la orden de producción. Comprueba componente, cantidad, ubicación y lote; abrirlo no guarda ni registra el consumo.",
      "Åbner registrering af komponentforbrug for produktionsordren. Kontrollér komponent, forbrugt antal, placering og parti; åbning gemmer eller bogfører ikke forbruget.",
      "Avaa tuotantotilauksen komponenttien kulutuskirjauksen. Tarkista komponentti, määrä, varastopaikka ja eräseuranta; avaaminen ei tallenna tai kirjaa kulutusta.",
      "Åpner registrering av komponentforbruk for produksjonsordren. Kontroller komponent, forbrukt antall, lagersted og parti; åpningen lagrer eller bokfører ikke forbruket."
    ],
    "Aptean.RegisterOutput": [
      "Öppnar registrering av produktionsutfall för vald artikel och operation. Kontrollera producerad kvantitet, parti och lastbärare. Bokföring av lager och kapacitet beror på operationens position; verifiera utfallet i ordern innan nästa steg.",
      "Opens production-output registration for the selected item and operation. Check output quantity, lot, and handling unit. Inventory and capacity posting depends on the operation; verify the order result before proceeding.",
      "Ouvre la saisie de sortie de production pour l’article et l’opération choisis. Vérifiez quantité, lot et unité de manutention. La comptabilisation dépend de l’opération ; vérifiez le résultat dans l’ordre.",
      "Öffnet die Erfassung des Fertigungsausstoßes für Artikel und Arbeitsgang. Prüfen Sie Menge, Los und Ladeeinheit. Die Buchung hängt vom Arbeitsgang ab; kontrollieren Sie das Auftragsergebnis.",
      "Abre el registro de producción para el producto y operación seleccionados. Comprueba cantidad, lote y unidad de manipulación. El registro depende de la operación; verifica el resultado en la orden.",
      "Åbner registrering af produktionsoutput for valgt vare og operation. Kontrollér antal, parti og lasteenhed. Bogføring afhænger af operationen; kontrollér resultatet på ordren.",
      "Avaa tuotannon valmistumiskirjauksen valitulle nimikkeelle ja työvaiheelle. Tarkista määrä, erä ja käsittely-yksikkö. Kirjaus riippuu työvaiheesta; varmista tulos tilaukselta.",
      "Åpner registrering av produksjonsresultat for valgt vare og operasjon. Kontroller mengde, parti og håndteringsenhet. Bokføring avhenger av operasjonen; kontroller resultatet på ordren."
    ],
    "Aptean.SetPurchaseClaimActionType": [
      "Anger hur inköpsreklamationen ska lösas, exempelvis kredit eller retur. Valet styr vilka dokument och kvantiteter som skapas senare. Kontrollera åtgärdstypen mot leverantörens överenskommelse innan frisläppning.",
      "Sets how the purchase claim will be resolved, such as credit or return. This choice determines later documents and quantities. Check it against the vendor agreement before release.",
      "Définit le traitement de la réclamation, par exemple avoir ou retour. Ce choix détermine les documents et quantités ultérieurs. Vérifiez l’accord fournisseur avant libération.",
      "Legt die Lösung der Einkaufsreklamation fest, etwa Gutschrift oder Rückgabe. Davon hängen spätere Belege und Mengen ab. Prüfen Sie die Vereinbarung vor der Freigabe.",
      "Define cómo se resolverá la reclamación, por ejemplo abono o devolución. Esto determina documentos y cantidades posteriores. Comprueba el acuerdo con el proveedor antes de liberarla.",
      "Angiver, hvordan købsreklamationen løses, f.eks. kredit eller retur. Valget bestemmer senere dokumenter og antal. Kontrollér aftalen med leverandøren før frigivelse.",
      "Määrittää ostovaatimuksen ratkaisun, kuten hyvityksen tai palautuksen. Valinta ohjaa myöhempiä tositteita ja määriä. Tarkista toimittajasopimus ennen vapautusta.",
      "Angir hvordan innkjøpsreklamasjonen løses, for eksempel kredit eller retur. Valget styrer senere dokumenter og antall. Kontroller leverandøravtalen før frigivelse."
    ],
    "Aptean.PostQualityAction": [
      "Bokför den valda kvalitetsåtgärden och verkställer dess lager- eller kvalitetsverkan. Kontrollera åtgärd, artikel, parti, kvantitet och eventuell spärrstatus; verifiera därefter bokförda poster och partiets status.",
      "Posts the selected quality action and applies its inventory or quality effect. Check action, item, lot, quantity, and any hold status; then verify the posted entries and lot status.",
      "Comptabilise l’action qualité sélectionnée et applique son effet sur le stock ou la qualité. Vérifiez action, article, lot, quantité et blocage, puis contrôlez les écritures et le statut du lot.",
      "Bucht die ausgewählte Qualitätsmaßnahme und wendet deren Lager- oder Qualitätswirkung an. Prüfen Sie Maßnahme, Artikel, Los, Menge und Sperre; kontrollieren Sie anschließend Buchungen und Losstatus.",
      "Registra la acción de calidad seleccionada y aplica su efecto en inventario o calidad. Comprueba acción, producto, lote, cantidad y bloqueo; después verifica movimientos y estado del lote.",
      "Bogfører den valgte kvalitetsaktion og udfører dens lager- eller kvalitetseffekt. Kontrollér handling, vare, parti, antal og spærring; verificér derefter poster og partistatus.",
      "Kirjaa valitun laatutoimen ja toteuttaa sen varasto- tai laatuseurauksen. Tarkista toimi, nimike, erä, määrä ja mahdollinen esto; varmista kirjaukset ja erän tila.",
      "Bokfører valgt kvalitetsaktivitet og gjennomfører lager- eller kvalitetseffekten. Kontroller aktivitet, vare, parti, antall og eventuell sperre; verifiser posteringer og partistatus."
    ],
    "Aptean.AnswerQualityCheckLine": [
      "Registrerar svar eller mätvärde på kontrollraden. Resultatet jämförs med radens gränsvärden och kan sätta kontrollen till godkänd, varning eller underkänd. Kontrollera enhet, mätvärde och beräknade resultat innan kontrollen slutförs.",
      "Records an answer or measurement on the check line. The value is evaluated against configured limits and may set the check to pass, warning, or fail. Verify units, value, and calculated result before completing the check.",
      "Enregistre une réponse ou mesure sur la ligne de contrôle. La valeur est comparée aux limites et peut produire conforme, avertissement ou échec. Vérifiez unité, mesure et résultat calculé avant clôture.",
      "Erfasst eine Antwort oder Messung auf der Prüfzeile. Der Wert wird mit Grenzwerten verglichen und kann bestanden, Warnung oder nicht bestanden ergeben. Prüfen Sie Einheit, Wert und Ergebnis.",
      "Registra una respuesta o medición en la línea de control. Se compara con los límites y puede resultar aprobado, advertencia o rechazado. Comprueba unidad, valor y resultado calculado.",
      "Registrerer svar eller måling på kontrollinjen. Værdien sammenholdes med grænser og kan give bestået, advarsel eller ikke bestået. Kontrollér enhed, værdi og beregnet resultat.",
      "Tallentaa vastauksen tai mittauksen tarkastusriville. Arvoa verrataan rajoihin, ja tulos voi olla hyväksytty, varoitus tai hylätty. Tarkista yksikkö, arvo ja laskettu tulos.",
      "Registrerer svar eller måling på kontrollinjen. Verdien vurderes mot grensene og kan gi bestått, advarsel eller ikke bestått. Kontroller enhet, verdi og beregnet resultat."
    ],
    "Aptean.CreateNonConformanceFromQC": [
      "Skapar ett avvik från kvalitetskontrollen för vald kund, leverantör eller intern process. Kontrollera avvikstyp, artikel/parti, felbeskrivning och ansvarig part; skapa inte avviket som ersättning för att registrera kontrollresultatet.",
      "Creates a non-conformance from the quality check for a customer, vendor, or internal process. Check type, item/lot, defect details, and responsible party; this does not replace recording the check result.",
      "Crée une non-conformité depuis le contrôle pour un client, fournisseur ou processus interne. Vérifiez type, article/lot, défaut et partie responsable ; cela ne remplace pas la saisie du résultat.",
      "Erstellt aus der Qualitätsprüfung eine Abweichung für Kunde, Lieferant oder internen Prozess. Prüfen Sie Typ, Artikel/Los, Fehlerbeschreibung und Verantwortlichen; das Prüfergebnis bleibt separat.",
      "Crea una no conformidad desde el control para cliente, proveedor o proceso interno. Comprueba tipo, producto/lote, defecto y responsable; no sustituye el registro del resultado.",
      "Opretter en afvigelse fra kvalitetskontrollen for kunde, leverandør eller intern proces. Kontrollér type, vare/parti, fejl og ansvarlig part; resultatet registreres separat.",
      "Luo laatutarkastuksesta poikkeaman asiakkaalle, toimittajalle tai sisäiseen prosessiin. Tarkista tyyppi, nimike/erä, virhe ja vastuutaho; tulos kirjataan erikseen.",
      "Oppretter et avvik fra kvalitetskontrollen for kunde, leverandør eller intern prosess. Kontroller type, vare/parti, feil og ansvarlig part; kontrollresultatet registreres separat."
    ],
    "Aptean.CreateCustomerNonConformance": [
      "Skapar ett kundrelaterat avvik för vidare utredning och åtgärd. Dokumentera berörd artikel/leverans, parti, avvikelse och kund; en ny avvikspost innebär inte att reklamationen är löst eller godkänd.",
      "Creates a customer-related non-conformance for investigation and corrective action. Record the affected item/shipment, lot, issue, and customer; creating it does not resolve or approve the claim.",
      "Crée une non-conformité client à investiguer et corriger. Indiquez article/livraison, lot, problème et client ; sa création ne résout ni n’approuve la réclamation.",
      "Erstellt eine kundenbezogene Abweichung zur Untersuchung und Korrektur. Erfassen Sie Artikel/Lieferung, Los, Fehler und Kunden; dadurch ist der Fall nicht gelöst oder genehmigt.",
      "Crea una no conformidad de cliente para investigar y corregir. Registra producto/entrega, lote, problema y cliente; crearla no resuelve ni aprueba la reclamación.",
      "Opretter en kundeafvigelse til undersøgelse og korrigerende handling. Registrér vare/levering, parti, problem og kunde; posten løser eller godkender ikke sagen.",
      "Luo asiakaspoikkeaman tutkittavaksi ja korjattavaksi. Kirjaa nimike/toimitus, erä, ongelma ja asiakas; luonti ei ratkaise tai hyväksy vaatimusta.",
      "Oppretter et kundeavvik for undersøkelse og korrigering. Registrer vare/leveranse, parti, problem og kunde; opprettelsen løser eller godkjenner ikke saken."
    ],
    "Aptean.CreateClaim": [
      "Skapar inköpsreklamationen från vald mottagning eller inköpskälla. Kontrollera kopplingen till ursprungsdokumentet och att reklamationskvantiteten inte överstiger mottaget och ännu ej returnerat antal.",
      "Creates the purchase claim from the selected receipt or purchasing source. Verify the source-document link and that the claimed quantity does not exceed the received, not-yet-returned quantity.",
      "Crée la réclamation achat depuis la réception ou source sélectionnée. Vérifiez le lien au document d’origine et que la quantité réclamée ne dépasse pas la quantité reçue non retournée.",
      "Erstellt die Einkaufsreklamation aus dem gewählten Wareneingang oder Einkaufsbeleg. Prüfen Sie den Ursprungsbeleg und dass die reklamierte Menge die empfangene, nicht zurückgegebene Menge nicht übersteigt.",
      "Crea la reclamación desde la recepción o documento de compra seleccionado. Comprueba el vínculo de origen y que la cantidad no supere lo recibido y aún no devuelto.",
      "Opretter købsreklamationen fra valgt modtagelse eller købskilde. Kontrollér kildedokumentet, og at antal ikke overstiger modtaget og endnu ikke returneret antal.",
      "Luo ostovaatimuksen valitusta vastaanotosta tai ostolähteestä. Tarkista lähdeasiakirjalinkki ja ettei vaadittu määrä ylitä vastaanotettua, palauttamatonta määrää.",
      "Oppretter innkjøpsreklamasjonen fra valgt mottak eller kjøpskilde. Kontroller kildedokumentet og at antallet ikke overstiger mottatt, ikke-returnert mengde."
    ],
    "Aptean.ChangeLotInspectionStatus": [
      "Ändrar inspektionsstatus direkt på valda partier och kan skapa statusrelaterade aviseringar eller loggposter. Kontrollera parti och målstatus före åtgärden samt den nya statusen efteråt.",
      "Changes inspection status directly on selected lots and may create status alerts or log entries. Check the lots and target status before acting, then verify the resulting status.",
      "Modifie directement le statut d’inspection des lots sélectionnés et peut créer alertes ou journaux. Vérifiez lots et statut cible avant l’action, puis le nouveau statut.",
      "Ändert den Prüfstatus ausgewählter Lose direkt und kann Meldungen oder Protokolleinträge erzeugen. Prüfen Sie Lose und Zielstatus vorher und den neuen Status danach.",
      "Cambia directamente el estado de inspección de los lotes seleccionados y puede generar alertas o registros. Comprueba los lotes y el estado objetivo antes y después.",
      "Ændrer inspektionsstatus direkte på valgte partier og kan oprette beskeder eller logposter. Kontrollér partier og målstatus før og den nye status efter handlingen.",
      "Muuttaa valittujen erien tarkastustilaa suoraan ja voi luoda ilmoituksia tai lokimerkintöjä. Tarkista erät ja tavoitetila ennen toimintoa ja uusi tila sen jälkeen.",
      "Endrer inspeksjonsstatus direkte på valgte partier og kan opprette varsler eller loggposter. Kontroller partier og målstatus før handlingen og ny status etterpå."
    ],
    "Aptean.GenerateInspectionStatusWorksheetLines": [
      "Fyller arbetsbladet med föreslagna statusändringar för partier. Granska varje rad, nuvarande status, målstatus och urval innan du använder arbetsbladets ändringsåtgärd; raderna ändrar inte partierna ännu.",
      "Populates the worksheet with proposed lot-status changes. Review each line, current and target status, and selection before applying the worksheet action; the generated lines have not changed the lots yet.",
      "Remplit la feuille avec des changements de statut proposés. Vérifiez chaque ligne, statut actuel et cible avant application ; la génération ne modifie pas encore les lots.",
      "Füllt das Arbeitsblatt mit vorgeschlagenen Losstatusänderungen. Prüfen Sie Zeilen sowie aktuelle und neue Status vor der Anwendung; die Lose sind noch nicht geändert.",
      "Rellena la hoja con cambios propuestos de estado de lote. Revisa cada línea y los estados actual y objetivo antes de aplicarlos; aún no modifica los lotes.",
      "Udfylder kladden med foreslåede partistatusændringer. Gennemgå linjer og nuværende/målstatus før anvendelse; partierne er endnu ikke ændret.",
      "Täyttää laskentataulukon ehdotetuilla erätilan muutoksilla. Tarkista rivit sekä nykyinen ja tavoitetila ennen soveltamista; eriä ei ole vielä muutettu.",
      "Fyller arbeidsarket med foreslåtte partistatusendringer. Gjennomgå linjer og nåværende/målstatus før bruk; partiene er ikke endret ennå."
    ],
    "Aptean.ApplyInspectionStatusFromWorksheet": [
      "Verkställer statusändringen för de markerade arbetsbladsraderna. Bekräfta att rätt partier och målstatus är valda; kontrollera därefter partiernas status och eventuella aviseringar.",
      "Applies the status change for selected worksheet lines. Confirm the intended lots and target status, then verify lot statuses and any alerts.",
      "Applique le changement aux lignes sélectionnées. Confirmez les lots et le statut cible, puis vérifiez les statuts et alertes éventuelles.",
      "Wendet die Statusänderung auf ausgewählte Arbeitsblattzeilen an. Bestätigen Sie Lose und Zielstatus und prüfen Sie danach Status und Meldungen.",
      "Aplica el cambio a las líneas seleccionadas. Confirma los lotes y estado objetivo; después verifica estados y alertas.",
      "Anvender statusændringen på valgte kladdelinjer. Bekræft partier og målstatus, og kontrollér derefter status og beskeder.",
      "Soveltaa tilamuutoksen valituille laskentataulukon riveille. Vahvista erät ja tavoitetila ja tarkista sitten tilat ja ilmoitukset.",
      "Bruker statusendringen på valgte arbeidsarklinjer. Bekreft partier og målstatus, og kontroller deretter status og varsler."
    ],
    "Aptean.CorrectConsumption": [
      "Öppnar korrigering av en tidigare registrerad komponentförbrukning. Välj rätt registreringsrad och justera över- eller underförbrukningen med stöd av underlaget; kontrollera korrigerad kvantitet och produktionsorder efter sparandet.",
      "Opens correction of a previously registered component consumption. Select the correct entry and adjust over- or under-consumption using supporting evidence; verify the corrected quantity and production order after saving.",
      "Ouvre la correction d’une consommation de composant déjà enregistrée. Sélectionnez la bonne ligne et corrigez le surplus ou déficit selon justificatif ; vérifiez la quantité et l’ordre après sauvegarde.",
      "Öffnet die Korrektur eines zuvor erfassten Komponentenverbrauchs. Wählen Sie den richtigen Eintrag und korrigieren Sie Mehr- oder Minderverbrauch mit Beleg; prüfen Sie Menge und Fertigungsauftrag.",
      "Abre la corrección de un consumo registrado. Selecciona la línea correcta y ajusta exceso o defecto con respaldo; verifica cantidad corregida y orden tras guardar.",
      "Åbner rettelse af tidligere registreret komponentforbrug. Vælg den rigtige post, og korrigér over- eller underforbrug med dokumentation; kontrollér antal og produktionsordre efter lagring.",
      "Avaa aiemmin kirjatun komponenttikulutuksen korjauksen. Valitse oikea kirjausrivi ja korjaa yli- tai alikulutus tositteen perusteella; tarkista määrä ja tuotantotilaus tallennuksen jälkeen.",
      "Åpner korrigering av tidligere registrert komponentforbruk. Velg riktig registrering og juster over- eller underforbruk med grunnlag; kontroller mengde og produksjonsordre etter lagring."
    ],
    "Aptean.PostGrowerSettlement": [
      "Bokför odlaravräkningen och skapar/bokför den kopplade inköpsfakturan enligt avräkningen. Kontrollera odlare, kvantiteter, belopp och dimensioner; efter bokföring blir avräkningen fakturerad och kan inte längre redigeras.",
      "Posts the grower settlement and creates/posts its related purchase invoice. Check grower, quantities, amounts, and dimensions; once posted, the settlement is invoiced and can no longer be edited.",
      "Comptabilise le décompte du producteur et sa facture achat associée. Vérifiez producteur, quantités, montants et dimensions ; après comptabilisation, le décompte est facturé et verrouillé.",
      "Bucht die Erzeugerabrechnung und die zugehörige Einkaufsrechnung. Prüfen Sie Erzeuger, Mengen, Beträge und Dimensionen; danach ist die Abrechnung fakturiert und nicht mehr bearbeitbar.",
      "Registra la liquidación del agricultor y la factura de compra asociada. Comprueba agricultor, cantidades, importes y dimensiones; tras registrarse queda facturada y bloqueada.",
      "Bogfører avregningen og den tilknyttede købsfaktura. Kontrollér avler, antal, beløb og dimensioner; efter bogføring er afregningen faktureret og låst for redigering.",
      "Kirjaa viljelijätilityksen ja siihen liittyvän ostolaskun. Tarkista viljelijä, määrät, summat ja dimensiot; kirjauksen jälkeen tilitys on laskutettu eikä muokattavissa.",
      "Bokfører oppgjøret og tilhørende kjøpsfaktura. Kontroller dyrker, mengder, beløp og dimensjoner; etter bokføring er oppgjøret fakturert og låst for redigering."
    ],
    "Aptean.ProcessEDIMessage": [
      "Bearbetar det valda EDI-meddelandet. Inkommande meddelanden kan skapa eller uppdatera ett BC-dokument; utgående meddelanden skickas till handelspartnern. Kontrollera riktning, dokumentkoppling och slutstatus (bearbetat eller fel) innan omförsök.",
      "Processes the selected EDI message. Inbound messages may create or update a BC document; outbound messages are sent to the trading partner. Check direction, document link, and final status before retrying.",
      "Traite le message EDI sélectionné. Un message entrant peut créer ou mettre à jour un document BC ; un message sortant est transmis au partenaire. Vérifiez sens, document lié et statut avant nouvelle tentative.",
      "Verarbeitet die ausgewählte EDI-Nachricht. Eingehende Nachrichten können einen BC-Beleg erstellen oder aktualisieren; ausgehende werden an den Partner gesendet. Prüfen Sie Richtung, Belegbezug und Status.",
      "Procesa el mensaje EDI seleccionado. Los entrantes pueden crear o actualizar documentos BC; los salientes se envían al socio. Comprueba dirección, documento relacionado y estado antes de reintentar.",
      "Behandler den valgte EDI-meddelelse. Indgående kan oprette eller opdatere et BC-dokument; udgående sendes til handelspartneren. Kontrollér retning, dokumentkobling og status før nyt forsøg.",
      "Käsittelee valitun EDI-sanoman. Saapuva sanoma voi luoda tai päivittää BC-asiakirjan; lähtevä lähetetään kumppanille. Tarkista suunta, asiakirjalinkki ja tila ennen uudelleenyritystä.",
      "Behandler den valgte EDI-meldingen. Innkommende kan opprette eller oppdatere et BC-dokument; utgående sendes til handelspartneren. Kontroller retning, dokumentkobling og status før nytt forsøk."
    ],
    "Aptean.ProcessAIPEvents": [
      "Kör Aptean Integration Platforms valda händelsebearbetning för inkommande och/eller utgående data. Kontrollera anslutningsriktning och urval; följ sedan händelseloggen för mottagna, skickade och misslyckade meddelanden innan du kör om.",
      "Runs the selected Aptean Integration Platform event processing for inbound and/or outbound data. Check connection direction and selection, then review event logs for received, sent, and failed messages before rerunning.",
      "Lance le traitement AIP des données entrantes et/ou sortantes. Vérifiez direction et sélection, puis consultez le journal des événements pour les messages reçus, envoyés ou en échec avant relance.",
      "Führt die ausgewählte AIP-Verarbeitung für eingehende und/oder ausgehende Daten aus. Prüfen Sie Richtung und Auswahl und kontrollieren Sie danach das Ereignisprotokoll.",
      "Ejecuta el procesamiento AIP seleccionado para datos entrantes o salientes. Comprueba dirección y selección; revisa el registro de eventos y errores antes de repetir.",
      "Kører valgt AIP-behandling af indgående og/eller udgående data. Kontrollér retning og udvalg, og gennemgå hændelsesloggen for modtagne, sendte og fejlede meddelelser.",
      "Suorittaa valitun AIP-tapahtumakäsittelyn saapuvalle ja/tai lähtevälle datalle. Tarkista suunta ja valinta sekä tapahtumaloki ennen uudelleenajoa.",
      "Kjører valgt AIP-hendelsesbehandling for innkommende og/eller utgående data. Kontroller retning og utvalg, og gjennomgå hendelsesloggen før ny kjøring."
    ],
    "Aptean.SendOrderToTLx": [
      "Skickar orderuppgifter till Total Logistix (TLx) när ordern frisläpps. Kontrollera mottagare, orderreferens och relevanta transportuppgifter samt integrationsstatus; verifiera att TLx tagit emot ordern innan den betraktas som överförd.",
      "Sends order data to Total Logistix (TLx) on release. Check recipient, order reference, and transport details plus integration status; confirm TLx received it before treating the transfer as complete.",
      "Envoie les données de commande à Total Logistix (TLx) lors de la libération. Vérifiez destinataire, référence et données transport, puis confirmez la réception par TLx.",
      "Sendet Auftragsdaten bei Freigabe an Total Logistix (TLx). Prüfen Sie Empfänger, Referenz und Transportdaten sowie den Integrationsstatus; bestätigen Sie den Empfang durch TLx.",
      "Envía los datos del pedido a Total Logistix (TLx) al liberarlo. Comprueba destinatario, referencia y datos de transporte; confirma que TLx lo recibió.",
      "Sender ordredata til Total Logistix (TLx) ved frigivelse. Kontrollér modtager, reference og transportoplysninger samt integrationsstatus; bekræft modtagelsen hos TLx.",
      "Lähettää tilaustiedot Total Logistixiin (TLx) vapautettaessa. Tarkista vastaanottaja, viite ja kuljetustiedot sekä integraation tila; varmista vastaanotto TLx:ssä.",
      "Sender ordredata til Total Logistix (TLx) ved frigivelse. Kontroller mottaker, referanse og transportdata samt integrasjonsstatus; bekreft at TLx mottok ordren."
    ],
    "Aptean.CreateTradeStatement": [
      "Skapar ett handelsutdrag från vald position och period i Trade Management. Kontrollera råvara, marknadsreferens, kvantiteter och datum; granska sammanställningen mot underlaget innan den används i avräkning eller rapportering.",
      "Creates a trade statement from the selected position and period in Trade Management. Check commodity, market reference, quantities, and dates; reconcile it to the source before settlement or reporting.",
      "Crée un relevé de transaction pour la position et période choisies. Vérifiez produit, référence marché, quantités et dates ; rapprochez-le de la source avant règlement ou rapport.",
      "Erstellt eine Handelsabrechnung für Position und Zeitraum. Prüfen Sie Ware, Marktbezug, Mengen und Termine und gleichen Sie die Übersicht vor Abrechnung oder Bericht ab.",
      "Crea un extracto comercial para la posición y período seleccionados. Comprueba producto, referencia de mercado, cantidades y fechas antes de liquidar o informar.",
      "Opretter en handelsopgørelse for valgt position og periode. Kontrollér vare, markedsreference, antal og datoer, og afstem den før afregning eller rapportering.",
      "Luo kaupankäyntitiliotteen valitusta positiosta ja kaudesta. Tarkista hyödyke, markkinaviite, määrät ja päivämäärät ennen tilitystä tai raportointia.",
      "Oppretter en handelsoppgave for valgt posisjon og periode. Kontroller vare, markedsreferanse, mengder og datoer før oppgjør eller rapportering."
    ],
    "Aptean.PackSalesOrder": [
      "Pack All bygger packningsrader eller kollin utifrån orderns försäljningsrader enligt förpackningsinställningarna. Kontrollera artiklar, kvantiteter och kolli/pallfördelning; packning är inte samma sak som att bokföra eller skicka leveransen.",
      "Pack All builds packing lines or packages from the sales order according to packaging setup. Check items, quantities, and package/pallet allocation; packing is not the same as posting or shipping.",
      "Pack All prépare les lignes ou colis selon la configuration d’emballage. Vérifiez articles, quantités et répartition ; emballer ne comptabilise ni n’expédie la livraison.",
      "Pack All erstellt Packzeilen oder Packstücke gemäß Verpackungseinrichtung. Prüfen Sie Artikel, Mengen und Packstück-/Palettenzuordnung; dies bucht oder versendet nicht.",
      "Pack All genera líneas o bultos según la configuración. Comprueba productos, cantidades y distribución; empaquetar no registra ni envía el envío.",
      "Pack All opretter pakkelinjer eller kolli efter opsætningen. Kontrollér varer, antal og pakke-/pallefordeling; pakning bogfører eller afsender ikke leveringen.",
      "Pack All muodostaa pakkausrivit tai pakkaukset asetusten mukaan. Tarkista nimikkeet, määrät ja pakkaus-/lavajako; pakkaaminen ei kirjaa tai lähetä toimitusta.",
      "Pack All oppretter pakkelinjer eller kolli etter oppsettet. Kontroller varer, antall og kolli-/pallefordeling; pakking bokfører eller sender ikke leveransen."
    ],
    "Aptean.PostPackAndShip": [
      "Bokför den valda packnings-/leveransbatchen och uppdaterar leveransstatus enligt Pack and Ship-flödet. Kontrollera order, kolli, kvantiteter och transportuppgifter; verifiera bokförd leverans och lagerposter efteråt.",
      "Posts the selected packing/shipping batch and updates shipment status in the Pack and Ship workflow. Check order, packages, quantities, and transport details; verify the posted shipment and inventory entries afterward.",
      "Comptabilise le lot d’emballage/expédition et met à jour le statut. Vérifiez commande, colis, quantités et transport, puis contrôlez l’expédition et les écritures de stock.",
      "Bucht die ausgewählte Pack-/Versandcharge und aktualisiert den Versandstatus. Prüfen Sie Auftrag, Packstücke, Mengen und Transportdaten; kontrollieren Sie anschließend Versand und Lagerposten.",
      "Registra el lote de embalaje/envío y actualiza el estado. Comprueba pedido, bultos, cantidades y transporte; después verifica el envío registrado y movimientos de inventario.",
      "Bogfører den valgte pakke-/forsendelsesbatch og opdaterer status. Kontrollér ordre, kolli, antal og transport; verificér derefter bogført levering og lagerposter.",
      "Kirjaa valitun pakkaus-/lähetyserän ja päivittää tilan. Tarkista tilaus, pakkaukset, määrät ja kuljetustiedot; varmista kirjattu lähetys ja varastotapahtumat.",
      "Bokfører valgt pakke-/forsendelsesbatch og oppdaterer status. Kontroller ordre, kolli, mengder og transport; verifiser bokført levering og lagerposter etterpå."
    ]
  };
  const financeSpecific = {
    "Finance.RecalculateCashFlowForecast": [
      "Räknar om likviditetsprognosen med aktuella reskontra-, budget- och kassaflödesdata. Kontrollera prognosperiod, scenariovärden och inkluderade poster; granska resultatet innan det används som beslutsunderlag.",
      "Recalculates the cash flow forecast using current ledger, budget, and cash flow data. Check the forecast horizon, scenario values, and included entries, then review the result before relying on it.",
      "Recalcule la prévision de trésorerie à partir des données actuelles. Vérifiez période, scénario et écritures incluses, puis examinez le résultat avant de l’utiliser.",
      "Berechnet die Liquiditätsprognose mit aktuellen Daten neu. Prüfen Sie Zeitraum, Szenario und einbezogene Posten und bewerten Sie das Ergebnis vor der Verwendung.",
      "Recalcula la previsión de tesorería con datos actuales. Comprueba período, escenario y movimientos incluidos; revisa el resultado antes de utilizarlo.",
      "Genberegner likviditetsprognosen med aktuelle data. Kontrollér periode, scenarie og inkluderede poster, og gennemgå resultatet før brug.",
      "Laskee kassavirtaennusteen uudelleen nykyisillä tiedoilla. Tarkista ennustejakso, skenaario ja tapahtumat sekä arvioi tulos ennen käyttöä.",
      "Beregner likviditetsprognosen på nytt med gjeldende data. Kontroller periode, scenario og inkluderte poster før resultatet brukes."
    ],
    "Finance.EditGeneralLedgerBudget": [
      "Öppnar redigering av redovisningsbudgeten. Kontrollera budgetnamn, konto, period och dimensioner så att justeringen hamnar i rätt budgetpost; ändringen bokför inga redovisningstransaktioner.",
      "Opens the general ledger budget for editing. Check budget name, account, period, and dimensions so the change affects the intended budget entry; this does not post ledger transactions.",
      "Ouvre la modification du budget comptable. Vérifiez budget, compte, période et dimensions ; la modification ne comptabilise pas d’écritures.",
      "Öffnet die Bearbeitung des Sachkontenbudgets. Prüfen Sie Budget, Konto, Periode und Dimensionen; es werden keine Sachposten gebucht.",
      "Abre la edición del presupuesto contable. Comprueba presupuesto, cuenta, período y dimensiones; esto no registra movimientos contables.",
      "Åbner redigering af finansbudgettet. Kontrollér budget, konto, periode og dimensioner; der bogføres ingen finansposter.",
      "Avaa pääkirjan budjetin muokkauksen. Tarkista budjetti, tili, kausi ja dimensiot; tämä ei kirjaa pääkirjatapahtumia.",
      "Åpner redigering av hovedbokbudsjettet. Kontroller budsjett, konto, periode og dimensjoner; ingen hovedboksposter bokføres."
    ],
    "Finance.PreviewExchangeRateAdjustment": [
      "Visar förhandsgranskning av valutakursjusteringens föreslagna bokningar utan att bokföra dem. Kontrollera valutakursdatum, orealiserade vinster/förluster och konton; bokför först efter att förslaget stämts av.",
      "Previews the proposed exchange-rate adjustment entries without posting them. Check the exchange-rate date, unrealized gains/losses, and accounts; post only after reconciling the proposal.",
      "Prévisualise les écritures d’ajustement de change sans les comptabiliser. Vérifiez date, gains/pertes latents et comptes avant validation.",
      "Zeigt vorgeschlagene Währungskursanpassungen vor der Buchung. Prüfen Sie Kursdatum, unrealisierte Gewinne/Verluste und Konten vor dem Buchen.",
      "Muestra los asientos propuestos de ajuste cambiario sin registrarlos. Comprueba fecha, ganancias/pérdidas no realizadas y cuentas antes de contabilizar.",
      "Forhåndsviser foreslåede valutakursreguleringer uden bogføring. Kontrollér kursdato, urealiserede gevinster/tab og konti før bogføring.",
      "Esikatselee valuuttakurssioikaisun ehdotetut kirjaukset niitä kirjaamatta. Tarkista päivämäärä, realisoitumattomat voitot/tappiot ja tilit.",
      "Forhåndsviser foreslåtte valutajusteringer uten å bokføre dem. Kontroller kursdato, urealisert gevinst/tap og kontoer før bokføring."
    ],
    "Finance.SuggestVATReportLines": [
      "Föreslår rader till momsrapporten utifrån bokförda momsposter och rapportinställningen. Granska period, momskoder och föreslagna belopp samt jämför rapporten med huvudboken innan den lämnas in.",
      "Suggests VAT return lines from posted VAT entries and report setup. Review the period, VAT identifiers, and amounts, and reconcile the return to the general ledger before submission.",
      "Propose des lignes de déclaration TVA selon les écritures et paramètres. Vérifiez période, codes et montants, puis rapprochez la déclaration du grand livre avant envoi.",
      "Schlägt Umsatzsteuerzeilen anhand gebuchter Steuerposten und Einrichtung vor. Prüfen Sie Zeitraum, Steuercodes und Beträge und stimmen Sie mit dem Hauptbuch ab.",
      "Propone líneas de declaración de IVA según movimientos y configuración. Revisa período, grupos y cantidades; concilia con el mayor antes de presentar.",
      "Foreslår momsrækker ud fra bogførte momsposter og opsætning. Gennemgå periode, momskoder og beløb, og afstem mod finans før indberetning.",
      "Ehdottaa ALV-ilmoituksen rivejä kirjattujen ALV-tapahtumien ja asetusten perusteella. Tarkista kausi, ALV-koodit ja summat sekä täsmäytä pääkirjaan.",
      "Foreslår MVA-linjer fra bokførte MVA-poster og oppsett. Kontroller periode, koder og beløp, og avstem mot hovedboken før innsending."
    ],
    "Finance.CalculateFixedAssetDepreciation": [
      "Beräknar avskrivningsförslag för anläggningstillgångar enligt avskrivningsbok, metod och period. Kontrollera bokföringsdatum, tillgångsfilter och beräknade belopp; granska journalraderna innan bokföring.",
      "Calculates proposed depreciation for fixed assets using the depreciation book, method, and period. Check posting date, asset filters, and amounts; review the journal lines before posting.",
      "Calcule les amortissements proposés selon registre, méthode et période. Vérifiez date, filtre d’immobilisations et montants, puis examinez les lignes avant comptabilisation.",
      "Berechnet Abschreibungsvorschläge nach Anlagenbuch, Methode und Periode. Prüfen Sie Buchungsdatum, Anlagenfilter und Beträge vor der Buchung.",
      "Calcula la amortización propuesta según libro, método y período. Comprueba fecha, filtro de activos e importes; revisa las líneas antes de registrar.",
      "Beregner foreslåede afskrivninger efter anlægskartotek, metode og periode. Kontrollér dato, aktivfilter og beløb før bogføring.",
      "Laskee käyttöomaisuuden ehdotetut poistot poistokirjan, menetelmän ja kauden perusteella. Tarkista kirjauspäivä, suodattimet ja määrät ennen kirjausta.",
      "Beregner foreslåtte avskrivninger etter anleggskartotek, metode og periode. Kontroller dato, filter og beløp før bokføring."
    ],
    "Finance.PostFixedAssetJournal": [
      "Bokför anläggningsjournalens avskrivnings- eller justeringsrader till anläggnings- och redovisningsposter. Kontrollera tillgång, bokföringsdatum, belopp och motkonton; verifiera bokföringsresultatet innan perioden stängs.",
      "Posts the fixed asset journal's depreciation or adjustment lines to asset and general ledger entries. Check the asset, posting date, amounts, and balancing accounts; verify the result before closing the period.",
      "Comptabilise les lignes d’amortissement ou d’ajustement aux immobilisations et au grand livre. Vérifiez actif, date, montants et comptes avant clôture.",
      "Bucht Abschreibungs- oder Anpassungszeilen in Anlagen- und Sachposten. Prüfen Sie Anlage, Datum, Beträge und Gegenkonten und kontrollieren Sie das Ergebnis.",
      "Registra amortizaciones o ajustes en activos y mayor. Comprueba activo, fecha, importes y cuentas de contrapartida; verifica el resultado antes del cierre.",
      "Bogfører anlægskladdens afskrivnings- eller reguleringslinjer. Kontrollér aktiv, dato, beløb og modkonti; verificér resultatet før periodeluk.",
      "Kirjaa käyttöomaisuuspäiväkirjan poisto- tai oikaisurivit käyttöomaisuus- ja pääkirjatapahtumiksi. Tarkista nimike, päivämäärä, summat ja vastatilit.",
      "Bokfører avskrivnings- eller justeringslinjene til anleggs- og hovedboksposter. Kontroller eiendel, dato, beløp og motkontoer før periodelukking."
    ],
    "Finance.RunFixedAssetIndexation": [
      "Beräknar indexjusteringar för valda anläggningstillgångar och kan skapa journalrader. Kontrollera index, datum, tillgångsbok och föreslagna belopp; granska journalen och bokför den separat om den stämmer.",
      "Calculates indexation adjustments for selected fixed assets and may create journal lines. Check the index, date, depreciation book, and amounts; review and post the journal separately if correct.",
      "Calcule l’indexation des immobilisations et peut créer des lignes de journal. Vérifiez indice, date, registre et montants ; examinez puis comptabilisez séparément.",
      "Berechnet Indexanpassungen für Anlagen und kann Journalzeilen erstellen. Prüfen Sie Index, Datum, Anlagenbuch und Beträge; buchen Sie das Journal nach Prüfung separat.",
      "Calcula la indexación de activos y puede crear líneas de diario. Comprueba índice, fecha, libro e importes; revisa y registra el diario por separado.",
      "Beregner indeksregulering af anlægsaktiver og kan oprette kladdelinjer. Kontrollér indeks, dato, anlægskartotek og beløb før separat bogføring.",
      "Laskee käyttöomaisuuden indeksikorjaukset ja voi luoda päiväkirjarivejä. Tarkista indeksi, päivämäärä, poistokirja ja summat; kirjaa päiväkirja erikseen.",
      "Beregner indeksregulering av anleggsmidler og kan opprette kladdelinjer. Kontroller indeks, dato, anleggskartotek og beløp før separat bokføring."
    ],
    "Finance.CancelFixedAssetDepreciation": [
      "Tar bort eller återför valda avskrivningsposter enligt åtgärdens urval. Kontrollera anläggning, bokföringsperiod och vilka poster som påverkas; verifiera efteråt att endast avsedda avskrivningar har korrigerats.",
      "Removes or reverses selected depreciation entries according to the action's selection. Check the asset, posting period, and affected entries; verify that only intended depreciation was corrected.",
      "Supprime ou contre-passe les amortissements sélectionnés. Vérifiez immobilisation, période et écritures concernées, puis confirmez que seules les écritures voulues ont été corrigées.",
      "Entfernt oder storniert ausgewählte Abschreibungen gemäß Auswahl. Prüfen Sie Anlage, Periode und betroffene Posten und kontrollieren Sie die Korrektur.",
      "Elimina o revierte amortizaciones seleccionadas. Comprueba activo, período y movimientos afectados; confirma que solo se corrigieron los previstos.",
      "Fjerner eller tilbagefører valgte afskrivninger. Kontrollér aktiv, periode og berørte poster, og verificér at kun de tilsigtede blev rettet.",
      "Poistaa tai peruuttaa valitut poistot. Tarkista käyttöomaisuus, kausi ja tapahtumat sekä varmista, että vain tarkoitetut poistot korjattiin.",
      "Fjerner eller reverserer valgte avskrivninger. Kontroller eiendel, periode og berørte poster, og verifiser at bare de tilsiktede ble korrigert."
    ],
    "Finance.EditFinancialReportRowDefinition": [
      "Öppnar definitionen för en rad i den finansiella rapporten. Ändringar av summatyp, kontofilter eller formel påverkar rapportresultat; kontrollera radens urval och provkör rapporten efter ändring.",
      "Opens a financial report row definition. Changes to totaling type, account filters, or formulas affect report results; verify the row criteria and run the report after editing.",
      "Ouvre la définition d’une ligne de rapport financier. Les filtres et formules influencent le résultat ; vérifiez-les et relancez le rapport après modification.",
      "Öffnet eine Finanzberichtszeilendefinition. Summenart, Kontofilter und Formel beeinflussen das Ergebnis; prüfen Sie die Kriterien und führen Sie den Bericht erneut aus.",
      "Abre la definición de una fila del informe financiero. Filtros y fórmulas afectan el resultado; comprueba criterios y vuelve a ejecutar el informe.",
      "Åbner definitionen af en finansrapportlinje. Summeringstype, kontofilter og formel påvirker resultatet; kontrollér og kør rapporten igen efter ændring.",
      "Avaa talousraportin rivimäärityksen. Summaustyyppi, tilisuodattimet ja kaava vaikuttavat tuloksiin; tarkista ehdot ja suorita raportti uudelleen.",
      "Åpner definisjonen av en finansrapportlinje. Summeringstype, kontofilter og formel påvirker resultatet; kontroller kriteriene og kjør rapporten på nytt."
    ],
    "Finance.EditFinancialReportColumnDefinition": [
      "Öppnar definitionen för en rapportkolumn, exempelvis period, jämförelse eller formel. Kontrollera kolumntyp och periodfilter mot rapportens syfte; ändringen påverkar visningen men bokför inget.",
      "Opens a report column definition, such as period, comparison, or formula. Check the column type and period filters against the report purpose; this changes presentation, not ledger entries.",
      "Ouvre la définition d’une colonne (période, comparaison ou formule). Vérifiez type et filtres ; la modification change le rapport, pas les écritures comptables.",
      "Öffnet eine Berichtsspalte, etwa Periode, Vergleich oder Formel. Prüfen Sie Typ und Filter; die Änderung betrifft die Darstellung, nicht Buchungen.",
      "Abre la definición de columna (período, comparación o fórmula). Comprueba tipo y filtros; modifica el informe, no los asientos.",
      "Åbner en rapportkolonne, f.eks. periode, sammenligning eller formel. Kontrollér type og filtre; det ændrer rapportvisningen, ikke posteringer.",
      "Avaa raportin sarakemäärityksen, kuten kauden, vertailun tai kaavan. Tarkista tyyppi ja suodattimet; muutos vaikuttaa raporttiin, ei kirjauksiin.",
      "Åpner definisjonen av rapportkolonne, for eksempel periode, sammenligning eller formel. Kontroller type og filtre; dette endrer rapportvisning, ikke posteringer."
    ],
    "Finance.IndentChartOfAccounts": [
      "Justerar indrag och summeringshierarki i kontoplanen utifrån totaleringskontonas intervall. Kontrollera konton och summeringar före körning; felaktig hierarki kan ge missvisande rapporttotaler men ändrar inte redan bokförda transaktioner.",
      "Adjusts indentation and totaling hierarchy in the chart of accounts from totaling-account ranges. Check accounts and totals first; an incorrect hierarchy can misstate report totals but does not change posted transactions.",
      "Ajuste la hiérarchie et les comptes totalisateurs du plan comptable. Vérifiez les comptes ; une hiérarchie erronée fausse les totaux de rapports sans modifier les écritures.",
      "Passt Einrückung und Summenhierarchie des Kontenplans anhand der Summenkontenbereiche an. Prüfen Sie Konten; falsche Hierarchie verfälscht Berichtssummen, nicht Buchungen.",
      "Ajusta jerarquía y cuentas totalizadoras del plan contable. Comprueba las cuentas; una jerarquía incorrecta distorsiona totales, no movimientos registrados.",
      "Justerer indrykning og summeringshierarki i kontoplanen. Kontrollér konti først; forkert hierarki kan forvride rapporttotaler, men ændrer ikke bogførte posteringer.",
      "Päivittää tilikartan sisennyksen ja summaushierarkian summaustilien mukaan. Tarkista tilit; virheellinen hierarkia vääristää raporttisummia muuttamatta kirjauksia.",
      "Justerer innrykk og summeringshierarki i kontoplanen. Kontroller kontoer først; feil hierarki kan gi misvisende rapporttotaler, men endrer ikke bokførte transaksjoner."
    ],
    "Finance.ChangeGlobalDimensions": [
      "Startar ändring av globala dimensioner, vilket kan uppdatera dimensionsvärden på många bokförda poster och påverka rapportering. Kontrollera gamla och nya dimensioner, förhandskrav och omfattning; kör endast enligt organisationens ändringsrutin.",
      "Starts a change to global dimensions, which can update dimension values across many posted entries and affect reporting. Check old/new dimensions, prerequisites, and scope; follow the organization's change procedure.",
      "Lance le changement des dimensions globales, susceptible de modifier de nombreuses écritures et rapports. Vérifiez anciennes/nouvelles dimensions, prérequis et portée selon la procédure de changement.",
      "Startet die Änderung globaler Dimensionen, die viele gebuchte Posten und Berichte betreffen kann. Prüfen Sie alte/neue Dimensionen, Voraussetzungen und Umfang gemäß Änderungsverfahren.",
      "Inicia el cambio de dimensiones globales, que puede actualizar muchos movimientos registrados e informes. Comprueba valores anteriores/nuevos, requisitos y alcance según el procedimiento de cambio.",
      "Starter ændring af globale dimensioner, som kan opdatere mange bogførte poster og rapporter. Kontrollér gamle/nye dimensioner, forudsætninger og omfang efter ændringsproceduren.",
      "Käynnistää globaalien dimensioiden muutoksen, joka voi päivittää useiden kirjattujen tapahtumien dimensioita. Tarkista vanhat/uudet arvot, edellytykset ja laajuus.",
      "Starter endring av globale dimensjoner, som kan oppdatere mange bokførte poster og rapporter. Kontroller gamle/nye dimensjoner, forutsetninger og omfang etter endringsrutinen."
    ],
    "Finance.CreateAccountingPeriods": [
      "Skapar räkenskapsperioder för det angivna räkenskapsåret. Kontrollera startdatum, periodlängd och att året följer företagets bokslutskalender; perioderna skapas men stängs inte automatiskt.",
      "Creates accounting periods for the specified fiscal year. Check the start date, period length, and company calendar; creating periods does not close them.",
      "Crée les périodes comptables de l’exercice indiqué. Vérifiez date de début, durée et calendrier ; leur création ne les clôture pas.",
      "Erstellt Buchhaltungsperioden für das Geschäftsjahr. Prüfen Sie Startdatum, Periodenlänge und Kalender; die Perioden werden nicht geschlossen.",
      "Crea períodos contables del ejercicio indicado. Comprueba fecha inicial, duración y calendario; no se cierran al crearlos.",
      "Opretter regnskabsperioder for regnskabsåret. Kontrollér startdato, periodelængde og kalender; perioderne lukkes ikke automatisk.",
      "Luo tilikauden kirjanpitokaudet. Tarkista aloituspäivä, kauden pituus ja kalenteri; kausia ei suljeta luonnin yhteydessä.",
      "Oppretter regnskapsperioder for regnskapsåret. Kontroller startdato, periodelengde og kalender; periodene lukkes ikke automatisk."
    ],
    "Finance.CloseFiscalYear": [
      "Kör årsslutsrutinen för det valda räkenskapsåret och markerar räkenskapsåret som stängt; resultatkonton förs normalt vidare via separat bokslutsverifikation. Kontrollera saldon, öppna perioder och bokslutsunderlag före körning.",
      "Runs the year-end close for the selected fiscal year and marks it closed; income statement balances are typically carried forward through a separate closing entry. Check balances and close support before running.",
      "Exécute la clôture de l’exercice sélectionné et le marque clos ; le résultat est généralement transféré par une écriture distincte. Vérifiez soldes et justificatifs avant exécution.",
      "Führt den Jahresabschluss für das Geschäftsjahr aus und schließt es; GuV-Salden werden üblicherweise separat übertragen. Prüfen Sie Salden und Unterlagen vorher.",
      "Ejecuta el cierre del ejercicio y lo marca cerrado; los saldos de resultados suelen trasladarse mediante asiento aparte. Comprueba saldos y documentación antes.",
      "Kører årsafslutning for regnskabsåret og markerer det lukket; resultatkonti overføres typisk via separat kladde. Kontrollér saldi og grundlag først.",
      "Suorittaa valitun tilikauden sulkemisen ja merkitsee sen suljetuksi; tulostilit siirretään yleensä erillisellä päätösviennillä. Tarkista saldot ennen ajoa.",
      "Kjører årsavslutning for valgt regnskapsår og markerer det lukket; resultatkontoer overføres vanligvis med egen avslutningspost. Kontroller saldoer først."
    ],
    "Finance.RunCloseIncomeStatement": [
      "Skapar resultaträkningens bokslutsverifikation för valt räkenskapsår och bokföringsdatum. Kontrollera resultatkonton, avslutskonto, dimensioner och föreslagna rader innan verifikationen bokförs.",
      "Creates income statement closing entries for the selected fiscal year to the closing account using the chosen posting date. Check account selection, dimension transfer, document numbering, and proposed entries before posting.",
      "Crée les écritures de clôture du compte de résultat vers le compte de clôture à la date choisie. Vérifiez comptes, transfert des dimensions et écritures proposées avant comptabilisation.",
      "Erstellt GuV-Abschlussbuchungen auf das Abschlusskonto mit dem gewählten Datum. Prüfen Sie Konten, Dimensionsübernahme und vorgeschlagene Buchungen vor dem Buchen.",
      "Crea asientos de cierre de resultados a la cuenta de cierre con la fecha indicada. Comprueba cuentas, dimensiones y asientos propuestos antes de registrarlos.",
      "Opretter resultatopgørelsens afslutningsposter på afslutningskontoen med valgt dato. Kontrollér konti, dimensioner og kladdelinjer før bogføring.",
      "Luo tuloslaskelman päätösviennit päätöstilille valitulla päivällä. Tarkista tilit, dimensioiden siirto ja ehdotetut viennit ennen kirjaamista.",
      "Oppretter resultatregnskapets avslutningsposter mot avslutningskonto med valgt dato. Kontroller kontoer, dimensjoner og foreslåtte poster før bokføring."
    ],
    "Finance.PostGeneralJournal": [
      "Bokför de valda redovisningsjournalraderna och skapar redovisningsposter. Stäm av debet och kredit, datum, konton, moms och dimensioner; granska bokföringsrapporten och verifikationsnumren efteråt.",
      "Posts the selected general journal lines and creates ledger entries. Reconcile debits and credits, dates, accounts, VAT, and dimensions; review the posting report and document numbers afterward.",
      "Comptabilise les lignes du journal général et crée les écritures. Vérifiez équilibre, dates, comptes, TVA et dimensions, puis contrôlez le rapport et les numéros.",
      "Bucht die ausgewählten Fibu-Buch.-Blattzeilen. Stimmen Sie Soll/Haben, Daten, Konten, Steuern und Dimensionen ab und prüfen Sie Buchungsbericht und Belegnummern.",
      "Registra las líneas seleccionadas del diario general. Concilia debe/haber, fechas, cuentas, IVA y dimensiones; revisa el informe y números de documento.",
      "Bogfører de valgte finanskladdeposter. Afstem debet/kredit, datoer, konti, moms og dimensioner; kontrollér bogføringsrapport og bilagsnumre bagefter.",
      "Kirjaa valitut yleispäiväkirjan rivit pääkirjaan. Täsmäytä debet/kredit, päivät, tilit, ALV ja dimensiot sekä tarkista kirjausraportti ja tositenumerot.",
      "Bokfører valgte finanskladdelinjer. Avstem debet/kredit, datoer, kontoer, MVA og dimensjoner; kontroller bokføringsrapport og bilagsnumre etterpå."
    ]
  };
  const projectSpecific = {
    "Projects.PostProjectJournal": [
      "Bokför projektjournalens valda resurs-, artikel- eller kostnadsrader. Kontrollera projekt och projektaktivitet, typ, kvantitet, kostnad/pris och dimensioner; granska projektposter och eventuell resurs-/redovisningspåverkan efteråt.",
      "Posts selected resource, item, or cost lines from the project journal. Check project and task, type, quantity, cost/price, and dimensions; verify project entries and related ledger effects afterward.",
      "Comptabilise les lignes ressource, article ou coût du journal projet. Vérifiez projet, tâche, type, quantité, coût/prix et dimensions, puis contrôlez les écritures.",
      "Bucht ausgewählte Ressourcen-, Artikel- oder Kostenzeilen des Projektjournals. Prüfen Sie Projekt, Aufgabe, Art, Menge, Kosten/Preis und Dimensionen sowie die resultierenden Posten.",
      "Registra líneas de recurso, producto o coste del diario de proyecto. Comprueba proyecto, tarea, tipo, cantidad, coste/precio y dimensiones; verifica movimientos resultantes.",
      "Bogfører valgte ressource-, vare- eller omkostningslinjer i projektkladden. Kontrollér projekt, opgave, type, antal, pris og dimensioner; verificér poster bagefter.",
      "Kirjaa projektipäiväkirjan valitut resurssi-, nimike- tai kustannusrivit. Tarkista projekti, tehtävä, tyyppi, määrä, kustannus/hinta ja dimensiot.",
      "Bokfører valgte ressurs-, vare- eller kostnadslinjer fra prosjektkladden. Kontroller prosjekt, oppgave, type, mengde, pris og dimensjoner; verifiser postene."
    ],
    "Projects.OpenProjectPlanningLines": [
      "Öppnar planeringsraderna för den valda projektaktiviteten så att budgeterad och planerad användning kan granskas. Öppningen ändrar inga kvantiteter, journaler eller fakturor.",
      "Opens planning lines for the selected project task so budgeted and planned usage can be reviewed. Opening them does not change quantities, journals, or invoices.",
      "Ouvre les lignes de planification de la tâche projet pour examiner l’utilisation prévue. Cette ouverture ne modifie ni quantités, journaux ni factures.",
      "Öffnet Planungszeilen der ausgewählten Projektaufgabe zur Prüfung geplanter Verwendung. Dadurch werden Mengen, Journale oder Rechnungen nicht geändert.",
      "Abre las líneas de planificación de la tarea del proyecto para revisar el uso previsto. No modifica cantidades, diarios ni facturas.",
      "Åbner planlægningslinjer for den valgte projektopgave. Det ændrer ikke antal, kladder eller fakturaer.",
      "Avaa valitun projektitehtävän suunnittelurivit suunnitellun käytön tarkastelua varten. Se ei muuta määriä, päiväkirjoja tai laskuja.",
      "Åpner planleggingslinjene for valgt prosjektoppgave. Dette endrer ikke mengder, kladder eller fakturaer."
    ],
    "Projects.CreateTimeSheetLinesFromPlanning": [
      "Skapar tidrapporteringsrader utifrån projektets planeringsrader. Kontrollera resurs, projektaktivitet, datum och planerade timmar; de skapade raderna behöver granskas och skickas/godkännas enligt tidrapporteringsflödet.",
      "Creates timesheet lines from project planning lines. Check resource, task, date, and planned hours; review and submit/approve the generated lines through the timesheet workflow.",
      "Crée des lignes de feuille de temps à partir de la planification projet. Vérifiez ressource, tâche, date et heures ; les lignes doivent ensuite être examinées et soumises/approuvées.",
      "Erstellt Arbeitszeittabellenzeilen aus der Projektplanung. Prüfen Sie Ressource, Aufgabe, Datum und Stunden; anschließend müssen die Zeilen geprüft und eingereicht/freigegeben werden.",
      "Crea líneas de horas desde la planificación del proyecto. Comprueba recurso, tarea, fecha y horas; después revisa y envía/aprueba las líneas.",
      "Opretter timeseddellinjer fra projektplanlægningen. Kontrollér ressource, opgave, dato og timer; gennemgå og indsend/godkend linjerne efterfølgende.",
      "Luo työaikarivit projektisuunnittelusta. Tarkista resurssi, tehtävä, päivämäärä ja tunnit; tarkista ja lähetä/hyväksytä rivit työaikaprosessissa.",
      "Oppretter timelisterader fra prosjektplanleggingen. Kontroller ressurs, oppgave, dato og timer; gjennomgå og send/godkjenn linjene etterpå."
    ],
    "Projects.SuggestApprovedTimeSheetLinesToProjectJournal": [
      "Föreslår godkända tidrapportsposter till projektjournalen. Kontrollera period, resurs, projekt, aktivitet och timmar; raderna är ännu inte bokförda projekttransaktioner.",
      "Suggests approved timesheet lines for the project journal. Check period, resource, project, task, and hours; suggested lines are not yet posted project entries.",
      "Propose les lignes de temps approuvées dans le journal projet. Vérifiez période, ressource, projet, tâche et heures ; les lignes ne sont pas encore comptabilisées.",
      "Schlägt genehmigte Zeiterfassungszeilen im Projektjournal vor. Prüfen Sie Zeitraum, Ressource, Projekt, Aufgabe und Stunden; es sind noch keine gebuchten Projektposten.",
      "Propone horas aprobadas en el diario de proyecto. Comprueba período, recurso, proyecto, tarea y horas; aún no son movimientos registrados.",
      "Foreslår godkendte timeseddellinjer i projektkladden. Kontrollér periode, ressource, projekt, opgave og timer; linjerne er endnu ikke bogført.",
      "Ehdottaa hyväksyttyjä työaikarivejä projektipäiväkirjaan. Tarkista kausi, resurssi, projekti, tehtävä ja tunnit; rivejä ei ole vielä kirjattu.",
      "Foreslår godkjente timelisterader i prosjektkladden. Kontroller periode, ressurs, prosjekt, oppgave og timer; linjene er ikke bokført ennå."
    ],
    "Projects.OpenResourceCapacity": [
      "Visar kapacitet per resurs och period utifrån resursens kalender och tillgänglighet. Jämför planerade timmar med tillgänglig kapacitet innan nya projektuppgifter tilldelas.",
      "Shows resource capacity by resource and period based on calendars and availability. Compare planned hours with available capacity before assigning more project work.",
      "Affiche la capacité par ressource et période selon les calendriers et disponibilités. Comparez les heures planifiées à la capacité avant affectation.",
      "Zeigt Ressourcenkapazität nach Zeitraum anhand Kalender und Verfügbarkeit. Vergleichen Sie geplante Stunden vor weiteren Projektzuweisungen.",
      "Muestra capacidad por recurso y período según calendario y disponibilidad. Compara horas previstas antes de asignar más trabajo.",
      "Viser ressourcekapacitet pr. periode ud fra kalender og tilgængelighed. Sammenlign planlagte timer med kapaciteten før ny tildeling.",
      "Näyttää resurssikapasiteetin kausittain kalenterin ja käytettävyyden mukaan. Vertaa suunniteltuja tunteja käytettävissä olevaan kapasiteettiin.",
      "Viser ressurskapasitet per periode etter kalender og tilgjengelighet. Sammenlign planlagte timer med kapasiteten før ny tildeling."
    ],
    "Projects.UpdateResourceCapacity": [
      "Uppdaterar resursens kapacitetsdata för valda perioder. Kontrollera arbetskalender, tillgänglig tid och datumintervall; kapacitetsändringen påverkar planeringsunderlag men bokför inte projektanvändning.",
      "Updates resource capacity data for the selected periods. Check the work calendar, available time, and date range; this affects planning, not posted project usage.",
      "Met à jour la capacité de la ressource pour les périodes choisies. Vérifiez calendrier et intervalle ; cela affecte la planification, pas les écritures projet.",
      "Aktualisiert Ressourcenkapazität für ausgewählte Perioden. Prüfen Sie Arbeitskalender und Zeitraum; dies betrifft die Planung, nicht gebuchte Projektverwendung.",
      "Actualiza capacidad del recurso para los períodos seleccionados. Comprueba calendario e intervalo; afecta la planificación, no movimientos del proyecto.",
      "Opdaterer ressourcens kapacitet for valgte perioder. Kontrollér kalender og datoer; dette påvirker planlægning, ikke bogført projektforbrug.",
      "Päivittää resurssikapasiteetin valituille kausille. Tarkista työkalenteri ja aikaväli; muutos vaikuttaa suunnitteluun, ei kirjattuun käyttöön.",
      "Oppdaterer ressurskapasitet for valgte perioder. Kontroller arbeidskalender og datointervall; dette påvirker planlegging, ikke bokført prosjektforbruk."
    ],
    "Projects.OpenResourceCosts": [
      "Öppnar kostnadspriserna för resursen så att projektkostnad kan granskas per giltighetsperiod och kostnadstyp. Kontrollera valuta och datum; visningen i sig ändrar inte bokförda projektkostnader.",
      "Opens the resource's cost rates for review by effective period and cost type. Check currency and dates; viewing them does not change posted project costs.",
      "Ouvre les coûts de la ressource par période de validité et type. Vérifiez devise et dates ; la consultation ne modifie pas les coûts comptabilisés.",
      "Öffnet Ressourcenkosten nach Gültigkeitszeitraum und Kostenart. Prüfen Sie Währung und Termine; die Anzeige ändert keine gebuchten Projektkosten.",
      "Abre los costes del recurso por vigencia y tipo. Comprueba moneda y fechas; la consulta no cambia costes registrados.",
      "Åbner ressourcens omkostningssatser efter gyldighed og type. Kontrollér valuta og datoer; visningen ændrer ikke bogførte projektomkostninger.",
      "Avaa resurssin kustannushinnat voimassaoloajan ja tyypin mukaan. Tarkista valuutta ja päivämäärät; tarkastelu ei muuta kirjattuja kustannuksia.",
      "Åpner ressursens kostnadssatser etter gyldighet og type. Kontroller valuta og datoer; visningen endrer ikke bokførte prosjektkostnader."
    ],
    "Projects.OpenResourcePrices": [
      "Öppnar försäljningspriserna för resursen så att projektets debiteringspris kan kontrolleras per giltighetsperiod. Kontrollera valuta, kund-/prisgrupp och datum innan priset används på nya planeringsrader.",
      "Opens the resource's sales prices so project billing rates can be checked by effective period. Verify currency, customer/price group, and dates before using a rate on new planning lines.",
      "Ouvre les tarifs de vente de la ressource pour vérifier le prix facturable par période. Contrôlez devise, groupe tarifaire et dates avant utilisation.",
      "Öffnet Verkaufspreise der Ressource zur Prüfung abrechenbarer Projektsätze. Prüfen Sie Währung, Preisgruppe und Termine vor Verwendung.",
      "Abre precios de venta del recurso para revisar tarifas facturables por período. Comprueba moneda, grupo de precios y fechas antes de usarlos.",
      "Åbner ressourcens salgspriser, så projektets debiteringspris kan kontrolleres. Kontrollér valuta, prisgruppe og datoer før brug.",
      "Avaa resurssin myyntihinnat projektin laskutushinnan tarkistamista varten. Varmista valuutta, hintaryhmä ja päivämäärät ennen käyttöä.",
      "Åpner ressursens salgspriser for å kontrollere prosjektets fakturerbare sats. Kontroller valuta, prisgruppe og datoer før bruk."
    ],
    "Projects.GetProjectPlanningLinesForInvoice": [
      "Hämtar projektets fakturerbara planeringsrader till försäljningsfakturan. Kontrollera projekt, uppgift, ej tidigare fakturerad kvantitet och faktureringsmetod; granska raderna innan fakturan bokförs.",
      "Retrieves billable project planning lines onto the sales invoice. Check project, task, previously uninvoiced quantity, and billing method; review the lines before posting the invoice.",
      "Ajoute à la facture les lignes projet facturables. Vérifiez projet, tâche, quantité non facturée et méthode ; examinez les lignes avant comptabilisation.",
      "Übernimmt abrechenbare Projektplanungszeilen in die Verkaufsrechnung. Prüfen Sie Projekt, Aufgabe, noch nicht fakturierte Menge und Methode vor Buchung.",
      "Trae líneas facturables del proyecto a la factura de venta. Comprueba proyecto, tarea, cantidad no facturada y método; revisa antes de registrar.",
      "Henter fakturerbare projektplanlinjer til salgsfakturaen. Kontrollér projekt, opgave, ikke-faktureret antal og metode før bogføring.",
      "Hakee laskutettavat projektisuunnittelurivit myyntilaskulle. Tarkista projekti, tehtävä, laskuttamaton määrä ja laskutustapa ennen kirjausta.",
      "Henter fakturerbare prosjektplanlinjer til salgsfakturaen. Kontroller prosjekt, oppgave, ufakturert mengde og metode før bokføring."
    ],
    "Projects.CreatePurchaseOrders": [
      "Skapar inköpsorder från projektets inköpsplaneringsrader. Kontrollera leverantör, projektkoppling, artikel, leveransdatum och ej beställd kvantitet; granska de skapade orderna innan de frisläpps.",
      "Creates purchase orders from the project's purchase planning lines. Check vendor, project link, item, delivery date, and outstanding quantity; review created orders before release.",
      "Crée des commandes achat depuis la planification d’achat du projet. Vérifiez fournisseur, lien projet, article, date et quantité restante ; contrôlez les commandes avant libération.",
      "Erstellt Einkaufsbestellungen aus Projektbeschaffungszeilen. Prüfen Sie Lieferant, Projektbezug, Artikel, Lieferdatum und offene Menge vor Freigabe.",
      "Crea pedidos de compra desde la planificación de compras del proyecto. Comprueba proveedor, proyecto, producto, fecha y cantidad pendiente; revisa antes de liberar.",
      "Opretter købsordrer fra projektets indkøbsplanlinjer. Kontrollér leverandør, projektkobling, vare, leveringsdato og restantal før frigivelse.",
      "Luo ostotilauksia projektin hankintasuunnitteluriveistä. Tarkista toimittaja, projektikytkentä, nimike, toimituspäivä ja tilaamaton määrä ennen vapautusta.",
      "Oppretter innkjøpsordrer fra prosjektets innkjøpsplanlinjer. Kontroller leverandør, prosjektkobling, vare, leveringsdato og restmengde før frigivelse."
    ]
  };
  const documentSpecific = {
    "Purchase.Release": "release",
    "Sales.Release": "release",
    "Purchase.Reopen": "reopen",
    "Sales.Reopen": "reopen",
    "Purchase.Post": "post",
    "Sales.Post": "post",
    "Purchase.ChangeExpectedReceiptDate": "purchaseReceiptDate",
    "Sales.ChangeShipmentDate": "salesShipmentDate",
    "Sales.OpenPostedInvoice": "openPostedInvoice",
    "Purchase.OpenPurchaseReturnOrder": "openReturn",
    "Sales.OpenSalesReturnOrder": "openReturn",
    "Purchase.GetPostedLinesToReverse": "getPostedLines",
    "Sales.GetPostedLinesToReverse": "getPostedLines",
    "Purchase.PostPurchaseReturnOrder": "postReturn",
    "Sales.PostSalesReturnOrder": "postReturn",
    "Purchase.CreateCorrectiveCreditMemo": "createCorrectiveCreditMemo",
    "Sales.CreateCorrectiveCreditMemo": "createCorrectiveCreditMemo",
    "Purchase.CancelUnpaidPostedInvoice": "cancelUnpaidInvoice",
    "Sales.CancelUnpaidPostedInvoice": "cancelUnpaidInvoice",
    "Purchase.CopyToCreditMemo": "copyCreditMemo",
    "Sales.CopyToCreditMemo": "copyCreditMemo",
    "Purchase.PostPurchaseCreditMemo": "postCreditMemo",
    "Sales.PostSalesCreditMemo": "postCreditMemo",
    "Purchase.ApplyCreditMemoEntries": "applyCreditMemo",
    "Sales.ApplyCreditMemoEntries": "applyCreditMemo",
    "Purchase.GetReceiptLines": "getPurchaseReceiptLines",
    "Purchase.GetOrderLines": "getPurchaseOrderLines",
    "Sales.GetShipmentLines": "getSalesShipmentLines"
  };
  const documentExecutionSpecific = {
    "Purchase.SelectPurchaseLineItemFromLookup": [
      "Väljer en befintlig artikel från uppslagslistan och fyller artikelnumret på inköpsraden. Kontrollera leverantörens artikelreferens, inköpsenhet och beskrivning innan kvantitet och pris fastställs.",
      "Selects an existing item from the lookup and fills its number on the purchase line. Check the vendor item reference, purchase unit, and description before confirming quantity and price.",
      "Sélectionne un article existant dans la liste et renseigne son numéro sur la ligne d’achat. Vérifiez référence fournisseur, unité d’achat et description avant quantité et prix.",
      "Wählt einen vorhandenen Artikel aus der Suche und trägt ihn in die Einkaufszeile ein. Prüfen Sie Lieferantenreferenz, Einkaufseinheit und Beschreibung vor Menge und Preis.",
      "Selecciona un producto existente del selector y lo incorpora a la línea de compra. Comprueba referencia del proveedor, unidad de compra y descripción antes de definir cantidad y precio.",
      "Vælger en eksisterende vare fra opslaget og indsætter den på købslinjen. Kontrollér leverandørens varereference, købsenhed og beskrivelse før antal og pris fastsættes.",
      "Valitsee olemassa olevan nimikkeen hausta ostoriville. Tarkista toimittajan nimikeviite, ostoyksikkö ja kuvaus ennen määrän ja hinnan vahvistamista.",
      "Velger en eksisterende vare fra oppslaget og fyller den inn på kjøpslinjen. Kontroller leverandørens varereferanse, kjøpsenhet og beskrivelse før mengde og pris fastsettes."
    ],
    "Sales.GetPostedLinesToReverse": [
      "Kopierar valda bokförda kundleverans- eller fakturarader till försäljningsreturordern. Begränsa urvalet till ej redan returnerade kvantiteter och kontrollera ursprungsnummer, spårning och belopp; returen bokförs separat.",
      "Copies selected posted customer shipment or invoice lines to the sales return order. Limit the selection to quantities not already returned and check the original number, tracking, and amounts; the return is posted separately.",
      "Copie les lignes d’expédition ou de facture client sélectionnées dans la commande retour vente. Limitez la sélection aux quantités non déjà retournées et vérifiez document d’origine, suivi et montants ; le retour est comptabilisé séparément.",
      "Kopiert ausgewählte gebuchte Kundenlieferungs- oder Rechnungszeilen in den Verkaufsrückgabeauftrag. Wählen Sie keine bereits retournierten Mengen erneut aus und prüfen Sie Ursprungsbeleg, Tracking und Beträge; die Retoure wird separat gebucht.",
      "Copia líneas registradas de envío o factura de cliente al pedido de devolución de venta. Limita la selección a cantidades aún no devueltas y comprueba documento original, seguimiento e importes; la devolución se registra por separado.",
      "Kopierer valgte bogførte kundeleverings- eller fakturalinjer til salgsreturordren. Vælg kun antal, der ikke allerede er returneret, og kontrollér originalbilag, sporing og beløb; returen bogføres separat.",
      "Kopioi valitut kirjatut asiakastoimituksen tai -laskun rivit myyntipalautustilaukselle. Valitse vain jo palauttamattomat määrät ja tarkista alkuperäinen asiakirja, seuranta ja summat; palautus kirjataan erikseen.",
      "Kopierer valgte bokførte kundeleverings- eller fakturalinjer til salgsreturordren. Ta bare med mengder som ikke allerede er returnert, og kontroller originaldokument, sporing og beløp; returen bokføres separat."
    ],
    "Sales.SetReturnReasonCode": [
      "Anger varför kunden returnerar raden och gör försäljningsreturer möjliga att följa upp. Kontrollera att orsaken stämmer med överenskommelsen; koden bokför inte returen och avgör inte om varan ska ersättas, krediteras eller tas tillbaka till lager.",
      "Records why the customer is returning the line for sales-return reporting. Verify the agreed reason; the code does not post the return or decide whether the item is replaced, credited, or put back into inventory.",
      "Indique pourquoi le client retourne la ligne pour le suivi des retours vente. Vérifiez le motif convenu ; le code ne comptabilise pas le retour et ne décide pas du remplacement, de l’avoir ou de la remise en stock.",
      "Erfasst den Grund, aus dem der Kunde die Zeile zurücksendet, für die Auswertung von Verkaufsretouren. Prüfen Sie den vereinbarten Grund; der Code bucht keine Retoure und legt Ersatz, Gutschrift oder Wiedereinlagerung nicht fest.",
      "Indica por qué el cliente devuelve la línea para analizar devoluciones de venta. Comprueba el motivo acordado; el código no registra la devolución ni decide si se sustituye, abona o vuelve a almacenar el producto.",
      "Angiver, hvorfor kunden returnerer linjen, så salgsreturer kan følges op. Kontrollér den aftalte årsag; koden bogfører ikke returen og afgør ikke erstatning, kreditering eller genplacering på lager.",
      "Tallentaa asiakkaan palautuksen syyn myyntipalautusten seurantaa varten. Varmista sovittu syy; koodi ei kirjaa palautusta eikä päätä korvaamisesta, hyvityksestä tai varastoon palauttamisesta.",
      "Angir hvorfor kunden returnerer linjen for oppfølging av salgsreturer. Kontroller avtalt årsak; koden bokfører ikke returen og avgjør ikke erstatning, kreditering eller tilbakeføring til lager."
    ],
    "Sales.CreateCorrectiveCreditMemo": [
      "Skapar ett kreditnotautkast utifrån den bokförda kundfakturan för att korrigera försäljningen. Jämför kopierade kund-, artikel-, kvantitets- och beloppsuppgifter med överenskommelsen; granska och bokför kreditnotan separat.",
      "Creates a sales credit memo draft from the posted customer invoice to correct the sale. Compare copied customer, item, quantity, and amount details with the agreement; review and post the credit memo separately.",
      "Crée un brouillon d’avoir à partir de la facture client comptabilisée pour corriger la vente. Comparez client, articles, quantités et montants copiés à l’accord ; vérifiez et comptabilisez l’avoir séparément.",
      "Erstellt aus der gebuchten Kundenrechnung einen Gutschriftenentwurf zur Korrektur des Verkaufs. Vergleichen Sie Kunde, Artikel, Mengen und Beträge mit der Vereinbarung; prüfen und buchen Sie die Gutschrift separat.",
      "Crea un borrador de abono a partir de la factura de cliente registrada para corregir la venta. Compara cliente, productos, cantidades e importes copiados con lo acordado; revisa y registra el abono por separado.",
      "Opretter en kreditnotakladde fra den bogførte kundefaktura for at rette salget. Sammenhold kunde, varer, antal og beløb med aftalen; gennemgå og bogfør kreditnotaen separat.",
      "Luo kirjatusta myyntilaskusta hyvityslaskuluonnoksen myynnin korjaamista varten. Vertaa asiakkaan, nimikkeiden, määrien ja summien kopioituja tietoja sopimukseen; tarkista ja kirjaa hyvitys erikseen.",
      "Oppretter et kreditnotautkast fra den bokførte kundefakturaen for å korrigere salget. Sammenlign kunde, varer, mengder og beløp med avtalen; gjennomgå og bokfør kreditnotaen separat."
    ],
    "Sales.CancelUnpaidPostedInvoice": [
      "Försöker annullera en obetald bokförd kundfaktura. Business Central tillåter detta bara när fakturan inte är betald och försäljningen inte är fullt levererad; kontrollera leverans- och betalningsstatus. En annullering skapar och bokför en korrigerande kreditnota.",
      "Attempts to cancel an unpaid posted customer invoice. Business Central allows this only when it is unpaid and the sale is not fully shipped; check shipment and payment status. Cancellation creates and posts a corrective credit memo.",
      "Tente d’annuler une facture client comptabilisée et impayée. L’opération n’est possible que si la facture n’est pas payée et si la vente n’est pas entièrement expédiée ; vérifiez expédition et paiement. L’annulation crée et comptabilise un avoir correctif.",
      "Versucht, eine unbezahlte gebuchte Kundenrechnung zu stornieren. Das ist nur möglich, wenn sie unbezahlt und der Verkauf nicht vollständig versandt ist; prüfen Sie Versand- und Zahlungsstatus. Die Stornierung erstellt und bucht eine Korrekturgutschrift.",
      "Intenta cancelar una factura de cliente registrada y no pagada. Solo se permite si sigue impagada y la venta no se ha enviado por completo; comprueba envío y pago. La cancelación crea y registra un abono correctivo.",
      "Forsøger at annullere en bogført, ubetalt kundefaktura. Det er kun muligt, hvis fakturaen er ubetalt, og salget ikke er fuldt afsendt; kontrollér forsendelses- og betalingsstatus. Annulleringen opretter og bogfører en korrigerende kreditnota.",
      "Yrittää peruuttaa kirjatun, maksamattoman myyntilaskun. Se onnistuu vain, jos lasku on maksamatta eikä myyntiä ole toimitettu kokonaan; tarkista toimitus- ja maksutilanne. Peruutus luo ja kirjaa korjaavan hyvityslaskun.",
      "Forsøker å annullere en bokført, ubetalt kundefaktura. Det er bare mulig hvis fakturaen ikke er betalt og salget ikke er fullt levert; kontroller leverings- og betalingsstatus. Annulleringen oppretter og bokfører en korrigerende kreditnota."
    ],
    "Sales.ApplyCreditMemoEntries": [
      "Koblar försäljningskreditnotan mot öppna kundreskontraposter och minskar det belopp kunden är skyldig. Kontrollera kund, faktura, tillämpat belopp och valuta; utjämningen hanterar fordran men registrerar inte i sig varureturen.",
      "Applies the sales credit memo to open customer ledger entries and reduces the amount the customer owes. Check customer, invoice, applied amount, and currency; this settles the receivable but does not itself record the physical return.",
      "Affecte l’avoir vente aux écritures ouvertes du client et réduit sa dette. Vérifiez client, facture, montant affecté et devise ; le lettrage règle la créance mais n’enregistre pas le retour physique de l’article.",
      "Gleicht die Verkaufsgutschrift mit offenen Debitorenposten aus und reduziert die Forderung an den Kunden. Prüfen Sie Kunde, Rechnung, Betrag und Währung; der Ausgleich erfasst keine physische Warenretoure.",
      "Aplica el abono de venta a movimientos abiertos del cliente y reduce su deuda. Comprueba cliente, factura, importe aplicado y moneda; la liquidación no registra por sí misma la devolución física.",
      "Udligner salgskreditnotaen mod åbne debitorposter og reducerer kundens gæld. Kontrollér kunde, faktura, udlignet beløb og valuta; udligningen registrerer ikke i sig selv den fysiske returvare.",
      "Kohdistaa myyntihyvityksen avoimiin asiakkaan reskontratapahtumiin ja pienentää asiakkaan velkaa. Tarkista asiakas, lasku, kohdistettu määrä ja valuutta; kohdistus ei kirjaa fyysistä palautusta.",
      "Utligner salgskreditnotaen mot åpne kundeposter og reduserer kundens gjeld. Kontroller kunde, faktura, utlignet beløp og valuta; utligningen registrerer ikke den fysiske returen."
    ]
  };
  const documentLabels = {
    order: ["inköpsordern", "purchase order", "la commande achat", "die Einkaufsbestellung", "el pedido de compra", "købsordren", "ostotilauksen", "innkjøpsordren"],
    return: ["inköpsreturordern", "purchase return order", "la commande retour achat", "den Einkaufsrückgabeauftrag", "el pedido de devolución de compra", "købsreturordren", "ostopalautustilauksen", "returordren for kjøp"],
    invoice: ["inköpsfakturan", "purchase invoice", "la facture achat", "die Einkaufsrechnung", "la factura de compra", "købsfakturaen", "ostolaskun", "kjøpsfakturaen"],
    salesOrder: ["försäljningsordern", "sales order", "la commande vente", "den Verkaufsauftrag", "el pedido de venta", "salgsordren", "myyntitilauksen", "salgsordren"],
    salesReturn: ["försäljningsreturordern", "sales return order", "la commande retour vente", "den Verkaufsrückgabeauftrag", "el pedido de devolución de venta", "salgsreturordren", "myyntipalautustilauksen", "returordren for salg"],
    salesInvoice: ["försäljningsfakturan", "sales invoice", "la facture vente", "die Verkaufsrechnung", "la factura de venta", "salgsfakturaen", "myyntilaskun", "salgsfakturaen"],
    credit: ["inköpskreditnotan", "purchase credit memo", "l’avoir achat", "die Einkaufsgutschrift", "el abono de compra", "købskreditnotaen", "ostohyvityslaskun", "kjøpskreditnotaen"],
    salesCredit: ["försäljningskreditnotan", "sales credit memo", "l’avoir vente", "die Verkaufsgutschrift", "el abono de venta", "salgskreditnotaen", "myyntihyvityslaskun", "salgskreditnotaen"]
  };
  const documentTexts = {
    openPostedInvoice: [
      "Öppnar den bokförda försäljningsfakturan för granskning av kund, fakturarader, belopp och bokföringsreferenser. Den bokförda fakturan är historik; gör korrigeringar via kreditnota enligt rutinen.",
      "Opens the posted sales invoice to review the customer, lines, amounts, and posting references. The posted invoice is historical; correct it through the credit memo process.",
      "Ouvre la facture vente comptabilisée pour examiner client, lignes, montants et références. Corrigez-la par un avoir selon la procédure.",
      "Öffnet die gebuchte Verkaufsrechnung zur Prüfung von Kunde, Zeilen, Beträgen und Buchungsreferenzen. Korrekturen erfolgen über eine Gutschrift.",
      "Abre la factura de venta registrada para revisar cliente, líneas, importes y referencias. Corrige mediante abono según el procedimiento.",
      "Åbner den bogførte salgsfaktura til kontrol af kunde, linjer, beløb og bogføringsreferencer. Ret den via kreditnota efter proceduren.",
      "Avaa kirjatun myyntilaskun asiakkaan, rivien, summien ja kirjausviitteiden tarkistamista varten. Korjaa se hyvityslaskulla.",
      "Åpner den bokførte salgsfakturaen for kontroll av kunde, linjer, beløp og bokføringsreferanser. Korriger via kreditnota."
    ],
    release: [
      "Frisläpper {document} så att nästa inköps-/lagersteg kan fortsätta. Frisläppning bokför inte mottagning, leverans eller faktura. Kontrollera leverantör/kund, rader och kvantiteter samt status efteråt.",
      "Releases {document} so the next purchasing or warehouse step can proceed. Release does not post a receipt, shipment, or invoice. Check the party, lines, quantities, and status.",
      "Libère {document} pour permettre l’étape suivante. La libération ne comptabilise ni réception, ni expédition, ni facture. Vérifiez tiers, lignes, quantités et statut.",
      "Gibt {document} für den nächsten Einkaufs- oder Lagerschritt frei. Dadurch werden weder Empfang noch Lieferung oder Rechnung gebucht. Prüfen Sie Partner, Zeilen, Mengen und Status.",
      "Libera {document} para continuar el siguiente paso. La liberación no registra recepción, envío ni factura. Comprueba tercero, líneas, cantidades y estado.",
      "Frigiver {document}, så næste indkøbs- eller lagertrin kan fortsætte. Frigivelse bogfører ikke modtagelse, levering eller faktura. Kontrollér part, linjer, antal og status.",
      "Vapauttaa {document}, jotta seuraava osto- tai varastovaihe voi jatkua. Vapautus ei kirjaa vastaanottoa, toimitusta tai laskua. Tarkista osapuoli, rivit, määrät ja tila.",
      "Frigir {document} slik at neste innkjøps- eller lagertrinn kan fortsette. Frigivelse bokfører ikke mottak, levering eller faktura. Kontroller part, linjer, mengder og status."
    ],
    reopen: [
      "Öppnar {document} igen för ändring efter frisläppning. Det återför inte redan bokförda poster. Kontrollera varför dokumentet öppnas på nytt och frisläpp det igen när ändringarna är granskade.",
      "Reopens {document} for editing after release. It does not reverse entries already posted. Confirm why it is being reopened and release it again after reviewing changes.",
      "Rouvre {document} pour modification après libération. Cela n’annule pas les écritures déjà comptabilisées. Vérifiez le motif puis relibérez après contrôle.",
      "Öffnet {document} nach Freigabe wieder zur Bearbeitung. Bereits gebuchte Posten werden nicht storniert. Prüfen Sie den Grund und geben Sie nach Kontrolle erneut frei.",
      "Vuelve a abrir {document} tras liberarlo. No revierte movimientos ya registrados. Confirma el motivo y vuelve a liberarlo tras revisar los cambios.",
      "Genåbner {document} til redigering efter frigivelse. Det tilbagefører ikke allerede bogførte poster. Kontrollér årsagen, og frigiv igen efter gennemgang.",
      "Avaa {document} uudelleen muokattavaksi vapautuksen jälkeen. Se ei peruuta jo kirjattuja tapahtumia. Tarkista syy ja vapauta uudelleen tarkistuksen jälkeen.",
      "Åpner {document} igjen for redigering etter frigivelse. Det reverserer ikke allerede bokførte poster. Kontroller årsaken, og frigjør på nytt etter gjennomgang."
    ],
    post: [
      "Bokför {document} och skapar de lager- och/eller redovisningsposter som dokumenttypen omfattar. Stäm av rader, datum, antal, belopp, moms och dimensioner före körning; kontrollera bokförd leverans/faktura och poster efteråt.",
      "Posts {document} and creates the inventory and/or ledger entries for its document type. Reconcile lines, dates, quantities, amounts, tax, and dimensions first; verify the posted document and entries afterward.",
      "Comptabilise {document} et crée les écritures de stock et/ou comptables prévues. Vérifiez lignes, dates, quantités, montants, taxe et dimensions, puis contrôlez le document et les écritures.",
      "Bucht {document} und erstellt die vorgesehenen Lager- und/oder Sachposten. Prüfen Sie Zeilen, Daten, Mengen, Beträge, Steuer und Dimensionen; kontrollieren Sie anschließend Beleg und Posten.",
      "Registra {document} y crea movimientos de inventario o contabilidad correspondientes. Comprueba líneas, fechas, cantidades, importes, impuestos y dimensiones; verifica el documento y movimientos resultantes.",
      "Bogfører {document} og opretter de relevante lager- og/eller finansposter. Afstem linjer, datoer, antal, beløb, moms og dimensioner; kontrollér dokument og poster bagefter.",
      "Kirjaa {document} ja luo asiakirjatyypin mukaiset varasto- ja/tai pääkirjatapahtumat. Täsmäytä rivit, päivät, määrät, summat, verot ja dimensiot sekä tarkista kirjattu tosite.",
      "Bokfører {document} og oppretter tilhørende lager- og/eller hovedboksposter. Avstem linjer, datoer, mengder, beløp, avgift og dimensjoner; kontroller dokumentet etterpå."
    ],
    purchaseReceiptDate: [
      "Ändrar förväntat mottagningsdatum på inköpsordern. Kontrollera leverantörens bekräftelse och påverkan på planerad inleverans och behovsplanering; datumändringen bokför eller tar inte emot varor.",
      "Changes the expected receipt date on the purchase order. Check the vendor confirmation and impact on planned receiving and supply planning; changing the date does not receive or post goods.",
      "Modifie la date de réception prévue de la commande achat. Vérifiez la confirmation fournisseur et l’impact sur la planification ; aucune réception n’est comptabilisée.",
      "Ändert das erwartete Wareneingangsdatum. Prüfen Sie Lieferantenbestätigung und Auswirkungen auf Empfang und Planung; es werden keine Waren gebucht.",
      "Cambia la fecha prevista de recepción del pedido. Comprueba la confirmación del proveedor y el impacto en planificación; no registra mercancía.",
      "Ændrer forventet modtagelsesdato på købsordren. Kontrollér leverandørbekræftelse og planlægning; ændringen bogfører ikke modtagelse.",
      "Muuttaa ostotilauksen odotettua vastaanottopäivää. Tarkista toimittajan vahvistus ja suunnitteluvaikutus; muutos ei vastaanota tai kirjaa tavaraa.",
      "Endrer forventet mottaksdato på innkjøpsordren. Kontroller leverandørbekreftelse og planlegging; datoendringen mottar eller bokfører ikke varer."
    ],
    salesShipmentDate: [
      "Ändrar utleveransdatum på försäljningsordern. Kontrollera kundens önskade datum, lager- och transportplanering samt radernas tillgänglighet; datumändringen skickar eller bokför inte ordern.",
      "Changes the shipment date on the sales order. Check the customer's requested date, inventory and transport plans, and line availability; the date change does not ship or post the order.",
      "Modifie la date d’expédition de la commande vente. Vérifiez date demandée, stock et transport ; cela n’expédie ni ne comptabilise la commande.",
      "Ändert das Versanddatum des Verkaufsauftrags. Prüfen Sie Kundenwunsch, Bestand und Transportplanung; der Auftrag wird dadurch nicht versendet oder gebucht.",
      "Cambia la fecha de envío del pedido de venta. Comprueba fecha solicitada, inventario y transporte; no envía ni registra el pedido.",
      "Ændrer afsendelsesdatoen på salgsordren. Kontrollér kundens dato, lager og transportplan; ændringen afsender eller bogfører ikke ordren.",
      "Muuttaa myyntitilauksen toimituspäivää. Tarkista asiakkaan päivämäärä, varasto ja kuljetussuunnitelma; muutos ei lähetä tai kirjaa tilausta.",
      "Endrer forsendelsesdatoen på salgsordren. Kontroller kundens dato, lager og transportplan; endringen sender eller bokfører ikke ordren."
    ],
    openReturn: [
      "Öppnar {document} för granskning eller fortsatt registrering. Kontrollera ursprungsfaktura/-leverans och returorsak; att öppna dokumentet ändrar inte lager eller saldo.",
      "Opens {document} for review or further entry. Check the original invoice/shipment and return reason; opening it does not change inventory or balances.",
      "Ouvre {document} pour examen ou saisie. Vérifiez facture/livraison d’origine et motif ; l’ouverture ne modifie ni stock ni solde.",
      "Öffnet {document} zur Prüfung oder Bearbeitung. Prüfen Sie Ursprungsrechnung/-lieferung und Rückgabegrund; Bestand und Saldo ändern sich nicht.",
      "Abre {document} para revisar o completar. Comprueba factura/entrega original y motivo; abrirlo no cambia inventario ni saldo.",
      "Åbner {document} til kontrol eller redigering. Kontrollér oprindelig faktura/levering og returårsag; lager og saldo ændres ikke.",
      "Avaa {document} tarkistusta tai jatkokäsittelyä varten. Tarkista alkuperäinen lasku/toimitus ja syy; avaaminen ei muuta varastoa tai saldoa.",
      "Åpner {document} for kontroll eller videre registrering. Kontroller originalfaktura/-levering og årsak; åpning endrer ikke lager eller saldo."
    ],
    getPostedLines: [
      "Hämtar valda bokförda rader från ursprungsdokumentet till returordern som underlag för återföring. Granska dokumentnummer, artikel, parti och kvantitet; ta bara med det som faktiskt ska returneras eller krediteras.",
      "Retrieves selected posted lines from the source document onto the return order as a reversal basis. Review document, item, lot, and quantity; include only what is actually being returned or credited.",
      "Récupère des lignes comptabilisées vers le retour pour contrepassation. Vérifiez document, article, lot et quantité ; ne sélectionnez que les éléments réellement retournés ou crédités.",
      "Übernimmt ausgewählte gebuchte Zeilen als Grundlage in den Rückgabeauftrag. Prüfen Sie Beleg, Artikel, Los und Menge; wählen Sie nur tatsächlich zurückgegebene oder gutgeschriebene Positionen.",
      "Trae líneas registradas al pedido de devolución. Revisa documento, producto, lote y cantidad; incluye solo lo que se devuelve o abona realmente.",
      "Henter valgte bogførte linjer til returordren som grundlag for tilbageførsel. Kontrollér bilag, vare, parti og antal; medtag kun det, der faktisk returneres eller krediteres.",
      "Hakee valitut kirjatut rivit palautustilaukselle hyvityksen perustaksi. Tarkista asiakirja, nimike, erä ja määrä; valitse vain todella palautettavat/hyvitettävät rivit.",
      "Henter valgte bokførte linjer til returordren som grunnlag. Kontroller dokument, vare, parti og antall; ta bare med det som faktisk returneres eller krediteres."
    ],
    postReturn: [
      "Bokför {document} och registrerar returens lager- och ekonomiska påverkan. Stäm av returkvantitet, parti, returorsak och ursprungsdokument; verifiera bokförda returposter och eventuell kredit efteråt.",
      "Posts {document} and records the inventory and financial effects of the return. Reconcile quantity, lot, return reason, and source document; verify posted return entries and any credit afterward.",
      "Comptabilise {document} et enregistre les effets du retour. Vérifiez quantité, lot, motif et document source, puis contrôlez écritures et avoir éventuel.",
      "Bucht {document} und erfasst Lager- und Finanzwirkung der Rückgabe. Prüfen Sie Menge, Los, Grund und Ursprungsbeleg; kontrollieren Sie danach Rückgabeposten und Gutschrift.",
      "Registra {document} y contabiliza los efectos de la devolución. Comprueba cantidad, lote, motivo y origen; verifica movimientos y abono resultante.",
      "Bogfører {document} og registrerer returens lager- og økonomiske effekt. Afstem antal, parti, årsag og kildedokument; kontrollér poster og kredit bagefter.",
      "Kirjaa {document} ja palautuksen varasto- ja talousvaikutukset. Täsmäytä määrä, erä, syy ja lähdeasiakirja; tarkista palautustapahtumat ja hyvitys.",
      "Bokfører {document} og registrerer lager- og økonomisk effekt. Avstem antall, parti, årsak og kildedokument; kontroller returposter og eventuell kredit."
    ],
    createCorrectiveCreditMemo: [
      "Skapar ett korrigerande kreditnotautkast från den bokförda fakturan. Kontrollera vilka fakturarader, kvantiteter och belopp som kopieras och justera orsaken; kreditnotan måste granskas och bokföras separat.",
      "Creates a corrective credit memo draft from the posted invoice. Check copied lines, quantities, and amounts and set the reason; the credit memo must be reviewed and posted separately.",
      "Crée un brouillon d’avoir correctif depuis la facture comptabilisée. Vérifiez lignes, quantités et montants copiés, puis contrôlez et comptabilisez séparément.",
      "Erstellt einen Korrekturgutschriftsentwurf aus der gebuchten Rechnung. Prüfen Sie kopierte Zeilen, Mengen und Beträge; die Gutschrift ist separat zu prüfen und zu buchen.",
      "Crea un borrador de abono correctivo desde la factura registrada. Comprueba líneas, cantidades e importes copiados; revisa y registra el abono por separado.",
      "Opretter en korrigerende kreditnota som kladde fra den bogførte faktura. Kontrollér kopierede linjer, antal og beløb; gennemgå og bogfør separat.",
      "Luo korjaavan hyvityslaskuluonnoksen kirjatusta laskusta. Tarkista kopioidut rivit, määrät ja summat; tarkista ja kirjaa hyvitys erikseen.",
      "Oppretter et korrigerende kreditnotautkast fra bokført faktura. Kontroller kopierte linjer, mengder og beløp; gjennomgå og bokfør kreditnotaen separat."
    ],
    cancelUnpaidInvoice: [
      "Försöker annullera den bokförda fakturan endast när den är obetald och annulleringsvillkoren är uppfyllda. Kontrollera betalningsstatus och länkade poster; en betald faktura ska korrigeras med kreditnota enligt rutinen.",
      "Attempts to cancel the posted invoice only when it is unpaid and cancellation conditions are met. Check payment status and related entries; correct a paid invoice using a credit memo procedure.",
      "Tente d’annuler la facture comptabilisée uniquement si elle est impayée et admissible. Vérifiez paiements et écritures ; corrigez une facture payée par un avoir.",
      "Versucht, die gebuchte Rechnung nur bei offenem Zahlstatus und erfüllten Bedingungen zu stornieren. Prüfen Sie Zahlungen; bezahlte Rechnungen sind per Gutschrift zu korrigieren.",
      "Intenta cancelar la factura registrada solo si está impagada y cumple las condiciones. Comprueba pagos; una factura pagada se corrige mediante abono.",
      "Forsøger kun at annullere den bogførte faktura, hvis den er ubetalt og betingelserne er opfyldt. Kontrollér betaling; ret betalte fakturaer med kreditnota.",
      "Yrittää peruuttaa kirjatun laskun vain, jos se on maksamaton ja ehdot täyttyvät. Tarkista maksut; maksettu lasku korjataan hyvityslaskulla.",
      "Forsøker bare å annullere den bokførte fakturaen hvis den er ubetalt og vilkårene er oppfylt. Kontroller betaling; korriger betalt faktura med kreditnota."
    ],
    copyCreditMemo: [
      "Kopierar valda dokumentuppgifter till {document} som underlag för korrigering. Kontrollera källa, rader, antal och belopp innan något bokförs; kopieringen i sig ändrar inte originalfakturan.",
      "Copies selected document details into {document} as a correction basis. Check source, lines, quantities, and amounts before posting; copying does not change the original invoice.",
      "Copie des données dans {document} comme base de correction. Vérifiez source, lignes, quantités et montants ; la copie ne modifie pas la facture d’origine.",
      "Kopiert ausgewählte Belegdaten als Grundlage in {document}. Prüfen Sie Quelle, Zeilen, Mengen und Beträge; die Kopie ändert die Ursprungsrechnung nicht.",
      "Copia datos seleccionados a {document} como base de corrección. Comprueba origen, líneas, cantidades e importes; no modifica la factura original.",
      "Kopierer valgte dokumentoplysninger til {document} som grundlag for rettelse. Kontrollér kilde, linjer, antal og beløb; originalfakturaen ændres ikke.",
      "Kopioi valitut asiakirjatiedot tositteelle {document} korjauksen pohjaksi. Tarkista lähde, rivit, määrät ja summat; alkuperäinen lasku ei muutu.",
      "Kopierer valgte dokumentdetaljer til {document} som grunnlag for korrigering. Kontroller kilde, linjer, mengder og beløp; originalfakturaen endres ikke."
    ],
    postCreditMemo: [
      "Bokför {document} och registrerar korrigeringen på kund-/leverantörsreskontra och huvudbok. Kontrollera krediterade rader, belopp, moms, dimensioner och tillämpning; verifiera bokförda kreditnotaposter efteråt.",
      "Posts {document} and records the correction in receivables/payables and the general ledger. Check credited lines, amounts, tax, dimensions, and application; verify posted credit memo entries afterward.",
      "Comptabilise {document} et enregistre la correction client/fournisseur et au grand livre. Vérifiez lignes, montants, taxe et lettrage, puis contrôlez les écritures.",
      "Bucht {document} und erfasst die Korrektur in Debitoren/Kreditoren und Hauptbuch. Prüfen Sie Zeilen, Beträge, Steuer, Dimensionen und Ausgleich; kontrollieren Sie die Posten.",
      "Registra {document} y contabiliza la corrección en clientes/proveedores y mayor. Comprueba líneas, importes, impuestos, dimensiones y aplicación; verifica movimientos.",
      "Bogfører {document} og registrerer korrektionen i debitor/kreditor og finans. Kontrollér linjer, beløb, moms, dimensioner og udligning; verificér posterne bagefter.",
      "Kirjaa {document} ja korjauksen myynti-/ostoreskontraan sekä pääkirjaan. Tarkista rivit, summat, verot, dimensiot ja kohdistus; varmista kirjaukset.",
      "Bokfører {document} og registrerer korrigeringen i kunde-/leverandørreskontro og hovedbok. Kontroller linjer, beløp, avgift, dimensjoner og utligning."
    ],
    applyCreditMemo: [
      "Kopplar kreditnotan till öppna faktura- eller reskontraposter och ändrar deras öppna saldon. Kontrollera kund/leverantör, dokumentnummer, kopplat belopp och valuta samt kvarvarande saldo.",
      "Applies the credit memo to open invoice or ledger entries and changes their remaining balances. Check the customer/vendor, document numbers, applied amount, currency, and residual balance.",
      "Lettre l’avoir aux factures ou écritures ouvertes et modifie les soldes. Vérifiez tiers, numéros, montant affecté, devise et solde restant.",
      "Gleicht die Gutschrift mit offenen Rechnungen oder Posten aus und ändert deren offene Salden. Prüfen Sie Partner, Belege, Betrag, Währung und Restsaldo.",
      "Aplica el abono a facturas o movimientos abiertos y modifica sus saldos pendientes. Comprueba tercero, documentos, importe, moneda y saldo restante.",
      "Udligner kreditnotaen mod åbne fakturaer eller poster. Kontrollér kunde/leverandør, bilag, beløb, valuta og resterende saldo.",
      "Kohdistaa hyvityslaskun avoimiin laskuihin tai tapahtumiin ja muuttaa saldoja. Tarkista asiakas/toimittaja, tositteet, summa, valuutta ja jäljellä oleva saldo.",
      "Utligner kreditnotaen mot åpne fakturaer eller poster og endrer restsaldo. Kontroller kunde/leverandør, bilag, beløp, valuta og gjenstående saldo."
    ],
    getPurchaseReceiptLines: [
      "Hämtar bokförda inleveransrader till inköpsfakturan. Välj rätt mottagning och antal för att undvika dubbel fakturering; kontrollera avvikelser mellan faktura och mottagning.",
      "Retrieves posted purchase receipt lines onto the invoice. Select the intended receipt and quantities to avoid invoicing the same receipt twice; review differences between invoice and receipt.",
      "Récupère les lignes de réception achat comptabilisées sur la facture. Choisissez la bonne réception et les quantités pour éviter une double facturation, puis vérifiez les écarts.",
      "Übernimmt gebuchte Einkaufseingangszeilen in die Rechnung. Wählen Sie Eingang und Menge korrekt, um Doppelberechnung zu vermeiden; prüfen Sie Abweichungen.",
      "Trae líneas de recepción registradas a la factura. Selecciona recepción y cantidades correctas para evitar facturar dos veces; revisa diferencias.",
      "Henter bogførte købsmodtagelseslinjer til fakturaen. Vælg korrekt modtagelse og antal for at undgå dobbeltfakturering; kontrollér afvigelser.",
      "Hakee kirjatut ostovastaanottorivit laskulle. Valitse oikea vastaanotto ja määrät kaksoislaskutuksen estämiseksi; tarkista erot.",
      "Henter bokførte kjøpsmottakslinjer til fakturaen. Velg riktig mottak og mengde for å unngå dobbeltfakturering; kontroller avvik."
    ],
    getPurchaseOrderLines: [
      "Hämtar rader från inköpsordern till fakturan. Kontrollera ordern samt mottagna och ännu inte fakturerade antal; undvik att kopiera redan fakturerade rader igen.",
      "Retrieves lines from the selected purchase order onto the invoice. Check the order, received quantities, and quantities not yet invoiced; avoid copying previously invoiced lines again.",
      "Récupère les lignes de commande achat sur la facture. Vérifiez commande, quantités reçues et non facturées afin d’éviter les doublons.",
      "Übernimmt Zeilen der Einkaufsbestellung in die Rechnung. Prüfen Sie Auftrag, empfangene und noch nicht berechnete Mengen; vermeiden Sie bereits fakturierte Zeilen.",
      "Trae líneas del pedido de compra a la factura. Comprueba pedido, cantidades recibidas y no facturadas; evita copiar líneas ya facturadas.",
      "Henter linjer fra købsordren til fakturaen. Kontrollér ordre, modtaget og endnu ikke faktureret antal; undgå tidligere fakturerede linjer.",
      "Hakee ostotilauksen rivit laskulle. Tarkista tilaus, vastaanotetut ja laskuttamattomat määrät; vältä jo laskutettujen rivien lisäämistä uudelleen.",
      "Henter linjer fra innkjøpsordren til fakturaen. Kontroller ordre, mottatt og ikke-fakturert antall; unngå å kopiere allerede fakturerte linjer."
    ],
    getSalesShipmentLines: [
      "Hämtar bokförda utleveransrader till försäljningsfakturan. Kontrollera rätt leverans, levererade och tidigare fakturerade antal så att fakturan motsvarar leveransen utan dubbel fakturering.",
      "Retrieves posted sales shipment lines onto the invoice. Check the shipment, shipped quantities, and previously invoiced quantities so the invoice matches the actual shipment without duplication.",
      "Récupère les lignes d’expédition comptabilisées sur la facture. Vérifiez expédition, quantités livrées et déjà facturées pour éviter doublons.",
      "Übernimmt gebuchte Verkaufsversandzeilen in die Rechnung. Prüfen Sie Lieferung, versandte und bereits fakturierte Mengen, um Doppelberechnung zu vermeiden.",
      "Trae líneas de envío registradas a la factura. Comprueba envío, cantidades enviadas y ya facturadas para evitar duplicados.",
      "Henter bogførte salgsleverancelinjer til fakturaen. Kontrollér levering, afsendt og allerede faktureret antal for at undgå dobbeltfakturering.",
      "Hakee kirjatut myyntitoimitusrivit laskulle. Tarkista toimitus, toimitetut ja jo laskutetut määrät kaksoislaskutuksen välttämiseksi.",
      "Henter bokførte leveringslinjer til fakturaen. Kontroller levering, sendte og allerede fakturerte mengder for å unngå dobbeltfakturering."
    ]
  };
  const projectExecutionSpecific = {
    "Projects.CreateProjectJournalLines": [
      "Skapar projektjournalrader från vald planerad användning. Kontrollera projektaktivitet, resurs eller artikel, kvantitet och kostnad; raderna behöver granskas och bokförs inte av den här åtgärden.",
      "Creates project journal lines from the selected planned usage. Check the project task, resource or item, quantity, and cost; review the lines because this action does not post them.",
      "Crée des lignes de journal projet à partir de l’utilisation planifiée sélectionnée. Vérifiez tâche, ressource ou article, quantité et coût ; les lignes doivent être examinées et ne sont pas comptabilisées par cette action.",
      "Erstellt Projektjournalzeilen aus der ausgewählten geplanten Verwendung. Prüfen Sie Projektaufgabe, Ressource oder Artikel, Menge und Kosten; die Zeilen müssen geprüft werden und werden durch diese Aktion nicht gebucht.",
      "Crea líneas del diario del proyecto a partir del uso planificado seleccionado. Comprueba tarea, recurso o producto, cantidad y coste; revisa las líneas, ya que esta acción no las registra.",
      "Opretter projektkladdeposter fra det valgte planlagte forbrug. Kontrollér projektopgave, ressource eller vare, antal og omkostning; gennemgå linjerne, da handlingen ikke bogfører dem.",
      "Luo projektipäiväkirjan rivejä valitusta suunnitellusta käytöstä. Tarkista projektitehtävä, resurssi tai nimike, määrä ja kustannus; tarkista rivit, sillä toiminto ei kirjaa niitä.",
      "Oppretter prosjektkladdlinjer fra valgt planlagt bruk. Kontroller prosjektoppgave, ressurs eller vare, mengde og kostnad; gjennomgå linjene, siden handlingen ikke bokfører dem."
    ],
    "Projects.CreateProjectSalesInvoice": [
      "Skapar ett försäljningsfakturautkast med fakturerbar användning från projektet. Kontrollera projekt, kund, projektaktivitet, fakturerbar kvantitet och faktureringsmetod; granska fakturarader och belopp innan fakturan bokförs.",
      "Creates a sales invoice draft from billable project usage. Check the project, customer, task, billable quantity, and invoicing method; review invoice lines and amounts before posting.",
      "Crée un brouillon de facture vente à partir de l’utilisation facturable du projet. Vérifiez projet, client, tâche, quantité facturable et méthode ; examinez lignes et montants avant comptabilisation.",
      "Erstellt einen Verkaufsrechnungsentwurf aus abrechenbarer Projektnutzung. Prüfen Sie Projekt, Kunde, Aufgabe, abrechenbare Menge und Methode; kontrollieren Sie Zeilen und Beträge vor der Buchung.",
      "Crea un borrador de factura de venta con el uso facturable del proyecto. Comprueba proyecto, cliente, tarea, cantidad facturable y método; revisa líneas e importes antes de registrar.",
      "Opretter et salgsfakturakladde fra fakturerbart projektforbrug. Kontrollér projekt, kunde, opgave, fakturerbart antal og metode; gennemgå linjer og beløb før bogføring.",
      "Luo myyntilaskuluonnoksen projektin laskutettavasta käytöstä. Tarkista projekti, asiakas, tehtävä, laskutettava määrä ja menetelmä; tarkista laskurivit ja summat ennen kirjaamista.",
      "Oppretter et salgsfakturautkast fra fakturerbar prosjektbruk. Kontroller prosjekt, kunde, oppgave, fakturerbar mengde og metode; gjennomgå fakturalinjer og beløp før bokføring."
    ],
    "Projects.CalculateRemainingUsage": [
      "Beräknar återstående planerad projektanvändning och fyller relevanta projektjournalrader enligt valda projekt och filter. Kontrollera datum, projektaktivitet och föreslagna timmar eller kvantiteter; beräkningen bokför inget.",
      "Calculates remaining planned project usage and populates relevant project journal lines for the selected projects and filters. Check dates, task, and suggested hours or quantities; the calculation does not post anything.",
      "Calcule l’utilisation planifiée restante et alimente les lignes pertinentes du journal projet selon les projets et filtres choisis. Vérifiez dates, tâche et heures ou quantités proposées ; rien n’est comptabilisé.",
      "Berechnet die verbleibende geplante Projektnutzung und füllt passende Projektjournalzeilen gemäß Auswahl und Filtern. Prüfen Sie Termine, Aufgabe und vorgeschlagene Stunden oder Mengen; es wird nichts gebucht.",
      "Calcula el uso planificado restante y completa líneas pertinentes del diario según proyectos y filtros. Comprueba fechas, tarea y horas o cantidades propuestas; el cálculo no registra nada.",
      "Beregner resterende planlagt projektforbrug og udfylder relevante projektkladdeposter efter valg og filtre. Kontrollér datoer, opgave og foreslåede timer eller antal; beregningen bogfører ikke.",
      "Laskee projektin jäljellä olevan suunnitellun käytön ja täyttää valintojen sekä suodattimien mukaiset päiväkirjarivit. Tarkista päivämäärät, tehtävä ja ehdotetut tunnit tai määrät; mitään ei kirjata.",
      "Beregner gjenstående planlagt prosjektbruk og fyller ut relevante prosjektkladdlinjer etter valg og filtre. Kontroller datoer, oppgave og foreslåtte timer eller mengder; beregningen bokfører ikke."
    ],
    "Projects.CreateProjectInventoryPick": [
      "Skapar ett lagerplockningsunderlag för artiklar och kvantiteter som ska användas på projektet. Kontrollera projektaktivitet, lagerställe och plockbara antal; själva plockningen och lagerbokföringen hanteras separat.",
      "Creates an inventory-pick document for items and quantities to be used on the project. Check the project task, location, and pickable quantities; the physical pick and inventory posting are separate steps.",
      "Crée un document de prélèvement stock pour les articles et quantités destinés au projet. Vérifiez tâche, emplacement et quantités prélevables ; le prélèvement et la comptabilisation du stock sont des étapes distinctes.",
      "Erstellt einen Lagerkommissionierbeleg für Artikel und Mengen, die im Projekt verwendet werden. Prüfen Sie Aufgabe, Lagerort und verfügbare Mengen; Entnahme und Lagerbuchung erfolgen separat.",
      "Crea un documento de picking de inventario para productos y cantidades del proyecto. Comprueba tarea, ubicación y cantidades disponibles; la recogida física y el registro de inventario son pasos separados.",
      "Opretter et lagerplukdokument for varer og antal til projektet. Kontrollér opgave, placering og plukbart antal; selve plukningen og lagerbogføringen håndteres separat.",
      "Luo varastopoiminta-asiakirjan projektissa käytettäville nimikkeille ja määrille. Tarkista tehtävä, sijainti ja poimittavat määrät; fyysinen poiminta ja varastokirjaus ovat erillisiä vaiheita.",
      "Oppretter et lagerplukkdokument for varer og mengder som skal brukes på prosjektet. Kontroller oppgave, lokasjon og plukkbare mengder; selve plukkingen og lagerbokføringen skjer separat."
    ],
    "Projects.CreateProjectWarehousePick": [
      "Skapar ett distributionslagerplock för projektets planerade materialbehov. Kontrollera projektaktivitet, lagerställe och kvarvarande kvantiteter; plockdokumentet måste hanteras och bokföras i lagerflödet innan förbrukningen registreras.",
      "Creates a warehouse pick for the project's planned material demand. Check the project task, location, and remaining quantities; the pick must be handled and posted in the warehouse flow before consumption is recorded.",
      "Crée un prélèvement entrepôt pour le besoin matériel planifié du projet. Vérifiez tâche, emplacement et quantités restantes ; le prélèvement doit être traité et comptabilisé dans le flux entrepôt avant d’enregistrer la consommation.",
      "Erstellt einen Lagerkommissionierauftrag für den geplanten Materialbedarf des Projekts. Prüfen Sie Aufgabe, Lagerort und Restmengen; die Entnahme muss im Lagerprozess bearbeitet und gebucht werden, bevor der Verbrauch erfasst wird.",
      "Crea un picking de almacén para la demanda de material planificada del proyecto. Comprueba tarea, ubicación y cantidades pendientes; procesa y registra el picking antes de contabilizar el consumo.",
      "Opretter et lagerpluk til projektets planlagte materialebehov. Kontrollér opgave, placering og resterende antal; plukket skal behandles og bogføres i lagerflowet, før forbruget registreres.",
      "Luo projektin suunnitellun materiaalitarpeen varastopoiminnan. Tarkista tehtävä, sijainti ja jäljellä olevat määrät; poiminta on käsiteltävä ja kirjattava varastoprosessissa ennen kulutuksen kirjaamista.",
      "Oppretter et lagerplukk for prosjektets planlagte materialbehov. Kontroller oppgave, lokasjon og gjenstående mengder; plukket må behandles og bokføres i lagerflyten før forbruket registreres."
    ]
  };
  const serviceSpecific = {
    "Services.OpenServiceItemWorksheet": [
      "Öppnar artikelarbetsbladet för serviceordern där serviceartiklar och arbetsrader kan granskas eller läggas till. Kontrollera att raderna hör till rätt kunds servicebehov; öppningen bokför inget arbete eller material.",
      "Opens the item worksheet for the service order to review or add service items and work lines. Confirm the lines match the customer's service request; opening it posts no work or material.",
      "Ouvre la feuille article de la commande service pour examiner ou ajouter les lignes. Vérifiez qu’elles correspondent à la demande client ; aucune consommation n’est comptabilisée.",
      "Öffnet das Artikelarbeitsblatt des Serviceauftrags zur Prüfung oder Ergänzung von Serviceartikeln und Arbeitszeilen. Prüfen Sie den Kundenbezug; es wird nichts gebucht.",
      "Abre la hoja de artículos del pedido de servicio para revisar o añadir líneas. Confirma que correspondan a la solicitud del cliente; no registra trabajo ni material.",
      "Åbner varekladden for serviceordren, hvor serviceartikler og arbejdslinjer gennemgås eller tilføjes. Kontrollér kundens behov; intet bogføres endnu.",
      "Avaa palvelutilauksen nimiketyökirjan palvelunimikkeiden ja työrivien tarkistamiseen tai lisäämiseen. Varmista asiakasyhteys; mitään ei kirjata.",
      "Åpner varearket for serviceordren slik at serviceartikler og arbeidslinjer kan gjennomgås eller legges til. Kontroller kundebehovet; ingenting bokføres ennå."
    ],
    "Services.SetServiceItemWorksheetQuantity": [
      "Anger kvantiteten på vald servicearbetsbladsrad. Kontrollera enhet, antal och om raden avser arbete, reservdel eller avgift; värdet blir del av orderunderlaget men bokförs inte förrän ett serviceflöde bokförs.",
      "Sets the quantity on the selected service worksheet line. Check the unit, quantity, and whether it is labor, a spare part, or a fee; it remains order data until a service posting occurs.",
      "Définit la quantité sur la ligne sélectionnée. Vérifiez unité et nature (main-d’œuvre, pièce ou frais) ; elle reste sur le document jusqu’à comptabilisation.",
      "Legt die Menge der ausgewählten Servicearbeitsblattzeile fest. Prüfen Sie Einheit und Art (Arbeit, Ersatzteil oder Gebühr); gebucht wird erst im Servicevorgang.",
      "Define la cantidad de la línea seleccionada. Comprueba unidad y si es trabajo, repuesto o cargo; no se registra hasta contabilizar el servicio.",
      "Angiver antal på den valgte servicelinje. Kontrollér enhed og om det er arbejde, reservedel eller gebyr; bogføring sker først ved servicebogføring.",
      "Asettaa määrän valitulle palvelutyökirjan riville. Tarkista yksikkö ja onko kyse työstä, varaosasta vai maksusta; kirjaus tapahtuu vasta palvelukirjauksessa.",
      "Angir antallet på valgt servicelinje. Kontroller enhet og om det gjelder arbeid, reservedel eller gebyr; bokføring skjer først når serviceordren bokføres."
    ],
    "Services.PostServiceOrder": [
      "Bokför serviceordern enligt valt alternativ: leverans, fakturering av redan levererat eller kombinerad leverans/fakturering; alternativet Ship and Consume kan även registrera förbrukning. Kontrollera val, serviceartikel, rader, datum och kvantiteter samt granska bokförda serviceposter och dokument.",
      "Posts the service order using the selected option: ship, invoice previously shipped lines, or ship and invoice; Ship and Consume can also post consumption. Check the option, service item, lines, dates, and quantities, then verify posted entries and documents.",
      "Comptabilise selon l’option choisie : expédier, facturer les lignes déjà livrées, ou expédier et facturer ; Ship and Consume comptabilise aussi la consommation. Vérifiez option, lignes et quantités puis les documents générés.",
      "Bucht den Serviceauftrag gemäß Auswahl: Liefern, bereits Geliefertes fakturieren oder Liefern und Fakturieren; Ship and Consume bucht zusätzlich Verbrauch. Prüfen Sie Option, Positionen und Mengen sowie die gebuchten Belege.",
      "Registra el pedido según la opción: enviar, facturar lo ya enviado o enviar y facturar; Ship and Consume también registra consumo. Comprueba opción, líneas y cantidades y verifica documentos resultantes.",
      "Bogfører serviceordren efter valgt mulighed: lever, fakturér allerede leveret eller lever og fakturér; Ship and Consume bogfører også forbrug. Kontrollér valg, linjer, antal og bogførte dokumenter.",
      "Kirjaa palvelutilauksen valitun vaihtoehdon mukaan: toimitus, jo toimitetun laskutus tai toimitus ja laskutus; Ship and Consume kirjaa myös kulutuksen. Tarkista valinta, rivit ja määrät sekä syntyneet tositteet.",
      "Bokfører serviceordren etter valgt alternativ: lever, fakturer allerede levert eller lever og fakturer; Ship and Consume bokfører også forbruk. Kontroller valg, linjer, mengder og bokførte dokumenter."
    ],
    "Services.CreateServiceOrder": [
      "Skapar en serviceorder för kundens servicebehov. Kontrollera kund, serviceordertyp och obligatoriska fält; lägg till serviceartikelrad och servicearbetsrader innan ordern frisläpps eller bokförs.",
      "Creates a service order for the customer's service request. Check the customer, service order type, and required fields; add a service item line and service lines before release or posting.",
      "Crée une commande de service pour la demande client. Vérifiez client, type et champs obligatoires ; ajoutez les lignes article et service avant libération ou comptabilisation.",
      "Erstellt einen Serviceauftrag für den Kundenbedarf. Prüfen Sie Kunde, Auftragsart und Pflichtfelder; ergänzen Sie Serviceartikel- und Servicezeilen vor Freigabe oder Buchung.",
      "Crea un pedido de servicio para la solicitud del cliente. Comprueba cliente, tipo y campos obligatorios; añade líneas de artículo y servicio antes de liberar o registrar.",
      "Opretter en serviceordre til kundens behov. Kontrollér kunde, ordretype og obligatoriske felter; tilføj serviceartikel- og servicelinjer før frigivelse eller bogføring.",
      "Luo palvelutilauksen asiakkaan palvelutarpeelle. Tarkista asiakas, tilaustyyppi ja pakolliset kentät; lisää palvelunimike- ja palvelurivit ennen vapautusta tai kirjausta.",
      "Oppretter en serviceordre for kundens behov. Kontroller kunde, ordretype og obligatoriske felt; legg til serviceartikkel- og servicelinjer før frigivelse eller bokføring."
    ],
    "Services.ConvertAcceptedQuoteToOrder": [
      "Gör om den accepterade serviceofferten till en serviceorder. Business Central tar bort offerten, skapar ordern med status Väntar och återställer serviceartiklarnas reparationsstatus till Initial; kontrollera att offerten är accepterad och spara nödvändiga offerteuppgifter innan konverteringen.",
      "Converts the accepted service quote into a service order. Business Central deletes the quote, creates the order with Pending status, and resets service-item repair statuses to Initial; confirm acceptance and retain needed quote details first.",
      "Convertit le devis de service accepté en commande. Le devis est supprimé ; la commande passe à En attente et les statuts de réparation reviennent à Initial. Confirmez l’acceptation et conservez les détails utiles avant conversion.",
      "Wandelt das angenommene Serviceangebot in einen Auftrag um. Das Angebot wird gelöscht, der Auftrag erhält den Status Ausstehend und Reparaturstatus werden zurückgesetzt. Sichern Sie benötigte Angebotsdaten vorher.",
      "Convierte la oferta de servicio aceptada en pedido. Se elimina la oferta, se crea el pedido Pendiente y se restablecen estados de reparación. Confirma aceptación y conserva los datos necesarios antes.",
      "Konverterer det accepterede servicetilbud til en serviceordre. Tilbuddet slettes, ordren oprettes som Afventer, og reparationsstatus nulstilles. Bekræft accept og gem nødvendige tilbudsoplysninger først.",
      "Muuntaa hyväksytyn palvelutarjouksen palvelutilaukseksi. Tarjous poistetaan, tilauksen tilaksi tulee Odottaa ja korjaustilat palautuvat alkutilaan. Varmista hyväksyntä ja säilytä tarvittavat tiedot.",
      "Konverterer det aksepterte servicetilbudet til en serviceordre. Tilbudet slettes, ordren får status Avventer og reparasjonsstatus nullstilles. Bekreft aksept og ta vare på nødvendige tilbudsdata først."
    ],
    "Services.SelectServiceOrderCustomer": [
      "Väljer kunden för serviceordern och fyller normalt relaterade kunduppgifter enligt kundkortet. Kontrollera faktureringskund, serviceadress, kontakt och valuta innan serviceartiklar och arbetsrader registreras.",
      "Selects the service-order customer and normally populates related customer details from the customer card. Check bill-to customer, service address, contact, and currency before adding service lines.",
      "Sélectionne le client et renseigne normalement les données associées. Vérifiez client à facturer, adresse de service, contact et devise avant d’ajouter les lignes.",
      "Wählt den Kunden des Serviceauftrags und übernimmt üblicherweise zugehörige Kundendaten. Prüfen Sie Rechnungskunde, Serviceadresse, Kontakt und Währung.",
      "Selecciona el cliente y normalmente completa datos relacionados. Comprueba cliente de facturación, dirección de servicio, contacto y moneda antes de añadir líneas.",
      "Vælger kunden til serviceordren og udfylder normalt relaterede kundeoplysninger. Kontrollér fakturakunde, serviceadresse, kontakt og valuta før servicelinjer tilføjes.",
      "Valitsee palvelutilauksen asiakkaan ja täydentää yleensä asiakaskortin tiedot. Tarkista laskutusasiakas, palveluosoite, yhteyshenkilö ja valuutta ennen rivien lisäystä.",
      "Velger kunde for serviceordren og fyller vanligvis inn relaterte kundeopplysninger. Kontroller fakturakunde, serviceadresse, kontakt og valuta før servicelinjer legges til."
    ]
  };
  const warehouseSpecific = {
    "Warehouse.ViewAvailabilityByEvent": [
      "Visar hur lagersaldot för artikeln beräknas förändras vid planerade inleveranser och utleveranser. Granska varje händelsedatum och efterfråge-/försörjningsrad för att förstå när lagret riskerar att ta slut.",
      "Shows how projected inventory changes at scheduled receipt and shipment events. Review event dates and demand/supply lines to see when stock may run short.",
      "Affiche l’évolution du stock selon les réceptions et expéditions planifiées. Examinez dates et lignes de demande/offre pour repérer les ruptures possibles.",
      "Zeigt den prognostizierten Bestand nach geplanten Ein- und Ausgängen. Prüfen Sie Ereignisdaten sowie Bedarfs- und Zugangszeilen.",
      "Muestra la evolución prevista del inventario según recepciones y envíos programados. Revisa fechas y demanda/suministro para detectar faltantes.",
      "Viser forventet lagerudvikling ved planlagte modtagelser og leveringer. Gennemgå datoer og behov/tilgang for at se risiko for mangel.",
      "Näyttää varastosaldon kehityksen suunniteltujen vastaanotto- ja toimitustapahtumien mukaan. Tarkista päivät sekä kysyntä- ja tarjontarivit.",
      "Viser forventet lagerutvikling ved planlagte mottak og leveranser. Se gjennom datoer og behov/tilgang for å oppdage mulig mangel."
    ],
    "Warehouse.ViewAvailabilityByPeriod": [
      "Sammanfattar artikelns tillgänglighet per vald tidsperiod, exempelvis dag, vecka eller kvartal. Kontrollera periodindelning och lagerställe; summeringen kan dölja enskilda datum där efterfrågan överstiger tillgången.",
      "Summarizes item availability by the selected time bucket, such as day, week, or quarter. Check the period grouping and location; totals can hide dates when demand exceeds supply.",
      "Récapitule la disponibilité par période choisie (jour, semaine, trimestre). Vérifiez regroupement et emplacement ; les totaux peuvent masquer une pénurie à une date précise.",
      "Fasst Artikelverfügbarkeit nach ausgewähltem Zeitraum zusammen. Prüfen Sie Gruppierung und Lagerort; Summen können einzelne Fehltermine verdecken.",
      "Resume disponibilidad por período seleccionado. Comprueba agrupación y ubicación; los totales pueden ocultar faltantes en fechas concretas.",
      "Opsummerer varens tilgængelighed pr. valgt periode. Kontrollér periode og lokation; totaler kan skjule mangel på enkelte datoer.",
      "Kokoaa nimikkeen saatavuuden valitun jakson mukaan. Tarkista jaksotus ja sijainti; summat voivat peittää yksittäisten päivien puutteet.",
      "Oppsummerer varetilgjengelighet per valgt periode. Kontroller periodisering og lokasjon; totaler kan skjule mangel på bestemte datoer."
    ],
    "Warehouse.ViewAvailabilityByLocation": [
      "Visar artikelns disponibla kvantitet uppdelad per lagerställe. Jämför rätt lagerställen och ta hänsyn till reservationer och planerade flöden innan du drar slutsatser om var artikeln kan plockas.",
      "Shows the item's available quantity split by location. Compare the relevant locations and consider reservations and planned flows before deciding where it can be picked.",
      "Affiche la quantité disponible par emplacement. Comparez les sites pertinents et tenez compte des réservations et flux prévus avant de décider où prélever.",
      "Zeigt die verfügbare Artikelmenge je Lagerort. Berücksichtigen Sie relevante Lagerorte, Reservierungen und geplante Flüsse vor einer Entnahmeentscheidung.",
      "Muestra la cantidad disponible por ubicación. Considera ubicaciones pertinentes, reservas y flujos previstos antes de decidir desde dónde recoger.",
      "Viser disponibelt antal pr. lokation. Sammenlign relevante lokationer, og medregn reservationer og planlagte bevægelser før plukvalg.",
      "Näyttää nimikkeen saatavuuden varastopaikoittain. Huomioi varaukset ja suunnitellut tapahtumat ennen poimintapaikan valintaa.",
      "Viser tilgjengelig antall per lokasjon. Ta hensyn til reservasjoner og planlagte bevegelser før du velger plukksted."
    ],
    "Warehouse.ViewItemsByLocation": [
      "Öppnar listan över artiklar på lagerställen för jämförelse av innehav och tillgänglighet. Kontrollera lagerställe, artikel och eventuella varianter eller partier; listan ändrar inte lagerstatus.",
      "Opens the items-by-location list to compare holdings and availability. Check location, item, and any variants or lots; viewing the list does not change inventory.",
      "Ouvre la liste des articles par emplacement pour comparer les stocks. Vérifiez emplacement, article, variantes ou lots ; la consultation ne modifie pas le stock.",
      "Öffnet die Artikelliste je Lagerort zum Bestandsvergleich. Prüfen Sie Lagerort, Artikel, Varianten und Lose; die Anzeige ändert keinen Bestand.",
      "Abre la lista de productos por ubicación para comparar existencias. Comprueba ubicación, producto, variantes y lotes; la consulta no modifica inventario.",
      "Åbner listen over varer pr. lokation til sammenligning af beholdning. Kontrollér lokation, vare, varianter og partier; visningen ændrer ikke lageret.",
      "Avaa nimikkeet varastopaikoittain -luettelon saldojen vertailuun. Tarkista sijainti, nimike, variantit ja erät; näkymä ei muuta varastoa.",
      "Åpner listen over varer per lokasjon for å sammenligne beholdning. Kontroller lokasjon, vare, varianter og partier; visningen endrer ikke lageret."
    ],
    "Warehouse.ViewAvailabilityByBOMLevel": [
      "Visar artikelns tillgänglighet uppdelad efter nivå i stycklistan. Använd vyn för att hitta vilken komponentnivå som begränsar en sammansatt produkt; kontrollera aktuell stycklista och komponentbehov.",
      "Shows item availability by bill-of-material level. Use it to identify which component level constrains an assembled product; verify the current BOM and component demand.",
      "Affiche la disponibilité par niveau de nomenclature. Repérez le composant limitant le produit assemblé et vérifiez nomenclature et besoins.",
      "Zeigt Verfügbarkeit nach Stücklistenebene. Ermitteln Sie den begrenzenden Komponentenbedarf und prüfen Sie die aktuelle Stückliste.",
      "Muestra disponibilidad por nivel de lista de materiales. Identifica el componente limitante y comprueba la lista y sus necesidades.",
      "Viser tilgængelighed pr. stykliste-niveau. Find den begrænsende komponent, og kontrollér aktuel stykliste og behov.",
      "Näyttää saatavuuden tuoterakennetasoittain. Tunnista lopputuotetta rajoittava komponentti ja tarkista ajantasainen rakenne ja tarve.",
      "Viser tilgjengelighet etter stykklistenivå. Finn komponenten som begrenser produktet, og kontroller gjeldende stykklist og behov."
    ],
    "Warehouse.ViewAvailabilityByVariant": [
      "Visar tillgänglighet separat per artikelvariant. Kontrollera variantkod och lagerställe så att saldo för en storlek, färg eller annan variant inte blandas ihop med en annan variant.",
      "Shows availability separately for each item variant. Check the variant code and location so stock for one size, color, or other variant is not confused with another.",
      "Affiche la disponibilité par variante. Vérifiez code variante et emplacement pour ne pas confondre les stocks de tailles, couleurs ou options différentes.",
      "Zeigt Verfügbarkeit je Artikelvariante. Prüfen Sie Variantencode und Lagerort, damit Bestände verschiedener Ausführungen nicht verwechselt werden.",
      "Muestra disponibilidad por variante. Comprueba código y ubicación para no mezclar existencias de tamaños, colores u opciones distintas.",
      "Viser tilgængelighed pr. variant. Kontrollér variantkode og lokation, så beholdning for forskellige varianter ikke forveksles.",
      "Näyttää saatavuuden varianttikohtaisesti. Tarkista varianttikoodi ja sijainti, jotta eri koko-, väri- tai muita varianttisaldoja ei sekoiteta.",
      "Viser tilgjengelighet per variant. Kontroller variantkode og lokasjon slik at beholdning for ulike varianter ikke blandes."
    ]
  };
  const warehouseExecutionSpecific = {
    "Warehouse.CreatePick": [
      "Skapar plock- eller införselrader från det valda källdokumentet enligt lagerställets flöde. Kontrollera källa, artikel, lagerplats och föreslagna kvantiteter; skapandet förbereder lagerarbetet men registrerar inte vad som faktiskt flyttats.",
      "Creates pick or put-away lines from the selected source document according to the location's warehouse flow. Check source, item, bins, and suggested quantities; creating the activity does not confirm what was physically moved.",
      "Crée des lignes de prélèvement ou de rangement depuis le document source selon le flux de l’emplacement. Vérifiez source, article, emplacements et quantités ; la création ne confirme pas le mouvement physique.",
      "Erstellt Kommissionier- oder Einlagerungszeilen aus dem Quelldokument gemäß Lagerprozess. Prüfen Sie Quelle, Artikel, Lagerplätze und Mengen; die Erstellung bestätigt noch keine physische Bewegung.",
      "Crea líneas de picking o ubicación desde el documento origen según el flujo del almacén. Comprueba origen, producto, ubicaciones y cantidades; la creación no confirma el movimiento físico.",
      "Opretter pluk- eller læg-på-lagerlinjer fra kildedokumentet efter lagerstedets flow. Kontrollér kilde, vare, placeringer og antal; oprettelsen bekræfter ikke den fysiske flytning.",
      "Luo poiminta- tai hyllytysrivit lähdeasiakirjasta varaston työnkulun mukaan. Tarkista lähde, nimike, hyllypaikat ja määrät; luonti ei vahvista fyysistä siirtoa.",
      "Oppretter plukk- eller lagerplasseringlinjer fra kildedokumentet etter lagerflyten. Kontroller kilde, vare, lagerplasser og mengder; opprettingen bekrefter ikke den fysiske flyttingen."
    ],
    "Warehouse.RegisterPick": [
      "Registrerar de kvantiteter som faktiskt har plockats och placerats vid utleveringsplatsen. Kontrollera hanterade antal och eventuella restkvantiteter; för en lagerutleverans är registreringen av plocket separat från att bokföra själva leveransen.",
      "Confirms the quantities physically picked and placed in the shipping area. Check handled and remaining quantities; for a warehouse shipment, registering the pick is separate from posting the shipment itself.",
      "Confirme les quantités réellement prélevées et déposées en zone d’expédition. Vérifiez quantités traitées et restantes ; pour une expédition entrepôt, l’enregistrement du prélèvement est distinct de la comptabilisation de l’expédition.",
      "Bestätigt die tatsächlich kommissionierten und im Versandbereich bereitgestellten Mengen. Prüfen Sie erledigte und offene Mengen; bei einer Lagerauslieferung ist die Registrierung vom Buchen der Lieferung getrennt.",
      "Confirma las cantidades recogidas y colocadas en la zona de envío. Comprueba cantidades gestionadas y pendientes; en un envío de almacén, registrar el picking es distinto de registrar el envío.",
      "Bekræfter de faktisk plukkede mængder, der er placeret i forsendelsesområdet. Kontrollér håndterede og resterende antal; ved lagerforsendelse er registrering af pluk adskilt fra bogføring af forsendelsen.",
      "Vahvistaa fyysisesti poimitut ja lähetysalueelle siirretyt määrät. Tarkista käsitellyt ja jäljellä olevat määrät; varastolähetyksessä poiminnan rekisteröinti on erillinen lähetyksen kirjauksesta.",
      "Bekrefter mengdene som faktisk er plukket og plassert i forsendelsesområdet. Kontroller håndtert og gjenstående mengde; for en lagerforsendelse er registrering av plukket separat fra bokføring av selve forsendelsen."
    ],
    "Warehouse.PostInventoryPick": [
      "Bokför lagerplocket mot källdokumentet och genomför de lagertransaktioner som följer av lagerställets konfiguration. Vid interna projekt- eller produktionsplock kan även förbrukning bokföras. Kontrollera källdokument, artikelspårning, lagerställe och antal samt efterföljande poster.",
      "Posts the inventory pick against its source document and applies the inventory transactions defined by the location setup. For internal project or production picks, consumption can also be posted. Check the source, item tracking, location, and quantities, then review the resulting entries.",
      "Comptabilise le prélèvement stock sur le document source et applique les mouvements prévus par la configuration. Pour un prélèvement interne de projet ou de production, la consommation peut aussi être comptabilisée. Vérifiez source, suivi, emplacement et quantités, puis les écritures.",
      "Bucht das Lagerpick gegen das Quelldokument und führt die gemäß Lagerkonfiguration vorgesehenen Lagertransaktionen aus. Bei internen Projekt- oder Fertigungspicks kann auch Verbrauch gebucht werden. Prüfen Sie Quelle, Tracking, Lagerort und Mengen sowie die resultierenden Posten.",
      "Registra el picking de inventario contra el documento origen y aplica los movimientos definidos por la configuración. En picks internos de proyecto o producción también puede registrarse el consumo. Comprueba origen, seguimiento, ubicación y cantidades; revisa los movimientos resultantes.",
      "Bogfører lagerplukket mod kildedokumentet og udfører de lagertransaktioner, som opsætningen bestemmer. Ved interne projekt- eller produktionspluk kan forbrug også blive bogført. Kontrollér kilde, sporing, placering og antal samt de efterfølgende poster.",
      "Kirjaa varastopoiminnan lähdeasiakirjalle ja toteuttaa varastoasetusten mukaiset tapahtumat. Projektin tai tuotannon sisäisessä poiminnassa myös kulutus voidaan kirjata. Tarkista lähde, seuranta, sijainti ja määrät sekä syntyneet tapahtumat.",
      "Bokfører lagerplukket mot kildedokumentet og utfører lagertransaksjonene som følger av oppsettet. Ved interne prosjekt- eller produksjonsplukk kan forbruk også bokføres. Kontroller kilde, sporing, lokasjon og mengder, og se gjennom postene etterpå."
    ],
    "Warehouse.RegisterPutAway": [
      "Registrerar att mottagna artiklar är placerade på angivna lagerplatser och uppdaterar lagerplatsrörelserna. Kontrollera från- och tillplats, hanterad kvantitet och artikelspårning; separat mottagningsbokföring kan fortfarande krävas beroende på lagerflödet.",
      "Confirms received items have been placed in the specified bins and updates warehouse movements. Check source and destination bins, handled quantity, and item tracking; receipt posting can still be a separate step depending on the warehouse flow.",
      "Confirme le rangement des articles reçus dans les emplacements indiqués et met à jour les mouvements entre emplacements. Vérifiez origine, destination, quantité et suivi ; la comptabilisation de la réception peut rester une étape distincte selon le flux.",
      "Bestätigt die Einlagerung empfangener Artikel in den angegebenen Lagerplätzen und aktualisiert Lagerbewegungen. Prüfen Sie Quell- und Ziellagerplatz, Menge und Tracking; je nach Lagerprozess kann die Wareneingangsbuchung separat bleiben.",
      "Confirma que los productos recibidos se han colocado en las ubicaciones indicadas y actualiza los movimientos de almacén. Comprueba origen, destino, cantidad y seguimiento; según el flujo, el registro de la recepción puede ser un paso separado.",
      "Bekræfter, at modtagne varer er placeret på de angivne placeringer, og opdaterer lagerbevægelserne. Kontrollér fra-/tilplacering, antal og sporing; bogføring af modtagelsen kan stadig være separat afhængigt af flowet.",
      "Vahvistaa vastaanotettujen nimikkeiden hyllytyksen määritettyihin paikkoihin ja päivittää varastosiirrot. Tarkista lähtö- ja kohdepaikka, määrä ja seuranta; vastaanoton kirjaus voi työnkulusta riippuen olla erillinen vaihe.",
      "Bekrefter at mottatte varer er plassert på angitte lagerplasser og oppdaterer lagerbevegelsene. Kontroller fra-/tilplassering, mengde og sporing; mottaksbokføring kan fortsatt være et eget trinn avhengig av lagerflyten."
    ]
  };
  const manufacturingSpecific = {
    "Manufacturing.RefreshProductionOrder": [
      "Uppdaterar produktionsorderns komponent- och operationsrader utifrån orderhuvudet, stycklistan och rutten. Befintliga rader kan räknas om och manuella ändringar påverkas; kontrollera parametrarna och jämför raderna före och efter uppdateringen.",
      "Refreshes the production order's component and routing lines from its header, BOM, and routing. Existing lines can be recalculated and manual changes may be affected; check the options and compare the lines before and after refreshing.",
      "Actualise les lignes de composants et d’opérations de l’ordre selon son en-tête, sa nomenclature et sa gamme. Les lignes existantes peuvent être recalculées et les modifications manuelles affectées ; vérifiez les options et comparez les lignes avant et après.",
      "Aktualisiert Komponenten- und Arbeitsplanzeilen des Fertigungsauftrags anhand von Kopf, Stückliste und Arbeitsplan. Bestehende Zeilen können neu berechnet und manuelle Änderungen betroffen sein; prüfen Sie die Optionen und vergleichen Sie die Zeilen vorher und nachher.",
      "Actualiza las líneas de componentes y ruta de la orden según la cabecera, la lista de materiales y la ruta. Puede recalcular líneas existentes y afectar cambios manuales; revisa las opciones y compara las líneas antes y después.",
      "Opdaterer produktionsordrens komponent- og rutelinjer ud fra hoved, stykliste og rute. Eksisterende linjer kan blive genberegnet, og manuelle ændringer kan blive påvirket; kontrollér indstillingerne og sammenlign linjerne før og efter.",
      "Päivittää tuotantotilauksen komponentti- ja reititysrivit otsikon, tuoterakenteen ja reitityksen perusteella. Olemassa olevat rivit voidaan laskea uudelleen, mikä voi vaikuttaa käsin tehtyihin muutoksiin; tarkista asetukset ja vertaa rivejä ennen ja jälkeen.",
      "Oppdaterer produksjonsordrens komponent- og rutelinjer ut fra hodet, stykklisten og ruten. Eksisterende linjer kan beregnes på nytt, og manuelle endringer kan påvirkes; kontroller alternativene og sammenlign linjene før og etter."
    ],
    "Manufacturing.ReplanProductionOrder": [
      "Planerar om produktionsordern efter ändrade behov eller planeringsdata. Åtgärden kan ändra datum och komponentbehov och, beroende på planeringsnivå, skapa underordrar för tillverkade komponenter. Kontrollera planeringsparametrarna och granska orderförslag och datum innan du accepterar planen.",
      "Replans the production order after changes to demand or planning data. It can change dates and component demand and, depending on the planning level, create subordinate orders for manufactured components. Check the planning parameters and review order suggestions and dates before accepting the plan.",
      "Replanifie l’ordre après une modification des besoins ou des données de planification. Cela peut modifier les dates et les besoins en composants et, selon le niveau, créer des ordres subordonnés pour les composants fabriqués. Vérifiez les paramètres et les propositions avant d’accepter le plan.",
      "Plant den Fertigungsauftrag nach Änderungen an Bedarf oder Planungsdaten neu. Dabei können Termine und Komponentenbedarf geändert sowie je nach Planungsebene Unteraufträge für gefertigte Komponenten erstellt werden. Prüfen Sie Parameter, Auftragsvorschläge und Termine, bevor Sie den Plan übernehmen.",
      "Replanifica la orden tras cambios en la demanda o los datos de planificación. Puede cambiar fechas y necesidades de componentes y, según el nivel, crear órdenes subordinadas para componentes fabricados. Revisa parámetros, propuestas y fechas antes de aceptar el plan.",
      "Omplanlægger produktionsordren efter ændringer i behov eller planlægningsdata. Det kan ændre datoer og komponentbehov og, afhængigt af planlægningsniveauet, oprette underordrer for fremstillede komponenter. Kontrollér parametre, ordreforslag og datoer før planen accepteres.",
      "Suunnittelee tuotantotilauksen uudelleen tarpeen tai suunnittelutietojen muututtua. Se voi muuttaa päivämääriä ja komponenttitarpeita sekä luoda valmistettaville komponenteille alemman tason tilauksia suunnittelutason mukaan. Tarkista parametrit, ehdotukset ja päivämäärät ennen suunnitelman hyväksymistä.",
      "Planlegger produksjonsordren på nytt etter endringer i behov eller planleggingsdata. Det kan endre datoer og komponentbehov og, avhengig av nivå, opprette underordrer for produserte komponenter. Kontroller parametere, ordreforslag og datoer før planen godtas."
    ],
    "Manufacturing.EnterConsumptionQuantity": [
      "Registrerar faktisk förbrukad komponentkvantitet på produktionsjournalraden. Det är en journaluppgift; lagerrörelsen skapas först när journalen bokförs. Kontrollera produktionsorder, komponent, enhet, lagerställe och eventuell spårning innan bokföring.",
      "Records the actual component quantity consumed on the production journal line. This enters a journal value; the inventory transaction is created only when the journal is posted. Check the production order, component, unit, location, and any tracking before posting.",
      "Saisit la quantité réelle de composant consommée sur la ligne du journal de production. Il s’agit d’une valeur de journal ; le mouvement de stock n’est créé qu’à la comptabilisation. Vérifiez l’ordre, le composant, l’unité, l’emplacement et le suivi avant de comptabiliser.",
      "Erfasst die tatsächlich verbrauchte Komponentenmenge in der Fertigungsbuchblattzeile. Dies ist zunächst ein Buchblattwert; der Lagerposten entsteht erst beim Buchen des Buchblatts. Prüfen Sie Auftrag, Komponente, Einheit, Lagerort und Rückverfolgung.",
      "Registra la cantidad real de componente consumida en la línea del diario de producción. Es un dato del diario; el movimiento de inventario se crea al registrar el diario. Comprueba orden, componente, unidad, ubicación y seguimiento antes de registrar.",
      "Registrerer den faktisk forbrugte komponentmængde på produktionskladdeposten. Det er en kladdelinje; lagerposten oprettes først, når kladden bogføres. Kontrollér ordre, komponent, enhed, placering og eventuel sporing før bogføring.",
      "Kirjaa toteutuneen komponenttikulutuksen tuotantopäiväkirjan riville. Kyse on päiväkirjamerkinnästä; varastotapahtuma syntyy vasta päiväkirjaa kirjattaessa. Tarkista tilaus, komponentti, yksikkö, sijainti ja seuranta ennen kirjausta.",
      "Registrerer faktisk forbrukt komponentmengde på produksjonskladdlinjen. Dette er en kladdverdi; lagerposten opprettes først når kladden bokføres. Kontroller ordre, komponent, enhet, lokasjon og eventuell sporing før bokføring."
    ],
    "Manufacturing.EnterOutputQuantity": [
      "Registrerar producerad kvantitet på produktionsjournalraden. Uppgiften blir inte ett bokfört artikelutflöde förrän journalen bokförs. Kontrollera produktionsorder, kvantitet, datum, lagerställe och eventuell parti- eller serienummerspårning.",
      "Records the produced quantity on the production journal line. It does not become posted item output until the journal is posted. Check the production order, quantity, date, location, and any lot or serial tracking.",
      "Saisit la quantité produite sur la ligne du journal de production. Elle ne devient une sortie article comptabilisée qu’après la comptabilisation du journal. Vérifiez l’ordre, la quantité, la date, l’emplacement et le suivi des lots ou numéros de série.",
      "Erfasst die produzierte Menge in der Fertigungsbuchblattzeile. Ein gebuchter Artikelzugang entsteht erst beim Buchen des Buchblatts. Prüfen Sie Fertigungsauftrag, Menge, Datum, Lagerort und Chargen- oder Seriennummernverfolgung.",
      "Registra la cantidad producida en la línea del diario de producción. No se convierte en una salida de producto registrada hasta contabilizar el diario. Comprueba orden, cantidad, fecha, ubicación y seguimiento de lotes o números de serie.",
      "Registrerer den producerede mængde på produktionskladdeposten. Varetilgangen bliver først bogført, når kladden bogføres. Kontrollér ordre, antal, dato, placering og eventuel parti- eller serienummersporing.",
      "Kirjaa tuotetun määrän tuotantopäiväkirjan riville. Kirjattu tuotos syntyy vasta päiväkirjan kirjauksessa. Tarkista tuotantotilaus, määrä, päivämäärä, sijainti sekä mahdollinen erä- tai sarjanumeroseuranta.",
      "Registrerer produsert mengde på produksjonskladdlinjen. Varetilgangen blir ikke bokført før kladden bokføres. Kontroller ordre, mengde, dato, lokasjon og eventuell parti- eller serienummersporing."
    ],
    "Manufacturing.ChangeStatus": [
      "Ändrar status på produktionsordern enligt vald övergång. Statusen styr vilka produktionsåtgärder som kan utföras och vilket underlag som uppdateras; kontrollera order, målläge och bekräftelsen för varje order innan fortsättning.",
      "Changes the production order status using the selected transition. Status controls which production actions are available and which data is updated; verify the order, target status, and each confirmation.",
      "Modifie le statut de l’ordre de fabrication selon la transition choisie. Le statut détermine les actions disponibles ; vérifiez ordre, statut cible et confirmations.",
      "Ändert den Status des Fertigungsauftrags gemäß Übergang. Der Status steuert verfügbare Aktionen und aktualisierte Daten; prüfen Sie Auftrag, Zielstatus und Bestätigung.",
      "Cambia el estado de la orden de producción según la transición. El estado determina acciones disponibles; comprueba orden, estado objetivo y confirmación.",
      "Ændrer produktionsordrens status efter valgt overgang. Status styrer mulige handlinger; kontrollér ordre, målstatus og bekræftelse for hver ordre.",
      "Muuttaa tuotantotilauksen tilan valitun siirtymän mukaan. Tila ohjaa käytettävissä olevia toimintoja; tarkista tilaus, tavoitetila ja vahvistus.",
      "Endrer produksjonsordrens status etter valgt overgang. Statusen styrer tilgjengelige handlinger; kontroller ordre, målstatus og bekreftelse."
    ],
    "Manufacturing.PostProductionJournal": [
      "Bokför produktionsjournalens valda komponentförbrukning och/eller färdigrapportering. Kontrollera produktionsorder, komponenter, utflöde, kvantiteter, lagerställe och spårningspartier; verifiera förbruknings-, artikel- och kapacitetsposter efteråt.",
      "Posts selected component consumption and/or output from the production journal. Check the production order, components, output, quantities, location, and tracked lots; verify consumption, item, and capacity entries afterward.",
      "Comptabilise la consommation des composants et/ou la sortie du journal de production. Vérifiez ordre, composants, quantités, emplacement et lots, puis contrôlez les écritures de consommation, article et capacité.",
      "Bucht ausgewählten Komponentenverbrauch und/oder Ausstoß aus dem Fertigungsjournal. Prüfen Sie Auftrag, Komponenten, Mengen, Lagerort und Lose; kontrollieren Sie Verbrauchs-, Artikel- und Kapazitätsposten.",
      "Registra consumo de componentes y/o producción del diario. Comprueba orden, componentes, cantidades, ubicación y lotes; verifica movimientos resultantes.",
      "Bogfører valgt komponentforbrug og/eller output fra produktionskladden. Kontrollér ordre, komponenter, antal, placering og partier; verificér forbrugs- og kapacitetsposter.",
      "Kirjaa tuotantopäiväkirjan valitun komponenttikulutuksen ja/tai tuotoksen. Tarkista tilaus, komponentit, määrät, sijainti ja erät sekä syntyneet tapahtumat.",
      "Bokfører valgt komponentforbruk og/eller produksjonsresultat fra produksjonskladden. Kontroller ordre, komponenter, mengder, plassering og partier; verifiser postene etterpå."
    ]
  };
  const qualitySpecific = {
    "QualityManagement.CreateInspectionTemplate": "qualityTemplate",
    "QualityManagement.CreateTestDefinition": "qualityTest",
    "QualityManagement.CopyInspectionTemplate": "qualityCopyTemplate",
    "QualityManagement.CreateManualInspectionFromTemplate": "qualityManualInspection",
    "QualityManagement.CreateInspectionFromSourceLine": "qualitySourceInspection",
    "QualityManagement.ScheduleInspections": "qualityScheduleConfirm",
    "QualityManagement.CreatePurchaseReturnFromFailedInspection": "qualityPurchaseReturn",
    "QualityManagement.BlockLotInWorkflow": "qualityBlockLot",
    "QualityManagement.UnblockLotOnPassInWorkflow": "qualityUnblockLot",
    "QualityManagement.FinishPurchaseReceiptInspection": "qualityFinishInspection",
    "QualityManagement.ScheduleTimeBasedInspections": "qualityScheduleRule",
    "QualityManagement.CreateInspectionResult": "qualityResult",
    "QualityManagement.PostProductionOutputWithInspection": "qualityPostOutput",
    "QualityManagement.ShowPurchaseOrderInspections": "qualityShowInspections",
    "QualityManagement.MoveFailedInspectionInventory": "qualityMoveFailed",
    "QualityManagement.CreateNegativeAdjustmentFromInspection": "qualityNegativeAdjustment",
    "QualityManagement.ChangeTrackingFromInspection": "qualityChangeTracking",
    "QualityManagement.CreateInspectionFromTrackingLine": "qualityTrackingInspection"
  };
  const qualityText = {
    qualityTemplate: {
      "sv-SE": "Skapar en inspektionsmall. Mallen beskriver vilka tester som kan ingå; den utför inte en inspektion. Kontrollera mallens tester, ordning och giltighet innan den används.",
      "en-US": "Creates an inspection template. The template defines which tests can be included; it does not perform an inspection. Check its tests, sequence, and validity before use.",
      "fr-FR": "Crée un modèle d’inspection. Il définit les tests pouvant être inclus, mais n’effectue pas l’inspection. Vérifiez les tests, leur ordre et la validité du modèle avant de l’utiliser.",
      "de-DE": "Erstellt eine Prüfvorlage. Sie legt mögliche Tests fest, führt aber keine Prüfung durch. Prüfen Sie Tests, Reihenfolge und Gültigkeit der Vorlage vor ihrer Verwendung.",
      "es-ES": "Crea una plantilla de inspección. Define qué pruebas pueden incluirse, pero no realiza una inspección. Comprueba las pruebas, su orden y la vigencia de la plantilla antes de usarla.",
      "da-DK": "Opretter en inspektionsskabelon. Skabelonen definerer mulige test, men udfører ikke en inspektion. Kontrollér test, rækkefølge og skabelonens gyldighed før brug.",
      "fi-FI": "Luo tarkastusmallin. Malli määrittää siihen sisällytettävät testit, mutta ei suorita tarkastusta. Tarkista testit, niiden järjestys ja mallin voimassaolo ennen käyttöä.",
      "nb-NO": "Oppretter en inspeksjonsmal. Malen definerer hvilke tester som kan inngå, men utfører ikke en inspeksjon. Kontroller testene, rekkefølgen og malens gyldighet før bruk."
    },
    qualityTest: {
      "sv-SE": "Skapar en testdefinition som kan användas i inspektionsmallar. Den registrerar inte ett testresultat för en artikel eller ett parti. Kontrollera testets metod, enhet och godkända gränser.",
      "en-US": "Creates a test definition that can be used in inspection templates. It does not record a test result for an item or lot. Check the method, unit, and acceptable limits.",
      "fr-FR": "Crée une définition de test utilisable dans les modèles d’inspection. Elle n’enregistre pas de résultat pour un article ou un lot. Vérifiez la méthode, l’unité et les limites acceptables.",
      "de-DE": "Erstellt eine Testdefinition für Prüfvorlagen. Sie erfasst kein Prüfergebnis für einen Artikel oder ein Los. Prüfen Sie Methode, Einheit und zulässige Grenzwerte.",
      "es-ES": "Crea una definición de prueba que puede usarse en plantillas de inspección. No registra un resultado para un producto o lote. Comprueba el método, la unidad y los límites aceptables.",
      "da-DK": "Opretter en testdefinition, der kan bruges i inspektionsskabeloner. Den registrerer ikke et testresultat for en vare eller et parti. Kontrollér metode, enhed og tilladte grænser.",
      "fi-FI": "Luo testimäärityksen, jota voidaan käyttää tarkastusmalleissa. Se ei tallenna tuotteen tai erän testitulosta. Tarkista menetelmä, yksikkö ja hyväksyttävät raja-arvot.",
      "nb-NO": "Oppretter en testdefinisjon som kan brukes i inspeksjonsmaler. Den registrerer ikke et testresultat for en vare eller et parti. Kontroller metode, enhet og tillatte grenser."
    },
    qualityCopyTemplate: {
      "sv-SE": "Kopierar testuppsättningen från en befintlig inspektionsmall till en ny mall. Kontrollera att kopierade tester och gränsvärden passar den nya artikeln eller processen innan mallen används.",
      "en-US": "Copies the test setup from an existing inspection template to a new template. Check that the copied tests and limits fit the new item or process before using it.",
      "fr-FR": "Copie la configuration des tests d’un modèle d’inspection existant vers un nouveau modèle. Vérifiez que les tests et limites copiés conviennent au nouvel article ou processus.",
      "de-DE": "Kopiert die Testeinrichtung einer vorhandenen Prüfvorlage in eine neue Vorlage. Prüfen Sie, ob Tests und Grenzwerte zum neuen Artikel oder Prozess passen.",
      "es-ES": "Copia la configuración de pruebas de una plantilla de inspección existente a otra nueva. Comprueba que las pruebas y límites copiados sean adecuados para el nuevo producto o proceso.",
      "da-DK": "Kopierer testopsætningen fra en eksisterende inspektionsskabelon til en ny. Kontrollér, at de kopierede test og grænser passer til den nye vare eller proces.",
      "fi-FI": "Kopioi testiasetukset aiemmasta tarkastusmallista uuteen malliin. Tarkista, että kopioidut testit ja raja-arvot sopivat uudelle nimikkeelle tai prosessille.",
      "nb-NO": "Kopierer testoppsettet fra en eksisterende inspeksjonsmal til en ny. Kontroller at de kopierte testene og grensene passer til den nye varen eller prosessen."
    },
    qualityManualInspection: {
      "sv-SE": "Skapar en inspektion från vald mall. Mallen kan fylla inspektionen med testpunkter, men resultaten måste registreras separat. Kontrollera artikel, parti och att rätt mall valts.",
      "en-US": "Creates an inspection from the selected template. The template can populate test lines, but results must be recorded separately. Check the item, lot, and selected template.",
      "fr-FR": "Crée une inspection à partir du modèle choisi. Celui-ci peut ajouter les lignes de test, mais les résultats doivent être saisis séparément. Vérifiez l’article, le lot et le modèle.",
      "de-DE": "Erstellt anhand der ausgewählten Vorlage eine Prüfung. Die Vorlage kann Testzeilen anlegen; Ergebnisse müssen separat erfasst werden. Prüfen Sie Artikel, Los und Vorlage.",
      "es-ES": "Crea una inspección a partir de la plantilla seleccionada. La plantilla puede generar líneas de prueba, pero los resultados deben registrarse por separado. Comprueba el producto, lote y plantilla.",
      "da-DK": "Opretter en inspektion ud fra den valgte skabelon. Skabelonen kan oprette testlinjer, men resultater skal registreres separat. Kontrollér vare, parti og skabelon.",
      "fi-FI": "Luo tarkastuksen valitun mallin perusteella. Malli voi lisätä testirivit, mutta tulokset kirjataan erikseen. Tarkista nimike, erä ja valittu malli.",
      "nb-NO": "Oppretter en inspeksjon fra den valgte malen. Malen kan opprette testlinjer, men resultater må registreres separat. Kontroller vare, parti og valgt mal."
    },
    qualitySourceInspection: {
      "sv-SE": "Skapar en inspektion med utgångspunkt i den valda källraden. Det skapar kontrollunderlaget, inte ett godkänt resultat. Kontrollera att artikel, dokumentrad och spårningsparti överensstämmer.",
      "en-US": "Creates an inspection from the selected source line. This creates the inspection record, not a passing result. Check that the item, document line, and tracked lot agree.",
      "fr-FR": "Crée une inspection à partir de la ligne source sélectionnée. Cela crée le dossier d’inspection, pas un résultat conforme. Vérifiez l’article, la ligne du document et le lot suivi.",
      "de-DE": "Erstellt eine Prüfung aus der ausgewählten Quellzeile. Dabei entsteht der Prüfvorgang, kein bestandenes Ergebnis. Prüfen Sie Artikel, Belegzeile und verfolgtes Los.",
      "es-ES": "Crea una inspección a partir de la línea de origen seleccionada. Esto crea el registro de inspección, no un resultado aprobado. Comprueba el producto, la línea y el lote seguido.",
      "da-DK": "Opretter en inspektion ud fra den valgte kildelinje. Det opretter inspektionsposten, ikke et bestået resultat. Kontrollér, at vare, dokumentlinje og sporet parti stemmer.",
      "fi-FI": "Luo tarkastuksen valitulta lähderiviltä. Tämä luo tarkastusasiakirjan, ei hyväksyttyä tulosta. Tarkista, että nimike, asiakirjarivi ja jäljitettävä erä täsmäävät.",
      "nb-NO": "Oppretter en inspeksjon fra den valgte kildelinjen. Dette oppretter inspeksjonen, ikke et bestått resultat. Kontroller at vare, dokumentlinje og sporet parti stemmer."
    },
    qualityScheduleConfirm: {
      "sv-SE": "Bekräftar att schemaläggningen ska skapa inspektioner enligt urvalet. Kontrollera att rätt artiklar och period ingår och granska de skapade inspektionerna innan de börjar användas.",
      "en-US": "Confirms scheduling inspections for the selected scope. Check that the correct items and period are included, then review the generated inspections before use.",
      "fr-FR": "Confirme la planification des inspections pour le périmètre choisi. Vérifiez les articles et la période, puis examinez les inspections générées avant leur utilisation.",
      "de-DE": "Bestätigt die Planung von Prüfungen für die ausgewählte Auswahl. Prüfen Sie Artikel und Zeitraum und kontrollieren Sie die erzeugten Prüfungen vor ihrer Verwendung.",
      "es-ES": "Confirma la programación de inspecciones para el ámbito seleccionado. Comprueba los productos y el periodo, y revisa las inspecciones generadas antes de usarlas.",
      "da-DK": "Bekræfter planlægning af inspektioner for det valgte omfang. Kontrollér varer og periode, og gennemgå de oprettede inspektioner før brug.",
      "fi-FI": "Vahvistaa tarkastusten ajoituksen valitulle rajaukselle. Tarkista nimikkeet ja ajanjakso sekä käy luodut tarkastukset läpi ennen käyttöä.",
      "nb-NO": "Bekrefter planlegging av inspeksjoner for det valgte omfanget. Kontroller varer og periode, og gjennomgå de opprettede inspeksjonene før bruk."
    },
    qualityPurchaseReturn: {
      "sv-SE": "Skapar ett inköpsreturunderlag från en underkänd inspektion. Det är inte samma sak som att bokföra returen eller skicka varan tillbaka. Kontrollera leverantör, artikel, parti, orsak och returantal.",
      "en-US": "Creates a purchase-return document from a failed inspection. This does not post the return or ship the item back. Check the vendor, item, lot, reason, and return quantity.",
      "fr-FR": "Crée un document de retour achat à partir d’une inspection échouée. Cela ne comptabilise pas le retour et ne renvoie pas l’article. Vérifiez fournisseur, article, lot, motif et quantité.",
      "de-DE": "Erstellt aus einer fehlgeschlagenen Prüfung einen Einkaufsrückgabebeleg. Die Rückgabe wird dadurch weder gebucht noch versandt. Prüfen Sie Lieferant, Artikel, Los, Grund und Menge.",
      "es-ES": "Crea un documento de devolución de compra a partir de una inspección fallida. No contabiliza la devolución ni envía el producto. Comprueba proveedor, producto, lote, motivo y cantidad.",
      "da-DK": "Opretter et købsreturdokument ud fra en ikke-bestået inspektion. Returen bogføres eller afsendes ikke af dette trin. Kontrollér leverandør, vare, parti, årsag og antal.",
      "fi-FI": "Luo ostotoimituksen palautusasiakirjan hylätystä tarkastuksesta. Tämä ei kirjaa palautusta eikä lähetä nimikettä takaisin. Tarkista toimittaja, nimike, erä, syy ja määrä.",
      "nb-NO": "Oppretter et kjøpsreturdokument fra en mislykket inspeksjon. Returen blir ikke bokført eller sendt tilbake av dette trinnet. Kontroller leverandør, vare, parti, årsak og antall."
    },
    qualityBlockLot: {
      "sv-SE": "Markerar det spårade partiet som blockerat i inspektionsflödet så att det inte används som vanligt lager. Kontrollera partinummer, blockstatus och vilka dokument som påverkas.",
      "en-US": "Marks the tracked lot as blocked in the inspection workflow so it is not used as ordinary inventory. Check the lot number, blocked status, and affected documents.",
      "fr-FR": "Marque le lot suivi comme bloqué dans le flux d’inspection afin qu’il ne soit pas utilisé comme stock normal. Vérifiez le numéro du lot, son statut et les documents concernés.",
      "de-DE": "Markiert das verfolgte Los im Prüfablauf als gesperrt, damit es nicht als normaler Bestand verwendet wird. Prüfen Sie Losnummer, Sperrstatus und betroffene Belege.",
      "es-ES": "Marca el lote seguido como bloqueado en el flujo de inspección para que no se use como inventario normal. Comprueba el número de lote, el estado y los documentos afectados.",
      "da-DK": "Markerer det sporede parti som spærret i inspektionsforløbet, så det ikke bruges som almindeligt lager. Kontrollér partinummer, spærring og berørte dokumenter.",
      "fi-FI": "Merkitsee jäljitettävän erän tarkastusprosessissa estetyksi, jotta sitä ei käytetä normaalina varastona. Tarkista eränumero, estotila ja vaikutuksen alaiset asiakirjat.",
      "nb-NO": "Markerer det sporede partiet som blokkert i inspeksjonsflyten slik at det ikke brukes som vanlig lager. Kontroller partinummer, blokkering og berørte dokumenter."
    },
    qualityUnblockLot: {
      "sv-SE": "Tar bort blockeringen från partiet när inspektionsflödet tillåter det. Kontrollera att inspektionen är godkänd, att rätt parti valts och att blockstatusen faktiskt ändrats.",
      "en-US": "Removes the lot block when the inspection workflow permits it. Verify that the inspection passed, the correct lot was selected, and its blocked status changed.",
      "fr-FR": "Retire le blocage du lot lorsque le flux d’inspection le permet. Vérifiez que l’inspection est conforme, que le bon lot est sélectionné et que son statut a changé.",
      "de-DE": "Hebt die Los-Sperre auf, sofern der Prüfablauf dies zulässt. Prüfen Sie das bestandene Prüfergebnis, das richtige Los und die geänderte Sperre.",
      "es-ES": "Quita el bloqueo del lote cuando el flujo de inspección lo permite. Verifica que la inspección sea aprobada, que se haya elegido el lote correcto y que cambie su estado.",
      "da-DK": "Fjerner spærringen af partiet, når inspektionsforløbet tillader det. Kontrollér, at inspektionen er bestået, det rigtige parti er valgt, og status er ændret.",
      "fi-FI": "Poistaa erän eston, kun tarkastusprosessi sallii sen. Varmista, että tarkastus hyväksyttiin, oikea erä valittiin ja estotila muuttui.",
      "nb-NO": "Fjerner blokkeringen av partiet når inspeksjonsflyten tillater det. Kontroller at inspeksjonen er bestått, riktig parti er valgt, og statusen er endret."
    },
    qualityFinishInspection: {
      "sv-SE": "Avslutar inköpsinspektionen. Kontrollera att samtliga testresultat är registrerade och att slutstatusen motsvarar utfallet innan du fortsätter med mottagning eller avvikelsehantering.",
      "en-US": "Finishes the purchase inspection. Check that all test results are recorded and the final status matches the outcome before continuing with receipt or nonconformance handling.",
      "fr-FR": "Termine l’inspection d’achat. Vérifiez que tous les résultats sont saisis et que le statut final correspond au résultat avant de poursuivre la réception ou le traitement des écarts.",
      "de-DE": "Schließt die Einkaufsprüfung ab. Prüfen Sie alle Testergebnisse und den passenden Endstatus, bevor Sie mit Wareneingang oder Abweichungsbearbeitung fortfahren.",
      "es-ES": "Finaliza la inspección de compra. Comprueba que todos los resultados estén registrados y que el estado final coincida antes de continuar con la recepción o las incidencias.",
      "da-DK": "Afslutter købsinspektionen. Kontrollér, at alle testresultater er registreret, og at slutstatus passer, før modtagelse eller afvigelseshåndtering fortsætter.",
      "fi-FI": "Päättää ostotarkastuksen. Tarkista, että kaikki testitulokset on kirjattu ja lopputila vastaa tulosta ennen vastaanoton tai poikkeamien käsittelyä.",
      "nb-NO": "Avslutter kjøpsinspeksjonen. Kontroller at alle testresultater er registrert, og at sluttstatusen stemmer før mottak eller avviksbehandling fortsetter."
    },
    qualityScheduleRule: {
      "sv-SE": "Lägger upp en tidsbaserad regel för framtida kvalitetsinspektioner. Regeln skapar inte nödvändigtvis en inspektion direkt. Kontrollera intervall, artikelurval och startdatum.",
      "en-US": "Sets up a time-based rule for future quality inspections. The rule may not create an inspection immediately. Check the interval, item scope, and start date.",
      "fr-FR": "Configure une règle basée sur le temps pour de futures inspections qualité. Elle ne crée pas nécessairement une inspection immédiatement. Vérifiez l’intervalle, les articles et la date de début.",
      "de-DE": "Richtet eine zeitbasierte Regel für künftige Qualitätsprüfungen ein. Sie erzeugt nicht unbedingt sofort eine Prüfung. Prüfen Sie Intervall, Artikelauswahl und Startdatum.",
      "es-ES": "Configura una regla basada en el tiempo para futuras inspecciones de calidad. Puede que no cree una inspección de inmediato. Comprueba el intervalo, los productos y la fecha inicial.",
      "da-DK": "Opretter en tidsbaseret regel for fremtidige kvalitetsinspektioner. Reglen opretter ikke nødvendigvis en inspektion med det samme. Kontrollér interval, varer og startdato.",
      "fi-FI": "Määrittää aikaperusteisen säännön tuleville laatutarkastuksille. Sääntö ei välttämättä luo tarkastusta heti. Tarkista aikaväli, nimikkeet ja aloituspäivä.",
      "nb-NO": "Setter opp en tidsbasert regel for fremtidige kvalitetsinspeksjoner. Regelen oppretter ikke nødvendigvis en inspeksjon med en gang. Kontroller intervall, varer og startdato."
    },
    qualityResult: {
      "sv-SE": "Skapar en möjlig resultatkod för inspektioner. Det här steget registrerar inte utfallet för en viss inspektion. Kontrollera kod, beskrivning och hur resultatet påverkar godkänd eller underkänd status.",
      "en-US": "Creates an available result code for inspections. This does not record the outcome of a particular inspection. Check the code, description, and how it affects pass or fail status.",
      "fr-FR": "Crée un code de résultat disponible pour les inspections. Cela n’enregistre pas le résultat d’une inspection précise. Vérifiez le code, sa description et son effet sur le statut conforme ou non conforme.",
      "de-DE": "Erstellt einen verfügbaren Ergebnisschlüssel für Prüfungen. Damit wird kein Ergebnis einer konkreten Prüfung erfasst. Prüfen Sie Code, Beschreibung und Auswirkung auf bestanden/nicht bestanden.",
      "es-ES": "Crea un código de resultado disponible para inspecciones. No registra el resultado de una inspección concreta. Comprueba el código, la descripción y su efecto en aprobado o no aprobado.",
      "da-DK": "Opretter en mulig resultatkode til inspektioner. Den registrerer ikke resultatet af en bestemt inspektion. Kontrollér kode, beskrivelse og betydning for bestået/ikke bestået.",
      "fi-FI": "Luo tarkastuksissa käytettävän tuloskoodin. Se ei tallenna yksittäisen tarkastuksen tulosta. Tarkista koodi, kuvaus ja vaikutus hyväksytty/hylätty-tilaan.",
      "nb-NO": "Oppretter en tilgjengelig resultatkode for inspeksjoner. Den registrerer ikke utfallet av en bestemt inspeksjon. Kontroller kode, beskrivelse og virkning på bestått/ikke bestått."
    },
    qualityPostOutput: {
      "sv-SE": "Bokför produktionsutfallet tillsammans med den kopplade kvalitetsinspektionen. Bokföringen kan uppdatera lager och produktionsstatus. Kontrollera rapporterat antal, förbrukning, inspektionsresultat och bokförda poster.",
      "en-US": "Posts the production output together with its linked quality inspection. Posting can update inventory and production status. Check output quantity, consumption, inspection results, and posted entries.",
      "fr-FR": "Comptabilise le résultat de production avec l’inspection qualité associée. Cette comptabilisation peut mettre à jour le stock et le statut de production. Vérifiez quantité, consommation, résultats et écritures.",
      "de-DE": "Bucht den Produktionsausstoß zusammen mit der zugehörigen Qualitätsprüfung. Die Buchung kann Bestand und Produktionsstatus aktualisieren. Prüfen Sie Menge, Verbrauch, Prüfergebnisse und gebuchte Posten.",
      "es-ES": "Registra el resultado de producción junto con la inspección de calidad vinculada. El registro puede actualizar el inventario y el estado de producción. Comprueba cantidades, consumo, resultados y movimientos registrados.",
      "da-DK": "Bogfører produktionsoutput sammen med den tilknyttede kvalitetsinspektion. Bogføringen kan opdatere lager og produktionsstatus. Kontrollér antal, forbrug, inspektionsresultater og bogførte poster.",
      "fi-FI": "Kirjaa tuotannon tuloksen siihen liittyvän laatutarkastuksen kanssa. Kirjaus voi päivittää varaston ja tuotannon tilan. Tarkista määrä, kulutus, tarkastustulokset ja kirjatut tapahtumat.",
      "nb-NO": "Bokfører produksjonsresultatet sammen med den tilknyttede kvalitetsinspeksjonen. Bokføringen kan oppdatere lager og produksjonsstatus. Kontroller antall, forbruk, inspeksjonsresultat og bokførte poster."
    },
    qualityShowInspections: {
      "sv-SE": "Öppnar inspektionerna som hör till artikeln och inköpsdokumentet. Att visa listan ändrar inte kontrollresultat eller dokumentstatus. Bekräfta att inspektionen gäller rätt mottagning och parti.",
      "en-US": "Opens inspections related to the item and purchase document. Viewing the list does not change test results or document status. Confirm the inspection belongs to the correct receipt and lot.",
      "fr-FR": "Ouvre les inspections liées à l’article et au document d’achat. L’affichage ne modifie ni les résultats ni le statut du document. Confirmez la réception et le lot concernés.",
      "de-DE": "Öffnet Prüfungen zum Artikel und Einkaufsbeleg. Die Anzeige ändert weder Prüfergebnisse noch Belegstatus. Prüfen Sie den richtigen Wareneingang und das richtige Los.",
      "es-ES": "Abre las inspecciones relacionadas con el producto y el documento de compra. Ver la lista no cambia resultados ni el estado del documento. Confirma la recepción y el lote correctos.",
      "da-DK": "Åbner inspektioner knyttet til varen og købsdokumentet. Visning ændrer ikke testresultater eller dokumentstatus. Kontrollér den rigtige modtagelse og det rigtige parti.",
      "fi-FI": "Avaa nimikkeeseen ja ostoasiakirjaan liittyvät tarkastukset. Luettelon katselu ei muuta testituloksia tai asiakirjan tilaa. Varmista oikea vastaanotto ja erä.",
      "nb-NO": "Åpner inspeksjoner knyttet til varen og kjøpsdokumentet. Visning endrer ikke testresultater eller dokumentstatus. Bekreft riktig mottak og parti."
    },
    qualityMoveFailed: {
      "sv-SE": "Flyttar lager som kopplats till en underkänd inspektion till angiven plats eller zon för avvikande varor. Kontrollera parti, från- och tillplats samt flyttade kvantiteter innan lagret används.",
      "en-US": "Moves inventory linked to a failed inspection to the specified nonconforming location or zone. Check the lot, source and destination locations, and moved quantities before using the stock.",
      "fr-FR": "Déplace le stock lié à une inspection échouée vers l’emplacement ou la zone de non-conformité. Vérifiez lot, emplacements source et destination, et quantités déplacées.",
      "de-DE": "Verschiebt Bestand aus einer fehlgeschlagenen Prüfung an den angegebenen Abweichungsplatz oder in die Zone. Prüfen Sie Los, Quell- und Zielplatz sowie Mengen.",
      "es-ES": "Mueve el inventario vinculado a una inspección fallida a la ubicación o zona de productos no conformes indicada. Comprueba lote, ubicaciones y cantidades movidas.",
      "da-DK": "Flytter lager fra en ikke-bestået inspektion til den angivne placering eller zone for afvigende varer. Kontrollér parti, fra- og tilplacering samt antal.",
      "fi-FI": "Siirtää hylättyyn tarkastukseen liittyvän varaston määritettyyn poikkeamapaikkaan tai -alueelle. Tarkista erä, lähtö- ja kohdepaikka sekä siirretyt määrät.",
      "nb-NO": "Flytter lager knyttet til en mislykket inspeksjon til angitt avviksplass eller sone. Kontroller parti, fra- og tilplassering samt flyttede mengder."
    },
    qualityNegativeAdjustment: {
      "sv-SE": "Skapar ett negativt artikeljusteringsunderlag utifrån inspektionen för att ta bort kasserat antal ur lagret. Själva justeringsjournalen måste granskas och bokföras separat. Kontrollera parti, orsak och antal.",
      "en-US": "Creates a negative item-adjustment entry from the inspection to remove a rejected quantity from inventory. The adjustment journal must still be reviewed and posted separately. Check lot, reason, and quantity.",
      "fr-FR": "Crée une ligne d’ajustement négatif depuis l’inspection pour retirer la quantité rejetée du stock. Le journal doit encore être vérifié et comptabilisé séparément. Vérifiez lot, motif et quantité.",
      "de-DE": "Erstellt aus der Prüfung eine negative Artikelregulierung, um die abgelehnte Menge aus dem Bestand zu entfernen. Das Journal muss separat geprüft und gebucht werden. Prüfen Sie Los, Grund und Menge.",
      "es-ES": "Crea un ajuste negativo a partir de la inspección para retirar del inventario la cantidad rechazada. El diario debe revisarse y registrarse por separado. Comprueba lote, motivo y cantidad.",
      "da-DK": "Opretter en negativ varejusteringslinje ud fra inspektionen for at fjerne afvist antal fra lageret. Kladden skal stadig gennemgås og bogføres separat. Kontrollér parti, årsag og antal.",
      "fi-FI": "Luo tarkastuksen perusteella negatiivisen nimikeoikaisun hylätyn määrän poistamiseksi varastosta. Oikaisukirjaus tarkistetaan ja kirjataan erikseen. Tarkista erä, syy ja määrä.",
      "nb-NO": "Oppretter en negativ varejustering fra inspeksjonen for å fjerne avvist antall fra lageret. Kladden må fortsatt kontrolleres og bokføres separat. Kontroller parti, årsak og antall."
    },
    qualityChangeTracking: {
      "sv-SE": "Öppnar ändring av artikelspårningen för den underkända inspektionen så att parti- eller serienummer kan korrigeras enligt rutinen. Ändra inte identitet utan underlag; kontrollera gamla och nya spårningsvärden.",
      "en-US": "Opens item-tracking changes for the failed inspection so lot or serial details can be corrected under the applicable procedure. Do not change identity without evidence; verify old and new tracking values.",
      "fr-FR": "Ouvre la modification du suivi article pour l’inspection échouée afin de corriger lot ou numéro de série selon la procédure. Ne modifiez pas l’identité sans justificatif ; vérifiez les anciennes et nouvelles valeurs.",
      "de-DE": "Öffnet die Änderung der Artikelverfolgung für die fehlgeschlagene Prüfung, um Los- oder Serienangaben nach Verfahren zu korrigieren. Identität nur mit Nachweis ändern; alte und neue Werte prüfen.",
      "es-ES": "Abre los cambios de seguimiento del producto para la inspección fallida, para corregir lote o serie según el procedimiento. No cambies la identidad sin respaldo; verifica los valores anteriores y nuevos.",
      "da-DK": "Åbner ændring af varesporing for den ikke-beståede inspektion, så parti eller serienummer kan rettes efter proceduren. Skift ikke identitet uden grundlag; kontrollér gamle og nye værdier.",
      "fi-FI": "Avaa hylätyn tarkastuksen nimikeseurannan muutoksen erä- tai sarjanumeron korjaamiseksi menettelyn mukaisesti. Älä muuta tunnistetta ilman perustetta; tarkista vanhat ja uudet arvot.",
      "nb-NO": "Åpner endring av varesporing for den mislykkede inspeksjonen slik at parti- eller serienummer kan korrigeres etter rutinen. Ikke endre identitet uten grunnlag; kontroller gamle og nye verdier."
    },
    qualityTrackingInspection: {
      "sv-SE": "Skapar kvalitetsinspektioner från valda artikelspårningsrader. Kontrollera att rätt partier eller serienummer och antal är markerade; därefter behöver testresultaten registreras och inspektionen slutföras.",
      "en-US": "Creates quality inspections from selected item-tracking lines. Check that the correct lots or serial numbers and quantities are selected; test results must then be recorded and the inspections completed.",
      "fr-FR": "Crée des inspections qualité depuis les lignes de suivi article sélectionnées. Vérifiez les lots ou numéros de série et quantités ; les résultats doivent ensuite être saisis et les inspections terminées.",
      "de-DE": "Erstellt Qualitätsprüfungen aus ausgewählten Artikelverfolgungszeilen. Prüfen Sie Lose oder Seriennummern und Mengen; Ergebnisse müssen anschließend erfasst und Prüfungen abgeschlossen werden.",
      "es-ES": "Crea inspecciones de calidad a partir de líneas de seguimiento seleccionadas. Comprueba lotes o números de serie y cantidades; después deben registrarse resultados y finalizarse las inspecciones.",
      "da-DK": "Opretter kvalitetsinspektioner fra valgte varesporingslinjer. Kontrollér partier eller serienumre og antal; registrér derefter testresultater og afslut inspektionerne.",
      "fi-FI": "Luo laatutarkastuksia valituilta nimikeseurantariveiltä. Tarkista erät tai sarjanumerot ja määrät; sen jälkeen testitulokset kirjataan ja tarkastukset päätetään.",
      "nb-NO": "Oppretter kvalitetsinspeksjoner fra valgte varesporingslinjer. Kontroller partier eller serienumre og antall; registrer deretter testresultater og fullfør inspeksjonene."
    }
  };
  const moduleSpecific = {
    "BCExpansion.ApproveRequest": "approvalApprove",
    "BCExpansion.RejectRequest": "approvalReject",
    "BCExpansion.DelegateRequest": "approvalDelegate",
    "BCExpansion.SendApproval": "approvalSend",
    "BCExpansion.CancelApproval": "approvalCancel",
    "BCExpansion.CreateApprovalUser": "approvalUser",
    "BCExpansion.CreateOrder": "assemblyCreate",
    "BCExpansion.QuantityToAssemble": "assemblyQuantity",
    "BCExpansion.PostOrder": "assemblyPost",
    "BCAssembly.AssemblyPolicyContext": "assemblyPolicy",
    "BCExpansion.ImportStatement": "bankImport",
    "BCExpansion.MatchAutomatically": "bankAutoMatch",
    "BCExpansion.MatchManually": "bankManualMatch",
    "BCExpansion.PostReconciliation": "bankPost",
    "Intercompany.SetupAccountsAndDimensions": "intercompanySetup",
    "BCExpansion.ImportInbox": "intercompanyImport",
    "BCExpansion.CompleteInbox": "intercompanyComplete",
    "BCExpansion.SendOutbox": "intercompanySend",
    "BCExpansion.CreateProposal": "billingProposal",
    "BCExpansion.CreateDocuments": "billingDocuments",
    "BCExpansion.BillingThroughDate": "billingThroughDate",
    "SubscriptionBilling.ManualContractLine": "subscriptionLine",
    "Shopify.SyncOrdersFromShopify": "shopifyOrdersIn",
    "Shopify.SyncInventoryToShopify": "shopifyInventoryOut",
    "Shopify.CreateSalesDocumentsFromOrder": "shopifyCreateSalesDocs",
    "Shopify.SyncShipmentsToShopify": "shopifyShipmentsOut",
    "Shopify.SyncProductsFromShopify": "shopifyProductsIn",
    "HumanResources.ViewAbsenceByCategories": "hrAbsenceCategories",
    "HumanResources.OpenAbsenceOverview": "hrAbsenceOverview",
    "BCExpansion.CreateEmployee": "hrCreateEmployee",
    "BCExpansion.RegisterAbsence": "hrRegisterAbsence",
    "BCExpansion.ApplyEmployeeTemplate": "hrEmployeeTemplate",
    "InventoryTracking.TraceSerialOrLot": "trackingTrace",
    "InventoryTracking.FindAllSerialOrLotEntries": "trackingFindEntries",
    "InventoryTracking.AssignTrackingNumber": "trackingAssign",
    "InventoryTracking.ReclassifyLotOrSerialNumber": "trackingReclassify",
    "BCExpansion.AssignItemTracking": "trackingAssign",
    "CashManagement.OpenCashReceiptJournal": "cashReceiptJournal",
    "CashManagement.ApplyCustomerEntries": "cashApplyCustomer",
    "CashManagement.PostCashReceiptJournal": "cashPostReceipt",
    "CashManagement.OpenPaymentJournal": "cashPaymentJournal",
    "CashManagement.SuggestVendorPayments": "cashSuggestVendorPayments",
    "CashManagement.PostPaymentJournal": "cashPostPayments",
    "CashManagement.OpenPaymentReconciliationJournal": "cashReconciliationJournal",
    "CashManagement.ApplyPaymentsAutomatically": "cashAutoApply",
    "CashManagement.ApplyPaymentsManually": "cashManualApply",
    "CashManagement.PostPaymentReconciliationJournal": "cashPostReconciliation",
    "CostAccounting.TransferGeneralLedgerEntries": "costTransferEntries",
    "CostAccounting.RunCostAllocation": "costRunAllocation",
    "CostAccounting.CalculateAllocationKey": "costCalculateKey",
    "CostAccounting.CreateCostBudget": "costCreateBudget",
    "CostAccounting.CreateCostCenter": "costCreateCenter",
    "CostAccounting.CreateCostObject": "costCreateObject",
    "CostAccounting.PostCostJournal": "costPostJournal",
    "CostAccounting.DeleteCostBudgetEntries": "costDeleteBudgetEntries",
    "ElectronicDocuments.MatchPurchaseOrderLines": "edocMatchPurchase",
    "ElectronicDocuments.UpdatePurchaseOrderLink": "edocUpdatePurchaseLink",
    "BCExpansion.SendDocument": "edocSend",
    "BCExpansion.ViewLogs": "edocViewLogs",
    "BCExpansion.CreatePurchaseDocument": "edocCreatePurchaseDoc",
    "ContactMarketing.CreateCampaign": "marketingCampaign",
    "ContactMarketing.CreateInteraction": "marketingInteraction",
    "ContactMarketing.CloseSalesOpportunity": "marketingCloseOpportunity",
    "ContactMarketing.UpdateOpportunityStage": "marketingOpportunityStage",
    "ContactMarketing.CreateSegmentInteraction": "marketingSegmentInteraction",
    "ContactMarketing.CreateSegment": "marketingSegment",
    "ContactMarketing.AddContactsToSegment": "marketingAddContacts",
    "ContactMarketing.RefineOrReduceSegmentContacts": "marketingRefineSegment",
    "Sustainability.EnterPurchaseDocumentEmissions": "sustainPurchaseEmissions",
    "Sustainability.CollectAmountFromGLEntries": "sustainCollectGL",
    "Sustainability.CreateAccountCategory": "sustainCreateCategory",
    "Sustainability.CreateAccountSubcategory": "sustainCreateSubcategory",
    "BCExpansion.ManualInput": "sustainManualInput",
    "BCExpansion.RecalculateJournal": "sustainRecalculate",
    "BCExpansion.PostJournal": "sustainPostJournal",
    "BCExpansion.PostItemReclassification": "inventoryPostReclass",
    "BCExpansion.CalculateInventory": "inventoryCalculate",
    "BCExpansion.CountedQuantity": "inventoryCountedQty",
    "BCExpansion.PostTransfer": "inventoryPostTransfer",
    "BCExpansion.PostPhysicalInventory": "inventoryPostCount",
    "BCExpansion.OpenExcel": "m365OpenExcel",
    "BCExpansion.EditExcel": "m365EditExcel",
    "BCExpansion.ShareTeams": "m365ShareTeams",
    "BCExpansion.OpenOneDrive": "m365OpenOneDrive",
    "BCExpansion.InstallOutlook": "m365InstallOutlook"
  };
  const moduleText = {
    // Locales follow the catalog order: sv-SE, en-US, fr-FR, de-DE, es-ES, da-DK, fi-FI, nb-NO.
    approvalApprove: [
      "Godkänner den valda begäran i arbetsflödet. Det godkänner inte automatiskt nästa steg, och dokumentet blir inte bokfört av detta. Kontrollera begärans status och eventuell efterföljande godkännare.",
      "Approves the selected workflow request. This does not automatically approve later steps or post the document. Check the request status and any next approver.",
      "Approuve la demande sélectionnée dans le flux. Cela n’approuve pas automatiquement les étapes suivantes et ne comptabilise pas le document. Vérifiez le statut et le prochain approbateur.",
      "Genehmigt die ausgewählte Workflowanforderung. Weitere Schritte werden dadurch nicht automatisch genehmigt und der Beleg nicht gebucht. Prüfen Sie Status und nächsten Genehmiger.",
      "Aprueba la solicitud seleccionada del flujo. No aprueba automáticamente los pasos posteriores ni registra el documento. Comprueba el estado y el siguiente aprobador.",
      "Godkender den valgte workflowanmodning. Det godkender ikke automatisk næste trin og bogfører ikke dokumentet. Kontrollér status og næste godkender.",
      "Hyväksyy valitun työnkulun pyynnön. Se ei hyväksy automaattisesti myöhempiä vaiheita eikä kirjaa asiakirjaa. Tarkista pyynnön tila ja seuraava hyväksyjä.",
      "Godkjenner den valgte arbeidsflytforespørselen. Det godkjenner ikke automatisk senere trinn og bokfører ikke dokumentet. Kontroller status og neste godkjenner."
    ],
    approvalReject: [
      "Avvisar den valda godkännandebegäran så att den inte går vidare som godkänd. Kontrollera att rätt begäran avvisas och att kommentar eller avvisningsorsak registreras där arbetsflödet kräver det.",
      "Rejects the selected approval request so it does not proceed as approved. Confirm the correct request and record a comment or rejection reason when required by the workflow.",
      "Rejette la demande d’approbation sélectionnée afin qu’elle ne soit pas traitée comme approuvée. Vérifiez la demande et saisissez un motif si le flux l’exige.",
      "Lehnt die ausgewählte Genehmigungsanforderung ab, damit sie nicht als genehmigt weiterläuft. Prüfen Sie die richtige Anforderung und erfassen Sie bei Bedarf den Grund.",
      "Rechaza la solicitud de aprobación seleccionada para que no continúe como aprobada. Confirma que sea la solicitud correcta e indica el motivo si el flujo lo requiere.",
      "Afviser den valgte godkendelsesanmodning, så den ikke fortsætter som godkendt. Kontrollér anmodningen, og angiv en årsag, hvis workflowet kræver det.",
      "Hylkää valitun hyväksyntäpyynnön, jotta se ei etene hyväksyttynä. Varmista, että pyyntö on oikea, ja kirjaa perustelu, jos työnkulku sitä edellyttää.",
      "Avviser den valgte godkjenningsforespørselen slik at den ikke går videre som godkjent. Kontroller riktig forespørsel og angi årsak hvis arbeidsflyten krever det."
    ],
    approvalDelegate: [
      "Tilldelar godkännandebegäran till en ersättare eller annan godkännare enligt arbetsflödet. Kontrollera mottagaren och att begäran fortfarande är öppen för åtgärd.",
      "Assigns the approval request to a substitute or another approver according to the workflow. Check the recipient and confirm the request remains actionable.",
      "Attribue la demande d’approbation à un remplaçant ou à un autre approbateur selon le flux. Vérifiez le destinataire et que la demande reste à traiter.",
      "Weist die Genehmigungsanforderung gemäß Workflow einem Vertreter oder anderen Genehmiger zu. Prüfen Sie den Empfänger und ob die Anforderung noch offen ist.",
      "Asigna la solicitud a un sustituto u otro aprobador según el flujo. Comprueba el destinatario y que la solicitud siga pendiente.",
      "Tildeler godkendelsesanmodningen til en stedfortræder eller anden godkender efter workflowet. Kontrollér modtageren, og at anmodningen stadig er åben.",
      "Määrittää hyväksyntäpyynnön sijaiselle tai toiselle hyväksyjälle työnkulun mukaan. Tarkista vastaanottaja ja että pyyntö on edelleen käsiteltävissä.",
      "Tildeler godkjenningsforespørselen til en stedfortreder eller annen godkjenner etter arbeidsflyten. Kontroller mottakeren og at forespørselen fortsatt er åpen."
    ],
    approvalSend: [
      "Skickar dokumentet för godkännande enligt den aktiva arbetsflödeskonfigurationen. Skickat betyder att en begäran har skapats eller skickats, inte att den har godkänts. Kontrollera mottagare och begärans status.",
      "Submits the document for approval under the active workflow setup. Sent means a request was created or dispatched, not approved. Check recipients and request status.",
      "Soumet le document à l’approbation selon le flux actif. Envoyé signifie que la demande a été créée ou transmise, pas approuvée. Vérifiez les destinataires et le statut.",
      "Sendet den Beleg gemäß aktivem Workflow zur Genehmigung. Gesendet bedeutet erstellt oder übermittelt, nicht genehmigt. Prüfen Sie Empfänger und Anforderungsstatus.",
      "Envía el documento para aprobación según el flujo activo. Enviado significa que la solicitud se creó o remitió, no que se aprobara. Comprueba destinatarios y estado.",
      "Sender dokumentet til godkendelse efter det aktive workflow. Sendt betyder, at anmodningen er oprettet eller afsendt, ikke godkendt. Kontrollér modtagere og status.",
      "Lähettää asiakirjan hyväksyttäväksi aktiivisen työnkulun mukaan. Lähetetty tarkoittaa, että pyyntö luotiin tai lähetettiin, ei että se hyväksyttiin. Tarkista vastaanottajat ja tila.",
      "Sender dokumentet til godkjenning etter aktiv arbeidsflyt. Sendt betyr at forespørselen er opprettet eller sendt, ikke godkjent. Kontroller mottakere og status."
    ],
    approvalCancel: [
      "Återkallar den aktiva godkännandebegäran. Det tar inte bort eller bokför själva dokumentet. Kontrollera att begäran har status Återkallad och granska dokumentet innan du skickar det på nytt.",
      "Cancels the active approval request. It does not delete or post the document itself. Confirm the request is canceled and review the document before resubmitting.",
      "Annule la demande d’approbation active. Cela ne supprime ni ne comptabilise le document. Vérifiez l’annulation et contrôlez le document avant de le soumettre à nouveau.",
      "Bricht die aktive Genehmigungsanforderung ab. Der Beleg selbst wird weder gelöscht noch gebucht. Prüfen Sie den Status und den Beleg vor erneutem Senden.",
      "Cancela la solicitud de aprobación activa. No elimina ni registra el documento. Confirma la cancelación y revisa el documento antes de volver a enviarlo.",
      "Annullerer den aktive godkendelsesanmodning. Dokumentet slettes eller bogføres ikke. Bekræft status, og gennemgå dokumentet før gensendelse.",
      "Peruuttaa aktiivisen hyväksyntäpyynnön. Se ei poista eikä kirjaa itse asiakirjaa. Varmista peruutustila ja tarkista asiakirja ennen uutta lähetystä.",
      "Avbryter den aktive godkjenningsforespørselen. Dokumentet slettes eller bokføres ikke. Bekreft status og gjennomgå dokumentet før ny innsending."
    ],
    approvalUser: [
      "Skapar en användarpost för godkännandefunktionen. Posten ger inte i sig användaren rätt att godkänna; kontrollera användar-ID, godkännargräns, ersättare och behörigheter.",
      "Creates an approval user record. The record alone does not grant permission to approve; check the user ID, approval limit, substitute, and permissions.",
      "Crée un utilisateur d’approbation. L’enregistrement ne confère pas à lui seul le droit d’approuver ; vérifiez l’ID, le seuil, le remplaçant et les autorisations.",
      "Erstellt einen Genehmigungsbenutzerdatensatz. Dieser erteilt allein keine Genehmigungsberechtigung; prüfen Sie Benutzer-ID, Limit, Vertreter und Berechtigungen.",
      "Crea un registro de usuario de aprobación. No concede por sí solo permiso para aprobar; comprueba el ID, límite, sustituto y permisos.",
      "Opretter en godkendelsesbrugerpost. Posten giver ikke i sig selv ret til at godkende; kontrollér bruger-id, grænse, stedfortræder og rettigheder.",
      "Luo hyväksyntäkäyttäjän tietueen. Tietue ei yksin anna hyväksymisoikeutta; tarkista käyttäjätunnus, hyväksyntäraja, sijainen ja käyttöoikeudet.",
      "Oppretter en godkjenningsbrukerpost. Posten gir ikke i seg selv godkjenningsrett; kontroller bruker-ID, grense, stedfortreder og tillatelser."
    ],
    assemblyCreate: [
      "Skapar en monteringsorder för att planera montering av en artikel från dess komponenter. Kontrollera artikel, variant, plats, behovsdatum, antal och komponenttillgång; ordern är inte bokförd.",
      "Creates an assembly order to plan building an item from its components. Check item, variant, location, due date, quantity, and component availability; the order is not posted.",
      "Crée un ordre d’assemblage pour planifier la fabrication d’un article à partir de composants. Vérifiez article, variante, emplacement, date, quantité et disponibilité ; l’ordre n’est pas comptabilisé.",
      "Erstellt einen Montageauftrag zur Planung eines Artikels aus Komponenten. Prüfen Sie Artikel, Variante, Lagerort, Termin, Menge und Komponentenverfügbarkeit; der Auftrag ist nicht gebucht.",
      "Crea una orden de ensamblado para planificar un producto a partir de componentes. Comprueba producto, variante, ubicación, fecha, cantidad y disponibilidad; no está registrada.",
      "Opretter en montageordre til planlægning af en vare ud fra komponenter. Kontrollér vare, variant, placering, dato, antal og komponenttilgængelighed; ordren er ikke bogført.",
      "Luo kokoonpanotilauksen nimikkeen kokoamiseksi osista. Tarkista nimike, variantti, sijainti, eräpäivä, määrä ja osien saatavuus; tilausta ei ole kirjattu.",
      "Oppretter en monteringsordre for å planlegge montering av en vare fra komponenter. Kontroller vare, variant, plassering, dato, antall og komponenttilgang; ordren er ikke bokført."
    ],
    assemblyQuantity: [
      "Anger hur många enheter som ska monteras på ordern. Det är planerad monteringskvantitet, inte ett färdigt eller bokfört utfall. Kontrollera återstående antal och komponentbehov innan du bokför.",
      "Sets how many units are to be assembled on the order. This is the planned assembly quantity, not completed or posted output. Check the remaining quantity and component demand before posting.",
      "Définit la quantité à assembler sur l’ordre. C’est une quantité prévue, pas un résultat terminé ou comptabilisé. Vérifiez le reliquat et les besoins en composants avant comptabilisation.",
      "Legt die auf dem Auftrag zu montierende Menge fest. Dies ist die Planmenge, kein fertiggestellter oder gebuchter Ausstoß. Prüfen Sie Restmenge und Komponentenbedarf vor der Buchung.",
      "Indica la cantidad que se ensamblará en la orden. Es la cantidad prevista, no el resultado completado o registrado. Comprueba el resto y los componentes antes de registrar.",
      "Angiver antal, der skal samles på ordren. Det er planlagt antal, ikke færdigt eller bogført output. Kontrollér restantal og komponentbehov før bogføring.",
      "Asettaa tilauksella koottavan määrän. Tämä on suunniteltu määrä, ei valmis tai kirjattu tuotos. Tarkista jäljellä oleva määrä ja osatarve ennen kirjaamista.",
      "Angir hvor mange enheter som skal monteres på ordren. Dette er planlagt antall, ikke ferdig eller bokført resultat. Kontroller gjenstående antall og komponentbehov før bokføring."
    ],
    assemblyPost: [
      "Bokför monteringsordern och registrerar monterat antal samt komponentförbrukning enligt bokföringsinställningarna. Kontrollera artikel, antal, komponentrader och lagerplatser; granska sedan monterings- och artikeltransaktionerna.",
      "Posts the assembly order, recording assembled output and component consumption according to posting setup. Check item, quantity, component lines, and locations, then review assembly and item entries.",
      "Comptabilise l’ordre d’assemblage, la quantité produite et la consommation des composants selon le paramétrage. Vérifiez article, quantité, composants et emplacements, puis les écritures.",
      "Bucht den Montageauftrag mit Output und Komponentenverbrauch gemäß Einrichtung. Prüfen Sie Artikel, Menge, Komponenten und Lagerorte; kontrollieren Sie anschließend Montage- und Artikelposten.",
      "Registra la orden, el producto ensamblado y el consumo de componentes según la configuración. Comprueba producto, cantidad, componentes y ubicaciones; revisa después los movimientos.",
      "Bogfører montageordren med output og komponentforbrug efter opsætningen. Kontrollér vare, antal, komponenter og placeringer; gennemgå derefter posteringerne.",
      "Kirjaa kokoonpanotilauksen tuotoksen ja osakulutuksen asetusten mukaan. Tarkista nimike, määrä, osarivit ja sijainnit; tarkista kirjaukset sen jälkeen.",
      "Bokfører monteringsordren med produsert antall og komponentforbruk etter oppsettet. Kontroller vare, antall, komponenter og plasseringer; gjennomgå postene etterpå."
    ],
    assemblyPolicy: [
      "Visar eller ändrar monteringsprincipen som styr om artikeln monteras mot lager eller mot specifik efterfrågan. Kontrollera principen på artikelkortet och testa mot orderflödet; detta bokför ingen montering.",
      "Shows or changes the assembly policy that determines whether an item is assembled for stock or specific demand. Check the item card and test the order flow; no assembly is posted here.",
      "Affiche ou modifie la règle d’assemblage, qui détermine si l’article est assemblé pour le stock ou une demande précise. Vérifiez la fiche article et le flux ; aucune opération n’est comptabilisée ici.",
      "Zeigt oder ändert die Montagepolitik für Lagerfertigung oder konkreten Bedarf. Prüfen Sie den Artikel und den Auftragsfluss; hier wird keine Montage gebucht.",
      "Muestra o cambia la directiva de ensamblado para existencias o demanda específica. Comprueba la ficha y el flujo del pedido; aquí no se registra ningún ensamblado.",
      "Viser eller ændrer montagepolitikken for lager eller konkret behov. Kontrollér varekort og ordreflow; der bogføres ingen montage her.",
      "Näyttää tai muuttaa kokoonpanokäytäntöä, joka määrittää varasto- tai tilauskokoonpanon. Tarkista nimikekortti ja tilauskulku; tässä ei kirjata kokoonpanoa.",
      "Viser eller endrer monteringsprinsippet for lager eller konkret behov. Kontroller varekortet og ordreprosessen; ingen montering bokføres her."
    ],
    bankImport: [
      "Läser in bankens kontoutdragsfil till en bankavstämning och skapar eller fyller på kontoutdragsrader. Raderna är ännu inte matchade eller bokförda. Kontrollera bankkonto, datum, valuta och att inga dubbletter importerats.",
      "Imports the bank statement file into a reconciliation and creates or populates statement lines. The lines are not yet matched or posted. Check the bank account, dates, currency, and duplicates.",
      "Importe le relevé bancaire dans un rapprochement et crée ou complète ses lignes. Elles ne sont pas encore rapprochées ni comptabilisées. Vérifiez compte, dates, devise et doublons.",
      "Importiert die Kontoauszugsdatei in einen Bankabgleich und erstellt oder füllt Auszugszeilen. Diese sind noch nicht zugeordnet oder gebucht. Prüfen Sie Konto, Datum, Währung und Duplikate.",
      "Importa el extracto bancario en una conciliación y crea o completa líneas. Aún no están emparejadas ni registradas. Comprueba cuenta, fechas, moneda y duplicados.",
      "Importerer bankens kontoudtogsfil til en afstemning og opretter eller udfylder linjer. De er endnu ikke matchet eller bogført. Kontrollér konto, datoer, valuta og dubletter.",
      "Tuo tiliotetiedoston pankkitäsmäytykseen ja luo tai täydentää tilioterivejä. Niitä ei ole vielä kohdistettu tai kirjattu. Tarkista pankkitili, päivät, valuutta ja kaksoiskappaleet.",
      "Importerer bankens kontoutdragsfil til en avstemming og oppretter eller fyller ut linjer. De er ennå ikke avstemt eller bokført. Kontroller konto, datoer, valuta og duplikater."
    ],
    bankAutoMatch: [
      "Försöker para ihop kontoutdragsrader med bank- eller redovisningstransaktioner utifrån matchningsreglerna. Granska omatchade och felaktiga träffar; en matchning bokför inte avstämningen.",
      "Attempts to match statement lines with bank or ledger entries using the configured rules. Review unmatched and incorrect matches; matching does not post the reconciliation.",
      "Tente de rapprocher les lignes du relevé des écritures bancaires ou comptables selon les règles. Examinez les lignes sans correspondance et les erreurs ; cela ne comptabilise pas le rapprochement.",
      "Versucht, Auszugszeilen nach den Regeln Bank- oder Sachposten zuzuordnen. Prüfen Sie offene und falsche Treffer; der Abgleich wird dadurch nicht gebucht.",
      "Intenta emparejar líneas con movimientos bancarios o contables según las reglas. Revisa líneas sin coincidencia y errores; no registra la conciliación.",
      "Forsøger at matche kontoudtogslinjer med bank- eller finansposter efter reglerne. Gennemgå umatchede og forkerte match; afstemningen bogføres ikke.",
      "Yrittää kohdistaa tilioterivejä pankki- tai kirjanpitotapahtumiin sääntöjen mukaan. Tarkista kohdistamattomat ja virheelliset osumat; täsmäytystä ei kirjata.",
      "Prøver å matche kontoutdragslinjer med bank- eller regnskapsposter etter reglene. Kontroller umatchede og feilaktige treff; avstemmingen bokføres ikke."
    ],
    bankManualMatch: [
      "Kopplar den valda kontoutdragsraden till den transaktion du väljer. Kontrollera belopp, datum, valuta och eventuell differens; raden är inte bokförd förrän avstämningen bokförs.",
      "Links the selected statement line to the transaction you choose. Check amount, date, currency, and any difference; the line is not posted until the reconciliation is posted.",
      "Associe la ligne sélectionnée à la transaction choisie. Vérifiez montant, date, devise et écarts ; la ligne n’est pas comptabilisée avant le rapprochement.",
      "Ordnet die gewählte Auszugszeile dem ausgewählten Posten zu. Prüfen Sie Betrag, Datum, Währung und Differenz; gebucht wird erst mit dem Abgleich.",
      "Vincula la línea seleccionada con el movimiento elegido. Comprueba importe, fecha, moneda y diferencia; no se registra hasta contabilizar la conciliación.",
      "Knytter den valgte kontoudtogslinje til den valgte post. Kontrollér beløb, dato, valuta og difference; linjen bogføres først, når afstemningen bogføres.",
      "Yhdistää valitun tilioterivin valitsemaasi tapahtumaan. Tarkista summa, päivä, valuutta ja erotus; rivi kirjataan vasta täsmäytyksen kirjauksessa.",
      "Kobler den valgte kontoutdragslinjen til transaksjonen du velger. Kontroller beløp, dato, valuta og avvik; linjen bokføres først når avstemmingen bokføres."
    ],
    bankPost: [
      "Bokför bankavstämningen och registrerar de matchade banktransaktionerna enligt konfigurationen. Kontrollera att saldot stämmer, differensen är noll eller förklarad och inga rader återstår omatchade; granska bokförda poster efteråt.",
      "Posts the bank reconciliation and records matched bank transactions under the setup. Check the balance, that any difference is zero or explained, and that no lines remain unmatched; review posted entries afterward.",
      "Comptabilise le rapprochement et enregistre les opérations rapprochées selon le paramétrage. Vérifiez le solde, les écarts et les lignes non rapprochées, puis examinez les écritures.",
      "Bucht den Bankabgleich und erfasst zugeordnete Banktransaktionen gemäß Einrichtung. Prüfen Sie Saldo, erklärte Differenzen und offene Zeilen; kontrollieren Sie danach die gebuchten Posten.",
      "Registra la conciliación y los movimientos emparejados según la configuración. Comprueba saldo, diferencias justificadas y líneas sin emparejar; revisa después los movimientos.",
      "Bogfører bankafstemningen og registrerer matchede banktransaktioner efter opsætningen. Kontrollér saldo, forklarede differencer og umatchede linjer; gennemgå posteringer bagefter.",
      "Kirjaa pankkitäsmäytyksen ja kohdistetut tapahtumat asetusten mukaan. Tarkista saldo, selvitetyt erot ja kohdistamattomat rivit; tarkista kirjaukset tämän jälkeen.",
      "Bokfører bankavstemmingen og registrerer matchede banktransaksjoner etter oppsettet. Kontroller saldo, forklarte avvik og umatchede linjer; gjennomgå posteringer etterpå."
    ],
    intercompanySetup: [
      "Öppnar konfigurationen för koncernintern kontoplan och dimensionsmappning mellan bolag. Kontrollera att varje mottagande bolag har rätt konto- och dimensionskoppling innan transaktioner importeras eller skickas.",
      "Opens intercompany chart-of-accounts and dimension mappings between companies. Check that each receiving company has the correct account and dimension mappings before importing or sending transactions.",
      "Ouvre le paramétrage des correspondances de comptes et dimensions entre sociétés. Vérifiez les correspondances de chaque société destinataire avant tout import ou envoi.",
      "Öffnet die konzerninternen Sachkonto- und Dimensionszuordnungen zwischen Unternehmen. Prüfen Sie die Zuordnungen im Empfängerunternehmen vor Import oder Versand.",
      "Abre la configuración de cuentas y dimensiones entre empresas. Comprueba las asignaciones de cada empresa receptora antes de importar o enviar transacciones.",
      "Åbner koncerninterne kontoplan- og dimensionsmappinger mellem virksomheder. Kontrollér modtagende virksomheders mappinger før import eller afsendelse.",
      "Avaa yritysten väliset tilikartta- ja dimensioyhdistämiset. Tarkista vastaanottavan yrityksen tili- ja dimensioyhdistelmät ennen tapahtumien tuontia tai lähetystä.",
      "Åpner konserninterne kontoplan- og dimensjonskoblinger mellom selskaper. Kontroller mottakerselskapets koblinger før transaksjoner importeres eller sendes."
    ],
    intercompanyImport: [
      "Importerar koncerninterna transaktioner från inkorgen till den aktuella företagsmiljön. Kontrollera partner, dokumenttyp, datum och felstatus; importerade poster behöver ofta granskas och slutföras innan de påverkar redovisningen.",
      "Imports intercompany transactions from the inbox into the current company. Check partner, document type, date, and errors; imported entries often need review and completion before affecting the ledger.",
      "Importe les transactions intersociétés de la boîte de réception dans la société actuelle. Vérifiez partenaire, type, date et erreurs ; les entrées importées doivent souvent être examinées avant traitement comptable.",
      "Importiert konzerninterne Transaktionen aus dem Posteingang in das aktuelle Unternehmen. Prüfen Sie Partner, Belegart, Datum und Fehler; importierte Vorgänge sind vor der Buchung oft noch zu prüfen.",
      "Importa transacciones entre empresas desde la bandeja de entrada a la empresa actual. Comprueba socio, tipo, fecha y errores; revisa los datos antes de que afecten al registro.",
      "Importerer koncerninterne transaktioner fra indbakken til den aktuelle virksomhed. Kontrollér partner, dokumenttype, dato og fejl; gennemgå posterne før bogføring.",
      "Tuo konsernitapahtumat saapuneet-kansiosta nykyiseen yritykseen. Tarkista kumppani, asiakirjatyyppi, päivä ja virheet; tarkista tuodut tiedot ennen kirjanpitovaikutusta.",
      "Importerer konserninterne transaksjoner fra innboksen til gjeldende selskap. Kontroller partner, dokumenttype, dato og feil; gjennomgå postene før de påvirker regnskapet."
    ],
    intercompanyComplete: [
      "Utför den valda åtgärden för inkorgstransaktionen, till exempel att skapa ett dokument eller markera behandlingen som klar enligt transaktionstypen. Kontrollera resultatdokument och felmeddelanden; ”slutförd” betyder inte alltid bokförd.",
      "Runs the selected action for the inbox transaction, such as creating a document or completing processing for its transaction type. Check the resulting document and errors; completed does not always mean posted.",
      "Exécute l’action choisie sur la transaction entrante, par exemple créer un document ou terminer son traitement. Vérifiez le document créé et les erreurs ; terminé ne signifie pas toujours comptabilisé.",
      "Führt die gewählte Aktion für die Eingangsbelegtransaktion aus, etwa Belegerstellung oder Abschluss der Verarbeitung. Prüfen Sie Ergebnisbeleg und Fehler; abgeschlossen bedeutet nicht immer gebucht.",
      "Ejecuta la acción seleccionada para la transacción entrante, como crear un documento o completar su proceso. Comprueba el documento resultante y errores; completado no siempre significa registrado.",
      "Udfører den valgte handling for indgående transaktion, f.eks. oprettelse af et dokument eller afslutning af behandling. Kontrollér resultatdokument og fejl; fuldført betyder ikke altid bogført.",
      "Suorittaa saapuvan tapahtuman valitun toiminnon, kuten asiakirjan luomisen tai käsittelyn päättämisen. Tarkista tulosasiakirja ja virheet; valmis ei aina tarkoita kirjattua.",
      "Utfører valgt handling for innkommende transaksjon, for eksempel oppretter et dokument eller fullfører behandlingen. Kontroller resultatdokument og feil; fullført betyr ikke alltid bokført."
    ],
    intercompanySend: [
      "Skickar den valda koncerninterna transaktionen till partnerbolagets utkorg. Kontrollera mottagande bolag, transaktionsinnehåll och sändningsstatus. Status Skickad bekräftar inte att partnern har importerat eller bokfört den.",
      "Sends the selected intercompany transaction to the partner company's outbox. Check the receiving company, transaction details, and send status. Sent does not confirm that the partner imported or posted it.",
      "Envoie la transaction intersociétés sélectionnée vers la société partenaire. Vérifiez destinataire, contenu et statut d’envoi. Envoyé ne confirme pas l’import ou la comptabilisation par le partenaire.",
      "Sendet die ausgewählte konzerninterne Transaktion an das Partnerunternehmen. Prüfen Sie Empfänger, Inhalt und Sendestatus. Gesendet bestätigt nicht den Import oder die Buchung beim Partner.",
      "Envía la transacción seleccionada a la empresa asociada. Comprueba empresa receptora, contenido y estado; enviado no confirma que el socio la haya importado o registrado.",
      "Sender den valgte koncerninterne transaktion til partnerens udbakke. Kontrollér modtagervirksomhed, indhold og status. Sendt bekræfter ikke, at partneren har importeret eller bogført den.",
      "Lähettää valitun konsernitapahtuman kumppaniyrityksen lähtevät-kansioon. Tarkista vastaanottava yritys, sisältö ja tila. Lähetetty ei vahvista tuontia tai kirjausta kumppanilla.",
      "Sender den valgte konserninterne transaksjonen til partnerens utboks. Kontroller mottakerselskap, innhold og status. Sendt bekrefter ikke at partneren har importert eller bokført den."
    ],
    billingProposal: [
      "Beräknar ett faktureringsförslag från aktiva abonnemangsavtal fram till angivet fakturadatum. Förslaget är ett granskningsunderlag, inte en bokförd faktura. Kontrollera period, avtalsstatus, kund, pris och föreslagna rader.",
      "Calculates a billing proposal from active subscription contracts through the specified billing date. The proposal is for review, not a posted invoice. Check period, contract status, customer, price, and proposed lines.",
      "Calcule une proposition de facturation à partir des contrats actifs jusqu’à la date choisie. Ce résultat doit être examiné et n’est pas une facture comptabilisée. Vérifiez période, contrat, client, prix et lignes.",
      "Berechnet einen Rechnungsvorschlag aus aktiven Abonnementverträgen bis zum Abrechnungsdatum. Der Vorschlag ist keine gebuchte Rechnung. Prüfen Sie Zeitraum, Vertrag, Kunde, Preis und Zeilen.",
      "Calcula una propuesta de facturación de contratos activos hasta la fecha indicada. Es un borrador para revisar, no una factura registrada. Comprueba periodo, contrato, cliente, precio y líneas.",
      "Beregner et faktureringsforslag fra aktive abonnementsaftaler frem til fakturadatoen. Forslaget er til gennemgang, ikke en bogført faktura. Kontrollér periode, aftale, kunde, pris og linjer.",
      "Laskee laskutusehdotuksen aktiivisista sopimuksista määritettyyn laskutuspäivään asti. Ehdotus tarkistetaan ennen laskua eikä ole kirjattu lasku. Tarkista kausi, sopimus, asiakas, hinta ja rivit.",
      "Beregner et faktureringsforslag fra aktive abonnementsavtaler frem til fakturadatoen. Forslaget må gjennomgås og er ikke en bokført faktura. Kontroller periode, avtale, kunde, pris og linjer."
    ],
    billingDocuments: [
      "Skapar försäljningsdokument från de valda faktureringsförslagen enligt abonnemangens faktureringsupplägg. Dokumenten är inte nödvändigtvis bokförda. Kontrollera kunder, perioder, belopp och att varje förslag bara skapar avsedda dokument.",
      "Creates sales documents from selected billing proposals according to subscription setup. The documents are not necessarily posted. Check customers, periods, amounts, and that each proposal creates only the intended documents.",
      "Crée des documents de vente à partir des propositions sélectionnées selon le paramétrage des abonnements. Ils ne sont pas nécessairement comptabilisés. Vérifiez clients, périodes, montants et doublons.",
      "Erstellt gemäß Abonnementeinrichtung Verkaufsbelege aus den ausgewählten Vorschlägen. Diese sind nicht zwingend gebucht. Prüfen Sie Kunden, Zeiträume, Beträge und unbeabsichtigte Duplikate.",
      "Crea documentos de venta a partir de las propuestas seleccionadas según la configuración. No tienen por qué estar registrados. Comprueba clientes, periodos, importes y duplicados.",
      "Opretter salgsdokumenter fra valgte faktureringsforslag efter abonnementsopsætningen. Dokumenterne er ikke nødvendigvis bogført. Kontrollér kunder, perioder, beløb og dubletter.",
      "Luo myyntiasiakirjat valituista laskutusehdotuksista sopimusasetusten mukaan. Asiakirjoja ei välttämättä ole kirjattu. Tarkista asiakkaat, kaudet, summat ja kaksoiskappaleet.",
      "Oppretter salgsdokumenter fra valgte faktureringsforslag etter abonnementsoppsettet. Dokumentene er ikke nødvendigvis bokført. Kontroller kunder, perioder, beløp og duplikater."
    ],
    billingThroughDate: [
      "Anger till vilket datum abonnemang ska faktureras i den här körningen. Datumet påverkar vilka perioder och avgifter som kommer med. Kontrollera fakturadatum, avtalsperioder och att samma period inte redan har fakturerats.",
      "Sets the date through which subscriptions are billed in this run. It determines which periods and charges are included. Check the billing date, contract periods, and whether the period was already billed.",
      "Définit la date jusqu’à laquelle les abonnements sont facturés pour cette exécution. Elle détermine périodes et frais inclus. Vérifiez date, périodes contractuelles et facturation antérieure.",
      "Legt fest, bis zu welchem Datum Abonnements in diesem Lauf abgerechnet werden. Dies bestimmt Zeitraum und Gebühren. Prüfen Sie Datum, Vertragsperioden und bereits abgerechnete Zeiträume.",
      "Indica hasta qué fecha se facturan las suscripciones en esta ejecución. Determina periodos y cargos incluidos. Comprueba fecha, periodos contractuales y facturación previa.",
      "Angiver, til hvilken dato abonnementer faktureres i denne kørsel. Det afgør inkluderede perioder og gebyrer. Kontrollér dato, aftaleperioder og tidligere fakturering.",
      "Määrittää päivämäärän, johon asti tilaukset laskutetaan tässä ajossa. Se määrää kaudet ja maksut. Tarkista laskutuspäivä, sopimuskaudet ja aiempi laskutus.",
      "Angir til hvilken dato abonnementer faktureres i denne kjøringen. Det avgjør perioder og avgifter. Kontroller fakturadato, avtaleperioder og tidligere fakturering."
    ],
    subscriptionLine: [
      "Lägger till en rad i abonnemangsavtalet med den valda tjänsten, kvantiteten och debiteringsvillkoren. Raden blir inte fakturerad av detta steg. Kontrollera start- och slutdatum, pris, period och faktureringsintervall.",
      "Adds a line to the subscription contract with the selected service, quantity, and billing terms. This step does not invoice the line. Check start and end dates, price, period, and billing interval.",
      "Ajoute une ligne au contrat d’abonnement avec le service, la quantité et les conditions choisies. Cette étape ne la facture pas. Vérifiez dates, prix, période et intervalle de facturation.",
      "Fügt dem Abonnementvertrag eine Zeile mit Dienst, Menge und Abrechnungsbedingungen hinzu. Dadurch wird sie nicht fakturiert. Prüfen Sie Daten, Preis, Zeitraum und Intervall.",
      "Añade una línea al contrato de suscripción con el servicio, cantidad y condiciones elegidos. Este paso no la factura. Comprueba fechas, precio, periodo e intervalo.",
      "Tilføjer en linje til abonnementsaftalen med valgt ydelse, antal og faktureringsvilkår. Dette trin fakturerer ikke linjen. Kontrollér datoer, pris, periode og interval.",
      "Lisää sopimukseen rivin valitulla palvelulla, määrällä ja laskutusehdoilla. Tämä vaihe ei laskuta riviä. Tarkista alku- ja loppupäivä, hinta, kausi ja laskutusväli.",
      "Legger til en linje i abonnementsavtalen med valgt tjeneste, antall og faktureringsvilkår. Dette trinnet fakturerer ikke linjen. Kontroller datoer, pris, periode og intervall."
    ]
  };
  Object.assign(moduleText, {
    shopifyOrdersIn: [
      "Hämtar beställningar från Shopify till Business Central enligt butikens inställningar. Kontrollera ordernummer, kund, valuta och synkroniseringsstatus och bekräfta att ordern skapats eller länkats innan den hanteras vidare.",
      "Imports Shopify orders into Business Central under the shop setup. Check order number, customer, currency, and sync status; confirm the order was created or linked before processing.",
      "Importe les commandes Shopify dans Business Central selon le paramétrage. Vérifiez numéro, client, devise et statut ; confirmez la création ou le lien avant traitement.",
      "Importiert Shopify-Bestellungen gemäß Shop-Einrichtung nach Business Central. Prüfen Sie Nummer, Kunde, Währung und Status und bestätigen Sie den Auftrag vor der weiteren Verarbeitung.",
      "Importa pedidos de Shopify en Business Central según la configuración. Comprueba número, cliente, moneda y estado; confirma la creación o el vínculo antes de continuar.",
      "Henter Shopify-ordrer til Business Central efter butikkens opsætning. Kontrollér nummer, kunde, valuta og status; bekræft oprettelse eller tilknytning før videre behandling.",
      "Tuo Shopify-tilaukset Business Centraliin kaupan asetusten mukaan. Tarkista numero, asiakas, valuutta ja tila; varmista luonti tai linkitys ennen jatkokäsittelyä.",
      "Henter Shopify-ordrer til Business Central etter butikkens oppsett. Kontroller nummer, kunde, valuta og status; bekreft opprettelse eller kobling før videre behandling."
    ],
    shopifyInventoryOut: [
      "Synkroniserar lagersaldo från Business Central till Shopify. Kontrollera vilka artiklar, varianter och lagerplatser som ingår och granska synkroniseringsloggen; detta bokför ingen lagertransaktion.",
      "Synchronizes inventory from Business Central to Shopify. Check included items, variants, and locations and review the sync log; this does not post an inventory transaction.",
      "Synchronise le stock de Business Central vers Shopify. Vérifiez articles, variantes et emplacements, puis le journal ; aucune transaction de stock n’est comptabilisée.",
      "Synchronisiert Bestände von Business Central zu Shopify. Prüfen Sie Artikel, Varianten und Lagerorte sowie das Protokoll; es wird keine Lagertransaktion gebucht.",
      "Sincroniza existencias de Business Central a Shopify. Comprueba productos, variantes y ubicaciones y revisa el registro; no registra movimientos de inventario.",
      "Synkroniserer lager fra Business Central til Shopify. Kontrollér varer, varianter og placeringer samt loggen; der bogføres ingen lagertransaktion.",
      "Synkronoi varaston Business Centralista Shopifyhin. Tarkista nimikkeet, variantit ja sijainnit sekä loki; varastotapahtumaa ei kirjata.",
      "Synkroniserer lager fra Business Central til Shopify. Kontroller varer, varianter og plasseringer samt loggen; ingen lagertransaksjon bokføres."
    ],
    shopifyCreateSalesDocs: [
      "Skapar Business Central-försäljningsdokument från Shopify-ordern enligt butikens inställningar. Dokumentet kan vara obokfört. Kontrollera kund, orderreferens, rader och att ingen dubblett redan finns.",
      "Creates Business Central sales documents from the Shopify order under the shop setup. They may be unposted. Check customer, order reference, lines, and duplicates.",
      "Crée des documents de vente BC depuis la commande Shopify. Ils peuvent rester non comptabilisés. Vérifiez client, référence, lignes et doublons.",
      "Erstellt gemäß Einrichtung Verkaufsbelege aus der Shopify-Bestellung. Sie können ungebucht sein. Prüfen Sie Kunde, Referenz, Zeilen und Duplikate.",
      "Crea documentos de venta de BC desde el pedido Shopify. Pueden no estar registrados. Comprueba cliente, referencia, líneas y duplicados.",
      "Opretter BC-salgsdokumenter fra Shopify-ordren. De kan være ubogførte. Kontrollér kunde, reference, linjer og dubletter.",
      "Luo myyntiasiakirjoja BC:hen Shopify-tilauksesta. Niitä ei välttämättä ole kirjattu. Tarkista asiakas, viite, rivit ja kaksoiskappaleet.",
      "Oppretter salgsdokumenter i BC fra Shopify-ordren. De kan være ubokførte. Kontroller kunde, referanse, linjer og duplikater."
    ],
    shopifyShipmentsOut: [
      "Synkroniserar leverans- och spårningsuppgifter från bokförda BC-leveranser till Shopify. Kontrollera kopplad order, transportör och spårningsnummer samt synkroniseringsstatus.",
      "Synchronizes shipment and tracking details from posted BC shipments to Shopify. Check the linked order, carrier, tracking number, and sync status.",
      "Synchronise vers Shopify les expéditions et suivis des livraisons BC comptabilisées. Vérifiez commande liée, transporteur, suivi et statut.",
      "Synchronisiert Versand- und Trackingdaten gebuchter BC-Lieferungen zu Shopify. Prüfen Sie verknüpfte Bestellung, Transporteur, Trackingnummer und Status.",
      "Sincroniza envíos y seguimiento de entregas registradas de BC con Shopify. Comprueba pedido vinculado, transportista, seguimiento y estado.",
      "Synkroniserer leverings- og sporingsoplysninger fra bogførte BC-leverancer til Shopify. Kontrollér ordre, fragtfører, sporingsnummer og status.",
      "Synkronoi kirjattujen BC-toimitusten lähetys- ja seurantatiedot Shopifyhin. Tarkista tilaus, kuljetusyhtiö, seurantatunnus ja tila.",
      "Synkroniserer leverings- og sporingsdetaljer fra bokførte BC-leveranser til Shopify. Kontroller ordre, transportør, sporingsnummer og status."
    ],
    shopifyProductsIn: [
      "Hämtar produkt- eller variantuppgifter från Shopify till Business Central enligt fältmappningen. Kontrollera artikelkoppling, SKU och ändrade värden innan importerade uppgifter används.",
      "Imports product or variant details from Shopify into Business Central using field mappings. Check item links, SKU, and changed values before using imported data.",
      "Importe les données produit ou variante de Shopify dans BC selon le mappage. Vérifiez lien article, SKU et valeurs modifiées avant utilisation.",
      "Importiert Produkt- oder Variantendaten gemäß Feldzuordnung aus Shopify nach BC. Prüfen Sie Artikelverknüpfung, SKU und Änderungen vor der Verwendung.",
      "Importa datos de producto o variante de Shopify a BC según la asignación. Comprueba vínculo, SKU y cambios antes de usar los datos.",
      "Importerer produkt- eller variantoplysninger fra Shopify til BC efter feltmappingen. Kontrollér varekobling, SKU og ændringer før brug.",
      "Tuo tuote- tai varianttitietoja Shopifyista BC:hen kenttäkartoituksen mukaan. Tarkista nimikelinkki, SKU ja muutokset ennen käyttöä.",
      "Importerer produkt- eller variantopplysninger fra Shopify til BC etter feltkoblingen. Kontroller varekobling, SKU og endringer før bruk."
    ],
    hrAbsenceCategories: [
      "Visar frånvaro grupperad per frånvarokategori. Översikten ändrar inga personalposter. Kontrollera period och filter innan du använder summeringen.",
      "Shows absence grouped by category. This overview changes no employee records. Check the period and filters before using the totals.",
      "Affiche les absences par catégorie sans modifier les fiches. Vérifiez période et filtres avant d’utiliser les totaux.",
      "Zeigt Abwesenheiten nach Kategorie, ohne Personalposten zu ändern. Prüfen Sie Zeitraum und Filter vor Verwendung der Summen.",
      "Muestra ausencias agrupadas por categoría sin modificar fichas. Comprueba periodo y filtros antes de usar los totales.",
      "Viser fravær grupperet efter kategori uden at ændre medarbejderposter. Kontrollér periode og filtre før brug af summer.",
      "Näyttää poissaolot luokittain muuttamatta henkilötietoja. Tarkista kausi ja suodattimet ennen summien käyttöä.",
      "Viser fravær gruppert etter kategori uten å endre ansattposter. Kontroller periode og filtre før bruk av summer."
    ],
    hrAbsenceOverview: [
      "Öppnar översikten över registrerad frånvaro. Att öppna vyn registrerar eller ändrar inte frånvaro. Kontrollera period, anställd och kategori vid uppföljning.",
      "Opens the overview of recorded absence. Opening it does not enter or change absence. Check the period, employee, and category when reviewing.",
      "Ouvre la vue des absences enregistrées sans les modifier. Vérifiez période, employé et catégorie lors du suivi.",
      "Öffnet die Übersicht erfasster Abwesenheiten, ohne sie zu ändern. Prüfen Sie Zeitraum, Mitarbeiter und Kategorie.",
      "Abre la vista de ausencias registradas sin modificarlas. Comprueba periodo, empleado y categoría al hacer seguimiento.",
      "Åbner oversigten over registreret fravær uden at ændre det. Kontrollér periode, medarbejder og kategori.",
      "Avaa kirjattujen poissaolojen yhteenvedon muuttamatta niitä. Tarkista kausi, työntekijä ja luokka.",
      "Åpner oversikten over registrert fravær uten å endre det. Kontroller periode, ansatt og kategori."
    ],
    hrCreateEmployee: [
      "Skapar ett personalkort i Business Central, inte ett Microsoft-inloggningskonto eller en löneinställning. Kontrollera anställd-ID, anställningsdatum, avdelning och kontaktuppgifter.",
      "Creates an employee card in Business Central, not a Microsoft sign-in or payroll setup. Check employee ID, employment date, department, and contact details.",
      "Crée une fiche employé dans Business Central, pas un compte Microsoft ni la paie. Vérifiez identifiant, date d’embauche, service et coordonnées.",
      "Erstellt eine Mitarbeiterkarte in BC, kein Microsoft-Konto oder Lohneinrichtung. Prüfen Sie ID, Eintrittsdatum, Abteilung und Kontaktdaten.",
      "Crea una ficha de empleado en BC, no una cuenta Microsoft ni nómina. Comprueba ID, fecha de contratación, departamento y contacto.",
      "Opretter et medarbejderkort i BC, ikke en Microsoft-konto eller lønopsætning. Kontrollér id, startdato, afdeling og kontaktdata.",
      "Luo työntekijäkortin BC:hen, ei Microsoft-kirjautumista tai palkanlaskentaa. Tarkista tunnus, aloituspäivä, osasto ja yhteystiedot.",
      "Oppretter et ansattkort i BC, ikke Microsoft-pålogging eller lønnsoppsett. Kontroller ID, startdato, avdeling og kontaktopplysninger."
    ],
    hrRegisterAbsence: [
      "Registrerar frånvaro för vald anställd under angiven period och orsakskod. Kontrollera datum, timmar eller dagar och kategori; posten ersätter inte automatiskt löne- eller tidrapportering.",
      "Records absence for the selected employee for the specified period and cause code. Check dates, duration, and category; it does not automatically replace payroll or time reporting.",
      "Enregistre l’absence de l’employé pour la période et le motif indiqués. Vérifiez dates, durée et catégorie ; cela ne remplace pas automatiquement la paie ou le temps.",
      "Erfasst Abwesenheit für den Mitarbeiter mit Zeitraum und Grundcode. Prüfen Sie Daten, Dauer und Kategorie; dies ersetzt nicht automatisch Lohn- oder Zeiterfassung.",
      "Registra la ausencia del empleado con periodo y código indicados. Comprueba fechas, duración y categoría; no sustituye automáticamente nómina o control horario.",
      "Registrerer fravær for medarbejderen med periode og årsagskode. Kontrollér datoer, varighed og kategori; det erstatter ikke automatisk løn- eller tidsregistrering.",
      "Kirjaa työntekijän poissaolon ajalle ja syykoodilla. Tarkista päivät, kesto ja luokka; tämä ei automaattisesti korvaa palkanlaskentaa tai työaikaa.",
      "Registrerer fravær for den ansatte med periode og årsakskode. Kontroller datoer, varighet og kategori; dette erstatter ikke automatisk lønns- eller timeregistrering."
    ],
    hrEmployeeTemplate: [
      "Fyller i fördefinierade värden på personalkortet från vald mall. Granska vilka fält som ändras, särskilt avdelning, bokföringsgrupper och frånvarokoder, innan du sparar.",
      "Populates the employee card from the selected template. Review changed fields, especially department, posting groups, and absence codes, before saving.",
      "Renseigne la fiche employé depuis le modèle choisi. Vérifiez les champs modifiés, notamment service, groupes comptables et codes d’absence, avant d’enregistrer.",
      "Füllt die Mitarbeiterkarte aus der Vorlage. Prüfen Sie geänderte Felder, besonders Abteilung, Buchungsgruppen und Abwesenheitscodes, vor dem Speichern.",
      "Completa la ficha desde la plantilla elegida. Revisa campos modificados, especialmente departamento, grupos contables y códigos de ausencia, antes de guardar.",
      "Udfylder medarbejderkortet fra skabelonen. Gennemgå ændrede felter, især afdeling, bogføringsgrupper og fraværskoder, før du gemmer.",
      "Täyttää työntekijäkortin mallin arvoilla. Tarkista muuttuneet kentät, erityisesti osasto, kirjausryhmät ja poissaolokoodit, ennen tallennusta.",
      "Fyller ut ansattkortet fra malen. Kontroller endrede felt, særlig avdeling, bokføringsgrupper og fraværskoder, før lagring."
    ],
    trackingTrace: [
      "Följer serie- eller partinumrets ursprung och användning genom artikeltransaktionerna. Kontrollera filter och hela transaktionskedjan; spårningen visar historik men ändrar inget lager.",
      "Traces the origin and use of a serial or lot through item entries. Check filters and the full entry chain; tracing shows history but changes no inventory.",
      "Suit l’origine et l’utilisation du numéro de série ou lot dans les écritures article. Vérifiez filtres et historique complet ; le suivi ne modifie pas le stock.",
      "Verfolgt Herkunft und Verwendung der Serien- oder Losnummer in Artikelposten. Prüfen Sie Filter und vollständige Kette; dies ändert keinen Bestand.",
      "Rastrea el origen y uso del número de serie o lote en movimientos. Comprueba filtros y toda la cadena; no modifica el inventario.",
      "Sporer serie- eller partinummerets oprindelse og brug i vareposter. Kontrollér filtre og hele kæden; lageret ændres ikke.",
      "Jäljittää sarja- tai eränumeron alkuperän ja käytön tapahtumista. Tarkista suodattimet ja ketju; varasto ei muutu.",
      "Sporer serie- eller partinummerets opprinnelse og bruk i vareposter. Kontroller filtre og hele kjeden; lageret endres ikke."
    ],
    trackingFindEntries: [
      "Listar artikeltransaktioner för det valda spårningsnumret. Granska datum, dokument och in-/utgående antal för att se var numret använts; detta är endast en sökning.",
      "Lists item entries for the selected tracking number. Review dates, documents, and inbound/outbound quantities to see where it was used; this is a lookup only.",
      "Liste les écritures liées au numéro de suivi choisi. Examinez dates, documents et quantités ; il s’agit uniquement d’une recherche.",
      "Listet Artikelposten zur gewählten Trackingnummer. Prüfen Sie Datum, Belege und Mengen; dies ist nur eine Abfrage.",
      "Muestra movimientos del número seleccionado. Revisa fechas, documentos y cantidades; es solo una consulta.",
      "Viser vareposter for sporingsnummeret. Gennemgå datoer, dokumenter og antal; dette er kun et opslag.",
      "Luettelee tunnukseen liittyvät nimiketapahtumat. Tarkista päivät, asiakirjat ja määrät; tämä on vain haku.",
      "Lister vareposter for sporingsnummeret. Se gjennom datoer, dokumenter og antall; dette er bare et oppslag."
    ],
    trackingAssign: [
      "Tilldelar eller ändrar serie- och partinummer på dokumentraden enligt artikelns spårningskod. Kontrollera att numren är rätt och unika och att deras antal motsvarar raden före bokföring.",
      "Assigns or changes serial and lot numbers on the document line under the item's tracking code. Check the numbers are correct and unique and their quantity matches the line before posting.",
      "Attribue ou modifie les numéros de série et de lot sur la ligne selon le code de suivi. Vérifiez leur exactitude, unicité et correspondance avec la quantité avant comptabilisation.",
      "Weist der Belegzeile gemäß Trackingcode Serien- oder Losnummern zu oder ändert sie. Prüfen Sie Korrektheit, Eindeutigkeit und Gesamtmenge vor der Buchung.",
      "Asigna o cambia números de serie o lote en la línea según el seguimiento. Comprueba que sean correctos, únicos y que coincida la cantidad antes de registrar.",
      "Tildeler eller ændrer serie- og partinumre efter varens sporingskode. Kontrollér, at numrene er korrekte og unikke, og at antal stemmer før bogføring.",
      "Määrittää tai muuttaa rivin sarja- tai eränumeroita jäljityskoodin mukaan. Tarkista tunnisteiden oikeellisuus, yksilöllisyys ja määrä ennen kirjausta.",
      "Tildeler eller endrer serie- og partinummer etter sporingskoden. Kontroller at numrene er riktige og unike og at antallet stemmer før bokføring."
    ],
    trackingReclassify: [
      "Ändrar spårningsuppgifterna för befintligt lager, exempelvis rättar eller byter parti- eller serienummer genom omklassificeringsjournalen. Kontrollera från- och tillnummer, artikelspårning och kvantitet; granska bokförda artikeltransaktioner efteråt.",
      "Changes tracking details on existing inventory, such as correcting or replacing a lot or serial number through the reclassification journal. Check from/to numbers, tracking, and quantity; review posted item entries afterward.",
      "Modifie le suivi du stock existant, par exemple en corrigeant ou remplaçant un numéro de lot ou série via le journal de reclassement. Vérifiez anciennes/nouvelles valeurs et quantité, puis les écritures.",
      "Ändert Trackingangaben vorhandener Bestände, etwa Los- oder Seriennummern im Umlagerungsjournal. Prüfen Sie alte und neue Nummern sowie Menge; kontrollieren Sie danach Artikelposten.",
      "Cambia datos de seguimiento del inventario existente, como corregir o sustituir un lote o serie mediante el diario de reclasificación. Comprueba valores y cantidad; revisa movimientos después.",
      "Ændrer sporingsoplysninger for eksisterende lager, f.eks. parti- eller serienummer via omklassificeringskladden. Kontrollér fra-/tilnummer og antal; gennemgå vareposter bagefter.",
      "Muuttaa olemassa olevan varaston jäljitystietoja, kuten korjaa tai vaihtaa erä- tai sarjanumeron uudelleenluokittelupäiväkirjassa. Tarkista vanhat/uudet tunnisteet ja määrä sekä kirjaukset.",
      "Endrer sporingsdetaljer for eksisterende lager, som korrigering eller bytte av parti- eller serienummer via omklassifiseringskladden. Kontroller numre og mengde; gjennomgå vareposter etterpå."
    ],
    cashReceiptJournal: [
      "Öppnar kassainbetalningsjournalen för registrering och avstämning av kundbetalningar. Att öppna journalen bokför inget. Kontrollera betalningsmetod, bankkonto och kund innan du matchar eller bokför rader.",
      "Opens the cash receipt journal for entering and reconciling customer payments. Opening it posts nothing. Check payment method, bank account, and customer before applying or posting lines.",
      "Ouvre la feuille des encaissements pour saisir et rapprocher les paiements clients. L’ouverture ne comptabilise rien. Vérifiez mode de paiement, compte bancaire et client avant traitement.",
      "Öffnet das Zahlungseingangsjournal zur Erfassung und Abstimmung von Kundenzahlungen. Das Öffnen bucht nichts. Prüfen Sie Zahlungsart, Bankkonto und Debitor vor der Buchung.",
      "Abre el diario de cobros para registrar y conciliar pagos de clientes. Abrirlo no registra nada. Comprueba método, banco y cliente antes de aplicar o registrar líneas.",
      "Åbner indbetalingskladden til registrering og afstemning af kundebetalinger. Åbning bogfører intet. Kontrollér betalingsmetode, bankkonto og kunde før behandling.",
      "Avaa kassakuittikirja asiakkaiden maksujen tallennukseen ja täsmäytykseen. Avaaminen ei kirjaa mitään. Tarkista maksutapa, pankkitili ja asiakas ennen rivien kohdistusta tai kirjausta.",
      "Åpner innbetalingskladden for registrering og avstemming av kundebetalinger. Åpning bokfører ingenting. Kontroller betalingsmåte, bankkonto og kunde før behandling."
    ],
    cashApplyCustomer: [
      "Kopplar betalningen i journalen till öppna kundposter och beräknar återstående belopp. Kontrollera fakturor, kreditposter, valuta och eventuell orealiserad differens; bokföringen sker först när journalen bokförs.",
      "Applies the journal payment to open customer entries and calculates the remaining amount. Check invoices, credits, currency, and any difference; posting occurs only when the journal is posted.",
      "Affecte le paiement aux écritures client ouvertes et calcule le solde restant. Vérifiez factures, avoirs et écarts ; la comptabilisation a lieu lors du report du journal.",
      "Ordnet die Zahlung offenen Debitorenposten zu und berechnet den Restbetrag. Prüfen Sie Rechnungen, Gutschriften und Differenzen; gebucht wird erst das Journal.",
      "Aplica el pago a movimientos abiertos del cliente y calcula el saldo restante. Comprueba facturas, abonos y diferencias; se registra al contabilizar el diario.",
      "Udligner betalingen med åbne debitorposter og beregner restbeløbet. Kontrollér fakturaer, kreditposter og difference; bogføring sker først ved bogføring af kladden.",
      "Kohdistaa maksun avoimiin asiakastapahtumiin ja laskee jäljellä olevan summan. Tarkista laskut, hyvitykset ja erotus; kirjaus tapahtuu vasta päiväkirjan kirjauksessa.",
      "Utligner betalingen mot åpne kundeposter og beregner restbeløpet. Kontroller fakturaer, kreditposter og avvik; bokføring skjer først når kladden bokføres."
    ],
    cashPostReceipt: [
      "Bokför kassainbetalningsjournalens kundbetalningar och utjämningar. Kontrollera bankkonto, belopp, kundposter och differenser före bokföring; granska sedan kund- och banktransaktionerna.",
      "Posts customer payments and applications in the cash receipt journal. Check the bank account, amounts, customer entries, and differences first; then review customer and bank ledger entries.",
      "Comptabilise paiements et lettrages de la feuille d’encaissement. Vérifiez compte bancaire, montants, écritures client et écarts, puis contrôlez les écritures comptables.",
      "Bucht Kundenzahlungen und Ausgleiche aus dem Zahlungseingangsjournal. Prüfen Sie Bankkonto, Beträge, Debitorenposten und Differenzen und danach die Ledgerposten.",
      "Registra pagos y aplicaciones del diario de cobros. Comprueba banco, importes, movimientos de clientes y diferencias; revisa después los movimientos contables.",
      "Bogfører kundebetalinger og udligninger fra indbetalingskladden. Kontrollér bankkonto, beløb, debitorposter og differencer, og gennemgå derefter posterne.",
      "Kirjaa kassakuittikirjan asiakasmaksut ja kohdistukset. Tarkista pankkitili, summat, asiakastapahtumat ja erot; tarkista sen jälkeen asiakas- ja pankkikirjaukset.",
      "Bokfører kundebetalinger og utligninger fra innbetalingskladden. Kontroller bankkonto, beløp, kundeposter og avvik, og gjennomgå postene etterpå."
    ],
    cashPaymentJournal: [
      "Öppnar betalningsjournalen för att förbereda leverantörsbetalningar. Att öppna den skickar eller bokför inga betalningar. Kontrollera betalningskonto, förfallodatum och valuta innan förslag hämtas.",
      "Opens the payment journal to prepare vendor payments. Opening it sends or posts no payments. Check the payment account, due dates, and currency before creating suggestions.",
      "Ouvre le journal de paiement pour préparer les règlements fournisseurs. L’ouverture n’envoie ni ne comptabilise rien. Vérifiez compte, échéances et devise.",
      "Öffnet das Zahlungsausgangsjournal zur Vorbereitung von Lieferantenzahlungen. Das Öffnen sendet oder bucht nichts. Prüfen Sie Zahlungskonto, Fälligkeit und Währung.",
      "Abre el diario de pagos para preparar pagos a proveedores. Abrirlo no envía ni registra pagos. Comprueba cuenta, vencimientos y moneda.",
      "Åbner betalingskladden til forberedelse af leverandørbetalinger. Åbning sender eller bogfører intet. Kontrollér betalingskonto, forfaldsdato og valuta.",
      "Avaa maksupäiväkirjan toimittajamaksujen valmistelua varten. Avaaminen ei lähetä eikä kirjaa maksuja. Tarkista maksutili, eräpäivä ja valuutta.",
      "Åpner betalingskladden for å forberede leverandørbetalinger. Åpning sender eller bokfører ingenting. Kontroller betalingskonto, forfallsdato og valuta."
    ],
    cashSuggestVendorPayments: [
      "Fyller betalningsjournalen med föreslagna leverantörsbetalningar utifrån förfallna och öppna poster. Förslaget är inte skickat eller bokfört. Kontrollera leverantör, bankkonto, prioritet, valuta och betalningsbelopp.",
      "Populates the payment journal with suggested vendor payments from due open entries. Suggestions are not sent or posted. Check vendor, bank account, priority, currency, and payment amount.",
      "Propose des paiements fournisseurs à partir des écritures ouvertes échues. Ils ne sont ni envoyés ni comptabilisés. Vérifiez fournisseur, compte, priorité, devise et montant.",
      "Füllt das Journal mit vorgeschlagenen Lieferantenzahlungen aus fälligen offenen Posten. Diese sind nicht gesendet oder gebucht. Prüfen Sie Kreditor, Konto, Priorität, Währung und Betrag.",
      "Rellena el diario con pagos sugeridos de partidas vencidas. No se envían ni registran todavía. Comprueba proveedor, banco, prioridad, moneda e importe.",
      "Udfylder kladden med foreslåede leverandørbetalinger fra forfaldne åbne poster. De er ikke sendt eller bogført. Kontrollér leverandør, bankkonto, prioritet, valuta og beløb.",
      "Täyttää päiväkirjaan ehdotetut maksut erääntyneistä avoimista tapahtumista. Ehdotuksia ei ole lähetetty tai kirjattu. Tarkista toimittaja, pankkitili, prioriteetti, valuutta ja summa.",
      "Fyller kladden med foreslåtte leverandørbetalinger fra forfalte åpne poster. De er ikke sendt eller bokført. Kontroller leverandør, bankkonto, prioritet, valuta og beløp."
    ],
    cashPostPayments: [
      "Bokför betalningsjournalens leverantörsbetalningar och utjämnar valda fakturor. Kontrollera betalningsfil eller bankflöde separat om det används; granska bank- och leverantörsposter efter bokföring.",
      "Posts vendor payments in the payment journal and applies selected invoices. If a payment file or bank flow is used, verify it separately; review bank and vendor entries after posting.",
      "Comptabilise les paiements fournisseurs et règle les factures choisies. Vérifiez séparément le fichier ou flux bancaire s’il est utilisé, puis les écritures fournisseur et banque.",
      "Bucht Lieferantenzahlungen und gleicht ausgewählte Rechnungen aus. Prüfen Sie eine Zahlungsdatei oder Bankübertragung separat; kontrollieren Sie danach Bank- und Kreditorenposten.",
      "Registra pagos a proveedores y aplica facturas seleccionadas. Verifica aparte el archivo o flujo bancario si se usa; revisa después los movimientos de banco y proveedor.",
      "Bogfører leverandørbetalinger og udligner valgte fakturaer. Kontrollér betalingsfil eller bankflow separat, hvis det bruges; gennemgå bank- og leverandørposter bagefter.",
      "Kirjaa toimittajamaksut ja kohdistaa valitut laskut. Tarkista maksutiedosto tai pankkiyhteys erikseen; tarkista pankki- ja toimittajakirjaukset.",
      "Bokfører leverandørbetalinger og utligner valgte fakturaer. Kontroller betalingsfil eller bankflyt separat ved bruk; gjennomgå bank- og leverandørposter etterpå."
    ],
    cashReconciliationJournal: [
      "Öppnar betalningsavstämningsjournalen för att jämföra importerade bankbetalningar med Business Central-poster. Att öppna vyn ändrar inte betalningar. Kontrollera kontoutdragsrader och bankkontots valuta.",
      "Opens the payment reconciliation journal to compare imported bank payments with Business Central entries. Opening it changes no payments. Check statement lines and the bank account currency.",
      "Ouvre le journal de rapprochement des paiements pour comparer les paiements importés aux écritures BC. L’ouverture ne modifie pas les paiements. Vérifiez relevé et devise du compte.",
      "Öffnet das Zahlungsabstimmungsjournal zum Vergleich importierter Bankzahlungen mit BC-Posten. Die Ansicht ändert keine Zahlungen. Prüfen Sie Auszugszeilen und Kontowährung.",
      "Abre la conciliación de pagos para comparar pagos bancarios importados con movimientos de BC. Abrirla no modifica pagos. Comprueba líneas y moneda de la cuenta.",
      "Åbner betalingsafstemningskladden til sammenligning af importerede bankbetalinger med BC-poster. Visningen ændrer ingen betalinger. Kontrollér kontoudtogslinjer og valuta.",
      "Avaa maksujen täsmäytyskirjan tuodun tiliotteen vertaamiseksi BC-tapahtumiin. Avaaminen ei muuta maksuja. Tarkista tilioterivit ja tilin valuutta.",
      "Åpner betalingsavstemmingskladden for å sammenligne importerte bankbetalinger med BC-poster. Visningen endrer ingen betalinger. Kontroller kontoutdragslinjer og valuta."
    ],
    cashAutoApply: [
      "Försöker matcha importerade bankbetalningar till öppna leverantörs- eller kundposter enligt matchningsreglerna. Granska varje föreslagen matchning och differens; betalningen är inte bokförd förrän avstämningen bokförs.",
      "Attempts to match imported bank payments to open vendor or customer entries using the rules. Review each suggested match and difference; payments are not posted until the reconciliation is posted.",
      "Tente de rapprocher les paiements importés des écritures ouvertes selon les règles. Examinez chaque correspondance et écart ; rien n’est comptabilisé avant le rapprochement.",
      "Versucht, importierte Bankzahlungen nach Regeln offenen Debitoren- oder Kreditorenposten zuzuordnen. Prüfen Sie Treffer und Differenzen; gebucht wird erst mit der Abstimmung.",
      "Intenta emparejar pagos importados con movimientos abiertos según las reglas. Revisa cada coincidencia y diferencia; no se registra hasta contabilizar la conciliación.",
      "Forsøger at matche importerede betalinger med åbne debitor- eller kreditorposter efter reglerne. Gennemgå hvert match og difference; bogføring sker ved bogføring af afstemningen.",
      "Yrittää kohdistaa tuodut pankkimaksut avoimiin asiakas- tai toimittajatapahtumiin sääntöjen mukaan. Tarkista osumat ja erot; maksut kirjataan vasta täsmäytyksen kirjauksessa.",
      "Prøver å matche importerte betalinger mot åpne kunde- eller leverandørposter etter reglene. Kontroller treff og avvik; bokføring skjer når avstemmingen bokføres."
    ],
    cashManualApply: [
      "Låter dig välja vilken öppen post som ska matchas mot den importerade betalningen. Kontrollera betalningsreferens, belopp, valuta och eventuell delbetalning; granska återstående differens innan bokföring.",
      "Lets you choose the open entry to match with an imported payment. Check payment reference, amount, currency, and partial payments; review any remaining difference before posting.",
      "Permet de choisir l’écriture à associer au paiement importé. Vérifiez référence, montant, devise et paiement partiel ; contrôlez le solde avant comptabilisation.",
      "Ermöglicht die Auswahl des offenen Postens für eine importierte Zahlung. Prüfen Sie Referenz, Betrag, Währung und Teilzahlung; kontrollieren Sie die Differenz.",
      "Permite elegir el movimiento abierto para el pago importado. Comprueba referencia, importe, moneda y pagos parciales; revisa diferencias antes de registrar.",
      "Lader dig vælge den åbne post, som en importeret betaling skal matches med. Kontrollér reference, beløb, valuta og delbetaling; gennemgå difference før bogføring.",
      "Voit valita avoimen tapahtuman tuodulle maksulle. Tarkista viite, summa, valuutta ja osasuoritus; tarkista jäljelle jäävä ero ennen kirjausta.",
      "Lar deg velge åpen post som skal matches mot importert betaling. Kontroller referanse, beløp, valuta og delbetaling; gjennomgå avvik før bokføring."
    ],
    cashPostReconciliation: [
      "Bokför den granskade betalningsavstämningen och registrerar matchade transaktioner enligt bankkontots inställningar. Kontrollera omatchade rader och differenser först; granska sedan utjämnade kund-/leverantörsposter och bankposter.",
      "Posts the reviewed payment reconciliation and records matched transactions under the bank setup. Check unmatched lines and differences first; then review applied customer/vendor and bank entries.",
      "Comptabilise le rapprochement vérifié et enregistre les paiements rapprochés selon le paramétrage bancaire. Vérifiez les lignes non rapprochées et les écarts, puis les écritures lettrées.",
      "Bucht die geprüfte Zahlungsabstimmung gemäß Bankeinrichtung. Prüfen Sie offene Zeilen und Differenzen; kontrollieren Sie danach ausgeglichene Debitoren-/Kreditoren- und Bankposten.",
      "Registra la conciliación revisada y los pagos emparejados según el banco. Comprueba líneas y diferencias; revisa después movimientos conciliados de clientes/proveedores y banco.",
      "Bogfører den gennemgåede betalingsafstemning efter bankopsætningen. Kontrollér umatchede linjer og differencer; gennemgå derefter udlignede debitor-/kreditor- og bankposter.",
      "Kirjaa tarkistetun maksujen täsmäytyksen pankkiasetusten mukaan. Tarkista kohdistamattomat rivit ja erot; tarkista kohdistetut asiakas-/toimittaja- ja pankkitapahtumat.",
      "Bokfører den gjennomgåtte betalingsavstemmingen etter bankoppsettet. Kontroller umatchede linjer og avvik; gjennomgå utlignede kunde-/leverandør- og bankposter etterpå."
    ],
    costTransferEntries: [
      "Överför valda huvudbokstransaktioner till kostnadsredovisningen som kostnadsposter. Kontrollera bokföringsdatum, filter, kostnadsställe och kostnadsobjekt; överföringen är separat från eventuell bokföring av kostnadsjournalen.",
      "Transfers selected general ledger entries into cost accounting as cost entries. Check posting date, filters, cost center, and cost object; this is separate from posting a cost journal.",
      "Transfère les écritures générales sélectionnées en écritures de coûts. Vérifiez date, filtres, centre et objet de coût ; le transfert est distinct de la comptabilisation du journal.",
      "Überträgt ausgewählte Sachposten als Kostenposten in die Kostenrechnung. Prüfen Sie Buchungsdatum, Filter, Kostenstelle und Kostenträger; dies ersetzt nicht die Kostenjournalbuchung.",
      "Transfiere movimientos seleccionados al módulo de costes. Comprueba fecha, filtros, centro y objeto de coste; la transferencia es distinta del registro del diario.",
      "Overfører valgte finansposter til omkostningsregnskabet som omkostningsposter. Kontrollér dato, filtre, omkostningssted og -objekt; journalen bogføres separat.",
      "Siirtää valitut pääkirjatapahtumat kustannuslaskennan tapahtumiksi. Tarkista kirjauspäivä, suodattimet, kustannuspaikka ja -kohde; päiväkirja kirjataan erikseen.",
      "Overfører valgte hovedboksposter til kostnadsregnskapet. Kontroller dato, filtre, kostnadssted og -objekt; kostnadskladden bokføres separat."
    ],
    costRunAllocation: [
      "Beräknar och skapar kostnadsfördelningsrader utifrån vald fördelningsmetod och kostnadsbas. Granska nyckel, period, kostnadsställe och mottagare; fördelningen är inte bokförd förrän journalposterna bokförs.",
      "Calculates and creates cost allocation entries from the selected allocation method and cost basis. Review key, period, cost center, and recipients; entries are not posted until the journal is posted.",
      "Calcule et crée des lignes de répartition selon la méthode et la base choisies. Vérifiez clé, période, centre et destinataires ; les lignes doivent encore être comptabilisées.",
      "Berechnet Kostenverteilungszeilen anhand Methode und Kostenbasis. Prüfen Sie Schlüssel, Zeitraum, Kostenstelle und Empfänger; gebucht wird erst das Journal.",
      "Calcula y crea líneas de distribución según el método y base seleccionados. Revisa clave, periodo, centro y receptores; las líneas aún deben registrarse.",
      "Beregner og opretter omkostningsfordelingslinjer efter valgt metode og grundlag. Gennemgå nøgle, periode, omkostningssted og modtagere; kladden bogføres separat.",
      "Laskee ja luo kustannusten kohdistusrivejä valitun menetelmän ja perusteen mukaan. Tarkista avain, kausi, kustannuspaikka ja kohteet; kirjaa päiväkirja erikseen.",
      "Beregner og oppretter kostnadsfordelingslinjer etter valgt metode og grunnlag. Kontroller nøkkel, periode, kostnadssted og mottakere; kladden bokføres separat."
    ],
    costCalculateKey: [
      "Beräknar fördelningsnyckeln för vald kostnadsfördelning. Kontrollera att basvärden, period och kostnadsställen ingår som avsett och att nyckelandelarna summerar rätt innan fördelningen körs.",
      "Calculates the allocation key for the selected cost allocation. Check that base values, period, and cost centers are included as intended and that shares total correctly before running the allocation.",
      "Calcule la clé de répartition choisie. Vérifiez les bases, la période et les centres inclus, ainsi que le total des parts avant d’exécuter la répartition.",
      "Berechnet den Verteilungsschlüssel. Prüfen Sie Basiswerte, Zeitraum und Kostenstellen sowie die Summe der Anteile, bevor Sie die Verteilung ausführen.",
      "Calcula la clave de distribución seleccionada. Comprueba bases, periodo y centros incluidos y que las proporciones sumen correctamente antes de ejecutar.",
      "Beregner fordelingsnøglen. Kontrollér grundværdier, periode og omkostningssteder, og at andele summerer korrekt, før fordelingen køres.",
      "Laskee kohdistusavaimen. Tarkista perustiedot, kausi ja kustannuspaikat sekä osuuksien summa ennen kohdistuksen suorittamista.",
      "Beregner fordelingsnøkkelen. Kontroller grunnlag, periode og kostnadssteder og at andelene summerer riktig før fordelingen kjøres."
    ],
    costCreateBudget: [
      "Skapar ett kostnadsbudget för planerade kostnader per period, kostnadsställe eller kostnadsobjekt. Kontrollera budgetår, dimensioner och belopp; skapa inte dubbla budgetposter för samma omfattning.",
      "Creates a cost budget for planned costs by period, cost center, or cost object. Check the budget year, dimensions, and amounts; avoid duplicate entries for the same scope.",
      "Crée un budget de coûts par période, centre ou objet de coût. Vérifiez exercice, dimensions et montants ; évitez les doublons sur le même périmètre.",
      "Erstellt ein Kostenbudget nach Zeitraum, Kostenstelle oder Kostenträger. Prüfen Sie Budgetjahr, Dimensionen und Beträge; vermeiden Sie doppelte Ansätze.",
      "Crea un presupuesto de costes por periodo, centro u objeto de coste. Comprueba ejercicio, dimensiones e importes; evita duplicados del mismo alcance.",
      "Opretter et omkostningsbudget pr. periode, omkostningssted eller -objekt. Kontrollér budgetår, dimensioner og beløb; undgå dubletter for samme omfang.",
      "Luo kustannusbudjetin kausittain, kustannuspaikoittain tai -kohteittain. Tarkista budjettivuosi, dimensiot ja summat; vältä päällekkäisiä rivejä.",
      "Oppretter et kostnadsbudsjett per periode, kostnadssted eller -objekt. Kontroller budsjettår, dimensjoner og beløp; unngå duplikater."
    ],
    costCreateCenter: [
      "Skapar ett kostnadsställe som kan användas för att samla och följa kostnader. Kontrollera kod, ansvarig och giltighetsperiod och koppla det till rätt kostnadsfördelningar innan det används.",
      "Creates a cost center for grouping and monitoring costs. Check its code, owner, and validity period and include it in the correct allocations before use.",
      "Crée un centre de coûts pour regrouper et suivre les coûts. Vérifiez code, responsable et période de validité avant de l’utiliser dans les répartitions.",
      "Erstellt eine Kostenstelle zur Sammlung und Überwachung von Kosten. Prüfen Sie Code, Verantwortlichen und Gültigkeit vor Verwendung in Verteilungen.",
      "Crea un centro de coste para agrupar y controlar costes. Comprueba código, responsable y vigencia antes de incluirlo en distribuciones.",
      "Opretter et omkostningssted til gruppering og opfølgning af omkostninger. Kontrollér kode, ansvarlig og gyldighed før brug i fordelinger.",
      "Luo kustannuspaikan kustannusten ryhmittelyyn ja seurantaan. Tarkista koodi, vastuuhenkilö ja voimassaolo ennen kohdistuksiin liittämistä.",
      "Oppretter et kostnadssted for gruppering og oppfølging av kostnader. Kontroller kode, ansvarlig og gyldighetsperiode før bruk."
    ],
    costCreateObject: [
      "Skapar ett kostnadsobjekt, alltså det ändamål eller den aktivitet som kostnader ska följas mot. Kontrollera kod, beskrivning och giltighet och använd samma objekt konsekvent i journaler och fördelningar.",
      "Creates a cost object, the purpose or activity against which costs are tracked. Check its code, description, and validity and use it consistently in journals and allocations.",
      "Crée un objet de coût représentant l’activité suivie. Vérifiez code, description et validité, puis utilisez-le de façon cohérente dans journaux et répartitions.",
      "Erstellt einen Kostenträger, also den Zweck oder die Aktivität für die Kostenerfassung. Prüfen Sie Code, Beschreibung und Gültigkeit und verwenden Sie ihn konsistent.",
      "Crea un objeto de coste para identificar la actividad a la que se imputan costes. Comprueba código, descripción y vigencia y úsalo de forma coherente.",
      "Opretter et omkostningsobjekt for det formål eller den aktivitet, omkostninger følges på. Kontrollér kode, beskrivelse og gyldighed, og brug det konsekvent.",
      "Luo kustannuskohteen, jota vasten kustannuksia seurataan. Tarkista koodi, kuvaus ja voimassaolo ja käytä sitä johdonmukaisesti.",
      "Oppretter et kostnadsobjekt for formålet eller aktiviteten kostnader følges mot. Kontroller kode, beskrivelse og gyldighet og bruk det konsekvent."
    ],
    costPostJournal: [
      "Bokför kostnadsjournalens kostnadsposter och uppdaterar kostnadsredovisningen. Kontrollera period, kostnadsställe, kostnadsobjekt, belopp och balansering; granska sedan bokförda kostnadsposter.",
      "Posts the cost journal entries and updates cost accounting. Check period, cost center, cost object, amounts, and balancing; then review the posted cost entries.",
      "Comptabilise les écritures du journal de coûts et met à jour la comptabilité analytique. Vérifiez période, centre, objet, montants et équilibre ; examinez ensuite les écritures.",
      "Bucht die Kostenjournalposten und aktualisiert die Kostenrechnung. Prüfen Sie Zeitraum, Kostenstelle, Kostenträger, Beträge und Ausgleich; kontrollieren Sie die gebuchten Posten.",
      "Registra las líneas del diario de costes y actualiza la contabilidad de costes. Comprueba periodo, centro, objeto, importes y cuadre; revisa después los movimientos.",
      "Bogfører omkostningskladdens poster og opdaterer omkostningsregnskabet. Kontrollér periode, sted, objekt, beløb og balance; gennemgå derefter posterne.",
      "Kirjaa kustannuspäiväkirjan tapahtumat. Tarkista kausi, kustannuspaikka ja -kohde, summat ja tasapaino; tarkista kirjatut tapahtumat.",
      "Bokfører kostnadskladdens poster og oppdaterer kostnadsregnskapet. Kontroller periode, sted, objekt, beløp og balanse; gjennomgå postene etterpå."
    ],
    costDeleteBudgetEntries: [
      "Tar bort de valda kostnadsbudgetposterna. Kontrollera urval och filter noggrant före bekräftelse; borttagningen kan påverka budgetrapporter och går inte att återställa utan ny inmatning eller återläsning.",
      "Deletes the selected cost budget entries. Carefully check the selection and filters before confirming; reports may change and recovery may require re-entry or restore.",
      "Supprime les écritures de budget de coûts sélectionnées. Vérifiez soigneusement sélection et filtres ; la restauration peut nécessiter une nouvelle saisie ou une sauvegarde.",
      "Löscht die ausgewählten Kostenbudgetposten. Prüfen Sie Auswahl und Filter sorgfältig; eine Wiederherstellung erfordert ggf. Neueingabe oder Sicherung.",
      "Elimina las partidas de presupuesto seleccionadas. Comprueba filtros y selección; recuperarlas puede requerir volver a introducirlas o restaurar una copia.",
      "Sletter de valgte budgetposter. Kontrollér udvalg og filtre grundigt; gendannelse kan kræve ny indtastning eller sikkerhedskopi.",
      "Poistaa valitut kustannusbudjettitapahtumat. Tarkista valinta ja suodattimet; palautus voi vaatia uudelleensyöttöä tai varmuuskopiota.",
      "Sletter valgte kostnadsbudsjettposter. Kontroller utvalg og filtre nøye; gjenoppretting kan kreve ny registrering eller sikkerhetskopi."
    ],
    edocMatchPurchase: [
      "Matchar rader i det elektroniska inköpsdokumentet mot rader på Business Central-inköpsordern. Kontrollera artikel, antal, pris och radreferens; en matchning godkänner inte automatiskt dokumentet eller bokför ordern.",
      "Matches lines in the incoming electronic purchase document to Business Central purchase order lines. Check item, quantity, price, and references; matching does not approve the document or post the order.",
      "Associe les lignes du document d’achat électronique aux lignes de commande BC. Vérifiez article, quantité, prix et références ; l’association n’approuve ni ne comptabilise la commande.",
      "Ordnet Zeilen des elektronischen Einkaufsbelegs BC-Bestellzeilen zu. Prüfen Sie Artikel, Menge, Preis und Referenz; die Zuordnung genehmigt oder bucht nichts.",
      "Empareja líneas del documento electrónico de compra con líneas del pedido BC. Comprueba producto, cantidad, precio y referencia; no aprueba ni registra el pedido.",
      "Matcher linjer i det elektroniske købsdokument med BC-købsordrelinjer. Kontrollér vare, antal, pris og reference; matchning godkender eller bogfører ikke ordren.",
      "Kohdistaa sähköisen ostolaskun rivejä BC-ostotilausriveihin. Tarkista nimike, määrä, hinta ja viite; kohdistus ei hyväksy asiakirjaa tai kirjaa tilausta.",
      "Matcher linjer i det elektroniske kjøpsdokumentet mot BC-ordren. Kontroller vare, antall, pris og referanse; matchingen godkjenner eller bokfører ikke ordren."
    ],
    edocUpdatePurchaseLink: [
      "Ändrar kopplingen mellan det elektroniska inköpsdokumentet och Business Central-inköpsordern. Kontrollera att dokument och leverantör stämmer innan kopplingen sparas; detta uppdaterar inte i sig orderrader eller fakturastatus.",
      "Changes the link between the electronic purchase document and the Business Central order. Verify the document and vendor before saving; this alone does not update order lines or invoice status.",
      "Modifie le lien entre le document d’achat électronique et la commande BC. Vérifiez document et fournisseur ; cela ne met pas à jour les lignes ni le statut de facture.",
      "Ändert die Verknüpfung zwischen elektronischem Einkaufsbeleg und BC-Bestellung. Prüfen Sie Beleg und Kreditor; Bestellzeilen oder Rechnungsstatus ändern sich dadurch nicht.",
      "Cambia el vínculo entre el documento electrónico de compra y el pedido BC. Verifica documento y proveedor; no actualiza por sí solo líneas ni estado de factura.",
      "Ændrer forbindelsen mellem det elektroniske købsdokument og BC-ordren. Kontrollér dokument og leverandør; ordrelinjer eller fakturastatus ændres ikke heraf.",
      "Muuttaa sähköisen ostoasiakirjan ja BC-tilauksen linkkiä. Tarkista asiakirja ja toimittaja; tämä ei päivitä rivejä tai laskun tilaa.",
      "Endrer koblingen mellom det elektroniske kjøpsdokumentet og BC-ordren. Kontroller dokument og leverandør; ordrelinjer eller fakturastatus oppdateres ikke av dette."
    ],
    edocSend: [
      "Skickar det elektroniska dokumentet till vald mottagare eller tjänsteleverantör enligt dokumentinställningarna. Kontrollera mottagare, format och statuslogg; Skickat betyder inte nödvändigtvis att mottagaren accepterat dokumentet.",
      "Sends the electronic document to the selected recipient or service provider under the document setup. Check recipient, format, and status log; sent does not necessarily mean accepted.",
      "Envoie le document électronique au destinataire ou prestataire choisi selon le paramétrage. Vérifiez destinataire, format et journal ; envoyé ne signifie pas accepté.",
      "Sendet das elektronische Dokument gemäß Einrichtung an Empfänger oder Dienstleister. Prüfen Sie Empfänger, Format und Protokoll; gesendet bedeutet nicht angenommen.",
      "Envía el documento electrónico al destinatario o proveedor elegido. Comprueba destinatario, formato y registro; enviado no implica aceptación.",
      "Sender det elektroniske dokument til valgt modtager eller tjenesteudbyder efter opsætningen. Kontrollér modtager, format og log; sendt betyder ikke nødvendigvis accepteret.",
      "Lähettää sähköisen asiakirjan valitulle vastaanottajalle tai palveluntarjoajalle asetusten mukaan. Tarkista vastaanottaja, muoto ja loki; lähetetty ei tarkoita hyväksyttyä.",
      "Sender det elektroniske dokumentet til valgt mottaker eller tjenesteleverandør etter oppsettet. Kontroller mottaker, format og logg; sendt betyr ikke nødvendigvis akseptert."
    ],
    edocViewLogs: [
      "Öppnar bearbetningsloggen för elektroniska dokument så att skickade, mottagna och felaktiga meddelanden kan granskas. Vyn ändrar inte dokumentet. Använd korrelations-ID och tidsstämpel för att följa ett fel.",
      "Opens the electronic document processing log to review sent, received, and failed messages. The view does not change the document. Use the correlation ID and timestamp to trace an error.",
      "Ouvre le journal des documents électroniques pour examiner messages envoyés, reçus ou en erreur. La vue ne modifie rien. Utilisez identifiant de corrélation et horodatage pour tracer l’erreur.",
      "Öffnet das E-Dokument-Verarbeitungsprotokoll für gesendete, empfangene und fehlgeschlagene Nachrichten. Die Ansicht ändert nichts. Nutzen Sie Korrelations-ID und Zeitstempel.",
      "Abre el registro de procesamiento de documentos electrónicos para revisar mensajes enviados, recibidos y fallidos. La vista no modifica datos. Usa ID de correlación y fecha para investigar.",
      "Åbner behandlingsloggen for elektroniske dokumenter til gennemgang af sendte, modtagne og fejlede meddelelser. Visningen ændrer intet. Brug korrelations-id og tidsstempel.",
      "Avaa sähköisten asiakirjojen käsittelylokin lähetettyjen, vastaanotettujen ja epäonnistuneiden viestien tarkistamiseen. Näkymä ei muuta asiakirjaa. Käytä korrelaatiotunnusta ja aikaleimaa.",
      "Åpner behandlingsloggen for elektroniske dokumenter for å se sendte, mottatte og feilede meldinger. Visningen endrer ikke dokumentet. Bruk korrelasjons-ID og tidsstempel."
    ],
    edocCreatePurchaseDoc: [
      "Skapar ett inköpsdokument i Business Central från det elektroniska dokumentet och matchade rader. Dokumentet kan fortfarande vara obokfört. Kontrollera leverantör, belopp, moms och rader före fortsatt hantering.",
      "Creates a Business Central purchase document from the electronic document and matched lines. The document may remain unposted. Check vendor, amounts, tax, and matched lines before processing.",
      "Crée un document d’achat BC à partir du document électronique et des lignes associées. Il peut rester non comptabilisé. Vérifiez fournisseur, montants, taxes et lignes avant traitement.",
      "Erstellt aus E-Dokument und zugeordneten Zeilen einen BC-Einkaufsbeleg. Er kann ungebucht bleiben. Prüfen Sie Kreditor, Beträge, Steuer und Zeilen vor der Verarbeitung.",
      "Crea un documento de compra BC desde el documento electrónico y líneas emparejadas. Puede seguir sin registrar. Comprueba proveedor, importes, impuestos y líneas antes de continuar.",
      "Opretter et BC-købsdokument fra det elektroniske dokument og matchede linjer. Det kan stadig være ubogført. Kontrollér leverandør, beløb, moms og linjer.",
      "Luo BC-ostoasiakirjan sähköisestä asiakirjasta ja kohdistetuista riveistä. Asiakirjaa ei välttämättä ole kirjattu. Tarkista toimittaja, summat, verot ja rivit.",
      "Oppretter et BC-kjøpsdokument fra det elektroniske dokumentet og matchede linjer. Det kan fortsatt være ubokført. Kontroller leverandør, beløp, avgift og linjer."
    ]
  });
  Object.assign(moduleText, {
    marketingCampaign: [
      "Skapar en kampanjpost för att samla målgrupp, kontakturval och planerade aktiviteter. Kampanjposten skickar inte i sig meddelanden. Kontrollera målgrupp, start- och slutdatum samt kopplade segment.",
      "Creates a campaign record to organize a target audience, contact selection, and planned activities. The record does not send messages. Check the audience, dates, and linked segments.",
      "Crée une campagne pour organiser cible, contacts et activités prévues. L’enregistrement n’envoie pas de messages. Vérifiez cible, dates et segments associés.",
      "Erstellt einen Kampagnendatensatz für Zielgruppe, Kontakte und geplante Aktivitäten. Er versendet keine Nachrichten. Prüfen Sie Zielgruppe, Zeitraum und Segmente.",
      "Crea un registro de campaña para organizar público, contactos y actividades. No envía mensajes por sí mismo. Comprueba audiencia, fechas y segmentos vinculados.",
      "Opretter en kampagnepost til målgruppe, kontakter og planlagte aktiviteter. Den sender ikke meddelelser. Kontrollér målgruppe, datoer og tilknyttede segmenter.",
      "Luo kampanjatietueen kohderyhmän, yhteystietojen ja toimien järjestämiseen. Se ei lähetä viestejä. Tarkista kohderyhmä, päivät ja segmentit.",
      "Oppretter en kampanjepost for målgruppe, kontakter og planlagte aktiviteter. Den sender ikke meldinger. Kontroller målgruppe, datoer og tilknyttede segmenter."
    ],
    marketingInteraction: [
      "Registrerar en interaktion, till exempel ett samtal eller möte, på den valda kontakten. Det dokumenterar genomförd kontakt men skickar inte kommunikation. Kontrollera kontakt, datum, typ och relaterad kampanj.",
      "Records an interaction, such as a call or meeting, for the selected contact. It logs contact activity but does not send communication. Check contact, date, type, and related campaign.",
      "Enregistre une interaction, comme un appel ou une réunion, pour le contact choisi. Cela consigne l’activité sans envoyer de communication. Vérifiez contact, date, type et campagne.",
      "Erfasst eine Interaktion wie Anruf oder Besprechung für den Kontakt. Das protokolliert den Kontakt, versendet aber keine Nachricht. Prüfen Sie Kontakt, Datum, Typ und Kampagne.",
      "Registra una interacción, como llamada o reunión, en el contacto seleccionado. Documenta el contacto, pero no envía comunicación. Comprueba contacto, fecha, tipo y campaña.",
      "Registrerer en interaktion, f.eks. opkald eller møde, på kontakten. Det logger kontakten, men sender ikke kommunikation. Kontrollér kontakt, dato, type og kampagne.",
      "Kirjaa valitulle yhteyshenkilölle toiminnon, kuten puhelun tai tapaamisen. Se tallentaa yhteydenoton, mutta ei lähetä viestiä. Tarkista yhteyshenkilö, päivä, tyyppi ja kampanja.",
      "Registrerer en interaksjon, som en samtale eller et møte, på kontakten. Det logger kontakten, men sender ikke kommunikasjon. Kontroller kontakt, dato, type og kampanje."
    ],
    marketingCloseOpportunity: [
      "Stänger affärsmöjligheten och registrerar utfallet, exempelvis vunnen eller förlorad. Det skapar inte automatiskt en försäljningsorder. Kontrollera värde, utfall, stängningsdatum och orsak.",
      "Closes the sales opportunity and records its outcome, such as won or lost. It does not automatically create a sales order. Check value, outcome, close date, and reason.",
      "Clôt une opportunité commerciale et enregistre son issue, par exemple gagnée ou perdue. Cela ne crée pas automatiquement une commande. Vérifiez montant, issue, date et motif.",
      "Schließt die Verkaufschance und erfasst das Ergebnis, etwa gewonnen oder verloren. Dadurch entsteht nicht automatisch ein Auftrag. Prüfen Sie Wert, Ergebnis, Datum und Grund.",
      "Cierra la oportunidad y registra el resultado, como ganada o perdida. No crea automáticamente un pedido. Comprueba importe, resultado, fecha y motivo.",
      "Lukker salgsmuligheden og registrerer udfaldet, f.eks. vundet eller tabt. Det opretter ikke automatisk en salgsordre. Kontrollér værdi, udfald, dato og årsag.",
      "Sulkee myyntimahdollisuuden ja kirjaa tuloksen, kuten voiton tai häviön. Se ei luo automaattisesti myyntitilausta. Tarkista arvo, tulos, päivä ja syy.",
      "Lukker salgsmuligheten og registrerer utfallet, for eksempel vunnet eller tapt. Det oppretter ikke automatisk en salgsordre. Kontroller verdi, utfall, dato og årsak."
    ],
    marketingOpportunityStage: [
      "Flyttar försäljningsmöjligheten till en annan pipelinefas. Ändringen uppdaterar uppföljningsstatusen men bokför inget och innebär inte att affären är vunnen. Kontrollera nästa aktivitet, sannolikhet och förväntat slutdatum.",
      "Moves the sales opportunity to another pipeline stage. This updates its tracking status but does not post anything or mark the deal as won. Check next activity, probability, and expected close date.",
      "Déplace l’opportunité vers une autre étape du pipeline. Cela met à jour son suivi, sans comptabiliser ni conclure l’affaire. Vérifiez prochaine action, probabilité et date prévue.",
      "Verschiebt die Verkaufschance in eine andere Pipelinephase. Das aktualisiert den Status, schließt den Verkauf aber nicht ab. Prüfen Sie nächste Aktivität, Wahrscheinlichkeit und Abschlussdatum.",
      "Mueve la oportunidad a otra fase del proceso. Actualiza el seguimiento, pero no contabiliza ni marca la venta como ganada. Comprueba próxima actividad, probabilidad y fecha.",
      "Flytter salgsmuligheden til et andet trin i salgspipelinen. Det opdaterer status, men afslutter ikke salget. Kontrollér næste aktivitet, sandsynlighed og forventet dato.",
      "Siirtää myyntimahdollisuuden myyntiputken toiseen vaiheeseen. Se päivittää seurannan, mutta ei päätä kauppaa. Tarkista seuraava toiminto, todennäköisyys ja päättymispäivä.",
      "Flytter salgsmuligheten til et annet trinn i salgsprosessen. Det oppdaterer status, men avslutter ikke salget. Kontroller neste aktivitet, sannsynlighet og dato."
    ],
    marketingSegmentInteraction: [
      "Registrerar en kampanjinteraktion för det valda segmentet, så att aktiviteten kan följas på segmentnivå. Detta loggar interaktionen men skapar inte nödvändigtvis individuella kontaktposter eller skickar meddelandet. Kontrollera segment och kampanj.",
      "Records a campaign interaction for the selected segment so activity can be tracked at segment level. This logs the interaction but may not create individual contact entries or send a message. Check segment and campaign.",
      "Enregistre une interaction de campagne pour le segment choisi. Cela consigne l’activité sans nécessairement créer des interactions par contact ni envoyer le message. Vérifiez segment et campagne.",
      "Erfasst eine Kampagneninteraktion für das Segment. Dies protokolliert die Aktivität, erstellt aber nicht zwingend Kontaktposten oder versendet Nachrichten. Prüfen Sie Segment und Kampagne.",
      "Registra una interacción de campaña para el segmento. La registra sin crear necesariamente interacciones individuales ni enviar mensajes. Comprueba segmento y campaña.",
      "Registrerer en kampagneinteraktion for segmentet. Det logger aktiviteten, men opretter ikke nødvendigvis kontaktposter eller sender beskeden. Kontrollér segment og kampagne.",
      "Kirjaa kampanjatoiminnon valitulle segmentille. Se tallentaa toiminnon, mutta ei välttämättä luo yhteyshenkilökohtaisia tietueita tai lähetä viestiä. Tarkista segmentti ja kampanja.",
      "Registrerer en kampanjeinteraksjon for segmentet. Det logger aktiviteten, men oppretter ikke nødvendigvis kontaktposter eller sender meldingen. Kontroller segment og kampanje."
    ],
    marketingSegment: [
      "Skapar ett kontaktsegment med villkor för vilka kontakter som ska ingå. Segmentdefinitionen skickar inget. Kontrollera kriterierna och det beräknade medlemsantalet innan segmentet används i en kampanj.",
      "Creates a contact segment with criteria for membership. The definition sends nothing. Check its criteria and calculated member count before using it in a campaign.",
      "Crée un segment de contacts défini par des critères. Sa création n’envoie rien. Vérifiez les critères et le nombre de membres avant son utilisation en campagne.",
      "Erstellt ein Kontaktsegment mit Einschlusskriterien. Die Definition versendet nichts. Prüfen Sie Kriterien und Mitgliederzahl vor der Verwendung in einer Kampagne.",
      "Crea un segmento de contactos definido por criterios. No envía nada. Comprueba criterios y número de miembros antes de usarlo en una campaña.",
      "Opretter et kontaktsegment med medlemskriterier. Definitionen sender intet. Kontrollér kriterier og antal medlemmer før brug i en kampagne.",
      "Luo yhteyshenkilösegmentin jäsenyysehtojen perusteella. Määrittely ei lähetä mitään. Tarkista ehdot ja jäsenmäärä ennen käyttöä kampanjassa.",
      "Oppretter et kontaktsegment med kriterier for medlemmer. Definisjonen sender ingenting. Kontroller kriteriene og antall medlemmer før bruk i kampanje."
    ],
    marketingAddContacts: [
      "Lägger till valda kontakter i kampanjsegmentet. Kontrollera nya och befintliga medlemmar samt eventuella dubbletter; tillägget skickar inte kampanjmeddelanden.",
      "Adds the selected contacts to the campaign segment. Check added and existing members for duplicates; adding membership does not send campaign messages.",
      "Ajoute les contacts choisis au segment. Vérifiez nouveaux membres et doublons ; l’ajout ne diffuse pas la campagne.",
      "Fügt die ausgewählten Kontakte zum Segment hinzu. Prüfen Sie neue Mitglieder und Duplikate; dadurch werden keine Kampagnennachrichten versendet.",
      "Añade los contactos seleccionados al segmento. Revisa miembros y duplicados; añadirlos no envía la campaña.",
      "Tilføjer valgte kontakter til segmentet. Kontrollér medlemmer og dubletter; dette sender ikke kampagnen.",
      "Lisää valitut yhteyshenkilöt segmenttiin. Tarkista jäsenet ja kaksoiskappaleet; lisääminen ei lähetä kampanjaa.",
      "Legger valgte kontakter til segmentet. Kontroller medlemmer og duplikater; dette sender ikke kampanjen."
    ],
    marketingRefineSegment: [
      "Förfinar eller minskar segmentets medlemskap enligt valda urvalsvillkor. Kontrollera filter och medlemsantal före och efter; åtgärden skickar inte kampanjen.",
      "Refines the segment membership using the selected inclusion or reduction criteria. Check the filters and before/after member counts; this does not send a campaign.",
      "Affine ou réduit la liste des membres du segment selon les critères choisis. Vérifiez filtres et effectifs avant/après ; aucune campagne n’est envoyée.",
      "Verfeinert oder reduziert die Segmentmitglieder anhand der Kriterien. Prüfen Sie Filter und Mitgliederzahlen vorher/nachher; es wird keine Kampagne versendet.",
      "Refina o reduce los miembros del segmento según los criterios. Comprueba filtros y recuentos antes/después; no se envía ninguna campaña.",
      "Forfinerer eller reducerer segmentmedlemmer efter kriterierne. Kontrollér filtre og medlemstal før/efter; kampagnen sendes ikke.",
      "Rajaa segmentin jäseniä ehtojen mukaan. Tarkista suodattimet ja jäsenmäärä ennen ja jälkeen; kampanjaa ei lähetetä.",
      "Avgrenser eller reduserer segmentmedlemmer etter kriteriene. Kontroller filtre og medlemstall før/etter; ingen kampanje sendes."
    ],
    sustainPurchaseEmissions: [
      "Registrerar utsläppsfaktorer eller emissionsvärden på inköpsdokumentets rad enligt hållbarhetsinställningarna. Kontrollera källa, enhet, faktor och mängd; värdet blir en del av hållbarhetsredovisningen först enligt bokföringsflödet.",
      "Records emission factors or values on a purchase document line under sustainability setup. Check source, unit, factor, and quantity; the value enters sustainability reporting through the posting flow.",
      "Saisit facteur ou valeur d’émission sur la ligne d’achat selon le paramétrage durable. Vérifiez source, unité, facteur et quantité ; la donnée entre au registre selon le flux de comptabilisation.",
      "Erfasst Emissionsfaktoren oder -werte auf der Einkaufszeile gemäß Nachhaltigkeitseinrichtung. Prüfen Sie Quelle, Einheit, Faktor und Menge; der Ledger wird über den Buchungsablauf aktualisiert.",
      "Registra factores o valores de emisiones en la línea de compra según configuración. Comprueba origen, unidad, factor y cantidad; el registro sostenible se actualiza mediante el flujo de registro.",
      "Registrerer emissionsfaktorer eller -værdier på købsdokumentlinjen efter opsætningen. Kontrollér kilde, enhed, faktor og antal; bæredygtighedsposter opdateres via bogføringsflowet.",
      "Tallentaa päästötekijän tai -arvon ostoriville asetusten mukaan. Tarkista lähde, yksikkö, tekijä ja määrä; kestävyyskirjanpito päivittyy kirjausprosessissa.",
      "Registrerer utslippsfaktorer eller verdier på kjøpslinjen etter oppsettet. Kontroller kilde, enhet, faktor og antall; bærekraftsposter oppdateres gjennom bokføringsflyten."
    ],
    sustainCollectGL: [
      "Henter valgte hovedboksposter til en bærekraftsdagbok for å beregne eller registrere utslipp. Kontrollera kriterier, kontoer, tidsrom og unngå duplikatgrunnlag; dagboksradene må granskes og bokføres separat.",
      "Collects selected general ledger entries into a sustainability journal to calculate or record emissions. Check criteria, accounts, period, and duplicate inputs; review and post the journal separately.",
      "Collecte les écritures générales choisies dans un journal de durabilité pour calculer ou saisir les émissions. Vérifiez critères, comptes, période et doublons ; le journal reste à contrôler et comptabiliser.",
      "Übernimmt ausgewählte Sachposten in ein Nachhaltigkeitsjournal zur Berechnung oder Erfassung von Emissionen. Prüfen Sie Kriterien, Konten, Zeitraum und Duplikate; das Journal separat prüfen und buchen.",
      "Recopila movimientos contables seleccionados en un diario de sostenibilidad para calcular emisiones. Comprueba criterios, cuentas, periodo y duplicados; revisa y registra el diario aparte.",
      "Henter valgte finansposter til en bæredygtighedskladde for at beregne emissioner. Kontrollér kriterier, konti, periode og dubletter; gennemgå og bogfør kladden separat.",
      "Kerää valitut pääkirjatapahtumat kestävyyskirjaan päästöjen laskentaa varten. Tarkista ehdot, tilit, kausi ja kaksoiskappaleet; tarkista ja kirjaa päiväkirja erikseen.",
      "Henter valgte hovedboksposter til en bærekraftskladd for å beregne utslipp. Kontroller kriterier, kontoer, periode og duplikater; gjennomgå og bokfør kladden separat."
    ],
    sustainCreateCategory: [
      "Skapar en kategori i hållbarhetskontoplanen som grupperar utsläpps- och hållbarhetskonton. Kontrollera kategorikod, rapportstruktur och att motsvarande huvud- eller underkategori kopplas rätt.",
      "Creates a category in the sustainability chart to group sustainability accounts. Check its code, reporting structure, and links to the intended accounts or subcategories.",
      "Crée une catégorie dans le plan de durabilité pour regrouper les comptes. Vérifiez code, structure de rapport et rattachement aux comptes ou sous-catégories.",
      "Erstellt eine Kategorie im Nachhaltigkeitskontenplan zur Gruppierung von Konten. Prüfen Sie Code, Berichtstruktur und Zuordnung zu Konten oder Unterkategorien.",
      "Crea una categoría del plan de sostenibilidad para agrupar cuentas. Comprueba código, estructura de informes y asociación con cuentas o subcategorías.",
      "Opretter en kategori i bæredygtighedskontoplanen til gruppering af konti. Kontrollér kode, rapportstruktur og tilknytning til konti eller underkategorier.",
      "Luo kestävyystilikarttaan luokan tilien ryhmittelyyn. Tarkista koodi, raporttirakenne ja yhteys tileihin tai alaluokkiin.",
      "Oppretter en kategori i bærekraftskontoplanen for gruppering av kontoer. Kontroller kode, rapportstruktur og tilknytning til kontoer eller underkategorier."
    ],
    sustainCreateSubcategory: [
      "Skapar en underkategori för att dela upp en hållbarhetskategori, till exempel efter utsläppstyp. Kontrollera överordnad kategori, kod och rapporteringsklassificering så att senare journalposter grupperas rätt.",
      "Creates a subcategory to break down a sustainability category, such as by emission type. Check the parent category, code, and reporting classification so later entries group correctly.",
      "Crée une sous-catégorie pour détailler une catégorie de durabilité, par type d’émission par exemple. Vérifiez catégorie parente, code et classification.",
      "Erstellt eine Unterkategorie, etwa nach Emissionsart. Prüfen Sie übergeordnete Kategorie, Code und Berichtsklassifizierung für die spätere Gruppierung.",
      "Crea una subcategoría, por ejemplo por tipo de emisión. Comprueba categoría principal, código y clasificación para agrupar correctamente los movimientos.",
      "Opretter en underkategori, f.eks. efter emissionstype. Kontrollér overordnet kategori, kode og rapporteringsklassifikation.",
      "Luo alakategorian esimerkiksi päästötyypin mukaan. Tarkista yläluokka, koodi ja raportointiluokitus tulevien tapahtumien ryhmittelyä varten.",
      "Oppretter en underkategori, for eksempel etter utslippstype. Kontroller overordnet kategori, kode og rapporteringsklassifisering."
    ],
    sustainManualInput: [
      "Registrerar ett hållbarhetsvärde direkt i hållbarhetsjournalen, till exempel mängd eller utsläppsdata. Kontrollera källa, enhet, period, utsläpps- eller CO₂e-faktor och dimensioner innan raden bokförs.",
      "Enters a sustainability value directly in the sustainability journal, such as a quantity or emission data. Check source, unit, period, emission or CO₂e factor, and dimensions before posting.",
      "Saisit directement une valeur dans le journal de durabilité, par exemple une quantité ou émission. Vérifiez source, unité, période, facteur CO₂e et dimensions avant comptabilisation.",
      "Erfasst einen Nachhaltigkeitswert direkt im Journal, etwa Menge oder Emissionsdaten. Prüfen Sie Quelle, Einheit, Zeitraum, CO₂e-Faktor und Dimensionen vor der Buchung.",
      "Introduce un valor directamente en el diario de sostenibilidad, como cantidad o emisiones. Comprueba origen, unidad, periodo, factor CO₂e y dimensiones antes de registrar.",
      "Indtaster en bæredygtighedsværdi direkte i kladden, f.eks. mængde eller emission. Kontrollér kilde, enhed, periode, CO₂e-faktor og dimensioner før bogføring.",
      "Syöttää kestävyysarvon suoraan päiväkirjaan, kuten määrän tai päästötiedon. Tarkista lähde, yksikkö, kausi, CO₂e-kerroin ja dimensiot ennen kirjausta.",
      "Registrerer en bærekraftsverdi direkte i kladden, for eksempel mengde eller utslipp. Kontroller kilde, enhet, periode, CO₂e-faktor og dimensjoner før bokføring."
    ],
    sustainRecalculate: [
      "Beräknar om hållbarhetsjournalens belopp och utsläppsresultat utifrån angivna mängder och faktorer. Granska omräknade värden och eventuella fel; åtgärden bokför inte journalen.",
      "Recalculates sustainability journal amounts and emission results from entered quantities and factors. Review recalculated values and errors; this does not post the journal.",
      "Recalcule montants et émissions du journal selon quantités et facteurs saisis. Examinez résultats et erreurs ; le journal n’est pas comptabilisé.",
      "Berechnet Beträge und Emissionswerte des Journals anhand der Mengen und Faktoren neu. Prüfen Sie Ergebnisse und Fehler; das Journal wird nicht gebucht.",
      "Recalcula importes y emisiones del diario según cantidades y factores. Revisa resultados y errores; no registra el diario.",
      "Genberegner beløb og emissioner ud fra mængder og faktorer. Gennemgå resultat og fejl; kladden bogføres ikke.",
      "Laskee päiväkirjan summat ja päästöt uudelleen määrien ja kertoimien perusteella. Tarkista tulokset ja virheet; päiväkirjaa ei kirjata.",
      "Beregner beløp og utslipp på nytt fra mengder og faktorer. Gjennomgå resultater og feil; kladden bokføres ikke."
    ],
    sustainPostJournal: [
      "Bokför hållbarhetsjournalens rader till hållbarhetsreskontran enligt konton och faktorer. Kontrollera mängd, utsläpp, enhet, period och dimensioner före bokföring; granska sedan skapade hållbarhetsposter.",
      "Posts sustainability journal lines to the sustainability ledger using the configured accounts and factors. Check quantity, emissions, unit, period, and dimensions, then review the created ledger entries.",
      "Comptabilise les lignes du journal dans le registre de durabilité selon comptes et facteurs. Vérifiez quantité, émissions, unité, période et dimensions, puis les écritures créées.",
      "Bucht Journalzeilen gemäß Konten und Faktoren in das Nachhaltigkeitsledger. Prüfen Sie Menge, Emissionen, Einheit, Zeitraum und Dimensionen; kontrollieren Sie die Ledgerposten.",
      "Registra las líneas en el libro de sostenibilidad según cuentas y factores. Comprueba cantidad, emisiones, unidad, periodo y dimensiones; revisa los movimientos creados.",
      "Bogfører kladdelinjer til bæredygtighedsposter efter konti og faktorer. Kontrollér mængde, emissioner, enhed, periode og dimensioner; gennemgå posterne bagefter.",
      "Kirjaa päiväkirjarivit kestävyyskirjanpitoon tilien ja kertoimien mukaan. Tarkista määrä, päästöt, yksikkö, kausi ja dimensiot; tarkista luodut tapahtumat.",
      "Bokfører kladdelinjene til bærekraftsledgeren etter kontoer og faktorer. Kontroller mengde, utslipp, enhet, periode og dimensjoner; gjennomgå postene etterpå."
    ],
    inventoryPostReclass: [
      "Bokför artikelomklassificeringsjournalen och flyttar eller ändrar lagrets klassificering enligt journalraderna. Kontrollera artikelspårning, från- och tillplats, antal och variant; granska artikeltransaktionerna efteråt.",
      "Posts the item reclassification journal, moving or changing inventory classification as specified on its lines. Check item tracking, source and destination, quantity, and variant; review item entries afterward.",
      "Comptabilise le journal de reclassement article et déplace ou reclasse le stock selon ses lignes. Vérifiez suivi, emplacements, quantité et variante, puis les écritures article.",
      "Bucht das Artikel-Umlagerungsjournal und ändert Bestand oder Klassifizierung gemäß Zeilen. Prüfen Sie Tracking, Quell-/Ziellagerort, Menge und Variante; kontrollieren Sie Artikelposten.",
      "Registra el diario de reclasificación y mueve o reclasifica existencias según las líneas. Comprueba seguimiento, ubicaciones, cantidad y variante; revisa movimientos después.",
      "Bogfører omklassificeringskladden og flytter eller ændrer lagerklassifikation efter linjerne. Kontrollér sporing, fra-/tilplacering, antal og variant; gennemgå vareposter bagefter.",
      "Kirjaa nimikkeen uudelleenluokittelupäiväkirjan ja muuttaa varaston luokitusta rivien mukaan. Tarkista jäljitys, lähtö- ja kohdepaikka, määrä ja variantti.",
      "Bokfører omklassifiseringskladden og flytter eller endrer lagerklassifisering etter linjene. Kontroller sporing, fra-/tilplassering, antall og variant."
    ],
    inventoryCalculate: [
      "Hämtar förväntat lagersaldo till den fysiska inventeringsjournalen. Kontrollera artiklar, lagerställe, variant och inventeringsdatum; det beräknade saldot är inte det fysiskt räknade antalet och justerar inte lagret ännu.",
      "Calculates the expected on-hand quantity into the physical inventory journal. Check items, location, variant, and count date; calculated quantity is not the physical result and does not adjust stock yet.",
      "Calcule le stock théorique dans le journal d’inventaire physique. Vérifiez articles, emplacement, variante et date ; ce n’est pas le comptage réel et aucun ajustement n’est encore comptabilisé.",
      "Ermittelt den erwarteten Bestand im Inventurjournal. Prüfen Sie Artikel, Lagerort, Variante und Stichtag; die Menge ist kein Zählergebnis und korrigiert den Bestand noch nicht.",
      "Calcula la cantidad esperada en el diario de inventario físico. Comprueba productos, ubicación, variante y fecha; no es el recuento real ni ajusta existencias aún.",
      "Beregner forventet beholdning i den fysiske lagerkladde. Kontrollér varer, placering, variant og dato; det er ikke det talte antal og justerer ikke lageret endnu.",
      "Laskee odotetun määrän inventointipäiväkirjaan. Tarkista nimikkeet, sijainti, variantti ja päivä; laskettu määrä ei ole laskentatulos eikä vielä oikaise varastoa.",
      "Beregner forventet beholdning i fysisk lagerkladd. Kontroller varer, plassering, variant og dato; det er ikke opptalt mengde og justerer ikke lageret ennå."
    ],
    inventoryCountedQty: [
      "Registrerar det fysiskt räknade antalet i inventeringsjournalen. Jämför mot beräknat saldo och utred differenser, enhet och artikelspårning innan journalen bokförs som lagerjustering.",
      "Records the physically counted quantity in the inventory journal. Compare it with expected stock and investigate differences, unit, and item tracking before posting an adjustment.",
      "Saisit la quantité réellement comptée dans le journal d’inventaire. Comparez au stock théorique et analysez écarts, unité et suivi avant de comptabiliser l’ajustement.",
      "Erfasst die gezählte Menge im Inventurjournal. Vergleichen Sie Sollbestand und Differenzen sowie Einheit und Tracking, bevor Sie die Korrektur buchen.",
      "Registra la cantidad contada en el diario. Compárala con el saldo esperado y revisa diferencias, unidad y seguimiento antes de registrar el ajuste.",
      "Registrerer det fysisk talte antal i lagerkladden. Sammenlign med forventet beholdning, og undersøg differencer, enhed og sporing før bogføring.",
      "Kirjaa lasketun määrän inventointipäiväkirjaan. Vertaa odotettuun saldoon ja selvitä erot, yksikkö ja jäljitys ennen oikaisun kirjaamista.",
      "Registrerer fysisk opptalt antall i lagerkladden. Sammenlign med forventet beholdning og undersøk avvik, enhet og sporing før justering bokføres."
    ],
    inventoryPostTransfer: [
      "Bokför transferorderns avsändning eller mottagning enligt vald åtgärd. Kontrollera överföringsrader, från- och tillplats, antal och spårningsuppgifter; kontrollera därefter om ordern är delvis eller helt hanterad.",
      "Posts the transfer order's shipment or receipt according to the selected action. Check transfer lines, source and destination, quantities, and tracking; then verify whether the order is partly or fully processed.",
      "Comptabilise l’expédition ou la réception du transfert selon l’action choisie. Vérifiez lignes, emplacements, quantités et suivi, puis l’état partiel ou complet de l’ordre.",
      "Bucht den Umlagerungsversand oder -eingang gemäß gewählter Aktion. Prüfen Sie Zeilen, Quell- und Ziellagerort, Mengen und Tracking sowie den Auftragsstatus.",
      "Registra el envío o recepción de la transferencia según la acción. Comprueba líneas, ubicaciones, cantidades y seguimiento; verifica si se procesó parcial o totalmente.",
      "Bogfører overførselsordrens afsendelse eller modtagelse efter valget. Kontrollér linjer, fra-/tilplacering, antal og sporing; kontrollér derefter ordrestatus.",
      "Kirjaa siirtotilauksen lähetyksen tai vastaanoton valitun toiminnon mukaan. Tarkista rivit, lähtö- ja kohdepaikka, määrät ja jäljitys sekä tilauksen tila.",
      "Bokfører overføringsordrens utsendelse eller mottak etter valget. Kontroller linjer, fra-/tilplassering, antall og sporing; sjekk ordrestatus etterpå."
    ],
    inventoryPostCount: [
      "Bokför den fysiska inventeringsjournalen och justerar lagersaldot med skillnaden mellan räknat och bokfört antal. Kontrollera rader, spårning och differenser före bokföring; granska justeringsposterna efteråt.",
      "Posts the physical inventory journal and adjusts stock by the difference between counted and book quantity. Check lines, tracking, and variances first; review adjustment entries afterward.",
      "Comptabilise l’inventaire physique et ajuste le stock selon l’écart entre quantité comptée et théorique. Vérifiez lignes, suivi et écarts, puis les écritures d’ajustement.",
      "Bucht das Inventurjournal und korrigiert den Bestand um die Differenz zwischen gezählter und gebuchter Menge. Prüfen Sie Zeilen und Tracking; kontrollieren Sie danach die Korrekturposten.",
      "Registra el diario físico y ajusta existencias por la diferencia entre cantidad contada y teórica. Comprueba líneas y seguimiento; revisa después los movimientos.",
      "Bogfører den fysiske lagerkladde og justerer beholdningen med forskellen mellem talt og bogført antal. Kontrollér linjer og sporing; gennemgå justeringer bagefter.",
      "Kirjaa inventointipäiväkirjan ja oikaisee varastoa lasketun ja kirjanpidon määrän erolla. Tarkista rivit ja jäljitys; tarkista oikaisutapahtumat.",
      "Bokfører fysisk lagerkladd og justerer beholdningen med forskjellen mellom opptalt og bokført antall. Kontroller linjer og sporing; gjennomgå justeringene."
    ],
    m365OpenExcel: [
      "Öppnar Business Central-listan i Excel för analys eller bearbetning. Att öppna/exportera skriver inte automatiskt tillbaka ändringar. Kontrollera urval och datakälla; använd redigera i Excel-funktionen om ändringar ska publiceras tillbaka.",
      "Opens the Business Central list in Excel for analysis or editing. Opening or exporting does not automatically write changes back. Check the selection and use Edit in Excel when changes must be published.",
      "Ouvre la liste BC dans Excel pour analyse ou modification. L’export ne réécrit pas automatiquement les changements. Vérifiez la sélection et utilisez Modifier dans Excel pour les publier.",
      "Öffnet die BC-Liste in Excel zur Analyse oder Bearbeitung. Exportierte Änderungen werden nicht automatisch zurückgeschrieben. Prüfen Sie die Auswahl und nutzen Sie In Excel bearbeiten.",
      "Abre la lista de BC en Excel. La exportación no devuelve automáticamente cambios. Comprueba la selección y usa Editar en Excel para publicar modificaciones.",
      "Åbner BC-listen i Excel. Eksport skriver ikke ændringer tilbage automatisk. Kontrollér udvalg, og brug Rediger i Excel til publicering af ændringer.",
      "Avaa BC-luettelon Exceliin analysoitavaksi. Vienti ei kirjoita muutoksia automaattisesti takaisin. Tarkista valinta ja käytä Muokkaa Excelissä -toimintoa julkaisuun.",
      "Åpner BC-listen i Excel for analyse eller redigering. Eksport skriver ikke automatisk endringer tilbake. Kontroller utvalget og bruk Rediger i Excel for publisering."
    ],
    m365EditExcel: [
      "Lägger till Excel-redigering mot Business Central så att ändringar kan publiceras tillbaka till den filtrerade listan. Kontrollera vilka rader och fält som omfattas och granska synkroniseringsresultat och valideringsfel efter publicering.",
      "Starts Excel editing connected to Business Central so changes can be published back to the filtered list. Check included rows and fields, then review sync results and validation errors after publishing.",
      "Lance la modification Excel connectée à BC afin de publier les changements vers la liste filtrée. Vérifiez lignes et champs concernés, puis contrôlez synchronisation et erreurs.",
      "Startet die verbundene Excel-Bearbeitung, damit Änderungen in die gefilterte BC-Liste zurückgeschrieben werden können. Prüfen Sie Zeilen und Felder sowie Validierungsfehler.",
      "Inicia la edición conectada de Excel para publicar cambios en la lista filtrada de BC. Comprueba filas y campos incluidos y revisa errores de validación.",
      "Starter Excel-redigering koblet til BC, så ændringer kan publiceres til den filtrerede liste. Kontrollér rækker og felter samt valideringsfejl bagefter.",
      "Käynnistää Business Centraliin linkitetyn Excel-muokkauksen muutosten julkaisemiseksi suodatettuun luetteloon. Tarkista rivit, kentät ja validointivirheet.",
      "Starter Excel-redigering koblet til BC slik at endringer kan publiseres til den filtrerte listen. Kontroller rader og felt samt valideringsfeil etterpå."
    ],
    m365ShareTeams: [
      "Delar Business Central-posten eller länken i Microsoft Teams enligt Teams- och behörighetsinställningarna. Kontrollera att rätt post och mottagare delas; länkdelning ändrar inte i sig postens data.",
      "Shares the Business Central record or link in Microsoft Teams under Teams and permission setup. Verify the record and recipients; sharing a link does not change record data.",
      "Partage l’enregistrement ou son lien dans Teams selon les autorisations. Vérifiez l’élément et les destinataires ; le partage ne modifie pas ses données.",
      "Teilt den BC-Datensatz oder Link in Teams gemäß Berechtigungseinrichtung. Prüfen Sie Datensatz und Empfänger; das Teilen ändert keine Datensatzdaten.",
      "Comparte el registro o enlace de BC en Teams según permisos. Comprueba registro y destinatarios; compartir el enlace no cambia sus datos.",
      "Deler BC-posten eller linket i Teams efter tilladelserne. Kontrollér post og modtagere; deling ændrer ikke postens data.",
      "Jakaa BC-tietueen tai linkin Teamsissä käyttöoikeuksien mukaan. Tarkista tietue ja vastaanottajat; linkin jakaminen ei muuta tietoja.",
      "Deler BC-posten eller lenken i Teams etter tillatelsene. Kontroller post og mottakere; deling endrer ikke postdata."
    ],
    m365OpenOneDrive: [
      "Öppnar OneDrive-/SharePoint-filer som är kopplade till Business Central-posten. Kontrollera att dokumentet tillhör rätt post och att mottagarens behörighet är avsedd; öppning ändrar inte postens affärsstatus.",
      "Opens OneDrive or SharePoint files linked to the Business Central record. Check that the file belongs to the right record and sharing permissions are intended; opening it does not change business status.",
      "Ouvre les fichiers OneDrive ou SharePoint liés à la fiche BC. Vérifiez le document et ses autorisations ; l’ouverture ne modifie pas le statut métier.",
      "Öffnet mit dem BC-Datensatz verknüpfte OneDrive-/SharePoint-Dateien. Prüfen Sie Zuordnung und Berechtigungen; der Geschäftsstatus wird nicht geändert.",
      "Abre archivos de OneDrive o SharePoint vinculados al registro BC. Comprueba asociación y permisos; abrirlos no cambia el estado empresarial.",
      "Åbner OneDrive-/SharePoint-filer knyttet til BC-posten. Kontrollér tilknytning og tilladelser; åbning ændrer ikke forretningsstatus.",
      "Avaa BC-tietueeseen liitetyt OneDrive-/SharePoint-tiedostot. Tarkista liitos ja käyttöoikeudet; avaaminen ei muuta liiketoiminnan tilaa.",
      "Åpner OneDrive-/SharePoint-filer knyttet til BC-posten. Kontroller tilknytning og tillatelser; åpning endrer ikke forretningsstatus."
    ],
    m365InstallOutlook: [
      "Startar konfiguration eller distribution av Business Central-integrationen för Outlook. Själva steget innebär inte att tillägget är tillgängligt för alla användare; kontrollera administratörsdistribution, miljö och anslutning efteråt.",
      "Starts setup or deployment of the Business Central Outlook integration. This step alone does not make the add-in available to all users; verify admin deployment, environment, and connection afterward.",
      "Lance la configuration ou le déploiement de l’intégration Outlook de BC. Cela ne garantit pas sa disponibilité pour tous ; vérifiez déploiement administrateur, environnement et connexion.",
      "Startet Einrichtung oder Bereitstellung der BC-Outlook-Integration. Das Add-in ist dadurch nicht zwingend für alle verfügbar; prüfen Sie Adminbereitstellung, Umgebung und Verbindung.",
      "Inicia configuración o implementación de la integración Outlook de BC. No garantiza disponibilidad para todos; comprueba implementación, entorno y conexión.",
      "Starter konfiguration eller udrulning af BC-Outlook-integrationen. Det gør ikke nødvendigvis tilføjelsesprogrammet tilgængeligt for alle; kontrollér administration, miljø og forbindelse.",
      "Käynnistää BC Outlook -integraation määrityksen tai käyttöönoton. Vaihe ei takaa lisäosan saatavuutta kaikille; tarkista järjestelmänvalvojan käyttöönotto, ympäristö ja yhteys.",
      "Starter konfigurasjon eller distribusjon av BC-Outlook-integrasjonen. Det gjør ikke nødvendigvis tillegget tilgjengelig for alle; kontroller administratordistribusjon, miljø og tilkobling."
    ]
  });
  function isAuthored(rule) { return Boolean(observedWorkflow[rule?.ruleId]); }
  function documentLabelKey(ruleId, lifecycleKey) {
    const sales = String(ruleId || "").startsWith("Sales.");
    if (lifecycleKey === "openPostedInvoice") return "salesInvoice";
    if (lifecycleKey === "release" || lifecycleKey === "reopen" || lifecycleKey === "post") return sales ? "salesOrder" : "order";
    if (lifecycleKey === "openReturn" || lifecycleKey === "getPostedLines" || lifecycleKey === "postReturn") return sales ? "salesReturn" : "return";
    if (lifecycleKey === "createCorrectiveCreditMemo" || lifecycleKey === "cancelUnpaidInvoice") return sales ? "salesInvoice" : "invoice";
    if (lifecycleKey === "copyCreditMemo" || lifecycleKey === "postCreditMemo" || lifecycleKey === "applyCreditMemo") return sales ? "salesCredit" : "credit";
    return "";
  }
  const createNewRecordTypes = {
    PurchaseOrder: { "sv-SE": "inköpsorder", "en-US": "purchase order", "fr-FR": "commande achat", "de-DE": "Einkaufsbestellung", "es-ES": "pedido de compra", "da-DK": "købsordre", "fi-FI": "ostotilaus", "nb-NO": "innkjøpsordre" },
    SalesOrder: { "sv-SE": "försäljningsorder", "en-US": "sales order", "fr-FR": "commande vente", "de-DE": "Verkaufsauftrag", "es-ES": "pedido de venta", "da-DK": "salgsordre", "fi-FI": "myyntitilaus", "nb-NO": "salgsordre" },
    ProductionOrder: { "sv-SE": "produktionsorder", "en-US": "production order", "fr-FR": "ordre de fabrication", "de-DE": "Fertigungsauftrag", "es-ES": "orden de producción", "da-DK": "produktionsordre", "fi-FI": "tuotantotilaus", "nb-NO": "produksjonsordre" },
    AssemblyOrder: { "sv-SE": "monteringsorder", "en-US": "assembly order", "fr-FR": "ordre d’assemblage", "de-DE": "Montageauftrag", "es-ES": "pedido de ensamblado", "da-DK": "montageordre", "fi-FI": "kokoonpanotilaus", "nb-NO": "monteringsordre" },
    TransferOrder: { "sv-SE": "transferorder", "en-US": "transfer order", "fr-FR": "ordre de transfert", "de-DE": "Umlagerungsauftrag", "es-ES": "orden de transferencia", "da-DK": "overflytningsordre", "fi-FI": "siirtotilaus", "nb-NO": "overføringsordre" },
    ServiceOrder: { "sv-SE": "serviceorder", "en-US": "service order", "fr-FR": "commande de service", "de-DE": "Serviceauftrag", "es-ES": "pedido de servicio", "da-DK": "serviceordre", "fi-FI": "huoltotilaus", "nb-NO": "serviceordre" },
    PurchaseInvoice: { "sv-SE": "inköpsfaktura", "en-US": "purchase invoice", "fr-FR": "facture achat", "de-DE": "Einkaufsrechnung", "es-ES": "factura de compra", "da-DK": "købsfaktura", "fi-FI": "ostolasku", "nb-NO": "kjøpsfaktura" },
    SalesInvoice: { "sv-SE": "försäljningsfaktura", "en-US": "sales invoice", "fr-FR": "facture vente", "de-DE": "Verkaufsrechnung", "es-ES": "factura de venta", "da-DK": "salgsfaktura", "fi-FI": "myyntilasku", "nb-NO": "salgsfaktura" },
    PurchaseQuote: { "sv-SE": "inköpsoffert", "en-US": "purchase quote", "fr-FR": "devis achat", "de-DE": "Einkaufsangebot", "es-ES": "oferta de compra", "da-DK": "købstilbud", "fi-FI": "ostotarjous", "nb-NO": "kjøpstilbud" },
    SalesQuote: { "sv-SE": "försäljningsoffert", "en-US": "sales quote", "fr-FR": "devis vente", "de-DE": "Verkaufsangebot", "es-ES": "oferta de venta", "da-DK": "salgstilbud", "fi-FI": "myyntitarjous", "nb-NO": "salgstilbud" },
    PurchaseReturnOrder: { "sv-SE": "inköpsreturorder", "en-US": "purchase return order", "fr-FR": "commande retour achat", "de-DE": "Einkaufsrückgabeauftrag", "es-ES": "pedido de devolución de compra", "da-DK": "købsreturordre", "fi-FI": "ostopalautustilaus", "nb-NO": "returordre for kjøp" },
    SalesReturnOrder: { "sv-SE": "försäljningsreturorder", "en-US": "sales return order", "fr-FR": "commande retour vente", "de-DE": "Verkaufsrückgabeauftrag", "es-ES": "pedido de devolución de venta", "da-DK": "salgsreturordre", "fi-FI": "myyntipalautustilaus", "nb-NO": "returordre for salg" },
    WarehouseReceipt: { "sv-SE": "lagerinleverans", "en-US": "warehouse receipt", "fr-FR": "réception entrepôt", "de-DE": "Lagerwareneingang", "es-ES": "recepción de almacén", "da-DK": "lagerindlevering", "fi-FI": "varastovastaanotto", "nb-NO": "lagerinngående levering" },
    WarehouseShipment: { "sv-SE": "lagerutleverans", "en-US": "warehouse shipment", "fr-FR": "expédition entrepôt", "de-DE": "Lagerausgang", "es-ES": "envío de almacén", "da-DK": "lagerforsendelse", "fi-FI": "varastolähetys", "nb-NO": "lagerutlevering" },
    Project: { "sv-SE": "projekt", "en-US": "project", "fr-FR": "projet", "de-DE": "Projekt", "es-ES": "proyecto", "da-DK": "projekt", "fi-FI": "projekti", "nb-NO": "prosjekt" },
    Customer: { "sv-SE": "kund", "en-US": "customer", "fr-FR": "client", "de-DE": "Debitor", "es-ES": "cliente", "da-DK": "kunde", "fi-FI": "asiakas", "nb-NO": "kunde" },
    Vendor: { "sv-SE": "leverantör", "en-US": "vendor", "fr-FR": "fournisseur", "de-DE": "Kreditor", "es-ES": "proveedor", "da-DK": "leverandør", "fi-FI": "toimittaja", "nb-NO": "leverandør" },
    Item: { "sv-SE": "artikel", "en-US": "item", "fr-FR": "article", "de-DE": "Artikel", "es-ES": "producto", "da-DK": "vare", "fi-FI": "nimike", "nb-NO": "vare" },
    BankAccount: { "sv-SE": "bankkonto", "en-US": "bank account", "fr-FR": "compte bancaire", "de-DE": "Bankkonto", "es-ES": "cuenta bancaria", "da-DK": "bankkonto", "fi-FI": "pankkitili", "nb-NO": "bankkonto" },
    GLAccount: { "sv-SE": "huvudbokskonto", "en-US": "G/L account", "fr-FR": "compte général", "de-DE": "Sachkonto", "es-ES": "cuenta contable", "da-DK": "finanskonto", "fi-FI": "pääkirjatili", "nb-NO": "hovedbokskonto" },
    PaymentJournal: { "sv-SE": "betalningsjournal", "en-US": "payment journal", "fr-FR": "journal de paiement", "de-DE": "Zahlungs Buch.-Blatt", "es-ES": "diario de pagos", "da-DK": "betalingskladde", "fi-FI": "maksupäiväkirja", "nb-NO": "betalingsjournal" },
    CashReceiptJournal: { "sv-SE": "inbetalningsjournal", "en-US": "cash receipt journal", "fr-FR": "journal des encaissements", "de-DE": "Zahlungseingang Buch.-Blatt", "es-ES": "diario de cobros", "da-DK": "indbetalingskladde", "fi-FI": "kassakuittipäiväkirja", "nb-NO": "innbetalingsjournal" },
    GeneralLedgerSetup: { "sv-SE": "redovisningsinställningar", "en-US": "general ledger setup", "fr-FR": "configuration du grand livre", "de-DE": "Finanzbuchhaltung Einrichtung", "es-ES": "configuración del libro mayor", "da-DK": "finansopsætning", "fi-FI": "kirjanpidon asetukset", "nb-NO": "regnskapsoppsett" },
    BankAccountLedgerEntry: { "sv-SE": "bankkontotransaktion", "en-US": "bank account ledger entry", "fr-FR": "écriture de compte bancaire", "de-DE": "Bankposten", "es-ES": "movimiento de cuenta bancaria", "da-DK": "bankpost", "fi-FI": "pankkitilitapahtuma", "nb-NO": "bankpost" },
    GLEntry: { "sv-SE": "huvudbokstransaktion", "en-US": "G/L entry", "fr-FR": "écriture comptable", "de-DE": "Sachposten", "es-ES": "movimiento contable", "da-DK": "finanspost", "fi-FI": "pääkirjatapahtuma", "nb-NO": "hovedbokspost" },
    PostedSalesInvoice: { "sv-SE": "bokförd försäljningsfaktura", "en-US": "posted sales invoice", "fr-FR": "facture vente comptabilisée", "de-DE": "gebuchte Verkaufsrechnung", "es-ES": "factura de venta registrada", "da-DK": "bogført salgsfaktura", "fi-FI": "kirjattu myyntilasku", "nb-NO": "bokført salgsfaktura" },
    PostedPurchaseInvoice: { "sv-SE": "bokförd inköpsfaktura", "en-US": "posted purchase invoice", "fr-FR": "facture achat comptabilisée", "de-DE": "gebuchte Einkaufsrechnung", "es-ES": "factura de compra registrada", "da-DK": "bogført købsfaktura", "fi-FI": "kirjattu ostolasku", "nb-NO": "bokført kjøpsfaktura" },
    PostedSalesShipment: { "sv-SE": "bokförd försäljningsleverans", "en-US": "posted sales shipment", "fr-FR": "expédition vente comptabilisée", "de-DE": "gebuchte Verkaufslieferung", "es-ES": "envío de venta registrado", "da-DK": "bogført salgsleverance", "fi-FI": "kirjattu myyntitoimitus", "nb-NO": "bokført salgsleveranse" },
    PostedPurchaseReceipt: { "sv-SE": "bokförd inköpsinleverans", "en-US": "posted purchase receipt", "fr-FR": "réception achat comptabilisée", "de-DE": "gebuchter Einkaufseingang", "es-ES": "recepción de compra registrada", "da-DK": "bogført købsmodtagelse", "fi-FI": "kirjattu ostovastaanotto", "nb-NO": "bokført kjøpsmottak" },
    PostedSalesCreditMemo: { "sv-SE": "bokförd försäljningskreditnota", "en-US": "posted sales credit memo", "fr-FR": "avoir vente comptabilisé", "de-DE": "gebuchte Verkaufsgutschrift", "es-ES": "abono de venta registrado", "da-DK": "bogført salgskreditnota", "fi-FI": "kirjattu myyntihyvityslasku", "nb-NO": "bokført salgskreditnota" },
    SalesCreditMemo: { "sv-SE": "försäljningskreditnota", "en-US": "sales credit memo", "fr-FR": "avoir vente", "de-DE": "Verkaufsgutschrift", "es-ES": "abono de venta", "da-DK": "salgskreditnota", "fi-FI": "myyntihyvityslasku", "nb-NO": "salgskreditnota" },
    PurchaseCreditMemo: { "sv-SE": "inköpskreditnota", "en-US": "purchase credit memo", "fr-FR": "avoir achat", "de-DE": "Einkaufsgutschrift", "es-ES": "abono de compra", "da-DK": "købskreditnota", "fi-FI": "ostohyvityslasku", "nb-NO": "kjøpskreditnota" },
    WarehouseActivity: { "sv-SE": "lageraktivitet", "en-US": "warehouse activity", "fr-FR": "activité entrepôt", "de-DE": "Lageraktivität", "es-ES": "actividad de almacén", "da-DK": "lageraktivitet", "fi-FI": "varastotoiminto", "nb-NO": "lageraktivitet" },
    WarehousePick: { "sv-SE": "lagerplockning", "en-US": "warehouse pick", "fr-FR": "prélèvement entrepôt", "de-DE": "Lagerkommissionierung", "es-ES": "picking de almacén", "da-DK": "lagerpluk", "fi-FI": "varastokeräily", "nb-NO": "lagerplukk" },
    WarehousePutAway: { "sv-SE": "lagerinlagring", "en-US": "warehouse put-away", "fr-FR": "rangement entrepôt", "de-DE": "Lager Einlagerung", "es-ES": "ubicación de almacén", "da-DK": "lagerindlagring", "fi-FI": "varastopaikoitus", "nb-NO": "lagerinnlagring" },
    InventoryPick: { "sv-SE": "lagerplockning", "en-US": "inventory pick", "fr-FR": "prélèvement stock", "de-DE": "Lagerkommissionierung", "es-ES": "picking de inventario", "da-DK": "lagerpluk", "fi-FI": "varastokeräily", "nb-NO": "lagerplukk" },
    ItemVariant: { "sv-SE": "artikelvariant", "en-US": "item variant", "fr-FR": "variante article", "de-DE": "Artikelvariante", "es-ES": "variante de artículo", "da-DK": "varevariant", "fi-FI": "nimikevariantti", "nb-NO": "varevariant" },
    ItemCategory: { "sv-SE": "artikelkategori", "en-US": "item category", "fr-FR": "catégorie article", "de-DE": "Artikelkategorie", "es-ES": "categoría de producto", "da-DK": "varekategori", "fi-FI": "nimikekategoria", "nb-NO": "varekategori" },
    GeneralJournal: { "sv-SE": "en redovisningsjournal", "en-US": "a general journal", "fr-FR": "un journal général", "de-DE": "ein Fibu Buch.-Blatt", "es-ES": "un diario general", "da-DK": "en finanskladde", "fi-FI": "yleisen päiväkirjan", "nb-NO": "en generell journal" },
    BankAccountReconciliation: { "sv-SE": "en bankavstämning", "en-US": "a bank account reconciliation", "fr-FR": "un rapprochement bancaire", "de-DE": "einen Bankkontoabgleich", "es-ES": "una conciliación bancaria", "da-DK": "en bankafstemning", "fi-FI": "pankkitilin täsmäytyksen", "nb-NO": "en bankavstemming" },
    PaymentReconciliationJournal: { "sv-SE": "en betalningsavstämningsjournal", "en-US": "a payment reconciliation journal", "fr-FR": "un journal de rapprochement des paiements", "de-DE": "ein Zahlungsabstimmungs-Buch.-Blatt", "es-ES": "un diario de conciliación de pagos", "da-DK": "en betalingsafstemningskladde", "fi-FI": "maksujen täsmäytyspäiväkirjan", "nb-NO": "en betalingsavstemmingsjournal" },
    Employee: { "sv-SE": "anställd", "en-US": "employee", "fr-FR": "employé", "de-DE": "Mitarbeiter", "es-ES": "empleado", "da-DK": "medarbejder", "fi-FI": "työntekijä", "nb-NO": "ansatt" },
    QualityCheck: { "sv-SE": "kvalitetskontroll", "en-US": "quality check", "fr-FR": "contrôle qualité", "de-DE": "Qualitätsprüfung", "es-ES": "control de calidad", "da-DK": "kvalitetskontrol", "fi-FI": "laaduntarkastus", "nb-NO": "kvalitetskontroll" }
  };
  const createNewText = {
    "sv-SE": (page, record, action) => `På sidan ${page} öppnar ${action} ett formulär för ${record || "en ny post"}. Åtgärden skapar ett utkast; den bokför eller skickar inte dokumentet. Kontrollera att sidan och posttypen är rätt och granska obligatoriska fält och föreslagna standardvärden innan du sparar.`,
    "en-US": (page, record, action) => `On the ${page} page, ${action} opens a form for ${record || "a new record"}. It creates a draft; it does not post or send the document. Confirm the page and record type, then review required fields and suggested defaults before saving.`,
    "fr-FR": (page, record, action) => `Sur la page ${page}, ${action} ouvre le formulaire de création pour « ${record || "un nouvel enregistrement"} ». Il crée un brouillon ; il ne comptabilise ni n’envoie le document. Vérifiez la page et le type d’enregistrement, puis les champs obligatoires et les valeurs proposées avant d’enregistrer.`,
    "de-DE": (page, record, action) => `Auf der Seite ${page} öffnet ${action} ein Formular für „${record || "einen neuen Datensatz"}“. Es entsteht ein Entwurf; das Dokument wird weder gebucht noch gesendet. Prüfen Sie Seite und Datensatztyp sowie Pflichtfelder und vorgeschlagene Standardwerte vor dem Speichern.`,
    "es-ES": (page, record, action) => `En la página ${page}, ${action} abre el formulario de creación para «${record || "un registro nuevo"}». Crea un borrador; no contabiliza ni envía el documento. Confirma la página y el tipo de registro y revisa los campos obligatorios y los valores propuestos antes de guardar.`,
    "da-DK": (page, record, action) => `På siden ${page} åbner ${action} en formular til ${record || "en ny post"}. Det opretter en kladde; dokumentet bogføres eller sendes ikke. Kontrollér side og posttype samt obligatoriske felter og foreslåede standardværdier, før du gemmer.`,
    "fi-FI": (page, record, action) => `Sivulla ${page} ${action} avaa lomakkeen: ${record || "uusi tietue"}. Se luo luonnoksen; asiakirjaa ei kirjata eikä lähetetä. Varmista sivu ja tietuetyyppi sekä tarkista pakolliset kentät ja ehdotetut oletusarvot ennen tallentamista.`,
    "nb-NO": (page, record, action) => `På siden ${page} åpner ${action} et skjema for ${record || "en ny post"}. Det oppretter et utkast; dokumentet bokføres eller sendes ikke. Kontroller siden og posttypen, og se over obligatoriske felt og foreslåtte standardverdier før du lagrer.`
  };
  function contextualCreateNew(rule, context = {}) {
    if ((rule?.taskType !== "CreateNew" && rule?.semanticAction !== "CreateNew") ||
        String(rule?.ruleId || "").startsWith("Observed.")) return null;
    const page = String(context.knowledgePageCaption || context.pageCaption ||
      context.context?.currentPageCaption || context.context?.previousPageCaption || "").trim();
    const entity = String(context.entity || context.context?.currentEntity || "").trim();
    const action = String(context.actionCaption || context.context?.actionCaption || "").trim();
    if (!page && !entity) return null;
    return Object.fromEntries(locales.map(locale => [locale,
      createNewText[locale](page || createNewRecordTypes[entity]?.[locale] || entity,
        createNewRecordTypes[entity]?.[locale] || "", action || ({
          "sv-SE": "Ny", "en-US": "New", "fr-FR": "Nouveau", "de-DE": "Neu",
          "es-ES": "Nuevo", "da-DK": "Opret", "fi-FI": "Uusi", "nb-NO": "Opprett"
        })[locale])]));
  }
  const coreContextText = {
    "Core.SearchAndOpenPage": {
      "sv-SE": page => `Sökningen öppnar en Business Central-sida eller post från söktexten${page ? ` i sammanhanget ${page}` : ""}. Kontrollera företag, sida och post innan du gör ändringar.`,
      "en-US": page => `Search opens a Business Central page or record from the search text${page ? ` in the ${page} context` : ""}. Confirm the company, page, and record before making changes.`,
      "fr-FR": page => `La recherche ouvre une page ou un enregistrement Business Central à partir du texte saisi${page ? ` dans le contexte ${page}` : ""}. Vérifiez société, page et enregistrement avant toute modification.`,
      "de-DE": page => `Die Suche öffnet anhand des Suchtexts eine Business-Central-Seite oder einen Datensatz${page ? ` im Kontext ${page}` : ""}. Prüfen Sie Unternehmen, Seite und Datensatz vor Änderungen.`,
      "es-ES": page => `La búsqueda abre una página o un registro de Business Central según el texto${page ? ` en el contexto de ${page}` : ""}. Confirma empresa, página y registro antes de hacer cambios.`,
      "da-DK": page => `Søgningen åbner en Business Central-side eller post ud fra søgeteksten${page ? ` i konteksten ${page}` : ""}. Kontrollér firma, side og post, før du ændrer noget.`,
      "fi-FI": page => `Haku avaa Business Central -sivun tai tietueen hakutekstin perusteella${page ? ` asiayhteydessä ${page}` : ""}. Varmista yritys, sivu ja tietue ennen muutoksia.`,
      "nb-NO": page => `Søket åpner en Business Central-side eller post fra søketeksten${page ? ` i konteksten ${page}` : ""}. Kontroller firma, side og post før du gjør endringer.`
    },
    "Core.Lookup": {
      "sv-SE": page => `Öppnar ett urval för fältet på ${page || "den aktuella sidan"} så att du kan välja en befintlig post eller ett värde. Kontrollera att valet hör till rätt kund, leverantör, artikel eller dokument; sökningen skapar inget nytt.`,
      "en-US": page => `Opens a chooser for a field on ${page || "the current page"} so you can select an existing record or value. Check that it belongs to the right customer, vendor, item, or document; the lookup does not create anything.`,
      "fr-FR": page => `Ouvre la sélection d’un champ sur ${page || "la page actuelle"} pour choisir une valeur ou un enregistrement existant. Vérifiez qu’il correspond au bon client, fournisseur, article ou document ; aucune création n’a lieu.`,
      "de-DE": page => `Öffnet eine Auswahl für ein Feld auf ${page || "der aktuellen Seite"}, um einen vorhandenen Datensatz oder Wert auszuwählen. Prüfen Sie den Bezug zu Kunde, Lieferant, Artikel oder Dokument; es wird nichts neu angelegt.`,
      "es-ES": page => `Abre un selector de campo en ${page || "la página actual"} para elegir un registro o valor existente. Comprueba que corresponda al cliente, proveedor, producto o documento correcto; no crea uno nuevo.`,
      "da-DK": page => `Åbner et opslag for et felt på ${page || "den aktuelle side"}, hvor du vælger en eksisterende post eller værdi. Kontrollér, at valget vedrører den rigtige kunde, leverandør, vare eller det rigtige dokument; opslaget opretter ikke noget.`,
      "fi-FI": page => `Avaa kentän valinta sivulla ${page || "nykyinen sivu"} olemassa olevan tietueen tai arvon valitsemiseksi. Tarkista oikea asiakas, toimittaja, nimike tai asiakirja; valinta ei luo uutta tietuetta.`,
      "nb-NO": page => `Åpner et oppslag for et felt på ${page || "den gjeldende siden"} slik at du kan velge en eksisterende post eller verdi. Kontroller at det gjelder riktig kunde, leverandør, vare eller dokument; oppslaget oppretter ikke noe nytt.`
    },
    "Core.NavigateBack": {
      "sv-SE": page => `Går tillbaka från ${page || "den aktuella sidan"} till föregående vy. Steget sparar eller bokför inte ändringar; om osparade uppgifter finns ska du läsa Business Centrals fråga innan du lämnar sidan.`,
      "en-US": page => `Returns from ${page || "the current page"} to the previous view. This step does not save or post changes; if data is unsaved, read Business Central's prompt before leaving.`,
      "fr-FR": page => `Revient de ${page || "la page actuelle"} à la vue précédente. Cette action n’enregistre ni ne comptabilise les modifications ; lisez le message de Business Central si des données ne sont pas enregistrées.`,
      "de-DE": page => `Kehrt von ${page || "der aktuellen Seite"} zur vorherigen Ansicht zurück. Dabei werden Änderungen weder gespeichert noch gebucht; lesen Sie eine Meldung zu ungespeicherten Daten.`,
      "es-ES": page => `Vuelve desde ${page || "la página actual"} a la vista anterior. Este paso no guarda ni registra cambios; lee el aviso de Business Central si hay datos sin guardar.`,
      "da-DK": page => `Går tilbage fra ${page || "den aktuelle side"} til den forrige visning. Handlingen gemmer eller bogfører ikke ændringer; læs Business Centrals meddelelse, hvis der er data, der ikke er gemt.`,
      "fi-FI": page => `Palaa sivulta ${page || "nykyinen sivu"} edelliseen näkymään. Tämä vaihe ei tallenna eikä kirjaa muutoksia; lue Business Centralin ilmoitus, jos tietoja ei ole tallennettu.`,
      "nb-NO": page => `Går tilbake fra ${page || "den gjeldende siden"} til forrige visning. Handlingen lagrer eller bokfører ikke endringer; les meldingen fra Business Central hvis data ikke er lagret.`
    },
    "Core.EditRecord": {
      "sv-SE": (page, entity) => `Öppnar den valda ${entity || "posten"} för redigering${page ? ` på sidan ${page}` : ""}. Kontrollera att rätt post är vald; ändringarna gäller först när de sparas och kan påverka efterföljande dokument.`,
      "en-US": (page, entity) => `Opens the selected ${entity || "record"} for editing${page ? ` on the ${page} page` : ""}. Confirm the record is correct; edits take effect when saved and can affect downstream documents.`,
      "fr-FR": (page, entity) => `Ouvre ${entity || "l’enregistrement"} sélectionné pour modification${page ? ` sur la page ${page}` : ""}. Vérifiez qu’il s’agit du bon enregistrement ; les changements prennent effet à l’enregistrement et peuvent affecter les documents suivants.`,
      "de-DE": (page, entity) => `Öffnet den ausgewählten ${entity || "Datensatz"} zur Bearbeitung${page ? ` auf der Seite ${page}` : ""}. Prüfen Sie den Datensatz; Änderungen gelten nach dem Speichern und können Folgebelege beeinflussen.`,
      "es-ES": (page, entity) => `Abre ${entity || "el registro"} seleccionado para editar${page ? ` en la página ${page}` : ""}. Confirma que sea el registro correcto; los cambios surten efecto al guardar y pueden afectar documentos posteriores.`,
      "da-DK": (page, entity) => `Åbner den valgte ${entity || "post"} til redigering${page ? ` på siden ${page}` : ""}. Kontrollér, at posten er korrekt; ændringerne gælder, når de gemmes, og kan påvirke efterfølgende dokumenter.`,
      "fi-FI": page => `Avaa valitun tietueen muokattavaksi${page ? ` sivulla ${page}` : ""}. Varmista, että tietue on oikea; muutokset tulevat voimaan tallennettaessa ja voivat vaikuttaa myöhempiin asiakirjoihin.`,
      "nb-NO": (page, entity) => `Åpner den valgte ${entity || "posten"} for redigering${page ? ` på siden ${page}` : ""}. Kontroller at posten er riktig; endringer gjelder når de lagres og kan påvirke etterfølgende dokumenter.`
    },
    "Core.DeleteRecord": {
      "sv-SE": (page, entity) => `Begär att den valda ${entity || "posten"} tas bort${page ? ` från sidan ${page}` : ""}. Kontrollera identitet och beroende dokument noggrant; borttagning kan vara svår att återställa och blockeras om posten används.`,
      "en-US": (page, entity) => `Requests deletion of the selected ${entity || "record"}${page ? ` from the ${page} page` : ""}. Verify its identity and related documents carefully; deletion may be difficult to reverse and can be blocked when the record is in use.`,
      "fr-FR": (page, entity) => `Demande la suppression de ${entity || "l’enregistrement"} sélectionné${page ? ` depuis la page ${page}` : ""}. Vérifiez son identité et les documents liés ; la suppression peut être difficile à annuler ou bloquée si l’enregistrement est utilisé.`,
      "de-DE": (page, entity) => `Fordert das Löschen des ausgewählten ${entity || "Datensatzes"}${page ? ` auf der Seite ${page}` : ""} an. Prüfen Sie Datensatz und abhängige Belege genau; das Löschen kann schwer rückgängig zu machen oder bei Verwendung blockiert sein.`,
      "es-ES": (page, entity) => `Solicita eliminar ${entity || "el registro"} seleccionado${page ? ` desde la página ${page}` : ""}. Comprueba su identidad y los documentos relacionados; la eliminación puede ser difícil de revertir o bloquearse si está en uso.`,
      "da-DK": (page, entity) => `Anmoder sletning af den valgte ${entity || "post"}${page ? ` fra siden ${page}` : ""}. Kontrollér identitet og relaterede dokumenter grundigt; sletning kan være svær at fortryde eller blokeres, hvis posten er i brug.`,
      "fi-FI": page => `Pyytää valitun tietueen poistamista${page ? ` sivulta ${page}` : ""}. Tarkista tietue ja siihen liittyvät asiakirjat huolellisesti; poistoa voi olla vaikea perua, tai se voidaan estää, jos tietue on käytössä.`,
      "nb-NO": (page, entity) => `Ber om å slette den valgte ${entity || "posten"}${page ? ` fra siden ${page}` : ""}. Kontroller identitet og relaterte dokumenter nøye; sletting kan være vanskelig å angre eller bli blokkert hvis posten er i bruk.`
    },
    "Core.ConfirmYes": {
      "sv-SE": page => `Bekräftar Ja i dialogen som visas${page ? ` i sammanhanget ${page}` : ""}. Vad som utförs beror på föregående åtgärd; läs dialogtexten och kontrollera målposten innan du bekräftar.`,
      "en-US": page => `Chooses Yes in the current confirmation dialog${page ? ` in the ${page} context` : ""}. The result depends on the preceding action; read the prompt and verify the target record before confirming.`,
      "fr-FR": page => `Choisit Oui dans la boîte de confirmation actuelle${page ? ` dans le contexte ${page}` : ""}. Le résultat dépend de l’action précédente ; lisez le message et vérifiez l’enregistrement visé avant de confirmer.`,
      "de-DE": page => `Wählt Ja im aktuellen Bestätigungsdialog${page ? ` im Kontext ${page}` : ""}. Die Wirkung hängt von der vorherigen Aktion ab; lesen Sie den Dialog und prüfen Sie den Datensatz vor der Bestätigung.`,
      "es-ES": page => `Elige Sí en el diálogo de confirmación actual${page ? ` en el contexto de ${page}` : ""}. El resultado depende de la acción anterior; lee el mensaje y confirma el registro antes de aceptar.`,
      "da-DK": page => `Vælger Ja i den aktuelle bekræftelsesdialog${page ? ` i konteksten ${page}` : ""}. Resultatet afhænger af den foregående handling; læs teksten og kontrollér posten før bekræftelse.`,
      "fi-FI": page => `Valitsee Kyllä nykyisessä vahvistusikkunassa${page ? ` asiayhteydessä ${page}` : ""}. Vaikutus riippuu edellisestä toiminnosta; lue ilmoitus ja varmista kohdetietue ennen vahvistamista.`,
      "nb-NO": page => `Velger Ja i den gjeldende bekreftelsesdialogen${page ? ` i konteksten ${page}` : ""}. Resultatet avhenger av forrige handling; les meldingen og kontroller posten før du bekrefter.`
    },
    "Core.ConfirmNo": {
      "sv-SE": page => `Väljer Nej i den aktuella bekräftelsedialogen${page ? ` i sammanhanget ${page}` : ""}. Det avbryter eller avböjer det dialogen frågar om; kontrollera efteråt att dokumentet eller posten har önskat status.`,
      "en-US": page => `Chooses No in the current confirmation dialog${page ? ` in the ${page} context` : ""}. This declines or cancels what the prompt asks; verify afterward that the document or record is in the intended state.`,
      "fr-FR": page => `Choisit Non dans la boîte de confirmation actuelle${page ? ` dans le contexte ${page}` : ""}. Cela refuse ou annule l’action proposée ; vérifiez ensuite l’état souhaité du document ou de l’enregistrement.`,
      "de-DE": page => `Wählt Nein im aktuellen Bestätigungsdialog${page ? ` im Kontext ${page}` : ""}. Damit wird die abgefragte Aktion abgelehnt oder abgebrochen; prüfen Sie anschließend den gewünschten Status.`,
      "es-ES": page => `Elige No en el diálogo de confirmación actual${page ? ` en el contexto de ${page}` : ""}. Rechaza o cancela lo que pregunta el mensaje; después comprueba el estado deseado del documento o registro.`,
      "da-DK": page => `Vælger Nej i den aktuelle bekræftelsesdialog${page ? ` i konteksten ${page}` : ""}. Det afviser eller annullerer det, dialogen spørger om; kontrollér bagefter dokumentets eller postens ønskede status.`,
      "fi-FI": page => `Valitsee Ei nykyisessä vahvistusikkunassa${page ? ` asiayhteydessä ${page}` : ""}. Se hylkää tai peruuttaa ikkunassa kysytyn toiminnon; tarkista asiakirjan tai tietueen tila sen jälkeen.`,
      "nb-NO": page => `Velger Nei i den gjeldende bekreftelsesdialogen${page ? ` i konteksten ${page}` : ""}. Det avslår eller avbryter det dialogen spør om; kontroller ønsket status etterpå.`
    }
  };
  function contextualCoreExplanation(rule, context = {}) {
    const templates = coreContextText[rule?.ruleId];
    if (!templates) return null;
    const page = String(context.knowledgePageCaption || context.pageCaption || context.context?.currentPageCaption || context.context?.previousPageCaption || "").trim();
    const entity = String(context.entity || context.context?.currentEntity || "").trim();
    if (!page && !entity) return null;
    return Object.fromEntries(locales.map(locale => [locale,
      templates[locale](page, entity)]));
  }
  function basis(rule, context) {
    const ruleId = String(rule?.ruleId || "");
    const sourceRefs = rule?.sourceRefs || [];
    // Observed rules explain recorded workflows; vendor pages only support them.
    if (ruleId.startsWith("Observed.")) return "observed-workflow";
    if (sourceRefs.some(source => String(source?.sourceUri || "")
      .startsWith("https://erpdocs.apteancloud.com/"))) return "vendor-documentation";
    if (ruleId.startsWith("Core.") &&
        (contextualCreateNew(rule, context) || contextualCoreExplanation(rule, context))) return "page-context";
    if (isAuthored(rule)) return "authored-process";
    if (ruleId === "Core.CreateNew" && contextualCreateNew(rule, context)) return "page-context";
    if (financeSpecific[ruleId] || projectSpecific[ruleId] || documentSpecific[ruleId] ||
        projectExecutionSpecific[ruleId] || serviceSpecific[ruleId] || warehouseSpecific[ruleId] || warehouseExecutionSpecific[ruleId] || documentExecutionSpecific[ruleId] || manufacturingSpecific[ruleId]) return "microsoft-learn";
    if (qualitySpecific[ruleId]) return "microsoft-learn";
    if (moduleSpecific[ruleId]) return "microsoft-learn";
    // Prefer a translated, source-backed explanation for a known module rule.
    // The generic CreateNew page-context text is only a fallback when no
    // rule-specific explanation exists.
    const specificKey = specific[ruleId];
    if (specificKey && text[specificKey]) {
      return sourceRefs.some(source => String(source?.sourceUri || "")
        .startsWith("https://learn.microsoft.com/")) ? "microsoft-learn" : "authored-process";
    }
    return contextualCreateNew(rule, context) ? "page-context" : "microsoft-learn";
  }

  function localized(rule, context) {
    if (rule?.ruleId === "Core.CreateNew") {
      const contextual = contextualCreateNew(rule, context);
      if (contextual) return contextual;
    }
    const coreContextual = contextualCoreExplanation(rule, context);
    if (coreContextual) return coreContextual;
    if (observedWorkflow[rule?.ruleId]) return { ...observedWorkflow[rule.ruleId] };
    const apteanText = apteanSpecific[rule?.ruleId];
    if (apteanText) return Object.fromEntries(locales.map((locale, index) => [locale, apteanText[index]]));
    const financeText = financeSpecific[rule?.ruleId];
    if (financeText) return Object.fromEntries(locales.map((locale, index) => [locale, financeText[index]]));
    const projectText = projectSpecific[rule?.ruleId];
    if (projectText) return Object.fromEntries(locales.map((locale, index) => [locale, projectText[index]]));
    const projectExecutionText = projectExecutionSpecific[rule?.ruleId];
    if (projectExecutionText) return Object.fromEntries(locales.map((locale, index) => [locale, projectExecutionText[index]]));
    const serviceText = serviceSpecific[rule?.ruleId];
    if (serviceText) return Object.fromEntries(locales.map((locale, index) => [locale, serviceText[index]]));
    const warehouseText = warehouseSpecific[rule?.ruleId];
    if (warehouseText) return Object.fromEntries(locales.map((locale, index) => [locale, warehouseText[index]]));
    const warehouseExecutionText = warehouseExecutionSpecific[rule?.ruleId];
    if (warehouseExecutionText) return Object.fromEntries(locales.map((locale, index) => [locale, warehouseExecutionText[index]]));
    const documentExecutionText = documentExecutionSpecific[rule?.ruleId];
    if (documentExecutionText) return Object.fromEntries(locales.map((locale, index) => [locale, documentExecutionText[index]]));
    const manufacturingText = manufacturingSpecific[rule?.ruleId];
    if (manufacturingText) return Object.fromEntries(locales.map((locale, index) => [locale, manufacturingText[index]]));
    const documentKey = documentSpecific[rule?.ruleId];
    if (documentKey) {
      const labelKey = documentLabelKey(rule.ruleId, documentKey);
      return Object.fromEntries(locales.map((locale, index) => [locale,
        documentTexts[documentKey][index].replace("{document}", documentLabels[labelKey]?.[index] || "the selected document")]));
    }
    const qualityKey = qualitySpecific[rule?.ruleId];
    if (qualityKey) return { ...qualityText[qualityKey] };
    const moduleKey = moduleSpecific[rule?.ruleId];
    if (moduleKey) return Object.fromEntries(locales.map((locale, index) => [locale, moduleText[moduleKey][index]]));
    const specificKey = specific[rule?.ruleId];
    if (specificKey && text[specificKey]) return { ...text[specificKey] };
    const contextual = contextualCreateNew(rule, context);
    if (contextual) return contextual;
    const key = direct[rule?.semanticAction] ||
      (rule?.sourceRefs?.length ? "action" : "");
    return key ? { ...text[key] } : null;
  }

  function supports(rule) {
    const result = localized(rule);
    return Boolean(result && locales.every(locale => result[locale]));
  }

  return { locales, localized, supports, isAuthored, basis };
});
