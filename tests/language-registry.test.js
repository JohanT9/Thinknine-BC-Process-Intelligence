const assert = require("assert");
const registry = require("../src/engine/language-registry");

assert.deepStrictEqual(registry.supported("ui").map(item => item.locale),
  ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"]);
assert.deepStrictEqual(registry.supported("document").map(item => item.locale),
  ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"]);
assert.strictEqual(registry.normalize("en-GB", "ui"), "en-US");
assert.strictEqual(registry.get("sv").shortCode, "SV");
assert.strictEqual(registry.next("sv-SE", "ui"), "en-US");

const withDutch = registry.createRegistry([
  ...registry.DEFAULT_DEFINITIONS,
  { locale: "nl-NL", shortCode: "NL", nativeName: "Nederlands",
    aliases: ["nl", "nl-nl"], ui: true, document: true }
]);
assert.strictEqual(withDutch.normalize("nl", "ui"), "nl-NL");
assert.strictEqual(withDutch.normalize("nl-BE", "document"), "nl-NL");
assert.strictEqual(withDutch.get("nl-NL").shortCode, "NL");
assert.strictEqual(withDutch.next("nb-NO", "ui"), "nl-NL");
assert.deepStrictEqual(withDutch.supported("document").map(item => item.locale),
  ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO", "nl-NL"]);

assert.throws(() => registry.createRegistry([
  ...registry.DEFAULT_DEFINITIONS,
  { locale: "en-US", shortCode: "XX", nativeName: "Duplicate",
    aliases: ["xx"], ui: true }
]), /Duplicate language locale/);
assert.throws(() => registry.validateDefinition({ locale: "danish",
  shortCode: "NL", nativeName: "Nederlands", ui: true }), /Invalid language locale/);

console.log("Language registry extensibility tests passed.");

for (const alias of ["no", "no-NO", "nb", "nb-NO"]) {
  assert.equal(registry.normalize(alias), "nb-NO");
}
assert.equal(registry.next("nb-NO", "ui"), "sv-SE");
