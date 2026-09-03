const assert = require("assert");
const viewport = require("../src/ui/process-map-viewport");
assert.strictEqual(viewport.normalize(53), 60);
assert.strictEqual(viewport.normalize(164), 160);
assert.strictEqual(viewport.normalize(117), 120);
assert.strictEqual(viewport.normalize(null), 100);
assert.strictEqual(viewport.fitZoom(1200, 900, 100), 70,
  "fit rounds down so the map never overflows the available width");
assert.strictEqual(viewport.fitZoom(900, 900, 100), 100);
assert.strictEqual(viewport.fitZoom(0, 900, 100), 100);
assert.strictEqual(viewport.measureFit({ querySelector(selector) {
  return selector === ".process-diagram-scroll" ? { clientWidth: 800 } : {
    getBoundingClientRect() { return { width: 1000 }; }
  };
} }, 100), 80);
console.log("Process map viewport tests passed.");
