const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/ui/technical-report.js", "utf8");
const html = fs.readFileSync("src/ui/technical-report.html", "utf8");
assert.doesNotMatch(source, /reviewPdfImages|confirmPdfImages|cancelPdfImages/);
assert.doesNotMatch(html, /pdfImagePreview|pdfImageChoices/);
assert.match(source, /async function loadIssuePackageAttachments\(\) \{\s*const attachments = issuePreviewState\?\.issuePackage\?\.attachments \|\| \[\];/u,
  "exports load exactly the attachments selected in the report package");
assert.ok((source.match(/await loadIssuePackageAttachments\(\);/g) || []).length >= 3,
  "PDF, email and offline package share the report selection");
console.log("PDF and email exports use report selections without an extra image dialog.");
