(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessQualityGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const GUARD_VERSION = "1.0.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const freeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value);
  };
  const normalized = value => String(value ?? "").normalize("NFKC")
    .replace(/\s+/gu, " ").trim().toLocaleLowerCase();
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const result = (code, severity, subjectType, subjectId, evidenceRefs, details = {}) =>
    ({ code, severity, subjectType, subjectId: String(subjectId || ""),
      evidenceRefs: unique(evidenceRefs), details: clone(details),
      provenance: { authorship: "derived", guardVersion: GUARD_VERSION } });

  function evaluate(input = {}) {
    const tasks = input.businessTasks || [];
    const groups = input.stepGroups || [];
    const normalizedEvents = input.normalizedEvents || [];
    const groupById = new Map(groups.map(group => [String(group.stepGroupId), group]));
    const findings = [];
    tasks.forEach(task => {
      const taskId = String(task.taskId || "");
      const sourceEventIds = unique(task.sourceEventIds);
      if (normalizedEvents.length && !sourceEventIds.length) findings.push(result(
        "BCPS-PROCESS-GUARD-TRACE-001", "block", "task", taskId,
        unique(task.stepGroupIds), { invariant: "canonical-source-required" }));
      const action = task.semanticActionModel || {};
      const capturedField = normalized(action.targetField);
      const projectedField = normalized(task.fieldCaption);
      if (capturedField && projectedField && capturedField !== projectedField) {
        findings.push(result("BCPS-PROCESS-GUARD-FIELD-001", "block", "task",
          taskId, sourceEventIds, { invariant: "captured-field-preserved" }));
      }
      const capturedValue = normalized(action.selectedValue);
      const projectedValue = normalized(task.selectedCaption ?? task.value);
      if (capturedValue && projectedValue && capturedValue !== projectedValue) {
        findings.push(result("BCPS-PROCESS-GUARD-VALUE-001", "block", "task",
          taskId, sourceEventIds, { invariant: "captured-value-preserved" }));
      }
      unique(task.stepGroupIds).forEach(groupId => {
        const group = groupById.get(groupId);
        if (!group) return;
        const kinds = unique((group.normalizedEvents || []).map(event => event.kind));
        if (kinds.length && kinds.every(kind => ["status-message", "dialog-open",
          "dialog-close"].includes(kind))) findings.push(result(
          "BCPS-PROCESS-GUARD-RESULT-001", "block", "step-group", groupId,
          group.sourceEventIds, { invariant: "result-only-group-cannot-produce-step" }));
        const interactions = unique(group.interactionIds);
        const reasons = new Set(group.groupingReason || []);
        const allowedRelation = ["confirmation-dialog", "confirmed-action",
          "observed-action-result", "lookup-supporting-mechanic",
          "resulting-control-value-match", "recorder-interaction-id"]
          .some(reason => reasons.has(reason));
        if (interactions.length > 1 && !allowedRelation) findings.push(result(
          "BCPS-PROCESS-GUARD-MERGE-001", "review", "step-group", groupId,
          group.sourceEventIds, { invariant: "multi-interaction-merge-needs-relation",
            interactionCount: interactions.length }));
      });
    });
    const blocked = findings.filter(item => item.severity === "block").length;
    const review = findings.filter(item => item.severity === "review").length;
    return freeze({ guardVersion: GUARD_VERSION, findings,
      status: blocked ? "blocked" : review ? "review-required" : "passed",
      counts: { blocked, review, total: findings.length } });
  }
  return { GUARD_VERSION, evaluate };
});
