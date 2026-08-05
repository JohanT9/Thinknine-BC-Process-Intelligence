import assert from "node:assert";
import JSZip from "jszip";
import pipeline from "../src/exporters/word-export-pipeline.js";
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

assert.strictEqual(output.taskCount, 2);
assert.strictEqual(output.imageCount, 2);
assert.strictEqual(output.theme.themeId, "thinknine");
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
assert.ok(output.documentXml.includes("Kommentar: Kontrollera kundnumret."));
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
