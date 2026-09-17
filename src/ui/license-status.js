"use strict";
const $ = id => document.getElementById(id);
const tabId = Number(new URLSearchParams(location.search).get("tabId"));

function dateTime(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short" })
    .format(new Date(value));
}
function send(message) {
  return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, response => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error(error.message)); else resolve(response);
  }));
}
function render(result) {
  const license = result.license;
  $("tenantId").textContent = result.tenantId || "—";
  const registered = license.licenseStatus !== "unregistered";
  $("licenseType").textContent = registered
    ? license.licenseType === "trial" ? "Testlicens" : "Ordinarie licens" : "—";
  $("expiresAt").textContent = registered ? dateTime(license.expiresAt) : "—";
  $("checkedAt").textContent = dateTime(license.checkedAt);
  const status = $("status");
  status.className = "status " + (license.allowed ? "active" : "inactive");
  const labels = { active: "Aktiv", expired: "Utgången", blocked: "Spärrad",
    unregistered: license.trialAvailable
      ? "Oregistrerad – testlicens kan begäras" : "Oregistrerad" };
  status.textContent = labels[license.licenseStatus] || (license.allowed ? "Aktiv" : "Ingen aktiv licens");
}
async function load(force = false) {
  $("refresh").disabled = true;
  $("message").textContent = force ? "Kontrollerar licenstjänsten…" : "";
  $("message").className = "";
  try {
    if (!Number.isInteger(tabId) || tabId <= 0) throw new Error("Business Central-fliken kunde inte identifieras.");
    const result = await send({ type: "T9_LICENSE_CHECK", tabId, force });
    if (!result?.ok) throw new Error(result?.error || "Licensen kunde inte kontrolleras.");
    render(result);
    $("message").textContent = force ? "Licensinformationen är uppdaterad." : "";
  } catch (error) {
    $("status").className = "status unknown";
    $("status").textContent = "Kunde inte kontrolleras";
    $("message").textContent = error.message;
    $("message").className = "error";
  } finally { $("refresh").disabled = false; }
}
$("refresh").addEventListener("click", () => load(true));
load();
