const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.html"),
  "utf8"
);
const js = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.js"),
  "utf8"
);

const htmlIds = new Set(
  [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1])
);
const referencedIds = new Set(
  [...js.matchAll(/\$\("([^"]+)"\)/g)].map(match => match[1])
);

const missing = [...referencedIds].filter(id => !htmlIds.has(id));

assert.deepStrictEqual(
  missing,
  [],
  `Dashboard JS references missing HTML IDs: ${missing.join(", ")}`
);

assert.ok(
  htmlIds.has("exportWordReview"),
  "Review Studio must contain the Word export button."
);

console.log("UI ID regression tests passed.");
