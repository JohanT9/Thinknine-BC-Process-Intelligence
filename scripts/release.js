const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const releaseDir = path.join(root, "release");
const manifest = JSON.parse(
  fs.readFileSync(path.join(dist, "manifest.json"), "utf8")
);
const version = manifest.version;
const zipName = `Thinknine_BC_Process_Intelligence_v${version}_EDGE.zip`;
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

console.log(`Release package created: ${zipPath}`);
