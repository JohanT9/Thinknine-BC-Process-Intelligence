const assert = require("assert");
const theme = require("../src/document/process-map-theme");

assert.strictEqual(theme.normalize("neutral"), "neutral");
assert.strictEqual(theme.normalize("unknown"), theme.DEFAULT_THEME_ID);
assert.strictEqual(theme.resolve("monochrome").palette.text, "#111111");
assert.deepStrictEqual(theme.list("sv-SE").map(item => item.label),
  ["Business Central", "Neutral", "Monokrom"]);
assert.deepStrictEqual(theme.list("en-US").map(item => item.label),
  ["Business Central", "Neutral", "Monochrome"]);
assert(Object.isFrozen(theme.THEMES));
assert(Object.isFrozen(theme.resolve("business-central").palette));
console.log("Process map theme tests passed.");
