const assert = require("assert");
const textFormat = require("../src/engine/text-format");

assert.strictEqual(
  textFormat.quoteEmphasis("Välj **Sök** och **Förs.order Listor**."),
  'Välj "Sök" och "Förs.order Listor".'
);
assert.strictEqual(
  textFormat.quoteEmphasis("Redan \"citerad\" text."),
  'Redan "citerad" text.'
);
assert.strictEqual(
  textFormat.quoteEmphasis("Ofullständig **markering"),
  "Ofullständig **markering"
);
assert.strictEqual(
  textFormat.quoteEmphasis("Ange __400__ i **Antal**."),
  'Ange 400 i "Antal".'
);
assert.deepStrictEqual(
  textFormat.instructionSegments("Ange __400__ i **Antal**."),
  [{ text: "Ange ", bold: false }, { text: "400", bold: true },
    { text: ' i "Antal".', bold: false }]
);
assert.deepStrictEqual(
  textFormat.instructionSegments("Ange __ABC_400__ i **Referens**."),
  [{ text: "Ange ", bold: false }, { text: "ABC_400", bold: true },
    { text: ' i "Referens".', bold: false }]
);

console.log("Text formatting behaviour tests passed.");
