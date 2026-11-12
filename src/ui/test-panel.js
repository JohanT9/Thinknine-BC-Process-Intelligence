(() => {
  "use strict";
  // A test run worked through beside Business Central, one step at a time: the result,
  // a comment and screenshots of the Business Central tab next to it. It changes the same
  // stored run as the full test page.
  const testRunId = new URLSearchParams(location.search).get("testRunId");
  const script = globalThis.T9TestScript;
  const i18n = globalThis.T9UiI18n;
  const message = document.getElementById("panelMessage");
  const stepSection = document.getElementById("panelStep");
  let locale = i18n.DEFAULT_LOCALE;
  let client = null;
  let current = 0;
  let shownSignature = "";
  const run = () => client.run();
  // What the shown step depends on: the step and the test data its expected result names.
  const stepSignature = (value, index) => JSON.stringify([value.steps[index], value.testData]);
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
  const element = (tag, className = "", text = "") => {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text) value.textContent = text;
    return value;
  };

  function showSaveState(state) {
    const status = document.getElementById("saveState");
    status.dataset.state = state;
    status.textContent = t({ saved: "test.saved", saving: "test.saving",
      unsaved: "test.unsaved", failed: "test.saveFailed" }[state]);
    if (state === "failed") {
      const retry = element("button", "", t("test.retry"));
      retry.type = "button";
      retry.addEventListener("click", () => { void client.save(); });
      status.append(retry);
    }
  }

  function showProgress() {
    const value = run();
    const total = script.summary(value);
    const progress = document.getElementById("panelProgress");
    progress.replaceChildren(element("strong", "", t("test.stepOf",
      { n: current + 1, total: value.steps.length })), element("span", "", t("test.counts", {
      passed: total.passed, failed: total.failed, skipped: total.skipped, notRun: total.notRun })));
    const jump = document.getElementById("stepJump");
    const options = value.steps.map(step => {
      const option = element("option", "", `${step.number}. ${step.instruction} (${
        t(script.statusKey(step))})`);
      option.value = String(step.number - 1);
      return option;
    });
    jump.replaceChildren(...options);
    jump.value = String(current);
    document.getElementById("previousStep").disabled = current === 0;
    document.getElementById("nextStep").disabled = current >= value.steps.length - 1;
  }

  async function showImages(step, list) {
    try {
      const images = await client.screenshots(step.screenshots.map(shot => shot.screenshotId));
      for (const item of list.querySelectorAll("[data-screenshot-id]")) {
        const source = images[item.dataset.screenshotId];
        if (!source) continue;
        item.querySelector("img").src = source;
        item.querySelector("a").href = source;
      }
    } catch { message.textContent = t("test.screenshotsUnavailable"); }
  }

  function showStep(focusSelector = "") {
    const value = run();
    const step = value.steps[current];
    shownSignature = stepSignature(value, current);
    stepSection.dataset.status = step.status;
    const parts = [];
    if (step.heading) parts.push(element("p", "panel-step-heading", step.heading));
    const title = element("h2");
    title.id = "panelStepTitle";
    const instruction = element("span", "", step.instruction);
    instruction.lang = value.documentLanguage.split("-")[0];
    title.append(element("span", "step-number", t("test.stepNumber", { n: step.number })), instruction);
    parts.push(title);

    const expected = element("div");
    const expectedText = element("p", "panel-expected",
      script.resolveText(step.expected, value.testData).trim() || t("test.expectedNone"));
    if (!step.expected.trim()) expectedText.dataset.empty = "";
    else expectedText.lang = instruction.lang;
    expected.append(element("p", "panel-label", t("test.expected")), expectedText);
    parts.push(expected);

    // What the latest recording of the test showed for the step: a suggestion only.
    const suggestion = step.recordingSuggestion;
    if (suggestion && value.recordingCheck?.checkedAt) {
      const note = element("p", "panel-suggestion");
      note.dataset.state = suggestion.state;
      // A result the recording set says so; the tester can choose another.
      note.append(element("strong", "", t(script.byRecording(step) ? script.statusKey(step)
        : SUGGESTION_KEYS[suggestion.state])));
      if (suggestion.state === "failed") {
        // Business Central's own message, as it was shown.
        note.append(element("span", "panel-suggestion-error", suggestion.error || t("test.errorNoMessage")));
      }
      if (["done", "failed"].includes(suggestion.state) && suggestion.instruction) {
        note.append(element("span", "", t("test.suggestionRecorded",
          { instruction: suggestion.instruction })));
      }
      if (suggestion.state === "failed" && step.status !== "failed") {
        const fail = element("button", "", t("test.failFromSuggestion"));
        fail.type = "button"; fail.id = "failFromSuggestion";
        fail.addEventListener("click", () => {
          client.change({ steps: [{ stepId: step.stepId,
            patch: script.failureFromSuggestion(run().steps[current]) }] });
          showStep("#panelComment");
          showRecording();
        });
        note.append(fail);
      }
      parts.push(note);
    }

    const status = element("fieldset", "run-status");
    status.append(element("legend", "", t("test.resultFor", { n: step.number })));
    const choices = element("div", "choices");
    for (const result of ["passed", "failed", "skipped", "not-run"]) {
      const label = element("label", "choice");
      const input = element("input");
      input.type = "radio"; input.name = "status"; input.value = result;
      input.checked = step.status === result;
      input.addEventListener("change", () => setStatus(step.stepId, result));
      label.append(input, document.createTextNode(t("test.status." + result)));
      choices.append(label);
    }
    status.append(choices);
    parts.push(status);

    const commentWrapper = element("div");
    const commentLabel = element("label", "", t("test.comment"));
    const comment = element("textarea");
    comment.id = "panelComment";
    commentLabel.htmlFor = comment.id;
    comment.value = step.comment;
    comment.addEventListener("input", () => {
      client.change({ steps: [{ stepId: step.stepId, patch: { comment: comment.value } }] });
      shownSignature = stepSignature(run(), current);
    });
    commentWrapper.append(commentLabel, comment);
    if (step.status === "failed") {
      const help = element("p", "field-help", t("test.failureHelp"));
      help.id = "panelCommentHelp";
      comment.setAttribute("aria-describedby", help.id);
      commentWrapper.append(help);
    }
    parts.push(commentWrapper);

    if (step.screenshots.length) {
      const shots = element("div");
      shots.append(element("p", "panel-label", t("test.screenshots")));
      const list = element("ul", "run-shot-list");
      step.screenshots.forEach((shot, index) => {
        const item = element("li");
        item.dataset.screenshotId = shot.screenshotId;
        const link = element("a");
        link.target = "_blank"; link.rel = "noopener";
        const image = element("img");
        image.alt = t("test.screenshotAlt", { n: index + 1, step: step.number });
        link.append(image);
        const remove = element("button", "run-shot-remove", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", t("test.deleteScreenshot", { n: index + 1, step: step.number }));
        remove.addEventListener("click", () => deleteScreenshot(step, shot, remove));
        item.append(link, remove);
        list.append(item);
      });
      shots.append(list);
      parts.push(shots);
      void showImages(step, list);
    }

    const actions = element("div", "panel-actions");
    const capture = element("button", "", t("test.takeScreenshot"));
    capture.type = "button"; capture.id = "panelCapture";
    capture.disabled = step.screenshots.length >= script.MAX_SCREENSHOTS_PER_STEP;
    capture.addEventListener("click", () => takeScreenshot(step, capture));
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
      create.type = "button"; create.id = "panelCreateReport";
      create.addEventListener("click", () => createReport(step, create, comment));
      actions.append(create);
    }
    parts.push(actions);
    stepSection.replaceChildren(...parts);
    showProgress();
    const target = focusSelector ? stepSection.querySelector(focusSelector) : null;
    if (target && !target.disabled) target.focus();
  }

  // A recording made while testing, compared with the test's steps when it stops. It only
  // suggests which steps were done; the tester approves them, one by one or all at once.
  const SUGGESTION_KEYS = Object.freeze({ done: "test.suggestionDone", failed: "test.suggestionFailed",
    "not-found": "test.suggestionNotFound", unknown: "test.suggestionUnknown" });
  let recorder = { recording: false, testRunId: "" };
  const comparable = value => value.steps.some(step =>
    globalThis.T9TestRecordingMatch.hasSignature(step.signature));
  async function loadRecorderState() {
    try {
      const state = (await send({ type: "T9_GET_STATE" })).state || {};
      recorder = { recording: Boolean(state.recording), testRunId: String(state.testRunId || "") };
    } catch { recorder = { recording: false, testRunId: "" }; }
    showRecording();
  }

  function showRecording(focusId = "") {
    const value = run();
    const section = document.getElementById("panelRecording");
    const content = document.getElementById("panelRecordingContent");
    const hadFocus = section.contains(document.activeElement);
    const ours = recorder.recording && recorder.testRunId === testRunId;
    section.hidden = false;
    section.dataset.state = ours ? "recording" : "";
    const parts = [];
    const actions = element("div", "panel-actions");
    const button = (id, key, onClick) => {
      const item = element("button", "", key);
      item.type = "button"; item.id = id;
      item.addEventListener("click", () => onClick(item));
      actions.append(item);
      return item;
    };
    const check = value.recordingCheck || {};
    if (!comparable(value)) {
      parts.push(element("p", "", t("test.recordingNotComparable")));
    } else if (ours) {
      const text = element("p");
      text.append(element("span", "rec-dot"), document.createTextNode(t("test.recordingActive")));
      parts.push(text);
      // How far the recording has come, as the latest check while recording found.
      if (check.live && check.liveFailed) parts.push(element("p", "", t("test.liveCheckFailed")));
      else if (check.live) {
        parts.push(element("p", "", t("test.liveProgress", { total: value.steps.length,
          done: value.steps.filter(step => ["done", "failed"].includes(step.recordingSuggestion?.state)).length })));
      }
      button("stopTestRecording", t("test.stopRecording"), stopRecording);
    } else if (recorder.recording) {
      parts.push(element("p", "", t("test.recordingOther")));
    } else if (check.failed) {
      parts.push(element("p", "", t("test.recordingCheckFailed")));
      button("retryTestRecording", t("test.retryCompare"), retryCheck);
      button("startTestRecording", t("test.recordAgain"), startRecording);
    } else if (check.checkedAt) {
      parts.push(element("p", "", finishedText(value)));
      const failed = value.steps.filter(step => step.recordingSuggestion?.state === "failed").length;
      if (failed) parts.push(element("p", "", t("test.recordingFailedCount", { n: failed })));
      if (check.additional?.length) {
        parts.push(element("p", "", t("test.recordingAdditional", { n: check.additional.length })));
      }
      if (check.recorded?.length) {
        const details = element("details", "panel-recorded");
        details.append(element("summary", "", t("test.recordedList", { n: check.recorded.length })));
        const list = element("ol");
        const numbers = new Map(value.steps.map(step => [step.stepId, step.number]));
        check.recorded.forEach(item => {
          const row = element("li");
          const said = element("span", "", item.instruction);
          said.lang = value.documentLanguage.split("-")[0];
          row.append(said, element("span", "panel-recorded-link", numbers.has(item.stepId)
            ? t("test.recordedForStep", { n: numbers.get(item.stepId) }) : t("test.recordedNotInTest")));
          if (item.failed) row.append(element("span", "panel-suggestion-error", item.error || t("test.errorNoMessage")));
          list.append(row);
        });
        details.append(list);
        parts.push(details);
      }
      const passes = script.suggestedPasses(value);
      if (passes.length) {
        button("approveSuggested", t("test.approveSuggested", { n: passes.length }), approveSuggested);
      }
      button("startTestRecording", t("test.recordAgain"), startRecording);
    } else {
      parts.push(element("p", "", t("test.recordHelp")));
      button("startTestRecording", t("test.recordTest"), startRecording);
    }
    if (actions.childElementCount) parts.push(actions);
    content.replaceChildren(...parts);
    const target = (focusId && document.getElementById(focusId)) ||
      (hadFocus ? content.querySelector("button") : null);
    if (target) target.focus();
  }

  async function startRecording(button) {
    button.disabled = true;
    message.textContent = t("test.startingRecording");
    try {
      await client.flush();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!isBusinessCentralTab(tab)) throw new Error("test.noBusinessCentralTab");
      await send({ type: "T9_START_TEST_RECORDING", testRunId, tabId: tab.id });
      recorder = { recording: true, testRunId };
      message.textContent = t("test.recordingActive");
      showRecording("stopTestRecording");
    } catch (error) {
      message.textContent = errorText(error);
      button.disabled = false;
    }
  }

  async function finishCheck(button, request) {
    button.disabled = true;
    message.textContent = t("test.comparingRecording");
    try {
      const result = await send(request);
      client.accept(result.run);
      recorder = { recording: false, testRunId: "" };
      const value = run();
      message.textContent = finishedText(value);
      showStep();
      showRecording(script.suggestedPasses(value).length ? "approveSuggested" : "startTestRecording");
    } catch (error) {
      message.textContent = errorText(error);
      await loadRecorderState();
    }
  }
  // What the recording set when the test was finished.
  function finishedText(value) {
    const set = status => value.steps.filter(step => script.byRecording(step) && step.status === status).length;
    return t("test.recordingFinished", { passed: set("passed"), failed: set("failed"),
      total: value.steps.length });
  }
  const stopRecording = button => finishCheck(button, { type: "T9_STOP_TEST_RECORDING" });
  const retryCheck = button => finishCheck(button, { type: "T9_RETRY_TEST_RECORDING_CHECK", testRunId });

  function approveSuggested() {
    const passes = script.suggestedPasses(run());
    if (!passes.length) return;
    client.change({ steps: passes.map(stepId => ({ stepId, patch: { status: "passed" } })) });
    message.textContent = t("test.suggestionsApproved", { n: passes.length });
    showStep();
    showRecording("startTestRecording");
  }

  // What must be in place and the test data, folded away above the step.
  function showSetup() {
    const value = run();
    const data = script.filledTestData(value.testData);
    const setup = document.getElementById("panelSetup");
    setup.hidden = !value.prerequisites.trim() && !data.length;
    if (setup.hidden) return;
    setup.querySelector("summary").textContent = [value.prerequisites.trim() ? t("test.prerequisites") : "",
      data.length ? t("test.testData") : ""].filter(Boolean).join(" · ");
    const parts = [];
    const lang = value.documentLanguage.split("-")[0];
    if (value.prerequisites.trim()) {
      const text = element("p", "", value.prerequisites.trim());
      text.lang = lang;
      parts.push(element("h2", "", t("test.prerequisites")), text);
    }
    if (data.length) {
      const list = element("dl");
      data.forEach(item => list.append(element("dt", "", item.name), element("dd", "", item.value)));
      parts.push(element("h2", "", t("test.testData")), list);
    }
    document.getElementById("panelSetupContent").replaceChildren(...parts);
  }

  // Passed or skipped moves on to the next step that has no result yet; failed stays so
  // that the tester can describe what happened.
  function setStatus(stepId, status) {
    client.change({ steps: [{ stepId, patch: { status } }] });
    const steps = run().steps;
    if (status === "passed" || status === "skipped") {
      const next = steps.findIndex((step, index) => index > current && step.status === "not-run");
      if (next >= 0) {
        current = next;
        showStep("input:checked, input[name=status]");
        message.textContent = t("test.stepOf", { n: current + 1, total: steps.length });
        return;
      }
      if (!steps.some(step => step.status === "not-run")) message.textContent = t("test.allDone");
    }
    showStep(status === "failed" ? "#panelComment" : `input[value="${status}"]`);
  }

  // Edge lets the extension capture the tab only after its toolbar button has been used there.
  // Until then the panel says so and the button is marked on the tab.
  const markedTabs = new Set();
  const isBusinessCentralTab = tab => {
    try {
      const host = new URL(String(tab?.url || "")).hostname;
      return host === "businesscentral.dynamics.com" || host.endsWith(".businesscentral.dynamics.com");
    } catch { return false; }
  };
  async function showAccess() {
    const notice = document.getElementById("panelAccess");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const key = globalThis.T9StorageKeys.TEST_ACCESS_TABS_KEY;
      const granted = (await chrome.storage.session.get(key))[key] || [];
      notice.hidden = !isBusinessCentralTab(tab) || granted.includes(tab.id);
      // The button is in the browser's Extensions menu unless the user pinned it, and then the
      // mark on it is not seen either.
      const pinned = notice.hidden ? true : await chrome.action.getUserSettings?.()
        .then(settings => settings.isOnToolbar !== false).catch(() => true) ?? true;
      notice.textContent = notice.hidden ? "" : t(pinned ? "test.accessNotice" : "test.accessNoticeUnpinned");
      if (!notice.hidden && !markedTabs.has(tab.id)) {
        markedTabs.add(tab.id);
        void send({ type: "T9_MARK_TEST_TAB", tabId: tab.id, title: t("test.badgeTitle") }).catch(() => {});
      }
    } catch { notice.hidden = true; }
  }

  async function takeScreenshot(step, button) {
    button.disabled = true;
    message.textContent = t("test.takingScreenshot");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await send({ type: "T9_CAPTURE_TEST_SCREENSHOT", testRunId,
        stepId: step.stepId, tabId: tab?.id });
      client.accept(result.run);
      message.textContent = t("test.screenshotSaved");
      showStep("#panelCapture");
    } catch (error) {
      message.textContent = errorText(error);
      button.disabled = false;
      if (String(error?.message) === "test.screenshotNeedsAccess") {
        markedTabs.clear();
        void showAccess();
      }
    }
  }

  async function deleteScreenshot(step, shot, button) {
    button.disabled = true;
    try {
      client.accept((await send({ type: "T9_DELETE_TEST_SCREENSHOT", testRunId,
        stepId: step.stepId, screenshotId: shot.screenshotId })).run);
      message.textContent = t("test.screenshotDeleted");
      showStep("#panelCapture");
    } catch (error) {
      message.textContent = errorText(error);
      button.disabled = false;
    }
  }

  async function createReport(step, button, comment) {
    if (!run().steps[current].comment.trim()) {
      message.textContent = t("test.describeFailure");
      comment.focus();
      return;
    }
    button.disabled = true;
    message.textContent = t("test.creatingReport");
    try {
      await client.flush();
      const result = await send({ type: "T9_CREATE_BUG_REPORT_FROM_TEST_STEP", testRunId,
        stepId: step.stepId });
      client.change({ steps: [{ stepId: step.stepId,
        patch: { bugReportId: result.report.bugReportId } }] });
      message.textContent = t("test.reportCreated");
      showStep(".panel-actions button:last-child");
    } catch (error) {
      message.textContent = errorText(error);
      button.disabled = false;
    }
  }

  function go(index, focusSelector) {
    current = Math.max(0, Math.min(index, run().steps.length - 1));
    message.textContent = "";
    showStep(focusSelector);
  }

  // While the test is recorded the panel follows it: when the recording passes the step shown,
  // the next step without a result is shown; when Business Central showed an error, the
  // failed step is shown so that the tester sees what happened. Focus stays where it is.
  let recordedResults = new Map();
  const recordedResult = step => script.byRecording(step) ? `${step.status}:${step.recordingError || ""}` : "";
  function follow(value) {
    const before = recordedResults;
    recordedResults = new Map(value.steps.map(step => [step.stepId, recordedResult(step)]));
    if (!(recorder.recording && recorder.testRunId === testRunId)) return false;
    const changed = value.steps.filter(step => recordedResult(step) &&
      before.get(step.stepId) !== recordedResult(step));
    if (!changed.length) return false;
    const failed = changed.find(step => step.status === "failed");
    if (failed) {
      current = failed.number - 1;
      message.textContent = t("test.liveFailed", { n: failed.number });
      return true;
    }
    const last = changed.at(-1);
    message.textContent = t("test.livePassed", { n: last.number });
    if (value.steps[current]?.status === "not-run" && current > last.number - 1) return false;
    const next = value.steps.findIndex((step, index) => index >= last.number && step.status === "not-run");
    if (next < 0 || next === current) return false;
    current = next;
    return true;
  }

  // A change made on the full test page shows here unless it is the step being edited and
  // nothing in it changed.
  function showExternalChange(value) {
    if (follow(value)) {
      showStep();
    } else if (stepSignature(value, current) !== shownSignature) {
      const active = document.activeElement;
      const focus = active && stepSection.contains(active) && active.id ? active.id : "";
      const selection = active?.id === "panelComment" ? [active.selectionStart, active.selectionEnd] : null;
      showStep(focus ? `#${focus}` : "");
      if (selection) { try { document.getElementById("panelComment").setSelectionRange(...selection); } catch {} }
    } else {
      showProgress();
    }
    showSetup();
    showRecording();
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
    if (!value.steps.length) throw new Error("test.noSteps");
    document.title = `${t("test.pageTitle")}: ${value.title}`;
    const title = document.getElementById("panelTitle");
    title.textContent = value.title;
    title.lang = value.documentLanguage.split("-")[0];
    recordedResults = new Map(value.steps.map(step => [step.stepId, recordedResult(step)]));
    const firstOpen = value.steps.findIndex(step => step.status === "not-run");
    current = firstOpen >= 0 ? firstOpen : 0;
    showSaveState("saved");
    showSetup();
    showStep();
    void loadRecorderState();
    void send({ type: "T9_SET_ACTIVE_TEST_RUN", testRunId }).catch(() => {});
    void showAccess();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "session" && changes[globalThis.T9StorageKeys.TEST_ACCESS_TABS_KEY]) void showAccess();
      // A recording started or stopped elsewhere, such as from the toolbar button.
      if (area === "local" && changes.t9_state) void loadRecorderState();
    });
    chrome.tabs.onActivated.addListener(() => { void showAccess(); });
    chrome.action.onUserSettingsChanged?.addListener(() => { void showAccess(); });
    chrome.tabs.onUpdated.addListener((_, change) => { if (change.url) void showAccess(); });
    document.getElementById("previousStep").addEventListener("click", () => go(current - 1));
    document.getElementById("nextStep").addEventListener("click", () => go(current + 1));
    document.getElementById("stepJump").addEventListener("change", event =>
      go(Number(event.target.value)));
    document.getElementById("openFullRun").addEventListener("click", async () => {
      await client.flush().catch(() => {});
      const url = chrome.runtime.getURL(`test-run.html?testRunId=${encodeURIComponent(testRunId)}`);
      const open = (await chrome.tabs.query({})).find(tab => tab.url === url);
      if (open) {
        await chrome.tabs.update(open.id, { active: true });
        await chrome.windows.update(open.windowId, { focused: true });
      } else {
        await chrome.tabs.create({ url });
      }
    });
    document.getElementById("closePanel").addEventListener("click", async () => {
      try { await client.flush(); window.close(); }
      catch (error) { message.textContent = errorText(error); }
    });
    window.addEventListener("pagehide", () => { void client.save(); });
  }
  start().catch(error => {
    message.textContent = errorText(error);
    document.getElementById("saveState").textContent = "";
  });
})();
