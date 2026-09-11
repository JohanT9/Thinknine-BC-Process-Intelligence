const assert = require("assert");
const email = require("../src/bug-report/email-draft");

const draft = email.build({ packageId: "issue-package:test:123",
  title: "Fel vid ”Registrera vikt”" }, JSON.stringify({ report: true }), {
  to: "support@example.com", locale: "sv-SE"
});
assert.strictEqual(draft.to, "support@example.com");
assert(draft.fileName.endsWith(".eml"));
assert(draft.content.includes("To: support@example.com"));
assert(draft.content.includes("Content-Type: multipart/mixed"));
assert(draft.content.includes("Content-Disposition: attachment"));
assert(draft.content.includes("application/json"));
assert(!draft.content.includes("\nBcc:"), "header injection must be removed");
assert.throws(() => email.build({ title: "Fel" }, "{}", {
  to: "invalid address" }), /giltig supportadress/u);
assert.strictEqual(email.validAddress("support@example.com\r\nBcc:evil@example.com"), "");
console.log("Bug report email draft tests passed.");
