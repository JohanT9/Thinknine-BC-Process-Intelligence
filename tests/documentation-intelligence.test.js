const assert = require("assert");
const fs = require("fs");
const path = require("path");
const intelligence = require("../src/document/documentation-intelligence");

const document = { documentId: "doc-1", sections: [] };
const plan = { planId: "plan-1", sections: [] };
const context = { selectedStepId: "step-1", navigationReason: "edit" };
const findings = [{
  diagnosticId: "d-title",
  ruleId: "document.missing-title",
  severity: "error",
  message: "Document title is missing.",
  location: "document:metadata:title",
  sourceRef: { documentId: "doc-1" },
  suggestedAction: "Add a title."
}, {
  diagnosticId: "d-image",
  ruleId: "screenshot.missing",
  severity: "information",
  message: "Step has no screenshot.",
  location: "section:workflow/block:step-1",
  sourceRef: { sectionId: "workflow", taskId: "step-1" },
  suggestedAction: "Add a screenshot."
}, {
  diagnosticId: "d-alt",
  ruleId: "screenshot.missing-alt-text",
  severity: "warning",
  message: "Screenshot has no alternative text.",
  location: "plan/component:image",
  sourceRef: { taskId: "step-1", screenshotRef: "one.png" },
  suggestedAction: "Add alternative text."
}];
const qualityDiagnostics = { findings: [...findings, findings[1]] };
const before = JSON.stringify({ document, plan, qualityDiagnostics, context });
const model = intelligence.create({
  document,
  plan,
  qualityDiagnostics,
  workspaceContext: context
});

assert.ok(Object.isFrozen(model));
assert.ok(Object.isFrozen(model.items));
assert.strictEqual(model.items.length, 3, "Duplicate diagnostics must be collapsed.");
assert.strictEqual(model.health.overall, "Needs Attention");
assert.strictEqual(model.health.suggestionLabel, "3 Suggestions");
assert.strictEqual(model.items.find(item => item.diagnosticId === "d-title").status,
  "Needs Attention");
assert.strictEqual(model.items.find(item => item.diagnosticId === "d-image").group,
  "Screenshots");
assert.strictEqual(model.items.find(item => item.diagnosticId === "d-alt").group,
  "Accessibility");
assert.strictEqual(model.items[1].context.selectedStepId, "step-1");
assert.ok(!JSON.stringify(model).includes("Document title is missing"),
  "Guidance must not repeat critical diagnostic wording.");
assert.strictEqual(JSON.stringify({ document, plan, qualityDiagnostics, context }), before);
assert.deepStrictEqual(
  intelligence.create({ document, plan, qualityDiagnostics, workspaceContext: context }),
  model
);
assert.strictEqual(intelligence.filter(model, "Screenshots").length, 1);
assert.strictEqual(intelligence.filter(model, "attention").length, 1);
assert.strictEqual(intelligence.filter(model, "all"), model.items);

const empty = intelligence.create({
  document: { documentId: "empty" },
  plan: { planId: "empty-plan" },
  qualityDiagnostics: { findings: [{
    ...findings[0],
    diagnosticId: "empty-document",
    ruleId: "document.empty"
  }] },
  workspaceContext: {}
});
assert.strictEqual(empty.health.overall, "Needs Attention");
assert.strictEqual(empty.health.suggestionLabel, "1 Suggestion");
assert.strictEqual(empty.groups[0].name, "Documentation");
const ready = intelligence.create({ document, plan,
  qualityDiagnostics: { findings: [] } });
assert.strictEqual(ready.health.overall, "Ready for Review");
assert.strictEqual(ready.health.suggestionLabel, "0 Suggestions");

const many = intelligence.create({
  document,
  plan,
  qualityDiagnostics: {
    findings: Array.from({ length: 1000 }, (_, index) => ({
      ...findings[1],
      diagnosticId: `large-${String(index).padStart(4, "0")}`
    }))
  }
});
assert.strictEqual(many.items.length, 1000);
assert.strictEqual(many.groups[0].items.length, 1000);

const source = fs.readFileSync(
  path.join(__dirname, "../src/document/documentation-intelligence.js"),
  "utf8"
);
for (const forbidden of ["review-studio", "word-export", "dashboard", "renderPlan"]) {
  assert.ok(!source.includes(forbidden), `Intelligence must not depend on ${forbidden}.`);
}

console.log("Documentation Intelligence behaviour tests passed.");
