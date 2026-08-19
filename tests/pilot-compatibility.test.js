const assert = require("assert");
const fs = require("fs");
const source = require("../scripts/release-source");
const packageValidation = require("../scripts/edge-package-validation");

const fixture = JSON.parse(fs.readFileSync(
  "tests/fixtures/pilot/representative-storage-v4.6.0.json", "utf8"));
assert.strictEqual(fixture.sanitized, true);
const roundTrip = JSON.parse(JSON.stringify(fixture.storage));
for (const key of ["t9-recording-fixture", "t9-review-fixture",
  "t9-process-model-fixture", "t9-process-version-fixture", "t9-settings",
  "t9-document-library"]) assert.deepStrictEqual(roundTrip[key], fixture.storage[key]);
const review = roundTrip["t9-review-fixture"];
for (const field of ["stepOverrides", "structureOverrides", "manualSteps",
  "notes", "annotations", "sections", "subtasks"]) assert(review[field], field);

assert.deepStrictEqual(source.statusEntries(" M file.js\n?? new.js\n"),
  [" M file.js", "?? new.js"]);
assert.throws(() => packageValidation.validatePackageDirectory("tests"),
  /manifest.json/u);
assert.strictEqual(packageValidation.validatePackageDirectory("dist")
  .manifest.version, require("../package.json").version);

console.log("Pilot stored-state compatibility and package tests passed.");
