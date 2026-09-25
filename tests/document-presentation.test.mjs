import assert from "node:assert";
import fs from "node:fs";
import JSZip from "jszip";
import pipeline from "../src/exporters/word-export-pipeline.js";
import "../src/exporters/word-exporter-docx.mjs";

function pngHeader(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

assert.deepStrictEqual(globalThis.T9Export.word.fittedImageSize(
  pngHeader(2400, 900),
  { maxWidth: 620, maxHeight: 385, adaptiveFit: true,
    panoramicMaxHeight: 330, portraitMaxWidth: 480 }
), { width: 620, height: 233 });
assert.deepStrictEqual(globalThis.T9Export.word.fittedImageSize(
  pngHeader(900, 1600),
  { maxWidth: 620, maxHeight: 900, adaptiveFit: true,
    panoramicMaxHeight: 330, portraitMaxWidth: 480 }
), { width: 480, height: 853 });

const png = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8lJ0AAAAASUVORK5CYII=",
  "base64"
));
const review = {
  sessionId: "presentation-session",
  sessionName: "Professionell orderhantering",
  createdAt: "2026-08-05T08:00:00.000Z",
  updatedAt: "2026-08-05T09:00:00.000Z",
  status: "completed",
  reviewer: "Anna Andersson",
  tasks: [{
    taskId: "step-order",
    instruction: "Öppna kundordern och kontrollera leveransinformationen.",
    userComment: "Kontrollera att leveransdatumet är rimligt.",
    screenshots: ["order.png", "delivery.png"]
  }]
};
const session = {
  id: review.sessionId,
  name: review.sessionName,
  purpose: "Säkerställ korrekt order- och leveranshantering.",
  startedAt: review.createdAt,
  endedAt: review.updatedAt,
  settings: { environmentName: "Test", documentationProfile: "generic" }
};
const prepared = pipeline.create({ review, session, themeId: "thinknine" });
const documentBefore = JSON.stringify(prepared.semanticDocument);
const planBefore = JSON.stringify(prepared.plan);

function flatten(plan) {
  const result = [];
  function visit(values) {
    (values || []).forEach(component => {
      result.push(component);
      visit(component.components);
    });
  }
  visit(plan.components);
  plan.sections.forEach(section => visit(section.components));
  return result;
}

const components = flatten(prepared.plan);
const byKind = kind => components.find(component => component.kind === kind);
const screenshots = components.filter(component => component.kind === "screenshot");
const snapshot = {
  document: {
    profile: prepared.plan.content.presentationProfile,
    margins: prepared.plan.content.documentAppearance.margins,
    lineHeight: prepared.plan.content.documentAppearance.lineHeight
  },
  cover: {
    composition: byKind("cover").presentationIntent.composition,
    hierarchy: byKind("cover").presentationIntent.hierarchy,
    titleSize: byKind("cover").appearance.titleSize,
    metadataWidth: byKind("metadata").appearance.width,
    metadataGrouping: byKind("metadata").content.rows.map(row => row.group)
  },
  workflow: {
    composition: byKind("workflow").presentationIntent.composition,
    headingDivider: byKind("heading").appearance.dividerSize,
    stepComposition: byKind("step").presentationIntent.composition,
    stepHeadingStyle: byKind("step").appearance.headingStyle,
    instructionKeepWithNext: byKind("step").components[0].keepWithNext
  },
  screenshots: screenshots.map(component => ({
    emphasis: component.presentationIntent.emphasis,
    widthIntent: component.presentationIntent.widthIntent,
    grouping: component.grouping,
    maxWidth: component.appearance.maxWidth,
    adaptiveFit: component.appearance.adaptiveFit,
    frame: component.appearance.presentationStyle,
    preserveAspectRatio: component.presentationIntent.preserveAspectRatio,
    preserveQuality: component.presentationIntent.preserveQuality
  })),
  callout: {
    role: byKind("callout").presentationIntent.semanticRole,
    grouping: byKind("callout").grouping,
    borderColor: byKind("callout").appearance.borderColor,
    fillColor: byKind("callout").appearance.fillColor,
    presentationStyle: byKind("callout").appearance.presentationStyle
  },
  revision: {
    rowIntegrity: components.find(component =>
      component.kind === "revisionHistory" && component.sourceRef.blockId)
      .presentationIntent.rowIntegrity,
    headerFill: components.find(component =>
      component.kind === "revisionHistory" && component.sourceRef.blockId)
      .appearance.headerFill
  }
};
const expected = JSON.parse(fs.readFileSync(
  new URL("./snapshots/document-presentation-rc8.json", import.meta.url),
  "utf8"
));
assert.deepStrictEqual(snapshot, expected);
assert.ok(Object.isFrozen(prepared.plan));

const mediaAssets = Object.fromEntries(prepared.semanticDocument.assets.map(
  asset => [asset.assetId, { bytes: png, mimeType: "image/png" }]
));
const rendered = await globalThis.T9Export.word.renderPlan({
  plan: prepared.plan,
  mediaAssets
});
const archive = await JSZip.loadAsync(await rendered.blob.arrayBuffer());
const xml = await archive.file("word/document.xml").async("string");
const styles = await archive.file("word/styles.xml").async("string");

for (const marker of [
  'w:w="90%"',
  'w:color="007A82"',
  'w:fill="F0F7F7"',
  'w:fill="FFFFFF"',
  '<w:cantSplit/>'
]) assert.ok(xml.includes(marker), marker);
assert.ok(xml.includes('w:sz w:val="22"'),
  "step instructions use the compact eleven-point hierarchy");
assert.ok(xml.includes('<w:tbl>') && xml.includes('<w:keepNext/>'),
  "step lead panels keep their instruction with following evidence");
assert.ok(!xml.includes('w:fill="EDF6FB"'),
  "observed results use a compact inline treatment");
assert.ok(styles.includes("Segoe UI"));
const header = await archive.file("word/header1.xml").async("string");
assert.ok(header.includes('w:fill="05474F"'));
assert.ok(header.includes("BC Process Studio  |  Business Central"));
assert.ok(xml.includes("Kommentar: "));
assert.ok(xml.includes("Kontrollera att leveransdatumet är rimligt."));
assert.strictEqual(JSON.stringify(prepared.semanticDocument), documentBefore);
assert.strictEqual(JSON.stringify(prepared.plan), planBefore);

const repeated = pipeline.create({ review, session, themeId: "thinknine" });
assert.deepStrictEqual(repeated.plan, prepared.plan);
const repeatedRendered = await globalThis.T9Export.word.renderPlan({
  plan: repeated.plan,
  mediaAssets
});
const repeatedArchive = await JSZip.loadAsync(
  await repeatedRendered.blob.arrayBuffer()
);
assert.strictEqual(
  await repeatedArchive.file("word/document.xml").async("string"),
  xml
);

const legacyPlan = JSON.parse(JSON.stringify(prepared.plan));
delete legacyPlan.content.presentationProfile;
delete legacyPlan.metadata.presentationPlannerVersion;
legacyPlan.content.documentAppearance = { fontFamily: "Aptos", fontSize: 11 };
function makeLegacy(values) {
  (values || []).forEach(component => {
    component.presentationIntent = { rendererNeutral: true };
    if (component.kind === "cover") {
      component.appearance = {
        brandText: "THINKNINE",
        documentType: "Arbetsinstruktion",
        subtitle: "Business Central Process Documentation",
        accentColor: "#0f4c81",
        mutedColor: "#5f6b76"
      };
    }
    if (component.kind === "metadata") {
      component.appearance = {
        labelFill: "#eaf2f8",
        borderColor: "#b8c2cc",
        insideBorderColor: "#d5dce3"
      };
    }
    if (component.kind === "step") {
      component.appearance = {
        headingColor: "#1e5e8c",
        instructionSize: 12
      };
    }
    if (component.kind === "screenshot") {
      component.appearance = { maxWidth: 590, maxHeight: 390 };
    }
    if (component.kind === "callout") {
      component.appearance = {
        borderColor: "#d6a700",
        fillColor: "#fff7cc"
      };
    }
    makeLegacy(component.components);
  });
}
makeLegacy(legacyPlan.components);
legacyPlan.sections.forEach(section => makeLegacy(section.components));
const legacyRendered = await globalThis.T9Export.word.renderPlan({
  plan: legacyPlan,
  mediaAssets
});
const legacyArchive = await JSZip.loadAsync(await legacyRendered.blob.arrayBuffer());
const legacyXml = await legacyArchive.file("word/document.xml").async("string");
assert.ok(legacyXml.includes("Professionell orderhantering"));
assert.ok(legacyXml.includes("Kontrollera att leveransdatumet är rimligt."));
assert.strictEqual(legacyRendered.taskCount, rendered.taskCount);
assert.strictEqual(legacyRendered.imageCount, rendered.imageCount);

console.log("Professional document presentation visual regression tests passed.");
