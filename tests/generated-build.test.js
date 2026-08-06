const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const packageJson = JSON.parse(read("package.json"));
const dashboard = read("dist/dashboard.js");
const content = read("dist/content.js");
const background = read("dist/background.js");
const frameCapture = read("dist/frame-capture.js");
const manifest = JSON.parse(read("dist/manifest.json"));

assert.ok(!dashboard.includes("__APP_VERSION__"));
assert.ok(!background.includes("__APP_VERSION__"));
assert.ok(dashboard.includes(`recorderVersion: "${packageJson.version}"`));
assert.ok(background.includes(`const VERSION = "${packageJson.version}"`));
assert.ok(dashboard.includes('const CONTEXT_BUILDER_VERSION = "1.0.0"'));
assert.ok(dashboard.includes(
  'const KNOWLEDGE_PACK_FRAMEWORK_VERSION = "2.0.0"'
));
assert.ok(content.includes('version: "3.0.0"'));
assert.ok(frameCapture.includes('const CONTRACT_VERSION = "1.0.0"'));
assert.deepStrictEqual(manifest.content_scripts[0].js,
  ["frame-capture.js", "content.js"]);
assert.strictEqual(manifest.content_scripts[0].all_frames, true);
assert.strictEqual(manifest.content_scripts[0].match_origin_as_fallback, true);

console.log("Generated build version integrity tests passed.");
