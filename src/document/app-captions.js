(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AppCaptions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // What a Business Central app's pages, fields and actions are called in each language, read from
  // its .app file: the AL source and the translation files. scripts/build-bc-captions.js reads
  // Microsoft's Base Application with it into document/bc-captions.json; the settings read the
  // user's own apps with it, on the user's computer, so the knowledge rules of partner apps know
  // their captions in every language the app is translated to. Nothing is sent anywhere.
  //
  // A caption is resolved the way the client resolves it: the control's own Caption, else the
  // Caption of the table field it shows, else the field's name. An app without AL source gives
  // the captions its translation files name: pages, actions and controls with a caption of their own.

  const unquote = name => String(name || "").trim().replace(/^"(.*)"$/su, "$1").replace(/""/gu, "\"");
  const decode = text => String(text).replace(/&lt;/gu, "<").replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, "\"").replace(/&apos;/gu, "'").replace(/&amp;/gu, "&");
  // A caption as the client shows it: an ampersand marks an access key and is not shown ("&&" is one).
  const shown = caption => caption.replace(/&&/gu, "\u0000").replace(/&/gu, "").replace(/\u0000/gu, "&").trim();
  const NAME = String.raw`("(?:[^"]|"")+"|[A-Za-z_][\w]*)`;

  // The translation file: lookup hint ("Table Purchase Header - Field Buy-from Vendor No. - Property
  // Caption") to the shown text. The generated file (.g.xlf) gives the English source.
  function readXliff(text, useSource) {
    const result = new Map();
    const unit = /<trans-unit\b[^>]*>([\s\S]*?)<\/trans-unit>/gu;
    let match;
    while ((match = unit.exec(String(text)))) {
      const body = match[1];
      // Translated files name the caption in the developer note (LookupHint=...), the generated
      // file in the generator's note.
      const hint = /LookupHint=([^)]*)\)/u.exec(body)?.[1] ??
        /<note from="Xliff Generator"[^>]*>([^<]+)<\/note>/u.exec(body)?.[1];
      if (!hint || !/ - Property (?:Caption)$/u.test(hint)) continue;
      // The hint is escaped like the rest of the file ("Action &amp;Line").
      const name = decode(hint);
      const value = useSource ? /<source>([\s\S]*?)<\/source>/u.exec(body)?.[1]
        : /<target[^>]*>([\s\S]*?)<\/target>/u.exec(body)?.[1];
      if (value !== undefined) result.set(name, shown(decode(value)));
    }
    return result;
  }

  // Pages, page extensions, tables and table extensions from the AL source: each page's source
  // table, its fields (control name and source expression) and its actions.
  function readSource(files) {
    const pages = new Map(); // page name -> { table, fields: Map(control -> expr), actions: Set, owners }
    const tableExtensions = new Map(); // extension name -> table name
    const page = name => {
      if (!pages.has(name)) pages.set(name, { table: "", fields: new Map(), actions: new Set(), owners: new Map() });
      return pages.get(name);
    };
    for (const source of files) {
      const header = new RegExp(String.raw`^\s*(page|pageextension|tableextension)\s+\d+\s+${NAME}(?:\s+extends\s+${NAME})?`, "imu").exec(source);
      if (!header) continue;
      const kind = header[1].toLowerCase();
      const own = unquote(header[2]);
      if (kind === "tableextension") { tableExtensions.set(own, unquote(header[3])); continue; }
      const target = kind === "page" ? own : unquote(header[3]);
      const entry = page(target);
      // Captions written in a page extension are looked up under the extension's name.
      const owner = kind === "page" ? `Page ${own}` : `PageExtension ${own}`;
      if (kind === "page") {
        const table = /^\s*SourceTable\s*=\s*("(?:[^"]|"")+"|[\w]+)\s*;/imu.exec(source);
        if (table) entry.table = unquote(table[1]);
      }
      const field = new RegExp(String.raw`\bfield\s*\(\s*${NAME}\s*;\s*([^)\r\n]+?)\s*\)\s*$`, "gimu");
      let match;
      while ((match = field.exec(source))) {
        const control = unquote(match[1]);
        entry.fields.set(control, match[2].trim());
        entry.owners.set(`Control ${control}`, owner);
      }
      // Actions and action groups (a promoted category such as Release, a menu such as Line): the
      // translation file names both as actions. Layout groups have no action captions.
      const action = new RegExp(String.raw`\b(?:action|group)\s*\(\s*${NAME}\s*\)\s*$`, "gimu");
      while ((match = action.exec(source))) {
        const name = unquote(match[1]);
        entry.actions.add(name);
        entry.owners.set(`Action ${name}`, owner);
      }
    }
    return { pages, tableExtensions };
  }

  // The table field a field control shows: Rec."No.", Rec.Amount or "No.". Anything else (a
  // variable, a function call) has no table caption.
  function sourceField(expression) {
    const match = /^(?:Rec\s*\.\s*)?("(?:[^"]|"")+"|[A-Za-z_]\w*)$/u.exec(String(expression).trim());
    return match ? unquote(match[1]) : "";
  }

  // The captions of one language: p|Page, a|Page|Action and f|Page|Control to the shown caption.
  function resolve(locale, source, captions) {
    const fieldCaptions = new Map(); // table|field -> caption, from the table or a table extension
    for (const [hint, caption] of captions) {
      const table = /^Table (.+?) - Field (.+) - Property Caption$/u.exec(hint);
      if (table) { fieldCaptions.set(`${table[1]}|${table[2]}`, caption); continue; }
      const extension = /^TableExtension (.+?) - Field (.+) - Property Caption$/u.exec(hint);
      const extended = extension && source.tableExtensions.get(extension[1]);
      if (extended) fieldCaptions.set(`${extended}|${extension[2]}`, caption);
    }
    const result = new Map();
    for (const [name, entry] of source.pages) {
      const pageCaption = captions.get(`Page ${name} - Property Caption`);
      if (pageCaption) result.set(`p|${name}`, pageCaption);
      for (const [control, expression] of entry.fields) {
        const owner = entry.owners.get(`Control ${control}`);
        let caption = captions.get(`${owner} - Control ${control} - Property Caption`);
        if (caption === undefined) {
          const field = sourceField(expression);
          if (field && entry.table) caption = fieldCaptions.get(`${entry.table}|${field}`) ??
            // A table field without a Caption is shown by its name, in every language.
            (locale === "en-US" ? field : undefined);
        }
        if (caption) result.set(`f|${name}|${control}`, caption);
      }
      for (const action of entry.actions) {
        const owner = entry.owners.get(`Action ${action}`);
        const caption = captions.get(`${owner} - Action ${action} - Property Caption`);
        if (caption) result.set(`a|${name}|${action}`, caption);
      }
    }
    return result;
  }

  // Without AL source: the pages, actions and controls the translation file names with a caption.
  function resolveHints(captions) {
    const result = new Map();
    for (const [hint, caption] of captions) {
      const page = /^Page (.+?) - Property Caption$/u.exec(hint);
      if (page) { result.set(`p|${page[1]}`, caption); continue; }
      const member = /^Page (.+?) - (Action|Control) (.+) - Property Caption$/u.exec(hint);
      if (member) result.set(`${member[2] === "Action" ? "a" : "f"}|${member[1]}|${member[3]}`, caption);
    }
    return result;
  }

  // A caption table from each language's captions: { schema, locales, rows, keys }, with one row of
  // captions per key in locale order and rows shared by many keys stored once. A key needs a
  // caption in at least minLanguages languages.
  function captionTable(perLocale, locales, { minLanguages = 2, ...extra } = {}) {
    const keys = [...new Set(locales.flatMap(locale => [...(perLocale[locale]?.keys() || [])]))].sort();
    const rows = [];
    const rowIndex = new Map();
    const index = {};
    for (const key of keys) {
      const row = locales.map(locale => perLocale[locale]?.get(key) ?? "");
      if (row.filter(Boolean).length < minLanguages) continue;
      const id = JSON.stringify(row);
      if (!rowIndex.has(id)) { rowIndex.set(id, rows.length); rows.push(row); }
      index[key] = rowIndex.get(id);
    }
    return { schema: 1, ...extra, locales: [...locales], rows, keys: index };
  }

  // The caption table of an opened app (bug-report/app-errors.js openApp), in the given languages.
  // English comes from the app's own English file, else from its generated file.
  async function appCaptions(app, { locales, source = "" } = {}) {
    const files = Array.isArray(app?.files) ? app.files : [];
    const sources = await Promise.all(files.filter(file => /^src\/.*\.al$/iu.test(file))
      .map(file => app.text(file)));
    const structure = sources.length ? readSource(sources) : null;
    const perLocale = {};
    for (const locale of locales) {
      const translated = files.find(file => file.toLowerCase().endsWith(`.${locale.toLowerCase()}.xlf`));
      const generated = locale === "en-US" && files.find(file => /^Translations\/.*\.g\.xlf$/iu.test(file));
      if (!translated && !generated) continue;
      const captions = readXliff(await app.text(translated || generated), !translated);
      perLocale[locale] = structure ? resolve(locale, structure, captions) : resolveHints(captions);
    }
    return captionTable(perLocale, locales, { minLanguages: 1, ...(source ? { source } : {}) });
  }

  return Object.freeze({ readXliff, readSource, sourceField, resolve, resolveHints, captionTable,
    appCaptions });
});
