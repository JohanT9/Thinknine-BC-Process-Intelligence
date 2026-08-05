const assert = require("assert");
const theme = require("../src/document/document-theme");
const validation = require("../src/document/document-theme-validation");
const registry = require("../src/document/document-theme-registry");

const builtInValidation = registry.validate(registry.BUILT_IN_REGISTRY);
assert.deepStrictEqual(builtInValidation, { valid: true, issues: [] });
assert.deepStrictEqual(
  registry.list(registry.BUILT_IN_REGISTRY).map(item => item.themeId),
  ["base", "thinknine", "minimal", "corporate"]
);

const thinknine = registry.resolve(registry.BUILT_IN_REGISTRY, "thinknine");
assert.ok(Object.isFrozen(thinknine));
assert.ok(Object.isFrozen(thinknine.colors));
assert.ok(Object.isFrozen(thinknine.typography.title));
assert.strictEqual(thinknine.colors.primary, "#0f4c81");
assert.strictEqual(thinknine.colors.text, "#111827");
assert.strictEqual(thinknine.typography.title.color, "#0f4c81");
assert.strictEqual(thinknine.page.background, "#ffffff");
assert.strictEqual(thinknine.components.cover.accentColor, "#0f4c81");
assert.strictEqual(thinknine.branding.organizationName, "Thinknine AB");
assert.ok(thinknine.capabilities.includes("supportsBranding"));

const overrides = {
  colors: { primary: "#ff0000" },
  branding: { organizationName: "Customer AB" },
  metadata: { customerId: "customer-1" },
  futureRoot: { preserve: true }
};
const overridesBefore = JSON.stringify(overrides);
const thinknineBefore = JSON.stringify(thinknine);
const customer = registry.resolve(
  registry.BUILT_IN_REGISTRY,
  "thinknine",
  overrides
);
assert.strictEqual(JSON.stringify(overrides), overridesBefore);
assert.strictEqual(JSON.stringify(thinknine), thinknineBefore);
assert.strictEqual(customer.themeId, "thinknine");
assert.strictEqual(customer.colors.primary, "#ff0000");
assert.strictEqual(customer.typography.title.color, "#ff0000");
assert.strictEqual(customer.colors.text, "#111827");
assert.strictEqual(customer.branding.organizationName, "Customer AB");
assert.strictEqual(customer.metadata.builtIn, true);
assert.strictEqual(customer.metadata.customerId, "customer-1");
assert.deepStrictEqual(customer.futureRoot, { preserve: true });

const baseRegistry = registry.create([{
  themeId: "parent",
  version: theme.THEME_VERSION,
  displayName: "Parent",
  colors: {
    primary: "#000001",
    text: "#000002",
    background: "#ffffff"
  },
  typography: {
    title: { size: 20, color: "{colors.primary}" },
    heading1: { size: 18 },
    heading2: { size: 16 },
    body: { size: 11 },
    caption: { size: 9 }
  },
  spacing: { page: 8, section: 6, paragraph: 3, component: 4 },
  page: { size: "A4", orientation: "portrait" },
  branding: {},
  components: {},
  capabilities: ["supportsCover"],
  metadata: { parent: true }
}, {
  themeId: "child",
  version: theme.THEME_VERSION,
  displayName: "Child",
  extends: "parent",
  colors: { primary: "#123456" },
  metadata: { child: true },
  futureChildField: { preserve: true }
}]);
const child = registry.resolve(baseRegistry, "child");
assert.strictEqual(child.colors.primary, "#123456");
assert.strictEqual(child.colors.text, "#000002");
assert.strictEqual(child.typography.title.color, "#123456");
assert.deepStrictEqual(child.metadata, { parent: true, child: true });
assert.deepStrictEqual(child.futureChildField, { preserve: true });
assert.deepStrictEqual(child.capabilities, ["supportsCover"]);
assert.strictEqual(registry.validate(baseRegistry).valid, true);

const original = {
  themeId: "future",
  version: "2.0.0",
  displayName: "Future",
  futureRoot: { enabled: true },
  colors: { futureColor: "spectral" },
  typography: {},
  spacing: {},
  page: {},
  branding: {},
  components: { futureComponent: { mode: "future" } },
  capabilities: ["supportsFutureDocuments"],
  metadata: { futureMetadata: true }
};
const originalBefore = JSON.stringify(original);
const normalized = theme.normalize(original);
assert.strictEqual(JSON.stringify(original), originalBefore);
assert.ok(Object.isFrozen(normalized));
assert.deepStrictEqual(normalized.futureRoot, { enabled: true });
assert.strictEqual(normalized.colors.futureColor, "spectral");
assert.deepStrictEqual(
  normalized.components.futureComponent,
  { mode: "future" }
);
const futureValidation = validation.validate(normalized, {
  requireValues: false
});
assert.strictEqual(futureValidation.valid, true);
assert.deepStrictEqual(
  futureValidation.issues.map(item => item.code),
  ["future-theme-version", "future-capability"]
);

const serialized = theme.serialize(normalized);
const reloaded = theme.deserialize(serialized);
assert.deepStrictEqual(reloaded, normalized);
assert.ok(Object.isFrozen(reloaded));

const legacy = theme.normalize({ themeId: "legacy", displayName: "Legacy" });
assert.strictEqual(legacy.version, theme.THEME_VERSION);
assert.deepStrictEqual(legacy.colors, {});
assert.deepStrictEqual(legacy.capabilities, []);

const duplicateRegistry = registry.create([
  { themeId: "duplicate", displayName: "First" },
  { themeId: "duplicate", displayName: "Second" }
]);
assert.ok(registry.validate(duplicateRegistry).issues.some(
  item => item.code === "duplicate-theme-id"
));
assert.throws(
  () => registry.resolve(duplicateRegistry, "duplicate"),
  /duplicate/
);

const cycleRegistry = registry.create([{
  themeId: "cycle-a", displayName: "A", extends: "cycle-b"
}, {
  themeId: "cycle-b", displayName: "B", extends: "cycle-a"
}]);
assert.ok(registry.validate(cycleRegistry).issues.some(
  item => item.code === "cyclic-inheritance"
));
assert.throws(
  () => registry.resolve(cycleRegistry, "cycle-a"),
  /Cyclic theme inheritance/
);

const invalidParent = registry.create([{
  themeId: "orphan", displayName: "Orphan", extends: "missing"
}]);
assert.ok(registry.validate(invalidParent).issues.some(
  item => item.code === "invalid-inheritance"
));

const malformedInheritance = registry.create([{
  themeId: "malformed-inheritance",
  displayName: "Malformed inheritance",
  extends: 42,
  capabilities: "supportsCover"
}]);
const malformedInheritanceCodes = registry.validate(malformedInheritance)
  .issues.map(item => item.code);
assert.ok(malformedInheritanceCodes.includes("invalid-inheritance"));
assert.ok(malformedInheritanceCodes.includes("invalid-capabilities"));

const duplicateCapabilities = theme.normalize({
  ...registry.BUILT_IN_THEMES[0],
  themeId: "duplicate-capabilities",
  capabilities: ["supportsCover", "supportsCover"]
});
assert.ok(validation.validate(duplicateCapabilities).issues.some(
  item => item.code === "duplicate-capability"
));

const invalidTokens = theme.normalize({
  ...registry.BUILT_IN_THEMES[0],
  themeId: "invalid-tokens",
  colors: { ...registry.BUILT_IN_THEMES[0].colors, primary: 42 },
  spacing: { ...registry.BUILT_IN_THEMES[0].spacing, page: Infinity }
});
assert.ok(validation.validate(invalidTokens).issues.filter(
  item => item.code === "invalid-token"
).length >= 2);

const missingRequired = theme.normalize({
  themeId: "missing-required",
  displayName: "Missing",
  colors: {},
  typography: {},
  spacing: {},
  page: {},
  branding: {},
  components: {},
  capabilities: []
});
assert.ok(validation.validate(missingRequired).issues.some(
  item => item.code === "missing-required-token"
));

const invalidReference = theme.normalize({
  ...registry.BUILT_IN_THEMES[0],
  themeId: "invalid-reference",
  components: {
    ...registry.BUILT_IN_THEMES[0].components,
    cover: { accentColor: "{colors.doesNotExist}" }
  }
});
assert.ok(validation.validate(invalidReference).issues.some(
  item => item.code === "invalid-token-reference"
));
assert.throws(() => theme.resolveTokens(invalidReference), /Unknown theme token/);

const tokenCycle = theme.normalize({
  ...registry.BUILT_IN_THEMES[0],
  themeId: "token-cycle",
  colors: {
    ...registry.BUILT_IN_THEMES[0].colors,
    primary: "{colors.secondary}",
    secondary: "{colors.primary}"
  }
});
assert.throws(() => theme.resolveTokens(tokenCycle), /Cyclic theme token/);

const empty = registry.create();
const withTheme = registry.register(empty, registry.BUILT_IN_THEMES[0]);
assert.strictEqual(empty.themes.length, 0);
assert.strictEqual(withTheme.themes.length, 1);
assert.ok(Object.isFrozen(withTheme));
assert.ok(Object.isFrozen(withTheme.themes));

console.log("Document theme behaviour tests passed.");
