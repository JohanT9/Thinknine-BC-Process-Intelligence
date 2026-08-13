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
    frameContext: candidate.frameId ? { frameId: candidate.frameId } : undefined,
    stability: { stable: Boolean(candidate.stable) },
    annotationRefs: (candidate.annotations || []).map(annotationId =>
      ({ annotationId })),
    capturePhase: candidate.beforeValue ? "before-value" : undefined,
    uiState: { dialogComplete: candidate.dialogComplete,
      dialogClosed: candidate.dialogClosed,
      beforeValue: candidate.beforeValue }
  }));
  if (sample.legacySingle) return { candidates,
    existingSelection: sample.expected };
  return { stepGroup: group, candidates, manualOverride: sample.manualOverride };
}

const results = corpus.samples.map(sample => {
  const first = engine.select(inputs(sample));
  const second = engine.select(inputs(sample));
  assert.deepStrictEqual(second, first, `${sample.id}: deterministic result`);
  return { sample, result: first,
    selected: first.selectedScreenshotAssetId };
});
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
assert.strictEqual(baselineCorrect, 14);
assert.strictEqual(afterCorrect, 17);
assert.strictEqual(results.find(item => item.sample.id ===
  "annotated-consultant-choice").result.selectionMode, "annotation-safe");
assert.strictEqual(results.find(item => item.sample.id ===
  "legacy-single-screenshot").selected, "legacy-only");

const percentage = (value, total) => `${((value / total) * 100).toFixed(1)}%`;
console.log(`Screenshot corpus: ${corpus.samples.length} samples`);
console.log(`Before: ${baselineCorrect} / ${eligible.length} automatically correct (${percentage(baselineCorrect, eligible.length)})`);
console.log(`After: ${afterCorrect} / ${eligible.length} automatically correct (${percentage(afterCorrect, eligible.length)})`);
console.log(`Capture failures: ${captureFailures.length}`);
console.log(`Selection failures after correction: ${selectionFailures.length}`);
console.log(`Ambiguous candidates: ${ambiguous.length}; manual override expected: ${manual.length}`);
for (const reason of ["previous-step screenshot", "focus-only screenshot",
  "pre-value screenshot", "after-navigation screenshot", "wrong control",
  "wrong dialog state", "stale screenshot", "transient UI", "missing capture",
  "ambiguous candidates", "manual override expected",
  "annotation-preservation conflict"]) {
  console.log(`${reason}: ${results.filter(({ sample }) =>
    sample.failure === reason || sample.classification === reason).length}`);
}
