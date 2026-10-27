const assert = require("node:assert/strict");
const license = require("../src/engine/tenant-license.js");
const tenant = "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb";
const url = `https://businesscentral.dynamics.com/${tenant}/Sandbox?company=Private`;
async function main() {
  assert.equal(license.tenantFromUrl(url), tenant);
  for (const invalid of ["https://evil.example/" + tenant,
    "http://businesscentral.dynamics.com/" + tenant,
    "https://businesscentral.dynamics.com/not-a-tenant",
    "https://user@businesscentral.dynamics.com/" + tenant]) {
    assert.equal(license.tenantFromUrl(invalid), "");
  }
  let calls = 0;
  let data = {};
  let time = Date.parse("2026-09-15T12:00:00Z");
  let allowed = true;
  let offline = false;
  const options = {
    config: { enabled: true, endpoint: "https://license.example/check",
      trialEndpoint: "https://license.example/trial" },
    version: "4.7.0", now: () => time, uuid: () => tenant,
    authenticatedTrial: async ({ tenantId }) => ({ tenantId, allowed: true,
      expiresAt: new Date(time + 86400000).toISOString() }),
    storage: { get: async () => data, set: async value => { data = { ...data, ...value }; } },
    fetcher: async (endpoint, request) => {
      calls++;
      const body = JSON.parse(request.body);
      assert.equal(endpoint, options.config.endpoint);
      assert.deepEqual(Object.keys(body).sort(), ["installationId", "tenantId", "version"]);
      assert.ok(!request.body.includes("Private"));
      if (offline) throw new Error("offline");
      return { ok: true, json: async () => ({ allowed, tenantId: tenant,
        trialAvailable: !allowed,
        licenseStatus: allowed ? "active" : "unregistered",
        licenseType: allowed ? "standard" : null,
        expiresAt: new Date(time + 86400000).toISOString() }) };
    }
  };
  const client = license.create(options);
  await assert.rejects(client.requireLicense(url), /^Error: license.acceptBeforeRecording$/);
  assert.equal(calls, 0);
  assert.equal((await client.information()).requiresAcceptance, true);
  await client.acceptNotice();
  assert.equal((await client.information()).requiresAcceptance, false);
  await Promise.all([client.requireLicense(url), client.requireLicense(url)]);
  assert.equal(calls, 1);
  assert.equal((await client.check(url)).licenseType, "standard");
  assert.deepEqual((await client.summaries()).map(item => item.tenantId), [tenant]);
  assert.equal((await client.summaries())[0].licenseStatus, "active");
  await client.check(url, { force: true });
  assert.equal(calls, 2);
  offline = true;
  await client.requireLicense(url);
  assert.equal(calls, 2);
  time += 3600001;
  assert.equal((await client.summaries())[0].licenseStatus, "active");
  // Network failures surface as a translatable key with a diagnostic code.
  await assert.rejects(client.requireLicense(url), error =>
    error.message === "license.serviceUnavailable" &&
    error.code === "license-service-unreachable");
  offline = false;
  allowed = false;
  assert.equal((await client.check(url)).trialAvailable, true);
  allowed = true;
  assert.equal((await client.requestTrial(url)).allowed, true);
  assert.equal((await client.summaries())[0].licenseType, "trial");
  const disabled = license.create({ ...options, config: { enabled: false } });
  const before = calls;
  await disabled.requireLicense("not even a URL");
  assert.equal(calls, before);
  console.log("Tenant license tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });

// Every error key the license engine throws is translated in every UI language.
{
  const fs = require("node:fs");
  globalThis.T9LanguageRegistry = require("../src/engine/language-registry.js");
  require("../src/ui/i18n.js");
  const source = fs.readFileSync(require.resolve("../src/engine/tenant-license.js"), "utf8");
  const keys = [...new Set(source.match(/"license\.[A-Za-z]+"/g).map(key => JSON.parse(key)))];
  assert.ok(keys.length >= 9);
  for (const { locale } of globalThis.T9LanguageRegistry.supported("ui")) {
    for (const key of keys) {
      const value = globalThis.T9UiI18n.translate(key, locale);
      assert.ok(value && value !== key, `${key} is translated for ${locale}`);
    }
  }
}
