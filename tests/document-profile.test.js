const assert = require("assert");
const profileModel = require("../src/document/document-profile");
const themeRegistry = require("../src/document/document-theme-registry");
const planner = require("../src/document/document-planner");
const semantic = require("../src/document/semantic-document");
const intelligence = require("../src/document/documentation-intelligence");

const expectedIds = [
  "business-process", "sop", "training-guide", "quick-reference",
  "troubleshooting-guide"
];
assert.deepStrictEqual(
  profileModel.list(profileModel.BUILT_IN_REGISTRY).map(value => value.profileId),
  expectedIds
);
for (const value of profileModel.BUILT_IN_PROFILES) {
  assert.ok(Object.isFrozen(value));
  assert.ok(value.displayName);
  assert.ok(value.description);
  assert.ok(value.theme.themeId);
  assert.ok(value.guidancePriorities.length);
  assert.ok(value.capabilities.length);
  assert.deepStrictEqual(
    profileModel.get(profileModel.BUILT_IN_REGISTRY, value.profileId),
    value
  );
}

const future = profileModel.normalize({
  profileSchemaVersion: "9.0.0",
  profileId: "future",
  displayName: "Future",
  theme: { themeId: "minimal", futureTheme: true },
  futureField: { preserve: true }
});
assert.strictEqual(future.profileSchemaVersion, "9.0.0");
assert.deepStrictEqual(future.futureField, { preserve: true });
assert.strictEqual(future.theme.futureTheme, true);
assert.ok(Object.isFrozen(future));
assert.throws(
  () => profileModel.createRegistry([future, future]),
  /duplicate Document Profile/
);
const extended = profileModel.register(profileModel.BUILT_IN_REGISTRY, future);
assert.strictEqual(profileModel.get(extended, "future").futureField.preserve, true);

const document = semantic.normalize({
  documentId: "profile-document",
  metadata: {
    title: "Orderhantering",
    environment: "Test",
    reviewer: "Anna",
    documentVersion: "1.0"
  },
  assets: [{ assetId: "image-1", kind: "image",
    sourceRef: { screenshotRef: "one.png" } }],
  sections: [{ sectionId: "purpose", kind: "purpose", blocks: [{
    blockId: "purpose-text", kind: "paragraph", text: "Beskriver processen."
  }] }, { sectionId: "workflow", kind: "workflow", blocks: [{
    blockId: "step-1", kind: "step", stepNumber: 1,
    sourceRef: { taskId: "task-1" }, blocks: [{
      blockId: "instruction-1", kind: "paragraph",
      text: "Öppna ordern och kontrollera kunduppgifterna noggrant."
    }, { blockId: "image-block-1", kind: "image", assetId: "image-1",
      sourceRef: { taskId: "task-1", screenshotRef: "one.png" } }]
  }] }, { sectionId: "revision", kind: "revisionHistory", blocks: [] }]
});
const documentBefore = JSON.stringify(document);
const planIds = new Set();
for (const value of profileModel.BUILT_IN_PROFILES) {
  const theme = themeRegistry.resolve(
    themeRegistry.BUILT_IN_REGISTRY,
    value.theme.themeId
  );
  const plan = planner.plan(document, theme);
  planIds.add(`${value.profileId}:${plan.themeRef.themeId}`);
  assert.strictEqual(plan.themeRef.themeId, value.theme.themeId);
  const profileHealth = intelligence.create({
    document,
    plan,
    qualityDiagnostics: { findings: [] },
    profile: value
  });
  assert.strictEqual(profileHealth.profile.profileId, value.profileId);
  assert.ok(Object.isFrozen(profileHealth));
}
assert.strictEqual(planIds.size, 5);
assert.strictEqual(JSON.stringify(document), documentBefore);

const cleanDiagnostics = { findings: [] };
const business = profileModel.get(profileModel.BUILT_IN_REGISTRY,
  "business-process");
const businessModel = intelligence.create({
  document,
  plan: { planId: "business-plan" },
  qualityDiagnostics: cleanDiagnostics,
  workspaceContext: { selectedStepId: "task-1" },
  profile: business
});
assert.strictEqual(businessModel.profile.profileId, "business-process");
assert.ok(businessModel.positiveConfirmations.some(value =>
  value.confirmationId.endsWith(":workflow")));
assert.ok(businessModel.positiveConfirmations.some(value =>
  value.confirmationId.endsWith(":screenshots")));
assert.strictEqual(businessModel.activeContext.selectedStepId, "task-1");

const training = profileModel.get(profileModel.BUILT_IN_REGISTRY,
  "training-guide");
const shortDocument = JSON.parse(JSON.stringify(document));
shortDocument.sections.find(section => section.kind === "workflow")
  .blocks[0].blocks[0].text = "Öppna ordern.";
const trainingModel = intelligence.create({
  document: shortDocument,
  plan: { planId: "training-plan" },
  qualityDiagnostics: cleanDiagnostics,
  workspaceContext: businessModel.activeContext,
  profile: training
});
assert.ok(trainingModel.items.some(value =>
  value.guidanceId === "profile:training-guide:expanded-text"));
assert.strictEqual(trainingModel.activeContext.selectedStepId, "task-1");

const quick = profileModel.get(profileModel.BUILT_IN_REGISTRY,
  "quick-reference");
const quickModel = intelligence.create({
  document: shortDocument,
  plan: { planId: "quick-plan" },
  qualityDiagnostics: { findings: [{
    diagnosticId: "missing-revision",
    ruleId: "document.missing-revision-history",
    severity: "warning",
    sourceRef: {},
    location: "document:revisionHistory"
  }, {
    diagnosticId: "missing-screenshot",
    ruleId: "screenshot.missing",
    severity: "information",
    sourceRef: { taskId: "task-1" },
    location: "workflow"
  }] },
  profile: quick
});
assert.ok(!quickModel.items.some(value => ["missing-revision", "missing-screenshot"]
  .includes(value.diagnosticId)));
const noEvidence = JSON.parse(JSON.stringify(shortDocument));
noEvidence.sections.find(section => section.kind === "workflow")
  .blocks[0].blocks = noEvidence.sections.find(section =>
    section.kind === "workflow").blocks[0].blocks.filter(block =>
    block.kind !== "image");
const noEvidenceModel = intelligence.create({ document: noEvidence,
  plan: { planId: "no-evidence" }, qualityDiagnostics: { findings: [] },
  profile: quick });
assert.ok(!noEvidenceModel.positiveConfirmations.some(value =>
  value.confirmationId.endsWith(":screenshots")));

const sop = profileModel.get(profileModel.BUILT_IN_REGISTRY, "sop");
const sopDocument = JSON.parse(JSON.stringify(document));
sopDocument.sections = sopDocument.sections.filter(section =>
  section.kind !== "revisionHistory");
const sopModel = intelligence.create({ document: sopDocument,
  plan: { planId: "sop-plan" }, qualityDiagnostics: cleanDiagnostics,
  profile: sop });
assert.strictEqual(sopModel.items[0].group, "Revision History");
assert.ok(sopModel.items.some(value => value.guidanceId.endsWith(
  ":approval-information")));
assert.ok(!sopModel.positiveConfirmations.some(value =>
  value.confirmationId.endsWith(":metadata")));
assert.deepStrictEqual(
  intelligence.create({ document: sopDocument, plan: { planId: "sop-plan" },
    qualityDiagnostics: cleanDiagnostics, profile: sop }),
  sopModel
);

console.log("Smart Document Profile behaviour tests passed.");
