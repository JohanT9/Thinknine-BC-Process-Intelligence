// Turns a BC Process Studio recording into a Page Scripting file (YAML) that Business
// Central's Page Scripting tool or @microsoft/bc-replay can play back.
//
// Each recorded event carries the AL identity that al-identity-capture.js read in the page
// (alIdentity): the page › part › page › repeater path and the field, action or dialog. Only
// what was recorded is written: a step whose identity is missing, whose value was masked or
// whose kind Page Scripting cannot express is left out and reported in `skipped`, so the user
// is told, instead of a guess. Focus, page-shown and page-closed steps are not written; replay
// does not need them. The file starts by navigating to the first page used.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9PageScriptExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const VERSION = 1;
  const MASKED = /^\[[^\]]{1,40}\]$/u; // privacy placeholders such as [belopp] or [maskerat]
  const LOOKUP_WINDOW_MS = 120000;
  const REPEAT_CLICK_MS = 1000;
  const RECORD_PAGE_TYPES = new Set(["card", "document"]); // pages that show one record
  // The field whose button was pressed in a page shown as a dialog: the client names the field
  // and the page (["Shipping Container Code", "Create License Plates FDW"]).
  function lookupFieldOf(event, identity) {
    const path = Array.isArray(event.alControlPath) ? event.alControlPath.map(clean) : [];
    return path.length >= 2 && path.at(-1) === identity.page && path[0] && path[0] !== identity.page ? path[0] : "";
  }
  // Pages that no step of the test opens: the search, the lookups and plain questions.
  const notOpenedByStep = page => !page || page === "Dialog" || page === "PageSearchForm" || page.startsWith("lookup:");
  // Business Central's own line actions carry a fixed id instead of an AL name. The same id is
  // used on every page (seen on sales and purchase orders, in the action bar and the line menu).
  const SYSTEM_ACTIONS = Object.freeze([
    ["97614525-6ed6-4ed5-9262-", "New"],
    ["7a6412b6-f244-4670-9259-", "Delete"]
  ]);
  function systemOperation(identity) {
    if (identity.operation) return identity.operation;
    const properties = identity.properties || {};
    const id = String(properties.controlIdentifier || properties.name || "").replace(/[{}]/gu, "").toLowerCase();
    return SYSTEM_ACTIONS.find(([prefix]) => id.startsWith(prefix))?.[1] || "";
  }
  // The value of the row chosen in a lookup: read from the cell in the page, or the record named
  // in the row's accessible name, such as Välj posten "30043" or Choisir l’enregistrement « 30043 ».
  const QUOTED = /["“”„«‹'‘’]s*([^"“”„«»‹›]{1,80}?)s*["“”»›'’]s*$/u;
  function chosenValue(identity, event) {
    const fromCell = clean(identity.value || "");
    const name = String(event.accessibleName || event.label || "");
    // A click on a cell in the list names the cell's own text, such as 10000.
    const fromName = name.match(QUOTED)?.[1] || (/gridcell|cell/iu.test(String(event.role || "")) && name.length <= 80 ? name : "");
    const value = clean(fromCell || fromName);
    return value && !MASKED.test(value) ? value : "";
  }
  // A click on something that does something (a button, a menu item, a link), not on text.
  const pressed = event => /button|menuitem|link|^a$/iu.test(String(event.role || event.controlType || ""));
  const withoutRepeater = path => (path || []).filter(entry => !("repeater" in entry));

  // Invisible format characters and icon-font glyphs (private use, such as the ✕ of a page,
  // U+E8BB) are not text.
  const clean = value => String(value ?? "").replace(/[\p{Cf}\p{Co}]+/gu, "").replace(/\s+/gu, " ").trim();
  const eventOf = item => item?.raw && typeof item.raw === "object" ? item.raw : item;
  const timeOf = event => Date.parse(event?.timestamp || "") || 0;
  const rootPage = path => (Array.isArray(path) ? path : []).find(entry => "page" in entry)?.page || "";
  const pathKey = (path, field = "") => JSON.stringify([path, field]);

  // Step texts shown in Page Scripting's list, written the way Page Scripting writes its own:
  // a phrase in the document language with the Business Central caption in <caption>, the
  // value in <value> and the operation in <operation>. Captions and values are the recorded
  // ones and are not translated.
  const PHRASES = Object.freeze({
    "en-US": { message: "Message: {value}", open: "Open {page}", invoke: "Invoke {caption}", operation: "Invoke {operation} on {caption}",
      input: "Enter {value} in {caption}", row: "Set the current row in {caption}", choose: "Choose the row in {caption}",
      New: "Create new", Delete: "Delete record", Yes: "Confirm with Yes", No: "Answer No", OK: "OK", Lookup: "Open lookup", LookupOk: "Lookup OK", Cancel: "Close" },
    "sv-SE": { message: "Meddelande: {value}", open: "Öppna {page}", invoke: "Anropa {caption}", operation: "Anropa {operation} på {caption}",
      input: "Mata in {value} i {caption}", row: "Ange aktuell rad i {caption}", choose: "Välj raden i {caption}",
      New: "Skapa ny", Delete: "Ta bort post", Yes: "Bekräfta med Ja", No: "Svara Nej", OK: "OK", Lookup: "Öppna sökning", LookupOk: "Sökning OK", Cancel: "Avsluta och stäng" },
    "fr-FR": { message: "Message : {value}", open: "Ouvrir {page}", invoke: "Appeler {caption}", operation: "Appeler {operation} sur {caption}",
      input: "Saisir {value} dans {caption}", row: "Définir la ligne actuelle dans {caption}", choose: "Choisir la ligne dans {caption}",
      New: "Créer", Delete: "Supprimer l’enregistrement", Yes: "Confirmer par Oui", No: "Répondre Non", OK: "OK", Lookup: "Ouvrir la recherche", LookupOk: "Recherche OK", Cancel: "Fermer" },
    "de-DE": { message: "Meldung: {value}", open: "{page} öffnen", invoke: "{caption} aufrufen", operation: "{operation} für {caption} aufrufen",
      input: "{value} in {caption} eingeben", row: "Aktuelle Zeile in {caption} festlegen", choose: "Zeile in {caption} auswählen",
      New: "Neu erstellen", Delete: "Datensatz löschen", Yes: "Mit Ja bestätigen", No: "Mit Nein antworten", OK: "OK", Lookup: "Nachschlagen öffnen", LookupOk: "Nachschlagen OK", Cancel: "Schließen" },
    "es-ES": { message: "Mensaje: {value}", open: "Abrir {page}", invoke: "Invocar {caption}", operation: "Invocar {operation} en {caption}",
      input: "Introducir {value} en {caption}", row: "Establecer la fila actual en {caption}", choose: "Elegir la fila en {caption}",
      New: "Crear nuevo", Delete: "Eliminar registro", Yes: "Confirmar con Sí", No: "Responder No", OK: "Aceptar", Lookup: "Abrir búsqueda", LookupOk: "Búsqueda Aceptar", Cancel: "Cerrar" },
    "da-DK": { message: "Meddelelse: {value}", open: "Åbn {page}", invoke: "Aktivér {caption}", operation: "Aktivér {operation} på {caption}",
      input: "Indtast {value} i {caption}", row: "Angiv aktuel række i {caption}", choose: "Vælg rækken i {caption}",
      New: "Opret ny", Delete: "Slet post", Yes: "Bekræft med Ja", No: "Svar Nej", OK: "OK", Lookup: "Åbn opslag", LookupOk: "Opslag OK", Cancel: "Luk" },
    "fi-FI": { message: "Viesti: {value}", open: "Avaa {page}", invoke: "Suorita {caption}", operation: "Suorita {operation} kohteessa {caption}",
      input: "Syötä {value} kenttään {caption}", row: "Aseta nykyinen rivi kohteessa {caption}", choose: "Valitse rivi kohteessa {caption}",
      New: "Luo uusi", Delete: "Poista tietue", Yes: "Vahvista: Kyllä", No: "Vastaa: Ei", OK: "OK", Lookup: "Avaa haku", LookupOk: "Haku OK", Cancel: "Sulje" },
    "nb-NO": { message: "Melding: {value}", open: "Åpne {page}", invoke: "Aktiver {caption}", operation: "Aktiver {operation} på {caption}",
      input: "Angi {value} i {caption}", row: "Angi gjeldende rad i {caption}", choose: "Velg raden i {caption}",
      New: "Opprett ny", Delete: "Slett post", Yes: "Bekreft med Ja", No: "Svar Nei", OK: "OK", Lookup: "Åpne oppslag", LookupOk: "Oppslag OK", Cancel: "Lukk" }
  });
  const markup = value => String(value ?? "").replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
  function phrasesFor(locale) {
    const key = Object.keys(PHRASES).find(code => code.toLowerCase() === String(locale || "").toLowerCase()) ||
      Object.keys(PHRASES).find(code => code.slice(0, 2) === String(locale || "").slice(0, 2).toLowerCase());
    return PHRASES[key || "en-US"];
  }
  function phrase(words, kind, values = {}) {
    const tagged = { page: `<caption>${markup(values.page)}</caption>`,
      caption: `<caption>${markup(values.caption)}</caption>`, value: `<value>${markup(values.value)}</value>`,
      operation: `<operation>${markup(words[values.operation] || values.operation)}</operation>` };
    return words[kind].replace(/\{(page|caption|value|operation)\}/gu, (_, name) => tagged[name]);
  }

  // YAML scalars: plain where that reads the same, otherwise double-quoted (JSON is valid YAML).
  const PLAIN = /^[\p{L}_][\p{L}\p{N} _.\-/()%]*$/u;
  const RESERVED = /^(true|false|yes|no|on|off|null|~)$/iu;
  function scalar(value) {
    if (value === null) return "null";
    if (typeof value === "boolean" || typeof value === "number") return String(value);
    const text = String(value);
    return PLAIN.test(text) && !RESERVED.test(text) && !/\s$/u.test(text) && !/:\s|\s#/u.test(text)
      ? text : JSON.stringify(text);
  }

  function targetLines(target, indent) {
    const lines = [];
    for (const entry of target) {
      const keys = Object.keys(entry);
      keys.forEach((key, index) => lines.push(`${indent}${index === 0 ? "- " : "  "}${key}: ${scalar(entry[key])}`));
    }
    return lines;
  }

  function stepLines(step) {
    // A message is checked and closed by its text, as Page Scripting writes it.
    if (step.type === "message") {
      return [`  - type: message`, `    automationId: ${scalar(step.automationId)}`, `    text: ${JSON.stringify(step.text)}`,
        `    description: ${scalar(step.description)}`];
    }
    const lines = [`  - type: ${step.type}`, "    target:", ...targetLines(step.target, "      ")];
    // An option is entered by its number, unquoted, as Page Scripting writes it.
    if (step.type === "input") lines.push(`    value: ${typeof step.value === "number" ? step.value : JSON.stringify(String(step.value))}`);
    if (step.isFilterAsYouType) lines.push("    isFilterAsYouType: true");
    if (step.targetRecord) lines.push("    targetRecord:", `      relative: ${step.targetRecord.relative}`);
    if (step.invokeType) lines.push(`    invokeType: ${step.invokeType}`);
    if (step.parameters) {
      lines.push("    parameters:");
      for (const [key, value] of Object.entries(step.parameters)) lines.push(`      ${key}: ${scalar(value)}`);
    }
    if (step.description) lines.push(`    description: ${scalar(step.description)}`);
    return lines;
  }

  function toYaml({ name, description, steps }) {
    return [`name: ${scalar(clean(name) || "BC Process Studio")}`,
      `description: ${scalar(clean(description) || "BC Process Studio")}`,
      "steps:", ...steps.flatMap(stepLines)].join("\n") + "\n";
  }

  function build({ name = "", description = "", events = [], locale = "en-US", pageTypeOf = null } = {}) {
    const words = phrasesFor(locale);
    const say = (kind, values) => phrase(words, kind, values);
    const steps = [];
    const skipped = [];
    let pending = null;      // the latest typed value per field, written when the user moves on
    let lastField = null;    // the field last focused or typed in, for a lookup that follows
    const chosenByLookup = new Set();
    let lastChoice = null;   // the lookup row just chosen; the client may report the click twice
    let lastLines = null;    // the latest path into a list of lines, for Delete on a line
    let rowClick = null;
    // A click that could not be written: the question or page it opened is not answered either,
    // or replay would answer a question that is never asked.
    let causeMissing = false;
    // A page the test opened and the user closed with its ✕, which has no name of its own: the
    // client reports the page as closed right after, and the file closes it with Cancel.
    let closingClick = null;
    const closedAt = new Map();
    // Pages opened by a step that is not in the file: replay never shows them, so nothing that
    // happens on them can be written either, down to the pages and questions they open.
    const unreachable = new Set();
    // The last click that did something without becoming a step of its own, such as a link in
    // a line (Artikelspårning) or a split button (Bokför) that the client reports as a menu.
    // If a page or question opens right after it, that click opened it and is missing.
    let silentClick = null;
    let messageText = ""; // the text of the question or message shown last
    // The lookup button of a field in a page shown as a dialog (Välj ett värde för Lastbärarekod):
    // written once a row is chosen in the list it opens, as Page Scripting records it.
    let fieldLookup = null;
    let lookupList = ""; // the list a lookup choice closed
    // A list shown on the way to the start page, such as the journal templates (Artikel-
    // journalmallslista) that Item Journal asks for first when there are several: replay shows it
    // too after navigate, so the row chosen there is part of the test.
    let startList = null;
    let startChoice = null;
    // Clicks on the way to the start page, before the test begins: not missing steps.
    const beforeStart = new Set();
    const settleClosing = () => {
      if (!closingClick) return;
      skip(closingClick, "noIdentity");
      causeMissing = true;
      closingClick = null;
    };
    const captionIn = step => {
      const found = [...String(step?.description || "").matchAll(/<caption>([^<]*)<\/caption>/gu)].at(-1)?.[1] || "";
      return found.replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&");
    };
    function closePage(event) {
      const page = clean((Array.isArray(event.alControlPath) ? event.alControlPath[0] : "") || "");
      if (unreachable.delete(page)) { closingClick = null; return; }
      if (fieldLookup && fieldLookup.list === page) { skip(fieldLookup.event, "dialog"); fieldLookup = null; return; }
      const from = closedAt.get(page) || 0;
      const first = page ? steps.findIndex((step, index) => index >= from && rootPage(step.target) === page) : -1;
      if (first < 1) { settleClosing(); return; }
      flush();
      steps.push({ type: "invoke", target: [{ page }], invokeType: "Cancel",
        description: say("operation", { operation: "Cancel", caption: captionIn(steps[first - 1]) || page }) });
      closedAt.set(page, steps.length);
      closingClick = null;
      causeMissing = false;
    }     // a click on a line, which a following Delete makes part of that step
    let recordedIdentity = false;

    const label = event => clean(event.label || event.accessibleName || event.fieldName || "").slice(0, 80);
    // What happens before the first step is the way to the start page, which the file reaches
    // with navigate; it is not a missing step.
    // A typed value is part of the test wherever it comes; a click before the first step is not.
    const skip = (event, reason, caption = "", typed = false) => {
      if ((!steps.length && !typed) || beforeStart.has(event)) return;
      skipped.push({ eventNo: event.eventNo ?? null, sourceEventId: event.sourceEventId || "",
        label: clean(caption).slice(0, 80) || label(event), reason });
    };
    // A step on a page that replay never shows is left out, and so is what it opens.
    const onUnreachable = path => unreachable.has(rootPage(path));
    // A page or question opened: by the step before it, or by a click that is not in the file.
    function opened(event) {
      const page = clean((Array.isArray(event.alControlPath) ? event.alControlPath[0] : "") || "");
      if (!steps.length && !pending) {
        silentClick = null;
        if (!notOpenedByStep(page)) startList = { page, caption: clean(event.pageCaption || "") };
        return;
      }
      if (page.startsWith("lookup:") || page === "PageSearchForm") return;
      if (fieldLookup && !fieldLookup.list && !notOpenedByStep(page)) { fieldLookup.list = page; return; }
      // A link in a line (Artikelspårning) that opened a page is an invoke on its field, as Page
      // Scripting records it (2026-11-20).
      if (silentClick?.field && !notOpenedByStep(page) && !onUnreachable(silentClick.path)) {
        flush();
        steps.push({ type: "invoke", target: [...silentClick.path, { field: silentClick.field }],
          description: say("invoke", { caption: silentClick.caption || silentClick.field }) });
        silentClick = null;
        causeMissing = false;
        return;
      }
      if (silentClick) {
        flush();
        skip(silentClick.event, "unsupported", silentClick.caption);
        causeMissing = true;
        silentClick = null;
      }
      if (causeMissing && !notOpenedByStep(page)) unreachable.add(page);
    }

    function flush(options = {}) {
      if (!pending) return;
      const { identity, value, event } = pending;
      pending = null;
      if (MASKED.test(String(value))) { skip(event, "masked", "", true); return; }
      if (onUnreachable(identity.path)) { skip(event, "withoutCause", "", true); return; }
      // A choice in a drop-down list (an option field such as Transaktionstyp) is entered by its
      // number, as Page Scripting records it (value: 2 for Positiv justering, 2026-11-20); the
      // text shown is not accepted in replay. The number is the choice's place in the list, which
      // the recording keeps as optionIndex. A recording without it cannot name the choice.
      if (/^select$/iu.test(String(event.controlType || "")) || /^(select|listbox)$/iu.test(String(event.role || ""))) {
        if (!Number.isInteger(event.optionIndex) || event.optionIndex < 0) { skip(event, "option", identity.caption, true); return; }
        steps.push({ type: "input", target: [...identity.path, { field: identity.field }], value: event.optionIndex,
          description: say("input", { value, caption: identity.caption || label(event) }) });
        return;
      }
      steps.push({ type: "input", target: [...identity.path, { field: identity.field }], value,
        ...(options.filter ? { isFilterAsYouType: true } : {}),
        description: say("input", { value, caption: identity.caption || label(event) }) });
    }

    for (const item of events) {
      const event = eventOf(item);
      if (!event || typeof event !== "object") continue;
      const identity = event.alIdentity && event.alIdentity.v === VERSION ? event.alIdentity : null;
      if (identity) recordedIdentity = true;
      const type = event.type;
      if (Array.isArray(identity?.path) && identity.path.some(entry => "repeater" in entry) &&
          !rootPage(identity.path).startsWith("lookup:")) lastLines = identity.path;

      if (type === "focus") {
        if (identity?.kind === "field") lastField = { identity, at: timeOf(event) };
        continue;
      }

      if (type === "dialog-close") { closePage(event); continue; }
      if (type === "dialog-open") {
        if (clean((Array.isArray(event.alControlPath) ? event.alControlPath[0] : "") || "") === "Dialog") {
          messageText = clean(event.accessibleName || "");
        }
        opened(event);
        continue;
      }

      if (type === "field-change") {
        settleClosing();
        if (event.inputSource === "validated") continue; // what the client showed afterwards
        if (identity?.kind !== "field" || !identity.field) { skip(event, "noIdentity"); continue; }
        const key = pathKey(identity.path, identity.field);
        // After a choice in a lookup the field shows the chosen record; only typing again is a step.
        if (chosenByLookup.has(key) && event.inputSource !== "input") continue;
        chosenByLookup.delete(key);
        // What was typed, also when the recording masks it (privacy-mask.js keepTypedValue).
        const value = event.typedValue ?? event.enteredValue ?? event.value;
        // A field left as it was, such as one tabbed through, is not a step.
        if (event.previousValue !== undefined && event.previousValue !== null &&
            String(value) === String(event.previousValue)) {
          // Typed and then erased: the field is back as it was, so nothing typed before counts.
          if (pending && pathKey(pending.identity.path, pending.identity.field) === key) pending = null;
          continue;
        }
        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
          skip(event, "noValue"); continue;
        }
        if (pending && pathKey(pending.identity.path, pending.identity.field) !== key) flush();
        pending = { identity, value: String(value), event };
        lastField = { identity, at: timeOf(event) };
        // What opens next is caused by this value, not by a click before it.
        silentClick = null;
        if (!onUnreachable(identity.path)) causeMissing = false;
        continue;
      }

      if (type !== "click" || event.pointerContainer) continue;
      settleClosing();
      silentClick = null;
      if (!steps.length && !pending) beforeStart.add(event);
      if (!identity && !label(event) && pressed(event)) { flush(); closingClick = event; continue; }
      if (!identity) { flush(); skip(event, "noIdentity"); causeMissing = causeMissing || pressed(event); continue; }

      if (identity.kind === "field" || identity.kind === "control" || identity.kind === "menu") {
        if (identity.kind === "field") lastField = { identity, at: timeOf(event) };
        // A menu button that is also a split button (Bokför) runs its first action when the
        // button itself is pressed; the client reports it as the menu.
        if (identity.kind === "menu") silentClick = { event, caption: "" };
        continue; // focusing a field or opening a menu is not a step of its own
      }

      // A row chosen in a lookup that opened from the field last used.
      if (identity.kind === "row") {
        // The same choice again in the lookup just used, a click that changes nothing.
        if (lastChoice && lastChoice.page === rootPage(identity.path) &&
            (timeOf(event) - lastChoice.at < REPEAT_CLICK_MS ||
             (lastChoice.value && lastChoice.value === chosenValue(identity, event) &&
              timeOf(event) - lastChoice.at < LOOKUP_WINDOW_MS))) continue;
        // The row chosen in the list a field's lookup button opened: the lookup, the row and the
        // choice, which closes the list.
        if (!steps.length && !pending && startList && rootPage(identity.path) === startList.page) {
          const repeater = identity.path.find(entry => "repeater" in entry)?.repeater;
          startChoice = repeater ? { ...startList, repeater, rowIndex: identity.rowIndex } : null;
          continue;
        }
        if (fieldLookup?.list && rootPage(identity.path) === fieldLookup.list) {
          const { page, field, list, event: opener } = fieldLookup;
          fieldLookup = null;
          const repeater = identity.path.find(entry => "repeater" in entry)?.repeater;
          if (!repeater) { skip(opener, "dialog"); continue; }
          flush();
          steps.push({ type: "invoke", target: [{ page }, { field }], invokeType: "Lookup",
            description: say("operation", { operation: "Lookup", caption: field }) });
          const rows = [{ page: list }, { repeater }];
          if (Number.isInteger(identity.rowIndex) && identity.rowIndex > 0) {
            steps.push({ type: "set-current-row", target: rows, targetRecord: { relative: identity.rowIndex },
              description: say("row", { caption: identity.caption || field }) });
          }
          steps.push({ type: "invoke", target: rows, parameters: { AlwaysCommit: false },
            description: say("choose", { caption: identity.caption || field }) });
          closedAt.set(list, steps.length);
          lookupList = list;
          lastChoice = { page: list, at: timeOf(event), value: chosenValue(identity, event) };
          continue;
        }
        // A cell of a field in a list of lines, such as its lookup arrow: like focusing the field.
        if (identity.field && !rootPage(identity.path).startsWith("lookup:") &&
            identity.path.some(entry => "repeater" in entry)) {
          lastField = { identity, at: timeOf(event) };
          // A link in the cell, such as Artikelspårning, opens a page of its own.
          if (pressed(event)) silentClick = { event, caption: identity.caption, path: identity.path, field: identity.field };
          continue;
        }
        if (rowClick) skip(rowClick, "rowSelection");
        rowClick = null;
        const field = lastField && timeOf(event) - lastField.at < LOOKUP_WINDOW_MS &&
          rootPage(identity.path) !== rootPage(lastField.identity.path) ? lastField.identity : null;
        if (!field) { flush(); rowClick = rootPage(identity.path).startsWith("lookup:") ? null : event;
          if (!rowClick) skip(event, "rowSelection");
          continue; }
        const typed = pending && pathKey(pending.identity.path, pending.identity.field) ===
          pathKey(field.path, field.field);
        // The record chosen is entered as its value, the way a user can type it: a search text and
        // a row position depend on the data and do not replay reliably.
        const chosen = chosenValue(identity, event);
        if (onUnreachable(field.path)) {
          flush(); skip(event, "withoutCause", field.caption); causeMissing = true; continue;
        }
        if (chosen) {
          if (typed) pending = null;
          else flush();
          steps.push({ type: "input", target: [...field.path, { field: field.field }], value: chosen,
            description: say("input", { value: chosen, caption: field.caption || field.field }) });
          chosenByLookup.add(pathKey(field.path, field.field));
          lastChoice = { page: rootPage(identity.path), at: timeOf(event), value: chosen };
          lastField = null;
          continue;
        }
        // Without a value, the lookup itself. Page Scripting opens the lookup with an empty filter on the field, then filters with
        // what was typed, if anything.
        const open = () => steps.push({ type: "input", target: [...field.path, { field: field.field }], value: "",
          isFilterAsYouType: true, description: say("input", { value: "", caption: field.caption || field.field }) });
        if (typed) { const typedValue = pending; pending = null; open(); pending = typedValue; flush({ filter: true }); }
        else { flush(); open(); }
        const lookup = [{ page: `lookup:${field.field}` }, { repeater: "repeater" }];
        if (Number.isInteger(identity.rowIndex) && identity.rowIndex > 0) {
          steps.push({ type: "set-current-row", target: lookup, targetRecord: { relative: identity.rowIndex },
            description: say("row", { caption: field.caption || field.field }) });
        }
        steps.push({ type: "invoke", target: lookup, parameters: { AlwaysCommit: true },
          description: say("choose", { caption: field.caption || field.field }) });
        chosenByLookup.add(pathKey(field.path, field.field));
        lastChoice = { page: rootPage(identity.path), at: timeOf(event) };
        lastField = null;
        continue;
      }

      flush();
      const operation = identity.kind === "system" ? systemOperation(identity) : identity.operation;
      const lineClick = rowClick;
      rowClick = null;
      if (lineClick && !(identity.kind === "system" && operation === "Delete")) skip(lineClick, "rowSelection");
      if (identity.kind === "dialog" && causeMissing) { skip(event, "withoutCause"); continue; }
      if (onUnreachable(identity.path) || (identity.kind === "dialog" && unreachable.has(identity.page))) {
        skip(event, "withoutCause");
        causeMissing = true;
        continue;
      }
      causeMissing = false;
      if (identity.kind === "action" && identity.action) {
        steps.push({ type: "invoke", target: [...identity.path, { action: identity.action }],
          ...(identity.operation ? { invokeType: identity.operation } : {}),
          description: identity.operation
            ? say("operation", { operation: identity.operation, caption: label(event) || identity.caption })
            : say("invoke", { caption: label(event) || identity.caption }) });
      } else if (identity.kind === "system" && operation) {
        // New line is asked of the part; Delete of the line, in its list of lines.
        let path = withoutRepeater(identity.path);
        if (operation !== "New") {
          const lines = lastLines && JSON.stringify(withoutRepeater(lastLines)) === JSON.stringify(path) ? lastLines : null;
          path = identity.path.some(entry => "repeater" in entry) ? identity.path : lines || identity.path;
        }
        steps.push({ type: "invoke", target: path, invokeType: operation,
          description: say("operation", { operation, caption: label(event) || identity.caption }) });
      } else if (identity.kind === "dialog" && identity.page && !identity.operation && lookupFieldOf(event, identity)) {
        fieldLookup = { page: identity.page, field: lookupFieldOf(event, identity), list: "", event };
      } else if (identity.kind === "dialog" && identity.page && identity.page === lookupList) {
        lookupList = ""; // OK in the list the choice already closed
      } else if (identity.kind === "dialog" && identity.operation) {
        const target = identity.page ? [{ page: identity.page }]
          : [{ page: null, automationId: identity.automationId, caption: identity.caption || "" }];
        if (!identity.page && !identity.automationId) { skip(event, "dialog"); continue; }
        // OK on a message without a title (Journalraderna är bokförda.) is a message step with its
        // text, as Page Scripting records it; an error with a title (Fel) is answered with Ok.
        if (!identity.page && identity.operation === "OK" && !clean(identity.caption)) {
          if (!messageText || /\[[^\]]{1,40}\]/u.test(messageText)) { skip(event, "dialog"); continue; }
          steps.push({ type: "message", target: [{ page: null }], automationId: identity.automationId, text: messageText,
            description: say("message", { value: messageText }) });
          continue;
        }
        // OK on a page opened as a lookup (mode 3, such as Ändra tillämpad direkt enhetskostnad) is
        // LookupOk, as Page Scripting records it; plain Ok is accepted there but leaves the page
        // open. OK on a StandardDialog page (type 10, such as Skapa lastbärare) is Ok; LookupOk
        // fails there (replay, 2026-11-20). OK on a message is Ok (an error, 2026-11-13). A
        // recording made before the page's type and mode were kept gets LookupOk, as before.
        const okOnPage = identity.pageMode !== 3 && identity.pageType === 10 ? "Ok" : "LookupOk";
        const invokeType = identity.operation !== "OK" ? identity.operation : identity.page ? okOnPage : "Ok";
        steps.push({ type: "invoke", target, invokeType,
          description: say("operation", { operation: invokeType === "Ok" ? "OK" : invokeType,
            caption: identity.caption || label(event) }) });
        if (identity.page) closedAt.set(identity.page, steps.length);
      } else {
        skip(event, identity.kind === "system" ? "systemAction" : identity.kind === "dialog" ? "dialog" : "unsupported");
        causeMissing = identity.kind !== "dialog";
      }
    }
    flush();
    settleClosing();
    if (rowClick) skip(rowClick, "rowSelection");

    const startPage = rootPage(steps[0]?.target);
    // A test that starts on a card or document page replays on whichever record is open, not on
    // the recorded one, so the result says so. The page type comes from the caller (the knowledge
    // catalog); a page it does not know is not guessed.
    const startEvent = startPage ? events.map(eventOf).find(event =>
      clean(rootPage(event?.alIdentity?.path)) === startPage) : null;
    const startPageType = startEvent && typeof pageTypeOf === "function"
      ? String(pageTypeOf(startEvent) || "") : "";
    const startsOnRecord = RECORD_PAGE_TYPES.has(startPageType);
    const startCaption = clean(startEvent?.pageCaption || startEvent?.pageName || "") || startPage;
    // The row chosen in a list shown on the way to the start page, in the form Page Scripting
    // records a choice in a list opened over a page (row, then invoke on its repeater).
    const startRows = [];
    if (startChoice && startChoice.page !== startPage) {
      const rows = [{ page: startChoice.page }, { repeater: startChoice.repeater }];
      const caption = startChoice.caption || startChoice.page;
      if (Number.isInteger(startChoice.rowIndex) && startChoice.rowIndex > 0) {
        startRows.push({ type: "set-current-row", target: rows, targetRecord: { relative: startChoice.rowIndex },
          description: say("row", { caption }) });
      }
      startRows.push({ type: "invoke", target: rows, parameters: { AlwaysCommit: false },
        description: say("choose", { caption }) });
    }
    const all = startPage && !startPage.startsWith("lookup:")
      ? [{ type: "navigate", target: [{ page: startPage }], description: say("open", { page: startPage }) },
        ...startRows, ...steps] : steps;
    return { content: steps.length ? toYaml({ name, description, steps: all }) : "",
      steps: all, stepCount: steps.length, skipped, startPage, recordedIdentity,
      startsOnRecord, startCaption: startsOnRecord ? startCaption : "" };
  }

  // A file name from the document's title, safe on every system.
  function fileName(title) {
    const base = clean(title).replace(/[\\/:*?"<>|]+/gu, "-").replace(/\.+$/u, "").slice(0, 100);
    return `${base || "BC Process Studio"}.yml`;
  }

  return Object.freeze({ VERSION, PHRASES, SYSTEM_ACTIONS, build, fileName, toYaml, scalar });
});
