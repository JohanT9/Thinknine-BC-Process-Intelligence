const fs = require("fs");
const e2e = require("./run-process-e2e-corpus");
const guard = require("../src/engine/process-quality-guard");
const contradictions = require("../src/engine/process-contradiction-engine");

function workflowSteps(document) {
  return (document.sections.find(section => section.kind === "workflow")?.blocks || [])
    .filter(block => block.kind === "step");
}

function projected(step) {
  const instruction = (step.blocks || []).find(block => block.kind === "paragraph");
  const result = (step.blocks || []).find(block => block.kind === "callout");
  const image = (step.blocks || []).find(block => block.kind === "image");
  return { instruction: instruction?.text || "",
    observedResult: result?.blocks?.find(block => block.kind === "paragraph")?.text || "",
    screenshot: image?.sourceRef?.screenshotRef || null };
}

function inspect(scenario, output) {
  const failures = [];
  const input = { normalizedEvents: output.normalized.events,
    stepGroups: output.grouped.groups,
    businessTasks: output.interpreted.businessTasks };
  guard.evaluate(input).findings.filter(item => item.severity === "block")
    .forEach(item => failures.push(`quality guard blocked ${item.code}`));
  contradictions.analyze(input).findings.filter(item => item.severity === "block")
    .forEach(item => failures.push(`contradiction engine blocked ${item.code}`));

  const tasks = output.interpreted.businessTasks;
  const steps = workflowSteps(output.document);
  if (tasks.length !== steps.length) failures.push(
    `projection count differs: ${tasks.length} tasks, ${steps.length} steps`);
  const capturedScreenshots = new Set(scenario.events.map(event => event.screenshot)
    .filter(Boolean));
  tasks.forEach((task, index) => {
    const step = steps[index] ? projected(steps[index]) : null;
    if (!String(task.instruction || "").trim()) failures.push(
      `task ${index + 1} has no instruction`);
    if (!String(task.observedResult || "").trim()) failures.push(
      `task ${index + 1} has no observed result`);
    if (!task.resultVerification?.status) failures.push(
      `task ${index + 1} has no result status`);
    if (task.screenshot && !capturedScreenshots.has(task.screenshot)) failures.push(
      `task ${index + 1} uses an uncaptured screenshot`);
    const projectedResult = ["verified", "error"].includes(
      task.resultVerification?.status) ? task.observedResult : "";
    if (step && (step.instruction !== task.instruction ||
        step.observedResult !== projectedResult ||
        step.screenshot !== (task.screenshot || null))) failures.push(
      `task ${index + 1} differs from its projected document step`);

    if (["EnableCheckbox", "DisableCheckbox"].includes(task.taskType)) {
      const shouldEnable = task.taskType === "EnableCheckbox";
      if (typeof task.checked !== "boolean" || task.checked !== shouldEnable) {
        failures.push(`task ${index + 1} contradicts its checkbox state`);
      }
      if (typeof task.value !== "boolean" || task.value !== shouldEnable) {
        failures.push(`task ${index + 1} lost its boolean value`);
      }
    }
    if (task.resultVerification?.status === "error" &&
        !/error|fel/iu.test(String(task.observedResult || ""))) failures.push(
      `task ${index + 1} hides its captured error outcome`);
  });
  return failures;
}

function evaluateScenario(scenario) {
  return { id: scenario.id, failures: inspect(scenario, e2e.execute(scenario)) };
}

function run(corpus = JSON.parse(fs.readFileSync(e2e.corpusPath, "utf8"))) {
  e2e.validate(corpus);
  const results = corpus.scenarios.map(evaluateScenario);
  const passed = results.filter(item => !item.failures.length).length;
  return { scenarioCount: results.length, passed,
    failed: results.length - passed, results };
}

if (require.main === module) {
  const result = run();
  result.results.forEach(item => item.failures.forEach(failure =>
    console.error(`${item.id}: ${failure}`)));
  console.log(`Process output quality: ${result.passed}/${result.scenarioCount} ` +
    "scenarios passed.");
  if (result.failed) process.exitCode = 1;
}

module.exports = { evaluateScenario, inspect, projected, run, workflowSteps };
