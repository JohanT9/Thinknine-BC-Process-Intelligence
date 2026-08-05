const assert = require("assert");
const semantic = require("../src/document/semantic-document");
const themeRegistry = require("../src/document/document-theme-registry");
const planner = require("../src/document/document-planner");
const quality = require("../src/document/document-quality");
const rules = require("../src/document/document-quality-rules");
const validation = require("../src/document/document-quality-validation");

function documentFixture() {
  return semantic.normalize({
    documentId: "document-quality",
    metadata: {
      title: "Order process",
      purpose: "Document order handling.",
      environment: "Test",
      reviewer: "Anna",
      documentVersion: "1.0"
    },
    assets: [{
      assetId: "asset-order",
      kind: "image",
      sourceRef: { screenshotRef: "order.png" }
    }],
    sections: [{
      sectionId: "section-cover",
      kind: "cover",
      blocks: [{
        blockId: "cover-title",
        kind: "heading",
        level: 1,
        text: "Order process"
      }]
    }, {
      sectionId: "section-purpose",
      kind: "purpose",
      blocks: [{
        blockId: "purpose-heading",
        kind: "heading",
        level: 1,
        text: "Purpose"
      }, {
        blockId: "purpose-text",
        kind: "paragraph",
        text: "Document order handling."
      }]
    }, {
      sectionId: "section-workflow",
      kind: "workflow",
      blocks: [{
        blockId: "workflow-heading",
        kind: "heading",
        level: 1,
        text: "Workflow"
      }, {
        blockId: "step-order",
        kind: "step",
        stepNumber: 1,
        sourceRef: { taskId: "task-order" },
        blocks: [{
          blockId: "instruction-order",
          kind: "paragraph",
          text: "Open the customer order and verify the customer.",
          sourceRef: { taskId: "task-order" }
        }, {
          blockId: "image-order",
          kind: "image",
          assetId: "asset-order",
          sourceRef: { taskId: "task-order", screenshotRef: "order.png" },
          annotationRefs: []
        }]
      }]
    }, {
      sectionId: "section-revisions",
      kind: "revisionHistory",
      blocks: [{
        blockId: "revision-heading",
        kind: "heading",
        level: 1,
        text: "Revision history"
      }, {
        blockId: "revision-block",
        kind: "revisionHistory",
        entries: [{
          revisionId: "revision-1",
          version: "1.0",
          createdAt: "2026-08-05T10:00:00.000Z",
          change: "First version",
          reviewer: "Anna"
        }]
      }]
    }]
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const document = documentFixture();
const theme = themeRegistry.resolve(themeRegistry.BUILT_IN_REGISTRY, "thinknine");
const plan = planner.plan(document, theme);
const documentBefore = JSON.stringify(document);
const planBefore = JSON.stringify(plan);
const clean = quality.analyze(document, plan, rules.BUILT_IN_REGISTRY);
assert.deepStrictEqual(clean.summary, {
  totalFindings: 0,
  bySeverity: { error: 0, warning: 0, information: 0 },
  byRule: {},
  affectedSections: [],
  affectedSteps: []
});
assert.deepStrictEqual(validation.validate(clean), { valid: true, issues: [] });
assert.ok(Object.isFrozen(clean));
assert.ok(Object.isFrozen(clean.findings));
assert.strictEqual(JSON.stringify(document), documentBefore);
assert.strictEqual(JSON.stringify(plan), planBefore);

const repeated = quality.analyze(document, plan, rules.BUILT_IN_REGISTRY);
assert.deepStrictEqual(repeated, clean);
assert.strictEqual(quality.serialize(repeated), quality.serialize(clean));

const duplicateRegistryRule = {
  ruleId: "custom.rule",
  version: "1.0.0",
  severity: "information",
  description: "Custom deterministic rule.",
  targetType: "document",
  futureRuleField: { preserve: true },
  evaluate: () => []
};
const customRegistry = quality.createRegistry([duplicateRegistryRule]);
assert.strictEqual(customRegistry.rules.length, 1);
assert.deepStrictEqual(
  customRegistry.rules[0].futureRuleField,
  { preserve: true }
);
assert.throws(
  () => quality.extendRegistry(customRegistry, [duplicateRegistryRule]),
  /Duplicate document quality rule ID/
);
const failingRegistry = quality.createRegistry([{
  ...duplicateRegistryRule,
  ruleId: "custom.failing",
  evaluate() { throw new Error("Expected rule failure"); }
}]);
const failureResult = quality.analyze(document, plan, failingRegistry);
assert.strictEqual(failureResult.summary.totalFindings, 1);
assert.strictEqual(failureResult.findings[0].severity, "information");

const futureDiagnostic = quality.normalizeDiagnostic({
  diagnosticId: "future:1",
  ruleId: "future.rule",
  severity: "information",
  message: "Future finding",
  sourceRef: { documentId: "document-quality" },
  location: "document",
  details: {},
  suggestedAction: "Review it.",
  futureField: { preserve: true }
});
assert.deepStrictEqual(
  quality.deserializeDiagnostic(quality.serialize(futureDiagnostic)),
  futureDiagnostic
);
assert.deepStrictEqual(futureDiagnostic.futureField, { preserve: true });

const brokenDocument = clone(document);
brokenDocument.metadata.title = "";
brokenDocument.metadata.environment = "";
brokenDocument.metadata.reviewer = "";
brokenDocument.sections = brokenDocument.sections.filter(section =>
  section.kind !== "purpose");
const workflow = brokenDocument.sections.find(section =>
  section.kind === "workflow");
const step = workflow.blocks.find(block => block.kind === "step");
step.blockId = "";
step.sourceRef = {};
step.blocks[0].text = "";
step.blocks[1].assetId = "missing-asset";
step.blocks[1].annotationRefs = [{
  annotationId: "",
  screenshotRef: "other.png"
}];
step.blocks.push({
  blockId: "empty-callout",
  kind: "callout",
  calloutType: "unsupported",
  sourceRef: { taskId: "task-order" },
  blocks: [{
    blockId: "empty-callout-text",
    kind: "paragraph",
    text: ""
  }]
});
brokenDocument.sections.find(section => section.kind === "revisionHistory")
  .blocks.find(block => block.kind === "revisionHistory").entries = [];

const brokenPlan = clone(plan);
const flatComponents = [];
function collect(values) {
  (values || []).forEach(component => {
    flatComponents.push(component);
    collect(component.components);
  });
}
collect(brokenPlan.components);
brokenPlan.sections.forEach(section => collect(section.components));
const screenshot = flatComponents.find(component =>
  component.kind === "screenshot");
screenshot.accessibility.label = "";
screenshot.sourceRef.assetId = "missing-asset";
const cover = flatComponents.find(component => component.kind === "cover");
cover.visibility = "hidden";
const footer = flatComponents.find(component => component.kind === "footer");
brokenPlan.metadata.capabilities = brokenPlan.metadata.capabilities.filter(
  capability => capability !== "supportsFooter"
);
assert.ok(footer.visibility === "visible");
const workflowPlan = brokenPlan.sections.find(section =>
  section.kind === "workflow");
const plannedStep = workflowPlan.components[0].components.find(component =>
  component.kind === "step");
plannedStep.components = plannedStep.components.filter(component =>
  component.kind !== "paragraph");

const brokenBefore = JSON.stringify(brokenDocument);
const brokenPlanBefore = JSON.stringify(brokenPlan);
const result = quality.analyze(
  brokenDocument,
  brokenPlan,
  rules.BUILT_IN_REGISTRY
);
const ruleIds = new Set(result.findings.map(finding => finding.ruleId));
for (const ruleId of [
  "document.missing-title",
  "document.missing-purpose",
  "step.missing-stable-id",
  "step.missing-source-task",
  "step.empty-instruction",
  "screenshot.missing-asset",
  "screenshot.missing-alt-text",
  "screenshot.invalid-annotation-reference",
  "callout.empty",
  "callout.invalid-role",
  "metadata.missing-environment",
  "metadata.missing-reviewer",
  "metadata.missing-revision",
  "plan.component-source-missing",
  "plan.hidden-required-component",
  "plan.unsupported-capability",
  "plan.missing-semantic-component"
]) assert.ok(ruleIds.has(ruleId), ruleId);
assert.ok(result.summary.bySeverity.error > 0);
assert.ok(result.summary.bySeverity.warning > 0);
assert.ok(result.summary.affectedSections.includes("section-workflow"));
assert.ok(result.findings.every(finding => finding.diagnosticId));
assert.ok(result.findings.every(finding => finding.location));
assert.strictEqual(JSON.stringify(brokenDocument), brokenBefore);
assert.strictEqual(JSON.stringify(brokenPlan), brokenPlanBefore);
assert.deepStrictEqual(validation.validate(result), { valid: true, issues: [] });

const duplicateDocument = clone(document);
const duplicateWorkflow = duplicateDocument.sections.find(section =>
  section.kind === "workflow");
duplicateWorkflow.blocks.push({
  blockId: "step-order-copy",
  kind: "step",
  stepNumber: 2,
  sourceRef: { taskId: "task-order-copy" },
  blocks: [{
    blockId: "instruction-order-copy",
    kind: "paragraph",
    text: "  OPEN the customer order and verify the customer. ",
    sourceRef: { taskId: "task-order-copy" }
  }]
});
const duplicateResult = quality.analyze(
  duplicateDocument,
  plan,
  rules.BUILT_IN_REGISTRY
);
assert.strictEqual(
  duplicateResult.summary.byRule["step.duplicate-instruction"],
  2
);
assert.strictEqual(
  duplicateResult.summary.byRule["screenshot.missing"],
  1
);

const emptyResult = quality.analyze({
  documentId: "empty-document",
  metadata: {},
  assets: [],
  sections: []
}, { metadata: { capabilities: [] }, components: [], sections: [] },
rules.BUILT_IN_REGISTRY);
assert.ok(emptyResult.summary.byRule["document.empty"]);
assert.ok(emptyResult.summary.byRule["document.missing-workflow"]);

console.log("Document quality diagnostics behaviour tests passed.");
