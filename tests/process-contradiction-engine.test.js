const assert = require("assert");
const engine = require("../src/engine/process-contradiction-engine");

const conflicting = engine.analyze({ languagePolicy: "preserve-observed",
  stepGroups: [{ stepGroupId: "group:1", sourceEventIds: ["event:1"] }],
  businessTasks: [{ taskId: "task:1", stepGroupIds: ["group:1"],
    sourceEventIds: ["event:outside"], fieldCaption: "Customer Name",
    selectedCaption: "C001", actionCaption: "Open", instruction: "Choose another value",
    screenshot: "screen:actual", generatedLanguage: "sv",
    semanticActionModel: { targetField: "No.", selectedValue: "C001",
      actionCaption: "Select", preferredScreenshotRef: "screen:preferred",
      observedLanguage: "en" } }] });

assert.strictEqual(conflicting.status, "blocked");
assert.deepStrictEqual(conflicting.findings.map(item => item.code), [
  "BCPS-PROCESS-CONFLICT-FIELD-001",
  "BCPS-PROCESS-CONFLICT-ACTION-001",
  "BCPS-PROCESS-CONFLICT-EVIDENCE-001",
  "BCPS-PROCESS-CONFLICT-SCREENSHOT-001",
  "BCPS-PROCESS-CONFLICT-INSTRUCTION-001",
  "BCPS-PROCESS-CONFLICT-LANGUAGE-001"
]);
assert(!JSON.stringify(conflicting.findings).includes("Customer Name"));
assert(!JSON.stringify(conflicting.findings).includes("C001"));
assert(Object.isFrozen(conflicting));

const valid = engine.analyze({ stepGroups: [{ stepGroupId: "group:1",
  sourceEventIds: ["event:1"] }], businessTasks: [{ taskId: "task:1",
  stepGroupIds: ["group:1"], sourceEventIds: ["event:1"],
  fieldCaption: "Quantity", selectedCaption: "500",
  actionCaption: "Enter", instruction: "Enter 500 in Quantity.",
  screenshot: "screen:1", semanticActionModel: { targetField: "Quantity",
    selectedValue: "500", actionCaption: "Enter",
    preferredScreenshotRef: "screen:1" } }] });
assert.strictEqual(valid.status, "passed");
assert.strictEqual(valid.languageAssessment, "insufficient-evidence");

console.log("Process contradiction engine tests passed.");
