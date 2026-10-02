const $ = id => document.getElementById(id);

function updateText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

const withTimeout = globalThis.T9AsyncOperations.withTimeout;
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
  return withTimeout(chrome.runtime.sendMessage(message), timeout, "Kommunikationen med tillägget");
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function showMessage(text, error = false) {
  const message = String(text || "");
  updateText($("message"), message.startsWith("license.") ? t(message) : message);
  $("message").style.color = error ? "#b42318" : "#166534";
}

function setLicenseFeedback(text, error = false) {
  updateText($("licenseCardFeedback"), text || "");
  $("licenseCardFeedback").classList.toggle("error", error);
}

function setStarting(starting) {
  $("startProcess").disabled = starting;
  $("startBug").disabled = starting;
}

function formatLicenseExpiry(value) {
  const timestamp = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Intl.DateTimeFormat(currentUiLocale, { dateStyle: "medium" }).format(new Date(timestamp))
    : t("license.noExpiryDate");
}

function renderLicenseCard(license, { tenantId = "", signedIn = false,
  checkFailed = false, needsConsent = false } = {}) {
  const card = $("licenseCard");
  const currentLicense = checkFailed || needsConsent ? null : license;
  const displayedLicense = currentLicense?.allowed === true ? currentLicense : null;
  card.classList.toggle("active", Boolean(currentLicense?.allowed));
  card.classList.toggle("inactive", Boolean(tenantId && !currentLicense?.allowed));
  updateText($("licenseCardType"), displayedLicense?.licenseType === "trial"
    ? t("license.trialType") : displayedLicense?.licenseType === "consultant"
      ? t("license.consultantType") : displayedLicense?.licenseType === "standard" || displayedLicense?.allowed
        ? t("license.standardType") : "—");
  updateText($("licenseCardExpiry"), formatLicenseExpiry(displayedLicense?.expiresAt));
  const trialAvailable = currentLicense?.trialAvailable === true;
  const statusKey = !tenantId ? "license.cardUnknown"
    : needsConsent ? "license.cardNeedsConsent"
      : checkFailed ? "license.cardCheckFailed"
        : currentLicense?.allowed ? "license.cardActive"
          : trialAvailable ? signedIn ? "license.cardTrialReady" : "license.cardTrialAvailable"
            : signedIn ? "license.cardNoTrial" : "license.cardSignInHelp";
  updateText($("licenseCardStatus"), t(statusKey));
  const actionKey = trialAvailable
    ? signedIn ? "license.cardStartTrial" : "license.cardSignInTrial"
    : "license.cardSignIn";
  updateText($("licenseCardAction"), t(actionKey));
  $("licenseCardAction").disabled = !tenantId;
  $("licenseCardAction").title = tenantId ? "" : t("license.cardOpenBc");
}

async function updateLicenseCard() {
  let tenantId = "";
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
        const current = await send({ type: "T9_LICENSE_CHECK", tabId: tab.id, force: true }, 10000);
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
  renderLicenseCard(license, { tenantId, signedIn, checkFailed, needsConsent });
}

async function prepareTenantLicense(tabId, { forceCheck = false } = {}) {
  const licenseInfo = await send({ type: "T9_LICENSE_INFORMATION" });
  if (!licenseInfo?.ok) throw new Error(licenseInfo?.error || "License configuration unavailable");
  if (licenseInfo.information.requiresAcceptance) {
    const notice = tf("license.registrationNotice", { endpoint: licenseInfo.information.endpoint });
    if (!globalThis.confirm(notice + "\n\n" + t("license.acceptPrompt"))) {
      throw new Error(t("license.registrationCancelled"));
    }
    const accepted = await send({ type: "T9_ACCEPT_LICENSE_NOTICE" });
    if (!accepted?.ok) throw new Error(accepted?.error || t("technical.requestFailed"));
  }

  let tenantResult = null;
  let checkError = null;
  try {
    tenantResult = await send({ type: "T9_LICENSE_CHECK", tabId, force: forceCheck }, 10000);
    if (!tenantResult?.ok) throw Object.assign(new Error(tenantResult?.error || t("technical.requestFailed")),
      { status: tenantResult?.status });
  } catch (error) { checkError = error; }

  let account = await send({ type: "T9_CONSULTANT_LICENSE_STATUS" }, 5000);
  if (!account?.signedIn) {
    account = await send({ type: "T9_MICROSOFT_SIGN_IN" }, 120000);
    if (!account?.ok) throw new Error(account?.code === "entra-signin-unreachable"
      ? t("license.microsoftUnavailable") : account?.error || t("license.signInFailed"));
    account = { ...account, signedIn: true };
  }

  if (tenantResult?.license?.allowed) {
    const registered = await send({ type: "T9_TENANT_USER_REGISTER", tabId }, 10000);
    if (!registered?.ok) throw new Error(registered?.error || t("license.userRegistrationFailed"));
    return { source: "tenant", license: tenantResult.license, tenantId: tenantResult.tenantId, account };
  }

  if (tenantResult?.license?.trialAvailable || checkError) {
    try {
      let trial = await send({ type: "T9_REQUEST_TRIAL", tabId }, 15000);
      if (!trial?.ok && trial.code === "entra-reauth-required") {
        await send({ type: "T9_CONSULTANT_LICENSE_SIGN_OUT" });
        account = await send({ type: "T9_MICROSOFT_SIGN_IN" }, 120000);
        if (!account?.ok) throw new Error(account?.code === "entra-signin-unreachable"
          ? t("license.microsoftUnavailable") : account?.error || t("license.signInFailed"));
        trial = await send({ type: "T9_REQUEST_TRIAL", tabId }, 15000);
      }
      if (!trial?.ok) {
        const message = trial.code === "trial-service-unreachable"
          ? t("license.trialServiceUnavailable") : trial.error || t("license.trialFailed");
        throw Object.assign(new Error(message), { status: trial?.status });
      }
      return { source: "tenant", license: trial.license, tenantId: tenantResult?.tenantId, account };
    } catch (error) {
      if (error.status === 409) {
        const current = await send({ type: "T9_LICENSE_CHECK", tabId, force: true }, 10000);
        if (current?.ok && current.license?.allowed) {
          const registered = await send({ type: "T9_TENANT_USER_REGISTER", tabId }, 10000);
          if (!registered?.ok) throw new Error(registered?.error || t("license.userRegistrationFailed"));
          return { source: "tenant", license: current.license, tenantId: current.tenantId, account };
        }
      }
      throw error;
    }
  }

  if (checkError) throw checkError;
  const consultant = await send({ type: "T9_CONSULTANT_LICENSE_CHECK", tabId }, 10000);
  if (consultant?.license?.allowed) {
    return { source: "consultant", license: consultant.license, tenantId: tenantResult?.tenantId, account };
  }
  throw new Error(t("license.noEligibleTrial"));
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
    const authorization = await prepareTenantLicense(tab.id);
    renderLicenseCard(authorization.license,
      { tenantId: authorization.tenantId, signedIn: true });
    await ensureContentScript(tab);
    showMessage(t("recorder.connectionWorks"));

    const response = await send({
      type: recordingPurpose === "bug-report" ? "T9_START_BUG_RECORDING" : "T9_START",
      tabId: tab.id,
      name: recordingPurpose === "bug-report"
        ? "Business Central-fel"
        : "Business Central-process",
      purpose: ""
    }, 15000);
    if (!response?.ok) {
      throw new Error(response?.error || t("recorder.startFailed"));
    }
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
    setLicenseFeedback(error.message || t("license.trialFailed"), true);
    await updateLicenseCard();
  } finally {
    card.setAttribute("aria-busy", "false");
    action.disabled = false;
  }
});

$("startProcess").addEventListener("click", () => startRecording("documentation"));
$("startBug").addEventListener("click", () => startRecording("bug-report"));
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
    }, pendingBugRecording ? 30000 : 5000);
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

async function finishOrNameRecording(state) {
  if (state?.recordingPurpose === "bug-report") {
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

$("dashboard").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("knowledgeAdmin").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("knowledge-admin.html") });
});
loadUiLocale().then(refresh).then(updateLicenseCard).then(async () => {
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
