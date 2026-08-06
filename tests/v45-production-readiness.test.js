const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = value => fs.readFileSync(path.join(root, value), "utf8");
const packageJson = JSON.parse(read("package.json"));
const manifest = JSON.parse(read("src/ui/manifest.json"));
assert.strictEqual(packageJson.version, "4.6.0");
assert.strictEqual(manifest.version, packageJson.version);

const library = read("src/document/document-library.js");
const batch = read("src/document/document-batch-operations.js");
const adapter = read("src/exporters/word-document-adapter.mjs");
const popup = read("src/ui/popup.js");
const popupHtml = read("src/ui/popup.html");
const dashboardHtml = read("src/ui/dashboard.html");
assert(library.includes("FORBIDDEN_PROJECT_FIELDS") &&
  library.includes('"review"') && library.includes('"semanticDocument"') &&
  library.includes('"documentPlan"') && library.includes('"screenshots"'));
assert(!batch.includes("review-document-projector") &&
  !batch.includes("word-export") && !batch.includes("semantic-document") &&
  batch.includes('require("./document-library")'));
assert(!adapter.includes("src/review") &&
  !adapter.includes("review-document-projector"));
assert(popup.includes("T9AsyncOperations.singleFlight") &&
  popup.includes('addEventListener("pagehide"') &&
  popup.includes("clearInterval(refreshInterval)"));
assert(popupHtml.includes("Öppna Dokumentbibliotek") &&
  popupHtml.includes("Tekniska verktyg") &&
  popupHtml.includes('src="async-operations.js"'));

assert(dashboardHtml.includes('<details id="settingsPanel" class="settings-panel">') &&
  dashboardHtml.includes("Inställningar för dokumentation, export och inspelning"));

const installation = read("INSTALLERA.txt");
assert(installation.startsWith("THINKNINE BC PROCESS INTELLIGENCE 4.6.0"));
assert(installation.includes("Dokumentbiblioteket") &&
  installation.includes("Batch-exportera") &&
  !installation.includes("4.5.0 UX1"));
for (const documentPath of [
  "docs/RELEASE_NOTES_4.5.0.md",
  "docs/PRODUCTION_READINESS_4.5.md",
  "docs/SHIP_REVIEW_4.5.md",
  "docs/SEMANTIC_DOCUMENT_MODEL_4.4.md",
  "docs/DOCUMENT_WORKSPACE_4.5.md",
  "docs/DOCUMENTATION_INTELLIGENCE_4.5.md",
  "docs/DOCUMENT_PROFILES_4.5.md",
  "docs/DOCUMENT_LIBRARY_4.5.md",
  "docs/BATCH_OPERATIONS_4.5.md"
]) {
  assert(fs.existsSync(path.join(root, documentPath)), `${documentPath} is required`);
}
assert(read("docs/SHIP_REVIEW_4.5.md").includes(
  "Documentation Excellence v4.5.0 is production ready."
));
console.log("Documentation Excellence v4.5 production readiness tests passed.");
