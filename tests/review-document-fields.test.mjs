import assert from "node:assert";
import { createRequire } from "node:module";
import "../src/exporters/word-exporter-docx.mjs";

const require = createRequire(import.meta.url);
const reviewModel = require("../src/review/review-studio");
const projector = require("../src/document/review-document-projector");
const workspace = require("../src/document/document-workspace");
const pipeline = require("../src/exporters/word-export-pipeline");

const session = { id: "expected-result", name: "Expected result",
  startedAt: "2026-08-17T12:00:00.000Z" };
const review = reviewModel.createReview(session, [{ taskId: "step-1",
  instruction: "Utför kontrollen." }]);
assert.equal(review.documentFields.expectedResult, "");

const legacy = reviewModel.normalizeReview({ sessionId: "legacy", tasks: [],
  annotations: { schemaVersion: "1.0.0", screenshotSets: [] } });
assert.deepEqual(legacy.documentFields, { expectedResult: "" });
const legacyTopLevel = reviewModel.normalizeReview({ sessionId: "legacy-top",
  expectedResult: "Legacy expected result", tasks: [],
  annotations: { schemaVersion: "1.0.0", screenshotSets: [] } });
assert.equal(legacyTopLevel.documentFields.expectedResult,
  "Legacy expected result");

const custom = "Ordern är frisläppt och redo för lagerhantering.";
reviewModel.setDocumentField(review, "expectedResult", custom, {
  now: "2026-08-17T12:01:00.000Z"
});
assert.equal(review.documentFields.expectedResult, custom);
assert.equal(reviewModel.canUndo(review), true);
reviewModel.undo(review);
assert.equal(review.documentFields.expectedResult, "");
reviewModel.redo(review);
assert.equal(review.documentFields.expectedResult, custom);

const projected = projector.project(review, { session });
const expectedSection = projected.document.sections.find(section =>
  section.kind === "expectedResult");
assert.equal(expectedSection.blocks[1].text, custom);

const prepared = pipeline.create({ session, review });
const workspaceModel = workspace.render(prepared.plan);
assert.ok(workspaceModel.sections.flatMap(section => section.items).some(item =>
  item.kind === "paragraph" && item.content.text === custom));
const exported = await globalThis.T9Export.word.renderPlan({
  plan: prepared.plan, mediaAssets: {}
});
assert.ok(exported.blob.size > 1000);

reviewModel.setDocumentField(review, "expectedResult", "", {
  now: "2026-08-17T12:02:00.000Z", groupKey: "reset-expected-result"
});
const resetProjection = projector.project(review, { session });
assert.equal(resetProjection.document.sections.find(section =>
  section.kind === "expectedResult").blocks[1].text,
projector.DEFAULT_EXPECTED_RESULT);

const configuredDefault = "Kontrollen är genomförd och verifierad.";
const configuredProjection = projector.project(review, {
  session,
  expectedResult: configuredDefault
});
assert.equal(configuredProjection.document.sections.find(section =>
  section.kind === "expectedResult").blocks[1].text, configuredDefault);
const sessionConfiguredProjection = projector.project(review, { session: {
  ...session, settings: { defaultExpectedResult: "Standard från sessionen." }
} });
assert.equal(sessionConfiguredProjection.document.sections.find(section =>
  section.kind === "expectedResult").blocks[1].text,
"Standard från sessionen.");

assert.throws(() => reviewModel.setDocumentField(review, "unknown", "value"),
  /Unsupported review document field/);

console.log("Review expected-result editing tests passed.");
