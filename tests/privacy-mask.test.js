const assert = require("assert");
const privacy = require("../src/engine/privacy-mask");
const fs = require("fs");
const path = require("path");

const settings = { maskValues: true, maskCustomerNo: false,
  maskVendorNo: false, maskItemNo: false };
assert.strictEqual(privacy.mask("Kundnr", "1033", settings), "1033");
assert.strictEqual(privacy.mask("Artikelnr", "136", settings), "136");
assert.strictEqual(privacy.mask("Antal", "500", settings), "500");
assert.strictEqual(privacy.mask("Utleveransdatum", "2026-08-06", settings),
  "2026-08-06");
assert.strictEqual(privacy.mask("Kundnr", "1033",
  { ...settings, maskCustomerNo: true }), "[aktuell kund]");
assert.strictEqual(privacy.mask("Lösenord", "hemligt", settings), "[maskerat]");
assert.strictEqual(privacy.mask("E-post", "anna@example.com", settings),
  "[e-postadress]");
assert.strictEqual(privacy.mask("Belopp", "1000", settings), "[belopp]");
assert.strictEqual(privacy.mask("Antal", "500", { maskValues: false }), "500");
const background = fs.readFileSync(path.join(__dirname,
  "../src/recorder/background.js"), "utf8");
assert(background.includes('importScripts("engine/privacy-mask.js")'));
assert(background.includes("globalThis.T9PrivacyMask.mask("));
assert(!background.includes('return "[antal]"'));

console.log("Recorder privacy masking behaviour tests passed.");
