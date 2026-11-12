(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const api = factory(semantic);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9PresentationGrammar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (semantic) {
  const GRAMMAR_VERSION = "1.3.0";
  const cache = new WeakMap();
  const DOCUMENT_LANGUAGES = new Set([
    "sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"
  ]);

  // Same result as a JSON round trip, without re-serializing strings (engine/json-clone.js).
  const jsonClone = typeof module === "object" && module.exports
    ? require("../engine/json-clone") : globalThis.T9JsonClone;

  function clone(value) {
    return jsonClone.clone(value);
  }

  function run(text, role = "text") {
    return {
      text: String(text ?? ""),
      role,
      ...(role === "value" ? { bold: true } : {}),
      ...(["shortcut", "identifier"].includes(role) ? { monospace: true } : {})
    };
  }

  function quoted(value) {
    return { ...run(String(value ?? "").replace(/^['"“]|['"”]$/gu, ""),
      "interface"), italic: true };
  }

  function sentence(...runs) {
    const filtered = runs.flat().filter(value => value?.text !== "");
    return { text: filtered.map(value => value.text).join(""), runs: filtered };
  }

  function legacyRuns(value) {
    const source = String(value ?? "");
    const result = [];
    const pattern = /(__([\s\S]+?)__|\*\*([\s\S]+?)\*\*|`([^`]+?)`|["“]([^"”]+?)["”])/g;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(source))) {
      if (match.index > cursor) result.push(run(source.slice(cursor, match.index)));
      if (match[2] !== undefined) result.push(run(match[2], "value"));
      else if (match[3] !== undefined) result.push(quoted(match[3]));
      else if (match[4] !== undefined) result.push(run(match[4], technicalRole(match[4])));
      else result.push(quoted(match[5]));
      cursor = match.index + match[0].length;
    }
    if (cursor < source.length || !result.length) result.push(run(source.slice(cursor)));
    return result.filter(value => value.text !== "");
  }

  function technicalRole(value) {
    return /^(?:ctrl|cmd|alt|shift|enter|esc|escape|tab|delete|backspace|f\d+)(?:\b|\+)/iu
      .test(String(value)) ? "shortcut" : "identifier";
  }

  function cleanLookupFieldCaption(value) {
    return String(value ?? "").trim().replace(
      /^(?:choose|select)(?:\s+(?:a|an))?\s+value\s+for\s+|^välj(?:\s+ett)?\s+värde\s+för\s+|^(?:choisissez|choisir|sélectionnez|sélectionner)\s+(?:une?\s+)?valeur\s+pour\s+|^wählen\s+sie\s+(?:einen?\s+)?wert\s+für\s+|^(?:seleccione|seleccionar|elija)\s+(?:un\s+)?valor\s+para\s+|^vælg\s+(?:en\s+)?værdi\s+for\s+|^valitse\s+arvo\s+(?:kohteelle|kentälle|kenttään)\s+|^velg\s+(?:en\s+)?verdi\s+for\s+/iu,
      "").trim();
  }

  function presentationFor(action, fallbackText, documentLanguage = "sv-SE") {
    const locale = DOCUMENT_LANGUAGES.has(documentLanguage)
      ? documentLanguage : "sv-SE";
    const words = {
      "sv-SE": { choose: "Välj ", enter: "Ange ", in: " i ", andChoose: " och välj ",
        searchText: "söktext", enable: "Aktivera ", disable: "Inaktivera ",
        forField: " som värde för " },
      "en-US": { choose: "Choose ", enter: "Enter ", in: " in ", andChoose: ", and choose ",
        searchText: "search text", enable: "Enable ", disable: "Disable ",
        forField: " for " },
      "fr-FR": { choose: "Sélectionnez ", enter: "Saisissez ", in: " dans ", andChoose: " et sélectionnez ",
        searchText: "terme de recherche", enable: "Activez ", disable: "Désactivez ",
        forField: " comme valeur pour " },
      "de-DE": { choose: "Wählen Sie ", enter: "Geben Sie ", in: " in ", andChoose: " und wählen Sie ",
        searchText: "Suchtext", enable: "Aktivieren Sie ", disable: "Deaktivieren Sie ",
        forField: " als Wert für " },
      "es-ES": { choose: "Seleccione ", enter: "Introduzca ", in: " en ", andChoose: " y seleccione ",
        searchText: "texto de búsqueda", enable: "Active ", disable: "Desactive ",
        forField: " como valor para " },
      "da-DK": { choose: "Vælg ", enter: "Angiv ", in: " i ", andChoose: " og vælg ",
        searchText: "søgetekst", enable: "Aktivér ", disable: "Deaktivér ",
        forField: " som værdi for " },
      "fi-FI": { choose: "Valitse ", enter: "Syötä ", in: " kenttään ", andChoose: " ja valitse ",
        searchText: "hakuteksti", enable: "Ota käyttöön ", disable: "Poista käytöstä ",
        forField: " kentän arvoksi " },
      "nb-NO": { choose: "Velg ", enter: "Angi ", in: " i ", andChoose: " og velg ",
        searchText: "søketekst", enable: "Aktiver ", disable: "Deaktiver ",
        forField: " som verdi for " }
    }[locale];
    const actionType = action?.actionType || action?.taskType;
    const value = String(action?.selectedValue ?? action?.instructionValue ??
      action?.value ?? "").trim();
    // The field is named as Business Central showed it. A column is announced by its sort button
    // ("Sortera efter Nr"); the column's own name is what the reader sees.
    const shownField = caption => String(caption ?? "").trim()
      .replace(/^(?:sortera efter|sort by|trier par|sortieren nach|ordenar por|sort[eé]r? efter|sorter etter)\s+/iu, "")
      .replace(/^lajittele\s+(.+?)(?::n)?\s+mukaan$/iu, "$1").trim();
    const field = shownField(cleanLookupFieldCaption(
      action?.targetField ?? action?.fieldCaption ?? ""));
    const german = locale === "de-DE";
    // Ends a sentence after a caption: German closes with its verb prefix, and a caption that
    // ends with its own period ("Nr.") ends the sentence.
    const afterCaption = (caption, prefix) => run(german && prefix ? ` ${prefix}.`
      : /\.$/u.test(String(caption)) ? "" : ".");
    // Text typed to find a record, then the record chosen.
    const enterAndChoose = (typed, caption) => sentence(run(words.enter, "action"),
      run(typed, "value"), run(words.in), quoted(caption),
      run(german ? " ein und wählen Sie " : words.andChoose), quoted(value),
      run(german ? " aus." : "."));
    if (actionType === "SearchAndSelectRecord" && value) {
      // The record is entered in the field; text typed to find it, such as a word of the item's
      // description, is said with the record chosen.
      const typed = String(action?.typedValue || "").trim();
      const searchField = shownField(action?.searchFieldCaption || field) || {
        "sv-SE": "nummerfältet", "en-US": "the number field",
        "fr-FR": "le champ du numéro", "de-DE": "das Nummernfeld",
        "es-ES": "el campo de número", "da-DK": "nummerfeltet",
        "fi-FI": "numero", "nb-NO": "nummerfeltet"
      }[locale];
      return typed
        ? enterAndChoose(typed, searchField)
        : sentence(run(words.enter, "action"), run(value, "value"), run(words.in),
          quoted(searchField), afterCaption(searchField, "ein"));
    }
    // The label of the item selection rule when no field caption was captured.
    const itemNumberLabels = {
      "sv-SE": "Artikelnr.", "en-US": "Item No.", "fr-FR": "N° d’article",
      "de-DE": "Artikelnr.", "es-ES": "N.º de artículo", "da-DK": "Varenr.",
      "fi-FI": "Nimikenro", "nb-NO": "Varenr."
    };
    const selectLabels = {
      SelectCustomer: { "sv-SE": "Kund", "en-US": "Customer", "fr-FR": "Client",
        "de-DE": "Debitor", "es-ES": "Cliente", "da-DK": "Kunde",
        "fi-FI": "Asiakas", "nb-NO": "Kunde" }[locale],
      SelectItem: itemNumberLabels[locale],
      SelectVendor: { "sv-SE": "Leverantör", "en-US": "Vendor", "fr-FR": "Fournisseur",
        "de-DE": "Kreditor", "es-ES": "Proveedor", "da-DK": "Leverandør",
        "fi-FI": "Toimittaja", "nb-NO": "Leverandør" }[locale],
      SelectLocation: { "sv-SE": "Lagerställe", "en-US": "Location", "fr-FR": "Emplacement",
        "de-DE": "Lagerort", "es-ES": "Ubicación", "da-DK": "Lokation",
        "fi-FI": "Sijainti", "nb-NO": "Lokasjon" }[locale],
      SelectDimension: { "sv-SE": "Dimension", "en-US": "Dimension", "fr-FR": "Dimension",
        "de-DE": "Dimension", "es-ES": "Dimensión", "da-DK": "Dimension",
        "fi-FI": "Dimensio", "nb-NO": "Dimensjon" }[locale]
    };
    // A search already described by what was searched for and what was opened keeps that text.
    if (actionType === "SearchAndOpenPage" &&
        /^Sök efter /u.test(String(action?.displayText || ""))) {
      return sentence(legacyRuns(fallbackText));
    }
    if (actionType === "SearchAndOpenPage") {
      const search = String(action?.searchCaption || {
        "sv-SE": "Sök", "en-US": "Search", "fr-FR": "Rechercher",
        "de-DE": "Suchen", "es-ES": "Buscar", "da-DK": "Søg",
        "fi-FI": "Hae", "nb-NO": "Søk"
      }[locale]).trim();
      // The search box's caption in the client's own words (bc-client-captions, tellMe); its
      // closing punctuation would end the sentence in the middle.
      const searchField = String(action?.searchFieldCaption || field || {
        "sv-SE": "Berätta vad du vill göra", "en-US": "Tell me what you want to do",
        "fr-FR": "Dites-moi ce que vous voulez faire", "de-DE": "Was möchten Sie tun",
        "es-ES": "Indique qué desea hacer", "da-DK": "Fortæl mig, hvad du vil foretage dig",
        "fi-FI": "Kerro, mitä haluat tehdä", "nb-NO": "Fortell hva du vil gjøre"
      }[locale]).trim().replace(/[.?]$/u, "");
      const result = String(action?.resultCaption || action?.selectedCaption ||
        action?.pageCaption || "").trim();
      if (result) {
        const query = value ? run(value, "value") : run(words.searchText);
        return german
          ? sentence(run(words.choose, "action"), quoted(search), run(" aus, geben Sie "), query,
            run(words.in), quoted(searchField), run(" ein und wählen Sie "), quoted(result),
            run(" aus."))
          : sentence(run(words.choose, "action"), quoted(search),
            run(`, ${words.enter.trim().toLocaleLowerCase(locale)} `), query,
            run(words.in), quoted(searchField), run(words.andChoose),
            quoted(result), run("."));
      }
    }
    if (selectLabels[actionType] && value && String(action?.typedValue || "").trim()) {
      return enterAndChoose(String(action.typedValue).trim(), field || selectLabels[actionType]);
    }
    if (selectLabels[actionType] && value) {
      // The captured Business Central field caption wins over the generic label.
      return sentence(run(words.choose, "action"), quoted(field || selectLabels[actionType]),
        run(" "), run(value, "value"), run(german ? " aus." : "."));
    }
    if (["EnterQuantity", "EnterItemNumber", "SelectDate", "EnterFieldValue"].includes(
      actionType) && value && field) {
      return sentence(run(words.enter, "action"), run(value, "value"),
        run(words.in), quoted(field), afterCaption(field, "ein"));
    }
    if (["SelectOption", "SelectLookupValue"].includes(actionType) &&
        value) {
      return field
        ? sentence(run(words.choose, "action"), run(value, "value"),
          run(words.forField), quoted(field), afterCaption(field, "aus"))
        : sentence(run(words.choose, "action"), run(value, "value"), run(german ? " aus." : "."));
    }
    if (["EnableCheckbox", "DisableCheckbox"].includes(actionType) &&
        field) {
      return sentence(run(actionType === "EnableCheckbox"
        ? words.enable : words.disable, "action"), quoted(field), afterCaption(field, ""));
    }
    if (actionType === "RunActionPath" && Array.isArray(action?.actionPath) &&
        action.actionPath.length && action.actionPath.every(item =>
          typeof item === "string" && item.trim())) {
      const pathRuns = [];
      action.actionPath.forEach((caption, index) => {
        if (index) pathRuns.push(run(" → "));
        pathRuns.push(quoted(caption.trim()));
      });
      return sentence(run(words.choose, "action"), pathRuns, run(german ? " aus." : "."));
    }
    const runs = legacyRuns(fallbackText);
    return sentence(runs);
  }

  function processBlock(block, action, documentLanguage) {
    const result = clone(block);
    const blockAction = result.kind === "step"
      // A step kept as recorded is described from its semantic action model, as in Review.
      ? result.semanticAction || result.interaction?.semanticActionModel || result.interaction || action
      : action;
    if (result.kind === "paragraph" && typeof result.text === "string") {
      if (result.preserveUserText || result.provenance === "user-edited") {
        // Preserve literal authored text even when no rich-text runs were stored.
        if (!Array.isArray(result.presentationRuns)) {
          result.presentationRuns = [run(result.text)];
        }
      } else {
        const presentation = presentationFor(blockAction, result.text,
          documentLanguage);
        result.text = presentation.text;
        result.presentationRuns = presentation.runs;
      }
    }
    if (Array.isArray(result.blocks)) {
      result.blocks = result.blocks.map(child => processBlock(
        child,
        result.kind === "step" && child.kind === "paragraph"
          ? child.preserveUserText ? null : blockAction
          : action,
        documentLanguage
      ));
    }
    if (Array.isArray(result.items)) {
      result.items = result.items.map(item => ({ ...item,
        blocks: Array.isArray(item.blocks)
          ? item.blocks.map(child => processBlock(child, blockAction,
            documentLanguage)) : item.blocks }));
    }
    if (Array.isArray(result.rows)) {
      result.rows = result.rows.map(row => ({ ...row,
        cells: Array.isArray(row.cells) ? row.cells.map(cell => ({ ...cell,
          blocks: Array.isArray(cell.blocks)
            ? cell.blocks.map(child => processBlock(child, blockAction,
              documentLanguage)) : cell.blocks
        })) : row.cells }));
    }
    return result;
  }

  function process(document) {
    const cacheable = document && typeof document === "object" &&
      Object.isFrozen(document);
    if (cacheable && cache.has(document)) return cache.get(document);
    const normalized = semantic.normalize(document);
    const requestedLanguage = normalized.metadata?.documentLanguage;
    const documentLanguage = DOCUMENT_LANGUAGES.has(requestedLanguage)
      ? requestedLanguage : "sv-SE";
    const result = semantic.normalize({
      ...clone(normalized),
      sections: normalized.sections.map(section => ({ ...clone(section),
        blocks: section.blocks.map(block => processBlock(block, null,
          documentLanguage)) })),
      provenance: {
        ...clone(normalized.provenance),
        transformations: [...new Set([
          ...(normalized.provenance?.transformations || []),
          "presentation-grammar"
        ])],
        presentationGrammarVersion: GRAMMAR_VERSION
      }
    });
    if (cacheable) cache.set(document, result);
    return result;
  }

  return { GRAMMAR_VERSION, cleanLookupFieldCaption, legacyRuns, presentationFor, process };
});
