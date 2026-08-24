(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportCompleteness = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function evaluate(report = {}, errorEvidence = []) {
    const visibleSteps = (report.reproduction?.steps || []).filter(step =>
      step.visibility !== "hidden");
    const actual = report.actualResult?.human?.text?.trim() ||
      errorEvidence.some(item => item.rawMessage?.trim());
    const required = [
      ["missing-title", !report.summary?.title?.trim(), "Add a report title."],
      ["missing-reproduction", !visibleSteps.length, "Add at least one visible reproduction step."],
      ["missing-actual-result", !actual, "Describe the actual result or capture a BC error."]
    ];
    const recommended = [
      ["missing-expected-result", !report.expectedResult?.text?.trim(), "Add the expected result."],
      ["no-captured-error", !errorEvidence.length, "No Business Central error was captured."],
      ["error-screenshot-unavailable", errorEvidence.length && !errorEvidence.some(
        item => item.errorScreenshotAssetId), "No dedicated error screenshot is available."],
      ["diagnostics-unavailable", errorEvidence.length && !errorEvidence.some(
        item => item.rawDiagnostics), "Business Central did not provide observable diagnostics."],
      ["call-stack-unavailable", errorEvidence.length && !errorEvidence.some(
        item => item.rawCallStack), "No AL call stack is available."]
    ];
    const issues = [...required.filter(item => item[1]).map(item => ({
      code: item[0], level: "required", message: item[2]
    })), ...recommended.filter(item => item[1]).map(item => ({
      code: item[0], level: "recommended", message: item[2]
    }))];
    return { ready: !issues.some(item => item.level === "required"), issues };
  }
  return { evaluate };
});
