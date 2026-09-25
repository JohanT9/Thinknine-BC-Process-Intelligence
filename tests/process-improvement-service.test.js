const assert = require("assert");
const service = require("../src/review/process-improvement-service");
const fs = require("fs");
const path = require("path");

const storage = { async get(key) {
  assert.strictEqual(key, null);
  return {
    "t9_review_first": { commandHistory: [{ metadata: { correctionFeedback: {
      version: "1.1.0", scope: "local-review", contentIncluded: false,
      commandType: "edit", affectedFields: ["instruction"],
      affectedStepCount: 1, engineAttributed: true,
      processFindingCodes: ["BCPS-PROCESS-CONFLICT-FIELD-001"]
    } } }], historyIndex: 1, privateInstruction: "Customer Feldts 905" },
    "t9_review_redo": { commandHistory: [{ metadata: { correctionFeedback: {
      commandType: "edit", affectedFields: ["screenshot"],
      engineAttributed: true,
      processFindingCodes: ["BCPS-PROCESS-CONFLICT-SCREENSHOT-001"]
    } } }], historyIndex: 0 },
    "t9_session_private": { customer: "Contoso" },
    "t9_screenshot_private": "secret-image"
  };
} };

assert.throws(() => service.create({ storage }),
  /storage and review prefix are required/u);

(async () => {
  const reader = service.create({ storage, reviewPrefix: "t9_review_" });
  const result = await reader.read();
  assert.strictEqual(result.serviceVersion, "1.0.0");
  assert.strictEqual(result.reviewCount, 2);
  assert.strictEqual(result.dataset.correctionCount, 1);
  assert.deepStrictEqual(result.dataset.byProcessCode,
    { "BCPS-PROCESS-CONFLICT-FIELD-001": 1 });
  for (const secret of ["Feldts", "905", "Contoso", "secret-image",
    "t9_review_first", "t9_session_private"]) {
    assert(!JSON.stringify(result).includes(secret),
      `service result must exclude ${secret}`);
  }
  assert(Object.isFrozen(result));
  const debug = fs.readFileSync(path.join(__dirname, "../src/ui/debug.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../src/ui/debug.html"), "utf8");
  assert(debug.includes('type: "T9_GET_PROCESS_IMPROVEMENT_DATASET"'));
  assert(debug.includes('"bc-process-improvement-data.json"'));
  assert(debug.includes('"bc-process-improvement-report.md"'));
  assert(debug.includes('globalThis.BCProcessImprovementAnalysis'));
  assert(html.includes('review/process-improvement-analysis.js'));
  assert(html.includes('id="improvementGrid"'));
  assert(html.includes('data-i18n="debug.downloadImprovement"'));
  console.log("Process improvement storage service tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
