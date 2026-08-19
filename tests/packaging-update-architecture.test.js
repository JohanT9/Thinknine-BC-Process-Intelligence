const assert = require("assert");
const fs = require("fs");
const metadata = require("../scripts/release-metadata");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const sourceManifest = JSON.parse(fs.readFileSync(
  "src/ui/manifest.json", "utf8"));
assert.strictEqual(sourceManifest.version, packageJson.version,
  "package.json and the checked-in manifest must not drift");
assert.deepStrictEqual(metadata.CHANNELS, ["stable", "beta", "development"]);
assert.throws(() => metadata.releaseChannel("nightly"),
  /Unsupported release channel/u);

const release = metadata.createReleaseManifest({
  version: packageJson.version,
  channel: "beta",
  publishedAt: "2026-08-19T00:00:00.000Z",
  artifacts: [{ component: "browser-extension", browser: "edge",
    file: `extension-edge-${packageJson.version}.zip`,
    mediaType: "application/zip", sha256: "a".repeat(64) }]
});
assert.strictEqual(release.manifestVersion, 1);
assert.strictEqual(release.version, packageJson.version);
assert.strictEqual(release.channel, "beta");
assert.strictEqual(release.minimumCompatibleVersion, packageJson.version);
assert.strictEqual(release.artifacts[0].component, "browser-extension");
assert(!JSON.stringify(release).includes("certificate"));

const releaseScript = fs.readFileSync("scripts/release.js", "utf8");
assert(releaseScript.includes("release-manifest.json"));
assert(releaseScript.includes("metadata.sha256(zipPath)"));
const architecture = fs.readFileSync(
  "docs/PACKAGING_AND_UPDATE_ARCHITECTURE.md", "utf8");
for (const statement of ["Edge Add-ons", "chrome.storage.local", "MSIX",
  "Stable", "Beta", "Development", "Chrome Web Store",
  "No Windows installer is required"]) {
  assert(architecture.includes(statement), `Missing architecture statement: ${statement}`);
}
assert(!sourceManifest.update_url,
  "store distribution must own updates; do not invent a competing updater");

console.log("Packaging and update architecture tests passed.");
