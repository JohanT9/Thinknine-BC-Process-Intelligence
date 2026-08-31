const assert = require("assert");
const fixture = require("./fixtures/interaction-result/sanitized-scenarios.json");
const correctness = require("../scripts/interaction-result-correctness");

function normalizedId(scenario, id) {
  return `normalized:${scenario.id}:${id}`;
}

function hydrateExpected(scenario) {
  return {
    groups: (scenario.expected.groups || []).map(group => ({
      interactionId: group.interaction ?? null,
      interactionEventIds: (group.interactionEvents || []).map(id =>
        normalizedId(scenario, id)),
      resultEventIds: (group.results || []).map(id => normalizedId(scenario, id)),
      status: group.status,
      primaryOutcome: group.primaryOutcome ?? null,
      primaryOutcomeEventId: group.primaryEvent
        ? normalizedId(scenario, group.primaryEvent) : null,
      outcomeKinds: group.outcomes || [],
      preferredScreenshotAssetId: group.screenshot ?? null,
      preferredScreenshotRole: group.screenshotRole ?? null
    })),
    supportingEventIds: (scenario.expected.supporting || []).map(id =>
      normalizedId(scenario, id))
  };
}

function hydrate(scenario) {
  const recordingId = `correctness:${scenario.id}`;
  return { id: scenario.id, surface: scenario.surface,
    expected: hydrateExpected(scenario),
    recording: Object.freeze({ schemaVersion: 1, recordingId,
      events: Object.freeze(scenario.events.map((event, index) => Object.freeze({
        normalizedEventId: normalizedId(scenario, event.id), schemaVersion: 1,
        sourceEventId: `source:${scenario.id}:${event.id}`,
        sourceEventIds: [`source:${scenario.id}:${event.id}`], recordingId,
        kind: event.kind, rawEventType: event.kind === "unknown"
          ? "react-render-complete" : undefined,
        timestamp: `2026-08-31T11:00:${String(index).padStart(2, "0")}.000Z`,
        sequence: index + 1, interactionId: event.interaction,
        interactionIds: event.interaction ? [event.interaction] : [],
        pageIdentification: { pageIdentity: `page:${event.page || "sales-order"}`,
          pageCaption: event.page || "Sales Order" },
        controlIdentification: event.control ? {
          identity: { value: event.control }, caption: event.control } : {},
        frameContext: { frameId: event.frame || "top" },
        interaction: { mechanism: "pointer" },
        value: event.value == null ? null : { normalized: event.value,
          display: event.value },
        state: event.checked == null ? null : { checked: event.checked },
        screenshotAssetId: event.screenshot, evidence: []
      }))) }) };
}

const corpus = { ...fixture, scenarios: fixture.scenarios.map(hydrate) };
assert.strictEqual(correctness.CORRECTNESS_VERSION, "1.0.0");
const report = correctness.assertValid(corpus, { minimumScenarios: 10,
  minimumVerified: 7, minimumErrors: 2, minimumUnverified: 2,
  minimumSurfaces: 2 });
assert.strictEqual(report.valid, true);
assert.strictEqual(report.scenarios, 10);
assert.deepStrictEqual(report.surfaces, ["standard-bc", "react-control-add-in"]);
assert.deepStrictEqual(report.totals, { groups: 11, verified: 7,
  errors: 2, unverified: 2 });
assert.ok(Object.isFrozen(report));

const wrongResult = { ...corpus, scenarios: corpus.scenarios.map((scenario,
  index) => index ? scenario : { ...scenario, expected: {
    ...scenario.expected, groups: scenario.expected.groups.map(group => ({
      ...group, resultEventIds: ["normalized:foreign-result"] })) } }) };
const invalid = correctness.evaluate(wrongResult);
assert.strictEqual(invalid.valid, false);
assert(invalid.problems.some(item => item.code === "result-events-mismatch"));
assert.throws(() => correctness.assertValid(wrongResult), error =>
  error.code === "INTERACTION_RESULT_CORRECTNESS_FAILED");

console.log(`Interaction -> Result correctness: ${report.scenarios} scenarios, ${report.totals.groups} packets, ${report.totals.verified} verified, ${report.totals.errors} errors, 0 mismatches.`);
