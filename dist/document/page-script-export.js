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
    "en-US": { open: "Open {page}", invoke: "Invoke {caption}", operation: "Invoke {operation} on {caption}",
      input: "Enter {value} in {caption}", row: "Set the current row in {caption}", choose: "Choose the row in {caption}",
      New: "Create new", Delete: "Delete record", Yes: "Confirm with Yes", No: "Answer No", OK: "OK", LookupOk: "Lookup OK", Cancel: "Close" },
    "sv-SE": { open: "Öppna {page}", invoke: "Anropa {caption}", operation: "Anropa {operation} på {caption}",
      input: "Mata in {value} i {caption}", row: "Ange aktuell rad i {caption}", choose: "Välj raden i {caption}",
      New: "Skapa ny", Delete: "Ta bort post", Yes: "Bekräfta med Ja", No: "Svara Nej", OK: "OK", LookupOk: "Sökning OK", Cancel: "Avsluta och stäng" },
    "fr-FR": { open: "Ouvrir {page}", invoke: "Appeler {caption}", operation: "Appeler {operation} sur {caption}",
      input: "Saisir {value} dans {caption}", row: "Définir la ligne actuelle dans {caption}", choose: "Choisir la ligne dans {caption}",
      New: "Créer", Delete: "Supprimer l’enregistrement", Yes: "Confirmer par Oui", No: "Répondre Non", OK: "OK", LookupOk: "Recherche OK", Cancel: "Fermer" },
    "de-DE": { open: "{page} öffnen", invoke: "{caption} aufrufen", operation: "{operation} für {caption} aufrufen",
      input: "{value} in {caption} eingeben", row: "Aktuelle Zeile in {caption} festlegen", choose: "Zeile in {caption} auswählen",
      New: "Neu erstellen", Delete: "Datensatz löschen", Yes: "Mit Ja bestätigen", No: "Mit Nein antworten", OK: "OK", LookupOk: "Nachschlagen OK", Cancel: "Schließen" },
    "es-ES": { open: "Abrir {page}", invoke: "Invocar {caption}", operation: "Invocar {operation} en {caption}",
      input: "Introducir {value} en {caption}", row: "Establecer la fila actual en {caption}", choose: "Elegir la fila en {caption}",
      New: "Crear nuevo", Delete: "Eliminar registro", Yes: "Confirmar con Sí", No: "Responder No", OK: "Aceptar", LookupOk: "Búsqueda Aceptar", Cancel: "Cerrar" },
    "da-DK": { open: "Åbn {page}", invoke: "Aktivér {caption}", operation: "Aktivér {operation} på {caption}",
      input: "Indtast {value} i {caption}", row: "Angiv aktuel række i {caption}", choose: "Vælg rækken i {caption}",
      New: "Opret ny", Delete: "Slet post", Yes: "Bekræft med Ja", No: "Svar Nej", OK: "OK", LookupOk: "Opslag OK", Cancel: "Luk" },
    "fi-FI": { open: "Avaa {page}", invoke: "Suorita {caption}", operation: "Suorita {operation} kohteessa {caption}",
      input: "Syötä {value} kenttään {caption}", row: "Aseta nykyinen rivi kohteessa {caption}", choose: "Valitse rivi kohteessa {caption}",
      New: "Luo uusi", Delete: "Poista tietue", Yes: "Vahvista: Kyllä", No: "Vastaa: Ei", OK: "OK", LookupOk: "Haku OK", Cancel: "Sulje" },
    "nb-NO": { open: "Åpne {page}", invoke: "Aktiver {caption}", operation: "Aktiver {operation} på {caption}",
      input: "Angi {value} i {caption}", row: "Angi gjeldende rad i {caption}", choose: "Velg raden i {caption}",
      New: "Opprett ny", Delete: "Slett post", Yes: "Bekreft med Ja", No: "Svar Nei", OK: "OK", LookupOk: "Oppslag OK", Cancel: "Lukk" }
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
    const lines = [`  - type: ${step.type}`, "    target:", ...targetLines(step.target, "      ")];
    if (step.type === "input") lines.push(`    value: ${JSON.stringify(String(step.value))}`);
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

  function build({ name = "", description = "", events = [], locale = "en-US" } = {}) {
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
    const skip = (event, reason) => {
      if (!steps.length) return;
      skipped.push({ eventNo: event.eventNo ?? null, sourceEventId: event.sourceEventId || "",
        label: label(event), reason });
    };

    function flush(options = {}) {
      if (!pending) return;
      const { identity, value, event } = pending;
      pending = null;
      if (MASKED.test(String(value))) { skip(event, "masked"); return; }
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
        continue;
      }

      if (type !== "click" || event.pointerContainer) continue;
      settleClosing();
      if (!identity && !label(event) && pressed(event)) { flush(); closingClick = event; continue; }
      if (!identity) { flush(); skip(event, "noIdentity"); causeMissing = causeMissing || pressed(event); continue; }

      if (identity.kind === "field" || identity.kind === "control" || identity.kind === "menu") {
        if (identity.kind === "field") lastField = { identity, at: timeOf(event) };
        continue; // focusing a field or opening a menu is not a step of its own
      }

      // A row chosen in a lookup that opened from the field last used.
      if (identity.kind === "row") {
        // The same choice again in the lookup just used, a click that changes nothing.
        if (lastChoice && lastChoice.page === rootPage(identity.path) &&
            (timeOf(event) - lastChoice.at < REPEAT_CLICK_MS ||
             (lastChoice.value && lastChoice.value === chosenValue(identity, event) &&
              timeOf(event) - lastChoice.at < LOOKUP_WINDOW_MS))) continue;
        // A cell of a field in a list of lines, such as its lookup arrow: like focusing the field.
        if (identity.field && !rootPage(identity.path).startsWith("lookup:") &&
            identity.path.some(entry => "repeater" in entry)) {
          lastField = { identity, at: timeOf(event) };
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
      } else if (identity.kind === "dialog" && identity.operation) {
        const target = identity.page ? [{ page: identity.page }]
          : [{ page: null, automationId: identity.automationId, caption: identity.caption || "" }];
        if (!identity.page && !identity.automationId) { skip(event, "dialog"); continue; }
        // OK on a page shown over another is LookupOk, as Page Scripting records it; plain OK is
        // accepted in replay but leaves the page open.
        const invokeType = identity.page && identity.operation === "OK" ? "LookupOk" : identity.operation;
        steps.push({ type: "invoke", target, invokeType,
          description: say("operation", { operation: invokeType, caption: identity.caption || label(event) }) });
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
    const all = startPage && !startPage.startsWith("lookup:")
      ? [{ type: "navigate", target: [{ page: startPage }], description: say("open", { page: startPage }) }, ...steps] : steps;
    return { content: steps.length ? toYaml({ name, description, steps: all }) : "",
      steps: all, stepCount: steps.length, skipped, startPage, recordedIdentity };
  }

  // A file name from the document's title, safe on every system.
  function fileName(title) {
    const base = clean(title).replace(/[\\/:*?"<>|]+/gu, "-").replace(/\.+$/u, "").slice(0, 100);
    return `${base || "BC Process Studio"}.yml`;
  }

  return Object.freeze({ VERSION, PHRASES, SYSTEM_ACTIONS, build, fileName, toYaml, scalar });
});
