const $ = id => document.getElementById(id);

function updateText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

function withTimeout(promise, milliseconds, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} tog för lång tid.`)),
        milliseconds
      );
    })
  ]);
}

async function send(message, timeout = 5000) {
  return withTimeout(
    chrome.runtime.sendMessage(message),
    timeout,
    "Kommunikationen med tillägget"
  );
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

function showMessage(text, error = false) {
  updateText($("message"), text || "");
  $("message").style.color = error ? "#b42318" : "#166534";
}

function setStarting(starting) {
  $("start").disabled = starting;
  $("start").textContent = starting
    ? "Startar inspelning..."
    : "Starta inspelning";
}

async function pingTab(tabId) {
  try {
    return await withTimeout(
      chrome.tabs.sendMessage(tabId, {
        type: "T9_CONTENT_PING"
      }),
      1800,
      "Kontrollen av Business Central-fliken"
    );
  } catch {
    return null;
  }
}

async function ensureContentScript(tab) {
  let response = await pingTab(tab.id);
  if (response?.ok) return response;

  try {
    await withTimeout(
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
          allFrames: true
        },
        files: ["content.js"]
      }),
      4000,
      "Inläsningen av inspelningsskriptet"
    );
  } catch (error) {
    throw new Error(
      "Edge kunde inte läsa in inspelningsskriptet i Business Central. " +
      "Kontrollera tilläggets webbplatsåtkomst. " +
      error.message
    );
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  response = await pingTab(tab.id);

  if (!response?.ok) {
    throw new Error(
      "Business Central-fliken svarar fortfarande inte. " +
      "Uppdatera BC med Ctrl+F5 och kontrollera att webbplatsåtkomsten är tillåten."
    );
  }

  return response;
}

async function refresh() {
  try {
    const response = await send({ type: "T9_GET_STATE" }, 3000);
    const active = Boolean(response?.state?.recording);

    $("startPanel").hidden = active;
    $("recordingPanel").hidden = !active;
    updateText($("status"), active ? "● Inspelning pågår" : "Inte aktiv");
    $("status").className = "status" + (active ? " rec" : "");

    if (response?.session) {
      updateText($("sessionName"), response.session.name);
      updateText($("count"), response.session.eventCount || 0);
    }
  } catch (error) {
    showMessage(error.message, true);
  }
}

$("start").addEventListener("click", async () => {
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
      type: "T9_START",
      tabId: tab.id,
      name: $("name").value.trim() || "Business Central-process",
      purpose: $("purpose").value.trim()
    }, 6000);

    if (!response?.ok) {
      throw new Error(
        response?.error || "Bakgrundsprocessen kunde inte starta sessionen."
      );
    }

    showMessage("Inspelningen har startats.");
    await refresh();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setStarting(false);
  }
});

$("stop").addEventListener("click", async () => {
  try {
    const response = await send({ type: "T9_STOP" }, 5000);

    if (!response?.ok) {
      throw new Error(
        response?.error || "Kunde inte stoppa inspelningen."
      );
    }

    showMessage("Inspelningen har stoppats.");
    await refresh();
  } catch (error) {
    showMessage(error.message, true);
  }
});

$("dashboard").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

$("debug").addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("debug.html")
  });
});

refresh();
setInterval(refresh, 1000);
