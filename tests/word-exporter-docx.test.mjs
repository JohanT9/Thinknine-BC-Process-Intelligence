import assert from "node:assert";
import JSZip from "jszip";
import "../src/exporters/word-exporter-docx.mjs";
import pipeline from "../src/exporters/word-export-pipeline.js";

assert.strictEqual(
  globalThis.T9Export.word.plainText("Välj **Sök**."),
  'Välj "Sök".'
);

const png = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8lJ0AAAAASUVORK5CYII=",
  "base64"
));
const exportInput = pipeline.create({
  session: {
    id: "merge-session",
    name: "Merge export",
    startedAt: "2026-08-05T08:00:00.000Z"
  },
  review: {
    sessionId: "merge-session",
    sessionName: "Merge export",
    updatedAt: "2026-08-05T09:00:00.000Z",
    tasks: [{
      taskId: "merged",
      instruction: "Sammanslaget steg",
      instructionRuns: [
        { text: "Sammanslaget ", textColor: "#C50F1F",
          backgroundColor: "#FFF100", fontFamily: "Arial", fontSize: 12 },
        { text: "steg" }
      ],
      stepOverride: { fields: {
        instruction: "Sammanslaget steg",
        instructionRuns: [
          { text: "Sammanslaget ", textColor: "#C50F1F",
            backgroundColor: "#FFF100", fontFamily: "Arial", fontSize: 12 },
          { text: "steg" }
        ]
      } },
      pageCaption: "Förs.order",
      confidenceScore: 98,
      userComment: "Kontrollera resultatet",
      screenshot: "one.png",
      screenshots: ["one.png", "two.png"]
    }]
  }
});
const mediaAssets = Object.fromEntries(exportInput.semanticDocument.assets.map(
  asset => [asset.assetId, { bytes: png, mimeType: "image/png" }]
));
const result = await globalThis.T9Export.word.renderPlan({
  plan: exportInput.plan,
  mediaAssets
});

assert.strictEqual(result.taskCount, 1);
assert.strictEqual(result.imageCount, 2);
assert.ok(result.blob.size > 2000);
const archive = await JSZip.loadAsync(await result.blob.arrayBuffer());
const documentXml = await archive.file("word/document.xml").async("string");
assert.ok(!documentXml.includes("Sida: Förs.order"));
assert.ok(!documentXml.includes("Säkerhet: 98%"));
assert.ok(documentXml.includes("Sammanslaget steg"));
assert.ok(documentXml.includes('w:color w:val="C50F1F"'));
assert.match(documentXml, /<w:shd[^>]*w:fill="FFF100"/);
const instructionStart = documentXml.indexOf("Sammanslaget ");
const instructionEnd = documentXml.indexOf("steg", instructionStart);
const commentLabel = documentXml.indexOf("Kommentar: ", instructionEnd);
const commentText = documentXml.indexOf("Kontrollera resultatet", commentLabel);
assert.ok(instructionStart >= 0 && instructionEnd > instructionStart);
assert.ok(commentLabel > instructionEnd && commentText > commentLabel);

console.log("docx merged screenshot behaviour tests passed.");
