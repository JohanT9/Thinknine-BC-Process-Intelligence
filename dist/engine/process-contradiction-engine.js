(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessContradictionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ENGINE_VERSION = "1.0.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const freeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value);
  };
  const clean = value => String(value ?? "").normalize("NFKC")
    .replace(/\s+/gu, " ").trim().toLocaleLowerCase();
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const finding = (code, severity, taskId, evidenceRefs, invariant) => ({
    code, severity, subjectType: "task", subjectId: String(taskId || ""),
    evidenceRefs: unique(evidenceRefs), details: { invariant },
    provenance: { authorship: "derived", engineVersion: ENGINE_VERSION } });
  const language = value => {
    const normalized = String(value || "").trim();
    return /^[a-z]{2}(?:-[A-Z]{2})?$/u.test(normalized) ? normalized : null;
  };

  function analyze(input = {}) {
    const tasks = input.businessTasks || [];
    const groups = input.stepGroups || [];
    const groupById = new Map(groups.map(group => [String(group.stepGroupId), group]));
    const findings = [];
    tasks.forEach(task => {
      const action = task.semanticActionModel || {};
      const taskId = String(task.taskId || "");
      const refs = unique(task.sourceEventIds);
      const comparisons = [
        ["BCPS-PROCESS-CONFLICT-FIELD-001", "captured-field-conflicts-with-output",
          action.targetField, task.fieldCaption],
        ["BCPS-PROCESS-CONFLICT-VALUE-001", "captured-value-conflicts-with-output",
          action.selectedValue, task.selectedCaption ?? task.value],
        ["BCPS-PROCESS-CONFLICT-ACTION-001", "captured-action-conflicts-with-output",
          action.actionCaption, task.actionCaption]
      ];
      comparisons.forEach(([code, invariant, captured, projected]) => {
        if (clean(captured) && clean(projected) && clean(captured) !== clean(projected)) {
          findings.push(finding(code, "block", taskId, refs, invariant));
        }
      });
      const groupIds = unique(task.stepGroupIds);
      const allowedEvents = new Set(groupIds.flatMap(id =>
        groupById.get(id)?.sourceEventIds || []));
      if (groupIds.length && refs.some(id => !allowedEvents.has(id))) {
        findings.push(finding("BCPS-PROCESS-CONFLICT-EVIDENCE-001", "block",
          taskId, refs, "task-evidence-must-belong-to-source-groups"));
      }
      const expectedScreenshot = String(action.preferredScreenshotRef || "");
      const actualScreenshot = String(task.screenshot || "");
      if (expectedScreenshot && actualScreenshot &&
          expectedScreenshot !== actualScreenshot) findings.push(finding(
        "BCPS-PROCESS-CONFLICT-SCREENSHOT-001", "review", taskId, refs,
        "selected-screenshot-differs-from-semantic-preference"));
      const selected = clean(action.selectedValue);
      const instruction = clean(task.instruction);
      if (selected && instruction && !instruction.includes(selected)) {
        findings.push(finding("BCPS-PROCESS-CONFLICT-INSTRUCTION-001", "review",
          taskId, refs, "instruction-does-not-contain-captured-value"));
      }
      const observedLanguage = language(action.observedLanguage ||
        action.pageIdentification?.language);
      const generatedLanguage = language(task.generatedLanguage);
      if (observedLanguage && generatedLanguage &&
          observedLanguage !== generatedLanguage &&
          input.languagePolicy === "preserve-observed") findings.push(finding(
        "BCPS-PROCESS-CONFLICT-LANGUAGE-001", "block", taskId, refs,
        "generated-language-conflicts-with-observed-language"));
    });
    const blocked = findings.filter(item => item.severity === "block").length;
    const review = findings.filter(item => item.severity === "review").length;
    const hasLanguageEvidence = tasks.some(task => language(
      task.generatedLanguage) && language(task.semanticActionModel?.observedLanguage ||
        task.semanticActionModel?.pageIdentification?.language));
    return freeze({ engineVersion: ENGINE_VERSION, findings,
      status: blocked ? "blocked" : review ? "review-required" : "passed",
      counts: { blocked, review, total: findings.length },
      languageAssessment: hasLanguageEvidence ? "evaluated" : "insufficient-evidence" });
  }
  return { ENGINE_VERSION, analyze };
});
