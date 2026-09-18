const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createEntraValidator } = require("../services/licensing/entra-validator.js");
const { validConsultantRegistration } = require("../services/licensing/server.js");
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
  assert.equal(validConsultantRegistration({ installationId: oid, version: "4.7.0" }), true);
  assert.equal(validConsultantRegistration({ installationId: oid, version: "4.7.0", enabled: true }), false);
  assert.equal(validConsultantRegistration({ installationId: "not-a-guid", version: "4.7.0" }), false);
  const fetcher = async url => url.includes("openid-configuration")
    ? { json: async () => ({ jwks_uri: "https://keys.example/jwks" }) }
    : { ok: true, json: async () => ({ keys: [jwk] }) };
  const validate = createEntraValidator({ audience, fetcher,
    now: () => Date.parse("2026-09-17T12:00:00Z") });
  assert.deepEqual(await validate(`Bearer ${token()}`), {
    tid, oid, name: "", preferredUsername: "" });
  assert.deepEqual(await validate(`Bearer ${token({ unique_name: "johan@example.com" })}`), {
    tid, oid, name: "", preferredUsername: "johan@example.com" });
  assert.deepEqual(await validate(`Bearer ${token({
    aud: audience.replace(/^api:\/\//, ""),
    iss: `https://sts.windows.net/${tid}/`, ver: "1.0"
  })}`), { tid, oid, name: "", preferredUsername: "" });
  await assert.rejects(validate(`Bearer ${token({ aud: "wrong" })}`), /unauthorized/);
  await assert.rejects(validate(`Bearer ${token({ exp: 1 })}`), /unauthorized/);
  const validateAdmin = createEntraValidator({ audience, requiredScope: "License.Check",
    requiredRole: "License.Administrator", fetcher,
    now: () => Date.parse("2026-09-17T12:00:00Z") });
  assert.equal((await validateAdmin(`Bearer ${token({ roles: ["License.Administrator"] })}`)).oid, oid);
  await assert.rejects(validateAdmin(`Bearer ${token({ roles: ["Other.Role"] })}`), /unauthorized/);
  await assert.rejects(validateAdmin(`Bearer ${token()}`), /unauthorized/);
  console.log("Consultant Entra token validation tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
