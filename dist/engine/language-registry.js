(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9LanguageRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_LANGUAGE = "sv-SE";
  const DEFAULT_DEFINITIONS = Object.freeze([
    Object.freeze({ locale: "sv-SE", shortCode: "SV", nativeName: "Svenska",
      aliases: Object.freeze(["sv", "sv-se"]), ui: true, document: true }),
    Object.freeze({ locale: "en-US", shortCode: "EN", nativeName: "English",
      aliases: Object.freeze(["en", "en-us", "en-gb"]), ui: true,
      document: true })
  ]);

  function validateDefinition(value) {
    if (!value || typeof value !== "object") throw new TypeError(
      "Language definition must be an object."
    );
    const locale = String(value.locale || "").trim();
    const shortCode = String(value.shortCode || "").trim().toUpperCase();
    const nativeName = String(value.nativeName || "").trim();
    if (!/^[a-z]{2,3}-[A-Z]{2}$/u.test(locale)) throw new TypeError(
      `Invalid language locale: ${locale || "missing"}.`
    );
    if (!/^[A-Z]{2,3}$/u.test(shortCode)) throw new TypeError(
      `Invalid language short code for ${locale}.`
    );
    if (!nativeName) throw new TypeError(`Missing native name for ${locale}.`);
    if (!value.ui && !value.document) throw new TypeError(
      `Language ${locale} must support UI, documents, or both.`
    );
    return Object.freeze({ ...value, locale, shortCode, nativeName,
      aliases: Object.freeze([...new Set([locale.toLowerCase(),
        ...(value.aliases || [])].map(alias =>
        String(alias).trim().toLowerCase()).filter(Boolean))]),
      ui: Boolean(value.ui), document: Boolean(value.document) });
  }

  function createRegistry(definitions = DEFAULT_DEFINITIONS,
    defaultLanguage = DEFAULT_LANGUAGE) {
    const languages = Object.freeze(definitions.map(validateDefinition));
    const locales = new Set();
    const aliases = new Map();
    languages.forEach(language => {
      if (locales.has(language.locale)) throw new TypeError(
        `Duplicate language locale: ${language.locale}.`
      );
      locales.add(language.locale);
      language.aliases.forEach(alias => {
        if (aliases.has(alias)) throw new TypeError(
          `Duplicate language alias: ${alias}.`
        );
        aliases.set(alias, language.locale);
      });
    });
    if (!locales.has(defaultLanguage)) throw new TypeError(
      `Default language ${defaultLanguage} is not registered.`
    );
    const supported = capability => Object.freeze(languages.filter(language =>
      capability === "ui" ? language.ui : capability === "document"
        ? language.document : true));
    const normalize = (value, capability = "document") => {
      const input = String(value || "").trim().toLowerCase();
      const exact = aliases.get(input);
      const prefix = !exact && input ? languages.find(language =>
        language.aliases.some(alias => alias === input.split("-")[0])) : null;
      const locale = exact || prefix?.locale || defaultLanguage;
      return supported(capability).some(language => language.locale === locale)
        ? locale : defaultLanguage;
    };
    const get = value => languages.find(language => language.locale ===
      normalize(value, "all")) || languages.find(language =>
      language.locale === defaultLanguage);
    const next = (value, capability = "ui") => {
      const choices = supported(capability);
      const current = normalize(value, capability);
      const index = choices.findIndex(language => language.locale === current);
      return choices[(index + 1) % choices.length]?.locale || defaultLanguage;
    };
    return Object.freeze({ defaultLanguage, languages, supported, normalize,
      get, next });
  }

  const registry = createRegistry();
  return Object.freeze({ DEFAULT_LANGUAGE, DEFAULT_DEFINITIONS,
    createRegistry, validateDefinition, ...registry });
});
