const assert = require("assert");
const pipeline = require("../src/exporters/word-export-pipeline");
const reviewStudio = require("../src/review/review-studio");
const annotations = require("../src/review/review-annotations");
const workspace = require("../src/document/document-workspace");

const session = {
  id: "workspace-session",
  name: "Orderhantering",
  purpose: "Registrera en kundorder.",
  startedAt: "2026-08-06T08:00:00.000Z",
  settings: { environmentName: "Test", documentationProfile: "generic" }
};

function reviewFixture() {
  return {
    reviewVersion: "1.0.0",
    sessionId: session.id,
    sessionName: session.name,
    createdAt: session.startedAt,
    updatedAt: session.startedAt,
    status: "in-progress",
    commandHistoryVersion: "1.0.0",
    commandHistory: [],
    historyIndex: 0,
    annotations: { schemaVersion: "1.0.0", screenshotSets: [] },
    tasks: reviewStudio.normalizeTasks([{
      taskId: "step-1",
      instruction: "Öppna kundordern.",
      screenshot: "order.png"
    }, {
      taskId: "step-2",
      instruction: "Kontrollera leveransdatumet."
    }])
  };
}

function render(review, themeOverrides) {
  const prepared = pipeline.create({ review, session, themeOverrides });
  return {
    prepared,
    model: workspace.render(prepared.plan)
  };
}

function items(model, kind) {
  return model.sections.flatMap(section => section.items)
    .filter(item => !kind || item.kind === kind);
}

const review = reviewFixture();
const before = JSON.stringify(review);
const first = render(review);
assert.strictEqual(JSON.stringify(review), before);
assert.ok(Object.isFrozen(first.model));
assert.strictEqual(first.model.title, "Orderhantering");
assert.ok(first.model.sections.some(section => section.kind === "workflow"));
assert.ok(items(first.model, "heading").some(item =>
  item.content.text === "Arbetsgång"));
assert.deepStrictEqual(items(first.model, "stepTitle").map(item =>
  item.content.text), ["Steg 1", "Steg 2"]);
assert.ok(items(first.model, "paragraph").some(item =>
  item.content.text === "Öppna kundordern."));
assert.deepStrictEqual(items(first.model, "image")[0].content, {
  assetId: first.prepared.semanticDocument.assets[0].assetId,
  alt: "Skärmbild 1 steg 1",
  annotationRefs: []
});
assert.strictEqual(items(first.model, "metadata")[0].content.rows[2].value, "Test");
assert.deepStrictEqual(workspace.render(first.prepared.plan), first.model);

const interactionReview = reviewFixture();
interactionReview.tasks = reviewStudio.normalizeTasks([{
  taskId: "customer-field", taskType: "SelectCustomer",
  fieldCaption: "Kundnr", instruction: "Öppna kunduppslag.",
  sourceEventNos: [40]
}, {
  taskId: "customer-row", taskType: "Select",
  selectedCaption: 'Välj posten "1033"', instruction: "Välj post.",
  sourceEventNos: [41]
}]);
const interactionWorkspace = render(interactionReview);
assert.strictEqual(items(interactionWorkspace.model, "stepTitle").length, 1);
assert.ok(items(interactionWorkspace.model, "paragraph").some(item =>
  item.content.text.includes("1033")));

const annotatedReview = reviewFixture();
reviewStudio.addAnnotation(
  annotatedReview,
  "order.png",
  annotations.createAnnotation("rectangle", {
    x: 0.1, y: 0.1, width: 0.2, height: 0.2
  }, { idFactory: () => "workspace-annotation" }),
  {
    now: "2026-08-06T08:00:30.000Z",
    commandHistoryId: "annotation-1",
    idFactory: () => "workspace-set"
  }
);
assert.deepStrictEqual(
  items(render(annotatedReview).model, "image")[0].content.annotationRefs,
  [{
    annotationId: "ann_workspace-annotation",
    screenshotRef: "order.png"
  }]
);

reviewStudio.editTask(review, 0, { instruction: "Öppna order 1001." }, {
  now: "2026-08-06T08:01:00.000Z",
  commandHistoryId: "edit-1"
});
assert.ok(items(render(review).model, "paragraph").some(item =>
  item.content.text === "Öppna order 1001."));
reviewStudio.undo(review);
assert.ok(items(render(review).model, "paragraph").some(item =>
  item.content.text === "Öppna kundordern."));
reviewStudio.redo(review);
assert.ok(items(render(review).model, "paragraph").some(item =>
  item.content.text === "Öppna order 1001."));

reviewStudio.merge(review, ["step-1", "step-2"], {
  now: "2026-08-06T08:02:00.000Z",
  commandHistoryId: "merge-1",
  historyId: "merge-history-1"
});
assert.strictEqual(items(render(review).model, "stepTitle").length, 1);
assert.ok(items(render(review).model, "paragraph").some(item =>
  item.content.text.includes("Kontrollera leveransdatumet.")));
reviewStudio.undo(review);
assert.strictEqual(items(render(review).model, "stepTitle").length, 2);

const splitReview = reviewFixture();
reviewStudio.split(splitReview, "step-1", {
  segments: ["Öppna ordern.", "Kontrollera kunden."]
}, {
  now: "2026-08-06T08:03:00.000Z",
  commandHistoryId: "split-1",
  historyId: "split-history-1"
});
assert.deepStrictEqual(items(render(splitReview).model, "stepTitle").map(item =>
  item.content.text), ["Steg 1", "Steg 2", "Steg 3"]);

const themed = render(reviewFixture(), {
  typography: { heading1: { color: "#123456" } }
}).model;
assert.strictEqual(items(themed, "heading").find(item =>
  item.content.text === "Arbetsgång").appearance.typography.color, "#123456");

const source = require("fs").readFileSync(
  require("path").join(__dirname, "../src/document/document-workspace.js"),
  "utf8"
);
assert.ok(!source.includes("review-studio"));
assert.ok(!source.includes("review.tasks"));
assert.ok(!source.includes("word-document-adapter"));

console.log("Document Workspace renderer behaviour tests passed.");
