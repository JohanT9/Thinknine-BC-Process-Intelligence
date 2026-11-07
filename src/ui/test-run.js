(() => {
  "use strict";
  // One run of a manual test made from a process document. Every change is saved
  // automatically; a failed step can become a bug report.
  const query = new URLSearchParams(location.search);
  const testRunId = query.get("testRunId");
  const script = globalThis.T9TestScript;
  const i18n = globalThis.T9UiI18n;
  const message = document.getElementById("runMessage");
  const stepList = document.getElementById("runSteps");
  let locale = i18n.DEFAULT_LOCALE;
  let run = null;
  const t = (key, values = {}) => Object.entries(values).reduce((value, [name, item]) =>
    value.replaceAll(`{${name}}`, String(item)), i18n.translate(key, locale));
  const send = payload => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (!response?.ok) reject(new Error(response?.error || "test.runNotFound"));
      else resolve(response);
    });
  });
  const errorText = error => t(String(error?.message || error));

  // Saving: changes wait briefly, are saved in order, and a failure keeps them on the page
  // with a way to try again.
  let saveState = "saved";
  let saveTimer = null;
  let saving = null;
  let revision = 0;
  function showSaveState() {
    const status = document.getElementById("saveState");
    status.dataset.state = saveState;
    status.textContent = t({ saved: "test.saved", saving: "test.saving",
      unsaved: "test.unsaved", failed: "test.saveFailed" }[saveState]);
    if (saveState === "failed") {
      const retry = document.createElement("button");
      retry.type = "button"; retry.textContent = t("test.retry");
      retry.addEventListener("click", () => { void save(); });
      status.append(" ", retry);
    }
  }
  async function save() {
    clearTimeout(saveTimer);
    if (saving) { await saving.catch(() => {}); if (saveState !== "unsaved" && saveState !== "failed") return; }
    const savingRevision = revision;
    saveState = "saving"; showSaveState();
    saving = send({ type: "T9_SAVE_TEST_RUN", run }).then(() => {
      saveState = revision === savingRevision ? "saved" : "unsaved";
    }, () => { saveState = "failed"; }).finally(() => { saving = null; showSaveState(); });
    await saving;
    if (saveState === "unsaved") await save();
  }
  async function flush() {
    clearTimeout(saveTimer);
    if (saveState === "unsaved" || saveState === "failed" || saving) await save();
    if (saveState === "failed") throw new Error("test.saveFailed");
  }
  function change(next) {
    run = next; revision += 1; saveState = "unsaved"; showSaveState(); showSummary();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void save(); }, 600);
  }
  window.addEventListener("beforeunload", event => {
    if (saveState !== "saved") { event.preventDefault(); event.returnValue = ""; }
  });

  function showSummary() {
    const total = script.summary(run);
    const summary = document.getElementById("runSummary");
    const outcome = document.createElement("strong");
    outcome.dataset.outcome = total.outcome;
    outcome.textContent = `${t("test.outcome")}: ${t("test.outcome." + total.outcome)}`;
    summary.replaceChildren(outcome, document.createTextNode(" "), element("span", "", t("test.counts", {
      passed: total.passed, failed: total.failed, skipped: total.skipped, notRun: total.notRun })));
  }

  const element = (tag, className = "", text = "") => {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text) value.textContent = text;
    return value;
  };
  function stepItem(step, previousHeading) {
    const item = element("li", "run-step");
    item.dataset.status = step.status;
    item.dataset.stepId = step.stepId;
    if (step.heading && step.heading !== previousHeading) {
      item.append(element("p", "run-step-heading", step.heading));
    }
    const heading = element("h3");
    heading.id = `step-title-${step.number}`;
    const instruction = element("span", "", step.instruction);
    instruction.lang = run.documentLanguage.split("-")[0];
    heading.append(element("span", "step-number", t("test.stepNumber", { n: step.number })),
      instruction);
    item.append(heading);
    const grid = element("div", "run-step-grid");
    const field = (key, value, onInput, help = "") => {
      const wrapper = element("div");
      const label = element("label", "", t(key));
      const input = element("textarea");
      input.id = `${key.replace(/\W/gu, "-")}-${step.number}`;
      label.htmlFor = input.id;
      input.value = value;
      input.setAttribute("aria-describedby", heading.id);
      input.addEventListener("input", () => onInput(input.value));
      wrapper.append(label, input);
      if (help) {
        const note = element("p", "field-help", help);
        note.id = `${input.id}-help`;
        input.setAttribute("aria-describedby", `${heading.id} ${note.id}`);
        wrapper.append(note);
      }
      return { wrapper, input };
    };
    const expected = field("test.expected", step.expected, value =>
      change(script.updateStep(run, step.stepId, { expected: value }, new Date().toISOString())));
    const comment = field("test.comment", step.comment, value =>
      change(script.updateStep(run, step.stepId, { comment: value }, new Date().toISOString())),
    step.status === "failed" ? t("test.failureHelp") : "");
    grid.append(expected.wrapper, comment.wrapper);
    item.append(grid);

    const status = element("fieldset", "run-status");
    status.append(element("legend", "", t("test.resultFor", { n: step.number })));
    const choices = element("div", "choices");
    for (const value of ["passed", "failed", "skipped", "not-run"]) {
      const label = element("label", "choice");
      const input = element("input");
      input.type = "radio"; input.name = `status-${step.number}`; input.value = value;
      input.checked = step.status === value;
      input.addEventListener("change", () => {
        change(script.updateStep(run, step.stepId, { status: value }, new Date().toISOString()));
        const replacement = stepItem(run.steps.find(entry => entry.stepId === step.stepId),
          previousHeading);
        item.replaceWith(replacement);
        replacement.querySelector(`input[value="${value}"]`)?.focus();
      });
      label.append(input, document.createTextNode(t("test.status." + value)));
      choices.append(label);
    }
    status.append(choices);
    item.append(status);

    if (step.bugReportId || step.status === "failed") {
      const actions = element("div", "run-step-report");
      if (step.bugReportId) {
        const open = element("button", "", t("test.openReport"));
        open.type = "button";
        open.addEventListener("click", async () => {
          try { await send({ type: "T9_OPEN_TECHNICAL_REPORT", bugReportId: step.bugReportId }); }
          catch (error) { message.textContent = errorText(error); }
        });
        actions.append(open);
      } else {
        const create = element("button", "", t("test.createReport"));
        create.type = "button";
        create.addEventListener("click", async () => {
          const current = run.steps.find(entry => entry.stepId === step.stepId);
          if (!current.comment.trim()) {
            message.textContent = t("test.describeFailure");
            comment.input.focus();
            return;
          }
          create.disabled = true;
          message.textContent = t("test.creatingReport");
          try {
            await flush();
            const result = await send({ type: "T9_CREATE_BUG_REPORT_FROM_TEST_STEP",
              testRunId: run.testRunId, stepId: step.stepId });
            run = script.updateStep(run, step.stepId,
              { bugReportId: result.report.bugReportId });
            message.textContent = t("test.reportCreated");
            const replacement = stepItem(run.steps.find(entry => entry.stepId === step.stepId),
              previousHeading);
            item.replaceWith(replacement);
            replacement.querySelector(".run-step-report button")?.focus();
          } catch (error) {
            message.textContent = errorText(error);
            create.disabled = false;
          }
        });
        actions.append(create);
      }
      item.append(actions);
    }
    return item;
  }
  function showSteps() {
    let heading = "";
    stepList.replaceChildren(...run.steps.map(step => {
      const item = stepItem(step, heading);
      heading = step.heading || heading;
      return item;
    }));
  }

  async function showEarlierRuns() {
    const section = document.getElementById("earlierRuns");
    try {
      const { runs } = await send({ type: "T9_LIST_TEST_RUNS", sessionId: run.sessionId });
      const earlier = runs.filter(item => item.testRunId !== run.testRunId);
      section.hidden = !earlier.length;
      const date = value => { try {
        return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" })
          .format(new Date(value)); } catch { return String(value || ""); } };
      document.getElementById("earlierRunList").replaceChildren(...earlier.map(item => {
        const entry = element("li");
        const link = element("a", "", date(item.createdAt));
        link.href = `test-run.html?testRunId=${encodeURIComponent(item.testRunId)}`;
        link.target = "_blank"; link.rel = "noopener";
        const details = [t("test.outcome." + item.summary.outcome), t("test.counts", {
          passed: item.summary.passed, failed: item.summary.failed,
          skipped: item.summary.skipped, notRun: item.summary.notRun }),
        item.environment, item.tester].filter(Boolean).join(" · ");
        entry.append(link, document.createTextNode(` · ${details}`));
        return entry;
      }));
    } catch { section.hidden = true; }
  }

  // Resolves when the browser has written the file, so a message never claims a file was
  // saved while the download is still running or was cancelled.
  function downloadCompleted(downloadId) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = state => {
        if (settled || state === "in_progress") return;
        settled = true; chrome.downloads.onChanged.removeListener(listener);
        if (state === "complete") resolve(); else reject(new Error("technical.downloadNotSaved"));
      };
      const listener = delta => {
        if (delta.id === downloadId && delta.state?.current) finish(delta.state.current);
      };
      chrome.downloads.onChanged.addListener(listener);
      chrome.downloads.search({ id: downloadId }).then(([item]) => {
        if (item) finish(item.state);
      }, () => {});
    });
  }
  async function exportMarkdown() {
    const button = document.getElementById("exportRun");
    button.disabled = true;
    try {
      await flush();
      // The file is part of the test documentation, so its labels follow the document language.
      const text = script.markdown(run, key => i18n.translate(key, run.documentLanguage));
      const name = (run.title.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/gu, "")
        .slice(0, 60) || "test") + ".md";
      const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
      try {
        const result = await send({ type: "T9_DOWNLOAD_FILE", url, filename: name });
        message.textContent = t("technical.waitingForDownload");
        await downloadCompleted(result.downloadId);
        message.textContent = t("test.exported");
      } finally { URL.revokeObjectURL(url); }
    } catch (error) {
      message.textContent = errorText(error);
    } finally { button.disabled = false; }
  }

  async function runAgain() {
    const button = document.getElementById("runAgain");
    button.disabled = true;
    message.textContent = t("test.creatingRun");
    try {
      await flush();
      await send({ type: "T9_CREATE_TEST_RUN", run: script.rerun(run, {
        testRunId: `test-run-${crypto.randomUUID()}` }) });
      message.textContent = "";
    } catch (error) {
      message.textContent = errorText(error);
    } finally { button.disabled = false; }
  }

  async function start() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      locale = i18n.apply(response?.settings?.uiLocale);
    } catch { locale = i18n.apply(locale); }
    document.title = t("test.pageTitle");
    if (!testRunId) throw new Error("test.runNotFound");
    run = script.normalize((await send({ type: "T9_LOAD_TEST_RUN", testRunId })).run);
    document.title = `${t("test.pageTitle")}: ${run.title}`;
    const title = document.getElementById("runTitle");
    title.textContent = run.title;
    title.lang = run.documentLanguage.split("-")[0];
    const tester = document.getElementById("runTester");
    const environment = document.getElementById("runEnvironment");
    tester.value = run.tester; environment.value = run.environment;
    tester.addEventListener("input", () =>
      change(script.update(run, { tester: tester.value }, new Date().toISOString())));
    environment.addEventListener("input", () =>
      change(script.update(run, { environment: environment.value }, new Date().toISOString())));
    if (run.processExpectedResult.trim()) {
      document.getElementById("processExpected").hidden = false;
      document.getElementById("processExpectedText").textContent = run.processExpectedResult;
    }
    showSaveState(); showSummary(); showSteps();
    void showEarlierRuns();
    document.getElementById("exportRun").addEventListener("click", exportMarkdown);
    document.getElementById("runAgain").addEventListener("click", runAgain);
    document.getElementById("closeRun").addEventListener("click", async () => {
      try { await flush(); window.close(); }
      catch (error) { message.textContent = errorText(error); }
    });
  }
  start().catch(error => {
    message.textContent = errorText(error);
    document.getElementById("saveState").textContent = "";
  });
})();
