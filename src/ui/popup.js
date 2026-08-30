const $ = id => document.getElementById(id);

function updateText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

const withTimeout = globalThis.T9AsyncOperations.withTimeout;
let currentUiLocale = globalThis.T9UiI18n.DEFAULT_LOCALE;
let defaultDocumentLanguage = "sv-SE";
const t = key => globalThis.T9UiI18n.translate(key, currentUiLocale);
const tf = (key, values) => globalThis.T9UiI18n.format(key, values, currentUiLocale);

function updateLanguageSwitch() {
  const isEnglish = currentUiLocale === "en-US";
  updateText($("languageCode"), isEnglish ? "EN" : "SV");
  const label = t(isEnglish
    ? "language.switchToSwedish" : "language.switchToEnglish");
  $("languageSwitch").setAttribute("aria-label", label);
  $("languageSwitch").title = label;
}

async function loadUiLocale() {
  try {
    const response = await send({ type: "T9_GET_SETTINGS" }, 3000);
    defaultDocumentLanguage = response?.settings?.documentLanguage === "en-US"
      ? "en-US" : "sv-SE";
    currentUiLocale = globalThis.T9UiI18n.apply(response?.settings?.uiLocale);
    globalThis.T9UiI18n.observe(() => currentUiLocale);
    updateLanguageSwitch();
  } catch {
    currentUiLocale = globalThis.T9UiI18n.apply(
      globalThis.T9UiI18n.DEFAULT_LOCALE);
    globalThis.T9UiI18n.observe(() => currentUiLocale);
    updateLanguageSwitch();
  }
}

async function switchUiLocale() {
  const previousLocale = currentUiLocale;
  const uiLocale = previousLocale === "en-US" ? "sv-SE" : "en-US";
  $("languageSwitch").disabled = true;
  try {
    currentUiLocale = globalThis.T9UiI18n.apply(uiLocale);
    updateLanguageSwitch();
    const response = await send({ type: "T9_SAVE_UI_LOCALE", uiLocale }, 3000);
    if (!response?.ok) throw new Error(t("technical.requestFailed"));
    currentUiLocale = globalThis.T9UiI18n.apply(response.uiLocale);
    updateLanguageSwitch();
    await refresh();
  } catch (error) {
    currentUiLocale = globalThis.T9UiI18n.apply(previousLocale);
    updateLanguageSwitch();
    showMessage(error.message, true);
  } finally {
    $("languageSwitch").disabled = false;
  }
}

async function send(message, timeout = 5000) {
  return withTimeout(chrome.runtime.sendMessage(message), timeout, "Kommunikationen med tillägget");
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function showMessage(text, error = false) {
  updateText($("message"), text || "");
  $("message").style.color = error ? "#b42318" : "#166534";
}

function setStarting(starting) {
  $("startProcess").disabled = starting;
  $("startBug").disabled = starting;
}

function displayLatestAction(action) {
  if (!action) return t("recorder.waiting");
  return action.label || action.category || action.type || t("recorder.eventCaptured");
}

function renderLiveStatus(liveStatus) {
  if (!liveStatus) return;
  updateText($("latestAction"), displayLatestAction(liveStatus.latestAction));
  updateText($("latestPage"), liveStatus.latestAction?.pageCaption ||
    t("recorder.notRegistered"));
  const screenshots = liveStatus.screenshots || {};
  updateText($("screenshotStatus"), tf("recorder.savedCount",
    { count: screenshots.captured || 0 }) + (screenshots.pending
    ? tf("recorder.pendingCount", { count: screenshots.pending }) : ""));
  const context = [liveStatus.context?.environmentName,
    liveStatus.context?.companyName].filter(Boolean).join(" · ");
  updateText($("recordingContext"), context || t("recorder.notIdentified"));
  updateText($("connectionStatus"), liveStatus.connected
    ? t("recorder.connected") : t("recorder.notConfirmed"));
  $("connectionStatus").className = liveStatus.connected ? "live-ok" : "";
  const warning = $("captureWarning");
  const messages = (liveStatus.warnings || []).map(item => item.message);
  warning.hidden = messages.length === 0;
  updateText(warning, messages.join(" "));
}

async function pingTab(tabId) {
  try {
    return await withTimeout(chrome.tabs.sendMessage(tabId, {
      type: "T9_CONTENT_PING"
    }), 1800, "Kontrollen av Business Central-fliken");
  } catch {
    return null;
  }
}

async function ensureContentScript(tab) {
  let response = await pingTab(tab.id);
  if (response?.ok) return response;

  try {
    await withTimeout(chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["capture-focus-session.js", "capture-surface-mode.js",
        "bc-error-detector.js", "content.js"]
    }), 4000, "Inläsningen av inspelningsskriptet");
  } catch (error) {
    throw new Error(tf("recorder.injectFailed", { detail: error.message }));
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  response = await pingTab(tab.id);
  if (!response?.ok) {
    throw new Error(t("recorder.tabUnresponsive"));
  }
  return response;
}

const refresh = globalThis.T9AsyncOperations.singleFlight(async function () {
  try {
    const response = await send({ type: "T9_GET_STATE" }, 3000);
    const active = Boolean(response?.state?.recording);
    const bugRecording = response?.state?.recordingPurpose === "bug-report";

    $("startPanel").hidden = active;
    $("recordingPanel").hidden = !active;
    updateText($("status"), active
      ? t(bugRecording ? "recorder.bugActive" : "recorder.processActive")
      : t("recorder.inactive"));
    $("status").className = "status" + (active ? " rec" : "");
    updateText($("recordingGuidance"), bugRecording
      ? t("recorder.bugGuidance") : t("recorder.processGuidance"));
    updateText($("stop"), bugRecording
      ? t("recorder.stopBug") : t("recorder.stopProcess"));

    if (response?.session) {
      updateText($("sessionName"), response.session.name);
      updateText($("count"), response.session.eventCount || 0);
      const feedback = $("errorCaptureFeedback");
      const errorCaptured = bugRecording && response.session.errorEvidenceCount > 0;
      feedback.hidden = !errorCaptured;
      if (errorCaptured) {
        updateText(feedback,
          response.session.lastErrorCaptureStatus === "details-captured"
            ? t("recorder.errorDetailsCaptured") : t("recorder.errorCaptured"));
      }
    }
    if (active) renderLiveStatus(response.liveStatus);
  } catch (error) {
    showMessage(error.message, true);
  }
});

async function startRecording(recordingPurpose) {
  setStarting(true);
  showMessage(t("recorder.checking"));
  try {
    const tab = await currentTab();
    if (!tab?.url?.includes("businesscentral.dynamics.com")) {
      throw new Error(t("recorder.openBcFirst"));
    }
    await ensureContentScript(tab);
    showMessage(t("recorder.connectionWorks"));

    const response = await send({
      type: recordingPurpose === "bug-report" ? "T9_START_BUG_RECORDING" : "T9_START",
      tabId: tab.id,
      name: recordingPurpose === "bug-report"
        ? "Business Central-fel"
        : "Business Central-process",
      purpose: ""
    }, 6000);
    if (!response?.ok) {
      throw new Error(response?.error || t("recorder.startFailed"));
    }
    showMessage(recordingPurpose === "bug-report"
      ? t("recorder.bugStarted") : t("recorder.processStarted"));
    await refresh();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setStarting(false);
  }
}

$("startProcess").addEventListener("click", () => startRecording("documentation"));
$("startBug").addEventListener("click", () => startRecording("bug-report"));
$("languageSwitch").addEventListener("click", switchUiLocale);

let pendingBugRecording = false;

function openCompletionDialog() {
  const dialog = $("completionDialog");
  if (!dialog.open) dialog.showModal();
  $("openLibraryAfterRecording").focus();
}

function stayAfterRecording() {
  $("completionDialog").close();
  showMessage(t("recorder.savedLibrary"));
}

function openLibraryAfterRecording() {
  $("completionDialog").close();
  chrome.runtime.openOptionsPage();
}

async function finishRecording(name, documentLanguage) {
  try {
    showMessage(pendingBugRecording
      ? t("recorder.creatingReport") : t("recorder.stopping"));
    const response = await send({
      type: pendingBugRecording ? "T9_FINISH_BUG_RECORDING" : "T9_STOP",
      name,
      documentLanguage: documentLanguage === "en-US" ? "en-US" : "sv-SE"
    }, pendingBugRecording ? 30000 : 5000);
    if (!response?.ok) {
      throw new Error(response?.error || t("recorder.stopFailed"));
    }
    showMessage(pendingBugRecording
      ? t("recorder.reportOpened") : t("recorder.stopped"));
    await refresh();
    if (!pendingBugRecording) openCompletionDialog();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function discardWithLegacyBackground() {
  const stateResponse = await send({ type: "T9_GET_STATE" }, 3000);
  const sessionId = stateResponse?.state?.sessionId;
  if (!sessionId) return { ok: true, sessionId: null };

  const stopped = await send({ type: "T9_STOP" }, 30000);
  if (!stopped?.ok) {
    throw new Error(stopped?.error || t("recorder.stopFailed"));
  }
  const removed = await send({
    type: "T9_DELETE_SESSION",
    sessionId
  }, 10000);
  if (!removed?.ok) {
    throw new Error(removed?.error || t("recorder.deleteFailed"));
  }
  return { ok: true, sessionId };
}

async function discardActiveRecording() {
  const confirmed = globalThis.confirm(t("recorder.discardConfirm"));
  if (!confirmed) return;

  try {
    $("discardRecording").disabled = true;
    showMessage(t("recorder.discarding"));
    let response = await send({ type: "T9_CANCEL_RECORDING" }, 30000);
    if (!response?.ok && /okänt meddelande/i.test(String(response?.error || ""))) {
      response = await discardWithLegacyBackground();
    }
    if (!response?.ok) {
      throw new Error(response?.error || t("recorder.cancelFailed"));
    }
    $("nameDialog").close();
    showMessage(t("recorder.discarded"));
    await refresh();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    $("discardRecording").disabled = false;
  }
}

function openNameDialog(bugRecording) {
  pendingBugRecording = bugRecording;
  updateText($("nameDialogTitle"), pendingBugRecording
    ? t("recorder.nameBug") : t("recorder.nameProcess"));
  updateText($("nameDialogHelp"), pendingBugRecording
    ? t("recorder.nameBugHelp") : t("recorder.nameProcessHelp"));
  $("recordingName").value = "";
  $("recordingName").placeholder = pendingBugRecording
    ? t("recorder.nameBugPlaceholder") : t("recorder.nameProcessPlaceholder");
  $("recordingDocumentLanguage").value = defaultDocumentLanguage;
  if (!$("nameDialog").open) $("nameDialog").showModal();
  $("recordingName").focus();
}

$("stop").addEventListener("click", async () => {
  try {
    const state = await send({ type: "T9_GET_STATE" }, 3000);
    openNameDialog(state?.state?.recordingPurpose === "bug-report");
  } catch (error) {
    showMessage(error.message, true);
  }
});

$("cancelName").addEventListener("click", () => $("nameDialog").close());
$("discardRecording").addEventListener("click", discardActiveRecording);
$("stayAfterRecording").addEventListener("click", stayAfterRecording);
$("openLibraryAfterRecording").addEventListener("click", openLibraryAfterRecording);
$("nameForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("recordingName").value.trim();
  if (!name) {
    $("recordingName").focus();
    return;
  }
  $("nameDialog").close();
  finishRecording(name, $("recordingDocumentLanguage").value);
});

$("dashboard").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("debug").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("debug.html") });
});

loadUiLocale().then(refresh).then(async () => {
  try {
    const response = await send({ type: "T9_GET_STATE" }, 3000);
    if (!response?.state?.recording || !response.state.stopPromptRequested) return;
    openNameDialog(response.state.recordingPurpose === "bug-report");
    await send({ type: "T9_CLEAR_STOP_REQUEST" }, 3000);
  } catch (error) {
    showMessage(error.message, true);
  }
});
const refreshInterval = setInterval(refresh, 1000);
globalThis.addEventListener("pagehide", () => clearInterval(refreshInterval), { once: true });
