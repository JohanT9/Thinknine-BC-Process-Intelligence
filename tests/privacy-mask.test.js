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
// Recordings mask with the settings at capture; a bug report recording masks secrets only and
// chooses masking in the report (see bug-report-value-masking.test.js).
assert(/globalThis\.T9PrivacyMask\s*\.maskFieldValues\(sourceEvent, session\.recordingPurpose === "bug-report" &&\s+settings\.maskValues !== false \? \{ \.\.\.settings, maskValues: "secrets" \} : settings\)/u.test(background));

// Both the new and the previous field value are masked, without mutating input.
const fieldEvent = { fieldName: "Lösenord", value: "nytt", previousValue: "gammalt" };
const maskedEvent = privacy.maskFieldValues(fieldEvent, settings);
assert.deepStrictEqual(maskedEvent, { fieldName: "Lösenord", value: "[maskerat]",
  previousValue: "[maskerat]" });
assert.strictEqual(fieldEvent.previousValue, "gammalt");
// The typed text kept beside a validated value is masked the same way.
assert.deepStrictEqual(privacy.maskFieldValues({ fieldName: "Unit Price", value: "1,200.00",
  enteredValue: "1200" }, settings), { fieldName: "Unit Price", value: "[belopp]",
  enteredValue: "[belopp]" });
assert(!("previousValue" in privacy.maskFieldValues({ fieldName: "Antal", value: "5" }, settings)),
  "absent values are not introduced");
assert.strictEqual(privacy.maskFieldValues(null, settings), null);

// What the user typed is kept beside the masked value for the Page Scripting test, whatever it
// is; secrets never, and values the client showed or that masking left alone are not repeated.
const keep = event => privacy.keepTypedValue(event, privacy.maskFieldValues(event, settings));
const typedAmount = keep({ type: "field-change", inputSource: "change", fieldName: "Direct Unit Cost", value: "120" });
assert.deepStrictEqual([typedAmount.value, typedAmount.typedValue], ["[belopp]", "120"]);
const typedEntered = keep({ type: "field-change", inputSource: "input", fieldName: "Unit Price",
  value: "1,200.00", enteredValue: "1200" });
assert.deepStrictEqual([typedEntered.value, typedEntered.enteredValue, typedEntered.typedValue], ["[belopp]", "[belopp]", "1200"]);
assert.strictEqual(keep({ type: "field-change", inputSource: "change", fieldName: "E-post", value: "a@b.se" }).typedValue, "a@b.se",
  "every typed value, not only amounts");
for (const event of [
  { type: "field-change", inputSource: "change", fieldName: "Password", value: "hemligt" },
  { type: "field-change", inputSource: "change", fieldName: "API key", value: "abc" },
  { type: "field-change", inputSource: "validated", fieldName: "Amount", value: "120" },
  { type: "field-change", inputSource: "focusout", fieldName: "Amount", value: "120" },
  { type: "field-change", inputSource: "change", fieldName: "Amount", value: "" },
  { type: "field-change", inputSource: "change", fieldName: "Antal", value: "5" },
  { type: "click", inputSource: "change", fieldName: "Amount", value: "120" }
]) assert(!("typedValue" in keep(event)), `no typed value kept for ${JSON.stringify(event)}`);
assert(background.includes("T9PrivacyMask.keepTypedValue(sourceEvent"), "typed values are kept where events are stored");
assert(!background.includes('return "[antal]"'));
assert(background.includes("item.source?.eventId === sourceEventId"),
  "only exact source-message redelivery may be deduplicated");
assert(!background.includes("previous?.signature"),
  "semantic similarity must not remove raw evidence");

console.log("Recorder privacy masking behaviour tests passed.");
