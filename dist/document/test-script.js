(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TestScript = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // A manual test made from a process document: its steps as they read in the document, the
  // expected result the user wrote for each step, and one tester's result for each step. A
  // run keeps the steps it was made with, so a later run after an upgrade can be compared
  // with it, and the expected results are carried over to the next run.
  const SCHEMA_VERSION = 1;
  const STATUSES = Object.freeze(["not-run", "passed", "failed", "skipped"]);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => typeof value === "string" ? value : "";
  const blockText = block => text(block?.text).trim();

  // The steps of the document's workflow, in order, with the heading they are under. The
  // expected result starts from the verification notes written for the step; nothing is
  // added that the document does not say, so other steps start without one.
  function stepsFromDocument(document) {
    const workflow = (document?.sections || []).find(section => section.kind === "workflow");
    const steps = [];
    let heading = "";
    const visit = blocks => (blocks || []).forEach(block => {
      if (block.kind === "heading" && Number(block.level) >= 2) { heading = blockText(block); return; }
      if (block.kind !== "step") { visit(block.blocks); return; }
      const children = block.blocks || [];
      const instruction = blockText(children.find(child => child.kind === "paragraph" &&
        String(child.blockId || "").startsWith("block:instruction:")) ||
        children.find(child => child.kind === "paragraph"));
      const checks = children.filter(child => child.kind === "callout" &&
        child.calloutType === "verification")
        .map(child => (child.blocks || []).map(blockText).filter(Boolean).join(" "))
        .filter(Boolean);
      steps.push({ stepId: String(block.blockId || `step-${steps.length + 1}`),
        number: steps.length + 1, heading, instruction, expected: checks.join("\n"),
        status: "not-run", comment: "" });
    });
    visit(workflow?.blocks);
    return steps;
  }

  function create(document, options = {}) {
    const metadata = document?.metadata || {};
    const now = options.now || new Date().toISOString();
    const steps = stepsFromDocument(document);
    if (!steps.length) throw new TypeError("The document has no steps to test.");
    return normalize({ schemaVersion: SCHEMA_VERSION,
      testRunId: String(options.testRunId || ""), sessionId: String(options.sessionId ||
        metadata.sessionId || ""), title: text(options.title) || text(metadata.title),
      documentLanguage: text(metadata.documentLanguage) || "en-US",
      documentVersion: text(metadata.documentVersion),
      processExpectedResult: text(options.processExpectedResult).trim(),
      createdAt: now, updatedAt: now, tester: "", environment: "", steps });
  }

  function normalizeStep(value = {}, index = 0) {
    return { ...clone(value), stepId: String(value.stepId || `step-${index + 1}`),
      number: index + 1, heading: text(value.heading), instruction: text(value.instruction),
      expected: Array.isArray(value.expected) ? value.expected.map(text).filter(Boolean)
        .join("\n") : text(value.expected),
      status: STATUSES.includes(value.status) ? value.status : "not-run",
      comment: text(value.comment),
      bugReportId: value.bugReportId ? String(value.bugReportId) : null };
  }

  function normalize(input = {}) {
    const result = clone(input) || {};
    result.schemaVersion = Number(result.schemaVersion || SCHEMA_VERSION);
    if (result.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Unsupported test run schema: ${result.schemaVersion}`);
    }
    result.testRunId = String(result.testRunId || "");
    result.sessionId = String(result.sessionId || "");
    if (!result.testRunId || !result.sessionId) {
      throw new TypeError("A test run needs its own id and the recording it tests.");
    }
    result.title = text(result.title);
    result.documentLanguage = text(result.documentLanguage) || "en-US";
    result.tester = text(result.tester);
    result.environment = text(result.environment);
    result.processExpectedResult = text(result.processExpectedResult);
    result.steps = (Array.isArray(result.steps) ? result.steps : []).map(normalizeStep);
    return result;
  }

  // The tester's name and the environment tested, such as the Business Central version.
  function update(run, patch = {}, now) {
    const result = normalize(run);
    if (typeof patch.tester === "string") result.tester = patch.tester;
    if (typeof patch.environment === "string") result.environment = patch.environment;
    result.updatedAt = now || result.updatedAt;
    return normalize(result);
  }

  function updateStep(run, stepId, patch = {}, now) {
    const result = normalize(run);
    const step = result.steps.find(item => item.stepId === String(stepId || ""));
    if (!step) throw new TypeError("Test step was not found.");
    if (patch.status !== undefined) {
      if (!STATUSES.includes(patch.status)) throw new TypeError("Unknown test step status.");
      step.status = patch.status;
    }
    if (typeof patch.comment === "string") step.comment = patch.comment;
    if (typeof patch.expected === "string") step.expected = patch.expected;
    if (patch.bugReportId !== undefined) step.bugReportId = patch.bugReportId
      ? String(patch.bugReportId) : null;
    result.updatedAt = now || result.updatedAt;
    return normalize(result);
  }

  // Expected results written in an earlier run of the same document fill the steps that
  // have none, matched by the step's identity in the document.
  function carryOver(run, previous) {
    const result = normalize(run);
    if (!previous) return result;
    const earlier = normalize(previous);
    if (earlier.sessionId !== result.sessionId) return result;
    const expected = new Map(earlier.steps.filter(step => step.expected.trim())
      .map(step => [step.stepId, step.expected]));
    result.steps.forEach(step => {
      if (!step.expected.trim() && expected.has(step.stepId)) step.expected = expected.get(step.stepId);
    });
    if (!result.processExpectedResult.trim()) {
      result.processExpectedResult = earlier.processExpectedResult;
    }
    return normalize(result);
  }

  // A new run of the same test: the same steps and expected results, nothing tested yet.
  function rerun(run, options = {}) {
    const value = normalize(run);
    const now = options.now || new Date().toISOString();
    return normalize({ ...value, testRunId: String(options.testRunId || ""), createdAt: now,
      updatedAt: now, environment: "", steps: value.steps.map(step => ({ ...step,
        status: "not-run", comment: "", bugReportId: null })) });
  }

  // Passed only when every step passed or was deliberately skipped; failed as soon as one
  // step failed; otherwise still in progress.
  function summary(run) {
    const steps = normalize(run).steps;
    const count = status => steps.filter(step => step.status === status).length;
    const result = { total: steps.length, passed: count("passed"), failed: count("failed"),
      skipped: count("skipped"), notRun: count("not-run") };
    result.outcome = result.failed ? "failed" : result.notRun ? "in-progress" : "passed";
    return result;
  }

  // What a bug report from a failed step holds: the steps up to and including it as the
  // steps to reproduce, the step's expected result and the tester's comment as the actual
  // result. The texts are the document's and the user's own.
  function bugReportContent(run, stepId) {
    const value = normalize(run);
    const index = value.steps.findIndex(step => step.stepId === String(stepId || ""));
    if (index < 0) throw new TypeError("Test step was not found.");
    const step = value.steps[index];
    return { title: value.title, documentLanguage: value.documentLanguage,
      steps: value.steps.slice(0, index + 1).map(item => item.instruction).filter(Boolean),
      expectedResult: step.expected.trim(), actualResult: step.comment.trim(),
      environment: value.environment, source: { kind: "test-run", testRunId: value.testRunId,
        stepId: step.stepId, stepNumber: step.number } };
  }

  // The run as Markdown, with labels in the given language.
  function markdown(run, label) {
    const value = normalize(run);
    const total = summary(value);
    const cell = item => String(item || "").replace(/\|/gu, "\\|").replace(/\s*\n\s*/gu, " ");
    const lines = [`# ${label("test.scriptTitle")}: ${value.title}`, ""];
    if (value.tester) lines.push(`- ${label("test.tester")}: ${value.tester}`);
    if (value.environment) lines.push(`- ${label("test.environment")}: ${value.environment}`);
    lines.push(`- ${label("test.updated")}: ${value.updatedAt || value.createdAt || ""}`,
      `- ${label("test.outcome")}: ${label("test.outcome." + total.outcome)} (${label("test.counts")
        .replace("{passed}", total.passed).replace("{failed}", total.failed)
        .replace("{skipped}", total.skipped).replace("{notRun}", total.notRun)})`, "");
    if (value.processExpectedResult) {
      lines.push(`## ${label("test.processExpected")}`, "", value.processExpectedResult, "");
    }
    lines.push(`| # | ${label("test.step")} | ${label("test.expected")} | ${label("test.result")} | ${label("test.comment")} |`,
      "|---|---|---|---|---|");
    value.steps.forEach(step => lines.push(`| ${step.number} | ${cell(step.instruction)} | ${
      cell(step.expected)} | ${label("test.status." + step.status)} | ${cell(step.comment)} |`));
    return lines.join("\n") + "\n";
  }

  return { SCHEMA_VERSION, STATUSES, bugReportContent, carryOver, create, markdown, normalize,
    rerun, stepsFromDocument, summary, update, updateStep };
});
