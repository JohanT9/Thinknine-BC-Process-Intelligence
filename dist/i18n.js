(function initUiI18n(root) {
  "use strict";

  const languageRegistry = root.T9LanguageRegistry;
  const DEFAULT_LOCALE = languageRegistry.DEFAULT_UI_LANGUAGE;
  const SUPPORTED_LOCALES = Object.freeze(languageRegistry.supported("ui")
    .map(language => language.locale));
  const outlookMessages = {
  "en-US": {
    "outlook.title": "Email the report",
    "outlook.help": "Create an Outlook draft with the PDF in the mailbox you choose when signing in, or save a local email file. You review and send the email yourself.",
    "outlook.permission": "Outlook requires permission to read, create, change and delete your mail (Mail.ReadWrite), although this feature only creates drafts. Your organization may require administrator approval.",
    "outlook.open": "Open draft in Outlook",
    "outlook.file": "Save email file (.eml)",
    "outlook.close": "Close",
    "outlook.working": "Preparing the PDF and Outlook draft…",
    "outlook.created": "The draft is saved in Outlook with the PDF attached. Review it before sending.",
    "outlook.consent": "Outlook access was not approved or sign-in could not be completed. Your administrator may need to approve it. You can save an email file instead.",
    "outlook.uncertain": "A draft may already exist. Check Outlook Drafts before creating another email. Use the link if shown, or save an email file.",
    "outlook.size": "The PDF is too large for this Outlook integration. Save an email file instead.",
    "outlook.configuration": "Outlook is not configured or the support address is missing. Check settings or save an email file.",
    "outlook.failed": "The Outlook draft could not be created. You can save an email file instead."
  },
  "sv-SE": {
    "outlook.title": "E-posta rapporten",
    "outlook.help": "Skapa ett Outlook-utkast med PDF:en i den postlåda du väljer vid inloggningen, eller spara en lokal mejlfil. Du granskar och skickar mejlet själv.",
    "outlook.permission": "Outlook kräver behörighet att läsa, skapa, ändra och radera din e-post (Mail.ReadWrite), även om funktionen bara skapar utkast. Din organisation kan kräva administratörsgodkännande.",
    "outlook.open": "Öppna utkast i Outlook",
    "outlook.file": "Spara mejlfil (.eml)",
    "outlook.close": "Stäng",
    "outlook.working": "Förbereder PDF och Outlook-utkast…",
    "outlook.created": "Utkastet har sparats i Outlook med PDF:en bifogad. Granska det innan du skickar.",
    "outlook.consent": "Outlook-åtkomsten godkändes inte eller inloggningen kunde inte slutföras. Din administratör kan behöva godkänna den. Du kan spara en mejlfil i stället.",
    "outlook.uncertain": "Ett utkast kan redan finnas. Kontrollera Utkast i Outlook innan du skapar ett nytt mejl. Använd länken om den visas, eller spara en mejlfil.",
    "outlook.size": "PDF:en är för stor för denna Outlook-integrering. Spara en mejlfil i stället.",
    "outlook.configuration": "Outlook är inte konfigurerat eller supportadressen saknas. Kontrollera inställningarna eller spara en mejlfil.",
    "outlook.failed": "Outlook-utkastet kunde inte skapas. Du kan spara en mejlfil i stället."
  },
  "fr-FR": {
    "outlook.title": "Envoyer le rapport par e-mail",
    "outlook.help": "Créez un brouillon Outlook avec le PDF dans la boîte choisie à la connexion, ou enregistrez un fichier e-mail local. Vous vérifiez et envoyez vous-même le message.",
    "outlook.permission": "Outlook exige la permission de lire, créer, modifier et supprimer vos e-mails (Mail.ReadWrite), même si cette fonction crée uniquement des brouillons. Votre organisation peut exiger l’approbation d’un administrateur.",
    "outlook.open": "Ouvrir le brouillon dans Outlook",
    "outlook.file": "Enregistrer le fichier e-mail (.eml)",
    "outlook.close": "Fermer",
    "outlook.working": "Préparation du PDF et du brouillon Outlook…",
    "outlook.created": "Le brouillon est enregistré dans Outlook avec le PDF joint. Vérifiez-le avant l’envoi.",
    "outlook.consent": "L’accès à Outlook n’a pas été approuvé ou la connexion n’a pas abouti. Votre administrateur devra peut-être l’approuver. Vous pouvez enregistrer un fichier e-mail.",
    "outlook.uncertain": "Un brouillon existe peut-être déjà. Vérifiez les brouillons Outlook avant de créer un autre message. Utilisez le lien affiché ou enregistrez un fichier e-mail.",
    "outlook.size": "Le PDF est trop volumineux pour cette intégration Outlook. Enregistrez un fichier e-mail.",
    "outlook.configuration": "Outlook n’est pas configuré ou l’adresse du support est absente. Vérifiez les paramètres ou enregistrez un fichier e-mail.",
    "outlook.failed": "Impossible de créer le brouillon Outlook. Vous pouvez enregistrer un fichier e-mail."
  },
  "de-DE": {
    "outlook.title": "Bericht per E-Mail senden",
    "outlook.help": "Erstellen Sie einen Outlook-Entwurf mit PDF im bei der Anmeldung gewählten Postfach oder speichern Sie eine lokale E-Mail-Datei. Sie prüfen und senden die E-Mail selbst.",
    "outlook.permission": "Outlook benötigt die Berechtigung, Ihre E-Mails zu lesen, zu erstellen, zu ändern und zu löschen (Mail.ReadWrite), obwohl diese Funktion nur Entwürfe erstellt. Ihre Organisation kann die Zustimmung eines Administrators verlangen.",
    "outlook.open": "Entwurf in Outlook öffnen",
    "outlook.file": "E-Mail-Datei speichern (.eml)",
    "outlook.close": "Schließen",
    "outlook.working": "PDF und Outlook-Entwurf werden vorbereitet…",
    "outlook.created": "Der Entwurf wurde mit PDF-Anhang in Outlook gespeichert. Prüfen Sie ihn vor dem Senden.",
    "outlook.consent": "Der Outlook-Zugriff wurde nicht genehmigt oder die Anmeldung konnte nicht abgeschlossen werden. Möglicherweise muss Ihr Administrator zustimmen. Sie können eine E-Mail-Datei speichern.",
    "outlook.uncertain": "Ein Entwurf ist möglicherweise bereits vorhanden. Prüfen Sie die Outlook-Entwürfe, bevor Sie eine weitere E-Mail erstellen. Nutzen Sie den angezeigten Link oder speichern Sie eine E-Mail-Datei.",
    "outlook.size": "Die PDF-Datei ist für diese Outlook-Integration zu groß. Speichern Sie eine E-Mail-Datei.",
    "outlook.configuration": "Outlook ist nicht konfiguriert oder die Supportadresse fehlt. Prüfen Sie die Einstellungen oder speichern Sie eine E-Mail-Datei.",
    "outlook.failed": "Der Outlook-Entwurf konnte nicht erstellt werden. Sie können eine E-Mail-Datei speichern."
  },
  "es-ES": {
    "outlook.title": "Enviar el informe por correo",
    "outlook.help": "Cree un borrador de Outlook con el PDF en el buzón que elija al iniciar sesión, o guarde un archivo de correo local. Usted revisa y envía el mensaje.",
    "outlook.permission": "Outlook requiere permiso para leer, crear, modificar y eliminar su correo (Mail.ReadWrite), aunque esta función solo crea borradores. Su organización puede exigir la aprobación de un administrador.",
    "outlook.open": "Abrir borrador en Outlook",
    "outlook.file": "Guardar archivo de correo (.eml)",
    "outlook.close": "Cerrar",
    "outlook.working": "Preparando el PDF y el borrador de Outlook…",
    "outlook.created": "El borrador se ha guardado en Outlook con el PDF adjunto. Revíselo antes de enviarlo.",
    "outlook.consent": "No se aprobó el acceso a Outlook o no se pudo completar el inicio de sesión. Puede que su administrador deba aprobarlo. Puede guardar un archivo de correo.",
    "outlook.uncertain": "Puede que ya exista un borrador. Compruebe Borradores en Outlook antes de crear otro mensaje. Use el enlace mostrado o guarde un archivo de correo.",
    "outlook.size": "El PDF es demasiado grande para esta integración con Outlook. Guarde un archivo de correo.",
    "outlook.configuration": "Outlook no está configurado o falta la dirección de soporte. Revise la configuración o guarde un archivo de correo.",
    "outlook.failed": "No se pudo crear el borrador de Outlook. Puede guardar un archivo de correo."
  },
  "da-DK": {
    "outlook.title": "Send rapporten via e-mail",
    "outlook.help": "Opret en Outlook-kladde med PDF’en i den postkasse, du vælger ved login, eller gem en lokal e-mailfil. Du gennemgår og sender selv e-mailen.",
    "outlook.permission": "Outlook kræver tilladelse til at læse, oprette, ændre og slette din e-mail (Mail.ReadWrite), selvom funktionen kun opretter kladder. Din organisation kan kræve administratorgodkendelse.",
    "outlook.open": "Åbn kladde i Outlook",
    "outlook.file": "Gem e-mailfil (.eml)",
    "outlook.close": "Luk",
    "outlook.working": "Forbereder PDF og Outlook-kladde…",
    "outlook.created": "Kladden er gemt i Outlook med PDF’en vedhæftet. Gennemgå den før afsendelse.",
    "outlook.consent": "Adgang til Outlook blev ikke godkendt, eller login kunne ikke fuldføres. Din administrator skal muligvis godkende det. Du kan gemme en e-mailfil i stedet.",
    "outlook.uncertain": "Der findes muligvis allerede en kladde. Kontrollér Kladder i Outlook, før du opretter en ny e-mail. Brug linket, hvis det vises, eller gem en e-mailfil.",
    "outlook.size": "PDF’en er for stor til denne Outlook-integration. Gem en e-mailfil i stedet.",
    "outlook.configuration": "Outlook er ikke konfigureret, eller supportadressen mangler. Kontrollér indstillingerne, eller gem en e-mailfil.",
    "outlook.failed": "Outlook-kladden kunne ikke oprettes. Du kan gemme en e-mailfil i stedet."
  },
  "fi-FI": {
    "outlook.title": "Lähetä raportti sähköpostitse",
    "outlook.help": "Luo PDF-liitteen sisältävä Outlook-luonnos kirjautuessasi valitsemaasi postilaatikkoon tai tallenna paikallinen sähköpostitiedosto. Tarkistat ja lähetät viestin itse.",
    "outlook.permission": "Outlook edellyttää oikeutta lukea, luoda, muuttaa ja poistaa sähköpostiasi (Mail.ReadWrite), vaikka tämä toiminto luo vain luonnoksia. Organisaatiosi voi vaatia järjestelmänvalvojan hyväksynnän.",
    "outlook.open": "Avaa luonnos Outlookissa",
    "outlook.file": "Tallenna sähköpostitiedosto (.eml)",
    "outlook.close": "Sulje",
    "outlook.working": "Valmistellaan PDF:ää ja Outlook-luonnosta…",
    "outlook.created": "Luonnos on tallennettu Outlookiin PDF-liitteen kanssa. Tarkista se ennen lähettämistä.",
    "outlook.consent": "Outlook-käyttöä ei hyväksytty tai kirjautumista ei voitu suorittaa. Järjestelmänvalvojan hyväksyntä saattaa olla tarpeen. Voit tallentaa sähköpostitiedoston.",
    "outlook.uncertain": "Luonnos saattaa jo olla olemassa. Tarkista Outlookin Luonnokset ennen uuden viestin luomista. Käytä näkyvää linkkiä tai tallenna sähköpostitiedosto.",
    "outlook.size": "PDF on liian suuri tälle Outlook-integraatiolle. Tallenna sähköpostitiedosto.",
    "outlook.configuration": "Outlookia ei ole määritetty tai tukiosoite puuttuu. Tarkista asetukset tai tallenna sähköpostitiedosto.",
    "outlook.failed": "Outlook-luonnosta ei voitu luoda. Voit tallentaa sähköpostitiedoston."
  },
  "nb-NO": {
    "outlook.title": "Send rapporten på e-post",
    "outlook.help": "Opprett et Outlook-utkast med PDF-en i postkassen du velger ved innlogging, eller lagre en lokal e-postfil. Du gjennomgår og sender e-posten selv.",
    "outlook.permission": "Outlook krever tillatelse til å lese, opprette, endre og slette e-posten din (Mail.ReadWrite), selv om funksjonen bare oppretter utkast. Organisasjonen din kan kreve administratorgodkjenning.",
    "outlook.open": "Åpne utkast i Outlook",
    "outlook.file": "Lagre e-postfil (.eml)",
    "outlook.close": "Lukk",
    "outlook.working": "Forbereder PDF og Outlook-utkast…",
    "outlook.created": "Utkastet er lagret i Outlook med PDF-en vedlagt. Gjennomgå det før du sender.",
    "outlook.consent": "Outlook-tilgangen ble ikke godkjent, eller innloggingen kunne ikke fullføres. Administratoren din må kanskje godkjenne den. Du kan lagre en e-postfil i stedet.",
    "outlook.uncertain": "Det finnes kanskje allerede et utkast. Kontroller Utkast i Outlook før du oppretter en ny e-post. Bruk lenken hvis den vises, eller lagre en e-postfil.",
    "outlook.size": "PDF-en er for stor for denne Outlook-integreringen. Lagre en e-postfil i stedet.",
    "outlook.configuration": "Outlook er ikke konfigurert, eller supportadressen mangler. Kontroller innstillingene eller lagre en e-postfil.",
    "outlook.failed": "Outlook-utkastet kunne ikke opprettes. Du kan lagre en e-postfil i stedet."
  }
};
  const asyncOperationMessages = Object.freeze({
    "sv-SE": Object.freeze({ "technical.requestTimeout": "Åtgärden tog för lång tid. Läs in tillägget igen och försök på nytt.", "technical.someImagesMissing": "Vissa bevisbilder kunde inte läsas in och kan saknas i exporten." }),
    "en-US": Object.freeze({ "technical.requestTimeout": "The operation timed out. Reload the extension and try again.", "technical.someImagesMissing": "Some evidence images could not be loaded and may be missing from the export." }),
    "fr-FR": Object.freeze({ "technical.requestTimeout": "L’opération a expiré. Rechargez l’extension et réessayez.", "technical.someImagesMissing": "Certaines images de preuve n’ont pas pu être chargées et risquent de manquer dans l’exportation." }),
    "de-DE": Object.freeze({ "technical.requestTimeout": "Der Vorgang hat zu lange gedauert. Laden Sie die Erweiterung neu und versuchen Sie es erneut.", "technical.someImagesMissing": "Einige Beweisbilder konnten nicht geladen werden und fehlen möglicherweise im Export." }),
    "es-ES": Object.freeze({ "technical.requestTimeout": "La operación agotó el tiempo de espera. Vuelva a cargar la extensión e inténtelo de nuevo.", "technical.someImagesMissing": "No se pudieron cargar algunas imágenes de evidencia y podrían faltar en la exportación." }),
    "da-DK": Object.freeze({ "technical.requestTimeout": "Handlingen fik timeout. Genindlæs udvidelsen, og prøv igen.", "technical.someImagesMissing": "Nogle dokumentationsbilleder kunne ikke indlæses og kan mangle i eksporten." }),
    "fi-FI": Object.freeze({ "technical.requestTimeout": "Toiminto aikakatkaistiin. Lataa laajennus uudelleen ja yritä uudestaan.", "technical.someImagesMissing": "Joitakin todistuskuvia ei voitu ladata, joten ne saattavat puuttua viennistä." }),
    "nb-NO": Object.freeze({ "technical.requestTimeout": "Operasjonen fikk tidsavbrudd. Last inn utvidelsen på nytt, og prøv igjen.", "technical.someImagesMissing": "Noen dokumentasjonsbilder kunne ikke lastes inn og kan mangle i eksporten." })
  });
  // Live recording warnings are keyed by the warning code from recording-live-status.
  const recordingWarningMessages = Object.freeze({
    "sv-SE": Object.freeze({ "recorder.warning.license-blocked": "Licensen eller tenantkontexten hindrar fortsatt inspelning.", "recorder.warning.capture-write-error": "En inspelningshändelse kunde inte sparas säkert. Inspelningen kan vara ofullständig.", "recorder.warning.recording-truncated": "Maximalt antal händelser har uppnåtts.", "recorder.warning.bc-not-connected": "Kontakten med Business Central är inte bekräftad.", "recorder.warning.no-events-yet": "Inga användarhändelser har registrerats ännu.", "recorder.warning.screenshot-error": "Minst en skärmbild kunde inte tas.", "recorder.warning.screenshot-dropped": "Några skärmbilder kunde inte sparas. Vissa steg kan sakna bild.", "recorder.warning.no-screenshots-yet": "Händelser registreras, men ingen skärmbild har sparats ännu." }),
    "en-US": Object.freeze({ "recorder.warning.license-blocked": "The license or tenant context prevents the recording from continuing.", "recorder.warning.capture-write-error": "A recording event could not be saved safely. The recording may be incomplete.", "recorder.warning.recording-truncated": "The maximum number of events has been reached.", "recorder.warning.bc-not-connected": "The connection to Business Central is not confirmed.", "recorder.warning.no-events-yet": "No user events have been recorded yet.", "recorder.warning.screenshot-error": "At least one screenshot could not be captured.", "recorder.warning.screenshot-dropped": "Some screenshots could not be saved. Some steps may be missing an image.", "recorder.warning.no-screenshots-yet": "Events are being recorded, but no screenshot has been saved yet." }),
    "fr-FR": Object.freeze({ "recorder.warning.license-blocked": "La licence ou le contexte du locataire empêche la poursuite de l’enregistrement.", "recorder.warning.capture-write-error": "Un événement d’enregistrement n’a pas pu être sauvegardé en toute sécurité. L’enregistrement peut être incomplet.", "recorder.warning.recording-truncated": "Le nombre maximal d’événements a été atteint.", "recorder.warning.bc-not-connected": "La connexion à Business Central n’est pas confirmée.", "recorder.warning.no-events-yet": "Aucun événement utilisateur n’a encore été enregistré.", "recorder.warning.screenshot-error": "Au moins une capture d’écran n’a pas pu être prise.", "recorder.warning.screenshot-dropped": "Certaines captures d’écran n’ont pas pu être enregistrées. Certaines étapes peuvent ne pas avoir d’image.", "recorder.warning.no-screenshots-yet": "Des événements sont enregistrés, mais aucune capture d’écran n’a encore été sauvegardée." }),
    "de-DE": Object.freeze({ "recorder.warning.license-blocked": "Die Lizenz oder der Mandantenkontext verhindert die Fortsetzung der Aufzeichnung.", "recorder.warning.capture-write-error": "Ein Aufzeichnungsereignis konnte nicht sicher gespeichert werden. Die Aufzeichnung ist möglicherweise unvollständig.", "recorder.warning.recording-truncated": "Die maximale Anzahl von Ereignissen wurde erreicht.", "recorder.warning.bc-not-connected": "Die Verbindung zu Business Central ist nicht bestätigt.", "recorder.warning.no-events-yet": "Es wurden noch keine Benutzerereignisse aufgezeichnet.", "recorder.warning.screenshot-error": "Mindestens ein Screenshot konnte nicht erstellt werden.", "recorder.warning.screenshot-dropped": "Einige Screenshots konnten nicht gespeichert werden. Bei manchen Schritten fehlt möglicherweise ein Bild.", "recorder.warning.no-screenshots-yet": "Ereignisse werden aufgezeichnet, aber es wurde noch kein Screenshot gespeichert." }),
    "es-ES": Object.freeze({ "recorder.warning.license-blocked": "La licencia o el contexto del inquilino impide continuar la grabación.", "recorder.warning.capture-write-error": "No se pudo guardar de forma segura un evento de la grabación. Es posible que la grabación esté incompleta.", "recorder.warning.recording-truncated": "Se ha alcanzado el número máximo de eventos.", "recorder.warning.bc-not-connected": "La conexión con Business Central no está confirmada.", "recorder.warning.no-events-yet": "Todavía no se ha registrado ningún evento de usuario.", "recorder.warning.screenshot-error": "No se pudo realizar al menos una captura de pantalla.", "recorder.warning.screenshot-dropped": "No se pudieron guardar algunas capturas de pantalla. Es posible que algunos pasos no tengan imagen.", "recorder.warning.no-screenshots-yet": "Se están registrando eventos, pero todavía no se ha guardado ninguna captura de pantalla." }),
    "da-DK": Object.freeze({ "recorder.warning.license-blocked": "Licensen eller lejerkonteksten forhindrer, at optagelsen fortsætter.", "recorder.warning.capture-write-error": "En optagelseshændelse kunne ikke gemmes sikkert. Optagelsen kan være ufuldstændig.", "recorder.warning.recording-truncated": "Det maksimale antal hændelser er nået.", "recorder.warning.bc-not-connected": "Forbindelsen til Business Central er ikke bekræftet.", "recorder.warning.no-events-yet": "Der er endnu ikke registreret nogen brugerhændelser.", "recorder.warning.screenshot-error": "Mindst ét skærmbillede kunne ikke tages.", "recorder.warning.screenshot-dropped": "Nogle skærmbilleder kunne ikke gemmes. Nogle trin kan mangle et billede.", "recorder.warning.no-screenshots-yet": "Hændelser registreres, men der er endnu ikke gemt noget skærmbillede." }),
    "fi-FI": Object.freeze({ "recorder.warning.license-blocked": "Lisenssi tai vuokraajakonteksti estää tallennuksen jatkamisen.", "recorder.warning.capture-write-error": "Tallennustapahtumaa ei voitu tallentaa turvallisesti. Tallennus voi olla puutteellinen.", "recorder.warning.recording-truncated": "Tapahtumien enimmäismäärä on saavutettu.", "recorder.warning.bc-not-connected": "Yhteyttä Business Centraliin ei ole vahvistettu.", "recorder.warning.no-events-yet": "Käyttäjätapahtumia ei ole vielä tallennettu.", "recorder.warning.screenshot-error": "Vähintään yhtä kuvakaappausta ei voitu ottaa.", "recorder.warning.screenshot-dropped": "Joitakin kuvakaappauksia ei voitu tallentaa. Joistakin vaiheista voi puuttua kuva.", "recorder.warning.no-screenshots-yet": "Tapahtumia tallennetaan, mutta yhtään kuvakaappausta ei ole vielä tallennettu." }),
    "nb-NO": Object.freeze({ "recorder.warning.license-blocked": "Lisensen eller leierkonteksten hindrer at opptaket fortsetter.", "recorder.warning.capture-write-error": "En opptakshendelse kunne ikke lagres sikkert. Opptaket kan være ufullstendig.", "recorder.warning.recording-truncated": "Maksimalt antall hendelser er nådd.", "recorder.warning.bc-not-connected": "Forbindelsen til Business Central er ikke bekreftet.", "recorder.warning.no-events-yet": "Ingen brukerhendelser er registrert ennå.", "recorder.warning.screenshot-error": "Minst ett skjermbilde kunne ikke tas.", "recorder.warning.screenshot-dropped": "Noen skjermbilder kunne ikke lagres. Noen trinn kan mangle bilde.", "recorder.warning.no-screenshots-yet": "Hendelser registreres, men ingen skjermbilder er lagret ennå." })
  });
  const reviewRuntimeMessages = Object.freeze({
    "sv-SE": Object.freeze({ "review.footerCurrentStep": "Motsvarande granskningssteg visas.", "review.documentUpdating": "Uppdaterar dokumentet…", "review.autosaveFailed": "Automatisk sparning misslyckades.", "review.autosaveRetry": "Automatisk sparning misslyckades. Försök spara igen.", "review.autosaving": "Ändringen sparas automatiskt.", "review.annotationSaving": "Sparar annoteringar…", "review.annotationSaved": "Annoteringarna är sparade.", "review.mixed": "Blandat", "review.loadingContext": "Läser in skärmbilder och processkontext…", "review.openedPartial": "Dokumentationen öppnades, men skärmbilder eller processkontext kunde inte läsas in.", "library.emptySessions": "Inga sessioner har sparats ännu.", "library.review": "Granska", "library.exportZip": "Exportera ZIP", "common.delete": "Ta bort", "library.recentBugReport": "Felrapporten öppnades", "library.recentDocument": "Dokumentationen öppnades", "library.selectionCleared": "Dokumentvalet rensades.", "library.selectedCount": "{count} dokument valdes.", "library.confirmWordExport": "Exportera {count} dokument till separata Word-filer? Dokumenten ändras inte. Välj Avbryt för att stoppa innan exporten startar.", "session.recording": "Pågår", "session.ended": "Avslutad" }),
    "en-US": Object.freeze({ "review.footerCurrentStep": "The corresponding review step is shown.", "review.documentUpdating": "Updating the document…", "review.autosaveFailed": "Automatic save failed.", "review.autosaveRetry": "Automatic save failed. Try saving again.", "review.autosaving": "The change is saved automatically.", "review.annotationSaving": "Saving annotations…", "review.annotationSaved": "Annotations are saved.", "review.mixed": "Mixed", "review.loadingContext": "Loading screenshots and process context…", "review.openedPartial": "The document opened, but screenshots or process context could not be loaded.", "library.emptySessions": "No sessions have been saved yet.", "library.review": "Review", "library.exportZip": "Export ZIP", "common.delete": "Delete", "library.recentBugReport": "Bug report opened", "library.recentDocument": "Documentation opened", "library.selectionCleared": "Document selection cleared.", "library.selectedCount": "{count} documents selected.", "library.confirmWordExport": "Export {count} documents to separate Word files? The documents will not be changed. Choose Cancel to stop before export starts.", "session.recording": "Recording", "session.ended": "Ended" }),
    "fr-FR": Object.freeze({ "review.footerCurrentStep": "L’étape correspondante à vérifier est affichée.", "review.documentUpdating": "Mise à jour du document…", "review.autosaveFailed": "L’enregistrement automatique a échoué.", "review.autosaveRetry": "L’enregistrement automatique a échoué. Réessayez.", "review.autosaving": "La modification est enregistrée automatiquement.", "review.annotationSaving": "Enregistrement des annotations…", "review.annotationSaved": "Les annotations sont enregistrées.", "review.mixed": "Mixte", "review.loadingContext": "Chargement des captures d’écran et du contexte du processus…", "review.openedPartial": "Le document est ouvert, mais les captures d’écran ou le contexte du processus n’ont pas pu être chargés.", "library.emptySessions": "Aucune session n’a encore été enregistrée.", "library.review": "Vérifier", "library.exportZip": "Exporter en ZIP", "common.delete": "Supprimer", "library.recentBugReport": "Rapport de bogue ouvert", "library.recentDocument": "Documentation ouverte", "library.selectionCleared": "Sélection de documents effacée.", "library.selectedCount": "{count} documents sélectionnés.", "library.confirmWordExport": "Exporter {count} documents dans des fichiers Word séparés ? Les documents ne seront pas modifiés. Choisissez Annuler pour arrêter avant le début de l’export.", "session.recording": "En cours", "session.ended": "Terminé" }),
    "de-DE": Object.freeze({ "review.footerCurrentStep": "Der entsprechende Prüfschritt wird angezeigt.", "review.documentUpdating": "Dokument wird aktualisiert…", "review.autosaveFailed": "Automatisches Speichern fehlgeschlagen.", "review.autosaveRetry": "Automatisches Speichern fehlgeschlagen. Bitte erneut speichern.", "review.autosaving": "Die Änderung wird automatisch gespeichert.", "review.annotationSaving": "Anmerkungen werden gespeichert…", "review.annotationSaved": "Anmerkungen wurden gespeichert.", "review.mixed": "Gemischt", "review.loadingContext": "Screenshots und Prozesskontext werden geladen…", "review.openedPartial": "Das Dokument wurde geöffnet, aber Screenshots oder Prozesskontext konnten nicht geladen werden.", "library.emptySessions": "Es wurden noch keine Sitzungen gespeichert.", "library.review": "Prüfen", "library.exportZip": "ZIP exportieren", "common.delete": "Löschen", "library.recentBugReport": "Fehlerbericht geöffnet", "library.recentDocument": "Dokumentation geöffnet", "library.selectionCleared": "Dokumentauswahl aufgehoben.", "library.selectedCount": "{count} Dokumente ausgewählt.", "library.confirmWordExport": "{count} Dokumente in separate Word-Dateien exportieren? Die Dokumente werden nicht geändert. Wählen Sie Abbrechen, um vor dem Export zu stoppen.", "session.recording": "Wird aufgezeichnet", "session.ended": "Beendet" }),
    "es-ES": Object.freeze({ "review.footerCurrentStep": "Se muestra el paso de revisión correspondiente.", "review.documentUpdating": "Actualizando el documento…", "review.autosaveFailed": "No se pudo guardar automáticamente.", "review.autosaveRetry": "No se pudo guardar automáticamente. Inténtelo de nuevo.", "review.autosaving": "El cambio se guarda automáticamente.", "review.annotationSaving": "Guardando anotaciones…", "review.annotationSaved": "Las anotaciones se han guardado.", "review.mixed": "Mixto", "review.loadingContext": "Cargando capturas de pantalla y contexto del proceso…", "review.openedPartial": "El documento se abrió, pero no se pudieron cargar las capturas o el contexto del proceso.", "library.emptySessions": "Todavía no se ha guardado ninguna sesión.", "library.review": "Revisar", "library.exportZip": "Exportar ZIP", "common.delete": "Eliminar", "library.recentBugReport": "Informe de error abierto", "library.recentDocument": "Documentación abierta", "library.selectionCleared": "Se ha borrado la selección de documentos.", "library.selectedCount": "{count} documentos seleccionados.", "library.confirmWordExport": "¿Exportar {count} documentos a archivos Word independientes? No se modificarán los documentos. Elija Cancelar para detenerlo antes de iniciar la exportación.", "session.recording": "En curso", "session.ended": "Finalizada" }),
    "da-DK": Object.freeze({ "review.footerCurrentStep": "Det tilsvarende gennemgangstrin vises.", "review.documentUpdating": "Opdaterer dokumentet…", "review.autosaveFailed": "Automatisk lagring mislykkedes.", "review.autosaveRetry": "Automatisk lagring mislykkedes. Prøv at gemme igen.", "review.autosaving": "Ændringen gemmes automatisk.", "review.annotationSaving": "Gemmer annoteringer…", "review.annotationSaved": "Annoteringerne er gemt.", "review.mixed": "Blandet", "review.loadingContext": "Indlæser skærmbilleder og proceskontekst…", "review.openedPartial": "Dokumentationen blev åbnet, men skærmbilleder eller proceskontekst kunne ikke indlæses.", "library.emptySessions": "Der er ikke gemt nogen sessioner endnu.", "library.review": "Gennemgå", "library.exportZip": "Eksportér ZIP", "common.delete": "Slet", "library.recentBugReport": "Fejlrapport åbnet", "library.recentDocument": "Dokumentation åbnet", "library.selectionCleared": "Dokumentvalget er ryddet.", "library.selectedCount": "{count} dokumenter valgt.", "library.confirmWordExport": "Eksportér {count} dokumenter til separate Word-filer? Dokumenterne ændres ikke. Vælg Annuller for at stoppe, før eksporten starter.", "session.recording": "I gang", "session.ended": "Afsluttet" }),
    "fi-FI": Object.freeze({ "review.footerCurrentStep": "Vastaava tarkistusvaihe on näkyvissä.", "review.documentUpdating": "Päivitetään asiakirjaa…", "review.autosaveFailed": "Automaattinen tallennus epäonnistui.", "review.autosaveRetry": "Automaattinen tallennus epäonnistui. Yritä tallentaa uudelleen.", "review.autosaving": "Muutos tallennetaan automaattisesti.", "review.annotationSaving": "Tallennetaan merkintöjä…", "review.annotationSaved": "Merkinnät on tallennettu.", "review.mixed": "Sekoitettu", "review.loadingContext": "Ladataan näyttökuvia ja prosessin kontekstia…", "review.openedPartial": "Asiakirja avattiin, mutta näyttökuvia tai prosessin kontekstia ei voitu ladata.", "library.emptySessions": "Istuntoja ei ole vielä tallennettu.", "library.review": "Tarkista", "library.exportZip": "Vie ZIP-tiedostona", "common.delete": "Poista", "library.recentBugReport": "Virheraportti avattiin", "library.recentDocument": "Dokumentaatio avattiin", "library.selectionCleared": "Asiakirjavalinta tyhjennettiin.", "library.selectedCount": "{count} asiakirjaa valittu.", "library.confirmWordExport": "Viedäänkö {count} asiakirjaa erillisiksi Word-tiedostoiksi? Asiakirjoja ei muuteta. Valitse Peruuta, jos haluat pysäyttää viennin ennen sen alkamista.", "session.recording": "Tallennetaan", "session.ended": "Päättynyt" }),
    "nb-NO": Object.freeze({ "review.footerCurrentStep": "Det tilsvarende gjennomgangstrinnet vises.", "review.documentUpdating": "Oppdaterer dokumentet…", "review.autosaveFailed": "Automatisk lagring mislyktes.", "review.autosaveRetry": "Automatisk lagring mislyktes. Prøv å lagre på nytt.", "review.autosaving": "Endringen lagres automatisk.", "review.annotationSaving": "Lagrer merknader…", "review.annotationSaved": "Merknadene er lagret.", "review.mixed": "Blandet", "review.loadingContext": "Laster inn skjermbilder og prosesskontekst…", "review.openedPartial": "Dokumentasjonen ble åpnet, men skjermbilder eller prosesskontekst kunne ikke lastes inn.", "library.emptySessions": "Ingen økter er lagret ennå.", "library.review": "Gjennomgå", "library.exportZip": "Eksporter ZIP", "common.delete": "Slett", "library.recentBugReport": "Feilrapport åpnet", "library.recentDocument": "Dokumentasjon åpnet", "library.selectionCleared": "Dokumentvalget ble tømt.", "library.selectedCount": "{count} dokumenter valgt.", "library.confirmWordExport": "Eksporter {count} dokumenter til separate Word-filer? Dokumentene endres ikke. Velg Avbryt for å stoppe før eksporten starter.", "session.recording": "Pågår", "session.ended": "Avsluttet" })
  });
  const libraryConfirmationMessages = Object.freeze({
    "sv-SE": Object.freeze({ "library.deleteSessionConfirm": "Ta bort sessionen ”{name}”?", "library.archiveCountConfirm": "Arkivera {count} dokument? Åtgärden ändrar endast metadata och kan ångras.", "library.deleteCountConfirm": "Ta bort {count} dokument och tillhörande sessioner permanent? Den här åtgärden kan inte ångras." }),
    "en-US": Object.freeze({ "library.deleteSessionConfirm": "Delete session “{name}”?", "library.archiveCountConfirm": "Archive {count} documents? This only changes metadata and can be undone.", "library.deleteCountConfirm": "Permanently delete {count} documents and their related sessions? This cannot be undone." }),
    "fr-FR": Object.freeze({ "library.deleteSessionConfirm": "Supprimer la session « {name} » ?", "library.archiveCountConfirm": "Archiver {count} documents ? Seules les métadonnées seront modifiées ; l’action peut être annulée.", "library.deleteCountConfirm": "Supprimer définitivement {count} documents et les sessions associées ? Cette action est irréversible." }),
    "de-DE": Object.freeze({ "library.deleteSessionConfirm": "Sitzung „{name}“ löschen?", "library.archiveCountConfirm": "{count} Dokumente archivieren? Dabei werden nur Metadaten geändert; der Vorgang kann rückgängig gemacht werden.", "library.deleteCountConfirm": "{count} Dokumente und zugehörige Sitzungen endgültig löschen? Dieser Vorgang kann nicht rückgängig gemacht werden." }),
    "es-ES": Object.freeze({ "library.deleteSessionConfirm": "¿Eliminar la sesión «{name}»?", "library.archiveCountConfirm": "¿Archivar {count} documentos? Solo se cambiarán los metadatos y se puede deshacer.", "library.deleteCountConfirm": "¿Eliminar permanentemente {count} documentos y sus sesiones relacionadas? Esta acción no se puede deshacer." }),
    "da-DK": Object.freeze({ "library.deleteSessionConfirm": "Slet sessionen ”{name}”?", "library.archiveCountConfirm": "Arkivér {count} dokumenter? Kun metadata ændres, og handlingen kan fortrydes.", "library.deleteCountConfirm": "Slet {count} dokumenter og tilhørende sessioner permanent? Handlingen kan ikke fortrydes." }),
    "fi-FI": Object.freeze({ "library.deleteSessionConfirm": "Poistetaanko istunto ”{name}”?", "library.archiveCountConfirm": "Arkistoidaanko {count} asiakirjaa? Vain metatiedot muuttuvat, ja toiminnon voi kumota.", "library.deleteCountConfirm": "Poistetaanko {count} asiakirjaa ja niihin liittyvät istunnot pysyvästi? Tätä ei voi kumota." }),
    "nb-NO": Object.freeze({ "library.deleteSessionConfirm": "Slette økten «{name}»?", "library.archiveCountConfirm": "Arkivere {count} dokumenter? Bare metadata endres, og handlingen kan angres.", "library.deleteCountConfirm": "Slette {count} dokumenter og tilhørende økter permanent? Dette kan ikke angres." })
  });
  const reviewErrorMessages = Object.freeze({
    "sv-SE": Object.freeze({ "review.annotationCanceled": "Pågående markering avbröts.", "review.closeFailed": "Det gick inte att stänga: {detail}" }),
    "en-US": Object.freeze({ "review.annotationCanceled": "Annotation was canceled.", "review.closeFailed": "Could not close: {detail}" }),
    "fr-FR": Object.freeze({ "review.annotationCanceled": "L’annotation a été annulée.", "review.closeFailed": "Impossible de fermer : {detail}" }),
    "de-DE": Object.freeze({ "review.annotationCanceled": "Die Anmerkung wurde abgebrochen.", "review.closeFailed": "Schließen nicht möglich: {detail}" }),
    "es-ES": Object.freeze({ "review.annotationCanceled": "Se canceló la anotación.", "review.closeFailed": "No se pudo cerrar: {detail}" }),
    "da-DK": Object.freeze({ "review.annotationCanceled": "Annoteringen blev annulleret.", "review.closeFailed": "Kunne ikke lukke: {detail}" }),
    "fi-FI": Object.freeze({ "review.annotationCanceled": "Merkintä peruutettiin.", "review.closeFailed": "Sulkeminen ei onnistunut: {detail}" }),
    "nb-NO": Object.freeze({ "review.annotationCanceled": "Merknaden ble avbrutt.", "review.closeFailed": "Kunne ikke lukke: {detail}" })
  });
  const libraryBatchMessages = Object.freeze({
    "sv-SE": Object.freeze({ "library.noMetadataChanges": "Inga metadataändringar behövdes.", "library.batchFavourited": "✓ {count} dokument favoritmarkerades.", "library.batchMetadataUpdated": "✓ Metadata uppdaterades för {count} dokument.", "library.batchArchived": "✓ {count} dokument arkiverades.", "library.exportProgress": "Exporterar {current} av {total}: {title}.", "library.exportComplete": "✓ {count} dokument exporterades.", "library.exportFailureDetail": "{count} dokument exporterades innan felet.", "library.exportAborted": "Exporten avbröts efter {current} av {total} dokument.", "library.deleteFailed": "Ett dokument kunde inte tas bort.", "library.searchCleared": "Sökningen rensades." }),
    "en-US": Object.freeze({ "library.noMetadataChanges": "No metadata changes were needed.", "library.batchFavourited": "✓ Documents added to favourites: {count}.", "library.batchMetadataUpdated": "✓ Documents with updated metadata: {count}.", "library.batchArchived": "✓ Documents archived: {count}.", "library.exportProgress": "Exporting {current} of {total}: {title}.", "library.exportComplete": "✓ Documents exported: {count}.", "library.exportFailureDetail": "Documents exported before the error: {count}.", "library.exportAborted": "Export stopped after {current} of {total} documents.", "library.deleteFailed": "A document could not be deleted.", "library.searchCleared": "Search cleared." }),
    "fr-FR": Object.freeze({ "library.noMetadataChanges": "Aucune modification des métadonnées n’était nécessaire.", "library.batchFavourited": "✓ Documents ajoutés aux favoris : {count}.", "library.batchMetadataUpdated": "✓ Documents dont les métadonnées ont été mises à jour : {count}.", "library.batchArchived": "✓ Documents archivés : {count}.", "library.exportProgress": "Exportation {current} sur {total} : {title}.", "library.exportComplete": "✓ Documents exportés : {count}.", "library.exportFailureDetail": "Documents exportés avant l’erreur : {count}.", "library.exportAborted": "Exportation arrêtée après {current} sur {total} documents.", "library.deleteFailed": "Impossible de supprimer un document.", "library.searchCleared": "Recherche effacée." }),
    "de-DE": Object.freeze({ "library.noMetadataChanges": "Es waren keine Metadatenänderungen erforderlich.", "library.batchFavourited": "✓ Zu Favoriten hinzugefügte Dokumente: {count}.", "library.batchMetadataUpdated": "✓ Dokumente mit aktualisierten Metadaten: {count}.", "library.batchArchived": "✓ Archivierte Dokumente: {count}.", "library.exportProgress": "Export {current} von {total}: {title}.", "library.exportComplete": "✓ Exportierte Dokumente: {count}.", "library.exportFailureDetail": "Vor dem Fehler exportierte Dokumente: {count}.", "library.exportAborted": "Export nach {current} von {total} Dokumenten abgebrochen.", "library.deleteFailed": "Ein Dokument konnte nicht gelöscht werden.", "library.searchCleared": "Suche gelöscht." }),
    "es-ES": Object.freeze({ "library.noMetadataChanges": "No se necesitaban cambios en los metadatos.", "library.batchFavourited": "✓ Documentos añadidos a favoritos: {count}.", "library.batchMetadataUpdated": "✓ Documentos con metadatos actualizados: {count}.", "library.batchArchived": "✓ Documentos archivados: {count}.", "library.exportProgress": "Exportando {current} de {total}: {title}.", "library.exportComplete": "✓ Documentos exportados: {count}.", "library.exportFailureDetail": "Documentos exportados antes del error: {count}.", "library.exportAborted": "Exportación detenida tras {current} de {total} documentos.", "library.deleteFailed": "No se pudo eliminar un documento.", "library.searchCleared": "Búsqueda borrada." }),
    "da-DK": Object.freeze({ "library.noMetadataChanges": "Der var ikke brug for ændringer af metadata.", "library.batchFavourited": "✓ Dokumenter føjet til favoritter: {count}.", "library.batchMetadataUpdated": "✓ Dokumenter med opdaterede metadata: {count}.", "library.batchArchived": "✓ Arkiverede dokumenter: {count}.", "library.exportProgress": "Eksporterer {current} af {total}: {title}.", "library.exportComplete": "✓ Eksporterede dokumenter: {count}.", "library.exportFailureDetail": "Dokumenter eksporteret før fejlen: {count}.", "library.exportAborted": "Eksporten stoppede efter {current} af {total} dokumenter.", "library.deleteFailed": "Et dokument kunne ikke slettes.", "library.searchCleared": "Søgningen er ryddet." }),
    "fi-FI": Object.freeze({ "library.noMetadataChanges": "Metatietojen muutoksia ei tarvittu.", "library.batchFavourited": "✓ Suosikkeihin lisätyt asiakirjat: {count}.", "library.batchMetadataUpdated": "✓ Asiakirjat, joiden metatiedot päivitettiin: {count}.", "library.batchArchived": "✓ Arkistoidut asiakirjat: {count}.", "library.exportProgress": "Viedään {current}/{total}: {title}.", "library.exportComplete": "✓ Viedyt asiakirjat: {count}.", "library.exportFailureDetail": "Ennen virhettä viedyt asiakirjat: {count}.", "library.exportAborted": "Vienti keskeytettiin kohdassa {current}/{total} asiakirjaa.", "library.deleteFailed": "Asiakirjaa ei voitu poistaa.", "library.searchCleared": "Haku tyhjennettiin." }),
    "nb-NO": Object.freeze({ "library.noMetadataChanges": "Ingen endringer i metadata var nødvendig.", "library.batchFavourited": "✓ Dokumenter lagt til i favoritter: {count}.", "library.batchMetadataUpdated": "✓ Dokumenter med oppdaterte metadata: {count}.", "library.batchArchived": "✓ Arkiverte dokumenter: {count}.", "library.exportProgress": "Eksporterer {current} av {total}: {title}.", "library.exportComplete": "✓ Eksporterte dokumenter: {count}.", "library.exportFailureDetail": "Dokumenter eksportert før feilen: {count}.", "library.exportAborted": "Eksporten ble stoppet etter {current} av {total} dokumenter.", "library.deleteFailed": "Et dokument kunne ikke slettes.", "library.searchCleared": "Søket ble tømt." })
  });
  const dashboardOperationMessages = Object.freeze({
    "sv-SE": Object.freeze({ "library.exportPreparing": "Förbereder export av ”{title}”…", "library.exportSessionCreated": "ZIP-export skapad i UI Fidelity-läge: {events} råhändelser blev {steps} arbetssteg och {images} bilder.", "review.renderFallback": "Stegen visas i säkert läge. Renderingsfel: {reason}", "review.savedNotice": "Granskningen för ”{title}” har sparats.", "review.preparing": "Förbereder granskning av ”{title}”…", "review.screenshotRepaired": "Stegets skärmbild har reparerats.", "review.screenshotAnnotationBlock": "Skärmbilden har annoteringar. Ta bort eller byt annoteringarna först.", "review.structureReset": "Dokumentstrukturen återställdes till genererad struktur.", "review.expectedReset": "Förväntat resultat återställdes till standardtexten." }),
    "en-US": Object.freeze({ "library.exportPreparing": "Preparing export for “{title}”…", "library.exportSessionCreated": "ZIP export created in UI Fidelity mode: {events} raw events became {steps} work steps and {images} images.", "review.renderFallback": "Steps are shown in safe mode. Rendering error: {reason}", "review.savedNotice": "The review for “{title}” has been saved.", "review.preparing": "Preparing review for “{title}”…", "review.screenshotRepaired": "The step screenshot has been repaired.", "review.screenshotAnnotationBlock": "This screenshot has annotations. Remove or replace them first.", "review.structureReset": "Document structure was reset to the generated structure.", "review.expectedReset": "Expected result was reset to its default text." }),
    "fr-FR": Object.freeze({ "library.exportPreparing": "Préparation de l’export pour « {title} »…", "library.exportSessionCreated": "Export ZIP créé en mode UI Fidelity : {events} événements bruts sont devenus {steps} étapes et {images} images.", "review.renderFallback": "Les étapes s’affichent en mode sécurisé. Erreur de rendu : {reason}", "review.savedNotice": "La vérification de « {title} » a été enregistrée.", "review.preparing": "Préparation de la vérification de « {title} »…", "review.screenshotRepaired": "La capture d’écran de l’étape a été réparée.", "review.screenshotAnnotationBlock": "Cette capture contient des annotations. Supprimez-les ou remplacez la capture.", "review.structureReset": "La structure du document a été rétablie à sa version générée.", "review.expectedReset": "Le résultat attendu a été rétabli à sa valeur par défaut." }),
    "de-DE": Object.freeze({ "library.exportPreparing": "Export für „{title}“ wird vorbereitet …", "library.exportSessionCreated": "ZIP-Export im UI-Fidelity-Modus erstellt: Aus {events} Rohereignissen wurden {steps} Arbeitsschritte und {images} Bilder.", "review.renderFallback": "Schritte werden im sicheren Modus angezeigt. Darstellungsfehler: {reason}", "review.savedNotice": "Die Prüfung für „{title}“ wurde gespeichert.", "review.preparing": "Prüfung für „{title}“ wird vorbereitet …", "review.screenshotRepaired": "Der Screenshot des Schritts wurde repariert.", "review.screenshotAnnotationBlock": "Dieser Screenshot enthält Anmerkungen. Entfernen oder ersetzen Sie sie zuerst.", "review.structureReset": "Die Dokumentstruktur wurde auf die generierte Struktur zurückgesetzt.", "review.expectedReset": "Das erwartete Ergebnis wurde auf den Standardtext zurückgesetzt." }),
    "es-ES": Object.freeze({ "library.exportPreparing": "Preparando la exportación de «{title}»…", "library.exportSessionCreated": "ZIP creado en modo UI Fidelity: {events} eventos sin procesar se convirtieron en {steps} pasos de trabajo y {images} imágenes.", "review.renderFallback": "Los pasos se muestran en modo seguro. Error de representación: {reason}", "review.savedNotice": "Se ha guardado la revisión de «{title}».", "review.preparing": "Preparando la revisión de «{title}»…", "review.screenshotRepaired": "Se ha reparado la captura del paso.", "review.screenshotAnnotationBlock": "Esta captura tiene anotaciones. Elimínelas o sustitúyala primero.", "review.structureReset": "La estructura del documento se ha restablecido a la generada.", "review.expectedReset": "El resultado esperado se ha restablecido al texto predeterminado." }),
    "da-DK": Object.freeze({ "library.exportPreparing": "Forbereder eksport af ”{title}”…", "library.exportSessionCreated": "ZIP-eksport oprettet i UI Fidelity-tilstand: {events} råhændelser blev til {steps} arbejdstrin og {images} billeder.", "review.renderFallback": "Trinnene vises i sikker tilstand. Gengivelsesfejl: {reason}", "review.savedNotice": "Gennemgangen af ”{title}” er gemt.", "review.preparing": "Forbereder gennemgang af ”{title}”…", "review.screenshotRepaired": "Trinnets skærmbillede er repareret.", "review.screenshotAnnotationBlock": "Dette skærmbillede har annoteringer. Fjern eller erstat dem først.", "review.structureReset": "Dokumentstrukturen blev nulstillet til den genererede struktur.", "review.expectedReset": "Det forventede resultat blev nulstillet til standardteksten." }),
    "fi-FI": Object.freeze({ "library.exportPreparing": "Valmistellaan kohteen ”{title}” vientiä…", "library.exportSessionCreated": "ZIP-vienti luotiin UI Fidelity -tilassa: {events} raak tapahtumasta muodostui {steps} työvaihetta ja {images} kuvaa.", "review.renderFallback": "Vaiheet näytetään suojatussa tilassa. Hahmonnusvirhe: {reason}", "review.savedNotice": "Kohteen ”{title}” tarkistus tallennettiin.", "review.preparing": "Valmistellaan kohteen ”{title}” tarkistusta…", "review.screenshotRepaired": "Vaiheen näyttökuva korjattiin.", "review.screenshotAnnotationBlock": "Näyttökuvassa on merkintöjä. Poista ne tai vaihda kuva ensin.", "review.structureReset": "Asiakirjan rakenne palautettiin luotuun rakenteeseen.", "review.expectedReset": "Odotettu tulos palautettiin oletustekstiin." }),
    "nb-NO": Object.freeze({ "library.exportPreparing": "Forbereder eksport av «{title}»…", "library.exportSessionCreated": "ZIP-eksport opprettet i UI Fidelity-modus: {events} råhendelser ble til {steps} arbeidstrinn og {images} bilder.", "review.renderFallback": "Trinnene vises i sikker modus. Gjengivelsesfeil: {reason}", "review.savedNotice": "Gjennomgangen av «{title}» er lagret.", "review.preparing": "Forbereder gjennomgang av «{title}»…", "review.screenshotRepaired": "Skjermbildet for trinnet er reparert.", "review.screenshotAnnotationBlock": "Skjermbildet har merknader. Fjern eller bytt det først.", "review.structureReset": "Dokumentstrukturen ble tilbakestilt til den genererte strukturen.", "review.expectedReset": "Forventet resultat ble tilbakestilt til standardteksten." })
  });
  const libraryDeleteMessages = Object.freeze({
    "sv-SE": Object.freeze({ "library.batchDeleteComplete": "✓ Dokument borttagna: {count}.", "library.batchDeleteFailure": "Dokument som hann tas bort innan felet: {count}." }),
    "en-US": Object.freeze({ "library.batchDeleteComplete": "✓ Documents deleted: {count}.", "library.batchDeleteFailure": "Documents deleted before the error: {count}." }),
    "fr-FR": Object.freeze({ "library.batchDeleteComplete": "✓ Documents supprimés : {count}.", "library.batchDeleteFailure": "Documents supprimés avant l’erreur : {count}." }),
    "de-DE": Object.freeze({ "library.batchDeleteComplete": "✓ Gelöschte Dokumente: {count}.", "library.batchDeleteFailure": "Vor dem Fehler gelöschte Dokumente: {count}." }),
    "es-ES": Object.freeze({ "library.batchDeleteComplete": "✓ Documentos eliminados: {count}.", "library.batchDeleteFailure": "Documentos eliminados antes del error: {count}." }),
    "da-DK": Object.freeze({ "library.batchDeleteComplete": "✓ Slettede dokumenter: {count}.", "library.batchDeleteFailure": "Dokumenter slettet før fejlen: {count}." }),
    "fi-FI": Object.freeze({ "library.batchDeleteComplete": "✓ Poistetut asiakirjat: {count}.", "library.batchDeleteFailure": "Ennen virhettä poistetut asiakirjat: {count}." }),
    "nb-NO": Object.freeze({ "library.batchDeleteComplete": "✓ Slettede dokumenter: {count}.", "library.batchDeleteFailure": "Dokumenter slettet før feilen: {count}." })
  });
  const processMapMessages = Object.freeze({
    "sv-SE": Object.freeze({ "processMap.fit": "Anpassa", "processMap.automatic": "Automatisk", "processMap.vertical": "Lodrät", "processMap.direction": "Välj processkartans riktning", "processMap.layout": "Layout", "processMap.theme": "Tema", "processMap.chooseTheme": "Välj processkartans visuella tema", "processMap.standard": "Standard", "processMap.compact": "Kompakt", "processMap.density": "Täthet", "processMap.chooseDensity": "Välj processkartans täthet", "processMap.references": "Visa referensförslag", "processMap.focus": "Fokusläge", "processMap.closeFocus": "Stäng fokus", "processMap.search": "Sök i kartan", "processMap.searchPlaceholder": "Steg, dokument eller åtgärd", "processMap.nextMatch": "Nästa träff", "processMap.fitTitle": "Anpassa hela processkartan till tillgänglig bredd", "processMap.zoomOut": "Zooma ut processkartan", "processMap.zoomIn": "Zooma in processkartan", "processMap.resetZoom": "Återställ processkartan till 100 %", "processMap.size": "Processkartans storlek", "processMap.business": "Övergripande affärsflöde från den bekräftade processklassificeringen.", "processMap.businessCentral": "Business Central-dokument och åtgärder jämförda med referensprocessen.", "processMap.procedure": "Den faktiska inspelade användarproceduren. Välj en aktivitet för att öppna granskningssteget.", "processMap.horizontal": "Vågrät", "processMap.multiRow": "Flera rader", "processMap.branched": "Förgrenad", "processMap.verticalLayout": "Lodrät" }),
    "en-US": Object.freeze({ "processMap.fit": "Fit", "processMap.automatic": "Automatic", "processMap.vertical": "Vertical", "processMap.direction": "Choose process map direction", "processMap.layout": "Layout", "processMap.theme": "Theme", "processMap.chooseTheme": "Choose the process map visual theme", "processMap.standard": "Standard", "processMap.compact": "Compact", "processMap.density": "Density", "processMap.chooseDensity": "Choose process map density", "processMap.references": "Show reference suggestions", "processMap.focus": "Focus mode", "processMap.closeFocus": "Close focus", "processMap.search": "Search map", "processMap.searchPlaceholder": "Step, document or action", "processMap.nextMatch": "Next match", "processMap.fitTitle": "Fit the complete process map to the available width", "processMap.zoomOut": "Zoom out the process map", "processMap.zoomIn": "Zoom in the process map", "processMap.resetZoom": "Reset the process map to 100%", "processMap.size": "Process map size", "processMap.business": "High-level business flow derived from the confirmed process classification.", "processMap.businessCentral": "Business Central documents and actions compared with the reference process.", "processMap.procedure": "The actual recorded user procedure. Select an activity to open its Review step.", "processMap.horizontal": "Horizontal", "processMap.multiRow": "Multi-row", "processMap.branched": "Branched", "processMap.verticalLayout": "Vertical" }),
    "fr-FR": Object.freeze({ "processMap.fit": "Ajuster", "processMap.automatic": "Automatique", "processMap.vertical": "Vertical", "processMap.direction": "Choisir l’orientation de la carte des processus", "processMap.layout": "Disposition", "processMap.theme": "Thème", "processMap.chooseTheme": "Choisir le thème visuel de la carte", "processMap.standard": "Standard", "processMap.compact": "Compact", "processMap.density": "Densité", "processMap.chooseDensity": "Choisir la densité de la carte", "processMap.references": "Afficher les suggestions de référence", "processMap.focus": "Mode focus", "processMap.closeFocus": "Fermer le focus", "processMap.search": "Rechercher dans la carte", "processMap.searchPlaceholder": "Étape, document ou action", "processMap.nextMatch": "Résultat suivant", "processMap.fitTitle": "Adapter toute la carte à la largeur disponible", "processMap.zoomOut": "Réduire le zoom de la carte", "processMap.zoomIn": "Agrandir le zoom de la carte", "processMap.resetZoom": "Rétablir le zoom à 100 %", "processMap.size": "Taille de la carte des processus", "processMap.business": "Vue d’ensemble du processus métier selon la classification confirmée.", "processMap.businessCentral": "Documents et actions Business Central comparés au processus de référence.", "processMap.procedure": "Procédure réellement enregistrée. Sélectionnez une activité pour ouvrir l’étape à vérifier.", "processMap.horizontal": "Horizontal", "processMap.multiRow": "Plusieurs lignes", "processMap.branched": "Avec branches", "processMap.verticalLayout": "Vertical" }),
    "de-DE": Object.freeze({ "processMap.fit": "Einpassen", "processMap.automatic": "Automatisch", "processMap.vertical": "Vertikal", "processMap.direction": "Ausrichtung der Prozessübersicht wählen", "processMap.layout": "Layout", "processMap.theme": "Design", "processMap.chooseTheme": "Visuelles Design der Prozessübersicht wählen", "processMap.standard": "Standard", "processMap.compact": "Kompakt", "processMap.density": "Dichte", "processMap.chooseDensity": "Dichte der Prozessübersicht wählen", "processMap.references": "Referenzvorschläge anzeigen", "processMap.focus": "Fokusmodus", "processMap.closeFocus": "Fokus schließen", "processMap.search": "Übersicht durchsuchen", "processMap.searchPlaceholder": "Schritt, Dokument oder Aktion", "processMap.nextMatch": "Nächster Treffer", "processMap.fitTitle": "Gesamte Prozessübersicht an die verfügbare Breite anpassen", "processMap.zoomOut": "Prozessübersicht verkleinern", "processMap.zoomIn": "Prozessübersicht vergrößern", "processMap.resetZoom": "Zoom auf 100 % zurücksetzen", "processMap.size": "Größe der Prozessübersicht", "processMap.business": "Geschäftsablauf auf hoher Ebene gemäß bestätigter Prozessklassifizierung.", "processMap.businessCentral": "Business-Central-Dokumente und Aktionen im Vergleich zum Referenzprozess.", "processMap.procedure": "Tatsächlich aufgezeichnetes Verfahren. Wählen Sie eine Aktivität, um den Prüfschritt zu öffnen.", "processMap.horizontal": "Horizontal", "processMap.multiRow": "Mehrere Zeilen", "processMap.branched": "Verzweigt", "processMap.verticalLayout": "Vertikal" }),
    "es-ES": Object.freeze({ "processMap.fit": "Ajustar", "processMap.automatic": "Automático", "processMap.vertical": "Vertical", "processMap.direction": "Elegir la dirección del mapa de procesos", "processMap.layout": "Diseño", "processMap.theme": "Tema", "processMap.chooseTheme": "Elegir el tema visual del mapa", "processMap.standard": "Estándar", "processMap.compact": "Compacto", "processMap.density": "Densidad", "processMap.chooseDensity": "Elegir la densidad del mapa", "processMap.references": "Mostrar sugerencias de referencia", "processMap.focus": "Modo de enfoque", "processMap.closeFocus": "Cerrar enfoque", "processMap.search": "Buscar en el mapa", "processMap.searchPlaceholder": "Paso, documento o acción", "processMap.nextMatch": "Siguiente coincidencia", "processMap.fitTitle": "Ajustar todo el mapa al ancho disponible", "processMap.zoomOut": "Alejar el mapa de procesos", "processMap.zoomIn": "Acercar el mapa de procesos", "processMap.resetZoom": "Restablecer el zoom al 100 %", "processMap.size": "Tamaño del mapa de procesos", "processMap.business": "Flujo empresarial general según la clasificación confirmada.", "processMap.businessCentral": "Documentos y acciones de Business Central comparados con el proceso de referencia.", "processMap.procedure": "Procedimiento real grabado. Seleccione una actividad para abrir el paso de revisión.", "processMap.horizontal": "Horizontal", "processMap.multiRow": "Varias filas", "processMap.branched": "Ramificado", "processMap.verticalLayout": "Vertical" }),
    "da-DK": Object.freeze({ "processMap.fit": "Tilpas", "processMap.automatic": "Automatisk", "processMap.vertical": "Lodret", "processMap.direction": "Vælg proceskortets retning", "processMap.layout": "Layout", "processMap.theme": "Tema", "processMap.chooseTheme": "Vælg proceskortets visuelle tema", "processMap.standard": "Standard", "processMap.compact": "Kompakt", "processMap.density": "Tæthed", "processMap.chooseDensity": "Vælg proceskortets tæthed", "processMap.references": "Vis referenceforslag", "processMap.focus": "Fokustilstand", "processMap.closeFocus": "Luk fokus", "processMap.search": "Søg i kortet", "processMap.searchPlaceholder": "Trin, dokument eller handling", "processMap.nextMatch": "Næste match", "processMap.fitTitle": "Tilpas hele proceskortet til den tilgængelige bredde", "processMap.zoomOut": "Zoom ud på proceskortet", "processMap.zoomIn": "Zoom ind på proceskortet", "processMap.resetZoom": "Nulstil zoom til 100 %", "processMap.size": "Proceskortets størrelse", "processMap.business": "Overordnet forretningsflow ud fra den bekræftede procesklassifikation.", "processMap.businessCentral": "Business Central-dokumenter og handlinger sammenlignet med referenceprocessen.", "processMap.procedure": "Den faktisk optagede procedure. Vælg en aktivitet for at åbne gennemgangstrinnet.", "processMap.horizontal": "Vandret", "processMap.multiRow": "Flere rækker", "processMap.branched": "Forgrenet", "processMap.verticalLayout": "Lodret" }),
    "fi-FI": Object.freeze({ "processMap.fit": "Sovita", "processMap.automatic": "Automaattinen", "processMap.vertical": "Pystysuora", "processMap.direction": "Valitse prosessikartan suunta", "processMap.layout": "Asettelu", "processMap.theme": "Teema", "processMap.chooseTheme": "Valitse prosessikartan visuaalinen teema", "processMap.standard": "Tavallinen", "processMap.compact": "Tiivis", "processMap.density": "Tiheys", "processMap.chooseDensity": "Valitse prosessikartan tiheys", "processMap.references": "Näytä viite-ehdotukset", "processMap.focus": "Kohdistustila", "processMap.closeFocus": "Sulje kohdistus", "processMap.search": "Hae kartasta", "processMap.searchPlaceholder": "Vaihe, asiakirja tai toiminto", "processMap.nextMatch": "Seuraava osuma", "processMap.fitTitle": "Sovita koko prosessikartta käytettävissä olevaan leveyteen", "processMap.zoomOut": "Loitonna prosessikarttaa", "processMap.zoomIn": "Lähennä prosessikarttaa", "processMap.resetZoom": "Palauta zoomaus 100 prosenttiin", "processMap.size": "Prosessikartan koko", "processMap.business": "Yleiskuva työnkulusta vahvistetun prosessiluokituksen perusteella.", "processMap.businessCentral": "Business Central -asiakirjoja ja toimintoja verrataan viiteprosessiin.", "processMap.procedure": "Todellinen tallennettu menettely. Avaa tarkistusvaihe valitsemalla toiminto.", "processMap.horizontal": "Vaakasuora", "processMap.multiRow": "Useita rivejä", "processMap.branched": "Haarautuva", "processMap.verticalLayout": "Pystysuora" }),
    "nb-NO": Object.freeze({ "processMap.fit": "Tilpass", "processMap.automatic": "Automatisk", "processMap.vertical": "Loddrett", "processMap.direction": "Velg retning for prosesskartet", "processMap.layout": "Oppsett", "processMap.theme": "Tema", "processMap.chooseTheme": "Velg visuelt tema for prosesskartet", "processMap.standard": "Standard", "processMap.compact": "Kompakt", "processMap.density": "Tetthet", "processMap.chooseDensity": "Velg tetthet for prosesskartet", "processMap.references": "Vis referanseforslag", "processMap.focus": "Fokusmodus", "processMap.closeFocus": "Lukk fokus", "processMap.search": "Søk i kartet", "processMap.searchPlaceholder": "Trinn, dokument eller handling", "processMap.nextMatch": "Neste treff", "processMap.fitTitle": "Tilpass hele prosesskartet til tilgjengelig bredde", "processMap.zoomOut": "Zoom ut på prosesskartet", "processMap.zoomIn": "Zoom inn på prosesskartet", "processMap.resetZoom": "Tilbakestill zoom til 100 %", "processMap.size": "Størrelsen på prosesskartet", "processMap.business": "Overordnet forretningsflyt basert på bekreftet prosessklassifisering.", "processMap.businessCentral": "Business Central-dokumenter og handlinger sammenlignet med referanseprosessen.", "processMap.procedure": "Den faktiske innspilte prosedyren. Velg en aktivitet for å åpne gjennomgangstrinnet.", "processMap.horizontal": "Vannrett", "processMap.multiRow": "Flere rader", "processMap.branched": "Forgrenet", "processMap.verticalLayout": "Loddrett" })
  });
  const processMapViewMessages = Object.freeze({
    "sv-SE": Object.freeze({ "processMap.routeTo": "{label} till {target}", "processMap.overview": "Översikt över processkartan", "processMap.mapOverview": "Kartöversikt", "processMap.goToStep": "Gå till steg", "processMap.noActivities": "Det finns inga processaktiviteter att visa.", "processMap.otherSteps": "Övriga steg", "processMap.role.purchasing": "Inköp", "processMap.role.warehouse": "Lager", "processMap.role.sales": "Försäljning", "processMap.role.production": "Produktion", "processMap.role.finance": "Ekonomi", "processMap.role.system": "System", "processMap.processFlow": "Processflöde", "processMap.step": "Steg", "processMap.drag": "Dra för att ändra position", "processMap.reviewed": "Granskad", "processMap.review": "Granska", "processMap.notReviewed": "Ej granskad", "processMap.observed": "Observerat", "processMap.referenceSuggestion": "Referensförslag", "processMap.conditional": "Villkorligt steg", "processMap.customerSpecific": "Kundunikt", "processMap.reference": "Referens", "processMap.selectedDecision": "Valt beslut", "processMap.selectedActivity": "Vald aktivitet", "processMap.routes": "Vägar", "processMap.observedChanges": "Observerade förändringar", "processMap.noStateChange": "Ingen observerad statusförändring är kopplad till aktiviteten.", "processMap.changesTo": "ändras till", "processMap.on": "På", "processMap.off": "Av", "processMap.visible": "Synlig", "processMap.closed": "Stängd", "processMap.whatActionDoes": "Vad åtgärden innebär", "processMap.source": "Källa" }),
    "en-US": Object.freeze({ "processMap.routeTo": "{label} to {target}", "processMap.overview": "Process map overview", "processMap.mapOverview": "Map overview", "processMap.goToStep": "Go to step", "processMap.noActivities": "No process activities are available.", "processMap.otherSteps": "Other steps", "processMap.role.purchasing": "Purchasing", "processMap.role.warehouse": "Warehouse", "processMap.role.sales": "Sales", "processMap.role.production": "Production", "processMap.role.finance": "Finance", "processMap.role.system": "System", "processMap.processFlow": "Process flow", "processMap.step": "Step", "processMap.drag": "Drag to change position", "processMap.reviewed": "Reviewed", "processMap.review": "Review", "processMap.notReviewed": "Not reviewed", "processMap.observed": "Observed", "processMap.referenceSuggestion": "Reference suggestion", "processMap.conditional": "Conditional step", "processMap.customerSpecific": "Customer-specific", "processMap.reference": "Reference", "processMap.selectedDecision": "Selected decision", "processMap.selectedActivity": "Selected activity", "processMap.routes": "Routes", "processMap.observedChanges": "Observed changes", "processMap.noStateChange": "No observed state change is linked to this activity.", "processMap.changesTo": "changes to", "processMap.on": "On", "processMap.off": "Off", "processMap.visible": "Visible", "processMap.closed": "Closed", "processMap.whatActionDoes": "What this action does", "processMap.source": "Source" }),
    "fr-FR": Object.freeze({ "processMap.routeTo": "{label} : {target}", "processMap.overview": "Vue d’ensemble de la carte des processus", "processMap.mapOverview": "Vue d’ensemble", "processMap.goToStep": "Aller à l’étape", "processMap.noActivities": "Aucune activité de processus n’est disponible.", "processMap.otherSteps": "Autres étapes", "processMap.role.purchasing": "Achats", "processMap.role.warehouse": "Entrepôt", "processMap.role.sales": "Ventes", "processMap.role.production": "Production", "processMap.role.finance": "Finance", "processMap.role.system": "Système", "processMap.processFlow": "Flux du processus", "processMap.step": "Étape", "processMap.drag": "Faire glisser pour modifier la position", "processMap.reviewed": "Vérifié", "processMap.review": "À vérifier", "processMap.notReviewed": "Non vérifié", "processMap.observed": "Observé", "processMap.referenceSuggestion": "Suggestion de référence", "processMap.conditional": "Étape conditionnelle", "processMap.customerSpecific": "Spécifique au client", "processMap.reference": "Référence", "processMap.selectedDecision": "Décision sélectionnée", "processMap.selectedActivity": "Activité sélectionnée", "processMap.routes": "Parcours", "processMap.observedChanges": "Modifications observées", "processMap.noStateChange": "Aucun changement d’état observé n’est lié à cette activité.", "processMap.changesTo": "devient", "processMap.on": "Activé", "processMap.off": "Désactivé", "processMap.visible": "Visible", "processMap.closed": "Fermé", "processMap.whatActionDoes": "Rôle de cette action", "processMap.source": "Source" }),
    "de-DE": Object.freeze({ "processMap.routeTo": "{label}: weiter zu {target}", "processMap.overview": "Prozessübersicht", "processMap.mapOverview": "Kartenübersicht", "processMap.goToStep": "Zu Schritt", "processMap.noActivities": "Keine Prozessaktivitäten verfügbar.", "processMap.otherSteps": "Weitere Schritte", "processMap.role.purchasing": "Einkauf", "processMap.role.warehouse": "Lager", "processMap.role.sales": "Vertrieb", "processMap.role.production": "Produktion", "processMap.role.finance": "Finanzen", "processMap.role.system": "System", "processMap.processFlow": "Prozessablauf", "processMap.step": "Schritt", "processMap.drag": "Ziehen, um die Position zu ändern", "processMap.reviewed": "Geprüft", "processMap.review": "Prüfen", "processMap.notReviewed": "Nicht geprüft", "processMap.observed": "Beobachtet", "processMap.referenceSuggestion": "Referenzvorschlag", "processMap.conditional": "Bedingter Schritt", "processMap.customerSpecific": "Kundenspezifisch", "processMap.reference": "Referenz", "processMap.selectedDecision": "Ausgewählte Entscheidung", "processMap.selectedActivity": "Ausgewählte Aktivität", "processMap.routes": "Pfade", "processMap.observedChanges": "Beobachtete Änderungen", "processMap.noStateChange": "Dieser Aktivität ist keine beobachtete Statusänderung zugeordnet.", "processMap.changesTo": "ändert sich zu", "processMap.on": "Ein", "processMap.off": "Aus", "processMap.visible": "Sichtbar", "processMap.closed": "Geschlossen", "processMap.whatActionDoes": "Was diese Aktion bewirkt", "processMap.source": "Quelle" }),
    "es-ES": Object.freeze({ "processMap.routeTo": "{label}: ir a {target}", "processMap.overview": "Vista general del mapa de procesos", "processMap.mapOverview": "Vista general del mapa", "processMap.goToStep": "Ir al paso", "processMap.noActivities": "No hay actividades de proceso disponibles.", "processMap.otherSteps": "Otros pasos", "processMap.role.purchasing": "Compras", "processMap.role.warehouse": "Almacén", "processMap.role.sales": "Ventas", "processMap.role.production": "Producción", "processMap.role.finance": "Finanzas", "processMap.role.system": "Sistema", "processMap.processFlow": "Flujo del proceso", "processMap.step": "Paso", "processMap.drag": "Arrastrar para cambiar la posición", "processMap.reviewed": "Revisado", "processMap.review": "Revisar", "processMap.notReviewed": "Sin revisar", "processMap.observed": "Observado", "processMap.referenceSuggestion": "Sugerencia de referencia", "processMap.conditional": "Paso condicional", "processMap.customerSpecific": "Específico del cliente", "processMap.reference": "Referencia", "processMap.selectedDecision": "Decisión seleccionada", "processMap.selectedActivity": "Actividad seleccionada", "processMap.routes": "Rutas", "processMap.observedChanges": "Cambios observados", "processMap.noStateChange": "No hay ningún cambio de estado observado vinculado a esta actividad.", "processMap.changesTo": "cambia a", "processMap.on": "Activado", "processMap.off": "Desactivado", "processMap.visible": "Visible", "processMap.closed": "Cerrado", "processMap.whatActionDoes": "Qué hace esta acción", "processMap.source": "Origen" }),
    "da-DK": Object.freeze({ "processMap.routeTo": "{label} til {target}", "processMap.overview": "Oversigt over proceskortet", "processMap.mapOverview": "Kortoversigt", "processMap.goToStep": "Gå til trin", "processMap.noActivities": "Der er ingen procesaktiviteter at vise.", "processMap.otherSteps": "Andre trin", "processMap.role.purchasing": "Indkøb", "processMap.role.warehouse": "Lager", "processMap.role.sales": "Salg", "processMap.role.production": "Produktion", "processMap.role.finance": "Økonomi", "processMap.role.system": "System", "processMap.processFlow": "Procesforløb", "processMap.step": "Trin", "processMap.drag": "Træk for at ændre placering", "processMap.reviewed": "Gennemgået", "processMap.review": "Gennemgå", "processMap.notReviewed": "Ikke gennemgået", "processMap.observed": "Observeret", "processMap.referenceSuggestion": "Referenceforslag", "processMap.conditional": "Betinget trin", "processMap.customerSpecific": "Kundespecifik", "processMap.reference": "Reference", "processMap.selectedDecision": "Valgt beslutning", "processMap.selectedActivity": "Valgt aktivitet", "processMap.routes": "Forløb", "processMap.observedChanges": "Observerede ændringer", "processMap.noStateChange": "Der er ingen observeret statusændring knyttet til denne aktivitet.", "processMap.changesTo": "ændres til", "processMap.on": "Til", "processMap.off": "Fra", "processMap.visible": "Synlig", "processMap.closed": "Lukket", "processMap.whatActionDoes": "Hvad handlingen gør", "processMap.source": "Kilde" }),
    "fi-FI": Object.freeze({ "processMap.routeTo": "{label}: {target}", "processMap.overview": "Prosessikartan yleiskuva", "processMap.mapOverview": "Kartan yleiskuva", "processMap.goToStep": "Siirry vaiheeseen", "processMap.noActivities": "Prosessin toimintoja ei ole saatavilla.", "processMap.otherSteps": "Muut vaiheet", "processMap.role.purchasing": "Ostot", "processMap.role.warehouse": "Varasto", "processMap.role.sales": "Myynti", "processMap.role.production": "Tuotanto", "processMap.role.finance": "Talous", "processMap.role.system": "Järjestelmä", "processMap.processFlow": "Prosessin kulku", "processMap.step": "Vaihe", "processMap.drag": "Muuta sijaintia vetämällä", "processMap.reviewed": "Tarkistettu", "processMap.review": "Tarkista", "processMap.notReviewed": "Ei tarkistettu", "processMap.observed": "Havaittu", "processMap.referenceSuggestion": "Viite-ehdotus", "processMap.conditional": "Ehdollinen vaihe", "processMap.customerSpecific": "Asiakaskohtainen", "processMap.reference": "Viite", "processMap.selectedDecision": "Valittu päätös", "processMap.selectedActivity": "Valittu toiminto", "processMap.routes": "Reitit", "processMap.observedChanges": "Havaitut muutokset", "processMap.noStateChange": "Tähän toimintoon ei liity havaittua tilamuutosta.", "processMap.changesTo": "muuttuu", "processMap.on": "Käytössä", "processMap.off": "Pois käytöstä", "processMap.visible": "Näkyvissä", "processMap.closed": "Suljettu", "processMap.whatActionDoes": "Toiminnon kuvaus", "processMap.source": "Lähde" }),
    "nb-NO": Object.freeze({ "processMap.routeTo": "{label} til {target}", "processMap.overview": "Oversikt over prosesskartet", "processMap.mapOverview": "Kartoversikt", "processMap.goToStep": "Gå til trinn", "processMap.noActivities": "Ingen prosessaktiviteter er tilgjengelige.", "processMap.otherSteps": "Andre trinn", "processMap.role.purchasing": "Innkjøp", "processMap.role.warehouse": "Lager", "processMap.role.sales": "Salg", "processMap.role.production": "Produksjon", "processMap.role.finance": "Økonomi", "processMap.role.system": "System", "processMap.processFlow": "Prosessflyt", "processMap.step": "Trinn", "processMap.drag": "Dra for å endre plassering", "processMap.reviewed": "Gjennomgått", "processMap.review": "Gjennomgå", "processMap.notReviewed": "Ikke gjennomgått", "processMap.observed": "Observert", "processMap.referenceSuggestion": "Referanseforslag", "processMap.conditional": "Betinget trinn", "processMap.customerSpecific": "Kundespesifikt", "processMap.reference": "Referanse", "processMap.selectedDecision": "Valgt beslutning", "processMap.selectedActivity": "Valgt aktivitet", "processMap.routes": "Ruter", "processMap.observedChanges": "Observerte endringer", "processMap.noStateChange": "Ingen observert statusendring er knyttet til denne aktiviteten.", "processMap.changesTo": "endres til", "processMap.on": "På", "processMap.off": "Av", "processMap.visible": "Synlig", "processMap.closed": "Lukket", "processMap.whatActionDoes": "Hva handlingen gjør", "processMap.source": "Kilde" })
  });
  const processRouteMessages = Object.freeze({
    "sv-SE": Object.freeze({ "processRoute.sequence": "Nästa", "processRoute.branch": "Gren", "processRoute.conditional": "Villkor", "processRoute.alternate": "Alternativ", "processRoute.loop": "Upprepa", "processRoute.return": "Tillbaka", "processRoute.creates": "Skapar", "processRoute.posts": "Bokför som", "processRoute.unknown": "Flöde" }),
    "en-US": Object.freeze({ "processRoute.sequence": "Next", "processRoute.branch": "Branch", "processRoute.conditional": "Condition", "processRoute.alternate": "Alternative", "processRoute.loop": "Repeat", "processRoute.return": "Return", "processRoute.creates": "Creates", "processRoute.posts": "Posts as", "processRoute.unknown": "Flow" }),
    "fr-FR": Object.freeze({ "processRoute.sequence": "Suivant", "processRoute.branch": "Branche", "processRoute.conditional": "Condition", "processRoute.alternate": "Alternative", "processRoute.loop": "Répéter", "processRoute.return": "Retour", "processRoute.creates": "Crée", "processRoute.posts": "Comptabilise en tant que", "processRoute.unknown": "Flux" }),
    "de-DE": Object.freeze({ "processRoute.sequence": "Weiter", "processRoute.branch": "Abzweigung", "processRoute.conditional": "Bedingung", "processRoute.alternate": "Alternative", "processRoute.loop": "Wiederholen", "processRoute.return": "Zurück", "processRoute.creates": "Erstellt", "processRoute.posts": "Bucht als", "processRoute.unknown": "Ablauf" }),
    "es-ES": Object.freeze({ "processRoute.sequence": "Siguiente", "processRoute.branch": "Rama", "processRoute.conditional": "Condición", "processRoute.alternate": "Alternativa", "processRoute.loop": "Repetir", "processRoute.return": "Volver", "processRoute.creates": "Crea", "processRoute.posts": "Registra como", "processRoute.unknown": "Flujo" }),
    "da-DK": Object.freeze({ "processRoute.sequence": "Næste", "processRoute.branch": "Gren", "processRoute.conditional": "Betingelse", "processRoute.alternate": "Alternativ", "processRoute.loop": "Gentag", "processRoute.return": "Tilbage", "processRoute.creates": "Opretter", "processRoute.posts": "Bogføres som", "processRoute.unknown": "Flow" }),
    "fi-FI": Object.freeze({ "processRoute.sequence": "Seuraava", "processRoute.branch": "Haara", "processRoute.conditional": "Ehto", "processRoute.alternate": "Vaihtoehto", "processRoute.loop": "Toista", "processRoute.return": "Palaa", "processRoute.creates": "Luo", "processRoute.posts": "Kirjataan muodossa", "processRoute.unknown": "Kulku" }),
    "nb-NO": Object.freeze({ "processRoute.sequence": "Neste", "processRoute.branch": "Gren", "processRoute.conditional": "Betingelse", "processRoute.alternate": "Alternativ", "processRoute.loop": "Gjenta", "processRoute.return": "Tilbake", "processRoute.creates": "Oppretter", "processRoute.posts": "Bokføres som", "processRoute.unknown": "Flyt" })
  });
  const processVersionMessages = Object.freeze({
    "sv-SE": Object.freeze({ "processVersion.current": "Aktuellt", "processVersion.added": "Tillagda", "processVersion.removed": "Borttagna", "processVersion.modified": "Ändrade", "processVersion.moved": "Flyttade", "processVersion.routes": "Vägar", "processVersion.states": "Tillstånd", "processVersion.changes": "Processändringar", "processVersion.semanticOnly": "Endast semantiska processändringar visas.", "processVersion.none": "Inga semantiska processändringar." }),
    "en-US": Object.freeze({ "processVersion.current": "Current", "processVersion.added": "Added", "processVersion.removed": "Removed", "processVersion.modified": "Modified", "processVersion.moved": "Moved", "processVersion.routes": "Routes", "processVersion.states": "States", "processVersion.changes": "Process changes", "processVersion.semanticOnly": "Only semantic process changes are shown.", "processVersion.none": "No semantic process changes." }),
    "fr-FR": Object.freeze({ "processVersion.current": "Actuelle", "processVersion.added": "Ajoutés", "processVersion.removed": "Supprimés", "processVersion.modified": "Modifiés", "processVersion.moved": "Déplacés", "processVersion.routes": "Parcours", "processVersion.states": "États", "processVersion.changes": "Modifications du processus", "processVersion.semanticOnly": "Seules les modifications sémantiques du processus sont affichées.", "processVersion.none": "Aucune modification sémantique du processus." }),
    "de-DE": Object.freeze({ "processVersion.current": "Aktuell", "processVersion.added": "Hinzugefügt", "processVersion.removed": "Entfernt", "processVersion.modified": "Geändert", "processVersion.moved": "Verschoben", "processVersion.routes": "Pfade", "processVersion.states": "Status", "processVersion.changes": "Prozessänderungen", "processVersion.semanticOnly": "Es werden nur semantische Prozessänderungen angezeigt.", "processVersion.none": "Keine semantischen Prozessänderungen." }),
    "es-ES": Object.freeze({ "processVersion.current": "Actual", "processVersion.added": "Añadidos", "processVersion.removed": "Eliminados", "processVersion.modified": "Modificados", "processVersion.moved": "Movidos", "processVersion.routes": "Rutas", "processVersion.states": "Estados", "processVersion.changes": "Cambios del proceso", "processVersion.semanticOnly": "Solo se muestran los cambios semánticos del proceso.", "processVersion.none": "No hay cambios semánticos en el proceso." }),
    "da-DK": Object.freeze({ "processVersion.current": "Aktuel", "processVersion.added": "Tilføjet", "processVersion.removed": "Fjernet", "processVersion.modified": "Ændret", "processVersion.moved": "Flyttet", "processVersion.routes": "Forløb", "processVersion.states": "Tilstande", "processVersion.changes": "Procesændringer", "processVersion.semanticOnly": "Kun semantiske procesændringer vises.", "processVersion.none": "Ingen semantiske procesændringer." }),
    "fi-FI": Object.freeze({ "processVersion.current": "Nykyinen", "processVersion.added": "Lisätyt", "processVersion.removed": "Poistetut", "processVersion.modified": "Muokatut", "processVersion.moved": "Siirretyt", "processVersion.routes": "Reitit", "processVersion.states": "Tilat", "processVersion.changes": "Prosessimuutokset", "processVersion.semanticOnly": "Vain prosessin semanttiset muutokset näytetään.", "processVersion.none": "Prosessissa ei ole semanttisia muutoksia." }),
    "nb-NO": Object.freeze({ "processVersion.current": "Gjeldende", "processVersion.added": "Lagt til", "processVersion.removed": "Fjernet", "processVersion.modified": "Endret", "processVersion.moved": "Flyttet", "processVersion.routes": "Ruter", "processVersion.states": "Tilstander", "processVersion.changes": "Prosessendringer", "processVersion.semanticOnly": "Bare semantiske prosessendringer vises.", "processVersion.none": "Ingen semantiske prosessendringer." })
  });
  const processThemeMessages = Object.freeze({
    "sv-SE": Object.freeze({ "processTheme.businessCentral": "Business Central", "processTheme.neutral": "Neutral", "processTheme.monochrome": "Monokrom" }),
    "en-US": Object.freeze({ "processTheme.businessCentral": "Business Central", "processTheme.neutral": "Neutral", "processTheme.monochrome": "Monochrome" }),
    "fr-FR": Object.freeze({ "processTheme.businessCentral": "Business Central", "processTheme.neutral": "Neutre", "processTheme.monochrome": "Monochrome" }),
    "de-DE": Object.freeze({ "processTheme.businessCentral": "Business Central", "processTheme.neutral": "Neutral", "processTheme.monochrome": "Monochrom" }),
    "es-ES": Object.freeze({ "processTheme.businessCentral": "Business Central", "processTheme.neutral": "Neutro", "processTheme.monochrome": "Monocromo" }),
    "da-DK": Object.freeze({ "processTheme.businessCentral": "Business Central", "processTheme.neutral": "Neutral", "processTheme.monochrome": "Monokrom" }),
    "fi-FI": Object.freeze({ "processTheme.businessCentral": "Business Central", "processTheme.neutral": "Neutraali", "processTheme.monochrome": "Mustavalkoinen" }),
    "nb-NO": Object.freeze({ "processTheme.businessCentral": "Business Central", "processTheme.neutral": "Nøytral", "processTheme.monochrome": "Monokrom" })
  });
  const processAnalysisKeys = Object.freeze([
    "detected", "unknownDomain", "match", "confirmedConfidence", "matchDegree",
    "confirmed", "matched", "missing", "conditional", "additional", "advisory",
    "matchedSteps", "missingSteps", "conditionalSteps", "referenceComparison",
    "referenceComparisonHelp", "additionalSteps", "noConditional", "none", "noMissing",
    "noAdditional", "alternatives", "noAlternatives", "noMatchTitle", "noMatchText",
    "auto-classifiable", "review-required", "insufficient-evidence", "manual-confirmed",
    "confirmationRecommended", "strongEvidence", "configurationVariant", "variantUncertain",
    "variantSupported", "variantConfirmed", "variantAlternatives", "mostLikely",
    "evidenceTitle", "evidenceDocuments", "evidenceActions", "evidenceQuality",
    "observedPrecision", "referenceCoverage", "candidateMargin", "percentagePoints",
    "evidenceNone", "quality-strong", "quality-moderate", "quality-weak"
  ]);
  const processAnalysisRows = Object.freeze({
    "sv-SE": ["Identifierad referensprocess", "Domän inte identifierad", "matchning", "manuellt bekräftad", "Klassificeringssäkerhet", "Klassificeringen är manuellt bekräftad", "Matchade", "Möjligen saknade", "Villkorliga", "Kundunika", "Skillnader är vägledning, inte fel. Den inspelade processen kan vara en giltig kundvariant.", "Matchade steg", "Möjligen saknade steg", "Konfigurationsberoende referenssteg", "Jämför med andra Business Central-konfigurationer", "Dessa referenssteg observerades inte i inspelningen och tas inte med i processkartan.", "Kundunika steg", "Inga konfigurationsberoende steg", "Inga", "Inga förväntade steg saknas", "Inga extra steg", "Alternativa referensprocesser", "Inga relevanta alternativ", "Ingen säker processmatchning", "Inspelningen är fortfarande giltig och kan klassificeras manuellt senare.", "Starkt processunderlag", "Behöver bekräftas", "Otillräckligt processunderlag", "Manuellt vald process", "Bekräfta klassificeringen innan den används.", "Klassificeringen stöds av flera oberoende signaler.", "Business Central-konfiguration", "Flera konfigurationer passar inspelningen. Andra konfigurationssteg finns i referensjämförelsen.", "Den observerade sekvensen stöder denna konfigurationsvariant.", "Konfigurationen valdes manuellt och styr nu processkartan.", "Andra möjliga konfigurationer", "Mest sannolik", "Varför denna bedömning?", "Business Central-dokument", "Affärsåtgärder", "Underlagskvalitet", "Träff på observerade steg", "Täckning av referensprocess", "Försprång till nästa kandidat", "procentenheter", "Inget identifierat", "Starkt", "Måttligt", "Svagt"],
    "en-US": ["Detected reference process", "Domain not identified", "match", "manually confirmed", "Classification confidence", "Classification confirmed manually", "Matched", "Possible missing", "Conditional", "Customer-specific", "Differences are guidance, not errors. The recorded process may be a valid customer variant.", "Matched steps", "Possible missing steps", "Configuration-dependent reference steps", "Compare with other Business Central configurations", "These reference steps were not observed in the recording and are not included in the process map.", "Customer-specific steps", "No configuration-dependent steps", "None", "No expected steps are missing", "No additional steps", "Alternative reference processes", "No relevant alternatives", "No reliable process match", "The recording remains valid and can be classified manually later.", "Strong process evidence", "Needs confirmation", "Insufficient process evidence", "Manually selected process", "Confirm the classification before using it.", "The classification is supported by several independent signals.", "Business Central configuration", "Several configurations fit the recording. Other configuration steps are available in the reference comparison.", "The observed sequence supports this configuration variant.", "This configuration was selected manually and now controls the process map.", "Other possible configurations", "Most likely", "Why this assessment?", "Business Central documents", "Business actions", "Evidence quality", "Observed steps fit", "Reference process covered", "Lead over next candidate", "percentage points", "None detected", "Strong", "Moderate", "Weak"],
    "fr-FR": ["Processus de référence détecté", "Domaine non identifié", "correspondance", "confirmée manuellement", "Niveau de confiance de la classification", "Classification confirmée manuellement", "Correspondances", "Éléments possiblement manquants", "Conditionnel", "Spécifique au client", "Les différences sont des indications, pas des erreurs. Le processus enregistré peut être une variante valide du client.", "Étapes correspondantes", "Étapes possiblement manquantes", "Étapes de référence dépendantes de la configuration", "Comparer avec d’autres configurations Business Central", "Ces étapes de référence n’ont pas été observées et ne figurent pas dans la carte du processus.", "Étapes spécifiques au client", "Aucune étape dépendante de la configuration", "Aucun", "Aucune étape attendue ne manque", "Aucune étape supplémentaire", "Autres processus de référence", "Aucune autre référence pertinente", "Aucune correspondance fiable", "L’enregistrement reste valide et pourra être classé manuellement ultérieurement.", "Indices solides sur le processus", "Confirmation requise", "Indices insuffisants sur le processus", "Processus sélectionné manuellement", "Confirmez la classification avant de l’utiliser.", "Plusieurs signaux indépendants étayent cette classification.", "Configuration Business Central", "Plusieurs configurations correspondent. D’autres étapes figurent dans la comparaison de référence.", "La séquence observée correspond à cette variante de configuration.", "Cette configuration a été choisie manuellement et pilote désormais la carte.", "Autres configurations possibles", "La plus probable", "Pourquoi cette évaluation ?", "Documents Business Central", "Actions métier", "Qualité des éléments", "Correspondance des étapes observées", "Couverture du processus de référence", "Écart avec la référence suivante", "points de pourcentage", "Aucun élément détecté", "Élevée", "Moyenne", "Faible"],
    "de-DE": ["Erkannter Referenzprozess", "Domäne nicht erkannt", "Übereinstimmung", "manuell bestätigt", "Klassifizierungssicherheit", "Klassifizierung manuell bestätigt", "Übereinstimmungen", "Möglicherweise fehlend", "Bedingt", "Kundenspezifisch", "Unterschiede sind Hinweise, keine Fehler. Der aufgezeichnete Prozess kann eine gültige Kundenvariante sein.", "Übereinstimmende Schritte", "Möglicherweise fehlende Schritte", "Konfigurationsabhängige Referenzschritte", "Mit anderen Business-Central-Konfigurationen vergleichen", "Diese Referenzschritte wurden nicht aufgezeichnet und sind nicht in der Prozessübersicht enthalten.", "Kundenspezifische Schritte", "Keine konfigurationsabhängigen Schritte", "Keine", "Es fehlen keine erwarteten Schritte", "Keine zusätzlichen Schritte", "Alternative Referenzprozesse", "Keine relevanten Alternativen", "Keine zuverlässige Prozessübereinstimmung", "Die Aufzeichnung bleibt gültig und kann später manuell klassifiziert werden.", "Starke Prozesshinweise", "Bestätigung erforderlich", "Unzureichende Prozesshinweise", "Manuell ausgewählter Prozess", "Bestätigen Sie die Klassifizierung, bevor Sie sie verwenden.", "Mehrere unabhängige Signale stützen die Klassifizierung.", "Business-Central-Konfiguration", "Mehrere Konfigurationen passen. Weitere Konfigurationsschritte finden Sie im Referenzvergleich.", "Die beobachtete Abfolge stützt diese Konfigurationsvariante.", "Diese Konfiguration wurde manuell gewählt und steuert jetzt die Prozessübersicht.", "Weitere mögliche Konfigurationen", "Am wahrscheinlichsten", "Warum diese Bewertung?", "Business-Central-Dokumente", "Geschäftsaktionen", "Qualität der Nachweise", "Passung der beobachteten Schritte", "Abdeckung des Referenzprozesses", "Vorsprung vor dem nächsten Kandidaten", "Prozentpunkte", "Keine erkannt", "Stark", "Mittel", "Schwach"],
    "es-ES": ["Proceso de referencia detectado", "Dominio no identificado", "coincidencia", "confirmada manualmente", "Confianza de la clasificación", "Clasificación confirmada manualmente", "Coincidentes", "Posibles ausencias", "Condicionales", "Específicos del cliente", "Las diferencias son orientativas, no errores. El proceso grabado puede ser una variante válida del cliente.", "Pasos coincidentes", "Posibles pasos ausentes", "Pasos de referencia dependientes de la configuración", "Comparar con otras configuraciones de Business Central", "Estos pasos de referencia no se observaron y no se incluyen en el mapa del proceso.", "Pasos específicos del cliente", "No hay pasos dependientes de la configuración", "Ninguno", "No falta ningún paso previsto", "No hay pasos adicionales", "Procesos de referencia alternativos", "No hay alternativas relevantes", "No hay una coincidencia fiable del proceso", "La grabación sigue siendo válida y se puede clasificar manualmente más adelante.", "Evidencia sólida del proceso", "Requiere confirmación", "Evidencia insuficiente del proceso", "Proceso seleccionado manualmente", "Confirme la clasificación antes de utilizarla.", "La clasificación se apoya en varias señales independientes.", "Configuración de Business Central", "Varias configuraciones encajan. Hay otros pasos en la comparación de referencia.", "La secuencia observada respalda esta variante de configuración.", "Esta configuración se seleccionó manualmente y ahora controla el mapa del proceso.", "Otras configuraciones posibles", "Más probable", "¿Por qué esta evaluación?", "Documentos de Business Central", "Acciones empresariales", "Calidad de la evidencia", "Ajuste de los pasos observados", "Cobertura del proceso de referencia", "Ventaja sobre el siguiente candidato", "puntos porcentuales", "Ninguna detectada", "Sólida", "Moderada", "Débil"],
    "da-DK": ["Registreret referenceproces", "Domæne ikke identificeret", "match", "bekræftet manuelt", "Klassifikationssikkerhed", "Klassifikation bekræftet manuelt", "Matchede", "Muligvis manglende", "Betingede", "Kundespecifikke", "Forskelle er vejledning, ikke fejl. Den optagede proces kan være en gyldig kundeversion.", "Matchede trin", "Muligvis manglende trin", "Konfigurationsafhængige referencetrin", "Sammenlign med andre Business Central-konfigurationer", "Disse referencetrin blev ikke observeret og vises ikke på proceskortet.", "Kundespecifikke trin", "Ingen konfigurationsafhængige trin", "Ingen", "Ingen forventede trin mangler", "Ingen ekstra trin", "Alternative referenceprocesser", "Ingen relevante alternativer", "Intet pålideligt procesmatch", "Optagelsen er stadig gyldig og kan klassificeres manuelt senere.", "Stærke procesindikationer", "Skal bekræftes", "Utilstrækkelige procesindikationer", "Manuelt valgt proces", "Bekræft klassifikationen, før den bruges.", "Klassifikationen understøttes af flere uafhængige signaler.", "Business Central-konfiguration", "Flere konfigurationer passer. Andre konfigurationstrin findes i referencesammenligningen.", "Den observerede rækkefølge understøtter denne konfigurationsvariant.", "Denne konfiguration blev valgt manuelt og styrer nu proceskortet.", "Andre mulige konfigurationer", "Mest sandsynlige", "Hvorfor denne vurdering?", "Business Central-dokumenter", "Forretningshandlinger", "Evidenskvalitet", "Match af observerede trin", "Dækning af referenceproces", "Forspring til næste kandidat", "procentpoint", "Ingen registreret", "Stærk", "Middel", "Svag"],
    "fi-FI": ["Tunnistettu viiteprosessi", "Toimialuetta ei tunnistettu", "vastaavuus", "vahvistettu manuaalisesti", "Luokituksen varmuus", "Luokitus vahvistettu manuaalisesti", "Vastaavat", "Mahdollisesti puuttuvat", "Ehdolliset", "Asiakaskohtaiset", "Erot ovat ohjeita, eivät virheitä. Tallennettu prosessi voi olla kelvollinen asiakasvariantti.", "Vastaavat vaiheet", "Mahdollisesti puuttuvat vaiheet", "Määrityksestä riippuvat viitevaiheet", "Vertaa muihin Business Central -määrityksiin", "Näitä viitevaiheita ei havaittu tallenteessa eikä niitä näytetä prosessikartassa.", "Asiakaskohtaiset vaiheet", "Ei määrityksestä riippuvia vaiheita", "Ei mitään", "Odotettuja vaiheita ei puutu", "Ei lisävaiheita", "Vaihtoehtoiset viiteprosessit", "Ei sopivia vaihtoehtoja", "Luotettavaa prosessivastaavuutta ei löytynyt", "Tallenne on kelvollinen, ja se voidaan luokitella myöhemmin manuaalisesti.", "Vahva näyttö prosessista", "Vahvistettava", "Riittämätön näyttö prosessista", "Manuaalisesti valittu prosessi", "Vahvista luokitus ennen käyttöä.", "Luokitusta tukee useita riippumattomia signaaleja.", "Business Central -määritys", "Tallenteeseen sopii useita määrityksiä. Muita määritysvaiheita voi tarkastella viitevertailussa.", "Havaittu järjestys tukee tätä määritysvarianttia.", "Tämä määritys valittiin manuaalisesti, ja se ohjaa nyt prosessikarttaa.", "Muut mahdolliset määritykset", "Todennäköisin", "Miksi tämä arvio?", "Business Central -asiakirjat", "Liiketoiminnot", "Näytön laatu", "Havaittujen vaiheiden vastaavuus", "Viiteprosessin kattavuus", "Ero seuraavaan ehdokkaaseen", "prosenttiyksikköä", "Ei havaittu", "Vahva", "Kohtalainen", "Heikko"],
    "nb-NO": ["Identifisert referanseprosess", "Område ikke identifisert", "treff", "bekreftet manuelt", "Klassifiseringssikkerhet", "Klassifisering bekreftet manuelt", "Samsvarende", "Mulig manglende", "Betingede", "Kundespesifikke", "Forskjeller er veiledning, ikke feil. Den registrerte prosessen kan være en gyldig kundevariant.", "Samsvarende trinn", "Mulig manglende trinn", "Konfigurasjonsavhengige referansetrinn", "Sammenlign med andre Business Central-konfigurasjoner", "Disse referansetrinnene ble ikke observert og vises ikke i prosesskartet.", "Kundespesifikke trinn", "Ingen konfigurasjonsavhengige trinn", "Ingen", "Ingen forventede trinn mangler", "Ingen ekstra trinn", "Alternative referanseprosesser", "Ingen relevante alternativer", "Ingen pålitelig prosesstreff", "Opptaket er fortsatt gyldig og kan klassifiseres manuelt senere.", "Sterke prosessignaler", "Må bekreftes", "Utilstrekkelige prosessignaler", "Manuelt valgt prosess", "Bekreft klassifiseringen før du bruker den.", "Flere uavhengige signaler støtter klassifiseringen.", "Business Central-konfigurasjon", "Flere konfigurasjoner passer. Andre konfigurasjonstrinn finnes i referansesammenligningen.", "Den observerte sekvensen støtter denne konfigurasjonsvarianten.", "Denne konfigurasjonen ble valgt manuelt og styrer nå prosesskartet.", "Andre mulige konfigurasjoner", "Mest sannsynlig", "Hvorfor denne vurderingen?", "Business Central-dokumenter", "Forretningshandlinger", "Beviskvalitet", "Treff for observerte trinn", "Dekning av referanseprosessen", "Forspring til neste kandidat", "prosentpoeng", "Ingen registrert", "Sterk", "Middels", "Svak"]
  });
  const processAnalysisMessages = Object.freeze(Object.fromEntries(
    Object.entries(processAnalysisRows).map(([locale, values]) => {
      if (values.length !== processAnalysisKeys.length) throw new Error(
        `Process analysis translation count mismatch for ${locale}.`);
      return [locale, Object.freeze(Object.fromEntries(processAnalysisKeys.map((key, index) =>
        [`processAnalysis.${key}`, values[index]])))];
    })
  ));
  const processMapEditorMessages = Object.freeze({
    "sv-SE": Object.freeze({ "processMapEditor.newConnection": "Ny koppling", "processMapEditor.match": "träff", "processMapEditor.matches": "träffar" }),
    "en-US": Object.freeze({ "processMapEditor.newConnection": "New connection", "processMapEditor.match": "match", "processMapEditor.matches": "matches" }),
    "fr-FR": Object.freeze({ "processMapEditor.newConnection": "Nouvelle connexion", "processMapEditor.match": "résultat", "processMapEditor.matches": "résultats" }),
    "de-DE": Object.freeze({ "processMapEditor.newConnection": "Neue Verbindung", "processMapEditor.match": "Treffer", "processMapEditor.matches": "Treffer" }),
    "es-ES": Object.freeze({ "processMapEditor.newConnection": "Nueva conexión", "processMapEditor.match": "coincidencia", "processMapEditor.matches": "coincidencias" }),
    "da-DK": Object.freeze({ "processMapEditor.newConnection": "Ny forbindelse", "processMapEditor.match": "resultat", "processMapEditor.matches": "resultater" }),
    "fi-FI": Object.freeze({ "processMapEditor.newConnection": "Uusi yhteys", "processMapEditor.match": "osuma", "processMapEditor.matches": "osumaa" }),
    "nb-NO": Object.freeze({ "processMapEditor.newConnection": "Ny forbindelse", "processMapEditor.match": "treff", "processMapEditor.matches": "treff" })
  });
  const processAnalysisQualifierKeys = Object.freeze([
    "shipment", "receipt", "invoice", "pick", "put-away", "assembly",
    "consumption", "output", "transfer"
  ]);
  const processAnalysisQualifierRows = Object.freeze({
    "sv-SE": ["leverans", "inleverans", "faktura", "plockning", "inlagring", "montering", "förbrukning", "utflöde", "överföring"],
    "en-US": ["shipment", "receipt", "invoice", "pick", "put-away", "assembly", "consumption", "output", "transfer"],
    "fr-FR": ["expédition", "réception", "facture", "prélèvement", "rangement", "assemblage", "consommation", "production", "transfert"],
    "de-DE": ["Versand", "Wareneingang", "Rechnung", "Kommissionierung", "Einlagerung", "Montage", "Verbrauch", "Produktion", "Umlagerung"],
    "es-ES": ["envío", "recepción", "factura", "picking", "ubicación", "ensamblaje", "consumo", "producción", "transferencia"],
    "da-DK": ["forsendelse", "modtagelse", "faktura", "pluk", "indlagring", "samling", "forbrug", "produktion", "overførsel"],
    "fi-FI": ["lähetys", "vastaanotto", "lasku", "keräily", "hyllytys", "kokoonpano", "kulutus", "tuotanto", "siirto"],
    "nb-NO": ["forsendelse", "mottak", "faktura", "plukk", "innlagring", "montering", "forbruk", "produksjon", "overføring"]
  });
  const processAnalysisQualifierMessages = Object.freeze(Object.fromEntries(
    Object.entries(processAnalysisQualifierRows).map(([locale, values]) => {
      if (values.length !== processAnalysisQualifierKeys.length) throw new Error(
        `Process analysis qualifier translation count mismatch for ${locale}.`);
      return [locale, Object.freeze(Object.fromEntries(processAnalysisQualifierKeys.map((key, index) =>
        [`processAnalysis.actionQualifiers.${key}`, values[index]])))];
    })
  ));
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
      "license.cardTitle": "Licens för den här Business Central-tenanten",
      "license.cardUnknown": "Öppna Business Central för att kontrollera licensen.",
      "license.cardCheckFailed": "Licensen kunde inte kontrolleras. Försök igen.",
      "license.cardNeedsConsent": "Godkänn licensregistreringen för att kontrollera licensen.",
      "license.cardActive": "Aktiv licens",
      "license.cardTrialAvailable": "Ingen aktiv licens. Logga in för att starta en 30-dagars trial.",
      "license.cardTrialReady": "Ingen aktiv licens. Din tenant kan få en 30-dagars trial. Starta den nedan.",
      "license.cardStartTrial": "Starta 30-dagars trial",
      "license.cardSignInTrial": "Logga in och aktivera 30-dagars trial",
      "license.trialServiceUnavailable": "Licenstjänsten kunde inte nås. Kontrollera anslutningen och försök igen. Du behöver inte logga in igen.",
      "license.trialServiceTimeout": "Licenstjänsten svarade inte i tid. Vänta en stund och kontrollera licensen igen. Du behöver inte logga in igen.",
      "license.microsoftUnavailable": "Microsofts inloggningstjänst kunde inte nås. Kontrollera anslutningen och försök igen.",
      "license.cardNoTrial": "Ingen aktiv licens eller tillgänglig trial. Kontakta administratören.",
      "license.cardSignInHelp": "Logga in med Microsoft för att kontrollera licensen och aktivera en trial om tenant är berättigad.",
      "license.cardOpenBc": "Öppna en Business Central-tenant först.",
      "license.cardWorking": "Kontrollerar licens och loggar in …",
      "license.cardSignIn": "Logga in och kontrollera licens",
      "license.signInRequired": "Logga in med Microsoft innan du startar en inspelning i Business Central.",
      "license.acceptBeforeRecording": "Bekräfta licensregistreringen i tilläggets popup innan du startar inspelningen.",
      "license.tenantUrlRequired": "Licensen kräver en Business Central-adress med tenant-ID.",
      "license.invalidEndpoint": "Ogiltig HTTPS-adress för licenstjänsten.",
      "license.serviceUnavailable": "Licenstjänsten kunde inte nås. Försök igen senare.",
      "license.invalidResponse": "Licenstjänsten gav ett ogiltigt svar.",
      "license.acceptBeforeTrial": "Bekräfta licensregistreringen innan du begär en testlicens.",
      "license.trialTenantUrlRequired": "Testlicensen kräver en Business Central-adress med tenant-ID.",
      "license.trialSignInRequired": "Entra-inloggning krävs för att aktivera en testlicens.",
      "license.invalidTrialResponse": "Licenstjänsten gav ett ogiltigt eller utgånget svar.",
      "license.trialActivated": "30-dagars trial aktiverad för den här tenanten.",
      "license.signInComplete": "Microsoft-inloggningen är klar.",
      "license.signInFailed": "Microsoft-inloggningen kunde inte slutföras.",
      "license.userRegistrationFailed": "Användaren kunde inte registreras för tenantlicensen.",
      "license.trialFailed": "Triallicensen kunde inte aktiveras.",
      "license.noEligibleTrial": "Den här tenanten saknar en aktiv licens och kan inte starta en ny trial.",
      "license.trialType": "Trial · 30 dagar",
      "license.consultantType": "Konsultlicens",
      "license.standardType": "Ordinarie licens",
      "license.type": "Licenstyp",
      "license.validUntil": "Giltig till",
      "license.noExpiryDate": "Inget slutdatum",
      "license.registrationNotice": "BC Process Studio licenskontroll\n\nLicenskontrollen skickar installations-ID, Business Central tenant-ID och tilläggsversion till licenstjänsten. När du loggar in med Microsoft skickas namn, e-post/UPN, Entra tenant-ID och objekt-ID för användarregistrering och licensadministration. Vid nya sparade processdokument och felrapporter skickas dokumenttyp, skapandetid och ett hashat tekniskt ID för användningsstatistik. Dokumentinnehåll, inspelningar, bilder, företagsnamn och affärsdata skickas inte. Azure kan logga tekniska anslutningsuppgifter. Registreringsuppgifter har ingen automatisk gallringstid. En aktiv tenant får en 30-dagars trial första gången en användare loggar in.\n\nTjänst: {endpoint}",
      "license.acceptPrompt": "Godkänn registreringen och fortsätt?",
      "license.registrationCancelled": "Licensregistreringen avbröts. Inga uppgifter skickades.",
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
      "settings.appearanceHelp": "Gäller direkt för alla sidor i BC Process Studio i den här webbläsaren.",
      "settings.appearanceLight": "Ljust",
      "settings.appearanceSystem": "Följ systemet",
      "settings.appearanceDark": "Mörkt",
      "settings.appearance": "Utseende",
      "review.flowShare": "Dela",
      "review.flowReview": "Granska",
      "review.flowRecorded": "Spela in",
      "technical.regenerateConfirm": "Generera om hela rapporten från inspelningen? Manuella stegändringar och bildval ersätts. Titel, allvarlighetsgrad och förväntat resultat behålls.",
      "technical.telemetrySaved": "Telemetriinställningen har sparats. Ingen hemlighet eller token lagrades.",
      "technical.telemetryConnection": "Telemetrianslutning: {status}.",
      "technical.selectPrimaryError": "Välj ett primärt fel innan telemetrin uppdateras.",
      "technical.fetchingTelemetry": "Hämtar telemetri från den konfigurerade Microsoft-slutpunkten…",
      "technical.issueSubmissionTimeout": "Åtgärden tog för lång tid.",
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

    }),"en-US": Object.freeze({
      "license.cardTitle": "License for this Business Central tenant",
      "license.cardUnknown": "Open Business Central to check the license.",
      "license.cardCheckFailed": "The license could not be verified. Try again.",
      "license.cardNeedsConsent": "Accept license registration to check the license.",
      "license.cardActive": "License active",
      "license.cardTrialAvailable": "No active license. Sign in to start a 30-day trial.",
      "license.cardTrialReady": "No active license. This tenant is eligible for a 30-day trial. Start it below.",
      "license.cardStartTrial": "Start 30-day trial",
      "license.cardSignInTrial": "Sign in and start 30-day trial",
      "license.trialServiceUnavailable": "The license service could not be reached. Check your connection and try again. You do not need to sign in again.",
      "license.trialServiceTimeout": "The license service did not respond in time. Wait a moment and check the license again. You do not need to sign in again.",
      "license.microsoftUnavailable": "Microsoft sign-in could not be reached. Check your connection and try again.",
      "license.cardNoTrial": "No active license or available trial. Contact your administrator.",
      "license.cardSignInHelp": "Sign in with Microsoft to check the license and activate a trial if the tenant is eligible.",
      "license.cardOpenBc": "Open a Business Central tenant first.",
      "license.cardWorking": "Checking the license and signing in …",
      "license.cardSignIn": "Sign in and check license",
      "license.signInRequired": "Sign in with Microsoft before starting a Business Central recording.",
      "license.acceptBeforeRecording": "Confirm the license registration in the extension popup before you start recording.",
      "license.tenantUrlRequired": "The license requires a Business Central address that includes a tenant ID.",
      "license.invalidEndpoint": "The license service HTTPS address is invalid.",
      "license.serviceUnavailable": "The license service could not be reached. Try again later.",
      "license.invalidResponse": "The license service returned an invalid response.",
      "license.acceptBeforeTrial": "Confirm the license registration before you request a trial license.",
      "license.trialTenantUrlRequired": "The trial license requires a Business Central address that includes a tenant ID.",
      "license.trialSignInRequired": "Microsoft Entra sign-in is required to activate a trial license.",
      "license.invalidTrialResponse": "The license service returned an invalid or expired response.",
      "license.trialActivated": "A 30-day trial has been activated for this tenant.",
      "license.signInComplete": "Microsoft sign-in is complete.",
      "license.signInFailed": "Microsoft sign-in could not be completed.",
      "license.userRegistrationFailed": "The user could not be registered for the tenant license.",
      "license.trialFailed": "The trial license could not be activated.",
      "license.noEligibleTrial": "This tenant has no active license and cannot start a new trial.",
      "license.trialType": "Trial · 30 days",
      "license.consultantType": "Consultant license",
      "license.standardType": "Standard license",
      "license.type": "License type",
      "license.validUntil": "Valid until",
      "license.noExpiryDate": "No expiry date",
      "license.registrationNotice": "BC Process Studio licensing\n\nLicense checks send the installation ID, Business Central tenant ID and extension version to the licensing service. When you sign in with Microsoft, your name, email/UPN, Entra tenant ID and object ID are sent for user registration and license administration. For newly saved process documents and bug reports, the document type, creation time and a hashed technical ID are sent for usage statistics. Document content, recordings, images, company names and business data are not sent. Azure may log technical connection details. Registration data has no automatic deletion period. An eligible tenant receives a 30-day trial when a user signs in for the first time.\n\nService: {endpoint}",
      "license.acceptPrompt": "Accept registration and continue?",
      "license.registrationCancelled": "License registration was cancelled. No information was sent.",
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
      "settings.appearanceHelp": "Applies immediately to every BC Process Studio page in this browser.",
      "settings.appearanceLight": "Light",
      "settings.appearanceSystem": "Follow system",
      "settings.appearanceDark": "Dark",
      "settings.appearance": "Appearance",
      "review.flowShare": "Share",
      "review.flowReview": "Review",
      "review.flowRecorded": "Record",
      "technical.regenerateConfirm": "Regenerate the report from the recording? Manual step edits and image selections will be replaced. Title, severity and expected result are retained.",
      "technical.telemetrySaved": "Telemetry configuration saved. No secret or token was stored.",
      "technical.telemetryConnection": "Telemetry connection: {status}.",
      "technical.selectPrimaryError": "Select a primary error before telemetry refresh.",
      "technical.fetchingTelemetry": "Fetching telemetry from the configured Microsoft endpoint…",
      "technical.issueSubmissionTimeout": "The operation timed out.",
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

    }),"fr-FR": Object.freeze({
      "license.cardTitle": "Licence pour ce tenant Business Central",
      "license.cardUnknown": "Ouvrez Business Central pour vérifier la licence.",
      "license.cardCheckFailed": "Impossible de vérifier la licence. Réessayez.",
      "license.cardNeedsConsent": "Acceptez l’enregistrement de la licence pour la vérifier.",
      "license.cardActive": "Licence active",
      "license.cardTrialAvailable": "Aucune licence active. Connectez-vous pour démarrer un essai de 30 jours.",
      "license.cardTrialReady": "Aucune licence active. Ce tenant peut bénéficier d’un essai de 30 jours. Démarrez-le ci-dessous.",
      "license.cardStartTrial": "Démarrer l’essai de 30 jours",
      "license.cardSignInTrial": "Se connecter et démarrer l’essai de 30 jours",
      "license.trialServiceUnavailable": "Le service de licences est inaccessible. Vérifiez votre connexion et réessayez. Il n’est pas nécessaire de vous reconnecter.",
      "license.trialServiceTimeout": "Le service de licences n’a pas répondu à temps. Attendez un moment, puis vérifiez de nouveau la licence. Il n’est pas nécessaire de vous reconnecter.",
      "license.microsoftUnavailable": "Le service de connexion Microsoft est inaccessible. Vérifiez votre connexion et réessayez.",
      "license.cardNoTrial": "Aucune licence active ni essai disponible. Contactez l’administrateur.",
      "license.cardSignInHelp": "Connectez-vous avec Microsoft pour vérifier la licence et activer un essai si le tenant est éligible.",
      "license.cardOpenBc": "Ouvrez d’abord un tenant Business Central.",
      "license.cardWorking": "Vérification de la licence et connexion …",
      "license.cardSignIn": "Se connecter et vérifier la licence",
      "license.signInRequired": "Connectez-vous avec Microsoft avant de démarrer un enregistrement dans Business Central.",
      "license.acceptBeforeRecording": "Confirmez l’enregistrement de la licence dans la fenêtre contextuelle de l’extension avant de démarrer l’enregistrement.",
      "license.tenantUrlRequired": "La licence nécessite une adresse Business Central contenant un ID de locataire.",
      "license.invalidEndpoint": "L’adresse HTTPS du service de licence n’est pas valide.",
      "license.serviceUnavailable": "Impossible de joindre le service de licence. Réessayez plus tard.",
      "license.invalidResponse": "Le service de licence a renvoyé une réponse non valide.",
      "license.acceptBeforeTrial": "Confirmez l’enregistrement de la licence avant de demander une licence d’essai.",
      "license.trialTenantUrlRequired": "La licence d’essai nécessite une adresse Business Central contenant un ID de locataire.",
      "license.trialSignInRequired": "Une connexion Microsoft Entra est requise pour activer une licence d’essai.",
      "license.invalidTrialResponse": "Le service de licence a renvoyé une réponse non valide ou expirée.",
      "license.trialActivated": "Un essai de 30 jours a été activé pour ce tenant.",
      "license.signInComplete": "La connexion Microsoft est terminée.",
      "license.signInFailed": "La connexion Microsoft n’a pas pu être terminée.",
      "license.userRegistrationFailed": "L’utilisateur n’a pas pu être enregistré pour la licence du tenant.",
      "license.trialFailed": "La licence d’essai n’a pas pu être activée.",
      "license.noEligibleTrial": "Ce tenant n’a pas de licence active et ne peut pas bénéficier d’un nouvel essai.",
      "license.trialType": "Essai · 30 jours",
      "license.consultantType": "Licence consultant",
      "license.standardType": "Licence standard",
      "license.registrationNotice": "Licences BC Process Studio\n\nLa vérification envoie l’identifiant d’installation, l’identifiant du tenant Business Central et la version de l’extension au service de licences. Lorsque vous vous connectez avec Microsoft, votre nom, votre e-mail/UPN, l’identifiant de tenant Entra et l’identifiant d’objet sont transmis pour l’enregistrement des utilisateurs et l’administration des licences. Pour les nouveaux documents de processus et rapports d’erreur enregistrés, le type de document, la date de création et un identifiant technique haché sont transmis à des fins statistiques. Le contenu des documents, les enregistrements, les images, les noms d’entreprise et les données métier ne sont pas transmis. Azure peut enregistrer des informations techniques de connexion. Les données d’inscription n’ont pas de durée de suppression automatique. Un tenant éligible reçoit un essai de 30 jours lors de la première connexion d’un utilisateur.\n\nService : {endpoint}",
      "license.acceptPrompt": "Accepter l’inscription et continuer ?",
      "license.registrationCancelled": "L’inscription de la licence a été annulée. Aucune information n’a été envoyée.",
      "license.type": "Type de licence",
      "license.validUntil": "Valide jusqu’au",
      "license.noExpiryDate": "Aucune date de fin",
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
      "review.imageNumber": "Image {number}",
      "review.imageQuality.medium": "Acceptable",
      "review.imageScore": "Score",
      "debug.corrections": "Corrections",
    }),"de-DE": Object.freeze({
      "license.cardTitle": "Lizenz für diesen Business Central-Mandanten",
      "license.cardUnknown": "Öffnen Sie Business Central, um die Lizenz zu prüfen.",
      "license.cardCheckFailed": "Die Lizenz konnte nicht geprüft werden. Versuchen Sie es erneut.",
      "license.cardNeedsConsent": "Akzeptieren Sie die Lizenzregistrierung, um die Lizenz zu prüfen.",
      "license.cardActive": "Lizenz aktiv",
      "license.cardTrialAvailable": "Keine aktive Lizenz. Melden Sie sich an, um eine 30-tägige Testphase zu starten.",
      "license.cardTrialReady": "Keine aktive Lizenz. Dieser Mandant ist für eine 30-tägige Testphase berechtigt. Starten Sie sie unten.",
      "license.cardStartTrial": "30-tägige Testphase starten",
      "license.cardSignInTrial": "Anmelden und 30-tägige Testphase starten",
      "license.trialServiceUnavailable": "Der Lizenzdienst ist nicht erreichbar. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut. Eine erneute Anmeldung ist nicht erforderlich.",
      "license.trialServiceTimeout": "Der Lizenzdienst hat nicht rechtzeitig geantwortet. Warten Sie kurz und prüfen Sie die Lizenz erneut. Eine erneute Anmeldung ist nicht erforderlich.",
      "license.microsoftUnavailable": "Der Microsoft-Anmeldedienst ist nicht erreichbar. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      "license.cardNoTrial": "Keine aktive Lizenz oder verfügbare Testphase. Wenden Sie sich an den Administrator.",
      "license.cardSignInHelp": "Melden Sie sich mit Microsoft an, um die Lizenz zu prüfen und eine Testphase zu aktivieren, wenn der Mandant berechtigt ist.",
      "license.cardOpenBc": "Öffnen Sie zuerst einen Business Central-Mandanten.",
      "license.cardWorking": "Lizenz wird geprüft und Anmeldung läuft …",
      "license.cardSignIn": "Anmelden und Lizenz prüfen",
      "license.signInRequired": "Melden Sie sich mit Microsoft an, bevor Sie eine Aufzeichnung in Business Central starten.",
      "license.acceptBeforeRecording": "Bestätigen Sie die Lizenzregistrierung im Popup der Erweiterung, bevor Sie die Aufzeichnung starten.",
      "license.tenantUrlRequired": "Die Lizenz erfordert eine Business Central-Adresse mit Mandanten-ID.",
      "license.invalidEndpoint": "Die HTTPS-Adresse des Lizenzdienstes ist ungültig.",
      "license.serviceUnavailable": "Der Lizenzdienst ist nicht erreichbar. Versuchen Sie es später erneut.",
      "license.invalidResponse": "Der Lizenzdienst hat eine ungültige Antwort zurückgegeben.",
      "license.acceptBeforeTrial": "Bestätigen Sie die Lizenzregistrierung, bevor Sie eine Testlizenz anfordern.",
      "license.trialTenantUrlRequired": "Die Testlizenz erfordert eine Business Central-Adresse mit Mandanten-ID.",
      "license.trialSignInRequired": "Zum Aktivieren einer Testlizenz ist eine Microsoft Entra-Anmeldung erforderlich.",
      "license.invalidTrialResponse": "Der Lizenzdienst hat eine ungültige oder abgelaufene Antwort zurückgegeben.",
      "license.trialActivated": "Für diesen Mandanten wurde eine 30-tägige Testlizenz aktiviert.",
      "license.signInComplete": "Die Microsoft-Anmeldung ist abgeschlossen.",
      "license.signInFailed": "Die Microsoft-Anmeldung konnte nicht abgeschlossen werden.",
      "license.userRegistrationFailed": "Der Benutzer konnte nicht für die Mandantenlizenz registriert werden.",
      "license.trialFailed": "Die Testlizenz konnte nicht aktiviert werden.",
      "license.noEligibleTrial": "Dieser Mandant hat keine aktive Lizenz und ist nicht für eine neue Testlizenz berechtigt.",
      "license.trialType": "Testlizenz · 30 Tage",
      "license.consultantType": "Beraterlizenz",
      "license.standardType": "Standardlizenz",
      "license.registrationNotice": "BC Process Studio-Lizenzierung\n\nLizenzprüfungen senden Installations-ID, Business Central-Mandanten-ID und Erweiterungsversion an den Lizenzdienst. Bei der Microsoft-Anmeldung werden Name, E-Mail/UPN, Entra-Mandanten-ID und Objekt-ID zur Benutzerregistrierung und Lizenzverwaltung übermittelt. Für neu gespeicherte Prozessdokumente und Fehlerberichte werden Dokumenttyp, Erstellungszeit und eine gehashte technische ID für Nutzungsstatistiken gesendet. Dokumentinhalte, Aufzeichnungen, Bilder, Firmennamen und Geschäftsdaten werden nicht gesendet. Azure kann technische Verbindungsdaten protokollieren. Registrierungsdaten haben keine automatische Löschfrist. Ein berechtigter Mandant erhält bei der ersten Anmeldung eines Benutzers eine 30-tägige Testlizenz.\n\nDienst: {endpoint}",
      "license.acceptPrompt": "Registrierung akzeptieren und fortfahren?",
      "license.registrationCancelled": "Die Lizenzregistrierung wurde abgebrochen. Es wurden keine Informationen gesendet.",
      "license.type": "Lizenztyp",
      "license.validUntil": "Gültig bis",
      "license.noExpiryDate": "Kein Enddatum",
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
      "review.imageNumber": "Bild {number}",
      "license.status": "Status",
      "library.filters": "Filter",
    }),"es-ES": Object.freeze({
      "license.cardTitle": "Licencia de este tenant de Business Central",
      "license.cardUnknown": "Abra Business Central para comprobar la licencia.",
      "license.cardCheckFailed": "No se pudo comprobar la licencia. Inténtelo de nuevo.",
      "license.cardNeedsConsent": "Acepte el registro de licencia para comprobarla.",
      "license.cardActive": "Licencia activa",
      "license.cardTrialAvailable": "No hay una licencia activa. Inicie sesión para comenzar una prueba de 30 días.",
      "license.cardTrialReady": "No hay una licencia activa. Este tenant puede acceder a una prueba de 30 días. Iníciela abajo.",
      "license.cardStartTrial": "Iniciar prueba de 30 días",
      "license.cardSignInTrial": "Iniciar sesión y comenzar prueba de 30 días",
      "license.trialServiceUnavailable": "No se pudo acceder al servicio de licencias. Compruebe la conexión e inténtelo de nuevo. No es necesario iniciar sesión otra vez.",
      "license.trialServiceTimeout": "El servicio de licencias no respondió a tiempo. Espere un momento y vuelva a comprobar la licencia. No es necesario iniciar sesión otra vez.",
      "license.microsoftUnavailable": "No se pudo acceder al servicio de inicio de sesión de Microsoft. Compruebe la conexión e inténtelo de nuevo.",
      "license.cardNoTrial": "No hay una licencia activa ni una prueba disponible. Póngase en contacto con el administrador.",
      "license.cardSignInHelp": "Inicie sesión con Microsoft para comprobar la licencia y activar una prueba si el tenant cumple los requisitos.",
      "license.cardOpenBc": "Abra primero un tenant de Business Central.",
      "license.cardWorking": "Comprobando la licencia e iniciando sesión …",
      "license.cardSignIn": "Iniciar sesión y comprobar licencia",
      "license.signInRequired": "Inicie sesión con Microsoft antes de comenzar una grabación en Business Central.",
      "license.acceptBeforeRecording": "Confirme el registro de la licencia en la ventana emergente de la extensión antes de iniciar la grabación.",
      "license.tenantUrlRequired": "La licencia requiere una dirección de Business Central que incluya un ID de inquilino.",
      "license.invalidEndpoint": "La dirección HTTPS del servicio de licencias no es válida.",
      "license.serviceUnavailable": "No se pudo contactar con el servicio de licencias. Inténtelo de nuevo más tarde.",
      "license.invalidResponse": "El servicio de licencias devolvió una respuesta no válida.",
      "license.acceptBeforeTrial": "Confirme el registro de la licencia antes de solicitar una licencia de prueba.",
      "license.trialTenantUrlRequired": "La licencia de prueba requiere una dirección de Business Central que incluya un ID de inquilino.",
      "license.trialSignInRequired": "Se requiere iniciar sesión con Microsoft Entra para activar una licencia de prueba.",
      "license.invalidTrialResponse": "El servicio de licencias devolvió una respuesta no válida o caducada.",
      "license.trialActivated": "Se ha activado una prueba de 30 días para este tenant.",
      "license.signInComplete": "Se completó el inicio de sesión de Microsoft.",
      "license.signInFailed": "No se pudo completar el inicio de sesión de Microsoft.",
      "license.userRegistrationFailed": "No se pudo registrar al usuario para la licencia del tenant.",
      "license.trialFailed": "No se pudo activar la licencia de prueba.",
      "license.noEligibleTrial": "Este tenant no tiene una licencia activa y no puede iniciar una nueva prueba.",
      "license.trialType": "Prueba · 30 días",
      "license.consultantType": "Licencia de consultor",
      "license.standardType": "Licencia estándar",
      "license.registrationNotice": "Licencias de BC Process Studio\n\nLas comprobaciones envían al servicio de licencias el ID de instalación, el ID del tenant de Business Central y la versión de la extensión. Al iniciar sesión con Microsoft, se envían el nombre, el correo/UPN, el ID del tenant de Entra y el ID del objeto para registrar usuarios y administrar licencias. Para los nuevos documentos de procesos e informes de errores guardados, se envían el tipo de documento, la fecha de creación y un ID técnico cifrado mediante hash para estadísticas de uso. No se envían contenidos, grabaciones, imágenes, nombres de empresas ni datos comerciales. Azure puede registrar datos técnicos de conexión. Los datos de registro no tienen un plazo de eliminación automática. Un tenant que cumpla los requisitos recibe una prueba de 30 días cuando un usuario inicia sesión por primera vez.\n\nServicio: {endpoint}",
      "license.acceptPrompt": "¿Aceptar el registro y continuar?",
      "license.registrationCancelled": "Se canceló el registro de la licencia. No se envió ninguna información.",
      "license.type": "Tipo de licencia",
      "license.validUntil": "Válida hasta",
      "license.noExpiryDate": "Sin fecha de finalización",
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

    }),"da-DK": Object.freeze({
      "license.cardTitle": "Licens til denne Business Central-tenant",
      "license.cardUnknown": "Åbn Business Central for at kontrollere licensen.",
      "license.cardCheckFailed": "Licensen kunne ikke kontrolleres. Prøv igen.",
      "license.cardNeedsConsent": "Acceptér licensregistreringen for at kontrollere licensen.",
      "license.cardActive": "Licensen er aktiv",
      "license.cardTrialAvailable": "Ingen aktiv licens. Log på for at starte en prøveperiode på 30 dage.",
      "license.cardTrialReady": "Ingen aktiv licens. Denne tenant er berettiget til en prøveperiode på 30 dage. Start den nedenfor.",
      "license.cardStartTrial": "Start 30-dages prøveperiode",
      "license.cardSignInTrial": "Log på og start 30-dages prøveperiode",
      "license.trialServiceUnavailable": "Licenstjenesten kunne ikke nås. Kontrollér forbindelsen, og prøv igen. Du behøver ikke logge på igen.",
      "license.trialServiceTimeout": "Licenstjenesten svarede ikke i tide. Vent et øjeblik, og kontrollér licensen igen. Du behøver ikke logge på igen.",
      "license.microsoftUnavailable": "Microsofts logontjeneste kunne ikke nås. Kontrollér forbindelsen, og prøv igen.",
      "license.cardNoTrial": "Ingen aktiv licens eller tilgængelig prøveperiode. Kontakt administratoren.",
      "license.cardSignInHelp": "Log på med Microsoft for at kontrollere licensen og aktivere en prøveperiode, hvis din tenant er berettiget.",
      "license.cardOpenBc": "Åbn først en Business Central-tenant.",
      "license.cardWorking": "Kontrollerer licensen og logger på …",
      "license.cardSignIn": "Log på og kontrollér licens",
      "license.signInRequired": "Log på med Microsoft, før du starter en optagelse i Business Central.",
      "license.acceptBeforeRecording": "Bekræft licensregistreringen i udvidelsens pop op-vindue, før du starter optagelsen.",
      "license.tenantUrlRequired": "Licensen kræver en Business Central-adresse med lejer-id.",
      "license.invalidEndpoint": "Licenstjenestens HTTPS-adresse er ugyldig.",
      "license.serviceUnavailable": "Licenstjenesten kunne ikke nås. Prøv igen senere.",
      "license.invalidResponse": "Licenstjenesten returnerede et ugyldigt svar.",
      "license.acceptBeforeTrial": "Bekræft licensregistreringen, før du anmoder om en prøvelicens.",
      "license.trialTenantUrlRequired": "Prøvelicensen kræver en Business Central-adresse med lejer-id.",
      "license.trialSignInRequired": "Log på med Microsoft Entra for at aktivere en prøvelicens.",
      "license.invalidTrialResponse": "Licenstjenesten returnerede et ugyldigt eller udløbet svar.",
      "license.trialActivated": "En prøveperiode på 30 dage er aktiveret for denne tenant.",
      "license.signInComplete": "Microsoft-logon er fuldført.",
      "license.signInFailed": "Microsoft-logon kunne ikke fuldføres.",
      "license.userRegistrationFailed": "Brugeren kunne ikke registreres til tenantlicensen.",
      "license.trialFailed": "Prøvelicensen kunne ikke aktiveres.",
      "license.noEligibleTrial": "Denne tenant har ingen aktiv licens og er ikke berettiget til en ny prøveperiode.",
      "license.trialType": "Prøveperiode · 30 dage",
      "license.consultantType": "Konsulentlicens",
      "license.standardType": "Standardlicens",
      "license.registrationNotice": "BC Process Studio-licensering\n\nLicenskontrollen sender installations-ID, Business Central-tenant-ID og udvidelsesversion til licenstjenesten. Når du logger på med Microsoft, sendes navn, e-mail/UPN, Entra-tenant-ID og objekt-ID til brugerregistrering og licensadministration. For nye gemte procesdokumenter og fejlrapporter sendes dokumenttype, oprettelsestidspunkt og et hashberegnet teknisk ID til brugsstatistik. Dokumentindhold, optagelser, billeder, virksomhedsnavne og forretningsdata sendes ikke. Azure kan logge tekniske forbindelsesoplysninger. Registreringsdata har ingen automatisk slettefrist. En berettiget tenant får en prøveperiode på 30 dage, første gang en bruger logger på.\n\nTjeneste: {endpoint}",
      "license.acceptPrompt": "Accepter registreringen, og fortsæt?",
      "license.registrationCancelled": "Licensregistreringen blev annulleret. Ingen oplysninger blev sendt.",
      "license.type": "Licenstype",
      "license.validUntil": "Gyldig til",
      "license.noExpiryDate": "Ingen slutdato",
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
      "license.header": "Tenantlicens",
      "license.tenant": "Tenant",
      "license.status": "Status",
      "license.tenantId": "Tenant-ID",
      "review.imageMargin": "margen",
      "debug.noSession": "Ingen",
      "debug.title": "BC Process Recorder — Teknisk diagnostik",
      "debug.rawDiagnostics": "Rådiagnostik",
      "a11y.commentFormatting": "Kommentarformatering",
    }),"fi-FI": Object.freeze({
      "license.cardTitle": "Tämän Business Central -tenantin lisenssi",
      "license.cardUnknown": "Avaa Business Central tarkistaaksesi lisenssin.",
      "license.cardCheckFailed": "Lisenssin tarkistaminen epäonnistui. Yritä uudelleen.",
      "license.cardNeedsConsent": "Hyväksy lisenssin rekisteröinti tarkistaaksesi lisenssin.",
      "license.cardActive": "Lisenssi on aktiivinen",
      "license.cardTrialAvailable": "Aktiivista lisenssiä ei ole. Aloita 30 päivän kokeilu kirjautumalla sisään.",
      "license.cardTrialReady": "Aktiivista lisenssiä ei ole. Tämä tenant on oikeutettu 30 päivän kokeiluun. Aloita se alta.",
      "license.cardStartTrial": "Aloita 30 päivän kokeilu",
      "license.cardSignInTrial": "Kirjaudu sisään ja aloita 30 päivän kokeilu",
      "license.trialServiceUnavailable": "Lisenssipalveluun ei saatu yhteyttä. Tarkista yhteys ja yritä uudelleen. Sinun ei tarvitse kirjautua uudelleen.",
      "license.trialServiceTimeout": "Lisenssipalvelu ei vastannut ajoissa. Odota hetki ja tarkista lisenssi uudelleen. Sinun ei tarvitse kirjautua uudelleen.",
      "license.microsoftUnavailable": "Microsoftin kirjautumispalveluun ei saatu yhteyttä. Tarkista yhteys ja yritä uudelleen.",
      "license.cardNoTrial": "Aktiivista lisenssiä tai kokeilua ei ole saatavilla. Ota yhteyttä järjestelmänvalvojaan.",
      "license.cardSignInHelp": "Tarkista lisenssi ja aktivoi tenantin ehdot täyttävä kokeilu kirjautumalla Microsoftilla.",
      "license.cardOpenBc": "Avaa ensin Business Central -tenant.",
      "license.cardWorking": "Tarkistetaan lisenssiä ja kirjaudutaan sisään …",
      "license.cardSignIn": "Kirjaudu sisään ja tarkista lisenssi",
      "license.signInRequired": "Kirjaudu Microsoftilla ennen tallennuksen aloittamista Business Centralissa.",
      "license.acceptBeforeRecording": "Vahvista lisenssin rekisteröinti laajennuksen ponnahdusikkunassa ennen tallennuksen aloittamista.",
      "license.tenantUrlRequired": "Lisenssi edellyttää Business Central -osoitetta, jossa on vuokraajatunnus.",
      "license.invalidEndpoint": "Lisenssipalvelun HTTPS-osoite on virheellinen.",
      "license.serviceUnavailable": "Lisenssipalveluun ei saatu yhteyttä. Yritä myöhemmin uudelleen.",
      "license.invalidResponse": "Lisenssipalvelu palautti virheellisen vastauksen.",
      "license.acceptBeforeTrial": "Vahvista lisenssin rekisteröinti ennen kokeilulisenssin pyytämistä.",
      "license.trialTenantUrlRequired": "Kokeilulisenssi edellyttää Business Central -osoitetta, jossa on vuokraajatunnus.",
      "license.trialSignInRequired": "Kokeilulisenssin aktivointi edellyttää kirjautumista Microsoft Entraan.",
      "license.invalidTrialResponse": "Lisenssipalvelu palautti virheellisen tai vanhentuneen vastauksen.",
      "license.trialActivated": "Tälle tenantille aktivoitiin 30 päivän kokeilu.",
      "license.signInComplete": "Microsoft-kirjautuminen on valmis.",
      "license.signInFailed": "Microsoft-kirjautumista ei voitu suorittaa loppuun.",
      "license.userRegistrationFailed": "Käyttäjää ei voitu rekisteröidä tenantin lisenssille.",
      "license.trialFailed": "Kokeilulisenssiä ei voitu aktivoida.",
      "license.noEligibleTrial": "Tenantilla ei ole aktiivista lisenssiä, eikä se voi aloittaa uutta kokeilua.",
      "license.trialType": "Kokeilu · 30 päivää",
      "license.consultantType": "Konsulttilisenssi",
      "license.standardType": "Vakiolisenssi",
      "license.registrationNotice": "BC Process Studio -lisensointi\n\nLisenssitarkistus lähettää asennustunnuksen, Business Central -tenantin tunnuksen ja laajennuksen version lisenssipalveluun. Microsoft-kirjautumisen yhteydessä nimi, sähköposti/UPN, Entra-tenantin tunnus ja objektitunnus lähetetään käyttäjän rekisteröintiä ja lisenssien hallintaa varten. Uusista tallennetuista prosessiasiakirjoista ja virheraporteista lähetetään asiakirjan tyyppi, luontiaika ja hajautettu tekninen tunniste käyttötilastoihin. Asiakirjojen sisältöä, tallenteita, kuvia, yritysten nimiä tai liiketoimintatietoja ei lähetetä. Azure voi kirjata teknisiä yhteystietoja. Rekisteröintitiedoilla ei ole automaattista poistoaikaa. Kelvollinen tenant saa 30 päivän kokeilun käyttäjän ensimmäisellä kirjautumiskerralla.\n\nPalvelu: {endpoint}",
      "license.acceptPrompt": "Hyväksytkö rekisteröinnin ja jatkatko?",
      "license.registrationCancelled": "Lisenssin rekisteröinti peruutettiin. Tietoja ei lähetetty.",
      "license.type": "Lisenssin tyyppi",
      "license.validUntil": "Voimassa asti",
      "license.noExpiryDate": "Ei päättymispäivää",
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

    }),"nb-NO": Object.freeze({
      "license.cardTitle": "Lisens for denne Business Central-tenanten",
      "license.cardUnknown": "Åpne Business Central for å kontrollere lisensen.",
      "license.cardCheckFailed": "Lisensen kunne ikke kontrolleres. Prøv igjen.",
      "license.cardNeedsConsent": "Godta lisensregistreringen for å kontrollere lisensen.",
      "license.cardActive": "Lisensen er aktiv",
      "license.cardTrialAvailable": "Ingen aktiv lisens. Logg på for å starte en prøveperiode på 30 dager.",
      "license.cardTrialReady": "Ingen aktiv lisens. Denne tenanten er kvalifisert for en prøveperiode på 30 dager. Start den nedenfor.",
      "license.cardStartTrial": "Start prøveperiode på 30 dager",
      "license.cardSignInTrial": "Logg på og start prøveperiode på 30 dager",
      "license.trialServiceUnavailable": "Lisensieringstjenesten kunne ikke nås. Kontroller tilkoblingen og prøv igjen. Du trenger ikke å logge på på nytt.",
      "license.trialServiceTimeout": "Lisensieringstjenesten svarte ikke i tide. Vent litt og kontroller lisensen på nytt. Du trenger ikke å logge på igjen.",
      "license.microsoftUnavailable": "Microsofts påloggingstjeneste kunne ikke nås. Kontroller tilkoblingen og prøv igjen.",
      "license.cardNoTrial": "Ingen aktiv lisens eller tilgjengelig prøveperiode. Kontakt administratoren.",
      "license.cardSignInHelp": "Logg på med Microsoft for å kontrollere lisensen og aktivere en prøveperiode hvis tenanten er kvalifisert.",
      "license.cardOpenBc": "Åpne en Business Central-tenant først.",
      "license.cardWorking": "Kontrollerer lisensen og logger på …",
      "license.cardSignIn": "Logg på og kontroller lisensen",
      "license.signInRequired": "Logg på med Microsoft før du starter et opptak i Business Central.",
      "license.acceptBeforeRecording": "Bekreft lisensregistreringen i utvidelsens popup-vindu før du starter opptaket.",
      "license.tenantUrlRequired": "Lisensen krever en Business Central-adresse med leier-ID.",
      "license.invalidEndpoint": "HTTPS-adressen for lisenstjenesten er ugyldig.",
      "license.serviceUnavailable": "Lisenstjenesten kunne ikke nås. Prøv igjen senere.",
      "license.invalidResponse": "Lisenstjenesten returnerte et ugyldig svar.",
      "license.acceptBeforeTrial": "Bekreft lisensregistreringen før du ber om en prøvelisens.",
      "license.trialTenantUrlRequired": "Prøvelisensen krever en Business Central-adresse med leier-ID.",
      "license.trialSignInRequired": "Pålogging med Microsoft Entra kreves for å aktivere en prøvelisens.",
      "license.invalidTrialResponse": "Lisenstjenesten returnerte et ugyldig eller utløpt svar.",
      "license.trialActivated": "En prøveperiode på 30 dager er aktivert for denne tenanten.",
      "license.signInComplete": "Microsoft-påloggingen er fullført.",
      "license.signInFailed": "Microsoft-påloggingen kunne ikke fullføres.",
      "license.userRegistrationFailed": "Brukeren kunne ikke registreres for tenantlisensen.",
      "license.trialFailed": "Prøvelisensen kunne ikke aktiveres.",
      "license.noEligibleTrial": "Denne tenanten har ingen aktiv lisens og kan ikke starte en ny prøveperiode.",
      "license.trialType": "Prøveperiode · 30 dager",
      "license.consultantType": "Konsulentlisens",
      "license.standardType": "Standardlisens",
      "license.registrationNotice": "BC Process Studio-lisensiering\n\nLisenskontroller sender installasjons-ID, Business Central-tenant-ID og utvidelsesversjon til lisensieringstjenesten. Når du logger på med Microsoft, sendes navn, e-post/UPN, Entra-tenant-ID og objekt-ID for brukerregistrering og lisensadministrasjon. For nye lagrede prosessdokumenter og feilrapporter sendes dokumenttype, opprettelsestidspunkt og en hashet teknisk ID for bruksstatistikk. Dokumentinnhold, opptak, bilder, firmanavn og forretningsdata sendes ikke. Azure kan logge tekniske tilkoblingsopplysninger. Registreringsdata har ingen automatisk slettingstid. En kvalifisert tenant får en prøveperiode på 30 dager første gang en bruker logger på.\n\nTjeneste: {endpoint}",
      "license.acceptPrompt": "Godta registreringen og fortsette?",
      "license.registrationCancelled": "Lisensregistreringen ble avbrutt. Ingen opplysninger ble sendt.",
      "license.type": "Lisenstype",
      "license.validUntil": "Gyldig til",
      "license.noExpiryDate": "Ingen sluttdato",
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
      "settings.documentLanguage": "Dokumentspråk",
      "review.documentLanguage": "Dokumentspråk",
      "license.status": "Status",
      "library.documentLanguage": "Dokumentspråk",
      "review.imageMargin": "marg",
      "debug.noSession": "Ingen",
      "debug.active": "Pågår",
      "a11y.commentFormatting": "Kommentarformatering",
    })
  });

  const STATIC_TEXT = Object.freeze([
    ["Mottagaren kan ha hunnit skapa ärendet. Kontrollera det innan du försöker igen.",
      "The destination may have created the issue. Check before retrying."],
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
    ,["Diagnostikinsamlingen misslyckades.", "Diagnostic capture failed."]
    ,["Business Central tillhandahöll inga diagnostikuppgifter.",
      "Diagnostics were not provided by Business Central."]
    ,["Diagnostikuppgifter har samlats in.", "Diagnostics captured."]
    ,["Strukturerad AL-anropsstack", "Structured AL call stack"]
    ,["Objekt", "Object"], ["Metod/utlösare", "Method / Trigger"]
    ,["App/tillägg", "App / Extension"]
    ,["Källa/rad", "Source / Line"], ["Tolkningsstatus", "Parse Status"]
    ,["Här ser vi vad tillägget faktiskt gör, i stället för att tolka tystnad som ett användargränssnitt.",
      "This shows what the extension is actually doing instead of interpreting silence as a user interface."]
    ,["Uppdatera", "Refresh"], ["Aktivera fångstdiagnostik", "Enable capture diagnostics"]
    ,["Stäng av fångstdiagnostik", "Disable capture diagnostics"]
    ,["Rå diagnostik", "Raw diagnostics"], ["Teknisk felrapport", "Technical Bug Report"]
    ,["Kopiera hela rapporten", "Copy full report"], ["Exportera Markdown", "Export Markdown"]
    ,["Dela rapport", "Share report"]
    ,["Sparad automatiskt", "Saved automatically"], ["Sparar…", "Saving…"]
    ,["Ändringar väntar på att sparas", "Changes waiting to be saved"]
    ,["Kunde inte spara ändringarna", "Could not save changes"]
    ,["Försök spara igen", "Retry save"]
    ,["Redo att dela", "Ready to share"], ["Slutför rapporten", "Complete the report"]
    ,["Rapporten innehåller tillräcklig information för att delas.", "The report contains enough information to be shared."]
    ,["Slutför punkterna nedan innan du delar.", "Complete the items below before sharing."]
    ,["Lägg till en rapporttitel.", "Add a report title."]
    ,["Lägg till minst ett synligt reproduktionssteg.", "Add at least one visible reproduction step."]
    ,["Beskriv det faktiska resultatet eller fånga ett BC-fel.", "Describe the actual result or capture a BC error."]
    ,["Application Insights (valfritt)", "Application Insights (optional)"]
    ,["Spara telemetriinställning", "Save telemetry configuration"]
    ,["Testa telemetrianslutning", "Test telemetry connection"]
    ,["Uppdatera telemetri för valt fel", "Refresh telemetry for selected error"]
    ,["Spara publik brokerinställning", "Save public broker configuration"]
    ,["Analysera tekniska bevis", "Analyze technical evidence"]
    ,["Förhandsgranska ärendepaket", "Issue Package Preview"]
    ,["Aktiverad", "Enabled"]
    ,["Projekt", "Project"]
    ,["Generera förhandsgranskning", "Generate preview"]
    ,["Överföringssammanfattning", "Transmission summary"]
    ,["Titel", "Title"], ["Beskrivning", "Description"], ["Bilagor", "Attachments"]
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
    ,["Tenant-ID", "Tenant ID"]
    ,["Application Insights App-ID", "Application Insights App ID"]
    ,["Förväntad miljö", "Expected environment"]
    ,["Aktivera valfri berikning", "Enable optional enrichment"]
    ,["Fönster (minuter)", "Window (minutes)"]
    ,["HTTPS-adress till broker", "HTTPS broker URL"]
    ,["Leverantörsmodell", "Provider model"]
    ,["Inkludera filtrerade telemetrihändelser", "Include filtered telemetry events"]
    ,["Inkludera maskerade telemetrimeddelanden", "Include redacted telemetry messages"]
    ,["Inkludera maskerade användaranteckningar", "Include redacted human notes"]
    ,["Jag förstår att valda bevis lämnar det här tillägget", "I understand that the selected evidence will leave this extension"]
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
    ,["Visa alla steg", "Show all steps"]
    ,["Kommentar", "Comment"]
    ,["Informationstyp", "Information type"]
    ,["Faktaruta", "Fact box"]
    ,["Typsnitt", "Font"]
    ,["Storlek", "Size"]
    ,["Textfärg", "Text color"]
    ,["Bakgrund", "Background"]
    ,["Använd", "Use"]
    ,["Byt bild", "Change image"]
    ,["Dela vid markören", "Split at cursor"]
    ,["Regenerera det här steget", "Regenerate this step"]
    ,["Ta bort manuellt steg", "Delete manual step"]
    ,["Expandera", "Expand"]
    ,["Expandera alla", "Expand all"]
    ,["Redigerad", "Edited"]
    ,["Genererad", "Generated"]
    ,["Manuellt", "Manual"]
    ,["Manuell skärmbild", "Manual screenshot"]
    ,["Steg {step}", "Step {step}"]
    ,["Informationstyp för manuellt steg {step}", "Information type for manual step {step}"]
    ,["Redigera faktaruta för steg {step}", "Edit fact box for step {step}"]
    ,["Faktaruta för manuellt steg {step}", "Fact box for manual step {step}"]
    ,["Skärmbild {image} för steg {step}", "Screenshot {image} for step {step}"]
    ,["Dela steg {step} vid markören", "Split step {step} at the cursor"]
    ,["Flytta steg {step} uppåt", "Move step {step} up"]
    ,["Flytta steg {step} nedåt", "Move step {step} down"]
    ,["Regenerera steg {step}", "Regenerate step {step}"]
    ,["Ta bort manuellt steg {step}", "Delete manual step {step}"]
    ,["Stäng granskning", "Close review"]
    ,["Annoteringar har ändrats. Välj Spara för att lagra dem.", "Annotations have changed. Select Save to store them."]
    ,["Granskningen är slutförd.", "The review is complete."]
    ,["Ändringar sparas lokalt i webbläsaren.", "Changes are saved locally in this browser."]
    ,["Alla ändringar är sparade.", "All changes are saved."]
    ,["Nyare ändringar väntar på att sparas.", "Newer changes are waiting to be saved."]
    ,["Granskningen kunde inte sparas.", "The review could not be saved."]
    ,["Granskningen kunde inte läsas.", "The review could not be read."]
    ,["Skärmbilderna kunde inte läsas in.", "The screenshots could not be loaded."]
    ,["Skärmbilder och processkontext kunde inte läsas in.", "Screenshots and process context could not be loaded."]
    ,["Granskningen kunde inte stängas eftersom sparningen misslyckades.", "The review could not be closed because saving failed."]
    ,["Sessionen kunde inte tas bort.", "The session could not be deleted."]
    ,["Sessionen kunde inte läsas.", "The session could not be read."]
    ,["Den begärda dokumentationen kunde inte öppnas.", "The requested documentation could not be opened."]
    ,["Hämtar skärmbilder…", "Loading screenshots…"]
    ,["Markeringen kunde inte uppdateras: {error}", "The markup could not be updated: {error}"]
    ,["Markeringen kunde inte läggas till: {error}", "The markup could not be added: {error}"]
    ,["Annoteringarna kunde inte sparas: {error}", "The annotations could not be saved: {error}"]
    ,["Återställningen kunde inte sparas: {error}", "The reset could not be saved: {error}"]
    ,["Pekgesten kunde inte startas. Försök igen.", "The pointer gesture could not be started. Try again."]
    ,["okänt renderingsfel", "unknown rendering error"]
    ,["Den filtrerade steglistan blev tom trots lagrade steg.", "The filtered step list was empty although steps are stored."]
    ,["Det manuella informationssteget togs bort.", "The manual information step was removed."]
    ,["Dölj avancerade dataskyddsinställningar", "Hide advanced privacy settings"]
    ,["Filen kunde inte sparas.", "The file could not be saved."]
    ,["Dokumentet är inte tillgängligt ännu.", "The document is not available yet."]
    ,["Dokumentet \"{title}\" kan inte exporteras.", "The document \"{title}\" cannot be exported."]
    ,["Felrapporten \"{title}\" exporteras från Technical Report Workspace.", "The bug report \"{title}\" is exported from the Technical Report Workspace."]
    ,["Ingen granskning är öppen.", "No review is open."]
    ,["Word-exportbiblioteket kunde inte laddas. Kör npm install och npm run build.", "The Word export library could not be loaded. Run npm install and npm run build."]
    ,["Processanalysen kunde inte genomföras.", "The process analysis could not be completed."]
    ,["Dokumentbiblioteket kunde inte sparas.", "The Document Library could not be saved."]
    ,["Endast markerade fält ändras för {count} dokument.", "Only the selected fields are changed for {count} documents."]
    ,["Dokumentet kunde inte visas: {error}", "The document could not be displayed: {error}"]
    ,["Slutför eller avbryt annoteringen innan du byter arbetsyta.", "Finish or cancel the annotation before switching workspace."]
    ,["Informationssteget lades till. Skriv texten och spara.", "The information step was added. Write the text and save."]
    ,["Placera markören mellan två textdelar i instruktionen.", "Place the cursor between two parts of the instruction text."]
    ,["Det finns ingen annoteringsändring att återställa.", "There is no annotation change to undo."]
    ,["Steget ändrades under redigering. Din text bevarades och sparas.", "The step changed while you were editing. Your text was kept and is being saved."]
    ,["Tar en bild från den senast använda Business Central-fliken...", "Capturing an image from the most recently used Business Central tab…"]
    ,["Skärmbilden kunde inte tas.", "The screenshot could not be captured."]
    ,["Den nya bilden är vald. Bekräfta för att uppdatera steget.", "The new image is selected. Confirm to update the step."]
    ,["Bilden kunde inte sparas.", "The image could not be saved."]
    ,["{message} Väntar på automatisk sparning.", "{message} Waiting for automatic save."]
    ,["Annoteringen väntar på automatisk sparning.", "The annotation is waiting for automatic save."]
    ,["Den nya tolkningen gav inga steg. Den sparade granskningen kommer inte att ändras.", "The new interpretation produced no steps. The saved review will not be changed."]
    ,["Granskningen innehåller manuella ändringar som inte kan flyttas säkert. Regenereringen är blockerad så att inget konsultarbete skrivs över.", "The review contains manual changes that cannot be moved safely. Regeneration is blocked so that no consultant work is overwritten."]
    ,["Tillagda steg", "Added steps"]
    ,["Borttagna steg", "Removed steps"]
    ,["Ändrad instruktion", "Changed instruction"]
    ,["Sammanslagna steg", "Merged steps"]
    ,["Delade steg", "Split steps"]
    ,["Bytt skärmbild", "Changed screenshot"]
    ,["Inga innehållsändringar upptäcktes.", "No content changes were detected."]
    ,["Dokumentationen har regenererats från inspelningen. {before} steg blev {after}.", "The documentation was regenerated from the recording. {before} steps became {after}."]
    ,["Granskningen ändrades efter förhandsgranskningen. Öppna en ny förhandsgranskning och kontrollera ändringarna igen.", "The review changed after the preview. Open a new preview and check the changes again."]
    ,["Dokumentationen kunde inte regenereras: {error}", "The documentation could not be regenerated: {error}"]
    ,["Inställningarna kunde inte läsas. Standardvärden visas.", "Settings could not be read. Default values are shown."]
    ,["Infoga filnamnsvariabel. Använd vänster och höger pil för att navigera.", "Insert file name variable. Use the left and right arrow keys to navigate."]
    ,["Filter för Dokumentbibliotek", "Document Library filters"]
    ,["Batchåtgärder", "Batch actions"]
    ,["Batchförlopp", "Batch progress"]
    ,["Dokument i Dokumentbiblioteket", "Documents in the Document Library"]
    ,["Dokumentationsarbetsyta", "Documentation workspace"]
    ,["Redigeringskommandon", "Editing commands"]
    ,["Historik", "History"]
    ,["Matchningsgrad", "Match level"]
    ,["Zooma granskning", "Zoom review"]
    ,["Zooma ut granskning", "Zoom out review"]
    ,["Aktuell zoom i granskning", "Current review zoom"]
    ,["Zooma in granskning", "Zoom in review"]
    ,["Visa alla steg i listan", "Show all steps in the list"]
    ,["Granskningsförlopp", "Review progress"]
    ,["Dokumentstatus", "Document status"]
    ,["Processkartans storlek", "Process map size"]
    ,["Välj processkartans riktning", "Choose the process map direction"]
    ,["Välj processkartans visuella tema", "Choose the process map visual theme"]
    ,["Välj processkartans täthet", "Choose the process map density"]
    ,["Visa processkartan i fokusläge", "Show the process map in focus mode"]
    ,["Anpassa hela processkartan till tillgänglig bredd", "Fit the whole process map to the available width"]
    ,["Zooma ut processkartan", "Zoom out the process map"]
    ,["Zooma in processkartan", "Zoom in the process map"]
    ,["Återställ processkartan till 100 %", "Reset the process map to 100%"]
    ,["Dokumentets steg", "Document steps"]
    ,["Annotationsverktyg", "Annotation tools"]
    ,["Rityta för skärmbildsannotering", "Drawing area for screenshot annotation"]
    ,["Markeringar i skärmbilden", "Markup in the screenshot"]
    ,["Dokumentvisning", "Document view"]
    ,["Anpassa storlek", "Fit size"]
    ,["Zooma ut", "Zoom out"]
    ,["Aktuell zoom", "Current zoom"]
    ,["Zooma in", "Zoom in"]
    ,["Visningsläge", "View mode"]
    ,["Sidnavigering", "Page navigation"]
    ,["Föregående sida", "Previous page"]
    ,["Aktuell sida", "Current page"]
    ,["Nästa sida", "Next page"]
    ,["Åtgärder för bildbyte", "Image replacement actions"]
    ,["Inspelningen kunde inte hittas.", "The recording could not be found."]
    ,["Ingen öppen Business Central-flik hittades.", "No open Business Central tab was found."]
    ,["Den kompletterande skärmbilden kunde inte tas.", "The additional screenshot could not be captured."]
    ,["Den kompletterande skärmbilden är ogiltig.", "The additional screenshot is invalid."]
    ,["Okänd inspelningsmarkering.", "Unknown recording marker."]
    ,["Ingen aktiv inspelning hittades i den här fliken.", "No active recording was found in this tab."]
    ,["Registrera ett steg innan du markerar det.", "Record a step before you mark it."]
    ,["Det finns ännu ingen bild för det senaste steget.", "There is no image for the latest step yet."]
    ,["En inspelning är redan aktiv. Stoppa eller avbryt den innan en ny startas.", "A recording is already active. Stop or cancel it before starting a new one."]
    ,["Inspelningsskriptet kunde inte ansluta till Business Central-fliken. Uppdatera BC med Ctrl+F5 och försök igen.", "The recording script could not connect to the Business Central tab. Refresh BC with Ctrl+F5 and try again."]
    ,["Inspelningsskriptet tog inte emot startstatus.", "The recording script did not receive the start status."]
    ,["Inspelningen kunde inte verifieras i Business Central-fliken.", "The recording could not be verified in the Business Central tab."]
    ,["Inga rapportsteg kunde återskapas. Befintlig rapport har inte ändrats.", "No report steps could be recreated. The existing report has not been changed."]
    ,["Ingen Business Central-flik angavs.", "No Business Central tab was specified."]
    ,["Licensregistrering måste bekräftas i tilläggets popup.", "License registration must be confirmed in the extension popup."]
    ,["Licenskontroll får bara startas från tilläggets licensvyer.", "License checks can only be started from the extension's license views."]
    ,["Testlicens får bara begäras från tilläggets popup.", "A trial license can only be requested from the extension popup."]
    ,["Licensöversikten får bara öppnas från tilläggets licensvyer.", "The license overview can only be opened from the extension's license views."]
    ,["Microsoft-inloggning får bara startas från tilläggets licensvyer.", "Microsoft sign-in can only be started from the extension's license views."]
    ,["Användarregistrering får bara startas från tilläggets licensvyer.", "User registration can only be started from the extension's license views."]
    ,["Ingen Business Central-tenant kunde identifieras.", "No Business Central tenant could be identified."]
    ,["Konsultinloggning får bara startas från licenssidan.", "Consultant sign-in can only be started from the license page."]
    ,["Ingen aktiv felinspelning finns.", "There is no active bug recording."]
    ,["Felrapporten kunde inte hittas.", "The bug report could not be found."]
    ,["Bug Report kunde inte hittas.", "The bug report could not be found."]
    ,["Välj ett specifikt Business Central-fel för korrelation.", "Select a specific Business Central error for correlation."]
    ,["Felevidensen kunde inte hittas.", "The error evidence could not be found."]
    ,["Ingen aktiv inspelning finns.", "There is no active recording."]
    ,["Kunde inte öppna inspelningsdialogen. Öppna tillägget för att stoppa inspelningen.", "The recording dialog could not be opened. Open the extension to stop the recording."]
    ,["För många skärmbilder begärdes samtidigt.", "Too many screenshots were requested at the same time."]
    ,["Windows-delning får bara startas från felrapportvyn.", "Windows sharing can only be started from the bug report view."]
    ,["Felrapporten är ogiltig eller för stor för Windows-delning (max 24 MB).", "The bug report is invalid or too large for Windows sharing (max. 24 MB)."]
    ,["Windows-hjälparen svarade inte. Ingen rapport har skickats.", "The Windows helper did not respond. No report has been sent."]
    ,["Windows-delning kunde inte startas.", "Windows sharing could not be started."]
    ,["Supportadressen är inte en giltig e-postadress.", "The support address is not a valid email address."]
    ,["Konsultinloggning är inte konfigurerad ännu.", "Consultant sign-in is not configured yet."]
    ,["Entra-inloggningen kunde inte verifieras.", "The Entra sign-in could not be verified."]
    ,["Entra-inloggningen kunde inte slutföras.", "The Entra sign-in could not be completed."]
    ,["Microsoft-inloggningen måste förnyas.", "The Microsoft sign-in must be renewed."]
    ,["Konsultinloggningen har gått ut. Logga in igen.", "The consultant sign-in has expired. Sign in again."]
    ,["Konsultinloggningen behöver förnyas.", "The consultant sign-in needs to be renewed."]
    ,["Konsultlicensen kunde inte kontrolleras.", "The consultant license could not be checked."]
    ,["Licenstjänsten saknar stöd för konsultregistrering. Distribuera den senaste tjänste-ZIP-filen.", "The license service does not support consultant registration. Deploy the latest service ZIP file."]
    ,["Licenstjänsten avvisade Microsoft-inloggningen. Kontrollera LICENSE_ENTRA_AUDIENCE och LICENSE_ENTRA_SCOPE i Azure.", "The license service rejected the Microsoft sign-in. Check LICENSE_ENTRA_AUDIENCE and LICENSE_ENTRA_SCOPE in Azure."]
    ,["Microsoft-autentisering är inte konfigurerad i licenstjänsten.", "Microsoft authentication is not configured in the license service."]
    ,["Microsoft-inloggningen avvisades av licenstjänsten.", "The license service rejected the Microsoft sign-in."]
    ,["Logga in med din konsultlicens.", "Sign in with your consultant license."]
    ,["Sparat {time}", "Saved {time}"]
    ,["Försök igen", "Try again"]
    ,["Godkänn alla steg för att slutföra granskningen. {count} kvar.", "Approve all steps to complete the review. {count} remaining."]
    ,["Välj intilliggande steg för att slå samman dem.", "Select adjacent steps to merge them."]
    ,["Stegen kunde inte slås samman.", "The steps could not be merged."]
    ,["Senaste ändringen ångrades.", "The latest change was undone."]
    ,["Ändringen gjordes om.", "The change was redone."]
    ,["Annoteringsändringen ångrades.", "The annotation change was undone."]
    ,["Annoteringsändringen gjordes om.", "The annotation change was redone."]
    ,["Inte angiven", "Not set"]
    ,["Låg", "Low"]
    ,["Medel", "Medium"]
    ,["Hög", "High"]
    ,["Kritisk", "Critical"]
    ,["Svart", "Black"]
    ,["Vit", "White"]
    ,["Mörkblå", "Dark blue"]
    ,["Turkos", "Turquoise"]
    ,["Röd", "Red"]
    ,["Grön", "Green"]
    ,["Gul", "Yellow"]
    ,["Orange", "Orange"]
    ,["Konsultregistreringen kunde inte skapas (HTTP {status}).", "The consultant registration could not be created (HTTP {status})."]
    ,["Användaren kunde inte registreras (HTTP {status}).", "The user could not be registered (HTTP {status})."]
    ,["Nästa steg", "Next step"]
    ,["Godkänn och nästa", "Approve and next"]
    ,["Steg {step} dolt.", "Step {step} hidden."]
    ,["{approved} av {total} godkända", "{approved} of {total} approved"]
    ,["Dokument: {document} · Gränssnitt: {interface}", "Document: {document} · Interface: {interface}"]
    ,["Visa dokument", "Show document"]
    ,["Dölj dokument", "Hide document"]
    ,["Motsvarande dokumentposition visas.", "The corresponding position in the document is shown."]
    ,["Dokumentation: {name}", "Documentation: {name}"]
    ,["Alla steg är godkända. Dokumentet är klart att dela.", "All steps are approved. The document is ready to share."]
    ,["Inställningar", "Settings"]
    ,["+ Ny inspelning", "+ New recording"]
    ,["Vyer", "Views"]
    ,["Processdokumentation och felrapporter från dina inspelningar i Business Central.", "Process documentation and bug reports from your recordings in Business Central."]
    ,["Fortsätt där du slutade", "Continue where you left off"]
    ,["Alla dokument", "All documents"]
    ,["Välj flera", "Select multiple"]
    ,["Visa", "Show"]
    ,["Alla", "All"]
    ,["Felrapporter", "Bug reports"]
    ,["Behöver granskas", "Needs review"]
    ,["Favoriter", "Favorites"]
    ,["Arkiverade", "Archived documents"]
    ,["Ändringar sparas direkt.", "Changes are saved automatically."]
    ,["Inställningsgrupper", "Settings groups"]
    ,["Allmänt", "General"]
    ,["Avancerat", "Advanced"]
    ,["Standardvärden för nya dokument.", "Default values for new documents."]
    ,["Används i nya och befintliga dokument som inte har en egen manuellt ändrad text.", "Used in new and existing documents that do not have their own manually edited text."]
    ,["Starta en ny inspelning", "Start a new recording"]
    ,["Inspelningen startas från Business Central-fliken.", "Recording starts from the Business Central tab."]
    ,["Öppna Business Central i en flik i den här webbläsaren.", "Open Business Central in a tab in this browser."]
    ,["Välj BC Process Studio i webbläsarens verktygsfält.", "Select BC Process Studio in the browser toolbar."]
    ,["Välj Dokumentera en process eller Rapportera ett fel.", "Choose Document a process or Report a bug."]
    ,["Gå till Business Central", "Go to Business Central"]
    ,["Ingen Business Central-flik är öppen. Öppna Business Central och följ stegen ovan.", "No Business Central tab is open. Open Business Central and follow the steps above."]
    ,["Inställningarna kunde inte sparas.", "The settings could not be saved."]
    ,["Inställningarna kunde inte sparas. {detail}", "The settings could not be saved. {detail}"]
    ,["Kontrollera supportadressen.", "Check the support address."]
    ,["\"{title}\" har arkiverats. Du hittar det under Arkiverade.", "\"{title}\" has been archived. You can find it under Archived documents."]
    ,["\"{title}\" har återställts från arkivet.", "\"{title}\" has been restored from the archive."]
    ,["\"{title}\" har tagits bort.", "\"{title}\" has been deleted."]
    ,["Tillgängliga variabler: {variables}", "Available variables: {variables}"]
    ,["Förhandsvisning: {filename}", "Preview: {filename}"]
    ,["Infoga variabeln {token}", "Insert the variable {token}"]
    ,["Okända variabler: {variables}.", "Unknown variables: {variables}."]
    ,["Variabeln \"{token}\" saknar avslutande }.", "The variable \"{token}\" is missing a closing }."]
    ,["Dubbla { är inte tillåtna.", "Double { are not allowed."]
    ,["fristående }", "stray }"]
    ,["Felaktiga variabler: {variables}. Använd formatet {namn}.", "Invalid variables: {variables}. Use the format {name}."]
    ,["Ange en giltig e-postadress, till exempel support@example.com.", "Enter a valid email address, for example support@example.com."]
    ,["Rätta filnamnsmallen.", "Correct the file name template."]
  ]);

  const staticLookup = new Map();
  const staticSources = new WeakMap();
  // Pairs with {placeholders} also translate messages that carry values, such as HTTP statuses.
  const staticTemplates = [];
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  STATIC_TEXT.forEach(([sv, en]) => {
    const variants = { "sv-SE": sv, "en-US": en };
    for (const locale of SUPPORTED_LOCALES) variants[locale] = languageRegistry.translate(en, locale, sv);
    for (const value of Object.values(variants)) staticLookup.set(value, variants);
    if (!/\{[a-z]+\}/iu.test(sv)) return;
    for (const value of new Set(Object.values(variants))) {
      const names = [...value.matchAll(/\{([a-z]+)\}/giu)].map(match => match[1]);
      const pattern = new RegExp(`^${escapeRegExp(value)
        .replace(/\\\{[a-z]+\\\}/giu, "([\\s\\S]+?)")}$`, "u");
      staticTemplates.push({ pattern, names, variants });
    }
  });
  const safeTextTags = new Set(["BUTTON", "SUMMARY", "LEGEND", "OPTION", "TH",
    "DT", "LABEL", "H2", "H3", "H4"]);
  const observedTargets = new WeakSet();

  function translateStaticText(value, locale) {
    const normalized = normalizeLocale(locale);
    return staticLookup.get(String(value || "").trim())?.[normalized] || value;
  }

  // Messages (not page text) may also match a template, so values such as HTTP statuses
  // are carried into the translation.
  function translateMessageText(value, locale) {
    const normalized = normalizeLocale(locale);
    const text = String(value || "").trim();
    const exact = staticLookup.get(text)?.[normalized];
    if (exact) return exact;
    for (const template of staticTemplates) {
      const match = template.pattern.exec(text);
      if (!match) continue;
      return template.names.reduce((result, name, index) =>
        result.replace(`{${name}}`, () => match[index + 1]), template.variants[normalized]);
    }
    return value;
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
      if (parent && (safeTextTags.has(parent.tagName) || (parent.tagName === "SPAN" &&
          safeTextTags.has(parent.parentElement?.tagName))) &&
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
    applyStaticAttributes(locale, target.body || target);
  }

  // Static tooltips and accessible names written in the page markup.
  const staticAttributes = ["title", "aria-label", "data-tooltip-native-title"];
  const staticAttributeSources = new WeakMap();
  function applyStaticAttributes(locale, target) {
    if (!target?.querySelectorAll) return;
    const selector = staticAttributes.map(name => `[${name}]`).join(",");
    for (const element of target.querySelectorAll(selector)) {
      if (element.closest?.("#documentWorkspace, #reviewList, #annotationStage, [data-i18n-ignore]")) continue;
      const sources = staticAttributeSources.get(element) || {};
      for (const name of staticAttributes) {
        if (!element.hasAttribute(name) || element.hasAttribute(`data-i18n-${name}`)) continue;
        const current = element.getAttribute(name);
        const previous = sources[name];
        const source = previous?.rendered === current ? previous.source : current;
        const translated = translateStaticText(source, locale);
        sources[name] = { source, rendered: translated };
        if (translated !== current) element.setAttribute(name, translated);
      }
      staticAttributeSources.set(element, sources);
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
    if (outlookMessages[normalized]?.[key] !== undefined) return outlookMessages[normalized][key];
    if (asyncOperationMessages[normalized]?.[key] !== undefined) {
      return asyncOperationMessages[normalized][key];
    }
    if (recordingWarningMessages[normalized]?.[key] !== undefined) {
      return recordingWarningMessages[normalized][key];
    }
    if (reviewRuntimeMessages[normalized]?.[key] !== undefined) {
      return reviewRuntimeMessages[normalized][key];
    }
    if (libraryConfirmationMessages[normalized]?.[key] !== undefined) {
      return libraryConfirmationMessages[normalized][key];
    }
    if (reviewErrorMessages[normalized]?.[key] !== undefined) {
      return reviewErrorMessages[normalized][key];
    }
    if (libraryBatchMessages[normalized]?.[key] !== undefined) {
      return libraryBatchMessages[normalized][key];
    }
    if (dashboardOperationMessages[normalized]?.[key] !== undefined) {
      return dashboardOperationMessages[normalized][key];
    }
    if (libraryDeleteMessages[normalized]?.[key] !== undefined) {
      return libraryDeleteMessages[normalized][key];
    }
    if (processMapMessages[normalized]?.[key] !== undefined) {
      return processMapMessages[normalized][key];
    }
    if (processMapEditorMessages[normalized]?.[key] !== undefined) {
      return processMapEditorMessages[normalized][key];
    }
    if (processMapViewMessages[normalized]?.[key] !== undefined) {
      return processMapViewMessages[normalized][key];
    }
    if (processRouteMessages[normalized]?.[key] !== undefined) {
      return processRouteMessages[normalized][key];
    }
    if (processVersionMessages[normalized]?.[key] !== undefined) {
      return processVersionMessages[normalized][key];
    }
    if (processThemeMessages[normalized]?.[key] !== undefined) {
      return processThemeMessages[normalized][key];
    }
    if (processAnalysisMessages[normalized]?.[key] !== undefined) {
      return processAnalysisMessages[normalized][key];
    }
    if (processAnalysisQualifierMessages[normalized]?.[key] !== undefined) {
      return processAnalysisQualifierMessages[normalized][key];
    }
    if (messages[normalized]?.[key] !== undefined) return messages[normalized][key];
    if (messages["en-US"]?.[key] !== undefined) return languageRegistry.translate(
      messages["en-US"][key], normalized, messages[DEFAULT_LOCALE]?.[key]);
    if (messages[DEFAULT_LOCALE]?.[key] !== undefined) return messages[DEFAULT_LOCALE][key];
    // Interface text written as a static Swedish/English pair is keyed by its own wording.
    return translateMessageText(key, normalized);
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
