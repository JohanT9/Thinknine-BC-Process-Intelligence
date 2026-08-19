const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const FORBIDDEN_PATTERNS = [
  /(^|\/)tests?(\/|$)/iu,
  /(^|\/)(node_modules|src|\.git)(\/|$)/iu,
  /\.(map|pfx|pem|key)$/iu,
  /(^|\/)(recordings?|debug-dumps?|customer-data)(\/|$)/iu
];

function listFiles(root, base = root) {
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(absolute, base));
    else result.push(path.relative(base, absolute).replace(/\\/gu, "/"));
  }
  return result.sort();
}

function validatePackageDirectory(root) {
  const files = listFiles(root);
  const errors = [];
  if (!files.includes("manifest.json")) errors.push("manifest.json is not at package root");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  for (const file of files) {
    if (FORBIDDEN_PATTERNS.some(pattern => pattern.test(file))) {
      errors.push(`Forbidden package file: ${file}`);
    }
    const content = /\.(js|json|html|md|txt)$/iu.test(file)
      ? fs.readFileSync(path.join(root, file), "utf8") : "";
    if (/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/u.test(content)) {
      errors.push(`Private key material in ${file}`);
    }
    if (/[A-Z]:\\Users\\|\/Users\/[^/]+\//u.test(content)) {
      errors.push(`Local absolute path in ${file}`);
    }
  }
  for (const required of [manifest.background?.service_worker,
    manifest.action?.default_popup, manifest.options_page]) {
    if (required && !files.includes(required)) errors.push(`Missing manifest resource: ${required}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { files, manifest };
}

function validateZip(zipPath) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "t9-edge-zip-"));
  try {
    if (process.platform === "win32") {
      const quotedZip = zipPath.replace(/'/gu, "''");
      const quotedTarget = temporaryRoot.replace(/'/gu, "''");
      execFileSync("powershell.exe", ["-NoProfile", "-Command",
        `Expand-Archive -LiteralPath '${quotedZip}' ` +
        `-DestinationPath '${quotedTarget}' -Force`], { stdio: "ignore" });
    } else {
      execFileSync("unzip", ["-q", zipPath, "-d", temporaryRoot]);
    }
    return validatePackageDirectory(temporaryRoot);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

module.exports = { FORBIDDEN_PATTERNS, listFiles, validatePackageDirectory,
  validateZip };
