(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document") : root.T9DocumentModel;
  const languages = typeof module === "object" && module.exports
    ? require("../engine/language-registry") : root.T9LanguageRegistry;
  const api = factory(semantic, languages);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentLanguage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (semantic, languages) {
  const VERSION = "1.0.0";
  const DEFAULT_LANGUAGE = languages.DEFAULT_LANGUAGE;
  const SUPPORTED_LANGUAGES = Object.freeze(languages.supported("document")
    .map(language => language.locale));
  const SYSTEM_TEXT = Object.freeze({
    "en-US": Object.freeze({
      "Syfte": "Purpose",
      "Förutsättningar": "Prerequisites",
      "Arbetsgång": "Workflow",
      "Förväntat resultat": "Expected result",
      "Versionshistorik": "Revision history",
      "Beskriver hur processen genomförs i Business Central.":
        "Describes how the process is performed in Business Central.",
      "Användaren har behörighet till berörda sidor och åtgärder.":
        "The user has access to the relevant pages and actions.",
      "Nödvändiga grunddata och inställningar finns upplagda.":
        "The required master data and settings are available.",
      "Instruktionerna följer de benämningar som visades i Business Central.":
        "The instructions use the labels shown in Business Central.",
      "Stegen beskriver det observerade arbetsflödet. Kontrollera dokumentets status och bekräfta om processen kräver bokföring i Business Central.":
        "The recorded steps describe the observed workflow. Check the document status and confirm whether the process requires posting in Business Central.",
      "Ej angiven": "Not specified",
      "Pågående": "In progress",
      "Slutförd": "Completed",
      "Kommentar": "Comment",
      "Observerat resultat": "Observed result",
      "Observerat fel": "Observed error",
      "Processkärmbild": "Process screenshot",
      "Utför uppgiften.": "Complete the task."
    })
  });
  const DEFAULT_EXPECTED_RESULT =
    "Stegen beskriver det observerade arbetsflödet. Kontrollera dokumentets " +
    "status och bekräfta om processen kräver bokföring i Business Central.";
  const DEFAULT_EXPECTED_RESULT_BY_LANGUAGE = Object.freeze({
    "sv-SE": DEFAULT_EXPECTED_RESULT,
    "en-US": "The steps describe the workflow observed in the recording. Check the document status and confirm whether the process requires posting in Business Central.",
    "fr-FR": "Les étapes décrivent le flux observé dans l’enregistrement. Vérifiez le statut du document et confirmez si le processus nécessite une validation dans Business Central.",
    "de-DE": "Die Schritte beschreiben den beobachteten Ablauf. Prüfen Sie den Belegstatus und bestätigen Sie, ob der Prozess eine Buchung in Business Central erfordert.",
    "es-ES": "Los pasos describen el flujo de trabajo observado. Compruebe el estado del documento y confirme si el proceso requiere contabilización en Business Central.",
    "da-DK": "Trinnene beskriver det observerede forløb. Kontrollér dokumentets status, og bekræft, om processen kræver bogføring i Business Central.",
    "fi-FI": "Vaiheet kuvaavat tallenteessa havaittua työnkulkua. Tarkista asiakirjan tila ja varmista, edellyttääkö prosessi kirjaamista Business Centralissa.",
    "nb-NO": "Trinnene beskriver arbeidsflyten som ble observert. Kontroller dokumentstatusen og bekreft om prosessen krever bokføring i Business Central."
  });

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return languages.normalize(value, "document");
  }

  function systemText(value, language) {
    const text = String(value ?? "");
    const locale = normalize(language);
    if (text === DEFAULT_EXPECTED_RESULT) {
      return DEFAULT_EXPECTED_RESULT_BY_LANGUAGE[locale];
    }
    if (locale === "sv-SE") return text;
    const english = SYSTEM_TEXT["en-US"][text];
    return english ? languages.translate(english, locale) : text;
  }

  function translateInstruction(value, language) {
    const source = String(value ?? "");
    const locale = normalize(language);
    if (locale === "sv-SE") return source;
    if (source === "Inspelningen visar inte vad som hände efter den här åtgärden.") {
      const messages = {
        "en-US": "The recording does not show what happened after this action.",
        "fr-FR": "L’enregistrement ne montre pas ce qui s’est passé après cette action.",
        "de-DE": "Die Aufzeichnung zeigt nicht, was nach dieser Aktion geschah.",
        "es-ES": "La grabación no muestra qué ocurrió después de esta acción.",
        "da-DK": "Optagelsen viser ikke, hvad der skete efter denne handling.",
        "fi-FI": "Tallenne ei näytä, mitä tämän toiminnon jälkeen tapahtui.",
        "nb-NO": "Opptaket viser ikke hva som skjedde etter denne handlingen."
      };
      if (messages[locale]) return messages[locale];
    }
    const toggleInstruction = source.match(/^Du (aktiverade|inaktiverade) ([\s\S]+)\.$/u);
    if (toggleInstruction) {
      const [, action, caption] = toggleInstruction;
      const enabled = action === "aktiverade";
      const templates = {
        "en-US": () => `You ${enabled ? "enabled" : "disabled"} ${caption}.`,
        "fr-FR": () => `Vous avez ${enabled ? "activé" : "désactivé"} ${caption}.`,
        "de-DE": () => `Sie haben ${caption} ${enabled ? "aktiviert" : "deaktiviert"}.`,
        "es-ES": () => `Ha ${enabled ? "activado" : "desactivado"} ${caption}.`,
        "da-DK": () => `Du ${enabled ? "aktiverede" : "deaktiverede"} ${caption}.`,
        "fi-FI": () => `Kytkit kohteen ${caption} ${enabled ? "käyttöön" : "pois käytöstä"}.`,
        "nb-NO": () => `Du ${enabled ? "aktiverte" : "deaktiverte"} ${caption}.`
      };
      if (templates[locale]) return templates[locale]();
    }
    const optionState = source.match(/^Alternativet är nu (aktiverat|inaktiverat)\.$/u);
    if (optionState) {
      const enabled = optionState[1] === "aktiverat";
      const templates = {
        "en-US": () => `The option is now ${enabled ? "enabled" : "disabled"}.`,
        "fr-FR": () => `L’option est maintenant ${enabled ? "activée" : "désactivée"}.`,
        "de-DE": () => `Die Option ist jetzt ${enabled ? "aktiviert" : "deaktiviert"}.`,
        "es-ES": () => `La opción está ${enabled ? "activada" : "desactivada"}.`,
        "da-DK": () => `Indstillingen er nu ${enabled ? "aktiveret" : "deaktiveret"}.`,
        "fi-FI": () => `Asetus on nyt ${enabled ? "käytössä" : "pois käytöstä"}.`,
        "nb-NO": () => `Alternativet er nå ${enabled ? "aktivert" : "deaktivert"}.`
      };
      if (templates[locale]) return templates[locale]();
    }
    const unnamedToggle = source.match(/^Ett alternativ slogs (på|av)\.$/u);
    if (unnamedToggle) {
      const enabled = unnamedToggle[1] === "på";
      const templates = {
        "en-US": () => `An option was turned ${enabled ? "on" : "off"}.`,
        "fr-FR": () => `Une option a été ${enabled ? "activée" : "désactivée"}.`,
        "de-DE": () => `Eine Option wurde ${enabled ? "eingeschaltet" : "ausgeschaltet"}.`,
        "es-ES": () => `Se ${enabled ? "activó" : "desactivó"} una opción.`,
        "da-DK": () => `En indstilling blev slået ${enabled ? "til" : "fra"}.`,
        "fi-FI": () => `Valinta ${enabled ? "otettiin käyttöön" : "poistettiin käytöstä"}.`,
        "nb-NO": () => `Et alternativ ble slått ${enabled ? "på" : "av"}.`
      };
      if (templates[locale]) return templates[locale]();
    }

    // Record selections name the record type in the document language; the value is kept.
    const recordSelection = source.match(
      /^Välj (kund|artikel|leverantör|lagerställe|dimensionsvärde) ([\s\S]+)\.$/u);
    if (recordSelection) {
      const nouns = {
        "en-US": { kund: "the customer", artikel: "the item", leverantör: "the vendor",
          lagerställe: "the location", dimensionsvärde: "the dimension value" },
        "fr-FR": { kund: "le client", artikel: "l’article", leverantör: "le fournisseur",
          lagerställe: "le magasin", dimensionsvärde: "la valeur de dimension" },
        "de-DE": { kund: "den Debitor", artikel: "den Artikel", leverantör: "den Kreditor",
          lagerställe: "den Lagerort", dimensionsvärde: "den Dimensionswert" },
        "es-ES": { kund: "el cliente", artikel: "el producto", leverantör: "el proveedor",
          lagerställe: "el almacén", dimensionsvärde: "el valor de dimensión" },
        "da-DK": { kund: "debitoren", artikel: "varen", leverantör: "kreditoren",
          lagerställe: "lokationen", dimensionsvärde: "dimensionsværdien" },
        "fi-FI": { kund: "asiakas", artikel: "nimike", leverantör: "toimittaja",
          lagerställe: "sijainti", dimensionsvärde: "dimension arvo" },
        "nb-NO": { kund: "kunden", artikel: "varen", leverantör: "leverandøren",
          lagerställe: "lokasjonen", dimensionsvärde: "dimensjonsverdien" }
      };
      const verbs = { "en-US": "Choose", "fr-FR": "Choisissez", "de-DE": "Wählen Sie",
        "es-ES": "Seleccione", "da-DK": "Vælg", "fi-FI": "Valitse", "nb-NO": "Velg" };
      const [, noun, value] = recordSelection;
      if (nouns[locale]) return `${verbs[locale]} ${nouns[locale][noun]} ${value}.`;
    }

    const eventOutcomePatterns = [
      [/^Sidan ([\s\S]+?) visas nu\.$/u, {
        "en-US": value => `The ${value} page is now displayed.`,
        "fr-FR": value => `La page ${value} s’affiche maintenant.`,
        "de-DE": value => `Die Seite ${value} wird jetzt angezeigt.`,
        "es-ES": value => `Ahora se muestra la página ${value}.`,
        "da-DK": value => `Siden ${value} vises nu.`,
        "fi-FI": value => `Sivu ${value} näkyy nyt.`,
        "nb-NO": value => `Siden ${value} vises nå.`
      }],
      [/^Dialogrutan ([\s\S]+?) visas nu\.$/u, {
        "en-US": value => `The ${value} dialog is now open.`,
        "fr-FR": value => `La boîte de dialogue ${value} est maintenant ouverte.`,
        "de-DE": value => `Der Dialog ${value} ist jetzt geöffnet.`,
        "es-ES": value => `El cuadro de diálogo ${value} está abierto.`,
        "da-DK": value => `Dialogboksen ${value} er nu åben.`,
        "fi-FI": value => `Valintaikkuna ${value} on nyt auki.`,
        "nb-NO": value => `Dialogboksen ${value} er nå åpen.`
      }],
      [/^Värdet i ([\s\S]+?) ändrades\.$/u, {
        "en-US": value => `The value in ${value} changed.`,
        "fr-FR": value => `La valeur du champ ${value} a changé.`,
        "de-DE": value => `Der Wert in ${value} wurde geändert.`,
        "es-ES": value => `El valor de ${value} ha cambiado.`,
        "da-DK": value => `Værdien i ${value} blev ændret.`,
        "fi-FI": value => `Kentän ${value} arvo muuttui.`,
        "nb-NO": value => `Verdien i ${value} ble endret.`
      }],
      [/^Valet i ([\s\S]+?) ändrades\.$/u, {
        "en-US": value => `The selection in ${value} changed.`,
        "fr-FR": value => `La sélection dans ${value} a changé.`,
        "de-DE": value => `Die Auswahl in ${value} wurde geändert.`,
        "es-ES": value => `Cambió la selección de ${value}.`,
        "da-DK": value => `Valget i ${value} blev ændret.`,
        "fi-FI": value => `Kentän ${value} valinta muuttui.`,
        "nb-NO": value => `Valget i ${value} ble endret.`
      }],
      [/^Ett fältvärde ändrades\.$/u, {
        "en-US": () => "A field value changed.",
        "fr-FR": () => "La valeur d’un champ a changé.",
        "de-DE": () => "Der Wert eines Feldes wurde geändert.",
        "es-ES": () => "Cambió el valor de un campo.",
        "da-DK": () => "Værdien i et felt blev ændret.",
        "fi-FI": () => "Kentän arvo muuttui.",
        "nb-NO": () => "Verdien i et felt ble endret."
      }],
      [/^Ett val ändrades\.$/u, {
        "en-US": () => "A selection was made.",
        "fr-FR": () => "Une sélection a été effectuée.",
        "de-DE": () => "Es wurde eine Auswahl getroffen.",
        "es-ES": () => "Se realizó una selección.",
        "da-DK": () => "Der blev foretaget et valg.",
        "fi-FI": () => "Valinta tehtiin.",
        "nb-NO": () => "Et valg ble gjort."
      }],
      [/^Business Central visade ett meddelande\.$/u, {
        "en-US": () => "Business Central displayed a message.",
        "fr-FR": () => "Business Central a affiché un message.",
        "de-DE": () => "Business Central hat eine Meldung angezeigt.",
        "es-ES": () => "Business Central mostró un mensaje.",
        "da-DK": () => "Business Central viste en meddelelse.",
        "fi-FI": () => "Business Central näytti ilmoituksen.",
        "nb-NO": () => "Business Central viste en melding."
      }]
    ];
    for (const [pattern, templates] of eventOutcomePatterns) {
      const match = source.match(pattern);
      if (match && templates[locale]) return templates[locale](match[1]);
    }
    const observedConfirmation = source.match(
      /^Business Central bekräftade(?::| att) “([\s\S]+?)”\.(?: (?:Referens: “([\s\S]+)”|Referensen är ([\s\S]+))\.)?$/u
    );
    if (observedConfirmation) {
      const [message, quotedReference, plainReference] = observedConfirmation.slice(1);
      const reference = plainReference || quotedReference;
      const templates = {
        "en-US": () => `Business Central confirmed that “${message}”.${reference ? ` Reference: ${reference}.` : ""}`,
        "fr-FR": () => `Business Central a confirmé que « ${message} ».${reference ? ` Référence : ${reference}.` : ""}`,
        "de-DE": () => `Business Central hat bestätigt, dass „${message}“.${reference ? ` Referenz: ${reference}.` : ""}`,
        "es-ES": () => `Business Central confirmó que «${message}».${reference ? ` Referencia: ${reference}.` : ""}`,
        "da-DK": () => `Business Central bekræftede, at “${message}”.${reference ? ` Reference: ${reference}.` : ""}`,
        "fi-FI": () => `Business Central vahvisti, että ”${message}”.${reference ? ` Viite: ${reference}.` : ""}`,
        "nb-NO": () => `Business Central bekreftet at «${message}».${reference ? ` Referanse: ${reference}.` : ""}`
      };
      if (templates[locale]) return templates[locale]();
    }
    // Records, lists and search results: the generic rules below would keep the Swedish noun.
    const recordChoice = source.match(/^Välj posten ([\s\S]+?)(?: på sidan ([\s\S]+?))?\.$/u);
    if (recordChoice) {
      const [, record, page] = recordChoice;
      const templates = {
        "en-US": () => `Choose the record ${record}${page ? ` on the ${page} page` : ""}.`,
        "fr-FR": () => `Sélectionnez l’enregistrement ${record}${page ? ` sur la page ${page}` : ""}.`,
        "de-DE": () => `Wählen Sie den Datensatz ${record}${page ? ` auf der Seite ${page}` : ""} aus.`,
        "es-ES": () => `Selecciona el registro ${record}${page ? ` en la página ${page}` : ""}.`,
        "da-DK": () => `Vælg posten ${record}${page ? ` på siden ${page}` : ""}.`,
        "fi-FI": () => `Valitse tietue ${record}${page ? ` sivulla ${page}` : ""}.`,
        "nb-NO": () => `Velg posten ${record}${page ? ` på siden ${page}` : ""}.`
      };
      if (templates[locale]) return templates[locale]();
    }
    const openList = source.match(/^Öppna listan ([\s\S]+?)\.$/u);
    if (openList) {
      const list = openList[1];
      const templates = {
        "en-US": `Open the ${list} list.`, "fr-FR": `Ouvrez la liste ${list}.`,
        "de-DE": `Öffnen Sie die Liste ${list}.`, "es-ES": `Abre la lista ${list}.`,
        "da-DK": `Åbn listen ${list}.`, "fi-FI": `Avaa luettelo ${list}.`,
        "nb-NO": `Åpne listen ${list}.`
      };
      if (templates[locale]) return templates[locale];
    }
    const searchAndOpen = source.match(/^Sök efter ([\s\S]+?) och öppna (listan )?([\s\S]+?)\.$/u);
    if (searchAndOpen) {
      const [, query, isList, result] = searchAndOpen;
      const templates = {
        "en-US": `Search for ${query} and open ${isList ? `the ${result} list` : result}.`,
        "fr-FR": `Recherchez ${query} et ouvrez ${isList ? "la liste " : ""}${result}.`,
        "de-DE": `Suchen Sie nach ${query} und öffnen Sie ${isList ? "die Liste " : ""}${result}.`,
        "es-ES": `Busca ${query} y abre ${isList ? "la lista " : ""}${result}.`,
        "da-DK": `Søg efter ${query} og åbn ${isList ? "listen " : ""}${result}.`,
        "fi-FI": `Hae ${query} ja avaa ${isList ? "luettelo " : ""}${result}.`,
        "nb-NO": `Søk etter ${query} og åpne ${isList ? "listen " : ""}${result}.`
      };
      if (templates[locale]) return templates[locale];
    }
    const filteredSearch = source.match(
      /^Sök efter ([\s\S]+?) i ([\s\S]+?) och välj den filtrerade posten\.$/u);
    if (filteredSearch) {
      const [, query, field] = filteredSearch;
      const templates = {
        "en-US": `Search for ${query} in ${field} and select the matching record.`,
        "fr-FR": `Recherchez ${query} dans ${field} puis sélectionnez l’enregistrement correspondant.`,
        "de-DE": `Suchen Sie nach ${query} in ${field} und wählen Sie den passenden Datensatz aus.`,
        "es-ES": `Busca ${query} en ${field} y selecciona el registro coincidente.`,
        "da-DK": `Søg efter ${query} i ${field} og vælg den matchende post.`,
        "fi-FI": `Etsi ${query} kentästä ${field} ja valitse vastaava tietue.`,
        "nb-NO": `Søk etter ${query} i ${field} og velg den samsvarende posten.`
      };
      if (templates[locale]) return templates[locale];
    }
    const actionOnPage = source.match(/^Välj ([\s\S]+?) på sidan ([\s\S]+?)\.$/u);
    if (actionOnPage) {
      const templates = {
        "en-US": (action, page) => `Choose ${action} on the ${page} page.`,
        "fr-FR": (action, page) => `Sélectionnez ${action} sur la page ${page}.`,
        "de-DE": (action, page) => `Wählen Sie ${action} auf der Seite ${page} aus.`,
        "es-ES": (action, page) => `Selecciona ${action} en la página ${page}.`,
        "da-DK": (action, page) => `Vælg ${action} på siden ${page}.`,
        "fi-FI": (action, page) => `Valitse ${action} sivulla ${page}.`,
        "nb-NO": (action, page) => `Velg ${action} på siden ${page}.`
      };
      if (templates[locale]) return templates[locale](actionOnPage[1], actionOnPage[2]);
    }
    const confirmation = source.match(/^(Ange [\s\S]+\.) (Välj \*\*OK\*\*\.)$/u);
    if (confirmation) return translateInstruction(confirmation[1], language) + ' ' +
      translateInstruction(confirmation[2], language);
    const exact = systemText(source, language);
    if (exact !== source) return exact;
    const rules = [
      [/^Välj ([\s\S]+?), ange ([\s\S]+?) i ([\s\S]+?) och välj ([\s\S]+?)\.$/u,
        "Choose $1, enter $2 in $3, and choose $4."],
      [/^Välj ([\s\S]+?) → ([\s\S]+?) → ([\s\S]+?)\.$/u,
        "Choose $1 → $2 → $3."],
      [/^Välj ([\s\S]+?) i ([\s\S]+?)\.$/u, "Choose $1 in $2."],
      [/^Välj ([\s\S]+?)\.$/u, "Choose $1."],
      [/^Ange ([\s\S]+?) i ([\s\S]+?)\.$/u, "Enter $1 in $2."],
      [/^Ange ([\s\S]+?)\.$/u, "Enter $1."],
      [/^Öppna sidan ([\s\S]+?)\.$/u, "Open page $1."],
      [/^Öppna ([\s\S]+?)\.$/u, "Open $1."],
      [/^Aktivera ([\s\S]+?)\.$/u, "Enable $1."],
      [/^Inaktivera ([\s\S]+?)\.$/u, "Disable $1."],
      [/^Verifiera att ([\s\S]+?)\.$/u, "Verify that $1."],
      [/^Sidan ([\s\S]+?) öppnades\.$/u, "Page $1 opened."],
      [/^En ny sida öppnades\.$/u, "A new page opened."],
      [/^Dialogrutan ([\s\S]+?) öppnades\.$/u, "Dialog $1 opened."],
      [/^En dialogruta öppnades\.$/u, "A dialog opened."],
      [/^Dialogrutan stängdes\.$/u, "The dialog closed."],
      [/^([\s\S]+?) uppdaterades\.$/u, "$1 was updated."],
      [/^Ett val registrerades i ([\s\S]+?)\.$/u,
        "A selection was registered in $1."],
      [/^Ett val registrerades\.$/u, "A selection was registered."],
      [/^Alternativet aktiverades\.$/u, "The option was enabled."],
      [/^Alternativet inaktiverades\.$/u, "The option was disabled."],
      [/^([\s\S]+?) aktiverades\.$/u, "$1 was enabled."],
      [/^([\s\S]+?) inaktiverades\.$/u, "$1 was disabled."],
      [/^Business Central visade ett statusmeddelande\.$/u,
        "Business Central displayed a status message."],
      [/^Business Central visade ett fel\.$/u,
        "Business Central displayed an error."],
      [/^Sektion (\d+)$/u, "Section $1"]
    ];
    for (const [pattern, replacement] of rules) {
      if (pattern.test(source)) return source.replace(pattern, languages.translate(replacement, language));
    }
    return source;
  }

  function transformBlock(block, language) {
    const result = clone(block);
    const protectedText = result.preserveUserText ||
      ["manual", "user-edited"].includes(result.provenance);
    if (!protectedText) {
      for (const property of ["text", "title", "label", "caption"]) {
        if (typeof result[property] !== "string") continue;
        const translated = localizedInstruction(result[property], language);
        if (translated !== result[property]) {
          result[property] = translated;
          if (property === "text") delete result.presentationRuns;
        }
      }
    }
    if (Array.isArray(result.blocks)) {
      result.blocks = result.blocks.map(child => transformBlock(child, language));
    }
    if (Array.isArray(result.items)) {
      result.items = result.items.map(item => ({ ...item,
        blocks: (item.blocks || []).map(child => transformBlock(child, language)) }));
    }
    return result;
  }

  function process(documentValue, requestedLanguage) {
    const normalized = semantic.normalize(documentValue);
    const language = normalize(requestedLanguage ||
      normalized.metadata?.documentLanguage);
    const metadata = clone(normalized.metadata);
    metadata.documentLanguage = language;
    for (const property of ["purpose", "expectedResult", "statusLabel", "reviewer",
      "environment"]) {
      if (typeof metadata[property] === "string") {
        metadata[property] = systemText(metadata[property], language);
      }
    }
    return semantic.normalize({ ...clone(normalized), metadata,
      sections: normalized.sections.map(section => ({ ...clone(section),
        title: systemText(section.title, language),
        blocks: section.blocks.map(block => transformBlock(block, language)) })),
      provenance: { ...clone(normalized.provenance),
        transformations: [...new Set([...(normalized.provenance?.transformations || []),
          "document-language"])], documentLanguageVersion: VERSION } });
  }

  // Sensitive values are stored with the language-neutral capture marker "[maskerat]".
  const MASKED_VALUE = Object.freeze({ "sv-SE": "[maskerat]", "en-US": "[masked]",
    "fr-FR": "[masqué]", "de-DE": "[maskiert]", "es-ES": "[enmascarado]",
    "da-DK": "[maskeret]", "fi-FI": "[peitetty]", "nb-NO": "[maskert]" });
  function localizedInstruction(value, language) {
    const translated = translateInstruction(value, language);
    const marker = MASKED_VALUE[normalize(language)] || MASKED_VALUE["en-US"];
    return translated.replaceAll("[maskerat]", marker);
  }

  return { VERSION, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, normalize,
    systemText, translateInstruction: localizedInstruction, process };
});
