const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const packageJson = JSON.parse(read("package.json"));
const manifest = JSON.parse(read("src/ui/manifest.json"));

assert.strictEqual(manifest.version, packageJson.version);
assert.strictEqual(packageJson.version, "4.4.0");

const comparisonAssets = fs.readdirSync(
  path.join(root, "docs/assets/rc8-comparison")
).sort();
assert.deepStrictEqual(comparisonAssets, [
  "rc7-cover.png",
  "rc7-workflow.png",
  "rc8-cover.png",
  "rc8-workflow.png"
]);

const architecture = read("docs/ARCHITECTURE.md");
const releaseNotes = read("docs/RELEASE_NOTES_4.4.0.md");
const installation = read("INSTALLERA.txt");
const handbook = read(".github/AGENTS.md");
assert.ok(architecture.startsWith("# Architecture 4.4"));
assert.ok(releaseNotes.includes("Documentation Excellence v4.4.0"));
assert.ok(releaseNotes.includes("No AI functionality was introduced."));
assert.ok(installation.includes("WORD-EXPORT 4.4"));
assert.ok(handbook.includes("src/exporters/"));
assert.ok(!handbook.includes("src/export/\n"));

const adapter = read("src/exporters/word-document-adapter.mjs");
for (const forbidden of [
  "review-document-projector",
  "document-theme-registry",
  "src/review"
]) {
  assert.ok(!adapter.includes(forbidden), `Word adapter must not import ${forbidden}.`);
}

const build = read("scripts/build.js");
assert.ok(build.includes("replace(/__APP_VERSION__/g, version)"));
assert.ok(!build.includes("replace(/v\\d+\\.\\d+\\.\\d+/g"));

console.log("Documentation Excellence release readiness tests passed.");
