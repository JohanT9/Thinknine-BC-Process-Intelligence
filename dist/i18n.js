(function initUiI18n(root) {
  "use strict";

  const DEFAULT_LOCALE = "sv-SE";
  const SUPPORTED_LOCALES = Object.freeze(["sv-SE", "en-US"]);
  const messages = Object.freeze({
    "sv-SE": Object.freeze({
      "app.tagline": "Business Process Intelligence för Microsoft Dynamics 365 Business Central.",
      "app.promise": "Gör Business Central-processer till kunskap.",
      "app.promiseDetail": "Spela in. Dokumentera. Förbättra.",
      "settings.summary": "Inställningar för dokumentation, export och inspelning",
      "settings.language": "Gränssnittsspråk",
      "settings.languageHelp": "Ändrar språket i BC Process Studio. Inspelat innehåll och dokument påverkas inte.",
      "settings.save": "Spara inställningar",
      "settings.saved": "Inställningarna har sparats.",
      "recorder.inactive": "Inte aktiv",
      "recorder.processActive": "Processinspelning pågår",
      "recorder.bugActive": "Felrapportering pågår",
      "recorder.new": "Ny inspelning",
      "recorder.process": "Dokumentera en process",
      "recorder.processHelp": "Spela in ett arbetsflöde och skapa steg-för-steg-dokumentation.",
      "recorder.bug": "Rapportera ett fel",
      "recorder.bugHelp": "Reproducera problemet och skapa en teknisk felrapport.",
      "recorder.openLibrary": "Öppna Dokumentbibliotek",
      "recorder.tools": "Tekniska verktyg",
      "recorder.openDebug": "Öppna debugpanel"
    }),
    "en-US": Object.freeze({
      "app.tagline": "Business Process Intelligence for Microsoft Dynamics 365 Business Central.",
      "app.promise": "Turn Business Central processes into knowledge.",
      "app.promiseDetail": "Capture. Document. Improve.",
      "settings.summary": "Documentation, export and recording settings",
      "settings.language": "Interface language",
      "settings.languageHelp": "Changes the language in BC Process Studio. Recorded content and documents are not affected.",
      "settings.save": "Save settings",
      "settings.saved": "Settings saved.",
      "recorder.inactive": "Not active",
      "recorder.processActive": "Process recording in progress",
      "recorder.bugActive": "Issue recording in progress",
      "recorder.new": "New recording",
      "recorder.process": "Document a process",
      "recorder.processHelp": "Record a workflow and create step-by-step documentation.",
      "recorder.bug": "Report an issue",
      "recorder.bugHelp": "Reproduce the problem and create a technical issue report.",
      "recorder.openLibrary": "Open Document Library",
      "recorder.tools": "Technical tools",
      "recorder.openDebug": "Open debug panel"
    })
  });

  function normalizeLocale(value) {
    const candidate = String(value || "").trim().toLowerCase();
    if (candidate === "en" || candidate.startsWith("en-")) return "en-US";
    if (candidate === "sv" || candidate.startsWith("sv-")) return "sv-SE";
    return DEFAULT_LOCALE;
  }

  function translate(key, locale = DEFAULT_LOCALE) {
    const normalized = normalizeLocale(locale);
    return messages[normalized]?.[key] ?? messages[DEFAULT_LOCALE]?.[key] ?? key;
  }

  function apply(locale, target = root.document) {
    if (!target?.querySelectorAll) return normalizeLocale(locale);
    const normalized = normalizeLocale(locale);
    target.documentElement?.setAttribute("lang", normalized.split("-")[0]);
    target.querySelectorAll("[data-i18n]").forEach(element => {
      element.textContent = translate(element.dataset.i18n, normalized);
    });
    target.dispatchEvent?.(new CustomEvent("t9:locale-changed", {
      detail: { locale: normalized }
    }));
    return normalized;
  }

  root.T9UiI18n = Object.freeze({
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    normalizeLocale,
    translate,
    apply
  });
})(globalThis);
