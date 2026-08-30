const assert = require("assert");
const registry = require("../src/engine/language-registry");

assert.deepStrictEqual(registry.supported("ui").map(item => item.locale),
  ["sv-SE", "en-US"]);
assert.deepStrictEqual(registry.supported("document").map(item => item.locale),
  ["sv-SE", "en-US"]);
assert.strictEqual(registry.normalize("en-GB", "ui"), "en-US");
assert.strictEqual(registry.get("sv").shortCode, "SV");
assert.strictEqual(registry.next("sv-SE", "ui"), "en-US");

const withDanish = registry.createRegistry([
  ...registry.DEFAULT_DEFINITIONS,
  { locale: "da-DK", shortCode: "DA", nativeName: "Dansk",
    aliases: ["da", "da-dk"], ui: true, document: true }
]);
assert.strictEqual(withDanish.normalize("da", "ui"), "da-DK");
assert.strictEqual(withDanish.normalize("da-GL", "document"), "da-DK");
assert.strictEqual(withDanish.get("da-DK").shortCode, "DA");
assert.strictEqual(withDanish.next("en-US", "ui"), "da-DK");
assert.deepStrictEqual(withDanish.supported("document").map(item => item.locale),
  ["sv-SE", "en-US", "da-DK"]);

assert.throws(() => registry.createRegistry([
  ...registry.DEFAULT_DEFINITIONS,
  { locale: "en-US", shortCode: "XX", nativeName: "Duplicate",
    aliases: ["xx"], ui: true }
]), /Duplicate language locale/);
assert.throws(() => registry.validateDefinition({ locale: "danish",
  shortCode: "DA", nativeName: "Dansk", ui: true }), /Invalid language locale/);

console.log("Language registry extensibility tests passed.");
