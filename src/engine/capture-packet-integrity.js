(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CapturePacketIntegrity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.1.0";
  const ROLES = new Set(["interaction", "result", "supporting"]);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }
  function array(value) { return Array.isArray(value) ? value : []; }
  function unique(values) { return [...new Set(array(values).filter(Boolean).map(String))]; }
  function diagnostic(code, severity, message, details = {}) {
    return freeze({ code, severity, message, details: clone(details) });
  }
  function duplicates(values) {
    const seen = new Set();
    return unique(array(values).filter(value => {
      const key = String(value);
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    }));
  }
  function validate(packet, context = {}) {
    const diagnostics = [];
    if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
      diagnostics.push(diagnostic("capture-packet-missing", "error",
        "Capture Packet is missing or invalid."));
      return freeze({ version: VERSION, valid: false, diagnostics });
    }
    const events = array(context.events);
    const eventIds = events.map(event => String(event?.normalizedEventId || ""))
      .filter(Boolean);
    const sourceReferences = events.flatMap(event =>
      event?.sourceEventIds || [event?.sourceEventId]).filter(Boolean).map(String);
    const sourceEventIds = unique(sourceReferences);
    const knownEvents = new Set(eventIds);
    const knownSources = new Set(sourceEventIds);
    const interactionIds = unique(packet.interactionIds);
    const packetInteractionId = packet.interactionId == null
      ? null : String(packet.interactionId);

    if (duplicates(eventIds).length) diagnostics.push(diagnostic(
      "duplicate-normalized-event-reference", "error",
      "A normalized event occurs more than once in the Capture Packet context.",
      { eventIds: duplicates(eventIds) }));
    if (duplicates(sourceReferences).length) diagnostics.push(diagnostic(
      "duplicate-source-event-reference", "error",
      "A Canonical source event occurs in more than one packet evidence entry.",
      { sourceEventIds: duplicates(sourceReferences) }));
    if (interactionIds.length > 1) diagnostics.push(diagnostic(
      "conflicting-interaction-identities", "error",
      "A Capture Packet contains more than one recorder interaction identity.",
      { interactionIds }));
    if (interactionIds.length && !interactionIds.includes(packetInteractionId)) {
      diagnostics.push(diagnostic("interaction-identity-mismatch", "error",
        "Capture Packet interactionId does not match interactionIds.",
        { interactionId: packetInteractionId, interactionIds }));
    }
    if (!interactionIds.length && packetInteractionId) diagnostics.push(diagnostic(
      "interaction-identity-without-evidence", "error",
      "Capture Packet interactionId has no matching interactionIds evidence.",
      { interactionId: packetInteractionId }));
    if (!interactionIds.length) diagnostics.push(diagnostic(
      "compatibility-interaction-identity", "info",
      "Capture Packet uses deterministic compatibility grouping without recorder identity."));

    const interactionEventIds = array(packet.interactionEventIds).map(String);
    const resultEventIds = array(packet.resultEventIds).map(String);
    for (const [role, references] of [["interaction", interactionEventIds],
      ["result", resultEventIds]]) {
      const repeated = duplicates(references);
      if (repeated.length) diagnostics.push(diagnostic(
        `duplicate-${role}-event-reference`, "error",
        `Capture Packet repeats a ${role} event reference.`, { eventIds: repeated }));
      const unknown = unique(references.filter(id => !knownEvents.has(id)));
      if (unknown.length) diagnostics.push(diagnostic(
        `unknown-${role}-event-reference`, "error",
        `Capture Packet references ${role} events outside its evidence context.`,
        { eventIds: unknown }));
    }

    const positions = new Map(eventIds.map((id, index) => [id, index]));
    const lastInteraction = Math.max(-1, ...interactionEventIds
      .map(id => positions.get(id)).filter(Number.isInteger));
    const interactionAlsoRepresentsResult = resultEventIds.includes(
      String(packet.interactionEventId || ""));
    const earlyResults = interactionAlsoRepresentsResult ? [] : resultEventIds.filter(id =>
      Number.isInteger(positions.get(id)) && positions.get(id) < lastInteraction);
    if (earlyResults.length) diagnostics.push(diagnostic(
      "result-before-interaction", "error",
      "Capture Packet result evidence precedes its interaction evidence.",
      { eventIds: earlyResults }));

    const screenshotAssetIds = unique(packet.screenshotAssetIds);
    const screenshotAssets = new Set(screenshotAssetIds);
    const screenshotEvidence = array(packet.screenshotEvidence);
    screenshotEvidence.forEach((evidence, index) => {
      if (!screenshotAssets.has(String(evidence?.assetId || ""))) {
        diagnostics.push(diagnostic("unknown-screenshot-evidence-asset", "error",
          "Screenshot evidence references an asset outside the Capture Packet.",
          { index, assetId: evidence?.assetId || null }));
      }
      if (!knownEvents.has(String(evidence?.normalizedEventId || ""))) {
        diagnostics.push(diagnostic("unknown-screenshot-evidence-event", "error",
          "Screenshot evidence references an event outside the Capture Packet.",
          { index, normalizedEventId: evidence?.normalizedEventId || null }));
      }
      if (!ROLES.has(evidence?.role)) diagnostics.push(diagnostic(
        "invalid-screenshot-evidence-role", "error",
        "Screenshot evidence has an unsupported role.",
        { index, role: evidence?.role || null }));
    });
    if (packet.preferredScreenshotAssetId &&
        !screenshotAssets.has(String(packet.preferredScreenshotAssetId))) {
      diagnostics.push(diagnostic("unknown-preferred-screenshot", "error",
        "Preferred screenshot is not part of the Capture Packet.",
        { assetId: packet.preferredScreenshotAssetId }));
    }
    if (packet.preferredSourceEventId &&
        !knownSources.has(String(packet.preferredSourceEventId))) {
      diagnostics.push(diagnostic("unknown-preferred-source-event", "error",
        "Preferred screenshot source is outside the Capture Packet.",
        { sourceEventId: packet.preferredSourceEventId }));
    }

    const verification = packet.resultVerification || {};
    const verificationSources = unique(verification.sourceEventIds);
    const unknownVerificationSources = verificationSources.filter(id =>
      !knownSources.has(id));
    if (unknownVerificationSources.length) diagnostics.push(diagnostic(
      "unknown-result-source-reference", "error",
      "Result Verification references source evidence outside the Capture Packet.",
      { sourceEventIds: unknownVerificationSources }));
    const outcomes = array(verification.outcomes);
    const unknownOutcomeEvents = unique(outcomes.map(outcome =>
      outcome?.normalizedEventId).filter(id => !resultEventIds.includes(String(id))));
    if (unknownOutcomeEvents.length) diagnostics.push(diagnostic(
      "unknown-result-outcome-event", "error",
      "Result Verification outcome is outside the packet result evidence.",
      { eventIds: unknownOutcomeEvents }));
    if (verification.status === "unverified" && outcomes.length) {
      diagnostics.push(diagnostic("unverified-result-has-outcomes", "error",
        "Unverified Result Verification cannot contain observed outcomes."));
    }
    if (["verified", "error"].includes(verification.status) && !outcomes.length) {
      diagnostics.push(diagnostic("verified-result-without-outcome", "error",
        "Verified Result Verification requires at least one observed outcome."));
    }
    if (outcomes.length && !outcomes.some(outcome =>
      outcome?.kind === verification.primaryOutcome)) {
      diagnostics.push(diagnostic("primary-outcome-mismatch", "error",
        "Primary outcome is not represented by Result Verification outcomes.",
        { primaryOutcome: verification.primaryOutcome || null }));
    }
    const primaryOutcomeEventId = verification.primaryOutcomeEventId == null
      ? null : String(verification.primaryOutcomeEventId);
    const primaryOutcomes = outcomes.filter(outcome =>
      String(outcome?.normalizedEventId || "") === primaryOutcomeEventId);
    if (["verified", "error"].includes(verification.status) &&
        primaryOutcomes.length !== 1) diagnostics.push(diagnostic(
      "primary-outcome-event-mismatch", "error",
      "Verified Result Verification requires exactly one primary outcome event.",
      { primaryOutcomeEventId, matchCount: primaryOutcomes.length }));
    if (primaryOutcomes.length === 1 &&
        primaryOutcomes[0]?.kind !== verification.primaryOutcome) {
      diagnostics.push(diagnostic("primary-outcome-kind-mismatch", "error",
        "Primary outcome kind does not match its referenced outcome event.",
        { primaryOutcomeEventId, expected: primaryOutcomes[0]?.kind,
          actual: verification.primaryOutcome || null }));
    }
    if (verification.status === "unverified" && primaryOutcomeEventId) {
      diagnostics.push(diagnostic("unverified-primary-outcome-event", "error",
        "Unverified Result Verification cannot reference a primary outcome event.",
        { primaryOutcomeEventId }));
    }

    const stateObservation = packet.stateObservation;
    if (stateObservation) {
      const observationSources = unique([
        ...array(stateObservation.sourceEventIds),
        ...array(stateObservation.before?.facts).flatMap(item =>
          array(item?.sourceEventIds)),
        ...array(stateObservation.after?.facts).flatMap(item =>
          array(item?.sourceEventIds)),
        ...array(stateObservation.changes).flatMap(item =>
          array(item?.sourceEventIds))
      ]);
      const foreignSources = observationSources.filter(id =>
        !knownSources.has(id));
      if (foreignSources.length) diagnostics.push(diagnostic(
        "unknown-state-observation-source", "error",
        "State Observation references evidence outside the Capture Packet.",
        { sourceEventIds: foreignSources }));
      const observationEvents = unique([
        ...array(stateObservation.before?.facts).map(item =>
          item?.normalizedEventId),
        ...array(stateObservation.after?.facts).map(item =>
          item?.normalizedEventId)
      ]);
      const foreignEvents = observationEvents.filter(id =>
        !knownEvents.has(id));
      if (foreignEvents.length) diagnostics.push(diagnostic(
        "unknown-state-observation-event", "error",
        "State Observation references events outside the Capture Packet.",
        { eventIds: foreignEvents }));
      const changes = array(stateObservation.changes);
      if (changes.length && stateObservation.status !== "changed") {
        diagnostics.push(diagnostic("state-observation-status-mismatch", "error",
          "State Observation changes require changed status."));
      }
      if (!changes.length && stateObservation.status === "changed") {
        diagnostics.push(diagnostic("state-observation-change-missing", "error",
          "Changed State Observation requires an observed difference."));
      }
    }

    const expectedMissing = [];
    if (!packet.interactionEventId) expectedMissing.push("interaction");
    if (!resultEventIds.length) expectedMissing.push("result");
    if (!screenshotAssetIds.length) expectedMissing.push("screenshot");
    const actualMissing = unique(packet.missing).sort();
    if (JSON.stringify(actualMissing) !== JSON.stringify(expectedMissing.sort())) {
      diagnostics.push(diagnostic("packet-completeness-mismatch", "error",
        "Capture Packet completeness does not match its evidence roles.",
        { expectedMissing, actualMissing }));
    }
    const expectedCompleteness = expectedMissing.length ? "partial" : "complete";
    if (packet.completeness !== expectedCompleteness) diagnostics.push(diagnostic(
      "packet-completeness-status-mismatch", "error",
      "Capture Packet completeness status contradicts its evidence.",
      { expected: expectedCompleteness, actual: packet.completeness || null }));

    return freeze({ version: VERSION,
      valid: !diagnostics.some(item => item.severity === "error"), diagnostics });
  }
  function assertValid(packet, context) {
    const result = validate(packet, context);
    if (!result.valid) {
      const error = new Error("Capture Packet integrity validation failed.");
      error.code = "CAPTURE_PACKET_INTEGRITY_FAILED";
      error.diagnostics = result.diagnostics;
      throw error;
    }
    return result;
  }
  return { VERSION, assertValid, validate };
});
