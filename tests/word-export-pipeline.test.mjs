import assert from "node:assert";
import JSZip from "jszip";
import pipeline from "../src/exporters/word-export-pipeline.js";
import semantic from "../src/document/semantic-document.js";
import themeRegistry from "../src/document/document-theme-registry.js";
import planner from "../src/document/document-planner.js";
import "../src/exporters/word-exporter-docx.mjs";

const png = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8lJ0AAAAASUVORK5CYII=",
  "base64"
));
const session = {
  id: "session-parity",
  name: "Orderprocess",
  purpose: "Verifiera orderflödet.",
  startedAt: "2026-08-01T08:00:00.000Z",
  endedAt: "2026-08-01T09:00:00.000Z",
  settings: {
    environmentName: "Test",
    documentationProfile: "generic"
  }
};

function review(tasks, extra = {}) {
  return {
    reviewVersion: "1.0.0",
    sessionId: session.id,
    sessionName: session.name,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
    status: "completed",
    reviewer: "Anna",
    tasks,
    annotations: { schemaVersion: "1.0.0", screenshotSets: [] },
    ...extra
  };
}

async function exportReview(reviewValue) {
  const before = JSON.stringify(reviewValue);
  const prepared = pipeline.create({ review: reviewValue, session });
  const mediaAssets = Object.fromEntries(prepared.semanticDocument.assets.map(
    asset => [asset.assetId, { bytes: png, mimeType: "image/png" }]
  ));
  pipeline.validateMedia(prepared.plan, mediaAssets);
  const documentBefore = JSON.stringify(prepared.semanticDocument);
  const themeBefore = JSON.stringify(prepared.theme);
  const planBefore = JSON.stringify(prepared.plan);
  const result = await globalThis.T9Export.word.renderPlan({
    plan: prepared.plan,
    mediaAssets
  });
  assert.strictEqual(JSON.stringify(reviewValue), before);
  assert.strictEqual(JSON.stringify(prepared.semanticDocument), documentBefore);
  assert.strictEqual(JSON.stringify(prepared.theme), themeBefore);
  assert.strictEqual(JSON.stringify(prepared.plan), planBefore);
  const archive = await JSZip.loadAsync(await result.blob.arrayBuffer());
  return {
    ...prepared,
    ...result,
    archive,
    documentXml: await archive.file("word/document.xml").async("string"),
    headerXml: await archive.file("word/header1.xml").async("string"),
    footerXml: await archive.file("word/footer1.xml").async("string"),
    relationships: await archive.file("word/_rels/document.xml.rels").async("string"),
    stylesXml: await archive.file("word/styles.xml").async("string")
  };
}

const baseReview = review([{ 
  taskId: "task-a",
  instruction: "Öppna ordern.",
  userComment: "Kontrollera kundnumret.",
  recordingId: session.id,
  sourceEventIds: ["session-parity:event:open-order"],
  normalizedEventIds: ["normalized:open-order"],
  stepGroupIds: ["group:open-order"],
  semanticActionIds: ["semantic:open-order"],
  screenshots: ["one.png", "two.png"]
}, {
  taskId: "task-b",
  instruction: "Bokför ordern."
}, {
  taskId: "task-deleted",
  instruction: "Detta steg ska inte exporteras.",
  deleted: true
}]);
const output = await exportReview(baseReview);
const tracedWordComponent = output.plan.sections
  .flatMap(section => section.components)
  .flatMap(function flatten(component) {
    return [component, ...(component.components || []).flatMap(flatten)];
  }).find(component => component.sourceRef?.taskId === "task-a" &&
    component.sourceRef?.sourceEventIds?.length);
assert.deepStrictEqual(tracedWordComponent.sourceRef.sourceEventIds,
  ["session-parity:event:open-order"]);
assert.deepStrictEqual(tracedWordComponent.sourceRef.semanticActionIds,
  ["semantic:open-order"]);

const semanticInteractionOutput = await exportReview(review([{
  taskId: "customer-field", taskType: "SelectCustomer",
  fieldCaption: "Kundnr", instruction: "Öppna kunduppslag.",
  sourceEventNos: [40], screenshot: "customer-field.png"
}, {
  taskId: "customer-row", taskType: "Select",
  selectedCaption: 'Välj posten "1033"', instruction: "Välj post.",
  sourceEventNos: [41], screenshot: "customer-row.png"
}]));
assert.ok(semanticInteractionOutput.documentXml.includes("Välj "));
assert.ok(semanticInteractionOutput.documentXml.includes("&quot;Kund&quot;"));
assert.ok(semanticInteractionOutput.documentXml.includes("1033"));
assert.match(semanticInteractionOutput.documentXml,
  /<w:b(?: [^>]*)?\/>[\s\S]{0,500}<w:t[^>]*>1033<\/w:t>/);
const customerInstruction = semanticInteractionOutput.plan.sections
  .flatMap(section => section.components)
  .find(component => component.kind === "workflow").components
  .find(component => component.kind === "step").components
  .find(component => component.kind === "paragraph");
assert.ok(customerInstruction.content.runs.find(run =>
  run.text === "1033" && run.bold && run.role === "value"));
assert.strictEqual(semanticInteractionOutput.semanticActionsDocument.sections
  .find(section => section.kind === "workflow").blocks
  .filter(block => block.kind === "step").length, 1);
assert.deepStrictEqual(semanticInteractionOutput.semanticActionsDocument.sections
  .find(section => section.kind === "workflow").blocks
  .find(block => block.kind === "step").semanticAction.sourceEventNos,
["40", "41"]);

const fieldNoiseOutput = await exportReview(review([{
  taskId: "number-focus", taskType: "ChangeField",
  fieldCaption: "Sortera efter Nr", inputSources: ["focusout"],
  instruction: "Ändra fältet.", sourceEventNos: [50]
}, {
  taskId: "number-row", taskType: "Select",
  selectedCaption: 'Välj posten "136"', instruction: "Välj post.",
  sourceEventNos: [51]
}, {
  taskId: "number-result", taskType: "ChangeField",
  fieldCaption: "Sortera efter Nr", value: "136",
  inputSources: ["focusout"], instruction: "Ange 136.", sourceEventNos: [52]
}, {
  taskId: "tour-focus", taskType: "ChangeField",
  fieldCaption: "Sortera efter Tur Nr", inputSources: ["focusout"],
  instruction: "Ändra fältet.", sourceEventNos: [53]
}, {
  taskId: "quantity", taskType: "ChangeField",
  fieldCaption: "Sortera efter Antal", value: "500",
  inputSources: ["focusout"], instruction: "Ange 500.", sourceEventNos: [54]
}]));
assert.ok(fieldNoiseOutput.documentXml.includes("&quot;Nr&quot;"));
assert.ok(fieldNoiseOutput.documentXml.includes("136"));
assert.ok(fieldNoiseOutput.documentXml.includes("500"));
assert.match(fieldNoiseOutput.documentXml,
  /<w:b\/>.*?<w:t[^>]*>500<\/w:t>/s);
assert.ok(!fieldNoiseOutput.documentXml.includes("Sortera efter Tur Nr"));

assert.strictEqual(output.taskCount, 2);
assert.strictEqual(output.imageCount, 2);
assert.strictEqual(output.theme.themeId, "thinknine");
assert.ok(Object.isFrozen(output.qualityDiagnostics));
assert.ok(Object.isFrozen(output.qualityDiagnostics.findings));
assert.strictEqual(
  output.qualityDiagnostics.diagnosticSchemaVersion,
  "1.0.0"
);
assert.strictEqual(
  output.plan.sections.find(section => section.kind === "workflow")
    .components[0].components.find(component => component.kind === "step")
    .content.title,
  "Steg 1"
);
assert.ok(output.blob.size > 2500);
for (const required of [
  "[Content_Types].xml",
  "_rels/.rels",
  "word/document.xml",
  "word/styles.xml",
  "word/header1.xml",
  "word/footer1.xml",
  "docProps/core.xml"
]) {
  assert.ok(output.archive.file(required), required);
}

function position(text) {
  const index = output.documentXml.indexOf(text);
  assert.ok(index >= 0, text);
  return index;
}
assert.ok(position("THINKNINE") < position("Arbetsinstruktion"));
assert.ok(position("Arbetsinstruktion") < position("Orderprocess"));
assert.ok(position("Orderprocess") < position("Syfte"));
assert.ok(position("Syfte") < position("Förutsättningar"));
assert.ok(position("Förutsättningar") < position("Arbetsgång"));
assert.ok(position("Arbetsgång") < position("Steg 1"));
assert.ok(position("Steg 1") < position("Öppna ordern."));
assert.ok(position("Öppna ordern.") < position("Steg 2"));
assert.ok(position("Steg 2") < position("Bokför ordern."));
assert.ok(position("Bokför ordern.") < position("Förväntat resultat"));
assert.ok(position("Förväntat resultat") < position("Versionshistorik"));
assert.ok(!output.documentXml.includes("Detta steg ska inte exporteras."));
assert.ok(output.documentXml.includes("Kommentar: "));
assert.ok(output.documentXml.includes("Kontrollera kundnumret."));
assert.ok(output.documentXml.includes("Verifiera orderflödet."));
assert.ok(output.documentXml.includes("Användaren har behörighet"));
assert.ok(output.documentXml.includes("Slutförd"));
assert.ok(output.documentXml.includes("Första version"));
assert.ok(output.headerXml.includes("Orderprocess"));
assert.ok(output.footerXml.includes("Thinknine Process Intelligence"));
assert.ok(output.footerXml.includes("PAGE"));
assert.ok(output.footerXml.includes("NUMPAGES"));
assert.match(output.relationships, /relationships\/image/);
assert.ok(output.stylesXml.includes("Aptos"));
assert.strictEqual(
  Object.keys(output.archive.files).filter(name =>
    /^word\/media\/[^/]+\.(png|jpe?g)$/i.test(name)).length,
  1
);

const annotatedReview = review([{
  taskId: "annotated",
  instruction: "Annoterat steg.",
  screenshot: "annotated.png"
}], {
  annotations: {
    schemaVersion: "1.0.0",
    screenshotSets: [{
      annotationSetId: "set-1",
      screenshotRef: "annotated.png",
      items: [{ annotationId: "annotation-1", type: "rectangle" }]
    }]
  }
});
const annotated = await exportReview(annotatedReview);
const screenshot = pipeline.screenshotComponents(annotated.plan)[0];
assert.deepStrictEqual(
  annotated.semanticDocument.sections.find(section =>
    section.kind === "workflow").blocks.find(block =>
    block.kind === "step").blocks.find(block => block.kind === "image")
    .annotationRefs,
  [{ annotationId: "annotation-1", screenshotRef: "annotated.png" }]
);
assert.strictEqual(screenshot.content.altTitle, "Skärmbild 1 steg 1");
assert.strictEqual(annotated.imageCount, 1);

const noAnnotations = await exportReview(review([{
  taskId: "plain",
  instruction: "Utan annotering.",
  screenshot: "plain.png"
}]));
assert.strictEqual(noAnnotations.imageCount, 1);

const merged = await exportReview(review([{
  taskId: "merged",
  instruction: "Första delen.\n\nAndra delen.",
  userComment: "Sammanslagen kommentar",
  screenshots: ["one.png", "two.png"],
  merged: true,
  sourceTaskIds: ["one", "two"]
}]));
assert.strictEqual(merged.taskCount, 1);
assert.ok(merged.documentXml.includes("Första delen."));
assert.ok(merged.documentXml.includes("Andra delen."));
assert.strictEqual(merged.imageCount, 2);

const split = await exportReview(review([{
  taskId: "split-1",
  instruction: "Del ett."
}, {
  taskId: "split-2",
  instruction: "Del två."
}]));
assert.ok(split.documentXml.indexOf("Del ett.") <
  split.documentXml.indexOf("Del två."));

const reordered = await exportReview(review([
  { taskId: "task-b", instruction: "Bokför ordern." },
  { taskId: "task-a", instruction: "Öppna ordern." }
]));
assert.ok(reordered.documentXml.indexOf("Bokför ordern.") <
  reordered.documentXml.indexOf("Öppna ordern."));

const undoState = await exportReview(review([
  { taskId: "undo-a", instruction: "Före ångra." }
]));
const redoState = await exportReview(review([
  { taskId: "redo-a", instruction: "Efter gör om." }
]));
const cancelState = await exportReview(review([
  { taskId: "cancel-a", instruction: "Sparat före avbryt." }
]));
assert.ok(undoState.documentXml.includes("Före ångra."));
assert.ok(redoState.documentXml.includes("Efter gör om."));
assert.ok(cancelState.documentXml.includes("Sparat före avbryt."));

const repeatA = await exportReview(baseReview);
const repeatB = await exportReview(baseReview);
assert.strictEqual(repeatA.documentXml, repeatB.documentXml);
assert.strictEqual(repeatA.headerXml, repeatB.headerXml);
assert.strictEqual(repeatA.footerXml, repeatB.footerXml);
assert.deepStrictEqual(
  repeatA.qualityDiagnostics,
  repeatB.qualityDiagnostics
);

const tocDocument = semantic.normalize({
  documentId: "document-toc",
  metadata: { title: "TOC parity" },
  sections: [{
    sectionId: "section-toc",
    kind: "workflow",
    blocks: [{
      blockId: "heading-toc",
      kind: "heading",
      level: 1,
      text: "Innehållstest"
    }, {
      blockId: "toc-block",
      kind: "toc"
    }, {
      blockId: "page-break-block",
      kind: "pageBreak"
    }]
  }]
});
const tocPlan = planner.plan(tocDocument, themeRegistry.resolve(
  themeRegistry.BUILT_IN_REGISTRY,
  "thinknine"
));
const tocResult = await globalThis.T9Export.word.renderPlan({
  plan: tocPlan,
  mediaAssets: {}
});
const tocArchive = await JSZip.loadAsync(await tocResult.blob.arrayBuffer());
const tocXml = await tocArchive.file("word/document.xml").async("string");
assert.ok(tocXml.includes("TOC"));
assert.ok(tocXml.includes('w:type="page"'));

const preparedMissing = pipeline.create({
  review: review([{
    taskId: "missing-media",
    instruction: "Saknad bild.",
    screenshot: "missing.png"
  }]),
  session
});
assert.throws(
  () => pipeline.validateMedia(preparedMissing.plan, {}),
  /missing media assets/
);
await assert.rejects(
  () => globalThis.T9Export.word.renderPlan({
    plan: preparedMissing.plan,
    mediaAssets: {}
  }),
  /missing media assets/
);
await assert.rejects(
  () => globalThis.T9Export.word.renderPlan({ plan: {}, mediaAssets: {} }),
  /valid Document Plan/
);

console.log("Word Document Plan pipeline parity tests passed.");
