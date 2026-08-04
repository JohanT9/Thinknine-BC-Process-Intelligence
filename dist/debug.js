const send = message => chrome.runtime.sendMessage(message);

function row(label, value, status = "") {
  const labelElement = document.createElement("div");
  labelElement.className = "label";
  labelElement.textContent = label;

  const valueElement = document.createElement("div");
  valueElement.className = `value ${status}`;
  valueElement.textContent = value ?? "";

  return [labelElement, valueElement];
}

function objectSummary(value) {
  if (!value || typeof value !== "object") return "Inget";
  const entries = Object.entries(value);
  if (!entries.length) return "Inget";
  return entries.map(([key, count]) => `${key}: ${count}`).join(", ");
}

async function load() {
  const response = await send({ type: "T9_GET_DEBUG" });
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const debug = response.debug || {};
  const state = response.state || {};
  const screenshots = debug.screenshotStats || {};

  const rows = [
    ["Version", debug.version || "3.7.0"],
    ["Anslutning till BC", debug.connected ? "OK" : "Inte bekräftad", debug.connected ? "ok" : "error"],
    ["Inspelning", state.recording ? "Pågår" : "Inte aktiv"],
    ["Aktiv session", state.sessionId || "Ingen"],
    ["Händelser", String(debug.eventCount || 0)],
    ["Eventtyper", objectSummary(debug.eventTypeCounts)],
    ["Kategorier", objectSummary(debug.eventCategoryCounts)],
    ["Senaste event", debug.lastEvent ? JSON.stringify(debug.lastEvent) : "Inget"],
    ["Senaste BC-ping", debug.lastPingAt || "Ingen"],
    ["Senaste ram-URL", debug.lastFrameUrl || "Ingen"],
    ["Skärmbilder begärda", String(screenshots.requested || 0)],
    ["Skärmbilder tagna", String(screenshots.captured || 0)],
    ["Bildförfrågningar sammanslagna", String(screenshots.reused || 0)],
    ["Bildförfrågningar borttagna", String(screenshots.dropped || 0)],
    ["Skärmbildskö", String(debug.screenshotQueueLength || 0)],
    ["Senaste skärmbild", debug.lastScreenshotAt || "Ingen"],
    ["Senaste fel", debug.lastError || "Inget", debug.lastError ? "error" : "ok"],
    ["Skärmbildsfel", debug.lastScreenshotError || "Inget", debug.lastScreenshotError ? "error" : "ok"],
    ["Senast uppdaterad", debug.updatedAt || ""]
  ];

  for (const item of rows) {
    grid.append(...row(...item));
  }

  document.getElementById("raw").textContent =
    JSON.stringify(response, null, 2);
}

document.getElementById("refresh").addEventListener("click", load);
load();
