// Publisher configuration, not an end-user setting.
// Enable only after deploying the service, adding its exact host permission,
// and publishing the installation registration disclosure/privacy policy.
globalThis.T9TenantLicenseConfig = Object.freeze({
  enabled: true,
  endpoint: "https://thinknine-bc-license-gparapcbbzgkgfha.swedencentral-01.azurewebsites.net/v1/license/check",
  trialEndpoint: "https://thinknine-bc-license-gparapcbbzgkgfha.swedencentral-01.azurewebsites.net/v1/license/trial",
  consultant: Object.freeze({
    enabled: true,
    clientId: "62602b18-789f-4755-9791-7f13eaf02503",
    scope: "api://fbd99c18-0d11-43d8-8dba-d445cbddb8b1/License.Check",
    endpoint: "https://thinknine-bc-license-gparapcbbzgkgfha.swedencentral-01.azurewebsites.net/v1/license/consultant/check"
  })
});
