const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createEntraValidator } = require("../services/licensing/entra-validator.js");
const { validConsultantRegistration, clientAddress } = require("../services/licensing/server.js");
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
  // A signing key Microsoft added after the keys were cached is fetched at once; a made-up
  // key id does not make every request fetch the keys again.
  const rotated = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rotatedJwk = { ...rotated.publicKey.export({ format: "jwk" }), kid: "rotated-key", kty: "RSA" };
  let published = [jwk];
  let keyFetches = 0;
  let clock = Date.parse("2026-09-17T12:00:00Z");
  const rotating = createEntraValidator({ audience, now: () => clock,
    fetcher: async url => url.includes("openid-configuration")
      ? { json: async () => ({ jwks_uri: "https://keys.example/jwks" }) }
      : (keyFetches += 1, { ok: true, json: async () => ({ keys: published }) }) });
  await rotating(`Bearer ${token()}`);
  assert.equal(keyFetches, 1);
  published = [jwk, rotatedJwk];
  const signedWith = (pairToUse, kid) => {
    const header = encode({ alg: "RS256", kid });
    const payload = encode({ aud: audience, tid, oid, scp: "License.Check",
      iss: `https://login.microsoftonline.com/${tid}/v2.0`, exp: 2000000000 });
    return `${header}.${payload}.${crypto.sign("RSA-SHA256", Buffer.from(`${header}.${payload}`),
      pairToUse.privateKey).toString("base64url")}`;
  };
  assert.equal((await rotating(`Bearer ${signedWith(rotated, "rotated-key")}`)).oid, oid);
  assert.equal(keyFetches, 2, "the new key was fetched once");
  await assert.rejects(rotating(`Bearer ${signedWith(rotated, "made-up")}`), /unauthorized/);
  await assert.rejects(rotating(`Bearer ${signedWith(rotated, "made-up")}`), /unauthorized/);
  assert.equal(keyFetches, 2, "unknown key ids do not fetch the keys on every request");
  clock += 5 * 60000;
  await assert.rejects(rotating(`Bearer ${signedWith(rotated, "made-up")}`), /unauthorized/);
  assert.equal(keyFetches, 3, "fetched again after the retry interval");

  // The caller's address behind Azure App Service is the entry its front end appended.
  const request = (forwarded, socket = "169.254.129.1") => ({ headers: forwarded === undefined ? {}
    : { "x-forwarded-for": forwarded }, socket: { remoteAddress: socket } });
  assert.equal(clientAddress(request("203.0.113.9:51234"), true), "203.0.113.9");
  assert.equal(clientAddress(request("198.51.100.1, 203.0.113.9:51234"), true), "203.0.113.9",
    "an address the caller put in front is not used");
  assert.equal(clientAddress(request("[2001:db8::1]:443"), true), "2001:db8::1");
  assert.equal(clientAddress(request("2001:db8::1"), true), "2001:db8::1");
  assert.equal(clientAddress(request(undefined), true), "169.254.129.1");
  assert.equal(clientAddress(request("203.0.113.9:51234"), false), "169.254.129.1",
    "the header is ignored when the service is not behind the platform");
  console.log("Consultant Entra token validation tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
