const assert = require("assert");
const fs = require("fs");
const path = require("path");

const lint = fs.readFileSync(
  path.join(__dirname, "../scripts/lint.js"),
  "utf8"
);

assert.ok(
  lint.includes('const roots = ["src", "scripts", "tests"];'),
  "Lint should only inspect authored source, scripts and tests."
);

assert.ok(
  !lint.includes('"dist"'),
  "Generated dist files must not be style-linted."
);

console.log("Lint configuration tests passed.");
