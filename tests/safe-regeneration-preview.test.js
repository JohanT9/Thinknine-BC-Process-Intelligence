const assert = require("assert");
const fs = require("fs");

const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
const css = fs.readFileSync("src/ui/design-system.css", "utf8");

assert.ok(html.includes('id="regenerationPreviewDialog"'));
assert.ok(html.includes('id="regenerationPreviewChanges"'));
assert.ok(html.includes('id="applyRegenerationPreview"'));
assert.ok(html.includes("Godk&auml;nn och regenerera"));
assert.ok(dashboard.includes("function showRegenerationPreview(preview)"));
assert.ok(dashboard.includes("if (!await showRegenerationPreview(preview))"));
assert.ok(!dashboard.includes("if (!confirm(`Regenerera dokumentationen"),
  "regeneration must use the inspectable preview instead of browser confirm");
assert.ok(dashboard.includes('$("applyRegenerationPreview").hidden = preview.blocked'));
assert.ok(dashboard.includes("escapeHtml(item)"),
  "step descriptions must be escaped before preview rendering");
assert.ok(css.includes(".regeneration-preview-dialog"));
assert.ok(css.includes(".regeneration-preview-warning"));

console.log("Safe regeneration preview tests passed.");
