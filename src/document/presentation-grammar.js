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

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
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
    const rawField = cleanLookupFieldCaption(
      action?.targetField ?? action?.fieldCaption ?? "");
    const rowTypeContext = action?.rowTypeContext ||
      action?.semanticActionModel?.rowTypeContext;
    const itemRow = rowTypeContext?.source === "same-row-type" &&
      rowTypeContext.schemaVersion === 1 &&
      /^(?:artikel|item|article|artículo|tuote|vare)$/iu.test(
        String(rowTypeContext.value || "").trim());
    const itemNumberLabels = {
      "sv-SE": "Artikelnr.", "en-US": "Item No.", "fr-FR": "N° d’article",
      "de-DE": "Artikelnr.", "es-ES": "N.º de artículo", "da-DK": "Varenr.",
      "fi-FI": "Nimikenro", "nb-NO": "Varenr."
    };
    const rowTypeAliases = {
      Item: /^(?:artikel|item|article|artículo|tuote|vare|produkt)$/iu,
      Resource: /^(?:resurs|resource|ressource|recurso|resurssi|ressurs)$/iu,
      GLAccount: /^(?:g\/?l(?:\s|-)?account|ledger account|redovisningskonto|g\/?l-konto|sachkonto|compte général|cuenta contable|finanskonto|finanskonti|finanskonton|pääkirjatili)$/iu,
      FixedAsset: /^(?:fixed asset|anläggningstillgång|anlaegningstilgang|anlægsaktiv|anlage|immobilisation|activo fijo|käyttöomaisuus|anleggsmiddel|driftsmiddel)$/iu,
      ItemCharge: /^(?:charge\s*\(\s*item\s*\)|item charge|artikelavgift|varegebyr|artikelzuschlag|frais article|cargo\s*\(\s*producto\s*\)|cargo de producto|nimikeveloitus|tuoteveloitus)$/iu
    };
    const rowEntity = action?.selectedEntity || Object.entries(rowTypeAliases).find(([, pattern]) =>
      pattern.test(String(rowTypeContext?.value || "").trim()))?.[0] || "";
    const numberFields = {
      Item: itemNumberLabels,
      Resource: { "sv-SE": "Resursnr.", "en-US": "Resource No.", "fr-FR": "N° de ressource",
        "de-DE": "Ressourcennr.", "es-ES": "N.º de recurso", "da-DK": "Ressourcenr.",
        "fi-FI": "Resurssinro", "nb-NO": "Ressursnr." },
      GLAccount: { "sv-SE": "Redovisningskontonr.", "en-US": "G/L Account No.",
        "fr-FR": "N° de compte général", "de-DE": "Sachkontonr.",
        "es-ES": "N.º de cuenta contable", "da-DK": "Finanskontonr.",
        "fi-FI": "Pääkirjatilinro", "nb-NO": "Finanskontonr." },
      FixedAsset: { "sv-SE": "Anläggningstillgångsnr.", "en-US": "Fixed Asset No.",
        "fr-FR": "N° d’immobilisation", "de-DE": "Anlagennr.",
        "es-ES": "N.º de activo fijo", "da-DK": "Anlægsnr.",
        "fi-FI": "Käyttöomaisuusnro", "nb-NO": "Anleggsnr." },
      ItemCharge: { "sv-SE": "Artikelavgiftsnr.", "en-US": "Item Charge No.",
        "fr-FR": "N° de frais article", "de-DE": "Artikelzuschlagsnr.",
        "es-ES": "N.º de cargo de producto", "da-DK": "Varegebyrnr.",
        "fi-FI": "Nimikeveloitusnro", "nb-NO": "Varegebyrnr." }
    };
    const isNumberField = /^(?:nr\.?|no\.?|number|nummer|n°|nº|n\.?[º°]|num(?:ero|éro)?|nro\.?|n:o)$/iu
      .test(rawField);
    const contextualNumberField = rowTypeContext?.source === "same-row-type" &&
      rowTypeContext.schemaVersion === 1 && isNumberField && rowEntity
      ? numberFields[rowEntity]?.[locale] : "";
    const field = actionType === "EnterItemNumber" && itemRow
      ? itemNumberLabels[locale] : contextualNumberField || rawField;
    if (actionType === "SearchAndSelectRecord" && value) {
      const phrases = {
        "sv-SE": ["Sök efter ", " i ", " och välj den filtrerade posten."],
        "en-US": ["Search for ", " in ", " and select the matching record."],
        "fr-FR": ["Recherchez ", " dans ", " puis sélectionnez l’enregistrement correspondant."],
        "de-DE": ["Suchen Sie nach ", " in ", " und wählen Sie den passenden Datensatz aus."],
        "es-ES": ["Busque ", " en ", " y seleccione el registro coincidente."],
        "da-DK": ["Søg efter ", " i ", " og vælg den matchende post."],
        "fi-FI": ["Etsi ", " kentästä ", " ja valitse vastaava tietue."],
        "nb-NO": ["Søk etter ", " i ", " og velg den samsvarende posten."]
      }[locale];
      const observedSearchField = String(action?.searchFieldCaption || rawField || "").trim();
      const sortByNumberCaptions = {
        "sv-SE": "Sortera efter Nr", "en-US": "Sort by No.",
        "fr-FR": "Trier par n°", "de-DE": "Sortieren nach Nr.",
        "es-ES": "Ordenar por N.º", "da-DK": "Sortér efter nr.",
        "fi-FI": "Lajittele nro:n mukaan", "nb-NO": "Sorter etter nr."
      };
      const isSortByNumber = /^(?:sortera efter\s+nr\.?|sort by\s+(?:no\.?|nr\.?)|trier par\s+n[°º.]|sortieren nach\s+nr\.?|ordenar por\s+n\.?[º°]|sort[eé]r? efter\s+nr\.?|lajittele\s+nro(?::n)?\s+mukaan|sorter etter\s+nr\.?)$/iu
        .test(observedSearchField);
      const searchField = isSortByNumber
        ? sortByNumberCaptions[locale] : observedSearchField || {
        "sv-SE": "nummerfältet", "en-US": "the number field",
        "fr-FR": "le champ du numéro", "de-DE": "das Nummernfeld",
        "es-ES": "el campo de número", "da-DK": "nummerfeltet",
        "fi-FI": "numero", "nb-NO": "nummerfeltet"
      }[locale];
      return sentence(run(phrases[0]), run(value, "value"),
        run(phrases[1]), quoted(searchField), run(phrases[2]));
    }
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
    if (actionType === "SearchAndOpenPage") {
      const search = String(action?.searchCaption || {
        "sv-SE": "Sök", "en-US": "Search", "fr-FR": "Rechercher",
        "de-DE": "Suchen", "es-ES": "Buscar", "da-DK": "Søg",
        "fi-FI": "Hae", "nb-NO": "Søk"
      }[locale]).trim();
      const searchField = String(action?.searchFieldCaption || field || {
        "sv-SE": "Berätta vad du vill göra.", "en-US": "Tell me what you want to do.",
        "fr-FR": "Dites-moi ce que vous voulez faire.",
        "de-DE": "Sagen Sie mir, was Sie tun möchten.",
        "es-ES": "Dígame qué desea hacer.", "da-DK": "Fortæl mig, hvad du vil gøre.",
        "fi-FI": "Kerro, mitä haluat tehdä.", "nb-NO": "Fortell meg hva du vil gjøre."
      }[locale]).trim();
      const result = String(action?.resultCaption || action?.selectedCaption ||
        action?.pageCaption || "").trim();
      if (result) {
        return sentence(run(words.choose, "action"), quoted(search),
          run(`, ${words.enter.trim().toLocaleLowerCase(locale)} `),
          value ? run(value, "value") : run(words.searchText),
          run(words.in), quoted(searchField), run(words.andChoose),
          quoted(result), run("."));
      }
    }
    if (selectLabels[actionType] && value) {
      // The captured Business Central field caption wins over the generic label.
      return sentence(run(words.choose, "action"), quoted(field || selectLabels[actionType]),
        run(" "), run(value, "value"), run("."));
    }
    if (["EnterQuantity", "EnterItemNumber", "SelectDate", "EnterFieldValue"].includes(
      actionType) && value && field) {
      return sentence(run(words.enter, "action"), run(value, "value"),
        run(words.in), quoted(field), run("."));
    }
    if (actionType === "SelectLookupValue" && value && contextualNumberField) {
      return sentence(run(words.enter, "action"), run(value, "value"),
        run(words.in), quoted(contextualNumberField), run("."));
    }
    if (["SelectOption", "SelectLookupValue"].includes(actionType) &&
        value) {
      return field
        ? sentence(run(words.choose, "action"), run(value, "value"),
          run(words.forField), quoted(field), run("."))
        : sentence(run(words.choose, "action"), run(value, "value"), run("."));
    }
    if (["EnableCheckbox", "DisableCheckbox"].includes(actionType) &&
        field) {
      return sentence(run(actionType === "EnableCheckbox"
        ? words.enable : words.disable, "action"), quoted(field), run("."));
    }
    if (actionType === "RunActionPath" && Array.isArray(action?.actionPath) &&
        action.actionPath.length && action.actionPath.every(item =>
          typeof item === "string" && item.trim())) {
      const pathRuns = [];
      action.actionPath.forEach((caption, index) => {
        if (index) pathRuns.push(run(" → "));
        pathRuns.push(quoted(caption.trim()));
      });
      return sentence(run(words.choose, "action"), pathRuns, run("."));
    }
    const runs = legacyRuns(fallbackText);
    return sentence(runs);
  }

  function processBlock(block, action, documentLanguage) {
    const result = clone(block);
    const blockAction = result.kind === "step"
      ? result.semanticAction || result.interaction || action
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
