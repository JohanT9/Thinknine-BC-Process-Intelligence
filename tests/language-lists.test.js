// The places that keep texts per language follow the language registry: a language added to
// src/engine/language-registry.js without texts here fails this test instead of being left out
// silently (see "Karta: allt som berörs av ett nytt språk" in docs/language-support.md).
const assert = require("node:assert/strict");
const languages = require("../src/engine/language-registry");
const stepText = require("../src/engine/step-text");
const grammar = require("../src/document/presentation-grammar");
const explanations = require("../src/engine/knowledge-explanation-catalog");
const indicator = require("../src/recorder/capture-indicator-i18n");

const documentLocales = languages.supported("document").map(item => item.locale);
const uiLocales = languages.supported("ui").map(item => item.locale);

// What each place lacks for the given languages, as readable lines.
function gaps(documentList, uiList) {
  const result = [];
  const lacks = (place, have, wanted) => wanted.filter(locale => !have.includes(locale))
    .forEach(locale => result.push(`${place}: ${locale}`));
  lacks("engine/step-text.js LOCALES", stepText.LOCALES, documentList);
  for (const [kind, templates] of Object.entries(stepText.TEMPLATES)) {
    lacks(`engine/step-text.js TEMPLATES.${kind}`, Object.keys(templates), documentList);
  }
  for (const [id, names] of Object.entries(stepText.CLIENT_DEFAULTS)) {
    lacks(`engine/step-text.js CLIENT_DEFAULTS.${id}`, Object.keys(names), documentList);
  }
  lacks("document/presentation-grammar.js STEP_WORDS", Object.keys(grammar.STEP_WORDS), documentList);
  lacks("engine/knowledge-explanation-catalog.js locales", explanations.locales, documentList);
  lacks("recorder/capture-indicator-i18n.js messages", Object.keys(indicator.messages), uiList);
  lacks("recorder/capture-indicator-i18n.js warningMessages", Object.keys(indicator.warningMessages), uiList);
  return result;
}

// Every registered language has its texts in every place.
assert.deepEqual(gaps(documentLocales, uiLocales), []);

// A language registered without texts is named in every place that lacks it.
const added = gaps([...documentLocales, "it-IT"], [...uiLocales, "it-IT"]);
for (const place of ["step-text.js LOCALES", "presentation-grammar.js STEP_WORDS",
  "knowledge-explanation-catalog.js locales", "capture-indicator-i18n.js messages",
  "capture-indicator-i18n.js warningMessages"]) {
  assert.ok(added.some(line => line.includes(place) && line.endsWith("it-IT")), `${place} reports it-IT`);
}

// The step texts and the grammar take their languages from the registry.
assert.deepEqual([...stepText.LOCALES], documentLocales);

// The capture indicator, which runs in the Business Central tab without the registry, finds every
// registered language from its locale and aliases, and has the same texts in each.
for (const language of languages.languages.filter(item => item.ui)) {
  for (const alias of [language.locale, ...language.aliases]) {
    assert.equal(indicator.languageOf(alias), language.locale, `${alias} gives ${language.locale}`);
  }
  assert.deepEqual(Object.keys(indicator.messages[language.locale]).sort(),
    Object.keys(indicator.messages["en-US"]).sort(), `${language.locale} indicator texts`);
  assert.deepEqual(Object.keys(indicator.warningMessages[language.locale]).sort(),
    Object.keys(indicator.warningMessages["en-US"]).sort(), `${language.locale} indicator warnings`);
}
// A regional variant gets its language; an unknown language English; no language the older
// Swedish default.
assert.equal(indicator.languageOf("fr-CA"), "fr-FR");
assert.equal(indicator.languageOf("it-IT"), "en-US");
assert.equal(indicator.languageOf(""), "sv-SE");
assert.equal(indicator.translate("Recording in progress", "it-IT"), "Recording in progress");
assert.equal(indicator.translate("Recording in progress", "nb"), indicator.messages["nb-NO"]["Recording in progress"]);

console.log(`Language lists follow the registry: ${documentLocales.length} document and ${uiLocales.length} interface languages in step texts, grammar, explanations and the capture indicator.`);
