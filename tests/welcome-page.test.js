"use strict";
// The Get started page: opened on a new installation only, reachable from the library, every
// text in every registered language, the language offer matched to the browser, and the example
// written from the document sentence templates in every document language.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
require(path.join(root, "src/engine/locale-catalogs.js"));
const registry = require(path.join(root, "src/engine/language-registry.js"));
globalThis.T9LanguageRegistry = registry;
require(path.join(root, "src/engine/storage-keys.js"));
const stepText = require(path.join(root, "src/engine/step-text.js"));
globalThis.T9StepText = stepText;
require(path.join(root, "src/ui/i18n.js"));
const i18n = globalThis.T9UiI18n;
require(path.join(root, "src/ui/welcome.js"));
const welcome = globalThis.T9Welcome;

const uiLocales = registry.supported("ui").map(language => language.locale);
const documentLocales = registry.supported("document").map(language => language.locale);
const html = read("src/ui/welcome.html");
const script = read("src/ui/welcome.js");

// Every welcome text exists in every interface language, keeps its placeholders, and is
// written in that language rather than copied from English.
const i18nSource = read("src/ui/i18n.js");
const keys = [...new Set([...i18nSource.matchAll(/"(welcome\.[A-Za-z0-9]+)"/gu)].map(match => match[1]))];
assert.ok(keys.length >= 40, `welcome keys found: ${keys.length}`);
const placeholders = text => [...String(text).matchAll(/\{([a-z]+)\}/giu)].map(match => match[1]).sort().join();
for (const key of keys) {
  const english = i18n.translate(key, "en-US");
  assert.notStrictEqual(english, key, `${key} has an English text`);
  for (const locale of uiLocales) {
    const text = i18n.translate(key, locale);
    assert.ok(text && text !== key, `${key} missing in ${locale}`);
    assert.strictEqual(placeholders(text), placeholders(english), `${key} placeholders in ${locale}`);
    if (locale !== "en-US") assert.notStrictEqual(text, english, `${key} is English in ${locale}`);
  }
}

// Everything the page itself names by key resolves in every language.
const pageKeys = [...html.matchAll(/data-i18n="([^"]+)"/gu), ...script.matchAll(/t\("([a-zA-Z]+\.[A-Za-z0-9]+)"\)/gu),
  ...script.matchAll(/translate\("([a-zA-Z]+\.[A-Za-z0-9]+)"/gu), ...script.matchAll(/t\(moreOpen \? "([^"]+)" : "([^"]+)"\)/gu)]
  .flatMap(match => match.slice(1)).filter(Boolean);
assert.ok(pageKeys.includes("recorder.process") && pageKeys.includes("welcome.title"));
for (const key of new Set(pageKeys)) {
  for (const locale of uiLocales) {
    assert.notStrictEqual(i18n.translate(key, locale), key, `${key} in ${locale}`);
  }
}
// The record step names the popup's own button, wherever it falls in the sentence.
for (const locale of uiLocales) {
  assert.strictEqual(i18n.translate("welcome.recordHelp", locale).split("{action}").length, 2,
    `recordHelp has one {action} in ${locale}`);
}

// The language offer: the first browser language BC Process Studio has, by tag or language.
assert.strictEqual(welcome.browserLanguage(["sv-FI"]), "sv-SE");
assert.strictEqual(welcome.browserLanguage(["sv"]), "sv-SE");
assert.strictEqual(welcome.browserLanguage(["no"]), "nb-NO");
assert.strictEqual(welcome.browserLanguage(["de-AT"]), "de-DE");
assert.strictEqual(welcome.browserLanguage(["en-GB"]), "en-US");
assert.strictEqual(welcome.browserLanguage(["pt-BR", "fi"]), "fi-FI");
assert.strictEqual(welcome.browserLanguage(["pt-BR"]), "", "a language it does not have offers nothing");
assert.strictEqual(welcome.browserLanguage(["nn-NO"]), "", "Nynorsk is not offered as Bokmål by guess");
assert.strictEqual(welcome.browserLanguage([]), "");
// The offer is answered once, and only the answer is stored.
assert.match(script, /offeredLanguage = !answered\?\.languageOffer && browser && browser !== locale/u);
assert.match(script, /T9_SAVE_UI_LOCALE/u);
assert.match(script, /T9_SAVE_DOCUMENT_LANGUAGE/u);
assert.strictEqual(globalThis.T9StorageKeys.WELCOME_KEY, "t9_welcome");

// The example: captions for every document language, and every sentence written by the
// document templates.
const captionKeys = Object.keys(welcome.SAMPLE["en-US"]).sort().join();
for (const locale of documentLocales) {
  const words = welcome.SAMPLE[locale];
  assert.ok(words, `example captions for ${locale}`);
  assert.strictEqual(Object.keys(words).sort().join(), captionKeys, `example caption set for ${locale}`);
  for (const [kind, slots] of [["action", { action: words.new }], ["enter", { typed: "10000", field: words.vendorNo }],
    ["enter", { typed: "5", field: words.quantity }], ["action", { action: words.release }]]) {
    const result = stepText.render(stepText.describe(kind, slots), locale);
    assert.ok(result?.text, `${kind} sentence in ${locale}`);
  }
}
assert.match(html, /data-i18n-ignore/u, "the example document is not retranslated as interface text");

// A new installation opens the page; an update does not.
const background = read("src/recorder/background.js");
assert.match(background, /onInstalled\.addListener\(async details =>/u);
assert.match(background, /details\?\.reason === "install"[\s\S]{0,200}welcome\.html/u);
// The library links to it, and the build ships it.
assert.match(read("src/ui/dashboard.html"), /id="openWelcome"[^>]*href="welcome\.html"[^>]*data-i18n="welcome\.open"/u);
assert.match(read("scripts/build.js"), /"welcome\.html", "welcome\.js"/u);
// The page loads the scripts it uses.
for (const file of ["engine/language-registry.js", "engine/storage-keys.js", "engine/step-text.js", "i18n.js", "welcome.js"]) {
  assert.ok(html.includes(`<script src="${file}"></script>`), `welcome.html loads ${file}`);
}

console.log("welcome page tests passed");
