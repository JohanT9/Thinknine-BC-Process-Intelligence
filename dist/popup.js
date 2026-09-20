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
    const licenseInfo = await send({ type: "T9_LICENSE_INFORMATION" });
    if (!licenseInfo?.ok) throw new Error(licenseInfo?.error || "License configuration unavailable");
    if (licenseInfo.information.requiresAcceptance) {
      const sv = currentUiLocale === "sv-SE";
      const notice = sv
        ? "Tenantlicens för BC Process Studio\n\nVid licenskontroll skickas installations-ID, tenant-ID och tilläggsversion till licenstjänsten för BC Process Studio. För att använda en aktiv tenantlicens loggar användaren även in med Microsoft. Namn, e-post/UPN, Entra tenant-ID och objekt-ID registreras för administration tillsammans med första och senaste användning. För nya sparade processdokument och felrapporter skickas dokumenttyp, skapandetid och ett hashat tekniskt ID för statistik per användare. Dokumentinnehåll, inspelningar, bilder, företagsnamn och affärsdata skickas inte. Azure kan även logga tekniska anslutningsuppgifter.\n\nKontroll sker vid inspelning och godkänt besked cachas i högst en timme. Utan aktiv licens eller kontakt efter cacheutgång kan nya inspelningar inte startas. Befintliga dokument finns kvar.\n\nTjänst: "
        : "BC Process Studio tenant licensing\n\nLicense checks send the installation ID, tenant ID and extension version to the BC Process Studio licensing service. To use an active tenant license, the user also signs in with Microsoft. Name, email/UPN, Entra tenant ID and object ID are registered for administration together with first and latest use. For newly saved process documents and bug reports, document type, creation time and a hashed technical ID are sent for per-user statistics. Document content, recordings, images, company names and business data are not sent. Azure may also log technical connection information.\n\nChecks occur during recording; approvals are cached for at most one hour. Without an active license or contact after cache expiry, new recordings cannot start. Existing documents remain available.\n\nService: ";
      if (!globalThis.confirm(notice + licenseInfo.information.endpoint +
          (sv ? "\n\nGodkänn registreringen och fortsätt?" : "\n\nAccept registration and continue?"))) {
        throw new Error(sv ? "Licensregistreringen avbröts. Inga uppgifter skickades." : "Registration cancelled. No data was sent.");
      }
      const accepted = await send({ type: "T9_ACCEPT_LICENSE_NOTICE" });
      if (!accepted?.ok) throw new Error(accepted?.error || "License registration failed");
    }
    const check = await send({ type: "T9_LICENSE_CHECK", tabId: tab.id }, 10000);
    if (!check?.ok) throw new Error(check?.error || "License check failed");
    if (check.license.allowed) {
      let account = await send({ type: "T9_CONSULTANT_LICENSE_STATUS" });
      if (!account?.signedIn) {
        const signedIn = await send({ type: "T9_MICROSOFT_SIGN_IN" }, 120000);
        if (!signedIn?.ok) throw new Error(signedIn?.error || (currentUiLocale === "sv-SE"
          ? "Microsoft-inloggningen kunde inte slutföras." : "Microsoft sign-in could not be completed."));
        account = signedIn;
      }
      const registered = await send({ type: "T9_TENANT_USER_REGISTER", tabId: tab.id }, 10000);
      if (!registered?.ok) throw new Error(registered?.error || (currentUiLocale === "sv-SE"
        ? "Användaren kunde inte registreras för tenantlicensen." : "The user could not be registered for the tenant license."));
    }
    let consultantAllowed = false;
    if (!check.license.allowed) {
      try {
        const consultant = await send({ type: "T9_CONSULTANT_LICENSE_CHECK", tabId: tab.id }, 10000);
        consultantAllowed = consultant?.license?.allowed === true;
      } catch { /* Tenant trial flow remains available when no consultant is signed in. */ }
    }
    if (!check.license.allowed && !consultantAllowed && check.license.trialAvailable) {
      const email = await requestTrialEmail();
      if (!email) throw new Error(currentUiLocale === "sv-SE"
        ? "Begäran om testlicens avbröts." : "Trial request cancelled.");
      const trial = await send({ type: "T9_REQUEST_TRIAL", tabId: tab.id, email }, 10000);
      if (!trial?.ok || !trial.license?.allowed) {
        throw new Error(trial?.error || (currentUiLocale === "sv-SE"
          ? "Testlicensen kunde inte skapas." : "The trial could not be created."));
      }
    } else if (!check.license.allowed && !consultantAllowed) {
      throw new Error(currentUiLocale === "sv-SE"
        ? "Denna tenant saknar en aktiv licens och kan inte starta en ny testperiod."
        : "This tenant has no active license and cannot start a new trial.");
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
    }, 15000);
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

function requestTrialEmail() {
  const dialog = $("trialDialog");
  const form = $("trialForm");
  const email = $("trialEmail");
  email.value = "";
  dialog.showModal();
  setTimeout(() => email.focus(), 0);
  return new Promise(resolve => {
    const finish = value => {
      form.removeEventListener("submit", submit);
      $("cancelTrial").removeEventListener("click", cancel);
      dialog.removeEventListener("cancel", cancel);
      if (dialog.open) dialog.close();
      resolve(value);
    };
    const submit = event => { event.preventDefault();
      if (form.reportValidity()) finish(email.value.trim()); };
    const cancel = event => { event.preventDefault(); finish(""); };
    form.addEventListener("submit", submit);
    $("cancelTrial").addEventListener("click", cancel);
    dialog.addEventListener("cancel", cancel);
  });
}

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
$("debug").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("debug.html") });
});

loadUiLocale().then(refresh).then(async () => {
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
