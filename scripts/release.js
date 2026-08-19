const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const metadata = require("./release-metadata");
const edgeDistribution = require("./edge-distribution");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const releaseDir = path.join(root, "release");
const manifest = JSON.parse(
  fs.readFileSync(path.join(dist, "manifest.json"), "utf8")
);
const version = manifest.version;
const channel = metadata.releaseChannel(process.env.RELEASE_CHANNEL || "beta");
const zipName = `extension-edge-${version}.zip`;
const zipPath = path.join(releaseDir, zipName);
const requireEnterprise = process.argv.includes("--require-enterprise-config");
const extensionIdArgument = process.argv.find(value =>
  value.startsWith("--extension-id="));
const extensionId = process.env.EDGE_EXTENSION_ID ||
  extensionIdArgument?.slice("--extension-id=".length);
const updateUrlArgument = process.argv.find(value =>
  value.startsWith("--update-url="));
const updateUrl = process.env.EDGE_UPDATE_URL ||
  updateUrlArgument?.slice("--update-url=".length);

if (requireEnterprise && !extensionId) {
  throw new Error(
    "EDGE_EXTENSION_ID is required for an enterprise pilot package"
  );
}
if (extensionId) {
  edgeDistribution.normalizeExtensionId(extensionId);
  edgeDistribution.normalizeUpdateUrl(updateUrl);
}

fs.mkdirSync(releaseDir, { recursive: true });
if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

if (process.platform === "win32") {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path "${dist}\\*" -DestinationPath "${zipPath}" -Force`
    ],
    { stdio: "inherit" }
  );
} else {
  execFileSync("zip", ["-r", zipPath, "."], {
    cwd: dist,
    stdio: "inherit"
  });
}

const artifacts = [{
  component: "browser-extension",
  browser: "edge",
  file: zipName,
  mediaType: "application/zip",
  sha256: metadata.sha256(zipPath)
}];

if (extensionId) {
  const policyName = `edge-enterprise-policy-${channel}.json`;
  const deploymentName = `edge-deployment-${channel}.json`;
  const policyPath = path.join(releaseDir, policyName);
  const deploymentPath = path.join(releaseDir, deploymentName);
  const distributionOptions = {
    extensionId,
    updateUrl,
    version,
    channel,
    policyFile: policyName
  };
  fs.writeFileSync(policyPath, JSON.stringify(
    edgeDistribution.createEnterprisePolicy(distributionOptions), null, 2
  ) + "\n", "utf8");
  fs.writeFileSync(deploymentPath, JSON.stringify(
    edgeDistribution.createDeploymentManifest(distributionOptions), null, 2
  ) + "\n", "utf8");
  artifacts.push({ component: "edge-enterprise-policy", browser: "edge",
    file: policyName, mediaType: "application/json",
    sha256: metadata.sha256(policyPath) });
  artifacts.push({ component: "edge-deployment-metadata", browser: "edge",
    file: deploymentName, mediaType: "application/json",
    sha256: metadata.sha256(deploymentPath) });
}

const releaseManifest = metadata.createReleaseManifest({
  version,
  channel,
  minimumCompatibleVersion:
    process.env.MINIMUM_COMPATIBLE_VERSION || version,
  artifacts
});
fs.writeFileSync(path.join(releaseDir, "release-manifest.json"),
  JSON.stringify(releaseManifest, null, 2) + "\n", "utf8");

console.log(`Release package created: ${zipPath}`);
console.log(`Release channel: ${channel}`);
