const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const packageJson = JSON.parse(read("package.json"));
const dashboard = read("dist/dashboard.js");
const content = read("dist/content.js");
const background = read("dist/background.js");

assert.ok(!dashboard.includes("__APP_VERSION__"));
assert.ok(!background.includes("__APP_VERSION__"));
assert.ok(dashboard.includes(`recorderVersion: "${packageJson.version}"`));
assert.ok(background.includes(`const VERSION = "${packageJson.version}"`));
assert.ok(dashboard.includes('const CONTEXT_BUILDER_VERSION = "1.0.0"'));
assert.ok(dashboard.includes(
  'const KNOWLEDGE_PACK_FRAMEWORK_VERSION = "2.0.0"'
));
assert.ok(content.includes('version: "2.1.0"'));
assert.ok(fs.existsSync(path.join(root, "dist/capture-focus-session.js")));
assert.ok(fs.existsSync(path.join(root, "dist/bc-error-detector.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/al-call-stack-parser.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/technical-diagnostics.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/bug-report-generator.js")));
assert.ok(fs.existsSync(path.join(root, "dist/technical-report.html")));
assert.ok(fs.existsSync(path.join(root, "dist/technical-report.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/application-insights-provider.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/technical-analysis-provider.js")));

console.log("Generated build version integrity tests passed.");
