(() => {
  "use strict";
  // The recording shown beside Business Central: its status, the latest step and what can be
  // marked on it, and saving it. It reads and changes the same recording as the toolbar popup
  // and the floating box in the page; the background worker owns the recording.
  const i18n = globalThis.T9UiI18n;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  // Opened by a start button: the start is still being checked in the popup.
  const startingUntil = params.get("starting") ? Date.now() + 180000 : 0;
  const REFRESH_MS = 1000;
  const MARK_CONFIRMATIONS = Object.freeze({
    "use-image": "recPanel.confirmImage",
    "new-section": "recPanel.confirmSection",
    ignore: "recPanel.confirmIgnore"
  });
  const MARK_ERRORS = Object.freeze({
    "no-image": "recPanel.noImageYet",
    "no-step": "recPanel.noStepYet",
    "no-recording": "recPanel.noRecording"
  });

  let locale = i18n.DEFAULT_LOCALE;
  let documentLanguage = "en-US";
  let view = "";
  let recordingSeen = false;
  let purpose = "process";
  let startedAt = 0;
  let latestKey = "";
  let latestLabel = "";
  let hasLatest = false;
  let marking = false;
  let busy = false;
  let refreshing = false;
  let completedId = "";
  const applied = new Set();

  const t = (key, values = {}) => i18n.format(key, values, locale);
  const show = (element, visible) => { element.hidden = !visible; };
  const setText = (element, value) => {
    const text = String(value ?? "");
    if (element.textContent !== text) element.textContent = text;
  };
  const send = message => new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    } catch (error) { reject(error); }
  });
  // Messages from the background worker are translated when they are known interface text.
  const errorText = (error, fallbackKey) => {
    const message = String(error?.message || error || "");
    return message ? t(message) : t(fallbackKey);
  };

  // While a panel is connected, the floating box in the Business Central page steps aside.
  function connect() {
    let port;
    try { port = chrome.runtime.connect({ name: "T9_RECORDING_PANEL" }); }
    catch { setTimeout(connect, 2000); return; }
    chrome.windows.getCurrent().then(window => port.postMessage({ windowId: window.id }))
      .catch(() => {});
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      setTimeout(connect, 1000);
    });
  }

  function formatElapsed() {
    if (!startedAt) return "";
    const total = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = String(Math.floor(total / 60) % 60).padStart(2, "0");
    const seconds = String(total % 60).padStart(2, "0");
    return hours ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
  }

  function setState(textKey, state) {
    $("rpState").dataset.state = state;
    setText($("rpStateText"), t(textKey));
  }

  const INFO = Object.freeze({
    starting: ["recPanel.stateStarting", "recPanel.startingTitle", "recPanel.startingHelp"],
    idle: ["recPanel.stateNone", "recPanel.idleTitle", "recPanel.idleHelp"],
    ended: ["recPanel.stateNone", "recPanel.endedTitle", "recPanel.endedHelp"],
    test: ["recPanel.stateTest", "recPanel.testTitle", "recPanel.testHelp"]
  });

  // One view at a time: information, the live recording (with or without the save form),
  // work in progress, or the outcome.
  function setView(next) {
    if (view === next) return;
    const previous = view;
    view = next;
    $("recordingPanel").dataset.view = next;
    const info = INFO[next];
    const live = next === "recording" || next === "form";
    show($("rpInfo"), Boolean(info));
    // While saving, the form gets the whole panel so its buttons stay in view.
    show($("rpLive"), next === "recording");
    show($("rpFoot"), live || next === "busy" || next === "done");
    show($("rpRecordingActions"), next === "recording");
    show($("rpSaveForm"), next === "form");
    show($("rpBusy"), next === "busy");
    show($("rpDone"), next === "done");
    // The status line is shown while a recording runs; other views say it in their heading.
    show(document.querySelector(".rp-head"), live || next === "test");
    show($("rpTime"), live);
    show($("rpContext"), live);
    show($("rpCounts"), live);
    if (!live) show($("rpWarning"), false);
    if (info) {
      setState(info[0], next === "test" ? "recording" : "idle");
      setText($("rpInfoTitle"), t(info[1]));
      setText($("rpInfoHelp"), t(info[2]));
      show($("rpOpenLibrary"), next === "ended");
    } else if (live) {
      setState(purpose === "bug" ? "recPanel.stateBug" : "recPanel.stateProcess", "recording");
    } else if (next === "done") {
      setState("recPanel.stateNone", "idle");
    }
    if (next === "form" && previous !== "form") {
      $("rpFormError").textContent = "";
      show($("rpConfirm"), false);
      $("rpDiscard").setAttribute("aria-expanded", "false");
      $("rpDocumentLanguage").value = documentLanguage;
      $("rpName").focus();
    }
    if (next === "recording" && previous === "form") $("rpStop").focus();
  }

  function renderWarnings(liveStatus) {
    // The empty step card already says that no step has been recorded yet.
    const messages = (liveStatus?.warnings || []).filter(item => item.code !== "no-events-yet")
      .map(item => {
        const key = `recorder.warning.${item.code}`;
        const translated = item.code ? t(key) : "";
        return translated && translated !== key ? translated : item.message;
      }).filter(Boolean);
    show($("rpWarning"), messages.length > 0);
    setText($("rpWarning"), messages.join(" "));
  }

  // A step in the words of a document: "Choose Post", "Enter Customer No.".
  function stepText(step) {
    // A row of a list: the record chosen, as in the document ("Choose record 3").
    if (step.record) return t("recPanel.stepRecord", { value: step.record });
    if (!step.label) return t("recorder.eventCaptured");
    const key = step.category === "field" ? "recPanel.stepEnter" : "recPanel.stepChoose";
    // A name that already says what to do, such as "Choose a value for Source No.", is shown
    // as it is rather than as "Choose Choose a value …".
    const [before, after] = t(key).split("{label}").map(part => part.trim().toLocaleLowerCase(locale));
    const name = step.label.toLocaleLowerCase(locale);
    if ((before && name.startsWith(`${before} `)) || (after && name.endsWith(` ${after}`))) {
      return step.label;
    }
    return t(key, { label: step.label });
  }

  let earlierSignature = "";
  function renderEarlier(steps) {
    const signature = JSON.stringify([locale, steps.map(step => [stepText(step), step.pageCaption])]);
    if (signature === earlierSignature) return;
    earlierSignature = signature;
    const items = steps.map(step => {
      const item = document.createElement("li");
      item.append(document.createTextNode(stepText(step)));
      if (step.pageCaption) {
        const page = document.createElement("span");
        page.textContent = step.pageCaption;
        item.append(page);
      }
      return item;
    });
    $("rpEarlier").replaceChildren(...items);
    show($("rpEarlier"), items.length > 0);
    show($("rpEarlierHeading"), items.length > 0);
  }

  function renderActions() {
    for (const button of document.querySelectorAll(".rp-action")) {
      const done = applied.has(button.dataset.kind);
      // A mark already made stays readable as done rather than greyed out as unavailable.
      button.disabled = !done && (marking || !hasLatest);
      button.setAttribute("aria-disabled", String(done));
      button.toggleAttribute("data-applied", done);
      show(button.querySelector(".rp-done"), done);
    }
  }

  function renderLive(response) {
    const liveStatus = response.liveStatus || {};
    const context = [liveStatus.context?.environmentName, liveStatus.context?.companyName]
      .filter(Boolean).join(" · ");
    setText($("rpContext"), context || t("recorder.notIdentified"));
    const screenshots = liveStatus.screenshots || {};
    setText($("rpCounts"), t("recPanel.counts", { events: liveStatus.eventCount || 0,
      screenshots: screenshots.captured || 0 }) + (screenshots.pending
      ? t("recorder.pendingCount", { count: screenshots.pending }) : ""));
    renderWarnings(liveStatus);
    // Steps the user took; focus changes, page loads and messages in between are not shown.
    const steps = Array.isArray(liveStatus.steps) ? liveStatus.steps : [];
    const action = steps.at(-1) || null;
    const key = action ? action.interactionId || [action.type, action.label].join("|") : "";
    if (key !== latestKey) {
      // A new step: the marks made on the previous one stay with that step.
      latestKey = key;
      applied.clear();
    }
    hasLatest = Boolean(action);
    latestLabel = action ? action.label || "" : "";
    $("rpLatest").toggleAttribute("data-empty", !action);
    setText($("rpLatestText"), action ? stepText(action) : t("recPanel.waitingStep"));
    setText($("rpLatestPage"), action?.pageCaption || "");
    show($("rpLatestPage"), Boolean(action?.pageCaption));
    renderEarlier(steps.slice(0, -1));
    renderActions();
  }

  async function refresh() {
    if (busy || refreshing || view === "done") return;
    refreshing = true;
    try {
      const response = await send({ type: "T9_GET_STATE" });
      if (busy || view === "done") return;
      const state = response?.state || {};
      if (!state.recording) {
        setView(recordingSeen ? "ended" : startingUntil > Date.now() ? "starting" : "idle");
        return;
      }
      recordingSeen = true;
      // A test recording belongs to its test and is stopped and compared there.
      if (state.testRunId) { setView("test"); return; }
      purpose = state.recordingPurpose === "bug-report" ? "bug" : "process";
      const started = typeof state.startedAt === "number" ? state.startedAt : Date.parse(state.startedAt || "");
      startedAt = Number.isFinite(started) ? started : 0;
      setText($("rpStop"), t(purpose === "bug" ? "recPanel.stopBug" : "recPanel.stopProcess"));
      if (view !== "form") setView("recording");
      else setState(purpose === "bug" ? "recPanel.stateBug" : "recPanel.stateProcess", "recording");
      setText($("rpTime"), formatElapsed());
      $("rpTime").setAttribute("aria-label", t("recPanel.elapsed", { time: formatElapsed() }));
      renderLive(response);
    } catch {
      // The worker may be restarting; the next refresh tries again.
    } finally {
      refreshing = false;
    }
  }

  function feedback(text, error = false) {
    setText($("rpFeedback"), text);
    $("rpFeedback").toggleAttribute("data-error", error);
  }

  async function mark(kind) {
    if (marking || applied.has(kind)) return;
    marking = true;
    renderActions();
    feedback("");
    try {
      const response = await send({ type: "T9_CAPTURE_GUIDANCE", kind });
      if (!response?.ok) {
        feedback(t(MARK_ERRORS[response?.code] || "recPanel.markFailed"), true);
        return;
      }
      applied.add(kind);
      const step = response.guidance?.targetLabel || latestLabel;
      feedback(step ? t(MARK_CONFIRMATIONS[kind], { step })
        : t(`${MARK_CONFIRMATIONS[kind]}Unnamed`));
    } catch {
      feedback(t("recPanel.markFailed"), true);
    } finally {
      marking = false;
      renderActions();
    }
  }

  function startBusy(textKey) {
    busy = true;
    setText($("rpBusy"), t(textKey));
    setState("recPanel.stateSaving", "idle");
    setView("busy");
  }

  function showDone({ titleKey, name = "", helpKey = "", recordingId = "" }) {
    busy = false;
    completedId = recordingId;
    setView("done");
    setText($("rpDoneTitle"), t(titleKey));
    setText($("rpDoneName"), name);
    show($("rpDoneName"), Boolean(name));
    setText($("rpDoneHelp"), helpKey ? t(helpKey) : "");
    show($("rpDoneHelp"), Boolean(helpKey));
    show($("rpOpenDocument"), Boolean(recordingId));
    $("rpDoneTitle").focus();
  }

  async function stop() {
    if (purpose !== "bug") { setView("form"); return; }
    // An issue report is created and opened at once; its name comes from the report.
    startBusy("recorder.creatingReport");
    try {
      const response = await send({ type: "T9_FINISH_BUG_RECORDING", name: "",
        documentLanguage: globalThis.T9LanguageRegistry.normalize(documentLanguage, "document") });
      if (!response?.ok) throw new Error(response?.error || "recorder.stopFailed");
      showDone({ titleKey: "recorder.reportOpened" });
    } catch (error) {
      busy = false;
      setView("recording");
      feedback(errorText(error, "recorder.stopFailed"), true);
    }
  }

  async function save(event) {
    event.preventDefault();
    const name = $("rpName").value.trim();
    if (!name) {
      $("rpFormError").textContent = t("recPanel.nameRequired");
      $("rpName").setAttribute("aria-invalid", "true");
      $("rpName").focus();
      return;
    }
    $("rpName").removeAttribute("aria-invalid");
    const language = globalThis.T9LanguageRegistry.normalize($("rpDocumentLanguage").value, "document");
    startBusy("recorder.stopping");
    try {
      const response = await send({ type: "T9_STOP", name, documentLanguage: language });
      if (!response?.ok) throw new Error(response?.error || "recorder.stopFailed");
      showDone({ titleKey: "recPanel.savedTitle", name: response.session?.name || name,
        helpKey: "recorder.completionHelp", recordingId: response.session?.id || "" });
    } catch (error) {
      // The recording is still running, so nothing is lost: the form is shown again.
      busy = false;
      view = "";
      setView("form");
      $("rpFormError").textContent = errorText(error, "recorder.stopFailed");
    }
  }

  async function discard() {
    startBusy("recorder.discarding");
    try {
      const response = await send({ type: "T9_CANCEL_RECORDING" });
      if (!response?.ok) throw new Error(response?.error || "recorder.cancelFailed");
      showDone({ titleKey: "recorder.discarded" });
    } catch (error) {
      busy = false;
      view = "";
      setView("form");
      $("rpFormError").textContent = errorText(error, "recorder.cancelFailed");
    }
  }

  function toggleConfirm(open) {
    show($("rpConfirm"), open);
    $("rpDiscard").setAttribute("aria-expanded", String(open));
    (open ? $("rpDiscardNo") : $("rpDiscard")).focus();
  }

  function openLibrary(query = "") {
    void chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard.html${query}`) });
  }

  async function start() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      locale = i18n.apply(response?.settings?.uiLocale);
      documentLanguage = globalThis.T9LanguageRegistry.normalize(
        response?.settings?.documentLanguage, "document");
    } catch { locale = i18n.apply(locale); }
    document.title = t("recPanel.pageTitle");
    // The panel's own words follow a change of interface language made elsewhere.
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== "local" || !Object.keys(changes).some(key => /setting/i.test(key))) return;
      try {
        const response = await send({ type: "T9_GET_SETTINGS" });
        const next = i18n.normalizeLocale(response?.settings?.uiLocale);
        if (next === locale) return;
        locale = i18n.apply(next);
        document.title = t("recPanel.pageTitle");
        const current = view;
        view = "";
        setView(current || "starting");
        void refresh();
      } catch {}
    });
    for (const button of document.querySelectorAll(".rp-action")) {
      button.addEventListener("click", () => { void mark(button.dataset.kind); });
    }
    $("rpStop").addEventListener("click", () => { void stop(); });
    $("rpContinue").addEventListener("click", () => setView("recording"));
    $("rpSaveForm").addEventListener("submit", event => { void save(event); });
    $("rpName").addEventListener("input", () => {
      $("rpFormError").textContent = "";
      $("rpName").removeAttribute("aria-invalid");
    });
    $("rpDiscard").addEventListener("click", () => toggleConfirm($("rpConfirm").hidden));
    $("rpDiscardNo").addEventListener("click", () => toggleConfirm(false));
    $("rpDiscardYes").addEventListener("click", () => { void discard(); });
    $("rpOpenDocument").addEventListener("click", () =>
      openLibrary(`?openReview=${encodeURIComponent(completedId)}`));
    $("rpOpenLibrary").addEventListener("click", () => openLibrary());
    $("rpCloseInfo").addEventListener("click", () => window.close());
    $("rpCloseDone").addEventListener("click", () => window.close());
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && view === "form") {
        if (!$("rpConfirm").hidden) toggleConfirm(false);
        else setView("recording");
      }
    });
    // A start that failed in the popup closes the panel it opened for it.
    chrome.runtime.onMessage.addListener(message => {
      if (message?.type === "T9_RECORDING_PANEL_START_FAILED" && !recordingSeen) window.close();
    });
    setView(startingUntil > Date.now() ? "starting" : "idle");
    connect();
    await refresh();
    setInterval(() => { void refresh(); }, REFRESH_MS);
  }

  void start();
})();
