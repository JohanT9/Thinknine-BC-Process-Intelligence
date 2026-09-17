const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createEntraValidator } = require("../services/licensing/entra-validator.js");
const tid = "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb";
const oid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const audience = "api://bc-process-studio-license";
const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = pair.publicKey.export({ format: "jwk" });
jwk.kid = "test-key"; jwk.kty = "RSA";
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
function token(claims = {}) {
  const header = encode({ alg: "RS256", kid: jwk.kid });
  const payload = encode({ aud: audience, tid, oid, scp: "License.Check",
    iss: `https://login.microsoftonline.com/${tid}/v2.0`, exp: 2000000000, ...claims });
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), pair.privateKey)
    .toString("base64url");
  return `${header}.${payload}.${signature}`;
}
async function main() {
  const fetcher = async url => url.includes("openid-configuration")
    ? { json: async () => ({ jwks_uri: "https://keys.example/jwks" }) }
    : { ok: true, json: async () => ({ keys: [jwk] }) };
  const validate = createEntraValidator({ audience, fetcher,
    now: () => Date.parse("2026-09-17T12:00:00Z") });
  assert.deepEqual(await validate(`Bearer ${token()}`), {
    tid, oid, name: "", preferredUsername: "" });
  await assert.rejects(validate(`Bearer ${token({ aud: "wrong" })}`), /unauthorized/);
  await assert.rejects(validate(`Bearer ${token({ exp: 1 })}`), /unauthorized/);
  console.log("Consultant Entra token validation tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
