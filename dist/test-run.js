(() => {
  "use strict";
  // One run of a manual test made from a process document. Every change is saved
  // automatically; a failed step can become a bug report. The same run can be worked through
  // in a panel beside Business Central, and changes made there show here.
  const query = new URLSearchParams(location.search);
  const testRunId = query.get("testRunId");
  const script = globalThis.T9TestScript;
  const i18n = globalThis.T9UiI18n;
  const message = document.getElementById("runMessage");
  const stepList = document.getElementById("runSteps");
  let locale = i18n.DEFAULT_LOCALE;
  let client = null;
  const run = () => client.run();
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

  function showSaveState(state) {
    const status = document.getElementById("saveState");
    status.dataset.state = state;
    status.textContent = t({ saved: "test.saved", saving: "test.saving",
      unsaved: "test.unsaved", failed: "test.saveFailed" }[state]);
    if (state === "failed") {
      const retry = document.createElement("button");
      retry.type = "button"; retry.textContent = t("test.retry");
      retry.addEventListener("click", () => { void client.save(); });
      status.append(" ", retry);
    }
  }
  window.addEventListener("beforeunload", event => {
    if (client && client.state() !== "saved") { event.preventDefault(); event.returnValue = ""; }
  });

  function showSummary() {
    const total = script.summary(run());
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
  const signature = step => JSON.stringify(step);
  const changeStep = (stepId, patch) => {
    client.change({ steps: [{ stepId, patch }] });
    showSummary();
  };

  // The screenshots taken for a step, as small images that open full size, each with a
  // button that removes it.
  function screenshotStrip(step) {
    const wrapper = element("div", "run-shots");
    if (!step.screenshots.length) return wrapper;
    wrapper.append(element("p", "run-shots-title", t("test.screenshots")));
    const list = element("ul", "run-shot-list");
    step.screenshots.forEach((shot, index) => {
      const entry = element("li");
      const link = element("a");
      link.target = "_blank"; link.rel = "noopener";
      const image = element("img");
      image.alt = t("test.screenshotAlt", { n: index + 1, step: step.number });
      image.loading = "lazy";
      link.append(image);
      const remove = element("button", "run-shot-remove", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", t("test.deleteScreenshot", { n: index + 1, step: step.number }));
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          client.accept((await send({ type: "T9_DELETE_TEST_SCREENSHOT", testRunId,
            stepId: step.stepId, screenshotId: shot.screenshotId })).run);
          message.textContent = t("test.screenshotDeleted");
          rerenderStep(step.stepId, ".run-shot-capture");
        } catch (error) {
          message.textContent = errorText(error);
          remove.disabled = false;
        }
      });
      entry.append(link, remove);
      list.append(entry);
      client.screenshots([shot.screenshotId]).then(images => {
        const source = images[shot.screenshotId];
        if (!source) return;
        image.src = source;
        link.href = source;
      }, () => { image.alt = t("test.screenshotsUnavailable"); });
    });
    wrapper.append(list);
    return wrapper;
  }

  function showResolved(target, text) {
    const value = script.resolveText(text, run().testData);
    target.hidden = value === text;
    target.textContent = target.hidden ? "" : t("test.expectedResolved", { text: value });
  }
  function showAllResolved() {
    for (const target of stepList.querySelectorAll("[data-expected-for]")) {
      const step = run().steps.find(entry => entry.stepId === target.dataset.expectedFor);
      if (step) showResolved(target, step.expected);
    }
  }

  // Test data: rows of a name and a value that expected results can name.
  function showTestData(focus = null) {
    const rows = document.getElementById("testDataRows");
    const data = run().testData;
    const example = `{${data.find(item => item.name.trim())?.name.trim() || t("test.testDataExampleName")}}`;
    document.getElementById("testDataHelp").textContent = t("test.testDataHelp", { example });
    const items = [];
    if (data.length) {
      const head = element("div", "test-data-row test-data-head");
      head.setAttribute("aria-hidden", "true");
      head.append(element("span", "", t("test.testDataName")), element("span", "", t("test.testDataValue")),
        element("span"));
      items.push(head);
    }
    data.forEach((item, index) => {
      const row = element("div", "test-data-row");
      const name = element("input"); name.type = "text"; name.value = item.name;
      name.id = `testDataName-${index}`;
      name.setAttribute("aria-label", t("test.testDataNameFor", { n: index + 1 }));
      const value = element("input"); value.type = "text"; value.value = item.value;
      value.id = `testDataValue-${index}`;
      value.setAttribute("aria-label", t("test.testDataValueFor", { n: index + 1 }));
      const update = () => {
        const next = run().testData.map(entry => ({ ...entry }));
        next[index] = { name: name.value, value: value.value };
        client.change({ run: { testData: next } });
        showAllResolved();
      };
      name.addEventListener("input", update);
      value.addEventListener("input", update);
      const remove = element("button", "", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", t("test.removeTestData", { n: index + 1 }));
      remove.addEventListener("click", () => {
        client.change({ run: { testData: run().testData.filter((_, position) => position !== index) } });
        showTestData(run().testData.length ? `#testDataName-${Math.max(0, index - 1)}` : "#addTestData");
        showAllResolved();
      });
      row.append(name, value, remove);
      items.push(row);
    });
    rows.replaceChildren(...items);
    document.getElementById("addTestData").disabled = data.length >= script.MAX_TEST_DATA;
    if (focus) document.querySelector(focus)?.focus();
  }

  function stepItem(step, previousHeading) {
    const current = run();
    const item = element("li", "run-step");
    item.dataset.status = step.status;
    item.dataset.stepId = step.stepId;
    item.dataset.signature = signature(step);
    item.dataset.previousHeading = previousHeading;
    if (step.heading && step.heading !== previousHeading) {
      item.append(element("p", "run-step-heading", step.heading));
    }
    const heading = element("h3");
    heading.id = `step-title-${step.number}`;
    const instruction = element("span", "", step.instruction);
    instruction.lang = current.documentLanguage.split("-")[0];
    heading.append(element("span", "step-number", t("test.stepNumber", { n: step.number })),
      instruction);
    item.append(heading);
    const grid = element("div", "run-step-grid");
    const field = (key, value, name, help = "") => {
      const wrapper = element("div");
      const label = element("label", "", t(key));
      const input = element("textarea");
      input.id = `${key.replace(/\W/gu, "-")}-${step.number}`;
      label.htmlFor = input.id;
      input.value = value;
      input.setAttribute("aria-describedby", heading.id);
      input.addEventListener("input", () => {
        changeStep(step.stepId, { [name]: input.value });
        // The text is already on the page; only what the step looks like now is recorded.
        item.dataset.signature = signature(run().steps.find(entry => entry.stepId === step.stepId));
      });
      wrapper.append(label, input);
      if (help) {
        const note = element("p", "field-help", help);
        note.id = `${input.id}-help`;
        input.setAttribute("aria-describedby", `${heading.id} ${note.id}`);
        wrapper.append(note);
      }
      return { wrapper, input };
    };
    const expected = field("test.expected", step.expected, "expected");
    // An expected result naming test data shows the text with the values filled in.
    const resolved = element("p", "expected-resolved");
    resolved.dataset.expectedFor = step.stepId;
    resolved.lang = instruction.lang;
    expected.wrapper.append(resolved);
    showResolved(resolved, step.expected);
    expected.input.addEventListener("input", () => showResolved(resolved, expected.input.value));
    const comment = field("test.comment", step.comment, "comment",
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
        changeStep(step.stepId, { status: value });
        rerenderStep(step.stepId, `input[value="${value}"]`);
      });
      label.append(input, document.createTextNode(t("test.status." + value)));
      choices.append(label);
    }
    status.append(choices);
    item.append(status);

    item.append(screenshotStrip(step));
    const actions = element("div", "run-step-report");
    const capture = element("button", "run-shot-capture", t("test.takeScreenshot"));
    capture.type = "button";
    capture.disabled = step.screenshots.length >= script.MAX_SCREENSHOTS_PER_STEP;
    capture.addEventListener("click", async () => {
      capture.disabled = true;
      message.textContent = t("test.takingScreenshot");
      try {
        const own = await chrome.tabs.getCurrent();
        const result = await send({ type: "T9_CAPTURE_TEST_SCREENSHOT", testRunId,
          stepId: step.stepId, returnTabId: own?.id });
        client.accept(result.run);
        message.textContent = t("test.screenshotSaved");
        rerenderStep(step.stepId, ".run-shot-capture");
      } catch (error) {
        message.textContent = errorText(error);
        capture.disabled = false;
        if (String(error?.message) === "test.screenshotNeedsAccess" && testTab) markTab(testTab.id);
      }
    });
    actions.append(capture);
    if (step.bugReportId) {
      const open = element("button", "", t("test.openReport"));
      open.type = "button";
      open.addEventListener("click", async () => {
        try { await send({ type: "T9_OPEN_TECHNICAL_REPORT", bugReportId: step.bugReportId }); }
        catch (error) { message.textContent = errorText(error); }
      });
      actions.append(open);
    } else if (step.status === "failed") {
      const create = element("button", "", t("test.createReport"));
      create.type = "button";
      create.addEventListener("click", async () => {
        const latest = run().steps.find(entry => entry.stepId === step.stepId);
        if (!latest.comment.trim()) {
          message.textContent = t("test.describeFailure");
          comment.input.focus();
          return;
        }
        create.disabled = true;
        message.textContent = t("test.creatingReport");
        try {
          await client.flush();
          const result = await send({ type: "T9_CREATE_BUG_REPORT_FROM_TEST_STEP",
            testRunId, stepId: step.stepId });
          client.change({ steps: [{ stepId: step.stepId,
            patch: { bugReportId: result.report.bugReportId } }] });
          message.textContent = t("test.reportCreated");
          rerenderStep(step.stepId, ".run-step-report button:last-child");
        } catch (error) {
          message.textContent = errorText(error);
          create.disabled = false;
        }
      });
      actions.append(create);
    }
    item.append(actions);
    return item;
  }

  // Draws one step again and puts focus back where it was, or on the given element.
  function rerenderStep(stepId, focusSelector = "") {
    const item = stepList.querySelector(`[data-step-id="${CSS.escape(stepId)}"]`);
    const step = run().steps.find(entry => entry.stepId === stepId);
    if (!item || !step) return;
    const active = item.contains(document.activeElement) ? document.activeElement : null;
    const focus = active?.id ? { id: active.id, start: active.selectionStart,
      end: active.selectionEnd } : null;
    const replacement = stepItem(step, item.dataset.previousHeading || "");
    item.replaceWith(replacement);
    const target = focusSelector ? replacement.querySelector(focusSelector) : null;
    if (target && !target.disabled) { target.focus(); return; }
    if (focus) {
      const again = document.getElementById(focus.id);
      again?.focus();
      if (again && typeof focus.start === "number") {
        try { again.setSelectionRange(focus.start, focus.end); } catch {}
      }
    }
  }
  function showSteps() {
    let heading = "";
    stepList.replaceChildren(...run().steps.map(step => {
      const item = stepItem(step, heading);
      heading = step.heading || heading;
      return item;
    }));
  }
  // A change from the panel: only the steps that differ are drawn again.
  function showExternalChange(value) {
    if (!document.getElementById("testDataSection").contains(document.activeElement)) showTestData();
    showAllResolved();
    for (const [id, text] of [["runTester", value.tester], ["runEnvironment", value.environment],
      ["runPrerequisites", value.prerequisites]]) {
      const input = document.getElementById(id);
      if (input.value !== text) input.value = text;
    }
    for (const step of value.steps) {
      const item = stepList.querySelector(`[data-step-id="${CSS.escape(step.stepId)}"]`);
      if (item && item.dataset.signature !== signature(step)) rerenderStep(step.stepId);
    }
    showSummary();
  }

  async function showEarlierRuns() {
    const section = document.getElementById("earlierRuns");
    try {
      const { runs } = await send({ type: "T9_LIST_TEST_RUNS", sessionId: run().sessionId });
      const earlier = runs.filter(item => item.testRunId !== testRunId);
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
  // Markdown or CSV for Excel. The file is part of the test documentation, so its labels
  // follow the document language.
  async function exportFile(kind) {
    const button = document.getElementById(kind === "csv" ? "exportCsv" : "exportRun");
    button.disabled = true;
    try {
      await client.flush();
      const value = run();
      const label = key => i18n.translate(key, value.documentLanguage);
      const text = kind === "csv" ? script.csv(value, label) : script.markdown(value, label);
      const name = (value.title.replace(/[^p{L}p{N}._-]+/gu, "-").replace(/^-+|-+$/gu, "")
        .slice(0, 60) || "test") + (kind === "csv" ? ".csv" : ".md");
      const url = URL.createObjectURL(new Blob([text], { type: kind === "csv"
        ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8" }));
      try {
        const result = await send({ type: "T9_DOWNLOAD_FILE", url, filename: name });
        message.textContent = t("technical.waitingForDownload");
        await downloadCompleted(result.downloadId);
        message.textContent = t(kind === "csv" ? "test.exportedCsv" : "test.exported");
      } finally { URL.revokeObjectURL(url); }
    } catch (error) {
      message.textContent = errorText(error);
    } finally {
      button.disabled = false;
      document.querySelector(".export-menu").open = false;
    }
  }

  async function runAgain() {
    const button = document.getElementById("runAgain");
    button.disabled = true;
    message.textContent = t("test.creatingRun");
    try {
      await client.flush();
      await send({ type: "T9_CREATE_TEST_RUN", run: script.rerun(run(), {
        testRunId: `test-run-${crypto.randomUUID()}` }) });
      message.textContent = "";
    } catch (error) {
      message.textContent = errorText(error);
    } finally { button.disabled = false; }
  }

  // The panel beside Business Central. The browser opens a panel only straight from a click,
  // so the Business Central tab is looked up beforehand and kept current.
  let testTab = null;
  async function findTestTab() {
    try { testTab = (await send({ type: "T9_FIND_TEST_TAB", sessionId: run().sessionId })).tab; }
    catch { testTab = null; }
  }
  // The toolbar button is marked on the Business Central tab until it has been used there,
  // which Edge requires before the extension may take screenshots of the tab.
  function markTab(tabId) {
    void send({ type: "T9_MARK_TEST_TAB", tabId, title: t("test.badgeTitle") }).catch(() => {});
  }

  function openPanel() {
    if (!chrome.sidePanel?.open) { message.textContent = t("test.panelUnavailable"); return; }
    if (!testTab) { message.textContent = t("test.noBusinessCentral"); void findTestTab(); return; }
    const tab = testTab;
    // The panel belongs to the Business Central tab's window. Edge reports a panel opened for
    // a tab that is not shown as opened without showing it, so it is not opened per tab.
    chrome.sidePanel.setOptions({ enabled: true,
      path: `test-panel.html?testRunId=${encodeURIComponent(testRunId)}` }).catch(() => {});
    chrome.sidePanel.open({ windowId: tab.windowId }).then(async () => {
      await client.flush().catch(() => {});
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      message.textContent = "";
      markTab(tab.id);
    }, () => {
      message.textContent = t("test.noBusinessCentral");
      void findTestTab();
    });
  }

  async function start() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      locale = i18n.apply(response?.settings?.uiLocale);
    } catch { locale = i18n.apply(locale); }
    document.title = t("test.pageTitle");
    if (!testRunId) throw new Error("test.runNotFound");
    client = globalThis.T9TestRunClient.create({ testRunId, send,
      storageKey: globalThis.T9StorageKeys.TEST_RUN_PREFIX + testRunId,
      onSaveState: showSaveState, onRun: showExternalChange });
    const value = await client.load();
    void send({ type: "T9_SET_ACTIVE_TEST_RUN", testRunId }).catch(() => {});
    document.title = `${t("test.pageTitle")}: ${value.title}`;
    const title = document.getElementById("runTitle");
    title.textContent = value.title;
    title.lang = value.documentLanguage.split("-")[0];
    const prerequisites = document.getElementById("runPrerequisites");
    prerequisites.value = value.prerequisites;
    prerequisites.addEventListener("input", () => {
      client.change({ run: { prerequisites: prerequisites.value } });
    });
    showTestData();
    document.getElementById("addTestData").addEventListener("click", () => {
      client.change({ run: { testData: [...run().testData, { name: "", value: "" }] } });
      showTestData(`#testDataName-${run().testData.length - 1}`);
    });
    const tester = document.getElementById("runTester");
    const environment = document.getElementById("runEnvironment");
    tester.value = value.tester; environment.value = value.environment;
    tester.addEventListener("input", () => { client.change({ run: { tester: tester.value } }); });
    environment.addEventListener("input", () => {
      client.change({ run: { environment: environment.value } });
    });
    if (value.processExpectedResult.trim()) {
      document.getElementById("processExpected").hidden = false;
      document.getElementById("processExpectedText").textContent = value.processExpectedResult;
    }
    showSaveState("saved"); showSummary(); showSteps();
    void showEarlierRuns();
    void findTestTab();
    window.addEventListener("focus", () => { void findTestTab(); });
    chrome.tabs.onUpdated.addListener((_, change) => { if (change.url || change.status) void findTestTab(); });
    chrome.tabs.onRemoved.addListener(() => { void findTestTab(); });
    document.getElementById("openPanel").addEventListener("click", openPanel);
    document.getElementById("exportRun").addEventListener("click", () => exportFile("markdown"));
    document.getElementById("exportCsv").addEventListener("click", () => exportFile("csv"));
    const menu = document.querySelector(".export-menu");
    document.addEventListener("click", event => { if (!menu.contains(event.target)) menu.open = false; });
    menu.addEventListener("keydown", event => {
      if (event.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); }
    });
    document.getElementById("openProtocol").addEventListener("click", async () => {
      await client.flush().catch(() => {});
      await chrome.tabs.create({ url: chrome.runtime.getURL(
        `test-protocol.html?testRunId=${encodeURIComponent(testRunId)}`) });
    });
    document.getElementById("runAgain").addEventListener("click", runAgain);
    document.getElementById("closeRun").addEventListener("click", async () => {
      try { await client.flush(); window.close(); }
      catch (error) { message.textContent = errorText(error); }
    });
  }
  start().catch(error => {
    message.textContent = errorText(error);
    document.getElementById("saveState").textContent = "";
  });
})();
