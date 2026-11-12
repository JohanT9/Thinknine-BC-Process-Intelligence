(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9StepText = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // The one place where a step's sentence is written. A step is described by its kind and the
  // values it was recorded with (captions as Business Central showed them, values as entered),
  // and its sentence is written from that description in the document's language when the
  // document is shown. Changing the document language therefore changes every generated step,
  // and every language has its own template instead of a translation of a Swedish sentence.
  const VERSION = "1.0.0";
  const LOCALES = Object.freeze(["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI",
    "nb-NO"]);

  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }

  // What a step creates, in each language (lower case, without article).
  const ENTITY_NAMES = deepFreeze({
    PurchaseOrder: { "sv-SE": "inköpsorder", "en-US": "purchase order", "fr-FR": "commande achat", "de-DE": "Einkaufsbestellung", "es-ES": "pedido de compra", "da-DK": "købsordre", "fi-FI": "ostotilaus", "nb-NO": "innkjøpsordre" },
    SalesOrder: { "sv-SE": "försäljningsorder", "en-US": "sales order", "fr-FR": "commande vente", "de-DE": "Verkaufsauftrag", "es-ES": "pedido de venta", "da-DK": "salgsordre", "fi-FI": "myyntitilaus", "nb-NO": "salgsordre" },
    PurchaseInvoice: { "sv-SE": "inköpsfaktura", "en-US": "purchase invoice", "fr-FR": "facture achat", "de-DE": "Einkaufsrechnung", "es-ES": "factura de compra", "da-DK": "købsfaktura", "fi-FI": "ostolasku", "nb-NO": "kjøpsfaktura" },
    SalesInvoice: { "sv-SE": "försäljningsfaktura", "en-US": "sales invoice", "fr-FR": "facture vente", "de-DE": "Verkaufsrechnung", "es-ES": "factura de venta", "da-DK": "salgsfaktura", "fi-FI": "myyntilasku", "nb-NO": "salgsfaktura" },
    ProductionOrder: { "sv-SE": "produktionsorder", "en-US": "production order", "fr-FR": "ordre de fabrication", "de-DE": "Fertigungsauftrag", "es-ES": "orden de producción", "da-DK": "produktionsordre", "fi-FI": "tuotantotilaus", "nb-NO": "produksjonsordre" },
    WarehouseReceipt: { "sv-SE": "lagerinleverans", "en-US": "warehouse receipt", "fr-FR": "réception entrepôt", "de-DE": "Lagerwareneingang", "es-ES": "recepción de almacén", "da-DK": "lagerindlevering", "fi-FI": "varastovastaanotto", "nb-NO": "lagerinngående levering" },
    QualityCheck: { "sv-SE": "kvalitetskontroll", "en-US": "quality check", "fr-FR": "contrôle qualité", "de-DE": "Qualitätsprüfung", "es-ES": "control de calidad", "da-DK": "kvalitetskontrol", "fi-FI": "laaduntarkastus", "nb-NO": "kvalitetskontroll" },
    Customer: { "sv-SE": "kund", "en-US": "customer", "fr-FR": "client", "de-DE": "Kunde", "es-ES": "cliente", "da-DK": "kunde", "fi-FI": "asiakas", "nb-NO": "kunde" },
    Vendor: { "sv-SE": "leverantör", "en-US": "vendor", "fr-FR": "fournisseur", "de-DE": "Lieferant", "es-ES": "proveedor", "da-DK": "leverandør", "fi-FI": "toimittaja", "nb-NO": "leverandør" },
    Item: { "sv-SE": "artikel", "en-US": "item", "fr-FR": "article", "de-DE": "Artikel", "es-ES": "artículo", "da-DK": "vare", "fi-FI": "nimike", "nb-NO": "vare" },
    SalesQuote: { "sv-SE": "försäljningsoffert", "en-US": "sales quote", "fr-FR": "devis de vente", "de-DE": "Verkaufsangebot", "es-ES": "oferta de venta", "da-DK": "salgstilbud", "fi-FI": "myyntitarjous", "nb-NO": "salgstilbud" },
    PurchaseCreditMemo: { "sv-SE": "inköpskreditnota", "en-US": "purchase credit memo", "fr-FR": "avoir achat", "de-DE": "Einkaufsgutschrift", "es-ES": "abono de compra", "da-DK": "købskreditnota", "fi-FI": "ostohyvityslasku", "nb-NO": "kjøpskreditnota" },
    TransferOrder: { "sv-SE": "överföringsorder", "en-US": "transfer order", "fr-FR": "ordre de transfert", "de-DE": "Umlagerungsauftrag", "es-ES": "orden de transferencia", "da-DK": "overførselsordre", "fi-FI": "siirtotilaus", "nb-NO": "overføringsordre" },
    AssemblyOrder: { "sv-SE": "monteringsorder", "en-US": "assembly order", "fr-FR": "ordre d’assemblage", "de-DE": "Montageauftrag", "es-ES": "orden de ensamblado", "da-DK": "samleordre", "fi-FI": "kokoonpanotilaus", "nb-NO": "monteringsordre" },
    ServiceOrder: { "sv-SE": "serviceorder", "en-US": "service order", "fr-FR": "ordre de service", "de-DE": "Serviceauftrag", "es-ES": "orden de servicio", "da-DK": "serviceordre", "fi-FI": "huoltotilaus", "nb-NO": "serviceordre" },
    SalesCreditMemo: { "sv-SE": "försäljningskreditnota", "en-US": "sales credit memo", "fr-FR": "avoir vente", "de-DE": "Verkaufsgutschrift", "es-ES": "abono de venta", "da-DK": "salgskreditnota", "fi-FI": "myyntihyvityslasku", "nb-NO": "salgskreditnota" },
    SalesReturnOrder: { "sv-SE": "försäljningsreturorder", "en-US": "sales return order", "fr-FR": "commande retour vente", "de-DE": "Verkaufsrücksendung", "es-ES": "devolución de venta", "da-DK": "salgsreturordre", "fi-FI": "myyntipalautustilaus", "nb-NO": "salgsreturordre" },
    PurchaseReturnOrder: { "sv-SE": "inköpsreturorder", "en-US": "purchase return order", "fr-FR": "commande retour achat", "de-DE": "Einkaufsrücksendung", "es-ES": "devolución de compra", "da-DK": "købsreturordre", "fi-FI": "ostopalautustilaus", "nb-NO": "kjøpsreturordre" },
    PurchaseQuote: { "sv-SE": "inköpsoffert", "en-US": "purchase quote", "fr-FR": "devis d’achat", "de-DE": "Einkaufsanfrage", "es-ES": "oferta de compra", "da-DK": "købstilbud", "fi-FI": "ostotarjous", "nb-NO": "kjøpstilbud" },
    BankAccount: { "sv-SE": "bankkonto", "en-US": "bank account", "fr-FR": "compte bancaire", "de-DE": "Bankkonto", "es-ES": "cuenta bancaria", "da-DK": "bankkonto", "fi-FI": "pankkitili", "nb-NO": "bankkonto" },
    GLAccount: { "sv-SE": "huvudbokskonto", "en-US": "G/L account", "fr-FR": "compte général", "de-DE": "Sachkonto", "es-ES": "cuenta contable", "da-DK": "finanskonto", "fi-FI": "pääkirjatili", "nb-NO": "hovedbokskonto" },
    GeneralJournal: { "sv-SE": "redovisningsjournal", "en-US": "general journal", "fr-FR": "journal général", "de-DE": "Fibu Buch.-Blatt", "es-ES": "diario general", "da-DK": "finanskladde", "fi-FI": "yleinen päiväkirja", "nb-NO": "generell journal" },
    PaymentJournal: { "sv-SE": "betalningsjournal", "en-US": "payment journal", "fr-FR": "journal de paiement", "de-DE": "Zahlungs Buch.-Blatt", "es-ES": "diario de pagos", "da-DK": "betalingskladde", "fi-FI": "maksupäiväkirja", "nb-NO": "betalingsjournal" },
    CashReceiptJournal: { "sv-SE": "inbetalningsjournal", "en-US": "cash receipt journal", "fr-FR": "journal des encaissements", "de-DE": "Zahlungseingang Buch.-Blatt", "es-ES": "diario de cobros", "da-DK": "indbetalingskladde", "fi-FI": "kassakuittipäiväkirja", "nb-NO": "innbetalingsjournal" },
    BankAccountReconciliation: { "sv-SE": "bankavstämning", "en-US": "bank account reconciliation", "fr-FR": "rapprochement bancaire", "de-DE": "Bankkontoabstimmung", "es-ES": "conciliación bancaria", "da-DK": "bankafstemning", "fi-FI": "pankkitilin täsmäytys", "nb-NO": "bankavstemming" },
    PaymentReconciliationJournal: { "sv-SE": "betalningsavstämningsjournal", "en-US": "payment reconciliation journal", "fr-FR": "journal de rapprochement des paiements", "de-DE": "Zahlungsabstimmungs-Buch.-Blatt", "es-ES": "diario de conciliación de pagos", "da-DK": "betalingsafstemningskladde", "fi-FI": "maksujen täsmäytyspäiväkirja", "nb-NO": "betalingsavstemmingsjournal" },
    WarehouseShipment: { "sv-SE": "lagerutleverans", "en-US": "warehouse shipment", "fr-FR": "expédition entrepôt", "de-DE": "Lagerlieferung", "es-ES": "envío de almacén", "da-DK": "lagerleverance", "fi-FI": "varastotoimitus", "nb-NO": "lagerutlevering" },
    WarehousePick: { "sv-SE": "lagerplockning", "en-US": "warehouse pick", "fr-FR": "prélèvement entrepôt", "de-DE": "Lagerkommissionierung", "es-ES": "picking de almacén", "da-DK": "lagerpluk", "fi-FI": "varastokeräily", "nb-NO": "lagerplukk" },
    WarehousePutAway: { "sv-SE": "lagerinlagring", "en-US": "warehouse put-away", "fr-FR": "rangement entrepôt", "de-DE": "Lager Einlagerung", "es-ES": "ubicación en almacén", "da-DK": "lagerindlagring", "fi-FI": "varastopaikoitus", "nb-NO": "lagerinnlagring" },
    InventoryPick: { "sv-SE": "lagerplockning", "en-US": "inventory pick", "fr-FR": "prélèvement stock", "de-DE": "Lagerkommissionierung", "es-ES": "picking de inventario", "da-DK": "lagerpluk", "fi-FI": "varastokeräily", "nb-NO": "lagerplukk" },
    WarehouseActivity: { "sv-SE": "lageraktivitet", "en-US": "warehouse activity", "fr-FR": "activité entrepôt", "de-DE": "Lageraktivität", "es-ES": "actividad de almacén", "da-DK": "lageraktivitet", "fi-FI": "varastotoiminto", "nb-NO": "lageraktivitet" },
    ItemVariant: { "sv-SE": "artikelvariant", "en-US": "item variant", "fr-FR": "variante article", "de-DE": "Artikelvariante", "es-ES": "variante de artículo", "da-DK": "varevariant", "fi-FI": "nimikevariantti", "nb-NO": "varevariant" },
    ItemCategory: { "sv-SE": "artikelkategori", "en-US": "item category", "fr-FR": "catégorie article", "de-DE": "Artikelkategorie", "es-ES": "categoría de producto", "da-DK": "varekategori", "fi-FI": "nimikekategoria", "nb-NO": "varekategori" }
  });

  // A record of a known kind chosen in a list ("Välj inköpsordern PO1"); "" is any record.
  const RECORD_OF = deepFreeze({
    "sv-SE": { SalesOrder: "försäljningsordern", PurchaseOrder: "inköpsordern",
      SalesInvoice: "försäljningsfakturan", PurchaseInvoice: "inköpsfakturan", "": "posten" },
    "en-US": { SalesOrder: "the sales order", PurchaseOrder: "the purchase order",
      SalesInvoice: "the sales invoice", PurchaseInvoice: "the purchase invoice", "": "the record" },
    "fr-FR": { SalesOrder: "la commande vente", PurchaseOrder: "la commande achat",
      SalesInvoice: "la facture vente", PurchaseInvoice: "la facture achat", "": "l’enregistrement" },
    "de-DE": { SalesOrder: "den Verkaufsauftrag", PurchaseOrder: "die Einkaufsbestellung",
      SalesInvoice: "die Verkaufsrechnung", PurchaseInvoice: "die Einkaufsrechnung", "": "den Datensatz" },
    "es-ES": { SalesOrder: "el pedido de venta", PurchaseOrder: "el pedido de compra",
      SalesInvoice: "la factura de venta", PurchaseInvoice: "la factura de compra", "": "el registro" },
    "da-DK": { SalesOrder: "salgsordren", PurchaseOrder: "købsordren",
      SalesInvoice: "salgsfakturaen", PurchaseInvoice: "købsfakturaen", "": "posten" },
    "fi-FI": { SalesOrder: "myyntitilaus", PurchaseOrder: "ostotilaus",
      SalesInvoice: "myyntilasku", PurchaseInvoice: "ostolasku", "": "tietue" },
    "nb-NO": { SalesOrder: "salgsordren", PurchaseOrder: "innkjøpsordren",
      SalesInvoice: "salgsfakturaen", PurchaseInvoice: "kjøpsfakturaen", "": "posten" }
  });

  // Business Central's own captions and the words used when the recording did not capture one.
  const CLIENT_DEFAULTS = deepFreeze({
    search: { "sv-SE": "Sök", "en-US": "Search", "fr-FR": "Rechercher", "de-DE": "Suchen",
      "es-ES": "Buscar", "da-DK": "Søg", "fi-FI": "Hae", "nb-NO": "Søk" },
    tellMe: { "sv-SE": "Berätta vad du vill göra", "en-US": "Tell me what you want to do",
      "fr-FR": "Dites-moi ce que vous voulez faire", "de-DE": "Was möchten Sie tun",
      "es-ES": "Indique qué desea hacer", "da-DK": "Fortæl mig, hvad du vil foretage dig",
      "fi-FI": "Kerro, mitä haluat tehdä", "nb-NO": "Fortell hva du vil gjøre" },
    numberField: { "sv-SE": "nummerfältet", "en-US": "the number field",
      "fr-FR": "le champ du numéro", "de-DE": "das Nummernfeld", "es-ES": "el campo de número",
      "da-DK": "nummerfeltet", "fi-FI": "numero", "nb-NO": "nummerfeltet" },
    searchText: { "sv-SE": "söktext", "en-US": "search text", "fr-FR": "terme de recherche",
      "de-DE": "Suchtext", "es-ES": "texto de búsqueda", "da-DK": "søgetekst",
      "fi-FI": "hakuteksti", "nb-NO": "søketekst" }
  });

  // One template per kind and language. {name} is a value of the step: entered values
  // ({typed}, {query}, {value}) are shown bold and captions as Business Central's interface
  // text; {entity}, {recordOf} and {searchText} are written in the document's language.
  const T = (sv, en, fr, de, es, da, fi, nb) => ({ "sv-SE": sv, "en-US": en, "fr-FR": fr,
    "de-DE": de, "es-ES": es, "da-DK": da, "fi-FI": fi, "nb-NO": nb });
  const TEMPLATES = deepFreeze({
    action: T("Välj {action}.", "Choose {action}.", "Sélectionnez {action}.",
      "Wählen Sie {action} aus.", "Seleccione {action}.", "Vælg {action}.", "Valitse {action}.",
      "Velg {action}."),
    actionOnPage: T("Välj {action} på sidan {page}.", "Choose {action} on the {page} page.",
      "Sélectionnez {action} sur la page {page}.", "Wählen Sie {action} auf der Seite {page} aus.",
      "Seleccione {action} en la página {page}.", "Vælg {action} på siden {page}.",
      "Valitse {action} sivulla {page}.", "Velg {action} på siden {page}."),
    dialogAction: T("Välj {action} i dialogrutan.", "Choose {action} in the dialog.",
      "Sélectionnez {action} dans la boîte de dialogue.", "Wählen Sie im Dialog {action} aus.",
      "Seleccione {action} en el cuadro de diálogo.", "Vælg {action} i dialogboksen.",
      "Valitse valintaikkunassa {action}.", "Velg {action} i dialogboksen."),
    shortcut: T("Tryck på {keys}.", "Press {keys}.", "Appuyez sur {keys}.", "Drücken Sie {keys}.",
      "Pulse {keys}.", "Tryk på {keys}.", "Paina {keys}.", "Trykk på {keys}."),
    shortcutOpens: T("Tryck på {keys} för att öppna {opened}.", "Press {keys} to open {opened}.",
      "Appuyez sur {keys} pour ouvrir {opened}.", "Drücken Sie {keys}, um {opened} zu öffnen.",
      "Pulse {keys} para abrir {opened}.", "Tryk på {keys} for at åbne {opened}.",
      "Avaa {opened} painamalla {keys}.", "Trykk på {keys} for å åpne {opened}."),
    searchOpen: T("Sök efter {query} och öppna {result}.", "Search for {query} and open {result}.",
      "Recherchez {query} et ouvrez {result}.", "Suchen Sie nach {query} und öffnen Sie {result}.",
      "Busque {query} y abra {result}.", "Søg efter {query} og åbn {result}.",
      "Hae {query} ja avaa {result}.", "Søk etter {query} og åpne {result}."),
    searchOpenList: T("Sök efter {query} och öppna listan {result}.",
      "Search for {query} and open the {result} list.",
      "Recherchez {query} et ouvrez la liste {result}.",
      "Suchen Sie nach {query} und öffnen Sie die Liste {result}.",
      "Busque {query} y abra la lista {result}.", "Søg efter {query} og åbn listen {result}.",
      "Hae {query} ja avaa luettelo {result}.", "Søk etter {query} og åpne listen {result}."),
    searchFull: T("Välj {search}, ange {query} i {field} och välj {result}.",
      "Choose {search}, enter {query} in {field}, and choose {result}.",
      "Sélectionnez {search}, saisissez {query} dans {field} et sélectionnez {result}.",
      "Wählen Sie {search} aus, geben Sie {query} in {field} ein und wählen Sie {result} aus.",
      "Seleccione {search}, introduzca {query} en {field} y seleccione {result}.",
      "Vælg {search}, angiv {query} i {field} og vælg {result}.",
      "Valitse {search}, syötä {query} kenttään {field} ja valitse {result}.",
      "Velg {search}, angi {query} i {field} og velg {result}."),
    searchFullText: T("Välj {search}, ange {searchText} i {field} och välj {result}.",
      "Choose {search}, enter {searchText} in {field}, and choose {result}.",
      "Sélectionnez {search}, saisissez {searchText} dans {field} et sélectionnez {result}.",
      "Wählen Sie {search} aus, geben Sie {searchText} in {field} ein und wählen Sie {result} aus.",
      "Seleccione {search}, introduzca {searchText} en {field} y seleccione {result}.",
      "Vælg {search}, angiv {searchText} i {field} og vælg {result}.",
      "Valitse {search}, syötä {searchText} kenttään {field} ja valitse {result}.",
      "Velg {search}, angi {searchText} i {field} og velg {result}."),
    record: T("Välj {recordOf} {record}.", "Choose {recordOf} {record}.",
      "Sélectionnez {recordOf} {record}.", "Wählen Sie {recordOf} {record} aus.",
      "Seleccione {recordOf} {record}.", "Vælg {recordOf} {record}.",
      "Valitse {recordOf} {record}.", "Velg {recordOf} {record}."),
    recordOnPage: T("Välj {recordOf} {record} på sidan {page}.",
      "Choose {recordOf} {record} on the {page} page.",
      "Sélectionnez {recordOf} {record} sur la page {page}.",
      "Wählen Sie {recordOf} {record} auf der Seite {page} aus.",
      "Seleccione {recordOf} {record} en la página {page}.",
      "Vælg {recordOf} {record} på siden {page}.", "Valitse {recordOf} {record} sivulla {page}.",
      "Velg {recordOf} {record} på siden {page}."),
    openList: T("Öppna listan {list}.", "Open the {list} list.", "Ouvrez la liste {list}.",
      "Öffnen Sie die Liste {list}.", "Abra la lista {list}.", "Åbn listen {list}.",
      "Avaa luettelo {list}.", "Åpne listen {list}."),
    create: T("Börja skapa en ny {entity} genom att välja {action} på sidan {page}.",
      "Start creating a new {entity} by selecting {action} on the {page} page.",
      "Sélectionnez {action} sur la page {page} pour créer un nouvel enregistrement ({entity}).",
      "Wählen Sie auf der Seite {page} {action} aus, um einen neuen Datensatz ({entity}) zu erstellen.",
      "Seleccione {action} en la página {page} para crear un nuevo registro ({entity}).",
      "Begynd at oprette en ny {entity} ved at vælge {action} på siden {page}.",
      "Luo uusi tietue ({entity}) valitsemalla {action} sivulla {page}.",
      "Begynn å opprette en ny {entity} ved å velge {action} på siden {page}."),
    createRecord: T("Börja skapa en ny post genom att välja {action} på sidan {page}.",
      "Start creating a new record by selecting {action} on the {page} page.",
      "Sélectionnez {action} sur la page {page} pour créer un nouvel enregistrement.",
      "Wählen Sie auf der Seite {page} {action} aus, um einen neuen Datensatz zu erstellen.",
      "Seleccione {action} en la página {page} para crear un nuevo registro.",
      "Begynd at oprette en ny post ved at vælge {action} på siden {page}.",
      "Luo uusi tietue valitsemalla {action} sivulla {page}.",
      "Begynn å opprette en ny post ved å velge {action} på siden {page}."),
    createFromPage: T("Börja skapa en ny post från sidan {page}.",
      "Start creating a new record from the {page} page.",
      "Commencez à créer un nouvel enregistrement depuis la page {page}.",
      "Beginnen Sie auf der Seite {page}, einen neuen Datensatz zu erstellen.",
      "Empiece a crear un nuevo registro desde la página {page}.",
      "Begynd at oprette en ny post fra siden {page}.",
      "Aloita uuden tietueen luominen sivulta {page}.",
      "Begynn å opprette en ny post fra siden {page}."),
    createBare: T("Börja skapa en ny post.", "Start creating a new record.",
      "Commencez à créer un nouvel enregistrement.",
      "Beginnen Sie, einen neuen Datensatz zu erstellen.",
      "Empiece a crear un nuevo registro.", "Begynd at oprette en ny post.",
      "Aloita uuden tietueen luominen.", "Begynn å opprette en ny post."),
    enter: T("Ange {typed} i {field}.", "Enter {typed} in {field}.",
      "Saisissez {typed} dans {field}.", "Geben Sie {typed} in {field} ein.",
      "Introduzca {typed} en {field}.", "Angiv {typed} i {field}.",
      "Syötä {typed} kenttään {field}.", "Angi {typed} i {field}."),
    enterAndChoose: T("Ange {typed} i {field} och välj {choice}.",
      "Enter {typed} in {field}, and choose {choice}.",
      "Saisissez {typed} dans {field} et sélectionnez {choice}.",
      "Geben Sie {typed} in {field} ein und wählen Sie {choice} aus.",
      "Introduzca {typed} en {field} y seleccione {choice}.",
      "Angiv {typed} i {field} og vælg {choice}.",
      "Syötä {typed} kenttään {field} ja valitse {choice}.",
      "Angi {typed} i {field} og velg {choice}."),
    fill: T("Fyll i {field}.", "Fill in {field}.", "Renseignez {field}.",
      "Füllen Sie {field} aus.", "Rellene {field}.", "Udfyld {field}.", "Täytä {field}.",
      "Fyll ut {field}."),
    chooseIn: T("Välj {choice} i {field}.", "Choose {choice} in {field}.",
      "Sélectionnez {choice} dans {field}.", "Wählen Sie {choice} in {field} aus.",
      "Seleccione {choice} en {field}.", "Vælg {choice} i {field}.",
      "Valitse {choice} kohdassa {field}.", "Velg {choice} i {field}."),
    chooseInRowType: T("Välj {choice} i {field} ({rowType}).",
      "Choose {choice} in {field} ({rowType}).",
      "Sélectionnez {choice} dans {field} ({rowType}).",
      "Wählen Sie {choice} in {field} ({rowType}) aus.",
      "Seleccione {choice} en {field} ({rowType}).", "Vælg {choice} i {field} ({rowType}).",
      "Valitse {choice} kohdassa {field} ({rowType}).", "Velg {choice} i {field} ({rowType})."),
    chooseOption: T("Välj ett alternativ i {field}.", "Choose an option in {field}.",
      "Sélectionnez une option dans {field}.", "Wählen Sie in {field} eine Option aus.",
      "Seleccione una opción en {field}.", "Vælg en mulighed i {field}.",
      "Valitse vaihtoehto kohdassa {field}.", "Velg et alternativ i {field}."),
    chooseValue: T("Välj värde {choice}.", "Choose the value {choice}.",
      "Sélectionnez la valeur {choice}.", "Wählen Sie den Wert {choice} aus.",
      "Seleccione el valor {choice}.", "Vælg værdien {choice}.", "Valitse arvo {choice}.",
      "Velg verdien {choice}."),
    chooseAValue: T("Välj värde.", "Choose a value.", "Sélectionnez une valeur.",
      "Wählen Sie einen Wert aus.", "Seleccione un valor.", "Vælg en værdi.", "Valitse arvo.",
      "Velg en verdi."),
    chooseOf: T("Välj {entity} {choice}.", "Choose {entity} {choice}.",
      "Sélectionnez {entity} {choice}.", "Wählen Sie {entity} {choice} aus.",
      "Seleccione {entity} {choice}.", "Vælg {entity} {choice}.", "Valitse {entity} {choice}.",
      "Velg {entity} {choice}."),
    chooseLabeled: T("Välj {field} {value}.", "Choose {field} {value}.",
      "Sélectionnez {field} {value}.", "Wählen Sie {field} {value} aus.",
      "Seleccione {field} {value}.", "Vælg {field} {value}.", "Valitse {field} {value}.",
      "Velg {field} {value}."),
    chooseFor: T("Välj {value} som värde för {field}.", "Choose {value} for {field}.",
      "Sélectionnez {value} comme valeur pour {field}.",
      "Wählen Sie {value} als Wert für {field} aus.",
      "Seleccione {value} como valor para {field}.", "Vælg {value} som værdi for {field}.",
      "Valitse {value} kentän arvoksi {field}.", "Velg {value} som verdi for {field}."),
    chooseBare: T("Välj {value}.", "Choose {value}.", "Sélectionnez {value}.",
      "Wählen Sie {value} aus.", "Seleccione {value}.", "Vælg {value}.", "Valitse {value}.",
      "Velg {value}."),
    enable: T("Aktivera {field}.", "Enable {field}.", "Activez {field}.",
      "Aktivieren Sie {field}.", "Active {field}.", "Aktivér {field}.", "Ota käyttöön {field}.",
      "Aktiver {field}."),
    disable: T("Inaktivera {field}.", "Disable {field}.", "Désactivez {field}.",
      "Deaktivieren Sie {field}.", "Desactive {field}.", "Deaktivér {field}.",
      "Poista käytöstä {field}.", "Deaktiver {field}."),
    path: T("Välj {path}.", "Choose {path}.", "Sélectionnez {path}.", "Wählen Sie {path} aus.",
      "Seleccione {path}.", "Vælg {path}.", "Valitse {path}.", "Velg {path}."),
    pathOnPage: T("Välj {path} på sidan {page}.", "Choose {path} on the {page} page.",
      "Sélectionnez {path} sur la page {page}.", "Wählen Sie {path} auf der Seite {page} aus.",
      "Seleccione {path} en la página {page}.", "Vælg {path} på siden {page}.",
      "Valitse {path} sivulla {page}.", "Velg {path} på siden {page}.")
  });

  // Slots shown as entered values; every other named slot is a caption, except the words
  // written in the document's language.
  const VALUE_SLOTS = new Set(["typed", "query", "value"]);
  const KINDS = Object.freeze(Object.keys(TEMPLATES));
  const text = value => String(value ?? "").trim();
  const locale = value => LOCALES.includes(value) ? value : "sv-SE";

  function entityName(id, language) {
    return ENTITY_NAMES[id]?.[locale(language)] || "";
  }

  // The runs of a slot, or null when the step lacks it.
  function slotRuns(name, descriptor, language) {
    if (name === "path") {
      const path = Array.isArray(descriptor.path) ? descriptor.path.map(text).filter(Boolean) : [];
      if (!path.length) return null;
      return path.flatMap((caption, index) => [
        ...(index ? [{ text: " → ", role: "text" }] : []), { text: caption, role: "interface" }]);
    }
    if (name === "entity") {
      const value = entityName(descriptor.entity, language);
      // The record kind is marked like a caption, as the create sentence always did.
      return value ? [{ text: value, role: "interface" }] : null;
    }
    if (name === "recordOf") {
      const nouns = RECORD_OF[language];
      return [{ text: nouns[text(descriptor.recordOf)] || nouns[""], role: "text" }];
    }
    if (name === "searchText") return [{ text: CLIENT_DEFAULTS.searchText[language], role: "text" }];
    const value = text(descriptor[name]);
    if (!value) return null;
    return [{ text: value, role: VALUE_SLOTS.has(name) ? "value" : "interface" }];
  }

  // The sentence of a described step in a language, as runs; null when the step is not
  // described or lacks a value its sentence needs.
  function runs(descriptor, language) {
    if (!descriptor || !TEMPLATES[descriptor.kind]) return null;
    const lang = locale(language);
    const template = TEMPLATES[descriptor.kind][lang];
    const result = [];
    const pattern = /\{(\w+)\}/gu;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(template))) {
      if (match.index > cursor) result.push({ text: template.slice(cursor, match.index), role: "text" });
      const slot = slotRuns(match[1], descriptor, lang);
      if (!slot) return null;
      result.push(...slot);
      cursor = match.index + match[0].length;
    }
    if (cursor < template.length) result.push({ text: template.slice(cursor), role: "text" });
    // A caption that ends with its own period ("Nr.") ends the sentence: no second period.
    for (let index = 1; index < result.length; index += 1) {
      if (result[index].role === "text" && result[index].text.startsWith(".") &&
          result[index - 1].role !== "text" && /\.$/u.test(result[index - 1].text)) {
        result[index] = { ...result[index], text: result[index].text.slice(1) };
      }
    }
    // The words before the first value say what to do.
    if (result[0]?.role === "text") result[0] = { ...result[0], role: "action" };
    return result.filter(item => item.text !== "");
  }

  function render(descriptor, language) {
    const result = runs(descriptor, language);
    return result ? { text: result.map(item => item.text).join(""), runs: result } : null;
  }

  // The same sentence with the marks the review and the older document layers read: entered
  // values in __, captions in **.
  function markdown(descriptor, language) {
    const result = runs(descriptor, language);
    if (!result) return "";
    return result.map(item => item.role === "value" ? `__${item.text}__`
      : item.role === "interface" ? `**${item.text}**` : item.text).join("");
  }

  // A description of a step: its kind and its values, without any sentence.
  function describe(kind, slots = {}) {
    if (!TEMPLATES[kind]) throw new TypeError(`Unknown step text kind: ${kind}`);
    const result = { kind };
    for (const [key, value] of Object.entries(slots)) {
      if (Array.isArray(value)) result[key] = value.map(text).filter(Boolean);
      else if (text(value)) result[key] = text(value);
    }
    return deepFreeze(result);
  }

  // Reads a sentence written from one of these templates back into its description. Only an
  // exact match counts, and only when the description writes the very same sentence again, so
  // a sentence written or changed any other way is never described.
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const CAPTION = "((?:(?!\\*\\*).)+)";
  const VALUE = "((?:(?!__).)+)";
  const parsers = new Map();
  function parser(kind, language) {
    const key = `${kind}\u001f${language}`;
    if (parsers.has(key)) return parsers.get(key);
    const slots = [];
    let source = "";
    let cursor = 0;
    const template = TEMPLATES[kind][language];
    const pattern = /\{(\w+)\}/gu;
    let match;
    while ((match = pattern.exec(template))) {
      source += escape(template.slice(cursor, match.index));
      const name = match[1];
      slots.push(name);
      if (name === "path") source += `(\\*\\*${CAPTION.slice(1, -1)}\\*\\*(?: → \\*\\*${CAPTION.slice(1, -1)}\\*\\*)*)`;
      else if (name === "entity") {
        const words = Object.values(ENTITY_NAMES).map(names => escape(names[language]));
        source += `\\*\\*(${words.join("|")})\\*\\*`;
      } else if (name === "recordOf") {
        source += `(${Object.values(RECORD_OF[language]).map(escape).join("|")})`;
      } else if (name === "searchText") source += `(${escape(CLIENT_DEFAULTS.searchText[language])})`;
      else source += VALUE_SLOTS.has(name) ? `__${VALUE}__` : `\\*\\*${CAPTION}\\*\\*`;
      cursor = match.index + match[0].length;
    }
    source += escape(template.slice(cursor));
    const result = { slots, regex: new RegExp(`^${source}$`, "u") };
    parsers.set(key, result);
    return result;
  }

  function parse(markdownText, language = "sv-SE") {
    const lang = locale(language);
    // A caption that ends with its own period ("Nr.") ends the sentence; a second period after
    // it is the same sentence.
    const sentence = text(markdownText).replace(/\.\*\*\.$/u, ".**");
    if (!sentence) return null;
    const candidates = sentence.endsWith(".**") ? [sentence, `${sentence}.`] : [sentence];
    for (const kind of KINDS) {
      for (const candidate of candidates) {
        const { slots, regex } = parser(kind, lang);
        const match = candidate.match(regex);
        if (!match) continue;
        const values = {};
        slots.forEach((name, index) => {
          const value = match[index + 1];
          if (name === "path") values.path = value.split(" → ").map(item => item.slice(2, -2));
          else if (name === "entity") {
            values.entity = Object.keys(ENTITY_NAMES).find(id => ENTITY_NAMES[id][lang] === value);
          } else if (name === "recordOf") {
            values.recordOf = Object.keys(RECORD_OF[lang]).find(id => RECORD_OF[lang][id] === value);
          } else if (name !== "searchText") values[name] = value;
        });
        const descriptor = describe(kind, values);
        if (markdown(descriptor, lang) === sentence) return descriptor;
      }
    }
    return null;
  }

  return Object.freeze({ VERSION, LOCALES, KINDS, ENTITY_NAMES, CLIENT_DEFAULTS, TEMPLATES,
    describe, entityName, markdown, parse, render, runs });
});
