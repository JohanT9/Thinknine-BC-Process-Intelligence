const assert = require("assert");
const semantic = require("../src/document/semantic-document");
const theme = require("../src/document/document-theme");
const registry = require("../src/document/document-theme-registry");
const planModel = require("../src/document/document-plan");
const planner = require("../src/document/document-planner");
const planValidation = require("../src/document/document-plan-validation");

function documentFixture() {
  return semantic.normalize({
    documentId: "document-1",
    metadata: { title: "Order process" },
    assets: [{
      assetId: "asset-1",
      kind: "image",
      sourceRef: { screenshotRef: "one.png" }
    }],
    sections: [{
      sectionId: "section-cover",
      kind: "cover",
      blocks: [{
        blockId: "heading-cover",
        kind: "heading",
        level: 1,
        text: "Order process"
      }]
    }, {
      sectionId: "section-workflow",
      kind: "workflow",
      blocks: [{
        blockId: "step-1",
        kind: "step",
        stepNumber: 1,
        blocks: [{
          blockId: "paragraph-1",
          kind: "paragraph",
          text: "Open the order."
        }, {
          blockId: "callout-1",
          kind: "callout",
          calloutType: "note",
          blocks: [{
            blockId: "callout-paragraph-1",
            kind: "paragraph",
            text: "Check the customer."
          }]
        }, {
          blockId: "image-1",
          kind: "image",
          assetId: "asset-1"
        }, {
          blockId: "list-1",
          kind: "list",
          items: [{
            itemId: "item-1",
            blocks: [{
              blockId: "list-paragraph-1",
              kind: "paragraph",
              text: "Prerequisite"
            }]
          }]
        }, {
          blockId: "table-1",
          kind: "table",
          columns: [{ columnId: "column-1" }],
          rows: [{
            rowId: "row-1",
            cells: [{
              cellId: "cell-1",
              columnId: "column-1",
              blocks: [{
                blockId: "cell-paragraph-1",
                kind: "paragraph",
                text: "Value"
              }]
            }]
          }]
        }]
      }, {
        blockId: "toc-1",
        kind: "toc"
      }, {
        blockId: "page-break-1",
        kind: "pageBreak"
      }]
    }, {
      sectionId: "section-revisions",
      kind: "revisionHistory",
      blocks: [{
        blockId: "revision-history-1",
        kind: "revisionHistory",
        entries: [{ revisionId: "revision-1" }]
      }]
    }]
  });
}

function flattenComponents(plan) {
  const result = [];
  function visit(components) {
    for (const component of components || []) {
      result.push(component);
      visit(component.components);
    }
  }
  visit(plan.components);
  plan.sections.forEach(section => visit(section.components));
  return result;
}

const document = documentFixture();
const resolvedTheme = registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine"
);
const documentBefore = JSON.stringify(document);
const themeBefore = JSON.stringify(resolvedTheme);
const result = planner.plan(document, resolvedTheme);

assert.strictEqual(JSON.stringify(document), documentBefore);
assert.strictEqual(JSON.stringify(resolvedTheme), themeBefore);
assert.ok(Object.isFrozen(result));
assert.ok(Object.isFrozen(result.sections));
assert.ok(Object.isFrozen(result.sections[1].components[0].components));
assert.throws(() => result.sections.push({}), TypeError);
assert.deepStrictEqual(planValidation.validate(result, {
  document,
  theme: resolvedTheme,
  plannerVersion: planner.PLANNER_VERSION
}), { valid: true, issues: [] });

assert.strictEqual(result.planSchemaVersion, "1.0.0");
assert.strictEqual(result.plannerVersion, "1.0.0");
assert.deepStrictEqual(result.documentRef, {
  documentId: "document-1",
  schemaVersion: "1.0.0"
});
assert.strictEqual(result.themeRef.themeId, "thinknine");
assert.strictEqual(result.themeRef.themeSchemaVersion, "1.0.0");
assert.deepStrictEqual(result.themeRef.origin, {
  provider: "built-in",
  package: "thinknine",
  id: "thinknine"
});
assert.deepStrictEqual(result.themeRef.compatibility, {
  semanticDocument: "1.0.0",
  planner: "1.0.0"
});
assert.deepStrictEqual(result.page, resolvedTheme.page);
assert.deepStrictEqual(result.spacing, resolvedTheme.spacing);

assert.deepStrictEqual(
  result.sections.map(section => section.pageIntent),
  ["newPage", "newSection", "appendix"]
);
assert.deepStrictEqual(
  result.components.map(component => component.kind),
  ["header", "footer"]
);
const components = flattenComponents(result);
for (const component of components) {
  assert.ok(component.componentId);
  assert.ok(component.accessibility.label);
  assert.strictEqual(component.presentationIntent.rendererNeutral, true);
  assert.ok(Array.isArray(component.themeTokenReferences));
  assert.ok(Array.isArray(component.capabilityRequirements));
}
for (const kind of [
  "cover", "metadata", "workflow", "step", "screenshot", "callout",
  "list", "table", "revisionHistory", "toc", "pageBreak", "group"
]) {
  assert.ok(components.some(component => component.kind === kind), kind);
}
assert.strictEqual(
  components.find(component => component.kind === "heading")
    .appearance.typography.color,
  "#0f4c81"
);
assert.strictEqual(
  components.find(component => component.kind === "step").keepTogether,
  true
);
assert.strictEqual(
  components.find(component => component.kind === "step").content.title,
  "Steg 1"
);
assert.strictEqual(
  components.find(component => component.kind === "screenshot")
    .accessibility.label,
  "Skärmbild 1 steg 1"
);
assert.strictEqual(
  components.find(component => component.kind === "pageBreak").pageIntent,
  "newPage"
);
assert.ok(components.some(component => component.grouping === "listItem"));
assert.ok(components.some(component => component.grouping === "tableRow"));
assert.ok(components.some(component => component.grouping === "tableCell"));

const repeated = planner.plan(documentFixture(), registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine"
));
assert.deepStrictEqual(repeated, result);
assert.strictEqual(planModel.serialize(repeated), planModel.serialize(result));

const serialized = planModel.serialize(result);
const reloaded = planModel.deserialize(serialized);
assert.deepStrictEqual(reloaded, result);
assert.ok(Object.isFrozen(reloaded));

const noCapabilities = registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine",
  { capabilities: [] }
);
const restricted = planner.plan(document, noCapabilities);
assert.deepStrictEqual(restricted.components, []);
const restrictedComponents = flattenComponents(restricted);
for (const kind of ["cover", "callout", "revisionHistory", "toc"]) {
  assert.strictEqual(
    restrictedComponents.find(component => component.kind === kind).visibility,
    "hidden"
  );
}
assert.deepStrictEqual(planValidation.validate(restricted, {
  document,
  theme: noCapabilities,
  plannerVersion: planner.PLANNER_VERSION
}), { valid: true, issues: [] });

const legacyThemeInput = {
  ...registry.BUILT_IN_THEMES[0],
  themeId: "legacy",
  displayName: "Legacy"
};
delete legacyThemeInput.themeSchemaVersion;
delete legacyThemeInput.origin;
delete legacyThemeInput.compatibility;
const legacyTheme = theme.normalize(legacyThemeInput);
assert.strictEqual(legacyTheme.themeSchemaVersion, "1.0.0");
assert.deepStrictEqual(legacyTheme.origin, {});
assert.deepStrictEqual(legacyTheme.compatibility, {
  semanticDocument: "*",
  planner: "*"
});
assert.strictEqual(planner.plan(document, theme.resolveTokens(legacyTheme))
  .themeRef.themeId, "legacy");

const futureThemeVersion = registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine",
  { version: "9.0.0" }
);
assert.strictEqual(
  planner.plan(document, futureThemeVersion).themeRef.version,
  "9.0.0"
);

const futureThemeMetadata = registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine",
  { metadata: { futureLiteral: "{colors.primary}" } }
);
assert.strictEqual(
  planner.plan(document, futureThemeMetadata).themeRef.themeId,
  "thinknine"
);

const futureThemeSchema = registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine",
  { themeSchemaVersion: "2.0.0" }
);
assert.strictEqual(futureThemeSchema.themeSchemaVersion, "2.0.0");
assert.throws(
  () => planner.plan(document, futureThemeSchema),
  /Unsupported theme schema version/
);

const incompatibleDocumentTheme = registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine",
  { compatibility: { semanticDocument: "2.0.0", planner: "1.0.0" } }
);
assert.throws(
  () => planner.plan(document, incompatibleDocumentTheme),
  /does not support Semantic Document/
);
const incompatiblePlannerTheme = registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine",
  { compatibility: { semanticDocument: "1.0.0", planner: "2.0.0" } }
);
assert.throws(
  () => planner.plan(document, incompatiblePlannerTheme),
  /does not support Document Planner/
);

const unresolvedTheme = theme.normalize(registry.BUILT_IN_THEMES[0]);
assert.throws(
  () => planner.plan(document, unresolvedTheme),
  /resolved theme tokens/
);

const futurePlan = planModel.normalize({
  ...JSON.parse(serialized),
  planSchemaVersion: "2.0.0",
  plannerVersion: "2.0.0",
  futurePlanField: { preserve: true },
  sections: result.sections.map((section, index) => index === 0 ? {
    ...section,
    futureSectionField: true
  } : section)
});
const futureValidation = planValidation.validate(futurePlan, {
  document,
  plannerVersion: planner.PLANNER_VERSION
});
assert.strictEqual(futureValidation.valid, true);
assert.deepStrictEqual(
  futureValidation.issues.map(item => item.code),
  ["future-plan-schema-version", "future-planner-version"]
);
const futureReloaded = planModel.deserialize(planModel.serialize(futurePlan));
assert.deepStrictEqual(futureReloaded.futurePlanField, { preserve: true });
assert.strictEqual(futureReloaded.sections[0].futureSectionField, true);

const futureComponentPlan = JSON.parse(serialized);
futureComponentPlan.components.push({
  componentId: "component:future:1",
  kind: "futurePanel",
  sourceRef: {},
  accessibility: { role: "document", label: "Future panel" },
  presentationIntent: { rendererNeutral: true },
  themeTokenReferences: ["components.futurePanel"],
  capabilityRequirements: [],
  pageIntent: "normal",
  visibility: "visible",
  futureComponentField: { preserve: true },
  components: []
});
const normalizedFutureComponentPlan = planModel.deserialize(
  planModel.serialize(futureComponentPlan)
);
assert.deepStrictEqual(
  normalizedFutureComponentPlan.components.at(-1).futureComponentField,
  { preserve: true }
);
const futureComponentValidation = planValidation.validate(
  normalizedFutureComponentPlan,
  { document, theme: resolvedTheme, plannerVersion: planner.PLANNER_VERSION }
);
assert.strictEqual(futureComponentValidation.valid, true);
assert.ok(futureComponentValidation.issues.some(
  issue => issue.code === "future-component-kind"
));

const missingComponent = JSON.parse(serialized);
missingComponent.sections[1].components[0].components = [];
assert.ok(planValidation.validate(missingComponent, {
  document,
  theme: resolvedTheme,
  plannerVersion: planner.PLANNER_VERSION
}).issues.some(item => item.code === "missing-component"));

const capabilityConflict = JSON.parse(planModel.serialize(restricted));
capabilityConflict.sections[0].components[0].visibility = "visible";
assert.ok(planValidation.validate(capabilityConflict, {
  document,
  theme: noCapabilities,
  plannerVersion: planner.PLANNER_VERSION
}).issues.some(item => item.code === "capability-conflict"));

const invalidReference = JSON.parse(serialized);
invalidReference.sections[1].components[0].components[0]
  .sourceRef.blockId = "missing-block";
assert.ok(planValidation.validate(invalidReference, {
  document,
  theme: resolvedTheme,
  plannerVersion: planner.PLANNER_VERSION
}).issues.some(item => item.code === "invalid-reference"));

console.log("Document Planner behaviour tests passed.");
