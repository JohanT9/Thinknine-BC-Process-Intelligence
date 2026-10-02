const assert = require("node:assert/strict");
const { create } = require("../src/engine/consultant-license.js");

async function main() {
  const installationId = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
  const tenantId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  let data = { t9ConsultantLicenseV1: { accessToken: "signed-token",
    refreshToken: "refresh-token", expiresAt: Date.now() + 3600000,
    profile: { tenantId, objectId: installationId, name: "Test User" } } };
  let responseStatus = 200;
  let failFetchUrl = "";
  let request;
  const diagnostics = [];
  const client = create({ storage: {
    get: async () => data,
    set: async value => { data = { ...data, ...value }; },
    remove: async key => { delete data[key]; }
  }, fetcher: async (url, options) => {
    request = { url, options };
    if (url === failFetchUrl) throw new TypeError("Failed to fetch");
    return { ok: responseStatus === 200, status: responseStatus,
      json: async () => responseStatus === 200
        ? { tenantId, allowed: true, licenseType: "trial", licenseStatus: "active",
          expiresAt: "2026-10-30T12:00:00.000Z" }
        : { error: "trial-already-used" } };
  }, identity: {}, logger: { warn: (message, details) => diagnostics.push({ message, details }) },
  config: { trialEndpoint: "https://license.example/v1/license/trial",
    consultant: { enabled: true, clientId: "client-id", scope: "api://service/License.Check",
      endpoint: "https://license.example/v1/license/consultant/check" } }, version: "4.7.29" });

  const result = await client.requestTenantTrial(tenantId, installationId);
  assert.equal(request.url, "https://license.example/v1/license/trial");
  assert.equal(request.options.headers.Authorization, "Bearer signed-token");
  assert.deepEqual(JSON.parse(request.options.body), { installationId, tenantId, version: "4.7.29" });
  assert.equal(result.licenseType, "trial");
  responseStatus = 409;
  await assert.rejects(client.requestTenantTrial(tenantId, installationId), error => error.status === 409);
  responseStatus = 200;
  failFetchUrl = "https://license.example/v1/license/trial";
  await assert.rejects(client.requestTenantTrial(tenantId, installationId),
    error => error.code === "trial-service-unreachable");
  assert.equal(diagnostics.at(-1).message,
    "BC Process Studio: tenant trial request failed before an HTTP response.");
  assert.deepEqual(diagnostics.at(-1).details, { name: "TypeError", message: "Failed to fetch" });
  assert.ok(!JSON.stringify(diagnostics.at(-1)).includes("signed-token"),
    "network diagnostics never contain the Entra access token");
  failFetchUrl = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token";
  data.t9ConsultantLicenseV1.expiresAt = Date.now() - 1000;
  await assert.rejects(client.requestTenantTrial(tenantId, installationId),
    error => error.code === "entra-reauth-required");
  console.log("Entra-authenticated tenant trial request tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
