// The buttons and texts the Business Central web client adds to every page (New, Edit, Delete,
// Yes, No, Back, Search, Close, Show more...) must be recognized in every registered language as
// the client itself shows them: the core knowledge rules, engine/bc-client-captions.js and the
// client's New in document/bc-caption-translation.js are checked against the client's own
// language resources (tests/fixtures/bc-client-resources.json, scripts/build-client-resources.js).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const knowledge = require("../src/engine/knowledge-domain");
const clientCaptions = require("../src/engine/bc-client-captions");
const translation = require("../src/document/bc-caption-translation");
const languages = require("../src/engine/language-registry");

const root = path.resolve(__dirname, "..");
const fixture = require("./fixtures/bc-client-resources.json");
const core = JSON.parse(fs.readFileSync(path.join(root, "src/knowledge-packs/core.json"), "utf8"));
const locales = languages.supported().map(item => item.locale).sort();

assert.match(fixture.version, /^\d+\.\d+\.\d+\.\d+$/u);
for (const [key, texts] of Object.entries(fixture.texts)) {
  assert.deepEqual(Object.keys(texts).sort(), locales, `${key} has the client's text in every language`);
}

// The core rules: each client button is recognized as the rule in every language, alone on a page.
let checked = 0;
for (const [ruleId, keys] of Object.entries(fixture.uses).filter(([id]) => id.startsWith("Core."))) {
  const rule = core.rules.find(item => item.ruleId === ruleId);
  assert.ok(rule, `${ruleId} exists`);
  for (const key of keys.filter(item => fixture.texts[item])) {
    for (const locale of locales) {
      const caption = fixture.texts[key][locale];
      assert.ok(knowledge.patternsMatch(rule.match.actionPatterns, caption),
        `${ruleId} recognizes the client's ${key} in ${locale}: "${caption}"`);
      checked += 1;
    }
  }
}

// The client catalog: each category recognizes its resource texts in every language. The Tell Me
// search is recognized by the first sentence of its tooltip.
const firstSentence = value => value.split(/(?<=[.?!])\s/u)[0];
for (const [category, keys] of Object.entries(fixture.uses).filter(([id]) => !id.startsWith("Core."))) {
  assert.ok(clientCaptions.CAPTIONS[category], `client caption category ${category} exists`);
  for (const key of keys.filter(item => fixture.texts[item])) {
    for (const locale of locales) {
      const value = category === "tellMe" ? firstSentence(fixture.texts[key][locale]) : fixture.texts[key][locale];
      assert.ok(clientCaptions.matches(category, value),
        `${category} recognizes the client's ${key} in ${locale}: "${value}"`);
      checked += 1;
    }
  }
}

// The client's New, as a document names it in another language.
for (const locale of locales) {
  assert.equal(translation.translate("New", "c|New", locale), fixture.texts.CreateActionCaption[locale],
    `the client's New is named as the client names it in ${locale}`);
}

console.log(`Business Central client captions verified against web client ${fixture.version} (${checked} checks${fixture.missing.length ? `; not in this version: ${fixture.missing.join(", ")}` : ""}).`);
