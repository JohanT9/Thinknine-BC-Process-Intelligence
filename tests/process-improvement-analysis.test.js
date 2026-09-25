const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const analysis = require("../scripts/analyze-process-improvement-data");

const dataset = { schemaVersion: 1, datasetVersion: "1.0.0",
  scope: "local-aggregate", contentIncluded: false, identityIncluded: false,
  correctionCount: 8, engineAttributedCorrectionCount: 7,
  unattributedCorrectionCount: 1,
  byProcessCode: { "BCPS-PROCESS-CONFLICT-FIELD-001": 5,
    "BCPS-PROCESS-CONFLICT-SCREENSHOT-001": 2 },
  byAffectedField: { instruction: 6, screenshot: 1 },
  byCommandType: { edit: 6, "step-screenshot": 1 },
  prioritizedCodes: [
    { code: "BCPS-PROCESS-CONFLICT-FIELD-001", corrections: 5 },
    { code: "BCPS-PROCESS-CONFLICT-SCREENSHOT-001", corrections: 2 }
  ] };

const report = analysis.analyze(dataset);
assert.strictEqual(report.engineAttributionRate, 0.875);
assert.deepStrictEqual(report.priorities.map(item => item.priority),
  ["high", "medium"]);
assert.strictEqual(report.priorities[0].target, "semantic field projection");
assert(analysis.markdown(report).includes(
  "| high | BCPS-PROCESS-CONFLICT-FIELD-001 | 5 |"));
assert(Object.isFrozen(report));

assert.throws(() => analysis.validate({ ...dataset,
  customerName: "Private customer" }), /unexpected field/u);
assert.throws(() => analysis.validate({ ...dataset, contentIncluded: true }),
  /privacy or schema contract/u);
assert.throws(() => analysis.validate({ ...dataset,
  correctionCount: 9 }), /totals are inconsistent/u);
assert.throws(() => analysis.validate({ ...dataset,
  byProcessCode: { "Customer Feldts 905": 1 } }), /invalid key/u);
assert.throws(() => analysis.validate({ ...dataset,
  prioritizedCodes: [{ code: "BCPS-PROCESS-CONFLICT-FIELD-001",
    corrections: 4 }] }), /totals are inconsistent/u);

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(),
  "bc-process-improvement-"));
try {
  const inputPath = path.join(temporaryDirectory, "dataset.json");
  fs.writeFileSync(inputPath, JSON.stringify(dataset), "utf8");
  const fileResult = analysis.run(inputPath);
  assert.strictEqual(fileResult.report.correctionCount, 8);
  assert(fileResult.markdown.startsWith("# Process engine improvement report"));
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log("Process improvement analysis workflow tests passed.");
