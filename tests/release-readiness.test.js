const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const packageJson = JSON.parse(read("package.json"));
const manifest = JSON.parse(read("src/ui/manifest.json"));

assert.strictEqual(manifest.version, packageJson.version);
assert.strictEqual(packageJson.version, "4.6.0");

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
const v45ReleaseNotes = read("docs/RELEASE_NOTES_4.5.0.md");
const v45Readiness = read("docs/PRODUCTION_READINESS_4.5.md");
const languageExcellence = read("docs/LANGUAGE_EXCELLENCE_4.6.md");
const v46ReleaseNotes = read("docs/RELEASE_NOTES_4.6_R1.md");
const screenshotIntelligence = read("docs/SCREENSHOT_INTELLIGENCE_4.6.md");
const v46R2ReleaseNotes = read("docs/RELEASE_NOTES_4.6_R2.md");
const terminologyReleaseNotes = read("docs/RELEASE_NOTES_4.6_R1_1.md");
const installation = read("INSTALLERA.txt");
const handbook = read(".github/AGENTS.md");
assert.ok(architecture.startsWith("# Architecture 4.6"));
assert.ok(releaseNotes.includes("Documentation Excellence v4.4.0"));
assert.ok(releaseNotes.includes("No AI functionality was introduced."));
assert.ok(v45ReleaseNotes.includes("Documentation Excellence v4.5.0"));
assert.ok(v45Readiness.includes(
  "Documentation Excellence v4.5.0 is production ready."
));
assert.ok(languageExcellence.includes("Existing recordings require no migration."));
assert.ok(languageExcellence.includes("Semantic meaning is preserved."));
assert.ok(v46ReleaseNotes.includes("Documentation Excellence v4.6 R1"));
assert.ok(screenshotIntelligence.includes("Existing recordings require no migration."));
assert.ok(screenshotIntelligence.includes(
  "Manual screenshot choices remain authoritative."));
assert.ok(screenshotIntelligence.includes("R1's lack of a verified visible"));
assert.ok(v46R2ReleaseNotes.includes("Documentation Excellence v4.6 R2"));
assert.ok(terminologyReleaseNotes.includes(
  "Documentation Excellence v4.6 R1.1 — Dokumentbibliotek"));
assert.ok(installation.includes("WORD-EXPORT 4.4"));
assert.ok(handbook.includes("src/exporters/"));
assert.ok(!handbook.includes("src/export/\n"));

const adapter = read("src/exporters/word-document-adapter.mjs");
const languageLayer = read("src/document/language-excellence.js");
const screenshotLayer = read("src/document/screenshot-intelligence.js");
const workspaceRenderer = read("src/document/document-workspace.js");
for (const forbidden of [
  "review-document-projector",
  "document-theme-registry",
  "src/review"
]) {
  assert.ok(!adapter.includes(forbidden), `Word adapter must not import ${forbidden}.`);
}
assert.ok(!adapter.includes("screenshot-intelligence"));
assert.ok(!workspaceRenderer.includes("screenshot-intelligence"));
for (const forbidden of ["src/review", "../review", "document-planner",
  "word-document-adapter", "word-export", "document.querySelector",
  "canvas", "imageData"]) {
  assert.ok(!screenshotLayer.includes(forbidden),
    `Screenshot Intelligence must not import or consume ${forbidden}.`);
}
for (const forbidden of ["src/review", "../review", "document-planner",
  "word-document-adapter", "word-export"]) {
  assert.ok(!languageLayer.includes(forbidden),
    `Language Excellence must not import ${forbidden}.`);
}

const build = read("scripts/build.js");
assert.ok(build.includes("replace(/__APP_VERSION__/g, version)"));
assert.ok(!build.includes("replace(/v\\d+\\.\\d+\\.\\d+/g"));

console.log("Documentation Excellence release readiness tests passed.");
