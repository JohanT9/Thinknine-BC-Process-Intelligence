(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CaptureIndicatorI18n = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const messages = Object.freeze({
    "sv-SE": Object.freeze({ "Recording needs attention": "Inspelningen behöver kontrolleras", "Recording in progress": "Inspelning pågår", "Event captured": "Händelse registrerad", "Waiting for the first event": "Väntar på första händelsen", events: "händelser", screenshots: "bilder", Minimize: "Minimera", "Mark the latest step": "Markera senaste steget", "Mark the latest step as important": "Markera senaste steget som viktigt", "Important step": "Viktigt steg", "Use the latest step screenshot": "Använd senaste stegets bild", "Use this screenshot": "Använd denna bild", "Create a new section after the latest step": "Skapa en ny sektion efter senaste steget", "New section": "Ny sektion", "Ignore the latest step in the document": "Ignorera senaste steget i dokumentet", Ignore: "Ignorera", Stop: "Stoppa", Show: "Visa", "Open the extension to stop the recording.": "Öppna tillägget för att stoppa inspelningen.", "The marker could not be saved. Try again after the next event.": "Markeringen kunde inte sparas. Försök igen efter nästa händelse.", "The latest step was marked as important": "Senaste steget markerades som viktigt", "The latest screenshot was selected": "Senaste bilden har valts", "A new section will be created after the latest step": "Ny sektion skapas efter senaste steget", "The latest step will be ignored in the document": "Senaste steget ignoreras i dokumentet" }),
    "en-US": Object.freeze({ "Recording needs attention": "Recording needs attention", "Recording in progress": "Recording in progress", "Event captured": "Event captured", "Waiting for the first event": "Waiting for the first event", events: "events", screenshots: "screenshots", Minimize: "Minimize", "Mark the latest step": "Mark the latest step", "Mark the latest step as important": "Mark the latest step as important", "Important step": "Important step", "Use the latest step screenshot": "Use the latest step screenshot", "Use this screenshot": "Use this screenshot", "Create a new section after the latest step": "Create a new section after the latest step", "New section": "New section", "Ignore the latest step in the document": "Ignore the latest step in the document", Ignore: "Ignore", Stop: "Stop", Show: "Show", "Open the extension to stop the recording.": "Open the extension to stop the recording.", "The marker could not be saved. Try again after the next event.": "The marker could not be saved. Try again after the next event.", "The latest step was marked as important": "The latest step was marked as important", "The latest screenshot was selected": "The latest screenshot was selected", "A new section will be created after the latest step": "A new section will be created after the latest step", "The latest step will be ignored in the document": "The latest step will be ignored in the document" }),
    "fr-FR": Object.freeze({ "Recording needs attention": "L’enregistrement nécessite une vérification", "Recording in progress": "Enregistrement en cours", "Event captured": "Événement capturé", "Waiting for the first event": "En attente du premier événement", events: "événements", screenshots: "captures d’écran", Minimize: "Réduire", "Mark the latest step": "Marquer la dernière étape", "Mark the latest step as important": "Marquer la dernière étape comme importante", "Important step": "Étape importante", "Use the latest step screenshot": "Utiliser la capture de la dernière étape", "Use this screenshot": "Utiliser cette capture", "Create a new section after the latest step": "Créer une section après la dernière étape", "New section": "Nouvelle section", "Ignore the latest step in the document": "Ignorer la dernière étape dans le document", Ignore: "Ignorer", Stop: "Arrêter", Show: "Afficher", "Open the extension to stop the recording.": "Ouvrez l’extension pour arrêter l’enregistrement.", "The marker could not be saved. Try again after the next event.": "Le marqueur n’a pas pu être enregistré. Réessayez après l’événement suivant.", "The latest step was marked as important": "La dernière étape a été marquée comme importante", "The latest screenshot was selected": "La dernière capture a été sélectionnée", "A new section will be created after the latest step": "Une nouvelle section sera créée après la dernière étape", "The latest step will be ignored in the document": "La dernière étape sera ignorée dans le document" }),
    "de-DE": Object.freeze({ "Recording needs attention": "Aufzeichnung muss überprüft werden", "Recording in progress": "Aufzeichnung läuft", "Event captured": "Ereignis erfasst", "Waiting for the first event": "Warten auf das erste Ereignis", events: "Ereignisse", screenshots: "Screenshots", Minimize: "Minimieren", "Mark the latest step": "Letzten Schritt markieren", "Mark the latest step as important": "Letzten Schritt als wichtig markieren", "Important step": "Wichtiger Schritt", "Use the latest step screenshot": "Screenshot des letzten Schritts verwenden", "Use this screenshot": "Diesen Screenshot verwenden", "Create a new section after the latest step": "Nach dem letzten Schritt einen neuen Abschnitt erstellen", "New section": "Neuer Abschnitt", "Ignore the latest step in the document": "Letzten Schritt im Dokument ignorieren", Ignore: "Ignorieren", Stop: "Stoppen", Show: "Anzeigen", "Open the extension to stop the recording.": "Öffnen Sie die Erweiterung, um die Aufzeichnung zu beenden.", "The marker could not be saved. Try again after the next event.": "Die Markierung konnte nicht gespeichert werden. Versuchen Sie es nach dem nächsten Ereignis erneut.", "The latest step was marked as important": "Der letzte Schritt wurde als wichtig markiert", "The latest screenshot was selected": "Der letzte Screenshot wurde ausgewählt", "A new section will be created after the latest step": "Nach dem letzten Schritt wird ein neuer Abschnitt erstellt", "The latest step will be ignored in the document": "Der letzte Schritt wird im Dokument ignoriert" }),
    "es-ES": Object.freeze({ "Recording needs attention": "La grabación requiere revisión", "Recording in progress": "Grabación en curso", "Event captured": "Evento capturado", "Waiting for the first event": "Esperando el primer evento", events: "eventos", screenshots: "capturas de pantalla", Minimize: "Minimizar", "Mark the latest step": "Marcar el último paso", "Mark the latest step as important": "Marcar el último paso como importante", "Important step": "Paso importante", "Use the latest step screenshot": "Usar la captura del último paso", "Use this screenshot": "Usar esta captura", "Create a new section after the latest step": "Crear una sección después del último paso", "New section": "Nueva sección", "Ignore the latest step in the document": "Omitir el último paso del documento", Ignore: "Omitir", Stop: "Detener", Show: "Mostrar", "Open the extension to stop the recording.": "Abra la extensión para detener la grabación.", "The marker could not be saved. Try again after the next event.": "No se pudo guardar la marca. Vuelva a intentarlo después del siguiente evento.", "The latest step was marked as important": "El último paso se marcó como importante", "The latest screenshot was selected": "Se seleccionó la última captura", "A new section will be created after the latest step": "Se creará una sección después del último paso", "The latest step will be ignored in the document": "El último paso se omitirá en el documento" }),
    "da-DK": Object.freeze({ "Recording needs attention": "Optagelsen skal gennemgås", "Recording in progress": "Optagelse i gang", "Event captured": "Hændelse registreret", "Waiting for the first event": "Venter på den første hændelse", events: "hændelser", screenshots: "skærmbilleder", Minimize: "Minimer", "Mark the latest step": "Markér det seneste trin", "Mark the latest step as important": "Markér det seneste trin som vigtigt", "Important step": "Vigtigt trin", "Use the latest step screenshot": "Brug skærmbilledet fra det seneste trin", "Use this screenshot": "Brug dette skærmbillede", "Create a new section after the latest step": "Opret en ny sektion efter det seneste trin", "New section": "Ny sektion", "Ignore the latest step in the document": "Ignorér det seneste trin i dokumentet", Ignore: "Ignorér", Stop: "Stop", Show: "Vis", "Open the extension to stop the recording.": "Åbn udvidelsen for at stoppe optagelsen.", "The marker could not be saved. Try again after the next event.": "Markeringen kunne ikke gemmes. Prøv igen efter næste hændelse.", "The latest step was marked as important": "Det seneste trin blev markeret som vigtigt", "The latest screenshot was selected": "Det seneste skærmbillede blev valgt", "A new section will be created after the latest step": "Der oprettes en ny sektion efter det seneste trin", "The latest step will be ignored in the document": "Det seneste trin ignoreres i dokumentet" }),
    "fi-FI": Object.freeze({ "Recording needs attention": "Tallenne on tarkistettava", "Recording in progress": "Tallennus käynnissä", "Event captured": "Tapahtuma tallennettu", "Waiting for the first event": "Odotetaan ensimmäistä tapahtumaa", events: "tapahtumaa", screenshots: "kuvakaappausta", Minimize: "Pienennä", "Mark the latest step": "Merkitse viimeisin vaihe", "Mark the latest step as important": "Merkitse viimeisin vaihe tärkeäksi", "Important step": "Tärkeä vaihe", "Use the latest step screenshot": "Käytä viimeisimmän vaiheen kuvakaappausta", "Use this screenshot": "Käytä tätä kuvakaappausta", "Create a new section after the latest step": "Luo uusi osio viimeisimmän vaiheen jälkeen", "New section": "Uusi osio", "Ignore the latest step in the document": "Ohita dokumentin viimeisin vaihe", Ignore: "Ohita", Stop: "Lopeta", Show: "Näytä", "Open the extension to stop the recording.": "Avaa laajennus pysäyttääksesi tallennuksen.", "The marker could not be saved. Try again after the next event.": "Merkkiä ei voitu tallentaa. Yritä uudelleen seuraavan tapahtuman jälkeen.", "The latest step was marked as important": "Viimeisin vaihe merkittiin tärkeäksi", "The latest screenshot was selected": "Viimeisin kuvakaappaus valittiin", "A new section will be created after the latest step": "Uusi osio luodaan viimeisimmän vaiheen jälkeen", "The latest step will be ignored in the document": "Viimeisin vaihe ohitetaan dokumentissa" }),
    "nb-NO": Object.freeze({ "Recording needs attention": "Opptaket må gjennomgås", "Recording in progress": "Opptak pågår", "Event captured": "Hendelse registrert", "Waiting for the first event": "Venter på den første hendelsen", events: "hendelser", screenshots: "skjermbilder", Minimize: "Minimer", "Mark the latest step": "Merk det siste trinnet", "Mark the latest step as important": "Merk det siste trinnet som viktig", "Important step": "Viktig trinn", "Use the latest step screenshot": "Bruk skjermbildet fra det siste trinnet", "Use this screenshot": "Bruk dette skjermbildet", "Create a new section after the latest step": "Opprett en ny seksjon etter det siste trinnet", "New section": "Ny seksjon", "Ignore the latest step in the document": "Ignorer det siste trinnet i dokumentet", Ignore: "Ignorer", Stop: "Stopp", Show: "Vis", "Open the extension to stop the recording.": "Åpne utvidelsen for å stoppe opptaket.", "The marker could not be saved. Try again after the next event.": "Markøren kunne ikke lagres. Prøv igjen etter neste hendelse.", "The latest step was marked as important": "Det siste trinnet ble merket som viktig", "The latest screenshot was selected": "Det siste skjermbildet ble valgt", "A new section will be created after the latest step": "En ny seksjon opprettes etter det siste trinnet", "The latest step will be ignored in the document": "Det siste trinnet ignoreres i dokumentet" })
  });

  const warningMessages = Object.freeze({
    "sv-SE": Object.freeze({
      "capture-write-error": "En inspelningshändelse kunde inte sparas. Inspelningen kan vara ofullständig.",
      "events-missing": "Några händelser har inte kommit fram. Inspelningen kan vara ofullständig.",
      "license-blocked": "Licensen eller tenantkontexten hindrar fortsatt inspelning.",
      "recording-truncated": "Gränsen för antal händelser har nåtts. Inspelningen är ofullständig.",
      "screenshot-error": "Minst en skärmbild kunde inte tas.",
      "screenshot-dropped": "Några skärmbilder kunde inte sparas. Vissa steg kan sakna bild.",
      "bc-not-connected": "Kontakten med Business Central är inte bekräftad.",
      "no-events-yet": "Inga användarhändelser har registrerats ännu."
    }),
    "en-US": Object.freeze({
      "capture-write-error": "A recording event could not be saved. The recording may be incomplete.",
      "events-missing": "Some events have not arrived. The recording may be incomplete.",
      "license-blocked": "The license or tenant context is preventing recording from continuing.",
      "recording-truncated": "The event limit was reached. The recording is incomplete.",
      "screenshot-error": "At least one screenshot could not be captured.",
      "screenshot-dropped": "Some screenshots could not be saved. Some steps may be missing an image.",
      "bc-not-connected": "Connection to Business Central is not confirmed.",
      "no-events-yet": "No user actions have been recorded yet."
    }),
    "fr-FR": Object.freeze({
      "capture-write-error": "Un événement d’enregistrement n’a pas pu être sauvegardé. L’enregistrement est peut-être incomplet.",
      "events-missing": "Certains événements ne sont pas arrivés. L’enregistrement est peut-être incomplet.",
      "license-blocked": "La licence ou le contexte du locataire empêche la poursuite de l’enregistrement.",
      "recording-truncated": "La limite d’événements est atteinte. L’enregistrement est incomplet.",
      "screenshot-error": "Au moins une capture d’écran n’a pas pu être prise.",
      "screenshot-dropped": "Certaines captures n’ont pas pu être sauvegardées. Des étapes peuvent ne pas avoir d’image.",
      "bc-not-connected": "La connexion à Business Central n’est pas confirmée.",
      "no-events-yet": "Aucune action utilisateur n’a encore été enregistrée."
    }),
    "de-DE": Object.freeze({
      "capture-write-error": "Ein Aufzeichnungsereignis konnte nicht gespeichert werden. Die Aufzeichnung ist möglicherweise unvollständig.",
      "events-missing": "Einige Ereignisse sind nicht angekommen. Die Aufzeichnung ist möglicherweise unvollständig.",
      "license-blocked": "Die Lizenz oder der Mandantenkontext verhindert die Fortsetzung der Aufzeichnung.",
      "recording-truncated": "Das Ereignislimit wurde erreicht. Die Aufzeichnung ist unvollständig.",
      "screenshot-error": "Mindestens ein Screenshot konnte nicht aufgenommen werden.",
      "screenshot-dropped": "Einige Screenshots konnten nicht gespeichert werden. Bei manchen Schritten fehlt möglicherweise ein Bild.",
      "bc-not-connected": "Die Verbindung zu Business Central wurde nicht bestätigt.",
      "no-events-yet": "Es wurden noch keine Benutzeraktionen aufgezeichnet."
    }),
    "es-ES": Object.freeze({
      "capture-write-error": "No se pudo guardar un evento de grabación. Es posible que la grabación esté incompleta.",
      "events-missing": "Algunos eventos no han llegado. Es posible que la grabación esté incompleta.",
      "license-blocked": "La licencia o el contexto del inquilino impide continuar la grabación.",
      "recording-truncated": "Se alcanzó el límite de eventos. La grabación está incompleta.",
      "screenshot-error": "No se pudo capturar al menos una captura de pantalla.",
      "screenshot-dropped": "No se pudieron guardar algunas capturas. Es posible que falte una imagen en algunos pasos.",
      "bc-not-connected": "No se ha confirmado la conexión con Business Central.",
      "no-events-yet": "Todavía no se han registrado acciones del usuario."
    }),
    "da-DK": Object.freeze({
      "capture-write-error": "En optagelseshændelse kunne ikke gemmes. Optagelsen kan være ufuldstændig.",
      "events-missing": "Nogle hændelser er ikke nået frem. Optagelsen kan være ufuldstændig.",
      "license-blocked": "Licensen eller lejerkonteksten forhindrer optagelsen i at fortsætte.",
      "recording-truncated": "Grænsen for hændelser er nået. Optagelsen er ufuldstændig.",
      "screenshot-error": "Mindst ét skærmbillede kunne ikke tages.",
      "screenshot-dropped": "Nogle skærmbilleder kunne ikke gemmes. Nogle trin mangler muligvis et billede.",
      "bc-not-connected": "Forbindelsen til Business Central er ikke bekræftet.",
      "no-events-yet": "Der er endnu ikke registreret nogen brugerhandlinger."
    }),
    "fi-FI": Object.freeze({
      "capture-write-error": "Tallennustapahtumaa ei voitu tallentaa. Tallenne saattaa olla puutteellinen.",
      "events-missing": "Osa tapahtumista ei ole tullut perille. Tallenne saattaa olla puutteellinen.",
      "license-blocked": "Käyttöoikeus tai vuokraajan konteksti estää tallennuksen jatkamisen.",
      "recording-truncated": "Tapahtumien enimmäismäärä saavutettiin. Tallenne on puutteellinen.",
      "screenshot-error": "Vähintään yhtä kuvakaappausta ei voitu ottaa.",
      "screenshot-dropped": "Joitakin kuvakaappauksia ei voitu tallentaa. Joiltakin vaiheilta saattaa puuttua kuva.",
      "bc-not-connected": "Yhteyttä Business Centraliin ei ole vahvistettu.",
      "no-events-yet": "Käyttäjän toimintoja ei ole vielä tallennettu."
    }),
    "nb-NO": Object.freeze({
      "capture-write-error": "En opptakshendelse kunne ikke lagres. Opptaket kan være ufullstendig.",
      "events-missing": "Noen hendelser har ikke kommet frem. Opptaket kan være ufullstendig.",
      "license-blocked": "Lisensen eller leietakerkonteksten hindrer opptaket i å fortsette.",
      "recording-truncated": "Grensen for hendelser er nådd. Opptaket er ufullstendig.",
      "screenshot-error": "Minst ett skjermbilde kunne ikke tas.",
      "screenshot-dropped": "Noen skjermbilder kunne ikke lagres. Noen trinn kan mangle et bilde.",
      "bc-not-connected": "Tilkoblingen til Business Central er ikke bekreftet.",
      "no-events-yet": "Ingen brukerhandlinger er registrert ennå."
    })
  });

  function translate(english, locale = "sv-SE", swedish = english) {
    const normalized = String(locale || "sv-SE").toLowerCase();
    const language = normalized.startsWith("nb") || normalized.startsWith("no") ? "nb-NO" :
      normalized.startsWith("fr") ? "fr-FR" : normalized.startsWith("de") ? "de-DE" :
        normalized.startsWith("es") ? "es-ES" : normalized.startsWith("da") ? "da-DK" :
          normalized.startsWith("fi") ? "fi-FI" : normalized.startsWith("en") ? "en-US" : "sv-SE";
    return messages[language]?.[english] ?? (language === "sv-SE" ? swedish : english);
  }
  function translateWarning(code, locale = "sv-SE") {
    const normalized = String(locale || "sv-SE").toLowerCase();
    const language = normalized.startsWith("nb") || normalized.startsWith("no") ? "nb-NO" :
      normalized.startsWith("fr") ? "fr-FR" : normalized.startsWith("de") ? "de-DE" :
        normalized.startsWith("es") ? "es-ES" : normalized.startsWith("da") ? "da-DK" :
          normalized.startsWith("fi") ? "fi-FI" : normalized.startsWith("en") ? "en-US" : "sv-SE";
    return warningMessages[language]?.[String(code || "")] || "";
  }
  return Object.freeze({ messages, warningMessages, translate, translateWarning });
});
