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
assert(/globalThis\.T9PrivacyMask\s*\.maskFieldValues\(sourceEvent, settings\)/u.test(background));

// Both the new and the previous field value are masked, without mutating input.
const fieldEvent = { fieldName: "Lösenord", value: "nytt", previousValue: "gammalt" };
const maskedEvent = privacy.maskFieldValues(fieldEvent, settings);
assert.deepStrictEqual(maskedEvent, { fieldName: "Lösenord", value: "[maskerat]",
  previousValue: "[maskerat]" });
assert.strictEqual(fieldEvent.previousValue, "gammalt");
assert(!("previousValue" in privacy.maskFieldValues({ fieldName: "Antal", value: "5" }, settings)),
  "absent values are not introduced");
assert.strictEqual(privacy.maskFieldValues(null, settings), null);
assert(!background.includes('return "[antal]"'));
assert(background.includes("item.source?.eventId === sourceEventId"),
  "only exact source-message redelivery may be deduplicated");
assert(!background.includes("previous?.signature"),
  "semantic similarity must not remove raw evidence");

console.log("Recorder privacy masking behaviour tests passed.");
