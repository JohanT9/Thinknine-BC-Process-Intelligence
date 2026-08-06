const assert = require("assert");
const semantic = require("../src/document/semantic-document");
const language = require("../src/document/language-excellence");
const profiles = require("../src/document/document-profile");
const pipeline = require("../src/exporters/word-export-pipeline");

function profile(id) {
  return profiles.get(profiles.BUILT_IN_REGISTRY, id);
}

const document = semantic.normalize({
  documentId: "language-document",
  metadata: { title: "Orderhantering", purpose: "Gå till Försäljningsorder." },
  futureDocumentField: { preserve: true },
  assets: [{ assetId: "image-1", kind: "image",
    sourceRef: { screenshotRef: "one.png" }, futureAssetField: true }],
  sections: [{ sectionId: "workflow", kind: "workflow", blocks: [{
    blockId: "step-1", kind: "step", stepNumber: 1,
    sourceRef: { taskId: "task-1" }, futureStepField: "kept", blocks: [{
      blockId: "instruction-1", kind: "paragraph",
      text: "Klicka på Bokför och stäng.", sourceRef: { taskId: "task-1" }
    }, { blockId: "comment-1", kind: "paragraph",
      text: "Se till att ordern är bokförd." }, {
      blockId: "image-block-1", kind: "image", assetId: "image-1",
      caption: "Tryck på Frisläpp.", sourceRef: { screenshotRef: "one.png" }
    }]
  }, { blockId: "future-1", kind: "futureInstruction",
    text: "Klicka på Detta måste bevaras.", future: { preserve: true } }]}]
});
const before = JSON.stringify(document);
const improved = language.process(document, profile("business-process"));
assert.strictEqual(improved.metadata.purpose, "Öppna Försäljningsorder.");
assert.strictEqual(improved.sections[0].blocks[0].blocks[0].text,
  "Välj Bokför och stäng.");
assert.strictEqual(improved.sections[0].blocks[0].blocks[1].text,
  "Verifiera att ordern är bokförd.");
assert.strictEqual(improved.sections[0].blocks[0].blocks[2].caption,
  "Välj Frisläpp.");
assert.strictEqual(improved.sections[0].blocks[1].text,
  "Klicka på Detta måste bevaras.");
assert.deepStrictEqual(improved.futureDocumentField, { preserve: true });
assert.strictEqual(improved.assets[0].futureAssetField, true);
assert.strictEqual(JSON.stringify(document), before, "input must remain immutable");
assert.ok(Object.isFrozen(improved));
assert.strictEqual(language.process(document, profile("business-process")), improved,
  "the same document revision and profile must reuse processed output");
assert.deepStrictEqual(language.process(document, profile("business-process")),
  language.process(document, profile("business-process")),
  "processing must be deterministic");

const precise = language.process(semantic.normalize({
  documentId: "profile-language", assets: [], sections: [{
    sectionId: "workflow", kind: "workflow", blocks: [{
      blockId: "instruction", kind: "paragraph",
      text: "Kontrollera att kunden är vald."
    }]
  }]
}), profile("sop"));
assert.strictEqual(precise.sections[0].blocks[0].text,
  "Verifiera att kunden är vald.");
assert.strictEqual(language.toneFor(profile("training-guide")), "explanatory");
assert.strictEqual(language.toneFor(profile("quick-reference")), "concise");
assert.deepStrictEqual(language.STYLE_GUIDE.canonicalActions.en,
  { click: "Select", press: "Choose", navigate: "Open", verify: "Verify" });

const review = {
  reviewVersion: "1.0.0", sessionId: "old-session", sessionName: "Order",
  tasks: [{ taskId: "task-old", instruction: "Klicka på Bokför." }]
};
const session = { id: "old-session", name: "Order", startedAt: "2026-01-01",
  settings: { environmentName: "Test", documentationProfile: "generic" } };
const reviewBefore = JSON.stringify(review);
const prepared = pipeline.create({ review, session, profileId: "quick-reference" });
assert.strictEqual(JSON.stringify(review), reviewBefore);
assert.strictEqual(prepared.languageProfile.profileId, "quick-reference");
assert.strictEqual(prepared.semanticDocument.languageExcellence.tone, "concise");
assert.ok(JSON.stringify(prepared.plan).includes("Välj Bokför."));
assert.ok(!JSON.stringify(prepared.plan).includes("Klicka på Bokför."));
const sourceStep = prepared.sourceSemanticDocument.sections.find(section =>
  section.kind === "workflow").blocks.find(block => block.kind === "step");
assert.strictEqual(sourceStep.blocks[0].text, "Klicka på Bokför.");

console.log("Language Excellence behaviour tests passed.");
