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

const formatted = textFormat.applyInstructionFormat(
  [{ text: "Ange 30043 i Nr." }], "Ange 30043 i Nr.", 5, 10,
  { bold: true, fontFamily: "Aptos", fontSize: 12 }
);
assert.deepStrictEqual(formatted, [
  { text: "Ange " },
  { text: "30043", bold: true, fontFamily: "Aptos", fontSize: 12 },
  { text: " i Nr." }
]);
assert.deepStrictEqual(textFormat.applyInstructionFormat(
  formatted, "Ange 30043 i Nr.", 5, 10, { italic: true }
)[1], {
  text: "30043", bold: true, italic: true,
  fontFamily: "Aptos", fontSize: 12
});
assert.deepStrictEqual(textFormat.normalizeInstructionRuns([
  { text: "Text", fontFamily: "Comic Sans MS", fontSize: 72, bold: true }
], "Text"), [{ text: "Text", bold: true }]);
assert.deepStrictEqual(textFormat.normalizeInstructionRuns([
  { text: "Fel text", bold: true }
], "Rätt text"), [{ text: "Rätt text" }]);
assert(Object.isFrozen(textFormat.FONT_FAMILIES));
assert(Object.isFrozen(textFormat.FONT_SIZES));
assert.strictEqual(textFormat.COLORS.length, 8);
assert(Object.isFrozen(textFormat.COLORS));
assert.deepStrictEqual(textFormat.applyInstructionFormat(
  [{ text: "Text" }], "Text", 0, 4,
  { textColor: "#C50F1F", backgroundColor: "#FFF100" }
), [{ text: "Text", textColor: "#C50F1F", backgroundColor: "#FFF100" }]);
assert.deepStrictEqual(textFormat.normalizeInstructionRuns([
  { text: "Text", textColor: "#123456", backgroundColor: "transparent" }
], "Text"), [{ text: "Text" }]);

console.log("Text formatting behaviour tests passed.");
