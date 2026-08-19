const assert = require("assert");
const edge = require("../scripts/edge-distribution");

const extensionId = "abcdefghijklmnopabcdefghijklmnop";
assert.strictEqual(edge.normalizeExtensionId(extensionId.toUpperCase()),
  extensionId);
assert.throws(() => edge.normalizeExtensionId("replace-me"),
  /32-character Edge listing ID/u);
assert.throws(() => edge.normalizeUpdateUrl("http://example.test/update"),
  /must use HTTPS/u);

const policy = edge.createEnterprisePolicy({ extensionId });
assert.deepStrictEqual(policy.ExtensionSettings[extensionId], {
  installation_mode: "force_installed",
  update_url: edge.EDGE_STORE_UPDATE_URL
});

const deployment = edge.createDeploymentManifest({ extensionId,
  version: "4.6.0", channel: "beta",
  policyFile: "edge-enterprise-policy-beta.json" });
assert.strictEqual(deployment.extensionId, extensionId);
assert.strictEqual(deployment.updateOwner, "microsoft-edge");
assert.strictEqual(deployment.preservesStorageForStableIdentity, true);
assert(!JSON.stringify(deployment).includes("password"));

const managedDeployment = edge.createDeploymentManifest({ extensionId,
  version: "4.6.0", channel: "beta", updateUrl: "https://updates.example.test",
  policyFile: "edge-enterprise-policy-beta.json" });
assert.strictEqual(managedDeployment.updateOwner, "enterprise-administrator");

console.log("Edge enterprise distribution tests passed.");
