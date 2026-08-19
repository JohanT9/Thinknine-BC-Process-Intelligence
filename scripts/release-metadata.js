const crypto = require("crypto");
const fs = require("fs");

const RELEASE_MANIFEST_VERSION = 1;
const CHANNELS = Object.freeze(["stable", "beta", "development"]);

function releaseChannel(value = "beta") {
  const channel = String(value || "").trim().toLowerCase();
  if (!CHANNELS.includes(channel)) {
    throw new Error(`Unsupported release channel: ${value}`);
  }
  return channel;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath))
    .digest("hex");
}

function createReleaseManifest(options = {}) {
  const version = String(options.version || "").trim();
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/u.test(version)) {
    throw new Error(`Invalid Chromium release version: ${version}`);
  }
  const channel = releaseChannel(options.channel);
  const artifacts = (options.artifacts || []).map(artifact => ({
    component: artifact.component,
    browser: artifact.browser,
    file: artifact.file,
    mediaType: artifact.mediaType,
    sha256: artifact.sha256
  }));
  return {
    manifestVersion: RELEASE_MANIFEST_VERSION,
    product: "Thinknine BC Process Intelligence",
    version,
    channel,
    publishedAt: options.publishedAt || new Date().toISOString(),
    minimumCompatibleVersion: options.minimumCompatibleVersion || version,
    artifacts,
    releaseNotesReference: options.releaseNotesReference || "CHANGELOG.md"
  };
}

module.exports = { CHANNELS, RELEASE_MANIFEST_VERSION, createReleaseManifest,
  releaseChannel, sha256 };
