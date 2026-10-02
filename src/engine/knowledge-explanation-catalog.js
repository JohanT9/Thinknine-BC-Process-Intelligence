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
      "sv-SE": "Direkt styckkostnad är inköpspriset per enhet på inköpsraden. Business Central kan föreslå kostnaden utifrån leverantör, artikel, antal, enhet, valuta och datum. Kontrollera prisvillkoren och radbeloppet innan du fortsätter.",
      "en-US": "Direct Unit Cost is the purchase cost per unit on the line. Business Central can suggest it based on vendor, item, quantity, unit of measure, currency, and date. Check the applicable price terms and line amount before continuing.",
      "fr-FR": "Le coût unitaire direct est le coût d'achat par unité sur la ligne. Business Central peut le proposer selon le fournisseur, l'article, la quantité, l'unité, la devise et la date. Vérifiez les conditions de prix applicables et le montant de la ligne.",
      "de-DE": "Direkte Einzelkosten sind die Einkaufskosten je Einheit in der Einkaufszeile. Business Central kann sie anhand von Kreditor, Artikel, Menge, Einheit, Währung und Datum vorschlagen. Prüfen Sie die geltenden Preisbedingungen und den Zeilenbetrag.",
      "es-ES": "El coste unitario directo es el coste de compra por unidad de la línea. Business Central puede proponerlo según el proveedor, el producto, la cantidad, la unidad, la divisa y la fecha. Comprueba las condiciones de precio aplicables y el importe de la línea.",
      "da-DK": "Direkte enhedsomkostning er købsprisen pr. enhed på købsserien. Business Central kan foreslå den ud fra leverandør, vare, antal, enhed, valuta og dato. Kontrollér de gældende prisvilkår og linjebeløbet.",
      "fi-FI": "Suora yksikkökustannus on ostorivin hankintahinta yksikköä kohti. Business Central voi ehdottaa sitä toimittajan, nimikkeen, määrän, yksikön, valuutan ja päivämäärän perusteella. Tarkista käytössä olevat hintaehdot ja rivin summa.",
      "nb-NO": "Direkte enhetskostnad er innkjøpskostnaden per enhet på kjøpslinjen. Business Central kan foreslå den ut fra leverandør, vare, antall, enhet, valuta og dato. Kontroller gjeldende prisvilkår og linjebeløpet."
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
    "Purchase.SelectVendor": "selectVendor",
    "Purchase.SelectPurchaseLineItem": "selectPurchaseItem",
    "Purchase.SelectPurchaseLineItemFromLookup": "selectPurchaseItem",
    "Purchase.SetDirectUnitCost": "purchaseDirectUnitCost",
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
      "sv-SE": "Väljer manuell vägning så att vikten kan anges direkt i registreringen. Kontrollera uppgiften mot vågunderlaget innan du sparar.",
      "en-US": "Chooses manual weighing so the weight can be entered in the registration. Check it against the scale reading before saving.",
      "fr-FR": "Sélectionne la pesée manuelle pour saisir le poids dans l’enregistrement. Vérifiez-le par rapport à la lecture de la balance avant d’enregistrer.",
      "de-DE": "Wählt die manuelle Wiegung, damit das Gewicht direkt in der Erfassung eingegeben werden kann. Vergleichen Sie es vor dem Speichern mit der Waagenanzeige.",
      "es-ES": "Selecciona el pesaje manual para introducir el peso en el registro. Compruébalo con la lectura de la báscula antes de guardar.",
      "da-DK": "Vælger manuel vejning, så vægten kan indtastes direkte i registreringen. Kontrollér den mod vægtens aflæsning, før du gemmer.",
      "fi-FI": "Valitsee manuaalisen punnituksen, jolloin paino voidaan syöttää kirjaukseen. Tarkista se vaa'an lukemasta ennen tallentamista.",
      "nb-NO": "Velger manuell veiing, slik at vekten kan angis direkte i registreringen. Kontroller den mot vektens avlesning før du lagrer."
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
      "sv-SE": "Sparar uppgifterna i viktregistreringen och stänger dialogen. Det här steget i sig bekräftar inte att hela inleveransen är bokförd.",
      "en-US": "Saves the weight-registration details and closes the dialog. This step alone does not confirm that the full receipt has been posted.",
      "fr-FR": "Enregistre les données de pesée et ferme la boîte de dialogue. Cette étape ne confirme pas à elle seule la comptabilisation de la réception complète.",
      "de-DE": "Speichert die Angaben zur Gewichtserfassung und schließt den Dialog. Dieser Schritt allein bestätigt nicht, dass der gesamte Wareneingang gebucht wurde.",
      "es-ES": "Guarda los datos del registro de peso y cierra el cuadro de diálogo. Este paso por sí solo no confirma que se haya registrado toda la recepción.",
      "da-DK": "Gemmer oplysningerne om vægtregistreringen og lukker dialogen. Dette trin bekræfter ikke i sig selv, at hele indleveringen er bogført.",
      "fi-FI": "Tallentaa painokirjauksen tiedot ja sulkee valintaikkunan. Tämä vaihe ei yksin vahvista koko vastaanoton kirjaamista.",
      "nb-NO": "Lagrer opplysningene i vektregistreringen og lukker dialogen. Dette trinnet bekrefter ikke i seg selv at hele mottaket er bokført."
    }
  };
  Object.assign(observedWorkflow, {
    "Aptean.OpenQCCheck": text.open, "Aptean.CreateQCCheck": text.create,
    "Aptean.ReleaseQCHold": text.action, "Aptean.OpenSFP": text.open,
    "Aptean.RegisterConsumption": text.quantity, "Aptean.RegisterOutput": text.production,
    "Aptean.OpenClaim": text.open, "Aptean.CreateClaim": text.create,
    "Aptean.SelectLotBatch": text.select, "Aptean.EnterCatchWeight": text.quantity,
    "Core.NavigateBack": text.action, "Core.EditRecord": text.action,
    "Core.DeleteRecord": text.action, "Core.Lookup": text.search,
    "Core.ChangeDate": text.date
  });
  function isAuthored(rule) { return Boolean(observedWorkflow[rule?.ruleId]); }
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
    Employee: { "sv-SE": "anställd", "en-US": "employee", "fr-FR": "employé", "de-DE": "Mitarbeiter", "es-ES": "empleado", "da-DK": "medarbejder", "fi-FI": "työntekijä", "nb-NO": "ansatt" },
    QualityCheck: { "sv-SE": "kvalitetskontroll", "en-US": "quality check", "fr-FR": "contrôle qualité", "de-DE": "Qualitätsprüfung", "es-ES": "control de calidad", "da-DK": "kvalitetskontrol", "fi-FI": "laaduntarkastus", "nb-NO": "kvalitetskontroll" }
  };
  const createNewText = {
    "sv-SE": (page, record) => `På sidan ${page} öppnar Ny formuläret för ${record || "en ny post"}. Kontrollera att posttypen stämmer innan du fyller i uppgifterna.`,
    "en-US": (page, record) => `On the ${page} page, New opens the form for ${record || "a new record"}. Check that the record type is correct before entering details.`,
    "fr-FR": (page, record) => `Sur la page ${page}, Nouveau ouvre le formulaire pour ${record || "un nouvel enregistrement"}. Vérifiez le type avant de saisir les données.`,
    "de-DE": (page, record) => `Auf der Seite ${page} öffnet Neu das Formular für ${record || "einen neuen Datensatz"}. Prüfen Sie den Datensatztyp, bevor Sie Angaben eingeben.`,
    "es-ES": (page, record) => `En la página ${page}, Nuevo abre el formulario para ${record || "un registro nuevo"}. Comprueba el tipo antes de introducir datos.`,
    "da-DK": (page, record) => `På siden ${page} åbner Ny formularen til ${record || "en ny post"}. Kontrollér posttypen, før du indtaster oplysninger.`,
    "fi-FI": (page, record) => `Sivulla ${page} Uusi avaa lomakkeen: ${record || "uusi tietue"}. Tarkista tietuetyyppi ennen tietojen syöttämistä.`,
    "nb-NO": (page, record) => `På siden ${page} åpner Ny skjemaet for ${record || "en ny post"}. Kontroller posttypen før du fyller inn opplysninger.`
  };
  function contextualCreateNew(rule, context = {}) {
    if ((rule?.taskType !== "CreateNew" && rule?.semanticAction !== "CreateNew") ||
        String(rule?.ruleId || "").startsWith("Observed.")) return null;
    const page = String(context.knowledgePageCaption || context.pageCaption ||
      context.context?.currentPageCaption || context.context?.previousPageCaption || "").trim();
    const entity = String(context.entity || context.context?.currentEntity || "").trim();
    if (!page && !entity) return null;
    return Object.fromEntries(locales.map(locale => [locale,
      createNewText[locale](page || createNewRecordTypes[entity]?.[locale] || entity,
        createNewRecordTypes[entity]?.[locale] || "")]));
  }
  function basis(rule, context) {
    const ruleId = String(rule?.ruleId || "");
    const sourceRefs = rule?.sourceRefs || [];
    if (ruleId.startsWith("Observed.")) return "observed-workflow";
    if (sourceRefs.some(source => String(source?.sourceUri || "")
      .startsWith("https://erpdocs.apteancloud.com/"))) return "vendor-documentation";
    if (isAuthored(rule)) return "authored-process";
    const specificKey = specific[ruleId];
    if (specificKey && text[specificKey]) {
      return sourceRefs.some(source => String(source?.sourceUri || "")
        .startsWith("https://learn.microsoft.com/")) ? "microsoft-learn" : "authored-process";
    }
    return contextualCreateNew(rule, context) ? "page-context" : "microsoft-learn";
  }

  function localized(rule, context) {
    if (observedWorkflow[rule?.ruleId]) return { ...observedWorkflow[rule.ruleId] };
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
