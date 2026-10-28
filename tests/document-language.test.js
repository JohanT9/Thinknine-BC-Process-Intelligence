const assert = require("assert");
const language = require("../src/document/document-language");
const pipeline = require("../src/exporters/word-export-pipeline");

assert.strictEqual(language.normalize(), "sv-SE");
assert.strictEqual(language.normalize("en-GB"), "en-US");
assert.strictEqual(language.normalize("sv"), "sv-SE");
assert.strictEqual(language.translateInstruction("Status uppdaterades.", "en-US"),
  "Status was updated.");
assert.strictEqual(language.translateInstruction("Spärrad aktiverades.", "en-US"),
  "Spärrad was enabled.");
assert.strictEqual(language.translateInstruction("En dialogruta öppnades.", "en-US"),
  "A dialog opened.");
// Record, list and search instructions are translated as a whole in every document language;
// no Swedish noun is left behind and the captured captions and values are kept.
const navigationTemplates = [
  "Välj posten **101003** på sidan **Sales Order**.", "Välj posten **101003**.",
  "Öppna listan **Sales Orders**.", "Sök efter __sales ord__ och öppna listan **Sales Orders**.",
  "Sök efter __sales ord__ och öppna **Sales Orders**.",
  "Sök efter __1896__ i **No.** och välj den filtrerade posten."
];
for (const locale of ["en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"]) {
  for (const source of navigationTemplates) {
    const translated = language.translateInstruction(source, locale);
    assert.notStrictEqual(translated, source, `${locale}: ${source}`);
    assert(!/\b(?:Välj|Sök|öppna|listan|sidan|filtrerade)\b/u.test(translated), `${locale}: ${translated}`);
    for (const value of source.match(/(?:\*\*|__)[^*_]+(?:\*\*|__)/gu)) {
      assert(translated.includes(value), `${locale} keeps ${value}`);
    }
  }
}
assert.strictEqual(language.translateInstruction(navigationTemplates[0], "de-DE"),
  "Wählen Sie den Datensatz **101003** auf der Seite **Sales Order** aus.");
assert.strictEqual(language.translateInstruction(navigationTemplates[3], "en-US"),
  "Search for __sales ord__ and open the **Sales Orders** list.");

const source = {
  schemaVersion: 1,
  documentId: "language-document",
  metadata: {
    title: "Orderprocess",
    purpose: "Beskriver hur processen genomförs i Business Central.",
    expectedResult: "Processen är genomförd enligt arbetsgången och de " +
      "registrerade ändringarna har sparats i Business Central."
  },
  assets: [],
  sections: [{
    sectionId: "workflow",
    kind: "workflow",
    title: "Arbetsgång",
    blocks: [{ blockId: "heading", kind: "heading", level: 1,
      text: "Arbetsgång" }, {
      blockId: "step", kind: "step", stepNumber: 1,
      blocks: [{ blockId: "generated", kind: "paragraph",
        text: "Välj Sök." }, {
        blockId: "manual", kind: "paragraph", preserveUserText: true,
        provenance: "manual", text: "Välj min egen formulering." }, {
        blockId: "observed", kind: "callout", calloutType: "information",
        label: "Observerat resultat", blocks: [{ blockId: "observed-text",
          kind: "paragraph", text: "Sidan Förs.order öppnades.",
          provenance: "system-derived" }]
      }]
    }]
  }]
};
const before = JSON.stringify(source);
const english = language.process(source, "en-US");
assert.strictEqual(JSON.stringify(source), before);
assert.strictEqual(english.metadata.documentLanguage, "en-US");
assert.strictEqual(english.metadata.purpose,
  "Describes how the process is performed in Business Central.");
assert.strictEqual(english.sections[0].title, "Workflow");
assert.strictEqual(english.sections[0].blocks[0].text, "Workflow");
assert.strictEqual(english.sections[0].blocks[1].blocks[0].text,
  "Choose Sök.");
assert.strictEqual(english.sections[0].blocks[1].blocks[1].text,
  "Välj min egen formulering.");
assert.strictEqual(english.sections[0].blocks[1].blocks[2].label,
  "Observed result");
assert.strictEqual(english.sections[0].blocks[1].blocks[2].blocks[0].text,
  "Page Förs.order opened.");

const session = {
  id: "language-session",
  name: "Order process",
  startedAt: "2026-08-29T08:00:00.000Z",
  settings: { environmentName: "Test", documentLanguage: "en-US" }
};
const review = {
  sessionId: session.id,
  sessionName: session.name,
  status: "completed",
  documentFields: { documentLanguage: "en-US", expectedResult: "" },
  tasks: [{ taskId: "search", taskType: "SearchAndOpenPage",
    searchCaption: "Sök", searchFieldCaption: "Berätta vad du vill göra.",
    resultCaption: "Förs.order", value: "för ord",
    instruction: "Äldre text.", resultVerified: true,
    observedResult: "Sidan Förs.order öppnades.",
    resultVerification: { status: "verified", summary:
      "Sidan Förs.order öppnades." } }]
};
const prepared = pipeline.create({ session, review });
assert.strictEqual(prepared.semanticDocument.metadata.documentLanguage, "en-US");
assert.ok(prepared.semanticDocument.sections.some(section =>
  section.blocks.some(block => block.text === "Purpose")));
const workflow = prepared.plan.sections.find(section =>
  section.kind === "workflow");
const workflowComponent = workflow.components.find(component =>
  component.kind === "workflow");
const step = workflowComponent.components.find(component =>
  component.kind === "step");
assert.strictEqual(step.content.title, "Step 1");
const instruction = step.components.find(component =>
  component.kind === "paragraph");
assert.strictEqual(instruction.content.text,
  "Choose Sök, enter för ord in Berätta vad du vill göra., and choose Förs.order.");
assert.ok(instruction.content.runs.some(run =>
  run.text === "Sök" && run.italic));
assert.ok(instruction.content.runs.some(run =>
  run.text === "för ord" && run.bold));
const observedResult = step.components.find(component =>
  component.kind === "callout");
// Since 4.7.93 evidence-backed results are kept in Word, in the document language,
// while the captured Business Central caption is preserved.
assert.ok(observedResult, "Word export keeps the evidence-backed observed result.");
assert.strictEqual(observedResult.accessibility.label, "Observed result");
assert.ok(observedResult.accessibility.description.includes("Förs.order"));
assert.ok(!/Sidan|öppnades/u.test(observedResult.accessibility.description),
  "the generated result sentence follows the English document language");
const cover = prepared.plan.sections.find(section => section.kind === "cover")
  .components.find(component => component.kind === "cover");
assert.strictEqual(cover.appearance.documentType, "Work instruction");
const footer = prepared.plan.components.find(component =>
  component.kind === "footer");
assert.strictEqual(footer.content.pageLabel, "Page");
assert.strictEqual(footer.content.totalSeparator, " of ");

console.log("Document language tests passed.");
