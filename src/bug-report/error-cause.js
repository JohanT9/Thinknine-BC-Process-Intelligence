(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ErrorCause = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // A possible cause of a captured Business Central error, read from the error message alone.
  // It is a suggestion, never a finding: it is offered only when the message itself says what
  // kind of problem it is (a missing permission, a field without a value, a failed connection),
  // and every name it shows (field, table, permission, status code) is quoted from the message.
  // Common errors of the Base Application and the platform's own messages (a field without a
  // value, a missing record, permissions…) are recognized in every registered language from
  // Microsoft's own wording (error-labels.js, built by scripts/build-error-labels.js). The rules
  // below recognize what the table does not have: other English and Swedish wording, failed
  // connections and status codes (docs/BUG_REPORT_CAUSES.md).
  const VERSION = "1.4.0";
  const text = value => typeof value === "string" ? value : "";
  const tidy = value => text(value).replace(/\s+/gu, " ").trim().replace(/[.:;,]+$/u, "").trim();
  const OBJECT_TYPES = "TableData|Table|Page|Report|Codeunit|Query|XmlPort|System";

  const RULES = Object.freeze([
    // "Sorry, the current permissions prevented the action. (TableData 18 Customer Read: Base Application)"
    { id: "permission-prevented-en", kind: "permission",
      pattern: new RegExp(`\\((${OBJECT_TYPES})\\s+(\\d+)\\s+(.+?)\\s+(Read|Insert|Modify|Delete|Execute)\\s*:\\s*[^)]*\\)`, "u"),
      params: match => ({ object: `${match[1]} ${match[2]} ${tidy(match[3])}`, permission: match[4] }) },
    // "You do not have the following permissions on TableData Sales Shipment Header: Insert."
    { id: "permission-following-en", kind: "permission",
      pattern: /You do not have the following permissions on ([^:\n]+):\s*([^\n.]+)/iu,
      params: match => ({ object: tidy(match[1]), permission: tidy(match[2]) }) },
    { id: "permission-following-sv", kind: "permission",
      pattern: /Du har inte följande behörigheter för ([^:\n]+):\s*([^\n.]+)/iu,
      params: match => ({ object: tidy(match[1]), permission: tidy(match[2]) }) },
    { id: "permission-word", kind: "permission",
      pattern: /\b(?:permissions? (?:prevented|to|for|on)|do not have (?:the )?permission|not authori[sz]ed|access (?:is )?denied|saknar behörighet|behörighet(?:er)? (?:för|att|saknas)|har inte behörighet)/iu,
      params: () => ({}) },
    // "Posting Date must have a value in Sales Header: Document Type=Order, No.=1001. It cannot be zero or empty."
    { id: "required-value-en", kind: "required-value",
      pattern: /(?:^|[.\n]\s*)([^.\n]{1,80}?) must have a value in ([^:.\n]{1,80})(?::\s*([^\n]+?))?(?:\.\s|\.$|\n|$)/u,
      params: match => ({ field: tidy(match[1]), table: tidy(match[2]), record: tidy(match[3]) }) },
    { id: "required-value-sv", kind: "required-value",
      pattern: /(?:^|[.\n]\s*)([^.\n]{1,80}?) måste ha ett värde i ([^:.\n]{1,80})(?::\s*([^\n]+?))?(?:\.\s|\.$|\n|$)/u,
      params: match => ({ field: tidy(match[1]), table: tidy(match[2]), record: tidy(match[3]) }) },
    // A status code is the same in every language.
    { id: "http-rejected", kind: "network-rejected",
      pattern: /\bHTTP(?:\/\d(?:\.\d)?)?\s*(?:status\s*(?:code)?\s*:?\s*)?(4\d\d)\b/iu,
      params: match => ({ status: match[1] }) },
    { id: "http-unavailable", kind: "network-unavailable",
      pattern: /\bHTTP(?:\/\d(?:\.\d)?)?\s*(?:status\s*(?:code)?\s*:?\s*)?(5\d\d)\b/iu,
      params: match => ({ status: match[1] }) },
    { id: "connection-failed", kind: "network-unavailable",
      pattern: /\b(?:could not (?:connect|reach)|unable to connect|connection (?:failed|was lost|was refused|refused|timed out)|the operation timed out|request timed out|kunde inte ansluta|anslutningen (?:misslyckades|bröts|avbröts)|tidsgränsen (?:för|överskreds))/iu,
      params: () => ({}) }
  ]);

  // Business Central's own error messages in every language, as matchers: the Base
  // Application's labels (%1, %2…) and the platform's messages ({0}, {1}…). A backslash in a label
  // is a line break. A label with a long fixed text may appear inside a longer message (a field
  // error puts the field and record around it); a short one must be a whole line of the message.
  // A platform message must start a line, and its values are read in the order the message gives
  // them, so the names a suggestion quotes come from the captured message itself.
  const LONG_LABEL = 25;
  const PLACEHOLDER = /%(\d+)|\{(\d+)\}/gu;
  const QUOTE = "['’‘‚„“”\"«»]";
  const EDGE_QUOTES = new RegExp(`^${QUOTE}+|${QUOTE}+$`, "gu");
  let labelMatchers = null;
  function labelData() {
    try {
      if (typeof module === "object" && module.exports) return require("./error-labels.js");
    } catch { /* not bundled with the labels */ }
    return globalThis.T9ErrorLabels || null;
  }
  const escape = part => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").replace(/\s+/gu, "\\s+")
    .replace(new RegExp(QUOTE, "gu"), `${QUOTE}?`);
  // A value in quotes loses them; a value with quotes inside ("No.='10000'") keeps them.
  const unquote = value => {
    const trimmed = text(value).replace(/[\u200B-\u200F\uFEFF]/gu, "").trim();
    const inner = trimmed.replace(EDGE_QUOTES, "");
    return new RegExp(QUOTE, "u").test(inner) ? trimmed : inner.trim();
  };
  // read: the numbers of the values that are read from the message, for a platform message.
  function compile(label, platform, read = []) {
    let raw = label.replace(/\u200B/gu, "");
    // A platform message may go on with advice that changes between versions (a session ID, a
    // help page): it is recognized up to the end of the sentence or line that holds its last
    // value that is read.
    let cut = "";
    if (platform) {
      const last = [...raw.matchAll(PLACEHOLDER)].filter(match =>
        read.includes(Number(match[1] ?? match[2]))).pop();
      if (last) {
        const after = last.index + last[0].length;
        const stop = raw.slice(after).search(/[.!?](?=\s|$)|\r?\n/u);
        if (stop >= 0 && raw.slice(after + stop + 1).trim()) {
          cut = /[.!?]/u.test(raw[after + stop]) ? "sentence" : "line";
          raw = raw.slice(0, after + stop);
        }
      }
    }
    let template = raw.replace(/\\+/gu, " ").replace(/\s+/gu, " ").trim().replace(/\.+$/u, "");
    const fixed = template.replace(PLACEHOLDER, "").replace(/\s+/gu, " ").trim();
    if (fixed.length < 8) return null;
    // A label whose values are named must start a line, so that its first value is read whole.
    const named = !platform && read.length > 0;
    const long = !platform && !named && fixed.length >= LONG_LABEL;
    // Inside a longer message the values at either end are not needed to recognize a label.
    const used = long ? template.replace(/^(?:%\d+[\s,]*)+|(?:[\s,.]*%\d+)+$/gu, "").trim() : template;
    const order = [];
    let body = "";
    let position = 0;
    for (const match of used.matchAll(PLACEHOLDER)) {
      body += `${escape(used.slice(position, match.index))}(.*?)`;
      order.push(Number(match[1] ?? match[2]));
      position = match.index + match[0].length;
    }
    body += escape(used.slice(position));
    // A sentence ends with its own punctuation, a line at its line break, a whole message at its end.
    const ending = cut === "sentence" ? "\\s*[.!?](?=\\s|$)" : cut === "line" ? "\\s*$"
      : named ? "(?:\\s*[.!?](?=\\s|$)|\\s*$)" : "\\s*\\.?\\s*$";
    return { pattern: new RegExp(long ? body : `^\\s*${body}${ending}`, "dimu"), order, length: fixed.length };
  }
  function matchers() {
    if (labelMatchers) return labelMatchers;
    const data = labelData();
    if (!data?.kinds) return [];
    labelMatchers = [];
    for (const [kind, locales] of Object.entries(data.kinds)) {
      for (const [locale, labels] of Object.entries(locales)) {
        // A label is its text, or [text, params] when the cause names some of its values.
        for (const item of labels) {
          const [label, params = {}] = [].concat(item);
          const compiled = compile(label, false, Object.values(params).flat());
          if (compiled) labelMatchers.push({ ...compiled, kind, locale, source: "bc-label", params });
        }
      }
    }
    for (const entry of data.platform || []) {
      for (const [locale, message] of Object.entries(entry.texts || {})) {
        const compiled = compile(message, true, Object.values(entry.params || {}).flat());
        if (compiled) {
          labelMatchers.push({ ...compiled, kind: entry.kind, locale, source: "bc-platform",
            key: entry.key, params: entry.params || {} });
        }
      }
    }
    labelMatchers.sort((first, second) => second.length - first.length);
    return labelMatchers;
  }
  // The names a platform message gives: each value by its number, joined when a name is several.
  function namedValues(matcher, match) {
    const params = {};
    for (const [name, numbers] of Object.entries(matcher.params)) {
      const groups = (Array.isArray(numbers) ? numbers : [numbers]).map(number => matcher.order.indexOf(number) + 1)
        .filter(group => group > 0 && match[group]);
      // A name of several values that has words between them in this language ("document Facture
      // achat 107203") is quoted as the message has it, so that it never shows text the message lacks.
      const spans = match.indices ? groups.map(group => match.indices[group]).sort((a, b) => a[0] - b[0]) : [];
      const worded = spans.length > 1 && spans.slice(1).some((span, index) => /\p{L}/u.test(match.input.slice(spans[index][1], span[0])));
      const value = worded ? match.input.slice(spans[0][0], spans[spans.length - 1][1]).replace(/\s+/gu, " ")
        : groups.map(group => unquote(match[group])).filter(Boolean).join(" ");
      if (value) params[name] = value;
    }
    return params;
  }
  // The most specific message that matches: the one with the longest fixed text.
  function labelCause(message) {
    for (const matcher of matchers()) {
      const match = matcher.pattern.exec(message);
      if (!match) continue;
      const params = namedValues(matcher, match);
      if (matcher.kind === "required-value" && !params.field) continue;
      return Object.freeze({ kind: matcher.kind,
        ruleId: matcher.key ? `bc-platform-${matcher.key}` : `bc-label-${matcher.kind}`,
        params: Object.freeze(params), source: matcher.source, locale: matcher.locale, version: VERSION });
    }
    return null;
  }

  // Known errors: every error message of the Base Application and Microsoft's other apps in every
  // language, with the objects that show it and the actions Microsoft offers in it
  // (error-known.json, built by scripts/build-error-labels.js). The table is large, so a page
  // loads it when it needs it (loadKnown); until then a cause has no origin.
  const KNOWN_FILE = "bug-report/error-known.json";
  const MORE_OBJECTS = 3;
  let knownData = null;
  let knownIndex = null;
  let knownLoading = null;
  // A page can hold more than one copy of this module (the PDF bundle has its own), so a loaded
  // table is shared through globalThis.
  function useKnown(data) {
    knownData = Array.isArray(data?.errors) && Array.isArray(data?.locales) ? data : null;
    knownIndex = null;
    if (knownData) globalThis.T9ErrorKnown = knownData;
    return Boolean(knownData);
  }
  function knownTable() {
    if (!knownData && globalThis.T9ErrorKnown) useKnown(globalThis.T9ErrorKnown);
    if (!knownData && typeof module === "object" && module.exports && typeof require === "function") {
      // In Node the table is read from the file next to this one; a bundle leaves it out.
      const file = `./${KNOWN_FILE.split("/").pop()}`;
      try { useKnown(require(file)); } catch { /* not available here */ }
    }
    return knownData;
  }
  // The user's own apps, read on this computer from .app files added in the settings
  // (app-errors.js): each has a table like error-known.json. Shared through globalThis too.
  const APP_ERRORS_KEY = globalThis.T9StorageKeys?.KNOWN_APP_ERRORS_KEY || "t9_known_app_errors";
  let appTables = null;
  function useAppErrors(apps) {
    const tables = (Array.isArray(apps) ? apps : []).map(app => app?.table)
      .filter(table => Array.isArray(table?.errors) && Array.isArray(table?.locales) && Array.isArray(table?.apps));
    appTables = tables;
    globalThis.T9ErrorKnownApps = tables;
    knownIndex = null;
    return tables.length;
  }
  function userTables() {
    if (globalThis.T9ErrorKnownApps && globalThis.T9ErrorKnownApps !== appTables) {
      appTables = globalThis.T9ErrorKnownApps;
      knownIndex = null;
    }
    return appTables || [];
  }
  // The tables to compare a message with: Microsoft's, then the user's apps.
  const tables = () => [knownTable(), ...userTables()].filter(Boolean);
  // The user's apps are read again each time, so that an app added or removed in the settings
  // counts at the next error.
  async function loadAppErrors() {
    const storage = globalThis.chrome?.storage?.local;
    if (!storage?.get) return false;
    try {
      const stored = await storage.get(APP_ERRORS_KEY);
      useAppErrors(stored?.[APP_ERRORS_KEY]?.apps);
      return true;
    } catch {
      return false;
    }
  }
  function loadKnown() {
    const apps = loadAppErrors();
    if (knownTable()) return apps.then(() => true);
    if (knownLoading) return knownLoading;
    const url = globalThis.chrome?.runtime?.getURL?.(KNOWN_FILE) || KNOWN_FILE;
    knownLoading = (typeof fetch === "function" ? fetch(url) : Promise.reject(new Error("no fetch")))
      .then(response => response.ok ? response.json() : null).then(useKnown)
      .catch(() => false).then(async loaded => { await apps; return loaded; })
      .finally(() => { knownLoading = null; });
    return knownLoading;
  }
  // The longest piece of a label without values, quotes or line breaks: a message that does not
  // contain it cannot be that label, so only a few labels are compared in full.
  const plain = value => text(value).replace(/[\u200B-\u200F\uFEFF]/gu, "").replace(/\s+/gu, " ");
  function fragment(label) {
    return plain(label).split(new RegExp(`%\\d+|\\\\|${QUOTE}`, "u")).map(piece => piece.trim().replace(/\.+$/u, ""))
      .reduce((longest, piece) => piece.length > longest.length ? piece : longest, "");
  }
  function knownMatchers() {
    userTables();
    if (knownIndex) return knownIndex;
    knownIndex = [];
    for (const table of tables()) {
      table.errors.forEach((entry, index) => {
        const seen = new Set();
        (entry[1] || []).forEach((value, position) => [].concat(value || []).forEach(label => {
          if (seen.has(label)) return;
          seen.add(label);
          const piece = fragment(label);
          if (piece.length >= 6) knownIndex.push({ table, index, label, piece, locale: table.locales[position] });
        }));
      });
    }
    return knownIndex;
  }
  // The known error whose label matches the message best: the one with the longest fixed text.
  function knownMatch(message) {
    if (!tables().length) return null;
    const flat = plain(message);
    let best = null;
    for (const item of knownMatchers()) {
      if (!flat.includes(item.piece)) continue;
      const params = item.table.errors[item.index][4] || {};
      if (item.compiled === undefined) item.compiled = compile(item.label, false, Object.values(params).flat());
      if (!item.compiled || (best && item.compiled.length <= best.length)) continue;
      const match = item.compiled.pattern.exec(message);
      if (match) best = { ...item, length: item.compiled.length, match };
    }
    if (!best) return null;
    const table = best.table;
    const [objects, , actions = [], kind = "", names = {}] = table.errors[best.index];
    const english = table.locales.indexOf("en-US");
    const origin = objects.slice(0, MORE_OBJECTS).map(([app, object]) =>
      Object.freeze({ app: text(table.apps?.[app]), object: text(object) }));
    return { locale: best.locale, kind, params: kind ? namedValues({ order: best.compiled.order, params: names }, best.match) : {},
      origin: Object.freeze(origin), more: Math.max(0, objects.length - MORE_OBJECTS),
      actions: Object.freeze(actions.map(action => Object.freeze(Object.fromEntries(table.locales
        .map((locale, position) => [locale, text(action[position]) || text(action[english])])
        .filter(([, caption]) => caption))))) };
  }
  // A cause with where its message comes from and the actions offered in it.
  const withKnown = (cause, known) => Object.freeze(known
    ? { ...cause, origin: known.origin, moreOrigins: known.more, actions: known.actions } : cause);

  // The first cause that one of the messages names, primary error first: Business Central's own
  // label, then the rules, then any other known error of Microsoft's apps.
  function suggest(messages = []) {
    for (const message of (Array.isArray(messages) ? messages : [messages]).map(text)) {
      if (!message.trim()) continue;
      const known = knownMatch(message);
      const fromLabel = labelCause(message);
      if (fromLabel) return withKnown(fromLabel, known);
      // A known error of a kind (a number series error of Business Foundation) has its own cause.
      if (known?.kind) {
        return withKnown({ kind: known.kind, ruleId: `bc-known-${known.kind}`, params: Object.freeze(known.params),
          source: "bc-known", locale: known.locale, version: VERSION }, known);
      }
      for (const rule of RULES) {
        const match = rule.pattern.exec(message);
        if (!match) continue;
        const params = Object.fromEntries(Object.entries(rule.params(match))
          .filter(([, value]) => text(value)));
        if (rule.kind === "required-value" && !params.field) continue;
        return withKnown({ kind: rule.kind, ruleId: rule.id, params: Object.freeze(params),
          source: "error-message", version: VERSION }, known);
      }
      if (known) {
        const apps = [...new Set(known.origin.map(item => item.app))];
        return withKnown({ kind: "known-error", ruleId: "bc-known",
          params: Object.freeze(apps.length === 1 && !known.more ? { app: apps[0] } : {}),
          source: "bc-known", locale: known.locale, version: VERSION }, known);
      }
    }
    return null;
  }

  // Texts in every registered language. {name} is replaced with a value quoted from the message.
  const T = Object.freeze({
    "en-US": {
      title: "Possible cause", unconfirmed: "Not confirmed", checks: "What you can check",
      why: "Why is this suggested?", include: "Include when the report is sent or exported",
      dismiss: "Doesn't fit, hide", hidden: "The possible cause is hidden.", show: "Show again",
      exportTitle: "Possible cause (not confirmed)", exportChecks: "What to check",
      "permission.params": "The user probably lacks the {permission} permission for {object}.",
      "permission": "The user probably lacks a permission that the action requires.",
      "permission.check1": "Which permission sets the user has in this company.",
      "permission.check2": "Whether the same action works for a user with more permissions.",
      "permission.check3": "Whether permissions changed recently, for example in an upgrade.",
      "permission.why": "The error message says that a permission is missing. It does not say which permission set should have given it.",
      "required-value.params": "The field {field} in {table} is empty, and Business Central requires a value there.",
      "required-value": "The field {field} is empty, and Business Central requires a value there.",
      "required-value.check1": "Whether {field} is filled in.",
      "required-value.check2": "Whether a setup page or a customer, vendor or item card should have filled in the value.",
      "required-value.check3": "Whether the error occurs only for some records.",
      "required-value.why": "The error message names the field that must have a value. The field and table come from the message itself.",
      "network-unavailable.params": "A service that Business Central calls did not answer as expected (HTTP {status}). The fault is probably outside Business Central.",
      "network-unavailable": "A connection that Business Central needs failed. The fault is probably outside Business Central.",
      "network-unavailable.check1": "Whether the service is available right now.",
      "network-unavailable.check2": "Whether the same action works in a while.",
      "network-unavailable.check3": "Whether the address of the service is set correctly in the setup of the integration.",
      "network-unavailable.why": "The error message contains an HTTP status code or says that the connection failed. It does not say which service answered.",
      "network-rejected.params": "A service that Business Central calls rejected the request (HTTP {status}).",
      "network-rejected.check1": "Whether the sign-in or key for the connection is still valid.",
      "network-rejected.check2": "Whether the address of the service is set correctly in the setup of the integration.",
      "network-rejected.check3": "Whether the service has changed what it accepts, for example after an update.",
      "network-rejected.why": "The error message contains an HTTP status code that means the request was rejected. It does not say which service answered.",
      "posting-date": "The posting date is outside the dates the user is allowed to post on.",
      "posting-date.check1": "Which posting date the document or journal line has.",
      "posting-date.check2": "Which dates the user may post on. They can be set for the user and for the whole company.",
      "posting-date.check3": "Whether the period should be open, for example at the start of a new month or year.",
      "nothing-to-post": "The document or journal has no quantity or amount left to post.",
      "nothing-to-post.check1": "Whether the lines have a quantity or an amount.",
      "nothing-to-post.check2": "Whether the quantity to ship, receive or invoice is filled in on the lines.",
      "nothing-to-post.check3": "Whether the lines were already posted earlier.",
      "out-of-balance": "The amounts do not add up to zero, so the entries are out of balance.",
      "out-of-balance.check1": "Whether every line has the right amount and sign.",
      "out-of-balance.check2": "Whether a balancing account is missing on a line.",
      "out-of-balance.check3": "Whether lines with the same document number and posting date belong together.",
      "already-scheduled": "The document is already waiting to be posted in the background, or an earlier background posting stopped.",
      "already-scheduled.check1": "Whether the document has an entry in the job queue, and what its status is.",
      "already-scheduled.check2": "Whether an earlier background posting ended with an error.",
      "already-scheduled.check3": "Whether the message's own advice, removing the document from the job queue, lets you post it again.",
      "not-on-inventory": "There is not enough of the item in inventory for what the line is to handle.",
      "not-on-inventory.check1": "How much of the item is in inventory at the location on the posting date.",
      "not-on-inventory.check2": "Whether the quantity is reserved for another document.",
      "not-on-inventory.check3": "Whether a receipt or purchase that should come first has been posted.",
      "dimension-blocked": "The dimension values used together on the document or line form a combination that is blocked.",
      "dimension-blocked.check1": "Which dimension values the document and its lines have.",
      "dimension-blocked.check2": "Which dimension combinations are blocked in the setup of dimensions.",
      "dimension-blocked.check3": "Whether a default dimension on a customer, vendor, item or account gave the value.",
      "posting-setup-missing": "A posting setup that the posting needs is missing for a combination of posting groups or a location.",
      "posting-setup-missing.check1": "Which posting groups or which location the message names.",
      "posting-setup-missing.check2": "Whether the setup for that combination exists and has its accounts filled in.",
      "posting-setup-missing.check3": "Whether the posting group or location was added recently.",
      "record-blocked": "A customer, vendor, item or other record that the action uses is blocked.",
      "record-blocked.check1": "Whether the record that the message names is blocked on its card.",
      "record-blocked.check2": "Why it was blocked and who can unblock it.",
      "record-blocked.check3": "Whether another record that is not blocked should be used instead.",
      "bc-label.why": "The message is one of Business Central's standard error messages. It was recognized from Microsoft's own wording, which exists in every language. The cause and checks are general advice for this message, not a finding about your data.",
      "field-must-equal.params": "{field} must be {expected} for the action, but it is {current}.",
      "field-must-equal": "{field} must be {expected} for the action, and it is not.",
      "field-must-equal.check1": "Whether a step that changes {field}, such as releasing or approving the document, was skipped.",
      "field-must-equal.check2": "Whether {field} was changed back, for example by reopening the document.",
      "field-must-equal.check3": "Whether the error occurs only for some records.",
      "record-missing.params": "Business Central could not find the {table} record that the action needs ({record}).",
      "record-missing": "Business Central could not find the {table} record that the action needs.",
      "record-missing.check1": "Whether a {table} record with those values exists.",
      "record-missing.check2": "Whether a setup or card points to a code that has not been set up, such as a combination of posting groups.",
      "record-missing.check3": "Whether the record was deleted or renamed recently.",
      "related-missing.params": "{field} contains {value}, which does not exist in {related}.",
      "related-missing": "{field} contains a value that does not exist where Business Central looks it up.",
      "related-missing.check1": "Whether {value} exists in {related}.",
      "related-missing.check2": "Whether the value was typed differently, deleted or renamed.",
      "related-missing.check3": "Whether the value came from a default, a template or a copied record.",
      "record-exists.params": "A {table} record with the same values already exists ({record}).",
      "record-exists": "A {table} record with the same values already exists.",
      "record-exists.check1": "Whether the record was already created, for example because the action was run twice.",
      "record-exists.check2": "Whether a number series gives out a number that is already used.",
      "record-exists.check3": "Whether an import or integration creates the same record again.",
      "changed-by-other.params": "The {table} record was changed elsewhere after the page was opened, so the change was not saved.",
      "changed-by-other": "The record was changed elsewhere after the page was opened, so the change was not saved.",
      "changed-by-other.check1": "Whether another user or a background job changed the record at the same time.",
      "changed-by-other.check2": "Whether it works after closing the page, opening it again and repeating the change.",
      "changed-by-other.check3": "Whether an extension changes the record while the page saves it.",
      "deadlock.params": "Another user or a background job was changing {table} at the same time, so the action was stopped.",
      "deadlock": "Another user or a background job was changing the same data at the same time, so the action was stopped.",
      "deadlock.check1": "Whether the action works if you try again.",
      "deadlock.check2": "Whether a job queue entry or another user was posting at the same time.",
      "deadlock.check3": "Whether it happens often at certain times of the day.",
      "license-permission.params": "The user's license probably does not include the {permission} permission for {object}.",
      "license-permission": "The user's license probably does not include a permission that the action requires.",
      "license-permission.check1": "Which license the user has.",
      "license-permission.check2": "Whether the action requires a license that covers more, for example for an app or a feature.",
      "license-permission.check3": "Whether a user with another license can do the same action.",
      "not-an-option.params": "{value} is not one of the choices for the field. The choices are: {options}.",
      "not-an-option": "{value} is not one of the choices for the field.",
      "not-an-option.check1": "Whether the value was written in another language or with different wording.",
      "not-an-option.check2": "Whether the value comes from an import, an integration or a copied record.",
      "not-an-option.check3": "Whether an extension adds the choice in some companies only.",
      "platform.why": "The message is one of the Business Central platform's standard error messages. It was recognized from Microsoft's own wording, which exists in every language. The names come from the message itself. The cause and checks are general advice, not a finding about your data.",
      origin: "Probably shown by",
      actions: "Actions offered in the error message",
      "origin.in": "{objects} in {app}",
      "origin.more": "{objects} and {count} more",
      "known-error.params": "A check in Microsoft's {app} stopped the action. The message says what is missing or wrong.",
      "known-error": "A check in Business Central stopped the action. The message says what is missing or wrong.",
      "known-error.check1": "What the message says must be changed, and on which record or setup page.",
      "known-error.check2": "Whether the same action works for another record, which points to the data rather than the program.",
      "known-error.check3": "Whether the setup or data that the message names was changed recently.",
      "known-error.why": "The wording matches an error message in Microsoft's own apps, in any language. It shows where the message probably comes from, not why your data caused it. The checks are general advice.",
      "number-series.params": "The number series {series} cannot give out a new number, for example because its numbers are used up or no line is valid for the date.",
      "number-series": "A number series cannot give out a new number, for example because its numbers are used up or no line is valid for the date.",
      "number-series.check1": "Whether a line of the number series has a starting date on or before the date of the document.",
      "number-series.check2": "Whether the last number used has reached the ending number of the line.",
      "number-series.check3": "Whether the line is open and the series allows default numbers where the number is assigned automatically.",
      "posted-number-used.params": "The number {number} that the number series gives the posted document is already used, so the document cannot be posted.",
      "posted-number-used": "The number that the number series gives the posted document is already used, so the document cannot be posted.",
      "posted-number-used.check1": "Whether the last number used on the number series line is lower than numbers that already exist.",
      "posted-number-used.check2": "Whether documents were imported or created with numbers from the same series.",
      "posted-number-used.check3": "Whether two number series give out numbers in the same range.",
      "dimension-mandatory.params": "A value for {dimension} is required for {record}, and none is selected.",
      "dimension-mandatory": "A dimension that must have a value has none on the document or one of its lines.",
      "dimension-mandatory.check1": "Which dimension values the document and its lines have.",
      "dimension-mandatory.check2": "Whether the default dimensions of the customer, vendor, item or account require a value.",
      "dimension-mandatory.check3": "Whether the value is missing only on some lines.",
      "item-tracking-required.params": "Item {item} requires a lot, serial or package number, and none is assigned on the line.",
      "item-tracking-required": "The item requires a lot, serial or package number, and none is assigned on the line.",
      "item-tracking-required.check1": "Whether item tracking lines are assigned on the document line.",
      "item-tracking-required.check2": "Whether the item tracking code of the item requires tracking for this kind of transaction.",
      "item-tracking-required.check3": "Whether the quantity in the item tracking lines matches the quantity on the line.",
      "item-tracking-mismatch": "The quantity in the item tracking lines does not match the quantity on the document line.",
      "item-tracking-mismatch.check1": "Whether the quantity to handle in the item tracking lines equals the quantity to ship, receive or post.",
      "item-tracking-mismatch.check2": "Whether the quantity on the line was changed after item tracking was assigned.",
      "item-tracking-mismatch.check3": "Whether the lot or serial numbers are available at the location and bin.",
      "approval-required": "The document must be approved before the action can be done, or it is still waiting for approval.",
      "approval-required.check1": "Whether an approval request was sent, and what its status is.",
      "approval-required.check2": "Whether an approval workflow is enabled for this kind of document.",
      "approval-required.check3": "Whether the document was changed after it was approved, which may have reopened it.",
      "duplicate-external-doc.params": "The vendor's document {document} is already used on another document from the same vendor.",
      "duplicate-external-doc": "The vendor's document number is already used on another document from the same vendor.",
      "duplicate-external-doc.check1": "Whether the vendor's invoice or credit memo number is typed correctly.",
      "duplicate-external-doc.check2": "Whether the same invoice was already posted, or is on another open document.",
      "duplicate-external-doc.check3": "Whether the purchase setup requires the vendor's document number to be unique.",
      "nothing-to-handle": "There is nothing left to handle: the lines have no quantity to handle, or everything is already picked, put away or handled.",
      "nothing-to-handle.check1": "Whether the lines have a quantity to handle.",
      "nothing-to-handle.check2": "Whether the source document is released, and whether its quantities are already picked or put away.",
      "nothing-to-handle.check3": "Whether the location, bin or filters of the action leave the lines out.",
      "warehouse-handling-required": "The location requires warehouse handling, so the quantity must first be handled with warehouse documents, such as a shipment, receipt, pick or put-away.",
      "warehouse-handling-required.check1": "Which warehouse handling the location requires.",
      "warehouse-handling-required.check2": "Whether a warehouse document exists for the line, and whether it is registered or posted.",
      "warehouse-handling-required.check3": "Whether the line should use another location.",
      "accounting-period-missing": "The accounting periods that the action needs are not set up, for example for the dates of the document or of a deferral schedule.",
      "accounting-period-missing.check1": "Whether accounting periods exist for the dates of the document or schedule.",
      "accounting-period-missing.check2": "Whether a new fiscal year needs to be created.",
      "accounting-period-missing.check3": "Whether a date is far in the future or the past by mistake.",
      "basis": "Compared with Microsoft's messages from Business Central {version}. A newer version can word a message differently."
    },
    "sv-SE": {
      title: "Möjlig orsak", unconfirmed: "Inte bekräftad", checks: "Det här kan du kontrollera",
      why: "Varför föreslås det här?", include: "Ta med när rapporten skickas eller exporteras",
      dismiss: "Stämmer inte, dölj", hidden: "Den möjliga orsaken är dold.", show: "Visa igen",
      exportTitle: "Möjlig orsak (inte bekräftad)", exportChecks: "Att kontrollera",
      "permission.params": "Användaren saknar troligen behörigheten {permission} för {object}.",
      "permission": "Användaren saknar troligen en behörighet som åtgärden kräver.",
      "permission.check1": "Vilka behörighetsuppsättningar användaren har i det här företaget.",
      "permission.check2": "Om samma åtgärd fungerar för en användare med fler behörigheter.",
      "permission.check3": "Om behörigheterna ändrades nyligen, till exempel vid en uppgradering.",
      "permission.why": "Felmeddelandet säger att en behörighet saknas. Det säger inte vilken behörighetsuppsättning som borde ha gett den.",
      "required-value.params": "Fältet {field} i {table} är tomt, och Business Central kräver ett värde där.",
      "required-value": "Fältet {field} är tomt, och Business Central kräver ett värde där.",
      "required-value.check1": "Om {field} är ifyllt.",
      "required-value.check2": "Om en inställningssida eller ett kund-, leverantörs- eller artikelkort borde ha fyllt i värdet.",
      "required-value.check3": "Om felet bara uppstår för vissa poster.",
      "required-value.why": "Felmeddelandet anger fältet som måste ha ett värde. Fältet och tabellen kommer från meddelandet självt.",
      "network-unavailable.params": "En tjänst som Business Central anropar svarade inte som väntat (HTTP {status}). Felet ligger troligen utanför Business Central.",
      "network-unavailable": "En anslutning som Business Central behöver misslyckades. Felet ligger troligen utanför Business Central.",
      "network-unavailable.check1": "Om tjänsten är tillgänglig just nu.",
      "network-unavailable.check2": "Om samma åtgärd fungerar om en stund.",
      "network-unavailable.check3": "Om tjänstens adress är rätt inställd i integrationens inställningar.",
      "network-unavailable.why": "Felmeddelandet innehåller en HTTP-statuskod eller säger att anslutningen misslyckades. Det säger inte vilken tjänst som svarade.",
      "network-rejected.params": "En tjänst som Business Central anropar avvisade begäran (HTTP {status}).",
      "network-rejected.check1": "Om inloggningen eller nyckeln för anslutningen fortfarande gäller.",
      "network-rejected.check2": "Om tjänstens adress är rätt inställd i integrationens inställningar.",
      "network-rejected.check3": "Om tjänsten har ändrat vad den tar emot, till exempel efter en uppdatering.",
      "network-rejected.why": "Felmeddelandet innehåller en HTTP-statuskod som betyder att begäran avvisades. Det säger inte vilken tjänst som svarade.",
      "posting-date": "Bokföringsdatumet ligger utanför de datum som användaren får bokföra på.",
      "posting-date.check1": "Vilket bokföringsdatum dokumentet eller journalraden har.",
      "posting-date.check2": "Vilka datum användaren får bokföra på. De kan anges för användaren och för hela företaget.",
      "posting-date.check3": "Om perioden borde vara öppen, till exempel i början av en ny månad eller ett nytt år.",
      "nothing-to-post": "Dokumentet eller journalen har inget antal eller belopp kvar att bokföra.",
      "nothing-to-post.check1": "Om raderna har ett antal eller ett belopp.",
      "nothing-to-post.check2": "Om antal att leverera, ta emot eller fakturera är ifyllt på raderna.",
      "nothing-to-post.check3": "Om raderna redan har bokförts tidigare.",
      "out-of-balance": "Beloppen blir inte noll tillsammans, så transaktionerna balanserar inte.",
      "out-of-balance.check1": "Om varje rad har rätt belopp och tecken.",
      "out-of-balance.check2": "Om ett motkonto saknas på någon rad.",
      "out-of-balance.check3": "Om rader med samma dokumentnummer och bokföringsdatum hör ihop.",
      "already-scheduled": "Dokumentet väntar redan på att bokföras i bakgrunden, eller så avbröts en tidigare bakgrundsbokföring.",
      "already-scheduled.check1": "Om dokumentet har en post i jobbkön och vilken status den har.",
      "already-scheduled.check2": "Om en tidigare bakgrundsbokföring slutade med ett fel.",
      "already-scheduled.check3": "Om meddelandets eget råd, att ta bort dokumentet från jobbkön, gör att det går att bokföra igen.",
      "not-on-inventory": "Det finns inte tillräckligt av artikeln i lager för det som raden ska hantera.",
      "not-on-inventory.check1": "Hur mycket av artikeln som finns i lager på lagerstället på bokföringsdatumet.",
      "not-on-inventory.check2": "Om antalet är reserverat för ett annat dokument.",
      "not-on-inventory.check3": "Om en inleverans eller ett inköp som borde komma först har bokförts.",
      "dimension-blocked": "Dimensionsvärdena som används tillsammans på dokumentet eller raden bildar en kombination som är spärrad.",
      "dimension-blocked.check1": "Vilka dimensionsvärden dokumentet och dess rader har.",
      "dimension-blocked.check2": "Vilka dimensionskombinationer som är spärrade i inställningarna för dimensioner.",
      "dimension-blocked.check3": "Om en standarddimension på en kund, leverantör, artikel eller ett konto gav värdet.",
      "posting-setup-missing": "En bokföringsinställning som bokföringen behöver saknas för en kombination av bokföringsmallar eller ett lagerställe.",
      "posting-setup-missing.check1": "Vilka bokföringsmallar eller vilket lagerställe meddelandet nämner.",
      "posting-setup-missing.check2": "Om inställningen för den kombinationen finns och har sina konton ifyllda.",
      "posting-setup-missing.check3": "Om bokföringsmallen eller lagerstället har lagts till nyligen.",
      "record-blocked": "En kund, leverantör, artikel eller annan post som åtgärden använder är spärrad.",
      "record-blocked.check1": "Om posten som meddelandet nämner är spärrad på sitt kort.",
      "record-blocked.check2": "Varför den spärrades och vem som kan häva spärren.",
      "record-blocked.check3": "Om en annan post som inte är spärrad borde användas i stället.",
      "bc-label.why": "Meddelandet är ett av Business Centrals vanliga felmeddelanden. Det kändes igen på Microsofts egen formulering, som finns på alla språk. Orsaken och kontrollerna är allmänna råd för det här meddelandet, inte en slutsats om era data.",
      "field-must-equal.params": "{field} måste vara {expected} för åtgärden, men är {current}.",
      "field-must-equal": "{field} måste vara {expected} för åtgärden, och det är det inte.",
      "field-must-equal.check1": "Om ett steg som ändrar {field}, till exempel att släppa eller godkänna dokumentet, hoppades över.",
      "field-must-equal.check2": "Om {field} ändrades tillbaka, till exempel när dokumentet öppnades igen.",
      "field-must-equal.check3": "Om felet bara uppstår för vissa poster.",
      "record-missing.params": "Business Central hittade inte posten {table} som åtgärden behöver ({record}).",
      "record-missing": "Business Central hittade inte posten {table} som åtgärden behöver.",
      "record-missing.check1": "Om det finns en post i {table} med de värdena.",
      "record-missing.check2": "Om en inställning eller ett kort pekar på en kod som inte har satts upp, till exempel en kombination av bokföringsmallar.",
      "record-missing.check3": "Om posten har tagits bort eller bytt namn nyligen.",
      "related-missing.params": "{field} innehåller {value}, som inte finns i {related}.",
      "related-missing": "{field} innehåller ett värde som inte finns där Business Central slår upp det.",
      "related-missing.check1": "Om {value} finns i {related}.",
      "related-missing.check2": "Om värdet skrevs på ett annat sätt, togs bort eller bytte namn.",
      "related-missing.check3": "Om värdet kom från en standardinställning, en mall eller en kopierad post.",
      "record-exists.params": "Det finns redan en post i {table} med samma värden ({record}).",
      "record-exists": "Det finns redan en post i {table} med samma värden.",
      "record-exists.check1": "Om posten redan skapades, till exempel för att åtgärden kördes två gånger.",
      "record-exists.check2": "Om en nummerserie delar ut ett nummer som redan används.",
      "record-exists.check3": "Om en import eller integration skapar samma post igen.",
      "changed-by-other.params": "Posten {table} ändrades på annat håll efter att sidan öppnades, så ändringen sparades inte.",
      "changed-by-other": "Posten ändrades på annat håll efter att sidan öppnades, så ändringen sparades inte.",
      "changed-by-other.check1": "Om en annan användare eller ett bakgrundsjobb ändrade posten samtidigt.",
      "changed-by-other.check2": "Om det fungerar att stänga sidan, öppna den igen och göra om ändringen.",
      "changed-by-other.check3": "Om ett tillägg ändrar posten medan sidan sparar den.",
      "deadlock.params": "En annan användare eller ett bakgrundsjobb ändrade {table} samtidigt, så åtgärden stoppades.",
      "deadlock": "En annan användare eller ett bakgrundsjobb ändrade samma data samtidigt, så åtgärden stoppades.",
      "deadlock.check1": "Om åtgärden fungerar när du försöker igen.",
      "deadlock.check2": "Om en post i jobbkön eller en annan användare bokförde samtidigt.",
      "deadlock.check3": "Om det ofta händer vid vissa tider på dagen.",
      "license-permission.params": "Användarens licens omfattar troligen inte behörigheten {permission} för {object}.",
      "license-permission": "Användarens licens omfattar troligen inte en behörighet som åtgärden kräver.",
      "license-permission.check1": "Vilken licens användaren har.",
      "license-permission.check2": "Om åtgärden kräver en licens som omfattar mer, till exempel för en app eller en funktion.",
      "license-permission.check3": "Om en användare med en annan licens kan göra samma åtgärd.",
      "not-an-option.params": "{value} är inte ett av alternativen för fältet. Alternativen är: {options}.",
      "not-an-option": "{value} är inte ett av alternativen för fältet.",
      "not-an-option.check1": "Om värdet skrevs på ett annat språk eller med andra ord.",
      "not-an-option.check2": "Om värdet kommer från en import, en integration eller en kopierad post.",
      "not-an-option.check3": "Om ett tillägg lägger till alternativet bara i vissa företag.",
      "platform.why": "Meddelandet är ett av Business Central-plattformens vanliga felmeddelanden. Det kändes igen på Microsofts egen formulering, som finns på alla språk. Namnen kommer från meddelandet självt. Orsaken och kontrollerna är allmänna råd, inte en slutsats om era data.",
      origin: "Visas troligen av",
      actions: "Åtgärder som erbjuds i felmeddelandet",
      "origin.in": "{objects} i {app}",
      "origin.more": "{objects} och {count} till",
      "known-error.params": "En kontroll i Microsofts {app} stoppade åtgärden. Meddelandet säger vad som saknas eller är fel.",
      "known-error": "En kontroll i Business Central stoppade åtgärden. Meddelandet säger vad som saknas eller är fel.",
      "known-error.check1": "Vad meddelandet säger måste ändras, och på vilken post eller inställningssida.",
      "known-error.check2": "Om samma åtgärd fungerar för en annan post, vilket pekar på data snarare än på programmet.",
      "known-error.check3": "Om inställningen eller de data som meddelandet nämner har ändrats nyligen.",
      "known-error.why": "Formuleringen stämmer med ett felmeddelande i Microsofts egna appar, på vilket språk som helst. Den visar var meddelandet troligen kommer ifrån, inte varför era data orsakade det. Kontrollerna är allmänna råd.",
      "number-series.params": "Nummerserien {series} kan inte ge ett nytt nummer, till exempel för att numren är slut eller ingen rad gäller för datumet.",
      "number-series": "En nummerserie kan inte ge ett nytt nummer, till exempel för att numren är slut eller ingen rad gäller för datumet.",
      "number-series.check1": "Om en rad i nummerserien har ett startdatum som är samma som eller före dokumentets datum.",
      "number-series.check2": "Om det senast använda numret har nått radens slutnummer.",
      "number-series.check3": "Om raden är öppen och serien tillåter standardnummer där numret tilldelas automatiskt.",
      "posted-number-used.params": "Numret {number} som nummerserien ger det bokförda dokumentet används redan, så dokumentet kan inte bokföras.",
      "posted-number-used": "Numret som nummerserien ger det bokförda dokumentet används redan, så dokumentet kan inte bokföras.",
      "posted-number-used.check1": "Om det senast använda numret på nummerserieraden är lägre än nummer som redan finns.",
      "posted-number-used.check2": "Om dokument har importerats eller skapats med nummer från samma serie.",
      "posted-number-used.check3": "Om två nummerserier ger nummer i samma intervall.",
      "dimension-mandatory.params": "Ett värde för {dimension} krävs för {record}, och inget är valt.",
      "dimension-mandatory": "En dimension som måste ha ett värde saknar värde på dokumentet eller någon av dess rader.",
      "dimension-mandatory.check1": "Vilka dimensionsvärden dokumentet och dess rader har.",
      "dimension-mandatory.check2": "Om standarddimensionerna för kunden, leverantören, artikeln eller kontot kräver ett värde.",
      "dimension-mandatory.check3": "Om värdet bara saknas på vissa rader.",
      "item-tracking-required.params": "Artikel {item} kräver ett parti-, serie- eller paketnummer, och inget är tilldelat på raden.",
      "item-tracking-required": "Artikeln kräver ett parti-, serie- eller paketnummer, och inget är tilldelat på raden.",
      "item-tracking-required.check1": "Om artikelspårningsrader är tilldelade på dokumentraden.",
      "item-tracking-required.check2": "Om artikelns artikelspårningskod kräver spårning för den här typen av transaktion.",
      "item-tracking-required.check3": "Om antalet i artikelspårningsraderna stämmer med antalet på raden.",
      "item-tracking-mismatch": "Antalet i artikelspårningsraderna stämmer inte med antalet på dokumentraden.",
      "item-tracking-mismatch.check1": "Om antalet att hantera i artikelspårningsraderna är lika med antalet som ska levereras, tas emot eller bokföras.",
      "item-tracking-mismatch.check2": "Om antalet på raden ändrades efter att artikelspårning tilldelades.",
      "item-tracking-mismatch.check3": "Om parti- eller serienumren finns på lagerstället och lagerplatsen.",
      "approval-required": "Dokumentet måste godkännas innan åtgärden kan göras, eller så väntar det fortfarande på godkännande.",
      "approval-required.check1": "Om en godkännandebegäran har skickats och vilken status den har.",
      "approval-required.check2": "Om ett arbetsflöde för godkännande är aktiverat för den här typen av dokument.",
      "approval-required.check3": "Om dokumentet ändrades efter att det godkändes, vilket kan ha öppnat det igen.",
      "duplicate-external-doc.params": "Leverantörens dokument {document} används redan på ett annat dokument från samma leverantör.",
      "duplicate-external-doc": "Leverantörens dokumentnummer används redan på ett annat dokument från samma leverantör.",
      "duplicate-external-doc.check1": "Om leverantörens faktura- eller kreditnotanummer är rätt inskrivet.",
      "duplicate-external-doc.check2": "Om samma faktura redan har bokförts eller finns på ett annat öppet dokument.",
      "duplicate-external-doc.check3": "Om inköpsinställningarna kräver att leverantörens dokumentnummer är unikt.",
      "nothing-to-handle": "Det finns inget kvar att hantera: raderna har inget antal att hantera, eller så är allt redan plockat, inlagrat eller hanterat.",
      "nothing-to-handle.check1": "Om raderna har ett antal att hantera.",
      "nothing-to-handle.check2": "Om källdokumentet är frisläppt och om dess antal redan är plockade eller inlagrade.",
      "nothing-to-handle.check3": "Om åtgärdens lagerställe, lagerplats eller filter utesluter raderna.",
      "warehouse-handling-required": "Lagerstället kräver lagerhantering, så antalet måste först hanteras med lagerdokument, till exempel en utleverans, inleverans, plockning eller inlagring.",
      "warehouse-handling-required.check1": "Vilken lagerhantering lagerstället kräver.",
      "warehouse-handling-required.check2": "Om det finns ett lagerdokument för raden och om det är registrerat eller bokfört.",
      "warehouse-handling-required.check3": "Om raden borde använda ett annat lagerställe.",
      "accounting-period-missing": "Redovisningsperioderna som åtgärden behöver är inte upplagda, till exempel för dokumentets datum eller för ett periodiseringsschema.",
      "accounting-period-missing.check1": "Om det finns redovisningsperioder för dokumentets eller schemats datum.",
      "accounting-period-missing.check2": "Om ett nytt räkenskapsår behöver skapas.",
      "accounting-period-missing.check3": "Om ett datum av misstag ligger långt fram eller bak i tiden.",
      "basis": "Jämfört med Microsofts meddelanden från Business Central {version}. En nyare version kan formulera ett meddelande annorlunda."
    },
    "fr-FR": {
      title: "Cause possible", unconfirmed: "Non confirmée", checks: "Ce que vous pouvez vérifier",
      why: "Pourquoi cette suggestion ?", include: "Inclure lors de l’envoi ou de l’export du rapport",
      dismiss: "Ne correspond pas, masquer", hidden: "La cause possible est masquée.", show: "Afficher à nouveau",
      exportTitle: "Cause possible (non confirmée)", exportChecks: "À vérifier",
      "permission.params": "Il manque probablement à l’utilisateur l’autorisation {permission} pour {object}.",
      "permission": "Il manque probablement à l’utilisateur une autorisation requise par l’action.",
      "permission.check1": "Les ensembles d’autorisations de l’utilisateur dans cette société.",
      "permission.check2": "Si la même action fonctionne pour un utilisateur disposant de plus d’autorisations.",
      "permission.check3": "Si les autorisations ont changé récemment, par exemple lors d’une mise à niveau.",
      "permission.why": "Le message d’erreur indique qu’une autorisation manque. Il n’indique pas quel ensemble d’autorisations aurait dû l’accorder.",
      "required-value.params": "Le champ {field} de {table} est vide, et Business Central exige une valeur à cet endroit.",
      "required-value": "Le champ {field} est vide, et Business Central exige une valeur à cet endroit.",
      "required-value.check1": "Si {field} est renseigné.",
      "required-value.check2": "Si une page de paramétrage ou une fiche client, fournisseur ou article aurait dû renseigner la valeur.",
      "required-value.check3": "Si l’erreur ne se produit que pour certains enregistrements.",
      "required-value.why": "Le message d’erreur nomme le champ qui doit avoir une valeur. Le champ et la table proviennent du message lui-même.",
      "network-unavailable.params": "Un service appelé par Business Central n’a pas répondu comme prévu (HTTP {status}). Le problème se situe probablement en dehors de Business Central.",
      "network-unavailable": "Une connexion dont Business Central a besoin a échoué. Le problème se situe probablement en dehors de Business Central.",
      "network-unavailable.check1": "Si le service est disponible en ce moment.",
      "network-unavailable.check2": "Si la même action fonctionne un peu plus tard.",
      "network-unavailable.check3": "Si l’adresse du service est correctement paramétrée dans la configuration de l’intégration.",
      "network-unavailable.why": "Le message d’erreur contient un code d’état HTTP ou indique que la connexion a échoué. Il n’indique pas quel service a répondu.",
      "network-rejected.params": "Un service appelé par Business Central a refusé la demande (HTTP {status}).",
      "network-rejected.check1": "Si la connexion ou la clé utilisée pour l’intégration est toujours valide.",
      "network-rejected.check2": "Si l’adresse du service est correctement paramétrée dans la configuration de l’intégration.",
      "network-rejected.check3": "Si le service a modifié ce qu’il accepte, par exemple après une mise à jour.",
      "network-rejected.why": "Le message d’erreur contient un code d’état HTTP signifiant que la demande a été refusée. Il n’indique pas quel service a répondu.",
      "posting-date": "La date de comptabilisation est en dehors des dates sur lesquelles l’utilisateur est autorisé à valider.",
      "posting-date.check1": "La date de comptabilisation du document ou de la ligne feuille.",
      "posting-date.check2": "Les dates sur lesquelles l’utilisateur peut valider. Elles peuvent être définies pour l’utilisateur et pour toute la société.",
      "posting-date.check3": "Si la période devrait être ouverte, par exemple au début d’un nouveau mois ou d’une nouvelle année.",
      "nothing-to-post": "Le document ou la feuille n’a plus de quantité ni de montant à valider.",
      "nothing-to-post.check1": "Si les lignes ont une quantité ou un montant.",
      "nothing-to-post.check2": "Si la quantité à expédier, à recevoir ou à facturer est renseignée sur les lignes.",
      "nothing-to-post.check3": "Si les lignes ont déjà été validées auparavant.",
      "out-of-balance": "La somme des montants n’est pas nulle, les écritures ne sont donc pas équilibrées.",
      "out-of-balance.check1": "Si chaque ligne a le bon montant et le bon signe.",
      "out-of-balance.check2": "Si un compte contrepartie manque sur une ligne.",
      "out-of-balance.check3": "Si les lignes ayant le même numéro de document et la même date de comptabilisation vont ensemble.",
      "already-scheduled": "Le document attend déjà d’être validé en arrière-plan, ou une validation en arrière-plan précédente s’est arrêtée.",
      "already-scheduled.check1": "Si le document a une écriture dans la file d’attente des tâches, et quel est son statut.",
      "already-scheduled.check2": "Si une validation en arrière-plan précédente s’est terminée par une erreur.",
      "already-scheduled.check3": "Si le conseil du message lui-même, retirer le document de la file d’attente des tâches, permet de le valider à nouveau.",
      "not-on-inventory": "Il n’y a pas assez de l’article en stock pour ce que la ligne doit traiter.",
      "not-on-inventory.check1": "La quantité de l’article en stock dans le magasin à la date de comptabilisation.",
      "not-on-inventory.check2": "Si la quantité est réservée pour un autre document.",
      "not-on-inventory.check3": "Si une réception ou un achat qui devrait venir avant a été validé.",
      "dimension-blocked": "Les valeurs d’axe utilisées ensemble sur le document ou la ligne forment une combinaison bloquée.",
      "dimension-blocked.check1": "Les valeurs d’axe du document et de ses lignes.",
      "dimension-blocked.check2": "Les combinaisons d’axes bloquées dans le paramétrage des axes analytiques.",
      "dimension-blocked.check3": "Si un axe par défaut d’un client, d’un fournisseur, d’un article ou d’un compte a donné la valeur.",
      "posting-setup-missing": "Un paramétrage de comptabilisation nécessaire à la validation manque pour une combinaison de groupes comptables ou pour un magasin.",
      "posting-setup-missing.check1": "Les groupes comptables ou le magasin nommés dans le message.",
      "posting-setup-missing.check2": "Si le paramétrage de cette combinaison existe et si ses comptes sont renseignés.",
      "posting-setup-missing.check3": "Si le groupe comptable ou le magasin a été ajouté récemment.",
      "record-blocked": "Un client, un fournisseur, un article ou un autre enregistrement utilisé par l’action est bloqué.",
      "record-blocked.check1": "Si l’enregistrement nommé dans le message est bloqué sur sa fiche.",
      "record-blocked.check2": "Pourquoi il a été bloqué et qui peut le débloquer.",
      "record-blocked.check3": "S’il faudrait utiliser à la place un autre enregistrement, non bloqué.",
      "bc-label.why": "Le message est l’un des messages d’erreur standard de Business Central. Il a été reconnu d’après la formulation de Microsoft, qui existe dans chaque langue. La cause et les vérifications sont des conseils généraux pour ce message, pas un constat sur vos données.",
      "field-must-equal.params": "{field} doit être {expected} pour cette action, mais sa valeur est {current}.",
      "field-must-equal": "{field} doit être {expected} pour cette action, ce qui n’est pas le cas.",
      "field-must-equal.check1": "Si une étape qui modifie {field}, comme le lancement ou l’approbation du document, a été omise.",
      "field-must-equal.check2": "Si {field} a été rétabli, par exemple en rouvrant le document.",
      "field-must-equal.check3": "Si l’erreur ne se produit que pour certains enregistrements.",
      "record-missing.params": "Business Central n’a pas trouvé l’enregistrement {table} dont l’action a besoin ({record}).",
      "record-missing": "Business Central n’a pas trouvé l’enregistrement {table} dont l’action a besoin.",
      "record-missing.check1": "S’il existe un enregistrement {table} avec ces valeurs.",
      "record-missing.check2": "Si un paramétrage ou une fiche renvoie à un code qui n’a pas été configuré, comme une combinaison de groupes comptables.",
      "record-missing.check3": "Si l’enregistrement a été supprimé ou renommé récemment.",
      "related-missing.params": "{field} contient {value}, qui n’existe pas dans {related}.",
      "related-missing": "{field} contient une valeur qui n’existe pas là où Business Central la recherche.",
      "related-missing.check1": "Si {value} existe dans {related}.",
      "related-missing.check2": "Si la valeur a été saisie autrement, supprimée ou renommée.",
      "related-missing.check3": "Si la valeur provient d’une valeur par défaut, d’un modèle ou d’un enregistrement copié.",
      "record-exists.params": "Un enregistrement {table} avec les mêmes valeurs existe déjà ({record}).",
      "record-exists": "Un enregistrement {table} avec les mêmes valeurs existe déjà.",
      "record-exists.check1": "Si l’enregistrement a déjà été créé, par exemple parce que l’action a été exécutée deux fois.",
      "record-exists.check2": "Si une souche de numéros attribue un numéro déjà utilisé.",
      "record-exists.check3": "Si une importation ou une intégration crée à nouveau le même enregistrement.",
      "changed-by-other.params": "L’enregistrement {table} a été modifié ailleurs après l’ouverture de la page, la modification n’a donc pas été enregistrée.",
      "changed-by-other": "L’enregistrement a été modifié ailleurs après l’ouverture de la page, la modification n’a donc pas été enregistrée.",
      "changed-by-other.check1": "Si un autre utilisateur ou une tâche en arrière-plan a modifié l’enregistrement au même moment.",
      "changed-by-other.check2": "Si cela fonctionne après avoir fermé la page, l’avoir rouverte et refait la modification.",
      "changed-by-other.check3": "Si une extension modifie l’enregistrement pendant que la page l’enregistre.",
      "deadlock.params": "Un autre utilisateur ou une tâche en arrière-plan modifiait {table} au même moment, l’action a donc été arrêtée.",
      "deadlock": "Un autre utilisateur ou une tâche en arrière-plan modifiait les mêmes données au même moment, l’action a donc été arrêtée.",
      "deadlock.check1": "Si l’action fonctionne quand vous réessayez.",
      "deadlock.check2": "Si une écriture de la file d’attente des tâches ou un autre utilisateur validait au même moment.",
      "deadlock.check3": "Si cela se produit souvent à certaines heures de la journée.",
      "license-permission.params": "La licence de l’utilisateur n’inclut probablement pas l’autorisation {permission} pour {object}.",
      "license-permission": "La licence de l’utilisateur n’inclut probablement pas une autorisation requise par l’action.",
      "license-permission.check1": "La licence dont dispose l’utilisateur.",
      "license-permission.check2": "Si l’action exige une licence plus étendue, par exemple pour une application ou une fonctionnalité.",
      "license-permission.check3": "Si un utilisateur disposant d’une autre licence peut effectuer la même action.",
      "not-an-option.params": "{value} ne fait pas partie des choix du champ. Les choix sont : {options}.",
      "not-an-option": "{value} ne fait pas partie des choix du champ.",
      "not-an-option.check1": "Si la valeur a été écrite dans une autre langue ou avec d’autres mots.",
      "not-an-option.check2": "Si la valeur provient d’une importation, d’une intégration ou d’un enregistrement copié.",
      "not-an-option.check3": "Si une extension n’ajoute ce choix que dans certaines sociétés.",
      "platform.why": "Le message est l’un des messages d’erreur standard de la plateforme Business Central. Il a été reconnu d’après la formulation de Microsoft, qui existe dans chaque langue. Les noms proviennent du message lui-même. La cause et les vérifications sont des conseils généraux, pas un constat sur vos données.",
      origin: "Probablement affiché par",
      actions: "Actions proposées dans le message d’erreur",
      "origin.in": "{objects} dans {app}",
      "origin.more": "{objects} et {count} autres",
      "known-error.params": "Un contrôle de l’application Microsoft {app} a arrêté l’action. Le message indique ce qui manque ou ce qui est incorrect.",
      "known-error": "Un contrôle de Business Central a arrêté l’action. Le message indique ce qui manque ou ce qui est incorrect.",
      "known-error.check1": "Ce que le message demande de modifier, et sur quel enregistrement ou quelle page de paramétrage.",
      "known-error.check2": "Si la même action fonctionne pour un autre enregistrement, ce qui oriente vers les données plutôt que vers le programme.",
      "known-error.check3": "Si le paramétrage ou les données que le message nomme ont été modifiés récemment.",
      "known-error.why": "La formulation correspond à un message d’erreur des applications de Microsoft, dans n’importe quelle langue. Elle indique d’où vient probablement le message, pas pourquoi vos données l’ont provoqué. Les vérifications sont des conseils généraux.",
      "number-series.params": "La souche de numéros {series} ne peut pas attribuer de nouveau numéro, par exemple parce que ses numéros sont épuisés ou qu’aucune ligne n’est valide pour la date.",
      "number-series": "Une souche de numéros ne peut pas attribuer de nouveau numéro, par exemple parce que ses numéros sont épuisés ou qu’aucune ligne n’est valide pour la date.",
      "number-series.check1": "Si une ligne de la souche de numéros a une date de début égale ou antérieure à la date du document.",
      "number-series.check2": "Si le dernier numéro utilisé a atteint le numéro de fin de la ligne.",
      "number-series.check3": "Si la ligne est ouverte et si la souche autorise les numéros par défaut là où le numéro est attribué automatiquement.",
      "posted-number-used.params": "Le numéro {number} que la souche attribue au document validé est déjà utilisé, le document ne peut donc pas être validé.",
      "posted-number-used": "Le numéro que la souche attribue au document validé est déjà utilisé, le document ne peut donc pas être validé.",
      "posted-number-used.check1": "Si le dernier numéro utilisé de la ligne souche est inférieur à des numéros qui existent déjà.",
      "posted-number-used.check2": "Si des documents ont été importés ou créés avec des numéros de la même souche.",
      "posted-number-used.check3": "Si deux souches de numéros attribuent des numéros dans la même plage.",
      "dimension-mandatory.params": "Une valeur pour {dimension} est obligatoire pour {record}, et aucune n’est sélectionnée.",
      "dimension-mandatory": "Un axe analytique qui doit avoir une valeur n’en a pas sur le document ou l’une de ses lignes.",
      "dimension-mandatory.check1": "Quelles sections analytiques le document et ses lignes ont.",
      "dimension-mandatory.check2": "Si les axes par défaut du client, du fournisseur, de l’article ou du compte exigent une valeur.",
      "dimension-mandatory.check3": "Si la valeur ne manque que sur certaines lignes.",
      "item-tracking-required.params": "L’article {item} exige un numéro de lot, de série ou de colis, et aucun n’est affecté sur la ligne.",
      "item-tracking-required": "L’article exige un numéro de lot, de série ou de colis, et aucun n’est affecté sur la ligne.",
      "item-tracking-required.check1": "Si des lignes de traçabilité sont affectées à la ligne du document.",
      "item-tracking-required.check2": "Si le code traçabilité de l’article exige la traçabilité pour ce type de transaction.",
      "item-tracking-required.check3": "Si la quantité des lignes de traçabilité correspond à la quantité de la ligne.",
      "item-tracking-mismatch": "La quantité des lignes de traçabilité ne correspond pas à la quantité de la ligne du document.",
      "item-tracking-mismatch.check1": "Si la quantité à traiter des lignes de traçabilité est égale à la quantité à expédier, à recevoir ou à valider.",
      "item-tracking-mismatch.check2": "Si la quantité de la ligne a été modifiée après l’affectation de la traçabilité.",
      "item-tracking-mismatch.check3": "Si les numéros de lot ou de série sont disponibles dans le magasin et l’emplacement.",
      "approval-required": "Le document doit être approuvé avant que l’action puisse être effectuée, ou il attend encore une approbation.",
      "approval-required.check1": "Si une demande d’approbation a été envoyée, et quel est son statut.",
      "approval-required.check2": "Si un workflow d’approbation est activé pour ce type de document.",
      "approval-required.check3": "Si le document a été modifié après son approbation, ce qui a pu le rouvrir.",
      "duplicate-external-doc.params": "Le document du fournisseur {document} est déjà utilisé sur un autre document du même fournisseur.",
      "duplicate-external-doc": "Le numéro de document du fournisseur est déjà utilisé sur un autre document du même fournisseur.",
      "duplicate-external-doc.check1": "Si le numéro de facture ou d’avoir du fournisseur est saisi correctement.",
      "duplicate-external-doc.check2": "Si la même facture a déjà été validée ou figure sur un autre document ouvert.",
      "duplicate-external-doc.check3": "Si le paramétrage des achats exige que le numéro de document du fournisseur soit unique.",
      "nothing-to-handle": "Il n’y a plus rien à traiter : les lignes n’ont pas de quantité à traiter, ou tout est déjà prélevé, rangé ou traité.",
      "nothing-to-handle.check1": "Si les lignes ont une quantité à traiter.",
      "nothing-to-handle.check2": "Si le document origine est lancé, et si ses quantités sont déjà prélevées ou rangées.",
      "nothing-to-handle.check3": "Si le magasin, l’emplacement ou les filtres de l’action excluent les lignes.",
      "warehouse-handling-required": "Le magasin exige une gestion d’entrepôt : la quantité doit d’abord être traitée avec des documents entrepôt, comme une expédition, une réception, un prélèvement ou un rangement.",
      "warehouse-handling-required.check1": "Quelle gestion d’entrepôt le magasin exige.",
      "warehouse-handling-required.check2": "Si un document entrepôt existe pour la ligne, et s’il est enregistré ou validé.",
      "warehouse-handling-required.check3": "Si la ligne devrait utiliser un autre magasin.",
      "accounting-period-missing": "Les périodes comptables dont l’action a besoin ne sont pas paramétrées, par exemple pour les dates du document ou d’un échéancier de report.",
      "accounting-period-missing.check1": "S’il existe des périodes comptables pour les dates du document ou de l’échéancier.",
      "accounting-period-missing.check2": "S’il faut créer un nouvel exercice.",
      "accounting-period-missing.check3": "Si une date est par erreur très éloignée dans le futur ou le passé.",
      "basis": "Comparé aux messages de Microsoft de Business Central {version}. Une version plus récente peut formuler un message autrement."
    },
    "de-DE": {
      title: "Mögliche Ursache", unconfirmed: "Nicht bestätigt", checks: "Das können Sie prüfen",
      why: "Warum wird das vorgeschlagen?", include: "Beim Senden oder Exportieren des Berichts einschließen",
      dismiss: "Passt nicht, ausblenden", hidden: "Die mögliche Ursache ist ausgeblendet.", show: "Wieder anzeigen",
      exportTitle: "Mögliche Ursache (nicht bestätigt)", exportChecks: "Zu prüfen",
      "permission.params": "Dem Benutzer fehlt wahrscheinlich die Berechtigung {permission} für {object}.",
      "permission": "Dem Benutzer fehlt wahrscheinlich eine Berechtigung, die die Aktion erfordert.",
      "permission.check1": "Welche Berechtigungssätze der Benutzer in diesem Mandanten hat.",
      "permission.check2": "Ob dieselbe Aktion für einen Benutzer mit mehr Berechtigungen funktioniert.",
      "permission.check3": "Ob sich die Berechtigungen kürzlich geändert haben, zum Beispiel bei einem Upgrade.",
      "permission.why": "Die Fehlermeldung besagt, dass eine Berechtigung fehlt. Sie sagt nicht, welcher Berechtigungssatz sie hätte gewähren sollen.",
      "required-value.params": "Das Feld {field} in {table} ist leer, und Business Central erfordert dort einen Wert.",
      "required-value": "Das Feld {field} ist leer, und Business Central erfordert dort einen Wert.",
      "required-value.check1": "Ob {field} ausgefüllt ist.",
      "required-value.check2": "Ob eine Einrichtungsseite oder eine Debitoren-, Kreditoren- oder Artikelkarte den Wert hätte ausfüllen sollen.",
      "required-value.check3": "Ob der Fehler nur bei bestimmten Datensätzen auftritt.",
      "required-value.why": "Die Fehlermeldung nennt das Feld, das einen Wert haben muss. Feld und Tabelle stammen aus der Meldung selbst.",
      "network-unavailable.params": "Ein Dienst, den Business Central aufruft, hat nicht wie erwartet geantwortet (HTTP {status}). Der Fehler liegt wahrscheinlich außerhalb von Business Central.",
      "network-unavailable": "Eine Verbindung, die Business Central benötigt, ist fehlgeschlagen. Der Fehler liegt wahrscheinlich außerhalb von Business Central.",
      "network-unavailable.check1": "Ob der Dienst gerade verfügbar ist.",
      "network-unavailable.check2": "Ob dieselbe Aktion etwas später funktioniert.",
      "network-unavailable.check3": "Ob die Adresse des Dienstes in der Einrichtung der Integration richtig eingestellt ist.",
      "network-unavailable.why": "Die Fehlermeldung enthält einen HTTP-Statuscode oder besagt, dass die Verbindung fehlgeschlagen ist. Sie sagt nicht, welcher Dienst geantwortet hat.",
      "network-rejected.params": "Ein Dienst, den Business Central aufruft, hat die Anfrage abgelehnt (HTTP {status}).",
      "network-rejected.check1": "Ob die Anmeldung oder der Schlüssel für die Verbindung noch gültig ist.",
      "network-rejected.check2": "Ob die Adresse des Dienstes in der Einrichtung der Integration richtig eingestellt ist.",
      "network-rejected.check3": "Ob der Dienst geändert hat, was er annimmt, zum Beispiel nach einem Update.",
      "network-rejected.why": "Die Fehlermeldung enthält einen HTTP-Statuscode, der bedeutet, dass die Anfrage abgelehnt wurde. Sie sagt nicht, welcher Dienst geantwortet hat.",
      "posting-date": "Das Buchungsdatum liegt außerhalb der Daten, an denen der Benutzer buchen darf.",
      "posting-date.check1": "Welches Buchungsdatum der Beleg oder die Buch.-Blattzeile hat.",
      "posting-date.check2": "An welchen Daten der Benutzer buchen darf. Sie können für den Benutzer und für den ganzen Mandanten festgelegt werden.",
      "posting-date.check3": "Ob der Zeitraum offen sein sollte, zum Beispiel am Anfang eines neuen Monats oder Jahres.",
      "nothing-to-post": "Der Beleg oder das Buch.-Blatt hat keine Menge und keinen Betrag mehr zu buchen.",
      "nothing-to-post.check1": "Ob die Zeilen eine Menge oder einen Betrag haben.",
      "nothing-to-post.check2": "Ob die zu liefernde, zu empfangende oder zu fakturierende Menge in den Zeilen ausgefüllt ist.",
      "nothing-to-post.check3": "Ob die Zeilen bereits früher gebucht wurden.",
      "out-of-balance": "Die Beträge ergeben zusammen nicht null, daher ist der Saldo nicht ausgeglichen.",
      "out-of-balance.check1": "Ob jede Zeile den richtigen Betrag und das richtige Vorzeichen hat.",
      "out-of-balance.check2": "Ob in einer Zeile ein Gegenkonto fehlt.",
      "out-of-balance.check3": "Ob Zeilen mit derselben Belegnummer und demselben Buchungsdatum zusammengehören.",
      "already-scheduled": "Der Beleg wartet bereits auf die Buchung im Hintergrund, oder eine frühere Hintergrundbuchung wurde abgebrochen.",
      "already-scheduled.check1": "Ob der Beleg einen Eintrag in der Aufgabenwarteschlange hat und welchen Status er hat.",
      "already-scheduled.check2": "Ob eine frühere Hintergrundbuchung mit einem Fehler endete.",
      "already-scheduled.check3": "Ob der Rat der Meldung selbst, den Beleg aus der Aufgabenwarteschlange zu entfernen, das erneute Buchen ermöglicht.",
      "not-on-inventory": "Vom Artikel ist nicht genug am Lager für das, was die Zeile bearbeiten soll.",
      "not-on-inventory.check1": "Wie viel vom Artikel am Buchungsdatum am Lagerort vorhanden ist.",
      "not-on-inventory.check2": "Ob die Menge für einen anderen Beleg reserviert ist.",
      "not-on-inventory.check3": "Ob ein Wareneingang oder Einkauf, der zuerst kommen sollte, gebucht wurde.",
      "dimension-blocked": "Die Dimensionswerte, die zusammen im Beleg oder in der Zeile verwendet werden, bilden eine gesperrte Kombination.",
      "dimension-blocked.check1": "Welche Dimensionswerte der Beleg und seine Zeilen haben.",
      "dimension-blocked.check2": "Welche Dimensionskombinationen in der Einrichtung der Dimensionen gesperrt sind.",
      "dimension-blocked.check3": "Ob eine Vorgabedimension bei einem Debitor, Kreditor, Artikel oder Konto den Wert geliefert hat.",
      "posting-setup-missing": "Eine Buchungseinrichtung, die die Buchung benötigt, fehlt für eine Kombination von Buchungsgruppen oder für einen Lagerort.",
      "posting-setup-missing.check1": "Welche Buchungsgruppen oder welchen Lagerort die Meldung nennt.",
      "posting-setup-missing.check2": "Ob die Einrichtung für diese Kombination vorhanden ist und ihre Konten ausgefüllt sind.",
      "posting-setup-missing.check3": "Ob die Buchungsgruppe oder der Lagerort kürzlich hinzugefügt wurde.",
      "record-blocked": "Ein Debitor, Kreditor, Artikel oder anderer Datensatz, den die Aktion verwendet, ist gesperrt.",
      "record-blocked.check1": "Ob der in der Meldung genannte Datensatz auf seiner Karte gesperrt ist.",
      "record-blocked.check2": "Warum er gesperrt wurde und wer die Sperre aufheben kann.",
      "record-blocked.check3": "Ob stattdessen ein anderer, nicht gesperrter Datensatz verwendet werden sollte.",
      "bc-label.why": "Die Meldung ist eine der Standardfehlermeldungen von Business Central. Sie wurde an Microsofts eigener Formulierung erkannt, die es in jeder Sprache gibt. Ursache und Prüfungen sind allgemeine Hinweise zu dieser Meldung, keine Feststellung zu Ihren Daten.",
      "field-must-equal.params": "{field} muss für die Aktion {expected} sein, ist aber {current}.",
      "field-must-equal": "{field} muss für die Aktion {expected} sein, ist es aber nicht.",
      "field-must-equal.check1": "Ob ein Schritt übersprungen wurde, der {field} ändert, zum Beispiel das Freigeben oder Genehmigen des Belegs.",
      "field-must-equal.check2": "Ob {field} wieder zurückgesetzt wurde, zum Beispiel durch erneutes Öffnen des Belegs.",
      "field-must-equal.check3": "Ob der Fehler nur bei bestimmten Datensätzen auftritt.",
      "record-missing.params": "Business Central hat den Datensatz {table} nicht gefunden, den die Aktion benötigt ({record}).",
      "record-missing": "Business Central hat den Datensatz {table} nicht gefunden, den die Aktion benötigt.",
      "record-missing.check1": "Ob ein Datensatz {table} mit diesen Werten vorhanden ist.",
      "record-missing.check2": "Ob eine Einrichtung oder Karte auf einen Code verweist, der nicht eingerichtet ist, zum Beispiel eine Kombination von Buchungsgruppen.",
      "record-missing.check3": "Ob der Datensatz kürzlich gelöscht oder umbenannt wurde.",
      "related-missing.params": "{field} enthält {value}, das in {related} nicht vorhanden ist.",
      "related-missing": "{field} enthält einen Wert, der dort nicht vorhanden ist, wo Business Central ihn nachschlägt.",
      "related-missing.check1": "Ob {value} in {related} vorhanden ist.",
      "related-missing.check2": "Ob der Wert anders geschrieben, gelöscht oder umbenannt wurde.",
      "related-missing.check3": "Ob der Wert aus einer Vorgabe, einer Vorlage oder einem kopierten Datensatz stammt.",
      "record-exists.params": "Ein Datensatz {table} mit denselben Werten ist bereits vorhanden ({record}).",
      "record-exists": "Ein Datensatz {table} mit denselben Werten ist bereits vorhanden.",
      "record-exists.check1": "Ob der Datensatz bereits erstellt wurde, zum Beispiel weil die Aktion zweimal ausgeführt wurde.",
      "record-exists.check2": "Ob eine Nummernserie eine Nummer vergibt, die bereits verwendet wird.",
      "record-exists.check3": "Ob ein Import oder eine Integration denselben Datensatz erneut erstellt.",
      "changed-by-other.params": "Der Datensatz {table} wurde nach dem Öffnen der Seite an anderer Stelle geändert, daher wurde die Änderung nicht gespeichert.",
      "changed-by-other": "Der Datensatz wurde nach dem Öffnen der Seite an anderer Stelle geändert, daher wurde die Änderung nicht gespeichert.",
      "changed-by-other.check1": "Ob ein anderer Benutzer oder eine Hintergrundaufgabe den Datensatz gleichzeitig geändert hat.",
      "changed-by-other.check2": "Ob es funktioniert, die Seite zu schließen, erneut zu öffnen und die Änderung zu wiederholen.",
      "changed-by-other.check3": "Ob eine Erweiterung den Datensatz ändert, während die Seite ihn speichert.",
      "deadlock.params": "Ein anderer Benutzer oder eine Hintergrundaufgabe hat {table} gleichzeitig geändert, daher wurde die Aktion abgebrochen.",
      "deadlock": "Ein anderer Benutzer oder eine Hintergrundaufgabe hat dieselben Daten gleichzeitig geändert, daher wurde die Aktion abgebrochen.",
      "deadlock.check1": "Ob die Aktion beim erneuten Versuch funktioniert.",
      "deadlock.check2": "Ob ein Eintrag der Aufgabenwarteschlange oder ein anderer Benutzer gleichzeitig gebucht hat.",
      "deadlock.check3": "Ob es häufig zu bestimmten Tageszeiten auftritt.",
      "license-permission.params": "Die Lizenz des Benutzers enthält wahrscheinlich nicht die Berechtigung {permission} für {object}.",
      "license-permission": "Die Lizenz des Benutzers enthält wahrscheinlich keine Berechtigung, die die Aktion erfordert.",
      "license-permission.check1": "Welche Lizenz der Benutzer hat.",
      "license-permission.check2": "Ob die Aktion eine umfassendere Lizenz erfordert, zum Beispiel für eine App oder eine Funktion.",
      "license-permission.check3": "Ob ein Benutzer mit einer anderen Lizenz dieselbe Aktion ausführen kann.",
      "not-an-option.params": "{value} ist keine der Auswahlmöglichkeiten des Feldes. Die Auswahlmöglichkeiten sind: {options}.",
      "not-an-option": "{value} ist keine der Auswahlmöglichkeiten des Feldes.",
      "not-an-option.check1": "Ob der Wert in einer anderen Sprache oder mit anderen Worten geschrieben wurde.",
      "not-an-option.check2": "Ob der Wert aus einem Import, einer Integration oder einem kopierten Datensatz stammt.",
      "not-an-option.check3": "Ob eine Erweiterung die Auswahlmöglichkeit nur in einigen Mandanten hinzufügt.",
      "platform.why": "Die Meldung ist eine der Standardfehlermeldungen der Business Central-Plattform. Sie wurde an Microsofts eigener Formulierung erkannt, die es in jeder Sprache gibt. Die Namen stammen aus der Meldung selbst. Ursache und Prüfungen sind allgemeine Hinweise, keine Feststellung zu Ihren Daten.",
      origin: "Wahrscheinlich angezeigt von",
      actions: "In der Fehlermeldung angebotene Aktionen",
      "origin.in": "{objects} in {app}",
      "origin.more": "{objects} und {count} weitere",
      "known-error.params": "Eine Prüfung in Microsofts App {app} hat die Aktion gestoppt. Die Meldung sagt, was fehlt oder falsch ist.",
      "known-error": "Eine Prüfung in Business Central hat die Aktion gestoppt. Die Meldung sagt, was fehlt oder falsch ist.",
      "known-error.check1": "Was laut Meldung geändert werden muss, und bei welchem Datensatz oder auf welcher Einrichtungsseite.",
      "known-error.check2": "Ob dieselbe Aktion bei einem anderen Datensatz funktioniert, was eher auf die Daten als auf das Programm hinweist.",
      "known-error.check3": "Ob die Einrichtung oder die Daten, die die Meldung nennt, kürzlich geändert wurden.",
      "known-error.why": "Der Wortlaut entspricht einer Fehlermeldung in Microsofts eigenen Apps, in jeder Sprache. Er zeigt, woher die Meldung wahrscheinlich stammt, nicht, warum Ihre Daten sie ausgelöst haben. Die Prüfungen sind allgemeine Hinweise.",
      "number-series.params": "Die Nummernserie {series} kann keine neue Nummer vergeben, zum Beispiel weil ihre Nummern aufgebraucht sind oder keine Zeile für das Datum gilt.",
      "number-series": "Eine Nummernserie kann keine neue Nummer vergeben, zum Beispiel weil ihre Nummern aufgebraucht sind oder keine Zeile für das Datum gilt.",
      "number-series.check1": "Ob eine Zeile der Nummernserie ein Startdatum am oder vor dem Datum des Belegs hat.",
      "number-series.check2": "Ob die zuletzt verwendete Nummer die Endnummer der Zeile erreicht hat.",
      "number-series.check3": "Ob die Zeile offen ist und die Serie Standardnummern zulässt, wo die Nummer automatisch vergeben wird.",
      "posted-number-used.params": "Die Nummer {number}, die die Nummernserie dem gebuchten Beleg gibt, ist bereits vergeben, daher kann der Beleg nicht gebucht werden.",
      "posted-number-used": "Die Nummer, die die Nummernserie dem gebuchten Beleg gibt, ist bereits vergeben, daher kann der Beleg nicht gebucht werden.",
      "posted-number-used.check1": "Ob die zuletzt verwendete Nummer der Nummernserienzeile niedriger ist als bereits vorhandene Nummern.",
      "posted-number-used.check2": "Ob Belege mit Nummern aus derselben Serie importiert oder erstellt wurden.",
      "posted-number-used.check3": "Ob zwei Nummernserien Nummern im selben Bereich vergeben.",
      "dimension-mandatory.params": "Für {record} ist ein Wert für {dimension} erforderlich, und keiner ist ausgewählt.",
      "dimension-mandatory": "Eine Dimension, die einen Wert haben muss, hat im Beleg oder in einer seiner Zeilen keinen.",
      "dimension-mandatory.check1": "Welche Dimensionswerte der Beleg und seine Zeilen haben.",
      "dimension-mandatory.check2": "Ob die Vorgabedimensionen des Debitors, Kreditors, Artikels oder Kontos einen Wert verlangen.",
      "dimension-mandatory.check3": "Ob der Wert nur in einigen Zeilen fehlt.",
      "item-tracking-required.params": "Artikel {item} erfordert eine Chargen-, Serien- oder Paketnummer, und in der Zeile ist keine zugeordnet.",
      "item-tracking-required": "Der Artikel erfordert eine Chargen-, Serien- oder Paketnummer, und in der Zeile ist keine zugeordnet.",
      "item-tracking-required.check1": "Ob der Belegzeile Artikelverfolgungszeilen zugeordnet sind.",
      "item-tracking-required.check2": "Ob der Artikelverfolgungscode des Artikels für diese Art von Transaktion eine Verfolgung verlangt.",
      "item-tracking-required.check3": "Ob die Menge in den Artikelverfolgungszeilen der Menge in der Zeile entspricht.",
      "item-tracking-mismatch": "Die Menge in den Artikelverfolgungszeilen entspricht nicht der Menge in der Belegzeile.",
      "item-tracking-mismatch.check1": "Ob die zu verarbeitende Menge in den Artikelverfolgungszeilen der zu liefernden, zu empfangenden oder zu buchenden Menge entspricht.",
      "item-tracking-mismatch.check2": "Ob die Menge in der Zeile nach der Zuordnung der Artikelverfolgung geändert wurde.",
      "item-tracking-mismatch.check3": "Ob die Chargen- oder Seriennummern am Lagerort und Lagerplatz verfügbar sind.",
      "approval-required": "Der Beleg muss genehmigt werden, bevor die Aktion ausgeführt werden kann, oder er wartet noch auf eine Genehmigung.",
      "approval-required.check1": "Ob eine Genehmigungsanforderung gesendet wurde und welchen Status sie hat.",
      "approval-required.check2": "Ob ein Genehmigungsworkflow für diese Art von Beleg aktiviert ist.",
      "approval-required.check3": "Ob der Beleg nach der Genehmigung geändert wurde, wodurch er wieder geöffnet worden sein kann.",
      "duplicate-external-doc.params": "Der Beleg {document} des Kreditors wird bereits in einem anderen Beleg desselben Kreditors verwendet.",
      "duplicate-external-doc": "Die Belegnummer des Kreditors wird bereits in einem anderen Beleg desselben Kreditors verwendet.",
      "duplicate-external-doc.check1": "Ob die Rechnungs- oder Gutschriftsnummer des Kreditors richtig eingegeben ist.",
      "duplicate-external-doc.check2": "Ob dieselbe Rechnung bereits gebucht wurde oder in einem anderen offenen Beleg steht.",
      "duplicate-external-doc.check3": "Ob die Einkaufseinrichtung eine eindeutige Belegnummer des Kreditors verlangt.",
      "nothing-to-handle": "Es gibt nichts mehr zu verarbeiten: Die Zeilen haben keine zu verarbeitende Menge, oder alles ist bereits kommissioniert, eingelagert oder verarbeitet.",
      "nothing-to-handle.check1": "Ob die Zeilen eine zu verarbeitende Menge haben.",
      "nothing-to-handle.check2": "Ob der Herkunftsbeleg freigegeben ist und ob seine Mengen bereits kommissioniert oder eingelagert sind.",
      "nothing-to-handle.check3": "Ob Lagerort, Lagerplatz oder Filter der Aktion die Zeilen ausschließen.",
      "warehouse-handling-required": "Der Lagerort verlangt eine Lagerabwicklung, daher muss die Menge zuerst mit Lagerbelegen verarbeitet werden, zum Beispiel einer Warenausgabe, einem Wareneingang, einer Kommissionierung oder einer Einlagerung.",
      "warehouse-handling-required.check1": "Welche Lagerabwicklung der Lagerort verlangt.",
      "warehouse-handling-required.check2": "Ob es für die Zeile einen Lagerbeleg gibt und ob er registriert oder gebucht ist.",
      "warehouse-handling-required.check3": "Ob die Zeile einen anderen Lagerort verwenden sollte.",
      "accounting-period-missing": "Die Buchhaltungsperioden, die die Aktion benötigt, sind nicht eingerichtet, zum Beispiel für die Daten des Belegs oder eines Abgrenzungsplans.",
      "accounting-period-missing.check1": "Ob es Buchhaltungsperioden für die Daten des Belegs oder Plans gibt.",
      "accounting-period-missing.check2": "Ob ein neues Geschäftsjahr angelegt werden muss.",
      "accounting-period-missing.check3": "Ob ein Datum versehentlich weit in der Zukunft oder Vergangenheit liegt.",
      "basis": "Verglichen mit den Meldungen von Microsoft aus Business Central {version}. Eine neuere Version kann eine Meldung anders formulieren."
    },
    "es-ES": {
      title: "Causa posible", unconfirmed: "No confirmada", checks: "Qué puede comprobar",
      why: "¿Por qué se sugiere esto?", include: "Incluir al enviar o exportar el informe",
      dismiss: "No encaja, ocultar", hidden: "La causa posible está oculta.", show: "Mostrar de nuevo",
      exportTitle: "Causa posible (no confirmada)", exportChecks: "Qué comprobar",
      "permission.params": "Probablemente al usuario le falta el permiso {permission} para {object}.",
      "permission": "Probablemente al usuario le falta un permiso que requiere la acción.",
      "permission.check1": "Qué conjuntos de permisos tiene el usuario en esta empresa.",
      "permission.check2": "Si la misma acción funciona para un usuario con más permisos.",
      "permission.check3": "Si los permisos cambiaron recientemente, por ejemplo en una actualización.",
      "permission.why": "El mensaje de error indica que falta un permiso. No indica qué conjunto de permisos debería haberlo concedido.",
      "required-value.params": "El campo {field} de {table} está vacío, y Business Central requiere un valor en él.",
      "required-value": "El campo {field} está vacío, y Business Central requiere un valor en él.",
      "required-value.check1": "Si {field} está rellenado.",
      "required-value.check2": "Si una página de configuración o una ficha de cliente, proveedor o producto debería haber rellenado el valor.",
      "required-value.check3": "Si el error solo se produce con algunos registros.",
      "required-value.why": "El mensaje de error nombra el campo que debe tener un valor. El campo y la tabla proceden del propio mensaje.",
      "network-unavailable.params": "Un servicio al que llama Business Central no respondió como se esperaba (HTTP {status}). Probablemente el problema está fuera de Business Central.",
      "network-unavailable": "Ha fallado una conexión que Business Central necesita. Probablemente el problema está fuera de Business Central.",
      "network-unavailable.check1": "Si el servicio está disponible en este momento.",
      "network-unavailable.check2": "Si la misma acción funciona dentro de un rato.",
      "network-unavailable.check3": "Si la dirección del servicio está bien configurada en la configuración de la integración.",
      "network-unavailable.why": "El mensaje de error contiene un código de estado HTTP o indica que la conexión falló. No indica qué servicio respondió.",
      "network-rejected.params": "Un servicio al que llama Business Central rechazó la solicitud (HTTP {status}).",
      "network-rejected.check1": "Si el inicio de sesión o la clave de la conexión sigue siendo válido.",
      "network-rejected.check2": "Si la dirección del servicio está bien configurada en la configuración de la integración.",
      "network-rejected.check3": "Si el servicio ha cambiado lo que acepta, por ejemplo tras una actualización.",
      "network-rejected.why": "El mensaje de error contiene un código de estado HTTP que significa que la solicitud fue rechazada. No indica qué servicio respondió.",
      "posting-date": "La fecha de registro está fuera de las fechas en las que el usuario puede registrar.",
      "posting-date.check1": "Qué fecha de registro tiene el documento o la línea del diario.",
      "posting-date.check2": "En qué fechas puede registrar el usuario. Se pueden definir para el usuario y para toda la empresa.",
      "posting-date.check3": "Si el periodo debería estar abierto, por ejemplo al comienzo de un nuevo mes o año.",
      "nothing-to-post": "El documento o el diario no tiene ninguna cantidad ni importe pendiente de registrar.",
      "nothing-to-post.check1": "Si las líneas tienen una cantidad o un importe.",
      "nothing-to-post.check2": "Si la cantidad a enviar, recibir o facturar está rellenada en las líneas.",
      "nothing-to-post.check3": "Si las líneas ya se registraron antes.",
      "out-of-balance": "Los importes no suman cero, por lo que los movimientos no cuadran.",
      "out-of-balance.check1": "Si cada línea tiene el importe y el signo correctos.",
      "out-of-balance.check2": "Si falta una cuenta de contrapartida en alguna línea.",
      "out-of-balance.check3": "Si las líneas con el mismo número de documento y la misma fecha de registro van juntas.",
      "already-scheduled": "El documento ya está esperando a registrarse en segundo plano, o un registro anterior en segundo plano se detuvo.",
      "already-scheduled.check1": "Si el documento tiene un movimiento en la cola de trabajo y cuál es su estado.",
      "already-scheduled.check2": "Si un registro anterior en segundo plano terminó con un error.",
      "already-scheduled.check3": "Si el consejo del propio mensaje, quitar el documento de la cola de trabajo, permite registrarlo de nuevo.",
      "not-on-inventory": "No hay suficiente cantidad del producto en inventario para lo que la línea debe gestionar.",
      "not-on-inventory.check1": "Cuánto hay del producto en inventario en el almacén en la fecha de registro.",
      "not-on-inventory.check2": "Si la cantidad está reservada para otro documento.",
      "not-on-inventory.check3": "Si se ha registrado una recepción o una compra que debería ir antes.",
      "dimension-blocked": "Los valores de dimensión usados juntos en el documento o la línea forman una combinación bloqueada.",
      "dimension-blocked.check1": "Qué valores de dimensión tienen el documento y sus líneas.",
      "dimension-blocked.check2": "Qué combinaciones de dimensiones están bloqueadas en la configuración de dimensiones.",
      "dimension-blocked.check3": "Si una dimensión predeterminada de un cliente, proveedor, producto o cuenta dio el valor.",
      "posting-setup-missing": "Falta una configuración de registro que el registro necesita para una combinación de grupos contables o para un almacén.",
      "posting-setup-missing.check1": "Qué grupos contables o qué almacén nombra el mensaje.",
      "posting-setup-missing.check2": "Si existe la configuración para esa combinación y tiene sus cuentas rellenadas.",
      "posting-setup-missing.check3": "Si el grupo contable o el almacén se añadió hace poco.",
      "record-blocked": "Un cliente, proveedor, producto u otro registro que usa la acción está bloqueado.",
      "record-blocked.check1": "Si el registro que nombra el mensaje está bloqueado en su ficha.",
      "record-blocked.check2": "Por qué se bloqueó y quién puede desbloquearlo.",
      "record-blocked.check3": "Si debería usarse en su lugar otro registro que no esté bloqueado.",
      "bc-label.why": "El mensaje es uno de los mensajes de error estándar de Business Central. Se reconoció por la redacción propia de Microsoft, que existe en todos los idiomas. La causa y las comprobaciones son consejos generales para este mensaje, no una conclusión sobre sus datos.",
      "field-must-equal.params": "{field} debe ser {expected} para la acción, pero es {current}.",
      "field-must-equal": "{field} debe ser {expected} para la acción, y no lo es.",
      "field-must-equal.check1": "Si se omitió un paso que cambia {field}, como lanzar o aprobar el documento.",
      "field-must-equal.check2": "Si {field} volvió a cambiarse, por ejemplo al volver a abrir el documento.",
      "field-must-equal.check3": "Si el error solo se produce con algunos registros.",
      "record-missing.params": "Business Central no encontró el registro {table} que necesita la acción ({record}).",
      "record-missing": "Business Central no encontró el registro {table} que necesita la acción.",
      "record-missing.check1": "Si existe un registro {table} con esos valores.",
      "record-missing.check2": "Si una configuración o una ficha apunta a un código que no se ha configurado, como una combinación de grupos contables.",
      "record-missing.check3": "Si el registro se eliminó o se cambió de nombre hace poco.",
      "related-missing.params": "{field} contiene {value}, que no existe en {related}.",
      "related-missing": "{field} contiene un valor que no existe donde Business Central lo busca.",
      "related-missing.check1": "Si {value} existe en {related}.",
      "related-missing.check2": "Si el valor se escribió de otra forma, se eliminó o se cambió de nombre.",
      "related-missing.check3": "Si el valor procede de un valor predeterminado, una plantilla o un registro copiado.",
      "record-exists.params": "Ya existe un registro {table} con los mismos valores ({record}).",
      "record-exists": "Ya existe un registro {table} con los mismos valores.",
      "record-exists.check1": "Si el registro ya se creó, por ejemplo porque la acción se ejecutó dos veces.",
      "record-exists.check2": "Si una serie numérica asigna un número que ya está en uso.",
      "record-exists.check3": "Si una importación o una integración vuelve a crear el mismo registro.",
      "changed-by-other.params": "El registro {table} se cambió en otro lugar después de abrir la página, por lo que el cambio no se guardó.",
      "changed-by-other": "El registro se cambió en otro lugar después de abrir la página, por lo que el cambio no se guardó.",
      "changed-by-other.check1": "Si otro usuario o un trabajo en segundo plano cambió el registro al mismo tiempo.",
      "changed-by-other.check2": "Si funciona al cerrar la página, volver a abrirla y repetir el cambio.",
      "changed-by-other.check3": "Si una extensión cambia el registro mientras la página lo guarda.",
      "deadlock.params": "Otro usuario o un trabajo en segundo plano estaba cambiando {table} al mismo tiempo, por lo que la acción se detuvo.",
      "deadlock": "Otro usuario o un trabajo en segundo plano estaba cambiando los mismos datos al mismo tiempo, por lo que la acción se detuvo.",
      "deadlock.check1": "Si la acción funciona al intentarlo de nuevo.",
      "deadlock.check2": "Si un movimiento de la cola de trabajo u otro usuario estaba registrando al mismo tiempo.",
      "deadlock.check3": "Si ocurre a menudo a ciertas horas del día.",
      "license-permission.params": "Probablemente la licencia del usuario no incluye el permiso {permission} para {object}.",
      "license-permission": "Probablemente la licencia del usuario no incluye un permiso que requiere la acción.",
      "license-permission.check1": "Qué licencia tiene el usuario.",
      "license-permission.check2": "Si la acción requiere una licencia más amplia, por ejemplo para una aplicación o una función.",
      "license-permission.check3": "Si un usuario con otra licencia puede realizar la misma acción.",
      "not-an-option.params": "{value} no es una de las opciones del campo. Las opciones son: {options}.",
      "not-an-option": "{value} no es una de las opciones del campo.",
      "not-an-option.check1": "Si el valor se escribió en otro idioma o con otras palabras.",
      "not-an-option.check2": "Si el valor procede de una importación, una integración o un registro copiado.",
      "not-an-option.check3": "Si una extensión añade la opción solo en algunas empresas.",
      "platform.why": "El mensaje es uno de los mensajes de error estándar de la plataforma Business Central. Se reconoció por la redacción propia de Microsoft, que existe en todos los idiomas. Los nombres proceden del propio mensaje. La causa y las comprobaciones son consejos generales, no una conclusión sobre sus datos.",
      origin: "Probablemente mostrado por",
      actions: "Acciones ofrecidas en el mensaje de error",
      "origin.in": "{objects} en {app}",
      "origin.more": "{objects} y {count} más",
      "known-error.params": "Una comprobación de la aplicación {app} de Microsoft detuvo la acción. El mensaje indica qué falta o qué es incorrecto.",
      "known-error": "Una comprobación de Business Central detuvo la acción. El mensaje indica qué falta o qué es incorrecto.",
      "known-error.check1": "Qué indica el mensaje que se debe cambiar, y en qué registro o página de configuración.",
      "known-error.check2": "Si la misma acción funciona con otro registro, lo que apunta a los datos y no al programa.",
      "known-error.check3": "Si la configuración o los datos que nombra el mensaje se han cambiado recientemente.",
      "known-error.why": "La redacción coincide con un mensaje de error de las propias aplicaciones de Microsoft, en cualquier idioma. Indica de dónde procede probablemente el mensaje, no por qué sus datos lo provocaron. Las comprobaciones son consejos generales.",
      "number-series.params": "La serie numérica {series} no puede asignar un número nuevo, por ejemplo porque sus números se han agotado o ninguna línea es válida para la fecha.",
      "number-series": "Una serie numérica no puede asignar un número nuevo, por ejemplo porque sus números se han agotado o ninguna línea es válida para la fecha.",
      "number-series.check1": "Si una línea de la serie numérica tiene una fecha inicial igual o anterior a la fecha del documento.",
      "number-series.check2": "Si el último número utilizado ha llegado al número final de la línea.",
      "number-series.check3": "Si la línea está abierta y la serie permite números predeterminados donde el número se asigna automáticamente.",
      "posted-number-used.params": "El número {number} que la serie numérica asigna al documento registrado ya está en uso, así que el documento no se puede registrar.",
      "posted-number-used": "El número que la serie numérica asigna al documento registrado ya está en uso, así que el documento no se puede registrar.",
      "posted-number-used.check1": "Si el último número utilizado en la línea de la serie es menor que números que ya existen.",
      "posted-number-used.check2": "Si se importaron o crearon documentos con números de la misma serie.",
      "posted-number-used.check3": "Si dos series numéricas asignan números en el mismo intervalo.",
      "dimension-mandatory.params": "Se requiere un valor para {dimension} en {record}, y no hay ninguno seleccionado.",
      "dimension-mandatory": "Una dimensión que debe tener un valor no lo tiene en el documento o en alguna de sus líneas.",
      "dimension-mandatory.check1": "Qué valores de dimensión tienen el documento y sus líneas.",
      "dimension-mandatory.check2": "Si las dimensiones predeterminadas del cliente, proveedor, producto o cuenta exigen un valor.",
      "dimension-mandatory.check3": "Si el valor falta solo en algunas líneas.",
      "item-tracking-required.params": "El producto {item} requiere un número de lote, de serie o de paquete, y no hay ninguno asignado en la línea.",
      "item-tracking-required": "El producto requiere un número de lote, de serie o de paquete, y no hay ninguno asignado en la línea.",
      "item-tracking-required.check1": "Si hay líneas de seguimiento de productos asignadas a la línea del documento.",
      "item-tracking-required.check2": "Si el código de seguimiento del producto exige seguimiento para este tipo de transacción.",
      "item-tracking-required.check3": "Si la cantidad de las líneas de seguimiento coincide con la cantidad de la línea.",
      "item-tracking-mismatch": "La cantidad de las líneas de seguimiento de productos no coincide con la cantidad de la línea del documento.",
      "item-tracking-mismatch.check1": "Si la cantidad a manipular en las líneas de seguimiento es igual a la cantidad a enviar, recibir o registrar.",
      "item-tracking-mismatch.check2": "Si la cantidad de la línea se cambió después de asignar el seguimiento.",
      "item-tracking-mismatch.check3": "Si los números de lote o de serie están disponibles en el almacén y la ubicación.",
      "approval-required": "El documento debe aprobarse antes de poder realizar la acción, o todavía está pendiente de aprobación.",
      "approval-required.check1": "Si se envió una solicitud de aprobación y cuál es su estado.",
      "approval-required.check2": "Si hay un flujo de trabajo de aprobación habilitado para este tipo de documento.",
      "approval-required.check3": "Si el documento se modificó después de aprobarse, lo que puede haberlo reabierto.",
      "duplicate-external-doc.params": "El documento del proveedor {document} ya se usa en otro documento del mismo proveedor.",
      "duplicate-external-doc": "El número de documento del proveedor ya se usa en otro documento del mismo proveedor.",
      "duplicate-external-doc.check1": "Si el número de factura o abono del proveedor está escrito correctamente.",
      "duplicate-external-doc.check2": "Si la misma factura ya se registró o está en otro documento abierto.",
      "duplicate-external-doc.check3": "Si la configuración de compras exige que el número de documento del proveedor sea único.",
      "nothing-to-handle": "No queda nada que manipular: las líneas no tienen cantidad a manipular, o todo ya se ha preparado, ubicado o manipulado.",
      "nothing-to-handle.check1": "Si las líneas tienen una cantidad a manipular.",
      "nothing-to-handle.check2": "Si el documento de origen está lanzado y si sus cantidades ya se han preparado o ubicado.",
      "nothing-to-handle.check3": "Si el almacén, la ubicación o los filtros de la acción excluyen las líneas.",
      "warehouse-handling-required": "El almacén exige manipulación de almacén, así que la cantidad debe manipularse primero con documentos de almacén, como un envío, una recepción, un picking o una ubicación.",
      "warehouse-handling-required.check1": "Qué manipulación de almacén exige el almacén.",
      "warehouse-handling-required.check2": "Si existe un documento de almacén para la línea y si está registrado.",
      "warehouse-handling-required.check3": "Si la línea debería usar otro almacén.",
      "accounting-period-missing": "Los períodos contables que necesita la acción no están configurados, por ejemplo para las fechas del documento o de una programación de fraccionamiento.",
      "accounting-period-missing.check1": "Si existen períodos contables para las fechas del documento o de la programación.",
      "accounting-period-missing.check2": "Si hay que crear un nuevo ejercicio.",
      "accounting-period-missing.check3": "Si una fecha está por error muy lejos en el futuro o el pasado.",
      "basis": "Comparado con los mensajes de Microsoft de Business Central {version}. Una versión más reciente puede redactar un mensaje de otra forma."
    },
    "da-DK": {
      title: "Mulig årsag", unconfirmed: "Ikke bekræftet", checks: "Det kan du kontrollere",
      why: "Hvorfor foreslås dette?", include: "Medtag, når rapporten sendes eller eksporteres",
      dismiss: "Passer ikke, skjul", hidden: "Den mulige årsag er skjult.", show: "Vis igen",
      exportTitle: "Mulig årsag (ikke bekræftet)", exportChecks: "Kontrollér",
      "permission.params": "Brugeren mangler sandsynligvis tilladelsen {permission} til {object}.",
      "permission": "Brugeren mangler sandsynligvis en tilladelse, som handlingen kræver.",
      "permission.check1": "Hvilke tilladelsessæt brugeren har i dette regnskab.",
      "permission.check2": "Om den samme handling virker for en bruger med flere tilladelser.",
      "permission.check3": "Om tilladelserne er ændret for nylig, for eksempel ved en opgradering.",
      "permission.why": "Fejlmeddelelsen siger, at en tilladelse mangler. Den siger ikke, hvilket tilladelsessæt der burde have givet den.",
      "required-value.params": "Feltet {field} i {table} er tomt, og Business Central kræver en værdi der.",
      "required-value": "Feltet {field} er tomt, og Business Central kræver en værdi der.",
      "required-value.check1": "Om {field} er udfyldt.",
      "required-value.check2": "Om en opsætningsside eller et debitor-, kreditor- eller varekort burde have udfyldt værdien.",
      "required-value.check3": "Om fejlen kun opstår for nogle poster.",
      "required-value.why": "Fejlmeddelelsen nævner det felt, der skal have en værdi. Feltet og tabellen kommer fra selve meddelelsen.",
      "network-unavailable.params": "En tjeneste, som Business Central kalder, svarede ikke som forventet (HTTP {status}). Fejlen ligger sandsynligvis uden for Business Central.",
      "network-unavailable": "En forbindelse, som Business Central har brug for, mislykkedes. Fejlen ligger sandsynligvis uden for Business Central.",
      "network-unavailable.check1": "Om tjenesten er tilgængelig lige nu.",
      "network-unavailable.check2": "Om den samme handling virker om lidt.",
      "network-unavailable.check3": "Om tjenestens adresse er angivet korrekt i integrationens opsætning.",
      "network-unavailable.why": "Fejlmeddelelsen indeholder en HTTP-statuskode eller siger, at forbindelsen mislykkedes. Den siger ikke, hvilken tjeneste der svarede.",
      "network-rejected.params": "En tjeneste, som Business Central kalder, afviste anmodningen (HTTP {status}).",
      "network-rejected.check1": "Om logon eller nøgle til forbindelsen stadig er gyldig.",
      "network-rejected.check2": "Om tjenestens adresse er angivet korrekt i integrationens opsætning.",
      "network-rejected.check3": "Om tjenesten har ændret, hvad den accepterer, for eksempel efter en opdatering.",
      "network-rejected.why": "Fejlmeddelelsen indeholder en HTTP-statuskode, der betyder, at anmodningen blev afvist. Den siger ikke, hvilken tjeneste der svarede.",
      "posting-date": "Bogføringsdatoen ligger uden for de datoer, som brugeren må bogføre på.",
      "posting-date.check1": "Hvilken bogføringsdato dokumentet eller kladdelinjen har.",
      "posting-date.check2": "Hvilke datoer brugeren må bogføre på. De kan angives for brugeren og for hele regnskabet.",
      "posting-date.check3": "Om perioden burde være åben, for eksempel i starten af en ny måned eller et nyt år.",
      "nothing-to-post": "Dokumentet eller kladden har ikke noget antal eller beløb tilbage at bogføre.",
      "nothing-to-post.check1": "Om linjerne har et antal eller et beløb.",
      "nothing-to-post.check2": "Om antal til levering, modtagelse eller fakturering er udfyldt på linjerne.",
      "nothing-to-post.check3": "Om linjerne allerede er bogført tidligere.",
      "out-of-balance": "Beløbene giver ikke nul tilsammen, så posterne balancerer ikke.",
      "out-of-balance.check1": "Om hver linje har det rigtige beløb og fortegn.",
      "out-of-balance.check2": "Om en modkonto mangler på en linje.",
      "out-of-balance.check3": "Om linjer med samme bilagsnummer og bogføringsdato hører sammen.",
      "already-scheduled": "Dokumentet venter allerede på at blive bogført i baggrunden, eller en tidligere bogføring i baggrunden stoppede.",
      "already-scheduled.check1": "Om dokumentet har en post i jobkøen, og hvilken status den har.",
      "already-scheduled.check2": "Om en tidligere bogføring i baggrunden endte med en fejl.",
      "already-scheduled.check3": "Om meddelelsens eget råd, at fjerne dokumentet fra jobkøen, gør det muligt at bogføre igen.",
      "not-on-inventory": "Der er ikke nok af varen på lager til det, linjen skal håndtere.",
      "not-on-inventory.check1": "Hvor meget af varen der er på lager på lokationen på bogføringsdatoen.",
      "not-on-inventory.check2": "Om antallet er reserveret til et andet dokument.",
      "not-on-inventory.check3": "Om en modtagelse eller et køb, der skulle komme først, er bogført.",
      "dimension-blocked": "Dimensionsværdierne, der bruges sammen på dokumentet eller linjen, danner en kombination, der er spærret.",
      "dimension-blocked.check1": "Hvilke dimensionsværdier dokumentet og dets linjer har.",
      "dimension-blocked.check2": "Hvilke dimensionskombinationer der er spærret i opsætningen af dimensioner.",
      "dimension-blocked.check3": "Om en standarddimension på en debitor, kreditor, vare eller konto gav værdien.",
      "posting-setup-missing": "En bogføringsopsætning, som bogføringen skal bruge, mangler for en kombination af bogføringsgrupper eller for en lokation.",
      "posting-setup-missing.check1": "Hvilke bogføringsgrupper eller hvilken lokation meddelelsen nævner.",
      "posting-setup-missing.check2": "Om opsætningen for den kombination findes og har sine konti udfyldt.",
      "posting-setup-missing.check3": "Om bogføringsgruppen eller lokationen er tilføjet for nylig.",
      "record-blocked": "En debitor, kreditor, vare eller en anden post, som handlingen bruger, er spærret.",
      "record-blocked.check1": "Om den post, meddelelsen nævner, er spærret på sit kort.",
      "record-blocked.check2": "Hvorfor den blev spærret, og hvem der kan ophæve spærringen.",
      "record-blocked.check3": "Om en anden post, der ikke er spærret, burde bruges i stedet.",
      "bc-label.why": "Meddelelsen er en af Business Centrals standardfejlmeddelelser. Den blev genkendt ud fra Microsofts egen formulering, som findes på alle sprog. Årsagen og kontrollerne er generelle råd til denne meddelelse, ikke en konklusion om jeres data.",
      "field-must-equal.params": "{field} skal være {expected} for handlingen, men er {current}.",
      "field-must-equal": "{field} skal være {expected} for handlingen, og det er det ikke.",
      "field-must-equal.check1": "Om et trin, der ændrer {field}, for eksempel frigivelse eller godkendelse af dokumentet, blev sprunget over.",
      "field-must-equal.check2": "Om {field} blev ændret tilbage, for eksempel da dokumentet blev genåbnet.",
      "field-must-equal.check3": "Om fejlen kun opstår for nogle poster.",
      "record-missing.params": "Business Central fandt ikke den post i {table}, som handlingen skal bruge ({record}).",
      "record-missing": "Business Central fandt ikke den post i {table}, som handlingen skal bruge.",
      "record-missing.check1": "Om der findes en post i {table} med de værdier.",
      "record-missing.check2": "Om en opsætning eller et kort peger på en kode, der ikke er sat op, for eksempel en kombination af bogføringsgrupper.",
      "record-missing.check3": "Om posten er slettet eller omdøbt for nylig.",
      "related-missing.params": "{field} indeholder {value}, som ikke findes i {related}.",
      "related-missing": "{field} indeholder en værdi, som ikke findes der, hvor Business Central slår den op.",
      "related-missing.check1": "Om {value} findes i {related}.",
      "related-missing.check2": "Om værdien blev skrevet på en anden måde, slettet eller omdøbt.",
      "related-missing.check3": "Om værdien kom fra en standardværdi, en skabelon eller en kopieret post.",
      "record-exists.params": "Der findes allerede en post i {table} med de samme værdier ({record}).",
      "record-exists": "Der findes allerede en post i {table} med de samme værdier.",
      "record-exists.check1": "Om posten allerede blev oprettet, for eksempel fordi handlingen blev kørt to gange.",
      "record-exists.check2": "Om en nummerserie udleverer et nummer, der allerede er i brug.",
      "record-exists.check3": "Om en import eller integration opretter den samme post igen.",
      "changed-by-other.params": "Posten {table} blev ændret et andet sted, efter at siden blev åbnet, så ændringen blev ikke gemt.",
      "changed-by-other": "Posten blev ændret et andet sted, efter at siden blev åbnet, så ændringen blev ikke gemt.",
      "changed-by-other.check1": "Om en anden bruger eller et baggrundsjob ændrede posten samtidig.",
      "changed-by-other.check2": "Om det virker at lukke siden, åbne den igen og gentage ændringen.",
      "changed-by-other.check3": "Om en udvidelse ændrer posten, mens siden gemmer den.",
      "deadlock.params": "En anden bruger eller et baggrundsjob ændrede {table} samtidig, så handlingen blev stoppet.",
      "deadlock": "En anden bruger eller et baggrundsjob ændrede de samme data samtidig, så handlingen blev stoppet.",
      "deadlock.check1": "Om handlingen virker, når du prøver igen.",
      "deadlock.check2": "Om en post i jobkøen eller en anden bruger bogførte samtidig.",
      "deadlock.check3": "Om det ofte sker på bestemte tidspunkter af dagen.",
      "license-permission.params": "Brugerens licens omfatter sandsynligvis ikke tilladelsen {permission} til {object}.",
      "license-permission": "Brugerens licens omfatter sandsynligvis ikke en tilladelse, som handlingen kræver.",
      "license-permission.check1": "Hvilken licens brugeren har.",
      "license-permission.check2": "Om handlingen kræver en licens, der omfatter mere, for eksempel til en app eller en funktion.",
      "license-permission.check3": "Om en bruger med en anden licens kan udføre den samme handling.",
      "not-an-option.params": "{value} er ikke en af valgmulighederne for feltet. Valgmulighederne er: {options}.",
      "not-an-option": "{value} er ikke en af valgmulighederne for feltet.",
      "not-an-option.check1": "Om værdien blev skrevet på et andet sprog eller med andre ord.",
      "not-an-option.check2": "Om værdien kommer fra en import, en integration eller en kopieret post.",
      "not-an-option.check3": "Om en udvidelse kun tilføjer valgmuligheden i nogle regnskaber.",
      "platform.why": "Meddelelsen er en af Business Central-platformens standardfejlmeddelelser. Den blev genkendt ud fra Microsofts egen formulering, som findes på alle sprog. Navnene kommer fra selve meddelelsen. Årsagen og kontrollerne er generelle råd, ikke en konklusion om jeres data.",
      origin: "Vises sandsynligvis af",
      actions: "Handlinger, der tilbydes i fejlmeddelelsen",
      "origin.in": "{objects} i {app}",
      "origin.more": "{objects} og {count} andre",
      "known-error.params": "En kontrol i Microsofts {app} stoppede handlingen. Meddelelsen siger, hvad der mangler eller er forkert.",
      "known-error": "En kontrol i Business Central stoppede handlingen. Meddelelsen siger, hvad der mangler eller er forkert.",
      "known-error.check1": "Hvad meddelelsen siger skal ændres, og på hvilken post eller opsætningsside.",
      "known-error.check2": "Om den samme handling virker for en anden post, hvilket peger på dataene snarere end på programmet.",
      "known-error.check3": "Om den opsætning eller de data, som meddelelsen nævner, er ændret for nylig.",
      "known-error.why": "Formuleringen svarer til en fejlmeddelelse i Microsofts egne apps, på alle sprog. Den viser, hvor meddelelsen sandsynligvis kommer fra, ikke hvorfor jeres data udløste den. Kontrollerne er generelle råd.",
      "number-series.params": "Nummerserien {series} kan ikke give et nyt nummer, for eksempel fordi numrene er brugt op, eller ingen linje gælder for datoen.",
      "number-series": "En nummerserie kan ikke give et nyt nummer, for eksempel fordi numrene er brugt op, eller ingen linje gælder for datoen.",
      "number-series.check1": "Om en linje i nummerserien har en startdato på eller før dokumentets dato.",
      "number-series.check2": "Om det sidst anvendte nummer har nået linjens slutnummer.",
      "number-series.check3": "Om linjen er åben, og serien tillader standardnumre, hvor nummeret tildeles automatisk.",
      "posted-number-used.params": "Nummeret {number}, som nummerserien giver det bogførte dokument, er allerede brugt, så dokumentet kan ikke bogføres.",
      "posted-number-used": "Nummeret, som nummerserien giver det bogførte dokument, er allerede brugt, så dokumentet kan ikke bogføres.",
      "posted-number-used.check1": "Om det sidst anvendte nummer på nummerserielinjen er lavere end numre, der allerede findes.",
      "posted-number-used.check2": "Om dokumenter er importeret eller oprettet med numre fra samme serie.",
      "posted-number-used.check3": "Om to nummerserier giver numre i samme interval.",
      "dimension-mandatory.params": "Der kræves en værdi for {dimension} for {record}, og ingen er valgt.",
      "dimension-mandatory": "En dimension, der skal have en værdi, mangler værdi på dokumentet eller en af dets linjer.",
      "dimension-mandatory.check1": "Hvilke dimensionsværdier dokumentet og dets linjer har.",
      "dimension-mandatory.check2": "Om standarddimensionerne for debitoren, kreditoren, varen eller kontoen kræver en værdi.",
      "dimension-mandatory.check3": "Om værdien kun mangler på nogle linjer.",
      "item-tracking-required.params": "Vare {item} kræver et lot-, serie- eller pakkenummer, og der er ikke tildelt noget på linjen.",
      "item-tracking-required": "Varen kræver et lot-, serie- eller pakkenummer, og der er ikke tildelt noget på linjen.",
      "item-tracking-required.check1": "Om der er tildelt varesporingslinjer på dokumentlinjen.",
      "item-tracking-required.check2": "Om varens varesporingskode kræver sporing for denne type transaktion.",
      "item-tracking-required.check3": "Om antallet i varesporingslinjerne svarer til antallet på linjen.",
      "item-tracking-mismatch": "Antallet i varesporingslinjerne svarer ikke til antallet på dokumentlinjen.",
      "item-tracking-mismatch.check1": "Om antallet til håndtering i varesporingslinjerne svarer til det antal, der skal leveres, modtages eller bogføres.",
      "item-tracking-mismatch.check2": "Om antallet på linjen er ændret, efter at varesporing blev tildelt.",
      "item-tracking-mismatch.check3": "Om lot- eller serienumrene er tilgængelige på lokationen og placeringen.",
      "approval-required": "Dokumentet skal godkendes, før handlingen kan udføres, eller det venter stadig på godkendelse.",
      "approval-required.check1": "Om der er sendt en godkendelsesanmodning, og hvilken status den har.",
      "approval-required.check2": "Om et godkendelsesworkflow er aktiveret for denne type dokument.",
      "approval-required.check3": "Om dokumentet blev ændret, efter det blev godkendt, hvilket kan have genåbnet det.",
      "duplicate-external-doc.params": "Kreditorens dokument {document} er allerede brugt på et andet dokument fra samme kreditor.",
      "duplicate-external-doc": "Kreditorens dokumentnummer er allerede brugt på et andet dokument fra samme kreditor.",
      "duplicate-external-doc.check1": "Om kreditorens faktura- eller kreditnotanummer er skrevet korrekt.",
      "duplicate-external-doc.check2": "Om den samme faktura allerede er bogført eller findes på et andet åbent dokument.",
      "duplicate-external-doc.check3": "Om købsopsætningen kræver, at kreditorens dokumentnummer er entydigt.",
      "nothing-to-handle": "Der er intet tilbage at håndtere: linjerne har intet antal til håndtering, eller alt er allerede plukket, lagt på lager eller håndteret.",
      "nothing-to-handle.check1": "Om linjerne har et antal til håndtering.",
      "nothing-to-handle.check2": "Om kildedokumentet er frigivet, og om dets antal allerede er plukket eller lagt på lager.",
      "nothing-to-handle.check3": "Om handlingens lokation, placering eller filtre udelukker linjerne.",
      "warehouse-handling-required": "Lokationen kræver lagerhåndtering, så antallet skal først håndteres med lagerdokumenter, for eksempel en udlevering, en modtagelse, et pluk eller en læg-på-lager.",
      "warehouse-handling-required.check1": "Hvilken lagerhåndtering lokationen kræver.",
      "warehouse-handling-required.check2": "Om der findes et lagerdokument for linjen, og om det er registreret eller bogført.",
      "warehouse-handling-required.check3": "Om linjen burde bruge en anden lokation.",
      "accounting-period-missing": "De regnskabsperioder, som handlingen har brug for, er ikke oprettet, for eksempel for dokumentets datoer eller for en periodiseringsplan.",
      "accounting-period-missing.check1": "Om der findes regnskabsperioder for dokumentets eller planens datoer.",
      "accounting-period-missing.check2": "Om der skal oprettes et nyt regnskabsår.",
      "accounting-period-missing.check3": "Om en dato ved en fejl ligger langt ude i fremtiden eller fortiden.",
      "basis": "Sammenlignet med Microsofts meddelelser fra Business Central {version}. En nyere version kan formulere en meddelelse anderledes."
    },
    "fi-FI": {
      title: "Mahdollinen syy", unconfirmed: "Ei vahvistettu", checks: "Näitä voit tarkistaa",
      why: "Miksi tätä ehdotetaan?", include: "Ota mukaan, kun raportti lähetetään tai viedään",
      dismiss: "Ei pidä paikkaansa, piilota", hidden: "Mahdollinen syy on piilotettu.", show: "Näytä uudelleen",
      exportTitle: "Mahdollinen syy (ei vahvistettu)", exportChecks: "Tarkistettavaa",
      "permission.params": "Käyttäjältä puuttuu todennäköisesti käyttöoikeus {permission} kohteeseen {object}.",
      "permission": "Käyttäjältä puuttuu todennäköisesti käyttöoikeus, jota toiminto edellyttää.",
      "permission.check1": "Mitkä käyttöoikeusjoukot käyttäjällä on tässä yrityksessä.",
      "permission.check2": "Toimiiko sama toiminto käyttäjällä, jolla on enemmän käyttöoikeuksia.",
      "permission.check3": "Onko käyttöoikeuksia muutettu äskettäin, esimerkiksi päivityksen yhteydessä.",
      "permission.why": "Virhesanoman mukaan käyttöoikeus puuttuu. Siinä ei kerrota, minkä käyttöoikeusjoukon olisi pitänyt antaa se.",
      "required-value.params": "Kenttä {field} taulussa {table} on tyhjä, ja Business Central edellyttää siihen arvon.",
      "required-value": "Kenttä {field} on tyhjä, ja Business Central edellyttää siihen arvon.",
      "required-value.check1": "Onko {field} täytetty.",
      "required-value.check2": "Olisiko asetussivun tai asiakas-, toimittaja- tai nimikekortin pitänyt täyttää arvo.",
      "required-value.check3": "Esiintyykö virhe vain joillakin tietueilla.",
      "required-value.why": "Virhesanoma nimeää kentän, jolla on oltava arvo. Kenttä ja taulu ovat peräisin itse sanomasta.",
      "network-unavailable.params": "Palvelu, jota Business Central kutsuu, ei vastannut odotetusti (HTTP {status}). Vika on todennäköisesti Business Centralin ulkopuolella.",
      "network-unavailable": "Yhteys, jota Business Central tarvitsee, epäonnistui. Vika on todennäköisesti Business Centralin ulkopuolella.",
      "network-unavailable.check1": "Onko palvelu juuri nyt käytettävissä.",
      "network-unavailable.check2": "Toimiiko sama toiminto hetken kuluttua.",
      "network-unavailable.check3": "Onko palvelun osoite määritetty oikein integraation asetuksissa.",
      "network-unavailable.why": "Virhesanomassa on HTTP-tilakoodi, tai sen mukaan yhteys epäonnistui. Siinä ei kerrota, mikä palvelu vastasi.",
      "network-rejected.params": "Palvelu, jota Business Central kutsuu, hylkäsi pyynnön (HTTP {status}).",
      "network-rejected.check1": "Onko yhteyden kirjautuminen tai avain yhä voimassa.",
      "network-rejected.check2": "Onko palvelun osoite määritetty oikein integraation asetuksissa.",
      "network-rejected.check3": "Onko palvelu muuttanut sitä, mitä se hyväksyy, esimerkiksi päivityksen jälkeen.",
      "network-rejected.why": "Virhesanomassa on HTTP-tilakoodi, joka tarkoittaa, että pyyntö hylättiin. Siinä ei kerrota, mikä palvelu vastasi.",
      "posting-date": "Kirjauspäivämäärä on niiden päivämäärien ulkopuolella, joille käyttäjä saa kirjata.",
      "posting-date.check1": "Mikä kirjauspäivämäärä asiakirjalla tai kirjauskansion rivillä on.",
      "posting-date.check2": "Mille päivämäärille käyttäjä saa kirjata. Ne voidaan määrittää käyttäjälle ja koko yritykselle.",
      "posting-date.check3": "Pitäisikö kauden olla avoin, esimerkiksi uuden kuukauden tai vuoden alussa.",
      "nothing-to-post": "Asiakirjalla tai kirjauskansiolla ei ole enää määrää tai summaa kirjattavaksi.",
      "nothing-to-post.check1": "Onko riveillä määrä tai summa.",
      "nothing-to-post.check2": "Onko toimitettava, vastaanotettava tai laskutettava määrä täytetty riveille.",
      "nothing-to-post.check3": "Onko rivit jo kirjattu aiemmin.",
      "out-of-balance": "Summat eivät ole yhteensä nolla, joten kirjaukset eivät täsmää.",
      "out-of-balance.check1": "Onko jokaisella rivillä oikea summa ja etumerkki.",
      "out-of-balance.check2": "Puuttuuko joltain riviltä vastatili.",
      "out-of-balance.check3": "Kuuluvatko rivit, joilla on sama asiakirjanumero ja kirjauspäivämäärä, yhteen.",
      "already-scheduled": "Asiakirja odottaa jo kirjausta taustalla, tai aiempi taustakirjaus keskeytyi.",
      "already-scheduled.check1": "Onko asiakirjalla tapahtuma työjonossa ja mikä sen tila on.",
      "already-scheduled.check2": "Päättyikö aiempi taustakirjaus virheeseen.",
      "already-scheduled.check3": "Voiko asiakirjan kirjata uudelleen, kun noudattaa sanoman omaa neuvoa ja poistaa sen työjonosta.",
      "not-on-inventory": "Nimikettä ei ole varastossa tarpeeksi siihen, mitä rivin pitäisi käsitellä.",
      "not-on-inventory.check1": "Paljonko nimikettä on varastossa sijainnissa kirjauspäivämääränä.",
      "not-on-inventory.check2": "Onko määrä varattu toiselle asiakirjalle.",
      "not-on-inventory.check3": "Onko ensin tuleva vastaanotto tai osto kirjattu.",
      "dimension-blocked": "Asiakirjalla tai rivillä yhdessä käytetyt dimensioarvot muodostavat estetyn yhdistelmän.",
      "dimension-blocked.check1": "Mitkä dimensioarvot asiakirjalla ja sen riveillä on.",
      "dimension-blocked.check2": "Mitkä dimensioyhdistelmät on estetty dimensioiden asetuksissa.",
      "dimension-blocked.check3": "Antoiko arvon asiakkaan, toimittajan, nimikkeen tai tilin oletusdimensio.",
      "posting-setup-missing": "Kirjauksen tarvitsema kirjausasetus puuttuu kirjausryhmien yhdistelmältä tai sijainnilta.",
      "posting-setup-missing.check1": "Mitkä kirjausryhmät tai mikä sijainti sanomassa mainitaan.",
      "posting-setup-missing.check2": "Onko yhdistelmän asetus olemassa ja onko sen tilit täytetty.",
      "posting-setup-missing.check3": "Onko kirjausryhmä tai sijainti lisätty äskettäin.",
      "record-blocked": "Asiakas, toimittaja, nimike tai muu tietue, jota toiminto käyttää, on estetty.",
      "record-blocked.check1": "Onko sanomassa mainittu tietue estetty kortillaan.",
      "record-blocked.check2": "Miksi se estettiin ja kuka voi poistaa eston.",
      "record-blocked.check3": "Pitäisikö sen sijaan käyttää toista tietuetta, jota ei ole estetty.",
      "bc-label.why": "Sanoma on yksi Business Centralin vakiovirhesanomista. Se tunnistettiin Microsoftin omasta muotoilusta, joka on olemassa kaikilla kielillä. Syy ja tarkistukset ovat yleisiä neuvoja tähän sanomaan, eivät päätelmä tiedoistanne.",
      "field-must-equal.params": "Kohteen {field} on oltava toimintoa varten {expected}, mutta se on {current}.",
      "field-must-equal": "Kohteen {field} on oltava toimintoa varten {expected}, mutta se ei ole.",
      "field-must-equal.check1": "Ohitettiinko vaihe, joka muuttaa kohdetta {field}, esimerkiksi asiakirjan vapauttaminen tai hyväksyminen.",
      "field-must-equal.check2": "Muutettiinko {field} takaisin, esimerkiksi kun asiakirja avattiin uudelleen.",
      "field-must-equal.check3": "Esiintyykö virhe vain joillakin tietueilla.",
      "record-missing.params": "Business Central ei löytänyt tietuetta {table}, jota toiminto tarvitsee ({record}).",
      "record-missing": "Business Central ei löytänyt tietuetta {table}, jota toiminto tarvitsee.",
      "record-missing.check1": "Onko kohteessa {table} tietue, jolla on nämä arvot.",
      "record-missing.check2": "Viittaako asetus tai kortti koodiin, jota ei ole määritetty, esimerkiksi kirjausryhmien yhdistelmään.",
      "record-missing.check3": "Onko tietue poistettu tai nimetty uudelleen äskettäin.",
      "related-missing.params": "Kohteessa {field} on arvo {value}, jota ei ole kohteessa {related}.",
      "related-missing": "Kohteessa {field} on arvo, jota ei ole siellä, mistä Business Central sitä hakee.",
      "related-missing.check1": "Onko {value} olemassa kohteessa {related}.",
      "related-missing.check2": "Kirjoitettiinko arvo eri tavalla, poistettiinko se tai nimettiinkö se uudelleen.",
      "related-missing.check3": "Tuliko arvo oletusarvosta, mallista tai kopioidusta tietueesta.",
      "record-exists.params": "Kohteessa {table} on jo tietue, jolla on samat arvot ({record}).",
      "record-exists": "Kohteessa {table} on jo tietue, jolla on samat arvot.",
      "record-exists.check1": "Onko tietue jo luotu, esimerkiksi koska toiminto suoritettiin kahdesti.",
      "record-exists.check2": "Antaako numerosarja numeron, joka on jo käytössä.",
      "record-exists.check3": "Luoko tuonti tai integraatio saman tietueen uudelleen.",
      "changed-by-other.params": "Tietuetta {table} muutettiin muualla sivun avaamisen jälkeen, joten muutosta ei tallennettu.",
      "changed-by-other": "Tietuetta muutettiin muualla sivun avaamisen jälkeen, joten muutosta ei tallennettu.",
      "changed-by-other.check1": "Muuttiko toinen käyttäjä tai taustatyö tietuetta samaan aikaan.",
      "changed-by-other.check2": "Toimiiko se, kun suljet sivun, avaat sen uudelleen ja teet muutoksen uudelleen.",
      "changed-by-other.check3": "Muuttaako laajennus tietuetta, kun sivu tallentaa sitä.",
      "deadlock.params": "Toinen käyttäjä tai taustatyö muutti kohdetta {table} samaan aikaan, joten toiminto pysäytettiin.",
      "deadlock": "Toinen käyttäjä tai taustatyö muutti samoja tietoja samaan aikaan, joten toiminto pysäytettiin.",
      "deadlock.check1": "Toimiiko toiminto, kun yrität uudelleen.",
      "deadlock.check2": "Kirjasiko työjonon tapahtuma tai toinen käyttäjä samaan aikaan.",
      "deadlock.check3": "Tapahtuuko sitä usein tiettyinä vuorokaudenaikoina.",
      "license-permission.params": "Käyttäjän lisenssi ei todennäköisesti sisällä oikeutta {permission} kohteeseen {object}.",
      "license-permission": "Käyttäjän lisenssi ei todennäköisesti sisällä oikeutta, jota toiminto edellyttää.",
      "license-permission.check1": "Mikä lisenssi käyttäjällä on.",
      "license-permission.check2": "Edellyttääkö toiminto laajempaa lisenssiä, esimerkiksi sovellusta tai toimintoa varten.",
      "license-permission.check3": "Voiko käyttäjä, jolla on toinen lisenssi, tehdä saman toiminnon.",
      "not-an-option.params": "{value} ei ole kentän vaihtoehto. Vaihtoehdot ovat: {options}.",
      "not-an-option": "{value} ei ole kentän vaihtoehto.",
      "not-an-option.check1": "Kirjoitettiinko arvo toisella kielellä tai eri sanoin.",
      "not-an-option.check2": "Tuleeko arvo tuonnista, integraatiosta tai kopioidusta tietueesta.",
      "not-an-option.check3": "Lisääkö laajennus vaihtoehdon vain joissakin yrityksissä.",
      "platform.why": "Sanoma on yksi Business Central -alustan vakiovirhesanomista. Se tunnistettiin Microsoftin omasta muotoilusta, joka on olemassa kaikilla kielillä. Nimet ovat peräisin itse sanomasta. Syy ja tarkistukset ovat yleisiä neuvoja, eivät päätelmä tiedoistanne.",
      origin: "Todennäköinen lähde",
      actions: "Virheilmoituksessa tarjotut toiminnot",
      "origin.in": "{objects} ({app})",
      "origin.more": "{objects} ja {count} muuta",
      "known-error.params": "Microsoftin sovelluksen {app} tarkistus pysäytti toiminnon. Ilmoitus kertoo, mitä puuttuu tai mikä on väärin.",
      "known-error": "Business Centralin tarkistus pysäytti toiminnon. Ilmoitus kertoo, mitä puuttuu tai mikä on väärin.",
      "known-error.check1": "Mitä ilmoituksen mukaan on muutettava ja missä tietueessa tai asetussivulla.",
      "known-error.check2": "Toimiiko sama toiminto toisella tietueella, mikä viittaa tietoihin eikä ohjelmaan.",
      "known-error.check3": "Onko ilmoituksessa mainittuja asetuksia tai tietoja muutettu äskettäin.",
      "known-error.why": "Sanamuoto vastaa Microsoftin omien sovellusten virheilmoitusta millä tahansa kielellä. Se kertoo, mistä ilmoitus todennäköisesti tulee, ei sitä, miksi tietonne aiheuttivat sen. Tarkistukset ovat yleisiä neuvoja.",
      "number-series.params": "Numerosarja {series} ei voi antaa uutta numeroa, esimerkiksi koska sen numerot ovat loppuneet tai mikään rivi ei ole voimassa päivämääränä.",
      "number-series": "Numerosarja ei voi antaa uutta numeroa, esimerkiksi koska sen numerot ovat loppuneet tai mikään rivi ei ole voimassa päivämääränä.",
      "number-series.check1": "Onko numerosarjan rivillä alkupäivä, joka on asiakirjan päivämäärä tai sitä aiemmin.",
      "number-series.check2": "Onko viimeksi käytetty numero saavuttanut rivin loppunumeron.",
      "number-series.check3": "Onko rivi avoin ja salliiko sarja oletusnumerot, kun numero annetaan automaattisesti.",
      "posted-number-used.params": "Numero {number}, jonka numerosarja antaa kirjatulle asiakirjalle, on jo käytössä, joten asiakirjaa ei voi kirjata.",
      "posted-number-used": "Numero, jonka numerosarja antaa kirjatulle asiakirjalle, on jo käytössä, joten asiakirjaa ei voi kirjata.",
      "posted-number-used.check1": "Onko numerosarjan rivin viimeksi käytetty numero pienempi kuin jo olemassa olevat numerot.",
      "posted-number-used.check2": "Onko asiakirjoja tuotu tai luotu saman sarjan numeroilla.",
      "posted-number-used.check3": "Antavatko kaksi numerosarjaa numeroita samalta väliltä.",
      "dimension-mandatory.params": "{record} edellyttää arvoa kohteelle {dimension}, eikä arvoa ole valittu.",
      "dimension-mandatory": "Dimensiolla, jolla on oltava arvo, ei ole arvoa asiakirjassa tai jollakin sen rivillä.",
      "dimension-mandatory.check1": "Mitkä dimension arvot asiakirjalla ja sen riveillä on.",
      "dimension-mandatory.check2": "Edellyttävätkö asiakkaan, toimittajan, nimikkeen tai tilin oletusdimensiot arvoa.",
      "dimension-mandatory.check3": "Puuttuuko arvo vain joiltakin riveiltä.",
      "item-tracking-required.params": "Nimike {item} edellyttää erä-, sarja- tai pakkausnumeroa, eikä rivillä ole sellaista.",
      "item-tracking-required": "Nimike edellyttää erä-, sarja- tai pakkausnumeroa, eikä rivillä ole sellaista.",
      "item-tracking-required.check1": "Onko asiakirjan riville määritetty nimikkeen seurantarivejä.",
      "item-tracking-required.check2": "Edellyttääkö nimikkeen seurantakoodi seurantaa tämän tyyppisessä tapahtumassa.",
      "item-tracking-required.check3": "Vastaako seurantarivien määrä rivin määrää.",
      "item-tracking-mismatch": "Nimikkeen seurantarivien määrä ei vastaa asiakirjan rivin määrää.",
      "item-tracking-mismatch.check1": "Onko seurantarivien käsiteltävä määrä sama kuin toimitettava, vastaanotettava tai kirjattava määrä.",
      "item-tracking-mismatch.check2": "Onko rivin määrää muutettu sen jälkeen, kun seuranta määritettiin.",
      "item-tracking-mismatch.check3": "Ovatko erä- tai sarjanumerot saatavilla sijainnissa ja hyllypaikassa.",
      "approval-required": "Asiakirja on hyväksyttävä ennen kuin toiminto voidaan tehdä, tai se odottaa vielä hyväksyntää.",
      "approval-required.check1": "Onko hyväksyntäpyyntö lähetetty ja mikä sen tila on.",
      "approval-required.check2": "Onko hyväksynnän työnkulku otettu käyttöön tämän tyyppisille asiakirjoille.",
      "approval-required.check3": "Onko asiakirjaa muutettu hyväksynnän jälkeen, mikä on voinut avata sen uudelleen.",
      "duplicate-external-doc.params": "Toimittajan asiakirja {document} on jo käytössä toisessa saman toimittajan asiakirjassa.",
      "duplicate-external-doc": "Toimittajan asiakirjanumero on jo käytössä toisessa saman toimittajan asiakirjassa.",
      "duplicate-external-doc.check1": "Onko toimittajan laskun tai hyvityslaskun numero kirjoitettu oikein.",
      "duplicate-external-doc.check2": "Onko sama lasku jo kirjattu tai onko se toisessa avoimessa asiakirjassa.",
      "duplicate-external-doc.check3": "Edellyttävätkö oston asetukset, että toimittajan asiakirjanumero on yksilöllinen.",
      "nothing-to-handle": "Käsiteltävää ei ole jäljellä: riveillä ei ole käsiteltävää määrää, tai kaikki on jo kerätty, hyllytetty tai käsitelty.",
      "nothing-to-handle.check1": "Onko riveillä käsiteltävä määrä.",
      "nothing-to-handle.check2": "Onko lähdeasiakirja vapautettu ja onko sen määrät jo kerätty tai hyllytetty.",
      "nothing-to-handle.check3": "Rajaavatko toiminnon sijainti, hyllypaikka tai suodattimet rivit pois.",
      "warehouse-handling-required": "Sijainti edellyttää varastokäsittelyä, joten määrä on ensin käsiteltävä varastoasiakirjoilla, kuten toimituksella, vastaanotolla, keräilyllä tai hyllytyksellä.",
      "warehouse-handling-required.check1": "Millaista varastokäsittelyä sijainti edellyttää.",
      "warehouse-handling-required.check2": "Onko rivillä varastoasiakirja ja onko se rekisteröity tai kirjattu.",
      "warehouse-handling-required.check3": "Pitäisikö rivillä käyttää toista sijaintia.",
      "accounting-period-missing": "Toiminnon tarvitsemia kirjanpitokausia ei ole määritetty, esimerkiksi asiakirjan tai jaksotusaikataulun päivämäärille.",
      "accounting-period-missing.check1": "Onko asiakirjan tai aikataulun päivämäärille kirjanpitokausia.",
      "accounting-period-missing.check2": "Onko uusi tilikausi luotava.",
      "accounting-period-missing.check3": "Onko päivämäärä vahingossa kaukana tulevaisuudessa tai menneisyydessä.",
      "basis": "Verrattu Microsoftin Business Central {version} -version ilmoituksiin. Uudempi versio voi muotoilla ilmoituksen toisin."
    },
    "nb-NO": {
      title: "Mulig årsak", unconfirmed: "Ikke bekreftet", checks: "Dette kan du kontrollere",
      why: "Hvorfor foreslås dette?", include: "Ta med når rapporten sendes eller eksporteres",
      dismiss: "Stemmer ikke, skjul", hidden: "Den mulige årsaken er skjult.", show: "Vis igjen",
      exportTitle: "Mulig årsak (ikke bekreftet)", exportChecks: "Kontroller",
      "permission.params": "Brukeren mangler sannsynligvis tillatelsen {permission} for {object}.",
      "permission": "Brukeren mangler sannsynligvis en tillatelse som handlingen krever.",
      "permission.check1": "Hvilke tillatelsessett brukeren har i dette selskapet.",
      "permission.check2": "Om den samme handlingen fungerer for en bruker med flere tillatelser.",
      "permission.check3": "Om tillatelsene er endret nylig, for eksempel ved en oppgradering.",
      "permission.why": "Feilmeldingen sier at en tillatelse mangler. Den sier ikke hvilket tillatelsessett som skulle ha gitt den.",
      "required-value.params": "Feltet {field} i {table} er tomt, og Business Central krever en verdi der.",
      "required-value": "Feltet {field} er tomt, og Business Central krever en verdi der.",
      "required-value.check1": "Om {field} er fylt ut.",
      "required-value.check2": "Om en oppsettside eller et kunde-, leverandør- eller varekort skulle ha fylt ut verdien.",
      "required-value.check3": "Om feilen bare oppstår for noen poster.",
      "required-value.why": "Feilmeldingen nevner feltet som må ha en verdi. Feltet og tabellen kommer fra selve meldingen.",
      "network-unavailable.params": "En tjeneste som Business Central kaller, svarte ikke som forventet (HTTP {status}). Feilen ligger sannsynligvis utenfor Business Central.",
      "network-unavailable": "En tilkobling som Business Central trenger, mislyktes. Feilen ligger sannsynligvis utenfor Business Central.",
      "network-unavailable.check1": "Om tjenesten er tilgjengelig akkurat nå.",
      "network-unavailable.check2": "Om den samme handlingen fungerer om en stund.",
      "network-unavailable.check3": "Om adressen til tjenesten er riktig angitt i oppsettet for integrasjonen.",
      "network-unavailable.why": "Feilmeldingen inneholder en HTTP-statuskode eller sier at tilkoblingen mislyktes. Den sier ikke hvilken tjeneste som svarte.",
      "network-rejected.params": "En tjeneste som Business Central kaller, avviste forespørselen (HTTP {status}).",
      "network-rejected.check1": "Om påloggingen eller nøkkelen for tilkoblingen fortsatt er gyldig.",
      "network-rejected.check2": "Om adressen til tjenesten er riktig angitt i oppsettet for integrasjonen.",
      "network-rejected.check3": "Om tjenesten har endret hva den godtar, for eksempel etter en oppdatering.",
      "network-rejected.why": "Feilmeldingen inneholder en HTTP-statuskode som betyr at forespørselen ble avvist. Den sier ikke hvilken tjeneste som svarte.",
      "posting-date": "Bokføringsdatoen ligger utenfor datoene som brukeren har lov til å bokføre på.",
      "posting-date.check1": "Hvilken bokføringsdato dokumentet eller kladdelinjen har.",
      "posting-date.check2": "Hvilke datoer brukeren kan bokføre på. De kan angis for brukeren og for hele selskapet.",
      "posting-date.check3": "Om perioden burde være åpen, for eksempel i starten av en ny måned eller et nytt år.",
      "nothing-to-post": "Dokumentet eller kladden har ikke noe antall eller beløp igjen å bokføre.",
      "nothing-to-post.check1": "Om linjene har et antall eller et beløp.",
      "nothing-to-post.check2": "Om antall som skal leveres, mottas eller faktureres, er fylt ut på linjene.",
      "nothing-to-post.check3": "Om linjene allerede er bokført tidligere.",
      "out-of-balance": "Beløpene blir ikke null til sammen, så postene balanserer ikke.",
      "out-of-balance.check1": "Om hver linje har riktig beløp og fortegn.",
      "out-of-balance.check2": "Om en motkonto mangler på en linje.",
      "out-of-balance.check3": "Om linjer med samme dokumentnummer og bokføringsdato hører sammen.",
      "already-scheduled": "Dokumentet venter allerede på å bli bokført i bakgrunnen, eller en tidligere bokføring i bakgrunnen stoppet.",
      "already-scheduled.check1": "Om dokumentet har en post i jobbkøen, og hvilken status den har.",
      "already-scheduled.check2": "Om en tidligere bokføring i bakgrunnen endte med en feil.",
      "already-scheduled.check3": "Om meldingens eget råd, å fjerne dokumentet fra jobbkøen, gjør det mulig å bokføre på nytt.",
      "not-on-inventory": "Det er ikke nok av varen på lager for det linjen skal håndtere.",
      "not-on-inventory.check1": "Hvor mye av varen som er på lager på lokasjonen på bokføringsdatoen.",
      "not-on-inventory.check2": "Om antallet er reservert for et annet dokument.",
      "not-on-inventory.check3": "Om et mottak eller kjøp som skulle komme først, er bokført.",
      "dimension-blocked": "Dimensjonsverdiene som brukes sammen på dokumentet eller linjen, danner en kombinasjon som er sperret.",
      "dimension-blocked.check1": "Hvilke dimensjonsverdier dokumentet og linjene har.",
      "dimension-blocked.check2": "Hvilke dimensjonskombinasjoner som er sperret i oppsettet for dimensjoner.",
      "dimension-blocked.check3": "Om en standarddimensjon på en kunde, leverandør, vare eller konto ga verdien.",
      "posting-setup-missing": "Et bokføringsoppsett som bokføringen trenger, mangler for en kombinasjon av bokføringsgrupper eller for en lokasjon.",
      "posting-setup-missing.check1": "Hvilke bokføringsgrupper eller hvilken lokasjon meldingen nevner.",
      "posting-setup-missing.check2": "Om oppsettet for den kombinasjonen finnes og har kontoene fylt ut.",
      "posting-setup-missing.check3": "Om bokføringsgruppen eller lokasjonen er lagt til nylig.",
      "record-blocked": "En kunde, leverandør, vare eller en annen post som handlingen bruker, er sperret.",
      "record-blocked.check1": "Om posten som meldingen nevner, er sperret på kortet sitt.",
      "record-blocked.check2": "Hvorfor den ble sperret, og hvem som kan oppheve sperringen.",
      "record-blocked.check3": "Om en annen post som ikke er sperret, burde brukes i stedet.",
      "bc-label.why": "Meldingen er en av standardfeilmeldingene i Business Central. Den ble gjenkjent ut fra Microsofts egen formulering, som finnes på alle språk. Årsaken og kontrollene er generelle råd for denne meldingen, ikke en konklusjon om dataene deres.",
      "field-must-equal.params": "{field} må være {expected} for handlingen, men er {current}.",
      "field-must-equal": "{field} må være {expected} for handlingen, og det er det ikke.",
      "field-must-equal.check1": "Om et trinn som endrer {field}, for eksempel frigivelse eller godkjenning av dokumentet, ble hoppet over.",
      "field-must-equal.check2": "Om {field} ble endret tilbake, for eksempel da dokumentet ble åpnet på nytt.",
      "field-must-equal.check3": "Om feilen bare oppstår for noen poster.",
      "record-missing.params": "Business Central fant ikke posten i {table} som handlingen trenger ({record}).",
      "record-missing": "Business Central fant ikke posten i {table} som handlingen trenger.",
      "record-missing.check1": "Om det finnes en post i {table} med disse verdiene.",
      "record-missing.check2": "Om et oppsett eller et kort peker på en kode som ikke er satt opp, for eksempel en kombinasjon av bokføringsgrupper.",
      "record-missing.check3": "Om posten er slettet eller har fått nytt navn nylig.",
      "related-missing.params": "{field} inneholder {value}, som ikke finnes i {related}.",
      "related-missing": "{field} inneholder en verdi som ikke finnes der Business Central slår den opp.",
      "related-missing.check1": "Om {value} finnes i {related}.",
      "related-missing.check2": "Om verdien ble skrevet på en annen måte, slettet eller fikk nytt navn.",
      "related-missing.check3": "Om verdien kom fra en standardverdi, en mal eller en kopiert post.",
      "record-exists.params": "Det finnes allerede en post i {table} med de samme verdiene ({record}).",
      "record-exists": "Det finnes allerede en post i {table} med de samme verdiene.",
      "record-exists.check1": "Om posten allerede ble opprettet, for eksempel fordi handlingen ble kjørt to ganger.",
      "record-exists.check2": "Om en nummerserie deler ut et nummer som allerede er i bruk.",
      "record-exists.check3": "Om en import eller integrasjon oppretter den samme posten igjen.",
      "changed-by-other.params": "Posten {table} ble endret et annet sted etter at siden ble åpnet, så endringen ble ikke lagret.",
      "changed-by-other": "Posten ble endret et annet sted etter at siden ble åpnet, så endringen ble ikke lagret.",
      "changed-by-other.check1": "Om en annen bruker eller en bakgrunnsjobb endret posten samtidig.",
      "changed-by-other.check2": "Om det fungerer å lukke siden, åpne den på nytt og gjøre endringen igjen.",
      "changed-by-other.check3": "Om en utvidelse endrer posten mens siden lagrer den.",
      "deadlock.params": "En annen bruker eller en bakgrunnsjobb endret {table} samtidig, så handlingen ble stoppet.",
      "deadlock": "En annen bruker eller en bakgrunnsjobb endret de samme dataene samtidig, så handlingen ble stoppet.",
      "deadlock.check1": "Om handlingen fungerer når du prøver igjen.",
      "deadlock.check2": "Om en post i jobbkøen eller en annen bruker bokførte samtidig.",
      "deadlock.check3": "Om det ofte skjer på bestemte tider av døgnet.",
      "license-permission.params": "Brukerens lisens omfatter sannsynligvis ikke tillatelsen {permission} for {object}.",
      "license-permission": "Brukerens lisens omfatter sannsynligvis ikke en tillatelse som handlingen krever.",
      "license-permission.check1": "Hvilken lisens brukeren har.",
      "license-permission.check2": "Om handlingen krever en lisens som omfatter mer, for eksempel for en app eller en funksjon.",
      "license-permission.check3": "Om en bruker med en annen lisens kan utføre den samme handlingen.",
      "not-an-option.params": "{value} er ikke ett av alternativene for feltet. Alternativene er: {options}.",
      "not-an-option": "{value} er ikke ett av alternativene for feltet.",
      "not-an-option.check1": "Om verdien ble skrevet på et annet språk eller med andre ord.",
      "not-an-option.check2": "Om verdien kommer fra en import, en integrasjon eller en kopiert post.",
      "not-an-option.check3": "Om en utvidelse legger til alternativet bare i noen selskaper.",
      "platform.why": "Meldingen er en av standardfeilmeldingene i Business Central-plattformen. Den ble gjenkjent ut fra Microsofts egen formulering, som finnes på alle språk. Navnene kommer fra selve meldingen. Årsaken og kontrollene er generelle råd, ikke en konklusjon om dataene deres.",
      origin: "Vises sannsynligvis av",
      actions: "Handlinger som tilbys i feilmeldingen",
      "origin.in": "{objects} i {app}",
      "origin.more": "{objects} og {count} andre",
      "known-error.params": "En kontroll i Microsofts {app} stoppet handlingen. Meldingen sier hva som mangler eller er feil.",
      "known-error": "En kontroll i Business Central stoppet handlingen. Meldingen sier hva som mangler eller er feil.",
      "known-error.check1": "Hva meldingen sier må endres, og på hvilken post eller oppsettside.",
      "known-error.check2": "Om den samme handlingen fungerer for en annen post, noe som peker på dataene heller enn på programmet.",
      "known-error.check3": "Om oppsettet eller dataene som meldingen nevner, er endret nylig.",
      "known-error.why": "Formuleringen stemmer med en feilmelding i Microsofts egne apper, på alle språk. Den viser hvor meldingen sannsynligvis kommer fra, ikke hvorfor dataene deres utløste den. Kontrollene er generelle råd.",
      "number-series.params": "Nummerserien {series} kan ikke gi et nytt nummer, for eksempel fordi numrene er brukt opp eller ingen linje gjelder for datoen.",
      "number-series": "En nummerserie kan ikke gi et nytt nummer, for eksempel fordi numrene er brukt opp eller ingen linje gjelder for datoen.",
      "number-series.check1": "Om en linje i nummerserien har en startdato på eller før datoen for dokumentet.",
      "number-series.check2": "Om det sist brukte nummeret har nådd sluttnummeret for linjen.",
      "number-series.check3": "Om linjen er åpen og serien tillater standardnumre der nummeret tildeles automatisk.",
      "posted-number-used.params": "Nummeret {number} som nummerserien gir det bokførte dokumentet, er allerede brukt, så dokumentet kan ikke bokføres.",
      "posted-number-used": "Nummeret som nummerserien gir det bokførte dokumentet, er allerede brukt, så dokumentet kan ikke bokføres.",
      "posted-number-used.check1": "Om det sist brukte nummeret på nummerserielinjen er lavere enn numre som allerede finnes.",
      "posted-number-used.check2": "Om dokumenter er importert eller opprettet med numre fra samme serie.",
      "posted-number-used.check3": "Om to nummerserier gir numre i samme intervall.",
      "dimension-mandatory.params": "En verdi for {dimension} kreves for {record}, og ingen er valgt.",
      "dimension-mandatory": "En dimensjon som må ha en verdi, mangler verdi på dokumentet eller en av linjene.",
      "dimension-mandatory.check1": "Hvilke dimensjonsverdier dokumentet og linjene har.",
      "dimension-mandatory.check2": "Om standarddimensjonene for kunden, leverandøren, varen eller kontoen krever en verdi.",
      "dimension-mandatory.check3": "Om verdien bare mangler på noen linjer.",
      "item-tracking-required.params": "Vare {item} krever et parti-, serie- eller pakkenummer, og ingen er tilordnet på linjen.",
      "item-tracking-required": "Varen krever et parti-, serie- eller pakkenummer, og ingen er tilordnet på linjen.",
      "item-tracking-required.check1": "Om varesporingslinjer er tilordnet på dokumentlinjen.",
      "item-tracking-required.check2": "Om varesporingskoden for varen krever sporing for denne typen transaksjon.",
      "item-tracking-required.check3": "Om antallet i varesporingslinjene stemmer med antallet på linjen.",
      "item-tracking-mismatch": "Antallet i varesporingslinjene stemmer ikke med antallet på dokumentlinjen.",
      "item-tracking-mismatch.check1": "Om antallet som skal behandles i varesporingslinjene, er lik antallet som skal leveres, mottas eller bokføres.",
      "item-tracking-mismatch.check2": "Om antallet på linjen ble endret etter at varesporing ble tilordnet.",
      "item-tracking-mismatch.check3": "Om parti- eller serienumrene er tilgjengelige på lokasjonen og hyllen.",
      "approval-required": "Dokumentet må godkjennes før handlingen kan utføres, eller det venter fortsatt på godkjenning.",
      "approval-required.check1": "Om en godkjenningsforespørsel er sendt, og hvilken status den har.",
      "approval-required.check2": "Om en arbeidsflyt for godkjenning er aktivert for denne typen dokument.",
      "approval-required.check3": "Om dokumentet ble endret etter at det ble godkjent, noe som kan ha åpnet det igjen.",
      "duplicate-external-doc.params": "Leverandørens dokument {document} er allerede brukt på et annet dokument fra samme leverandør.",
      "duplicate-external-doc": "Leverandørens dokumentnummer er allerede brukt på et annet dokument fra samme leverandør.",
      "duplicate-external-doc.check1": "Om leverandørens faktura- eller kreditnotanummer er skrevet riktig.",
      "duplicate-external-doc.check2": "Om den samme fakturaen allerede er bokført eller står på et annet åpent dokument.",
      "duplicate-external-doc.check3": "Om innkjøpsoppsettet krever at leverandørens dokumentnummer er unikt.",
      "nothing-to-handle": "Det er ingenting igjen å behandle: linjene har ikke noe antall å behandle, eller alt er allerede plukket, plassert eller behandlet.",
      "nothing-to-handle.check1": "Om linjene har et antall å behandle.",
      "nothing-to-handle.check2": "Om kildedokumentet er frigitt, og om antallene allerede er plukket eller plassert.",
      "nothing-to-handle.check3": "Om lokasjonen, hyllen eller filtrene i handlingen utelater linjene.",
      "warehouse-handling-required": "Lokasjonen krever lagerhåndtering, så antallet må først behandles med lagerdokumenter, for eksempel en utlevering, et mottak, en plukking eller en plassering.",
      "warehouse-handling-required.check1": "Hvilken lagerhåndtering lokasjonen krever.",
      "warehouse-handling-required.check2": "Om det finnes et lagerdokument for linjen, og om det er registrert eller bokført.",
      "warehouse-handling-required.check3": "Om linjen burde bruke en annen lokasjon.",
      "accounting-period-missing": "Regnskapsperiodene som handlingen trenger, er ikke satt opp, for eksempel for datoene i dokumentet eller i en periodiseringsplan.",
      "accounting-period-missing.check1": "Om det finnes regnskapsperioder for datoene i dokumentet eller planen.",
      "accounting-period-missing.check2": "Om et nytt regnskapsår må opprettes.",
      "accounting-period-missing.check3": "Om en dato ved en feil ligger langt frem eller tilbake i tid.",
      "basis": "Sammenlignet med Microsofts meldinger fra Business Central {version}. En nyere versjon kan formulere en melding annerledes."
    }
  });
  const LOCALES = Object.freeze(Object.keys(T));
  const catalog = locale => T[locale] || T[LOCALES.find(item => item.slice(0, 2) ===
    String(locale || "").slice(0, 2))] || T["en-US"];
  const fill = (template, params) => template.replace(/\{(\w+)\}/gu, (all, name) =>
    params[name] !== undefined ? params[name] : all);

  // The wording of a cause in a language: its text, what to check and why it is suggested.
  // Each label of the box itself is in labels.
  function describe(cause, locale) {
    if (!cause?.kind) return null;
    const texts = catalog(locale);
    const params = cause.params || {};
    const needs = template => [...template.matchAll(/\{(\w+)\}/gu)].every(([, name]) => params[name]);
    const template = [texts[`${cause.kind}.params`], texts[cause.kind]]
      .find(candidate => candidate && needs(candidate));
    const statement = template ? fill(template, params) : "";
    if (!statement) return null;
    const checks = [1, 2, 3].map(index => texts[`${cause.kind}.check${index}`])
      .filter(template => template && needs(template)).map(template => fill(template, params));
    return Object.freeze({ kind: cause.kind, text: statement, checks: Object.freeze(checks),
      why: (cause.source === "bc-platform" ? texts["platform.why"] : "") || texts[`${cause.kind}.why`] ||
        (["bc-label", "bc-known"].includes(cause.source) ? texts["bc-label.why"] : "") || "",
      origin: origin(cause, locale), actions: Object.freeze(actionCaptions(cause, locale)),
      basis: basis(cause, texts) });
  }
  // Which Business Central version the wording was compared with, for a cause read from Microsoft's
  // messages: a newer version can word a message differently.
  function basis(cause, texts) {
    const version = text(labelData()?.businessCentral);
    return version && ["bc-label", "bc-platform", "bc-known"].includes(cause.source) ? fill(texts.basis, { version }) : "";
  }
  // Where the message comes from: 'Codeunit "Sales-Post" in Base Application', objects of the
  // same app together. Object and app names are Business Central's own and stay as they are.
  function origin(cause, locale) {
    const items = (Array.isArray(cause.origin) ? cause.origin : []).filter(item => text(item?.object));
    if (!items.length) return "";
    const texts = catalog(locale);
    const apps = new Map();
    items.forEach(item => apps.set(text(item.app), [...(apps.get(text(item.app)) || []), text(item.object)]));
    let result = [...apps].map(([app, objects]) => app
      ? fill(texts["origin.in"], { objects: objects.join(", "), app }) : objects.join(", ")).join("; ");
    const more = Number(cause.moreOrigins) || 0;
    if (more > 0) result = fill(texts["origin.more"], { objects: result, count: String(more) });
    return result;
  }
  // The captions of the actions offered in the message, in the language or else in English.
  function actionCaptions(cause, locale) {
    const wanted = LOCALES.includes(locale) ? locale : LOCALES.find(item => item.slice(0, 2) ===
      String(locale || "").slice(0, 2)) || "en-US";
    return (Array.isArray(cause.actions) ? cause.actions : [])
      .map(action => text(action?.[wanted]) || text(action?.["en-US"])).filter(Boolean);
  }
  function labels(locale) {
    const texts = catalog(locale);
    return Object.freeze(Object.fromEntries(["title", "unconfirmed", "checks", "why", "include",
      "dismiss", "hidden", "show", "exportTitle", "exportChecks", "origin", "actions"].map(key => [key, texts[key]])));
  }
  // The possible cause as exported, in the document language, when the user included it.
  function exported(cause, locale) {
    const described = describe(cause, locale);
    if (!described) return null;
    const label = labels(locale);
    return Object.freeze({ title: label.exportTitle, text: described.text,
      checksTitle: label.exportChecks, checks: described.checks,
      originTitle: label.origin, origin: described.origin,
      actionsTitle: label.actions, actions: described.actions });
  }
  return { VERSION, LOCALES, RULES, suggest, describe, labels, exported, loadKnown, useKnown, useAppErrors };
});
