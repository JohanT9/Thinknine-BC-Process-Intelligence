const assert = require("assert");
const email = require("../src/bug-report/email-draft");

const draft = email.build({ packageId: "issue-package:test:123",
  title: "Fel vid ”Registrera vikt”" }, JSON.stringify({ report: true }), {
  to: "support@example.com", locale: "sv-SE"
});
assert.strictEqual(draft.to, "support@example.com");
for (const severity of ["", "1", "Low", "Medium", "High", "Critical"]) {
  const result = email.build({ title: "Fel vid registrering", summary: { severity } }, "{}",
    { to: "support@example.com", locale: "sv-SE" });
  const expected = severity && severity !== "1"
    ? `Fel vid registrering - Nivå ${severity}` : "Fel vid registrering";
  assert.strictEqual(result.subject, expected);
  const importance = severity === "Critical" ? "high" : severity === "Low" ? "low" : "normal";
  const priority = severity === "Critical" ? "1" : severity === "Low" ? "5" : "3";
  assert(result.content.includes(`\r\nImportance: ${importance}\r\n`));
  assert(result.content.includes(`\r\nX-Priority: ${priority}\r\n`));
  assert(result.content.includes(`\r\nX-MSMail-Priority: ${importance[0].toUpperCase()}${importance.slice(1)}\r\n`));
  const encodedSubject = result.content.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1];
  assert.strictEqual(Buffer.from(encodedSubject, "base64").toString("utf8"), expected);
}
assert(draft.fileName.endsWith(".eml"));
assert(draft.content.includes("To: support@example.com"));
assert(draft.content.includes("Content-Type: multipart/mixed"));
assert(draft.content.includes("Content-Type: multipart/alternative"));
const encodedHtml = draft.content.split("Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n")[1]
  .split("\r\n--")[0].replace(/\s/g, "");
const html = Buffer.from(encodedHtml, "base64").toString("utf8");
assert(html.includes("<p>Hej,</p><p>Bifogat finns en felrapport från BC Process Studio.</p>"));
assert(!html.includes("Mvh Johan"), "Do not hard-code a user signature");
assert(html.endsWith("</body></html>"));
assert(draft.content.includes("Content-Disposition: attachment"));
assert(draft.content.includes("application/json"));
const encodedBody = draft.content.split("Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n")[1]
  .split("\r\n--")[0].replace(/\s/g, "");
const body = Buffer.from(encodedBody, "base64").toString("utf8");
assert(body.startsWith("\r\n\r\nHej,"), "Separate an Outlook-prepended signature from greeting");
assert(body.endsWith("\r\n\r\n"), "Separate an appended signature from report text");
assert(!draft.content.includes("\nBcc:"), "header injection must be removed");
assert.throws(() => email.build({ title: "Fel" }, "{}", {
  to: "invalid address" }), /giltig supportadress/u);
assert.strictEqual(email.validAddress("support@example.com\r\nBcc:evil@example.com"), "");
console.log("Bug report email draft tests passed.");
