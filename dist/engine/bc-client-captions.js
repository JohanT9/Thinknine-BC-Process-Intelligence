(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BCClientCaptions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Business Central client controls that are not business steps: closing, scrolling,
  // showing more, browser history, field hints and the Tell Me search. Recognition prefers
  // structure (dialog buttons join the action that opened the dialog, private-use icon
  // glyphs, section toggles); these captions cover what structure cannot.
  // Only captions observed in recordings are listed. Languages without observed captions are
  // documented gaps (docs/EVENT_STEP_GROUPING.md), not guessed translations.
  const CAPTIONS = Object.freeze({
    close: {
      "sv-SE": [/^stäng\.?$/iu],
      "en-US": [/^(?:close|dismiss)\.?$/iu]
    },
    scroll: {
      "sv-SE": [/^rulla(?:\s+åt)?\s+(?:höger|vänster|upp|ned|ner)\.?$/iu],
      "en-US": [/^scroll(?:\s+to\s+the)?\s+(?:right|left|up|down)\.?$/iu]
    },
    display: {
      "sv-SE": [/^(?:visa resten|visa mindre|visa sekundära åtgärder)\.?$/iu],
      "en-US": [/^(?:show more|show less|show secondary actions)\.?$/iu]
    },
    history: {
      "sv-SE": [/^(?:bakåt|tillbaka|framåt)$/iu],
      "en-US": [/^(?:back|forward)$/iu]
    },
    tellMe: {
      "sv-SE": [/^berätta vad du vill göra\.?$/iu],
      "en-US": [/^tell me what you want to do\.?$/iu]
    },
    fieldHint: {
      "sv-SE": [/den här gruppen innehåller .* obligatoriska fält/iu,
        /obligatoriska fält.*inte är ifyllda/iu,
        /tryck på alt\s*\+\s*i.*förslag för det här fältet/iu,
        /värdet i det här fältet är obligatoriskt/iu],
      "en-US": [/this group contains .* required fields/iu,
        /press alt\s*\+\s*i.*suggestion for this field/iu,
        /the value in this field is required/iu]
    }
  });

  function matches(category, caption) {
    const text = String(caption || "").trim();
    return Boolean(text) && Object.values(CAPTIONS[category] || {})
      .some(patterns => patterns.some(pattern => pattern.test(text)));
  }

  // Category and language pairs without observed captions.
  function gaps(locales = []) {
    return Object.entries(CAPTIONS).flatMap(([category, byLocale]) =>
      locales.filter(locale => !byLocale[locale]).map(locale => ({ category, locale })));
  }

  return { CAPTIONS, gaps, matches };
});
