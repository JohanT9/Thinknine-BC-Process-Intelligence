const $ = id => document.getElementById(id);

function updateText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

const withTimeout = globalThis.T9AsyncOperations.withTimeout;

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
  if (!action) return "Väntar på första händelsen";
  return action.label || action.category || action.type || "Händelse registrerad";
}

function renderLiveStatus(liveStatus) {
  if (!liveStatus) return;
  updateText($("latestAction"), displayLatestAction(liveStatus.latestAction));
  updateText($("latestPage"), liveStatus.latestAction?.pageCaption ||
    "Ej registrerad");
  const screenshots = liveStatus.screenshots || {};
  updateText($("screenshotStatus"), `${screenshots.captured || 0} sparade` +
    (screenshots.pending ? ` · ${screenshots.pending} väntar` : ""));
  const context = [liveStatus.context?.environmentName,
    liveStatus.context?.companyName].filter(Boolean).join(" · ");
  updateText($("recordingContext"), context || "Ej identifierad");
  updateText($("connectionStatus"), liveStatus.connected
    ? "Ansluten" : "Inte bekräftad");
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
      files: ["capture-focus-session.js", "bc-error-detector.js", "content.js"]
    }), 4000, "Inläsningen av inspelningsskriptet");
  } catch (error) {
    throw new Error("Edge kunde inte läsa in inspelningsskriptet i Business Central. " +
      "Kontrollera tilläggets webbplatsåtkomst. " + error.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  response = await pingTab(tab.id);
  if (!response?.ok) {
    throw new Error("Business Central-fliken svarar fortfarande inte. " +
      "Uppdatera BC med Ctrl+F5 och kontrollera att webbplatsåtkomsten är tillåten.");
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
      ? (bugRecording ? "Felrapportering pågår" : "Processinspelning pågår")
      : "Inte aktiv");
    $("status").className = "status" + (active ? " rec" : "");
    updateText($("recordingGuidance"), bugRecording
      ? "Återskapa felet och kopiera gärna Business Central-feldetaljerna. Stoppa sedan för att granska rapporten."
      : "Utför processen i Business Central och stoppa när du är klar.");
    updateText($("stop"), bugRecording
      ? "Stoppa och öppna felrapport"
      : "Stoppa inspelning");

    if (response?.session) {
      updateText($("sessionName"), response.session.name);
      updateText($("count"), response.session.eventCount || 0);
      const feedback = $("errorCaptureFeedback");
      const errorCaptured = bugRecording && response.session.errorEvidenceCount > 0;
      feedback.hidden = !errorCaptured;
      if (errorCaptured) {
        updateText(feedback,
          response.session.lastErrorCaptureStatus === "details-captured"
            ? "Business Central-felet och tekniska detaljer har fångats."
            : "Business Central-felet har fångats. Alla tekniska detaljer var inte tillgängliga.");
      }
    }
    if (active) renderLiveStatus(response.liveStatus);
  } catch (error) {
    showMessage(error.message, true);
  }
});

async function startRecording(recordingPurpose) {
  setStarting(true);
  showMessage("Kontrollerar anslutningen till Business Central...");
  try {
    const tab = await currentTab();
    if (!tab?.url?.includes("businesscentral.dynamics.com")) {
      throw new Error("Öppna Business Central i den aktiva fliken först.");
    }
    await ensureContentScript(tab);
    showMessage("Anslutningen fungerar. Startar sessionen...");

    const response = await send({
      type: recordingPurpose === "bug-report" ? "T9_START_BUG_RECORDING" : "T9_START",
      tabId: tab.id,
      name: recordingPurpose === "bug-report"
        ? "Business Central-fel"
        : "Business Central-process",
      purpose: ""
    }, 6000);
    if (!response?.ok) {
      throw new Error(response?.error || "Bakgrundsprocessen kunde inte starta sessionen.");
    }
    showMessage(recordingPurpose === "bug-report"
      ? "Felrapporteringen har startats. Återskapa felet i Business Central."
      : "Processinspelningen har startats.");
    await refresh();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setStarting(false);
  }
}

$("startProcess").addEventListener("click", () => startRecording("documentation"));
$("startBug").addEventListener("click", () => startRecording("bug-report"));

let pendingBugRecording = false;

function openCompletionDialog() {
  const dialog = $("completionDialog");
  if (!dialog.open) dialog.showModal();
  $("openLibraryAfterRecording").focus();
}

function stayAfterRecording() {
  $("completionDialog").close();
  showMessage("Inspelningen har sparats i Dokumentbiblioteket.");
}

function openLibraryAfterRecording() {
  $("completionDialog").close();
  chrome.runtime.openOptionsPage();
}

async function finishRecording(name) {
  try {
    showMessage(pendingBugRecording
      ? "Skapar felrapport och öppnar den för granskning..."
      : "Stoppar inspelningen...");
    const response = await send({
      type: pendingBugRecording ? "T9_FINISH_BUG_RECORDING" : "T9_STOP",
      name
    }, pendingBugRecording ? 30000 : 5000);
    if (!response?.ok) {
      throw new Error(response?.error || "Kunde inte stoppa inspelningen.");
    }
    showMessage(pendingBugRecording
      ? "Felrapporten har skapats och öppnats."
      : "Inspelningen har stoppats.");
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
    throw new Error(stopped?.error || "Kunde inte stoppa inspelningen.");
  }
  const removed = await send({
    type: "T9_DELETE_SESSION",
    sessionId
  }, 10000);
  if (!removed?.ok) {
    throw new Error(removed?.error || "Inspelningen stoppades men kunde inte tas bort.");
  }
  return { ok: true, sessionId };
}

async function discardActiveRecording() {
  const confirmed = globalThis.confirm(
    "Vill du avbryta inspelningen? Alla registrerade händelser och bilder i den tas bort."
  );
  if (!confirmed) return;

  try {
    $("discardRecording").disabled = true;
    showMessage("Avbryter inspelningen...");
    let response = await send({ type: "T9_CANCEL_RECORDING" }, 30000);
    if (!response?.ok && /okänt meddelande/i.test(String(response?.error || ""))) {
      response = await discardWithLegacyBackground();
    }
    if (!response?.ok) {
      throw new Error(response?.error || "Kunde inte avbryta inspelningen.");
    }
    $("nameDialog").close();
    showMessage("Inspelningen avbröts och togs bort.");
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
    ? "Namnge felrapporten" : "Namnge processinspelningen");
  updateText($("nameDialogHelp"), pendingBugRecording
    ? "Ange ett tydligt namn på problemet. Rapporten skapas när du fortsätter."
    : "Ange namnet som ska visas i Dokumentbiblioteket.");
  $("recordingName").value = "";
  $("recordingName").placeholder = pendingBugRecording
    ? "Exempel: Fel vid frisläppning av order"
    : "Exempel: Skapa försäljningsorder";
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
  finishRecording(name);
});

$("dashboard").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("debug").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("debug.html") });
});

refresh().then(async () => {
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
