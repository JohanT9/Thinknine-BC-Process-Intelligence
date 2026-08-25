const assert = require("assert");
const context = require("../src/engine/business-central-url-context.js");

const parsed = context.parseBusinessCentralUrl(
  "https://businesscentral.dynamics.com/38fb1f75-67ae-4691-9700-bc708b7b7fdb/" +
  "Feldts_SE_Sandbox?company=Feldts%20Fisk%20%26%20Skaldjur%20AB&dc=0"
);
assert.deepStrictEqual(parsed, {
  environmentName: "Feldts_SE_Sandbox",
  companyName: "Feldts Fisk & Skaldjur AB"
});
assert.strictEqual(context.displayName(parsed),
  "Feldts_SE_Sandbox — Feldts Fisk & Skaldjur AB");

assert.deepStrictEqual(context.parseBusinessCentralUrl(
  "https://businesscentral.dynamics.com/tenant/Sandbox?page=42"
), { environmentName: "Sandbox" });
assert.strictEqual(context.displayName({}, "Manuellt namn"), "Manuellt namn");
assert.deepStrictEqual(context.parseBusinessCentralUrl("not a url"), {});
assert.deepStrictEqual(context.parseBusinessCentralUrl(
  "https://example.com/tenant/Production?company=Secret"
), {});

console.log("Business Central URL context tests passed.");
