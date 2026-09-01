const assert = require("assert");
const fs = require("fs");
const tooltips = require("../src/ui/tooltips");

function target(attributes = {}, textContent = "", heading = "") {
  return {
    textContent,
    getAttribute(name) { return attributes[name] || null; },
    querySelector(selector) {
      return selector === "strong" && heading
        ? { textContent: heading } : null;
    }
  };
}

assert.strictEqual(tooltips.tooltipText(target({
  "data-tooltip": "Explicit help", "aria-label": "Label"
})), "Explicit help");
assert.strictEqual(tooltips.tooltipText(target({
  "aria-label": "Accessible action"
})), "Accessible action");
assert.strictEqual(tooltips.tooltipText(target({}, "Long help", "Start recording")),
  "Start recording", "mode cards should use their concise heading");
assert.strictEqual(tooltips.tooltipText(target({}, "  Save   document  ")),
  "Save document");

for (const file of ["dashboard.html", "popup.html", "debug.html",
  "technical-report.html"]) {
  const html = fs.readFileSync(`src/ui/${file}`, "utf8");
  assert(html.includes('<script src="tooltips.js"></script>'),
    `${file} must load shared tooltips`);
}
const css = fs.readFileSync("src/ui/design-system.css", "utf8");
assert(css.includes(".t9-tooltip{position:fixed"));
assert(css.includes("pointer-events:none"));
const build = fs.readFileSync("scripts/build.js", "utf8");
assert(build.includes('"tooltips.js"'));
console.log("Shared tooltip behavior tests passed.");
