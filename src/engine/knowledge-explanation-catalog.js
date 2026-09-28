(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeExplanationCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const locales = ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"];
  const text = {
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
    "Finance.CancelDepreciationEntries": "action",
    "Finance.CloseFiscalYear": "financeSetup",
    "Finance.CreateAccountingPeriods": "financeSetup",
    "Manufacturing.RefreshProductionOrder": "production",
    "Manufacturing.ReplanProductionOrder": "production",
    "Manufacturing.EnterConsumptionQuantity": "production",
    "Manufacturing.EnterOutputQuantity": "production",
    "Projects.SetQtyToTransferToJournal": "project",
    "Projects.SetQtyToTransferToInvoice": "project",
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

  function localized(rule) {
    const key = specific[rule?.ruleId] || direct[rule?.semanticAction] ||
      (rule?.sourceRefs?.length ? "action" : "");
    return key ? { ...text[key] } : null;
  }

  function supports(rule) {
    const result = localized(rule);
    return Boolean(result && locales.every(locale => result[locale]));
  }

  return { locales, localized, supports };
});
