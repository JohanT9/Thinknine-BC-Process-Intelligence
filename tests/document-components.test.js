const assert = require("assert");
const components = require("../src/document/document-components");
const registry = require("../src/document/document-component-registry");
const validation = require("../src/document/document-component-validation");

const definition = components.normalizeDefinition({
  kind: "futurePanel",
  semanticRole: "future",
  requiredContent: ["text"],
  accessibility: { role: "document", label: "Future panel" },
  presentationIntent: { rendererNeutral: true },
  themeTokenReferences: ["components.futurePanel"],
  capabilityRequirements: ["supportsFuturePanel"],
  futureDefinitionField: { preserved: true }
});
assert.ok(Object.isFrozen(definition));
assert.ok(Object.isFrozen(definition.futureDefinitionField));
assert.strictEqual(definition.componentSchemaVersion, "1.0.0");
assert.deepStrictEqual(
  components.deserializeDefinition(components.serialize(definition)),
  definition
);

const component = components.normalizeComponent({
  componentId: "component:future:stable-1",
  kind: "futurePanel",
  content: { text: "Future content" },
  sourceRef: { blockId: "block-stable-1" },
  accessibility: { role: "document", label: "Future content" },
  presentationIntent: { rendererNeutral: true, placement: "flow" },
  themeTokenReferences: ["components.futurePanel"],
  capabilityRequirements: ["supportsFuturePanel"],
  futureInstanceField: { preserved: true }
});
assert.strictEqual(component.componentId, "component:future:stable-1");
assert.ok(Object.isFrozen(component));
assert.ok(Object.isFrozen(component.content));
assert.deepStrictEqual(
  components.deserializeComponent(components.serialize(component)),
  component
);
assert.deepStrictEqual(component.futureInstanceField, { preserved: true });

const extended = registry.extend(registry.BUILT_IN_REGISTRY, [definition]);
assert.strictEqual(registry.get(extended, "futurePanel").semanticRole, "future");
assert.throws(
  () => registry.extend(extended, [definition]),
  /Duplicate document component kind/
);
assert.ok(registry.get(registry.BUILT_IN_REGISTRY, "cover"));
assert.ok(registry.get(registry.BUILT_IN_REGISTRY, "screenshot"));
assert.ok(registry.get(registry.BUILT_IN_REGISTRY, "pageBreak"));

const unknownResult = validation.validate(component);
assert.strictEqual(unknownResult.valid, true);
assert.deepStrictEqual(
  unknownResult.issues.map(issue => issue.code),
  ["future-component-kind"]
);

const cover = components.normalizeComponent({
  ...registry.contract(registry.BUILT_IN_REGISTRY, "cover", {
    accessibility: { label: "Orderprocess cover" }
  }),
  componentId: "component:cover:document-1",
  kind: "cover",
  content: {
    title: "Orderprocess",
    documentId: "document-1",
    metadataComponentId: "component:metadata:document-1"
  },
  sourceRef: { sectionId: "cover" }
});
assert.deepStrictEqual(validation.validate(cover), { valid: true, issues: [] });
assert.strictEqual(cover.accessibility.label, "Orderprocess cover");
assert.deepStrictEqual(cover.capabilityRequirements, ["supportsCover"]);
assert.deepStrictEqual(cover.themeTokenReferences, ["components.cover"]);

const invalidCover = JSON.parse(components.serialize(cover));
delete invalidCover.content.title;
delete invalidCover.accessibility.label;
invalidCover.presentationIntent.rendererNeutral = false;
invalidCover.capabilityRequirements = [];
const invalidCodes = validation.validate(invalidCover).issues.map(
  issue => issue.code
);
for (const code of [
  "missing-component-content",
  "missing-accessibility-label",
  "renderer-specific-component",
  "missing-capability-requirement"
]) assert.ok(invalidCodes.includes(code), code);

const futureCallout = components.normalizeComponent({
  ...registry.contract(registry.BUILT_IN_REGISTRY, "callout"),
  componentId: "component:callout:future",
  kind: "callout",
  content: { calloutType: "future-role", label: "Future", text: "Text" },
  sourceRef: { blockId: "callout-future" }
});
assert.strictEqual(validation.validate(futureCallout).valid, true);
assert.ok(validation.validate(futureCallout).issues.some(
  issue => issue.code === "future-callout-role"
));

console.log("Reusable document component behaviour tests passed.");
