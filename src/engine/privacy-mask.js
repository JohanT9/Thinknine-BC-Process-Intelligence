(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9PrivacyMask = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function mask(fieldName, value, settings = {}) {
    if (settings.maskValues === false) return value;
    const name = String(fieldName || "").toLowerCase();
    const text = String(value ?? "");
    if (/password|lösenord|secret|token|api.?key/u.test(name)) return "[maskerat]";
    if (/email|e-post/u.test(name)) return "[e-postadress]";
    if (/customer|kund/u.test(name) && settings.maskCustomerNo === true) {
      return "[aktuell kund]";
    }
    if (/vendor|leverantör/u.test(name) && settings.maskVendorNo === true) {
      return "[aktuell leverantör]";
    }
    if (/item|artikel/u.test(name) && settings.maskItemNo === true) {
      return "[aktuell artikel]";
    }
    if (/price|cost|amount|pris|kostnad|belopp/u.test(name)) return "[belopp]";
    return text
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
        "[e-postadress]")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu,
        "[id]");
  }
  return { mask };
});
