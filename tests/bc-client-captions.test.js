const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Client controls that are not business steps. Captions come from the Business Central web
// client's own language resources and from recordings, never from hand translation.
const captions = require("../src/engine/bc-client-captions");
const locales = require("../src/engine/language-registry").supported("document")
  .map(item => item.locale);

for (const [caption, category] of [["Stäng", "close"], ["Close", "close"], ["Dismiss", "close"],
  ["Rulla åt höger", "scroll"], ["Scroll to the left", "scroll"], ["Visa resten", "display"],
  ["Show less", "display"], ["Tillbaka", "history"], ["Forward", "history"],
  ["Berätta vad du vill göra", "tellMe"], ["Tell me what you want to do", "tellMe"],
  ["Värdet i det här fältet är obligatoriskt", "fieldHint"],
  ["Press Alt+I to get a suggestion for this field", "fieldHint"],
  // Wordings of the current client resources.
  ["The value for this field is required.", "fieldHint"],
  ["This group contains one or more mandatory fields that are not filled in.", "fieldHint"],
  ["Show the rest", "display"], ["Visa mer", "display"],
  ["Tell me what you want to do. Quickly access actions, pages, reports, documentation, and apps and consulting services.", "tellMe"]]) {
  assert(captions.matches(category, caption), `${category}: ${caption}`);
}

// Captions from the web client resources (platform 26.18.55014.0) in every other language.
const resourceCaptions = {
  "fr-FR": { close: "Fermer", scroll: "Défiler vers la droite", display: "Afficher le reste",
    history: "Précédent", tellMe: "Dites-moi ce que vous voulez faire",
    fieldHint: "La valeur de ce champ est obligatoire." },
  "de-DE": { close: "Schließen", scroll: "Nach rechts verschieben", display: "Mehr anzeigen",
    history: "Zurück", tellMe: "Was möchten Sie tun?",
    fieldHint: "Diese Gruppe enthält mindestens ein Pflichtfeld, das nicht ausgefüllt wurde." },
  "es-ES": { close: "Cerrar", scroll: "Desplazarse hacia la izquierda", display: "Mostrar menos",
    history: "Atrás", tellMe: "Indique qué desea hacer.",
    fieldHint: "Pulse Alt + I para generar una sugerencia para este campo." },
  "da-DK": { close: "Luk", scroll: "Rul til højre", display: "Vis sekundære handlinger",
    history: "Fremad", tellMe: "Fortæl mig, hvad du vil foretage dig",
    fieldHint: "Værdien i dette felt er påkrævet." },
  "fi-FI": { close: "Sulje", scroll: "Vieritä vasemmalle", display: "Näytä loput",
    history: "Takaisin", tellMe: "Kerro, mitä haluat tehdä. Voit siirtyä nopeasti toimintoihin.",
    fieldHint: "Luo ehdotus tälle kentälle painamalla Alt+I." },
  "nb-NO": { close: "Lukk", scroll: "Bla til venstre", display: "Skjul sekundære handlinger",
    history: "Tilbake", tellMe: "Fortell hva du vil gjøre",
    fieldHint: "Denne gruppen inneholder én eller flere obligatoriske felt som ikke er fylt ut." }
};
for (const [locale, byCategory] of Object.entries(resourceCaptions)) {
  for (const [category, caption] of Object.entries(byCategory)) {
    assert(captions.matches(category, caption), `${locale} ${category}: ${caption}`);
  }
}

// Business actions stay steps, including actions that share a word with a client control.
for (const caption of ["Release", "Post...", "Statistics", "Close Order", "Show Document", "",
  "Afvis", "Hylkää", "Verwerfen", "Descartar", "Forkast", "Ignorer", "Reject", "Avvisa",
  "Luk ordre", "Auftrag schließen", "Fermer la commande", "Vis bilag", "Mostrar documento"]) {
  assert(!Object.keys(captions.CAPTIONS).some(category => captions.matches(category, caption)),
    `not a client control: ${caption}`);
}

// Every category covers every registered Business Central language, and the resource keys
// behind the catalog are documented.
assert.deepStrictEqual(captions.gaps(locales), []);
const doc = fs.readFileSync(path.join(__dirname, "../docs/EVENT_STEP_GROUPING.md"), "utf8");
for (const key of ["CloseButton", "ScrollRight", "CommandBar_ShowWrappedItemsInContextMenu_Tooltip",
  "HelpPaneBackButton", "ProductMenuBar_PageSearch", "MandatoryIcon_Tooltip", "26.18.55014.0"]) {
  assert(doc.includes(key), `documented source: ${key}`);
}

// The engines use the shared catalog instead of their own caption lists.
for (const file of ["src/engine/event-step-grouping.js", "src/engine/event-normalization.js",
  "src/engine/noise-filter.js", "src/document/semantic-interaction-engine.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes("bc-client-captions"), file);
  assert(!/berätta vad du vill göra|visa resten|rulla\|scroll/iu.test(source), `${file} keeps no own list`);
}
const background = fs.readFileSync(path.join(__dirname, "../src/recorder/background.js"), "utf8");
assert(background.indexOf('"engine/bc-client-captions.js"') <
  background.indexOf('"engine/event-normalization.js"'));
const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.html"), "utf8");
assert(dashboard.indexOf("engine/bc-client-captions.js") < dashboard.indexOf("engine/noise-filter.js"));

console.log("Business Central client caption tests passed.");
