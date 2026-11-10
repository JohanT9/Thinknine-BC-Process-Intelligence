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
  // Screenshots the tester took of Business Central for a step. The images are stored
  // apart from the run; the step lists them in the order they were taken.
  const MAX_SCREENSHOTS_PER_STEP = 10;
  const SCREENSHOT_ID = /^shot-[a-z0-9-]{1,64}$/u;
  // Test data the steps work with, such as a customer or an item, written by the tester. An
  // expected result can name a value as {Name}; the name is matched without regard to case.
  const MAX_TEST_DATA = 30;
  function normalizeTestData(value) {
    return (Array.isArray(value) ? value : []).map(item => ({ name: text(item?.name),
      value: text(item?.value) })).slice(0, MAX_TEST_DATA);
  }
  // The rows that say something; an empty row is kept only while the tester fills it in.
  function filledTestData(value) {
    return normalizeTestData(value).filter(item => item.name.trim() || item.value.trim());
  }
  function resolveText(value, testData = []) {
    const known = new Map(normalizeTestData(testData).filter(item => item.name.trim())
      .map(item => [item.name.trim().toLocaleLowerCase(), item.value]));
    return text(value).replace(/\{([^{}\n]{1,60})\}/gu, (match, name) =>
      known.has(name.trim().toLocaleLowerCase()) ? known.get(name.trim().toLocaleLowerCase()) : match);
  }
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
      bugReportId: value.bugReportId ? String(value.bugReportId) : null,
      screenshots: (Array.isArray(value.screenshots) ? value.screenshots : [])
        .filter(shot => SCREENSHOT_ID.test(String(shot?.screenshotId || "")))
        .map(shot => ({ ...clone(shot), screenshotId: String(shot.screenshotId),
          capturedAt: text(shot.capturedAt) })) };
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
    result.prerequisites = text(result.prerequisites);
    result.testData = normalizeTestData(result.testData);
    result.steps = (Array.isArray(result.steps) ? result.steps : []).map(normalizeStep);
    return result;
  }

  // The tester's name and the environment tested, such as the Business Central version.
  function update(run, patch = {}, now) {
    const result = normalize(run);
    if (typeof patch.tester === "string") result.tester = patch.tester;
    if (typeof patch.environment === "string") result.environment = patch.environment;
    if (typeof patch.prerequisites === "string") result.prerequisites = patch.prerequisites;
    if (Array.isArray(patch.testData)) result.testData = normalizeTestData(patch.testData);
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

  // Changes from the run's pages, applied to the stored run one at a time so that two pages
  // open on the same run (the full page and the panel beside Business Central) never undo
  // each other's changes: { run: { tester, environment }, steps: [{ stepId, patch }] }.
  function applyChanges(run, changes = {}, now) {
    let result = normalize(run);
    if (changes.run) result = update(result, changes.run, now);
    for (const change of Array.isArray(changes.steps) ? changes.steps : []) {
      const { screenshots, ...patch } = change?.patch || {};
      result = updateStep(result, change?.stepId, patch, now);
    }
    return result;
  }

  function addScreenshot(run, stepId, shot, now) {
    const result = normalize(run);
    const step = result.steps.find(item => item.stepId === String(stepId || ""));
    if (!step) throw new TypeError("Test step was not found.");
    if (!SCREENSHOT_ID.test(String(shot?.screenshotId || ""))) {
      throw new TypeError("Invalid test screenshot id.");
    }
    if (step.screenshots.length >= MAX_SCREENSHOTS_PER_STEP) throw new Error("test.screenshotLimit");
    step.screenshots.push({ screenshotId: shot.screenshotId, capturedAt: text(shot.capturedAt) });
    result.updatedAt = now || result.updatedAt;
    return normalize(result);
  }

  function removeScreenshot(run, stepId, screenshotId, now) {
    const result = normalize(run);
    const step = result.steps.find(item => item.stepId === String(stepId || ""));
    if (!step) throw new TypeError("Test step was not found.");
    step.screenshots = step.screenshots.filter(shot => shot.screenshotId !== String(screenshotId));
    result.updatedAt = now || result.updatedAt;
    return normalize(result);
  }

  function screenshotIds(run) {
    return normalize(run).steps.flatMap(step => step.screenshots.map(shot => shot.screenshotId));
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
    if (!result.prerequisites.trim()) result.prerequisites = earlier.prerequisites;
    if (!filledTestData(result.testData).length) result.testData = filledTestData(earlier.testData);
    return normalize(result);
  }

  // A new run of the same test: the same steps and expected results, nothing tested yet.
  function rerun(run, options = {}) {
    const value = normalize(run);
    const now = options.now || new Date().toISOString();
    return normalize({ ...value, testRunId: String(options.testRunId || ""), createdAt: now,
      updatedAt: now, environment: "", steps: value.steps.map(step => ({ ...step,
        status: "not-run", comment: "", bugReportId: null, screenshots: [] })) });
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
      screenshotIds: step.screenshots.map(shot => shot.screenshotId),
      environment: value.environment, source: { kind: "test-run", testRunId: value.testRunId,
        stepId: step.stepId, stepNumber: step.number } };
  }

  // The labels a file of the run uses, with the counts filled in.
  function countsText(total, label) {
    return label("test.counts").replace("{passed}", total.passed).replace("{failed}", total.failed)
      .replace("{skipped}", total.skipped).replace("{notRun}", total.notRun);
  }

  // The run as a table for Excel: one row per step. A comma separates the columns for an
  // English document and a semicolon otherwise, as Excel expects in those languages; the
  // byte order mark makes Excel read the text as UTF-8.
  function csv(run, label) {
    const value = normalize(run);
    const separator = value.documentLanguage.startsWith("en") ? "," : ";";
    const cell = item => {
      const content = String(item ?? "").replace(/\r?\n/gu, " ");
      // A cell starting like a formula is kept as text.
      const safe = /^[=+\-@\t]/u.test(content) ? `'${content}` : content;
      return /[",;\n]/u.test(safe) ? `"${safe.replace(/"/gu, '""')}"` : safe;
    };
    const rows = [["#", label("test.section"), label("test.step"), label("test.expected"),
      label("test.result"), label("test.comment"), label("test.screenshots")]];
    value.steps.forEach(step => rows.push([step.number, step.heading, step.instruction,
      resolveText(step.expected, value.testData), label("test.status." + step.status), step.comment,
      step.screenshots.length]));
    return "\uFEFF" + rows.map(row => row.map(cell).join(separator)).join("\r\n") + "\r\n";
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
    if (value.prerequisites.trim()) {
      lines.push(`## ${label("test.prerequisites")}`, "", value.prerequisites.trim(), "");
    }
    if (filledTestData(value.testData).length) {
      lines.push(`## ${label("test.testData")}`, "");
      filledTestData(value.testData).forEach(item => lines.push(`- ${item.name}: ${item.value}`));
      lines.push("");
    }
    if (value.processExpectedResult) {
      lines.push(`## ${label("test.processExpected")}`, "", value.processExpectedResult, "");
    }
    lines.push(`| # | ${label("test.step")} | ${label("test.expected")} | ${label("test.result")} | ${label("test.comment")} |`,
      "|---|---|---|---|---|");
    value.steps.forEach(step => lines.push(`| ${step.number} | ${cell(step.instruction)} | ${
      cell(resolveText(step.expected, value.testData))} | ${label("test.status." + step.status)} | ${cell(step.comment)} |`));
    return lines.join("\n") + "\n";
  }

  return { SCHEMA_VERSION, STATUSES, MAX_SCREENSHOTS_PER_STEP, MAX_TEST_DATA, addScreenshot,
    applyChanges, bugReportContent, carryOver, countsText, create, csv, markdown, normalize,
    filledTestData, removeScreenshot, rerun, resolveText, screenshotIds, stepsFromDocument, summary, update,
    updateStep };
});
