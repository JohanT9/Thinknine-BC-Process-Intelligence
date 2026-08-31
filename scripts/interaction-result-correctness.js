"use strict";

const grouping = require("../src/engine/event-step-grouping");

const CORRECTNESS_VERSION = "1.0.0";
const freeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const problem = (scenarioId, code, expected, actual) => freeze({
  scenarioId, code, expected, actual
});

function evaluateScenario(scenario) {
  const grouped = grouping.group(scenario.recording);
  const expectedGroups = scenario.expected?.groups || [];
  const problems = [];
  if (grouped.groups.length !== expectedGroups.length) problems.push(problem(
    scenario.id, "unexpected-group-count", expectedGroups.length,
    grouped.groups.length));

  expectedGroups.forEach((expected, index) => {
    const group = grouped.groups[index];
    if (!group) return;
    const packet = group.capturePacket;
    const verification = packet.resultVerification;
    for (const [code, actual, wanted] of [
      ["interaction-owner-mismatch", packet.interactionId,
        expected.interactionId ?? null],
      ["interaction-events-mismatch", packet.interactionEventIds,
        expected.interactionEventIds || []],
      ["result-events-mismatch", packet.resultEventIds,
        expected.resultEventIds || []],
      ["result-status-mismatch", verification.status, expected.status],
      ["primary-outcome-mismatch", verification.primaryOutcome,
        expected.primaryOutcome ?? null],
      ["primary-outcome-event-mismatch", verification.primaryOutcomeEventId,
        expected.primaryOutcomeEventId ?? null],
      ["outcome-order-mismatch", verification.outcomes.map(item => item.kind),
        expected.outcomeKinds || []],
      ["preferred-screenshot-mismatch", packet.preferredScreenshotAssetId,
        expected.preferredScreenshotAssetId ?? null],
      ["preferred-screenshot-role-mismatch", packet.preferredScreenshotRole,
        expected.preferredScreenshotRole ?? null]
    ]) if (!same(actual, wanted)) problems.push(problem(scenario.id, code,
      wanted, actual));
  });

  const supportingIds = grouped.supportingEvents.map(item =>
    item.normalizedEventId).filter(Boolean);
  if (!same(supportingIds, scenario.expected?.supportingEventIds || [])) {
    problems.push(problem(scenario.id, "supporting-events-mismatch",
      scenario.expected?.supportingEventIds || [], supportingIds));
  }
  if (!grouped.diagnostics.capturePacketValid) problems.push(problem(
    scenario.id, "capture-packet-integrity-failed", [],
    grouped.diagnostics.capturePacketDiagnostics));

  return freeze({ scenarioId: scenario.id, surface: scenario.surface,
    valid: problems.length === 0, groupCount: grouped.groups.length,
    verifiedCount: grouped.groups.filter(group =>
      group.capturePacket.resultVerification.status === "verified").length,
    errorCount: grouped.groups.filter(group =>
      group.capturePacket.resultVerification.status === "error").length,
    unverifiedCount: grouped.groups.filter(group =>
      group.capturePacket.resultVerification.status === "unverified").length,
    problems });
}

function evaluate(corpus, options = {}) {
  const scenarios = Array.isArray(corpus?.scenarios) ? corpus.scenarios : [];
  const results = scenarios.map(evaluateScenario);
  const surfaces = [...new Set(scenarios.map(item => item.surface).filter(Boolean))];
  const totals = results.reduce((sum, item) => ({
    groups: sum.groups + item.groupCount,
    verified: sum.verified + item.verifiedCount,
    errors: sum.errors + item.errorCount,
    unverified: sum.unverified + item.unverifiedCount
  }), { groups: 0, verified: 0, errors: 0, unverified: 0 });
  const thresholds = {
    minimumScenarios: options.minimumScenarios ?? 1,
    minimumVerified: options.minimumVerified ?? 1,
    minimumErrors: options.minimumErrors ?? 0,
    minimumUnverified: options.minimumUnverified ?? 0,
    minimumSurfaces: options.minimumSurfaces ?? 1
  };
  const problems = results.flatMap(item => item.problems);
  if (scenarios.length < thresholds.minimumScenarios) problems.push(problem(
    "suite", "insufficient-scenario-coverage", thresholds.minimumScenarios,
    scenarios.length));
  if (totals.verified < thresholds.minimumVerified) problems.push(problem(
    "suite", "insufficient-verified-coverage", thresholds.minimumVerified,
    totals.verified));
  if (totals.errors < thresholds.minimumErrors) problems.push(problem(
    "suite", "insufficient-error-coverage", thresholds.minimumErrors,
    totals.errors));
  if (totals.unverified < thresholds.minimumUnverified) problems.push(problem(
    "suite", "insufficient-unverified-coverage", thresholds.minimumUnverified,
    totals.unverified));
  if (surfaces.length < thresholds.minimumSurfaces) problems.push(problem(
    "suite", "insufficient-surface-coverage", thresholds.minimumSurfaces,
    surfaces.length));
  return freeze({ correctnessVersion: CORRECTNESS_VERSION,
    corpusVersion: corpus?.schemaVersion || null, valid: problems.length === 0,
    scenarios: scenarios.length, surfaces, totals, thresholds, results, problems });
}

function assertValid(corpus, options) {
  const report = evaluate(corpus, options);
  if (!report.valid) {
    const error = new Error("Interaction to result correctness failed.");
    error.code = "INTERACTION_RESULT_CORRECTNESS_FAILED";
    error.report = report;
    throw error;
  }
  return report;
}

module.exports = { CORRECTNESS_VERSION, assertValid, evaluate };
