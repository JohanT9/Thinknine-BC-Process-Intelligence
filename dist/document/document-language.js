(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document") : root.T9DocumentModel;
  const languages = typeof module === "object" && module.exports
    ? require("../engine/language-registry") : root.T9LanguageRegistry;
  const api = factory(semantic, languages);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentLanguage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (semantic, languages) {
  const VERSION = "1.0.0";
  const DEFAULT_LANGUAGE = languages.DEFAULT_LANGUAGE;
  const SUPPORTED_LANGUAGES = Object.freeze(languages.supported("document")
    .map(language => language.locale));
  const SYSTEM_TEXT = Object.freeze({
    "en-US": Object.freeze({
      "Syfte": "Purpose",
      "Förutsättningar": "Prerequisites",
      "Arbetsgång": "Workflow",
      "Förväntat resultat": "Expected result",
      "Versionshistorik": "Revision history",
      "Beskriver hur processen genomförs i Business Central.":
        "Describes how the process is performed in Business Central.",
      "Användaren har behörighet till berörda sidor och åtgärder.":
        "The user has access to the relevant pages and actions.",
      "Nödvändiga grunddata och inställningar finns upplagda.":
        "The required master data and settings are available.",
      "Instruktionerna följer de benämningar som visades i Business Central.":
        "The instructions use the labels shown in Business Central.",
      "Processen är genomförd enligt arbetsgången och de registrerade ändringarna har sparats i Business Central.":
        "The process has been completed according to the workflow and the recorded changes have been saved in Business Central.",
      "Ej angiven": "Not specified",
      "Pågående": "In progress",
      "Slutförd": "Completed",
      "Kommentar": "Comment",
      "Observerat resultat": "Observed result",
      "Observerat fel": "Observed error",
      "Processkärmbild": "Process screenshot",
      "Utför uppgiften.": "Complete the task."
    })
  });

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return languages.normalize(value, "document");
  }

  function systemText(value, language) {
    const text = String(value ?? "");
    if (normalize(language) === "sv-SE") return text;
    const english = SYSTEM_TEXT["en-US"][text];
    return english ? languages.translate(english, language) : text;
  }

  function translateInstruction(value, language) {
    const source = String(value ?? "");
    if (normalize(language) === "sv-SE") return source;
    const exact = systemText(source, language);
    if (exact !== source) return exact;
    const rules = [
      [/^Välj ([\s\S]+?), ange ([\s\S]+?) i ([\s\S]+?) och välj ([\s\S]+?)\.$/u,
        "Choose $1, enter $2 in $3, and choose $4."],
      [/^Välj ([\s\S]+?) → ([\s\S]+?) → ([\s\S]+?)\.$/u,
        "Choose $1 → $2 → $3."],
      [/^Välj ([\s\S]+?) i ([\s\S]+?)\.$/u, "Choose $1 in $2."],
      [/^Välj ([\s\S]+?)\.$/u, "Choose $1."],
      [/^Ange ([\s\S]+?) i ([\s\S]+?)\.$/u, "Enter $1 in $2."],
      [/^Ange ([\s\S]+?)\.$/u, "Enter $1."],
      [/^Öppna sidan ([\s\S]+?)\.$/u, "Open page $1."],
      [/^Öppna ([\s\S]+?)\.$/u, "Open $1."],
      [/^Aktivera ([\s\S]+?)\.$/u, "Enable $1."],
      [/^Inaktivera ([\s\S]+?)\.$/u, "Disable $1."],
      [/^Verifiera att ([\s\S]+?)\.$/u, "Verify that $1."],
      [/^Sidan ([\s\S]+?) öppnades\.$/u, "Page $1 opened."],
      [/^En ny sida öppnades\.$/u, "A new page opened."],
      [/^Dialogrutan ([\s\S]+?) öppnades\.$/u, "Dialog $1 opened."],
      [/^En dialogruta öppnades\.$/u, "A dialog opened."],
      [/^Dialogrutan stängdes\.$/u, "The dialog closed."],
      [/^([\s\S]+?) uppdaterades\.$/u, "$1 was updated."],
      [/^Ett val registrerades i ([\s\S]+?)\.$/u,
        "A selection was registered in $1."],
      [/^Ett val registrerades\.$/u, "A selection was registered."],
      [/^Alternativet aktiverades\.$/u, "The option was enabled."],
      [/^Alternativet inaktiverades\.$/u, "The option was disabled."],
      [/^([\s\S]+?) aktiverades\.$/u, "$1 was enabled."],
      [/^([\s\S]+?) inaktiverades\.$/u, "$1 was disabled."],
      [/^Business Central visade ett statusmeddelande\.$/u,
        "Business Central displayed a status message."],
      [/^Business Central visade ett fel\.$/u,
        "Business Central displayed an error."],
      [/^Sektion (\d+)$/u, "Section $1"]
    ];
    for (const [pattern, replacement] of rules) {
      if (pattern.test(source)) return source.replace(pattern, languages.translate(replacement, language));
    }
    return source;
  }

  function transformBlock(block, language) {
    const result = clone(block);
    const protectedText = result.preserveUserText ||
      ["manual", "user-edited"].includes(result.provenance);
    if (!protectedText) {
      for (const property of ["text", "title", "label", "caption"]) {
        if (typeof result[property] !== "string") continue;
        const translated = translateInstruction(result[property], language);
        if (translated !== result[property]) {
          result[property] = translated;
          if (property === "text") delete result.presentationRuns;
        }
      }
    }
    if (Array.isArray(result.blocks)) {
      result.blocks = result.blocks.map(child => transformBlock(child, language));
    }
    if (Array.isArray(result.items)) {
      result.items = result.items.map(item => ({ ...item,
        blocks: (item.blocks || []).map(child => transformBlock(child, language)) }));
    }
    return result;
  }

  function process(documentValue, requestedLanguage) {
    const normalized = semantic.normalize(documentValue);
    const language = normalize(requestedLanguage ||
      normalized.metadata?.documentLanguage);
    const metadata = clone(normalized.metadata);
    metadata.documentLanguage = language;
    for (const property of ["purpose", "expectedResult", "statusLabel", "reviewer",
      "environment"]) {
      if (typeof metadata[property] === "string") {
        metadata[property] = systemText(metadata[property], language);
      }
    }
    return semantic.normalize({ ...clone(normalized), metadata,
      sections: normalized.sections.map(section => ({ ...clone(section),
        title: systemText(section.title, language),
        blocks: section.blocks.map(block => transformBlock(block, language)) })),
      provenance: { ...clone(normalized.provenance),
        transformations: [...new Set([...(normalized.provenance?.transformations || []),
          "document-language"])], documentLanguageVersion: VERSION } });
  }

  return { VERSION, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, normalize,
    systemText, translateInstruction, process };
});
