const assert = require("assert");
globalThis.T9LanguageRegistry = require("../src/engine/language-registry");
require("../src/ui/i18n");
const i18n = globalThis.T9UiI18n;
const keys = ["settings.knowledgeMcpLegend", "settings.knowledgeMcpEnable",
  "settings.knowledgeMcpHelp", "settings.knowledgeMcpTest",
  "settings.knowledgeMcpChecking", "settings.knowledgeMcpConnected",
  "settings.knowledgeMcpUnavailable", "settings.knowledgeMcpFailureDetail",
  "settings.knowledgeMcpConsentRequired", "settings.knowledgeMcpSampleLookup",
  "settings.knowledgeMcpSampleChecking", "settings.knowledgeMcpSampleFound",
  "settings.knowledgeMcpSampleUnresolved", "settings.knowledgeMcpSampleConsentRequired",
  "review.externalKnowledgeTitle", "review.externalKnowledgeObject",
  "review.externalKnowledgeAction", "review.externalKnowledgeMeta",
  "review.externalKnowledgeNoUnresolved", "review.externalKnowledgeNoSuggestions",
  "review.externalKnowledgeUnavailable"];
const english = Object.fromEntries(keys.map(key => [key, i18n.translate(key, "en-US")]));
const locales = globalThis.T9LanguageRegistry.supported("ui").map(language => language.locale);
for (const locale of locales) {
  for (const key of keys) {
    const value = i18n.translate(key, locale);
    assert.ok(value && value !== key, `${locale} is missing ${key}`);
    if (locale !== "en-US") assert.notStrictEqual(value, english[key],
      `${locale} uses untranslated English for ${key}`);
  }
}
console.log(`Knowledge MCP settings localized in ${locales.join(", ")}.`);
