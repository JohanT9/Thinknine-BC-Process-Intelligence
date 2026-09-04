const assert = require("assert");
const theme = require("../src/document/process-map-theme");

assert.strictEqual(theme.normalize("neutral"), "neutral");
assert.strictEqual(theme.normalize("unknown"), theme.DEFAULT_THEME_ID);
assert.strictEqual(theme.resolve("monochrome").palette.text, "#111111");
assert.strictEqual(theme.resolve("monochrome").palette.actionFill, "#e2e2e2");
assert.deepStrictEqual(theme.list("sv-SE").map(item => item.label),
  ["Business Central", "Neutral", "Monokrom"]);
assert.deepStrictEqual(theme.list("en-US").map(item => item.label),
  ["Business Central", "Neutral", "Monochrome"]);
assert(Object.isFrozen(theme.THEMES));
assert(Object.isFrozen(theme.resolve("business-central").palette));
assert(Object.isFrozen(theme.resolve("business-central").rolePalette));
assert.deepStrictEqual(theme.resolve("business-central").rolePalette.purchasing,
  ["#eef5ff", "#2563a6"]);
console.log("Process map theme tests passed.");
