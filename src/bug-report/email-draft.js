(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportEmailDraft = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const cleanHeader = value => String(value || "").replace(/[\r\n]+/gu, " ").trim();
  const safeName = value => cleanHeader(value).replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "").slice(0, 70) || "felrapport";
  function validAddress(value) {
    const address = cleanHeader(value);
    return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(address) ? address : "";
  }
  function base64(value) {
    if (typeof Buffer !== "undefined") return Buffer.from(value, "utf8").toString("base64");
    const bytes = new TextEncoder().encode(value); let binary = "";
    for (let index = 0; index < bytes.length; index += 8192) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    }
    return btoa(binary);
  }
  const lines = value => String(value).match(/.{1,76}/gu)?.join("\r\n") || "";
  function build(issuePackage, packageContent, options = {}) {
    const to = validAddress(options.to);
    if (!to) throw new Error("En giltig supportadress måste anges i inställningarna.");
    const title = cleanHeader(issuePackage?.title || "Business Central-fel");
    const swedish = /^sv(?:-|$)/iu.test(String(options.locale || "sv-SE"));
    const severity = ["Low", "Medium", "High", "Critical"].find(value =>
      value.toLowerCase() === cleanHeader(issuePackage?.summary?.severity).toLowerCase());
    const subject = severity ? `${title} - ${swedish ? "Nivå" : "Severity"} ${severity}` : title;
    const importance = severity === "Critical" ? "high" : severity === "Low" ? "low" : "normal";
    const priority = importance === "high" ? "1" : importance === "low" ? "5" : "3";
    const attachmentName = `${safeName(title)}-felrapport.json`;
    const boundary = `=_BC_Process_Studio_${safeName(issuePackage?.packageId)}`;
    const bodyBoundary = `${boundary}_body`;
    const body = swedish
      ? "\r\n\r\nHej,\r\n\r\nBifogat finns en felrapport från BC Process Studio.\r\n\r\n"
      : "\r\n\r\nHello,\r\n\r\nA BC Process Studio error report is attached.\r\n\r\n";
    // A complete HTML body gives Outlook a formatted compose surface. Keep a
    // plain-text alternative for other clients; neither part contains a signature.
    const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>` +
      `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:11pt">` +
      `<p>${swedish ? "Hej," : "Hello,"}</p><p>${swedish
        ? "Bifogat finns en felrapport från BC Process Studio."
        : "A BC Process Studio error report is attached."}</p></div></body></html>`;
    const attachments = options.attachments || [{ fileName: attachmentName,
      mediaType: "application/json", base64: base64(String(packageContent || "")) }];
    const parts = attachments.flatMap(item => {
      if (!["application/pdf", "application/zip", "application/json"].includes(item.mediaType) ||
          !/^[A-Za-z0-9+/]*={0,2}$/u.test(item.base64)) throw new Error("Invalid email attachment.");
      const name = safeName(item.fileName);
      return [`--${boundary}`, `Content-Type: ${item.mediaType}; name="${name}"`,
        "Content-Transfer-Encoding: base64", `Content-Disposition: attachment; filename="${name}"`,
        "", lines(item.base64)];
    });
    const content = ["MIME-Version: 1.0", "X-Unsent: 1", `To: ${to}`,
      `Subject: =?UTF-8?B?${base64(subject)}?=`,
      `Importance: ${importance}`, `X-Priority: ${priority}`, `X-MSMail-Priority: ${importance[0].toUpperCase()}${importance.slice(1)}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`, "",
      `--${boundary}`, `Content-Type: multipart/alternative; boundary="${bodyBoundary}"`, "",
      `--${bodyBoundary}`, "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64", "", lines(base64(body)),
      `--${bodyBoundary}`, "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64", "", lines(base64(htmlBody)),
      `--${bodyBoundary}--`,
      ...parts, `--${boundary}--`, ""].join("\r\n");
    return { to, subject, attachmentName,
      fileName: `${safeName(title)}.eml`, content };
  }
  return { build, validAddress };
});
