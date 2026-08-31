const assert = require("assert");
const fixture = require("./fixtures/capture-validation/sanitized-recordings.json");
const suite = require("../scripts/capture-validation-suite");

function hydrateSample(sample) {
  return { ...sample, recording: Object.freeze({ schemaVersion: 1,
    recordingId: `validation:${sample.id}`,
    events: Object.freeze(sample.events.map((event, index) => Object.freeze({
      normalizedEventId: `normalized:${sample.id}:${event.id}`,
      schemaVersion: 1,
      sourceEventId: `source:${sample.id}:${event.id}`,
      sourceEventIds: [`source:${sample.id}:${event.id}`],
      recordingId: `validation:${sample.id}`,
      kind: event.kind,
      timestamp: `2026-08-31T10:00:${String(index).padStart(2, "0")}.000Z`,
      sequence: index + 1,
      interactionId: event.interactionId,
      interactionIds: event.interactionId ? [event.interactionId] : [],
      pageIdentification: { id: event.page || "sales-order",
        caption: event.page || "Sales Order" },
      controlIdentification: event.control ? { identity: { value: event.control },
        caption: event.control } : {},
      frameContext: { frameId: event.frame || "top" },
      interaction: { mechanism: "pointer" },
      value: event.value == null ? null : { normalized: event.value,
        display: event.value },
      screenshotAssetId: event.screenshot,
      evidence: []
    }))) }) };
}

const corpus = { ...fixture, samples: fixture.samples.map(hydrateSample) };
assert.strictEqual(suite.SUITE_VERSION, "1.0.0");
const report = suite.assertValid(corpus, { minimumSamples: 6,
  minimumSurfaces: 4, minimumPackets: 7 });
assert.strictEqual(report.valid, true);
assert.strictEqual(report.samples, 6);
assert.deepStrictEqual(report.surfaces, ["standard-bc", "react-control-add-in",
  "multi-frame-control-add-in", "legacy-recording"]);
assert.deepStrictEqual(report.totals, { groups: 7, packets: 7,
  completePackets: 5, integrityErrors: 0,
  sourceEvents: 11, assignedSourceEvents: 11 });
assert(report.results.every(result => result.valid));
assert.ok(Object.isFrozen(report));

const insufficient = suite.evaluate(corpus, { minimumSamples: 7,
  minimumSurfaces: 5, minimumPackets: 8 });
assert.strictEqual(insufficient.valid, false);
for (const code of ["insufficient-sample-coverage",
  "insufficient-surface-coverage", "insufficient-packet-coverage"]) {
  assert(insufficient.issues.some(item => item.code === code));
}
assert.throws(() => suite.assertValid({ ...corpus,
  samples: corpus.samples.map((sample, index) => index ? sample : {
    ...sample, expected: { ...sample.expected, groupCount: 99 }
  }) }), error => error.code === "CAPTURE_VALIDATION_FAILED" &&
  error.report.issues.some(item => item.code === "unexpected-group-count"));

console.log(`Capture validation: ${report.samples} recordings, ${report.totals.packets} packets, ${report.surfaces.length} surfaces, 0 integrity errors.`);
