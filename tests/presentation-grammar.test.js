const assert = require("assert");
require("./search-interaction-presentation.test");
const fs = require("fs");
const projector = require("../src/document/review-document-projector");
const semantic = require("../src/document/semantic-document");
const interactions = require("../src/document/semantic-interaction-engine");
const language = require("../src/document/language-excellence");
const grammar = require("../src/document/presentation-grammar");

function paragraph(task) {
  const projected = projector.project({
    sessionId: "grammar-session",
    sessionName: "Presentation Grammar",
    tasks: [task]
  }).document;
  const actionDocument = interactions.processDocument(projected);
  const document = grammar.process(language.process(actionDocument));
  return document.sections.find(section => section.kind === "workflow").blocks
    .find(block => block.kind === "step").blocks
    .find(block => block.kind === "paragraph");
}

const quantity = paragraph({
  taskId: "quantity", taskType: "ChangeField", fieldCaption: "Antal",
  value: "500", inputSources: ["input"], instruction: "Teknisk text."
});
assert.strictEqual(quantity.text, 'Ange 500 i "Antal".');
assert.deepStrictEqual(quantity.presentationRuns, [
  { text: "Ange ", role: "action" },
  { text: "500", role: "value", bold: true },
  { text: " i ", role: "text" },
  { text: '"Antal"', role: "interface" },
  { text: ".", role: "text" }
]);

const customer = grammar.presentationFor({
  actionType: "SelectCustomer", targetField: "Kund", selectedValue: "1033"
}, "Äldre formulering.");
assert.strictEqual(customer.text, 'Välj "Kund" 1033.');
assert.strictEqual(customer.runs.find(run => run.text === "1033").bold, true);

const itemNumber = grammar.presentationFor({
  actionType: "EnterItemNumber", targetField: "Artikel Nr", selectedValue: "30043"
}, 'Ange 30043 i "Artikel Nr".');
assert.strictEqual(itemNumber.text, 'Ange 30043 i "Artikel Nr".');
assert.strictEqual(itemNumber.runs.find(run => run.text === "30043").bold, true);

const search = paragraph({ taskId: "search", taskType: "SearchAndOpenPage",
  searchCaption: "Sök", searchFieldCaption: "Berätta vad du vill göra.",
  resultCaption: "Förs.order", value: "för ord",
  instruction: "Äldre generell söktext." });
assert.strictEqual(search.text,
  'Välj "Sök", ange för ord i "Berätta vad du vill göra." och välj "Förs.order".');
assert.strictEqual(search.presentationRuns.find(run => run.text === "för ord").bold,
  true);

const option = paragraph({
  taskId: "status", taskType: "SelectOption", fieldCaption: "Status",
  value: "Frisläppt", instruction: "Välj status."
});
assert.strictEqual(option.text, 'Välj "Status" Frisläppt.');
assert.strictEqual(option.presentationRuns[0].role, "action");
assert.strictEqual(option.presentationRuns[1].role, "interface");
assert.strictEqual(option.presentationRuns[3].role, "value");

const checkbox = paragraph({
  taskId: "blocked", taskType: "Checkbox", fieldCaption: "Spärrad",
  value: false, instruction: "Sätt nej."
});
assert.strictEqual(checkbox.text, 'Inaktivera "Spärrad".');
assert.ok(!checkbox.text.includes("Nej"));

const commentProjection = projector.project({
  sessionId: "comment", sessionName: "Comment", tasks: [{
    taskId: "comment-step", taskType: "ChangeField", fieldCaption: "Antal",
    value: "25", inputSources: ["input"], instruction: "Ange antal.",
    userComment: "Behåll denna kommentar."
  }]
}).document;
const commentDocument = grammar.process(language.process(
  interactions.processDocument(commentProjection)
));
const callout = commentDocument.sections.find(section =>
  section.kind === "workflow").blocks.find(block => block.kind === "step")
  .blocks.find(block => block.kind === "callout");
assert.strictEqual(callout.blocks.find(block => block.kind === "paragraph").text,
  "Behåll denna kommentar.");

const legacy = grammar.presentationFor(null,
  "Tryck `Ctrl+S` och kontrollera `Table 27` i **Status** med __ABC123__.");
assert.strictEqual(legacy.text,
  'Tryck Ctrl+S och kontrollera Table 27 i "Status" med ABC123.');
assert.strictEqual(legacy.runs.find(run => run.text === "Ctrl+S").role,
  "shortcut");
assert.strictEqual(legacy.runs.find(run => run.text === "Table 27").role,
  "identifier");
assert.strictEqual(legacy.runs.find(run => run.text === "ABC123").bold, true);

const futureProjection = JSON.parse(JSON.stringify(projector.project({
  sessionId: "immutable", sessionName: "Immutable", tasks: [{
    taskId: "future", instruction: "Behåll framtida data."
  }]
}).document));
futureProjection.sections.find(section => section.kind === "workflow").blocks
  .find(block => block.kind === "step").futureTaskField = { schema: 9 };
const source = interactions.processDocument(semantic.normalize(futureProjection));
const before = JSON.stringify(source);
const first = grammar.process(source);
assert.strictEqual(JSON.stringify(source), before);
assert.strictEqual(grammar.process(source), first);
assert.deepStrictEqual(first.sections.find(section => section.kind === "workflow")
  .blocks.find(block => block.kind === "step").futureTaskField, { schema: 9 });
assert.ok(Object.isFrozen(first));
assert.ok(first.provenance.transformations.includes("presentation-grammar"));
assert.strictEqual(first.provenance.presentationGrammarVersion,
  grammar.GRAMMAR_VERSION);

const sourceCode = fs.readFileSync(
  require.resolve("../src/document/presentation-grammar"), "utf8"
);
for (const forbidden of ["../review/", "../ui/", "../exporters/", "document-planner",
  "screenshot-intelligence", "language-excellence"]) {
  assert.ok(!sourceCode.includes(`require(\"${forbidden}`),
    `Presentation Grammar must not import ${forbidden}.`);
}

console.log("Presentation Grammar behaviour tests passed.");
