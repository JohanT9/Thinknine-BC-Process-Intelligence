const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { schema, validateProcess } = require("../src/engine/canonical-process-schema");
const fixture = require("./fixtures/canonical-process/observed.json");
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const recording = { id: "recording-1", revisionId: "recording-revision-1", schemaVersion: 1,
  events: [{ id: "event-1", raw: { type: "field-change", value: false, previousValue: 0,
    empty: "", nil: null, "a/b~c": [false] } }], assets: [{ id: "asset-1" }] };
const candidate = id => ({ candidateId: id, businessDomainId: null, businessProcessId: null,
  bcProcessId: null, processStepId: null, businessActionId: "action-1", businessEntityId: null,
  provenance: { method: "rule", sourceEventIds: ["event-1"], knowledgeEntryId: "rule-1",
    knowledgeReleaseId: "release-1", ruleVersion: "1" },
  confidence: { score: 0.8, method: "legacy-rule-score", calibrationVersion: null } });
let count = 0;
function test(name, run) {
  try { run(); count += 1; } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}
function check(mutate, code, context = recording) {
  const value = clone(fixture); mutate(value);
  const before = clone(value);
  const diagnostics = validateProcess(freeze(value), { recording: context });
  assert.ok(diagnostics.some(item => item.code === code), JSON.stringify(diagnostics));
  assert.deepEqual(value, before);
}
test("valid observed recording is accepted without warnings", () => {
  assert.deepEqual(validateProcess(freeze(clone(fixture)), { recording: freeze(clone(recording)) }), []);
});
test("schema export matches runtime schema", () => {
  assert.deepEqual(require("../src/engine/canonical-process.schema.json"), schema);
  assert.ok(Object.isFrozen(schema.properties.steps.items));
});
test("browser and Node use the same validator", () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../src/engine/canonical-process-schema.js"), "utf8"), context);
  // Construct data inside the browser realm, as real JSON.parse would do.
  context.fixtureText = JSON.stringify(fixture); context.recordingText = JSON.stringify(recording);
  const result = vm.runInContext("BCProcessSchema.validateProcess(JSON.parse(fixtureText), {recording: JSON.parse(recordingText)})", context);
  assert.equal(JSON.stringify(result), "[]");
});
test("future versions do not rewrite original data", () => check(p => { p.schemaVersion = 2; }, "process-unsupported-schema"));
test("missing required fields rejected", () => check(p => { delete p.steps[0].observation.valueRef; }, "process-required-field"));
test("wrong input types rejected without coercion", () => check(p => { p.steps[0].sequence = "1"; }, "process-invalid-type"));
test("empty identifiers rejected", () => check(p => { p.processId = "   "; }, "process-invalid-format"));
test("duplicate step IDs rejected", () => check(p => { p.steps.push({ ...clone(p.steps[0]), sequence: 2 }); }, "process-duplicate-id"));
test("duplicate event references rejected", () => check(p => { p.steps[0].sourceRefs.eventIds.push("event-1"); }, "process-duplicate-reference"));
test("duplicate recording event IDs rejected", () => check(() => {}, "process-duplicate-id", { ...recording, events: [...recording.events, ...recording.events] }));
test("dangling event references rejected", () => check(p => { p.steps[0].sourceRefs.eventIds = ["missing"]; }, "process-missing-event"));
test("dangling assets rejected", () => check(p => { p.steps[0].sourceRefs.assetIds = ["missing"]; }, "process-missing-asset"));
test("recording identity verified", () => check(p => { p.recordingRef.recordingId = "other"; }, "process-recording-mismatch"));
test("recording revision verified", () => check(p => { p.recordingRef.revisionId = "other"; }, "process-recording-revision-mismatch"));
test("missing context never implies verified references", () => {
  assert.ok(validateProcess(fixture).some(d => d.code === "process-recording-not-checked" && d.severity === "warning"));
});
test("invalid recording context returns diagnostic", () => check(() => {}, "process-invalid-recording-context", null));
test("observed steps require source evidence", () => check(p => { p.steps[0].sourceRefs.eventIds = []; }, "process-observation-without-source"));
test("manual steps require change reference", () => check(p => { p.steps[0].origin = "manual"; }, "process-manual-change-required"));
test("manual steps need no fabricated events", () => {
  const p = clone(fixture), s = p.steps[0];
  s.origin = "manual"; s.sourceRefs.eventIds = []; s.observation.valueRef = null; s.observation.previousValueRef = null;
  s.extensions["bc-process-studio"] = { manualChangeRef: { changeId: "change-1", revisionId: "review-1" } };
  assert.deepEqual(validateProcess(p, { recording }), []);
});
test("false zero empty and null remain distinct and addressable", () => {
  for (const key of ["value", "previousValue", "empty", "nil", "a~1b~0c/0"]) {
    const p = clone(fixture); p.steps[0].observation.valueRef.pointer = `/raw/${key}`;
    assert.deepEqual(validateProcess(p, { recording }), []);
  }
});
test("missing value is not equivalent to null", () => check(p => { p.steps[0].observation.valueRef.pointer = "/raw/missing"; }, "process-missing-value"));
test("malformed JSON Pointer rejected", () => check(p => { p.steps[0].observation.valueRef.pointer = "/raw/~2"; }, "process-invalid-shape"));
test("prototype and array metadata cannot be referenced", () => {
  for (const pointer of ["/raw/__proto__", "/raw/a~1b~0c/length", "/raw/a~1b~0c/00"]) {
    check(p => { p.steps[0].observation.valueRef.pointer = pointer; }, "process-missing-value");
  }
});
test("success requires result evidence", () => check(p => { p.steps[0].observation.result.status = "observed-success"; }, "process-result-without-evidence"));
test("valid reference alone is not verified business success", () => check(p => {
  p.steps[0].observation.result = { status: "observed-success", evidenceEventIds: ["event-1"], messageRef: null };
}, "process-result-semantics-not-checked"));
test("outcome evidence must belong to the step", () => check(p => {
  p.steps[0].observation.result.evidenceEventIds = ["unrelated"];
}, "process-event-outside-step", { ...recording, events: [...recording.events, { id: "unrelated" }] }));
test("resolved candidate must exist", () => check(p => { p.steps[0].interpretation.status = "resolved"; }, "process-selected-candidate-missing"));
test("ambiguity needs two candidates", () => check(p => { p.steps[0].interpretation.status = "ambiguous"; }, "process-ambiguity-needs-candidates"));
test("conflicting candidates are retained without selection", () => {
  const p = clone(fixture); p.derivation.knowledgeReleaseId = "release-1";
  p.steps[0].interpretation = { status: "ambiguous", selectedCandidateId: null, candidates: [candidate("c1"), candidate("c2")] };
  assert.ok(!validateProcess(p, { recording }).some(d => d.severity === "error"));
  assert.equal(p.steps[0].interpretation.candidates.length, 2);
});
test("out of range confidence is not clamped", () => check(p => {
  const c = candidate("c1"); c.confidence.score = 1.1; p.steps[0].interpretation.candidates = [c];
}, "process-invalid-shape"));
test("rule provenance is mandatory", () => check(p => {
  const c = candidate("c1"); c.provenance.ruleVersion = null; p.steps[0].interpretation.candidates = [c];
}, "process-rule-provenance-required"));
test("mixed knowledge releases rejected", () => check(p => { p.steps[0].interpretation.candidates = [candidate("c1")]; }, "process-knowledge-release-mismatch"));
test("dangling relation endpoint rejected", () => check(p => {
  p.relations = [{ relationId: "r1", fromStepId: "step-1", toStepId: "missing", type: "sequence", basis: "observed", sourceEventIds: ["event-1"], conditionRef: null }];
}, "process-missing-step"));
test("return relations can form cycles", () => {
  const p = clone(fixture); p.steps.push({ ...clone(p.steps[0]), stepId: "step-2", sequence: 2 });
  p.relations = [{ relationId: "r1", fromStepId: "step-1", toStepId: "step-2", type: "sequence", basis: "observed", sourceEventIds: ["event-1"], conditionRef: null },
    { relationId: "r2", fromStepId: "step-2", toStepId: "step-1", type: "return", basis: "observed", sourceEventIds: ["event-1"], conditionRef: null }];
  assert.deepEqual(validateProcess(p, { recording }), []);
});
test("unknown properties and extensions survive validation", () => {
  const p = clone(fixture); p.vendorFutureField = { enabled: false }; p.extensions.vendor = { version: 7 };
  const before = clone(p); assert.deepEqual(validateProcess(freeze(p), { recording }), []); assert.deepEqual(p, before);
});
test("diagnostics do not echo captured customer values", () => {
  const p = clone(fixture); p.steps[0].sequence = "SECRET-CUSTOMER";
  assert.ok(!JSON.stringify(validateProcess(p, { recording })).includes("SECRET-CUSTOMER"));
});
test("non JSON input cannot silently lose data", () => {
  for (const value of [NaN, Infinity, undefined, 1n, new Date()]) {
    const p = clone(fixture); p.extensions.bad = value;
    assert.ok(validateProcess(p).some(d => d.code === "process-non-json-value"));
  }
  const p = clone(fixture); p.extensions.self = p;
  assert.ok(validateProcess(p).some(d => d.code === "process-cyclic-data"));
});
test("every registered language preserves captured labels and IDs", () => {
  const languages = require("../src/engine/language-registry").languages;
  for (const language of languages) {
    const p = clone(fixture); p.context.sourceLanguage = language.locale;
    p.steps[0].target.capturedCaption = `${language.nativeName}: Åäö é ø — 品名`;
    const before = clone(p);
    assert.deepEqual(validateProcess(freeze(p), { recording }), []);
    assert.deepEqual(p, before);
  }
});
console.log(`Canonical Process schema: ${count} behavioral tests passed.`);
