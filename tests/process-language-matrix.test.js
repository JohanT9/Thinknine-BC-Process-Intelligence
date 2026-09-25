const assert = require("assert");
const matrix = require("../scripts/run-process-language-matrix");

assert.deepStrictEqual(matrix.locales, ["sv-SE", "en-US", "fr-FR", "de-DE",
  "es-ES", "da-DK", "fi-FI", "nb-NO"]);
const result = matrix.run();
assert.strictEqual(result.variantCount, 160);
assert.strictEqual(result.failed, 0, result.results.flatMap(item =>
  item.failures.map(failure =>
    `${item.scenarioId}/${item.locale}: ${failure}`)).join("\n"));
console.log("Process language matrix passed (160 variants, 8 languages).");
