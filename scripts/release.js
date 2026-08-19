const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const metadata = require("./release-metadata");
const edgeDistribution = require("./edge-distribution");
const packageValidation = require("./edge-package-validation");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const manifest = JSON.parse(
  fs.readFileSync(path.join(dist, "manifest.json"), "utf8")
);
const version = manifest.version;
const channel = metadata.releaseChannel(process.env.RELEASE_CHANNEL || "beta");
const pilot = process.argv.includes("--pilot");
const releaseRoot = path.join(root, "release");
const releaseDir = pilot
  ? path.join(releaseRoot, version)
  : releaseRoot;
const edgeDir = pilot ? path.join(releaseDir, "edge") : releaseDir;
const metadataDir = pilot ? path.join(releaseDir, "metadata") : releaseDir;
const zipName = pilot
  ? `thinknine-bc-process-intelligence-${version}.zip`
  : `extension-edge-${version}.zip`;
const zipPath = path.join(edgeDir, zipName);
const requireEnterprise = process.argv.includes("--require-enterprise-config");
const extensionIdArgument = process.argv.find(value =>
  value.startsWith("--extension-id="));
const extensionId = process.env.EDGE_EXTENSION_ID ||
  extensionIdArgument?.slice("--extension-id=".length);
const updateUrlArgument = process.argv.find(value =>
  value.startsWith("--update-url="));
const updateUrl = process.env.EDGE_UPDATE_URL ||
  updateUrlArgument?.slice("--update-url=".length);
const gitCommit = process.argv.find(value => value.startsWith("--git-commit="))
  ?.slice("--git-commit=".length);

if (pilot && !/^[0-9a-f]{40}$/u.test(gitCommit || "")) {
  throw new Error("Pilot packaging requires a full Git commit SHA");
}

if (requireEnterprise && !extensionId) {
  throw new Error(
    "EDGE_EXTENSION_ID is required for an enterprise pilot package"
  );
}
if (extensionId) {
  edgeDistribution.normalizeExtensionId(extensionId);
  edgeDistribution.normalizeUpdateUrl(updateUrl);
}

packageValidation.validatePackageDirectory(dist);

fs.mkdirSync(edgeDir, { recursive: true });
fs.mkdirSync(metadataDir, { recursive: true });
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

packageValidation.validateZip(zipPath);

const artifacts = [{
  component: "browser-extension",
  browser: "edge",
  file: pilot ? `edge/${zipName}` : zipName,
  mediaType: "application/zip",
  sha256: metadata.sha256(zipPath)
}];

if (extensionId) {
  const policyName = `edge-enterprise-policy-${channel}.json`;
  const deploymentName = `edge-deployment-${channel}.json`;
  const policyPath = path.join(metadataDir, policyName);
  const deploymentPath = path.join(metadataDir, deploymentName);
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
    file: pilot ? `metadata/${policyName}` : policyName,
    mediaType: "application/json",
    sha256: metadata.sha256(policyPath) });
  artifacts.push({ component: "edge-deployment-metadata", browser: "edge",
    file: pilot ? `metadata/${deploymentName}` : deploymentName,
    mediaType: "application/json",
    sha256: metadata.sha256(deploymentPath) });
}

const releaseManifest = metadata.createReleaseManifest({
  version,
  channel,
  gitCommit,
  sourceClean: !process.argv.includes("--source-dirty"),
  minimumCompatibleVersion:
    process.env.MINIMUM_COMPATIBLE_VERSION || version,
  artifacts
});
fs.writeFileSync(path.join(metadataDir, "release-manifest.json"),
  JSON.stringify(releaseManifest, null, 2) + "\n", "utf8");

if (pilot) {
  const sums = `${artifacts[0].sha256}  ${zipName}\n`;
  fs.writeFileSync(path.join(edgeDir, "SHA256SUMS"), sums, "utf8");
  fs.writeFileSync(path.join(metadataDir, "release-notes.md"),
    `# Pilot ${version}\n\nSee CHANGELOG.md for reviewed release notes.\n`, "utf8");
}

console.log(`Release package created: ${zipPath}`);
console.log(`Release channel: ${channel}`);
