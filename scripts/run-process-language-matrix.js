const fs = require("fs");
const e2e = require("./run-process-e2e-corpus");
const documentLanguage = require("../src/document/document-language");
const languages = require("../src/engine/language-registry");

const locales = Object.freeze(languages.supported("document").map(item =>
  item.locale));

function workflowSteps(document) {
  return (document.sections.find(section => section.kind === "workflow")?.blocks || [])
    .filter(block => block.kind === "step");
}

function stepContent(step) {
  const instruction = (step.blocks || []).find(block => block.kind === "paragraph");
  const result = (step.blocks || []).find(block => block.kind === "callout");
  const image = (step.blocks || []).find(block => block.kind === "image");
  return { instruction: instruction?.text || "",
    observedResult: result?.blocks?.find(block => block.kind === "paragraph")?.text || "",
    screenshot: image?.sourceRef?.screenshotRef || null };
}

function evaluate(scenario, locale) {
  const output = e2e.execute(scenario);
  const localized = documentLanguage.process(output.document, locale);
  const steps = workflowSteps(localized); const failures = [];
  const tasks = output.interpreted.businessTasks;
  if (localized.metadata.documentLanguage !== locale) failures.push(
    "document language metadata differs");
  if (steps.length !== tasks.length) failures.push(
    `expected ${tasks.length} steps, received ${steps.length}`);
  tasks.forEach((task, index) => {
    const step = steps[index] ? stepContent(steps[index]) : null;
    if (!step) return;
    const expectedInstruction = documentLanguage.translateInstruction(
      task.instruction, locale);
    if (step.instruction !== expectedInstruction) failures.push(
      `step ${index + 1} instruction differs`);
    const expectedResult = ["verified", "error"].includes(
      task.resultVerification?.status)
      ? documentLanguage.translateInstruction(task.observedResult, locale) : "";
    if (step.observedResult !== expectedResult) failures.push(
      `step ${index + 1} result differs`);
    if (step.screenshot !== (task.screenshot || null)) failures.push(
      `step ${index + 1} screenshot differs`);
  });
  const serialized = JSON.stringify(localized);
  (scenario.protectedTokens || []).forEach(token => {
    if (!serialized.includes(token)) failures.push(
      "captured Business Central text was translated or removed");
  });
  if (serialized.includes("\uFFFD")) failures.push(
    "localized document contains invalid replacement characters");
  return { scenarioId: scenario.id, locale, failures };
}

function run(corpus = JSON.parse(fs.readFileSync(e2e.corpusPath, "utf8"))) {
  e2e.validate(corpus);
  const results = corpus.scenarios.flatMap(scenario => locales.map(locale =>
    evaluate(scenario, locale)));
  const passed = results.filter(item => !item.failures.length).length;
  return { localeCount: locales.length, scenarioCount: corpus.scenarios.length,
    variantCount: results.length, passed, failed: results.length - passed,
    results };
}

if (require.main === module) {
  const result = run();
  result.results.forEach(item => item.failures.forEach(failure =>
    console.error(`${item.scenarioId}/${item.locale}: ${failure}`)));
  console.log(`Process language matrix: ${result.passed}/${result.variantCount} ` +
    "variants passed.");
  if (result.failed) process.exitCode = 1;
}

module.exports = { evaluate, locales, run, stepContent, workflowSteps };
