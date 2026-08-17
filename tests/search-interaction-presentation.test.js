const assert = require("assert");
const presentation = require("../src/engine/search-interaction-presentation");

assert.strictEqual(presentation.visibleResultCaption("FÃ¶rs.order Listor"),
  "FÃ¶rs.order");
assert.strictEqual(presentation.visibleResultCaption("FÃ¶rs.order Listor îœ"),
  "FÃ¶rs.order");
assert.strictEqual(presentation.visibleResultCaption("Sales Orders Lists"),
  "Sales Orders");
assert.strictEqual(presentation.visibleResultCaption("Artikelregister"),
  "Artikelregister");
assert.strictEqual(presentation.instruction({ searchCaption: "Sök",
  searchFieldCaption: "Berätta vad du vill göra.", value: "för ord",
  resultCaption: "Förs.order Listor " }),
  "Välj **Sök**, ange __för ord__ i **Berätta vad du vill göra.** och " +
    "välj **Förs.order**.");

const events = [
  { eventNo: 6, type: "field-change", category: "input" },
  { eventNo: 9, type: "click", category: "selection" },
  { eventNo: 10, type: "navigation", category: "navigation" }
];
assert.strictEqual(presentation.screenshotForResult(events, {
  6: "loading.png", 8: "fors-order-visible.png", 10: "destination.png"
}), "fors-order-visible.png");
assert.strictEqual(presentation.screenshotForResult(events, {
  6: "search-results.png", 10: "destination.png"
}), "search-results.png");

console.log("Search interaction presentation tests passed.");
