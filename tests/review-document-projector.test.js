const assert = require("assert");
const projector = require("../src/document/review-document-projector");
const model = require("../src/document/semantic-document");

function reviewFixture() {
  return {
    reviewVersion: "9.0.0",
    sessionId: "session-1",
    sessionName: "Orderflöde",
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
    status: "in-progress",
    reviewer: "Anna",
    notes: "Intern notering",
    futureReviewField: { ignored: true },
    tasks: [{
      taskId: "task-1",
      instruction: "Öppna ordern.",
      userComment: "Kontrollera kundnumret.",
      screenshots: ["screenshots/one.png", "screenshots/two.png"],
      futureTaskField: "ignored"
    }, {
      taskId: "task-2",
      description: "Bokför ordern.",
      screenshot: "screenshots/one.png"
    }, {
      taskId: "deleted-task",
      instruction: "Ska inte projiceras.",
      deleted: true
    }],
    annotations: {
      schemaVersion: "5.0.0",
      screenshotSets: [{
        annotationSetId: "set-1",
        screenshotRef: "screenshots/one.png",
        items: [{
          annotationId: "annotation-1",
          type: "rectangle",
          futureAnnotationField: true
        }, {
          annotationId: "annotation-2",
          type: "futureType"
        }]
      }]
    },
    history: [{
      historyId: "history-1",
      type: "merge",
      createdAt: "2026-08-04T09:00:00.000Z"
    }]
  };
}

const review = reviewFixture();
const before = JSON.stringify(review);
const options = {
  session: {
    id: "session-1",
    name: "Fallback title",
    purpose: "Beskriv orderflödet.",
    settings: {
      environmentName: "Test",
      documentationProfile: "generic"
    }
  },
  provenance: {
    futureProducerField: { preserve: true },
    transformations: ["must-be-replaced-by-canonical-transformations"]
  }
};
const result = projector.project(review, options);

assert.strictEqual(JSON.stringify(review), before);
assert.ok(Object.isFrozen(result));
assert.ok(Object.isFrozen(result.document));
assert.ok(Object.isFrozen(result.document.provenance));
assert.ok(Object.isFrozen(result.diagnostics));
assert.throws(() => result.document.sections.push({}), TypeError);
assert.deepStrictEqual(model.validate(result.document), {
  valid: true,
  issues: []
});

assert.deepStrictEqual(result.document.metadata, {
  title: "Orderflöde",
  sessionId: "session-1",
  status: "in-progress",
  reviewer: "Anna",
  notes: "Intern notering",
  purpose: "Beskriv orderflödet.",
  environment: "Test",
  documentationProfile: "generic",
  documentVersion: "1.0",
  statusLabel: "Pågående",
  createdAt: "2026-08-01T08:00:00.000Z",
  updatedAt: "2026-08-05T10:00:00.000Z"
});
assert.deepStrictEqual(result.document.provenance, {
  futureProducerField: { preserve: true },
  transformations: [
    "review-metadata",
    "review-tasks",
    "review-comments",
    "review-screenshots",
    "review-annotation-references"
  ],
  origin: "review-document-projector",
  version: "1.0.0",
  generatedAt: "2026-08-05T10:00:00.000Z"
});

assert.deepStrictEqual(
  result.document.sections.map(section => section.kind),
  [
    "cover",
    "purpose",
    "prerequisites",
    "workflow",
    "expectedResult",
    "revisionHistory"
  ]
);
const workflow = result.document.sections.find(
  section => section.kind === "workflow"
);
assert.strictEqual(workflow.blocks.length, 3);
assert.strictEqual(workflow.blocks[1].kind, "step");
assert.deepStrictEqual(workflow.blocks[1].sourceRef, { taskId: "task-1" });
assert.strictEqual(workflow.blocks[1].blocks[0].text, "Öppna ordern.");
assert.strictEqual(workflow.blocks[1].blocks[1].kind, "callout");
assert.strictEqual(
  workflow.blocks[1].blocks[1].blocks[0].text,
  "Kontrollera kundnumret."
);

const imageBlocks = workflow.blocks.filter(block => block.kind === "step")
  .flatMap(step =>
  step.blocks.filter(block => block.kind === "image")
  );
assert.strictEqual(imageBlocks.length, 3);
assert.strictEqual(result.document.assets.length, 2);
assert.strictEqual(imageBlocks[0].assetId, imageBlocks[2].assetId);
assert.deepStrictEqual(imageBlocks[0].sourceRef, {
  taskId: "task-1",
  screenshotRef: "screenshots/one.png"
});
assert.deepStrictEqual(imageBlocks[0].annotationRefs, [{
  annotationId: "annotation-1",
  screenshotRef: "screenshots/one.png"
}, {
  annotationId: "annotation-2",
  screenshotRef: "screenshots/one.png"
}]);
assert.deepStrictEqual(result.document.assets[0].sourceRef, {
  screenshotRef: "screenshots/one.png"
});
assert.ok(!Object.hasOwn(result.document.assets[0], "bytes"));

const allIds = [
  result.document.documentId,
  ...result.document.sections.map(section => section.sectionId),
  ...result.document.assets.map(asset => asset.assetId),
  ...result.document.sections.flatMap(section => section.blocks.map(
    block => block.blockId
  ))
];
assert.strictEqual(new Set(allIds).size, allIds.length);
assert.strictEqual(result.diagnostics.length, 0);

const repeated = projector.project(reviewFixture(), cloneOptions(options));
assert.deepStrictEqual(repeated, result);
assert.strictEqual(model.serialize(repeated.document), model.serialize(
  result.document
));
const reloaded = model.deserialize(model.serialize(result.document));
assert.deepStrictEqual(reloaded, result.document);
assert.deepStrictEqual(
  reloaded.provenance.futureProducerField,
  { preserve: true }
);

const reordered = reviewFixture();
reordered.tasks = [reordered.tasks[1], reordered.tasks[0]];
const reorderedResult = projector.project(reordered, options);
const originalIdsByTask = new Map(workflow.blocks.map(
  step => [step.sourceRef?.taskId, step.blockId]
).filter(([taskId]) => taskId));
const reorderedWorkflow = reorderedResult.document.sections.find(
  section => section.kind === "workflow"
);
for (const step of reorderedWorkflow.blocks.filter(item => item.kind === "step")) {
  assert.strictEqual(step.blockId, originalIdsByTask.get(step.sourceRef.taskId));
}

const legacy = projector.project({
  sessionName: "Äldre Review",
  tasks: [{ instruction: "Äldre steg", screenshot: "legacy.png" }]
});
assert.strictEqual(legacy.document.metadata.title, "Äldre Review");
assert.strictEqual(
  legacy.document.sections.find(section => section.kind === "workflow")
    .blocks.find(block => block.kind === "step").sourceRef.taskId,
  "ReviewTask-1"
);
assert.ok(legacy.diagnostics.some(item => item.code === "missing-metadata"));
assert.ok(legacy.diagnostics.some(item => item.code === "invalid-reference"));
assert.strictEqual(model.validate(legacy.document).valid, true);

const incomplete = projector.project({
  sessionId: "incomplete",
  tasks: [{ taskId: "empty" }],
  annotations: {
    screenshotSets: [{
      screenshotRef: "orphan.png",
      items: []
    }]
  }
});
assert.deepStrictEqual(
  incomplete.diagnostics.map(item => item.code),
  [
    "missing-title",
    "missing-metadata",
    "empty-step",
    "missing-screenshot",
    "invalid-reference"
  ]
);

const malformedAnnotations = projector.project({
  sessionId: "malformed-annotations",
  sessionName: "Malformed annotations",
  updatedAt: "2026-08-05T12:00:00.000Z",
  tasks: [],
  annotations: { screenshotSets: [{ items: [] }] }
});
assert.ok(malformedAnnotations.diagnostics.some(
  item => item.code === "invalid-reference" &&
    item.path.endsWith(".screenshotRef")
));

const futureNormalized = model.normalize({
  ...JSON.parse(model.serialize(result.document)),
  schemaVersion: "2.0.0",
  futureDocumentField: { preserve: true },
  provenance: {
    ...result.document.provenance,
    futureSchemaField: "preserve"
  }
});
const futureReloaded = model.deserialize(model.serialize(futureNormalized));
assert.strictEqual(futureReloaded.schemaVersion, "2.0.0");
assert.deepStrictEqual(futureReloaded.futureDocumentField, { preserve: true });
assert.strictEqual(futureReloaded.provenance.futureSchemaField, "preserve");
assert.strictEqual(model.validate(futureReloaded).valid, true);

function cloneOptions(value) {
  return JSON.parse(JSON.stringify(value));
}

console.log("Review document projector behaviour tests passed.");
