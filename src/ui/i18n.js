(function initUiI18n(root) {
  "use strict";

  const languageRegistry = root.T9LanguageRegistry;
  const DEFAULT_LOCALE = languageRegistry.DEFAULT_UI_LANGUAGE;
  const SUPPORTED_LOCALES = Object.freeze(languageRegistry.supported("ui")
    .map(language => language.locale));
  const messages = Object.freeze({
    "sv-SE": Object.freeze({
      "settings.clickHighlights": "Visa klickmarkeringar under inspelning",
      "settings.clickHighlightsHelp": "Ramar kort in kontrollen du klickar på. Markeringarna tas inte med i sparade skärmbilder.",
      "settings.knowledgeMcpLegend": "Externa kunskapsförslag",
      "settings.knowledgeMcpEnable": "Tillåt skrivskyddade MCP-uppslag",
      "settings.knowledgeMcpHelp": "Av som standard. När funktionen är på kan endast olösta objekt- och åtgärds-ID:n, appidentitet och version, synliga sid- och kontrolltexter samt gränssnittsspråket skickas till den lokala skrivskyddade kunskapstjänsten. Inspelningar, skärmbilder, inmatade värden samt tenant-, miljö- och företagsuppgifter skickas inte. Resultaten är overifierade förslag som måste granskas.",
      "settings.knowledgeMcpTest": "Testa lokal anslutning",
      "settings.knowledgeMcpChecking": "Kontrollerar den lokala kunskapstjänsten …",
      "settings.knowledgeMcpConnected": "Anslutningen fungerar. {count} skrivskyddade verktyg hittades.",
      "settings.knowledgeMcpUnavailable": "Kunde inte ansluta. Kontrollera att den lokala MCP-värden är installerad och registrerad.",
      "settings.knowledgeMcpFailureDetail": "Tekniskt fel: {detail}",
      "settings.knowledgeMcpConsentRequired": "Aktivera och spara kunskapsuppslag innan du testar anslutningen.",
      "settings.knowledgeMcpSampleLookup": "Testa exempelsökning (skickar endast BC-sida 22: Kundlista)",
      "settings.knowledgeMcpSampleChecking": "Söker efter exempelsida …",
      "settings.knowledgeMcpSampleFound": "MCP-uppslaget gav {count} overifierat förslag för BC-sida {objectId}. Källa: {source}. Konfidens: {confidence} %. Förslaget måste granskas.",
      "settings.knowledgeMcpSampleUnresolved": "MCP-uppslaget slutfördes men hittade inget förslag för BC-sida {objectId}.",
      "settings.knowledgeMcpSampleConsentRequired": "Aktivera och spara kunskapsuppslag innan du kör exempelsökningen.",
      "settings.languages": "Språkinställningar",
      "settings.autoSave": "Ändringar sparas automatiskt.",
      "settings.done": "Klar",
      "review.exportWorking": "Skapar Word…",
      "review.exportDownloaded": "Word-filen har skickats till webbläsarens nedladdningar.",
      "review.exportFailed": "Word-exporten misslyckades:",
      "review.exportUnsaved": "Word-filen skapades, men ändringarna kunde inte sparas:",
      "review.checkNext": "Kontrollera nästa steg",
      "review.exportEmpty": "Dokumentet har inga steg att exportera.",
      "review.profilePurpose": "Vad ska dokumentet användas till?",
      "review.profile.business-process": "Beskriva och överlämna en process",
      "review.profile.sop": "Dokumentera en arbetsrutin (SOP)",
      "review.profile.training-guide": "Utbilda en användare",
      "review.profile.quick-reference": "Ge en snabb referens",
      "review.profile.troubleshooting-guide": "Beskriva felsökning",
      "review.profileHelp.business-process": "Balanserad processdokumentation. Kvalitetsstödet fokuserar på arbetsgång, bilder och dokumentinformation.",
      "review.profileHelp.sop": "Precist språk och Corporate-tema. Kvalitetsstödet lyfter versionsinformation och granskare.",
      "review.profileHelp.training-guide": "Utbildningsprofil med fokus på bildstöd och tillgänglighet. Lägg själv till förklaringar som saknas i inspelningen.",
      "review.profileHelp.quick-reference": "Kortfattad språkprofil och Minimal-tema. Kvalitetsstödet kräver inte en bild för varje steg. Steg raderas inte automatiskt.",
      "review.profileHelp.troubleshooting-guide": "Diagnostisk språkprofil och Corporate-tema. Kvalitetsstödet fokuserar på arbetsgång, bilder och revisionsinformation.",
      "review.profileSaved": "Dokumenttypen är sparad. Dokumentvyn och Word använder samma val.",
      "review.profileSaving": "Sparar dokumenttyp…",
      "review.imageNumber": "Bild {number}",
      "review.previewImageNumber": "Förhandsvisa bild {number}",
      "review.previewImage": "Förhandsvisa",
      "review.noImages": "Inga skärmbilder finns i inspelningen.",
      "review.imageRole.current": "Aktuell bild",
      "review.imageRole.captured": "Ny kompletterande bild",
      "review.imageRole.related": "Från detta steg",
      "review.imageRole.other": "Övrig bild i inspelningen",
      "review.previewImageHelp": "Kontrollera att rätt fält eller åtgärd syns och att texten går att läsa. 100 % visar bildens pixlar i webbläsaren, inte dess storlek i Word. Förhandsvisningen ändrar inte vald bild.",
      "review.imageActualSize": "Visa i 100 %",
      "review.closeImagePreview": "Tillbaka till bildval",
      "review.readiness": "{total} steg · {remaining} återstår att godkänna",
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
      "license.pageTitle": "Licensinformation",
      "license.header": "Tenantlicens",
      "license.knownTenant": "Känd Business Central-tenant",
      "license.tenant": "Tenant",
      "license.status": "Status",
      "license.type": "Licenstyp",
      "license.validUntil": "Giltig till",
      "license.tenantId": "Tenant-ID",
      "license.lastChecked": "Senast kontrollerad",
      "license.checking": "Kontrollerar…",
      "license.refresh": "Kontrollera aktuell BC-flik igen",
      "license.consultant": "Microsoft-konto och konsultlicens",
      "license.adminRoleHelp": "Applikationsadministratörer använder Microsoft-inloggningen för att öppna lokala kunskapsförslag. Licenstjänsten kontrollerar rollen License.Administrator. Förslag och granskningsdata skickas inte.",
      "license.signIn": "Logga in med Microsoft",
      "license.signOut": "Logga ut",
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
      "technical.closeSharing": "Stäng delning av felrapport",
      "technical.destination": "Mål",
      "technical.offlineOnly": "endast lokalt paket",
      "technical.telemetry": "Telemetri",
      "technical.aiAnalysis": "AI-analys",
      "technical.callStack": "AL-anropsstack",
      "technical.callStackUnavailable": "ingen anropsstack fångades i BC-felet",
      "technical.technicalDetails": "Tekniska detaljer",
      "technical.attachments": "Bilagor",
      "technical.included": "inkluderat",
      "technical.includedLabelled": "inkluderat och märkt",
      "technical.excluded": "utelämnat",
      "technical.sensitiveCategories": "Kategorier som kan vara känsliga",
      "debug.none": "Inget",
      "debug.noSession": "Ingen",
      "debug.active": "Pågår",
      "debug.inactive": "Inte aktiv",
      "debug.enabled": "Aktiv (sanerad)",
      "debug.disabled": "Avstängd",
      "debug.title": "BC Process Recorder — Teknisk diagnostik",
      "debug.help": "Här ser vi vad tillägget faktiskt gör, i stället för att tolka tystnad som ett användargränssnitt.",
      "debug.improvementTitle": "Processförbättring",
      "debug.reviewsAnalysed": "Analyserade granskningar",
      "debug.corrections": "Korrigeringar",
      "debug.engineCorrections": "Motorrelaterade korrigeringar",
      "debug.prioritizedRules": "Prioriterade regler",
      "debug.downloadImprovement": "Ladda ned förbättringsdata",
      "debug.improvementDownloaded": "Förbättringsdata har skickats till webbläsarens nedladdningar.",
      "debug.exportFailed": "Förbättringsdata kunde inte exporteras.",
      "Knowledge administration": "Kunskapsadministration",
      "Knowledge administration is restricted to application administrators.": "Kunskapsadministrationen är bara tillgänglig för applikationsadministratörer.",
      "Review knowledge suggestions": "Granska kunskapsförslag",
      "Draft storage has an unsupported version. No data was changed.": "Utkastlagringen har en version som inte stöds. Inga data ändrades.",
      "Knowledge rule suggestions": "Förslag på kunskapsregler",
      "Target knowledge pack": "Målpaket för kunskapsregeln",
      "Choose a pack": "Välj ett paket",
      "Validation: passed": "Valideringen godkändes",
      "Validation: warnings": "Valideringen visar varningar",
      "Validation: blocked": "Valideringen stoppade utkastet",
      "Validation unavailable": "Validering är inte tillgänglig",
      "Save pack and validate": "Spara paketval och validera",
      "No active knowledge packs are available.": "Inga aktiva kunskapspaket är tillgängliga.",
      "Draft validated; active knowledge is unchanged.": "Utkastet validerades. Den aktiva kunskapen är oförändrad.",
      "Draft validation found issues; active knowledge is unchanged.": "Utkastvalideringen hittade problem. Den aktiva kunskapen är oförändrad.",
      "Could not validate the draft.": "Det gick inte att validera utkastet.",
      "Draft and validation details": "Utkasts- och valideringsdetaljer",
      "Draft created and validated. Active knowledge is unchanged.": "Utkastet skapades och validerades. Den aktiva kunskapen är oförändrad.",
      "Draft created with validation issues. Active knowledge is unchanged.": "Utkastet skapades med valideringsproblem. Den aktiva kunskapen är oförändrad.",
      "Saved knowledge drafts": "Sparade kunskapsutkast",
      "Download drafts as JSON": "Ladda ned utkast som JSON",
      "No drafts have been created.": "Inga utkast har skapats.",
      "{count} inactive drafts are stored on this device.": "{count} inaktiva utkast finns sparade på den här enheten.",
      "Draft package downloaded.": "Utkastpaketet har laddats ned.",
      "Could not download draft package.": "Det gick inte att ladda ned utkastpaketet.",
      "Knowledge suggestions remain local and never change active rules. Review-ready proposals can be saved as drafts.": "Förslagen stannar lokalt och ändrar aldrig aktiva regler. Förslag som är redo att granskas kan sparas som utkast.",
      "No review-ready knowledge suggestions.": "Inga kunskapsförslag är redo att granskas.",
      "Create draft": "Skapa utkast",
      "Draft already created": "Utkastet har redan skapats",
      "Draft created. Active knowledge is unchanged.": "Utkastet skapades. Den aktiva kunskapen är oförändrad.",
      "Could not create draft.": "Det gick inte att skapa utkastet.",
      "Match details": "Matchningsdetaljer",
      "Knowledge feedback: {ready} ready, {conflicts} conflicting, {pending} need more feedback.": "Kunskapsfeedback: {ready} redo att granskas, {conflicts} motstridiga, {pending} behöver mer feedback.",
      "Conflicting feedback — no draft was created.": "Motstridig feedback – inget utkast skapades.",
      "debug.rawDiagnostics": "Rå diagnostik",
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
      "Technical diagnostics are not enabled by browser policy.": "Teknisk diagnostik är inte aktiverad av webbläsarens policy.",
      "Saved recordings could not be loaded. Reload the page and try again.": "De sparade inspelningarna kunde inte läsas in. Läs in sidan igen och försök på nytt.",
      "Saved recordings": "Sparade inspelningar",
      "Manage saved recordings and ZIP exports.": "Hantera sparade inspelningar och ZIP-exporter."
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
      ,"recorder.cancelFailed": "Kunde inte avbryta inspelningen.",
      "review.externalKnowledgeTitle": "Externa kunskapsförslag — overifierade, granska före användning.",
      "review.externalKnowledgeObject": "Föreslaget BC-objekt",
      "review.externalKnowledgeAction": "Föreslagen åtgärd",
      "review.externalKnowledgeMeta": "Steg {step} · {confidence} % konfidens · Källa {source}",
      "review.externalKnowledgeNoUnresolved": "Inga lokalt olösta objekt eller åtgärder hittades. Inget MCP-uppslag skickades.",
      "review.externalKnowledgeNoSuggestions": "Inga förslag hittades i MCP för {count} uppslag.",
      "review.externalKnowledgeUnavailable": "Den lokala MCP-tjänsten kunde inte nås. Kontrollera anslutningen i inställningarna.",

    }),
    "en-US": Object.freeze({
      "settings.clickHighlights": "Show click highlights while recording",
      "settings.clickHighlightsHelp": "Briefly outlines the clicked control. Highlights are excluded from captured screenshots.",
      "settings.knowledgeMcpLegend": "External knowledge suggestions",
      "settings.knowledgeMcpEnable": "Allow read-only MCP knowledge lookups",
      "settings.knowledgeMcpHelp": "Off by default. When enabled, only unresolved object and action IDs, app identity and version, visible page and control captions, and the interface language may be sent to the local read-only knowledge service. Recordings, screenshots, entered values, and tenant, environment or company details are not sent. Results are unverified suggestions that require review.",
      "settings.knowledgeMcpTest": "Test local connection",
      "settings.knowledgeMcpChecking": "Checking the local knowledge service …",
      "settings.knowledgeMcpConnected": "Connection works. {count} read-only tools found.",
      "settings.knowledgeMcpUnavailable": "Could not connect. Check that the local MCP host is installed and registered.",
      "settings.knowledgeMcpFailureDetail": "Technical detail: {detail}",
      "settings.knowledgeMcpConsentRequired": "Enable and save knowledge lookups before testing the connection.",
      "settings.knowledgeMcpSampleLookup": "Test sample lookup (sends BC page 22 only: Customer List)",
      "settings.knowledgeMcpSampleChecking": "Looking up sample page …",
      "settings.knowledgeMcpSampleFound": "MCP lookup returned {count} unverified suggestion(s) for BC page {objectId}. Source: {source}. Confidence: {confidence}%. Review before use.",
      "settings.knowledgeMcpSampleUnresolved": "MCP lookup completed but found no suggestion for BC page {objectId}.",
      "settings.knowledgeMcpSampleConsentRequired": "Enable and save knowledge lookups before running the sample lookup.",
      "settings.languages": "Language settings",
      "settings.autoSave": "Changes are saved automatically.",
      "settings.done": "Done",
      "review.exportWorking": "Creating Word…",
      "review.exportDownloaded": "The Word file has been sent to the browser downloads.",
      "review.exportFailed": "Word export failed:",
      "review.exportUnsaved": "The Word file was created, but changes could not be saved:",
      "review.checkNext": "Check next step",
      "review.exportEmpty": "The document has no steps to export.",
      "review.profilePurpose": "What is this document for?",
      "review.profile.business-process": "Describe and hand over a process",
      "review.profile.sop": "Document an operating procedure (SOP)",
      "review.profile.training-guide": "Train a user",
      "review.profile.quick-reference": "Provide a quick reference",
      "review.profile.troubleshooting-guide": "Describe troubleshooting",
      "review.profileHelp.business-process": "Balanced process documentation. Quality guidance focuses on workflow, screenshots and document information.",
      "review.profileHelp.sop": "Precise wording and the Corporate theme. Quality guidance highlights version information and reviewers.",
      "review.profileHelp.training-guide": "Training profile focused on visual support and accessibility. Add explanations that are missing from the recording.",
      "review.profileHelp.quick-reference": "Concise language profile and the Minimal theme. Quality guidance does not require an image for every step. Steps are not deleted automatically.",
      "review.profileHelp.troubleshooting-guide": "Diagnostic language profile and the Corporate theme. Quality guidance focuses on workflow, screenshots and revision information.",
      "review.profileSaved": "Document type saved. The document view and Word use the same choice.",
      "review.profileSaving": "Saving document type…",
      "review.imageNumber": "Image {number}",
      "review.previewImageNumber": "Preview image {number}",
      "review.previewImage": "Preview",
      "review.noImages": "No screenshots are available in this recording.",
      "review.imageRole.current": "Current image",
      "review.imageRole.captured": "New supplementary image",
      "review.imageRole.related": "From this step",
      "review.imageRole.other": "Other recording image",
      "review.previewImageHelp": "Check that the relevant field or action is visible and the text is readable. 100% shows image pixels in the browser, not its size in Word. Previewing does not change the selected image.",
      "review.imageActualSize": "Show at 100%",
      "review.closeImagePreview": "Back to image selection",
      "review.readiness": "{total} steps · {remaining} awaiting approval",
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
      "license.pageTitle": "License information",
      "license.header": "Tenant license",
      "license.knownTenant": "Known Business Central tenant",
      "license.tenant": "Tenant",
      "license.status": "Status",
      "license.type": "License type",
      "license.validUntil": "Valid until",
      "license.tenantId": "Tenant ID",
      "license.lastChecked": "Last checked",
      "license.checking": "Checking…",
      "license.refresh": "Check the current BC tab again",
      "license.consultant": "Microsoft account and consultant license",
      "license.adminRoleHelp": "Application administrators use Microsoft sign-in to open local knowledge suggestions. The licensing service checks the License.Administrator role. Suggestions and review data are not sent.",
      "license.signIn": "Sign in with Microsoft",
      "license.signOut": "Sign out",
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
      "technical.closeSharing": "Close report sharing",
      "technical.destination": "Destination",
      "technical.offlineOnly": "offline only",
      "technical.telemetry": "Telemetry",
      "technical.aiAnalysis": "AI analysis",
      "technical.callStack": "AL call stack",
      "technical.callStackUnavailable": "no call stack was captured with the BC error",
      "technical.technicalDetails": "Technical details",
      "technical.attachments": "Attachments",
      "technical.included": "included",
      "technical.includedLabelled": "included and labelled",
      "technical.excluded": "excluded",
      "technical.sensitiveCategories": "Potentially sensitive categories",
      "debug.none": "None",
      "debug.noSession": "None",
      "debug.active": "In progress",
      "debug.inactive": "Inactive",
      "debug.enabled": "Active (sanitized)",
      "debug.disabled": "Off",
      "debug.title": "BC Process Recorder — Technical diagnostics",
      "debug.help": "This shows what the extension is actually doing instead of interpreting silence as a user interface.",
      "debug.improvementTitle": "Process improvement",
      "debug.reviewsAnalysed": "Reviews analysed",
      "debug.corrections": "Corrections",
      "debug.engineCorrections": "Engine-related corrections",
      "debug.prioritizedRules": "Prioritized rules",
      "debug.downloadImprovement": "Download improvement data",
      "debug.improvementDownloaded": "Improvement data was sent to the browser downloads.",
      "debug.exportFailed": "Improvement data could not be exported.",
      "Knowledge administration": "Knowledge administration",
      "Knowledge administration is restricted to application administrators.": "Knowledge administration is restricted to application administrators.",
      "Review knowledge suggestions": "Review knowledge suggestions",
      "Draft storage has an unsupported version. No data was changed.": "Draft storage has an unsupported version. No data was changed.",
      "Knowledge rule suggestions": "Knowledge rule suggestions",
      "Target knowledge pack": "Target knowledge pack",
      "Choose a pack": "Choose a pack",
      "Validation: passed": "Validation passed",
      "Validation: warnings": "Validation warnings",
      "Validation: blocked": "Validation blocked this draft",
      "Validation unavailable": "Validation is unavailable",
      "Save pack and validate": "Save pack and validate",
      "No active knowledge packs are available.": "No active knowledge packs are available.",
      "Draft validated; active knowledge is unchanged.": "Draft validated; active knowledge is unchanged.",
      "Draft validation found issues; active knowledge is unchanged.": "Draft validation found issues; active knowledge is unchanged.",
      "Could not validate the draft.": "Could not validate the draft.",
      "Draft and validation details": "Draft and validation details",
      "Draft created and validated. Active knowledge is unchanged.": "Draft created and validated. Active knowledge is unchanged.",
      "Draft created with validation issues. Active knowledge is unchanged.": "Draft created with validation issues. Active knowledge is unchanged.",
      "Saved knowledge drafts": "Saved knowledge drafts",
      "Download drafts as JSON": "Download drafts as JSON",
      "No drafts have been created.": "No drafts have been created.",
      "{count} inactive drafts are stored on this device.": "{count} inactive drafts are stored on this device.",
      "Draft package downloaded.": "Draft package downloaded.",
      "Could not download draft package.": "Could not download draft package.",
      "Knowledge suggestions remain local and never change active rules. Review-ready proposals can be saved as drafts.": "Suggestions stay local and never change active rules. Review-ready proposals can be saved as drafts.",
      "No review-ready knowledge suggestions.": "No knowledge suggestions are ready for review.",
      "Create draft": "Create draft",
      "Draft already created": "Draft already created",
      "Draft created. Active knowledge is unchanged.": "Draft created. Active knowledge is unchanged.",
      "Could not create draft.": "Could not create the draft.",
      "Match details": "Match details",
      "Knowledge feedback: {ready} ready, {conflicts} conflicting, {pending} need more feedback.": "Knowledge feedback: {ready} ready, {conflicts} conflicting, {pending} need more feedback.",
      "Conflicting feedback — no draft was created.": "Conflicting feedback — no draft was created.",
      "debug.rawDiagnostics": "Raw diagnostics",
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
      "Technical diagnostics are not enabled by browser policy.": "Technical diagnostics are not enabled by browser policy.",
      "Saved recordings could not be loaded. Reload the page and try again.": "Saved recordings could not be loaded. Reload the page and try again.",
      "Saved recordings": "Saved recordings",
      "Manage saved recordings and ZIP exports.": "Manage saved recordings and ZIP exports."
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
      ,"recorder.cancelFailed": "The recording could not be cancelled.",
      "review.externalKnowledgeTitle": "External knowledge suggestions — unverified; review before use.",
      "review.externalKnowledgeObject": "Suggested BC object",
      "review.externalKnowledgeAction": "Suggested action",
      "review.externalKnowledgeMeta": "Step {step} · {confidence}% confidence · Source {source}",
      "review.externalKnowledgeNoUnresolved": "No locally unresolved objects or actions were found. No MCP lookup was sent.",
      "review.externalKnowledgeNoSuggestions": "MCP returned no suggestions for {count} lookups.",
      "review.externalKnowledgeUnavailable": "The local MCP service could not be reached. Check the connection in settings.",

    }),
"fr-FR": Object.freeze({
      "settings.knowledgeMcpLegend": "Suggestions de connaissances externes",
      "settings.knowledgeMcpEnable": "Autoriser les recherches MCP en lecture seule",
      "settings.knowledgeMcpHelp": "Désactivé par défaut. Une fois activé, seuls les identifiants d’objet et d’action non résolus, l’identité et la version de l’application, les libellés visibles des pages et commandes, ainsi que la langue de l’interface peuvent être envoyés au service local de connaissances en lecture seule. Les enregistrements, captures d’écran, valeurs saisies et données de locataire, d’environnement ou d’entreprise ne sont pas envoyés. Les résultats sont des suggestions non vérifiées à examiner.",
      "settings.knowledgeMcpTest": "Tester la connexion locale",
      "settings.knowledgeMcpChecking": "Vérification du service local de connaissances…",
      "settings.knowledgeMcpConnected": "Connexion établie. {count} outils en lecture seule trouvés.",
      "settings.knowledgeMcpUnavailable": "Connexion impossible. Vérifiez que l’hôte MCP local est installé et enregistré.",
      "settings.knowledgeMcpFailureDetail": "Détail technique : {detail}",
      "settings.knowledgeMcpConsentRequired": "Activez et enregistrez les recherches de connaissances avant de tester la connexion.",
      "settings.knowledgeMcpSampleLookup": "Test recherche (page BC 22 uniquement : liste des clients)",
      "settings.knowledgeMcpSampleChecking": "Recherche de la page d’exemple…",
      "settings.knowledgeMcpSampleFound": "La recherche MCP a renvoyé {count} suggestion(s) non vérifiée(s) pour la page BC {objectId}. Source : {source}. Confiance : {confidence} %. À vérifier avant utilisation.",
      "settings.knowledgeMcpSampleUnresolved": "La recherche MCP est terminée, mais aucune suggestion n’a été trouvée pour la page BC {objectId}.",
      "settings.knowledgeMcpSampleConsentRequired": "Activez et enregistrez les recherches de connaissances avant de lancer la recherche d’exemple.",
      "review.externalKnowledgeTitle": "Suggestions de connaissances externes — non vérifiées, à examiner.",
      "review.externalKnowledgeObject": "Objet BC suggéré",
      "review.externalKnowledgeAction": "Action suggérée",
      "review.externalKnowledgeMeta": "Étape {step} · confiance {confidence} % · Source {source}",
      "review.externalKnowledgeNoUnresolved": "Aucun objet ni aucune action non résolu localement. Aucune recherche MCP n’a été envoyée.",
      "review.externalKnowledgeNoSuggestions": "Le MCP n’a renvoyé aucune suggestion pour {count} recherches.",
      "review.externalKnowledgeUnavailable": "Le service MCP local est inaccessible. Vérifiez la connexion dans les paramètres.",

    }),
"de-DE": Object.freeze({
      "settings.knowledgeMcpLegend": "Externe Wissensvorschläge",
      "settings.knowledgeMcpEnable": "Schreibgeschützte MCP-Abfragen erlauben",
      "settings.knowledgeMcpHelp": "Standardmäßig ausgeschaltet. Wenn aktiviert, werden nur nicht aufgelöste Objekt- und Aktions-IDs, App-Identität und -Version, sichtbare Seiten- und Steuerelementbeschriftungen sowie die Oberflächensprache an den lokalen schreibgeschützten Wissensdienst gesendet. Aufzeichnungen, Screenshots, eingegebene Werte sowie Mandanten-, Umgebungs- oder Unternehmensdaten werden nicht gesendet. Ergebnisse sind ungeprüfte Vorschläge und müssen geprüft werden.",
      "settings.knowledgeMcpTest": "Lokale Verbindung testen",
      "settings.knowledgeMcpChecking": "Lokaler Wissensdienst wird geprüft …",
      "settings.knowledgeMcpConnected": "Verbindung funktioniert. {count} schreibgeschützte Werkzeuge gefunden.",
      "settings.knowledgeMcpUnavailable": "Verbindung nicht möglich. Prüfen Sie, ob der lokale MCP-Host installiert und registriert ist.",
      "settings.knowledgeMcpFailureDetail": "Technischer Fehler: {detail}",
      "settings.knowledgeMcpConsentRequired": "Aktivieren und speichern Sie Wissensabfragen, bevor Sie die Verbindung testen.",
      "settings.knowledgeMcpSampleLookup": "Beispielsuche testen (nur BC-Seite 22: Kundenliste)",
      "settings.knowledgeMcpSampleChecking": "Beispielseite wird gesucht …",
      "settings.knowledgeMcpSampleFound": "Die MCP-Suche ergab {count} ungeprüfte Vorschläge für BC-Seite {objectId}. Quelle: {source}. Konfidenz: {confidence} %. Vor der Verwendung prüfen.",
      "settings.knowledgeMcpSampleUnresolved": "Die MCP-Suche wurde abgeschlossen, ergab aber keinen Vorschlag für BC-Seite {objectId}.",
      "settings.knowledgeMcpSampleConsentRequired": "Aktivieren und speichern Sie Wissensabfragen, bevor Sie die Beispielsuche starten.",
      "review.externalKnowledgeTitle": "Externe Wissensvorschläge — ungeprüft; bitte prüfen.",
      "review.externalKnowledgeObject": "Vorgeschlagenes BC-Objekt",
      "review.externalKnowledgeAction": "Vorgeschlagene Aktion",
      "review.externalKnowledgeMeta": "Schritt {step} · Konfidenz {confidence} % · Quelle {source}",
      "review.externalKnowledgeNoUnresolved": "Keine lokal ungelösten Objekte oder Aktionen gefunden. Es wurde keine MCP-Abfrage gesendet.",
      "review.externalKnowledgeNoSuggestions": "MCP hat für {count} Abfragen keine Vorschläge gefunden.",
      "review.externalKnowledgeUnavailable": "Der lokale MCP-Dienst ist nicht erreichbar. Prüfen Sie die Verbindung in den Einstellungen.",

    }),
"es-ES": Object.freeze({
      "settings.knowledgeMcpLegend": "Sugerencias de conocimiento externas",
      "settings.knowledgeMcpEnable": "Permitir consultas MCP de solo lectura",
      "settings.knowledgeMcpHelp": "Desactivado de forma predeterminada. Al activarlo, solo se podrán enviar al servicio local de conocimiento de solo lectura los identificadores de objeto y acción no resueltos, la identidad y versión de la aplicación, los títulos visibles de páginas y controles y el idioma de la interfaz. No se envían grabaciones, capturas de pantalla, valores introducidos ni datos de inquilino, entorno o empresa. Los resultados son sugerencias no verificadas que deben revisarse.",
      "settings.knowledgeMcpTest": "Probar conexión local",
      "settings.knowledgeMcpChecking": "Comprobando el servicio local de conocimiento…",
      "settings.knowledgeMcpConnected": "La conexión funciona. Se encontraron {count} herramientas de solo lectura.",
      "settings.knowledgeMcpUnavailable": "No se pudo conectar. Compruebe que el host MCP local esté instalado y registrado.",
      "settings.knowledgeMcpFailureDetail": "Detalle técnico: {detail}",
      "settings.knowledgeMcpConsentRequired": "Active y guarde las consultas de conocimiento antes de probar la conexión.",
      "settings.knowledgeMcpSampleLookup": "Probar búsqueda de ejemplo (solo página 22 de BC: lista de clientes)",
      "settings.knowledgeMcpSampleChecking": "Buscando la página de ejemplo…",
      "settings.knowledgeMcpSampleFound": "La búsqueda MCP devolvió {count} sugerencia(s) sin verificar para la página {objectId} de BC. Fuente: {source}. Confianza: {confidence} %. Revísela antes de usarla.",
      "settings.knowledgeMcpSampleUnresolved": "La búsqueda MCP terminó, pero no encontró sugerencias para la página {objectId} de BC.",
      "settings.knowledgeMcpSampleConsentRequired": "Active y guarde las consultas de conocimiento antes de ejecutar la búsqueda de ejemplo.",
      "review.externalKnowledgeTitle": "Sugerencias de conocimiento externas: sin verificar; revíselas.",
      "review.externalKnowledgeObject": "Objeto de BC sugerido",
      "review.externalKnowledgeAction": "Acción sugerida",
      "review.externalKnowledgeMeta": "Paso {step} · confianza {confidence} % · Fuente {source}",
      "review.externalKnowledgeNoUnresolved": "No se encontraron objetos ni acciones sin resolver localmente. No se envió ninguna consulta MCP.",
      "review.externalKnowledgeNoSuggestions": "MCP no devolvió sugerencias para {count} consultas.",
      "review.externalKnowledgeUnavailable": "No se pudo acceder al servicio MCP local. Compruebe la conexión en la configuración.",

    }),
"da-DK": Object.freeze({
      "settings.knowledgeMcpLegend": "Eksterne vidensforslag",
      "settings.knowledgeMcpEnable": "Tillad skrivebeskyttede MCP-opslag",
      "settings.knowledgeMcpHelp": "Slået fra som standard. Når funktionen er slået til, kan kun uløste objekt- og handlings-id'er, appidentitet og version, synlige side- og kontroltekster samt grænsefladesproget sendes til den lokale skrivebeskyttede videnstjeneste. Optagelser, skærmbilleder, indtastede værdier og oplysninger om tenant, miljø eller virksomhed sendes ikke. Resultater er ubekræftede forslag, som skal gennemgås.",
      "settings.knowledgeMcpTest": "Test lokal forbindelse",
      "settings.knowledgeMcpChecking": "Kontrollerer den lokale videnstjeneste …",
      "settings.knowledgeMcpConnected": "Forbindelsen virker. Fandt {count} skrivebeskyttede værktøjer.",
      "settings.knowledgeMcpUnavailable": "Kunne ikke oprette forbindelse. Kontrollér, at den lokale MCP-vært er installeret og registreret.",
      "settings.knowledgeMcpFailureDetail": "Teknisk fejl: {detail}",
      "settings.knowledgeMcpConsentRequired": "Aktivér og gem vidensopslag, før du tester forbindelsen.",
      "settings.knowledgeMcpSampleLookup": "Test eksempelopslag (sender kun BC-side 22: kundeliste)",
      "settings.knowledgeMcpSampleChecking": "Søger efter eksempelside …",
      "settings.knowledgeMcpSampleFound": "MCP-opslaget gav {count} ubekræftet(e) forslag til BC-side {objectId}. Kilde: {source}. Sikkerhed: {confidence} %. Gennemgå før brug.",
      "settings.knowledgeMcpSampleUnresolved": "MCP-opslaget blev gennemført, men fandt ingen forslag til BC-side {objectId}.",
      "settings.knowledgeMcpSampleConsentRequired": "Aktivér og gem vidensopslag, før du kører eksempelopslaget.",
      "review.externalKnowledgeTitle": "Eksterne vidensforslag — ubekræftede; gennemgå før brug.",
      "review.externalKnowledgeObject": "Foreslået BC-objekt",
      "review.externalKnowledgeAction": "Foreslået handling",
      "review.externalKnowledgeMeta": "Trin {step} · sikkerhed {confidence} % · Kilde {source}",
      "review.externalKnowledgeNoUnresolved": "Ingen lokalt uløste objekter eller handlinger blev fundet. Der blev ikke sendt noget MCP-opslag.",
      "review.externalKnowledgeNoSuggestions": "MCP fandt ingen forslag for {count} opslag.",
      "review.externalKnowledgeUnavailable": "Den lokale MCP-tjeneste kunne ikke nås. Kontrollér forbindelsen under indstillinger.",

    }),
"fi-FI": Object.freeze({
      "settings.knowledgeMcpLegend": "Ulkoiset tietoehdotukset",
      "settings.knowledgeMcpEnable": "Salli vain luku -muotoiset MCP-haut",
      "settings.knowledgeMcpHelp": "Oletusarvoisesti poissa käytöstä. Kun toiminto on käytössä, paikalliselle vain luku -muotoiselle tietopalvelulle voidaan lähettää vain ratkaisemattomat objekti- ja toimintotunnisteet, sovelluksen tunniste ja versio, näkyvät sivu- ja ohjaustekstit sekä käyttöliittymän kieli. Tallenteita, kuvakaappauksia, syötettyjä arvoja tai tenantin, ympäristön tai yrityksen tietoja ei lähetetä. Tulokset ovat vahvistamattomia ehdotuksia, jotka on tarkistettava.",
      "settings.knowledgeMcpTest": "Testaa paikallinen yhteys",
      "settings.knowledgeMcpChecking": "Tarkistetaan paikallista tietopalvelua…",
      "settings.knowledgeMcpConnected": "Yhteys toimii. Löytyi {count} vain luku -työkalua.",
      "settings.knowledgeMcpUnavailable": "Yhteyttä ei voitu muodostaa. Tarkista, että paikallinen MCP-isäntä on asennettu ja rekisteröity.",
      "settings.knowledgeMcpFailureDetail": "Tekninen virhe: {detail}",
      "settings.knowledgeMcpConsentRequired": "Ota haut käyttöön ja tallenna asetus ennen yhteyden testaamista.",
      "settings.knowledgeMcpSampleLookup": "Testaa esimerkkihakua (vain BC-sivu 22: asiakasluettelo)",
      "settings.knowledgeMcpSampleChecking": "Haetaan esimerkkisivua …",
      "settings.knowledgeMcpSampleFound": "MCP-haku palautti {count} vahvistamatonta ehdotusta BC-sivulle {objectId}. Lähde: {source}. Luottamus: {confidence} %. Tarkista ennen käyttöä.",
      "settings.knowledgeMcpSampleUnresolved": "MCP-haku valmistui, mutta ei löytänyt ehdotusta BC-sivulle {objectId}.",
      "settings.knowledgeMcpSampleConsentRequired": "Ota haut käyttöön ja tallenna asetus ennen esimerkkihakua.",
      "review.externalKnowledgeTitle": "Ulkoiset tietoehdotukset — vahvistamattomia; tarkista ennen käyttöä.",
      "review.externalKnowledgeObject": "Ehdotettu BC-objekti",
      "review.externalKnowledgeAction": "Ehdotettu toiminto",
      "review.externalKnowledgeMeta": "Vaihe {step} · luottamus {confidence} % · Lähde {source}",
      "review.externalKnowledgeNoUnresolved": "Paikallisesti ratkaisemattomia objekteja tai toimintoja ei löytynyt. MCP-hakua ei lähetetty.",
      "review.externalKnowledgeNoSuggestions": "MCP ei löytänyt ehdotuksia {count} haulle.",
      "review.externalKnowledgeUnavailable": "Paikalliseen MCP-palveluun ei saatu yhteyttä. Tarkista yhteys asetuksista.",

    }),
    "nb-NO": Object.freeze({
      "settings.knowledgeMcpLegend": "Eksterne kunnskapsforslag",
      "settings.knowledgeMcpEnable": "Tillat skrivebeskyttede MCP-oppslag",
      "settings.knowledgeMcpHelp": "Av som standard. Når funksjonen er slått på, kan bare uløste objekt- og handlings-ID-er, appidentitet og versjon, synlige side- og kontrolltekster samt grensesnittspråket sendes til den lokale, skrivebeskyttede kunnskapstjenesten. Opptak, skjermbilder, inntastede verdier og opplysninger om tenant, miljø eller firma sendes ikke. Resultatene er ubekreftede forslag som må gjennomgås.",
      "settings.knowledgeMcpTest": "Test lokal tilkobling",
      "settings.knowledgeMcpChecking": "Kontrollerer den lokale kunnskapstjenesten …",
      "settings.knowledgeMcpConnected": "Tilkoblingen fungerer. Fant {count} skrivebeskyttede verktøy.",
      "settings.knowledgeMcpUnavailable": "Kunne ikke koble til. Kontroller at den lokale MCP-verten er installert og registrert.",
      "settings.knowledgeMcpFailureDetail": "Teknisk feil: {detail}",
      "settings.knowledgeMcpConsentRequired": "Aktiver og lagre kunnskapsoppslag før du tester tilkoblingen.",
      "settings.knowledgeMcpSampleLookup": "Test eksempeloppslag (sender bare BC-side 22: kundeliste)",
      "settings.knowledgeMcpSampleChecking": "Søker etter eksempelside …",
      "settings.knowledgeMcpSampleFound": "MCP-oppslaget ga {count} ubekreftet(e) forslag for BC-side {objectId}. Kilde: {source}. Konfidens: {confidence} %. Må gjennomgås før bruk.",
      "settings.knowledgeMcpSampleUnresolved": "MCP-oppslaget ble fullført, men fant ingen forslag for BC-side {objectId}.",
      "settings.knowledgeMcpSampleConsentRequired": "Aktiver og lagre kunnskapsoppslag før du kjører eksempeloppslaget.",
      "review.externalKnowledgeTitle": "Eksterne kunnskapsforslag — ubekreftede; må gjennomgås.",
      "review.externalKnowledgeObject": "Foreslått BC-objekt",
      "review.externalKnowledgeAction": "Foreslått handling",
      "review.externalKnowledgeMeta": "Trinn {step} · konfidens {confidence} % · Kilde {source}",
      "review.externalKnowledgeNoUnresolved": "Fant ingen lokalt uløste objekter eller handlinger. Ingen MCP-forespørsel ble sendt.",
      "review.externalKnowledgeNoSuggestions": "MCP fant ingen forslag for {count} oppslag.",
      "review.externalKnowledgeUnavailable": "Den lokale MCP-tjenesten kunne ikke nås. Kontroller tilkoblingen i innstillingene.",

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
    ["Godkänt", "Approved"], ["Ändrad", "Edited"],
    ["Ej granskat", "Not reviewed"],
    ["Redigera metadata", "Edit metadata"], ["Arkivera", "Archive"],
    ["Ta bort permanent", "Delete permanently"], ["Ändra taggar", "Change tags"],
    ["Ändra profil", "Change profile"], ["Ändra tema", "Change theme"],
    ["Ändra författare", "Change author"], ["Ändra status", "Change status"],
    ["Ändra arkivstatus", "Change archive status"], ["Arkiverad", "Archived"],
    ["Aktiv", "Active"], ["Avbryt", "Cancel"], ["Tillämpa", "Apply"],
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
    ,["Sparad automatiskt", "Saved automatically"], ["Sparar…", "Saving…"]
    ,["Ändringar väntar på att sparas", "Changes waiting to be saved"]
    ,["Kunde inte spara ändringarna", "Could not save changes"]
    ,["Redo att dela", "Ready to share"], ["Slutför rapporten", "Complete the report"]
    ,["Rapporten innehåller tillräcklig information för att delas.", "The report contains enough information to be shared."]
    ,["Slutför punkterna nedan innan du delar.", "Complete the items below before sharing."]
    ,["Lägg till en rapporttitel.", "Add a report title."]
    ,["Lägg till minst ett synligt reproduktionssteg.", "Add at least one visible reproduction step."]
    ,["Beskriv det faktiska resultatet eller fånga ett BC-fel.", "Describe the actual result or capture a BC error."]
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
    ,["Kompletterande beskrivning", "Additional description"]
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
    ,["Fler skärmbilder", "Additional screenshots"]
    ,["Behöver åtgärdas", "Needs attention"]
    ,["Redigera steg för att återskapa", "Edit reproduction steps"]
    ,["Ta bort från rapporten", "Remove from report"]
    ,["Ta med i rapporten", "Include in report"]
    ,["Använd genererad text", "Use generated text"]
    ,["Skärmbild för steg", "Screenshot for step"]
    ,["Välj skärmbilder", "Choose screenshots"]
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
    ,["Inkludera AL-anropsstack när den finns", "Include AL call stack when available"]
    ,["Endast teknisk information som fångats för detta fel visas.", "Only technical information captured for this error is shown."]
    ,["Business Central-miljö", "Business Central environment"]
    ,["Business Central-företag", "Business Central company"]
    ,["Webbläsare", "Browser"], ["Webbläsarversion", "Browser version"]
    ,["Öppna i Business Central", "Open in Business Central"]
    ,["E-posta felrapport", "Email error report"]
    ,["Ange först en supportadress i inställningarna.", "Add a support email address in settings first."]
    ,["E-postutkast skapat med felrapporten bifogad.", "Email draft created with the report attached."]
    ,["E-postutkastet har sparats. Öppna den nedladdade .eml-filen för att fortsätta.",
      "Email draft saved. Open the downloaded .eml file to continue."]
    ,["Supportadress för felrapporter", "Support email address for bug reports"]
    ,["Spara supportadress", "Save support address"]
    ,["Supportadressen har sparats.", "Support address saved."]
    ,["Sparad", "Saved"]
    ,["E-posta PDF", "Email PDF"]
    ,["Granska bilder före delning", "Review screenshots before sharing"]
    ,["Fortsätt", "Continue"]
    ,["Avbryt", "Cancel"]
    ,["Avmarkera bilder som inte ska följa med. Inspelningen ändras inte.", "Uncheck screenshots to exclude them. The recording is unchanged."]
    ,["Exportera PDF", "Export PDF"]
    ,["Bifoga även tekniskt ZIP-paket", "Also attach technical ZIP package"]
    ,["PDF-rapporten har sparats.", "PDF report saved."]
    ,["Öppna felrapport i e-post", "Open bug report in email"]
    ,["Windows-delning (kräver Windows-hjälpare)", "Windows sharing (requires Windows helper)"]
    ,["Ladda ned .eml-fil", "Download .eml file"]
    ,["Välj Outlook i delningsdialogen. Supportadress och ämne kan behöva klistras in.",
      "Choose Outlook in the share dialog. You may need to paste the support address and subject."]
    ,["Windows-hjälparen är öppnad. Välj Dela bifogad rapport och sedan Outlook.",
      "Windows helper is open. Choose Share attached report and then Outlook."]
    ,["Används när en felrapport skapas som adresserat e-postutkast.", "Used when a bug report is prepared as an addressed email draft."]
    ,["Inkludera tekniska detaljer i beskrivningen", "Include technical details in description"]
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
    ,["Visa avancerade dataskyddsinställningar", "Show advanced privacy settings"]
    ,["Dataskydd", "Privacy"]
    ,["Masterdata och testdata", "Master data and test data"]
    ,["Öppna debugpanel", "Open debug panel"]
    ,["Regenerera från inspelning", "Regenerate from recording"]
    ,["Automatisk", "Automatic"], ["Lodrät", "Vertical"], ["Täthet", "Density"]
    ,["Fokusläge", "Focus mode"], ["Anpassa", "Customize"]
    ,["Sök i kartan", "Search the map"], ["Nästa träff", "Next match"]
    ,["Typ", "Type"], ["Villkor", "Condition"], ["Alternativ", "Alternative"]
    ,["Upprepa", "Repeat"], ["Tillbaka", "Back"], ["Ta bort", "Remove"]
    ,["Åtgärd", "Action"], ["Processsteg", "Process step"]
    ,["Dokument", "Document"], ["Bokföring", "Posting"], ["Beslut", "Decision"]
    ,["Manuell åtgärd", "Manual action"], ["Systemåtgärd", "System action"]
    ,["Inköp", "Purchasing"], ["Lager", "Warehouse"], ["Försäljning", "Sales"]
    ,["Produktion", "Manufacturing"], ["Ekonomi", "Finance"], ["System", "System"]
    ,["Förhandsgranska regenerering", "Preview regeneration"]
    ,["Godkänn och regenerera", "Approve and regenerate"]
    ,["Ta ny skärmbild", "Capture new screenshot"]
    ,["Använd vald bild", "Use selected screenshot"]
    ,["Tillgängliga skärmbilder", "Available screenshots"]
    ,["Session", "Session"], ["Stoppa inspelning", "Stop recording"]
    ,["Licensinformation", "License information"]
    ,["Begär 30 dagars testlicens", "Request a 30-day trial"]
    ,["E-postadress", "Email address"], ["Starta testperiod", "Start trial"]
    ,["Generera om från inspelningen", "Regenerate from the recording"]
  ]);

  const staticLookup = new Map();
  const staticSources = new WeakMap();
  STATIC_TEXT.forEach(([sv, en]) => {
    const variants = { "sv-SE": sv, "en-US": en };
    for (const locale of SUPPORTED_LOCALES) variants[locale] = languageRegistry.translate(en, locale, sv);
    for (const value of Object.values(variants)) staticLookup.set(value, variants);
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
        const previous = staticSources.get(node);
        const source = previous?.rendered === trimmed ? previous.source : trimmed;
        const translated = translateStaticText(source, locale);
        staticSources.set(node, { source, rendered: translated });
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
    return languageRegistry.normalize(value || DEFAULT_LOCALE, "ui");
  }

  function populateLanguageSelects(target = root.document) {
    if (!target?.querySelectorAll) return;
    target.querySelectorAll("[data-language-select]").forEach(select => {
      // An empty filter value means all languages, not a missing preference.
      const current = select.dataset.languageAllLabel ? select.value :
        select.value || select.dataset.selectedLanguage || DEFAULT_LOCALE;
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
    if (messages[normalized]?.[key] !== undefined) return messages[normalized][key];
    if (messages["en-US"]?.[key] !== undefined) return languageRegistry.translate(
      messages["en-US"][key], normalized, messages[DEFAULT_LOCALE]?.[key]);
    return messages[DEFAULT_LOCALE]?.[key] ?? key;
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
    target.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
      element.setAttribute("aria-label", translate(
        element.dataset.i18nAriaLabel, normalized));
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
