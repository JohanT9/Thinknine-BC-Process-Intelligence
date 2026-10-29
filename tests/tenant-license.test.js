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
  let expiry = 86400000;
  let hold = null;
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
      if (hold) await hold;
      if (offline) throw new Error("offline");
      return { ok: true, json: async () => ({ allowed, tenantId: tenant,
        trialAvailable: !allowed,
        licenseStatus: allowed ? "active" : "unregistered",
        licenseType: allowed ? "standard" : null,
        expiresAt: new Date(time + expiry).toISOString() }) };
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
  // Once the hourly refresh is due, a recently confirmed license is used at once and checked
  // again in the background; an unreachable service keeps the last confirmed result.
  assert.equal((await client.requireLicense(url)).stale, true);
  await client.refreshed();
  assert.equal(calls, 3);
  assert.equal((await client.check(url)).stale, true);
  await client.refreshed();
  // A forced check still asks the service; network failures surface as a translatable key
  // with a diagnostic code.
  await assert.rejects(client.check(url, { force: true }), error =>
    error.message === "license.serviceUnavailable" &&
    error.code === "license-service-unreachable");
  // What the background check learns applies to the next recording: a blocked license may
  // start this one but stops the next.
  offline = false;
  allowed = false;
  assert.equal((await client.requireLicense(url)).allowed, true);
  await client.refreshed();
  const blocked = await client.check(url);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.trialAvailable, true);
  await assert.rejects(client.requireLicense(url), /saknar en aktiv/);
  allowed = true;
  assert.equal((await client.requestTrial(url)).allowed, true);
  assert.equal((await client.summaries())[0].licenseType, "trial");
  // Starting a recording does not wait for a check the popup has already begun.
  expiry = 30 * 86400000;
  await client.check(url, { force: true });
  time += 3600001;
  let release;
  hold = new Promise(resolve => { release = resolve; });
  const forced = client.check(url, { force: true });
  assert.equal((await client.check(url)).stale, true);
  release();
  hold = null;
  await forced;
  await client.refreshed();
  // A license last confirmed more than a week ago is not used without the service.
  time += license.STALE_LIMIT_MS + 1;
  offline = true;
  await assert.rejects(client.requireLicense(url), /license.serviceUnavailable/);
  offline = false;
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

// An idle license service needed 20 seconds to answer its first check; the check and every
// view that waits for it must allow for that, and say what is happening meanwhile.
{
  const fs = require("node:fs");
  assert.ok(license.CHECK_TIMEOUT_MS >= 25000);
  for (const view of ["../src/ui/popup.js", "../src/ui/license-status.js"]) {
    const source = fs.readFileSync(require.resolve(view), "utf8");
    const checks = source.match(/type: "T9_LICENSE_CHECK"[^;]*;/g) || [];
    assert.ok(checks.length > 0, view);
    for (const check of checks) assert.match(check, /LICENSE_CHECK_TIMEOUT_MS/, `${view}: ${check}`);
  }
  for (const { locale } of globalThis.T9LanguageRegistry.supported("ui")) {
    const value = globalThis.T9UiI18n.translate("license.cardChecking", locale);
    assert.ok(value && value !== "license.cardChecking", locale);
  }
}
