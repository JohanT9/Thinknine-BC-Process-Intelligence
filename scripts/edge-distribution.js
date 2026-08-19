const EDGE_STORE_UPDATE_URL =
  "https://edge.microsoft.com/extensionwebstorebase/v1/crx";

function normalizeExtensionId(value) {
  const extensionId = String(value || "").trim().toLowerCase();
  if (!/^[a-p]{32}$/u.test(extensionId)) {
    throw new Error(
      "EDGE_EXTENSION_ID must be the 32-character Edge listing ID"
    );
  }
  return extensionId;
}

function normalizeUpdateUrl(value = EDGE_STORE_UPDATE_URL) {
  const updateUrl = String(value || "").trim();
  let parsed;
  try {
    parsed = new URL(updateUrl);
  } catch {
    throw new Error("EDGE_UPDATE_URL must be a valid HTTPS URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("EDGE_UPDATE_URL must use HTTPS");
  }
  return updateUrl;
}

function createEnterprisePolicy(options = {}) {
  const extensionId = normalizeExtensionId(options.extensionId);
  const updateUrl = normalizeUpdateUrl(options.updateUrl);
  return {
    ExtensionSettings: {
      [extensionId]: {
        installation_mode: "force_installed",
        update_url: updateUrl
      }
    }
  };
}

function createDeploymentManifest(options = {}) {
  const extensionId = normalizeExtensionId(options.extensionId);
  const updateUrl = normalizeUpdateUrl(options.updateUrl);
  return {
    schemaVersion: 1,
    product: "Thinknine BC Process Intelligence",
    component: "browser-extension",
    browser: "edge",
    version: options.version,
    channel: options.channel,
    extensionId,
    updateOwner: updateUrl === EDGE_STORE_UPDATE_URL
      ? "microsoft-edge"
      : "enterprise-administrator",
    updateUrl,
    policyFile: options.policyFile,
    preservesStorageForStableIdentity: true
  };
}

module.exports = { EDGE_STORE_UPDATE_URL, createDeploymentManifest,
  createEnterprisePolicy, normalizeExtensionId, normalizeUpdateUrl };
