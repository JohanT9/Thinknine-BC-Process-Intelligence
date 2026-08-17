const assert = require("assert");
const presentation = require("../src/engine/search-interaction-presentation");

assert.strictEqual(presentation.visibleResultCaption("FÃ¶rs.order Listor"),
  "FÃ¶rs.order");
assert.strictEqual(presentation.visibleResultCaption("Sales Orders Lists"),
  "Sales Orders");
assert.strictEqual(presentation.visibleResultCaption("Artikelregister"),
  "Artikelregister");

const events = [
  { eventNo: 6, type: "field-change", category: "input" },
  { eventNo: 8, type: "click", category: "selection" },
  { eventNo: 9, type: "navigation", category: "navigation" }
];
assert.strictEqual(presentation.screenshotForResult(events, {
  6: "loading.png", 8: "fors-order-visible.png", 9: "destination.png"
}), "fors-order-visible.png");
assert.strictEqual(presentation.screenshotForResult(events, {
  6: "search-results.png", 9: "destination.png"
}), "search-results.png");

console.log("Search interaction presentation tests passed.");
