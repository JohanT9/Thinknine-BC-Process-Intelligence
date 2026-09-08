(function initUiI18n(root) {
  "use strict";

  const languageRegistry = root.T9LanguageRegistry;
  const DEFAULT_LOCALE = languageRegistry.DEFAULT_LANGUAGE;
  const SUPPORTED_LOCALES = Object.freeze(languageRegistry.supported("ui")
    .map(language => language.locale));
  const messages = Object.freeze({
    "sv-SE": Object.freeze({
      "app.tagline": "Business Process Intelligence för Microsoft Dynamics 365 Business Central.",
      "app.promise": "Gör Business Central-processer till kunskap.",
      "app.promiseDetail": "Spela in. Dokumentera. Förbättra.",
      "settings.summary": "Inställningar för dokumentation, export och inspelning",
      "settings.language": "Gränssnittsspråk",
      "settings.languageHelp": "Ändrar språket i BC Process Studio. Inspelat innehåll och dokument påverkas inte.",
      "settings.documentLanguage": "Dokumentspråk",
      "settings.documentLanguageHelp": "Standardspråk för nya processdokument. Observerade Business Central-benämningar ändras inte.",
      "review.documentLanguage": "Dokumentspråk",
      "review.nextUnreviewed": "Nästa ogranskade",
      "review.nextUnreviewedLabel": "Nästa ogranskade steg. {count} återstår.",
      "review.nextUnreviewedShown": "Nästa ogranskade steg visas. {count} återstår.",
      "review.lastUnreviewedShown": "Det sista ogranskade steget visas.",
      "review.allStepsReviewed": "Alla steg är granskade.",
      "review.keyboardHelp": "Välj steg med piltangenterna. Använd Ctrl för flerval och Shift för intervall. Alt plus N går till nästa ogranskade steg. Tryck Enter för att redigera. I instruktionen skapar Enter en ny rad, Ctrl eller Cmd plus Enter sparar och Escape avbryter. Alt plus pil flyttar valda steg.",
      "process.overview": "Processöversikt",
      "process.overviewHelp": "Välj en aktivitet för att gå direkt till motsvarande steg. Detaljer visas under kartan.",
      "process.overviewError": "Processöversikten kunde inte visas: {detail}",
      "process.exportError": "Processen kunde inte exporteras: {detail}",
      "process.versionSaved": "Processversion {version} har sparats.",
      "process.versionSaveError": "Processversionen kunde inte sparas: {detail}",
      "language.switchToEnglish": "Byt språk till engelska",
      "language.switchToSwedish": "Byt språk till svenska",
      "language.switchToLanguage": "Byt språk till {language}",
      "settings.save": "Spara inställningar",
      "settings.saved": "Inställningarna har sparats.",
      "library.searchPlaceholder": "Titel, profil, tagg eller arbetsflöde",
      "library.documentLanguage": "Dokumentspråk",
      "library.allLanguages": "Alla språk",
      "library.filters": "Filter",
      "library.activeFilters": "Filter, {count} aktiva",
      "library.resetFilters": "Återställ filter",
      "recorder.documentLanguageHelp": "Välj språket för den dokumentation eller felrapport som skapas.",
      "review.expectedPlaceholder": "Beskriv vad som ska vara uppnått när arbetsflödet är klart.",
      "review.observedResult": "Observerat resultat",
      "review.observedError": "Observerat fel",
      "review.imageSelection": "Automatiskt bildval",
      "review.imageQuality.high": "Tydligt",
      "review.imageQuality.medium": "Acceptabelt",
      "review.imageQuality.low": "Kontrollera",
      "review.imageQuality.unresolved": "Ingen säker bild",
      "review.imageQuality.manual": "Manuellt valt",
      "review.imageQuality.protected": "Annotering bevarad",
      "review.imageQualityDetails": "Visa varför bilden valdes",
      "review.imageScore": "Poäng",
      "review.imageMargin": "marginal",
      "review.imageReason.clear-evidence-margin": "Bilden stöds tydligt bättre av stegets evidens än alternativen.",
      "review.imageReason.sufficient-evidence-margin": "Bilden har tillräckligt stöd och skiljer sig från alternativen.",
      "review.imageReason.fallback-selection": "Bildvalet bygger på en reservregel och bör kontrolleras.",
      "review.imageReason.consultant-selected": "Bilden har valts manuellt av konsulten.",
      "review.imageReason.annotation-preserved": "Bilden behålls för att skydda befintliga markeringar.",
      "review.imageReason.no-selected-candidate": "Ingen kandidat kunde väljas säkert.",
      "review.imageReason.equivalent-visual-evidence": "Kandidaterna är visuellt likvärdiga; stabil ordning avgjorde.",
      "review.imageReason.weak-or-close-evidence": "Evidensen är svag eller kandidaternas poäng ligger nära varandra.",
      "library.oneShown": "1 dokument visas.",
      "library.manyShown": "{count} dokument visas.",
      "library.limitedShown": "{matches} dokument matchar. De första {count} visas.",
      "library.oneSelected": "1 dokument valt",
      "library.manySelected": "{count} dokument valda",
      "document.page": "Sida {page} av {count}",
      "document.pageZoomAnnouncement": "Sida {page} av {count}, zoom {zoom} procent.",
      "document.synchronized": "Dokumentet är synkroniserat. {count} avsnitt.",
      "review.selectedRegenerated": "{count} valda steg har regenererats. Övriga steg är oförändrade.",
      "review.changeImageForStep": "Byt bild för steg {step}",
      "review.editImageForStep": "Redigera bild för steg {step}",
      "technical.missingReportId": "Felrapportens ID saknas.",
      "technical.reportNotFound": "Felrapporten kunde inte hittas.",
      "technical.requestFailed": "Begäran misslyckades.",
      "technical.reportCopied": "Rapporten har kopierats.",
      "technical.markdownExported": "Markdown har exporterats.",
      "technical.telemetrySaved": "Telemetriinställningen har sparats. Ingen hemlighet eller token lagrades.",
      "technical.telemetryConnection": "Telemetrianslutning: {status}.",
      "technical.selectPrimaryError": "Välj ett primärt fel innan telemetrin uppdateras.",
      "technical.fetchingTelemetry": "Hämtar telemetri från den konfigurerade Microsoft-slutpunkten…",
      "technical.aiSaved": "Den publika AI-brokerinställningen har sparats. Ingen leverantörsnyckel lagrades.",
      "technical.aiConsent": "Uttryckligt samtycke krävs före AI-analys.",
      "technical.sendingAi": "Skickar minimerade bevis till den konfigurerade AI-brokern…",
      "technical.issueCopied": "Ärendebeskrivningen har kopierats.",
      "technical.shareHelp": "Välj vart rapporten ska skickas. Inget skickas utan din bekräftelse.",
      "technical.packageExported": "Det lokala ärendepaketet har exporterats.",
      "technical.submissionConsent": "Granskning och uttryckligt samtycke krävs före överföring.",
      "technical.selectProvider": "Välj Azure DevOps eller GitHub före överföring.",
      "technical.openExternalIssue": "Öppna externt ärende",
      "debug.none": "Inget",
      "debug.noSession": "Ingen",
      "debug.active": "Pågår",
      "debug.inactive": "Inte aktiv",
      "debug.enabled": "Aktiv (sanerad)",
      "debug.disabled": "Avstängd",
      "debug.title": "BC Process Recorder — Teknisk diagnostik",
      "debug.help": "Här ser vi vad tillägget faktiskt gör, i stället för att tolka tystnad som ett användargränssnitt.",
      "a11y.editInstruction": "Redigera instruktion för steg {step}",
      "a11y.textFormatting": "Textformatering",
      "a11y.bold": "Fet stil",
      "a11y.italic": "Kursiv stil",
      "a11y.instruction": "Instruktion för steg {step}",
      "a11y.resetComment": "Återställ kommentar för steg {step} till ursprungstexten",
      "a11y.editComment": "Redigera kommentar för steg {step}",
      "a11y.commentFormatting": "Kommentarformatering",
      "a11y.comment": "Kommentar för steg {step}",
      "a11y.addComment": "Lägg till kommentar för steg {step}",
      "a11y.editImage": "Redigera bild {image} för steg {step}",
      "a11y.useScreenshot": "Använd skärmbild {image} för steg {step}",
      "a11y.dragStep": "Dra steg {step} för att flytta",
      "a11y.approveStep": "Godkänn steg {step}",
      "a11y.addAfter": "Lägg till steg efter steg {step}",
      "a11y.changeImage": "Byt bild för steg {step}",
      "a11y.stepActions": "Fler åtgärder för steg {step}",
      "a11y.resetInstruction": "Återställ instruktion för steg {step}",
      "a11y.hideStep": "Dölj steg {step} från dokumentet",
      "a11y.editorHelp": "Dubbelklicka eller tryck Enter för att redigera. Ctrl+Enter sparar",
      "a11y.saveEditor": "Ctrl+Enter sparar",
      "technical.aiDisclosure": "En uttrycklig analys skickar ett minimerat och maskerat tekniskt bevispaket till den Entra-skyddade broker som du har konfigurerat. Skärmbilder, råa händelser, rå diagnostik, tenant-/företags-/användar-/sessions-ID:n och rå telemetri utesluts.",
      "technical.issuePreviewHelp": "Felrapporten förblir lokal och auktoritativ. Ingenting skickas förrän du har granskat paketet och valt Skapa ärende.",
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
      ,"recorder.completionHelp": "Vill du öppna dokumentationen och börja granska den?"
      ,"recorder.cancelStopTitle": "Avbryt stopp och fortsätt spela in"
      ,"recorder.continueRecording": "Fortsätt spela in"
      ,"recorder.saveAndStop": "Spara och stoppa"
      ,"recorder.discardRecording": "Ta bort inspelningen"
      ,"recorder.openDocumentation": "Öppna dokumentationen"
      ,"recorder.notNow": "Inte nu"
      ,"recorder.injectFailed": "Edge kunde inte läsa in inspelningsskriptet i Business Central. Kontrollera tilläggets webbplatsåtkomst. {detail}"
      ,"recorder.tabUnresponsive": "Business Central-fliken svarar fortfarande inte. Uppdatera BC med Ctrl+F5 och kontrollera att webbplatsåtkomsten är tillåten."
      ,"recorder.startFailed": "Bakgrundsprocessen kunde inte starta sessionen."
      ,"recorder.stopFailed": "Kunde inte stoppa inspelningen."
      ,"recorder.deleteFailed": "Inspelningen stoppades men kunde inte tas bort."
      ,"recorder.cancelFailed": "Kunde inte avbryta inspelningen."
    }),
    "en-US": Object.freeze({
      "app.tagline": "Business Process Intelligence for Microsoft Dynamics 365 Business Central.",
      "app.promise": "Turn Business Central processes into knowledge.",
      "app.promiseDetail": "Capture. Document. Improve.",
      "settings.summary": "Documentation, export and recording settings",
      "settings.language": "Interface language",
      "settings.languageHelp": "Changes the language in BC Process Studio. Recorded content and documents are not affected.",
      "settings.documentLanguage": "Document language",
      "settings.documentLanguageHelp": "Default language for new process documents. Observed Business Central labels are not changed.",
      "review.documentLanguage": "Document language",
      "review.nextUnreviewed": "Next unreviewed",
      "review.nextUnreviewedLabel": "Next unreviewed Step. {count} remaining.",
      "review.nextUnreviewedShown": "The next unreviewed Step is shown. {count} remaining.",
      "review.lastUnreviewedShown": "The last unreviewed Step is shown.",
      "review.allStepsReviewed": "All Steps have been reviewed.",
      "review.keyboardHelp": "Select Steps with the arrow keys. Use Ctrl for multiple selection and Shift for a range. Alt plus N moves to the next unreviewed Step. Press Enter to edit. In the instruction, Enter creates a new line, Ctrl or Cmd plus Enter saves, and Escape cancels. Alt plus an arrow key moves selected Steps.",
      "process.overview": "Process overview",
      "process.overviewHelp": "Select an activity to go directly to its Step. Details are shown below the map.",
      "process.overviewError": "The process overview could not be displayed: {detail}",
      "process.exportError": "The process could not be exported: {detail}",
      "process.versionSaved": "Process version {version} was saved.",
      "process.versionSaveError": "The process version could not be saved: {detail}",
      "language.switchToEnglish": "Switch language to English",
      "language.switchToSwedish": "Switch language to Swedish",
      "language.switchToLanguage": "Switch language to {language}",
      "settings.save": "Save settings",
      "settings.saved": "Settings saved.",
      "library.searchPlaceholder": "Title, profile, tag or workflow",
      "library.documentLanguage": "Document language",
      "library.allLanguages": "All languages",
      "library.filters": "Filters",
      "library.activeFilters": "Filters, {count} active",
      "library.resetFilters": "Reset filters",
      "recorder.documentLanguageHelp": "Choose the language for the documentation or issue report being created.",
      "review.expectedPlaceholder": "Describe what should be achieved when the workflow is complete.",
      "review.observedResult": "Observed result",
      "review.observedError": "Observed error",
      "review.imageSelection": "Automatic image selection",
      "review.imageQuality.high": "Clear",
      "review.imageQuality.medium": "Acceptable",
      "review.imageQuality.low": "Review",
      "review.imageQuality.unresolved": "No safe image",
      "review.imageQuality.manual": "Manually selected",
      "review.imageQuality.protected": "Annotation preserved",
      "review.imageQualityDetails": "Show why this image was selected",
      "review.imageScore": "Score",
      "review.imageMargin": "margin",
      "review.imageReason.clear-evidence-margin": "The image has clearly stronger step evidence than the alternatives.",
      "review.imageReason.sufficient-evidence-margin": "The image has sufficient evidence and differs from the alternatives.",
      "review.imageReason.fallback-selection": "The image uses a fallback rule and should be reviewed.",
      "review.imageReason.consultant-selected": "The image was selected manually by the consultant.",
      "review.imageReason.annotation-preserved": "The image is retained to protect existing annotations.",
      "review.imageReason.no-selected-candidate": "No candidate could be selected safely.",
      "review.imageReason.equivalent-visual-evidence": "The candidates are visually equivalent; stable order decided.",
      "review.imageReason.weak-or-close-evidence": "Evidence is weak or the candidate scores are close.",
      "library.oneShown": "1 document shown.",
      "library.manyShown": "{count} documents shown.",
      "library.limitedShown": "{matches} documents match. The first {count} are shown.",
      "library.oneSelected": "1 document selected",
      "library.manySelected": "{count} documents selected",
      "document.page": "Page {page} of {count}",
      "document.pageZoomAnnouncement": "Page {page} of {count}, zoom {zoom} percent.",
      "document.synchronized": "Document synchronized. {count} sections.",
      "review.selectedRegenerated": "{count} selected Steps were regenerated. All other Steps are unchanged.",
      "review.changeImageForStep": "Change image for step {step}",
      "review.editImageForStep": "Edit image for step {step}",
      "technical.missingReportId": "Bug Report ID is missing.",
      "technical.reportNotFound": "Bug Report could not be found.",
      "technical.requestFailed": "Request failed.",
      "technical.reportCopied": "Report copied.",
      "technical.markdownExported": "Markdown exported.",
      "technical.telemetrySaved": "Telemetry configuration saved. No secret or token was stored.",
      "technical.telemetryConnection": "Telemetry connection: {status}.",
      "technical.selectPrimaryError": "Select a primary error before telemetry refresh.",
      "technical.fetchingTelemetry": "Fetching telemetry from the configured Microsoft endpoint…",
      "technical.aiSaved": "Public AI broker configuration saved. No provider key was stored.",
      "technical.aiConsent": "Explicit consent is required before AI analysis.",
      "technical.sendingAi": "Sending minimized evidence to the configured AI broker…",
      "technical.issueCopied": "Issue description copied.",
      "technical.shareHelp": "Choose where the report should go. Nothing is sent without your confirmation.",
      "technical.packageExported": "Offline Issue Package exported.",
      "technical.submissionConsent": "Review and explicit submission consent are required.",
      "technical.selectProvider": "Select Azure DevOps or GitHub before submission.",
      "technical.openExternalIssue": "Open external issue",
      "debug.none": "None",
      "debug.noSession": "None",
      "debug.active": "In progress",
      "debug.inactive": "Inactive",
      "debug.enabled": "Active (sanitized)",
      "debug.disabled": "Off",
      "debug.title": "BC Process Recorder — Technical diagnostics",
      "debug.help": "This shows what the extension is actually doing instead of interpreting silence as a user interface.",
      "a11y.editInstruction": "Edit instruction for step {step}",
      "a11y.textFormatting": "Text formatting",
      "a11y.bold": "Bold",
      "a11y.italic": "Italic",
      "a11y.instruction": "Instruction for step {step}",
      "a11y.resetComment": "Reset comment for step {step} to its original text",
      "a11y.editComment": "Edit comment for step {step}",
      "a11y.commentFormatting": "Comment formatting",
      "a11y.comment": "Comment for step {step}",
      "a11y.addComment": "Add comment to step {step}",
      "a11y.editImage": "Edit image {image} for step {step}",
      "a11y.useScreenshot": "Use screenshot {image} for step {step}",
      "a11y.dragStep": "Drag step {step} to move it",
      "a11y.approveStep": "Approve step {step}",
      "a11y.addAfter": "Add a step after step {step}",
      "a11y.changeImage": "Change image for step {step}",
      "a11y.stepActions": "More actions for step {step}",
      "a11y.resetInstruction": "Reset instruction for step {step}",
      "a11y.hideStep": "Hide step {step} from the document",
      "a11y.editorHelp": "Double-click or press Enter to edit. Ctrl+Enter saves",
      "a11y.saveEditor": "Ctrl+Enter saves",
      "technical.aiDisclosure": "Explicit analysis sends a minimized, redacted technical evidence package to your configured Entra-protected broker. Screenshots, raw events, raw diagnostics, tenant/company/user/session IDs and raw telemetry are excluded.",
      "technical.issuePreviewHelp": "The Bug Report remains local and authoritative. Nothing is submitted until you review this package and select Create Issue.",
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
      ,"recorder.completionHelp": "Open the documentation and start reviewing it?"
      ,"recorder.cancelStopTitle": "Cancel stopping and continue recording"
      ,"recorder.continueRecording": "Continue recording"
      ,"recorder.saveAndStop": "Save and stop"
      ,"recorder.discardRecording": "Delete recording"
      ,"recorder.openDocumentation": "Open documentation"
      ,"recorder.notNow": "Not now"
      ,"recorder.injectFailed": "Edge could not load the recording script in Business Central. Check the extension's site access. {detail}"
      ,"recorder.tabUnresponsive": "The Business Central tab is still not responding. Refresh BC with Ctrl+F5 and verify that site access is allowed."
      ,"recorder.startFailed": "The background process could not start the session."
      ,"recorder.stopFailed": "The recording could not be stopped."
      ,"recorder.deleteFailed": "The recording stopped but could not be deleted."
      ,"recorder.cancelFailed": "The recording could not be cancelled."
    })
  });

  const STATIC_TEXT = Object.freeze([
    ["Dokumentation", "Documentation"], ["Export", "Export"],
    ["Inspelning", "Recording"], ["Miljönamn", "Environment name"],
    ["Företag", "Company"], ["Standardtext för förväntat resultat", "Default expected-result text"],
    ["Filnamnsmall", "File name template"], ["Ta skärmbilder", "Capture screenshots"],
    ["Skärmbilder", "Screenshots"], ["Endast viktiga steg", "Important steps only"],
    ["Alla åtgärder och sidbyten", "All actions and page changes"],
    ["Inga skärmbilder", "No screenshots"], ["Korrigeringar", "Corrections"],
    ["Regenerera valda steg", "Regenerate selected Steps"],
    ["Exportera process", "Export process"],
    ["Spara version", "Save version"],
    ["Jämför versioner", "Compare versions"],
    ["Jämför processversioner", "Compare process versions"],
    ["Jämförelsen är skrivskyddad och visar endast semantiska processändringar.", "The comparison is read-only and shows semantic process changes only."],
    ["Från version", "From version"],
    ["Till version", "To version"],
    ["Aktuellt", "Current"],
    ["Baslinje", "Baseline"],
    ["Välj två olika processversioner.", "Select two different process versions."],
    ["Processen är identisk med den senaste sparade versionen.", "The process is identical to the latest saved version."],
    ["Exportera diagram", "Export diagram"],
    ["Processdiagrammet har exporterats.", "The process diagram was exported."],
    ["Processen har exporterats.", "The process was exported."],
    ["Ny standardtext", "New default text"],
    ["Ny standardtext bakom redigering", "New default text behind edit"],
    ["Förhandsgranska valda steg", "Preview selected Steps"],
    ["Godkänn valda steg", "Approve selected Steps"],
    ["Endast de valda stegen uppdateras. Alla andra steg lämnas oförändrade.", "Only the selected Steps will be updated. All other Steps remain unchanged."],
    ["Urvalet innehåller steg som har slagits samman, delats eller tagits bort. Använd full regenerering för att granska strukturändringen säkert.", "The selection contains Steps that were merged, split, or removed. Use full regeneration to review the structural change safely."],
    ["En vald skärmbild har markeringar och skulle bytas. Byt bilden manuellt eller använd full regenerering så att markeringarna inte tappas bort.", "A selected screenshot has annotations and would be replaced. Change the image manually or use full regeneration so the annotations are not lost."],
    ["Ett valt steg är godkänt. Ta bort godkännandet innan steget regenereras.", "A selected Step is approved. Remove the approval before regenerating the Step."],
    ["De valda stegen kan inte mappas exakt till den nya tolkningen. Ingen dokumentation har ändrats.", "The selected Steps cannot be mapped exactly to the new interpretation. No documentation was changed."],
    ["Endast lokala kategorier och antal sparas; inget innehåll delas.", "Only local categories and counts are stored; no content is shared."],
    ["Maximalt antal händelser", "Maximum events"],
    ["Hitta tidigare dokumentation med hjälp av innehåll och dokumentinformation.",
      "Find previous documentation using content and document information."],
    ["Sök dokument", "Search documents"], ["Dokumentprofil", "Document profile"],
    ["Alla profiler", "All profiles"], ["Sortera", "Sort"],
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
    ["Teknisk information", "Technical information"],
    ["Godkänt", "Approved"], ["Behöver granskas", "Needs review"],
    ["Ej granskat", "Not reviewed"],
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
    ["Flytta upp", "Move up"],
    ["Flytta ned", "Move down"], ["Regenerera från inspelning", "Regenerate from recording"],
    ["Komprimera alla", "Collapse all"], ["Lägg till steg", "Add step"],
    ["Slutför granskning", "Complete review"], ["Steg", "Steps"],
    ["Valda", "Selected"], ["Uppskattade sidor", "Estimated pages"],
    ["Dokumentinformation", "Document information"], ["Förväntat resultat", "Expected result"],
    ["Processanalys", "Process analysis"],
    ["Affärsprocess", "Business process"], ["BC-process", "BC process"],
    ["Användarprocedur", "User procedure"], ["Observerat", "Observed"],
    ["Referensförslag", "Reference suggestion"], ["Kundunikt", "Customer-specific"],
    ["Processkartans detaljnivå", "Process map detail level"],
    ["Förklaring", "Legend"],
    ["Jämför den inspelade processen med verifierade Business Central-referenser.",
      "Compare the recorded process with verified Business Central references."],
    ["Analyserar processen…", "Analysing the process…"],
    ["Använd vald process", "Use selected process"],
    ["Använd val", "Apply selection"],
    ["Processvalet sparades.", "Process selection saved."],
    ["Redigera vald nod", "Edit selected node"],
    ["Redigera processnod", "Edit process node"],
    ["Redigera kopplingar", "Edit connections"],
    ["Redigera koppling", "Edit connection"],
    ["Koppling", "Connection"],
    ["Till nod", "To node"],
    ["Etikett (valfri)", "Label (optional)"],
    ["Ny koppling", "New connection"],
    ["Skapar dokument", "Creates document"],
    ["Bokför som", "Posts as"],
    ["Flytta bakåt", "Move earlier"],
    ["Flytta framåt", "Move later"],
    ["Bekräfta klassificering", "Confirm classification"],
    ["Klassificeringen bekräftades.", "The classification was confirmed."],
    ["Referensprocessen ändrades.", "The reference process was changed."],
    ["Processanalysen kunde inte visas", "The process analysis could not be displayed"],
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
    ["Granskningen ändrades efter förhandsgranskningen. Öppna en ny förhandsgranskning och kontrollera ändringarna igen.",
      "The Review changed after the preview. Open a new preview and check the changes again."],
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
    ,["Teknisk diagnostik", "Technical diagnostics"]
    ,["Här ser vi vad tillägget faktiskt gör, i stället för att tolka tystnad som ett användargränssnitt.",
      "This shows what the extension is actually doing instead of interpreting silence as a user interface."]
    ,["Uppdatera", "Refresh"], ["Aktivera fångstdiagnostik", "Enable capture diagnostics"]
    ,["Stäng av fångstdiagnostik", "Disable capture diagnostics"]
    ,["Rå diagnostik", "Raw diagnostics"], ["Teknisk felrapport", "Technical Bug Report"]
    ,["Kopiera hela rapporten", "Copy full report"], ["Exportera Markdown", "Export Markdown"]
    ,["Skapa ärende", "Create Issue"], ["Inkludera AI-analys i kopiering/export", "Include AI analysis in copy/export"]
    ,["Dela rapport", "Share report"], ["Dela felrapport", "Share bug report"]
    ,["Välj vart rapporten ska skickas. Inget skickas utan din bekräftelse.", "Choose where the report should go. Nothing is sent without your confirmation."]
    ,["Innehåll och inställningar", "Content and settings"]
    ,["Granska rapportens innehåll", "Review report content"]
    ,["Hämta rapportpaket", "Download report package"]
    ,["Application Insights (valfritt)", "Application Insights (optional)"]
    ,["AI-teknisk analys (valfritt)", "AI technical analysis (optional)"]
    ,["Spara telemetriinställning", "Save telemetry configuration"]
    ,["Testa telemetrianslutning", "Test telemetry connection"]
    ,["Uppdatera telemetri för valt fel", "Refresh telemetry for selected error"]
    ,["Spara publik brokerinställning", "Save public broker configuration"]
    ,["Analysera tekniska bevis", "Analyze technical evidence"]
    ,["Ta bort AI-analys", "Remove AI analysis"]
    ,["Förhandsgranska ärendepaket", "Issue Package Preview"]
    ,["Mål", "Destination"], ["Endast lokalt paket", "Offline package only"]
    ,["Azure DevOps-inställning", "Azure DevOps configuration"]
    ,["GitHub-inställning", "GitHub configuration"]
    ,["Aktiverad", "Enabled"], ["Organisation", "Organization"]
    ,["Projekt", "Project"], ["Ärendetyp", "Work item type"]
    ,["Områdessökväg", "Area path"], ["Iterationssökväg", "Iteration path"]
    ,["Spara publik målkonfiguration", "Save public destination configuration"]
    ,["Generera förhandsgranskning", "Generate preview"]
    ,["Överföringssammanfattning", "Transmission summary"]
    ,["Titel", "Title"], ["Beskrivning", "Description"], ["Bilagor", "Attachments"]
    ,["Kopiera ärendebeskrivning", "Copy Issue Description"]
    ,["Exportera lokalt ärendepaket", "Export Offline Issue Package"]
    ,["Redigerbara rapportfält", "Editable report fields"]
    ,["Beskriv felet", "Describe the problem"]
    ,["Vad hände?", "What happened?"]
    ,["Vad förväntade du dig?", "What did you expect?"]
    ,["Vad hände i stället?", "What happened instead?"]
    ,["Något mer som hände? (valfritt)", "Anything else that happened? (optional)"]
    ,["Felet uppstod här", "Error occurred here"]
    ,["Mer rapportinformation", "More report information"]
    ,["Fler alternativ", "More options"]
    ,["Sammanfattning", "Summary"], ["Allvarlighetsgrad", "Severity"]
    ,["Kategori", "Category"], ["Förväntat resultat", "Expected Result"]
    ,["Faktiskt resultat", "Actual Result"], ["Anteckningar", "Notes"]
    ,["Tekniska detaljer", "Technical details"], ["Fullständighet", "Completeness"]
    ,["Kopiera", "Copy"], ["Primärt fel", "Primary error"]
    ,["Välj som primärt fel", "Select as primary error"]
    ,["Rå AL-anropsstack", "Raw AL call stack"]
    ,["Otolkade delar av anropsstacken", "Unparsed call-stack segments"]
    ,["Rå Business Central-diagnostik", "Raw Business Central diagnostics"]
    ,["Fångat Business Central-fel", "Captured Business Central error"]
    ,["Kopiera Business Central-fel", "Copy Business Central error"]
    ,["Reproduktionsbevis", "Reproduction evidence"]
    ,["Felbild", "Error screenshot"], ["Reproduktionsbild", "Reproduction screenshot"]
    ,["Anslutning till BC", "BC connection"], ["Aktiv session", "Active session"]
    ,["Händelser", "Events"], ["Eventtyper", "Event types"]
    ,["Kategorier", "Categories"], ["Senaste event", "Latest event"]
    ,["Senaste BC-ping", "Latest BC ping"], ["Senaste ram-URL", "Latest frame URL"]
    ,["Ramar med content script", "Frames with content script"]
    ,["Ramar enligt webbläsaren", "Browser frames"]
    ,["Aktiva content-ramar", "Active content frames"]
    ,["Fångstdiagnostik", "Capture diagnostics"], ["Fångststeg", "Capture stages"]
    ,["Senaste fångstdiagnostik", "Latest capture diagnostic"]
    ,["Skärmbilder begärda", "Screenshots requested"]
    ,["Skärmbilder tagna", "Screenshots captured"]
    ,["Bildförfrågningar sammanslagna", "Screenshot requests reused"]
    ,["Bildförfrågningar borttagna", "Screenshot requests dropped"]
    ,["Skärmbildskö", "Screenshot queue"], ["Senaste skärmbild", "Latest screenshot"]
    ,["Senaste fel", "Latest error"], ["Skärmbildsfel", "Screenshot error"]
    ,["Senast uppdaterad", "Last updated"], ["Inte bekräftad", "Not confirmed"]
    ,["Ångra", "Undo"], ["Gör om", "Redo"], ["Stäng", "Close"]
    ,["Tenant-ID", "Tenant ID"], ["Publikt klient-ID", "Public client ID"]
    ,["Application Insights App-ID", "Application Insights App ID"]
    ,["Förväntad miljö", "Expected environment"]
    ,["Aktivera valfri berikning", "Enable optional enrichment"]
    ,["Fönster (minuter)", "Window (minutes)"]
    ,["Broker OAuth-scope", "Broker OAuth scope"]
    ,["HTTPS-adress till broker", "HTTPS broker URL"]
    ,["Leverantörsmodell", "Provider model"]
    ,["Organisationens policy aktiverar AI-analys", "Organization policy enables AI analysis"]
    ,["Inkludera filtrerade telemetrihändelser", "Include filtered telemetry events"]
    ,["Inkludera maskerade telemetrimeddelanden", "Include redacted telemetry messages"]
    ,["Inkludera maskerade användaranteckningar", "Include redacted human notes"]
    ,["Jag förstår att valda bevis lämnar det här tillägget", "I understand that the selected evidence will leave this extension"]
    ,["Inkludera telemetrisammanfattning", "Include telemetry summary"]
    ,["Inkludera aktuell AI-stödd analys", "Include current AI-assisted analysis"]
    ,["Databas (ägare/namn)", "Repository (owner/name)"]
    ,["Etiketter, kommaseparerade", "Labels, comma separated"]
    ,["Taggar, kommaseparerade", "Tags, comma separated"]
    ,["GitHub App-brokeradress", "GitHub App broker URL"]
    ,["Broker Entra tenant-ID", "Broker Entra tenant ID"]
    ,["Publikt klient-ID för broker", "Broker public client ID"]
    ,["Testa Azure DevOps-anslutning", "Test Azure DevOps connection"]
    ,["Testa GitHub-anslutning", "Test GitHub connection"]
    ,["Jag har granskat mål, beskrivning, bilagor, telemetri-/AI-val och varningen om känsliga data", "I reviewed the destination, description, attachments, telemetry/AI choices, and sensitive-data warning"]
    ,["Skapa ett nytt ärende även om rapporten redan har en extern referens", "Create another issue even if this report already has an external reference"]
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
    return languageRegistry.normalize(value, "ui");
  }

  function populateLanguageSelects(target = root.document) {
    if (!target?.querySelectorAll) return;
    target.querySelectorAll("[data-language-select]").forEach(select => {
      const current = select.value || select.dataset.selectedLanguage ||
        DEFAULT_LOCALE;
      const capability = select.dataset.languageSelect || "document";
      const allLabel = select.dataset.languageAllLabel;
      select.replaceChildren();
      if (allLabel) {
        const option = target.createElement("option");
        option.value = "";
        option.textContent = translate(allLabel, normalizeLocale(
          target.documentElement?.lang));
        select.appendChild(option);
      }
      languageRegistry.supported(capability).forEach(language => {
        const option = target.createElement("option");
        option.value = language.locale;
        option.textContent = language.nativeName;
        select.appendChild(option);
      });
      select.value = current && [...select.options].some(option =>
        option.value === current) ? current : allLabel ? "" :
        languageRegistry.normalize(current, capability);
    });
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
    populateLanguageSelects(target);
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
    populateLanguageSelects,
    apply,
    observe
  });
})(globalThis);
