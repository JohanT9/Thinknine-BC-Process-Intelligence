const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const background = read("src/recorder/background.js");

assert.strictEqual(packageJson.scripts.posttest, "npm run test:canonical");
assert.ok(packageJson.scripts["test:canonical"].includes(
  "canonical-recording.test.js"));
assert.ok(packageJson.scripts["test:canonical"].includes(
  "raw-event-persistence.test.js"));
assert.ok(packageJson.scripts["test:canonical"].includes(
  "canonical-hardening.test.js"));
assert.ok(packageJson.scripts.ci.includes("npm test"));

assert.ok(background.includes("settleBounded(writeQueue"));
assert.ok(background.includes("settleBounded(screenshotWorkerPromise"));
assert.ok(background.includes("settleBounded(canonicalStore.flush()"));
assert.ok(background.includes("CANONICAL_SETTLE_TIMEOUT_MS = 60000"));
assert.ok(background.indexOf("canonicalStore.associateScreenshot(") <
  background.indexOf("saveScreenshots(item.sessionId, screenshots)"),
"Canonical screenshot registration must precede legacy compatibility storage.");
assert.ok(background.indexOf("integrityDiagnostics(canonicalRecording") <
  background.indexOf("canonicalStore.finalize(state.sessionId"),
"Integrity validation must precede immutable finalization.");
for (const diagnostic of ["canonical-write-failure", "canonical-pending-write",
  "canonical-integrity-validation-failed"]) {
  assert.ok(background.includes(diagnostic), `Missing diagnostic: ${diagnostic}`);
}

console.log("Canonical Recording CI and finalization hardening tests passed.");
