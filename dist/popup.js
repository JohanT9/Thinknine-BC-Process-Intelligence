const $ = id => document.getElementById(id);
const extensionVersion = chrome.runtime.getManifest().version;
if ($("extensionVersion")) $("extensionVersion").textContent = `v${extensionVersion}`;

function updateText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

const withTimeout = globalThis.T9AsyncOperations.withTimeout;
// A license check may wake the license service; leave room for the background's own limit.
const LICENSE_CHECK_TIMEOUT_MS = globalThis.T9TenantLicense.CHECK_TIMEOUT_MS + 5000;
let currentUiLocale = globalThis.T9UiI18n.DEFAULT_LOCALE;
let defaultDocumentLanguage = "en-US";
const t = key => globalThis.T9UiI18n.translate(key, currentUiLocale);
const tf = (key, values) => globalThis.T9UiI18n.format(key, values, currentUiLocale);

function updateLanguageSwitch() {
  $("languageSwitch").value = currentUiLocale;
  $("defaultDocumentLanguage").value = defaultDocumentLanguage;
  const language = globalThis.T9LanguageRegistry.get(currentUiLocale);
  updateText($("languageCode"), language.shortCode);
  $("languageSettingsButton").setAttribute("aria-label", t("settings.languages") + ": " + language.nativeName);
  $("languageSwitch").setAttribute("aria-label", t("settings.language"));
  $("languageSwitch").title = t("settings.language");
}

async function loadUiLocale() {
  try {
    const response = await send({ type: "T9_GET_SETTINGS" }, 3000);
    defaultDocumentLanguage = globalThis.T9LanguageRegistry.normalize(
      response?.settings?.documentLanguage, "document"
    );
    currentUiLocale = globalThis.T9UiI18n.apply(response?.settings?.uiLocale);
    globalThis.T9UiI18n.observe(() => currentUiLocale);
    updateLanguageSwitch();
  } catch {
    currentUiLocale = globalThis.T9UiI18n.apply(
      globalThis.T9UiI18n.DEFAULT_LOCALE);
    globalThis.T9UiI18n.observe(() => currentUiLocale);
    updateLanguageSwitch();
  } finally {
    $("languageSwitch").disabled = false;
    $("defaultDocumentLanguage").disabled = false;
  }
}

async function switchUiLocale(event) {
  const previousLocale = currentUiLocale;
  const uiLocale = globalThis.T9LanguageRegistry.normalize(event.currentTarget.value, "ui");
  if (uiLocale === previousLocale) return;
  $("languageSwitch").disabled = true;
  $("defaultDocumentLanguage").disabled = true;
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
    $("languageSettingsStatus").textContent = error.message;
  } finally {
    $("languageSwitch").disabled = false;
    $("defaultDocumentLanguage").disabled = false;
  }
}

async function send(message, timeout = 5000) {
  return withTimeout(chrome.runtime.sendMessage(message), timeout,
    "Extension communication", { errorMessage: t("technical.requestTimeout") });
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function showMessage(text, error = false) {
  const message = String(text || "");
  // Known service-worker messages are translated; other text is shown as received.
  updateText($("message"), t(message));
  $("message").style.color = error ? "#b42318" : "#166534";
}

function setLicenseFeedback(text, error = false) {
  const message = String(text || "");
  updateText($("licenseCardFeedback"), message.startsWith("license.") ? t(message) : message);
  $("licenseCardFeedback").classList.toggle("error", error);
}

function setStarting(starting) {
  $("startProcess").disabled = starting;
  $("startBug").disabled = starting;
  $("reportVisibleError").disabled = starting;
}

function formatLicenseExpiry(value) {
  const timestamp = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Intl.DateTimeFormat(currentUiLocale, { dateStyle: "medium" }).format(new Date(timestamp))
    : t("license.noExpiryDate");
}

// While a check runs, or when it fails, the last known result is shown as such, with the time it
// was checked; only a result the service has just confirmed is shown as an active license.
function renderLicenseCard(license, { tenantId = "", signedIn = false,
  checkFailed = false, needsConsent = false, checking = false, lastKnown = null } = {}) {
  const card = $("licenseCard");
  const known = (checking || checkFailed) && !needsConsent ? lastKnown : null;
  const currentLicense = checkFailed || needsConsent ? null : checking ? known : license;
  const displayedLicense = currentLicense?.allowed === true ? currentLicense
    : known?.allowed === true ? known : null;
  card.classList.toggle("active", Boolean(!checking && currentLicense?.allowed));
  card.classList.toggle("inactive", Boolean(tenantId && !checking && !currentLicense?.allowed));
  updateText($("licenseCardChecked"), known
    ? tf(checking ? "license.cardRechecking" : "license.cardLastKnown",
      { time: formatCheckedAt(known.checkedAt) }) : "");
  $("licenseCardChecked").hidden = !known;
  updateText($("licenseCardType"), displayedLicense?.licenseType === "trial"
    ? t("license.trialType") : displayedLicense?.licenseType === "consultant"
      ? t("license.consultantType") : displayedLicense?.licenseType === "standard" || displayedLicense?.allowed
        ? t("license.standardType") : "—");
  updateText($("licenseCardExpiry"), formatLicenseExpiry(displayedLicense?.expiresAt));
  // Type and validity are only meaningful for an active license, current or last known.
  $("licenseCardMeta").hidden = !displayedLicense;
  const trialAvailable = currentLicense?.trialAvailable === true;
  const statusKey = !tenantId ? "license.cardUnknown"
    : needsConsent ? "license.cardNeedsConsent"
      : checking && !known ? "license.cardChecking"
      : checkFailed ? "license.cardCheckFailed"
        : currentLicense?.allowed ? "license.cardActive"
          : trialAvailable ? signedIn ? "license.cardTrialReady" : "license.cardTrialAvailable"
            : signedIn ? "license.cardNoTrial" : "license.cardSignInHelp";
  updateText($("licenseCardStatus"), t(statusKey));
  const actionKey = trialAvailable
    ? signedIn ? "license.cardStartTrial" : "license.cardSignInTrial"
    : "license.cardSignIn";
  updateText($("licenseCardAction"), t(actionKey));
  // Outside Business Central there is nothing to sign in to yet: the status says what to do.
  $("licenseCardAction").hidden = !tenantId;
  $("licenseCardAction").disabled = !tenantId;
}

function formatCheckedAt(value) {
  return new Intl.DateTimeFormat(currentUiLocale, { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(value));
}

async function lastKnownLicense(tenantId) {
  try {
    const summary = await send({ type: "T9_LICENSE_SUMMARY" }, 3000);
    const entry = summary?.licenses?.find(item => item.tenantId === tenantId);
    return entry?.checkedAt > 0 ? entry : null;
  } catch { return null; }
}

async function updateLicenseCard() {
  let tenantId = "";
  let lastKnown = null;
  let license = null;
  let signedIn = false;
  let checkFailed = false;
  let needsConsent = false;
  try {
    const tab = await currentTab();
    if (tab?.url?.includes("businesscentral.dynamics.com")) {
      tenantId = globalThis.T9TenantLicense.tenantFromUrl(tab.url);
      const [information, account] = await Promise.all([
        send({ type: "T9_LICENSE_INFORMATION" }, 3000),
        send({ type: "T9_CONSULTANT_LICENSE_STATUS" }, 3000)
      ]);
      signedIn = account?.signedIn === true;
      if (!information?.ok) {
        checkFailed = true;
      } else if (information.information?.requiresAcceptance) {
        needsConsent = true;
      } else {
        lastKnown = await lastKnownLicense(tenantId);
        renderLicenseCard(null, { tenantId, signedIn, checking: true, lastKnown });
        $("licenseCard").setAttribute("aria-busy", "true");
        const current = await send({ type: "T9_LICENSE_CHECK", tabId: tab.id, force: true },
          LICENSE_CHECK_TIMEOUT_MS);
        if (!current?.ok) throw new Error(current?.error || t("technical.requestFailed"));
        license = current.license || null;
        if (license?.allowed !== true && signedIn) {
          try {
            const consultant = await send({ type: "T9_CONSULTANT_LICENSE_CHECK", tabId: tab.id }, 5000);
            if (consultant?.license?.allowed) license = consultant.license;
          } catch { /* Keep the freshly checked tenant result. */ }
        }
      }
    }
  } catch {
    checkFailed = true;
    license = null;
  }
  $("licenseCard").removeAttribute("aria-busy");
  renderLicenseCard(license, { tenantId, signedIn, checkFailed, needsConsent, lastKnown });
}

// The license and the start are shared with the recording panel (recording-start.js).
const recordingStart = globalThis.T9RecordingStart.create({ send: (...args) => send(...args),
  t, tf, withTimeout, licenseCheckTimeout: LICENSE_CHECK_TIMEOUT_MS });
function prepareTenantLicense(tabId, options) {
  return recordingStart.prepareTenantLicense(tabId, options);
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
  const messages = (liveStatus.warnings || []).map(item => {
    const key = `recorder.warning.${item.code}`;
    const translated = item.code ? t(key) : "";
    return translated && translated !== key ? translated : item.message;
  });
  warning.hidden = messages.length === 0;
  updateText(warning, messages.join(" "));
}

function ensureContentScript(tab) {
  return recordingStart.ensureContentScript(tab);
}

const refresh = globalThis.T9AsyncOperations.singleFlight(async function () {
  try {
    const response = await send({ type: "T9_GET_STATE" }, 3000);
    const active = Boolean(response?.state?.recording);
    const bugRecording = response?.state?.recordingPurpose === "bug-report";
    // A recording made while a test is run is compared with the test when it stops.
    const testRecording = Boolean(response?.state?.testRunId);

    $("startPanel").hidden = active;
    $("recordingPanel").hidden = !active;
    updateText($("status"), active
      ? t(testRecording ? "test.recordingTestActive"
        : bugRecording ? "recorder.bugActive" : "recorder.processActive")
      : t("recorder.inactive"));
    $("status").className = "status" + (active ? " rec" : "");
    updateText($("recordingGuidance"), testRecording ? t("test.recordingTestGuidance")
      : bugRecording ? t("recorder.bugGuidance") : t("recorder.processGuidance"));
    // A test recording is followed in the test's own panel.
    $("showRecordingPanel").hidden = testRecording;
    updateText($("stop"), testRecording ? t("test.stopTest")
      : bugRecording ? t("recorder.stopBug") : t("recorder.stopProcess"));

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

// The tab the popup was opened on, known before any click: the browser opens a side panel only
// straight from a click, so nothing may be awaited before the panel is opened.
let popupTab = null;
void currentTab().then(tab => { popupTab = tab || null; }, () => {});

// Opens the recording beside Business Central in the side panel of the popup's window. It
// resolves to whether the panel was opened; null when this browser has no side panel.
// The panel beside Business Central. Given a start, the panel carries it out: Edge closes this
// popup as soon as the panel opens, which would end a start made here halfway.
function openRecordingPanel({ start = "", tabId = 0 } = {}) {
  const tab = popupTab;
  if (!chrome.sidePanel?.open || !tab?.windowId) return null;
  const query = start ? `?start=${encodeURIComponent(start)}&tabId=${tabId}&nonce=${Date.now()}` : "";
  chrome.sidePanel.setOptions({ enabled: true, path: `recording-panel.html${query}` }).catch(() => {});
  return chrome.sidePanel.open({ windowId: tab.windowId }).then(() => true, () => false);
}

function startRecording(recordingPurpose) {
  // Opened straight from the click, before anything is awaited, as Edge requires.
  const panelOpened = isBusinessCentralTab(popupTab)
    ? openRecordingPanel({ start: recordingPurpose, tabId: popupTab.id }) : null;
  if (!panelOpened) { void startRecordingHere(recordingPurpose); return; }
  setStarting(true);
  showMessage(t("recorder.checking"));
  void panelOpened.then(opened => {
    if (opened) { window.close(); return; }
    setStarting(false);
    void startRecordingHere(recordingPurpose);
  });
}

// Without the panel the recording is started here, and this popup follows it.
async function startRecordingHere(recordingPurpose) {
  setStarting(true);
  try {
    const tab = await currentTab();
    const authorization = await recordingStart.startRecording({ purpose: recordingPurpose, tab,
      progress: key => showMessage(t(key)) });
    // A license from the cache is shown as last known until the service has confirmed it.
    renderLicenseCard(authorization.license, { tenantId: authorization.tenantId, signedIn: true,
      checking: authorization.license?.stale === true, lastKnown: authorization.license });
    showMessage(recordingPurpose === "bug-report"
      ? t("recorder.bugStarted") : t("recorder.processStarted"));
    await refresh();
    await updateLicenseCard();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setStarting(false);
  }
}

$("showRecordingPanel").addEventListener("click", () => {
  const opened = openRecordingPanel();
  if (!opened) { showMessage(t("recPanel.unavailable"), true); return; }
  opened.then(ok => ok ? window.close() : showMessage(t("recPanel.unavailable"), true));
});

// Creates a bug report from the Business Central error dialog that is open now, without a
// recording of the steps before it.
async function reportVisibleError() {
  setStarting(true);
  showMessage(t("recorder.checking"));
  try {
    const tab = await currentTab();
    if (!tab?.url?.includes("businesscentral.dynamics.com")) {
      throw new Error(t("recorder.openBcFirst"));
    }
    const authorization = await prepareTenantLicense(tab.id);
    renderLicenseCard(authorization.license, { tenantId: authorization.tenantId, signedIn: true,
      checking: authorization.license?.stale === true, lastKnown: authorization.license });
    await ensureContentScript(tab);
    showMessage(t("recorder.capturingVisibleError"));
    const response = await send({ type: "T9_REPORT_VISIBLE_BC_ERROR", tabId: tab.id,
      documentLanguage: globalThis.T9LanguageRegistry.normalize(
        defaultDocumentLanguage, "document") }, 120000);
    if (!response?.ok) throw new Error(response?.error || t("recorder.startFailed"));
    showMessage(t("recorder.reportOpened"));
    await refresh();
    await updateLicenseCard();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setStarting(false);
  }
}

$("licenseCardAction").addEventListener("click", async () => {
  const card = $("licenseCard");
  const action = $("licenseCardAction");
  action.disabled = true;
  card.setAttribute("aria-busy", "true");
  setLicenseFeedback(t("license.cardWorking"));
  try {
    const tab = await currentTab();
    if (!tab?.url?.includes("businesscentral.dynamics.com")) throw new Error(t("license.cardOpenBc"));
    updateText($("licenseCardStatus"), t("license.cardWorking"));
    const result = await prepareTenantLicense(tab.id, { forceCheck: true });
    renderLicenseCard(result.license, { tenantId: result.tenantId, signedIn: true });
    setLicenseFeedback(t(result.license.licenseType === "trial" ? "license.trialActivated" : "license.signInComplete"));
  } catch (error) {
    setLicenseFeedback(error.message ? t(error.message) : t("license.trialFailed"), true);
    await updateLicenseCard();
  } finally {
    card.setAttribute("aria-busy", "false");
    action.disabled = false;
  }
});

$("startProcess").addEventListener("click", () => startRecording("documentation"));
$("startBug").addEventListener("click", () => startRecording("bug-report"));
$("reportVisibleError").addEventListener("click", reportVisibleError);
$("languageSwitch").addEventListener("change", switchUiLocale);
$("languageSettingsButton").addEventListener("click", () => {
  $("languageSettingsStatus").textContent = t("settings.autoSave");
  $("languageSettingsDialog").showModal();
});
$("languageSettingsDialog").addEventListener("click", event => {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.target === event.currentTarget && (event.clientX < bounds.left ||
      event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
    event.currentTarget.close();
  }
});
$("defaultDocumentLanguage").addEventListener("change", async event => {
  const previous = defaultDocumentLanguage;
  const documentLanguage = event.currentTarget.value;
  $("defaultDocumentLanguage").disabled = true;
  $("languageSwitch").disabled = true;
  try {
    const response = await send({ type: "T9_SAVE_DOCUMENT_LANGUAGE", documentLanguage }, 3000);
    if (!response?.ok) throw new Error(t("technical.requestFailed"));
    defaultDocumentLanguage = response.documentLanguage;
    $("languageSettingsStatus").textContent = t("settings.saved");
  } catch (error) {
    defaultDocumentLanguage = previous;
    $("languageSettingsStatus").textContent = error.message;
  } finally {
    updateLanguageSwitch();
    $("defaultDocumentLanguage").disabled = false;
    $("languageSwitch").disabled = false;
  }
});
$("licenseStatus").addEventListener("click", async () => {
  try {
    const tab = await currentTab();
    const query = tab?.id && tab.url?.includes("businesscentral.dynamics.com")
      ? `?tabId=${encodeURIComponent(tab.id)}` : "";
    await chrome.tabs.create({ url: chrome.runtime.getURL(`license-status.html${query}`) });
  } catch (error) { showMessage(error.message, true); }
});

let pendingBugRecording = false;
let completedRecordingId = null;

function openCompletionDialog(session) {
  completedRecordingId = session?.id || null;
  updateText($("completedRecordingName"), session?.name || "");
  const dialog = $("completionDialog");
  if (!dialog.open) dialog.showModal();
  $("openDocumentationAfterRecording").focus();
}

function stayAfterRecording() {
  $("completionDialog").close();
  showMessage(t("recorder.savedLibrary"));
}

function openDocumentationAfterRecording() {
  $("completionDialog").close();
  if (!completedRecordingId) {
    chrome.runtime.openOptionsPage();
    return;
  }
  chrome.tabs.create({
    url: chrome.runtime.getURL(
      `dashboard.html?openReview=${encodeURIComponent(completedRecordingId)}`
    )
  });
}

async function finishRecording(name, documentLanguage) {
  try {
    showMessage(pendingBugRecording
      ? t("recorder.creatingReport") : t("recorder.stopping"));
    const response = await send({
      type: pendingBugRecording ? "T9_FINISH_BUG_RECORDING" : "T9_STOP",
      name,
      documentLanguage: globalThis.T9LanguageRegistry.normalize(
        documentLanguage, "document"
      )
    }, 240000);
    if (!response?.ok) {
      throw new Error(response?.error || t("recorder.stopFailed"));
    }
    showMessage(pendingBugRecording
      ? t("recorder.reportOpened") : t("recorder.stopped"));
    await refresh();
    if (!pendingBugRecording) openCompletionDialog(response.session);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function discardWithLegacyBackground() {
  const stateResponse = await send({ type: "T9_GET_STATE" }, 3000);
  const sessionId = stateResponse?.state?.sessionId;
  if (!sessionId) return { ok: true, sessionId: null };

  const stopped = await send({ type: "T9_STOP" }, 240000);
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

function openProcessNameDialog() {
  pendingBugRecording = false;
  updateText($("nameDialogTitle"), t("recorder.nameProcess"));
  updateText($("nameDialogHelp"), t("recorder.nameProcessHelp"));
  $("recordingName").value = "";
  $("recordingName").placeholder = t("recorder.nameProcessPlaceholder");
  $("recordingDocumentLanguage").value = defaultDocumentLanguage;
  if (!$("nameDialog").open) $("nameDialog").showModal();
  $("recordingName").focus();
}

async function stopTestRecording() {
  try {
    showMessage(t("test.comparingRecording"));
    const response = await send({ type: "T9_STOP_TEST_RECORDING" }, 240000);
    if (!response?.ok) throw new Error(response?.error || t("recorder.stopFailed"));
    showMessage(t("test.testCompared"));
    await refresh();
  } catch (error) {
    showMessage(t(String(error.message)), true);
  }
}

async function finishOrNameRecording(state) {
  if (state?.testRunId) {
    await stopTestRecording();
  } else if (state?.recordingPurpose === "bug-report") {
    pendingBugRecording = true;
    await finishRecording("", defaultDocumentLanguage);
  } else openProcessNameDialog();
}

$("stop").addEventListener("click", async () => {
  try {
    $("stop").disabled = true;
    const state = await send({ type: "T9_GET_STATE" }, 3000);
    await finishOrNameRecording(state?.state);
  } catch (error) {
    showMessage(error.message, true);
  } finally { $("stop").disabled = false; }
});

$("cancelName").addEventListener("click", () => $("nameDialog").close());
$("discardRecording").addEventListener("click", discardActiveRecording);
$("stayAfterRecording").addEventListener("click", stayAfterRecording);
$("openDocumentationAfterRecording").addEventListener("click",
  openDocumentationAfterRecording);
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

// The test being worked on, continued beside Business Central from here. Opening this popup
// is also what lets the extension take screenshots of the tab: Edge allows that only after the
// user has used the extension's toolbar button on the tab.
let testRunTab = null;
let activeTestRunId = "";
const isBusinessCentralTab = tab => {
  try {
    const host = new URL(String(tab?.url || "")).hostname;
    return host === "businesscentral.dynamics.com" || host.endsWith(".businesscentral.dynamics.com");
  } catch { return false; }
};
async function showActiveTest() {
  const card = $("activeTestCard");
  try {
    const tab = await currentTab();
    if (!isBusinessCentralTab(tab)) { card.hidden = true; return; }
    void send({ type: "T9_TEST_TAB_OPENED", tabId: tab.id }, 3000).catch(() => {});
    const state = await send({ type: "T9_GET_STATE" }, 3000);
    const run = state?.state?.recording ? null
      : (await send({ type: "T9_GET_ACTIVE_TEST_RUN" }, 3000))?.run;
    if (!run || !(run.summary?.notRun > 0)) { card.hidden = true; return; }
    testRunTab = tab;
    activeTestRunId = run.testRunId;
    updateText($("activeTestTitle"), run.title);
    updateText($("activeTestProgress"), tf("test.stepsTested",
      { done: run.summary.total - run.summary.notRun, total: run.summary.total }));
    // A test that can be recorded is started here: one click opens it beside Business Central,
    // starts the recording and lets the extension take screenshots. Continue test only opens it.
    const canStart = run.comparable === true;
    card.classList.toggle("can-start", canStart);
    $("startActiveTest").hidden = !canStart;
    $("startActiveTest").disabled = false;
    // Continue test steps back as the second choice, and the help goes with the first.
    $("continueTest").classList.toggle("primary", !canStart);
    $(canStart ? "startActiveTest" : "continueTest").after($("continueTestHelp"));
    updateText($("continueTestHelp"), t(canStart ? "test.startHelp" : "test.continueHelp"));
    card.hidden = false;
    $(canStart ? "startActiveTest" : "continueTest").focus();
  } catch {
    card.hidden = true;
  }
}
// The browser opens a panel only straight from a click, so nothing is awaited before it.
function continueTest(testRunId) {
  const tab = testRunTab;
  if (!chrome.sidePanel?.open || !tab) { showMessage(t("test.panelUnavailable"), true); return; }
  chrome.sidePanel.setOptions({ enabled: true,
    path: `test-panel.html?testRunId=${encodeURIComponent(testRunId)}` }).catch(() => {});
  chrome.sidePanel.open({ windowId: tab.windowId }).then(() => window.close(),
    () => showMessage(t("test.panelUnavailable"), true));
}
$("continueTest").addEventListener("click", () => continueTest(activeTestRunId));
// The panel is opened first, straight from the click, and the recording is started meanwhile;
// the panel follows the recording once it has started. The popup stays open on a failure.
$("startActiveTest").addEventListener("click", () => {
  const tab = testRunTab;
  const button = $("startActiveTest");
  if (!chrome.sidePanel?.open || !tab) { showMessage(t("test.panelUnavailable"), true); return; }
  chrome.sidePanel.setOptions({ enabled: true,
    path: `test-panel.html?testRunId=${encodeURIComponent(activeTestRunId)}` }).catch(() => {});
  const opened = chrome.sidePanel.open({ windowId: tab.windowId }).then(() => true, () => false);
  button.disabled = true;
  showMessage(t("test.startingRecording"));
  Promise.all([opened, send({ type: "T9_START_TEST_RECORDING", testRunId: activeTestRunId,
    tabId: tab.id }, 15000)]).then(([panelOpen, response]) => {
    if (!response?.ok) throw new Error(response?.error || "test.recordingStartFailed");
    if (!panelOpen) { showMessage(t("test.startedWithoutPanel")); return; }
    window.close();
  }).catch(error => {
    button.disabled = false;
    showMessage(String(error?.message || "test.recordingStartFailed"), true);
  });
});
// Ending the test here only stops offering it: its results are kept, and opening it again
// from the document library makes it the active test again.
$("endActiveTest").addEventListener("click", async () => {
  try {
    const response = await send({ type: "T9_CLEAR_ACTIVE_TEST_RUN", testRunId: activeTestRunId }, 3000);
    if (!response?.ok) throw new Error(response?.error || "");
    $("activeTestCard").hidden = true;
    showMessage(t("test.endedActive"));
  } catch { showMessage(t("test.saveFailed"), true); }
});
$("dashboard").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("knowledgeAdmin").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("knowledge-admin.html") });
});
loadUiLocale().then(refresh).then(() => { void showActiveTest(); }).then(updateLicenseCard).then(async () => {
  try {
    const access = await send({ type: "T9_GET_KNOWLEDGE_ADMIN_ACCESS" }, 3000);
    $("knowledgeAdmin").hidden = access?.authorized !== true;
  } catch {
    $("knowledgeAdmin").hidden = true;
  }
  try {
    const response = await send({ type: "T9_GET_STATE" }, 3000);
    if (!response?.state?.recording || !response.state.stopPromptRequested) return;
    await finishOrNameRecording(response.state);
    await send({ type: "T9_CLEAR_STOP_REQUEST" }, 3000);
  } catch (error) {
    showMessage(error.message, true);
  }
});
const refreshInterval = setInterval(refresh, 1000);
globalThis.addEventListener("pagehide", () => clearInterval(refreshInterval), { once: true });
