const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const metadata = require("./release-metadata");

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

const releaseManifest = metadata.createReleaseManifest({
  version,
  channel,
  minimumCompatibleVersion:
    process.env.MINIMUM_COMPATIBLE_VERSION || version,
  artifacts: [{
    component: "browser-extension",
    browser: "edge",
    file: zipName,
    mediaType: "application/zip",
    sha256: metadata.sha256(zipPath)
  }]
});
fs.writeFileSync(path.join(releaseDir, "release-manifest.json"),
  JSON.stringify(releaseManifest, null, 2) + "\n", "utf8");

console.log(`Release package created: ${zipPath}`);
console.log(`Release channel: ${channel}`);
