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
      "library.searchPlaceholder": "Titel, profil, tagg eller arbetsflöde",
      "review.expectedPlaceholder": "Beskriv vad som ska vara uppnått när arbetsflödet är klart.",
      "library.oneShown": "1 dokument visas.",
      "library.manyShown": "{count} dokument visas.",
      "library.limitedShown": "{matches} dokument matchar. De första {count} visas.",
      "library.oneSelected": "1 dokument valt",
      "library.manySelected": "{count} dokument valda",
      "document.page": "Sida {page} av {count}",
      "document.pageZoomAnnouncement": "Sida {page} av {count}, zoom {zoom} procent.",
      "document.synchronized": "Dokumentet är synkroniserat. {count} avsnitt.",
      "review.changeImageForStep": "Byt bild för steg {step}",
      "review.editImageForStep": "Redigera bild för steg {step}",
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
      ,"recorder.waiting": "Väntar på första händelsen"
      ,"recorder.eventCaptured": "Händelse registrerad"
      ,"recorder.savedCount": "{count} sparade"
      ,"recorder.pendingCount": " · {count} väntar"
      ,"recorder.notRegistered": "Ej registrerad"
      ,"recorder.notIdentified": "Ej identifierad"
      ,"recorder.connected": "Ansluten"
      ,"recorder.notConfirmed": "Inte bekräftad"
      ,"recorder.processGuidance": "Utför processen i Business Central och stoppa när du är klar."
      ,"recorder.bugGuidance": "Återskapa felet och kopiera gärna Business Central-feldetaljerna. Stoppa sedan för att granska rapporten."
      ,"recorder.stopProcess": "Stoppa inspelning"
      ,"recorder.stopBug": "Stoppa och öppna felrapport"
      ,"recorder.errorCaptured": "Business Central-felet har fångats. Alla tekniska detaljer var inte tillgängliga."
      ,"recorder.errorDetailsCaptured": "Business Central-felet och tekniska detaljer har fångats."
      ,"recorder.checking": "Kontrollerar anslutningen till Business Central..."
      ,"recorder.openBcFirst": "Öppna Business Central i den aktiva fliken först."
      ,"recorder.connectionWorks": "Anslutningen fungerar. Startar sessionen..."
      ,"recorder.processStarted": "Processinspelningen har startats."
      ,"recorder.bugStarted": "Felrapporteringen har startats. Återskapa felet i Business Central."
      ,"recorder.savedLibrary": "Inspelningen har sparats i Dokumentbiblioteket."
      ,"recorder.stopping": "Stoppar inspelningen..."
      ,"recorder.creatingReport": "Skapar felrapport och öppnar den för granskning..."
      ,"recorder.stopped": "Inspelningen har stoppats."
      ,"recorder.reportOpened": "Felrapporten har skapats och öppnats."
      ,"recorder.discardConfirm": "Vill du avbryta inspelningen? Alla registrerade händelser och bilder i den tas bort."
      ,"recorder.discarding": "Avbryter inspelningen..."
      ,"recorder.discarded": "Inspelningen avbröts och togs bort."
      ,"recorder.nameBug": "Namnge felrapporten"
      ,"recorder.nameProcess": "Namnge processinspelningen"
      ,"recorder.nameBugHelp": "Ange ett tydligt namn på problemet. Rapporten skapas när du fortsätter."
      ,"recorder.nameProcessHelp": "Ange namnet som ska visas i Dokumentbiblioteket."
      ,"recorder.nameBugPlaceholder": "Exempel: Fel vid frisläppning av order"
      ,"recorder.nameProcessPlaceholder": "Exempel: Skapa försäljningsorder"
      ,"recorder.completionHelp": "Vill du öppna Dokumentbiblioteket och fortsätta arbeta med dokumentationen?"
      ,"recorder.cancelStopTitle": "Avbryt stopp och fortsätt spela in"
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
      "library.searchPlaceholder": "Title, profile, tag or workflow",
      "review.expectedPlaceholder": "Describe what should be achieved when the workflow is complete.",
      "library.oneShown": "1 document shown.",
      "library.manyShown": "{count} documents shown.",
      "library.limitedShown": "{matches} documents match. The first {count} are shown.",
      "library.oneSelected": "1 document selected",
      "library.manySelected": "{count} documents selected",
      "document.page": "Page {page} of {count}",
      "document.pageZoomAnnouncement": "Page {page} of {count}, zoom {zoom} percent.",
      "document.synchronized": "Document synchronized. {count} sections.",
      "review.changeImageForStep": "Change image for step {step}",
      "review.editImageForStep": "Edit image for step {step}",
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
      ,"recorder.waiting": "Waiting for the first event"
      ,"recorder.eventCaptured": "Event captured"
      ,"recorder.savedCount": "{count} saved"
      ,"recorder.pendingCount": " · {count} pending"
      ,"recorder.notRegistered": "Not recorded"
      ,"recorder.notIdentified": "Not identified"
      ,"recorder.connected": "Connected"
      ,"recorder.notConfirmed": "Not confirmed"
      ,"recorder.processGuidance": "Perform the process in Business Central and stop when finished."
      ,"recorder.bugGuidance": "Reproduce the issue and, if possible, copy the Business Central error details. Then stop to review the report."
      ,"recorder.stopProcess": "Stop recording"
      ,"recorder.stopBug": "Stop and open issue report"
      ,"recorder.errorCaptured": "The Business Central error was captured. Some technical details were unavailable."
      ,"recorder.errorDetailsCaptured": "The Business Central error and technical details were captured."
      ,"recorder.checking": "Checking the connection to Business Central..."
      ,"recorder.openBcFirst": "Open Business Central in the active tab first."
      ,"recorder.connectionWorks": "Connection verified. Starting the session..."
      ,"recorder.processStarted": "Process recording started."
      ,"recorder.bugStarted": "Issue recording started. Reproduce the issue in Business Central."
      ,"recorder.savedLibrary": "The recording was saved in the Document Library."
      ,"recorder.stopping": "Stopping the recording..."
      ,"recorder.creatingReport": "Creating and opening the issue report for review..."
      ,"recorder.stopped": "The recording has stopped."
      ,"recorder.reportOpened": "The issue report was created and opened."
      ,"recorder.discardConfirm": "Cancel this recording? All captured events and screenshots in it will be deleted."
      ,"recorder.discarding": "Cancelling the recording..."
      ,"recorder.discarded": "The recording was cancelled and deleted."
      ,"recorder.nameBug": "Name the issue report"
      ,"recorder.nameProcess": "Name the process recording"
      ,"recorder.nameBugHelp": "Enter a clear name for the problem. The report is created when you continue."
      ,"recorder.nameProcessHelp": "Enter the name to display in the Document Library."
      ,"recorder.nameBugPlaceholder": "Example: Error when releasing an order"
      ,"recorder.nameProcessPlaceholder": "Example: Create sales order"
      ,"recorder.completionHelp": "Open the Document Library and continue working on the documentation?"
      ,"recorder.cancelStopTitle": "Cancel stopping and continue recording"
    })
  });

  const STATIC_TEXT = Object.freeze([
    ["Dokumentation", "Documentation"], ["Export", "Export"],
    ["Inspelning", "Recording"], ["Miljönamn", "Environment name"],
    ["Företag", "Company"], ["Standardtext för förväntat resultat", "Default expected-result text"],
    ["Filnamnsmall", "File name template"], ["Ta skärmbilder", "Capture screenshots"],
    ["Skärmbilder", "Screenshots"], ["Endast viktiga steg", "Important steps only"],
    ["Alla åtgärder och sidbyten", "All actions and page changes"],
    ["Inga skärmbilder", "No screenshots"], ["Maximalt antal händelser", "Maximum events"],
    ["Hitta tidigare dokumentation med hjälp av innehåll och dokumentinformation.",
      "Find previous documentation using content and document information."],
    ["Sök dokument", "Search documents"], ["Dokumentprofil", "Document profile"],
    ["Alla profiler", "All profiles"], ["Dokumenthälsa", "Document health"],
    ["All hälsa", "All health"], ["Sortera", "Sort"],
    ["Senast ändrad", "Last modified"], ["Skapad", "Created"],
    ["Alfabetiskt", "Alphabetical"], ["Senast öppnad", "Last opened"],
    ["Endast favoriter", "Favourites only"], ["Nyligen använda", "Recently used"],
    ["Gruppera per profil", "Group by profile"], ["Fler filter", "More filters"],
    ["Tema", "Theme"], ["Alla teman", "All themes"],
    ["Skapad från", "Created from"], ["Skapad till", "Created to"],
    ["Ändrad från", "Modified from"], ["Ändrad till", "Modified to"],
    ["Välj alla träffar", "Select all results"], ["Rensa val", "Clear selection"],
    ["Öppna dokumentation", "Open documentation"],
    ["Öppna felrapport", "Open issue report"],
    ["Exportera Word", "Export Word"], ["Favoritmarkera", "Mark as favourite"],
    ["Taggar", "Tags"], ["Profil", "Profile"], ["Fler åtgärder", "More actions"],
    ["Redigera metadata", "Edit metadata"], ["Arkivera", "Archive"],
    ["Ta bort permanent", "Delete permanently"], ["Ändra taggar", "Change tags"],
    ["Ändra profil", "Change profile"], ["Ändra tema", "Change theme"],
    ["Ändra författare", "Change author"], ["Ändra status", "Change status"],
    ["Ändra arkivstatus", "Change archive status"], ["Arkiverad", "Archived"],
    ["Aktiv", "Active"], ["Avbryt", "Cancel"], ["Tillämpa", "Apply"],
    ["Inspelningar och tekniska verktyg", "Recordings and technical tools"],
    ["Uppdatera inspelningar", "Refresh recordings"], ["Namn", "Name"],
    ["Startad", "Started"], ["Händelser", "Events"], ["Status", "Status"],
    ["Åtgärder", "Actions"], ["Stäng", "Close"], ["Ångra", "Undo"],
    ["Gör om", "Redo"], ["Spara", "Save"], ["Slå samman", "Merge"],
    ["Dela", "Split"], ["Återställ struktur", "Reset structure"],
    ["Skapa sektion", "Create section"], ["Skapa deluppgift", "Create subtask"],
    ["Återställ hierarki", "Reset hierarchy"], ["Flytta upp", "Move up"],
    ["Flytta ned", "Move down"], ["Regenerera från inspelning", "Regenerate from recording"],
    ["Komprimera alla", "Collapse all"], ["Lägg till steg", "Add step"],
    ["Slutför granskning", "Complete review"], ["Steg", "Steps"],
    ["Valda", "Selected"], ["Uppskattade sidor", "Estimated pages"],
    ["Dokumentinformation", "Document information"], ["Förväntat resultat", "Expected result"],
    ["Återställ standardtext", "Reset default text"], ["Redigera bild", "Edit image"],
    ["Markera viktiga områden utan att ändra originalbilden.",
      "Highlight important areas without changing the original image."],
    ["Klar", "Done"], ["Rektangel", "Rectangle"], ["Pil", "Arrow"],
    ["Ta bort markering", "Delete annotation"], ["Markeringar", "Annotations"],
    ["Exakt position och storlek", "Exact position and size"],
    ["Anpassa bredd", "Fit width"], ["Anpassa sida", "Fit page"],
    ["Kontinuerligt", "Continuous"], ["Sidläge", "Page mode"],
    ["Föregående", "Previous"], ["Nästa", "Next"],
    ["Vyinställningar", "View settings"],
    ["Avancerade vyinställningar", "Advanced view settings"],
    ["Adaptiv läsmiljö", "Adaptive reading environment"],
    ["Auto (rekommenderas)", "Auto (recommended)"], ["Alltid på", "Always on"],
    ["Alltid av", "Always off"], ["Verktygsfält", "Toolbar"],
    ["Fullständigt", "Full"], ["Kompakt", "Compact"],
    ["Förhandsgranska regenerering", "Preview regeneration"],
    ["Granska vad som ändras innan dokumentationen uppdateras.",
      "Review the changes before the documentation is updated."],
    ["Godkänn och regenerera", "Approve and regenerate"], ["Byt bild", "Change image"],
    ["Ta ny skärmbild", "Capture new screenshot"],
    ["Tillgängliga skärmbilder", "Available screenshots"],
    ["Använd vald bild", "Use selected image"], ["Instruktion", "Instruction"],
    ["Redigera", "Edit"], ["Flytta", "Move"], ["Godkänd", "Approved"],
    ["Lägg till efter", "Add after"], ["Återställ text", "Reset text"],
    ["Dölj", "Hide"], ["Komprimera", "Collapse"],
    ["Lägg till kommentar", "Add comment"], ["Redigera kommentar", "Edit comment"],
    ["Återställ kommentar", "Reset comment"], ["Redigera bild", "Edit image"],
    ["Session", "Session"], ["Senaste", "Latest"], ["Sida", "Page"],
    ["Kontext", "Context"], ["Anslutning", "Connection"],
    ["Live-status", "Live status"], ["Namnge inspelningen", "Name the recording"],
    ["Spara och stoppa", "Save and stop"], ["Avbryt inspelning", "Cancel recording"],
    ["Inspelningen är klar", "Recording complete"], ["Inte nu", "Not now"]
  ]);

  const staticLookup = new Map();
  STATIC_TEXT.forEach(([sv, en]) => {
    staticLookup.set(sv, { "sv-SE": sv, "en-US": en });
    staticLookup.set(en, { "sv-SE": sv, "en-US": en });
  });
  const safeTextTags = new Set(["BUTTON", "SUMMARY", "LEGEND", "OPTION", "TH",
    "DT", "LABEL", "H2", "H3", "H4"]);
  const observedTargets = new WeakSet();

  function translateStaticText(value, locale) {
    const normalized = normalizeLocale(locale);
    return staticLookup.get(String(value || "").trim())?.[normalized] || value;
  }

  function excludedFromInterfaceTranslation(node) {
    return Boolean(node.parentElement?.closest?.(
      "#documentWorkspace, #reviewList, #annotationStage, [data-i18n-ignore]"));
  }

  function applyStaticText(locale, target) {
    const documentRef = target?.ownerDocument || target;
    if (!documentRef?.createTreeWalker || !root.NodeFilter) return;
    const walker = documentRef.createTreeWalker(target.body || target,
      root.NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && safeTextTags.has(parent.tagName) &&
          !excludedFromInterfaceTranslation(node)) {
        const trimmed = node.nodeValue.trim();
        const translated = translateStaticText(trimmed, locale);
        if (translated !== trimmed) {
          const leading = node.nodeValue.match(/^\s*/)?.[0] || "";
          const trailing = node.nodeValue.match(/\s*$/)?.[0] || "";
          node.nodeValue = `${leading}${translated}${trailing}`;
        }
      }
      node = walker.nextNode();
    }
  }

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

  function format(key, values, locale = DEFAULT_LOCALE) {
    return Object.entries(values || {}).reduce((result, [name, value]) =>
      result.replaceAll(`{${name}}`, String(value)), translate(key, locale));
  }

  function apply(locale, target = root.document) {
    if (!target?.querySelectorAll) return normalizeLocale(locale);
    const normalized = normalizeLocale(locale);
    target.documentElement?.setAttribute("lang", normalized.split("-")[0]);
    target.querySelectorAll("[data-i18n]").forEach(element => {
      element.textContent = translate(element.dataset.i18n, normalized);
    });
    target.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
      element.placeholder = translate(element.dataset.i18nPlaceholder, normalized);
    });
    target.querySelectorAll("[data-i18n-title]").forEach(element => {
      element.title = translate(element.dataset.i18nTitle, normalized);
    });
    applyStaticText(normalized, target);
    target.dispatchEvent?.(new CustomEvent("t9:locale-changed", {
      detail: { locale: normalized }
    }));
    return normalized;
  }

  function observe(localeProvider, target = root.document) {
    if (!root.MutationObserver || !target?.body || observedTargets.has(target)) return;
    observedTargets.add(target);
    const observer = new root.MutationObserver(records => {
      const locale = localeProvider();
      records.forEach(record => record.addedNodes.forEach(node => {
        const scope = node.nodeType === 3 ? node.parentElement : node;
        if (scope?.nodeType === 1) applyStaticText(locale, scope);
      }));
    });
    observer.observe(target.body, { childList: true, subtree: true });
  }

  root.T9UiI18n = Object.freeze({
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    normalizeLocale,
    translate,
    format,
    translateStaticText,
    apply,
    observe
  });
})(globalThis);
