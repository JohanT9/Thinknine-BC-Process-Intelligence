const assert = require("assert");
const theme = require("../src/document/process-map-theme");
const labels = require("../src/document/process-map-labels");

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
assert.strictEqual(labels.nodeTitle({ title: "document:purchase-order" }, "sv-SE"),
  "Inköpsorder");
assert.strictEqual(labels.nodeTitle({ title: "document:purchase-order" }, "en-US"),
  "Purchase Order");
[
  "document:sales-quote", "document:posted-sales-shipment",
  "document:posted-purchase-receipt", "document:transfer-shipment",
  "document:production-journal", "document:assembly-order",
  "document:planning-worksheet", "document:sales-return-order",
  "document:purchase-return-order", "document:inventory-movement",
  "document:warehouse-movement", "document:item-tracking-lines",
  "document:general-journal", "document:item-journal",
  "document:item-reclassification-journal", "document:physical-inventory-journal"
].forEach(id => {
  assert(!labels.nodeTitle({ title: id }, "sv-SE").startsWith("document:"),
    `${id} must have a Swedish display label`);
  assert(!labels.nodeTitle({ title: id }, "en-US").startsWith("document:"),
    `${id} must have an English display label`);
});
assert.strictEqual(labels.nodeTitle({ title: "Ship" }, "sv-SE"), "Leverera");
assert.strictEqual(labels.nodeTitle({ title: "Register" }, "sv-SE"), "Registrera");
assert.strictEqual(labels.nodeTitle({ title: "Purchase Order" }, "sv-SE"), "Inköpsorder");
assert.strictEqual(labels.nodeTitle({ title: "Posted Transfer Shipment" }, "sv-SE"),
  "Bokförd överföringsutleverans");
assert.strictEqual(labels.nodeTitle({ title: "Purchase to Pay" }, "sv-SE"),
  "Inköp till betalning");
assert.strictEqual(labels.nodeTitle({ title: "Warehouse Outbound" }, "sv-SE"),
  "Utleverans från lager");
assert.strictEqual(labels.nodeTitle({ title: "General Journal Posting" }, "sv-SE"),
  "Bokföring av redovisningsjournal");
assert.strictEqual(labels.nodeTitle({ title: "Post Inventory Differences" }, "sv-SE"),
  "Bokför inventeringsdifferenser");
assert.strictEqual(labels.handoffTitle({ from: { id: "purchasing" },
  to: { id: "warehouse" } }, "sv-SE"), "Inköp → Lager");
console.log("Process map theme tests passed.");
