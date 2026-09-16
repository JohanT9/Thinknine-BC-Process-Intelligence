// Publisher configuration, not an end-user setting.
// Enable only after deploying the service, adding its exact host permission,
// and publishing the installation registration disclosure/privacy policy.
globalThis.T9TenantLicenseConfig = Object.freeze({
  enabled: true,
  endpoint: "https://thinknine-bc-license-gparapcbbzgkgfha.swedencentral-01.azurewebsites.net/v1/license/check",
  trialEndpoint: "https://thinknine-bc-license-gparapcbbzgkgfha.swedencentral-01.azurewebsites.net/v1/license/trial"
});
