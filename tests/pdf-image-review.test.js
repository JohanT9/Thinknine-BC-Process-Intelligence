const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/ui/technical-report.js", "utf8");
const html = fs.readFileSync("src/ui/technical-report.html", "utf8");
assert.doesNotMatch(source, /reviewPdfImages|confirmPdfImages|cancelPdfImages/);
assert.doesNotMatch(html, /pdfImagePreview|pdfImageChoices/);
assert.equal(source.match(/const selectedImages = issuePreviewState.offlineAttachments;/g).length, 2);
console.log("PDF and email exports use report selections without an extra image dialog.");
