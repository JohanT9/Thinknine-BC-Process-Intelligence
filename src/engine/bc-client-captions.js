(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BCClientCaptions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Business Central client controls that are not business steps: closing, scrolling,
  // showing more, browser history, field hints and the Tell Me search. Recognition prefers
  // structure (dialog buttons join the action that opened the dialog, private-use icon
  // glyphs, section toggles); these captions cover what structure cannot.
  // Sources: the Business Central web client's own language resources
  // (WebPublish/wwwroot/Resources/Lang/<culture>/Microsoft.Dynamics.Framework.Resource.js,
  // platform 26.18.55014.0; resource keys in docs/EVENT_STEP_GROUPING.md) and captions observed
  // in recordings. No caption is translated by hand.
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const stem = text => escape(text.trim().replace(/[.?]$/u, "")).replace(/\s+/gu, "\\s*");
  // A whole caption, with or without its closing punctuation.
  const exact = (...texts) => texts.map(text => new RegExp(`^${stem(text)}[.?]?$`, "iu"));
  // A caption that starts with the sentence, alone or followed by the rest of its tooltip.
  const leading = text => new RegExp(`^${stem(text)}(?:[.?](?:\\s.*)?)?$`, "iu");
  // A hint sentence inside a longer accessible description.
  const contains = (...texts) => texts.map(text => new RegExp(stem(text), "iu"));
  // A whole announcement built from a resource template: {0}, {1} and {2} stand for any text,
  // spaces and an ellipsis may vary, and the closing period is optional.
  const template = (...texts) => texts.map(text => new RegExp(`^${text.trim().replace(/[.]$/u, "")
    .split(/\{\d\}/u).map(part => escape(part).replace(/\s+/gu, "\\s*")
      .replace(/(?:\\\.){3}|…/gu, "(?:\\.\\.\\.|…)")).join(".+?")}\\.?$`, "iu"));

  const CAPTIONS = Object.freeze({
    // CloseButton, DetailsPageExitAction, PdfControl_Close, DatePickerCloseText. The client's
    // Dismiss translations (Ignorer, Verwerfen, Descartar, Afvis, Hylkää, Forkast) are left out:
    // they equal Business Central approval and journal actions such as Reject.
    close: {
      "sv-SE": exact("Stäng"),
      "en-US": [...exact("Close"), ...exact("Dismiss")],
      "fr-FR": exact("Fermer"),
      "de-DE": exact("Schließen"),
      "es-ES": exact("Cerrar"),
      "da-DK": exact("Luk"),
      "fi-FI": exact("Sulje"),
      "nb-NO": exact("Lukk")
    },
    // ScrollLeft, ScrollRight; up and down were observed in Swedish and English recordings.
    scroll: {
      "sv-SE": [/^rulla(?:\s+åt)?\s+(?:höger|vänster|upp|ned|ner)\.?$/iu],
      "en-US": [/^scroll(?:\s+to\s+the)?\s+(?:right|left|up|down)\.?$/iu],
      "fr-FR": exact("Défiler vers la gauche", "Défiler vers la droite"),
      "de-DE": exact("Nach links verschieben", "Nach rechts verschieben"),
      "es-ES": exact("Desplazarse hacia la izquierda", "Desplazarse a la derecha"),
      "da-DK": exact("Rul til venstre", "Rul til højre"),
      "fi-FI": exact("Vieritä vasemmalle", "Vieritä oikealle"),
      "nb-NO": exact("Bla til venstre", "Bla til høyre")
    },
    // ShowMoreFields, ShowLess, CommandBar_ShowWrappedItemsInContextMenu_Tooltip,
    // CommandBar_ShowMore_Tooltip, CommandBar_ShowLess_Tooltip.
    display: {
      "sv-SE": exact("Visa mer", "Visa mindre", "Visa resten", "Visa sekundära åtgärder",
        "Dölj sekundära åtgärder"),
      "en-US": exact("Show more", "Show less", "Show the rest", "Show secondary actions",
        "Reveal secondary actions", "Hide secondary actions"),
      "fr-FR": exact("Afficher plus", "Afficher moins", "Afficher le reste",
        "Afficher les actions secondaires", "Masquer les actions secondaires"),
      "de-DE": exact("Mehr anzeigen", "Weniger anzeigen", "Rest anzeigen",
        "Sekundäre Aktionen anzeigen", "Sekundäre Aktionen ausblenden"),
      "es-ES": exact("Mostrar más", "Mostrar menos", "Mostrar el resto",
        "Mostrar acciones secundarias", "Ocultar acciones secundarias"),
      "da-DK": exact("Vis mere", "Vis mindre", "Vis resten", "Vis sekundære handlinger",
        "Skjul sekundære handlinger"),
      "fi-FI": exact("Näytä enemmän", "Näytä vähemmän", "Näytä loput",
        "Näytä toissijaiset toiminnot", "Piilota toissijaiset toiminnot"),
      "nb-NO": exact("Vis mer", "Vis mindre", "Vis resten", "Vis sekundære handlinger",
        "Skjul sekundære handlinger")
    },
    // Back_Title, HelpPaneBackButton, HelpPaneForwardButton; Swedish Tillbaka was observed.
    history: {
      "sv-SE": [/^(?:bakåt|tillbaka|framåt)$/iu],
      "en-US": [/^(?:back|forward)$/iu],
      "fr-FR": [/^(?:précédent|aval)$/iu],
      "de-DE": [/^(?:zurück|vorwärts)$/iu],
      "es-ES": [/^(?:atrás|adelante)$/iu],
      "da-DK": [/^(?:tilbage|fremad)$/iu],
      "fi-FI": [/^(?:takaisin|eteenpäin)$/iu],
      "nb-NO": [/^(?:tilbake|fremover)$/iu]
    },
    // ProductMenuBar_PageSearch: its first sentence is the search box caption.
    tellMe: {
      "sv-SE": [leading("Berätta vad du vill göra")],
      "en-US": [leading("Tell me what you want to do")],
      "fr-FR": [leading("Dites-moi ce que vous voulez faire")],
      "de-DE": [leading("Was möchten Sie tun?")],
      "es-ES": [leading("Indique qué desea hacer")],
      "da-DK": [leading("Fortæl mig, hvad du vil foretage dig")],
      "fi-FI": [leading("Kerro, mitä haluat tehdä")],
      "nb-NO": [leading("Fortell hva du vil gjøre")]
    },
    // HasMandatoryField, MandatoryIcon_Tooltip, Autofill_AnnouncementSupportedField, plus the
    // Swedish and English wordings observed in older recordings.
    fieldHint: {
      "sv-SE": [/den här gruppen innehåller .* obligatoriska fält/iu,
        /obligatoriska fält.*inte är ifyllda/iu,
        /tryck på alt\s*\+\s*i.*förslag för det här fältet/iu,
        /värdet i det här fältet är obligatoriskt/iu],
      "en-US": [/this group contains .* (?:required|mandatory) fields/iu,
        /press alt\s*\+\s*i.*suggestion for this field/iu,
        /the value (?:in|for) this field is required/iu],
      "fr-FR": contains("Ce groupe contient un ou plusieurs champs obligatoires qui ne sont pas renseignés",
        "La valeur de ce champ est obligatoire",
        "Appuyez sur Alt + I pour générer une suggestion pour ce champ"),
      "de-DE": contains("Diese Gruppe enthält mindestens ein Pflichtfeld, das nicht ausgefüllt wurde",
        "Der Wert für dieses Feld muss angegeben werden",
        "Drücken Sie ALT+I, um einen Vorschlag für dieses Feld zu generieren"),
      "es-ES": contains("Este grupo contiene uno o varios campos obligatorios que no se han rellenado",
        "El valor de este campo es obligatorio",
        "Pulse Alt + I para generar una sugerencia para este campo"),
      "da-DK": contains("Denne gruppe indeholder ét eller flere obligatoriske felter, der ikke er udfyldt",
        "Værdien i dette felt er påkrævet",
        "Tryk på Alt + I for at generere et forslag til dette felt"),
      "fi-FI": contains("Tämä ryhmä sisältää vähintään yhden pakollisen kentän, jota ei ole täytetty",
        "Kentän arvo on pakollinen",
        "Luo ehdotus tälle kentälle painamalla Alt+I"),
      "nb-NO": contains("Denne gruppen inneholder én eller flere obligatoriske felt som ikke er fylt ut",
        "Verdien for dette feltet er obligatorisk",
        "Trykk på Alt + I for å generere et forslag til dette feltet")
    }
  });

  // Status announcements the client only reads to screen readers: saving state, sorting, a list's
  // row count and the number of suggestions while typing. They show nothing new on screen.
  // Resource keys: SavingState_Saving, SavingState_Saved, Sorting_AriaSortText,
  // Table_TotalNumberOfRowsChanged(OneItem), Search_TotalNumberOfRowsChanged(OneItem),
  // FilterAsYouTypeResults_None, FilterAsYouTypeResults_One, FilterAsYouTypeResults_MoreThanOne.
  const ANNOUNCEMENTS = Object.freeze({
    "sv-SE": template("Sparar ...", "Sparad", "{0}, sorterade i {1} order",
      "Lista med rubriken {0} har nu {1} objekt", "Lista med rubriken {0} har nu ett objekt",
      "Listan med rubriken {0} har nu {2} objekt för {1}", "Listan med rubriken {0} har nu ett objekt för {1}",
      "Det finns inga förslag för {0}.", "Det finns ett förslag för {0}.", "{0} förslag finns för {1}."),
    "en-US": template("Saving...", "Saved", "{0}, sorted in {1} order",
      "List with title \"{0}\" now has {1} items", "List with title \"{0}\" now has one item",
      "List with title \"{0}\" now has {2} items for {1}", "List with title \"{0}\" now has one item for {1}",
      "No suggestions available for {0}.", "One suggestion available for {0}.", "{0} suggestions available for {1}."),
    "fr-FR": template("Enregistrement en cours...", "Enregistré", "{0}, trié dans l'ordre {1}",
      "La liste portant le titre « {0} » compte désormais {1} articles",
      "La liste portant le titre « {0} » compte désormais un article",
      "La liste portant le titre « {0} » compte désormais {2} articles pour {1}",
      "La liste portant le titre « {0} » compte désormais un article pour {1}",
      "Aucune suggestion disponible pour {0}.", "Une suggestion disponible pour {0}.",
      "{0} suggestions disponibles pour {1}."),
    "de-DE": template("Wird gespeichert ...", "Gespeichert", "{0}, Sortierreihenfolge {1}",
      "Liste mit Titel „{0}“ hat jetzt {1} Artikel", "Liste mit Titel „{0}“ hat jetzt einen Artikel",
      "Liste mit Titel \"{0}\" weist jetzt {2} Artikel für {1} auf",
      "Liste mit Titel „{0}“ weist jetzt einen Artikel für {1} auf",
      "Für {0} sind keine Vorschläge verfügbar.", "Für {0} sind ist ein Vorschlag verfügbar.",
      "{0} Vorschläge sind für {1} verfügbar."),
    "es-ES": template("Guardando...", "Guardado", "{0}, ordenados en el pedido {1}",
      "La lista con el título \"{0}\" tiene ahora {1} elementos",
      "La lista con el título \"{0}\" tiene ahora un elemento",
      "La lista con el título \"{0}\" tiene ahora {2} elementos para {1}",
      "La lista con el título \"{0}\" tiene ahora un elemento para {1}",
      "No hay sugerencias disponibles para {0}.", "Hay una sugerencia disponible para {0}.",
      "{0} sugerencias disponibles para {1}."),
    "da-DK": template("Gemmer...", "Gemt", "{0}, sorteret i rækkefølgen {1}",
      "Listen med titlen \"{0}\" indeholder nu {1} elementer",
      "Listen med titlen \"{0}\" indeholder nu ét element",
      "Listen med titlen \"{0}\" indeholder nu {2} elementer for {1}",
      "Listen med titlen \"{0}\" indeholder nu ét element for {1}",
      "Ingen forslag til {0}.", "Ét forslag til {0}.", "{0} forslag til {1}."),
    "fi-FI": template("Tallennetaan...", "Tallennettu", "{0}, järjestettynä {1} mukaan",
      "Luettelossa {0} on nyt {1} kohdetta", "Luettelossa {0} on nyt yksi kohde",
      "Luettelossa {0} on nyt {2} nimikettä kohteessa {1}", "Luettelossa {0} on nyt yksi nimike kohteelle {1}",
      "Ei ehdotuksia kohteelle {0}.", "Yksi ehdotus kohteelle {0}.", "{0} ehdotusta kohteelle {1}."),
    "nb-NO": template("Lagrer …", "Lagret", "{0}, sortert i {1} rekkefølge",
      "Listen med tittelen {0} har nå {1} elementer", "Listen med tittelen {0} har nå ett element",
      "Listen med tittelen {0} har nå {2} elementer for {1}", "Listen med tittelen {0} har nå ett element for {1}",
      "Ingen forslag tilgjengelig for {0}.", "Ett forslag tilgjengelig for {0}.",
      "{0} forslag tilgjengelig for {1}.")
  });

  function isAnnouncement(text) {
    const value = String(text || "").trim();
    return Boolean(value) && Object.values(ANNOUNCEMENTS).some(patterns => patterns.some(pattern => pattern.test(value)));
  }

  function matches(category, caption) {
    const text = String(caption || "").trim();
    return Boolean(text) && Object.values(CAPTIONS[category] || {})
      .some(patterns => patterns.some(pattern => pattern.test(text)));
  }

  // Category and language pairs without captions.
  function gaps(locales = []) {
    return Object.entries(CAPTIONS).flatMap(([category, byLocale]) =>
      locales.filter(locale => !byLocale[locale]).map(locale => ({ category, locale })));
  }

  return { ANNOUNCEMENTS, CAPTIONS, gaps, isAnnouncement, matches };
});
