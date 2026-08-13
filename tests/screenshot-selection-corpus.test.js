const assert = require("assert");
const corpus = require("./fixtures/screenshot-selection/sanitized-bc-recordings.json");
const engine = require("../src/engine/screenshot-selection-engine");

function inputs(sample) {
  const ids = sample.candidates.map(candidate => candidate.id);
  const group = Object.freeze({ stepGroupId: `real-shaped:${sample.id}`,
    screenshotAssetIds: ids, ...sample.group });
  const candidates = sample.candidates.map(candidate => ({
    screenshotAssetId: candidate.id, screenshotRef: `${candidate.id}.png`,
    sourceEventId: candidate.source, normalizedKind: candidate.kind,
    page: { id: candidate.page || sample.group.pageContext?.id },
    control: { caption: candidate.control ||
      sample.group.controlContext?.caption, visible: true },
    stability: { stable: Boolean(candidate.stable) },
    capturePhase: candidate.beforeValue ? "before-value" : undefined,
    uiState: { dialogComplete: candidate.dialogComplete,
      dialogClosed: candidate.dialogClosed,
      beforeValue: candidate.beforeValue }
  }));
  return { stepGroup: group, candidates,
    manualOverride: sample.manualOverride };
}

const results = corpus.samples.map(sample => ({ sample,
  selected: engine.select(inputs(sample)).selectedScreenshotAssetId }));
const eligible = results.filter(({ sample }) => !sample.captureFailure &&
  !sample.manualOverride && sample.expected);
const baselineCorrect = eligible.filter(({ sample }) =>
  sample.baselineSelected === sample.expected).length;
const afterCorrect = eligible.filter(({ sample, selected }) =>
  selected === sample.expected).length;
const captureFailures = results.filter(({ sample }) => sample.captureFailure);
const selectionFailures = eligible.filter(({ sample, selected }) =>
  selected !== sample.expected);
const ambiguous = results.filter(({ sample }) =>
  sample.failure === "ambiguous candidates");
const manual = results.filter(({ sample }) => sample.manualOverride);

for (const { sample, selected } of eligible) {
  assert.strictEqual(selected, sample.expected, sample.id);
}
for (const { sample, selected } of manual) {
  assert.strictEqual(selected, sample.expected, sample.id);
}
assert(ambiguous.every(item => item.selected === null));
assert.strictEqual(captureFailures.length, 1);
assert.strictEqual(selectionFailures.length, 0);
assert.strictEqual(baselineCorrect, 9);
assert.strictEqual(afterCorrect, 12);

const percentage = (value, total) => `${((value / total) * 100).toFixed(1)}%`;
console.log(`Screenshot corpus: ${corpus.samples.length} samples`);
console.log(`Before: ${baselineCorrect} / ${eligible.length} automatically correct (${percentage(baselineCorrect, eligible.length)})`);
console.log(`After: ${afterCorrect} / ${eligible.length} automatically correct (${percentage(afterCorrect, eligible.length)})`);
console.log(`Capture failures: ${captureFailures.length}`);
console.log(`Selection failures after correction: ${selectionFailures.length}`);
console.log(`Ambiguous candidates: ${ambiguous.length}; manual override expected: ${manual.length}`);
for (const reason of ["wrong previous-step screenshot", "focus-only screenshot",
  "before-value screenshot", "after-navigation screenshot",
  "dialog closed too late", "wrong control", "missing capture",
  "ambiguous candidates", "manual override expected"]) {
  console.log(`${reason}: ${results.filter(({ sample }) =>
    sample.failure === reason).length}`);
}
