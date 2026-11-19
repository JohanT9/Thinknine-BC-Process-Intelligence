(function (root, factory) {
  if (typeof module === "object" && module.exports && !root.T9AppCaptions) require("../document/app-captions");
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AppErrors = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  // The error messages of a Business Central app (.app file), with the object that shows each one,
  // its wording in each language and the actions offered in it. scripts/build-error-labels.js
  // reads Microsoft's apps with it into error-known.json; the settings read the user's own apps
  // with it, on the user's computer, into the same kind of table. Nothing is sent anywhere.

  // Objects that only tests and demo data use, and actions that only hide the message, are left out.
  const SKIP_OBJECT = /test|demo|contoso/iu;
  const SKIP_ACTION = /show (?:this |the message )?again|%\d/iu;
  // A message with less fixed text than this says too little to be recognized.
  const MIN_TEXT = 8;
  const TYPE_CAPTION = { table: "Table", tableextension: "TableExtension", page: "Page", pageextension: "PageExtension",
    codeunit: "Codeunit", report: "Report", reportextension: "ReportExtension", xmlport: "XmlPort", query: "Query",
    enum: "Enum", enumextension: "EnumExtension", interface: "Interface" };

  const decode = text => String(text).replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'").replace(/&#(\d+);/gu, (all, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gu, "&");

  // Labels (NamedType units) by translation unit id: the English source and, in a translated file,
  // the target.
  function readLabels(text, useSource) {
    const result = new Map();
    for (const match of String(text).matchAll(/<trans-unit\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/trans-unit>/gu)) {
      if (!/ - NamedType /u.test(match[1])) continue;
      const value = useSource ? /<source>([\s\S]*?)<\/source>/u.exec(match[2])?.[1]
        : /<target[^>]*>([\s\S]*?)<\/target>/u.exec(match[2])?.[1];
      if (value !== undefined && value.trim()) result.set(match[1], decode(value).trim());
    }
    return result;
  }
  // Label hints ("Codeunit Sales-Post - NamedType X", the "Xliff Generator" note) by translation unit id.
  function readHints(text) {
    const result = new Map();
    for (const match of String(text).matchAll(/<trans-unit\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/trans-unit>/gu)) {
      const hint = /<note from="Xliff Generator"[^>]*>([^<]+)<\/note>/u.exec(match[2])?.[1];
      if (hint) result.set(decode(hint).trim(), match[1]);
    }
    return result;
  }

  // ---- Reading an .app file ----------------------------------------------------------------
  // An .app is a short header and a zip. app.files lists its files; app.text(name) reads one.
  const bytesOf = data => data instanceof Uint8Array ? data : new Uint8Array(data);
  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "function") throw new Error("no-decompression");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function openApp(data, inflate = inflateRaw) {
    const all = bytesOf(data);
    let start = -1;
    for (let index = 0; index + 3 < all.length && index < 4096; index += 1) {
      if (all[index] === 0x50 && all[index + 1] === 0x4b && all[index + 2] === 3 && all[index + 3] === 4) { start = index; break; }
    }
    if (start < 0) throw Object.assign(new Error("not-an-app"), { code: "not-an-app" });
    const bytes = all.subarray(start);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65558); index -= 1) {
      if (view.getUint32(index, true) === 0x06054b50) { end = index; break; }
    }
    if (end < 0) throw Object.assign(new Error("not-an-app"), { code: "not-an-app" });
    const count = view.getUint16(end + 10, true);
    const entries = new Map();
    const names = new TextDecoder();
    for (let at = view.getUint32(end + 16, true), index = 0; index < count && at + 46 <= bytes.length; index += 1) {
      if (view.getUint32(at, true) !== 0x02014b50) break;
      const nameLength = view.getUint16(at + 28, true);
      const extraLength = view.getUint16(at + 30, true);
      const commentLength = view.getUint16(at + 32, true);
      const name = names.decode(bytes.subarray(at + 46, at + 46 + nameLength)).replace(/\\/gu, "/");
      entries.set(name, { method: view.getUint16(at + 10, true), compressed: view.getUint32(at + 20, true),
        offset: view.getUint32(at + 42, true) });
      at += 46 + nameLength + extraLength + commentLength;
    }
    const decoder = new TextDecoder("utf-8");
    return {
      files: [...entries.keys()],
      async text(name) {
        const entry = entries.get(name);
        if (!entry) return "";
        const body = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
        const raw = bytes.subarray(body, body + entry.compressed);
        const content = entry.method === 8 ? await inflate(raw) : raw;
        return decoder.decode(content).replace(/^\uFEFF/u, "");
      }
    };
  }

  // The tables keep English first: an entry is known by its English wording.
  const englishFirst = (locales = []) => ["en-US", ...locales.filter(locale => locale !== "en-US")];

  // The object a label hint names: "Codeunit Sales-Post - NamedType X" -> 'Codeunit "Sales-Post"'.
  function objectOfHint(hint) {
    const match = /^(\w+) (.+?) - NamedType /u.exec(hint);
    if (!match) return "";
    const type = Object.values(TYPE_CAPTION).find(caption => caption.toLowerCase() === match[1].toLowerCase());
    return type ? `${type} "${match[2]}"` : "";
  }

  // An app's errors, their wording in each language and the actions added to them:
  // { name, publisher, version, from, errors: [{ object, texts: [by locales], actions: [[by locales]] }] }.
  // from is "source" when the app has its AL source, and "labels" when it has only its translation
  // files: then the labels named as errors (ending in Err, as AL's guidelines ask) are taken, without actions.
  async function appErrors(app, { locales, perLocale = null, alErrors = root.T9AlErrors?.errors, fromLabels = true } = {}) {
    locales = englishFirst(locales);
    const manifest = await app.text("NavxManifest.xml");
    if (!manifest) throw Object.assign(new Error("not-an-app"), { code: "not-an-app" });
    const attribute = name => decode(new RegExp(`<App\\b[^>]*\\b${name}="([^"]*)"`, "u").exec(manifest)?.[1] || "");
    const result = { name: attribute("Name"), publisher: attribute("Publisher"), version: attribute("Version"),
      from: "source", errors: [] };
    const generated = app.files.find(file => /^Translations\/.*\.g\.xlf$/iu.test(file));
    if (!generated) return { ...result, from: "none" };
    const generatedText = await app.text(generated);
    const hints = readHints(generatedText);
    const labels = perLocale || {};
    if (!perLocale) {
      labels["en-US"] = readLabels(generatedText, true);
      for (const locale of locales.filter(item => item !== "en-US")) {
        const file = app.files.find(item => item.toLowerCase().endsWith(`.${locale.toLowerCase()}.xlf`));
        labels[locale] = file ? readLabels(await app.text(file), false) : new Map();
      }
    }
    const wording = hint => {
      const id = hints.get(hint);
      const english = id && labels["en-US"].get(id);
      return english ? locales.map(locale => locale === "en-US" ? english : labels[locale]?.get(id) || "") : null;
    };
    const tooShort = texts => texts[0].replace(/%\d+/gu, "").replace(/[\s\\]+/gu, " ").trim().length < MIN_TEXT;
    const sourceFiles = app.files.filter(file => /^src\/.*\.al$/iu.test(file));
    if (sourceFiles.length && typeof alErrors === "function") {
      const sources = await Promise.all(sourceFiles.map(file => app.text(file)));
      for (const error of alErrors(sources)) {
        const texts = wording(error.hint);
        if (!texts || SKIP_OBJECT.test(error.object) || tooShort(texts)) continue;
        const actions = error.actions.map(wording).filter(action => action && !SKIP_ACTION.test(action[0]));
        result.errors.push({ object: error.object, texts, actions });
      }
      return result;
    }
    if (!fromLabels) return result;
    for (const hint of hints.keys()) {
      if (!/ - NamedType \S*Err$/u.test(hint)) continue;
      const object = objectOfHint(hint);
      const texts = wording(hint);
      if (!object || !texts || SKIP_OBJECT.test(object) || tooShort(texts)) continue;
      result.errors.push({ object, texts, actions: [] });
    }
    return { ...result, from: "labels" };
  }

  // The known errors of apps, one entry per English wording: the objects that show it, its wording
  // in each language ("" where it is the same as in English or not translated) and the actions
  // offered with it. kindOf(english) gives a kind and its names for an error that has a cause.
  function knownTable(apps, { locales, kindOf = () => null } = {}) {
    locales = englishFirst(locales);
    const byText = new Map();
    // One name per app: each country's Base Application is the same app.
    const names = [...new Set(apps.map(app => app.name))];
    apps.forEach(app => {
      const appIndex = names.indexOf(app.name);
      for (const error of app.errors) {
        const key = error.texts[0];
        const entry = byText.get(key) || { objects: [], texts: locales.map(() => new Set()), actions: new Map() };
        if (!entry.objects.some(([index, object]) => index === appIndex && object === error.object)) {
          entry.objects.push([appIndex, error.object]);
        }
        error.texts.forEach((value, index) => { if (value && (index === 0 || value !== key)) entry.texts[index].add(value); });
        for (const action of error.actions) if (!entry.actions.has(action[0])) entry.actions.set(action[0], action);
        byText.set(key, entry);
      }
    });
    const errors = [...byText.values()].sort((first, second) => first.texts[0].values().next().value
      .localeCompare(second.texts[0].values().next().value)).map(entry => {
      const texts = entry.texts.map(values => values.size > 1 ? [...values].sort() : [...values][0] || "");
      const actions = [...entry.actions.values()].map(action => action.map((value, index) =>
        index && value === action[0] ? "" : value));
      const kind = kindOf(texts[0]);
      if (kind) return [entry.objects, texts, actions, kind.kind, kind.params];
      return actions.length ? [entry.objects, texts, actions] : [entry.objects, texts];
    });
    return { apps: names, errors };
  }

  // A user's app as it is stored: what the settings list shows, and its errors as a table that
  // the possible cause reads like error-known.json.
  async function readUserApp(data, { locales, fileName = "", now = new Date(), inflate } = {}) {
    locales = englishFirst(locales);
    const opened = await openApp(data, inflate);
    const app = await appErrors(opened, { locales });
    const table = knownTable([app], { locales });
    // What the app's pages, actions and fields are called in each language, for the knowledge
    // rules of the app (document/app-captions.js). An app without them still gives its errors.
    let captions = null;
    try {
      captions = await root.T9AppCaptions?.appCaptions?.(opened, { locales, source: app.name }) || null;
    } catch { captions = null; }
    const captionCount = captions ? Object.keys(captions.keys).length : 0;
    return { id: [app.publisher, app.name].join("|").toLowerCase(), name: app.name, publisher: app.publisher,
      version: app.version, fileName: String(fileName), addedAt: now.toISOString(), from: app.from,
      errorCount: table.errors.length, actionCount: table.errors.filter(entry => entry[2]?.length).length,
      table: { locales: [...locales], apps: table.apps, errors: table.errors },
      ...(captionCount ? { captionCount, captions } : {}) };
  }

  return { SKIP_OBJECT, SKIP_ACTION, decode, readLabels, readHints, openApp, appErrors, knownTable, readUserApp };
});
