const assert = require("assert");
const language = require("../src/document/document-language");
const pipeline = require("../src/exporters/word-export-pipeline");

assert.strictEqual(language.normalize(), "sv-SE");
assert.strictEqual(language.normalize("en-GB"), "en-US");
assert.strictEqual(language.normalize("sv"), "sv-SE");

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
        provenance: "manual", text: "Välj min egen formulering." }]
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
    instruction: "Äldre text." }]
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
const cover = prepared.plan.sections.find(section => section.kind === "cover")
  .components.find(component => component.kind === "cover");
assert.strictEqual(cover.appearance.documentType, "Work instruction");
const footer = prepared.plan.components.find(component =>
  component.kind === "footer");
assert.strictEqual(footer.content.pageLabel, "Page");
assert.strictEqual(footer.content.totalSeparator, " of ");

console.log("Document language tests passed.");
