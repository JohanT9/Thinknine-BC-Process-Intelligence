"use strict";

const grouping = require("../src/engine/event-step-grouping");

const SUITE_VERSION = "1.0.0";
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
};

function issue(sampleId, code, details = {}) {
  return freeze({ sampleId, code, details: clone(details) });
}

function evaluateSample(sample) {
  const before = JSON.stringify(sample.recording);
  const first = grouping.group(sample.recording);
  const second = grouping.group(clone(sample.recording));
  const issues = [];
  const expected = sample.expected || {};
  const kinds = first.groups.map(group => group.groupKind);

  if (JSON.stringify(first) !== JSON.stringify(second)) {
    issues.push(issue(sample.id, "non-deterministic-output"));
  }
  if (JSON.stringify(sample.recording) !== before) {
    issues.push(issue(sample.id, "input-evidence-mutated"));
  }
  if (Number.isInteger(expected.groupCount) &&
      first.groups.length !== expected.groupCount) {
    issues.push(issue(sample.id, "unexpected-group-count", {
      expected: expected.groupCount, actual: first.groups.length }));
  }
  if (Array.isArray(expected.groupKinds) &&
      JSON.stringify(kinds) !== JSON.stringify(expected.groupKinds)) {
    issues.push(issue(sample.id, "unexpected-group-kinds", {
      expected: expected.groupKinds, actual: kinds }));
  }
  if (first.diagnostics.unassignedMeaningfulEventIds.length) {
    issues.push(issue(sample.id, "unassigned-meaningful-events", {
      eventIds: first.diagnostics.unassignedMeaningfulEventIds }));
  }
  if (!first.diagnostics.capturePacketValid) {
    issues.push(issue(sample.id, "invalid-capture-packet", {
      diagnostics: first.diagnostics.capturePacketDiagnostics }));
  }
  const sourceIds = new Set(sample.recording.events.flatMap(event =>
    event.sourceEventIds || [event.sourceEventId]).filter(Boolean).map(String));
  const assigned = first.groups.flatMap(group => group.sourceEventIds);
  const unknownAssigned = [...new Set(assigned.filter(id => !sourceIds.has(String(id))))];
  if (unknownAssigned.length) issues.push(issue(sample.id,
    "unknown-source-trace", { sourceEventIds: unknownAssigned }));
  const duplicated = assigned.filter((id, index) => assigned.indexOf(id) !== index);
  if (duplicated.length) issues.push(issue(sample.id,
    "duplicate-source-ownership", { sourceEventIds: [...new Set(duplicated)] }));
  if (expected.completePackets === true && first.groups.some(group =>
    group.capturePacket.completeness !== "complete")) {
    issues.push(issue(sample.id, "incomplete-capture-packet", {
      stepGroupIds: first.groups.filter(group =>
        group.capturePacket.completeness !== "complete")
        .map(group => group.stepGroupId) }));
  }

  return freeze({ sampleId: sample.id, surface: sample.surface,
    groupCount: first.groups.length, packetCount: first.groups.length,
    completePacketCount: first.groups.filter(group =>
      group.capturePacket.completeness === "complete").length,
    integrityErrorCount: first.diagnostics.capturePacketDiagnostics.filter(item =>
      item.severity === "error").length,
    sourceEventCount: sourceIds.size, assignedSourceEventCount: assigned.length,
    valid: issues.length === 0, issues });
}

function evaluate(corpus, options = {}) {
  const samples = Array.isArray(corpus?.samples) ? corpus.samples : [];
  const results = samples.map(evaluateSample);
  const surfaces = [...new Set(samples.map(sample => sample.surface).filter(Boolean))];
  const totals = results.reduce((value, result) => ({
    groups: value.groups + result.groupCount,
    packets: value.packets + result.packetCount,
    completePackets: value.completePackets + result.completePacketCount,
    integrityErrors: value.integrityErrors + result.integrityErrorCount,
    sourceEvents: value.sourceEvents + result.sourceEventCount,
    assignedSourceEvents: value.assignedSourceEvents + result.assignedSourceEventCount
  }), { groups: 0, packets: 0, completePackets: 0, integrityErrors: 0,
    sourceEvents: 0, assignedSourceEvents: 0 });
  const thresholds = { minimumSamples: options.minimumSamples ?? 1,
    minimumSurfaces: options.minimumSurfaces ?? 1,
    minimumPackets: options.minimumPackets ?? 1 };
  const gateIssues = [];
  if (samples.length < thresholds.minimumSamples) gateIssues.push(issue("suite",
    "insufficient-sample-coverage", { expected: thresholds.minimumSamples,
      actual: samples.length }));
  if (surfaces.length < thresholds.minimumSurfaces) gateIssues.push(issue("suite",
    "insufficient-surface-coverage", { expected: thresholds.minimumSurfaces,
      actual: surfaces.length }));
  if (totals.packets < thresholds.minimumPackets) gateIssues.push(issue("suite",
    "insufficient-packet-coverage", { expected: thresholds.minimumPackets,
      actual: totals.packets }));
  const issues = [...results.flatMap(result => result.issues), ...gateIssues];
  return freeze({ suiteVersion: SUITE_VERSION,
    corpusVersion: corpus?.schemaVersion || null,
    valid: issues.length === 0, samples: samples.length, surfaces,
    totals, thresholds, results, issues });
}

function assertValid(corpus, options) {
  const report = evaluate(corpus, options);
  if (!report.valid) {
    const error = new Error("Capture validation suite failed.");
    error.code = "CAPTURE_VALIDATION_FAILED";
    error.report = report;
    throw error;
  }
  return report;
}

module.exports = { SUITE_VERSION, assertValid, evaluate };
