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

console.log("Text formatting behaviour tests passed.");
