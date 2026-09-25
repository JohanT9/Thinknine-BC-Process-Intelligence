const fs = require("fs");
const baseRunner = require("./run-process-e2e-corpus");

const clone = value => JSON.parse(JSON.stringify(value));
const noiseEvent = (id, extra = {}) => ({ id, type: "field-change",
  fieldName: "Metamorphic noise", value: "unchanged",
  previousValue: "unchanged", inputSource: "focusout",
  controlType: "input", ...extra });
const focusEvent = id => ({ id, type: "focus", fieldName: "Metamorphic focus",
  value: "", controlType: "input" });
const withEventIds = (events, prefix) => events.map((event, index) => ({
  ...event, id: `${prefix}-${index + 1}-${event.id}`
}));

const transformations = Object.freeze([
  { id: "timestamp-fast", apply: events => events.map((event, index) => ({
    ...event, timestamp: `2026-09-23T10:00:00.${String(index).padStart(3, "0")}Z` })) },
  { id: "timestamp-slow", apply: events => events.map((event, index) => ({
    ...event, timestamp: `2026-09-23T10:${String(index * 7).padStart(2, "0")}:00.000Z` })) },
  { id: "top-frame-metadata", apply: events => events.map(event => ({ ...event,
    sourceFrameId: "top", browserFrameId: 0, parentFrameId: -1,
    documentId: "synthetic-top-document" })) },
  { id: "nested-frame-metadata", apply: events => events.map(event => ({ ...event,
    sourceFrameId: "synthetic-addin", browserFrameId: 7, parentFrameId: 0,
    documentId: "synthetic-addin-document", controlAddIn: true })) },
  { id: "future-metadata", apply: events => events.map((event, index) => ({
    ...event, futureRawMetadata: { syntheticVersion: 2, ordinal: index + 1 } })) },
  { id: "leading-focus-noise", apply: events => [focusEvent("noise-focus-before"),
    ...withEventIds(events, "lf")] },
  { id: "trailing-focus-noise", apply: events => [...withEventIds(events, "tf"),
    focusEvent("noise-focus-after")] },
  { id: "leading-unchanged-field", apply: events => [noiseEvent("noise-before"),
    ...withEventIds(events, "ln")] },
  { id: "trailing-unchanged-field", apply: events => [...withEventIds(events, "tn"),
    noiseEvent("noise-after")] },
  { id: "surrounded-by-noise", apply: events => [focusEvent("surround-focus"),
    noiseEvent("surround-before"), ...withEventIds(events, "sn"),
    noiseEvent("surround-after")] },
  { id: "frame-and-timing", apply: events => events.map((event, index) => ({
    ...event, sourceFrameId: "top", browserFrameId: 0,
    timestamp: `2026-09-23T11:00:${String(index * 3).padStart(2, "0")}.000Z` })) },
  { id: "metadata-and-noise", apply: events => [noiseEvent("metadata-noise"),
    ...withEventIds(events.map(event => ({ ...event,
      futureRawMetadata: { synthetic: true } })), "mn")] },
  { id: "duplicate-field-input", apply: events => {
    const index = events.findIndex(event => ["field-change", "input", "change"].includes(event.type) &&
      event.previousValue !== event.value);
    if (index < 0) return [noiseEvent("field-fallback"), ...withEventIds(events, "df")];
    const values = withEventIds(events, "df");
    const duplicate = { ...values[index], id: `duplicate-${values[index].id}`,
      inputSource: "input" };
    values.splice(index, 0, duplicate);
    return values;
  } },
  { id: "explicit-interaction-identity", apply: events => events.map((event, index) => ({
    ...event, interactionId: event.interactionId ||
      (["field-change", "input", "change"].includes(event.type) && event.fieldName
        ? `synthetic-field-${event.pageId || "page"}-${event.fieldName}`
        : `synthetic-interaction-${event.pageId || "page"}-${index}`) })) },
  { id: "combined-realistic-noise", apply: events => [focusEvent("combined-focus"),
    ...withEventIds(events.map((event, index) => ({ ...event,
      timestamp: `2026-09-23T12:00:${String(index * 2).padStart(2, "0")}.000Z`,
      sourceFrameId: "top", browserFrameId: 0,
      futureRawMetadata: { synthetic: true, index } })), "combined"),
    noiseEvent("combined-tail")] }
]);

function signature(output) {
  return output.interpreted.businessTasks.map(task => ({
    taskType: task.taskType, instruction: task.instruction,
    actionCaption: task.actionCaption || "", fieldCaption: task.fieldCaption || "",
    selectedCaption: task.selectedCaption || "", screenshot: task.screenshot || null,
    resultStatus: task.resultVerification?.status || null,
    important: Boolean(task.important),
    sectionBoundaryAfter: Boolean(task.sectionBoundaryAfter)
  }));
}

function run(corpus = JSON.parse(fs.readFileSync(baseRunner.corpusPath, "utf8"))) {
  baseRunner.validate(corpus);
  const results = [];
  corpus.scenarios.forEach(scenario => {
    const baseline = baseRunner.execute(scenario);
    const expectedSignature = signature(baseline);
    transformations.forEach(transformation => {
      const variant = { ...clone(scenario), id: `${scenario.id}--${transformation.id}`,
        events: transformation.apply(clone(scenario.events)) };
      const output = baseRunner.execute(variant);
      const actualSignature = signature(output);
      const failures = [];
      if (JSON.stringify(actualSignature) !== JSON.stringify(expectedSignature)) {
        failures.push("semantic output changed after an evidence-preserving mutation");
      }
      if (output.grouped.diagnostics.unassignedMeaningfulEventIds.length) {
        failures.push("mutation left meaningful events unassigned");
      }
      results.push({ scenarioId: scenario.id, transformation: transformation.id,
        failures, expectedSignature, actualSignature });
    });
  });
  const passed = results.filter(result => !result.failures.length).length;
  return { corpusVersion: corpus.corpusVersion,
    transformationCount: transformations.length, variantCount: results.length,
    passed, failed: results.length - passed, accuracy: passed / results.length,
    results };
}

if (require.main === module) {
  const result = run();
  result.results.forEach(item => item.failures.forEach(failure =>
    console.error(`${item.scenarioId}/${item.transformation}: ${failure}`)));
  console.log(`Process metamorphic corpus: ${result.passed}/${result.variantCount} variants passed.`);
  if (result.failed) process.exitCode = 1;
}

module.exports = { run, signature, transformations };
