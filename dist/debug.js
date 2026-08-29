const send = message => chrome.runtime.sendMessage(message);
let currentUiLocale = globalThis.T9UiI18n.DEFAULT_LOCALE;
const t = key => globalThis.T9UiI18n.translate(key, currentUiLocale);
const uiText = value => globalThis.T9UiI18n.translateStaticText(
  value, currentUiLocale);

function row(label, value, status = "") {
  const labelElement = document.createElement("div");
  labelElement.className = "label";
  labelElement.textContent = uiText(label);

  const valueElement = document.createElement("div");
  valueElement.className = `value ${status}`;
  valueElement.textContent = value ?? "";

  return [labelElement, valueElement];
}

function objectSummary(value) {
  if (!value || typeof value !== "object") return t("debug.none");
  const entries = Object.entries(value);
  if (!entries.length) return t("debug.none");
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
    ["Version", debug.version || "4.7.0"],
    ["Anslutning till BC", debug.connected ? "OK" : uiText("Inte bekräftad"), debug.connected ? "ok" : "error"],
    ["Inspelning", state.recording ? t("debug.active") : t("debug.inactive")],
    ["Aktiv session", state.sessionId || t("debug.noSession")],
    ["Händelser", String(debug.eventCount || 0)],
    ["Eventtyper", objectSummary(debug.eventTypeCounts)],
    ["Kategorier", objectSummary(debug.eventCategoryCounts)],
    ["Senaste event", debug.lastEvent ? JSON.stringify(debug.lastEvent) : t("debug.none")],
    ["Senaste BC-ping", debug.lastPingAt || t("debug.noSession")],
    ["Senaste ram-URL", debug.lastFrameUrl || t("debug.noSession")],
    ["Ramar med content script", String(Object.keys(
      debug.frameDiagnostics || {}).length)],
    ["Ramar enligt webbläsaren", String((response.browserFrames || []).length)],
    ["Aktiva content-ramar", String(Object.values(debug.frameDiagnostics || {})
      .filter(frame => frame.contentRecorderActive).length)],
    ["Fångstdiagnostik", debug.captureDiagnosticsEnabled
      ? t("debug.enabled") : t("debug.disabled")],
    ["Fångststeg", objectSummary(debug.captureStageCounts)],
    ["Senaste fångstdiagnostik", debug.lastCaptureDiagnostic
      ? JSON.stringify(debug.lastCaptureDiagnostic) : t("debug.noSession")],
    ["Skärmbilder begärda", String(screenshots.requested || 0)],
    ["Skärmbilder tagna", String(screenshots.captured || 0)],
    ["Bildförfrågningar sammanslagna", String(screenshots.reused || 0)],
    ["Bildförfrågningar borttagna", String(screenshots.dropped || 0)],
    ["Skärmbildskö", String(debug.screenshotQueueLength || 0)],
    ["Senaste skärmbild", debug.lastScreenshotAt || t("debug.noSession")],
    ["Senaste fel", debug.lastError || t("debug.none"), debug.lastError ? "error" : "ok"],
    ["Skärmbildsfel", debug.lastScreenshotError || t("debug.none"), debug.lastScreenshotError ? "error" : "ok"],
    ["Senast uppdaterad", debug.updatedAt || ""]
  ];

  for (const item of rows) {
    grid.append(...row(...item));
  }

  document.getElementById("raw").textContent =
    JSON.stringify(response, null, 2);
  const toggle = document.getElementById("toggleCaptureDiagnostics");
  toggle.textContent = uiText(debug.captureDiagnosticsEnabled
    ? "Stäng av fångstdiagnostik" : "Aktivera fångstdiagnostik");
  toggle.dataset.enabled = String(Boolean(debug.captureDiagnosticsEnabled));
}

document.getElementById("refresh").addEventListener("click", load);
document.getElementById("toggleCaptureDiagnostics").addEventListener(
  "click", async event => {
    await send({ type: "T9_SET_CAPTURE_DIAGNOSTICS",
      enabled: event.currentTarget.dataset.enabled !== "true" });
    await load();
  }
);
async function start() {
  try {
    const response = await send({ type: "T9_GET_SETTINGS" });
    currentUiLocale = globalThis.T9UiI18n.apply(response?.settings?.uiLocale);
  } catch {
    currentUiLocale = globalThis.T9UiI18n.apply(currentUiLocale);
  }
  document.title = t("debug.title");
  await load();
}
start();
