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

  return { CAPTIONS, gaps, matches };
});
