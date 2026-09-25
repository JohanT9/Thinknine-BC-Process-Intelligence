const fs = require("fs");
const path = require("path");
const assert = require("assert");
const e2e = require("./run-process-e2e-corpus");

const baselinePath = path.resolve(__dirname,
  "../tests/fixtures/process-e2e/golden-output.json");

function value(value) { return value == null ? null : value; }

function taskSnapshot(task) {
  return {
    taskType: value(task.taskType),
    kind: value(task.kind),
    instruction: value(task.instruction),
    actionCaption: value(task.actionCaption),
    fieldCaption: value(task.fieldCaption),
    selectedCaption: value(task.selectedCaption),
    screenshot: value(task.screenshot),
    resultStatus: value(task.resultVerification?.status),
    observedResult: value(task.observedResult),
    expectedResultSuggestion: value(task.expectedResultSuggestion),
    important: Boolean(task.important),
    sectionBoundaryAfter: Boolean(task.sectionBoundaryAfter)
  };
}

function projectedStepSnapshot(step) {
  const instruction = (step.blocks || []).find(block =>
    block.kind === "paragraph");
  const result = (step.blocks || []).find(block =>
    block.kind === "callout");
  const image = (step.blocks || []).find(block => block.kind === "image");
  return {
    stepNumber: step.stepNumber,
    instruction: value(instruction?.text),
    observedResult: value(result?.blocks?.find(block =>
      block.kind === "paragraph")?.text),
    screenshot: value(image?.sourceRef?.screenshotRef)
  };
}

function create(corpus = JSON.parse(fs.readFileSync(e2e.corpusPath, "utf8"))) {
  e2e.validate(corpus);
  return {
    schemaVersion: 1,
    corpusVersion: corpus.corpusVersion,
    scenarios: corpus.scenarios.map(scenario => {
      const output = e2e.execute(scenario);
      const workflow = output.document.sections.find(section =>
        section.kind === "workflow");
      return {
        id: scenario.id,
        tasks: output.interpreted.businessTasks.map(taskSnapshot),
        projectedSteps: (workflow?.blocks || []).filter(block =>
          block.kind === "step").map(projectedStepSnapshot)
      };
    })
  };
}

function verify(actual = create(), expected = JSON.parse(
  fs.readFileSync(baselinePath, "utf8"))) {
  assert.deepStrictEqual(actual, expected,
    "Process output differs from the approved golden baseline. " +
    "Review the semantic change, then run npm run update:process-golden if intentional.");
  return actual;
}

function update(actual = create()) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(actual, null, 2)}\n`, "utf8");
  return actual;
}

if (require.main === module) {
  const shouldUpdate = process.argv.slice(2).includes("--update");
  const result = shouldUpdate ? update() : verify();
  console.log(`Process golden baseline ${shouldUpdate ? "updated" : "passed"} ` +
    `(${result.scenarios.length} scenarios).`);
}

module.exports = { baselinePath, create, projectedStepSnapshot, taskSnapshot,
  update, verify };
