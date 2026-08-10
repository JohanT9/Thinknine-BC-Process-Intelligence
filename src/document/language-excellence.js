(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const api = factory(semantic);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9LanguageExcellence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (semantic) {
  const LANGUAGE_VERSION = "1.0.0";
  const cache = new WeakMap();
  const STYLE_GUIDE = semantic.deepFreeze({
    principles: ["concise", "consistent", "active", "precise", "professional"],
    canonicalActions: {
      sv: { click: "Välj", press: "Välj", navigate: "Öppna", verify: "Verifiera" },
      en: { click: "Select", press: "Choose", navigate: "Open", verify: "Verify" }
    },
    profileTones: {
      "business-process": "professional", sop: "precise",
      "training-guide": "explanatory", "quick-reference": "concise",
      "troubleshooting-guide": "diagnostic"
    }
  });
  const COMMON_RULES = Object.freeze([
    [/^Klicka på\s+/iu, "Välj "], [/^Tryck på\s+/iu, "Välj "],
    [/^Gå till\s+/iu, "Öppna "], [/^Se till att\s+/iu, "Verifiera att "],
    [/^Click(?: on)?\s+/iu, "Select "], [/^Press\s+/iu, "Choose "],
    [/^Go to\s+/iu, "Open "], [/^Make sure that\s+/iu, "Verify that "]
  ]);
  const PROFILE_RULES = Object.freeze({
    precise: Object.freeze([[/^Kontrollera att\s+/iu, "Verifiera att "],
      [/^Check that\s+/iu, "Verify that "]]),
    concise: Object.freeze([[/^Kontrollera att\s+/iu, "Verifiera att "],
      [/^Check that\s+/iu, "Verify that "]]),
    diagnostic: Object.freeze([[/^Kontrollera om\s+/iu, "Verifiera om "],
      [/^Check whether\s+/iu, "Verify whether "]])
  });

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function toneFor(profile) {
    return profile?.language?.tone ||
      STYLE_GUIDE.profileTones[profile?.profileId] || "professional";
  }

  function improveText(value, profile) {
    if (typeof value !== "string") return value;
    let result = value.trim();
    if (/^(?:Tryck på|Press)\s+(?:Enter|Escape|Esc|Tab|Backspace|Delete|Home|End|Page Up|Page Down|F\d{1,2})(?:\b|\.)/iu.test(result)) {
      return result;
    }
    const rules = [...COMMON_RULES, ...(PROFILE_RULES[toneFor(profile)] || [])];
    for (const [pattern, replacement] of rules) {
      if (pattern.test(result)) {
        result = result.replace(pattern, replacement);
        break;
      }
    }
    return result;
  }

  function improveBlock(block, profile) {
    const result = clone(block);
    if (!semantic.BLOCK_KINDS.includes(result.kind)) return result;
    if (result.preserveUserText || result.provenance === "user-edited") {
      return result;
    }
    for (const property of ["text", "caption", "title", "note", "label"]) {
      if (typeof result[property] === "string") {
        result[property] = improveText(result[property], profile);
      }
    }
    if (Array.isArray(result.blocks)) {
      result.blocks = result.blocks.map(child => improveBlock(child, profile));
    }
    if (Array.isArray(result.items)) {
      result.items = result.items.map(item => ({ ...item,
        blocks: Array.isArray(item.blocks)
          ? item.blocks.map(child => improveBlock(child, profile)) : item.blocks }));
    }
    if (Array.isArray(result.rows)) {
      result.rows = result.rows.map(row => ({ ...row,
        cells: Array.isArray(row.cells) ? row.cells.map(cell => ({ ...cell,
          blocks: Array.isArray(cell.blocks)
            ? cell.blocks.map(child => improveBlock(child, profile)) : cell.blocks
        })) : row.cells }));
    }
    return result;
  }

  function process(document, profile = {}) {
    const profileKey = `${profile.profileId || "business-process"}:${toneFor(profile)}`;
    const cacheable = document && typeof document === "object" &&
      Object.isFrozen(document);
    const cached = cacheable ? cache.get(document)?.get(profileKey) : null;
    if (cached) return cached;
    const normalized = semantic.normalize(document);
    const metadata = clone(normalized.metadata);
    for (const property of ["purpose", "notes", "expectedResult"]) {
      if (typeof metadata[property] === "string") {
        metadata[property] = improveText(metadata[property], profile);
      }
    }
    const improved = semantic.normalize({ ...clone(normalized), metadata,
      sections: normalized.sections.map(section => ({ ...clone(section),
        blocks: section.blocks.map(block => improveBlock(block, profile)) }))
    });
    if (cacheable) {
      const entry = cache.get(document) || new Map();
      entry.set(profileKey, improved);
      cache.set(document, entry);
    }
    return improved;
  }

  return { LANGUAGE_VERSION, STYLE_GUIDE, improveText, process, toneFor };
});
