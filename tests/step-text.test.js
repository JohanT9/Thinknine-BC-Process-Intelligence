const assert = require("assert");
const stepText = require("../src/engine/step-text");
const registry = require("../src/engine/language-registry");
const grammar = require("../src/document/presentation-grammar");

// Every registered document language has a sentence for every kind of step.
const registered = registry.languages.filter(language => language.document)
  .map(language => language.locale);
assert.deepStrictEqual([...stepText.LOCALES].sort(), [...registered].sort(),
  "step texts cover exactly the registered languages");

const SAMPLE = { action: "Släpp", page: "Inköpsorder", keys: "Alt+N", opened: "Ny - Inköpsorder",
  query: "ink ord", result: "Inköpsorder", search: "Sök", field: "Antal", typed: "5",
  choice: "Frisläppt", rowType: "Artikel", value: "30043", record: "PO1", recordOf: "PurchaseOrder",
  list: "Inköpsorder", entity: "PurchaseOrder", path: ["Hantera", "Rad", "Funktion"] };
// Words only the Swedish sentences use; a sentence in another language must not contain them.
const SWEDISH = /\b(?:Välj|Ange|Tryck|Sök efter|Öppna|Börja|Fyll i|sidan|listan|dialogrutan|värde|posten|söktext|för att|genom att|som värde|Aktivera|Inaktivera|inköpsordern)\b/u;
for (const kind of stepText.KINDS) {
  const descriptor = stepText.describe(kind, SAMPLE);
  for (const locale of stepText.LOCALES) {
    const rendered = stepText.render(descriptor, locale);
    assert(rendered, `${kind} renders in ${locale}`);
    assert(!/[{}]/u.test(rendered.text), `${kind} in ${locale} fills every value: ${rendered.text}`);
    assert.strictEqual(rendered.runs[0].role, "action", `${kind} in ${locale} starts with what to do`);
    if (locale !== "sv-SE") {
      // The recorded captions are Swedish here; only the sentence around them is checked.
      const sentence = rendered.runs.filter(item => item.role === "text" || item.role === "action")
        .map(item => item.text).join(" ");
      assert(!SWEDISH.test(sentence), `${kind} in ${locale} has no Swedish words: ${rendered.text}`);
    }
    // A sentence written in a language is read back to the same description.
    const markdown = stepText.markdown(descriptor, locale);
    const parsed = stepText.parse(markdown, locale);
    assert(parsed, `${kind} in ${locale} is read back: ${markdown}`);
    assert.strictEqual(stepText.markdown(parsed, locale), markdown);
  }
}

// Entered values are shown bold and captions as interface text; the record kind is written in
// the document's language.
assert.deepStrictEqual(stepText.render(stepText.describe("enter", { typed: "5", field: "Antal" }),
  "en-US").runs, [{ text: "Enter ", role: "action" }, { text: "5", role: "value" },
  { text: " in ", role: "text" }, { text: "Antal", role: "interface" }, { text: ".", role: "text" }]);
assert.strictEqual(stepText.markdown(stepText.describe("create",
  { entity: "SalesOrder", action: "Neu", page: "Verkaufsaufträge" }), "de-DE"),
"Wählen Sie auf der Seite **Verkaufsaufträge** **Neu** aus, um einen neuen Datensatz (**Verkaufsauftrag**) zu erstellen.");
// A caption that ends with its own period ends the sentence.
assert.strictEqual(stepText.render(stepText.describe("enter", { typed: "10", field: "Nr." }),
  "sv-SE").text, "Ange 10 i Nr.");
assert.strictEqual(stepText.markdown(stepText.parse("Ange __10__ i **Nr.**."), "sv-SE"),
  "Ange __10__ i **Nr.**");
// A step without a value its sentence needs is not described.
assert.strictEqual(stepText.render({ kind: "enter", field: "Antal" }, "en-US"), null);
assert.strictEqual(stepText.render({ kind: "unknown" }, "en-US"), null);
assert.throws(() => stepText.describe("unknown"), /Unknown step text kind/u);

// The engine's Swedish sentences are read back; any other text is not.
const engineSentences = {
  "Välj **Släpp** på sidan **Inköpsorder**.": { kind: "actionOnPage", action: "Släpp", page: "Inköpsorder" },
  "Välj **Hantera** → **Rad** → **Funktion** → **Order** på sidan **Försäljningsorder**.":
    { kind: "pathOnPage", path: ["Hantera", "Rad", "Funktion", "Order"], page: "Försäljningsorder" },
  "Tryck på **Alt+N** för att öppna **Ny - Inköpsorder**.":
    { kind: "shortcutOpens", keys: "Alt+N", opened: "Ny - Inköpsorder" },
  "Sök efter __ink ord__ och öppna listan **Inköpsorder**.":
    { kind: "searchOpenList", query: "ink ord", result: "Inköpsorder" },
  "Välj posten **PO1** på sidan **Inköpsorder**.": { kind: "recordOnPage", record: "PO1", page: "Inköpsorder" },
  "Markera raden **30043** på sidan **Inköpsorder**.": { kind: "rowOnPage", record: "30043", page: "Inköpsorder" },
  "Markera raden **30043**.": { kind: "row", record: "30043" },
  "Börja skapa en ny **inköpsorder** genom att välja **Ny** på sidan **Inköpsorder**.":
    { kind: "create", entity: "PurchaseOrder", action: "Ny", page: "Inköpsorder" },
  "Välj **Ja** i dialogrutan.": { kind: "dialogAction", action: "Ja" },
  "Välj ett alternativ i **Status**.": { kind: "chooseOption", field: "Status" }
};
for (const [sentence, descriptor] of Object.entries(engineSentences)) {
  assert.deepStrictEqual({ ...stepText.parse(sentence) }, descriptor, sentence);
}
for (const sentence of ["Välj min egen formulering.", "Ange beloppet i **Belopp**.",
  "Välj **Släpp** på sidan **Inköpsorder** två gånger.", ""]) {
  assert.strictEqual(stepText.parse(sentence), null, sentence);
}
// The Swedish words of a step written by hand are never read as a different step.
assert.strictEqual(stepText.parse("Välj **Släpp** på sidan **Inköpsorder**.", "en-US"), null);

// The document writes a described step in its own language.
const action = { actionType: "RunAction", displayText: "Välj **Släpp** på sidan **Inköpsorder**.",
  stepText: stepText.parse("Välj **Släpp** på sidan **Inköpsorder**.") };
const documentWith = (documentLanguage, instruction = action.displayText) => ({
  schemaVersion: 1, documentId: "step-text", metadata: { title: "Step text", documentLanguage },
  sections: [{ sectionId: "workflow", kind: "workflow", title: "Workflow", blocks: [{
    blockId: "step:1", kind: "step", stepNumber: 1,
    interaction: { taskId: "t1", instruction, semanticActionModel: action },
    blocks: [{ blockId: "block:instruction:t1:1", kind: "paragraph", text: instruction }]
  }] }]
});
const stepSentence = (documentLanguage, instruction) => grammar.process(
  documentWith(documentLanguage, instruction)).sections[0].blocks[0].blocks[0];
const expected = {
  "sv-SE": "Välj Släpp på sidan Inköpsorder.", "en-US": "Choose Släpp on the Inköpsorder page.",
  "fr-FR": "Sélectionnez Släpp sur la page Inköpsorder.",
  "de-DE": "Wählen Sie Släpp auf der Seite Inköpsorder aus.",
  "es-ES": "Seleccione Släpp en la página Inköpsorder.", "da-DK": "Vælg Släpp på siden Inköpsorder.",
  "fi-FI": "Valitse Släpp sivulla Inköpsorder.", "nb-NO": "Velg Släpp på siden Inköpsorder."
};
for (const [locale, text] of Object.entries(expected)) {
  const paragraph = stepSentence(locale);
  assert.strictEqual(paragraph.text, text, locale);
  assert.deepStrictEqual(paragraph.presentationRuns.filter(item => item.role === "interface")
    .map(item => item.text), ["Släpp", "Inköpsorder"], `${locale} marks the captions`);
}
// A step whose text no longer is the described sentence keeps its own text.
assert.strictEqual(stepSentence("en-US", "Välj **Släpp** när ordern är klar.").text,
  "Välj Släpp när ordern är klar.");

console.log(`Step text tests passed (${stepText.KINDS.length} kinds in ${stepText.LOCALES.length} languages).`);
